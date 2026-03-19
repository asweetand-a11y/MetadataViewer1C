/**
 * DcsEditor
 *
 * Webview редактор СКД (DataCompositionSchema) в EDT‑подобном стиле.
 * MVP: редактирование в памяти (без сохранения в XML).
 */

import * as fs from "fs";
import * as vscode from "vscode";
import { scanMetadataRoot } from "./metadata_utils/MetadataScanner";
import { MetadataRepository, type MetadataTreeNode } from "./metadata_utils/MetadataRepository";
import { parseReportXmlForDcs, ParsedReportDcs, type ParsedDcsNode } from "./xmlParsers/dcsParserXmldom";
import { XmlDiffMerge } from "./utils/xmlDiffMerge";
import { serializeToXml } from "./xmlParsers/dcsSerializerXmldom";
import { normalizeXML, validateXML } from "./utils/xmlUtils";
import { validateXmlStructure } from "./validation/xmlStructureValidator";
import { CommitFileLogger } from "./utils/commitFileLogger";
import { statusBarProgress, contextStatusBar } from "./extension";

type QueryMetadataNode = {
  id: string;
  label: string;
  kind: 'root' | 'type' | 'object' | 'group' | 'member';
  insertText?: string;
  children?: QueryMetadataNode[];
};

export class DcsEditor {
  public static readonly viewType = "metadataViewer.dcsEditor";

  private readonly metadataRepository = new MetadataRepository(30_000);
  private metadataTreeCache: QueryMetadataNode | null = null;

  private metadataCache: { registers: string[]; referenceTypes: string[] } | null = null;
  private webviewReady: boolean = false;
  private pendingInitMessage: { type: string; payload: any; metadata: any; metadataTree: any } | null = null;
  private fallbackTimeout: NodeJS.Timeout | null = null;

  private async scanMetadataForWebview(): Promise<{ registers: string[]; referenceTypes: string[] }> {
    if (this.metadataCache) return this.metadataCache;

    const registers: string[] = [];
    const referenceTypes: string[] = [];

    try {
      const scanResult = await scanMetadataRoot(this.sourceRoot);

      const typeDirToMetadataType: Record<string, string> = {
        InformationRegisters: 'InformationRegister',
        AccumulationRegisters: 'AccumulationRegister',
        AccountingRegisters: 'AccountingRegister',
        CalculationRegisters: 'CalculationRegister',
        Catalogs: 'Catalog',
        Documents: 'Document',
        Enums: 'Enum',
        Reports: 'Report',
        DataProcessors: 'DataProcessor',
        ChartsOfCharacteristicTypes: 'ChartOfCharacteristicTypes',
        ChartsOfAccounts: 'ChartOfAccounts',
        ChartsOfCalculationTypes: 'ChartOfCalculationTypes',
        BusinessProcesses: 'BusinessProcess',
        Tasks: 'Task',
        DefinedTypes: 'DefinedType',
        ExchangePlans: 'ExchangePlan',
      };

      const metadataTypeToTypePrefixes: Record<string, string[]> = {
        Catalog: ['CatalogRef', 'CatalogObject', 'CatalogManager', 'CatalogSelection', 'CatalogList'],
        Document: ['DocumentRef', 'DocumentObject', 'DocumentManager', 'DocumentSelection', 'DocumentList'],
        Enum: ['EnumRef'],
        Report: ['ReportRef'],
        DataProcessor: ['DataProcessorRef'],
        ChartOfCharacteristicTypes: ['ChartOfCharacteristicTypesRef'],
        ChartOfAccounts: ['ChartOfAccountsRef'],
        ChartOfCalculationTypes: ['ChartOfCalculationTypesRef'],
        InformationRegister: ['InformationRegisterRef', 'InformationRegisterRecordSet', 'InformationRegisterManager', 'InformationRegisterSelection'],
        AccumulationRegister: ['AccumulationRegisterRef', 'AccumulationRegisterRecordSet', 'AccumulationRegisterManager', 'AccumulationRegisterSelection'],
        AccountingRegister: ['AccountingRegisterRef', 'AccountingRegisterRecordSet', 'AccountingRegisterManager', 'AccountingRegisterSelection'],
        CalculationRegister: ['CalculationRegisterRef', 'CalculationRegisterRecordSet', 'CalculationRegisterManager', 'CalculationRegisterSelection'],
        BusinessProcess: ['BusinessProcessRef', 'BusinessProcessObject', 'BusinessProcessManager', 'BusinessProcessSelection', 'BusinessProcessList'],
        Task: ['TaskRef', 'TaskObject', 'TaskManager', 'TaskSelection', 'TaskList'],
        DefinedType: ['DefinedTypeRef'],
        ExchangePlan: ['ExchangePlanRef', 'ExchangePlanObject', 'ExchangePlanManager', 'ExchangePlanSelection', 'ExchangePlanList'],
      };

      for (const obj of scanResult.objects) {
        const metadataType = typeDirToMetadataType[obj.objectTypeDir];
        if (!metadataType) continue;

        const fullName = `${metadataType}.${obj.displayName}`;
        if (
          metadataType === 'InformationRegister' ||
          metadataType === 'AccumulationRegister' ||
          metadataType === 'AccountingRegister' ||
          metadataType === 'CalculationRegister'
        ) {
          registers.push(fullName);
        }

        const prefixes = metadataTypeToTypePrefixes[metadataType];
        if (prefixes && prefixes.length) {
          for (const pfx of prefixes) {
            referenceTypes.push(`${pfx}.${obj.displayName}`);
          }
        }
      }

      registers.sort();
      referenceTypes.sort();
    } catch {
      // ignore
    }

    this.metadataCache = { registers, referenceTypes };
    return this.metadataCache;
  }

  /**
   * Загрузка дерева метаданных для редактора запросов.
   * @param onProgress — при указании используется прогрессивная загрузка: колбэк вызывается после каждого типа.
   *   Позволяет отображать дерево по мере готовности на больших конфигурациях.
   */
  private async loadMetadataTreeForWebview(
    onProgress?: (partialTree: QueryMetadataNode) => void
  ): Promise<QueryMetadataNode | null> {
    if (this.metadataTreeCache) {
      if (onProgress) onProgress(this.metadataTreeCache);
      return this.metadataTreeCache;
    }

    // Только типы, используемые в запросах 1С
    const typeDirToQuery: Record<string, { typeLabel: string; prefix: string }> = {
      FilterCriteria: { typeLabel: 'КритерииОтбора', prefix: 'КритерийОтбора' },
      ExchangePlans: { typeLabel: 'ПланыОбмена', prefix: 'ПланОбмена' },
      Constants: { typeLabel: 'Константы', prefix: 'Константа' },
      Catalogs: { typeLabel: 'Справочники', prefix: 'Справочник' },
      Documents: { typeLabel: 'Документы', prefix: 'Документ' },
      DocumentJournals: { typeLabel: 'ЖурналыДокументов', prefix: 'ЖурналДокументов' },
      Enums: { typeLabel: 'Перечисления', prefix: 'Перечисление' },
      ChartsOfCharacteristicTypes: { typeLabel: 'ПланыВидовХарактеристик', prefix: 'ПланВидовХарактеристик' },
      ChartsOfCalculationTypes: { typeLabel: 'ПланыВидовРасчета', prefix: 'ПланВидовРасчета' },
      InformationRegisters: { typeLabel: 'РегистрыСведений', prefix: 'РегистрСведений' },
      AccumulationRegisters: { typeLabel: 'РегистрыНакопления', prefix: 'РегистрНакопления' },
      CalculationRegisters: { typeLabel: 'РегистрыРасчета', prefix: 'РегистрРасчета' },
      BusinessProcesses: { typeLabel: 'БизнесПроцессы', prefix: 'БизнесПроцесс' },
      Tasks: { typeLabel: 'Задачи', prefix: 'Задача' },
      ChartsOfAccounts: { typeLabel: 'ПланыСчетов', prefix: 'ПланСчетов' },
      AccountingRegisters: { typeLabel: 'РегистрыБухгалтерии', prefix: 'РегистрБухгалтерии' },
    };

    // Разрешенные типы метаданных для навигатора
    const allowedTypes = new Set([
      'FilterCriteria',
      'ExchangePlans',
      'Constants',
      'Catalogs',
      'Documents',
      'DocumentJournals',
      'Enums',
      'ChartsOfCharacteristicTypes',
      'ChartsOfCalculationTypes',
      'InformationRegisters',
      'AccumulationRegisters',
      'CalculationRegisters',
      'BusinessProcesses',
      'Tasks',
      'ChartsOfAccounts',
      'AccountingRegisters',
    ]);

    const groupLabelMap: Record<string, string> = {
      Attributes: 'Реквизиты',
      TabularSections: 'Табличные части',
      Forms: 'Формы',
      Commands: 'Команды',
      Templates: 'Макеты',
      Predefined: 'Предопределенные',
      Members: 'Состав',
    };

    const toWeb = (
        n: MetadataTreeNode,
        ctx: { prefix?: string; objectName?: string; tabularSectionName?: string } = {}
      ): QueryMetadataNode | null => {
        if (n.kind === 'type') {
          // Фильтруем только разрешенные типы метаданных
          if (!allowedTypes.has(n.label)) {
            return null; // Пропускаем этот тип
          }
          
          const m = typeDirToQuery[n.label];
          const typeLabel = m?.typeLabel || n.label;
          const prefix = m?.prefix;
          const children = (n.children || [])
            .map((c) => toWeb(c, { ...ctx, prefix: prefix || ctx.prefix }))
            .filter((c): c is QueryMetadataNode => c !== null);
          
          // Если после фильтрации не осталось детей, пропускаем тип
          if (children.length === 0) {
            return null;
          }
          
          return {
            id: n.id,
            label: typeLabel,
            kind: 'type',
            children,
          };
        }

        if (n.kind === 'object') {
          const obj = n.object;
          const typeDir = obj?.objectTypeDir;
          const m = (typeDir && typeDirToQuery[typeDir]) || undefined;
          const prefix = m?.prefix || ctx.prefix || obj?.objectType || '';
          const objectName = obj?.name || '';
          const label = obj?.displayName || obj?.name || n.label;

          const baseChildren = (n.children || [])
            .map((c) => toWeb(c, { prefix, objectName }))
            .filter((c): c is QueryMetadataNode => c !== null);

          const virtualGroup = (() => {
            if (!prefix || !objectName) return null;
            const tableKey = `${prefix}.${objectName}`;

            const makeVirtual = (idSuffix: string, label: string, insertText: string): QueryMetadataNode => ({
              id: `${n.id}/virtual/${idSuffix}`,
              label,
              kind: 'member',
              insertText,
            });

            let members: QueryMetadataNode[] = [];

            if (prefix === 'РегистрНакопления') {
              members = [
                makeVirtual('ostatki', 'Остатки(...)', `${tableKey}.Остатки(`),
                makeVirtual('oboroty', 'Обороты(...)', `${tableKey}.Обороты(`),
                makeVirtual('ostatki_i_oboroty', 'ОстаткиИОбороты(...)', `${tableKey}.ОстаткиИОбороты(`),
              ];
            }

            if (prefix === 'РегистрБухгалтерии') {
              members = [
                makeVirtual('ostatki', 'Остатки(...)', `${tableKey}.Остатки(`),
                makeVirtual('oboroty', 'Обороты(...)', `${tableKey}.Обороты(`),
                makeVirtual('ostatki_i_oboroty', 'ОстаткиИОбороты(...)', `${tableKey}.ОстаткиИОбороты(`),
                makeVirtual('oboroty_dtkt', 'ОборотыДтКт(...)', `${tableKey}.ОборотыДтКт(`),
                makeVirtual('movements_subkonto', 'ДвиженияССубконто(...)', `${tableKey}.ДвиженияССубконто(`),
              ];
            }

            if (prefix === 'РегистрСведений') {
              members = [
                makeVirtual('srez_poslednih', 'СрезПоследних(...)', `${tableKey}.СрезПоследних(`),
                makeVirtual('srez_pervyh', 'СрезПервых(...)', `${tableKey}.СрезПервых(`),
              ];
            }

            if (prefix === 'РегистрРасчета') {
              members = [
                makeVirtual('dviheniya', 'Движения(...)', `${tableKey}.Движения(`),
                makeVirtual('period_deystviya', 'ПериодДействия(...)', `${tableKey}.ПериодДействия(`),
                makeVirtual('dannye_grafika', 'ДанныеГрафика(...)', `${tableKey}.ДанныеГрафика(`),
              ];
            }

            if (members.length === 0) return null;

            return {
              id: `${n.id}/virtual`,
              label: 'Виртуальные таблицы',
              kind: 'group',
              children: members,
            } as QueryMetadataNode;
          })();

          const children = virtualGroup ? [...baseChildren, virtualGroup] : baseChildren;

          return {
            id: n.id,
            label,
            kind: 'object',
            insertText: prefix && objectName ? `${prefix}.${objectName}` : undefined,
            children,
          };
        }

        if (n.kind === 'group') {
          const label = groupLabelMap[n.label] || n.label;
          const isTabularSectionsGroup = label === 'Табличные части' || n.label === 'TabularSections';
          // Передаем флаг в контекст для детей группы "Табличные части"
          const childCtx = isTabularSectionsGroup 
            ? { ...ctx, inTabularSectionsGroup: true }
            : { ...ctx, inTabularSectionsGroup: false };
          const children = (n.children || [])
            .map((c) => toWeb(c, childCtx))
            .filter((c): c is QueryMetadataNode => c !== null);
          
          return {
            id: n.id,
            label,
            kind: 'group',
            children,
          };
        }

        if (n.kind === 'member') {
          const memberName = String((n as any).member?.name || n.label || '').trim();
          
          // Если мы в группе "Табличные части" и у этого member есть дети (реквизиты),
          // то это табличная часть
          const isTabularSection = (ctx as any).inTabularSectionsGroup && 
            ctx.prefix && ctx.objectName && !ctx.tabularSectionName && 
            (n.children || []).length > 0;
          
          let insertText: string | undefined;
          if (ctx.prefix && ctx.objectName && memberName) {
            if (ctx.tabularSectionName) {
              // Это реквизит табличной части: Prefix.Object.TabularSection.Field
              insertText = `${ctx.prefix}.${ctx.objectName}.${ctx.tabularSectionName}.${memberName}`;
            } else {
              // Это либо реквизит объекта, либо табличная часть: Prefix.Object.Member
              insertText = `${ctx.prefix}.${ctx.objectName}.${memberName}`;
            }
          }
          
          // Если это табличная часть, обновляем контекст для детей (реквизитов табличной части)
          const childCtx = isTabularSection 
            ? { ...ctx, tabularSectionName: memberName, inTabularSectionsGroup: false }
            : ctx;
          
          const children = (n.children || [])
            .map((c) => toWeb(c, childCtx))
            .filter((c): c is QueryMetadataNode => c !== null);
          
          return {
            id: n.id,
            label: memberName || n.label,
            kind: 'member',
            insertText,
            children,
          };
        }

        // root
        const rootChildren = (n.children || [])
          .map((c) => toWeb(c, ctx))
          .filter((c): c is QueryMetadataNode => c !== null);
        
        return {
          id: n.id,
          label: n.label,
          kind: 'root',
          children: rootChildren,
        };
      };

    try {
      const rootNode: QueryMetadataNode = {
        id: 'root',
        label: 'Configuration',
        kind: 'root',
        children: [],
      };

      const onTypeLoaded = (typeNode: MetadataTreeNode) => {
        const converted = toWeb(typeNode, {});
        if (converted && converted.kind === 'type') {
          rootNode.children!.push(converted);
          onProgress?.({ ...rootNode, children: [...rootNode.children!] });
        }
      };

      const { tree } = onProgress
        ? await this.metadataRepository.loadProgressive(this.sourceRoot, onTypeLoaded)
        : await this.metadataRepository.load(this.sourceRoot);

      const mapped = toWeb(tree, {});
      this.metadataTreeCache = mapped;
      return mapped;
    } catch {
      this.metadataTreeCache = null;
      return null;
    }
  }

  private sourceRoot: string;
  private reportXmlPath: string;
  private webpanel: vscode.WebviewPanel | undefined = undefined;

  private currentTemplatePath: string | null = null;
  private currentReportPath: string | null = null;
  private currentRootTag: string = 'DataCompositionSchema';
  private currentDomDocument: Document | null = null; // DOM документ для сохранения
  private currentRootAttrs: Record<string, any> | undefined = undefined; // Атрибуты корня
  private extensionUri: vscode.Uri | undefined = undefined;

  constructor(sourceRoot: string, reportXmlPath: string) {
    this.sourceRoot = sourceRoot;
    this.reportXmlPath = reportXmlPath;
  }

  public async openEditor(extensionUri: vscode.Uri, title?: string | vscode.TreeItemLabel) {
    this.extensionUri = extensionUri;
    if (!fs.existsSync(this.reportXmlPath)) {
      vscode.window.showInformationMessage(`File ${this.reportXmlPath} does not exist.`);
      return;
    }

    statusBarProgress.show();
    statusBarProgress.text = "$(sync~spin) Загрузка редактора…";

    let panel: vscode.WebviewPanel | undefined = this.webpanel;
    if (!panel) {
      panel = vscode.window.createWebviewPanel(
        DcsEditor.viewType,
        `Редактор СКД (${title ?? ""})`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
        }
      );
      this.webpanel = panel;
      contextStatusBar.text = `1С: СКД — ${title ?? ""}`;
      contextStatusBar.show();
      panel.onDidDispose(() => {
        this.webpanel = undefined;
        contextStatusBar.hide();
      });
      panel.webview.html = this.getHtmlForWebview(panel.webview, extensionUri);

      // КРИТИЧНО: Ждем сообщения "webviewReady" от webview перед отправкой данных
      // Это предотвращает потерю сообщений, если React еще не инициализирован
      // Также добавляем fallback с таймаутом на случай, если сообщение не придет
      this.fallbackTimeout = setTimeout(() => {
        if (!this.webviewReady) {
          console.warn('[DcsEditor] Webview ready message not received, using fallback timeout');
          this.webviewReady = true;
          if (this.pendingInitMessage && panel) {
            panel.webview.postMessage(this.pendingInitMessage);
            this.pendingInitMessage = null;
          }
        }
      }, 2000); // Fallback через 2 секунды

      // Обработка сообщений от webview
      panel.webview.onDidReceiveMessage(async (message: any) => {
        if (!message || typeof message !== 'object') return;
        
        // Обработка сообщения "webviewReady" от webview
        if (message.type === 'webviewReady') {
          this.webviewReady = true;
          if (this.fallbackTimeout) {
            clearTimeout(this.fallbackTimeout);
            this.fallbackTimeout = null;
          }
          if (this.pendingInitMessage && panel) {
            panel.webview.postMessage(this.pendingInitMessage);
            this.pendingInitMessage = null;
          }
          return;
        }
        
        if (message.type === 'saveDcs') {
          await this.handleSaveDcs(message.payload, panel!);
          return;
        }

        // Запрос дерева метаданных (fallback при потере metadataTreeReady)
        if (message.type === 'requestMetadataTree' && panel) {
          const tree = this.metadataTreeCache ?? (await this.loadMetadataTreeForWebview());
          if (tree) {
            panel.webview.postMessage({ type: "metadataTreeReady", metadataTree: tree });
          }
        }
      });
    }

    try {
      const parsed: ParsedReportDcs = await parseReportXmlForDcs(this.sourceRoot, this.reportXmlPath);
      this.currentTemplatePath = parsed.templatePath;
      this.currentReportPath = parsed.reportPath;
      this.currentRootTag = String(parsed.schema?.rootTag || 'DataCompositionSchema');
      
      // ВАЖНО: Сохраняем DOM документ и атрибуты корня для последующего сохранения
      // Их нельзя отправить в webview (циклические ссылки)
      this.currentDomDocument = parsed.schema._domDocument;
      this.currentRootAttrs = parsed.schema._rootAttrs;

      const metadata = await this.scanMetadataForWebview();

      // На момент postMessage панель могла быть закрыта пользователем
      if (!panel) {
        throw new Error('Webview panel is not available');
      }

      // ВАЖНО: Удаляем _domDocument перед отправкой в webview
      // (циклические ссылки не могут быть сериализованы в JSON)
      const payloadForWebview = {
        ...parsed,
        schema: {
          ...parsed.schema,
          _domDocument: undefined, // Удаляем DOM документ
          _raw: undefined, // Удаляем _raw (тоже DOM)
        },
      };

      // Ленивая загрузка: сначала отправляем init с metadataTree: null, редактор открывается сразу
      const initMessage = {
        type: "dcsEditorInit",
        payload: payloadForWebview,
        metadata,
        metadataTree: null as QueryMetadataNode | null,
      };

      // Если webview еще не готов, сохраняем сообщение для отправки позже
      if (!this.webviewReady) {
        this.pendingInitMessage = initMessage;
      } else {
        panel.webview.postMessage(initMessage);
      }

      // Дерево метаданных загружаем в фоне с прогрессивной отдачей — UI обновляется по мере готовности типов
      void this.loadMetadataTreeForWebview((partialTree) => {
        if (this.webpanel) {
          this.webpanel.webview.postMessage({ type: "metadataTreeReady", metadataTree: partialTree });
        }
      }).then((metadataTree) => {
        if (this.webpanel && metadataTree) {
          this.webpanel.webview.postMessage({ type: "metadataTreeReady", metadataTree });
        }
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Ошибка открытия Редактор СКД: ${msg}`);
    } finally {
      statusBarProgress.hide();
    }
  }

  private getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "metadataEditor.bundle.js"));
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource} 'unsafe-inline';
                 img-src ${webview.cspSource} data: https:;
                 font-src ${webview.cspSource};
                 connect-src ${webview.cspSource};
                 worker-src ${webview.cspSource} blob:;
                 script-src ${webview.cspSource} 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Редактор СКД</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">
    window.__APP_MODE__ = 'dcsEditor';
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private reorderRootSectionsForSave(nodes: ParsedDcsNode[]): ParsedDcsNode[] {
    const list = Array.isArray(nodes) ? nodes.slice() : [];

    const localTag = (tag: string) => {
      const t = String(tag || '');
      const idx = t.lastIndexOf(':');
      return idx >= 0 ? t.slice(idx + 1) : t;
    };

    // Правильный порядок тегов в 1С СКД (по анализу реальных отчетов):
    // 1. dataSource, dataSet
    // 2. dataSetLink
    // 3. totalField (ВСЕ totalField должны быть перед calculatedField)
    // 4. calculatedField (ВСЕ calculatedField должны быть после totalField)
    // 5. parameter
    // 6. template
    // 7. groupHeaderTemplate (перед groupTemplate)
    // 8. groupTemplate
    // 9. totalFieldsTemplate
    // 10. fieldTemplate (после template)
    // 11. settingsVariant
    
    const dataSources: ParsedDcsNode[] = [];
    const dataSets: ParsedDcsNode[] = [];
    const links: ParsedDcsNode[] = [];
    const totals: ParsedDcsNode[] = [];
    const calcs: ParsedDcsNode[] = [];
    const params: ParsedDcsNode[] = [];
    const templates: ParsedDcsNode[] = [];
    const groupHeaderTemplates: ParsedDcsNode[] = [];
    const groupTemplates: ParsedDcsNode[] = [];
    const totalFieldsTemplates: ParsedDcsNode[] = [];
    const fieldTemplates: ParsedDcsNode[] = [];
    const settings: ParsedDcsNode[] = [];
    const others: ParsedDcsNode[] = [];

    for (const n of list) {
      const lt = localTag(n?.tag as any);
      if (lt === 'dataSource') dataSources.push(n);
      else if (lt === 'dataSet') dataSets.push(n);
      else if (lt === 'dataSetLink') links.push(n);
      else if (lt === 'totalField') totals.push(n);
      else if (lt === 'calculatedField') calcs.push(n);
      else if (lt === 'parameter') params.push(n);
      else if (lt === 'template') templates.push(n);
      else if (lt === 'groupHeaderTemplate') groupHeaderTemplates.push(n);
      else if (lt === 'groupTemplate') groupTemplates.push(n);
      else if (lt === 'totalFieldsTemplate') totalFieldsTemplates.push(n);
      else if (lt === 'fieldTemplate') fieldTemplates.push(n);
      else if (lt === 'settingsVariant') settings.push(n);
      else others.push(n);
    }

    // Переупорядочиваем детей dataSet (query должен быть после dataSource)
    const reorderedDataSets = dataSets.map(ds => this.reorderDataSetChildren(ds));

    // Собираем в правильном порядке:
    // - ВСЕ totalField идут перед ВСЕМИ calculatedField
    // - calculatedField следуют после всех totalField
    // - groupHeaderTemplate перед groupTemplate
    // - fieldTemplate следует после template
    return [
      ...dataSources,
      ...reorderedDataSets,
      ...links,
      ...totals,    // Все totalField сначала
      ...calcs,     // Все calculatedField после всех totalField
      ...params,
      ...templates, // template
      ...groupHeaderTemplates, // groupHeaderTemplate перед groupTemplate
      ...groupTemplates, // groupTemplate
      ...totalFieldsTemplates, // totalFieldsTemplate
      ...fieldTemplates, // fieldTemplate после template
      ...settings,
      ...others
    ];
  }

  /**
   * Переупорядочивает дочерние элементы dataSet для соответствия структуре 1С
   * 
   * КРИТИЧЕСКИ ВАЖНО: Порядок элементов в dataSet должен строго соответствовать требованиям 1С:
   * 1. name - имя набора данных
   * 2. field - все поля набора данных
   * 3. dataSource - ссылка на источник данных
   * 4. query (или items для DataSetUnion) - запрос должен быть ПОСЛЕ dataSource
   * 5. остальные элементы (например, autoFillFields)
   * 
   * Неправильный порядок может привести к ошибкам XDTO при загрузке в конфигуратор 1С.
   */
  private reorderDataSetChildren(dataSetNode: ParsedDcsNode): ParsedDcsNode {
    if (!dataSetNode.children || dataSetNode.children.length === 0) {
      return dataSetNode;
    }

    const localTag = (tag: string) => {
      const t = String(tag || '');
      const idx = t.lastIndexOf(':');
      return idx >= 0 ? t.slice(idx + 1) : t;
    };

    const children = dataSetNode.children.slice();
    
    // Группируем элементы по типам
    const names: ParsedDcsNode[] = [];
    const fields: ParsedDcsNode[] = [];
    const dataSources: ParsedDcsNode[] = [];
    const queries: ParsedDcsNode[] = [];
    const others: ParsedDcsNode[] = [];

    for (const child of children) {
      const lt = localTag(child.tag);
      if (lt === 'name') {
        names.push(child);
      } else if (lt === 'field') {
        fields.push(child);
      } else if (lt === 'dataSource') {
        dataSources.push(child);
      } else if (lt === 'query' || lt === 'items') {
        // query или items (для DataSetUnion) должны быть ПОСЛЕ dataSource
        queries.push(child);
      } else {
        // Остальные элементы (autoFillFields и т.д.)
        others.push(child);
      }
    }

    // Собираем в правильном порядке согласно требованиям 1С:
    // name -> field -> dataSource -> query -> others
    const reorderedChildren = [
      ...names,
      ...fields,
      ...dataSources,
      ...queries,
      ...others
    ];

    return {
      ...dataSetNode,
      children: reorderedChildren
    };
  }

  private async handleSaveDcs(
    payload: {
      schemaChildren: ParsedDcsNode[];
      _originalXml?: string; // Опциональный (для обратной совместимости)
      // _raw и _rootAttrs больше не нужны - используем сохраненные значения
      reportPath?: string;
      templatePath?: string;
      rootTag?: string;
      templateName?: string;
    },
    panel: vscode.WebviewPanel
  ): Promise<void> {
    try {
      const schemaChildren = Array.isArray(payload?.schemaChildren)
        ? this.reorderRootSectionsForSave(payload.schemaChildren)
        : [];

      // ВАЖНО: Используем сохраненные DOM документ и атрибуты
      // (их нельзя отправить в webview из-за циклических ссылок)
      const rootTag = this.currentRootTag || 'DataCompositionSchema';
      const rootAttrs = this.currentRootAttrs;
      const templatePath = this.currentTemplatePath || '';
      const reportPath = this.currentReportPath || '';
      
      if (!this.currentDomDocument) throw new Error('DOM документ не сохранен');
      if (!templatePath) throw new Error('Не определён путь Template.xml');

      // Сериализуем изменения напрямую в XML через xmldom
      // Без XmlDiffMerge - xmldom сохраняет структуру автоматически
      let updatedXml = serializeToXml(this.currentDomDocument, rootTag, schemaChildren, rootAttrs);
      updatedXml = normalizeXML(updatedXml);

      const validation = validateXML(updatedXml);
      if (!validation.valid) {
        throw new Error(validation.error ?? 'Результат сохранения не является валидным XML');
      }

      const structureValidationEnabled = vscode.workspace.getConfiguration('metadataViewer').get<boolean>('structureValidationEnabled', true);
      if (structureValidationEnabled && this.extensionUri) {
        const structureResult = validateXmlStructure(updatedXml, {
          extensionPath: this.extensionUri.fsPath,
          filePath: templatePath,
          rootTag: 'DataCompositionSchema'
        });
        if (!structureResult.valid && structureResult.errors?.length) {
          const errorMessage = structureResult.errors.slice(0, 3).join('; ');
          throw new Error(`Ошибка структуры XML СКД: ${errorMessage}`);
        }
      }

      // Сохранить Template.xml с BOM (как в оригинальных файлах 1С)
      // ВАЖНО: 1С конфигуратор требует UTF-8 с BOM (EF BB BF)
      const bomBuffer = Buffer.from([0xEF, 0xBB, 0xBF]);
      const contentBuffer = Buffer.from(updatedXml, 'utf8');
      fs.writeFileSync(templatePath, Buffer.concat([bomBuffer, contentBuffer]));
      
      // Логируем измененный файл в Commit.txt
      CommitFileLogger.getInstance().logChangedFile(templatePath);

      // 5) (MVP) Report.xml пока не обновляем автоматически.
      // Но если reportPath известен, оставляем место для дальнейшей логики.
      void reportPath;

      panel.webview.postMessage({ type: 'dcsSaved', success: true });
      vscode.window.showInformationMessage('СКД сохранена');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      try {
        panel.webview.postMessage({ type: 'dcsSaved', success: false, error: msg });
      } catch {
        // ignore
      }
      vscode.window.showErrorMessage(`Ошибка сохранения СКД: ${msg}`);
    }
  }
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}





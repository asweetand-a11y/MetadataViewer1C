import * as fs from 'fs';
import * as glob from 'fast-glob';
import * as vscode from 'vscode';
import { posix, join as pathJoin, relative as pathRelative, basename as pathBasename, isAbsolute as pathIsAbsolute, sep as pathSep, normalize as pathNormalize } from 'path';
import { MetadataFile, MetadataItemForTree, VersionMetadata } from './metadataInterfaces';
import { TemplateFile } from './templatInterfaces';
import { TemplateEditorPanel } from './panels/TemplateEditorPanel';
import { PredefinedDataFile } from './predefinedDataInterfaces';
import { PredefinedDataPanel } from './predefinedDataPanel';
import { getWebviewContent } from './Metadata/Configuration/getWebviewContent';
import { Configuration } from './Metadata/Configuration/configuration';
import { XMLParser } from 'fast-xml-parser';
import { CreatePath, GetTreeItem, TreeItem } from './ConfigurationFormats/utils';
import { Edt } from './ConfigurationFormats/edt';
import { MetadataCache, TREE_CACHE_VERSION } from './runtime/MetadataCache';
import { hydrateTree, serializeTree } from './runtime/hydrate';
import { TreeCacheEnvelope, SerializableTreeNode } from './runtime/types';
import { outputChannel, statusBarProgress, contextStatusBar } from './extension';
import { ParsedMetadataObject } from './xmlParsers/metadataParser';
import { METADATA_TYPES } from './Metadata/metadata-types';
import { parsePredefinedXml, getPredefinedPath } from './xmlParsers/predefinedParser';
import {
  runUpdateConfigDumpFromCommitTxt,
  syncConfigDumpInfoWithFileSystem,
} from './utils/configDumpInfoUpdater';
import { CommitFileLogger } from './utils/commitFileLogger';
import { validateCommittedXmlContent } from './validation/metadataXmlValidator';

interface MetadataDictionaries {
	form: { [key: string]: TreeItem[] },
	template: { [key: string]: TreeItem[] },
	predefined: { [key: string]: TreeItem[] },
}

interface MetadataObjects {
  subsystem: TreeItem[],
	commonModule: TreeItem[],
	sessionParameter: TreeItem[],
	role: TreeItem[],
	commonAttribute: TreeItem[],
	exchangePlan: TreeItem[],
	eventSubscription: TreeItem[],
	scheduledJob: TreeItem[],
  commonForm: TreeItem[],
  commonTemplate: TreeItem[],
  commonPicture: TreeItem[],
  webService: TreeItem[],
  httpService: TreeItem[],
  wsReference: TreeItem[],
  style: TreeItem[],
	constant: TreeItem[],
	catalog: TreeItem[],
	document: TreeItem[],
  documentNumerator: TreeItem[],
  sequence: TreeItem[],
	documentJournal: TreeItem[],
	enum: TreeItem[],
	report: TreeItem[],
	dataProcessor: TreeItem[],
  сhartOfCharacteristicTypes: TreeItem[],
  chartOfAccounts: TreeItem[],
  chartOfCalculationTypes: TreeItem[],
	informationRegister: TreeItem[],
	accumulationRegister: TreeItem[],
  accountingRegister: TreeItem[],
  calculationRegister: TreeItem[],
  businessProcess: TreeItem[],
  task: TreeItem[],
  externalDataSource: TreeItem[],
  definedType: TreeItem[],
}

export class MetadataView {
  rootPath?: vscode.Uri;
  panel: vscode.WebviewPanel | undefined = undefined;
  // Фильтр нужен по каждой конфигурации отдельно
  subsystemFilter: { id: string; objects: string[] }[] = [];
  dataProvider: NodeWithIdTreeDataProvider | null = null;
  private readonly cache: MetadataCache;
  private readonly reindexStatusBarItem: vscode.StatusBarItem;
  /** Путь к корню расширения на диске (для загрузки JSON-схем валидации). */
  private readonly extensionPathFs: string;
  private treeView: vscode.TreeView<TreeItem> | undefined;

	constructor(context: vscode.ExtensionContext) {
    try {
      this.cache = new MetadataCache(context, outputChannel);
      this.rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
        ? vscode.workspace.workspaceFolders[0].uri : undefined;

      this.dataProvider = new NodeWithIdTreeDataProvider();
      const view = vscode.window.createTreeView('metadataView', { treeDataProvider: this.dataProvider, showCollapseAll: true });
      this.treeView = view;
      context.subscriptions.push(view);
      outputChannel.appendLine('TreeView "metadataView" успешно создан');

      this.reindexStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
      context.subscriptions.push(this.reindexStatusBarItem);
      this.extensionPathFs = context.extensionUri.fsPath;

      // Инвалидация кэша Content подсистем при изменении файлов
      if (this.rootPath) {
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.rootPath, '**/Subsystems/**/*.{xml,mdo}'));
        watcher.onDidChange(() => clearSubsystemContentCache());
        watcher.onDidCreate(() => clearSubsystemContentCache());
        watcher.onDidDelete(() => clearSubsystemContentCache());
        context.subscriptions.push(watcher);
      }

      view.onDidExpandElement((e: vscode.TreeViewExpansionEvent<TreeItem>) => {
        void this.expand(e.element);
      });

      view.onDidChangeSelection((e: vscode.TreeViewSelectionChangeEvent<TreeItem>) => {
        const sel = e.selection;
        if (sel.length > 0 && sel[0].label) {
          const l = sel[0].label;
          const s = typeof l === 'string' ? l : (l && (l as vscode.TreeItemLabel).label) || '';
          if (s) {
            contextStatusBar.text = `1С: ${s}`;
            contextStatusBar.show();
          } else {
            contextStatusBar.hide();
          }
        } else {
          contextStatusBar.hide();
        }
      });
    } catch (error) {
      outputChannel.appendLine(`Ошибка при создании TreeView: ${error}`);
      vscode.window.showErrorMessage(`Ошибка создания TreeView: ${error}`);
      throw error;
    }

		void (async () => {
      const folders = vscode.workspace.workspaceFolders ?? [];
      if (folders.length === 0 || !this.dataProvider) return;
      statusBarProgress.show();
      statusBarProgress.text = '$(sync~spin) Поиск конфигураций…';
      try {
        await Promise.allSettled(folders.map(f => LoadAndParseConfigurationXml(f.uri, this.dataProvider!)));
      } finally {
        statusBarProgress.hide();
      }
    })();

    vscode.commands.registerCommand('metadataViewer.showTemplate', (nodeOrPath: TreeItem | string, configType?: string) => {
      if (nodeOrPath instanceof TreeItem) {
        // Вызов из контекстного меню
        if (nodeOrPath.path && nodeOrPath.configType) {
          this.openTemplate(context, nodeOrPath.path, nodeOrPath.configType);
        } else {
          vscode.window.showWarningMessage('Не удалось определить путь к макету');
        }
      } else if (typeof nodeOrPath === 'string') {
        // Вызов из commandArguments (клик на элемент дерева)
        // configType передается как второй аргумент или берется из второго элемента массива arguments
        this.openTemplate(context, nodeOrPath, configType || 'xml');
      } else {
        vscode.window.showWarningMessage('Неверный формат вызова команды предпросмотра макета');
      }
    });

    vscode.commands.registerCommand('metadataViewer.openPredefinedData', (item) => this.openPredefinedData(context, item));
    vscode.commands.registerCommand('metadataViewer.openHandler', (item) => this.openHandler(item));
    vscode.commands.registerCommand('metadataViewer.openMetadataProperties', (item) => this.openMetadataProperties(context, item));
    vscode.commands.registerCommand('metadataViewer.searchInTree', () => this.searchInTree());
    vscode.commands.registerCommand('metadataViewer.reindexStructure', async () => {
      await this.reindexStructure();
    });
    vscode.commands.registerCommand('metadataViewer.updateConfigDumpFromCommit', async (item?: TreeItem) => {
      await this.updateConfigDumpFromCommit(item);
    });
    vscode.commands.registerCommand('metadataViewer.refreshObjectStructure', async (item: TreeItem) => {
      await this.refreshObjectStructure(item);
    });
    vscode.commands.registerCommand('metadataViewer.filterBySubsystem', (item) => this.filterBySubsystem(item, true));
    vscode.commands.registerCommand('metadataViewer.clearFilter', (item) => this.filterBySubsystem(item, false));
    vscode.commands.registerCommand('metadataViewer.selectSubsystemToFilter', (item) => this.selectSubsystemToFilter(item));
    // Локальное обновление дерева/кэша после редактирования объекта метаданных
    vscode.commands.registerCommand('metadataViewer.refreshObjectByPath', async (filePath: string) => {
      await this.refreshObjectByPath(filePath);
    });
	}

  /**
   * Локальное обновление кэша для конфигурации,
   * содержащей указанный XML-файл объекта.
   *
   * Сейчас реализовано как инвалидация кэша для конфигурации.
   * Фактическая пересборка дерева произойдёт при следующем раскрытии
   * узла конфигурации (expand), чтобы не ломать текущее состояние дерева.
   */
  private async refreshObjectByPath(filePath: string): Promise<void> {
    if (!filePath || !tree[0].children || tree[0].children.length === 0) {
      return;
    }

    const normalized = filePath.replace(/\\/g, '/');

    // Находим конфигурацию, внутри которой лежит файл
    let configNode: TreeItem | undefined;
    let configRoot: string | undefined;
    for (const cfg of tree[0].children) {
      if (!cfg.path) {
        continue;
      }
      const cfgPath = cfg.path.replace(/\\/g, '/');
      if (normalized.startsWith(cfgPath + '/') || normalized === cfgPath) {
        // Выбираем самую длинную подходящую строку (на случай вложенностей)
        if (!configNode || (configRoot && cfgPath.length > configRoot.length)) {
          configNode = cfg;
          configRoot = cfgPath;
        }
      }
    }

    if (!configNode || !configRoot) {
      outputChannel.appendLine(`[MetadataView.refreshObjectByPath] Конфигурация для файла ${filePath} не найдена`);
      return;
    }

    // Инвалидация кэша для этой конфигурации
    await this.cache.invalidate(configRoot);
    outputChannel.appendLine(`[MetadataView.refreshObjectByPath] Инвалидирован кэш для конфигурации: ${configRoot}`);
  }

  /**
   * Полная пересборка дерева метаданных и сброс всего кэша.
   * Используется командой "Reindex structure".
   * Отображает прогресс в status bar, включая «проиндексировано x/N».
   */
  private async reindexStructure(): Promise<void> {
    clearSubsystemContentCache();
    const sb = this.reindexStatusBarItem;
    try {
      sb.show();
      sb.text = '$(sync~spin) Переиндексация: очистка кэша…';
      await this.cache.invalidateAll?.();

      sb.text = '$(sync~spin) Переиндексация: очистка дерева…';
      tree[0].children = [];
      this.dataProvider?.update();

      if (!this.rootPath || !this.dataProvider) {
        sb.text = '$(check) Переиндексация завершена';
        outputChannel.appendLine('[MetadataView.reindexStructure] Полная пересборка дерева метаданных выполнена');
        setTimeout(() => sb.hide(), 2500);
        return;
      }

      sb.text = '$(sync~spin) Переиндексация: поиск конфигураций…';
      const allConfigs: { folder: vscode.Uri; configRoot: string; xmlPath: string; type: 'xml' | 'edt' }[] = [];
      const folders = vscode.workspace.workspaceFolders ?? [];
      for (const folder of folders) {
        const items = searchConfigurationsOnly(folder.uri);
        for (const it of items) {
          allConfigs.push({ folder: folder.uri, configRoot: it.configRoot, xmlPath: it.xmlPath, type: it.type });
        }
      }
      const N = allConfigs.length;

      // Синхронизация ConfigDumpInfo.xml с файловой структурой для XML-конфигураций.
      // Добавляет записи для объектов, созданных вручную (например, новая обработка в DataProcessors).
      sb.text = '$(sync~spin) Переиндексация: синхронизация ConfigDumpInfo…';
      for (const cfg of allConfigs) {
        if (cfg.type === 'xml') {
          try {
            const syncResult = await syncConfigDumpInfoWithFileSystem(cfg.configRoot, outputChannel);
            if (syncResult.addedCount > 0) {
              outputChannel.appendLine(`[MetadataView.reindexStructure] ConfigDumpInfo: добавлено ${syncResult.addedCount} объектов для ${cfg.configRoot}`);
            }
            if (syncResult.errors.length > 0) {
              outputChannel.appendLine(`[MetadataView.reindexStructure] ConfigDumpInfo sync: ${syncResult.errors.join('; ')}`);
            }
          } catch (syncErr) {
            const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
            outputChannel.appendLine(`[MetadataView.reindexStructure] Ошибка синхронизации ConfigDumpInfo: ${msg}`);
          }
        }
      }

      sb.text = '$(sync~spin) Переиндексация: загрузка конфигураций…';
      let x = 0;
      for (const cfg of allConfigs) {
        await loadSingleConfiguration(cfg.folder, cfg, this.dataProvider!);
        x++;
        sb.text = `$(sync~spin) Переиндексация: загрузка конфигураций — проиндексировано ${x}/${N}`;
      }

      sb.text = '$(check) Переиндексация завершена';
      outputChannel.appendLine('[MetadataView.reindexStructure] Полная пересборка дерева метаданных выполнена');
      setTimeout(() => sb.hide(), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      outputChannel.appendLine(`[MetadataView.reindexStructure] Ошибка: ${msg}`);
      sb.text = '$(alert) Переиндексация: ошибка';
      setTimeout(() => sb.hide(), 2500);
      throw err;
    }
  }

  /**
   * Обновление ConfigDumpInfo.xml по списку путей из Commit.txt для выбранной XML-конфигурации.
   * С валидацией исходных XML и итогового дампа, прогресс в статус-баре.
   */
  private async updateConfigDumpFromCommit(item?: TreeItem): Promise<void> {
    const normalizeFs = (s: string) => pathNormalize(s).replace(/\\/g, '/').toLowerCase();

    const sb = this.reindexStatusBarItem;
    if (!item?.path) {
      vscode.window.showWarningMessage('Выберите конфигурацию в дереве метаданных.');
      return;
    }
    if (item.configType === 'edt') {
      vscode.window.showInformationMessage('Обновление дампа по Commit.txt для EDT не поддерживается.');
      return;
    }

    const configRoot = item.path;
    const logger = CommitFileLogger.getInstance();
    if (!logger.getResolvedCommitFilePath()) {
      vscode.window.showWarningMessage(
        'Не задан путь к Commit.txt (параметр metadataViewer.commitFilePath).'
      );
      return;
    }

    sb.show();
    sb.text = '$(sync~spin) Обновление дампа: чтение Commit.txt…';
    const allLogged = logger.getLoggedPaths();
    const cfgNorm = normalizeFs(configRoot);
    const xmlUnderConfig = allLogged.filter((p) => {
      const pl = normalizeFs(p);
      if (!pl.endsWith('.xml')) {
        return false;
      }
      return pl.startsWith(`${cfgNorm}/`) || pl === cfgNorm;
    });

    if (xmlUnderConfig.length === 0) {
      sb.text = '$(alert) Обновление дампа: нет путей';
      outputChannel.appendLine(
        `[updateConfigDumpFromCommit] Нет .xml из Commit.txt под ${configRoot}`
      );
      vscode.window.showInformationMessage(
        'В Commit.txt нет XML-файлов для выбранной конфигурации.'
      );
      setTimeout(() => sb.hide(), 2500);
      return;
    }

    const structureValidationEnabled = vscode.workspace
      .getConfiguration('metadataViewer')
      .get<boolean>('structureValidationEnabled', true);

    const total = xmlUnderConfig.length;
    const progressEvery = 5;
    for (let i = 0; i < total; i++) {
      const fp = xmlUnderConfig[i];
      sb.text = `$(sync~spin) Обновление дампа: валидация ${i + 1}/${total}`;
      if (i % progressEvery === 0) {
        await new Promise<void>((r) => setImmediate(r));
      }

      if (!fs.existsSync(fp)) {
        continue;
      }

      let content: string;
      try {
        content = fs.readFileSync(fp, 'utf8');
        if (content.charCodeAt(0) === 0xfeff) {
          content = content.slice(1);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        sb.text = '$(alert) Обновление дампа: ошибка';
        vscode.window.showErrorMessage(`Не удалось прочитать ${fp}: ${msg}`);
        outputChannel.appendLine(`[updateConfigDumpFromCommit] ${msg}`);
        setTimeout(() => sb.hide(), 2500);
        return;
      }

      const vErr = validateCommittedXmlContent(
        fp,
        this.extensionPathFs,
        content,
        structureValidationEnabled
      );
      if (vErr.length > 0) {
        sb.text = '$(alert) Обновление дампа: ошибка валидации';
        const lines = vErr.slice(0, 12).map((e) => `${fp} — ${e}`);
        outputChannel.appendLine('[updateConfigDumpFromCommit] Ошибка валидации XML');
        lines.forEach((line) => outputChannel.appendLine(`  ${line}`));
        const joined = lines.join('; ');
        const shortToast =
          joined.length > 200 ? `${joined.slice(0, 200)}…` : joined;
        vscode.window
          .showErrorMessage(`Валидация XML. ${shortToast}`, 'Открыть лог')
          .then((sel) => {
            if (sel === 'Открыть лог') {
              outputChannel.show(true);
            }
          });
        setTimeout(() => sb.hide(), 2500);
        return;
      }
    }

    sb.text = '$(sync~spin) Обновление дампа: синхронизация и запись…';
    await new Promise<void>((r) => setImmediate(r));

    let runResult;
    try {
      runResult = await runUpdateConfigDumpFromCommitTxt({
        configRoot,
        commitXmlPaths: xmlUnderConfig,
        extensionPath: this.extensionPathFs,
        structureValidationEnabled,
        outputChannel,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      outputChannel.appendLine(`[updateConfigDumpFromCommit] ${msg}`);
      sb.text = '$(alert) Обновление дампа: ошибка';
      vscode.window.showErrorMessage(msg);
      setTimeout(() => sb.hide(), 2500);
      return;
    }

    if (!runResult.ok) {
      sb.text = '$(alert) Обновление дампа: ошибка';
      const parts = [...runResult.errors, ...runResult.dumpValidationErrors];
      const msg = parts.join('; ') || 'Не удалось обновить дамп';
      outputChannel.appendLine(`[updateConfigDumpFromCommit] ${msg}`);
      vscode.window.showErrorMessage(msg.substring(0, 300));
      setTimeout(() => sb.hide(), 2500);
      return;
    }

    sb.text = '$(sync~spin) Обновление дампа: сброс кэша…';
    await this.cache.invalidate(configRoot);
    outputChannel.appendLine(
      `[updateConfigDumpFromCommit] Готово. Добавлено записей (sync): ${runResult.addedBySync}; обновлены Metadata: ${runResult.applyResult.bumpedNames.length}; удалены записи: ${runResult.applyResult.removedNames.length}`
    );
    if (runResult.applyResult.skippedPaths.length > 0) {
      outputChannel.appendLine(
        `[updateConfigDumpFromCommit] Пропущены пути (не сопоставлены с Metadata): ${runResult.applyResult.skippedPaths.length}`
      );
    }

    sb.text = '$(check) Дамп конфигурации обновлён';
    vscode.window.showInformationMessage('ConfigDumpInfo.xml обновлён по Commit.txt.');
    setTimeout(() => sb.hide(), 2500);
  }

  /**
   * Поиск по дереву метаданных.
   * Пользователь вводит текст, через 3 секунды после последнего ввода выполняется поиск.
   * Найденные объекты отображаются в QuickPick, при выборе — позиционирование и выделение в дереве.
   */
  private searchInTree(): void {
    const DEBOUNCE_MS = 3000;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    if (!tree[0].children?.length) {
      vscode.window.showInformationMessage('Дерево метаданных пусто. Выполните переиндексацию.');
      return;
    }

    const input = vscode.window.createInputBox();
    input.placeholder = 'Введите текст для поиска (поиск через 3 сек после ввода)…';
    input.prompt = 'Поиск по дереву метаданных';
    input.show();

    const runSearch = (query: string) => {
      if (!query.trim()) return;
      const q = query.trim().toLowerCase();
      const matches: { item: TreeItem; breadcrumb: string }[] = [];

      const collect = (nodes: TreeItem[] | undefined, breadcrumb: string) => {
        if (!nodes) return;
        for (const node of nodes) {
          const label = typeof node.label === 'string' ? node.label : (node.label as vscode.TreeItemLabel)?.label ?? '';
          const fullPath = breadcrumb ? `${breadcrumb} / ${label}` : label;
          if (label && label.toLowerCase().includes(q)) {
            matches.push({ item: node, breadcrumb: fullPath });
          }
          collect(node.children, fullPath);
        }
      };

      collect(tree[0].children, '');

      if (matches.length === 0) {
        vscode.window.showInformationMessage(`По запросу «${query}» ничего не найдено`);
        return;
      }

      const items = matches.map((m) => ({
        label: (typeof m.item.label === 'string' ? m.item.label : (m.item.label as vscode.TreeItemLabel)?.label) ?? '',
        description: m.breadcrumb,
        treeItem: m.item,
      }));

      vscode.window.showQuickPick(items, {
        placeHolder: `Найдено: ${matches.length}. Выберите объект`,
        matchOnDescription: true,
      }).then(async (selected) => {
        if (!selected || !this.treeView) return;
        const itemId = selected.treeItem.id;
        const debugMode = vscode.workspace.getConfiguration().get<boolean>('metadataViewer.debugMode', false);
        outputChannel.appendLine(`[searchInTree] Выбран: "${selected.label}" id="${itemId}"`);
        const itemIdNorm = itemId.replace(/\\/g, '/');
        const configNode = tree[0].children?.find((c) => {
          if (!c.isConfiguration) return false;
          const cfgIdNorm = c.id.replace(/\\/g, '/');
          return itemIdNorm.startsWith(cfgIdNorm + '/') || itemIdNorm === cfgIdNorm;
        });
        outputChannel.appendLine(`[searchInTree] configNode: ${configNode ? configNode.id : 'не найден'}`);
        if (configNode) {
          await this.expand(configNode);
        }
        const itemInTree = SearchTree(tree[0], itemId) ?? SearchTreeByNormalizedId(tree[0], itemId);
        outputChannel.appendLine(`[searchInTree] itemInTree: ${itemInTree ? `найден (id=${itemInTree.id})` : 'НЕ НАЙДЕН'}`);
        if (!itemInTree && debugMode) {
          outputChannel.appendLine(`[searchInTree] Примеры id в дереве: ${collectSampleIds(tree[0], 12).join(' | ')}`);
        }
        const toReveal = itemInTree ?? selected.treeItem;
        try {
          await vscode.commands.executeCommand('metadataView.focus');
          await new Promise((r) => setTimeout(r, 80));
        } catch {
          // команда focus может отсутствовать в некоторых контекстах
        }
        // Последовательно раскрываем путь от корня до целевого узла — reveal срабатывает только при уже раскрытом пути
        const pathToItem = getPathFromRootToItem(toReveal);
        if (debugMode) {
          outputChannel.appendLine(`[searchInTree] Путь от корня (${pathToItem.length} элементов):`);
          pathToItem.forEach((node, idx) => {
            const lbl = typeof node.label === 'string' ? node.label : (node.label as vscode.TreeItemLabel)?.label ?? '';
            outputChannel.appendLine(`  [${idx}] id="${node.id}" label="${lbl}" parentId="${node.parentId}"`);
          });
        }
        for (let i = 0; i < pathToItem.length - 1; i++) {
          const node = pathToItem[i];
          if (debugMode) {
            const lbl = typeof node.label === 'string' ? node.label : (node.label as vscode.TreeItemLabel)?.label ?? '';
            outputChannel.appendLine(`[searchInTree] Раскрываю [${i}]: "${lbl}" (collapsibleState: ${node.collapsibleState})`);
          }
          // Если узел ещё не раскрыт — принудительно раскрываем его children
          if (node.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed && node.children && node.children.length > 0) {
            node.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
            this.dataProvider?.update();
          }
          this.treeView.reveal(node, { select: false, focus: false, expand: 1 });
          await new Promise((r) => setTimeout(r, 80));
        }
        if (debugMode) {
          const lbl = typeof toReveal.label === 'string' ? toReveal.label : (toReveal.label as vscode.TreeItemLabel)?.label ?? '';
          outputChannel.appendLine(`[searchInTree] Финальный reveal: "${lbl}"`);
        }
        this.treeView.reveal(toReveal, { select: true, focus: true, expand: 1 });
      });
    };

    input.onDidChangeValue((value) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = undefined;
        runSearch(value);
      }, DEBOUNCE_MS);
    });

    input.onDidHide(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      input.dispose();
    });
  }

  /**
   * Точечное обновление структуры конкретного объекта метаданных.
   * Перечитывает XML объекта и обновляет узел в дереве и кэше.
   */
  private async refreshObjectStructure(item: TreeItem): Promise<void> {
    // 1. Проверка валидности item
    if (!item.path || !item.id) {
      vscode.window.showWarningMessage('Не удалось определить объект для обновления');
      return;
    }

    try {
      // 2. Определение конфигурации и типа объекта
      outputChannel.appendLine(`[MetadataView.refreshObjectStructure] Поиск конфигурации для объекта: path=${item.path}, id=${item.id}`);
      const configRoot = this.findConfigRoot(item);
      if (!configRoot) {
        const errorMsg = `Не удалось определить конфигурацию для объекта. Путь объекта: ${item.path}, ID: ${item.id}`;
        outputChannel.appendLine(`[MetadataView.refreshObjectStructure] ${errorMsg}`);
        vscode.window.showWarningMessage(errorMsg);
        return;
      }
      outputChannel.appendLine(`[MetadataView.refreshObjectStructure] Найдена конфигурация: ${configRoot}`);

      const objectPath = item.path;
      const objectXmlPath = this.getObjectXmlPath(objectPath, item.configType);

      // 3. Проверка существования XML файла
      if (!fs.existsSync(objectXmlPath)) {
        vscode.window.showWarningMessage(`XML файл не найден: ${objectXmlPath}`);
        return;
      }

      // 4. Перечтение XML файла объекта
      const sb = this.reindexStatusBarItem;
      sb.show();
      sb.text = `$(sync~spin) Обновление «${item.label}»…`;
      try {
        const debugMode = vscode.workspace.getConfiguration().get<boolean>('metadataViewer.debugMode', false);
        if (debugMode) {
          outputChannel.appendLine(`[MetadataView.refreshObjectStructure] Читаем XML файл объекта: ${objectXmlPath}`);
        }
        const { parseMetadataXml } = await import('./xmlParsers/metadataParser');
        const updatedObject = await parseMetadataXml(objectXmlPath);
      outputChannel.appendLine(`[MetadataView.refreshObjectStructure] XML объекта перечитан: ${updatedObject.objectType}.${updatedObject.name}`);
      if (debugMode) {
        outputChannel.appendLine(`[MetadataView.refreshObjectStructure] Реквизитов в XML: ${updatedObject.attributes?.length || 0}, ТЧ: ${updatedObject.tabularSections?.length || 0}`);
        if (updatedObject.attributes && updatedObject.attributes.length > 0) {
          updatedObject.attributes.forEach((attr, idx) => {
            outputChannel.appendLine(`[MetadataView.refreshObjectStructure]   Реквизит ${idx}: ${attr.name} (${attr.type})`);
          });
        }
      }

      // 5. Точечное обновление кэша конфигурации
      await this.updateCacheNode(configRoot, item, updatedObject);

      // 6. Обновление узла в текущем дереве (для немедленного отображения)
      await this.updateTreeNode(item, updatedObject, configRoot);

      // 7. Обновление отображения
      this.dataProvider?.update();
      
      vscode.window.showInformationMessage(`Структура объекта "${item.label}" обновлена`);
      outputChannel.appendLine(`[MetadataView.refreshObjectStructure] Структура объекта "${item.label}" успешно обновлена`);
      } finally {
        sb.hide();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[MetadataView.refreshObjectStructure] Ошибка: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        outputChannel.appendLine(`[MetadataView.refreshObjectStructure] Stack trace: ${error.stack}`);
      }
      vscode.window.showErrorMessage(`Ошибка при обновлении структуры объекта: ${errorMessage}`);
    }
  }

  /**
   * Находит корневой путь конфигурации, к которой принадлежит объект
   */
  private findConfigRoot(item: TreeItem): string | null {
    if (!item.path) {
      return null;
    }

    const normalized = item.path.replace(/\\/g, '/');

    // Ищем конфигурацию, внутри которой лежит объект
    // Проверяем все конфигурации в дереве
    if (!tree[0].children || tree[0].children.length === 0) {
      return null;
    }

    let configNode: TreeItem | undefined;
    let configRoot: string | undefined;

    for (const cfg of tree[0].children) {
      if (!cfg.path || !cfg.isConfiguration) {
        continue;
      }
      const cfgPath = cfg.path.replace(/\\/g, '/');
      // Проверяем, начинается ли путь объекта с пути конфигурации
      if (normalized.startsWith(cfgPath + '/') || normalized === cfgPath) {
        // Выбираем самую длинную подходящую строку (на случай вложенностей)
        if (!configNode || (configRoot && cfgPath.length > configRoot.length)) {
          configNode = cfg;
          configRoot = cfgPath;
        }
      }
    }

    if (!configNode || !configRoot) {
      // Если не нашли по пути, пытаемся найти через parentId (fallback)
      const findConfig = (node: TreeItem): TreeItem | null => {
        if (node.isConfiguration) {
          return node;
        }
        if (node.parentId) {
          const parent = SearchTree(tree[0], node.parentId);
          if (parent) {
            return findConfig(parent);
          }
        }
        return null;
      };

      const configNodeByParent = findConfig(item);
      if (configNodeByParent) {
        // Для конфигурации используем path, если он есть, иначе id
        return configNodeByParent.path || configNodeByParent.id || null;
      }
      
      outputChannel.appendLine(`[MetadataView.findConfigRoot] Не удалось найти конфигурацию для объекта с путем: ${item.path}, id: ${item.id}`);
      return null;
    }

    return configRoot;
  }

  /**
   * Формирует путь к XML файлу объекта
   */
  private getObjectXmlPath(objectPath: string, configType?: string): string {
    if (configType === 'edt') {
      // Для EDT: {objectPath}/{objectName}.mdo
      const objectName = pathBasename(objectPath);
      return pathJoin(objectPath, `${objectName}.mdo`);
    } else {
      // Для XML: {objectPath}.xml
      return `${objectPath}.xml`;
    }
  }

  /**
   * Нормализует путь к макету с учетом абсолютных/относительных путей и платформы
   * @param template - Путь к макету (может быть абсолютным или относительным)
   * @param rootPath - Корневой путь рабочей области (опционально)
   * @returns Объект с нормализованным путем к папке макета и корнем конфигурации
   */
  /**
   * Нормализует путь к макету с учетом абсолютных/относительных путей и платформы
   * @param template - Путь к макету (может быть абсолютным или относительным)
   * @param rootPath - Корневой путь рабочей области (опционально)
   * @returns Объект с нормализованным путем к папке макета и корнем конфигурации
   */
  private normalizeTemplatePath(template: string, rootPath?: vscode.Uri): { normalizedPath: string; configRoot: string } {
    // Убираем расширение .xml из пути, если оно есть
    let normalizedTemplate = template.endsWith('.xml') ? template.slice(0, -4) : template;
    
    // Если путь уже содержит Ext/Template или Ext/Template.xml, убираем его
    if (normalizedTemplate.includes('/Ext/Template') || normalizedTemplate.includes('\\Ext\\Template')) {
      const extTemplateIndex = normalizedTemplate.indexOf('/Ext/Template') !== -1 
        ? normalizedTemplate.indexOf('/Ext/Template')
        : normalizedTemplate.indexOf('\\Ext\\Template');
      normalizedTemplate = normalizedTemplate.substring(0, extTemplateIndex);
    }
    
    // Нормализуем разделители путей (приводим к прямым слэшам для обработки)
    normalizedTemplate = normalizedTemplate.replace(/\\/g, '/');
    
    // Определяем, является ли путь абсолютным
    const isAbsolute = pathIsAbsolute(normalizedTemplate) || /^[A-Za-z]:/.test(normalizedTemplate);
    
    const knownRoots = ['Documents', 'CommonTemplates', 'Reports', 'Catalogs', 'CommonForms', 
                        'CommonModules', 'InformationRegisters', 'AccumulationRegisters',
                        'Constants', 'Enums', 'DataProcessors', 'DocumentJournals'];
    
    let configRoot: string;
    let relativePath: string;
    
    if (isAbsolute) {
      // Абсолютный путь - находим корень конфигурации
      const pathParts = normalizedTemplate.split('/').filter(p => p.length > 0);
      
      // Ищем первый известный корневой каталог
      let rootIndex = -1;
      for (let i = 0; i < pathParts.length; i++) {
        if (knownRoots.includes(pathParts[i])) {
          rootIndex = i;
          break;
        }
      }
      
      if (rootIndex > 0) {
        // Корень конфигурации - все до первого известного корневого каталога
        configRoot = pathJoin(...pathParts.slice(0, rootIndex));
        // Относительный путь от корня конфигурации
        relativePath = pathParts.slice(rootIndex).join(pathSep);
      } else {
        // Не нашли известный корневой каталог - пытаемся определить корень по структуре
        // Если путь заканчивается на Ext, поднимаемся на 2 уровня выше
        if (pathParts[pathParts.length - 1] === 'Ext') {
          configRoot = pathJoin(...pathParts.slice(0, -2));
          relativePath = pathParts.slice(-2).join(pathSep);
        } else {
          // Иначе поднимаемся на 1 уровень выше
          configRoot = pathJoin(...pathParts.slice(0, -1));
          relativePath = pathParts[pathParts.length - 1];
        }
      }
      
      return {
        normalizedPath: pathJoin(configRoot, relativePath),
        configRoot: configRoot
      };
    } else {
      // Относительный путь - используем rootPath как базу
      if (!rootPath || !rootPath.fsPath) {
        throw new Error('rootPath не определен для относительного пути');
      }
      
      configRoot = rootPath.fsPath;
      
      // Убираем element.id из начала пути, если он есть
      const pathParts = normalizedTemplate.split('/').filter(p => p.length > 0);
      
      if (pathParts.length > 0) {
        const firstPart = pathParts[0];
        
        // Если первый сегмент не является известной корневой папкой и выглядит как абсолютный путь
        if (!knownRoots.includes(firstPart) && (firstPart.includes(':') || /^[A-Za-z]:/.test(firstPart))) {
          // Вероятно, это element.id (абсолютный путь) - ищем первый известный корневой каталог
          let rootIndex = -1;
          for (let i = 0; i < pathParts.length; i++) {
            if (knownRoots.includes(pathParts[i])) {
              rootIndex = i;
              break;
            }
          }
          
          if (rootIndex > 0) {
            // Обновляем configRoot на основе найденного пути
            const absolutePathParts = pathParts.slice(0, rootIndex);
            configRoot = pathJoin(...absolutePathParts);
            relativePath = pathParts.slice(rootIndex).join(pathSep);
          } else {
            relativePath = pathParts.join(pathSep);
          }
        } else {
          relativePath = pathParts.join(pathSep);
        }
      } else {
        relativePath = normalizedTemplate;
      }
      
      return {
        normalizedPath: pathJoin(configRoot, relativePath),
        configRoot: configRoot
      };
    }
  }

  private openTemplate(context: vscode.ExtensionContext, template: string, configType: string): void {
    try {
      // Нормализуем путь к макету
      const { normalizedPath, configRoot } = this.normalizeTemplatePath(template, this.rootPath);
      
      // Формируем путь к файлу Template.xml
      const templateXmlPath = pathJoin(normalizedPath, 'Ext', 'Template.xml');
      
      // Проверяем существование файла
      if (!fs.existsSync(templateXmlPath)) {
        // Логируем для отладки
        const vscodeConfig = vscode.workspace.getConfiguration();
        const debugMode = vscodeConfig.get<boolean>('metadataViewer.debugMode', false);
        if (debugMode) {
          outputChannel.appendLine(`[openTemplate] Файл не найден: ${templateXmlPath}`);
          outputChannel.appendLine(`[openTemplate] Исходный template: ${template}`);
          outputChannel.appendLine(`[openTemplate] Нормализованный путь к папке макета: ${normalizedPath}`);
          outputChannel.appendLine(`[openTemplate] Корень конфигурации: ${configRoot}`);
          outputChannel.appendLine(`[openTemplate] Полный путь к Template.xml: ${templateXmlPath}`);
          outputChannel.appendLine(`[openTemplate] rootPath (workspace): ${this.rootPath?.fsPath || 'не определен'}`);
        }
        vscode.window.showWarningMessage(`Файл Template.xml не найден по пути: ${templateXmlPath}`);
        return;
      }

      statusBarProgress.show();
      statusBarProgress.text = '$(sync~spin) Загрузка редактора…';
      try {
      // Читаем файл
      const configXml = fs.readFileSync(templateXmlPath, 'utf-8');
      const originalXml = configXml;
      
      const arrayPaths = [
        'document.columns',
        'document.columns.columnsItem',
        'document.rowsItem',
        'document.rowsItem.row.c',
        'document.namedItem',
        'document.format',
        'document.font',
        'document.merge',
        'document.line',
        'document.drawing',
        'document.picture',
        'document.vg',
      ];

      const parser = new XMLParser({
        ignoreAttributes : false,
        attributeNamePrefix: '$_',
        isArray: (name, jpath, isLeafNode, isAttribute) => { 
          if (arrayPaths.indexOf(jpath) !== -1) return true;
          // columnsItem может иметь путь document.columns.0.columnsItem при нескольких группах
          if (jpath.includes('columnsItem')) return true;
          return false;
        },
      });
      const result = parser.parse(originalXml);
      
      // Проверяем тип макета по namespace документа
      // Редактирование доступно только для SpreadsheetDocument (namespace: http://v8.1c.ru/8.2/data/spreadsheet)
      const isSpreadsheetDocument = originalXml.includes('xmlns="http://v8.1c.ru/8.2/data/spreadsheet"') || 
                                   originalXml.includes("xmlns='http://v8.1c.ru/8.2/data/spreadsheet'");
      
      if (!isSpreadsheetDocument) {
        // Это макет, но не SpreadsheetDocument. Редактирование недоступно
        vscode.window.showInformationMessage('Редактирование доступно только для макетов типа SpreadsheetDocument');
        return;
      }

      const typedResult = result as TemplateFile;
      if (!typedResult.document) {
        // Это макет, но другого типа. Для него нужно писать свою панель
        return;
      }

      // Нормализация rowsItem: приведение к массиву (один элемент — оборачиваем)
      const doc = typedResult.document;
      if (doc.rowsItem && !Array.isArray(doc.rowsItem)) {
        const ri = doc.rowsItem as any;
        doc.rowsItem = ri.index !== undefined && ri.row
          ? [{ index: Number(ri.index), row: ri.row }]
          : [];
      }

      // Нормализация columns: приведение к массиву (один элемент — оборачиваем)
      if (doc.columns && !Array.isArray(doc.columns)) {
        doc.columns = [doc.columns as any];
      }
      // Нормализация columnsItem в каждой группе колонок
      if (doc.columns && Array.isArray(doc.columns)) {
        doc.columns.forEach((colGroup: any) => {
          if (colGroup.columnsItem && !Array.isArray(colGroup.columnsItem)) {
            colGroup.columnsItem = [colGroup.columnsItem];
          }
        });
      }

      // Нормализация format: 1С использует несколько элементов <format> (массив) или format.item
      if (doc.format && typeof doc.format === 'object') {
        const fmt = doc.format as any;
        if (!Array.isArray(fmt) && fmt.item) {
          doc.format = Array.isArray(fmt.item) ? fmt.item : [fmt.item];
        } else if (!Array.isArray(fmt)) {
          doc.format = [fmt];
        }
      }

      // Нормализуем структуру макета после парсинга
      // Определяем формат заполнения ячеек (параметр/шаблон) и обрабатываем новые элементы
      
      // Нормализуем именованные области (namedItem)
      if (typedResult.document.namedItem && Array.isArray(typedResult.document.namedItem)) {
        typedResult.document.namedItem.forEach((namedItem) => {
          if (namedItem.area) {
            const areaType = namedItem.area.type;
            // Для типа Rows: координаты колонок должны быть -1 (все колонки)
            if (areaType === 'Rows') {
              namedItem.area.beginColumn = -1;
              namedItem.area.endColumn = -1;
            }
            // Для типа Columns: координаты строк должны быть -1 (все строки)
            else if (areaType === 'Columns') {
              namedItem.area.beginRow = -1;
              namedItem.area.endRow = -1;
            }
          }
          // Убеждаемся, что атрибут xsi:type установлен
          if (!namedItem['xsi:type'] && !namedItem['$xsi:type']) {
            namedItem['xsi:type'] = 'NamedItemCells';
          }
        });
      }
      
      if (typedResult.document.rowsItem) {
        typedResult.document.rowsItem.forEach((row, rowIndex) => {
          // Проверяем пустые строки
          if (row.row && (row.row as any).empty === true || (row.row as any).empty === 'true') {
            row.row.empty = true;
          }
          
          if (row.row && row.row.c) {
            row.row.c.forEach((cell, cellIndex) => {
              if (cell.c) {
                // Если есть parameter, но нет tl - формат "параметр"
                // Если нет parameter, но есть tl с текстом - формат "шаблон"
                // Оставляем как есть, логика определения в templateUtils.ts
                
                // Обрабатываем detailParameter (может быть строкой или элементом)
                if (cell.c.detailParameter === undefined && (cell.c as any).detailParameter) {
                  cell.c.detailParameter = String((cell.c as any).detailParameter);
                }
                
                // Обрабатываем note (примечание) - структура может быть сложной
                if (!cell.c.note && (cell.c as any).note) {
                  cell.c.note = (cell.c as any).note;
                }
                
                // Нормализуем tl (TemplateTextData) для корректной работы
                if (cell.c.tl && typeof cell.c.tl === 'object') {
                  // Убеждаемся, что структура v8:item/v8:content корректна
                  if (cell.c.tl['v8:item']) {
                    const item = cell.c.tl['v8:item'];
                    
                    // Вспомогательная функция для нормализации v8:content
                    const normalizeContent = (content: any): string => {
                      if (typeof content === 'string') {
                        return content;
                      }
                      if (content && typeof content === 'object') {
                        return content['#text'] || content.text || content.content || String(content);
                      }
                      return String(content || '');
                    };
                    
                    if (Array.isArray(item) && item.length > 0) {
                      // Берем первый элемент с контентом и нормализуем его
                      const itemWithContent = item.find(i => i && i['v8:content']);
                      if (itemWithContent) {
                        // Нормализуем v8:content, если он не является строкой
                        if (itemWithContent['v8:content'] && typeof itemWithContent['v8:content'] !== 'string') {
                          itemWithContent['v8:content'] = normalizeContent(itemWithContent['v8:content']);
                        }
                        cell.c.tl = {
                          'v8:item': itemWithContent
                        };
                      }
                    } else if (item && item['v8:content']) {
                      // Нормализуем v8:content для не-массивного элемента
                      if (typeof item['v8:content'] !== 'string') {
                        item['v8:content'] = normalizeContent(item['v8:content']);
                      }
                    }
                  }
                }
              }
              
              // Если у ячейки нет индекса i, определяем его по порядку
              if (cell.i === undefined) {
                // Индекс определяется порядком в массиве
                // Это нормально, findCellByPosition учитывает это
              }
            });
          }
        });
      }
      
      // Нормализуем форматы - обрабатываем вложенные форматы для чисел/дат и числовые свойства
      if (typedResult.document.format) {
        typedResult.document.format.forEach((format: any) => {
          // Если есть вложенный формат (format.format), нормализуем его
          if (format.format && typeof format.format === 'object') {
            format.format = format.format as any;
          }
          // Нормализация textOrientation: в 1С хранится как 1/10 градуса (900 = 90°)
          const orientationVal = format.textOrientation ?? format.TextOrientation;
          if (orientationVal !== undefined && orientationVal !== null) {
            const n = parseInt(String(orientationVal), 10);
            if (!isNaN(n)) format.textOrientation = n >= 360 ? Math.round(n / 10) : n;
          }
          // Нормализуем числовые свойства (парсер может вернуть строки)
          const numProps = [
            'indent',
            'autoIndent',
            'leftMargin',
            'rightMargin',
            'topMargin',
            'bottomMargin',
            'border',
            'leftBorder',
            'topBorder',
            'rightBorder',
            'bottomBorder',
          ];
          numProps.forEach(prop => {
            const val = format[prop] ?? format[prop.charAt(0).toUpperCase() + prop.slice(1)];
            if (val !== undefined && val !== null) {
              const n = parseInt(String(val), 10);
              if (!isNaN(n)) format[prop] = n;
            }
          });
        });
      }

      // Вызываем TemplateEditorPanel
      TemplateEditorPanel.createOrShowForTemplate(
        context.extensionUri,
        typedResult.document,
        templateXmlPath,
        originalXml,
        configRoot
      );
      } finally {
        statusBarProgress.hide();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Ошибка при открытии макета: ${errorMessage}`);
      outputChannel.appendLine(`[openTemplate] Ошибка: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        outputChannel.appendLine(`[openTemplate] Stack trace: ${error.stack}`);
      }
      statusBarProgress.hide();
    }
  }

  // Открытие предопределенных данных
  private async openPredefinedData(context: vscode.ExtensionContext, item: TreeItem): Promise<void> {
    if (this.rootPath && item.path) {
      // item.path содержит путь к директории объекта, например: E:\DATA1C\BASE\src\cf\Catalogs\Номенклатура
      // или относительный путь от корня конфигурации
      let itemPath: string;
      if (pathIsAbsolute(item.path)) {
        itemPath = item.path;
      } else {
        // Если путь относительный, делаем его абсолютным относительно rootPath
        itemPath = pathJoin(this.rootPath.fsPath, item.path);
      }
      
      // Определяем metadataName из пути (последние 2 части пути)
      // Передаем исходное имя без преобразования, так как createOrShow нужен английский тип для поиска в ConfigDumpInfo.xml
      const pathParts = itemPath.replace(/\\/g, '/').split('/');
      const metadataName = pathParts.slice(-2).join('.'); // Например: "Catalogs.Номенклатура"
      
      await PredefinedDataPanel.createOrShow(
        context.extensionUri,
        itemPath,
        metadataName // Передаем исходное имя, не преобразованное через GetMetadataName
      );
    }
  }

  // Переход к процедуре офработчика команды
  private openHandler(item: TreeItem): void {
    if (this.rootPath) {
      const fileName = CreatePath(item.path!) + '.xml';
      if (!fs.existsSync(fileName)) {
        vscode.window
          .showInformationMessage(`File ${fileName} does not exist.`);

        return;
      }

      vscode.workspace.fs.readFile(this.rootPath.with({ path: fileName }))
          .then(configXml => {
            const parser = new XMLParser({
              ignoreAttributes : false,
            });
            const result = parser.parse(Buffer.from(configXml));
  
            const typedResult = result as MetadataFile;
            const handlerFileName = posix.join(
              item.path!.split('/').slice(0, -2).join('/'),
              item.path!.includes('/EventSubscriptions/') ? 
                CreatePath(typedResult.MetaDataObject.EventSubscription.Properties.Handler.split('.').slice(0, 2).join('.')) :
                CreatePath(typedResult.MetaDataObject.ScheduledJob.Properties.MethodName.split('.').slice(0, 2).join('.')),
              'Ext',
              'Module.bsl');

            if (!fs.existsSync(handlerFileName)) {
              vscode.window
                .showInformationMessage(`Handler file ${handlerFileName} does not exist.`);

              return;
            }

            vscode.workspace.openTextDocument(handlerFileName).then(doc => {
              const functionName = item.path!.includes('/EventSubscriptions/') ? 
                typedResult.MetaDataObject.EventSubscription.Properties.Handler.split('.').slice(-1).pop() :
                typedResult.MetaDataObject.ScheduledJob.Properties.MethodName.split('.').slice(-1).pop();
              const regExpString = `^(процедура|функция|procedure|function)\\s*${functionName}\\([a-zа-яё\\s,]*\\)\\s*Экспорт`;

              const text = doc.getText().split('\n');
              // TODO: Без малого секунду ищет на 1500 строках и две секунды на 9000 строках.
              //       Это на весьма древнем компьютере. Нормально? Или надо оптимизировать?
              console.time('search procedure regexp');
              const handlerPos = text.findIndex(row => new RegExp(regExpString, 'i').test(row));
              console.timeEnd('search procedure regexp');

              vscode.window.showTextDocument(doc)
                .then(editor => {
                  if (handlerPos != -1) {
                    const selection = new vscode.Selection(
                      new vscode.Position(handlerPos, 0), new vscode.Position(handlerPos + 1, 0));
  
                    editor.selections = [selection, selection]; 
                  } else {
                    vscode.window
                      .showInformationMessage(`Function ${functionName} not found in handler ${handlerFileName}.`);
                  }
                });
            });
        });
    }
  }

  // Открытие свойств конфигурации
  private openMetadataProperties(context: vscode.ExtensionContext, item: TreeItem): void {
    if (this.rootPath) {
      vscode.workspace.fs.readFile(this.rootPath.with({ path: posix.join(item.path!, 'Configuration.xml') }))
        .then(configXml => {
          const arrayPaths = [
            'MetaDataObject.Configuration.Properties.UsePurposes.v8:Value',
            'MetaDataObject.Configuration.Properties.DefaultRoles.xr:Item',
          ];

          const parser = new XMLParser({
            ignoreAttributes : false,
            isArray: (name, jpath, isLeafNode, isAttribute) => { 
              if(arrayPaths.indexOf(jpath) !== -1) return true;

              return false;
            }
          });
          const result = parser.parse(Buffer.from(configXml));
                      
          const configurationProperties = result.MetaDataObject.Configuration.Properties;
          const newConfiguration: Configuration = {
            id: '',
            name: configurationProperties.Name,
            synonym: GetContent(configurationProperties.Synonym),
            comment: configurationProperties.Comment,
            defaultRunMode: configurationProperties.DefaultRunMode,
            usePurposes: configurationProperties.UsePurposes && configurationProperties.UsePurposes['v8:Value'] ? 
              configurationProperties.UsePurposes['v8:Value'].map((p: { [key: string]: string }) =>
              p['#text'] === 'PlatformApplication' ? 'Приложение для платформы' : 'Приложение для мобильной платформы') : [],
            scriptVariant: configurationProperties.ScriptVariant,
            defaultRoles: configurationProperties.DefaultRoles && configurationProperties.DefaultRoles['xr:Item'] ?
              configurationProperties.DefaultRoles['xr:Item'].map((r: { [key: string]: string }) =>
              r['#text'].replace('Role.', 'Роль.')) : [],
            briefInformation: GetContent(configurationProperties.BriefInformation),
            detailedInformation: GetContent(configurationProperties.DetailedInformation),
            copyright: GetContent(configurationProperties.Copyright),
            vendorInformationAddress: GetContent(configurationProperties.VendorInformationAddress),
            configurationInformationAddress: GetContent(configurationProperties.ConfigurationInformationAddress),
            vendor: configurationProperties.Vendor ? configurationProperties.Vendor.replaceAll('"', '&quot;') : '',
            version: configurationProperties.Version,
            updateCatalogAddress: configurationProperties.UpdateCatalogAddress,
            dataLockControlMode: configurationProperties.DataLockControlMode,
            objectAutonumerationMode: configurationProperties.ObjectAutonumerationMode,
            modalityUseMode: configurationProperties.ModalityUseMode,
            synchronousPlatformExtensionAndAddInCallUseMode: configurationProperties.SynchronousPlatformExtensionAndAddInCallUseMode,
            interfaceCompatibilityMode: configurationProperties.InterfaceCompatibilityMode,
            compatibilityMode: configurationProperties.CompatibilityMode,
          };

          if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel("configurationDetailView", newConfiguration.name, vscode.ViewColumn.One, {
              enableScripts: true,
            });
          }
      
          this.panel.title = newConfiguration.name;
          this.panel.webview.html = getWebviewContent(this.panel.webview, context.extensionUri, newConfiguration);

          this.panel?.onDidDispose(
            () => {
              this.panel = undefined;
            },
            null,
            context.subscriptions
          );
        });
    }
  }

  private filterBySubsystem(item: TreeItem, setFilter: boolean): void {
    const vscodeConfig = vscode.workspace.getConfiguration();
    const debugMode = vscodeConfig.get<boolean>('metadataViewer.debugMode', false);
    
    if (!item) {
      vscode.window.showWarningMessage('Не удалось определить элемент подсистемы (item is null/undefined)');
      if (debugMode) {
        outputChannel.appendLine('[filterBySubsystem] ОШИБКА: item is null or undefined');
      }
      return;
    }
    
    if (debugMode) {
      console.log('[filterBySubsystem] Вызов функции, item:', {
        id: item?.id,
        label: item?.label,
        contextValue: item?.contextValue,
        command: item?.command,
        commandArguments: item?.command?.arguments,
        path: item?.path
      });
      outputChannel.appendLine(`[filterBySubsystem] Вызов функции, item.id: ${item?.id}, item.label: ${item?.label}, item.contextValue: ${item?.contextValue}`);
    }
    
    if (!tree.length || !tree[0].children?.length) {
      if (debugMode) {
        outputChannel.appendLine('[filterBySubsystem] Дерево пустое или нет детей');
      }
      return;
    }
    
    // Пытаемся получить идентификатор конфигурации из item.id
    let configId: string | null = null;
    
    if (item.id && typeof item.id === 'string' && item.id.trim().length > 0) {
      // Формат id для подсистемы: "cf/be1f1e41-cce9-4838-8c32-c00ae70290ff"
      // Нужно получить "cf" - путь к конфигурации
      const pathArray = item.id.split('/').filter(Boolean);
      if (pathArray.length >= 2) {
        pathArray.pop(); // Убираем UUID подсистемы
        configId = pathArray.join('/');
        
        if (debugMode) {
          outputChannel.appendLine(`[filterBySubsystem] Извлечен configId из item.id: ${configId}`);
        }
      }
    }
    
    // Если id отсутствует или неправильный формат, пытаемся найти элемент в дереве по другим признакам
    if (!configId) {
      // Преобразуем item.label в строку для дальнейшего использования
      const itemLabel = typeof item.label === 'string' ? item.label : (item.label as any)?.label || '';
      
      // Попытка 1: по contextValue, которое содержит id конфигурации
      if (item.contextValue && typeof item.contextValue === 'string') {
        // contextValue имеет формат: "subsystem_${element.id}"
        const match = item.contextValue.match(/^subsystem_(.+)$/);
        if (match && match[1]) {
          configId = match[1];
          
          if (debugMode) {
            outputChannel.appendLine(`[filterBySubsystem] Извлечен configId из contextValue: ${configId}`);
          }
        }
      }
      
      // Попытка 2: найти подсистему в дереве по label
      if (!configId && itemLabel) {
        for (const config of tree[0].children) {
          if (!config.children) continue;
          
          // Ищем узел "Подсистемы" в дереве
          const subsystemsNode = config.children.find(ch => {
            const chLabel = typeof ch.label === 'string' ? ch.label : (ch.label as any)?.label || '';
            return chLabel === 'Подсистемы' || ch.id?.endsWith('/subsystems');
          });
          if (subsystemsNode?.children) {
            // Ищем конкретную подсистему по label
            const foundSubsystem = subsystemsNode.children.find((ch: TreeItem) => {
              const chLabel = typeof ch.label === 'string' ? ch.label : (ch.label as any)?.label || '';
              return chLabel === itemLabel;
            });
            if (foundSubsystem) {
              configId = config.id;
              
              if (debugMode) {
                outputChannel.appendLine(`[filterBySubsystem] Найдена подсистема по label "${itemLabel}" в конфигурации: ${configId}`);
              }
              break;
            }
          }
        }
      }
      
      // Попытка 3: поиск по всем элементам дерева (рекурсивно)
      if (!configId && itemLabel) {
        const findInTree = (nodes: TreeItem[] | undefined, targetLabel: string): TreeItem | null => {
          if (!nodes) return null;
          for (const node of nodes) {
            const nodeLabel = typeof node.label === 'string' ? node.label : (node.label as any)?.label || '';
            if (nodeLabel === targetLabel && node.contextValue?.includes('subsystem_')) {
              return node;
            }
            const found = findInTree(node.children, targetLabel);
            if (found) return found;
          }
          return null;
        };
        
        const foundNode = findInTree(tree[0].children, itemLabel);
        if (foundNode) {
          // Извлекаем configId из contextValue найденного узла
          const match = foundNode.contextValue?.match(/^subsystem_(.+)$/);
          if (match && match[1]) {
            configId = match[1];
            
            if (debugMode) {
              outputChannel.appendLine(`[filterBySubsystem] Найдена подсистема рекурсивным поиском, configId: ${configId}`);
            }
          }
        }
      }
    }
    
    if (!configId) {
      const itemLabelStr = typeof item.label === 'string' ? item.label : (item.label as any)?.label || String(item.label || 'отсутствует');
      const errorMsg = `Не удалось определить идентификатор подсистемы. item.id: ${item.id || 'отсутствует'}, item.label: ${itemLabelStr}, item.contextValue: ${item.contextValue || 'отсутствует'}`;
      vscode.window.showWarningMessage('Не удалось определить идентификатор подсистемы');
      if (debugMode) {
        outputChannel.appendLine(`[filterBySubsystem] ОШИБКА: ${errorMsg}`);
        outputChannel.appendLine(`[filterBySubsystem] item: ${JSON.stringify({
          id: item?.id,
          label: itemLabelStr,
          contextValue: item?.contextValue,
          command: item?.command,
          path: item?.path
        }, null, 2)}`);
        outputChannel.appendLine(`[filterBySubsystem] Доступные конфигурации: ${tree[0].children.map(c => {
          const cLabel = typeof c.label === 'string' ? c.label : (c.label as any)?.label || String(c.label || '');
          return `${c.id} (label: ${cLabel})`;
        }).join(', ')}`);
      }
      return;
    }
    
    const config = tree[0].children.find((c) => c.id === configId);

    if (config) {
      this.reindexStatusBarItem.show();
      this.reindexStatusBarItem.text = '$(sync~spin) Применение фильтра по подсистеме…';
      try {
      // Устанавливаю пустую конфигурацию чтобы не было конфликта идентификаторов
      const configIndex = tree[0].children.indexOf(config);
      tree[0].children[configIndex].children = CreateMetadata(config.id);
      this.dataProvider?.update();

      // Устанавливаю признак фильтрации
      // Аргументы команды содержат список объектов подсистемы из Content
      const subsystemObjects = (item?.command?.arguments && Array.isArray(item.command.arguments)) 
        ? item.command.arguments 
        : [];
      
      if (debugMode) {
        outputChannel.appendLine(`[filterBySubsystem] Объекты подсистемы из arguments: ${subsystemObjects.length > 0 ? subsystemObjects.slice(0, 10).join(', ') + (subsystemObjects.length > 10 ? '...' : '') : 'пусто'}`);
      }
      
      if (this.subsystemFilter.find((sf) => sf.id === config.id)) {
        this.subsystemFilter = this.subsystemFilter.map((sf) => {
          if (sf.id === config.id) {
            return { id: config.id, objects: setFilter ? subsystemObjects : [] };
          }

          return sf;
        });
      } else {
        this.subsystemFilter.push({ id: config.id, objects: subsystemObjects });
      }
      
      if (debugMode) {
        outputChannel.appendLine(`[filterBySubsystem] Фильтр установлен: configId=${config.id}, objectsCount=${subsystemObjects.length}, setFilter=${setFilter}`);
      }
      
      // Заполняю дерево конфигурации с фильтром
      void this.expand(tree[0].children[configIndex]);

      vscode.commands.executeCommand('setContext', 'filteredConfigArray',
        this.subsystemFilter.filter((sf) => sf.objects.length !== 0).map((sf) => `subsystem_${sf.id}`));
      } finally {
        this.reindexStatusBarItem.hide();
      }
    } else {
      const errorMsg = `Конфигурация с идентификатором ${configId} не найдена в дереве`;
      vscode.window.showWarningMessage(errorMsg);
      if (debugMode) {
        outputChannel.appendLine(`[filterBySubsystem] ОШИБКА: ${errorMsg}`);
        outputChannel.appendLine(`[filterBySubsystem] Доступные конфигурации: ${tree[0].children.map(c => c.id).join(', ')}`);
      }
    }
  }

  private async selectSubsystemToFilter(item: TreeItem): Promise<void> {
    const vscodeConfig = vscode.workspace.getConfiguration();
    const debugMode = vscodeConfig.get<boolean>('metadataViewer.debugMode', false);
    
    if (!tree.length || !tree[0].children?.length) {
      vscode.window.showWarningMessage('Дерево конфигураций пусто');
      return;
    }
    
    // Определяем конфигурацию по текущему элементу
    let config: TreeItem | null = null;
    let configId: string | null = null;
    
    if (!item || !item.id) {
      // Если item не передан, используем первую доступную конфигурацию
      config = tree[0].children[0];
      configId = config.id;
    } else {
      // Ищем конфигурацию в дереве по item.id
      const findParentConfig = (node: TreeItem, targetId: string): TreeItem | null => {
        if (node.id === targetId && node.isConfiguration) {
          return node;
        }
        if (node.children) {
          for (const child of node.children) {
            if (child.id === targetId) {
              return node.isConfiguration ? node : findParentConfig(node, node.id);
            }
            const found = findParentConfig(child, targetId);
            if (found) return found;
          }
        }
        return null;
      };
      
      // Пробуем найти конфигурацию напрямую
      config = tree[0].children.find(c => c.id === item.id && c.isConfiguration) || null;
      
      if (!config) {
        // Ищем родительскую конфигурацию по пути
        for (const cfg of tree[0].children) {
          if (item.id.startsWith(cfg.id + '/')) {
            config = cfg;
            break;
          }
        }
      }
      
      if (!config) {
        // Рекурсивный поиск родительской конфигурации
        for (const cfg of tree[0].children) {
          const found = findParentConfig(cfg, item.id);
          if (found) {
            config = found;
            break;
          }
        }
      }
      
      if (config) {
        configId = config.id;
      }
    }
    
    if (!config || !configId) {
      vscode.window.showWarningMessage('Не удалось определить конфигурацию');
      if (debugMode) {
        outputChannel.appendLine(`[selectSubsystemToFilter] Не удалось найти конфигурацию для item.id: ${item?.id || 'отсутствует'}`);
      }
      return;
    }
    
    // Раскрываем конфигурацию, если она еще не раскрыта
    if (!config.children || config.children.length === 0) {
      await this.expand(config);
      // Ждем немного, чтобы дерево обновилось
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Ищем узел "Подсистемы" в конфигурации
    let subsystemsNode = config.children?.find(ch => {
      const chLabel = typeof ch.label === 'string' ? ch.label : (ch.label as any)?.label || '';
      return chLabel === 'Подсистемы' || ch.id?.endsWith('/subsystems');
    });
    
    // Если узел "Подсистемы" найден, но еще не раскрыт, раскрываем его
    if (subsystemsNode && (!subsystemsNode.children || subsystemsNode.children.length === 0)) {
      // Раскрываем узел "Подсистемы" через expand, но только если это возможно
      // Так как expand работает только для конфигураций, попробуем найти подсистемы в ConfigDumpInfo
      await this.expand(config);
      await new Promise(resolve => setTimeout(resolve, 100));
      // Ищем узел "Подсистемы" снова после раскрытия
      subsystemsNode = config.children?.find(ch => {
        const chLabel = typeof ch.label === 'string' ? ch.label : (ch.label as any)?.label || '';
        return chLabel === 'Подсистемы' || ch.id?.endsWith('/subsystems');
      });
    }
    
    // Рекурсивно собираем все подсистемы, включая вложенные
    const collectAllSubsystems = (node: TreeItem, level: number = 0): TreeItem[] => {
      const subsystems: TreeItem[] = [];
      
      // Если это подсистема (имеет command filterBySubsystem), добавляем её в список
      if (node.command?.command === 'metadataViewer.filterBySubsystem' || node.contextValue?.includes('subsystem_')) {
        subsystems.push(node);
      }
      
      // Рекурсивно обрабатываем дочерние элементы (вложенные подсистемы)
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          subsystems.push(...collectAllSubsystems(child, level + 1));
        }
      }
      
      return subsystems;
    };
    
    let allSubsystems: TreeItem[] = [];
    
    // Если узел "Подсистемы" найден и имеет детей, собираем из дерева
    if (subsystemsNode && subsystemsNode.children && subsystemsNode.children.length > 0) {
      allSubsystems = collectAllSubsystems(subsystemsNode);
    }
    
    // Если подсистемы не найдены в дереве, пытаемся получить их напрямую из ConfigDumpInfo
    if (allSubsystems.length === 0 && this.rootPath && config.configType === 'xml') {
      try {
        const configXmlPath = this.rootPath.with({ path: posix.join(configId, 'ConfigDumpInfo.xml') });
        const configXml = await vscode.workspace.fs.readFile(configXmlPath);
        const arrayPaths = [
          'ConfigDumpInfo.ConfigVersions.Metadata',
          'ConfigDumpInfo.ConfigVersions.Metadata.Metadata',
        ];
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '$_',
          isArray: (name, jpath, isLeafNode, isAttribute) => { 
            if(arrayPaths.indexOf(jpath) !== -1) return true;
            return false;
          }
        });
        const result = parser.parse(Buffer.from(configXml));
        const metadataFile = result as MetadataFile;
        const versionMetadata = metadataFile.ConfigDumpInfo?.ConfigVersions?.Metadata || [];
        
        // Фильтруем подсистемы из метаданных
        const subsystemMetadata = versionMetadata.filter(m => {
          const nameParts = m.$_name?.split('.') || [];
          return nameParts.length === 2 && nameParts[0] === 'Subsystem';
        });
        
        if (subsystemMetadata.length > 0) {
          if (debugMode) {
            outputChannel.appendLine(`[selectSubsystemToFilter] Найдено ${subsystemMetadata.length} подсистем в ConfigDumpInfo`);
          }
          
          const treeItemIdSlash = configId + '/';
          let configRelativePath: string;
          if (this.rootPath) {
            const rootPathNormalized = this.rootPath.fsPath.replace(/\\/g, '/');
            const configIdNormalized = configId.replace(/\\/g, '/');
            configRelativePath = pathRelative(rootPathNormalized, configIdNormalized).replace(/\\/g, '/');
            if (configRelativePath.startsWith('..') || pathIsAbsolute(configRelativePath)) {
              configRelativePath = pathBasename(configId);
            }
          } else {
            configRelativePath = pathBasename(configId);
          }

          // Собираем все подсистемы (корневые + вложенные) с путями для параллельной загрузки
          interface SubsystemEntry {
            treeItemId: string;
            name: string;
            treeItemPath: string;
            configId: string;
            subsystemName?: string; // для корневых — $_name для GetSubsystemChildren
          }
          const entries: SubsystemEntry[] = [];

          const configIdStr = configId as string;
          for (const subMetadata of subsystemMetadata) {
            const relativePath = CreatePath(subMetadata.$_name);
            const treeItemPath = configRelativePath ? `${configRelativePath}/${relativePath}` : relativePath;
            entries.push({
              treeItemId: treeItemIdSlash + subMetadata.$_id,
              name: subMetadata.$_name,
              treeItemPath,
              configId: configIdStr,
              subsystemName: subMetadata.$_name
            });
          }

          const addNestedEntries = (parentName: string, parentId: string, level: number = 2) => {
            const nested = versionMetadata.filter(m => {
              const nameParts = m.$_name?.split('.') || [];
              return nameParts.length === 2 * level && m.$_name.startsWith(parentName + '.');
            });
            for (const nestedSub of nested) {
              const nestedRelativePath = createSubsystemPathForCollect(nestedSub.$_name);
              const nestedTreeItemPath = (configRelativePath ? `${configRelativePath}/${nestedRelativePath}` : nestedRelativePath) || '';
              entries.push({
                treeItemId: parentId + '/' + nestedSub.$_id,
                name: nestedSub.$_name,
                treeItemPath: nestedTreeItemPath,
                configId: configIdStr
              });
              addNestedEntries(nestedSub.$_name, parentId + '/' + nestedSub.$_id, level + 1);
            }
          };
          for (const subMetadata of subsystemMetadata) {
            addNestedEntries(subMetadata.$_name, treeItemIdSlash + subMetadata.$_id, 2);
          }

          // Параллельная загрузка Content для всех подсистем
          const contents = this.rootPath
            ? await Promise.all(entries.map(e => collectSubsystemContentAsync(this.rootPath!, e.treeItemPath)))
            : entries.map(() => [] as string[]);

          for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            const content = contents[i];
            const subsystemItem = GetTreeItem(
              e.treeItemId, e.name, {
                icon: 'subsystem',
                context: `subsystem_${e.configId}`,
                children: e.subsystemName && this.rootPath
                  ? GetSubsystemChildren(this.rootPath, configId, versionMetadata, e.subsystemName)
                  : undefined,
                command: 'metadataViewer.filterBySubsystem',
                commandTitle: 'Filter by subsystem',
                commandArguments: content
              }
            );
            allSubsystems.push(subsystemItem);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (debugMode) {
          outputChannel.appendLine(`[selectSubsystemToFilter] Ошибка чтения ConfigDumpInfo: ${errorMsg}`);
        }
      }
    }
    
    if (allSubsystems.length === 0) {
      vscode.window.showInformationMessage('Подсистемы не найдены в конфигурации');
      if (debugMode) {
        outputChannel.appendLine(`[selectSubsystemToFilter] Подсистемы не найдены в конфигурации ${configId}`);
      }
      return;
    }
    
    // Проверяем, есть ли активный фильтр для этой конфигурации
    const activeFilter = this.subsystemFilter.find((sf) => sf.id === configId);
    const hasActiveFilter = activeFilter && activeFilter.objects && activeFilter.objects.length > 0;
    
    // Формируем список подсистем для Quick Pick
    const subsystemItems = allSubsystems.map((subsystem: TreeItem) => {
      const label = typeof subsystem.label === 'string' ? subsystem.label : (subsystem.label as any)?.label || String(subsystem.label || '');
      const objectsCount = subsystem.command?.arguments && Array.isArray(subsystem.command.arguments) ? subsystem.command.arguments.length : 0;
      // Определяем уровень вложенности по пути (убираем префикс конфигурации)
      const pathParts = subsystem.id?.replace(configId + '/', '').split('/').filter(Boolean) || [];
      const indent = pathParts.length > 1 ? '  '.repeat(pathParts.length - 1) : '';
      
      // Проверяем, активен ли фильтр для этой подсистемы
      // Фильтр содержит объекты из Content подсистемы (например, "Catalog.Валюты"), поэтому проверяем по аргументам команды
      const subsystemObjects = subsystem.command?.arguments && Array.isArray(subsystem.command.arguments) ? subsystem.command.arguments : [];
      const isActive = hasActiveFilter && activeFilter.objects.length > 0 && 
                       subsystemObjects.length > 0 &&
                       activeFilter.objects.length === subsystemObjects.length &&
                       activeFilter.objects.every((obj: string) => subsystemObjects.includes(obj));
      
      return {
        label: indent + label,
        description: isActive ? '✓ Активный фильтр' : (objectsCount > 0 ? `${objectsCount} объектов` : ''),
        subsystem: subsystem,
        id: subsystem.id || '',
        isActive: isActive
      };
    });
    
    // Добавляем опцию "Не фильтровать" в начало списка (всегда показывается)
    const clearFilterItem = {
      label: hasActiveFilter ? '$(close) Не фильтровать' : '$(eye) Показать все объекты',
      description: hasActiveFilter ? `Очистить активный фильтр (${activeFilter.objects.length} объектов)` : 'Отобразить все объекты конфигурации без фильтрации',
      subsystem: null as TreeItem | null,
      id: '__clear_filter__',
      isActive: false
    };
    
    const allItems = [clearFilterItem, ...subsystemItems];
    
    // Показываем Quick Pick для выбора подсистемы
    const selected = await vscode.window.showQuickPick(allItems, {
      placeHolder: hasActiveFilter ? 'Выберите подсистему для фильтрации или очистите фильтр' : 'Выберите подсистему для фильтрации',
      matchOnDescription: true
    });
    
    if (selected) {
      if (selected.id === '__clear_filter__') {
        // Очищаем фильтр или просто обновляем дерево, если фильтр не установлен
        if (hasActiveFilter) {
          // Устанавливаем пустой массив объектов для этой конфигурации
          this.subsystemFilter = this.subsystemFilter.map((sf) => {
            if (sf.id === configId) {
              return { id: configId, objects: [] };
            }
            return sf;
          });
          
          if (debugMode) {
            outputChannel.appendLine(`[selectSubsystemToFilter] Фильтр очищен для конфигурации ${configId}`);
          }
        } else {
          // Если фильтр не установлен, просто обновляем дерево для отображения всех объектов
          if (debugMode) {
            outputChannel.appendLine(`[selectSubsystemToFilter] Фильтр не установлен, обновляем дерево конфигурации ${configId}`);
          }
        }
        
        // Обновляем дерево без фильтра
        const configIndex = tree[0].children.indexOf(config);
        if (configIndex !== -1) {
          this.reindexStatusBarItem.show();
          this.reindexStatusBarItem.text = '$(sync~spin) Применение фильтра по подсистеме…';
          try {
            tree[0].children[configIndex].children = CreateMetadata(config.id);
            this.dataProvider?.update();
            void this.expand(tree[0].children[configIndex]);
            
            // Обновляем контекст VS Code для отображения/скрытия команд фильтрации
            vscode.commands.executeCommand('setContext', 'filteredConfigArray',
              this.subsystemFilter.filter((sf) => sf.objects.length !== 0).map((sf) => `subsystem_${sf.id}`));
          } finally {
            this.reindexStatusBarItem.hide();
          }
        }
      } else if (selected.subsystem) {
        // Вызываем filterBySubsystem с выбранной подсистемой
        this.filterBySubsystem(selected.subsystem, true);
      }
    }
  }

  private async expand(element: TreeItem) {
    if (!element.isConfiguration) {
      return;
    }

    if (!this.rootPath) {
      return;
    }

    const config = vscode.workspace.getConfiguration();
    const debugMode = config.get<boolean>('metadataViewer.debugMode', false);

    if (element.configType === 'xml') {
      const configRoot = element.id;
      const currentFilter = this.subsystemFilter.find((sf) => sf.id === element.id)?.objects ?? [];
      
      if (debugMode) {
        const logMsg = `[MetadataView.expand] XML конфигурация, configRoot: ${configRoot}, фильтр: ${currentFilter.length > 0 ? currentFilter.join(', ') : 'нет'}`;
        console.log(logMsg);
        outputChannel.appendLine(logMsg);
      }
      
      // Вычисление fingerprint с учетом фильтра подсистем
      const fingerprintBase = await this.cache.computeFingerprint(configRoot, 'xml');
      const fingerprint = `${fingerprintBase}|sf:${currentFilter.join(',')}`;
      
      if (debugMode) {
        const logMsg = `[MetadataView.expand] Fingerprint: ${fingerprint}`;
        console.log(logMsg);
        outputChannel.appendLine(logMsg);
      }
      
      // Попытка чтения из кеша
      const cached = await this.cache.read(configRoot);
      
      // Проверка валидности кеша
      const isValidCache = cached 
        && cached.fingerprint === fingerprint 
        && cached.version === TREE_CACHE_VERSION
        && cached.root?.children 
        && cached.root.children.length > 0;
      
      if (isValidCache) {
        // L1/L2/L3 cache hit: hydrate without parsing.
        const logMsg = `[MetadataView] Используется кэш для конфигурации: ${element.label}`;
        console.log(logMsg);
        if (debugMode) {
          outputChannel.appendLine(logMsg);
        }
        const hydrated = hydrateTree(cached.root);
        element.children = hydrated.children;
        this.dataProvider?.update();
        const lbl = typeof element.label === 'string' ? element.label : (element.label as vscode.TreeItemLabel)?.label ?? '';
        this.reindexStatusBarItem.text = lbl ? `Кэш: загружена конфигурация ${lbl}` : 'Кэш: загружена конфигурация';
        this.reindexStatusBarItem.show();
        setTimeout(() => this.reindexStatusBarItem.hide(), 1800);
        return;
      }

      if (debugMode) {
        if (cached) {
          const reasons: string[] = [];
          if (cached.fingerprint !== fingerprint) {
            reasons.push(`fingerprint не совпадает`);
          }
          if (cached.version !== TREE_CACHE_VERSION) {
            reasons.push(`версия не совпадает`);
          }
          if (!cached.root?.children || cached.root.children.length === 0) {
            reasons.push('дерево пустое');
          }
          const logMsg = `[MetadataView.expand] Кэш проигнорирован, причины: ${reasons.join(', ')}`;
          console.log(logMsg);
          outputChannel.appendLine(logMsg);
        } else {
          const logMsg = '[MetadataView.expand] Кэш не найден, будет построено новое дерево';
          console.log(logMsg);
          outputChannel.appendLine(logMsg);
        }
      }

      // Кеш невалиден или отсутствует - парсим XML и строим дерево
      const sb = this.reindexStatusBarItem;
      try {
        sb.show();
        sb.text = `$(sync~spin) Загрузка конфигурации «${element.label}»…`;

        const configXml = await vscode.workspace.fs.readFile(this.rootPath.with({ path: posix.join(element.id, 'ConfigDumpInfo.xml') }));
        const arrayPaths = [
          'ConfigDumpInfo.ConfigVersions.Metadata',
          'ConfigDumpInfo.ConfigVersions.Metadata.Metadata',
        ];

        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '$_',
          isArray: (name, jpath, isLeafNode, isAttribute) => { 
            if(arrayPaths.indexOf(jpath) !== -1) return true;

            return false;
          }
        });
        const result = parser.parse(Buffer.from(configXml));
        const typedResult = result as MetadataFile;
        const rawMetadata = typedResult.ConfigDumpInfo?.ConfigVersions?.Metadata || [];
        // В CF ConfigVersions.Metadata — массив из одного элемента "Configuration", реальные объекты — в Configuration.Metadata
        const versionMetadata = (rawMetadata.length === 1 && rawMetadata[0]?.$_name === 'Configuration' && Array.isArray(rawMetadata[0]?.Metadata))
          ? rawMetadata[0].Metadata
          : rawMetadata;

        // Индекс Content: предзагрузка Content всех подсистем для O(1) lookup при построении дерева
        const subsystemEntries = versionMetadata.filter(m => {
          const parts = m.$_name?.split('.') || [];
          return parts[0] === 'Subsystem' && parts.length >= 2;
        });
        if (subsystemEntries.length > 0 && this.rootPath) {
          const paths = subsystemEntries.map(m =>
            `${element.id}/${createSubsystemPathForCollect(m.$_name)}`
          );
          await Promise.all(paths.map(p => collectSubsystemContentAsync(this.rootPath!, p)));
        }

        CreateTreeElements(this.rootPath!,
          element,
          typedResult,
          currentFilter);

        if (currentFilter.length) {
        // Нумераторы и последовательности в документах
        if (element.children![3].children![1].children?.length === 0) {
          element.children![3].children?.splice(1, 1);
        }
        if (element.children![3].children![0].children?.length === 0) {
          element.children![3].children?.splice(0, 1);
        }
  
        // Очищаю пустые элементы
        const indexesToDelete: number[] = [];
        element.children?.forEach((ch, index) => {
          if (!ch.children || ch.children.length === 0) {
            indexesToDelete.push(index);
          }
        });
        indexesToDelete.sort((a, b) => b - a);
        indexesToDelete.forEach((d) => element.children?.splice(d, 1));
  
        // Отдельно очищаю раздел "Общие"
        indexesToDelete.splice(0);
        element.children![0].children?.forEach((ch, index) => {
          if (!ch.children || ch.children.length === 0) {
            indexesToDelete.push(index);
          }
        });
        indexesToDelete.sort((a, b) => b - a);
        indexesToDelete.forEach((d) => element.children![0].children?.splice(d, 1));
  
        // Ненужные вложенные подсистемы
        removeSubSystems(element.children![0].children![0], currentFilter);
      }

      // Сохранение в кеш
      if (element.children && element.children.length > 0) {
        const serializedRoot = serializeTree(element);
        const envelope: TreeCacheEnvelope = {
          version: TREE_CACHE_VERSION,
          fingerprint: fingerprint,
          builtAt: Date.now(),
          root: serializedRoot,
        };
        await this.cache.write(configRoot, envelope);
        if (debugMode) {
          const logMsg = `[MetadataView.expand] Кэш сохранен для ${configRoot}, детей: ${element.children.length}`;
          console.log(logMsg);
          outputChannel.appendLine(logMsg);
        }
      }

      this.dataProvider?.update();
      } finally {
        sb.hide();
      }
    } else {
      // EDT (existing synchronous builder)
      // TODO: добавить кеширование для EDT в будущем
      const edt = new Edt(this.rootPath.with({ path: posix.join(
        element.id, 'Configuration', 'Configuration.mdo') }), this.dataProvider!);
      edt.createTreeElements(element, this.subsystemFilter.find((sf) => sf.id === element.id)?.objects ?? []);
    }
  }

  /**
   * Точечное обновление узла в кэше конфигурации
   */
  private async updateCacheNode(configRoot: string, item: TreeItem, updatedObject: ParsedMetadataObject): Promise<void> {
    try {
      const debugMode = vscode.workspace.getConfiguration().get<boolean>('metadataViewer.debugMode', false);
      // Загружаем кэш конфигурации
      const cached = await this.cache.read(configRoot);
      if (!cached || !cached.root) {
        outputChannel.appendLine(`[MetadataView.updateCacheNode] Кэш для конфигурации ${configRoot} не найден, пропускаем обновление`);
        return;
      }

      // Находим узел объекта в кэшированном дереве
      const objectNode = searchSerializableTree(cached.root, item.id);
      if (!objectNode) {
        outputChannel.appendLine(`[MetadataView.updateCacheNode] Узел ${item.id} не найден в кэше`);
        return;
      }

      // Получаем VersionMetadata из ConfigDumpInfo для создания дочерних элементов
      const versionMetadata = await this.getVersionMetadataForObject(configRoot, updatedObject);
      if (!versionMetadata) {
        outputChannel.appendLine(`[MetadataView.updateCacheNode] Не удалось получить VersionMetadata для объекта ${updatedObject.objectType}.${updatedObject.name}`);
        return;
      }

      // Создаем дочерние элементы используя существующую логику
      const treeItemIdSlash = item.id + '/';
      const objectXmlPath = this.getObjectXmlPath(item.path!, item.configType);
      const attributeReduceResult = await this.getAttributeReduceResult(configRoot, versionMetadata, objectXmlPath);
      const newChildren = this.createChildrenForObject(treeItemIdSlash, versionMetadata, attributeReduceResult, updatedObject);

      if (debugMode) {
        outputChannel.appendLine(`[MetadataView.updateCacheNode] Создано ${newChildren.length} дочерних элементов для объекта ${item.id}`);
        // Логируем структуру дочерних элементов
        newChildren.forEach((child, index) => {
          outputChannel.appendLine(`[MetadataView.updateCacheNode] Дочерний элемент ${index}: ${child.label} (${child.contextValue || 'no context'}), детей: ${child.children?.length || 0}`);
        });
      }

      // Обновляем узел в кэше
      objectNode.children = newChildren.map(child => serializeTree(child));

      // Сохраняем обновленный кэш
      await this.cache.write(configRoot, cached);
      outputChannel.appendLine(`[MetadataView.updateCacheNode] Кэш обновлен для объекта ${item.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[MetadataView.updateCacheNode] Ошибка обновления кэша: ${errorMessage}`);
      // Не прерываем выполнение, продолжаем обновление дерева
    }
  }

  /**
   * Обновление узла в текущем дереве
   */
  private async updateTreeNode(item: TreeItem, updatedObject: ParsedMetadataObject, configRoot: string): Promise<void> {
    try {
      // Находим узел в текущем дереве
      const treeNode = SearchTree(tree[0], item.id);
      if (!treeNode) {
        outputChannel.appendLine(`[MetadataView.updateTreeNode] Узел ${item.id} не найден в дереве`);
        return;
      }

      // Получаем VersionMetadata из ConfigDumpInfo
      const versionMetadata = await this.getVersionMetadataForObject(configRoot, updatedObject);
      if (!versionMetadata) {
        outputChannel.appendLine(`[MetadataView.updateTreeNode] Не удалось получить VersionMetadata для объекта ${updatedObject.objectType}.${updatedObject.name}`);
        return;
      }

      // Создаем дочерние элементы
      const treeItemIdSlash = item.id + '/';
      const objectXmlPath = this.getObjectXmlPath(item.path!, item.configType);
      const attributeReduceResult = await this.getAttributeReduceResult(configRoot, versionMetadata, objectXmlPath);
      const newChildren = this.createChildrenForObject(treeItemIdSlash, versionMetadata, attributeReduceResult, updatedObject);

      const debugMode = vscode.workspace.getConfiguration().get<boolean>('metadataViewer.debugMode', false);
      if (debugMode) {
        outputChannel.appendLine(`[MetadataView.updateTreeNode] Создано ${newChildren.length} дочерних элементов для узла ${item.id}`);
        // Логируем структуру дочерних элементов
        newChildren.forEach((child, index) => {
          const childCount = child.children?.length || 0;
          outputChannel.appendLine(`[MetadataView.updateTreeNode] Дочерний элемент ${index}: ${child.label} (${child.contextValue || 'no context'}), детей: ${childCount}`);
          // Если это "Реквизиты", логируем список реквизитов
          if (child.label === 'Реквизиты' && child.children) {
            child.children.forEach((attr, attrIndex) => {
              outputChannel.appendLine(`[MetadataView.updateTreeNode]   Реквизит ${attrIndex}: ${attr.label}`);
            });
          }
          // Если это "Формы", логируем список форм
          if (child.label === 'Формы' && child.children) {
            child.children.forEach((form, formIndex) => {
              outputChannel.appendLine(`[MetadataView.updateTreeNode]   Форма ${formIndex}: ${form.label}`);
            });
          }
        });
      }

      // Обновляем узел
      treeNode.children = newChildren;
      outputChannel.appendLine(`[MetadataView.updateTreeNode] Узел ${item.id} обновлен в дереве, дочерних элементов: ${newChildren.length}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[MetadataView.updateTreeNode] Ошибка обновления узла: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Получает VersionMetadata для объекта из ConfigDumpInfo.xml
   */
  private async getVersionMetadataForObject(configRoot: string, updatedObject: ParsedMetadataObject): Promise<VersionMetadata | null> {
    try {
      const debugMode = vscode.workspace.getConfiguration().get<boolean>('metadataViewer.debugMode', false);
      
      // Используем абсолютный путь для чтения ConfigDumpInfo.xml
      const configDumpInfoPath = pathJoin(configRoot, 'ConfigDumpInfo.xml');
      const configDumpInfoUri = vscode.Uri.file(configDumpInfoPath);
      
      if (debugMode) {
        outputChannel.appendLine(`[MetadataView.getVersionMetadataForObject] Читаем ConfigDumpInfo.xml из: ${configDumpInfoPath}`);
      }
      
      const configXml = await vscode.workspace.fs.readFile(configDumpInfoUri);
      
      const arrayPaths = [
        'ConfigDumpInfo.ConfigVersions.Metadata.Metadata',
      ];

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '$_',
        isArray: (name, jpath, isLeafNode, isAttribute) => { 
          if(arrayPaths.indexOf(jpath) !== -1) return true;
          return false;
        }
      });
      const result = parser.parse(Buffer.from(configXml));
      const typedResult = result as MetadataFile;

      // Ищем объект по имени
      // ВАЖНО: В ConfigDumpInfo.xml имена объектов всегда с английским префиксом (Document, Catalog, Enum и т.д.)
      // Парсер преобразует английские префиксы в русские (Document -> Документ), поэтому нужно обратное преобразование
      // Используем централизованный словарь METADATA_TYPES
      const metadataType = METADATA_TYPES.find(m => m.displayName === updatedObject.objectType);
      const objectTypeEn = metadataType ? metadataType.type : updatedObject.objectType;
      const objectName = `${objectTypeEn}.${updatedObject.name}`;
      
      const versionMetadata = typedResult.ConfigDumpInfo.ConfigVersions.Metadata.find(
        m => m.$_name === objectName
      );

      if (!versionMetadata) {
        outputChannel.appendLine(`[MetadataView.getVersionMetadataForObject] Объект ${objectName} не найден в ConfigDumpInfo.xml`);
        return null;
      }

      if (debugMode) {
        outputChannel.appendLine(`[MetadataView.getVersionMetadataForObject] Найден VersionMetadata для ${objectName}, дочерних элементов: ${versionMetadata.Metadata?.length || 0}`);
      }

      return versionMetadata;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[MetadataView.getVersionMetadataForObject] Ошибка: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        outputChannel.appendLine(`[MetadataView.getVersionMetadataForObject] Stack trace: ${error.stack}`);
      }
      return null;
    }
  }

  /**
   * Получает attributeReduceResult для объекта (формы, макеты и предопределенные элементы)
   * ВАЖНО: Формы, макеты и предопределенные элементы находятся на том же уровне, что и сам объект в ConfigDumpInfo.xml,
   * а не внутри versionMetadata.Metadata. Поэтому нужно читать весь ConfigDumpInfo.xml.
   */
  private async getAttributeReduceResult(configRoot: string, versionMetadata: VersionMetadata, objectXmlPath?: string): Promise<MetadataDictionaries> {
    const debugMode = vscode.workspace.getConfiguration().get<boolean>('metadataViewer.debugMode', false);
    const treeItemIdSlash = configRoot + '/';
    
    // Читаем весь ConfigDumpInfo.xml, чтобы найти все формы, макеты и предопределенные элементы
    const configDumpInfoPath = pathJoin(configRoot, 'ConfigDumpInfo.xml');
    const configDumpInfoUri = vscode.Uri.file(configDumpInfoPath);
    const configXml = await vscode.workspace.fs.readFile(configDumpInfoUri);
    
    const arrayPaths = [
      'ConfigDumpInfo.ConfigVersions.Metadata.Metadata',
    ];

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '$_',
      isArray: (name, jpath, isLeafNode, isAttribute) => { 
        if(arrayPaths.indexOf(jpath) !== -1) return true;
        return false;
      }
    });
    const result = parser.parse(Buffer.from(configXml));
    const typedResult = result as MetadataFile;
    
    // Используем весь массив метаданных, как в CreateTreeElements
    const allMetadata = typedResult.ConfigDumpInfo.ConfigVersions.Metadata;
    const objectName = versionMetadata.$_name;
    
    if (debugMode) {
      outputChannel.appendLine(`[MetadataView.getAttributeReduceResult] Обрабатываем ${allMetadata.length} элементов метаданных для поиска форм/макетов/предопределенных объекта ${objectName}`);
    }
    
    const attributeReduceResult: MetadataDictionaries = { form: {}, template: {}, predefined: {} };
    
    // Ищем формы, макеты и предопределенные элементы для данного объекта во всем массиве метаданных
    for (const current of allMetadata) {
      const currentObjectName = current.$_name.split('.').slice(0, 2).join('.');
      
      // Проверяем, что это форма/макет/предопределенные для нашего объекта
      if (currentObjectName !== objectName) {
        continue;
      }
      
      if (current.$_name.includes('.Form.') && !(current.$_name.endsWith('.Form') || current.$_name.endsWith('.Help'))) {
        if (debugMode) {
          outputChannel.appendLine(`[MetadataView.getAttributeReduceResult] Найдена форма: ${current.$_name}, objectName: ${currentObjectName}`);
        }
        if (!attributeReduceResult.form[currentObjectName]) {
          attributeReduceResult.form[currentObjectName] = [];
        }
        attributeReduceResult.form[currentObjectName].push(GetTreeItem(
          treeItemIdSlash + current.$_id,
          current.$_name,
          {
            icon: 'form',
            context: 'form',
            path: `${configRoot}/${CreatePath(currentObjectName)}/Forms/${current.$_name.split('.').pop()}`,
          }));
      } else if (current.$_name.includes('.Template.') && !current.$_name.endsWith('.Template')) {
        if (!attributeReduceResult.template[currentObjectName]) {
          attributeReduceResult.template[currentObjectName] = [];
        }
        const templateName = current.$_name.split('.').pop() || '';
        const path = pathJoin(configRoot, CreatePath(currentObjectName), 'Templates', templateName).replace(/\\/g, '/');
        attributeReduceResult.template[currentObjectName].push(GetTreeItem(
          treeItemIdSlash + current.$_id,
          current.$_name,
          {
            icon: 'template',
            context: 'template',
            command: 'metadataViewer.showTemplate',
            commandTitle: 'Show template',
            commandArguments: [ path, 'xml' ],
            path: path,
          }));
      } else if (current.$_name.endsWith('.Predefined')) {
        // Найдена запись о предопределенных элементах в ConfigDumpInfo.xml
        if (debugMode) {
          outputChannel.appendLine(`[MetadataView.getAttributeReduceResult] Найдена запись Predefined для объекта: ${current.$_name}`);
        }
        
        // Если передан путь к XML файлу объекта, пытаемся загрузить предопределенные элементы из Predefined.xml
        if (objectXmlPath) {
          try {
            const predefinedPath = getPredefinedPath(objectXmlPath);
            if (fs.existsSync(predefinedPath)) {
              const predefinedItems = await parsePredefinedXml(predefinedPath);
              if (predefinedItems.length > 0) {
                if (!attributeReduceResult.predefined[currentObjectName]) {
                  attributeReduceResult.predefined[currentObjectName] = [];
                }
                // Создаем TreeItem для каждого предопределенного элемента
                predefinedItems.forEach((predefined) => {
                  attributeReduceResult.predefined[currentObjectName].push(GetTreeItem(
                    treeItemIdSlash + current.$_id + '/' + predefined.key,
                    predefined.name || predefined.key,
                    {
                      icon: 'predefined',
                      context: 'predefined',
                      path: predefinedPath,
                    }));
                });
                if (debugMode) {
                  outputChannel.appendLine(`[MetadataView.getAttributeReduceResult] Загружено ${predefinedItems.length} предопределенных элементов из ${predefinedPath}`);
                }
              }
            } else {
              if (debugMode) {
                outputChannel.appendLine(`[MetadataView.getAttributeReduceResult] Файл Predefined.xml не найден: ${predefinedPath}`);
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            outputChannel.appendLine(`[MetadataView.getAttributeReduceResult] Ошибка при загрузке Predefined.xml: ${errorMessage}`);
          }
        }
      }
    }

    if (debugMode) {
      const objectName = versionMetadata.$_name;
      const formsCount = attributeReduceResult.form[objectName]?.length || 0;
      const templatesCount = attributeReduceResult.template[objectName]?.length || 0;
      const predefinedCount = attributeReduceResult.predefined[objectName]?.length || 0;
      outputChannel.appendLine(`[MetadataView.getAttributeReduceResult] Для объекта ${objectName}: форм: ${formsCount}, макетов: ${templatesCount}, предопределенных: ${predefinedCount}`);
      if (formsCount > 0) {
        attributeReduceResult.form[objectName]?.forEach((form, idx) => {
          outputChannel.appendLine(`[MetadataView.getAttributeReduceResult]   Форма ${idx}: ${form.label}`);
        });
      }
      if (predefinedCount > 0) {
        attributeReduceResult.predefined[objectName]?.forEach((predefined, idx) => {
          outputChannel.appendLine(`[MetadataView.getAttributeReduceResult]   Предопределенный ${idx}: ${predefined.label}`);
        });
      }
    }

    return attributeReduceResult;
  }

  /**
   * Создает дочерние элементы для объекта на основе его типа
   */
  private createChildrenForObject(
    idPrefix: string,
    versionMetadata: VersionMetadata,
    attributeReduceResult: MetadataDictionaries,
    updatedObject: ParsedMetadataObject
  ): TreeItem[] {
    const objectName = versionMetadata.$_name;
    
    // Определяем тип объекта и используем соответствующую функцию
    if (objectName.startsWith('Catalog.')) {
      return FillObjectItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('Document.')) {
      return FillObjectItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('InformationRegister.')) {
      return FillRegisterItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('AccumulationRegister.')) {
      return FillRegisterItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('AccountingRegister.')) {
      return FillRegisterItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('CalculationRegister.')) {
      return FillCalculationRegisterItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('ChartOfAccounts.')) {
      return FillChartOfAccountsItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('ChartOfCharacteristicTypes.')) {
      return FillObjectItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('ChartOfCalculationTypes.')) {
      return FillObjectItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('Report.')) {
      return FillObjectItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('DataProcessor.')) {
      return FillObjectItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('BusinessProcess.')) {
      return FillObjectItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('Task.')) {
      return FillTaskItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else if (objectName.startsWith('Enum.')) {
      return FillEnumItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    } else {
      // По умолчанию используем FillObjectItemsByMetadata
      return FillObjectItemsByMetadata(idPrefix, versionMetadata, attributeReduceResult);
    }
  }
}

const tree: TreeItem[] = [
	GetTreeItem('configurations', 'Конфигурации', { children: [] })
];

interface ConfigSearchItem {
  configRoot: string;
  xmlPath: string;
  type: 'xml' | 'edt';
}

/**
 * Только поиск конфигураций (glob, reduce, filter). Без чтения файлов.
 */
function searchConfigurationsOnly(uri: vscode.Uri): ConfigSearchItem[] {
  const depth = vscode.workspace.getConfiguration().get<number>('metadataViewer.searchDepth');
  const files = glob.sync([
    '**/ConfigDumpInfo.xml',
    '**/Configuration.xml',
    '**/Configuration/Configuration.mdo'
  ], {
    dot: true,
    cwd: uri.fsPath,
    absolute: true,
    deep: depth,
  });

  const configurations = files.reduce<{ [key: string]: { type: 'xml' | 'edt'; files: string[] } }>((previous, current) => {
    const key = current.indexOf('Configuration.mdo') === -1
      ? current.split('/').slice(0, -1).join('/')
      : current.split('/').slice(0, -2).join('/');

    if (!previous[key]) {
      previous[key] = {
        type: current.indexOf('Configuration.mdo') === -1 ? 'xml' : 'edt',
        files: []
      };
    }
    previous[key].files.push(current);
    return previous;
  }, {});

  const filtered = Object
    .keys(configurations)
    .filter(f => configurations[f].type === 'edt' || (configurations[f].type === 'xml' && configurations[f].files.length === 2));

  const out: ConfigSearchItem[] = [];
  for (const fc of filtered) {
    let xmlPath = posix.join(fc, 'Configuration.xml');
    if (!fs.existsSync(xmlPath)) {
      xmlPath = posix.join(fc, 'Configuration', 'Configuration.mdo');
    }
    const type = xmlPath.indexOf('/Configuration/Configuration.mdo') === -1 ? 'xml' : 'edt';
    out.push({ configRoot: fc, xmlPath, type });
  }
  return out;
}

/**
 * Загрузка одной конфигурации: readFile, parse, push в дерево, update.
 */
async function loadSingleConfiguration(
  _folderUri: vscode.Uri,
  item: ConfigSearchItem,
  dataProvider: NodeWithIdTreeDataProvider
): Promise<void> {
  const buf = await vscode.workspace.fs.readFile(vscode.Uri.file(item.xmlPath));
  const parser = new XMLParser({ ignoreAttributes: false });
  const result = parser.parse(Buffer.from(buf));

  let synonym = '';
  if (item.type === 'xml') {
    synonym = GetContent(result.MetaDataObject.Configuration.Properties.Synonym);
    if (!synonym) {
      synonym = result.MetaDataObject.Configuration.Properties.Name;
    }
  } else {
    synonym = result['mdclass:Configuration']?.synonym?.value;
    if (!synonym) {
      synonym = result['mdclass:Configuration']?.name;
    }
  }

  const treeItem = new TreeItem(item.configRoot, `${synonym} (${item.configRoot})`, CreateMetadata(item.configRoot));
  treeItem.contextValue = 'main';
  treeItem.path = item.configRoot;
  treeItem.isConfiguration = true;
  treeItem.configType = item.type;

  tree[0].children = tree[0].children ?? [];
  tree[0].children.push(treeItem);
  dataProvider.update();
}

/**
 * Поиск и загрузка конфигураций по workspace-папке.
 * При старте вызывается без onProgress; при переиндексации используется двухпроходная схема с прогрессом.
 */
async function LoadAndParseConfigurationXml(
  uri: vscode.Uri,
  dataProvider: NodeWithIdTreeDataProvider,
  _options?: { onProgress?: (msg: string) => void }
): Promise<void> {
  const items = searchConfigurationsOnly(uri);
  for (const it of items) {
    await loadSingleConfiguration(uri, it, dataProvider);
  }
}

function CreateTreeElements(rootPath: vscode.Uri, element: TreeItem, metadataFile: MetadataFile, subsystemFilter: string[]) {
	const rawMetadata = metadataFile.ConfigDumpInfo?.ConfigVersions?.Metadata || [];
	// В CF ConfigVersions.Metadata — массив из одного элемента "Configuration", реальные объекты — в Configuration.Metadata
	const versionMetadata = (rawMetadata.length === 1 && rawMetadata[0]?.$_name === 'Configuration' && Array.isArray(rawMetadata[0]?.Metadata))
		? rawMetadata[0].Metadata
		: rawMetadata;

  const treeItemIdSlash = element.id + '/';

	console.time('reduce');
	const attributeReduceResult = versionMetadata.reduce<MetadataDictionaries>((previous, current) => {
		const objectName = current.$_name.split('.').slice(0, 2).join('.');
		if (current.$_name.includes('.Form.') && !(current.$_name.endsWith('.Form') || current.$_name.endsWith('.Help'))) {
			if (!previous.form[objectName]) {
				previous.form[objectName] = [];
			}
			previous.form[objectName].push(GetTreeItem(
        treeItemIdSlash + current.$_id,
        current.$_name,
        {
          icon: 'form',
          context: 'form',
          path: `${element.id}/${CreatePath(objectName)}/Forms/${current.$_name.split('.').pop()}`,
        }));
		} else if (current.$_name.includes('.Template.') && !current.$_name.endsWith('.Template')) {
			if (!previous.template[objectName]) {
				previous.template[objectName] = [];
			}
      // Используем pathJoin для корректного формирования пути на всех платформах
      const templateName = current.$_name.split('.').pop() || '';
      const path = pathJoin(element.id, CreatePath(objectName), 'Templates', templateName).replace(/\\/g, '/');
			previous.template[objectName].push(GetTreeItem(
        treeItemIdSlash + current.$_id,
        current.$_name,
        {
          icon: 'template',
          context: 'template',
          command: 'metadataViewer.showTemplate',
          commandTitle: 'Show template',
          commandArguments: [ path, 'xml' ],
          path: path,
        }));
		}
		return previous;
	}, { form: {}, template: {}, predefined: {} });

	// Обрабатываем предопределенные элементы асинхронно после reduce
	// Собираем все объекты с предопределенными элементами
	const predefinedPromises: Promise<void>[] = [];
	for (const current of versionMetadata) {
		if (current.$_name.endsWith('.Predefined')) {
			const objectName = current.$_name.split('.').slice(0, 2).join('.');
			const objectPath = pathJoin(element.id, CreatePath(objectName));
			const objectXmlPath = pathJoin(objectPath, `${objectName.split('.').pop()}.xml`);
			const predefinedPath = getPredefinedPath(objectXmlPath);
			
			if (fs.existsSync(predefinedPath)) {
				const promise = parsePredefinedXml(predefinedPath).then(predefinedItems => {
					if (predefinedItems.length > 0) {
						if (!attributeReduceResult.predefined[objectName]) {
							attributeReduceResult.predefined[objectName] = [];
						}
						// Создаем TreeItem для каждого предопределенного элемента
						predefinedItems.forEach((predefined) => {
							attributeReduceResult.predefined[objectName].push(GetTreeItem(
								treeItemIdSlash + current.$_id + '/' + predefined.key,
								predefined.name || predefined.key,
								{
									icon: 'predefined',
									context: 'predefined',
									path: predefinedPath,
								}));
						});
					}
				}).catch(err => {
					// Игнорируем ошибки парсинга Predefined.xml при первоначальной загрузке
					console.error(`Failed to parse Predefined.xml for ${objectName}:`, err);
				});
				predefinedPromises.push(promise);
			}
		}
	}
	
	// Ждем загрузки всех предопределенных элементов перед продолжением
	if (predefinedPromises.length > 0) {
		Promise.all(predefinedPromises).then(() => {
			// Обновляем дерево после загрузки предопределенных элементов
			// Это нужно для объектов, которые уже были созданы
			// Но так как CreateTreeElements синхронная функция, мы не можем обновить дерево здесь
			// Предопределенные элементы будут добавлены при следующем обновлении дерева
		});
	}

	// Content в .mdo может использовать camelCase (commonModule), ConfigDumpInfo — PascalCase (CommonModule).
	// Добавляем оригинал и нормализованный вариант для надёжного сопоставления.
	const filterSet = subsystemFilter.length > 0
		? new Set(subsystemFilter.flatMap(s => {
			const t = (s ?? '').trim();
			if (!t) return [];
			return [t, normalizeMetadataNameForFilter(t)];
		}).filter(Boolean))
		: null;
	const reduceResult = versionMetadata.reduce<MetadataObjects>((previous, current) => {
		if (current.$_name.split('.').length !== 2) {
			return previous;
		}
		const nameTrimmed = (current.$_name ?? '').trim();
		if (filterSet && !filterSet.has(nameTrimmed) && !filterSet.has(normalizeMetadataNameForFilter(nameTrimmed))) {
			return previous;
		}

    const treeItemId = treeItemIdSlash + current.$_id;
    const treeItemPath = `${treeItemIdSlash}${CreatePath(current.$_name)}`;
  
    switch (true) {
      case current.$_name.startsWith('Subsystem.'): {
        const chilldren = GetSubsystemChildren(rootPath, element.id, versionMetadata, current.$_name);

        previous.subsystem.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'subsystem',
            context: `subsystem_${element.id}`,
            children: chilldren,
            command: 'metadataViewer.filterBySubsystem',
            commandTitle: 'Filter by subsystem',
            commandArguments: CollectSubsystemContent(rootPath, treeItemPath) }));

        break;
      }
      case current.$_name.startsWith('CommonModule.'):
        previous.commonModule.push(GetTreeItem(
          treeItemId, current.$_name,
          { icon: 'commonModule', context: 'module', path: treeItemPath, }));

        break;
      case current.$_name.startsWith('SessionParameter.'):
        previous.sessionParameter.push(GetTreeItem(treeItemId, current.$_name, { icon: 'sessionParameter' }));
        break;
      case current.$_name.startsWith('Role.'):
        previous.role.push(GetTreeItem(treeItemId, current.$_name, {
          icon: 'role',
          context: 'role',
          path: treeItemPath,
        }));
        break;
      case current.$_name.startsWith('CommonAttribute.'):
        previous.commonAttribute.push(GetTreeItem(treeItemId, current.$_name, { icon: 'attribute' }));
        break;
      case current.$_name.startsWith('ExchangePlan.'):
        previous.exchangePlan.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'exchangePlan', context: 'object_and_manager', path: treeItemPath,
            children: FillObjectItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('EventSubscription.'):
        previous.eventSubscription.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'eventSubscription', context: 'handler', path: treeItemPath }));
        break;
      case current.$_name.startsWith('ScheduledJob.'):
        previous.scheduledJob.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'scheduledJob', context: 'handler', path: treeItemPath }));
        break;
      case current.$_name.startsWith('CommonForm.'):
        previous.commonForm.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'form', context: 'form', path: treeItemPath }));

        break;
      case current.$_name.startsWith('CommonTemplate.'):
        // Для общих макетов путь должен быть к папке макета (как для обычных макетов документов)
        // treeItemPath уже содержит element.id в начале, так что используем его как есть
        // Используем pathJoin для корректного формирования пути
        const commonTemplatePath = pathJoin(treeItemPath).replace(/\\/g, '/');
        previous.commonTemplate.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'template',
            context: 'template',
            command: 'metadataViewer.showTemplate',
            commandTitle: 'Show template',
            commandArguments: [ commonTemplatePath, 'xml' ],
            path: commonTemplatePath,
            configType: 'xml',
          }));
        break;
      case current.$_name.startsWith('CommonPicture.'):
        previous.commonPicture.push(GetTreeItem(treeItemId, current.$_name, { icon: 'picture' }));
        break;
      case current.$_name.startsWith('WebService.'):
        previous.webService.push(GetTreeItem(treeItemId, current.$_name, {
          icon: 'ws', context: 'module', path: treeItemPath,
          children: FillWebServiceItemsByMetadata(treeItemId, current, attributeReduceResult) }));

        break;
      case current.$_name.startsWith('HTTPService.'):
        previous.httpService.push(GetTreeItem(treeItemId, current.$_name, {
          icon: 'http', context: 'module', path: treeItemPath,
          children: FillHttpServiceItemsByMetadata(treeItemId, current, attributeReduceResult) }));

        break;
      case current.$_name.startsWith('WSReference.'):
        previous.wsReference.push(GetTreeItem(treeItemId, current.$_name, { icon: 'wsLink' }));
        break;
      case current.$_name.startsWith('Style.'):
        previous.style.push(GetTreeItem(treeItemId, current.$_name, { icon: 'style' }));
        break;
      case current.$_name.startsWith('Constant.'):
        previous.constant.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'constant', context: 'valueManager_and_manager', path: treeItemPath, }));

        break;
      case current.$_name.startsWith('Catalog.'):
        previous.catalog.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'catalog', context: 'object_and_manager_and_predefined', path: treeItemPath,
            children: FillObjectItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('Document.'):
        previous.document.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'document', context: 'object_and_manager', path: treeItemPath,
            children: FillObjectItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('DocumentNumerator.'):
        previous.documentNumerator.push(GetTreeItem( treeItemId, current.$_name, { icon: 'documentNumerator' }));
  
        break;
      case current.$_name.startsWith('Sequence.'):
        previous.sequence.push(GetTreeItem( treeItemId, current.$_name, { icon: 'sequence' }));
  
        break;
      case current.$_name.startsWith('DocumentJournal.'):
        previous.documentJournal.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'documentJournal', context: 'manager', path: treeItemPath,
            children: FillDocumentJournalItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('Enum.'):
        previous.enum.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'enum', context: 'manager', path: treeItemPath,
            children: FillEnumItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('Report.'):
        previous.report.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'report', context: 'object_and_manager', path: treeItemPath,
            children: FillObjectItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('DataProcessor.'):
        previous.dataProcessor.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'dataProcessor', context: 'object_and_manager', path: treeItemPath,
            children: FillObjectItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('ChartOfCharacteristicTypes.'):
        previous.сhartOfCharacteristicTypes.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'chartsOfCharacteristicType', context: 'object_and_manager_and_predefined', path: treeItemPath,
            children: FillObjectItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('ChartOfAccounts.'):
        previous.chartOfAccounts.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'chartsOfAccount', context: 'object_and_manager_and_predefined', path: treeItemPath,
            children: FillChartOfAccountsItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('ChartOfCalculationTypes.'):
        previous.chartOfCalculationTypes.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'chartsOfCalculationType', context: 'object_and_manager_and_predefined', path: treeItemPath,
            children: FillObjectItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('InformationRegister.'):
        previous.informationRegister.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'informationRegister', context: 'recordset_and_manager', path: treeItemPath,
            children: FillRegisterItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('AccumulationRegister.'):
        previous.accumulationRegister.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'accumulationRegister', context: 'recordset_and_manager', path: treeItemPath,
            children: FillRegisterItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('AccountingRegister.'):
        previous.accountingRegister.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'accountingRegister', context: 'recordset_and_manager', path: treeItemPath,
            children: FillRegisterItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('CalculationRegister.'):
        previous.calculationRegister.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'calculationRegister', context: 'recordset_and_manager', path: treeItemPath,
            children: FillCalculationRegisterItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('BusinessProcess.'):
        previous.businessProcess.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'businessProcess', context: 'object_and_manager', path: treeItemPath,
            children: FillObjectItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('Task.'):
        previous.task.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'task', context: 'object_and_manager', path: treeItemPath,
            children: FillTaskItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));
  
        break;
      case current.$_name.startsWith('ExternalDataSource.'):
        previous.externalDataSource.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'externalDataSource',
            context: 'object',
            path: treeItemPath,
            children: FillExternalDataSourceItemsByMetadata(treeItemId + '/', current, attributeReduceResult) }));

        break;
      case current.$_name.startsWith('DefinedType.'):
        previous.definedType.push(GetTreeItem(
          treeItemId, current.$_name, {
            icon: 'definedType',
            context: 'object',
            path: treeItemPath }));

        break;
    }
		
		return previous;
	}, {
    subsystem: [],
		commonModule: [],
		sessionParameter: [],
		role: [],
		commonAttribute: [],
		exchangePlan: [],
    eventSubscription: [],
    scheduledJob: [],
    commonForm: [],
    commonTemplate: [],
    commonPicture: [],
    webService: [],
    httpService: [],
    wsReference: [],
    style: [],
    constant: [],
		catalog: [],
		document: [],
    documentNumerator: [],
    sequence: [],
		documentJournal: [],
		enum: [],
		report: [],
		dataProcessor: [],
    сhartOfCharacteristicTypes: [],
    chartOfAccounts: [],
    chartOfCalculationTypes: [],
		informationRegister: [],
		accumulationRegister: [],
    accountingRegister: [],
    calculationRegister: [],
    businessProcess: [],
    task: [],
    externalDataSource: [],
    definedType: [],
	});

	SearchTree(element, element.id + '/subsystems')!.children = reduceResult.subsystem;
	SearchTree(element, element.id + '/commonModules')!.children = reduceResult.commonModule;
	SearchTree(element, element.id + '/sessionParameters')!.children = reduceResult.sessionParameter;
	SearchTree(element, element.id + '/roles')!.children = reduceResult.role;
	SearchTree(element, element.id + '/commonAttributes')!.children = reduceResult.commonAttribute;
	SearchTree(element, element.id + '/exchangePlans')!.children = reduceResult.exchangePlan;
	SearchTree(element, element.id + '/eventSubscriptions')!.children = reduceResult.eventSubscription;
	SearchTree(element, element.id + '/scheduledJobs')!.children = reduceResult.scheduledJob;
	SearchTree(element, element.id + '/commonForms')!.children = reduceResult.commonForm;
	SearchTree(element, element.id + '/commonTemplates')!.children = reduceResult.commonTemplate;
	SearchTree(element, element.id + '/commonPictures')!.children = reduceResult.commonPicture;
	SearchTree(element, element.id + '/webServices')!.children = reduceResult.webService;
	SearchTree(element, element.id + '/httpServices')!.children = reduceResult.httpService;
	SearchTree(element, element.id + '/wsReferences')!.children = reduceResult.wsReference;
	SearchTree(element, element.id + '/styles')!.children = reduceResult.style;
	SearchTree(element, element.id + '/constants')!.children = reduceResult.constant;
	SearchTree(element, element.id + '/catalogs')!.children = reduceResult.catalog;

	const documents = SearchTree(element, element.id + '/documents');
	documents!.children = [ ...documents!.children ?? [], ...reduceResult.document];

	SearchTree(element, element.id + '/documentNumerators')!.children = reduceResult.documentNumerator;
	SearchTree(element, element.id + '/sequences')!.children = reduceResult.sequence;
	SearchTree(element, element.id + '/documentJournals')!.children = reduceResult.documentJournal;
	SearchTree(element, element.id + '/enums')!.children = reduceResult.enum;
	SearchTree(element, element.id + '/reports')!.children = reduceResult.report;
	SearchTree(element, element.id + '/dataProcessors')!.children = reduceResult.dataProcessor;
	SearchTree(element, element.id + '/chartsOfCharacteristicTypes')!.children = reduceResult.сhartOfCharacteristicTypes;
	SearchTree(element, element.id + '/chartsOfAccounts')!.children = reduceResult.chartOfAccounts;
	SearchTree(element, element.id + '/chartsOfCalculationTypes')!.children = reduceResult.chartOfCalculationTypes;
	SearchTree(element, element.id + '/informationRegisters')!.children = reduceResult.informationRegister;
	SearchTree(element, element.id + '/accumulationRegisters')!.children = reduceResult.accumulationRegister;
	SearchTree(element, element.id + '/accountingRegisters')!.children = reduceResult.accountingRegister;
	SearchTree(element, element.id + '/calculationRegisters')!.children = reduceResult.calculationRegister;
	SearchTree(element, element.id + '/businessProcesses')!.children = reduceResult.businessProcess;
	SearchTree(element, element.id + '/tasks')!.children = reduceResult.task;
	SearchTree(element, element.id + '/externalDataSources')!.children = reduceResult.externalDataSource;
	SearchTree(element, element.id + '/definedTypes')!.children = reduceResult.definedType;
	console.timeEnd('reduce');
}

function FillWebServiceItemsByMetadata(idPrefix: string, versionMetadata: MetadataItemForTree, objectData: MetadataDictionaries) {
  return (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.startsWith(versionMetadata.$_name + '.Operation.') && m.$_name.split('.').length === 4)
		.map(m => GetTreeItem(idPrefix + m.$_id, m.$_name, {
      icon: 'operation', children: (versionMetadata
        .Metadata ?? [])
        .filter(f => f.$_name.startsWith(versionMetadata.$_name + '.Operation.' + m.$_name.split('.').pop() + '.Parameter.') && f.$_name.split('.').length === 6)
        .map(f => GetTreeItem(idPrefix + f.$_id, f.$_name, { icon: 'parameter' })) }));
}

function FillHttpServiceItemsByMetadata(idPrefix: string, versionMetadata: MetadataItemForTree, objectData: MetadataDictionaries) {
  return (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.startsWith(versionMetadata.$_name + '.URLTemplate.') && m.$_name.split('.').length === 4)
		.map(m => GetTreeItem(idPrefix + m.$_id, m.$_name, {
      icon: 'urlTemplate', children: (versionMetadata
        .Metadata ?? [])
        .filter(f => f.$_name.startsWith(versionMetadata.$_name + '.URLTemplate.' + m.$_name.split('.').pop() + '.Method.') && f.$_name.split('.').length === 6)
        .map(f => GetTreeItem(idPrefix + f.$_id, f.$_name, { icon: 'parameter' })) }));
}

function FillObjectItemsByMetadata(idPrefix: string, versionMetadata: MetadataItemForTree, objectData: MetadataDictionaries): TreeItem[] {
	const attributes = (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.startsWith(versionMetadata.$_name + '.Attribute.'))
		.map(m => GetTreeItem(idPrefix + m.$_id, m.$_name, { icon: 'attribute' }));

	const tabularSection = (versionMetadata.Metadata ?? [])
		.filter(m => m.$_name.startsWith(versionMetadata.$_name + '.TabularSection.') && !m.$_name.includes('.Attribute.'))
		.map(m => {
			const tsName = m.$_name.split('.').pop() || '';
			const path = `${idPrefix}${CreatePath(versionMetadata.$_name)}/TabularSections/${tsName}`;
			return GetTreeItem(idPrefix + m.$_id, m.$_name, {
				icon: 'tabularSection',
				context: 'tabularSection',
				path: path,
				// TODO: undefined for children if length eq zero
				children: (versionMetadata.Metadata ?? [])
					.filter(f => f.$_name.startsWith(versionMetadata.$_name + '.TabularSection.' + tsName) && f.$_name.includes('.Attribute.'))
					.map(f => GetTreeItem(idPrefix + f.$_id, f.$_name, { icon: 'attribute' })) 
			});
		});

	const items = [
		GetTreeItem(idPrefix + 'attributes', 'Реквизиты', { icon: 'attribute', children: attributes.length === 0 ? undefined : attributes }),
		GetTreeItem(idPrefix + 'tabularSections', 'Табличные части', { icon: 'tabularSection', children: tabularSection }),
	];

	return [ ...items, ...FillCommonItems(idPrefix , versionMetadata, objectData) ];
}

function FillDocumentJournalItemsByMetadata(idPrefix: string, versionMetadata: MetadataItemForTree, objectData: MetadataDictionaries): TreeItem[] {
	const columns = (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.startsWith(versionMetadata.$_name + '.Column.'))
		.map(m => GetTreeItem(idPrefix + m.$_id, m.$_name, { icon: 'column' }));

	const items = [
		GetTreeItem(idPrefix + 'columns', 'Графы', { icon: 'column', children: columns.length === 0 ? undefined : columns }),
	];

	return [ ...items, ...FillCommonItems(idPrefix, versionMetadata, objectData) ];
}

function FillEnumItemsByMetadata(idPrefix: string, versionMetadata: MetadataItemForTree, objectData: MetadataDictionaries): TreeItem[] {
	const values = (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.startsWith('Enum.'))
		.map(m => GetTreeItem(idPrefix + m.$_id, m.$_name, { icon: 'attribute' }));
	
	const items = [
		GetTreeItem(idPrefix + 'values', 'Значения', { icon: 'attribute', children: values.length === 0 ? undefined : values }),
	];

	return [ ...items, ...FillCommonItems(idPrefix, versionMetadata, objectData) ];
}

function FillChartOfAccountsItemsByMetadata(idPrefix: string, versionMetadata: MetadataItemForTree, objectData: MetadataDictionaries): TreeItem[] {
	const accountingFlags = (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.startsWith(versionMetadata.$_name + '.AccountingFlag.'))
		.map(m => GetTreeItem(idPrefix + m.$_id, m.$_name, { icon: 'accountingFlag' }));

	const extDimensionAccountingFlag = (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.startsWith(versionMetadata.$_name + '.ExtDimensionAccountingFlag.'))
		.map(m => GetTreeItem(idPrefix + m.$_id, m.$_name, { icon: 'extDimensionAccountingFlag' }));

  const items = [
		GetTreeItem(idPrefix + 'accountingFlags', 'Признаки учета', { icon: 'accountingFlag', children: accountingFlags.length === 0 ? undefined : accountingFlags }),
		GetTreeItem(idPrefix + 'extDimensionAccountingFlags', 'Признаки учета субконто', {
      icon: 'extDimensionAccountingFlag', children: extDimensionAccountingFlag.length === 0 ? undefined : extDimensionAccountingFlag }),
	];

	return [ ...items, ...FillObjectItemsByMetadata(idPrefix, versionMetadata, objectData) ]
    .sort((x, y) => { return x.label == "Реквизиты" ? -1 : y.label == "Реквизиты" ? 1 : 0; });
}

function FillRegisterItemsByMetadata(idPrefix: string, versionMetadata: MetadataItemForTree, objectData: MetadataDictionaries): TreeItem[] {
	const dimensions = (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.startsWith(versionMetadata.$_name + '.Dimension.'))
		.map(m => GetTreeItem(idPrefix + m.$_id, m.$_name, { icon: 'dimension' }));

	const resources = (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.startsWith(versionMetadata.$_name + '.Resource.'))
		.map(m => GetTreeItem(idPrefix + m.$_id, m.$_name, { icon: 'resource' }));

	const attributes = (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.startsWith(versionMetadata.$_name + '.Attribute.'))
		.map(m => GetTreeItem(idPrefix + m.$_id, m.$_name, { icon: 'attribute' }));

	const items = [
		GetTreeItem(idPrefix + 'dimensions', 'Измерения', { icon: 'dimension', children: dimensions.length === 0 ? undefined : dimensions }),
		GetTreeItem(idPrefix + 'resources', 'Ресурсы', { icon: 'resource', children: resources.length === 0 ? undefined : resources }),
		GetTreeItem(idPrefix + 'attributes', 'Реквизиты', { icon: 'attribute', children: attributes.length === 0 ? undefined : attributes }),
	];

	return [ ...items, ...FillCommonItems(idPrefix, versionMetadata, objectData) ];
}

function FillCalculationRegisterItemsByMetadata(idPrefix: string, versionMetadata: MetadataItemForTree, objectData: MetadataDictionaries): TreeItem[] {
  const items: TreeItem[] = [
    // TODO: Перерасчеты
	];

  return [ ...items, ...FillRegisterItemsByMetadata(idPrefix, versionMetadata, objectData) ];
}

function FillTaskItemsByMetadata(idPrefix: string, versionMetadata: MetadataItemForTree, objectData: MetadataDictionaries): TreeItem[] {
	const attributes = (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.startsWith(versionMetadata.$_name + '.AddressingAttribute.'))
		.map(m => GetTreeItem(idPrefix + m.$_id, m.$_name, { icon: 'attribute' }));

  const items = [
		GetTreeItem(idPrefix + 'addressingAttributes', 'Реквизиты адресации', { icon: 'attribute', children: attributes.length === 0 ? undefined : attributes }),
	];

	return [ ...items, ...FillObjectItemsByMetadata(idPrefix, versionMetadata, objectData) ]
    .sort((x, y) => { return x.label == "Реквизиты" ? -1 : y.label == "Реквизиты" ? 1 : 0; });
}

function FillExternalDataSourceItemsByMetadata(idPrefix: string, versionMetadata: MetadataItemForTree, objectData: MetadataDictionaries): TreeItem[] {
  const items: TreeItem[] = [
    // TODO:
	];

  return items;
}

function FillCommonItems(idPrefix: string, versionMetadata: MetadataItemForTree, objectData: MetadataDictionaries): TreeItem[] {
	const debugMode = vscode.workspace.getConfiguration().get<boolean>('metadataViewer.debugMode', false);
	const commands = (versionMetadata
		.Metadata ?? [])
		.filter(m => m.$_name.includes('.Command.'))
		.map(m => GetTreeItem(
      idPrefix + m.$_id,
      m.$_name,
      {
        icon: 'command',
        context: 'command',
        path: `${idPrefix}${CreatePath(m.$_name.split('.').slice(0, 2).join('.'))}/Commands/${m.$_name.split('.').pop()}`,
      }));

	const objectName = versionMetadata.$_name;
	const forms = objectData.form[objectName] || [];
	const templates = objectData.template[objectName] || [];
	const predefined = objectData.predefined[objectName] || [];
	
	if (debugMode) {
		outputChannel.appendLine(`[FillCommonItems] Для объекта ${objectName}: форм в objectData: ${forms.length}, макетов: ${templates.length}, предопределенных: ${predefined.length}`);
		if (forms.length > 0) {
			forms.forEach((form, idx) => {
				outputChannel.appendLine(`[FillCommonItems]   Форма ${idx}: ${form.label}`);
			});
		} else {
			// Проверяем, какие ключи есть в objectData.form
			const formKeys = Object.keys(objectData.form);
			outputChannel.appendLine(`[FillCommonItems] Доступные ключи в objectData.form: ${formKeys.join(', ')}`);
		}
		if (predefined.length > 0) {
			predefined.forEach((predef, idx) => {
				outputChannel.appendLine(`[FillCommonItems]   Предопределенный ${idx}: ${predef.label}`);
			});
		}
	}

	const items: TreeItem[] = [
		GetTreeItem(idPrefix + 'forms', 'Формы', { icon: 'form', children: forms.length === 0 ? undefined : forms }),
		GetTreeItem(idPrefix + 'commands', 'Команды', { icon: 'command', children: commands.length === 0 ? undefined : commands }),
		GetTreeItem(idPrefix + 'templates', 'Макеты', { icon: 'template', children: templates.length === 0 ? undefined : templates }),
	];

	// Добавляем узел "Предопределенные" только если есть предопределенные элементы
	if (predefined.length > 0) {
		items.push(GetTreeItem(idPrefix + 'predefined', 'Предопределенные', { icon: 'predefined', children: predefined }));
	}

	return items;
}

function SearchTree(element: TreeItem, matchingId: string): TreeItem | null {
	if(element.id === matchingId) {
		return element;
	} else if (element.children != null) {
		let result = null;
		for(let i = 0; result == null && i < element.children.length; i++) {
			result = SearchTree(element.children[i], matchingId);
		}
		return result;
	}
	return null;
}

/** Собирает примеры id из дерева для отладки. */
function collectSampleIds(element: TreeItem, max: number): string[] {
  const out: string[] = [];
  const visit = (n: TreeItem) => {
    if (out.length >= max) return;
    if (n.id) out.push(n.id);
    n.children?.forEach(visit);
  };
  visit(element);
  return out;
}

/** Собирает путь от корня до элемента (включительно) для последовательного reveal. */
function getPathFromRootToItem(item: TreeItem): TreeItem[] {
  const path: TreeItem[] = [];
  let current: TreeItem | null = item;
  const visited = new Set<string>();
  
  while (current) {
    // Защита от циклов
    if (visited.has(current.id)) {
      outputChannel.appendLine(`[getPathFromRootToItem] Обнаружен цикл на элементе id="${current.id}"`);
      break;
    }
    visited.add(current.id);
    
    path.unshift(current);
    if (!current.parentId) break;
    
    const parent: TreeItem | null = SearchTree(tree[0], current.parentId) ?? SearchTreeByNormalizedId(tree[0], current.parentId);
    if (!parent) {
      outputChannel.appendLine(`[getPathFromRootToItem] Не найден родитель для id="${current.id}" parentId="${current.parentId}"`);
      break;
    }
    current = parent;
  }
  return path;
}

/** Поиск по id с нормализацией путей (для Windows, где \\ и / могут различаться). */
function SearchTreeByNormalizedId(element: TreeItem, matchingId: string): TreeItem | null {
	const norm = (s: string) => s.replace(/\\/g, '/');
	const target = norm(matchingId);
	if (norm(element.id) === target) return element;
	if (element.children) {
		for (const ch of element.children) {
			const found = SearchTreeByNormalizedId(ch, matchingId);
			if (found) return found;
		}
	}
	return null;
}

/**
 * Рекурсивный поиск узла в SerializableTreeNode по ID
 * Аналог функции SearchTree() для работы с кэшем
 */
function searchSerializableTree(node: SerializableTreeNode, matchingId: string): SerializableTreeNode | null {
	if (node.id === matchingId) {
		return node;
	} else if (node.children != null) {
		let result = null;
		for (let i = 0; result == null && i < node.children.length; i++) {
			result = searchSerializableTree(node.children[i], matchingId);
		}
		return result;
	}
	return null;
}

/**
 * Кэш Content подсистем для ускорения повторных вызовов CollectSubsystemContent.
 * Ключ: rootPath.fsPath + '|' + treeItemPath
 */
const subsystemContentCache = new Map<string, string[]>();

/**
 * Очищает кэш Content подсистем. Вызывать при изменении файлов подсистем или смене workspace.
 */
export function clearSubsystemContentCache(): void {
  subsystemContentCache.clear();
}

/**
 * Нормализует имя метаданных для сравнения с filterSet.
 * Content в .mdo может использовать camelCase (commonModule), ConfigDumpInfo — PascalCase (CommonModule).
 * Возвращает вариант с PascalCase-префиксом типа.
 */
function normalizeMetadataNameForFilter(name: string): string {
	const t = (name ?? '').trim();
	const dotIdx = t.indexOf('.');
	if (dotIdx <= 0) return t;
	const typePart = t.slice(0, dotIdx);
	const rest = t.slice(dotIdx);
	const normalized = typePart.charAt(0).toUpperCase() + typePart.slice(1);
	return normalized + rest;
}

/**
 * Формирует путь к подсистеме для CollectSubsystemContent.
 * Вставляет Subsystems/ между уровнями иерархии: Subsystem.A.B → Subsystems/A/Subsystems/B.
 */
function createSubsystemPathForCollect(name: string): string {
  const parts = name.split('.').filter(p => p !== 'Subsystem');
  return parts.length === 0 ? '' : 'Subsystems/' + parts.join('/Subsystems/');
}

function GetSubsystemChildren(
  rootPath: vscode.Uri,
  rootId: string,
  versionMetadata: MetadataItemForTree[],
  name: string,
  level = 2
): TreeItem[] | undefined {
  const filtered = versionMetadata
    .filter(f => f.$_name.startsWith(`${name}.`) && f.$_name.split('.').length === 2 * level);

  if (filtered.length !== 0) {
    return filtered
      .map(m => {
        const chilldren = GetSubsystemChildren(rootPath, rootId, versionMetadata, m.$_name, level + 1);
        const treeItemPath = `${rootId}/${createSubsystemPathForCollect(m.$_name)}`;

        return GetTreeItem(
          rootId + '/' + m.$_id, m.$_name, {
            icon: 'subsystem',
            context: `subsystem_${rootId}`,
            children: chilldren,
            command: 'metadataViewer.filterBySubsystem',
            commandTitle: 'Filter by subsystem',
            commandArguments: CollectSubsystemContent(rootPath, treeItemPath)
          }
        );
      });
  }

  return undefined;
}

/** Нормализует путь для ключа кэша (единый формат) */
function normalizeCacheKeyPath(p: string): string {
  return p.replace(/\\/g, '/');
}

function CollectSubsystemContent(rootPath: vscode.Uri, treeItemPath: string): string[] {
  if (!treeItemPath || typeof treeItemPath !== 'string') {
    return [];
  }

  const cacheKey = `${normalizeCacheKeyPath(rootPath.fsPath)}|${normalizeCacheKeyPath(treeItemPath)}`;
  const cached = subsystemContentCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Нормализуем путь: на Windows element.id может содержать обратные слэши
  const treeItemPathNorm = normalizeCacheKeyPath(treeItemPath);

  // добавляю к фильтру сами подсистемы с иерархией
  const subsystemContent: string[] = [];
  
  // Формируем путь к файлу подсистемы: treeItemPath вида "E:/.../cf/Subsystems/Name" или "cf/Subsystems/Name"
  // 1С XML: cf/Subsystems/Name.xml или cf/Subsystems/Parent/Subsystems/Child.xml
  const subsystemsIndex = treeItemPathNorm.indexOf('Subsystems/');
  if (subsystemsIndex !== -1) {
    const subsystemPath = treeItemPathNorm.slice(subsystemsIndex); // "Subsystems/БухгалтерскийУчет"
    const parts = subsystemPath.split('/'); // ["Subsystems", "БухгалтерскийУчет"]
    
    // Добавляем имена подсистем из пути к фильтру (для поддержки иерархии подсистем)
    // Формат ConfigDumpInfo: "Subsystem.Parent" или "Subsystem.Parent.Child" для вложенных
    const nameParts = parts.filter(p => p !== 'Subsystems');
    if (nameParts.length > 0) {
      const fullSubsystemName = 'Subsystem.' + nameParts.join('.');
      subsystemContent.push(fullSubsystemName);
    }
    
    if (parts.length >= 2) {
      // Для вложенных путей (Subsystems/Parent/Subsystems/Child) берём последний сегмент — листовую подсистему
      const subsystemName = parts[parts.length - 1];
      let configPath = treeItemPathNorm.slice(0, subsystemsIndex); // Путь до "Subsystems/"
      
      // Убираем завершающий слэш, если есть
      if (configPath.endsWith('/')) {
        configPath = configPath.slice(0, -1);
      }
      
      // Если configPath пустой или содержит только слэш, значит подсистема в корне конфигурации
      if (!configPath || configPath === '/') {
        configPath = '';
      }
      
      // Пробуем пути: XML формат (.xml) и EDT формат (.mdo в подпапке)
      const pathDirectXml = configPath ? posix.join(configPath, subsystemPath + '.xml') : (subsystemPath + '.xml');
      const pathWithSubfolderXml = configPath ? posix.join(configPath, subsystemPath, `${subsystemName}.xml`) : posix.join(subsystemPath, `${subsystemName}.xml`);
      const pathWithSubfolderMdo = configPath ? posix.join(configPath, subsystemPath, `${subsystemName}.mdo`) : posix.join(subsystemPath, `${subsystemName}.mdo`);
      
      const rootFsPath = rootPath.fsPath;
      // Используем правильное соединение путей для текущей платформы
      // rootFsPath уже в формате текущей платформы (Windows: D:\..., Linux: /...)
      // pathDirect и pathWithSubfolder в формате posix (cf/Subsystems/... или Subsystems/...)
      const pathSep = process.platform === 'win32' ? '\\' : '/';
      const toFullPath = (p: string): string => {
        const normalized = p.split('/').filter(Boolean);
        if (normalized.length > 0 && /^[a-zA-Z]:$/.test(normalized[0])) {
          return p.replace(/\//g, pathSep);
        }
        return pathJoin(rootFsPath, ...normalized);
      };
      const pathsToTry = [
        pathDirectXml,
        pathWithSubfolderXml,
        pathWithSubfolderMdo
      ].map(toFullPath);
      
      let filePath: string | null = null;
      for (const fullPath of pathsToTry) {
        if (fs.existsSync(fullPath)) {
          filePath = fullPath;
          break;
        }
      }
      
      if (filePath) {
        try {
          const configXml = fs.readFileSync(filePath, 'utf-8');
          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '$_',
            textNodeName: '#text',
            removeNSPrefix: false,
          });
          const result = parser.parse(configXml);
          // Парсер может вернуть Content в разных форматах:
          // 1. MetaDataObject.Subsystem.Properties.Content (XML export)
          // 2. mdclass:Subsystem.content (EDT .mdo)
          const contentNode =
            result.MetaDataObject?.Subsystem?.Properties?.Content ??
            result.MetaDataObject?.Subsystem?.Content ??
            (result as any)['mdclass:Subsystem']?.content ??
            (result as any)['mdclass:Subsystem']?.properties?.content;
          let content: any = null;

          if (contentNode) {
            // xr:Item, Item, content — разные варианты ключей
            content = contentNode["xr:Item"] || contentNode.Item ||
              contentNode["xr:content"] || contentNode.content ||
              (Array.isArray(contentNode) ? contentNode : null);
          }

          if (content) {
            const contentArray = Array.isArray(content) ? content : [content];
            for (const contentElem of contentArray) {
              // Извлечение ссылки (CommonModule.Имя, Role.Имя) — включая ref для EDT
              let text: string | null = null;

              if (typeof contentElem === 'string') {
                text = contentElem;
              } else if (contentElem && typeof contentElem === 'object') {
                text = contentElem["#text"] ?? contentElem.ref ?? contentElem.text ?? contentElem.value ??
                  (() => {
                    const keys = Object.keys(contentElem).filter(k => !k.startsWith('@') && !k.startsWith('$_'));
                    if (keys.length === 1 && typeof contentElem[keys[0]] === 'string') {
                      return contentElem[keys[0]];
                    }
                    return null;
                  })();
              }

              if (text && typeof text === 'string' && text.trim().length > 0) {
                subsystemContent.push(text.trim());
              }
            }
          }

          // Рекурсивная агрегация Content вложенных подсистем (ChildObjects/Subsystem)
          // Поддержка XML export (MetaDataObject) и EDT .mdo (mdclass:Subsystem)
          const childObjects = result.MetaDataObject?.Subsystem?.ChildObjects
            ?? (result as any)['mdclass:Subsystem']?.childObjects
            ?? (result as any)['mdclass:Subsystem']?.ChildObjects;
          const childSubsystems = childObjects?.Subsystem ?? (childObjects as any)?.['Subsystem'];
          const childNames: string[] = childSubsystems
            ? (Array.isArray(childSubsystems) ? childSubsystems : [childSubsystems])
                .map((s: any) => typeof s === 'string' ? s : s?.['#text'] ?? s?.text ?? String(s ?? ''))
                .filter((name: string) => name && name.trim().length > 0)
            : [];

          for (const childName of childNames) {
            const nestedSubsystemPath = subsystemPath + '/Subsystems/' + childName;
            const nestedPath = configPath ? configPath + '/' + nestedSubsystemPath : nestedSubsystemPath;
            const nestedContent = CollectSubsystemContent(rootPath, nestedPath);
            for (const item of nestedContent) {
              if (!subsystemContent.includes(item)) {
                subsystemContent.push(item);
              }
            }
          }
          
          const config = vscode.workspace.getConfiguration();
          const debugMode = config.get<boolean>('metadataViewer.debugMode', false);
          if (debugMode) {
            const commonModuleCount = subsystemContent.filter(s => s.startsWith('CommonModule.')).length;
            const logMsg = `[CollectSubsystemContent] Прочитан файл ${filePath}, найдено объектов: ${subsystemContent.length} (CommonModule: ${commonModuleCount})`;
            console.log(logMsg);
            outputChannel.appendLine(logMsg);
            if (subsystemContent.length > 0) {
              outputChannel.appendLine(`[CollectSubsystemContent] Объекты: ${subsystemContent.slice(0, 20).join(', ')}${subsystemContent.length > 20 ? '...' : ''}`);
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[CollectSubsystemContent] Ошибка чтения файла подсистемы ${filePath}:`, errorMsg);
          outputChannel.appendLine(`[CollectSubsystemContent] Ошибка чтения файла подсистемы ${filePath}: ${errorMsg}`);
        }
      } else {
        const config = vscode.workspace.getConfiguration();
        const debugMode = config.get<boolean>('metadataViewer.debugMode', false);
        if (debugMode) {
          console.warn(`[CollectSubsystemContent] Файл подсистемы не найден. treeItemPath: ${treeItemPathNorm}, пути: ${pathsToTry.join(', ')}`);
          outputChannel.appendLine(`[CollectSubsystemContent] Файл подсистемы не найден. treeItemPath: ${treeItemPathNorm}`);
        }
        // Не кэшируем при ненайденном файле — следующий вызов попробует снова
        return subsystemContent;
      }
    }
  }

  // Кэшируем только при успешном чтении файла (filePath был найден)
  subsystemContentCache.set(cacheKey, subsystemContent);
  return subsystemContent;
}

/**
 * Асинхронная версия CollectSubsystemContent для параллельного чтения.
 * Использует тот же кэш, что и синхронная версия.
 */
async function collectSubsystemContentAsync(rootPath: vscode.Uri, treeItemPath: string): Promise<string[]> {
  if (!treeItemPath || typeof treeItemPath !== 'string') {
    return [];
  }

  const cacheKey = `${normalizeCacheKeyPath(rootPath.fsPath)}|${normalizeCacheKeyPath(treeItemPath)}`;
  const cached = subsystemContentCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const treeItemPathNorm = normalizeCacheKeyPath(treeItemPath);
  const subsystemContent: string[] = [];
  const subsystemsIndex = treeItemPathNorm.indexOf('Subsystems/');
  if (subsystemsIndex === -1) {
    return subsystemContent;
  }

  const subsystemPath = treeItemPathNorm.slice(subsystemsIndex);
  const parts = subsystemPath.split('/');
  const subsystemPathFromTree = subsystemPath.replace(/Subsystems\//g, 'Subsystem.').replace(/\//g, '.');
  if (subsystemPathFromTree) {
    subsystemContent.push(...subsystemPathFromTree.split('.').filter(Boolean));
  }

  if (parts.length < 2) {
    return subsystemContent;
  }

  const subsystemName = parts[parts.length - 1];
  let configPath = treeItemPathNorm.slice(0, subsystemsIndex);
  if (configPath.endsWith('/')) configPath = configPath.slice(0, -1);
  if (!configPath || configPath === '/') configPath = '';

  const pathDirectXml = configPath ? posix.join(configPath, subsystemPath + '.xml') : (subsystemPath + '.xml');
  const pathWithSubfolderXml = configPath ? posix.join(configPath, subsystemPath, `${subsystemName}.xml`) : posix.join(subsystemPath, `${subsystemName}.xml`);
  const pathWithSubfolderMdo = configPath ? posix.join(configPath, subsystemPath, `${subsystemName}.mdo`) : posix.join(subsystemPath, `${subsystemName}.mdo`);
  const rootFsPath = rootPath.fsPath;
  const pathSep = process.platform === 'win32' ? '\\' : '/';
  const toFullPath = (p: string): string => {
    const normalized = p.split('/').filter(Boolean);
    if (normalized.length > 0 && /^[a-zA-Z]:$/.test(normalized[0])) {
      return p.replace(/\//g, pathSep);
    }
    return pathJoin(rootFsPath, ...normalized);
  };
  const pathsToTry = [pathDirectXml, pathWithSubfolderXml, pathWithSubfolderMdo].map(toFullPath);

  let filePath: string | null = null;
  for (const fullPath of pathsToTry) {
    if (fs.existsSync(fullPath)) {
      filePath = fullPath;
      break;
    }
  }

  if (filePath) {
    try {
      const configXml = await fs.promises.readFile(filePath, 'utf-8');
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '$_',
        textNodeName: '#text',
        removeNSPrefix: false,
      });
      const result = parser.parse(configXml);
      const contentNode =
        result.MetaDataObject?.Subsystem?.Properties?.Content ??
        result.MetaDataObject?.Subsystem?.Content ??
        (result as any)['mdclass:Subsystem']?.content ??
        (result as any)['mdclass:Subsystem']?.properties?.content;
      let content: any = null;
      if (contentNode) {
        content = contentNode["xr:Item"] || contentNode.Item ||
          contentNode["xr:content"] || contentNode.content ||
          (Array.isArray(contentNode) ? contentNode : null);
      }
      if (content) {
        const contentArray = Array.isArray(content) ? content : [content];
        for (const contentElem of contentArray) {
          let text: string | null = null;
          if (typeof contentElem === 'string') {
            text = contentElem;
          } else if (contentElem && typeof contentElem === 'object') {
            text = contentElem["#text"] ?? contentElem.ref ?? contentElem.text ?? contentElem.value ??
              (() => {
                const keys = Object.keys(contentElem).filter(k => !k.startsWith('@') && !k.startsWith('$_'));
                if (keys.length === 1 && typeof contentElem[keys[0]] === 'string') return contentElem[keys[0]];
                return null;
              })();
          }
          if (text && typeof text === 'string' && text.trim().length > 0) {
            subsystemContent.push(text.trim());
          }
        }
      }

      const childObjects = result.MetaDataObject?.Subsystem?.ChildObjects
        ?? (result as any)['mdclass:Subsystem']?.childObjects
        ?? (result as any)['mdclass:Subsystem']?.ChildObjects;
      const childSubsystems = childObjects?.Subsystem ?? (childObjects as any)?.['Subsystem'];
      const childNames: string[] = childSubsystems
        ? (Array.isArray(childSubsystems) ? childSubsystems : [childSubsystems])
            .map((s: any) => typeof s === 'string' ? s : s?.['#text'] ?? s?.text ?? String(s ?? ''))
            .filter((name: string) => name && name.trim().length > 0)
        : [];

      for (const childName of childNames) {
        const nestedSubsystemPath = subsystemPath + '/Subsystems/' + childName;
        const nestedPath = configPath ? configPath + '/' + nestedSubsystemPath : nestedSubsystemPath;
        const nestedContent = await collectSubsystemContentAsync(rootPath, nestedPath);
        for (const item of nestedContent) {
          if (!subsystemContent.includes(item)) subsystemContent.push(item);
        }
      }
    } catch {
      // Ошибка чтения — не кэшируем
      return subsystemContent;
    }
    subsystemContentCache.set(cacheKey, subsystemContent);
  }
  return subsystemContent;
}

function removeSubSystems(subsystemsTreeItem: TreeItem, subsystemFilter: string[]) {
  const indexesToDelete: number[] = [];
  const labelStr = (ch: TreeItem) => (typeof ch.label === 'string' ? ch.label : (ch.label as vscode.TreeItemLabel)?.label) ?? '';
  subsystemsTreeItem.children?.forEach((ch, index) => {
    const lbl = labelStr(ch);
    const fullName = `Subsystem.${lbl}`;
    const isInFilter = subsystemFilter.some(f => f === fullName || f.endsWith(`.${lbl}`));
    if (!isInFilter) {
      indexesToDelete.push(index);
    } else {
      removeSubSystems(ch, subsystemFilter);
    }
  });
  indexesToDelete.sort((a, b) => b - a);
  indexesToDelete.forEach((d) => subsystemsTreeItem.children?.splice(d, 1));
}

export class NodeWithIdTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

  getChildren(element?: TreeItem | undefined): vscode.ProviderResult<TreeItem[]> {
    if (element === undefined) {
      return tree;
    }
    return element.children;
  }

  getTreeItem(element: TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getParent(element: TreeItem): TreeItem | undefined {
    return SearchTree(tree[0], element.parentId) ?? undefined;
  }

  update() {
    if (!tree) return;
    this._onDidChangeTreeData.fire(undefined);
  }
}

function CreateMetadata(idPrefix: string) {
  return [
    GetTreeItem(idPrefix + '/common', 'Общие', { icon: 'common', children: [
      GetTreeItem(idPrefix + '/subsystems', 'Подсистемы', { icon: 'subsystem', children: [] }),
      GetTreeItem(idPrefix + '/commonModules', 'Общие модули', { icon: 'commonModule', children: [] }),
      GetTreeItem(idPrefix + '/sessionParameters', 'Параметры сеанса', { icon: 'sessionParameter', children: [] }),
      GetTreeItem(idPrefix + '/roles', 'Роли', { icon: 'role', children: [] }),
      GetTreeItem(idPrefix + '/commonAttributes', 'Общие реквизиты', { icon: 'attribute', children: [] }),
      GetTreeItem(idPrefix + '/exchangePlans', 'Планы обмена', { icon: 'exchangePlan', children: [] }),
      GetTreeItem(idPrefix + '/filterCriteria', 'Критерии отбора', { icon: 'filterCriteria', children: [] }),
      GetTreeItem(idPrefix + '/eventSubscriptions', 'Подписки на события', { icon: 'eventSubscription', children: [] }),
      GetTreeItem(idPrefix + '/scheduledJobs', 'Регламентные задания', { icon: 'scheduledJob', children: [] }),
      //GetTreeItem(idPrefix + '', 'Боты', { children: [] }),
      GetTreeItem(idPrefix + '/functionalOptions', 'Функциональные опции', { children: [] }),
      GetTreeItem(idPrefix + '/functionalOptionsParameters', 'Параметры функциональных опций', { children: [] }),
      GetTreeItem(idPrefix + '/definedTypes', 'Определяемые типы', { children: [] }),
      GetTreeItem(idPrefix + '/settingsStorages', 'Хранилища настроек', { children: [] }),
      GetTreeItem(idPrefix + '/commonCommands', 'Общие команды', { children: [] }),
      GetTreeItem(idPrefix + '/commandGroups', 'Группы команд', { children: [] }),
      GetTreeItem(idPrefix + '/commonForms', 'Общие формы', { icon: 'form', children: [] }),
      GetTreeItem(idPrefix + '/commonTemplates', 'Общие макеты', { children: [] }),
      GetTreeItem(idPrefix + '/commonPictures', 'Общие картинки', { icon: 'picture', children: [] }),
      GetTreeItem(idPrefix + '/xdtoPackages', 'XDTO-пакеты', { children: [] }),
      GetTreeItem(idPrefix + '/webServices', 'Web-сервисы', { icon: 'ws', children: [] }),
      GetTreeItem(idPrefix + '/httpServices', 'HTTP-сервисы', { icon: 'http', children: [] }),
      GetTreeItem(idPrefix + '/wsReferences', 'WS-ссылки', { icon: 'wsLink', children: [] }),
      //GetTreeItem(idPrefix + '/', 'Сервисы интеграции', { children: [] }),
      GetTreeItem(idPrefix + '/styleItems', 'Элементы стиля', { children: [] }),
      GetTreeItem(idPrefix + '/styles', 'Стили', { icon: 'style', children: [] }),
      GetTreeItem(idPrefix + '/languages', 'Языки', { children: [] }),
    ]}),
    GetTreeItem(idPrefix + '/constants', 'Константы', { icon: 'constant', children: [] }),
    GetTreeItem(idPrefix + '/catalogs', 'Справочники', { icon: 'catalog', children: [] }),
    GetTreeItem(idPrefix + '/documents', 'Документы', { icon: 'document', children: [
      GetTreeItem(idPrefix + '/documentNumerators', 'Нумераторы', { icon: 'documentNumerator', children: [] }),
      GetTreeItem(idPrefix + '/sequences', 'Последовательности', { icon: 'sequence', children: [] }),
    ]}),
    GetTreeItem(idPrefix + '/documentJournals', 'Журналы документов', { icon: 'documentJournal', children: [] }),
    GetTreeItem(idPrefix + '/enums', 'Перечисления', { icon: 'enum', children: [] }),
    GetTreeItem(idPrefix + '/reports', 'Отчеты', { icon: 'report', children: [] }),
    GetTreeItem(idPrefix + '/dataProcessors', 'Обработки', { icon: 'dataProcessor', children: [] }),
    GetTreeItem(idPrefix + '/chartsOfCharacteristicTypes', 'Планы видов характеристик', { icon: 'chartsOfCharacteristicType', children: [] }),
    GetTreeItem(idPrefix + '/chartsOfAccounts', 'Планы счетов', { icon: 'chartsOfAccount', children: [] }),
    GetTreeItem(idPrefix + '/chartsOfCalculationTypes', 'Планы видов расчета', { icon: 'chartsOfCalculationType', children: [] }),
    GetTreeItem(idPrefix + '/informationRegisters', 'Регистры сведений', { icon: 'informationRegister', children: [] }),
    GetTreeItem(idPrefix + '/accumulationRegisters', 'Регистры накопления', { icon: 'accumulationRegister', children: [] }),
    GetTreeItem(idPrefix + '/accountingRegisters', 'Регистры бухгалтерии', { icon: 'accountingRegister', children: [] }),
    GetTreeItem(idPrefix + '/calculationRegisters', 'Регистры расчета', { icon: 'calculationRegister', children: [] }),
    GetTreeItem(idPrefix + '/businessProcesses', 'Бизнес-процессы', { icon: 'businessProcess', children: [] }),
    GetTreeItem(idPrefix + '/tasks', 'Задачи', { icon: 'task', children: [] }),
    GetTreeItem(idPrefix + '/externalDataSources', 'Внешние источники данных', { icon: 'externalDataSource', children: [] }),
  ];
}

function GetMetadataName(name: string) {
  return name
    .replace('Catalogs.', 'Справочник ');
}

function GetContent(object: { [key: string]: { [key: string]: string } }) {
  if (!object || !object['v8:item']) {
    return '';
  }

  // Вспомогательная функция для извлечения строкового значения из v8:content
  const getContentString = (content: any): string => {
    if (typeof content === 'string') {
      return content;
    }
    if (content && typeof content === 'object') {
      // Может быть объектом с #text или text
      return content['#text'] || content.text || content.content || String(content);
    }
    return String(content || '');
  };

  if (Array.isArray(object['v8:item'])) {
    if (object['v8:item'].length > 0 && object['v8:item'][0]['v8:content']) {
      const content = getContentString(object['v8:item'][0]['v8:content']);
      return content.split('"').join('&quot;');
    }
    return '';
  }
  
  if (object['v8:item']['v8:content']) {
    const content = getContentString(object['v8:item']['v8:content']);
    return content.split('"').join('&quot;');
  }
  return '';
}

"use strict";
/**
 * FormPreviewer
 *
 * Переработанный предпросмотр формы: вместо жёсткого XSLT-рендера открываем React-webview
 * и показываем структуру формы (ChildItems) + свойства выбранного элемента (read-only).
 *
 * MVP: только просмотр (без сохранения/drag&drop/добавления элементов).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormPreviewer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const MetadataScanner_1 = require("./metadata_utils/MetadataScanner");
const formParserXmldom_1 = require("./xmlParsers/formParserXmldom");
const formSerializerXmldom_1 = require("./xmlParsers/formSerializerXmldom");
const xmlUtils_1 = require("./utils/xmlUtils");
const xmlStructureValidator_1 = require("./validation/xmlStructureValidator");
const commitFileLogger_1 = require("./utils/commitFileLogger");
const extension_1 = require("./extension");
class FormPreviewer {
    async scanMetadataForWebview() {
        if (this.metadataCache)
            return this.metadataCache;
        const registers = [];
        const referenceTypes = [];
        const objectsWithPaths = [];
        // Пытаемся найти корень конфигурации (confPath уже должен быть корнем CF)
        const KNOWN_TYPE_DIRS = new Set([
            "Catalogs",
            "Documents",
            "Enums",
            "Reports",
            "DataProcessors",
            "ChartsOfCharacteristicTypes",
            "ChartsOfAccounts",
            "ChartsOfCalculationTypes",
            "InformationRegisters",
            "AccumulationRegisters",
            "AccountingRegisters",
            "CalculationRegisters",
            "BusinessProcesses",
            "Tasks",
            "DefinedTypes",
            "ExchangePlans",
        ]);
        let effectiveRoot = this.confPath;
        try {
            const entries = fs.readdirSync(effectiveRoot, { withFileTypes: true });
            const hasTypeDirs = entries.some((e) => e.isDirectory() && KNOWN_TYPE_DIRS.has(e.name));
            if (!hasTypeDirs) {
                const parent = path.dirname(effectiveRoot);
                if (parent && parent !== effectiveRoot)
                    effectiveRoot = parent;
            }
        }
        catch {
            // ignore
        }
        try {
            const scanResult = await (0, MetadataScanner_1.scanMetadataRoot)(effectiveRoot);
            const typeDirToMetadataType = {
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
            const metadataTypeToTypePrefixes = {
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
                objectsWithPaths.push({
                    objectTypeDir: obj.objectTypeDir,
                    displayName: obj.displayName,
                    fsName: obj.fsName,
                    mainXmlPath: obj.mainXmlPath,
                });
                const metadataType = typeDirToMetadataType[obj.objectTypeDir];
                if (!metadataType)
                    continue;
                const fullName = `${metadataType}.${obj.displayName}`;
                if (metadataType === 'InformationRegister' ||
                    metadataType === 'AccumulationRegister' ||
                    metadataType === 'AccountingRegister' ||
                    metadataType === 'CalculationRegister') {
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
        }
        catch {
            // ignore
        }
        this.metadataCache = { registers, referenceTypes, objectsWithPaths };
        return this.metadataCache;
    }
    /**
     * Загружает структуру (реквизиты, табличные части) для реквизитов формы со ссылочными типами.
     */
    async loadReferenceTypeStructures(formAttributes, metadata) {
        const result = {};
        const prefixToTypeDir = {
            DocumentObject: 'Documents',
            DocumentRef: 'Documents',
            CatalogObject: 'Catalogs',
            CatalogRef: 'Catalogs',
            EnumRef: 'Enums',
            ReportRef: 'Reports',
            DataProcessorRef: 'DataProcessors',
            InformationRegisterRef: 'InformationRegisters',
            AccumulationRegisterRef: 'AccumulationRegisters',
            AccountingRegisterRef: 'AccountingRegisters',
            CalculationRegisterRef: 'CalculationRegisters',
            BusinessProcessObject: 'BusinessProcesses',
            TaskObject: 'Tasks',
            DefinedTypeRef: 'DefinedTypes',
            ExchangePlanObject: 'ExchangePlans',
        };
        for (const attr of formAttributes) {
            const typeStr = (attr.typeDisplay ?? (typeof attr.type === 'string' ? attr.type : attr.type?.['v8:Type'] ?? ''));
            if (!typeStr || typeof typeStr !== 'string')
                continue;
            const parts = typeStr.split('.');
            if (parts.length < 2)
                continue;
            const prefix = parts[0].replace(/^cfg:/, '');
            const objectName = parts[parts.length - 1];
            const typeDir = prefixToTypeDir[prefix];
            if (!typeDir)
                continue;
            const obj = metadata.objectsWithPaths.find((o) => o.objectTypeDir === typeDir && (o.displayName === objectName || o.fsName === objectName));
            if (!obj)
                continue;
            try {
                const { parseMetadataXml } = await Promise.resolve().then(() => __importStar(require('./xmlParsers/metadataParser')));
                const parsed = await parseMetadataXml(obj.mainXmlPath);
                result[attr.name] = {
                    attributes: (parsed.attributes || []).map((a) => ({ name: a.name, typeDisplay: a.typeDisplay || a.type?.kind || '' })),
                    tabularSections: (parsed.tabularSections || []).map((ts) => ({
                        name: ts.name,
                        attributes: (ts.attributes || []).map((a) => ({ name: a.name, typeDisplay: a.typeDisplay || a.type?.kind || '' })),
                    })),
                };
            }
            catch {
                // ignore
            }
        }
        return result;
    }
    constructor(confPath, rootFilePath, filePath) {
        this.metadataCache = null;
        this.webviewReady = false;
        this.pendingInitMessage = null;
        this.fallbackTimeout = null;
        this.webpanel = undefined;
        this.currentDomDocument = null; // DOM документ для сохранения
        this.currentRootAttrs = undefined; // Атрибуты корня
        this.extensionUri = undefined;
        this.confPath = confPath;
        this.rootFilePath = rootFilePath;
        this.filePath = filePath;
    }
    /**
     * Открывает предпросмотр формы.
     * @param extensionUri URI расширения (для доступа к media/*)
     * @param title Заголовок узла дерева
     */
    async openPreview(extensionUri, title) {
        this.extensionUri = extensionUri;
        if (!fs.existsSync(this.filePath)) {
            vscode.window.showInformationMessage(`File ${this.filePath} does not exist.`);
            return;
        }
        extension_1.statusBarProgress.show();
        extension_1.statusBarProgress.text = "$(sync~spin) Загрузка редактора…";
        // Создаём или переиспользуем панель
        if (!this.webpanel) {
            const panel = vscode.window.createWebviewPanel(FormPreviewer.viewType, `Предпросмотр формы (${title ?? ""})`, vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, "media"),
                    vscode.Uri.joinPath(extensionUri, "resources"),
                ],
            });
            this.webpanel = panel;
            extension_1.contextStatusBar.text = `1С: Форма — ${title ?? ""}`;
            extension_1.contextStatusBar.show();
            panel.onDidDispose(() => {
                this.webpanel = undefined;
                extension_1.contextStatusBar.hide();
            });
            panel.webview.html = this.getHtmlForWebview(panel.webview, extensionUri);
            // КРИТИЧНО: Ждем сообщения "webviewReady" от webview перед отправкой данных
            // Это предотвращает потерю сообщений, если React еще не инициализирован
            // Также добавляем fallback с таймаутом на случай, если сообщение не придет
            this.fallbackTimeout = setTimeout(() => {
                if (!this.webviewReady) {
                    console.warn('[FormPreviewer] Webview ready message not received, using fallback timeout');
                    this.webviewReady = true;
                    if (this.pendingInitMessage && this.webpanel) {
                        this.webpanel.webview.postMessage(this.pendingInitMessage);
                        this.pendingInitMessage = null;
                    }
                }
            }, 2000); // Fallback через 2 секунды
            panel.webview.onDidReceiveMessage(async (message) => {
                try {
                    if (!message || typeof message !== 'object')
                        return;
                    // Обработка сообщения "webviewReady" от webview
                    if (message.type === 'webviewReady') {
                        this.webviewReady = true;
                        if (this.fallbackTimeout) {
                            clearTimeout(this.fallbackTimeout);
                            this.fallbackTimeout = null;
                        }
                        if (this.pendingInitMessage) {
                            this.webpanel?.webview.postMessage(this.pendingInitMessage);
                            this.pendingInitMessage = null;
                        }
                        return;
                    }
                    if (message.type === 'openFormModuleAtProcedure') {
                        const procedureName = String(message.procedureName || '').trim();
                        const extDir = path.dirname(this.filePath);
                        const modulePath = path.join(extDir, 'Form', 'Module.bsl');
                        if (!fs.existsSync(modulePath)) {
                            vscode.window.showErrorMessage(`Модуль формы не найден: ${modulePath}`);
                            return;
                        }
                        const uri = vscode.Uri.file(modulePath);
                        const doc = await vscode.workspace.openTextDocument(uri);
                        const editor = await vscode.window.showTextDocument(doc, { preview: false });
                        if (procedureName) {
                            const text = doc.getText();
                            const lineEnd = text.includes('\r\n') ? '\r\n' : '\n';
                            const lines = text.split(lineEnd);
                            const nameLower = procedureName.toLowerCase();
                            let foundLine = -1;
                            // Ключевые слова BSL: английские и русские (Procedure/Процедура, Function/Функция)
                            const procFuncRegex = /^\s*(Procedure|Function|Процедура|Функция)\s+(\S+)\s*\(/i;
                            for (let i = 0; i < lines.length; i++) {
                                const line = lines[i];
                                const m = line.match(procFuncRegex);
                                if (m && m[2].toLowerCase() === nameLower) {
                                    foundLine = i;
                                    break;
                                }
                            }
                            if (foundLine >= 0) {
                                const start = new vscode.Position(foundLine, 0);
                                const end = new vscode.Position(foundLine, lines[foundLine].length);
                                editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
                                editor.selection = new vscode.Selection(start, end);
                            }
                        }
                        return;
                    }
                    if (message.type !== 'saveForm')
                        return;
                    const payload = message.payload;
                    const formPath = String(payload?.sourcePath || '').trim();
                    if (!formPath || formPath !== this.filePath) {
                        throw new Error('Invalid formPath');
                    }
                    // ВАЖНО: Используем сохраненные DOM документ и атрибуты
                    // (их нельзя отправить в webview из-за циклических ссылок)
                    if (!this.currentDomDocument) {
                        throw new Error('DOM документ не сохранен');
                    }
                    // Создаем структуру с DOM документом для сериализации
                    const formDataWithDom = {
                        ...payload,
                        _originalXml: fs.readFileSync(formPath, 'utf8'),
                        _domDocument: this.currentDomDocument,
                        _rootAttrs: this.currentRootAttrs,
                    };
                    const updatedXml = (0, formSerializerXmldom_1.serializeFormToXml)(formDataWithDom);
                    const normalizedXml = (0, xmlUtils_1.normalizeXML)(updatedXml);
                    const validation = (0, xmlUtils_1.validateXML)(normalizedXml);
                    if (!validation.valid) {
                        throw new Error(validation.error ?? 'Результат сохранения не является валидным XML');
                    }
                    const structureValidationEnabled = vscode.workspace.getConfiguration('metadataViewer').get('structureValidationEnabled', true);
                    if (structureValidationEnabled && this.extensionUri) {
                        const structureResult = (0, xmlStructureValidator_1.validateXmlStructure)(normalizedXml, {
                            extensionPath: this.extensionUri.fsPath,
                            filePath: formPath,
                            rootTag: 'Form'
                        });
                        if (!structureResult.valid && structureResult.errors?.length) {
                            const errorMessage = structureResult.errors.slice(0, 3).join('; ');
                            vscode.window.showErrorMessage(`Ошибка структуры XML формы: ${errorMessage}`);
                            throw new Error(`XML structure validation failed: ${errorMessage}`);
                        }
                    }
                    // ВАЖНО: Добавляем BOM (Byte Order Mark) для UTF-8, как в оригинальных файлах 1С
                    const xmlWithBom = '\uFEFF' + normalizedXml;
                    await fs.promises.writeFile(formPath, xmlWithBom, 'utf8');
                    // Логируем измененный файл в Commit.txt
                    commitFileLogger_1.CommitFileLogger.getInstance().logChangedFile(formPath);
                    panel.webview.postMessage({ type: 'formPreviewSaved', success: true });
                    vscode.window.showInformationMessage('Форма успешно сохранена.');
                }
                catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    try {
                        panel.webview.postMessage({ type: 'formPreviewSaved', success: false, error: msg });
                    }
                    catch {
                        // ignore
                    }
                    vscode.window.showErrorMessage(`Ошибка сохранения формы: ${msg}`);
                }
            });
        }
        // Парсим форму и отдаём в webview
        try {
            // Используем xmldom парсер для сохранения DOM документа
            const parsedXmldom = await (0, formParserXmldom_1.parseFormXmlFullXmldom)(this.filePath);
            // Сохраняем DOM документ и атрибуты для последующего сохранения
            // Их нельзя отправить в webview (циклические ссылки)
            this.currentDomDocument = parsedXmldom._domDocument;
            this.currentRootAttrs = parsedXmldom._rootAttrs;
            // Удаляем служебные поля перед отправкой в webview
            const { _originalXml, _domDocument, _rootAttrs, ...parsed } = parsedXmldom;
            const metadata = await this.scanMetadataForWebview();
            const referenceTypeStructures = await this.loadReferenceTypeStructures(parsed.attributes || [], metadata);
            const initMessage = {
                type: "formPreviewInit",
                payload: parsed,
                metadata: { ...metadata, referenceTypeStructures },
            };
            // Если webview еще не готов, сохраняем сообщение для отправки позже
            if (!this.webviewReady) {
                this.pendingInitMessage = initMessage;
            }
            else {
                this.webpanel?.webview.postMessage(initMessage);
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Ошибка предпросмотра формы: ${msg}`);
        }
        finally {
            extension_1.statusBarProgress.hide();
        }
    }
    /**
     * HTML-шаблон для React webview.
     * Важно:
     * - используем единый bundle `media/metadataEditor.bundle.js`
     * - заранее выставляем режим приложения `formPreview`
     * - оставляем перехват dynamic chunks (Monaco) как в MetadataPanel
     */
    getHtmlForWebview(webview, extensionUri) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "metadataEditor.bundle.js"));
        const resourceSvgUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "resources", "dark", "resource.svg"));
        const sequenceSvgUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "resources", "dark", "sequence.svg"));
        const templateSvgUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "resources", "dark", "template.svg"));
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
  <title>Form preview</title>

  <script nonce="${nonce}">
    // Режим приложения для entrypoint (src/webview/index.tsx)
    window.__APP_MODE__ = 'formPreview';
    window.__FORM_PREVIEW_RESOURCE_ICON__ = ${JSON.stringify(resourceSvgUri.toString())};
    window.__FORM_PREVIEW_SEQUENCE_ICON__ = ${JSON.stringify(sequenceSvgUri.toString())};
    window.__FORM_PREVIEW_TEMPLATE_ICON__ = ${JSON.stringify(templateSvgUri.toString())};

    // КРИТИЧНО: Перехватываем загрузку динамических чанков ДО загрузки bundle
    // Это предотвращает ошибки ChunkLoadError для Monaco Editor
    (function() {
      function interceptWebpackRequireE() {
        if (window.__webpack_require__ && window.__webpack_require__.e) {
          // Переопределяем функцию загрузки чанков
          window.__webpack_require__.e = function(chunkId) {
            console.warn('[Webpack] Попытка загрузить чанк ' + chunkId + ' заблокирована. Используется синхронный режим Monaco.');
            return Promise.reject(new Error('Chunk loading disabled for webview: ' + chunkId));
          };
          return true;
        }
        return false;
      }

      if (!interceptWebpackRequireE()) {
        const strategies = [
          function() { document.addEventListener('DOMContentLoaded', interceptWebpackRequireE); },
          function() { window.addEventListener('load', interceptWebpackRequireE); },
          function() {
            const observer = new MutationObserver(function() {
              if (interceptWebpackRequireE()) observer.disconnect();
            });
            observer.observe(document, { childList: true, subtree: true });
          },
          function() {
            const interval = setInterval(function() {
              if (interceptWebpackRequireE()) clearInterval(interval);
            }, 10);
            setTimeout(function() { clearInterval(interval); }, 5000);
          }
        ];

        strategies.forEach(function(strategy) {
          try { strategy(); } catch (e) { console.error('[Webpack] Ошибка при настройке перехвата:', e); }
        });
      }
    })();
  </script>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
exports.FormPreviewer = FormPreviewer;
FormPreviewer.viewType = "metadataViewer.formPreview";
/**
 * Генерация nonce для CSP.
 */
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=formPreviewer.js.map
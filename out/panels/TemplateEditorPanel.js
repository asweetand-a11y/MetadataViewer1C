"use strict";
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
exports.TemplateEditorPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fileUtils_1 = require("../utils/fileUtils");
const templateXmlSaver_1 = require("../utils/templateXmlSaver");
const extension_1 = require("../extension");
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
class TemplateEditorPanel {
    constructor(panel, extensionUri, templateDocument, templatePath, originalXml, configRoot) {
        this.extensionUri = extensionUri;
        this.disposables = [];
        this.templateDocument = null;
        this.templatePath = '';
        this.originalXml = '';
        this.configRoot = '';
        this.webviewReady = false;
        this.pendingPostInit = false;
        this.fallbackTimeout = null;
        this.panel = panel;
        this.templateDocument = templateDocument;
        this.templatePath = templatePath;
        this.originalXml = originalXml;
        this.configRoot = configRoot;
        this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);
        this.setWebviewMessageListener(this.panel.webview);
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        // КРИТИЧНО: Ждем сообщения "webviewReady" от webview перед отправкой данных
        // Это предотвращает потерю сообщений, если React еще не инициализирован
        // Также добавляем fallback с таймаутом на случай, если сообщение не придет
        this.fallbackTimeout = setTimeout(async () => {
            if (!this.webviewReady) {
                console.warn('[TemplateEditorPanel] Webview ready message not received, using fallback timeout');
                this.webviewReady = true;
                if (this.pendingPostInit) {
                    await this.postInitMessage();
                    this.pendingPostInit = false;
                }
            }
        }, 2000); // Fallback через 2 секунды
    }
    static createOrShowForTemplate(extensionUri, templateDocument, templatePath, originalXml, configRoot) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        const templateName = path.basename(path.dirname(templatePath));
        const panel = vscode.window.createWebviewPanel(TemplateEditorPanel.viewType, `Макет: ${templateName}`, column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
        });
        extension_1.contextStatusBar.text = `1С: Макет — ${templateName}`;
        extension_1.contextStatusBar.show();
        new TemplateEditorPanel(panel, extensionUri, templateDocument, templatePath, originalXml, configRoot);
    }
    async postInitMessage() {
        if (!this.templateDocument) {
            return;
        }
        // Если webview еще не готов, помечаем как ожидающее отправку
        if (!this.webviewReady) {
            this.pendingPostInit = true;
            return;
        }
        const message = {
            type: 'init',
            payload: {
                templateDocument: this.templateDocument,
                templatePath: this.templatePath,
                originalXml: this.originalXml
            }
        };
        this.panel.webview.postMessage(message);
    }
    setWebviewMessageListener(webview) {
        const subscription = webview.onDidReceiveMessage(async (message) => {
            try {
                // Обработка сообщения "webviewReady" от webview
                if (message.type === 'webviewReady') {
                    this.webviewReady = true;
                    if (this.fallbackTimeout) {
                        clearTimeout(this.fallbackTimeout);
                        this.fallbackTimeout = null;
                    }
                    if (this.pendingPostInit) {
                        await this.postInitMessage();
                        this.pendingPostInit = false;
                    }
                    return;
                }
                switch (message.type) {
                    case 'save':
                        await this.handleSave(message.payload);
                        break;
                    case 'requestRefresh':
                        await this.postInitMessage();
                        break;
                    default:
                        console.warn(`[TemplateEditorPanel] Неизвестный тип сообщения: ${message.type}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[TemplateEditorPanel] Ошибка обработки сообщения:`, error);
                vscode.window.showErrorMessage(`Ошибка обработки сообщения: ${errorMessage}`);
            }
        });
        this.disposables.push(subscription);
    }
    async handleSave(templateDocument) {
        try {
            if (!(0, fileUtils_1.validatePath)(this.configRoot, this.templatePath)) {
                throw new Error('Invalid file path: possible path traversal attack');
            }
            // Сохраняем макет через templateXmlSaver
            (0, templateXmlSaver_1.saveTemplateToXml)(templateDocument, this.originalXml, this.templatePath, this.configRoot, this.extensionUri.fsPath);
            // Обновляем состояние
            this.templateDocument = templateDocument;
            this.originalXml = ''; // Обновим при следующем чтении файла
            vscode.window.showInformationMessage('Макет сохранен');
            // Отправляем сообщение в webview о успешном сохранении
            this.panel.webview.postMessage({ type: 'saved', success: true });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Ошибка сохранения макета: ${errorMessage}`);
            // Отправляем сообщение в webview об ошибке
            this.panel.webview.postMessage({ type: 'saved', success: false, error: errorMessage });
            throw error;
        }
    }
    getHtmlForWebview(webview) {
        // Используем общий bundle, который собирается webpack из src/webview/index.tsx
        // index.tsx автоматически выбирает нужный компонент на основе __APP_MODE__
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'metadataEditor.bundle.js'));
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
                 script-src ${webview.cspSource} 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Редактор макетов 1С</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">
    window.__APP_MODE__ = 'templateEditor';
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
    dispose() {
        TemplateEditorPanel.currentPanel = undefined;
        extension_1.contextStatusBar.hide();
        if (this.fallbackTimeout) {
            clearTimeout(this.fallbackTimeout);
            this.fallbackTimeout = null;
        }
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
exports.TemplateEditorPanel = TemplateEditorPanel;
TemplateEditorPanel.viewType = 'metadataViewer.templateEditorPanel';
//# sourceMappingURL=TemplateEditorPanel.js.map
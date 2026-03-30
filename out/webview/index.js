"use strict";
/**
 * Точка входа для React приложения редактора метаданных
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// КРИТИЧНО: Настраиваем Monaco Environment ДО импорта компонентов, использующих Monaco
// Это предотвращает создание динамических чанков и web workers
if (typeof window.MonacoEnvironment === 'undefined') {
    window.MonacoEnvironment = {
        getWorkerUrl: function (moduleId, label) {
            // Возвращаем пустую строку, чтобы Monaco не пытался загружать workers динамически
            // Это предотвращает ошибки ChunkLoadError
            return '';
        },
        getWorker: function (_moduleId, _label) {
            // ВАЖНО: Monaco ожидает Worker или Promise<Worker>.
            // Возврат undefined приводит к падению внутри Monaco (undefined.then).
            // Чтобы избежать динамических чанков/worker-файлов, явно отключаем workers,
            // позволяя Monaco корректно перейти на main-thread fallback.
            throw new Error('Monaco web workers are disabled in this webview bundle');
        }
    };
}
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const MetadataEditor_1 = require("./components/MetadataEditor");
const FormPreviewApp_1 = require("./components/FormPreview/FormPreviewApp");
const DcsEditorApp_1 = require("./components/DcsEditor/DcsEditorApp");
const SimpleQueryEditor_1 = require("./components/SimpleQueryEditor");
const StandaloneQueryEditor_1 = require("./components/StandaloneQueryEditor");
const TemplateEditorApp_1 = require("./components/TemplateEditor/TemplateEditorApp");
const PredefinedEditorApp_1 = require("./components/PredefinedEditor/PredefinedEditorApp");
const RoleEditorApp_1 = require("./components/RoleEditor/RoleEditorApp");
require("../webview/styles/editor.css");
const vscode = acquireVsCodeApi();
// Инициализация React приложения
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}
const root = client_1.default.createRoot(rootElement);
const appMode = window.__APP_MODE__;
const App = appMode === 'templateEditor'
    ? TemplateEditorApp_1.TemplateEditorApp
    : appMode === 'formPreview'
        ? FormPreviewApp_1.FormPreviewApp
        : appMode === 'dcsEditor'
            ? DcsEditorApp_1.DcsEditorApp
            : appMode === 'queryEditor'
                ? SimpleQueryEditor_1.SimpleQueryEditor
                : appMode === 'standaloneQueryEditor'
                    ? StandaloneQueryEditor_1.StandaloneQueryEditor
                    : appMode === 'predefinedEditor'
                        ? PredefinedEditorApp_1.PredefinedEditorApp
                        : appMode === 'roleEditor'
                            ? RoleEditorApp_1.RoleEditorApp
                            : MetadataEditor_1.MetadataEditor;
root.render(react_1.default.createElement(react_1.default.StrictMode, null,
    react_1.default.createElement(App, { vscode: vscode })));
// КРИТИЧНО: Отправляем сообщение "webviewReady" после инициализации React
// Это позволяет extension знать, что webview готов к получению данных
// Используем requestAnimationFrame для гарантии, что React полностью отрендерился
requestAnimationFrame(() => {
    // Дополнительная задержка для гарантии, что обработчики сообщений установлены
    setTimeout(() => {
        vscode.postMessage({ type: 'webviewReady' });
    }, 50);
});
//# sourceMappingURL=index.js.map
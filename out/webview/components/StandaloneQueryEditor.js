"use strict";
/**
 * Полноценный редактор запросов для BSL-строк
 * Использует QueryEditorEnhanced в полноэкранном режиме
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
exports.StandaloneQueryEditor = void 0;
const react_1 = __importStar(require("react"));
const QueryEditorEnhanced_1 = require("./DcsEditor/QueryEditorEnhanced");
const MetadataTreePanel_1 = require("./DcsEditor/MetadataTreePanel");
const monacoQueryLanguage_1 = require("../utils/monacoQueryLanguage");
const provider_1 = require("../queryLanguage/completion/provider");
const StandaloneQueryEditor = ({ vscode }) => {
    const [data, setData] = (0, react_1.useState)({
        queryText: '',
        metadata: { registers: [], referenceTypes: [] },
        metadataTree: null,
    });
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [queryText, setQueryText] = (0, react_1.useState)('');
    const [queryModel, setQueryModel] = (0, react_1.useState)(null);
    // Обработка сообщений от расширения
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (!message || typeof message !== 'object')
                return;
            if (message.type === 'standaloneQueryEditorInit') {
                const debugMode = message.payload?.debugMode || false;
                globalThis.__MDV_QUERY_DEBUG__ = debugMode;
                setData(message.payload);
                setQueryText(message.payload.queryText || '');
                (0, monacoQueryLanguage_1.setQueryMetadataCompletionTree)(message.payload.metadataTree ?? null);
                setIsLoading(false);
                // Если дерево не пришло в init — запрашиваем (fallback при потере metadataTreeReady)
                if (message.payload?.metadataTree == null) {
                    setTimeout(() => vscode.postMessage({ type: 'requestMetadataTree' }), 500);
                }
            }
            if (message.type === 'metadataUpdate') {
                setData((prev) => ({ ...prev, metadata: message.metadata ?? prev.metadata }));
            }
            if (message.type === 'metadataTreeReady') {
                const tree = message.metadataTree ?? null;
                setData((prev) => ({ ...prev, metadataTree: tree }));
                (0, monacoQueryLanguage_1.setQueryMetadataCompletionTree)(tree);
            }
            if (message.type === 'queryMetadataReady' && message.queryModel) {
                setQueryModel(message.queryModel);
                (0, provider_1.setCompletionMetadata)(message.queryModel);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    const handleSave = (newQuery) => {
        vscode.postMessage({
            type: 'saveQuery',
            payload: newQuery,
        });
    };
    const handleCancel = () => {
        vscode.postMessage({
            type: 'cancel',
        });
    };
    if (isLoading) {
        return (react_1.default.createElement("div", { style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                color: 'var(--vscode-foreground)',
                backgroundColor: 'var(--vscode-editor-background)',
            } }, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445..."));
    }
    return (react_1.default.createElement(QueryEditorEnhanced_1.QueryEditorEnhanced, { isOpen: true, queryText: queryText, fullscreen: true, dataCompositionMode: false, metadataTree: data.metadataTree, queryModel: queryModel, rightPanel: data.metadataTree ? (react_1.default.createElement(MetadataTreePanel_1.MetadataTreePanel, { tree: data.metadataTree })) : (react_1.default.createElement("div", { style: { padding: '1rem', color: 'var(--vscode-foreground)' } }, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0434\u0435\u0440\u0435\u0432\u0430 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445\u2026")), onSave: handleSave, onCancel: handleCancel }));
};
exports.StandaloneQueryEditor = StandaloneQueryEditor;
//# sourceMappingURL=StandaloneQueryEditor.js.map
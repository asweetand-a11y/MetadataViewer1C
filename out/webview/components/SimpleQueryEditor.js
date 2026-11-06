"use strict";
/**
 * Упрощенный редактор запросов для BSL-строк
 * Без автообновления полей, только редактирование текста
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
exports.SimpleQueryEditor = void 0;
const react_1 = __importStar(require("react"));
const monaco = __importStar(require("monaco-editor"));
const monacoQueryLanguage_1 = require("../utils/monacoQueryLanguage");
const attachQuerySyntaxCheck_1 = require("../querySyntax/attachQuerySyntaxCheck");
const provider_1 = require("../queryLanguage/completion/provider");
const editorActions_1 = require("../queryLanguage/editorActions");
const QueryMetadataTree_1 = require("./QueryWizard/QueryMetadataTree");
const QueryStructurePanel_1 = require("./QueryWizard/QueryStructurePanel");
require("../styles/editor.css");
const SimpleQueryEditor = ({ vscode }) => {
    const [queryText, setQueryText] = (0, react_1.useState)('');
    const [queryModel, setQueryModel] = (0, react_1.useState)(null);
    const [editor, setEditor] = (0, react_1.useState)(null);
    const containerRef = (0, react_1.useRef)(null);
    const editorRef = (0, react_1.useRef)(null);
    // Обработка сообщений от расширения
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (!message || typeof message !== 'object')
                return;
            if (message.type === 'queryMetadataReady' && message.queryModel) {
                setQueryModel(message.queryModel);
                (0, provider_1.setCompletionMetadata)(message.queryModel);
            }
            if (message.type === 'queryEditorInit') {
                const text = message.payload?.queryText || '';
                setQueryText(text);
                if (editorRef.current) {
                    editorRef.current.setValue(text);
                    editorRef.current.focus();
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    // Создание Monaco editor
    (0, react_1.useEffect)(() => {
        if (!containerRef.current)
            return;
        (0, monacoQueryLanguage_1.register1cQueryLanguage)();
        const editor = monaco.editor.create(containerRef.current, {
            value: queryText,
            language: '1c-query',
            theme: 'vs-dark',
            linkedEditing: true,
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            fontSize: 13,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            unicodeHighlight: {
                ambiguousCharacters: false,
            },
        });
        editorRef.current = editor;
        setEditor(editor);
        const syntax = (0, attachQuerySyntaxCheck_1.attachQuerySyntaxCheck)(editor);
        const disposable = editor.onDidChangeModelContent(() => {
            setQueryText(editor.getValue());
        });
        // Горячие клавиши
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            handleSave();
        });
        editor.addCommand(monaco.KeyCode.Escape, () => {
            handleCancel();
        });
        editor.focus();
        return () => {
            disposable.dispose();
            syntax.dispose();
            editor.dispose();
            editorRef.current = null;
            setEditor(null);
        };
    }, []);
    const handleSave = () => {
        const text = editorRef.current?.getValue() || queryText;
        vscode.postMessage({
            type: 'saveQuery',
            payload: text,
        });
    };
    const handleCancel = () => {
        // Просто закрываем webview через команду VS Code
        vscode.postMessage({
            type: 'cancel',
        });
    };
    return (react_1.default.createElement("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            backgroundColor: '#1e1e1e',
        } },
        react_1.default.createElement("div", { style: {
                padding: '12px 16px',
                borderBottom: '1px solid #3c3c3c',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#252526',
            } },
            react_1.default.createElement("h3", { style: { margin: 0, fontSize: '14px', color: '#cccccc' } }, "\u0420\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0437\u0430\u043F\u0440\u043E\u0441\u0430"),
            react_1.default.createElement("div", { style: { display: 'flex', gap: 8 } },
                react_1.default.createElement("button", { onClick: handleCancel, style: {
                        padding: '6px 12px',
                        backgroundColor: '#3c3c3c',
                        color: '#cccccc',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '13px',
                    } }, "\u041E\u0442\u043C\u0435\u043D\u0430"),
                react_1.default.createElement("button", { onClick: handleSave, style: {
                        padding: '6px 12px',
                        backgroundColor: '#0e639c',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                    } }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C (Ctrl+Enter)"))),
        react_1.default.createElement("div", { style: { display: 'flex', flex: 1, minHeight: 0 } },
            react_1.default.createElement("div", { style: { width: 280, flex: 'none', minWidth: 0 } },
                react_1.default.createElement(QueryMetadataTree_1.QueryMetadataTree, { model: queryModel, text: queryText, onSmartInsert: (target) => {
                        const index = (0, provider_1.completionMetadata)();
                        const instance = editorRef.current;
                        if (index && instance)
                            (0, editorActions_1.applySmartInsert)(instance, target, index);
                    } })),
            react_1.default.createElement("div", { ref: containerRef, style: { flex: 1, minWidth: 0 }, onDragOver: (event) => event.preventDefault(), onDrop: (event) => {
                    event.preventDefault();
                    const instance = editorRef.current;
                    const plain = event.dataTransfer.getData('text/plain');
                    const position = instance?.getPosition();
                    const model = instance?.getModel();
                    if (!instance || !position || !plain || !model)
                        return;
                    const offset = model.getOffsetAt(position);
                    const inserted = (0, editorActions_1.dragInsertText)(event.dataTransfer, model.getValue(), offset, plain);
                    instance.executeEdits('drop', [{
                            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                            text: inserted,
                            forceMoveMarkers: true,
                        }]);
                } }),
            react_1.default.createElement(QueryStructurePanel_1.QueryStructurePanel, { text: queryText, editor: editor })),
        react_1.default.createElement("div", { style: {
                padding: '8px 16px',
                borderTop: '1px solid #3c3c3c',
                fontSize: '12px',
                color: '#858585',
                backgroundColor: '#252526',
            } }, "Ctrl+Enter - \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C | Esc - \u041E\u0442\u043C\u0435\u043D\u0430")));
};
exports.SimpleQueryEditor = SimpleQueryEditor;
//# sourceMappingURL=SimpleQueryEditor.js.map
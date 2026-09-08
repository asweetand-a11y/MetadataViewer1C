"use strict";
/**
 * Модальное окно редактирования признака учета
 * Используется для добавления/редактирования признаков учета в планах счетов
 * Тип признака учета всегда xs:boolean
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
exports.AccountingFlagEditorModal = void 0;
const react_1 = __importStar(require("react"));
const Modal_1 = require("./Modal");
const ui_1 = require("../../ui");
const SimpleMultilingualEditor_1 = require("./SimpleMultilingualEditor");
const AccountingFlagEditorModal = ({ isOpen, flag, flagType, onClose, onSave }) => {
    const [name, setName] = (0, react_1.useState)('');
    const [synonym, setSynonym] = (0, react_1.useState)(null);
    const [comment, setComment] = (0, react_1.useState)(null);
    // Инициализация значений при открытии модального окна
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            if (flag) {
                // Редактирование существующего признака
                setName(flag.name || flag.properties?.Name || '');
                setSynonym(flag.properties?.Synonym || null);
                setComment(flag.properties?.Comment || null);
            }
            else {
                // Добавление нового признака
                setName('');
                setSynonym(null);
                setComment(null);
            }
        }
    }, [isOpen, flag]);
    const handleSave = () => {
        if (!name.trim()) {
            alert('Имя признака учета не может быть пустым');
            return;
        }
        onSave({
            name: name.trim(),
            synonym: synonym || null,
            comment: comment || null,
            uuid: flag?.uuid || flag?.properties?.uuid || undefined
        }, flagType);
    };
    const footer = (react_1.default.createElement("div", { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
        react_1.default.createElement(ui_1.UiButton, { secondary: true, onClick: onClose }, "\u041E\u0442\u043C\u0435\u043D\u0430"),
        react_1.default.createElement(ui_1.UiButton, { onClick: handleSave }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C")));
    return (react_1.default.createElement(Modal_1.Modal, { isOpen: isOpen, title: flag ? "Редактировать признак учета" : "Добавить признак учета", onClose: onClose, footer: footer },
        react_1.default.createElement("div", { className: "form-field", style: { marginBottom: '16px' } },
            react_1.default.createElement("label", null, "\u0418\u043C\u044F *"),
            react_1.default.createElement("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F \u043F\u0440\u0438\u0437\u043D\u0430\u043A\u0430 \u0443\u0447\u0435\u0442\u0430", style: {
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    border: '1px solid var(--vscode-input-border)',
                    backgroundColor: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)'
                } })),
        react_1.default.createElement("div", { className: "form-field", style: { marginBottom: '16px' } },
            react_1.default.createElement("label", null, "\u0421\u0438\u043D\u043E\u043D\u0438\u043C"),
            react_1.default.createElement(SimpleMultilingualEditor_1.SimpleMultilingualEditor, { value: synonym, onChange: setSynonym })),
        react_1.default.createElement("div", { className: "form-field", style: { marginBottom: '16px' } },
            react_1.default.createElement("label", null, "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"),
            react_1.default.createElement(SimpleMultilingualEditor_1.SimpleMultilingualEditor, { value: comment, onChange: setComment })),
        react_1.default.createElement("div", { className: "form-field", style: { marginBottom: '16px' } },
            react_1.default.createElement("label", null, "\u0422\u0438\u043F"),
            react_1.default.createElement("input", { type: "text", value: "xs:boolean", disabled: true, style: {
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    border: '1px solid var(--vscode-input-border)',
                    backgroundColor: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    opacity: 0.6,
                    cursor: 'not-allowed'
                } }),
            react_1.default.createElement("small", { style: { color: 'var(--vscode-descriptionForeground)', fontSize: '12px' } }, "\u0422\u0438\u043F \u043F\u0440\u0438\u0437\u043D\u0430\u043A\u0430 \u0443\u0447\u0435\u0442\u0430 \u0432\u0441\u0435\u0433\u0434\u0430 xs:boolean \u0438 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D"))));
};
exports.AccountingFlagEditorModal = AccountingFlagEditorModal;
//# sourceMappingURL=AccountingFlagEditorModal.js.map
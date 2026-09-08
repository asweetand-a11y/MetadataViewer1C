"use strict";
/**
 * Модальное окно редактирования команды формы
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditCommandModal = void 0;
const react_1 = __importDefault(require("react"));
const Modal_1 = require("../../FormEditor/Modal");
const ui_1 = require("../../../ui");
const EditCommandModal = ({ isOpen, mode, name, title, toolTip, modifiesSavedData, onClose, onSave, onNameChange, onTitleChange, onToolTipChange, onModifiesSavedDataChange }) => {
    const handleSave = () => {
        const trimmedName = name.trim();
        if (!trimmedName)
            return;
        onSave({
            name: trimmedName,
            title: title.trim(),
            toolTip: toolTip.trim(),
            modifiesSavedData
        });
    };
    const footer = (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(ui_1.UiButton, { secondary: true, onClick: onClose }, "\u041E\u0442\u043C\u0435\u043D\u0430"),
        react_1.default.createElement(ui_1.UiButton, { onClick: handleSave }, mode === 'add' ? 'Создать' : 'Сохранить')));
    const derivedCommandName = name.trim() ? `Form.Command.${name.trim()}` : '';
    return (react_1.default.createElement(Modal_1.Modal, { isOpen: isOpen, title: mode === 'add' ? 'Новая команда' : 'Редактировать команду', onClose: onClose, footer: footer },
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u0418\u043C\u044F (\u0430\u0442\u0440\u0438\u0431\u0443\u0442 name) *"),
            react_1.default.createElement("input", { type: "text", value: name, onChange: (e) => onNameChange(e.target.value), placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F...", className: "property-input" })),
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "CommandName"),
            react_1.default.createElement("div", { className: "edt-grid__cell--mono", style: { padding: '6px 8px', border: '1px solid var(--vscode-panel-border)', borderRadius: 3 } }, derivedCommandName)),
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u041F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u0435 (Title)"),
            react_1.default.createElement("input", { type: "text", value: title, onChange: (e) => onTitleChange(e.target.value), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u041F\u043E\u0434\u0431\u043E\u0440", className: "property-input" })),
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 (ToolTip)"),
            react_1.default.createElement("input", { type: "text", value: toolTip, onChange: (e) => onToolTipChange(e.target.value), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u041F\u043E\u0434\u0431\u043E\u0440 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u043E\u0432", className: "property-input" })),
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null,
                react_1.default.createElement("input", { type: "checkbox", checked: modifiesSavedData, onChange: (e) => onModifiesSavedDataChange(e.target.checked), style: { marginRight: 8 } }),
                "ModifiesSavedData"))));
};
exports.EditCommandModal = EditCommandModal;
//# sourceMappingURL=EditCommandModal.js.map
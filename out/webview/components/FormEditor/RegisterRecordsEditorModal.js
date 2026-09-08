"use strict";
/**
 * Модальное окно редактора RegisterRecords
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterRecordsEditorModal = void 0;
const react_1 = __importDefault(require("react"));
const Modal_1 = require("./Modal");
const ui_1 = require("../../ui");
const RegisterRecordsEditorModal = ({ isOpen, registerRecord, isEditing, registers, onClose, onSave, onRegisterChange }) => {
    const handleSave = () => {
        if (!registerRecord.trim()) {
            alert('Выберите регистр');
            return;
        }
        onSave(registerRecord);
    };
    const footer = (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(ui_1.UiButton, { secondary: true, onClick: onClose }, "\u041E\u0442\u043C\u0435\u043D\u0430"),
        react_1.default.createElement(ui_1.UiButton, { onClick: handleSave }, isEditing ? 'Сохранить' : 'Добавить')));
    return (react_1.default.createElement(Modal_1.Modal, { isOpen: isOpen, title: isEditing ? 'Редактировать регистр' : 'Добавить регистр', onClose: onClose, footer: footer },
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u0420\u0435\u0433\u0438\u0441\u0442\u0440 *"),
            react_1.default.createElement("select", { value: registerRecord, onChange: (e) => onRegisterChange(e.target.value), className: "property-select", style: { width: '100%', padding: '8px 12px' } },
                react_1.default.createElement("option", { value: "" }, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0433\u0438\u0441\u0442\u0440..."),
                registers.map((register) => (react_1.default.createElement("option", { key: register, value: register }, register)))))));
};
exports.RegisterRecordsEditorModal = RegisterRecordsEditorModal;
//# sourceMappingURL=RegisterRecordsEditorModal.js.map
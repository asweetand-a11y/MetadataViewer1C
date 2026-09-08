"use strict";
/**
 * Модальное окно редактирования колонки табличной части
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditColumnModal = void 0;
const react_1 = __importDefault(require("react"));
const Modal_1 = require("../../FormEditor/Modal");
const ui_1 = require("../../../ui");
const TypeWidget_1 = require("../../../widgets/TypeWidget");
const EditColumnModal = ({ isOpen, mode, name, title, type, metadata, onClose, onSave, onNameChange, onTitleChange, onTypeChange }) => {
    const handleSave = () => {
        const trimmedName = name.trim();
        if (!trimmedName)
            return;
        if (!type)
            return;
        onSave({
            name: trimmedName,
            title: title.trim() || '',
            type
        });
    };
    const footer = (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(ui_1.UiButton, { secondary: true, onClick: onClose }, "\u041E\u0442\u043C\u0435\u043D\u0430"),
        react_1.default.createElement(ui_1.UiButton, { onClick: handleSave }, mode === 'add' ? 'Создать' : 'Сохранить')));
    return (react_1.default.createElement(Modal_1.Modal, { isOpen: isOpen, title: mode === 'add' ? 'Новая колонка' : 'Редактировать колонку', onClose: onClose, footer: footer },
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u0418\u043C\u044F *"),
            react_1.default.createElement("input", { type: "text", value: name, onChange: (e) => onNameChange(e.target.value), placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F \u043A\u043E\u043B\u043E\u043D\u043A\u0438...", className: "property-input" })),
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A"),
            react_1.default.createElement("input", { type: "text", value: title, onChange: (e) => onTitleChange(e.target.value), placeholder: "\u0422\u0435\u043A\u0441\u0442, \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u043C\u044B\u0439 \u0432 \u0448\u0430\u043F\u043A\u0435", className: "property-input" })),
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u0422\u0438\u043F *"),
            react_1.default.createElement(TypeWidget_1.TypeWidget, { ...{
                    id: 'form-preview-column-type',
                    value: type,
                    onChange: onTypeChange,
                    schema: {},
                    label: 'ColumnType',
                    required: true,
                    readonly: false,
                    rawErrors: [],
                    errorSchema: {},
                    registry: {},
                    formContext: {},
                    options: {
                        registers: metadata.registers,
                        referenceTypes: metadata.referenceTypes,
                    },
                } }))));
};
exports.EditColumnModal = EditColumnModal;
//# sourceMappingURL=EditColumnModal.js.map
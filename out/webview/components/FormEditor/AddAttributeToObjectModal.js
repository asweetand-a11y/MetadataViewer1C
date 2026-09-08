"use strict";
/**
 * Модальное окно добавления реквизита/ресурса/измерения в объект
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddAttributeToObjectModal = void 0;
const react_1 = __importDefault(require("react"));
const Modal_1 = require("./Modal");
const ui_1 = require("../../ui");
const TypeWidget_1 = require("../../widgets/TypeWidget");
const SimpleMultilingualEditor_1 = require("./SimpleMultilingualEditor");
const AddAttributeToObjectModal = ({ isOpen, kind, name, synonym, comment, type, metadata, onClose, onSave, onNameChange, onSynonymChange, onCommentChange, onTypeChange }) => {
    const getTitle = () => {
        if (kind === 'Resource')
            return 'Новый ресурс';
        if (kind === 'Dimension')
            return 'Новое измерение';
        return 'Новый реквизит';
    };
    const getNameLabel = () => {
        if (kind === 'Resource')
            return 'Имя ресурса *';
        if (kind === 'Dimension')
            return 'Имя измерения *';
        return 'Имя *';
    };
    const footer = (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(ui_1.UiButton, { secondary: true, onClick: onClose }, "\u041E\u0442\u043C\u0435\u043D\u0430"),
        react_1.default.createElement(ui_1.UiButton, { onClick: onSave }, "\u0421\u043E\u0437\u0434\u0430\u0442\u044C")));
    return (react_1.default.createElement(Modal_1.Modal, { isOpen: isOpen, title: getTitle(), onClose: onClose, footer: footer },
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, getNameLabel()),
            react_1.default.createElement("input", { type: "text", value: name, onChange: (e) => onNameChange(e.target.value), placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F...", className: "property-input" })),
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u0421\u0438\u043D\u043E\u043D\u0438\u043C"),
            react_1.default.createElement(SimpleMultilingualEditor_1.SimpleMultilingualEditor, { value: synonym, onChange: onSynonymChange })),
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"),
            react_1.default.createElement(SimpleMultilingualEditor_1.SimpleMultilingualEditor, { value: comment, onChange: onCommentChange })),
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u0422\u0438\u043F *"),
            react_1.default.createElement(TypeWidget_1.TypeWidget, { ...{
                    id: 'new-attr-to-object-type',
                    value: type,
                    onChange: onTypeChange,
                    schema: {},
                    label: 'Type',
                    required: true,
                    readonly: false,
                    rawErrors: [],
                    errorSchema: {},
                    registry: {},
                    formContext: {},
                    options: {
                        registers: metadata.registers,
                        referenceTypes: metadata.referenceTypes
                    }
                } }))));
};
exports.AddAttributeToObjectModal = AddAttributeToObjectModal;
//# sourceMappingURL=AddAttributeToObjectModal.js.map
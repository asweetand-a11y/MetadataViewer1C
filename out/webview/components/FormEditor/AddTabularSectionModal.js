"use strict";
/**
 * Модальное окно добавления табличной части
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTabularSectionModal = void 0;
const react_1 = __importDefault(require("react"));
const Modal_1 = require("./Modal");
const ui_1 = require("../../ui");
const SimpleMultilingualEditor_1 = require("./SimpleMultilingualEditor");
const AddTabularSectionModal = ({ isOpen, name, synonym, comment, onClose, onSave, onNameChange, onSynonymChange, onCommentChange }) => {
    const footer = (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(ui_1.UiButton, { secondary: true, onClick: onClose }, "\u041E\u0442\u043C\u0435\u043D\u0430"),
        react_1.default.createElement(ui_1.UiButton, { onClick: onSave }, "\u0421\u043E\u0437\u0434\u0430\u0442\u044C")));
    return (react_1.default.createElement(Modal_1.Modal, { isOpen: isOpen, title: "\u041D\u043E\u0432\u0430\u044F \u0442\u0430\u0431\u043B\u0438\u0447\u043D\u0430\u044F \u0447\u0430\u0441\u0442\u044C", onClose: onClose, footer: footer },
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u0418\u043C\u044F *"),
            react_1.default.createElement("input", { type: "text", value: name, onChange: (e) => onNameChange(e.target.value), placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F...", className: "property-input" })),
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u0421\u0438\u043D\u043E\u043D\u0438\u043C"),
            react_1.default.createElement(SimpleMultilingualEditor_1.SimpleMultilingualEditor, { value: synonym, onChange: onSynonymChange })),
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439"),
            react_1.default.createElement(SimpleMultilingualEditor_1.SimpleMultilingualEditor, { value: comment, onChange: onCommentChange }))));
};
exports.AddTabularSectionModal = AddTabularSectionModal;
//# sourceMappingURL=AddTabularSectionModal.js.map
"use strict";
/**
 * Модальное окно редактирования типа реквизита табличной части
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditTabularAttributeTypeModal = void 0;
const react_1 = __importDefault(require("react"));
const Modal_1 = require("./Modal");
const ui_1 = require("../../ui");
const TypeWidget_1 = require("../../widgets/TypeWidget");
const EditTabularAttributeTypeModal = ({ isOpen, tsIndex, attrIndex, attributeType, metadata, onClose, onSave }) => {
    const footer = (react_1.default.createElement(ui_1.UiButton, { secondary: true, onClick: onClose }, "\u0417\u0430\u043A\u0440\u044B\u0442\u044C"));
    return (react_1.default.createElement(Modal_1.Modal, { isOpen: isOpen, title: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0442\u0438\u043F \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u0430", onClose: onClose, footer: footer },
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u0422\u0438\u043F"),
            react_1.default.createElement(TypeWidget_1.TypeWidget, { ...{
                    id: `edit-attr-type-${tsIndex}-${attrIndex}`,
                    value: attributeType,
                    onChange: onSave,
                    schema: {},
                    label: 'Type',
                    required: false,
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
exports.EditTabularAttributeTypeModal = EditTabularAttributeTypeModal;
//# sourceMappingURL=EditTabularAttributeTypeModal.js.map
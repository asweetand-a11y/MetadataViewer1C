"use strict";
/**
 * Модальное окно подтверждения действий
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmModal = void 0;
const react_1 = __importDefault(require("react"));
const Modal_1 = require("./Modal");
const ui_1 = require("../../ui");
const ConfirmModal = ({ isOpen, message, onConfirm, onCancel, confirmLabel = 'Удалить', cancelLabel = 'Отмена' }) => {
    const handleConfirm = () => {
        onConfirm();
    };
    const footer = (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(ui_1.UiButton, { secondary: true, onClick: onCancel }, cancelLabel),
        react_1.default.createElement(ui_1.UiButton, { onClick: handleConfirm }, confirmLabel)));
    return (react_1.default.createElement(Modal_1.Modal, { isOpen: isOpen, title: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435", onClose: onCancel, footer: footer },
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("div", { style: { whiteSpace: 'pre-wrap' } }, message))));
};
exports.ConfirmModal = ConfirmModal;
//# sourceMappingURL=ConfirmModal.js.map
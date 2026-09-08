"use strict";
/**
 * Модальное окно подтверждения удаления с поддержкой дополнительной информации
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmDeleteModal = void 0;
const react_1 = __importDefault(require("react"));
const Modal_1 = require("../../FormEditor/Modal");
const ui_1 = require("../../../ui");
const ConfirmDeleteModal = ({ isOpen, message, warningInfo, onConfirm, onCancel, confirmLabel = 'Удалить', cancelLabel = 'Отмена', width }) => {
    const handleConfirm = () => {
        onConfirm();
    };
    const footer = (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(ui_1.UiButton, { secondary: true, onClick: onCancel }, cancelLabel),
        react_1.default.createElement(ui_1.UiButton, { onClick: handleConfirm }, confirmLabel)));
    const contentStyle = width ? { width: typeof width === 'number' ? `${width}px` : width } : undefined;
    return (react_1.default.createElement(Modal_1.Modal, { isOpen: isOpen, title: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435", onClose: onCancel, footer: footer },
        react_1.default.createElement("div", { className: "form-field", style: contentStyle },
            react_1.default.createElement("div", { style: { whiteSpace: 'pre-wrap' } },
                message,
                warningInfo && (react_1.default.createElement(react_1.default.Fragment, null,
                    '\n\n',
                    typeof warningInfo === 'string' ? warningInfo : warningInfo))))));
};
exports.ConfirmDeleteModal = ConfirmDeleteModal;
//# sourceMappingURL=ConfirmDeleteModal.js.map
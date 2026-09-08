"use strict";
/**
 * Базовый компонент модального окна
 * Предоставляет общую структуру для всех модальных окон
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = void 0;
const react_1 = __importDefault(require("react"));
const ui_1 = require("../../ui");
const Modal = ({ isOpen, title, onClose, children, footer }) => {
    if (!isOpen)
        return null;
    return (react_1.default.createElement("div", { className: "modal-overlay", onClick: onClose },
        react_1.default.createElement("div", { className: "modal-content", onClick: (e) => e.stopPropagation() },
            react_1.default.createElement("div", { className: "modal-header" },
                react_1.default.createElement("h3", null, title),
                react_1.default.createElement(ui_1.UiButton, { secondary: true, icon: "close", iconOnly: true, title: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", onClick: onClose })),
            react_1.default.createElement("div", { className: "modal-body" }, children),
            footer && (react_1.default.createElement("div", { className: "modal-footer" }, footer)))));
};
exports.Modal = Modal;
//# sourceMappingURL=Modal.js.map
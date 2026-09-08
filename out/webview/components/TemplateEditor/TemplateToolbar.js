"use strict";
/**
 * Панель инструментов форматирования для редактора макетов 1С
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateToolbar = void 0;
const react_1 = __importDefault(require("react"));
require("./template-editor.css");
const ui_1 = require("../../ui");
const TemplateToolbar = ({ onBold, onItalic, onUnderline, onAlignLeft, onAlignCenter, onAlignRight, onMergeCells, onUnmergeCells, onAddRow, onDeleteRow, onAddColumn, onDeleteColumn, showGrid = true, onToggleGrid, showHeaders = true, onToggleHeaders, zoom = 1.0, onZoomIn, onZoomOut, onZoomReset, showNotes = true, onToggleNotes, onAssignName, onRemoveName, selectedRange, onShowProperties, showPropertiesPanel = false, onShowNamedAreas, showNamedAreaBorders = true, onToggleNamedAreaBorders }) => {
    // Определяем, можно ли назначить имя (выделен диапазон строк или колонок)
    // Можно назначить имя при любом выделении (даже при выделении диапазона)
    const canAssignName = selectedRange !== null;
    return (react_1.default.createElement("div", { className: "template-toolbar" },
        react_1.default.createElement("div", { className: "template-toolbar-group" },
            react_1.default.createElement(ui_1.UiButton, { secondary: true, title: "\u0416\u0438\u0440\u043D\u044B\u0439 (Ctrl+B)", onClick: onBold },
                react_1.default.createElement("strong", null, "B")),
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u041A\u0443\u0440\u0441\u0438\u0432 (Ctrl+I)", onClick: onItalic },
                react_1.default.createElement("em", null, "I")),
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u041F\u043E\u0434\u0447\u0435\u0440\u043A\u043D\u0443\u0442\u044B\u0439 (Ctrl+U)", onClick: onUnderline },
                react_1.default.createElement("u", null, "U"))),
        react_1.default.createElement("div", { className: "template-toolbar-separator" }),
        react_1.default.createElement("div", { className: "template-toolbar-group" },
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0412\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435 \u043F\u043E \u043B\u0435\u0432\u043E\u043C\u0443 \u043A\u0440\u0430\u044E", onClick: onAlignLeft }, "\u2B05"),
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0412\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435 \u043F\u043E \u0446\u0435\u043D\u0442\u0440\u0443", onClick: onAlignCenter }, "\u2B0C"),
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0412\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435 \u043F\u043E \u043F\u0440\u0430\u0432\u043E\u043C\u0443 \u043A\u0440\u0430\u044E", onClick: onAlignRight }, "\u27A1")),
        react_1.default.createElement("div", { className: "template-toolbar-separator" }),
        react_1.default.createElement("div", { className: "template-toolbar-group" },
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u041E\u0431\u044A\u0435\u0434\u0438\u043D\u0438\u0442\u044C \u044F\u0447\u0435\u0439\u043A\u0438", onClick: onMergeCells }, "\u2B1C"),
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0420\u0430\u0437\u044A\u0435\u0434\u0438\u043D\u0438\u0442\u044C \u044F\u0447\u0435\u0439\u043A\u0438", onClick: onUnmergeCells }, "\u2B1B")),
        react_1.default.createElement("div", { className: "template-toolbar-separator" }),
        react_1.default.createElement("div", { className: "template-toolbar-group" },
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u0443", onClick: onAddRow }, "+\u0421\u0442\u0440\u043E\u043A\u0430"),
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u0443", onClick: onDeleteRow }, "-\u0421\u0442\u0440\u043E\u043A\u0430"),
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u043B\u043E\u043D\u043A\u0443", onClick: onAddColumn }, "+\u041A\u043E\u043B\u043E\u043D\u043A\u0430"),
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043A\u043E\u043B\u043E\u043D\u043A\u0443", onClick: onDeleteColumn }, "-\u041A\u043E\u043B\u043E\u043D\u043A\u0430")),
        react_1.default.createElement("div", { className: "template-toolbar-separator" }),
        react_1.default.createElement("div", { className: "template-toolbar-group" },
            react_1.default.createElement("button", { className: `template-toolbar-button ${canAssignName ? '' : 'disabled'}`, title: canAssignName ? "Назначить имя выделенным строкам/колонкам" : "Выделите строки или колонки для назначения имени", onClick: canAssignName ? onAssignName : undefined, disabled: !canAssignName }, "\uD83C\uDFF7\uFE0F \u041D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C \u0438\u043C\u044F"),
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u043C\u044F \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043D\u044B\u0445 \u0441\u0442\u0440\u043E\u043A/\u043A\u043E\u043B\u043E\u043D\u043E\u043A", onClick: onRemoveName, disabled: !selectedRange }, "\u274C \u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u043C\u044F")),
        react_1.default.createElement("div", { className: "template-toolbar-separator" }),
        react_1.default.createElement("div", { className: "template-toolbar-group" },
            react_1.default.createElement("button", { className: `template-toolbar-button ${showPropertiesPanel ? 'active' : ''}`, title: showPropertiesPanel ? "Скрыть панель свойств ячейки" : "Показать панель свойств ячейки", onClick: onShowProperties }, "\u2699\uFE0F \u0421\u0432\u043E\u0439\u0441\u0442\u0432\u0430")),
        react_1.default.createElement("div", { className: "template-toolbar-separator" }),
        react_1.default.createElement("div", { className: "template-toolbar-group" },
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u043C\u0438 \u043E\u0431\u043B\u0430\u0441\u0442\u044F\u043C\u0438", onClick: onShowNamedAreas }, "\uD83D\uDCCB \u0418\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043E\u0431\u043B\u0430\u0441\u0442\u0438")),
        react_1.default.createElement("div", { className: "template-toolbar-separator" }),
        react_1.default.createElement("div", { className: "template-toolbar-group" },
            react_1.default.createElement("button", { className: `template-toolbar-button ${showGrid ? 'active' : ''}`, title: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C/\u0441\u043A\u0440\u044B\u0442\u044C \u0441\u0435\u0442\u043A\u0443", onClick: onToggleGrid }, "\u268F \u0421\u0435\u0442\u043A\u0430"),
            react_1.default.createElement("button", { className: `template-toolbar-button ${showHeaders ? 'active' : ''}`, title: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C/\u0441\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438", onClick: onToggleHeaders }, "\u268F \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438"),
            react_1.default.createElement("button", { className: `template-toolbar-button ${showNotes ? 'active' : ''}`, title: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C/\u0441\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043C\u0435\u0447\u0430\u043D\u0438\u044F", onClick: onToggleNotes }, "\uD83D\uDCCC \u041F\u0440\u0438\u043C\u0435\u0447\u0430\u043D\u0438\u044F"),
            react_1.default.createElement("button", { className: `template-toolbar-button ${showNamedAreaBorders ? 'active' : ''}`, title: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C/\u0441\u043A\u0440\u044B\u0442\u044C \u043A\u0440\u0430\u0441\u043D\u0443\u044E \u0441\u0435\u0442\u043A\u0443 \u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u043E\u0431\u043B\u0430\u0441\u0442\u0435\u0439", onClick: onToggleNamedAreaBorders }, "\uD83D\uDD34 \u041A\u0440\u0430\u0441\u043D\u0430\u044F \u0441\u0435\u0442\u043A\u0430")),
        react_1.default.createElement("div", { className: "template-toolbar-separator" }),
        react_1.default.createElement("div", { className: "template-toolbar-group" },
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0423\u043C\u0435\u043D\u044C\u0448\u0438\u0442\u044C \u043C\u0430\u0441\u0448\u0442\u0430\u0431", onClick: onZoomOut }, "\u2796"),
            react_1.default.createElement("span", { className: "template-toolbar-zoom", title: "\u041C\u0430\u0441\u0448\u0442\u0430\u0431" },
                Math.round(zoom * 100),
                "%"),
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0423\u0432\u0435\u043B\u0438\u0447\u0438\u0442\u044C \u043C\u0430\u0441\u0448\u0442\u0430\u0431", onClick: onZoomIn }, "\u2795"),
            react_1.default.createElement("button", { className: "template-toolbar-button", title: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043C\u0430\u0441\u0448\u0442\u0430\u0431", onClick: onZoomReset }, "\uD83D\uDD0D"))));
};
exports.TemplateToolbar = TemplateToolbar;
//# sourceMappingURL=TemplateToolbar.js.map
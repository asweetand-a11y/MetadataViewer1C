"use strict";
/**
 * Точка входа редактора запроса.
 * Содержимое — визуальный конструктор со вкладкой текста.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryEditorEnhanced = void 0;
const react_1 = __importDefault(require("react"));
const QueryWizard_1 = require("../QueryWizard/QueryWizard");
function treeFromPanel(node) {
    if (!react_1.default.isValidElement(node))
        return null;
    const props = node.props;
    return props.tree ?? null;
}
const QueryEditorEnhanced = ({ isOpen, queryText, rightPanel, onSave, onCancel, fullscreen = false, dataCompositionMode = false, metadataTree = null, }) => {
    if (!isOpen)
        return null;
    return (react_1.default.createElement(QueryWizard_1.QueryWizard, { isOpen: isOpen, queryText: queryText, onSave: onSave, onCancel: onCancel, fullscreen: fullscreen, dataCompositionMode: dataCompositionMode, metadataTree: metadataTree || treeFromPanel(rightPanel) }));
};
exports.QueryEditorEnhanced = QueryEditorEnhanced;
//# sourceMappingURL=QueryEditorEnhanced.js.map
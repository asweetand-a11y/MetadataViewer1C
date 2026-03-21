"use strict";
/**
 * Панель свойств ячейки для редактора макетов 1С
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatePropertiesPanel = void 0;
const react_1 = __importStar(require("react"));
const FillPatternToggle_1 = require("./FillPatternToggle");
const CellNoteDialog_1 = require("./CellNoteDialog");
const FormatBuilder_1 = require("./FormatBuilder");
const ColorPickerDialog_1 = require("./ColorPickerDialog");
const FontBuilderDialog_1 = require("./FontBuilderDialog");
const templateUtils_1 = require("../../../utils/templateUtils");
const spreadsheetCellLineType_1 = require("../../../utils/spreadsheetCellLineType");
require("./template-editor.css");
const TemplatePropertiesPanel = ({ templateDocument, selectedCell, selectedRange, onFillPatternToggle, onParameterNameChange, onTemplateTextChange, onCreateNote, onUpdateNote, onDeleteNote, onDetailParameterChange, onFormatChange, onFontChange, onAlignmentChange, onColorsChange, onClose }) => {
    const [isNoteDialogOpen, setIsNoteDialogOpen] = (0, react_1.useState)(false);
    const [editingNote, setEditingNote] = (0, react_1.useState)(null);
    const [isFormatBuilderOpen, setIsFormatBuilderOpen] = (0, react_1.useState)(false);
    const [formatBuilderType, setFormatBuilderType] = (0, react_1.useState)('number');
    const [isColorPickerOpen, setIsColorPickerOpen] = (0, react_1.useState)(false);
    const [colorPickerMode, setColorPickerMode] = (0, react_1.useState)('text');
    const [isFontBuilderOpen, setIsFontBuilderOpen] = (0, react_1.useState)(false);
    const selRow = selectedCell?.row;
    const selCol = selectedCell?.col;
    const effectiveFormat = (0, react_1.useMemo)(() => {
        if (selRow === undefined || selCol === undefined) {
            return null;
        }
        return (0, templateUtils_1.getEffectiveFormat)(templateDocument, selRow, selCol);
    }, [templateDocument, selRow, selCol]);
    const effectiveFont = (0, react_1.useMemo)(() => {
        if (selRow === undefined || selCol === undefined) {
            return null;
        }
        return (0, templateUtils_1.getEffectiveFont)(templateDocument, selRow, selCol);
    }, [templateDocument, selRow, selCol]);
    if (!selectedCell) {
        return (react_1.default.createElement("div", { className: "template-properties-empty" }, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044F\u0447\u0435\u0439\u043A\u0443 \u0434\u043B\u044F \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0441\u0432\u043E\u0439\u0441\u0442\u0432"));
    }
    const cell = (0, templateUtils_1.findCellByPosition)(templateDocument, selectedCell.row, selectedCell.col);
    const fillPattern = (0, templateUtils_1.getCellFillPattern)(templateDocument, selectedCell.row, selectedCell.col);
    let parameterName = '';
    let templateText = '';
    let detailParameter = '';
    let note = null;
    if (cell && cell.c) {
        if (fillPattern === 'parameter' && cell.c.parameter) {
            parameterName = cell.c.parameter;
        }
        else if (fillPattern === 'template' && cell.c.tl) {
            templateText = (0, templateUtils_1.extractTextFromTemplateTextData)(cell.c.tl);
        }
        if (cell.c.detailParameter) {
            detailParameter = cell.c.detailParameter;
        }
        if (cell.c.note) {
            note = cell.c.note;
        }
    }
    const isRangeSelected = selectedRange &&
        (selectedRange.startRow !== selectedRange.endRow ||
            selectedRange.startCol !== selectedRange.endCol);
    const handleCreateNote = () => {
        if (!selectedCell)
            return;
        setEditingNote(null);
        setIsNoteDialogOpen(true);
    };
    const handleEditNote = () => {
        if (!note)
            return;
        setEditingNote(note);
        setIsNoteDialogOpen(true);
    };
    const handleSaveNote = (note) => {
        if (editingNote) {
            onUpdateNote?.(note);
        }
        else {
            onCreateNote?.(note);
        }
        setIsNoteDialogOpen(false);
        setEditingNote(null);
    };
    const handleDeleteNote = () => {
        if (confirm('Удалить примечание?')) {
            onDeleteNote?.();
        }
    };
    return (react_1.default.createElement("div", { className: "template-properties-panel" },
        react_1.default.createElement("div", { className: "template-properties-header" },
            react_1.default.createElement("h3", null, "\u0421\u0432\u043E\u0439\u0441\u0442\u0432\u0430 \u044F\u0447\u0435\u0439\u043A\u0438"),
            onClose && (react_1.default.createElement("button", { className: "template-properties-close-button", title: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C \u0441\u0432\u043E\u0439\u0441\u0442\u0432", onClick: onClose }, "\u00D7")),
            isRangeSelected && (react_1.default.createElement("div", { className: "template-properties-range-info" },
                "\u0412\u044B\u0431\u0440\u0430\u043D \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D: ",
                selectedRange.endRow - selectedRange.startRow + 1,
                " \u00D7 ",
                selectedRange.endCol - selectedRange.startCol + 1))),
        react_1.default.createElement("div", { className: "template-properties-content" },
            react_1.default.createElement("div", { className: "template-properties-section" },
                react_1.default.createElement("div", { className: "template-properties-position" },
                    react_1.default.createElement("div", null,
                        "\u0421\u0442\u0440\u043E\u043A\u0430: ",
                        selectedCell.row + 1),
                    react_1.default.createElement("div", null,
                        "\u041A\u043E\u043B\u043E\u043D\u043A\u0430: ",
                        selectedCell.col + 1))),
            react_1.default.createElement("div", { className: "template-properties-section" },
                react_1.default.createElement(FillPatternToggle_1.FillPatternToggle, { fillPattern: fillPattern, onToggle: (pattern) => {
                        onFillPatternToggle?.(pattern);
                    }, parameterName: parameterName, templateText: templateText, onParameterNameChange: onParameterNameChange, onTemplateTextChange: onTemplateTextChange })),
            react_1.default.createElement("div", { className: "template-properties-section" },
                react_1.default.createElement("h4", null, "\u0414\u0435\u0442\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440"),
                react_1.default.createElement("input", { type: "text", value: detailParameter, onChange: (e) => onDetailParameterChange?.(e.target.value), placeholder: "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0438", className: "template-properties-input" })),
            react_1.default.createElement("div", { className: "template-properties-section" },
                react_1.default.createElement("h4", null, "\u041F\u0440\u0438\u043C\u0435\u0447\u0430\u043D\u0438\u0435"),
                note ? (react_1.default.createElement("div", { className: "template-properties-note-display" },
                    react_1.default.createElement("div", { className: "template-properties-note-text" }, note.text?.['v8:item']?.['v8:content'] ||
                        note.text?.['v8:content'] ||
                        note.text ||
                        'Без текста'),
                    react_1.default.createElement("div", { className: "template-properties-note-actions" },
                        react_1.default.createElement("button", { className: "template-properties-button-small", onClick: handleEditNote, title: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C" }, "\u270F \u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C"),
                        react_1.default.createElement("button", { className: "template-properties-button-small", onClick: handleDeleteNote, title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" }, "\u00D7 \u0423\u0434\u0430\u043B\u0438\u0442\u044C")))) : (react_1.default.createElement("button", { className: "template-properties-button", onClick: handleCreateNote, title: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u0438\u043C\u0435\u0447\u0430\u043D\u0438\u0435 \u043A \u044F\u0447\u0435\u0439\u043A\u0435" }, "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u0438\u043C\u0435\u0447\u0430\u043D\u0438\u0435"))),
            react_1.default.createElement("div", { className: "template-properties-section" },
                react_1.default.createElement("h4", null, "\u0424\u043E\u0440\u043C\u0430\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435"),
                react_1.default.createElement("div", { className: "template-properties-format-edit" },
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u0428\u0438\u0440\u0438\u043D\u0430:"),
                        react_1.default.createElement("input", { type: "text", value: effectiveFormat?.width || '', onChange: (e) => {
                                const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, { width: e.target.value });
                                onFormatChange?.(updated);
                            }, placeholder: "\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E", className: "template-properties-input" })),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u0412\u044B\u0441\u043E\u0442\u0430:"),
                        react_1.default.createElement("input", { type: "text", value: effectiveFormat?.height || '', onChange: (e) => {
                                const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, { height: e.target.value });
                                onFormatChange?.(updated);
                            }, placeholder: "\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E", className: "template-properties-input" })),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u043E\u0435 \u0432\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435:"),
                        react_1.default.createElement("select", { value: effectiveFormat?.horizontalAlignment || '', onChange: (e) => {
                                onAlignmentChange?.(e.target.value || undefined);
                            }, className: "template-properties-input" },
                            react_1.default.createElement("option", { value: "" }, "\u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E"),
                            react_1.default.createElement("option", { value: "Left" }, "\u0421\u043B\u0435\u0432\u0430"),
                            react_1.default.createElement("option", { value: "Center" }, "\u041F\u043E \u0446\u0435\u043D\u0442\u0440\u0443"),
                            react_1.default.createElement("option", { value: "Right" }, "\u0421\u043F\u0440\u0430\u0432\u0430"),
                            react_1.default.createElement("option", { value: "Justify" }, "\u041F\u043E \u0448\u0438\u0440\u0438\u043D\u0435"))),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u0412\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u043E\u0435 \u0432\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435:"),
                        react_1.default.createElement("select", { value: effectiveFormat?.verticalAlignment || '', onChange: (e) => {
                                onAlignmentChange?.(effectiveFormat?.horizontalAlignment, e.target.value || undefined);
                            }, className: "template-properties-input" },
                            react_1.default.createElement("option", { value: "" }, "\u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E"),
                            react_1.default.createElement("option", { value: "Top" }, "\u0421\u0432\u0435\u0440\u0445\u0443"),
                            react_1.default.createElement("option", { value: "Center" }, "\u041F\u043E \u0446\u0435\u043D\u0442\u0440\u0443"),
                            react_1.default.createElement("option", { value: "Bottom" }, "\u0421\u043D\u0438\u0437\u0443"))),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u0420\u0430\u0437\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0442\u0435\u043A\u0441\u0442\u0430:"),
                        react_1.default.createElement("select", { value: effectiveFormat?.textPlacement || '', onChange: (e) => {
                                const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, { textPlacement: e.target.value || undefined });
                                onFormatChange?.(updated);
                            }, className: "template-properties-input" },
                            react_1.default.createElement("option", { value: "" }, "\u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E"),
                            react_1.default.createElement("option", { value: "Wrap" }, "\u041F\u0435\u0440\u0435\u043D\u043E\u0441"),
                            react_1.default.createElement("option", { value: "Clip" }, "\u041E\u0431\u0440\u0435\u0437\u043A\u0430"),
                            react_1.default.createElement("option", { value: "None" }, "\u041D\u0435\u0442"))),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u041E\u0440\u0438\u0435\u043D\u0442\u0430\u0446\u0438\u044F \u0442\u0435\u043A\u0441\u0442\u0430 (\u00B0):"),
                        react_1.default.createElement("select", { value: effectiveFormat?.textOrientation !== undefined ? String(effectiveFormat.textOrientation) : '', onChange: (e) => {
                                const val = e.target.value;
                                const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, {
                                    textOrientation: val === '' ? undefined : parseInt(val, 10)
                                });
                                onFormatChange?.(updated);
                            }, className: "template-properties-input" },
                            react_1.default.createElement("option", { value: "" }, "0 (\u0433\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u043E)"),
                            react_1.default.createElement("option", { value: "90" }, "90 (\u0432\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u043E)"),
                            react_1.default.createElement("option", { value: "180" }, "180"),
                            react_1.default.createElement("option", { value: "270" }, "270"))),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u041E\u0442\u0441\u0442\u0443\u043F:"),
                        react_1.default.createElement("input", { type: "number", value: effectiveFormat?.indent ?? '', onChange: (e) => {
                                const val = e.target.value;
                                const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, {
                                    indent: val === '' ? undefined : parseInt(val, 10)
                                });
                                onFormatChange?.(updated);
                            }, placeholder: "0", className: "template-properties-input", min: "0" })),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u0410\u0432\u0442\u043E\u043E\u0442\u0441\u0442\u0443\u043F:"),
                        react_1.default.createElement("input", { type: "number", value: effectiveFormat?.autoIndent ?? '', onChange: (e) => {
                                const val = e.target.value;
                                const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, {
                                    autoIndent: val === '' ? undefined : parseInt(val, 10)
                                });
                                onFormatChange?.(updated);
                            }, placeholder: "0", className: "template-properties-input", min: "0" })),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u041E\u0442\u0441\u0442\u0443\u043F\u044B (\u0421\u043B\u0435\u0432\u0430 / \u0421\u043F\u0440\u0430\u0432\u0430 / \u0421\u0432\u0435\u0440\u0445\u0443 / \u0421\u043D\u0438\u0437\u0443):"),
                        react_1.default.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' } },
                            react_1.default.createElement("input", { type: "number", value: effectiveFormat?.leftMargin ?? '', onChange: (e) => {
                                    const val = e.target.value;
                                    const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, {
                                        leftMargin: val === '' ? undefined : parseInt(val, 10)
                                    });
                                    onFormatChange?.(updated);
                                }, placeholder: "\u0421\u043B\u0435\u0432\u0430", className: "template-properties-input", min: "0", title: "\u0421\u043B\u0435\u0432\u0430" }),
                            react_1.default.createElement("input", { type: "number", value: effectiveFormat?.rightMargin ?? '', onChange: (e) => {
                                    const val = e.target.value;
                                    const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, {
                                        rightMargin: val === '' ? undefined : parseInt(val, 10)
                                    });
                                    onFormatChange?.(updated);
                                }, placeholder: "\u0421\u043F\u0440\u0430\u0432\u0430", className: "template-properties-input", min: "0", title: "\u0421\u043F\u0440\u0430\u0432\u0430" }),
                            react_1.default.createElement("input", { type: "number", value: effectiveFormat?.topMargin ?? '', onChange: (e) => {
                                    const val = e.target.value;
                                    const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, {
                                        topMargin: val === '' ? undefined : parseInt(val, 10)
                                    });
                                    onFormatChange?.(updated);
                                }, placeholder: "\u0421\u0432\u0435\u0440\u0445\u0443", className: "template-properties-input", min: "0", title: "\u0421\u0432\u0435\u0440\u0445\u0443" }),
                            react_1.default.createElement("input", { type: "number", value: effectiveFormat?.bottomMargin ?? '', onChange: (e) => {
                                    const val = e.target.value;
                                    const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, {
                                        bottomMargin: val === '' ? undefined : parseInt(val, 10)
                                    });
                                    onFormatChange?.(updated);
                                }, placeholder: "\u0421\u043D\u0438\u0437\u0443", className: "template-properties-input", min: "0", title: "\u0421\u043D\u0438\u0437\u0443" }))),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u0413\u0440\u0430\u043D\u0438\u0446\u044B (\u0442\u0438\u043F \u043B\u0438\u043D\u0438\u0438 \u043F\u043E \u0441\u0442\u043E\u0440\u043E\u043D\u0430\u043C, \u043A\u0430\u043A \u0432 1\u0421):"),
                        react_1.default.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' } },
                            [
                                ['Граница слева', 'leftBorder'],
                                ['Граница сверху', 'topBorder'],
                                ['Граница справа', 'rightBorder'],
                                ['Граница снизу', 'bottomBorder'],
                                ['Обвести (рамка)', 'border'],
                            ].map(([label, field]) => (react_1.default.createElement("label", { key: field, style: { fontSize: 'calc(var(--vscode-font-size) - 1px)' } },
                                label,
                                react_1.default.createElement("select", { className: "template-properties-input", style: { marginTop: '4px', width: '100%' }, value: (0, templateUtils_1.formatBorderLineCode)(effectiveFormat?.[field]), title: "\u041A\u043E\u0434\u044B 0\u20266 \u2014 SpreadsheetDocumentCellLineType (EDT)", onChange: (e) => {
                                        const v = parseInt(e.target.value, 10);
                                        const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, {
                                            [field]: v,
                                        });
                                        onFormatChange?.(updated);
                                    } }, spreadsheetCellLineType_1.SPREADSHEET_CELL_LINE_TYPE_OPTIONS_WITH_NONE.map((o) => (react_1.default.createElement("option", { key: o.value, value: o.value },
                                    "\u2014 ",
                                    o.label))))))),
                            react_1.default.createElement("div", { className: "template-properties-format-field", style: { marginBottom: 0 } },
                                react_1.default.createElement("label", null, "\u0426\u0432\u0435\u0442 \u0440\u0430\u043C\u043A\u0438:"),
                                react_1.default.createElement("div", { style: { display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' } },
                                    react_1.default.createElement("input", { type: "text", value: (0, templateUtils_1.extractTemplateFormatColorString)(effectiveFormat?.borderColor) || '', readOnly: true, placeholder: "\u0410\u0432\u0442\u043E", className: "template-properties-input", style: { flex: 1 } }),
                                    react_1.default.createElement("button", { className: "template-properties-button-small", type: "button", onClick: () => {
                                            setColorPickerMode('border');
                                            setIsColorPickerOpen(true);
                                        }, title: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0446\u0432\u0435\u0442 \u0440\u0430\u043C\u043A\u0438" }, "\uD83C\uDFA8"),
                                    react_1.default.createElement("button", { className: "template-properties-button-small", type: "button", title: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C (\u0430\u0432\u0442\u043E)", onClick: () => {
                                            const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, { borderColor: undefined });
                                            onFormatChange?.(updated);
                                        } }, "\u2715"))))),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u0426\u0432\u0435\u0442 \u0442\u0435\u043A\u0441\u0442\u0430:"),
                        react_1.default.createElement("div", { style: { display: 'flex', gap: '4px', alignItems: 'center' } },
                            react_1.default.createElement("input", { type: "text", value: (0, templateUtils_1.extractTemplateFormatColorString)(effectiveFormat?.textColor), readOnly: true, placeholder: "\u043D\u0435 \u0437\u0430\u0434\u0430\u043D", className: "template-properties-input", style: { flex: 1 } }),
                            react_1.default.createElement("button", { className: "template-properties-button-small", onClick: () => {
                                    setColorPickerMode('text');
                                    setIsColorPickerOpen(true);
                                }, title: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0446\u0432\u0435\u0442 \u0442\u0435\u043A\u0441\u0442\u0430" }, "\uD83C\uDFA8"))),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u0426\u0432\u0435\u0442 \u0444\u043E\u043D\u0430:"),
                        react_1.default.createElement("div", { style: { display: 'flex', gap: '4px', alignItems: 'center' } },
                            react_1.default.createElement("input", { type: "text", value: (0, templateUtils_1.extractTemplateFormatColorString)(effectiveFormat?.backColor), readOnly: true, placeholder: "\u043D\u0435 \u0437\u0430\u0434\u0430\u043D", className: "template-properties-input", style: { flex: 1 } }),
                            react_1.default.createElement("button", { className: "template-properties-button-small", onClick: () => {
                                    setColorPickerMode('back');
                                    setIsColorPickerOpen(true);
                                }, title: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0446\u0432\u0435\u0442 \u0444\u043E\u043D\u0430" }, "\uD83C\uDFA8"))),
                    react_1.default.createElement("div", { className: "template-properties-format-field" },
                        react_1.default.createElement("label", null, "\u0424\u043E\u0440\u043C\u0430\u0442 \u0447\u0438\u0441\u0435\u043B/\u0434\u0430\u0442:"),
                        react_1.default.createElement("div", { style: { display: 'flex', gap: '4px', alignItems: 'center' } },
                            react_1.default.createElement("input", { type: "text", value: effectiveFormat?.format?.['v8:item']?.['v8:content'] || '', readOnly: true, placeholder: "\u041D\u0435 \u0437\u0430\u0434\u0430\u043D", className: "template-properties-input", style: { flex: 1 } }),
                            react_1.default.createElement("button", { className: "template-properties-button-small", onClick: () => {
                                    setFormatBuilderType('number');
                                    setIsFormatBuilderOpen(true);
                                }, title: "\u041A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0442\u043E\u0440 \u0444\u043E\u0440\u043C\u0430\u0442\u0430 \u0447\u0438\u0441\u043B\u0430" }, "N"),
                            react_1.default.createElement("button", { className: "template-properties-button-small", onClick: () => {
                                    setFormatBuilderType('date');
                                    setIsFormatBuilderOpen(true);
                                }, title: "\u041A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0442\u043E\u0440 \u0444\u043E\u0440\u043C\u0430\u0442\u0430 \u0434\u0430\u0442\u044B" }, "\u0414"))))),
            react_1.default.createElement("div", { className: "template-properties-section" },
                react_1.default.createElement("h4", null, "\u0428\u0440\u0438\u0444\u0442"),
                react_1.default.createElement("div", { className: "template-properties-font-edit" },
                    react_1.default.createElement("button", { className: "template-properties-button", onClick: () => setIsFontBuilderOpen(true), title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0442\u043E\u0440 \u0448\u0440\u0438\u0444\u0442\u0430", style: { marginBottom: '12px' } }, "\u2699\uFE0F \u041A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0442\u043E\u0440 \u0448\u0440\u0438\u0444\u0442\u0430"),
                    effectiveFont ? (react_1.default.createElement(react_1.default.Fragment, null,
                        react_1.default.createElement("div", { className: "template-properties-format-field" },
                            react_1.default.createElement("label", null, "\u0413\u0430\u0440\u043D\u0438\u0442\u0443\u0440\u0430:"),
                            react_1.default.createElement("input", { type: "text", value: effectiveFont['$_faceName'] || '', onChange: (e) => {
                                    const updated = (0, templateUtils_1.updateCellFont)(templateDocument, selectedCell.row, selectedCell.col, { '$_faceName': e.target.value });
                                    onFontChange?.(updated);
                                }, placeholder: "Arial, Times New Roman \u0438 \u0442.\u0434.", className: "template-properties-input" })),
                        react_1.default.createElement("div", { className: "template-properties-format-field" },
                            react_1.default.createElement("label", null, "\u0420\u0430\u0437\u043C\u0435\u0440:"),
                            react_1.default.createElement("input", { type: "number", value: effectiveFont['$_height'] || '', onChange: (e) => {
                                    const updated = (0, templateUtils_1.updateCellFont)(templateDocument, selectedCell.row, selectedCell.col, { '$_height': parseFloat(e.target.value) || 0 });
                                    onFontChange?.(updated);
                                }, placeholder: "10", className: "template-properties-input", min: "1", max: "72" })),
                        react_1.default.createElement("div", { className: "template-properties-format-field" },
                            react_1.default.createElement("label", null, "\u0421\u0442\u0438\u043B\u044C:"),
                            react_1.default.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' } },
                                react_1.default.createElement("label", { style: { fontSize: 'calc(var(--vscode-font-size) - 1px)' } },
                                    react_1.default.createElement("input", { type: "checkbox", checked: effectiveFont['$_bold'] === 'true', onChange: (e) => {
                                            const updated = (0, templateUtils_1.updateCellFont)(templateDocument, selectedCell.row, selectedCell.col, { '$_bold': e.target.checked ? 'true' : 'false' });
                                            onFontChange?.(updated);
                                        }, style: { marginRight: '4px' } }),
                                    "\u0416\u0438\u0440\u043D\u044B\u0439"),
                                react_1.default.createElement("label", { style: { fontSize: 'calc(var(--vscode-font-size) - 1px)' } },
                                    react_1.default.createElement("input", { type: "checkbox", checked: effectiveFont['$_italic'] === 'true', onChange: (e) => {
                                            const updated = (0, templateUtils_1.updateCellFont)(templateDocument, selectedCell.row, selectedCell.col, { '$_italic': e.target.checked ? 'true' : 'false' });
                                            onFontChange?.(updated);
                                        }, style: { marginRight: '4px' } }),
                                    "\u041A\u0443\u0440\u0441\u0438\u0432"),
                                react_1.default.createElement("label", { style: { fontSize: 'calc(var(--vscode-font-size) - 1px)' } },
                                    react_1.default.createElement("input", { type: "checkbox", checked: effectiveFont['$_underline'] === 'true', onChange: (e) => {
                                            const updated = (0, templateUtils_1.updateCellFont)(templateDocument, selectedCell.row, selectedCell.col, { '$_underline': e.target.checked ? 'true' : 'false' });
                                            onFontChange?.(updated);
                                        }, style: { marginRight: '4px' } }),
                                    "\u041F\u043E\u0434\u0447\u0435\u0440\u043A\u043D\u0443\u0442\u044B\u0439"),
                                react_1.default.createElement("label", { style: { fontSize: 'calc(var(--vscode-font-size) - 1px)' } },
                                    react_1.default.createElement("input", { type: "checkbox", checked: effectiveFont['$_strikeout'] === 'true', onChange: (e) => {
                                            const updated = (0, templateUtils_1.updateCellFont)(templateDocument, selectedCell.row, selectedCell.col, { '$_strikeout': e.target.checked ? 'true' : 'false' });
                                            onFontChange?.(updated);
                                        }, style: { marginRight: '4px' } }),
                                    "\u0417\u0430\u0447\u0435\u0440\u043A\u043D\u0443\u0442\u044B\u0439"))),
                        effectiveFont['$_scale'] && (react_1.default.createElement("div", { className: "template-properties-format-field" },
                            react_1.default.createElement("label", null, "\u041C\u0430\u0441\u0448\u0442\u0430\u0431:"),
                            react_1.default.createElement("input", { type: "text", value: effectiveFont['$_scale'] || '', readOnly: true, className: "template-properties-input" }))))) : (react_1.default.createElement("div", { className: "template-properties-placeholder-small" }, "\u0428\u0440\u0438\u0444\u0442 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E"))))),
        react_1.default.createElement(CellNoteDialog_1.CellNoteDialog, { isOpen: isNoteDialogOpen, existingNote: editingNote, defaultCoordinates: selectedCell ? {
                beginRow: selectedCell.row,
                endRow: selectedCell.row,
                beginColumn: selectedCell.col,
                endColumn: selectedCell.col
            } : undefined, onSave: handleSaveNote, onCancel: () => {
                setIsNoteDialogOpen(false);
                setEditingNote(null);
            } }),
        isFormatBuilderOpen && selectedCell && (react_1.default.createElement(FormatBuilder_1.FormatBuilder, { formatType: formatBuilderType, existingFormat: effectiveFormat?.format, onSave: (format) => {
                const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, { format });
                onFormatChange?.(updated);
                setIsFormatBuilderOpen(false);
            }, onCancel: () => setIsFormatBuilderOpen(false) })),
        react_1.default.createElement(ColorPickerDialog_1.ColorPickerDialog, { isOpen: isColorPickerOpen, currentColor: colorPickerMode === 'text'
                ? (0, templateUtils_1.extractTemplateFormatColorString)(effectiveFormat?.textColor)
                : colorPickerMode === 'back'
                    ? (0, templateUtils_1.extractTemplateFormatColorString)(effectiveFormat?.backColor)
                    : (0, templateUtils_1.extractTemplateFormatColorString)(effectiveFormat?.borderColor), title: colorPickerMode === 'text'
                ? 'Выбор цвета текста'
                : colorPickerMode === 'back'
                    ? 'Выбор цвета фона'
                    : 'Выбор цвета рамки', onSave: (color) => {
                if (!selectedCell) {
                    setIsColorPickerOpen(false);
                    return;
                }
                if (colorPickerMode === 'border') {
                    const updated = (0, templateUtils_1.updateCellFormat)(templateDocument, selectedCell.row, selectedCell.col, {
                        borderColor: color || undefined,
                    });
                    onFormatChange?.(updated);
                }
                else if (colorPickerMode === 'text') {
                    onColorsChange?.(color || undefined, effectiveFormat?.backColor);
                }
                else {
                    onColorsChange?.(effectiveFormat?.textColor, color || undefined);
                }
                setIsColorPickerOpen(false);
            }, onCancel: () => setIsColorPickerOpen(false) }),
        selectedCell && (react_1.default.createElement(FontBuilderDialog_1.FontBuilderDialog, { isOpen: isFontBuilderOpen, currentFont: effectiveFont || undefined, onSave: (fontData) => {
                const updated = (0, templateUtils_1.updateCellFont)(templateDocument, selectedCell.row, selectedCell.col, fontData);
                onFontChange?.(updated);
                setIsFontBuilderOpen(false);
            }, onCancel: () => setIsFontBuilderOpen(false) }))));
};
exports.TemplatePropertiesPanel = TemplatePropertiesPanel;
//# sourceMappingURL=TemplatePropertiesPanel.js.map
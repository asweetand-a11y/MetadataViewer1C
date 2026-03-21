"use strict";
/**
 * Основной компонент редактора макетов 1С
 * WYSIWYG редактор для редактирования макетов с поддержкой параметров, шаблонов и именованных областей
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
exports.TemplateEditorApp = void 0;
const react_1 = __importStar(require("react"));
const TemplateTable_1 = require("./TemplateTable");
const TemplateToolbar_1 = require("./TemplateToolbar");
const TemplatePropertiesPanel_1 = require("./TemplatePropertiesPanel");
const templateUtils_1 = require("../../../utils/templateUtils");
const NamedAreasDialog_1 = require("./NamedAreasDialog");
require("./template-editor.css");
const TemplateEditorApp = ({ vscode }) => {
    const [templateDocument, setTemplateDocument] = (0, react_1.useState)(null);
    const [templatePath, setTemplatePath] = (0, react_1.useState)('');
    const [originalXml, setOriginalXml] = (0, react_1.useState)('');
    const [isDirty, setIsDirty] = (0, react_1.useState)(false);
    const [selectedCell, setSelectedCell] = (0, react_1.useState)(null);
    const [selectedRange, setSelectedRange] = (0, react_1.useState)(null);
    const [showGrid, setShowGrid] = (0, react_1.useState)(true);
    const [showHeaders, setShowHeaders] = (0, react_1.useState)(true);
    const [zoom, setZoom] = (0, react_1.useState)(1.0);
    const [showNotes, setShowNotes] = (0, react_1.useState)(true);
    const [frozenRows, setFrozenRows] = (0, react_1.useState)(0);
    const [frozenColumns, setFrozenColumns] = (0, react_1.useState)(0);
    const [showPropertiesPanel, setShowPropertiesPanel] = (0, react_1.useState)(false);
    const [showNamedAreasDialog, setShowNamedAreasDialog] = (0, react_1.useState)(false);
    const [showNamedAreaBorders, setShowNamedAreaBorders] = (0, react_1.useState)(true);
    // Обработка сообщений от extension
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (message.type === 'init') {
                const initMsg = message;
                setTemplateDocument(initMsg.payload.templateDocument);
                setTemplatePath(initMsg.payload.templatePath);
                setOriginalXml(initMsg.payload.originalXml);
                setIsDirty(false);
            }
            else if (message.type === 'saved') {
                if (message.success) {
                    setIsDirty(false);
                }
                // Сообщения об ошибках показываются в extension (TemplateEditorPanel)
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    // Запрос инициализации при монтировании
    (0, react_1.useEffect)(() => {
        vscode.postMessage({ type: 'requestRefresh' });
    }, [vscode]);
    // Горячая клавиша Ctrl+S / Cmd+S для сохранения
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (templateDocument) {
                    vscode.postMessage({ type: 'save', payload: templateDocument });
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [templateDocument, vscode]);
    const handleSave = (0, react_1.useCallback)(() => {
        if (!templateDocument) {
            return;
        }
        vscode.postMessage({
            type: 'save',
            payload: templateDocument
        });
        // Не сбрасываем isDirty здесь - ждем подтверждения от extension
    }, [templateDocument, vscode]);
    const handleCellEdit = (0, react_1.useCallback)((row, col, text) => {
        if (!templateDocument) {
            return;
        }
        const updated = (0, templateUtils_1.updateCellText)(templateDocument, row, col, text);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument]);
    const handleAddRow = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.addRow)(templateDocument, selectedCell.row, 'below');
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleDeleteRow = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.deleteRow)(templateDocument, selectedCell.row);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleFillPatternToggle = (0, react_1.useCallback)((pattern) => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const cell = (0, templateUtils_1.findCellByPosition)(templateDocument, selectedCell.row, selectedCell.col);
        const fillPattern = (0, templateUtils_1.getCellFillPattern)(templateDocument, selectedCell.row, selectedCell.col);
        let updated;
        if (pattern === 'parameter') {
            // При переключении на "Параметр": используем текущий templateText как имя параметра
            // или оставляем пустым, если templateText нет
            let parameterName = '';
            if (fillPattern === 'template' && cell?.c?.tl) {
                const templateText = (0, templateUtils_1.extractTextFromTemplateTextData)(cell.c.tl);
                // Пытаемся извлечь параметр из шаблона (например, "текст [Параметр]" -> "Параметр")
                // Если не удалось, используем весь текст как имя параметра
                const match = templateText.match(/\[([^\]]+)\]/);
                parameterName = match ? match[1] : (templateText.trim() || '');
            }
            updated = (0, templateUtils_1.setCellAsParameter)(templateDocument, selectedCell.row, selectedCell.col, parameterName);
            setTemplateDocument(updated);
            setIsDirty(true);
        }
        else {
            // При переключении на "Шаблон": используем текущий parameterName в квадратных скобках
            // или оставляем пустым, если parameterName нет
            let templateText = '';
            if (fillPattern === 'parameter' && cell?.c?.parameter) {
                templateText = `[${cell.c.parameter}]`;
            }
            updated = (0, templateUtils_1.setCellAsTemplate)(templateDocument, selectedCell.row, selectedCell.col, templateText);
            setTemplateDocument(updated);
            setIsDirty(true);
        }
    }, [templateDocument, selectedCell]);
    const handleParameterNameChange = (0, react_1.useCallback)((name) => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.setCellAsParameter)(templateDocument, selectedCell.row, selectedCell.col, name);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleTemplateTextChange = (0, react_1.useCallback)((text) => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.setCellAsTemplate)(templateDocument, selectedCell.row, selectedCell.col, text);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleAddColumn = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.addColumn)(templateDocument, selectedCell.col, 'right');
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleDeleteColumn = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.deleteColumn)(templateDocument, selectedCell.col);
        setTemplateDocument(updated);
        setIsDirty(true);
        // Сбрасываем выбор, так как колонка удалена
        setSelectedCell(null);
        setSelectedRange(null);
    }, [templateDocument, selectedCell]);
    const handleMergeCells = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedRange) {
            return;
        }
        const updated = (0, templateUtils_1.mergeCells)(templateDocument, selectedRange.startRow, selectedRange.startCol, selectedRange.endRow, selectedRange.endCol);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedRange]);
    const handleUnmergeCells = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.unmergeCells)(templateDocument, selectedCell.row, selectedCell.col);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleCreateNamedArea = (0, react_1.useCallback)((area) => {
        if (!templateDocument) {
            return;
        }
        try {
            const updated = (0, templateUtils_1.createNamedArea)(templateDocument, area.name, area.areaType, area.startRow, area.startCol, area.endRow, area.endCol);
            setTemplateDocument(updated);
            setIsDirty(true);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Ошибка создания именованной области: ${errorMessage}`);
        }
    }, [templateDocument]);
    const handleUpdateNamedArea = (0, react_1.useCallback)((oldName, area) => {
        if (!templateDocument) {
            return;
        }
        try {
            const updated = (0, templateUtils_1.updateNamedArea)(templateDocument, oldName, area);
            setTemplateDocument(updated);
            setIsDirty(true);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Ошибка обновления именованной области: ${errorMessage}`);
        }
    }, [templateDocument]);
    const handleDeleteNamedArea = (0, react_1.useCallback)((name) => {
        if (!templateDocument) {
            return;
        }
        try {
            const updated = (0, templateUtils_1.deleteNamedArea)(templateDocument, name);
            setTemplateDocument(updated);
            setIsDirty(true);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Ошибка удаления именованной области: ${errorMessage}`);
        }
    }, [templateDocument]);
    const handleCreateNote = (0, react_1.useCallback)((note) => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        // Используем updateCellNote напрямую, так как note уже содержит всю структуру
        const updated = (0, templateUtils_1.updateCellNote)(templateDocument, selectedCell.row, selectedCell.col, note);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleUpdateNote = (0, react_1.useCallback)((note) => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.updateCellNote)(templateDocument, selectedCell.row, selectedCell.col, note);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleDeleteNote = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.deleteCellNote)(templateDocument, selectedCell.row, selectedCell.col);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleDetailParameterChange = (0, react_1.useCallback)((detailParameter) => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.updateCellDetailParameter)(templateDocument, selectedCell.row, selectedCell.col, detailParameter);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleFormatChange = (0, react_1.useCallback)((updatedDocument) => {
        setTemplateDocument(updatedDocument);
        setIsDirty(true);
    }, []);
    const handleFontChange = (0, react_1.useCallback)((updatedDocument) => {
        setTemplateDocument(updatedDocument);
        setIsDirty(true);
    }, []);
    const handleAlignmentChange = (0, react_1.useCallback)((horizontal, vertical) => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.updateCellAlignment)(templateDocument, selectedCell.row, selectedCell.col, horizontal, vertical);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleAlignLeft = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.updateCellAlignment)(templateDocument, selectedCell.row, selectedCell.col, 'Left', undefined);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleAlignCenter = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.updateCellAlignment)(templateDocument, selectedCell.row, selectedCell.col, 'Center', undefined);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleAlignRight = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.updateCellAlignment)(templateDocument, selectedCell.row, selectedCell.col, 'Right', undefined);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleColorsChange = (0, react_1.useCallback)((textColor, backColor) => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const updated = (0, templateUtils_1.updateCellColors)(templateDocument, selectedCell.row, selectedCell.col, textColor, backColor);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleBold = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const effectiveFont = (0, templateUtils_1.getEffectiveFont)(templateDocument, selectedCell.row, selectedCell.col);
        const currentBold = effectiveFont?.['$_bold'] === 'true';
        const updated = (0, templateUtils_1.updateCellFont)(templateDocument, selectedCell.row, selectedCell.col, { '$_bold': currentBold ? 'false' : 'true' });
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleItalic = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const effectiveFont = (0, templateUtils_1.getEffectiveFont)(templateDocument, selectedCell.row, selectedCell.col);
        const currentItalic = effectiveFont?.['$_italic'] === 'true';
        const updated = (0, templateUtils_1.updateCellFont)(templateDocument, selectedCell.row, selectedCell.col, { '$_italic': currentItalic ? 'false' : 'true' });
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleUnderline = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }
        const effectiveFont = (0, templateUtils_1.getEffectiveFont)(templateDocument, selectedCell.row, selectedCell.col);
        const currentUnderline = effectiveFont?.['$_underline'] === 'true';
        const updated = (0, templateUtils_1.updateCellFont)(templateDocument, selectedCell.row, selectedCell.col, { '$_underline': currentUnderline ? 'false' : 'true' });
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);
    const handleAssignName = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedRange) {
            return;
        }
        try {
            const maxCol = (0, templateUtils_1.getMaxColumns)(templateDocument);
            const minRow = (0, templateUtils_1.getMinRowIndex)(templateDocument);
            const maxRow = (0, templateUtils_1.getMaxRowIndex)(templateDocument);
            const isFullWidth = selectedRange.startCol === 0 && selectedRange.endCol >= maxCol - 1;
            const isFullHeight = selectedRange.startRow === minRow && selectedRange.endRow >= maxRow;
            const rowSpan = selectedRange.endRow - selectedRange.startRow + 1;
            const colSpan = selectedRange.endCol - selectedRange.startCol + 1;
            // Выбор типа: Rows или Columns по форме выделения
            // Полная ширина (выбор по заголовкам строк) → Rows
            // Полная высота (выбор по заголовкам колонок) → Columns
            // Прямоугольник (перетаскивание) → по соотношению rowSpan/colSpan
            let createRows;
            if (isFullWidth && !isFullHeight) {
                createRows = true;
            }
            else if (isFullHeight && !isFullWidth) {
                createRows = false;
            }
            else {
                createRows = rowSpan >= colSpan;
            }
            if (createRows) {
                const name = (0, templateUtils_1.generateNamedAreaName)(templateDocument, 'Rows', selectedRange.startRow, selectedRange.endRow);
                const startRowData = templateDocument.rowsItem?.find((r, idx) => (r.index !== undefined ? r.index : idx) === selectedRange.startRow);
                const columnsID = startRowData?.row?.columnsID;
                const updated = (0, templateUtils_1.createNamedRows)(templateDocument, name, selectedRange.startRow, selectedRange.endRow, columnsID);
                setTemplateDocument(updated);
                setIsDirty(true);
            }
            else {
                const name = (0, templateUtils_1.generateNamedAreaName)(templateDocument, 'Columns', selectedRange.startCol, selectedRange.endCol);
                const updated = (0, templateUtils_1.createNamedColumns)(templateDocument, name, selectedRange.startCol, selectedRange.endCol);
                setTemplateDocument(updated);
                setIsDirty(true);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Ошибка создания именованной области: ${errorMessage}`);
        }
    }, [templateDocument, selectedRange]);
    const handleRemoveName = (0, react_1.useCallback)(() => {
        if (!templateDocument || !selectedRange) {
            return;
        }
        try {
            // Находим именованные области, которые пересекаются с выделенным диапазоном
            const allAreas = (0, templateUtils_1.getAllNamedAreas)(templateDocument);
            const areasToDelete = [];
            // Проверяем каждую ячейку в диапазоне
            for (let row = selectedRange.startRow; row <= selectedRange.endRow; row++) {
                for (let col = selectedRange.startCol; col <= selectedRange.endCol; col++) {
                    const matchingAreas = (0, templateUtils_1.findNamedAreaByPosition)(templateDocument, row, col);
                    matchingAreas.forEach(area => {
                        if (!areasToDelete.includes(area.name)) {
                            areasToDelete.push(area.name);
                        }
                    });
                }
            }
            if (areasToDelete.length === 0) {
                alert('В выделенном диапазоне нет именованных областей');
                return;
            }
            // Удаляем все найденные именованные области
            let updated = templateDocument;
            areasToDelete.forEach(areaName => {
                updated = (0, templateUtils_1.deleteNamedArea)(updated, areaName);
            });
            setTemplateDocument(updated);
            setIsDirty(true);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Ошибка удаления именованной области: ${errorMessage}`);
        }
    }, [templateDocument, selectedRange]);
    if (!templateDocument) {
        return (react_1.default.createElement("div", { className: "template-editor-loading" },
            react_1.default.createElement("div", { className: "template-editor-loading-content" },
                react_1.default.createElement("div", { className: "template-editor-loading-spinner" }),
                react_1.default.createElement("div", null, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043C\u0430\u043A\u0435\u0442\u0430..."))));
    }
    return (react_1.default.createElement("div", { className: "template-editor" },
        react_1.default.createElement("div", { className: "template-editor-header" },
            react_1.default.createElement("div", { className: "template-editor-title" },
                "\u0420\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u043C\u0430\u043A\u0435\u0442\u043E\u0432 1\u0421",
                isDirty && react_1.default.createElement("span", { className: "dirty-indicator" }, "*")),
            react_1.default.createElement("div", { className: "template-editor-actions" },
                react_1.default.createElement("span", { className: "template-editor-save-hint" }, "Ctrl+S"),
                react_1.default.createElement("button", { onClick: handleSave, disabled: !isDirty }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"))),
        react_1.default.createElement(TemplateToolbar_1.TemplateToolbar, { onAddRow: handleAddRow, onDeleteRow: handleDeleteRow, onAddColumn: handleAddColumn, onDeleteColumn: handleDeleteColumn, onMergeCells: selectedRange ? handleMergeCells : undefined, onUnmergeCells: selectedCell ? handleUnmergeCells : undefined, showGrid: showGrid, onToggleGrid: () => setShowGrid(!showGrid), showHeaders: showHeaders, onToggleHeaders: () => setShowHeaders(!showHeaders), zoom: zoom, onZoomIn: () => {
                const newZoom = Math.min(zoom + 0.25, 2.0);
                setZoom(newZoom);
            }, onZoomOut: () => {
                const newZoom = Math.max(zoom - 0.25, 0.5);
                setZoom(newZoom);
            }, onZoomReset: () => setZoom(1.0), showNotes: showNotes, onToggleNotes: () => setShowNotes(!showNotes), onAssignName: handleAssignName, onRemoveName: handleRemoveName, selectedRange: selectedRange, onShowProperties: () => setShowPropertiesPanel(!showPropertiesPanel), showPropertiesPanel: showPropertiesPanel, onShowNamedAreas: () => setShowNamedAreasDialog(true), onBold: handleBold, onItalic: handleItalic, onUnderline: handleUnderline, onAlignLeft: handleAlignLeft, onAlignCenter: handleAlignCenter, onAlignRight: handleAlignRight, showNamedAreaBorders: showNamedAreaBorders, onToggleNamedAreaBorders: () => setShowNamedAreaBorders(!showNamedAreaBorders) }),
        react_1.default.createElement("div", { className: "template-editor-content" },
            react_1.default.createElement("div", { className: "template-editor-main" },
                react_1.default.createElement(TemplateTable_1.TemplateTable, { templateDocument: templateDocument, selectedCell: selectedCell, selectedRange: selectedRange, onCellSelect: setSelectedCell, onRangeSelect: setSelectedRange, onCellEdit: handleCellEdit, showGrid: showGrid, showHeaders: showHeaders, zoom: zoom, showNotes: showNotes, frozenRows: frozenRows, frozenColumns: frozenColumns, showNamedAreaBorders: showNamedAreaBorders })),
            showPropertiesPanel && (react_1.default.createElement("div", { className: "template-editor-sidebar" },
                react_1.default.createElement(TemplatePropertiesPanel_1.TemplatePropertiesPanel, { templateDocument: templateDocument, selectedCell: selectedCell, selectedRange: selectedRange, onFillPatternToggle: handleFillPatternToggle, onParameterNameChange: handleParameterNameChange, onTemplateTextChange: handleTemplateTextChange, onCreateNote: handleCreateNote, onUpdateNote: handleUpdateNote, onDeleteNote: handleDeleteNote, onDetailParameterChange: handleDetailParameterChange, onFormatChange: handleFormatChange, onFontChange: handleFontChange, onAlignmentChange: handleAlignmentChange, onColorsChange: handleColorsChange, onClose: () => setShowPropertiesPanel(false) })))),
        templateDocument && (react_1.default.createElement(NamedAreasDialog_1.NamedAreasDialog, { key: `${showNamedAreasDialog}-${templateDocument.namedItem?.length || 0}-${templateDocument.namedItem?.map(item => item.name).join(',') || ''}`, isOpen: showNamedAreasDialog, namedAreas: Array.from((0, templateUtils_1.getAllNamedAreas)(templateDocument).values()), onCreate: handleCreateNamedArea, onUpdate: handleUpdateNamedArea, onDelete: handleDeleteNamedArea, onCancel: () => setShowNamedAreasDialog(false) }))));
};
exports.TemplateEditorApp = TemplateEditorApp;
//# sourceMappingURL=TemplateEditorApp.js.map
/**
 * Основной компонент редактора макетов 1С
 * WYSIWYG редактор для редактирования макетов с поддержкой параметров, шаблонов и именованных областей
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TemplateDocument, CellPosition, CellRange } from '../../../templatInterfaces';
import { TemplateTable } from './TemplateTable';
import { TemplateToolbar } from './TemplateToolbar';
import { TemplatePropertiesPanel } from './TemplatePropertiesPanel';
import { updateCellText, addRow, deleteRow, addColumn, deleteColumn, setCellAsParameter, setCellAsTemplate, findCellByPosition, mergeCells, unmergeCells, createNamedArea, updateNamedArea, deleteNamedArea, renameNamedArea, createCellNote, updateCellNote, deleteCellNote, updateCellDetailParameter, updateCellAlignment, updateCellColors, updateCellFormat, updateCellFont, createNamedRows, createNamedColumns, generateNamedAreaName, getAllNamedAreas, findNamedAreaByPosition, getCellFillPattern, extractTextFromTemplateTextData, getEffectiveFont, getMaxColumns, getMinRowIndex, getMaxRowIndex } from '../../../utils/templateUtils';
import { NamedAreasDialog } from './NamedAreasDialog';
import { NamedArea } from '../../../templatInterfaces';
import './template-editor.css';

interface TemplateEditorAppProps {
    vscode: any;
}

interface InitMessage {
    type: 'init';
    payload: {
        templateDocument: TemplateDocument;
        templatePath: string;
        originalXml: string;
    };
}

export const TemplateEditorApp: React.FC<TemplateEditorAppProps> = ({ vscode }) => {
    const [templateDocument, setTemplateDocument] = useState<TemplateDocument | null>(null);
    const [templatePath, setTemplatePath] = useState<string>('');
    const [originalXml, setOriginalXml] = useState<string>('');
    const [isDirty, setIsDirty] = useState(false);
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [selectedRange, setSelectedRange] = useState<{
        startRow: number;
        startCol: number;
        endRow: number;
        endCol: number;
    } | null>(null);
    const [showGrid, setShowGrid] = useState(true);
    const [showHeaders, setShowHeaders] = useState(true);
    const [zoom, setZoom] = useState(1.0);
    const [showNotes, setShowNotes] = useState(true);
    const [frozenRows, setFrozenRows] = useState(0);
    const [frozenColumns, setFrozenColumns] = useState(0);
    const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
    const [showNamedAreasDialog, setShowNamedAreasDialog] = useState(false);
    const [showNamedAreaBorders, setShowNamedAreaBorders] = useState(true);

    // Обработка сообщений от extension
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            if (message.type === 'init') {
                const initMsg = message as InitMessage;
                setTemplateDocument(initMsg.payload.templateDocument);
                setTemplatePath(initMsg.payload.templatePath);
                setOriginalXml(initMsg.payload.originalXml);
                setIsDirty(false);
            } else if (message.type === 'saved') {
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
    useEffect(() => {
        vscode.postMessage({ type: 'requestRefresh' });
    }, [vscode]);

    // Горячая клавиша Ctrl+S / Cmd+S для сохранения
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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

    const handleSave = useCallback(() => {
        if (!templateDocument) {
            return;
        }

        vscode.postMessage({
            type: 'save',
            payload: templateDocument
        });
        // Не сбрасываем isDirty здесь - ждем подтверждения от extension
    }, [templateDocument, vscode]);

    const handleCellEdit = useCallback((row: number, col: number, text: string) => {
        if (!templateDocument) {
            return;
        }

        const updated = updateCellText(templateDocument, row, col, text);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument]);

    const handleAddRow = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = addRow(templateDocument, selectedCell.row, 'below');
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleDeleteRow = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = deleteRow(templateDocument, selectedCell.row);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleFillPatternToggle = useCallback((pattern: 'parameter' | 'template') => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const cell = findCellByPosition(templateDocument, selectedCell.row, selectedCell.col);
        const fillPattern = getCellFillPattern(templateDocument, selectedCell.row, selectedCell.col);
        
        let updated: TemplateDocument;
        
        if (pattern === 'parameter') {
            // При переключении на "Параметр": используем текущий templateText как имя параметра
            // или оставляем пустым, если templateText нет
            let parameterName = '';
            if (fillPattern === 'template' && cell?.c?.tl) {
                const templateText = extractTextFromTemplateTextData(cell.c.tl);
                // Пытаемся извлечь параметр из шаблона (например, "текст [Параметр]" -> "Параметр")
                // Если не удалось, используем весь текст как имя параметра
                const match = templateText.match(/\[([^\]]+)\]/);
                parameterName = match ? match[1] : (templateText.trim() || '');
            }
            updated = setCellAsParameter(templateDocument, selectedCell.row, selectedCell.col, parameterName);
            setTemplateDocument(updated);
            setIsDirty(true);
        } else {
            // При переключении на "Шаблон": используем текущий parameterName в квадратных скобках
            // или оставляем пустым, если parameterName нет
            let templateText = '';
            if (fillPattern === 'parameter' && cell?.c?.parameter) {
                templateText = `[${cell.c.parameter}]`;
            }
            updated = setCellAsTemplate(templateDocument, selectedCell.row, selectedCell.col, templateText);
            setTemplateDocument(updated);
            setIsDirty(true);
        }
    }, [templateDocument, selectedCell]);

    const handleParameterNameChange = useCallback((name: string) => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = setCellAsParameter(templateDocument, selectedCell.row, selectedCell.col, name);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleTemplateTextChange = useCallback((text: string) => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = setCellAsTemplate(templateDocument, selectedCell.row, selectedCell.col, text);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleAddColumn = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = addColumn(templateDocument, selectedCell.col, 'right');
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleDeleteColumn = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = deleteColumn(templateDocument, selectedCell.col);
        setTemplateDocument(updated);
        setIsDirty(true);
        // Сбрасываем выбор, так как колонка удалена
        setSelectedCell(null);
        setSelectedRange(null);
    }, [templateDocument, selectedCell]);

    const handleMergeCells = useCallback(() => {
        if (!templateDocument || !selectedRange) {
            return;
        }

        const updated = mergeCells(
            templateDocument,
            selectedRange.startRow,
            selectedRange.startCol,
            selectedRange.endRow,
            selectedRange.endCol
        );
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedRange]);

    const handleUnmergeCells = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = unmergeCells(templateDocument, selectedCell.row, selectedCell.col);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleCreateNamedArea = useCallback((area: NamedArea) => {
        if (!templateDocument) {
            return;
        }

        try {
            const updated = createNamedArea(
                templateDocument,
                area.name,
                area.areaType as 'Rectangle' | 'Row' | 'Column' | 'Rows' | 'Columns',
                area.startRow,
                area.startCol,
                area.endRow,
                area.endCol
            );
            setTemplateDocument(updated);
            setIsDirty(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Ошибка создания именованной области: ${errorMessage}`);
        }
    }, [templateDocument]);

    const handleUpdateNamedArea = useCallback((oldName: string, area: NamedArea) => {
        if (!templateDocument) {
            return;
        }

        try {
            const updated = updateNamedArea(templateDocument, oldName, area);
            setTemplateDocument(updated);
            setIsDirty(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Ошибка обновления именованной области: ${errorMessage}`);
        }
    }, [templateDocument]);

    const handleDeleteNamedArea = useCallback((name: string) => {
        if (!templateDocument) {
            return;
        }

        try {
            const updated = deleteNamedArea(templateDocument, name);
            setTemplateDocument(updated);
            setIsDirty(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Ошибка удаления именованной области: ${errorMessage}`);
        }
    }, [templateDocument]);

    const handleCreateNote = useCallback((note: any) => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        // Используем updateCellNote напрямую, так как note уже содержит всю структуру
        const updated = updateCellNote(templateDocument, selectedCell.row, selectedCell.col, note);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleUpdateNote = useCallback((note: any) => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = updateCellNote(templateDocument, selectedCell.row, selectedCell.col, note);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleDeleteNote = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = deleteCellNote(templateDocument, selectedCell.row, selectedCell.col);
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleDetailParameterChange = useCallback((detailParameter: string) => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = updateCellDetailParameter(
            templateDocument,
            selectedCell.row,
            selectedCell.col,
            detailParameter
        );
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleFormatChange = useCallback((updatedDocument: TemplateDocument) => {
        setTemplateDocument(updatedDocument);
        setIsDirty(true);
    }, []);

    const handleFontChange = useCallback((updatedDocument: TemplateDocument) => {
        setTemplateDocument(updatedDocument);
        setIsDirty(true);
    }, []);

    const handleAlignmentChange = useCallback((horizontal?: string, vertical?: string) => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = updateCellAlignment(
            templateDocument,
            selectedCell.row,
            selectedCell.col,
            horizontal,
            vertical
        );
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleAlignLeft = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = updateCellAlignment(
            templateDocument,
            selectedCell.row,
            selectedCell.col,
            'Left',
            undefined
        );
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleAlignCenter = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = updateCellAlignment(
            templateDocument,
            selectedCell.row,
            selectedCell.col,
            'Center',
            undefined
        );
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleAlignRight = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = updateCellAlignment(
            templateDocument,
            selectedCell.row,
            selectedCell.col,
            'Right',
            undefined
        );
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleColorsChange = useCallback((textColor?: string, backColor?: string) => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const updated = updateCellColors(
            templateDocument,
            selectedCell.row,
            selectedCell.col,
            textColor,
            backColor
        );
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleBold = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const effectiveFont = getEffectiveFont(templateDocument, selectedCell.row, selectedCell.col);
        const currentBold = effectiveFont?.['$_bold'] === 'true';
        const updated = updateCellFont(
            templateDocument,
            selectedCell.row,
            selectedCell.col,
            { '$_bold': currentBold ? 'false' : 'true' }
        );
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleItalic = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const effectiveFont = getEffectiveFont(templateDocument, selectedCell.row, selectedCell.col);
        const currentItalic = effectiveFont?.['$_italic'] === 'true';
        const updated = updateCellFont(
            templateDocument,
            selectedCell.row,
            selectedCell.col,
            { '$_italic': currentItalic ? 'false' : 'true' }
        );
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleUnderline = useCallback(() => {
        if (!templateDocument || !selectedCell) {
            return;
        }

        const effectiveFont = getEffectiveFont(templateDocument, selectedCell.row, selectedCell.col);
        const currentUnderline = effectiveFont?.['$_underline'] === 'true';
        const updated = updateCellFont(
            templateDocument,
            selectedCell.row,
            selectedCell.col,
            { '$_underline': currentUnderline ? 'false' : 'true' }
        );
        setTemplateDocument(updated);
        setIsDirty(true);
    }, [templateDocument, selectedCell]);

    const handleAssignName = useCallback(() => {
        if (!templateDocument || !selectedRange) {
            return;
        }

        try {
            const maxCol = getMaxColumns(templateDocument);
            const minRow = getMinRowIndex(templateDocument);
            const maxRow = getMaxRowIndex(templateDocument);
            const isFullWidth = selectedRange.startCol === 0 && selectedRange.endCol >= maxCol - 1;
            const isFullHeight = selectedRange.startRow === minRow && selectedRange.endRow >= maxRow;
            const rowSpan = selectedRange.endRow - selectedRange.startRow + 1;
            const colSpan = selectedRange.endCol - selectedRange.startCol + 1;

            // Выбор типа: Rows или Columns по форме выделения
            // Полная ширина (выбор по заголовкам строк) → Rows
            // Полная высота (выбор по заголовкам колонок) → Columns
            // Прямоугольник (перетаскивание) → по соотношению rowSpan/colSpan
            let createRows: boolean;
            if (isFullWidth && !isFullHeight) {
                createRows = true;
            } else if (isFullHeight && !isFullWidth) {
                createRows = false;
            } else {
                createRows = rowSpan >= colSpan;
            }

            if (createRows) {
                const name = generateNamedAreaName(templateDocument, 'Rows', selectedRange.startRow, selectedRange.endRow);
                const startRowData = templateDocument.rowsItem?.find(
                    (r, idx) => (r.index !== undefined ? r.index : idx) === selectedRange.startRow
                );
                const columnsID = startRowData?.row?.columnsID;
                const updated = createNamedRows(
                    templateDocument,
                    name,
                    selectedRange.startRow,
                    selectedRange.endRow,
                    columnsID
                );
                setTemplateDocument(updated);
                setIsDirty(true);
            } else {
                const name = generateNamedAreaName(templateDocument, 'Columns', selectedRange.startCol, selectedRange.endCol);
                const updated = createNamedColumns(
                    templateDocument,
                    name,
                    selectedRange.startCol,
                    selectedRange.endCol
                );
                setTemplateDocument(updated);
                setIsDirty(true);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Ошибка создания именованной области: ${errorMessage}`);
        }
    }, [templateDocument, selectedRange]);

    const handleRemoveName = useCallback(() => {
        if (!templateDocument || !selectedRange) {
            return;
        }

        try {
            // Находим именованные области, которые пересекаются с выделенным диапазоном
            const allAreas = getAllNamedAreas(templateDocument);
            const areasToDelete: string[] = [];

            // Проверяем каждую ячейку в диапазоне
            for (let row = selectedRange.startRow; row <= selectedRange.endRow; row++) {
                for (let col = selectedRange.startCol; col <= selectedRange.endCol; col++) {
                    const matchingAreas = findNamedAreaByPosition(templateDocument, row, col);
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
                updated = deleteNamedArea(updated, areaName);
            });

            setTemplateDocument(updated);
            setIsDirty(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Ошибка удаления именованной области: ${errorMessage}`);
        }
    }, [templateDocument, selectedRange]);

    if (!templateDocument) {
        return (
            <div className="template-editor-loading">
                <div className="template-editor-loading-content">
                    <div className="template-editor-loading-spinner" />
                    <div>Загрузка макета...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="template-editor">
            <div className="template-editor-header">
                <div className="template-editor-title">
                    Редактор макетов 1С
                    {isDirty && <span className="dirty-indicator">*</span>}
                </div>
                <div className="template-editor-actions">
                    <span className="template-editor-save-hint">Ctrl+S</span>
                    <button onClick={handleSave} disabled={!isDirty}>
                        Сохранить
                    </button>
                </div>
            </div>
            <TemplateToolbar
                onAddRow={handleAddRow}
                onDeleteRow={handleDeleteRow}
                onAddColumn={handleAddColumn}
                onDeleteColumn={handleDeleteColumn}
                onMergeCells={selectedRange ? handleMergeCells : undefined}
                onUnmergeCells={selectedCell ? handleUnmergeCells : undefined}
                showGrid={showGrid}
                onToggleGrid={() => setShowGrid(!showGrid)}
                showHeaders={showHeaders}
                onToggleHeaders={() => setShowHeaders(!showHeaders)}
                zoom={zoom}
                onZoomIn={() => {
                    const newZoom = Math.min(zoom + 0.25, 2.0);
                    setZoom(newZoom);
                }}
                onZoomOut={() => {
                    const newZoom = Math.max(zoom - 0.25, 0.5);
                    setZoom(newZoom);
                }}
                onZoomReset={() => setZoom(1.0)}
                showNotes={showNotes}
                onToggleNotes={() => setShowNotes(!showNotes)}
                onAssignName={handleAssignName}
                onRemoveName={handleRemoveName}
                selectedRange={selectedRange}
                onShowProperties={() => setShowPropertiesPanel(!showPropertiesPanel)}
                showPropertiesPanel={showPropertiesPanel}
                onShowNamedAreas={() => setShowNamedAreasDialog(true)}
                onBold={handleBold}
                onItalic={handleItalic}
                onUnderline={handleUnderline}
                onAlignLeft={handleAlignLeft}
                onAlignCenter={handleAlignCenter}
                onAlignRight={handleAlignRight}
                showNamedAreaBorders={showNamedAreaBorders}
                onToggleNamedAreaBorders={() => setShowNamedAreaBorders(!showNamedAreaBorders)}
            />
            <div className="template-editor-content">
                <div className="template-editor-main">
                    <TemplateTable
                        templateDocument={templateDocument}
                        selectedCell={selectedCell}
                        selectedRange={selectedRange}
                        onCellSelect={setSelectedCell}
                        onRangeSelect={setSelectedRange}
                        onCellEdit={handleCellEdit}
                        showGrid={showGrid}
                        showHeaders={showHeaders}
                        zoom={zoom}
                        showNotes={showNotes}
                        frozenRows={frozenRows}
                        frozenColumns={frozenColumns}
                        showNamedAreaBorders={showNamedAreaBorders}
                    />
                </div>
                {showPropertiesPanel && (
                    <div className="template-editor-sidebar">
                        <TemplatePropertiesPanel
                            templateDocument={templateDocument}
                            selectedCell={selectedCell}
                            selectedRange={selectedRange}
                            onFillPatternToggle={handleFillPatternToggle}
                            onParameterNameChange={handleParameterNameChange}
                            onTemplateTextChange={handleTemplateTextChange}
                            onCreateNote={handleCreateNote}
                            onUpdateNote={handleUpdateNote}
                            onDeleteNote={handleDeleteNote}
                            onDetailParameterChange={handleDetailParameterChange}
                            onFormatChange={handleFormatChange}
                            onFontChange={handleFontChange}
                            onAlignmentChange={handleAlignmentChange}
                            onColorsChange={handleColorsChange}
                            onClose={() => setShowPropertiesPanel(false)}
                        />
                    </div>
                )}
            </div>
            {templateDocument && (
                <NamedAreasDialog
                    key={`${showNamedAreasDialog}-${templateDocument.namedItem?.length || 0}-${templateDocument.namedItem?.map(item => item.name).join(',') || ''}`}
                    isOpen={showNamedAreasDialog}
                    namedAreas={Array.from(getAllNamedAreas(templateDocument).values())}
                    onCreate={handleCreateNamedArea}
                    onUpdate={handleUpdateNamedArea}
                    onDelete={handleDeleteNamedArea}
                    onCancel={() => setShowNamedAreasDialog(false)}
                />
            )}
        </div>
    );
};


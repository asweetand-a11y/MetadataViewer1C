/**
 * Табличный редактор для макетов 1С
 * WYSIWYG редактор с редактируемыми ячейками, поддержкой объединения ячеек и форматирования
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TemplateDocument, TemplateRow, TemplateCell, CellPosition, CellRange, TemplateColumns } from '../../../templatInterfaces';
import { calculateColumnWidth, calculateRowHeight, getMinRowIndex, getMaxRowIndex } from '../../../utils/templateUtils';
import { findCellByPosition, getCellFillPattern, extractTextFromTemplateTextData, extractStringValue, getEffectiveFormat, getEffectiveFont, getAllNamedAreas, findNamedAreaByPosition, getNamedAreaForRow, getNamedAreaForColumn, getNamedAreasForRow, getNamedAreasForColumn, isCellOnNamedAreaBoundary } from '../../../utils/templateUtils';
import { NamedArea } from '../../../templatInterfaces';
import './template-editor.css';

interface TemplateTableProps {
    templateDocument: TemplateDocument;
    selectedCell: CellPosition | null;
    selectedRange: CellRange | null;
    onCellSelect: (cell: CellPosition | null) => void;
    onRangeSelect: (range: CellRange | null) => void;
    onCellEdit: (row: number, col: number, text: string) => void;
    frozenRows?: number;
    frozenColumns?: number;
    showGrid?: boolean;
    showHeaders?: boolean;
    zoom?: number;
    showNotes?: boolean;
    showNamedAreaBorders?: boolean;
}

export const TemplateTable: React.FC<TemplateTableProps> = ({
    templateDocument,
    selectedCell,
    selectedRange,
    onCellSelect,
    onRangeSelect,
    onCellEdit,
    frozenRows = 0,
    frozenColumns = 0,
    showGrid = true,
    showHeaders = true,
    zoom = 1.0,
    showNotes = true,
    showNamedAreaBorders = true
}) => {
    const [cellContents, setCellContents] = useState<Map<string, string>>(new Map());
    const tableRef = useRef<HTMLTableElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<CellPosition | null>(null);
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

    // Инициализация содержимого ячеек
    useEffect(() => {
        const contents = new Map<string, string>();
        
        if (templateDocument.rowsItem) {
            templateDocument.rowsItem.forEach((row) => {
                // Используем реальный индекс строки из данных
                const rowIndex = row.index !== undefined ? row.index : templateDocument.rowsItem.indexOf(row);
                if (row.row && row.row.c) {
                    let currentColIndex = 0;
                    row.row.c.forEach((cell, cellIdx) => {
                        // Определяем индекс колонки: если есть i, используем его, иначе порядковый номер
                        const colIndex = cell.i !== undefined ? cell.i : currentColIndex;
                        currentColIndex = colIndex + 1;
                        
                        const key = `${rowIndex}_${colIndex}`;
                        const fillPattern = getCellFillPattern(templateDocument, rowIndex, colIndex);
                        
                        if (fillPattern === 'parameter' && cell.c && cell.c.parameter) {
                            contents.set(key, `[${extractStringValue(cell.c.parameter)}]`);
                        } else if (fillPattern === 'template' && cell.c && cell.c.tl) {
                            const text = extractTextFromTemplateTextData(cell.c.tl);
                            contents.set(key, text || '');
                        } else if (cell.c) {
                            // Пустая ячейка или другой формат
                            contents.set(key, '');
                        }
                    });
                }
            });
        }
        
        setCellContents(contents);
    }, [templateDocument]);

    // Функция для получения группы колонок по умолчанию
    const getDefaultColumnsGroup = useCallback((): TemplateColumns | null => {
        if (!templateDocument.columns || templateDocument.columns.length === 0) {
            return null;
        }
        // Ищем группу колонок без ID (формат по умолчанию)
        const defaultGroup = templateDocument.columns.find((col: TemplateColumns) => !col.id);
        return defaultGroup || templateDocument.columns[0] || null;
    }, [templateDocument]);

    // Функция для определения группы колонок для конкретной строки
    const getColumnsForRow = useCallback((row: TemplateRow): TemplateColumns | null => {
        if (!templateDocument.columns || templateDocument.columns.length === 0) {
            return null;
        }
        
        const rowColumnsID = row.row.columnsID;
        
        if (rowColumnsID) {
            // Ищем группу колонок с таким же ID
            const columnGroup = templateDocument.columns.find(col => col.id === rowColumnsID);
            return columnGroup || getDefaultColumnsGroup();
        } else {
            // Используем группу колонок без ID (формат по умолчанию)
            return getDefaultColumnsGroup();
        }
    }, [templateDocument, getDefaultColumnsGroup]);

    // Функция для получения ширины колонки из формата с учетом группы колонок
    // Использует алгоритм 1С: ищем все теги <width>, последний найденный определяет последнюю колонку с измененной шириной
    const getColumnWidth = React.useCallback((col: number, columnsGroup: TemplateColumns | null): string => {
        const width = calculateColumnWidth(templateDocument, col, columnsGroup);
        
        // Нормализуем значение: если число, преобразуем в строку с px
        if (typeof width === 'number') {
            return `${width}px`;
        }
        return width;
    }, [templateDocument]);
    
    // Функция для получения ширины колонки с учетом активной строки (для динамического переключения)
    const getColumnWidthForActiveRow = React.useCallback((col: number, activeRowData: TemplateRow | undefined, currentRowData: TemplateRow): string => {
        // Если есть активная строка, используем её формат колонок
        if (activeRowData) {
            const activeColumnsGroup = getColumnsForRow(activeRowData);
            return getColumnWidth(col, activeColumnsGroup);
        }
        // Иначе используем формат текущей строки
        const currentColumnsGroup = getColumnsForRow(currentRowData);
        return getColumnWidth(col, currentColumnsGroup);
    }, [getColumnWidth, getColumnsForRow]);

    // Функция для получения высоты строки из формата
    const getRowHeight = React.useCallback((rowIndex: number): string => {
        const height = calculateRowHeight(templateDocument, rowIndex);
        
        if (height === undefined) {
            const baseHeight = templateDocument.height ?? 20;
            const defaultHeight = typeof baseHeight === 'number' ? baseHeight / 3 : 20 / 3;
            return `${Math.round(defaultHeight)}px`;
        }
        
        if (typeof height === 'number') {
            return `${height}px`;
        }
        return String(height).includes('px') ? String(height) : `${height}px`;
    }, [templateDocument]);

    // Функция для преобразования типа линии, толщины и цвета в CSS border
    const getBorderStyle = React.useCallback((
        borderType: number | undefined,
        lineType?: string,
        width?: number,
        color?: string
    ): string | undefined => {
        if (!borderType || borderType === 0) {
            return undefined;
        }

        // Преобразуем тип линии в CSS border-style
        let borderStyle = 'solid'; // по умолчанию сплошная
        if (lineType) {
            const lineTypeLower = lineType.toLowerCase();
            if (lineTypeLower.includes('точечн') || lineTypeLower.includes('dotted')) {
                borderStyle = 'dotted';
            } else if (lineTypeLower.includes('пунктир') || lineTypeLower.includes('dashed')) {
                borderStyle = 'dashed';
            } else if (lineTypeLower.includes('двойн') || lineTypeLower.includes('double')) {
                borderStyle = 'double';
            } else if (lineTypeLower.includes('сплошн') || lineTypeLower.includes('solid')) {
                borderStyle = 'solid';
            }
        }

        // Используем толщину из параметра или значение по умолчанию
        const borderWidth = width !== undefined ? `${width}px` : '1px';

        // Используем цвет из параметра или значение по умолчанию
        const borderColor = color || 'var(--vscode-panel-border)';

        return `${borderWidth} ${borderStyle} ${borderColor}`;
    }, []);

    // Вычисление максимального количества колонок (учитываем все группы колонок)
    const maxColumns = React.useMemo(() => {
        let max = 0;
        if (templateDocument.rowsItem) {
            templateDocument.rowsItem.forEach(row => {
                if (row.row && row.row.c) {
                    let currentColIndex = 0;
                    row.row.c.forEach(cell => {
                        const colIndex = cell.i !== undefined ? cell.i : currentColIndex;
                        if (colIndex >= max) {
                            max = colIndex + 1;
                        }
                        currentColIndex = colIndex + 1;
                    });
                }
            });
        }
        if (templateDocument.columns && templateDocument.columns.length > 0) {
            templateDocument.columns.forEach((columnsGroup: { size?: number; columnsItem?: Array<{ index?: number }> }) => {
                if (columnsGroup.size !== undefined) {
                    max = Math.max(max, columnsGroup.size);
                }
                if (columnsGroup.columnsItem) {
                    columnsGroup.columnsItem.forEach(item => {
                        if (item.index !== undefined && item.index >= max) {
                            max = item.index + 1;
                        }
                    });
                }
            });
        }
        return Math.max(max, 10);
    }, [templateDocument]);

    // Получение содержимого ячейки
    const getCellContent = useCallback((row: number, col: number): string => {
        const key = `${row}_${col}`;
        return cellContents.get(key) || '';
    }, [cellContents]);

    // Обработка клика на ячейку
    const handleCellClick = useCallback((row: number, col: number, event: React.MouseEvent) => {
        event.stopPropagation();
        
        if (event.shiftKey && selectedCell) {
            // Множественное выделение (Shift + клик)
            const range: CellRange = {
                startRow: Math.min(selectedCell.row, row),
                startCol: Math.min(selectedCell.col, col),
                endRow: Math.max(selectedCell.row, row),
                endCol: Math.max(selectedCell.col, col)
            };
            onRangeSelect(range);
            onCellSelect({ row, col });
        } else {
            // Одиночное выделение
            onCellSelect({ row, col });
            onRangeSelect(null);
        }
        // Устанавливаем активную строку при клике на ячейку
        setActiveRowIndex(row);
    }, [selectedCell, onCellSelect, onRangeSelect]);

    // Определение активной строки - используем напрямую activeRowIndex и selectedCell
    // Это гарантирует, что компонент перерендерится при изменении этих значений
    const currentActiveRowIndex: number | null = selectedCell ? selectedCell.row : activeRowIndex;

    // Эффект для синхронизации activeRowIndex с selectedCell
    useEffect(() => {
        if (selectedCell) {
            setActiveRowIndex(selectedCell.row);
        }
    }, [selectedCell]);

    // Обработчики событий для строк
    const handleRowMouseEnter = useCallback((rowIndex: number) => {
        setActiveRowIndex(rowIndex);
    }, []);

    const handleRowMouseLeave = useCallback((event: React.MouseEvent) => {
        // Проверяем, не переходим ли мы на другую строку или ячейку
        const relatedTarget = event.relatedTarget;
        if (relatedTarget && typeof relatedTarget === 'object' && 'closest' in relatedTarget && typeof (relatedTarget as any).closest === 'function') {
            // Если переходим на ячейку или строку, не сбрасываем
            const cell = (relatedTarget as HTMLElement).closest('td, tr');
            if (cell) {
                const rowAttr = cell.getAttribute('data-row');
                if (rowAttr) {
                    const newRowIndex = parseInt(rowAttr, 10);
                    if (newRowIndex === activeRowIndex) {
                        return; // Остаемся в той же строке
                    }
                }
            }
        }
        // Не сбрасываем, если строка выделена
        if (selectedCell?.row !== activeRowIndex) {
            setActiveRowIndex(null);
        }
    }, [selectedCell, activeRowIndex]);

    // Обработка клика на заголовок строки
    const handleRowHeaderClick = useCallback((row: number, event: React.MouseEvent) => {
        event.stopPropagation();
        
        if (event.shiftKey && selectedRange) {
            // Расширяем выделение от текущего диапазона до новой строки
            const newRange: CellRange = {
                startRow: Math.min(selectedRange.startRow, row),
                startCol: 0,
                endRow: Math.max(selectedRange.endRow, row),
                endCol: maxColumns - 1
            };
            onRangeSelect(newRange);
            onCellSelect({ row: newRange.startRow, col: 0 });
        } else {
            // Обычное выделение одной строки
            const range: CellRange = {
                startRow: row,
                startCol: 0,
                endRow: row,
                endCol: maxColumns - 1
            };
            onRangeSelect(range);
            onCellSelect({ row, col: 0 });
        }
    }, [maxColumns, onCellSelect, onRangeSelect, selectedRange]);

    // Обработка клика на заголовок колонки
    const handleColumnHeaderClick = useCallback((col: number, event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();

        const minRow = getMinRowIndex(templateDocument);
        const maxRow = getMaxRowIndex(templateDocument);

        if (event.shiftKey && selectedRange) {
            const newRange: CellRange = {
                startRow: minRow,
                startCol: Math.min(selectedRange.startCol, col),
                endRow: maxRow,
                endCol: Math.max(selectedRange.endCol, col)
            };
            onRangeSelect(newRange);
            onCellSelect({ row: minRow, col: newRange.startCol });
        } else {
            const range: CellRange = {
                startRow: minRow,
                startCol: col,
                endRow: maxRow,
                endCol: col
            };
            onRangeSelect(range);
            onCellSelect({ row: minRow, col });
        }
    }, [templateDocument, onCellSelect, onRangeSelect, selectedRange]);

    // Обработка начала перетаскивания
    const handleMouseDown = useCallback((row: number, col: number, event: React.MouseEvent) => {
        if (event.button === 0) { // Левая кнопка мыши
            setIsDragging(true);
            setDragStart({ row, col });
            onCellSelect({ row, col });
            onRangeSelect(null);
        }
    }, [onCellSelect, onRangeSelect]);

    // Обработка перемещения мыши при перетаскивании
    useEffect(() => {
        if (!isDragging || !dragStart) return;

        const handleMouseMove = (event: MouseEvent) => {
            if (!tableRef.current) return;
            
            const table = tableRef.current;
            const tableRect = table.getBoundingClientRect();
            const x = event.clientX - tableRect.left;
            const y = event.clientY - tableRect.top;
            
            // Определяем ячейку по координатам, используя реальные элементы таблицы
            let targetRow = -1;
            let targetCol = -1;
            
            const rows = table.querySelectorAll('tbody > tr');
            let currentY = 0;
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i] as HTMLTableRowElement;
                const rowRect = row.getBoundingClientRect();
                const rowTop = rowRect.top - tableRect.top;
                const rowBottom = rowTop + rowRect.height;
                
                if (y >= rowTop && y < rowBottom) {
                    targetRow = i;
                    // Находим колонку внутри строки
                    const cells = row.querySelectorAll('td.template-table-cell');
                    let currentX = 0;
                    
                    for (let j = 0; j < cells.length; j++) {
                        const cell = cells[j] as HTMLTableCellElement;
                        const cellRect = cell.getBoundingClientRect();
                        const cellLeft = cellRect.left - tableRect.left;
                        const cellRight = cellLeft + cellRect.width;
                        
                        if (x >= cellLeft && x < cellRight) {
                            // Учитываем colspan
                            const colspan = cell.colSpan || 1;
                            targetCol = j;
                            break;
                        }
                    }
                    break;
                }
            }
            
            // Если не нашли через DOM, используем fallback на основе примерных размеров
            if (targetRow < 0 || targetCol < 0) {
                const cellWidth = 100;
                const cellHeight = 25;
                targetCol = Math.floor(x / cellWidth);
                targetRow = Math.floor(y / cellHeight);
            }
            
            if (targetRow >= 0 && targetRow < (templateDocument.rowsItem?.length || 0) && 
                targetCol >= 0 && targetCol < maxColumns) {
                const range: CellRange = {
                    startRow: Math.min(dragStart.row, targetRow),
                    startCol: Math.min(dragStart.col, targetCol),
                    endRow: Math.max(dragStart.row, targetRow),
                    endCol: Math.max(dragStart.col, targetCol)
                };
                onRangeSelect(range);
                onCellSelect({ row: targetRow, col: targetCol });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setDragStart(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, templateDocument, maxColumns, onCellSelect, onRangeSelect]);

    // Обработка изменения содержимого ячейки
    const handleCellContentChange = useCallback((row: number, col: number, text: string) => {
        const key = `${row}_${col}`;
        setCellContents(prev => new Map(prev).set(key, text));
        onCellEdit(row, col, text);
    }, [onCellEdit]);

    // Проверка, выбрана ли ячейка
    const isCellSelected = useCallback((row: number, col: number): boolean => {
        if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
            return true;
        }
        if (selectedRange) {
            return row >= selectedRange.startRow && row <= selectedRange.endRow &&
                   col >= selectedRange.startCol && col <= selectedRange.endCol;
        }
        return false;
    }, [selectedCell, selectedRange]);

    // Проверка, заморожена ли строка/колонка
    const isFrozenRow = (row: number): boolean => row < frozenRows;
    const isFrozenColumn = (col: number): boolean => col < frozenColumns;

    // Получение объединенных ячеек для текущей позиции
    // В формате 1С: w и h - это количество дополнительных колонок/строк
    // Если w=3, то объединяются колонки от c до c+w включительно (всего 4 колонки)
    // Поэтому colspan = w + 1, rowspan = h + 1
    const getMergedCells = useCallback((row: number, col: number): { colspan: number; rowspan: number; isStart: boolean } => {
        const merges = templateDocument.merge || [];
        
        for (const merge of merges) {
            // Проверяем, является ли эта ячейка началом объединения
            if (merge.r === row && merge.c === col) {
                return {
                    colspan: merge.w + 1, // w - количество дополнительных колонок, нужно +1
                    rowspan: merge.h !== undefined ? merge.h + 1 : 1, // h - количество дополнительных строк, нужно +1
                    isStart: true
                };
            }
            
            // Проверяем, входит ли эта ячейка в объединение (но не является началом)
            // Если w=3, то объединяются колонки c, c+1, c+2, c+3 (включительно)
            // Если h=1, то объединяются строки r и r+1 (всего 2 строки)
            const mergeHeight = merge.h !== undefined ? merge.h : 0;
            const mergeWidth = merge.w !== undefined ? merge.w : 0;
            // Проверяем, что ячейка находится внутри объединения (но не является началом)
            // row > merge.r && row <= merge.r + mergeHeight (для вертикального объединения)
            // col >= merge.c && col <= merge.c + mergeWidth (для горизонтального объединения)
            if ((row > merge.r && row <= merge.r + mergeHeight && col >= merge.c && col <= merge.c + mergeWidth) ||
                (row === merge.r && col > merge.c && col <= merge.c + mergeWidth) ||
                (row > merge.r && row <= merge.r + mergeHeight && col === merge.c)) {
                return {
                    colspan: 1,
                    rowspan: 1,
                    isStart: false
                };
            }
        }
        
        return { colspan: 1, rowspan: 1, isStart: true };
    }, [templateDocument]);

    // Получение всех именованных областей
    const namedAreas = React.useMemo(() => {
        return getAllNamedAreas(templateDocument);
    }, [templateDocument]);

    // Проверка, входит ли ячейка в именованную область
    const getNamedAreasForCell = useCallback((row: number, col: number, columnsID?: string): NamedArea[] => {
        const allAreas = findNamedAreaByPosition(templateDocument, row, col);
        // Фильтруем по columnsID
        if (columnsID) {
            return allAreas.filter(area => area.columnsID === columnsID);
        } else {
            return allAreas.filter(area => !area.columnsID);
        }
    }, [templateDocument]);

    const rows = templateDocument.rowsItem || [];
    const columns = templateDocument.columns || [];

    return (
        <div className="template-table-container">
            <table 
                ref={tableRef} 
                className={`template-table ${showGrid ? 'show-grid' : ''} ${showHeaders ? 'show-headers' : ''}`}
                style={{ tableLayout: 'fixed' }}
            >
                <colgroup>
                    <col style={{ width: '150px' }} />
                    <col style={{ width: '40px' }} />
                    {Array.from({ length: maxColumns }, (_, col) => {
                        // Заголовки колонок используют формат по умолчанию
                        const defaultColumnsGroup = getDefaultColumnsGroup();
                        const columnWidth = getColumnWidth(col, defaultColumnsGroup);
                        const widthValue = columnWidth.includes('px') ? columnWidth : `${columnWidth}px`;
                        return (
                            <col 
                                key={col} 
                                style={{ width: widthValue }} 
                            />
                        );
                    })}
                </colgroup>
                <thead>
                    <tr className="template-table-named-areas-row">
                        <th className="template-table-named-area-header"></th>
                        <th className="template-table-row-header"></th>
                        {Array.from({ length: maxColumns }, (_, col) => {
                            // Определяем активную строку для динамического переключения
                            const activeRow = currentActiveRowIndex;
                            let activeColumnsID: string | undefined = undefined;
                            if (activeRow !== null) {
                                const activeRowData = rows.find(r => {
                                    const rIndex = r.index !== undefined ? r.index : rows.indexOf(r);
                                    return rIndex === activeRow;
                                });
                                if (activeRowData) {
                                    activeColumnsID = activeRowData.row.columnsID;
                                }
                            }
                            
                            // Используем columnsID активной строки, если есть, иначе формат по умолчанию
                            const namedAreasForColumn = getNamedAreasForColumn(templateDocument, col, activeColumnsID);
                            const prevNamedAreas = col > 0 ? getNamedAreasForColumn(templateDocument, col - 1, activeColumnsID) : [];
                            // Проверяем, отличается ли набор областей от предыдущей колонки
                            const shouldShow = namedAreasForColumn.length > 0 && (
                                prevNamedAreas.length === 0 || 
                                prevNamedAreas.length !== namedAreasForColumn.length ||
                                !prevNamedAreas.every((area, idx) => 
                                    idx < namedAreasForColumn.length && 
                                    area.name === namedAreasForColumn[idx].name &&
                                    area.startCol === namedAreasForColumn[idx].startCol
                                )
                            );
                            const areaNames = namedAreasForColumn.map(area => area.name).join(', ');
                            return (
                                <th
                                    key={col}
                                    className={`template-table-named-area-column-header ${isFrozenColumn(col) ? 'frozen' : ''}`}
                                >
                                    {shouldShow && (
                                        <span className="named-area-label">{areaNames}</span>
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                    <tr>
                        <th className="template-table-named-area-header"></th>
                        <th className="template-table-row-header"></th>
                        {Array.from({ length: maxColumns }, (_, col) => {
                            // Заголовки колонок используют формат по умолчанию
                            // Но при наличии активной строки могут отображать ширину из её формата для визуального выравнивания
                            const activeRow = currentActiveRowIndex;
                            let columnsGroupForHeader: TemplateColumns | null = null;
                            
                            if (activeRow !== null) {
                                // Если есть активная строка, используем её формат колонок для заголовков
                                const activeRowData = rows.find(r => {
                                    const rIndex = r.index !== undefined ? r.index : rows.indexOf(r);
                                    return rIndex === activeRow;
                                });
                                if (activeRowData) {
                                    columnsGroupForHeader = getColumnsForRow(activeRowData);
                                }
                            }
                            
                            // Если не нашли формат активной строки, используем формат по умолчанию
                            if (!columnsGroupForHeader) {
                                columnsGroupForHeader = getDefaultColumnsGroup();
                            }
                            
                            const columnWidth = getColumnWidth(col, columnsGroupForHeader);
                            const widthValue = columnWidth.includes('px') ? columnWidth : `${columnWidth}px`;
                            return (
                                <th
                                    key={col}
                                    className={`template-table-column-header ${isFrozenColumn(col) ? 'frozen' : ''}`}
                                    style={{ 
                                        width: widthValue,
                                        minWidth: widthValue
                                    }}
                                    onClick={(e) => handleColumnHeaderClick(col, e)}
                                    title="Кликните, чтобы выделить всю колонку"
                                >
                                    {col + 1}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((templateRow, arrayIndex) => {
                        // Используем реальный индекс строки из данных, а не индекс массива
                        const rowIndex = templateRow.index !== undefined ? templateRow.index : arrayIndex;
                        const activeRow = currentActiveRowIndex;
                        const isActive = activeRow === rowIndex;
                        
                        // Определяем формат строки
                        const columnsGroup = getColumnsForRow(templateRow);
                        const rowColumnsID = templateRow.row.columnsID;
                        
                        // Получаем именованные области с учетом columnsID
                        // Учитываем активную строку для динамического переключения
                        let displayColumnsID = rowColumnsID;
                        let activeRowData: TemplateRow | undefined = undefined;
                        if (activeRow !== null) {
                            // Ищем строку с нужным индексом
                            // Важно: используем тот же способ определения индекса, что и при рендеринге
                            activeRowData = rows.find((r, idx) => {
                                const rIndex = r.index !== undefined ? r.index : idx;
                                return rIndex === activeRow;
                            });
                            if (activeRow === rowIndex) {
                                // Для активной строки используем её columnsID
                                displayColumnsID = rowColumnsID;
                            } else if (activeRowData) {
                                // Для неактивных строк при наличии активной строки используем columnsID активной строки
                                displayColumnsID = activeRowData.row.columnsID;
                            }
                        }
                        
                        // Для подписей используем columnsID текущей строки (не активной), чтобы области всегда отображались
                        const namedAreasForRow = getNamedAreasForRow(templateDocument, rowIndex, rowColumnsID);
                        // Показываем все области, содержащие эту строку (для ясности на каждой строке)
                        const areaNames = namedAreasForRow.map(area => area.name).join(', ');
                        const heightValue = getRowHeight(rowIndex);
                        return (
                            <tr 
                                key={rowIndex} 
                                className={`${isFrozenRow(rowIndex) ? 'frozen' : ''} ${isActive ? 'active-row' : ''}`}
                                style={{ 
                                    height: heightValue,
                                    minHeight: heightValue,
                                    overflow: 'visible' // Разрешаем перекрытие содержимого
                                }}
                                onMouseEnter={() => handleRowMouseEnter(rowIndex)}
                                onMouseLeave={handleRowMouseLeave}
                            >
                                <td className="template-table-named-area-cell">
                                    {areaNames && (
                                        <span className="named-area-label">{areaNames}</span>
                                    )}
                                </td>
                                <td 
                                    className="template-table-row-header"
                                    onClick={(e) => handleRowHeaderClick(rowIndex, e)}
                                    title="Кликните, чтобы выделить всю строку"
                                >
                                    {rowIndex + 1}
                                </td>
                                {Array.from({ length: maxColumns }, (_, col) => {
                                        const merged = getMergedCells(rowIndex, col);
                                        
                                        // Пропускаем ячейки, которые являются частью объединения, но не началом
                                        // Если isStart = false, значит ячейка является частью объединения и должна быть пропущена
                                        if (!merged.isStart) {
                                            return null;
                                        }
                                        
                                        const cell = findCellByPosition(templateDocument, rowIndex, col);
                                        const content = getCellContent(rowIndex, col);
                                        const selected = isCellSelected(rowIndex, col);
                                        const fillPattern = getCellFillPattern(templateDocument, rowIndex, col);
                                        
                                        // Проверяем наличие примечания
                                        const hasNote = cell?.c?.note !== undefined;
                                        
                                        // Проверяем, входит ли ячейка в именованные области (для tooltip и границ)
                                        // Используем columnsID текущей строки для фильтрации областей
                                        const namedAreasForCell = getNamedAreasForCell(rowIndex, col, rowColumnsID);
                                        const namedAreaNames = namedAreasForCell.map(area => area.name).join(', ');
                                        
                                        // Определяем границы именованных областей для текущей ячейки
                                        const boundaryClasses: string[] = [];
                                        if (showNamedAreaBorders) {
                                            namedAreasForCell.forEach(area => {
                                                // Исключаем области типа Rectangle из отображения границ
                                                if (area.areaType !== 'Rectangle') {
                                                    const boundary = isCellOnNamedAreaBoundary(templateDocument, rowIndex, col, area);
                                                    if (boundary.top) boundaryClasses.push('named-area-border-top');
                                                    if (boundary.bottom) boundaryClasses.push('named-area-border-bottom');
                                                    if (boundary.left) boundaryClasses.push('named-area-border-left');
                                                    if (boundary.right) boundaryClasses.push('named-area-border-right');
                                                }
                                            });
                                        }
                                        
                                        // Получаем форматирование ячейки
                                        const cellFormat = getEffectiveFormat(templateDocument, rowIndex, col);
                                        const cellFont = getEffectiveFont(templateDocument, rowIndex, col);
                                        
                                        // Формируем стили для ячейки
                                        const cellStyle: React.CSSProperties = {};
                                        
                                        // Применяем ширину колонки динамически в зависимости от активной строки
                                        // Если есть активная строка, все строки используют её формат для визуального выравнивания
                                        // Используем activeRow и activeRowData, которые уже определены в начале map для строк
                                        // Важно: используем алгоритм 1С для вычисления ширины колонок
                                        let columnWidth: string;
                                        if (activeRow !== null && activeRowData) {
                                            // Есть активная строка - используем её формат колонок для всех строк
                                            const activeColumnsGroup = getColumnsForRow(activeRowData);
                                            columnWidth = getColumnWidth(col, activeColumnsGroup);
                                        } else {
                                            // Нет активной строки или не найдена - используем формат текущей строки
                                            columnWidth = getColumnWidth(col, columnsGroup);
                                        }
                                        cellStyle.width = columnWidth;
                                        cellStyle.minWidth = columnWidth;
                                        
                                        if (cellFormat) {
                                            // Выравнивание
                                            if (cellFormat.horizontalAlignment) {
                                                cellStyle.textAlign = cellFormat.horizontalAlignment.toLowerCase() as any;
                                            }
                                            if (cellFormat.verticalAlignment) {
                                                cellStyle.verticalAlign = cellFormat.verticalAlignment.toLowerCase() as any;
                                            }
                                            
                                            // Цвета
                                            if (cellFormat.textColor) {
                                                const textColorStr = typeof cellFormat.textColor === 'string' ? cellFormat.textColor : String(cellFormat.textColor);
                                                if (!textColorStr.startsWith('style:')) {
                                                    cellStyle.color = textColorStr;
                                                }
                                            }
                                            if (cellFormat.backColor) {
                                                const backColorStr = typeof cellFormat.backColor === 'string' ? cellFormat.backColor : String(cellFormat.backColor);
                                                if (!backColorStr.startsWith('style:')) {
                                                    cellStyle.backgroundColor = backColorStr;
                                                }
                                            }
                                            
                                            // Размещение текста
                                            // Проверяем, является ли ячейка объединенной
                                            const isMerged = merged.colspan > 1 || merged.rowspan > 1;
                                            
                                            // Определяем режим размещения текста
                                            // Если cellFormat === null, используем режим Auto по умолчанию
                                            const textPlacement = cellFormat?.textPlacement;
                                            
                                            if (textPlacement === 'Wrap') {
                                                // Режим Wrap - текст переносится, высота строки может увеличиваться
                                                cellStyle.whiteSpace = 'normal';
                                                cellStyle.wordWrap = 'break-word';
                                                cellStyle.overflow = 'visible';
                                            } else if (textPlacement === 'Clip') {
                                                // Режим Clip - текст обрезается с ellipsis
                                                cellStyle.whiteSpace = 'nowrap';
                                                cellStyle.overflow = 'hidden';
                                                cellStyle.textOverflow = 'ellipsis';
                                            } else {
                                                // Режим "Auto" (по умолчанию) - текст может перекрывать соседние ячейки
                                                // НО: если ячейка объединена, текст должен обрезаться
                                                if (isMerged) {
                                                    cellStyle.whiteSpace = 'nowrap';
                                                    cellStyle.overflow = 'hidden';
                                                    cellStyle.textOverflow = 'ellipsis';
                                                } else {
                                                    // Обычная ячейка - текст может перекрывать соседние ячейки
                                                    // Используем overflow: hidden для ячейки, чтобы обрезать по вертикали
                                                    // Абсолютное позиционирование содержимого позволит перекрывать соседние ячейки горизонтально
                                                    cellStyle.overflow = 'hidden'; // Обрезаем по вертикали, чтобы высота строки не увеличивалась
                                                    cellStyle.position = 'relative'; // Для абсолютного позиционирования содержимого
                                                }
                                            }
                                            
                                            // Ширина и высота
                                            if (cellFormat.width) {
                                                const widthStr = typeof cellFormat.width === 'string' ? cellFormat.width : String(cellFormat.width);
                                                cellStyle.width = widthStr.includes('px') ? widthStr : `${widthStr}px`;
                                            }
                                            if (cellFormat.height) {
                                                const heightStr = typeof cellFormat.height === 'string' ? cellFormat.height : String(cellFormat.height);
                                                cellStyle.height = heightStr.includes('px') ? heightStr : `${heightStr}px`;
                                            }
                                            
                                            // Границы с учетом типа линии, толщины и цвета
                                            if (cellFormat.border === 1) {
                                                // Если установлена общая граница, используем её для всех сторон
                                                const borderStyle = getBorderStyle(
                                                    1,
                                                    cellFormat.leftBorderLineType || cellFormat.topBorderLineType || cellFormat.bottomBorderLineType || cellFormat.rightBorderLineType,
                                                    cellFormat.leftBorderWidth || cellFormat.topBorderWidth || cellFormat.bottomBorderWidth || cellFormat.rightBorderWidth,
                                                    cellFormat.leftBorderColor || cellFormat.topBorderColor || cellFormat.bottomBorderColor || cellFormat.rightBorderColor
                                                );
                                                cellStyle.border = borderStyle || '1px solid var(--vscode-panel-border)';
                                            } else {
                                                // Применяем границы для каждой стороны отдельно
                                                if (cellFormat.leftBorder === 1) {
                                                    const leftBorderStyle = getBorderStyle(
                                                        cellFormat.leftBorder,
                                                        cellFormat.leftBorderLineType,
                                                        cellFormat.leftBorderWidth,
                                                        cellFormat.leftBorderColor
                                                    );
                                                    if (leftBorderStyle) {
                                                        cellStyle.borderLeft = leftBorderStyle;
                                                    } else {
                                                        cellStyle.borderLeft = '1px solid var(--vscode-panel-border)';
                                                    }
                                                }
                                                if (cellFormat.topBorder === 1) {
                                                    const topBorderStyle = getBorderStyle(
                                                        cellFormat.topBorder,
                                                        cellFormat.topBorderLineType,
                                                        cellFormat.topBorderWidth,
                                                        cellFormat.topBorderColor
                                                    );
                                                    if (topBorderStyle) {
                                                        cellStyle.borderTop = topBorderStyle;
                                                    } else {
                                                        cellStyle.borderTop = '1px solid var(--vscode-panel-border)';
                                                    }
                                                }
                                                if (cellFormat.bottomBorder === 1) {
                                                    const bottomBorderStyle = getBorderStyle(
                                                        cellFormat.bottomBorder,
                                                        cellFormat.bottomBorderLineType,
                                                        cellFormat.bottomBorderWidth,
                                                        cellFormat.bottomBorderColor
                                                    );
                                                    if (bottomBorderStyle) {
                                                        cellStyle.borderBottom = bottomBorderStyle;
                                                    } else {
                                                        cellStyle.borderBottom = '1px solid var(--vscode-panel-border)';
                                                    }
                                                }
                                                if (cellFormat.rightBorder === 1) {
                                                    const rightBorderStyle = getBorderStyle(
                                                        cellFormat.rightBorder,
                                                        cellFormat.rightBorderLineType,
                                                        cellFormat.rightBorderWidth,
                                                        cellFormat.rightBorderColor
                                                    );
                                                    if (rightBorderStyle) {
                                                        cellStyle.borderRight = rightBorderStyle;
                                                    } else {
                                                        cellStyle.borderRight = '1px solid var(--vscode-panel-border)';
                                                    }
                                                }
                                            }
                                        }
                                        
                                        // Стили шрифта
                                        const contentStyle: React.CSSProperties = {};
                                        
                                        // Для режима Auto с перекрытием текста используем абсолютное позиционирование
                                        // чтобы текст мог перекрывать соседние ячейки
                                        const isMerged = merged.colspan > 1 || merged.rowspan > 1;
                                        const textPlacement = cellFormat?.textPlacement;
                                        const isAutoMode = !textPlacement || textPlacement === 'Auto' || textPlacement === 'Normal';
                                        
                                        if (isAutoMode && !isMerged) {
                                            // Абсолютное позиционирование позволяет тексту перекрывать соседние ячейки
                                            // даже если родительский контейнер имеет overflow: auto
                                            contentStyle.position = 'absolute';
                                            contentStyle.left = '0';
                                            contentStyle.top = '0';
                                            contentStyle.whiteSpace = 'nowrap';
                                            contentStyle.zIndex = 2; // Чтобы текст был поверх соседних ячеек
                                            contentStyle.minWidth = '100%'; // Минимальная ширина равна ширине ячейки
                                        }
                                        
                                        if (cellFont) {
                                            if (cellFont['$_faceName']) {
                                                contentStyle.fontFamily = cellFont['$_faceName'];
                                            }
                                            if (cellFont['$_height']) {
                                                contentStyle.fontSize = `${cellFont['$_height']}pt`;
                                            }
                                            if (cellFont['$_bold'] === 'true') {
                                                contentStyle.fontWeight = 'bold';
                                            }
                                            if (cellFont['$_italic'] === 'true') {
                                                contentStyle.fontStyle = 'italic';
                                            }
                                            if (cellFont['$_underline'] === 'true') {
                                                contentStyle.textDecoration = 'underline';
                                            }
                                            if (cellFont['$_strikeout'] === 'true') {
                                                contentStyle.textDecoration = contentStyle.textDecoration ? 
                                                    `${contentStyle.textDecoration} line-through` : 'line-through';
                                            }
                                            if (cellFont['$_scale']) {
                                                const scale = parseFloat(cellFont['$_scale']) || 100;
                                                contentStyle.transform = `scale(${scale / 100})`;
                                                contentStyle.transformOrigin = 'top left';
                                            }
                                        }

                                        return (
                                            <td
                                                key={col}
                                                className={`template-table-cell ${selected ? 'selected' : ''} ${isFrozenColumn(col) ? 'frozen' : ''} ${hasNote ? 'has-note' : ''} ${isMerged ? 'merged-cell' : ''} ${boundaryClasses.join(' ')}`}
                                                colSpan={merged.colspan}
                                                rowSpan={merged.rowspan}
                                                onClick={(e) => handleCellClick(rowIndex, col, e)}
                                                onMouseDown={(e) => handleMouseDown(rowIndex, col, e)}
                                                onMouseEnter={(e) => {
                                                    e.stopPropagation();
                                                    handleRowMouseEnter(rowIndex);
                                                }}
                                                onMouseLeave={(e) => {
                                                    // Не обрабатываем, если переходим на другую ячейку в той же строке
                                                    const relatedTarget = e.relatedTarget;
                                                    if (!relatedTarget || 
                                                        typeof relatedTarget !== 'object' || 
                                                        !('closest' in relatedTarget) || 
                                                        typeof (relatedTarget as any).closest !== 'function' ||
                                                        !(relatedTarget as HTMLElement).closest('tr')) {
                                                        handleRowMouseLeave(e);
                                                    }
                                                }}
                                                data-row={rowIndex}
                                                data-col={col}
                                                data-fill-pattern={fillPattern}
                                                data-text-placement={cellFormat?.textPlacement || 'Auto'}
                                                style={cellStyle}
                                                title={namedAreaNames ? `Именованные области: ${namedAreaNames}` : undefined}
                                            >
                                                <div
                                                    className="template-cell-content"
                                                    contentEditable={merged.isStart}
                                                    suppressContentEditableWarning
                                                    style={contentStyle}
                                                    onBlur={(e) => {
                                                        if (merged.isStart) {
                                                            const newText = e.currentTarget.textContent || '';
                                                            handleCellContentChange(rowIndex, col, newText);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (merged.isStart && e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            // Переход к следующей строке
                                                            onCellSelect({ row: rowIndex + 1, col });
                                                        }
                                                    }}
                                                >
                                                    {content}
                                                </div>
                                                {hasNote && showNotes && (
                                                    <div className="template-cell-note-indicator" title="Примечание">
                                                        📌
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};


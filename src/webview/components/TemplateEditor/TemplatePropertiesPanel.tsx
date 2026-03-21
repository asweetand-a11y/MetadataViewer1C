/**
 * Панель свойств ячейки для редактора макетов 1С
 */

import React, { useState, useMemo } from 'react';
import { CellPosition, CellRange, NamedArea } from '../../../templatInterfaces';
import { FillPatternToggle } from './FillPatternToggle';
import { CellNoteDialog } from './CellNoteDialog';
import { FormatBuilder } from './FormatBuilder';
import { ColorPickerDialog } from './ColorPickerDialog';
import { FontBuilderDialog } from './FontBuilderDialog';
import { getCellFillPattern, findCellByPosition, extractTextFromTemplateTextData, getEffectiveFormat, getEffectiveFont, formatBorderLineCode, updateCellFormat, updateCellFont, updateCellAlignment, updateCellColors, extractTemplateFormatColorString } from '../../../utils/templateUtils';
import { SPREADSHEET_CELL_LINE_TYPE_OPTIONS_WITH_NONE } from '../../../utils/spreadsheetCellLineType';
import { TemplateDocument, TemplateFormat, TemplateFont, TemplateTextData } from '../../../templatInterfaces';
import './template-editor.css';

interface TemplatePropertiesPanelProps {
    templateDocument: TemplateDocument;
    selectedCell: CellPosition | null;
    selectedRange: CellRange | null;
    onFillPatternToggle?: (pattern: 'parameter' | 'template') => void;
    onParameterNameChange?: (name: string) => void;
    onTemplateTextChange?: (text: string) => void;
    onCreateNote?: (note: any) => void;
    onUpdateNote?: (note: any) => void;
    onDeleteNote?: () => void;
    onDetailParameterChange?: (detailParameter: string) => void;
    onFormatChange?: (updatedDocument: TemplateDocument) => void;
    onFontChange?: (updatedDocument: TemplateDocument) => void;
    onAlignmentChange?: (horizontal?: string, vertical?: string) => void;
    onColorsChange?: (textColor?: string, backColor?: string) => void;
    onClose?: () => void;
}

export const TemplatePropertiesPanel: React.FC<TemplatePropertiesPanelProps> = ({
    templateDocument,
    selectedCell,
    selectedRange,
    onFillPatternToggle,
    onParameterNameChange,
    onTemplateTextChange,
    onCreateNote,
    onUpdateNote,
    onDeleteNote,
    onDetailParameterChange,
    onFormatChange,
    onFontChange,
    onAlignmentChange,
    onColorsChange,
    onClose
}) => {
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<any>(null);
    const [isFormatBuilderOpen, setIsFormatBuilderOpen] = useState(false);
    const [formatBuilderType, setFormatBuilderType] = useState<'number' | 'date' | 'boolean' | 'string'>('number');
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [colorPickerMode, setColorPickerMode] = useState<'text' | 'back' | 'border'>('text');
    const [isFontBuilderOpen, setIsFontBuilderOpen] = useState(false);

    const selRow = selectedCell?.row;
    const selCol = selectedCell?.col;
    const effectiveFormat = useMemo(() => {
        if (selRow === undefined || selCol === undefined) {
            return null;
        }
        return getEffectiveFormat(templateDocument, selRow, selCol);
    }, [templateDocument, selRow, selCol]);

    const effectiveFont = useMemo(() => {
        if (selRow === undefined || selCol === undefined) {
            return null;
        }
        return getEffectiveFont(templateDocument, selRow, selCol);
    }, [templateDocument, selRow, selCol]);

    if (!selectedCell) {
        return (
            <div className="template-properties-empty">
                Выберите ячейку для редактирования свойств
            </div>
        );
    }

    const cell = findCellByPosition(templateDocument, selectedCell.row, selectedCell.col);
    const fillPattern = getCellFillPattern(templateDocument, selectedCell.row, selectedCell.col);
    
    let parameterName = '';
    let templateText = '';
    let detailParameter = '';
    let note: any = null;

    if (cell && cell.c) {
        if (fillPattern === 'parameter' && cell.c.parameter) {
            parameterName = cell.c.parameter;
        } else if (fillPattern === 'template' && cell.c.tl) {
            templateText = extractTextFromTemplateTextData(cell.c.tl);
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
        if (!selectedCell) return;
        setEditingNote(null);
        setIsNoteDialogOpen(true);
    };

    const handleEditNote = () => {
        if (!note) return;
        setEditingNote(note);
        setIsNoteDialogOpen(true);
    };

    const handleSaveNote = (note: any) => {
        if (editingNote) {
            onUpdateNote?.(note);
        } else {
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

    return (
        <div className="template-properties-panel">
            <div className="template-properties-header">
                <h3>Свойства ячейки</h3>
                {onClose && (
                    <button 
                        className="template-properties-close-button"
                        title="Закрыть панель свойств"
                        onClick={onClose}
                    >
                        ×
                    </button>
                )}
                {isRangeSelected && (
                    <div className="template-properties-range-info">
                        Выбран диапазон: {selectedRange.endRow - selectedRange.startRow + 1} × {selectedRange.endCol - selectedRange.startCol + 1}
                    </div>
                )}
            </div>

            <div className="template-properties-content">
                <div className="template-properties-section">
                    <div className="template-properties-position">
                        <div>Строка: {selectedCell.row + 1}</div>
                        <div>Колонка: {selectedCell.col + 1}</div>
                    </div>
                </div>

                <div className="template-properties-section">
                    <FillPatternToggle
                        fillPattern={fillPattern}
                        onToggle={(pattern) => {
                            onFillPatternToggle?.(pattern);
                        }}
                        parameterName={parameterName}
                        templateText={templateText}
                        onParameterNameChange={onParameterNameChange}
                        onTemplateTextChange={onTemplateTextChange}
                    />
                </div>

                <div className="template-properties-section">
                    <h4>Детальный параметр</h4>
                    <input
                        type="text"
                        value={detailParameter}
                        onChange={(e) => onDetailParameterChange?.(e.target.value)}
                        placeholder="Параметр расшифровки"
                        className="template-properties-input"
                    />
                </div>

                <div className="template-properties-section">
                    <h4>Примечание</h4>
                    {note ? (
                        <div className="template-properties-note-display">
                            <div className="template-properties-note-text">
                                {note.text?.['v8:item']?.['v8:content'] || 
                                 note.text?.['v8:content'] || 
                                 note.text || 
                                 'Без текста'}
                            </div>
                            <div className="template-properties-note-actions">
                                <button
                                    className="template-properties-button-small"
                                    onClick={handleEditNote}
                                    title="Редактировать"
                                >
                                    ✏ Редактировать
                                </button>
                                <button
                                    className="template-properties-button-small"
                                    onClick={handleDeleteNote}
                                    title="Удалить"
                                >
                                    × Удалить
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            className="template-properties-button"
                            onClick={handleCreateNote}
                            title="Создать примечание к ячейке"
                        >
                            Создать примечание
                        </button>
                    )}
                </div>

                <div className="template-properties-section">
                    <h4>Форматирование</h4>
                    <div className="template-properties-format-edit">
                            <div className="template-properties-format-field">
                                <label>Ширина:</label>
                                    <input
                                        type="text"
                                        value={effectiveFormat?.width || ''}
                                        onChange={(e) => {
                                            const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, { width: e.target.value });
                                            onFormatChange?.(updated);
                                        }}
                                        placeholder="по умолчанию"
                                        className="template-properties-input"
                                    />
                            </div>
                            <div className="template-properties-format-field">
                                <label>Высота:</label>
                                    <input
                                        type="text"
                                        value={effectiveFormat?.height || ''}
                                        onChange={(e) => {
                                            const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, { height: e.target.value });
                                            onFormatChange?.(updated);
                                        }}
                                        placeholder="по умолчанию"
                                        className="template-properties-input"
                                    />
                            </div>
                            <div className="template-properties-format-field">
                                <label>Горизонтальное выравнивание:</label>
                                <select
                                    value={effectiveFormat?.horizontalAlignment || ''}
                                    onChange={(e) => {
                                        onAlignmentChange?.(e.target.value || undefined);
                                    }}
                                    className="template-properties-input"
                                >
                                    <option value="">По умолчанию</option>
                                    <option value="Left">Слева</option>
                                    <option value="Center">По центру</option>
                                    <option value="Right">Справа</option>
                                    <option value="Justify">По ширине</option>
                                </select>
                            </div>
                            <div className="template-properties-format-field">
                                <label>Вертикальное выравнивание:</label>
                                <select
                                    value={effectiveFormat?.verticalAlignment || ''}
                                    onChange={(e) => {
                                        onAlignmentChange?.(effectiveFormat?.horizontalAlignment, e.target.value || undefined);
                                    }}
                                    className="template-properties-input"
                                >
                                    <option value="">По умолчанию</option>
                                    <option value="Top">Сверху</option>
                                    <option value="Center">По центру</option>
                                    <option value="Bottom">Снизу</option>
                                </select>
                            </div>
                            <div className="template-properties-format-field">
                                <label>Размещение текста:</label>
                                <select
                                    value={effectiveFormat?.textPlacement || ''}
                                    onChange={(e) => {
                                        const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, { textPlacement: e.target.value || undefined });
                                        onFormatChange?.(updated);
                                    }}
                                    className="template-properties-input"
                                >
                                    <option value="">По умолчанию</option>
                                    <option value="Wrap">Перенос</option>
                                    <option value="Clip">Обрезка</option>
                                    <option value="None">Нет</option>
                                </select>
                            </div>
                            <div className="template-properties-format-field">
                                <label>Ориентация текста (°):</label>
                                <select
                                    value={effectiveFormat?.textOrientation !== undefined ? String(effectiveFormat.textOrientation) : ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, {
                                            textOrientation: val === '' ? undefined : parseInt(val, 10)
                                        });
                                        onFormatChange?.(updated);
                                    }}
                                    className="template-properties-input"
                                >
                                    <option value="">0 (горизонтально)</option>
                                    <option value="90">90 (вертикально)</option>
                                    <option value="180">180</option>
                                    <option value="270">270</option>
                                </select>
                            </div>
                            <div className="template-properties-format-field">
                                <label>Отступ:</label>
                                <input
                                    type="number"
                                    value={effectiveFormat?.indent ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, {
                                            indent: val === '' ? undefined : parseInt(val, 10)
                                        });
                                        onFormatChange?.(updated);
                                    }}
                                    placeholder="0"
                                    className="template-properties-input"
                                    min="0"
                                />
                            </div>
                            <div className="template-properties-format-field">
                                <label>Автоотступ:</label>
                                <input
                                    type="number"
                                    value={effectiveFormat?.autoIndent ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, {
                                            autoIndent: val === '' ? undefined : parseInt(val, 10)
                                        });
                                        onFormatChange?.(updated);
                                    }}
                                    placeholder="0"
                                    className="template-properties-input"
                                    min="0"
                                />
                            </div>
                            <div className="template-properties-format-field">
                                <label>Отступы (Слева / Справа / Сверху / Снизу):</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                    <input
                                        type="number"
                                        value={effectiveFormat?.leftMargin ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, {
                                                leftMargin: val === '' ? undefined : parseInt(val, 10)
                                            });
                                            onFormatChange?.(updated);
                                        }}
                                        placeholder="Слева"
                                        className="template-properties-input"
                                        min="0"
                                        title="Слева"
                                    />
                                    <input
                                        type="number"
                                        value={effectiveFormat?.rightMargin ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, {
                                                rightMargin: val === '' ? undefined : parseInt(val, 10)
                                            });
                                            onFormatChange?.(updated);
                                        }}
                                        placeholder="Справа"
                                        className="template-properties-input"
                                        min="0"
                                        title="Справа"
                                    />
                                    <input
                                        type="number"
                                        value={effectiveFormat?.topMargin ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, {
                                                topMargin: val === '' ? undefined : parseInt(val, 10)
                                            });
                                            onFormatChange?.(updated);
                                        }}
                                        placeholder="Сверху"
                                        className="template-properties-input"
                                        min="0"
                                        title="Сверху"
                                    />
                                    <input
                                        type="number"
                                        value={effectiveFormat?.bottomMargin ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, {
                                                bottomMargin: val === '' ? undefined : parseInt(val, 10)
                                            });
                                            onFormatChange?.(updated);
                                        }}
                                        placeholder="Снизу"
                                        className="template-properties-input"
                                        min="0"
                                        title="Снизу"
                                    />
                                </div>
                            </div>
                            <div className="template-properties-format-field">
                                <label>Границы (тип линии по сторонам, как в 1С):</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                                    {(
                                        [
                                            ['Граница слева', 'leftBorder'],
                                            ['Граница сверху', 'topBorder'],
                                            ['Граница справа', 'rightBorder'],
                                            ['Граница снизу', 'bottomBorder'],
                                            ['Обвести (рамка)', 'border'],
                                        ] as const
                                    ).map(([label, field]) => (
                                        <label key={field} style={{ fontSize: 'calc(var(--vscode-font-size) - 1px)' }}>
                                            {label}
                                            <select
                                                className="template-properties-input"
                                                style={{ marginTop: '4px', width: '100%' }}
                                                value={formatBorderLineCode(effectiveFormat?.[field])}
                                                title="Коды 0…6 — SpreadsheetDocumentCellLineType (EDT)"
                                                onChange={(e) => {
                                                    const v = parseInt(e.target.value, 10);
                                                    const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, {
                                                        [field]: v,
                                                    });
                                                    onFormatChange?.(updated);
                                                }}
                                            >
                                                {SPREADSHEET_CELL_LINE_TYPE_OPTIONS_WITH_NONE.map((o) => (
                                                    <option key={o.value} value={o.value}>
                                                        — {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    ))}
                                    <div className="template-properties-format-field" style={{ marginBottom: 0 }}>
                                        <label>Цвет рамки:</label>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                                            <input
                                                type="text"
                                                value={extractTemplateFormatColorString(effectiveFormat?.borderColor) || ''}
                                                readOnly
                                                placeholder="Авто"
                                                className="template-properties-input"
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                className="template-properties-button-small"
                                                type="button"
                                                onClick={() => {
                                                    setColorPickerMode('border');
                                                    setIsColorPickerOpen(true);
                                                }}
                                                title="Выбрать цвет рамки"
                                            >
                                                🎨
                                            </button>
                                            <button
                                                className="template-properties-button-small"
                                                type="button"
                                                title="Сбросить (авто)"
                                                onClick={() => {
                                                    const updated = updateCellFormat(
                                                        templateDocument,
                                                        selectedCell.row,
                                                        selectedCell.col,
                                                        { borderColor: undefined }
                                                    );
                                                    onFormatChange?.(updated);
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="template-properties-format-field">
                                <label>Цвет текста:</label>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={extractTemplateFormatColorString(effectiveFormat?.textColor)}
                                        readOnly
                                        placeholder="не задан"
                                        className="template-properties-input"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        className="template-properties-button-small"
                                        onClick={() => {
                                            setColorPickerMode('text');
                                            setIsColorPickerOpen(true);
                                        }}
                                        title="Выбрать цвет текста"
                                    >
                                        🎨
                                    </button>
                                </div>
                            </div>
                            <div className="template-properties-format-field">
                                <label>Цвет фона:</label>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={extractTemplateFormatColorString(effectiveFormat?.backColor)}
                                        readOnly
                                        placeholder="не задан"
                                        className="template-properties-input"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        className="template-properties-button-small"
                                        onClick={() => {
                                            setColorPickerMode('back');
                                            setIsColorPickerOpen(true);
                                        }}
                                        title="Выбрать цвет фона"
                                    >
                                        🎨
                                    </button>
                                </div>
                            </div>
                            <div className="template-properties-format-field">
                                <label>Формат чисел/дат:</label>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={effectiveFormat?.format?.['v8:item']?.['v8:content'] || ''}
                                        readOnly
                                        placeholder="Не задан"
                                        className="template-properties-input"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        className="template-properties-button-small"
                                        onClick={() => {
                                            setFormatBuilderType('number');
                                            setIsFormatBuilderOpen(true);
                                        }}
                                        title="Конструктор формата числа"
                                    >
                                        N
                                    </button>
                                    <button
                                        className="template-properties-button-small"
                                        onClick={() => {
                                            setFormatBuilderType('date');
                                            setIsFormatBuilderOpen(true);
                                        }}
                                        title="Конструктор формата даты"
                                    >
                                        Д
                                    </button>
                                </div>
                            </div>
                    </div>
                </div>

                <div className="template-properties-section">
                    <h4>Шрифт</h4>
                    <div className="template-properties-font-edit">
                        <button
                            className="template-properties-button"
                            onClick={() => setIsFontBuilderOpen(true)}
                            title="Открыть конструктор шрифта"
                            style={{ marginBottom: '12px' }}
                        >
                            ⚙️ Конструктор шрифта
                        </button>
                        {effectiveFont ? (
                            <>
                                <div className="template-properties-format-field">
                                <label>Гарнитура:</label>
                                <input
                                    type="text"
                                    value={effectiveFont['$_faceName'] || ''}
                                    onChange={(e) => {
                                        const updated = updateCellFont(templateDocument, selectedCell.row, selectedCell.col, { '$_faceName': e.target.value });
                                        onFontChange?.(updated);
                                    }}
                                    placeholder="Arial, Times New Roman и т.д."
                                    className="template-properties-input"
                                />
                            </div>
                            <div className="template-properties-format-field">
                                <label>Размер:</label>
                                <input
                                    type="number"
                                    value={effectiveFont['$_height'] || ''}
                                    onChange={(e) => {
                                        const updated = updateCellFont(templateDocument, selectedCell.row, selectedCell.col, { '$_height': parseFloat(e.target.value) || 0 });
                                        onFontChange?.(updated);
                                    }}
                                    placeholder="10"
                                    className="template-properties-input"
                                    min="1"
                                    max="72"
                                />
                            </div>
                            <div className="template-properties-format-field">
                                <label>Стиль:</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                    <label style={{ fontSize: 'calc(var(--vscode-font-size) - 1px)' }}>
                                        <input
                                            type="checkbox"
                                            checked={effectiveFont['$_bold'] === 'true'}
                                            onChange={(e) => {
                                                const updated = updateCellFont(templateDocument, selectedCell.row, selectedCell.col, { '$_bold': e.target.checked ? 'true' : 'false' });
                                                onFontChange?.(updated);
                                            }}
                                            style={{ marginRight: '4px' }}
                                        />
                                        Жирный
                                    </label>
                                    <label style={{ fontSize: 'calc(var(--vscode-font-size) - 1px)' }}>
                                        <input
                                            type="checkbox"
                                            checked={effectiveFont['$_italic'] === 'true'}
                                            onChange={(e) => {
                                                const updated = updateCellFont(templateDocument, selectedCell.row, selectedCell.col, { '$_italic': e.target.checked ? 'true' : 'false' });
                                                onFontChange?.(updated);
                                            }}
                                            style={{ marginRight: '4px' }}
                                        />
                                        Курсив
                                    </label>
                                    <label style={{ fontSize: 'calc(var(--vscode-font-size) - 1px)' }}>
                                        <input
                                            type="checkbox"
                                            checked={effectiveFont['$_underline'] === 'true'}
                                            onChange={(e) => {
                                                const updated = updateCellFont(templateDocument, selectedCell.row, selectedCell.col, { '$_underline': e.target.checked ? 'true' : 'false' });
                                                onFontChange?.(updated);
                                            }}
                                            style={{ marginRight: '4px' }}
                                        />
                                        Подчеркнутый
                                    </label>
                                    <label style={{ fontSize: 'calc(var(--vscode-font-size) - 1px)' }}>
                                        <input
                                            type="checkbox"
                                            checked={effectiveFont['$_strikeout'] === 'true'}
                                            onChange={(e) => {
                                                const updated = updateCellFont(templateDocument, selectedCell.row, selectedCell.col, { '$_strikeout': e.target.checked ? 'true' : 'false' });
                                                onFontChange?.(updated);
                                            }}
                                            style={{ marginRight: '4px' }}
                                        />
                                        Зачеркнутый
                                    </label>
                                </div>
                            </div>
                            {effectiveFont['$_scale'] && (
                                <div className="template-properties-format-field">
                                    <label>Масштаб:</label>
                                    <input
                                        type="text"
                                        value={effectiveFont['$_scale'] || ''}
                                        readOnly
                                        className="template-properties-input"
                                    />
                                </div>
                            )}
                            </>
                        ) : (
                            <div className="template-properties-placeholder-small">
                                Шрифт по умолчанию
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <CellNoteDialog
                isOpen={isNoteDialogOpen}
                existingNote={editingNote}
                defaultCoordinates={selectedCell ? {
                    beginRow: selectedCell.row,
                    endRow: selectedCell.row,
                    beginColumn: selectedCell.col,
                    endColumn: selectedCell.col
                } : undefined}
                onSave={handleSaveNote}
                onCancel={() => {
                    setIsNoteDialogOpen(false);
                    setEditingNote(null);
                }}
            />

            {isFormatBuilderOpen && selectedCell && (
                <FormatBuilder
                    formatType={formatBuilderType}
                    existingFormat={effectiveFormat?.format}
                    onSave={(format: TemplateTextData) => {
                        const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, { format });
                        onFormatChange?.(updated);
                        setIsFormatBuilderOpen(false);
                    }}
                    onCancel={() => setIsFormatBuilderOpen(false)}
                />
            )}
            <ColorPickerDialog
                isOpen={isColorPickerOpen}
                currentColor={
                    colorPickerMode === 'text'
                        ? extractTemplateFormatColorString(effectiveFormat?.textColor)
                        : colorPickerMode === 'back'
                          ? extractTemplateFormatColorString(effectiveFormat?.backColor)
                          : extractTemplateFormatColorString(effectiveFormat?.borderColor)
                }
                title={
                    colorPickerMode === 'text'
                        ? 'Выбор цвета текста'
                        : colorPickerMode === 'back'
                          ? 'Выбор цвета фона'
                          : 'Выбор цвета рамки'
                }
                onSave={(color) => {
                    if (!selectedCell) {
                        setIsColorPickerOpen(false);
                        return;
                    }
                    if (colorPickerMode === 'border') {
                        const updated = updateCellFormat(templateDocument, selectedCell.row, selectedCell.col, {
                            borderColor: color || undefined,
                        });
                        onFormatChange?.(updated);
                    } else if (colorPickerMode === 'text') {
                        onColorsChange?.(color || undefined, effectiveFormat?.backColor);
                    } else {
                        onColorsChange?.(effectiveFormat?.textColor, color || undefined);
                    }
                    setIsColorPickerOpen(false);
                }}
                onCancel={() => setIsColorPickerOpen(false)}
            />
            {selectedCell && (
                <FontBuilderDialog
                    isOpen={isFontBuilderOpen}
                    currentFont={effectiveFont || undefined}
                    onSave={(fontData) => {
                        const updated = updateCellFont(templateDocument, selectedCell.row, selectedCell.col, fontData);
                        onFontChange?.(updated);
                        setIsFontBuilderOpen(false);
                    }}
                    onCancel={() => setIsFontBuilderOpen(false)}
                />
            )}
        </div>
    );
};


/**
 * Диалог выбора цвета для текста или фона ячейки
 * Поддерживает HEX коды и стили 1С (StyleColors)
 * Список стилей по схеме ЦветаСтиля платформы 1С:Предприятие
 */

import React, { useState, useEffect } from 'react';
import './template-editor.css';

interface ColorPickerDialogProps {
    isOpen: boolean;
    currentColor?: string;
    title: string;
    onSave: (color: string) => void;
    onCancel: () => void;
}

// Палитра основных цветов
const COLOR_PALETTE = [
    '#000000', '#FFFFFF', '#808080', '#C0C0C0',
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#800000', '#008000',
    '#000080', '#808000', '#800080', '#008080',
    '#FF8080', '#80FF80', '#8080FF', '#FFCC00'
];

/** Стили 1С (StyleColors) с русским переводом. Источник: ЦветаСтиля платформы 1С */
const STYLE_COLORS: Array<{ id: string; label: string }> = [
    { id: 'style:FormTextColor', label: 'Цвет текста формы' },
    { id: 'style:FormBackColor', label: 'Цвет фона формы' },
    { id: 'style:FieldTextColor', label: 'Цвет текста поля' },
    { id: 'style:FieldBackColor', label: 'Цвет фона поля' },
    { id: 'style:ToolTipTextColor', label: 'Цвет текста подсказки' },
    { id: 'style:ToolTipBackColor', label: 'Цвет фона подсказки' },
    { id: 'style:NegativeTextColor', label: 'Цвет отрицательного числа' },
    { id: 'style:SpecialTextColor', label: 'Цвет особого текста' },
    { id: 'style:FieldSelectedTextColor', label: 'Цвет текста выделения поля' },
    { id: 'style:FieldSelectionBackColor', label: 'Цвет фона выделения поля' },
    { id: 'style:ButtonTextColor', label: 'Цвет текста кнопки' },
    { id: 'style:ButtonBackColor', label: 'Цвет фона кнопки' },
    { id: 'style:TableHeaderTextColor', label: 'Цвет текста шапки таблицы' },
    { id: 'style:TableHeaderBackColor', label: 'Цвет фона шапки таблицы' },
    { id: 'style:TableFooterTextColor', label: 'Цвет текста подвала таблицы' },
    { id: 'style:TableFooterBackColor', label: 'Цвет фона подвала таблицы' },
    { id: 'style:FieldAlternativeBackColor', label: 'Альтернативный цвет фона поля' },
    { id: 'style:ReportHeaderBackColor', label: 'Цвет фона шапки отчёта' },
    { id: 'style:ReportGroup1BackColor', label: 'Цвет фона группировки отчёта 1' },
    { id: 'style:ReportGroup2BackColor', label: 'Цвет фона группировки отчёта 2' },
    { id: 'style:BorderColor', label: 'Цвет рамки' },
    { id: 'style:ButtonBorderColor', label: 'Цвет рамки кнопки' },
    { id: 'style:ReportLineColor', label: 'Цвет линии отчёта' },
    { id: 'style:AccentColor', label: 'Цвет акцента' },
    { id: 'style:ActivityColor', label: 'Цвет активности' },
    { id: 'style:NavigationColor', label: 'Цвет навигации' },
    { id: 'style:AuxiliaryNavigationColor', label: 'Вспомогательный цвет навигации' },
    { id: 'style:ImportantColor', label: 'Важный цвет' }
];

export const ColorPickerDialog: React.FC<ColorPickerDialogProps> = ({
    isOpen,
    currentColor = '',
    title,
    onSave,
    onCancel
}) => {
    const [hexColor, setHexColor] = useState('');
    const [styleColor, setStyleColor] = useState('');
    const [mode, setMode] = useState<'hex' | 'style'>('hex');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (currentColor) {
                if (currentColor.startsWith('style:')) {
                    setMode('style');
                    setStyleColor(currentColor);
                    setHexColor('');
                } else if (currentColor.startsWith('#')) {
                    setMode('hex');
                    setHexColor(currentColor.toUpperCase());
                    setStyleColor('');
                } else {
                    // Попытка интерпретировать как HEX без #
                    const hexMatch = currentColor.match(/^[0-9A-Fa-f]{6}$/);
                    if (hexMatch) {
                        setMode('hex');
                        setHexColor('#' + currentColor.toUpperCase());
                        setStyleColor('');
                    } else {
                        setMode('hex');
                        setHexColor('');
                        setStyleColor('');
                    }
                }
            } else {
                setMode('hex');
                setHexColor('');
                setStyleColor('');
            }
        }
    }, [isOpen, currentColor]);

    const handleHexChange = (value: string) => {
        // Удаляем все символы кроме # и hex символов
        const cleaned = value.replace(/[^#0-9A-Fa-f]/g, '');
        if (cleaned.length <= 7) {
            setHexColor(cleaned.toUpperCase());
            setError(null);
        }
    };

    const handlePaletteClick = (color: string) => {
        setMode('hex');
        setHexColor(color.toUpperCase());
        setStyleColor('');
        setError(null);
    };

    const handleStyleClick = (styleId: string) => {
        setMode('style');
        setStyleColor(styleId);
        setHexColor('');
        setError(null);
    };

    const handleSave = () => {
        let colorToSave = '';
        
        if (mode === 'hex') {
            // Валидация HEX кода
            const hexRegex = /^#[0-9A-Fa-f]{6}$/;
            if (hexColor && !hexRegex.test(hexColor)) {
                setError('Некорректный HEX код. Используйте формат #RRGGBB');
                return;
            }
            colorToSave = hexColor || '';
        } else {
            // Валидация стиля
            if (styleColor && !styleColor.startsWith('style:')) {
                setError('Некорректный стиль. Должен начинаться с "style:"');
                return;
            }
            colorToSave = styleColor || '';
        }

        onSave(colorToSave);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSave();
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="color-picker-dialog-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onCancel();
                }
            }}
        >
            <div 
                className="color-picker-dialog"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                <div className="color-picker-dialog-header">
                    <h3>{title}</h3>
                    <button
                        className="color-picker-dialog-close"
                        onClick={onCancel}
                        title="Закрыть (Esc)"
                    >
                        ×
                    </button>
                </div>

                <div className="color-picker-dialog-content">
                    <div className="color-picker-mode-selector">
                        <button
                            className={`color-picker-mode-button ${mode === 'hex' ? 'active' : ''}`}
                            onClick={() => {
                                setMode('hex');
                                setError(null);
                            }}
                        >
                            HEX код
                        </button>
                        <button
                            className={`color-picker-mode-button ${mode === 'style' ? 'active' : ''}`}
                            onClick={() => {
                                setMode('style');
                                setError(null);
                            }}
                        >
                            Стиль 1С
                        </button>
                    </div>

                    {mode === 'hex' ? (
                        <div className="color-picker-hex-section">
                            <div className="color-picker-input-group">
                                <label>HEX код:</label>
                                <div className="color-picker-hex-input-wrapper">
                                    <input
                                        type="text"
                                        value={hexColor}
                                        onChange={(e) => handleHexChange(e.target.value)}
                                        placeholder="#000000"
                                        className="color-picker-input"
                                        maxLength={7}
                                    />
                                    {hexColor && (
                                        <div
                                            className="color-picker-preview"
                                            style={{ backgroundColor: hexColor }}
                                            title={hexColor}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="color-picker-palette-section">
                                <label>Палитра:</label>
                                <div className="color-picker-palette">
                                    {COLOR_PALETTE.map((color) => (
                                        <button
                                            key={color}
                                            className={`color-picker-palette-item ${hexColor.toUpperCase() === color.toUpperCase() ? 'selected' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => handlePaletteClick(color)}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="color-picker-style-section">
                            <div className="color-picker-input-group">
                                <label>Стиль 1С:</label>
                                <input
                                    type="text"
                                    value={styleColor}
                                    onChange={(e) => {
                                        setStyleColor(e.target.value);
                                        setError(null);
                                    }}
                                    placeholder="style:FormTextColor"
                                    className="color-picker-input"
                                />
                            </div>

                            <div className="color-picker-style-list">
                                <label>Стили 1С (ЦветаСтиля):</label>
                                <div className="color-picker-style-buttons">
                                    {STYLE_COLORS.map((style) => (
                                        <button
                                            key={style.id}
                                            className={`color-picker-style-button ${styleColor === style.id ? 'selected' : ''}`}
                                            onClick={() => handleStyleClick(style.id)}
                                            title={style.id}
                                        >
                                            {style.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="color-picker-error">
                            {error}
                        </div>
                    )}

                    <div className="color-picker-dialog-actions">
                        <button
                            className="color-picker-button color-picker-button-cancel"
                            onClick={onCancel}
                        >
                            Отмена
                        </button>
                        <button
                            className="color-picker-button color-picker-button-save"
                            onClick={handleSave}
                        >
                            ОК
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


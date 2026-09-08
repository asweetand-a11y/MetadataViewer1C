/**
 * Панель инструментов форматирования для редактора макетов 1С
 */

import React from 'react';
import './template-editor.css';
import { UiButton } from '../../ui';

import { CellRange } from '../../../templatInterfaces';

interface TemplateToolbarProps {
    onBold?: () => void;
    onItalic?: () => void;
    onUnderline?: () => void;
    onAlignLeft?: () => void;
    onAlignCenter?: () => void;
    onAlignRight?: () => void;
    onMergeCells?: () => void;
    onUnmergeCells?: () => void;
    onAddRow?: () => void;
    onDeleteRow?: () => void;
    onAddColumn?: () => void;
    onDeleteColumn?: () => void;
    showGrid?: boolean;
    onToggleGrid?: () => void;
    showHeaders?: boolean;
    onToggleHeaders?: () => void;
    zoom?: number;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onZoomReset?: () => void;
    showNotes?: boolean;
    onToggleNotes?: () => void;
    onAssignName?: () => void;
    onRemoveName?: () => void;
    selectedRange?: CellRange | null;
    onShowProperties?: () => void;
    showPropertiesPanel?: boolean;
    onShowNamedAreas?: () => void;
    showNamedAreaBorders?: boolean;
    onToggleNamedAreaBorders?: () => void;
}

export const TemplateToolbar: React.FC<TemplateToolbarProps> = ({
    onBold,
    onItalic,
    onUnderline,
    onAlignLeft,
    onAlignCenter,
    onAlignRight,
    onMergeCells,
    onUnmergeCells,
    onAddRow,
    onDeleteRow,
    onAddColumn,
    onDeleteColumn,
    showGrid = true,
    onToggleGrid,
    showHeaders = true,
    onToggleHeaders,
    zoom = 1.0,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    showNotes = true,
    onToggleNotes,
    onAssignName,
    onRemoveName,
    selectedRange,
    onShowProperties,
    showPropertiesPanel = false,
    onShowNamedAreas,
    showNamedAreaBorders = true,
    onToggleNamedAreaBorders
}) => {
    // Определяем, можно ли назначить имя (выделен диапазон строк или колонок)
    // Можно назначить имя при любом выделении (даже при выделении диапазона)
    const canAssignName = selectedRange !== null;
    return (
        <div className="template-toolbar">
            <div className="template-toolbar-group">
                <UiButton secondary title="Жирный (Ctrl+B)" onClick={onBold}>
                    <strong>B</strong>
                </UiButton>
                <button 
                    className="template-toolbar-button" 
                    title="Курсив (Ctrl+I)"
                    onClick={onItalic}
                >
                    <em>I</em>
                </button>
                <button 
                    className="template-toolbar-button" 
                    title="Подчеркнутый (Ctrl+U)"
                    onClick={onUnderline}
                >
                    <u>U</u>
                </button>
            </div>
            
            <div className="template-toolbar-separator"></div>
            
            <div className="template-toolbar-group">
                <button 
                    className="template-toolbar-button" 
                    title="Выравнивание по левому краю"
                    onClick={onAlignLeft}
                >
                    ⬅
                </button>
                <button 
                    className="template-toolbar-button" 
                    title="Выравнивание по центру"
                    onClick={onAlignCenter}
                >
                    ⬌
                </button>
                <button 
                    className="template-toolbar-button" 
                    title="Выравнивание по правому краю"
                    onClick={onAlignRight}
                >
                    ➡
                </button>
            </div>
            
            <div className="template-toolbar-separator"></div>
            
            <div className="template-toolbar-group">
                <button 
                    className="template-toolbar-button" 
                    title="Объединить ячейки"
                    onClick={onMergeCells}
                >
                    ⬜
                </button>
                <button 
                    className="template-toolbar-button" 
                    title="Разъединить ячейки"
                    onClick={onUnmergeCells}
                >
                    ⬛
                </button>
            </div>
            
            <div className="template-toolbar-separator"></div>
            
            <div className="template-toolbar-group">
                <button 
                    className="template-toolbar-button" 
                    title="Добавить строку"
                    onClick={onAddRow}
                >
                    +Строка
                </button>
                <button 
                    className="template-toolbar-button" 
                    title="Удалить строку"
                    onClick={onDeleteRow}
                >
                    -Строка
                </button>
                <button 
                    className="template-toolbar-button" 
                    title="Добавить колонку"
                    onClick={onAddColumn}
                >
                    +Колонка
                </button>
                <button 
                    className="template-toolbar-button" 
                    title="Удалить колонку"
                    onClick={onDeleteColumn}
                >
                    -Колонка
                </button>
            </div>
            
            <div className="template-toolbar-separator"></div>
            
            <div className="template-toolbar-group">
                <button 
                    className={`template-toolbar-button ${canAssignName ? '' : 'disabled'}`}
                    title={canAssignName ? "Назначить имя выделенным строкам/колонкам" : "Выделите строки или колонки для назначения имени"}
                    onClick={canAssignName ? onAssignName : undefined}
                    disabled={!canAssignName}
                >
                    🏷️ Назначить имя
                </button>
                <button 
                    className="template-toolbar-button"
                    title="Удалить имя выделенных строк/колонок"
                    onClick={onRemoveName}
                    disabled={!selectedRange}
                >
                    ❌ Удалить имя
                </button>
            </div>
            
            <div className="template-toolbar-separator"></div>
            
            <div className="template-toolbar-group">
                <button 
                    className={`template-toolbar-button ${showPropertiesPanel ? 'active' : ''}`}
                    title={showPropertiesPanel ? "Скрыть панель свойств ячейки" : "Показать панель свойств ячейки"}
                    onClick={onShowProperties}
                >
                    ⚙️ Свойства
                </button>
            </div>
            
            <div className="template-toolbar-separator"></div>
            
            <div className="template-toolbar-group">
                <button 
                    className="template-toolbar-button"
                    title="Управление именованными областями"
                    onClick={onShowNamedAreas}
                >
                    📋 Именованные области
                </button>
            </div>
            
            <div className="template-toolbar-separator"></div>
            
            <div className="template-toolbar-group">
                <button 
                    className={`template-toolbar-button ${showGrid ? 'active' : ''}`}
                    title="Показать/скрыть сетку"
                    onClick={onToggleGrid}
                >
                    ⚏ Сетка
                </button>
                <button 
                    className={`template-toolbar-button ${showHeaders ? 'active' : ''}`}
                    title="Показать/скрыть заголовки"
                    onClick={onToggleHeaders}
                >
                    ⚏ Заголовки
                </button>
                <button 
                    className={`template-toolbar-button ${showNotes ? 'active' : ''}`}
                    title="Показать/скрыть примечания"
                    onClick={onToggleNotes}
                >
                    📌 Примечания
                </button>
                <button 
                    className={`template-toolbar-button ${showNamedAreaBorders ? 'active' : ''}`}
                    title="Показать/скрыть красную сетку именованных областей"
                    onClick={onToggleNamedAreaBorders}
                >
                    🔴 Красная сетка
                </button>
            </div>
            
            <div className="template-toolbar-separator"></div>
            
            <div className="template-toolbar-group">
                <button 
                    className="template-toolbar-button" 
                    title="Уменьшить масштаб"
                    onClick={onZoomOut}
                >
                    ➖
                </button>
                <span className="template-toolbar-zoom" title="Масштаб">
                    {Math.round(zoom * 100)}%
                </span>
                <button 
                    className="template-toolbar-button" 
                    title="Увеличить масштаб"
                    onClick={onZoomIn}
                >
                    ➕
                </button>
                <button 
                    className="template-toolbar-button" 
                    title="Сбросить масштаб"
                    onClick={onZoomReset}
                >
                    🔍
                </button>
            </div>
        </div>
    );
};


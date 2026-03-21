/**
 * Тип линии границы ячейки табличного документа / макета MXL.
 *
 * В XML (`leftBorder`, `topBorder`, …, `border`) хранится целое число без перечисления в XSD:
 * `resources/xsd/http_v8.1c.ru_8.2_data_spreadsheet.xsd` — элементы с `type="xs:integer"`.
 *
 * Семантика кодов совпадает с перечислением платформы 1С / EDT:
 * `com._1c.g5.v8.dt.metadata.common.SpreadsheetDocumentCellLineType`
 * и `com._1c.g5.v8.dt.moxel.content.CellLineStyle` (числовые *_VALUE идентичны).
 * Актуальные значения: Javadoc EDT constant-values.html (раздел SpreadsheetDocumentCellLineType).
 */

import { formatBorderLineCode } from './templateUtils';

/** Именованные коды строки границы (как в EDT SpreadsheetDocumentCellLineType). */
export const SpreadsheetDocumentCellLineType = {
    None: 0,
    Solid: 1,
    Dotted: 2,
    Double: 3,
    ThinDashed: 4,
    ThickDashed: 5,
    LargeDashed: 6,
} as const;

export type SpreadsheetCellLineTypeCode =
    (typeof SpreadsheetDocumentCellLineType)[keyof typeof SpreadsheetDocumentCellLineType];

/** Подписи для редактора (коды 1…6 по EDT SpreadsheetDocumentCellLineType). */
export const SPREADSHEET_CELL_LINE_TYPE_UI_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
    { value: SpreadsheetDocumentCellLineType.Solid, label: 'Сплошная' },
    { value: SpreadsheetDocumentCellLineType.Dotted, label: 'Точечная' },
    { value: SpreadsheetDocumentCellLineType.Double, label: 'Двойная' },
    { value: SpreadsheetDocumentCellLineType.ThinDashed, label: 'Пунктир тонкий' },
    { value: SpreadsheetDocumentCellLineType.ThickDashed, label: 'Пунктир жирный' },
    { value: SpreadsheetDocumentCellLineType.LargeDashed, label: 'Большой пунктир' },
];

/** Варианты для каждой стороны и обводки: 0 — нет линии, 1…6 — тип линии. */
export const SPREADSHEET_CELL_LINE_TYPE_OPTIONS_WITH_NONE: ReadonlyArray<{ value: number; label: string }> = [
    { value: SpreadsheetDocumentCellLineType.None, label: 'Нет линии' },
    ...SPREADSHEET_CELL_LINE_TYPE_UI_OPTIONS,
];

export interface BuildCellBorderCssOptions {
    /** Русские подписи типа линии из UI (перекрывают числовой код по смыслу). */
    lineType?: string;
    /** Толщина в пикселях (как в формате редактора); если не задана — по типу линии. */
    widthPx?: number;
    color?: string;
}

/**
 * Собирает значение CSS `border-*` по коду типа линии из макета.
 * @returns `undefined`, если линии нет (код 0 / невалидно).
 */
export function buildCellBorderCss(
    borderLineCode: number | string | undefined,
    options: BuildCellBorderCssOptions = {}
): string | undefined {
    const code = formatBorderLineCode(borderLineCode);
    if (code === SpreadsheetDocumentCellLineType.None) {
        return undefined;
    }

    const { lineType, widthPx, color } = options;
    let borderStyleCss = 'solid';

    if (lineType) {
        const lineTypeLower = lineType.toLowerCase();
        if (lineTypeLower.includes('точечн') || lineTypeLower.includes('dotted')) {
            borderStyleCss = 'dotted';
        } else if (
            lineTypeLower.includes('пунктир') ||
            lineTypeLower.includes('dashed') ||
            lineTypeLower.includes('черта')
        ) {
            borderStyleCss = 'dashed';
        } else if (lineTypeLower.includes('двойн') || lineTypeLower.includes('double')) {
            borderStyleCss = 'double';
        } else if (lineTypeLower.includes('сплошн') || lineTypeLower.includes('solid')) {
            borderStyleCss = 'solid';
        } else {
            borderStyleCss = lineCodeToCssStyle(code);
        }
    } else {
        borderStyleCss = lineCodeToCssStyle(code);
    }

    let widthStr: string;
    if (widthPx !== undefined) {
        widthStr = `${widthPx}px`;
    } else if (borderStyleCss === 'double') {
        widthStr = '3px';
    } else if (
        code === SpreadsheetDocumentCellLineType.ThickDashed ||
        code === SpreadsheetDocumentCellLineType.LargeDashed
    ) {
        widthStr = '2px';
    } else {
        widthStr = '1px';
    }

    const borderColor =
        color || 'var(--vscode-editorWidget-border, var(--vscode-panel-border))';
    return `${widthStr} ${borderStyleCss} ${borderColor}`;
}

/** Маппинг числового кода EDT → CSS border-style (без русских подписей). */
function lineCodeToCssStyle(code: number): string {
    switch (code) {
        case SpreadsheetDocumentCellLineType.Solid:
            return 'solid';
        case SpreadsheetDocumentCellLineType.Dotted:
            return 'dotted';
        case SpreadsheetDocumentCellLineType.Double:
            return 'double';
        case SpreadsheetDocumentCellLineType.ThinDashed:
            return 'dashed';
        case SpreadsheetDocumentCellLineType.ThickDashed:
            return 'dashed';
        case SpreadsheetDocumentCellLineType.LargeDashed:
            return 'dashed';
        default:
            return 'solid';
    }
}

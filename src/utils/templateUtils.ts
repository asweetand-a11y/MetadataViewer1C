/**
 * Утилиты для работы с макетами 1С
 * Функции для изменения структуры макета, работы с форматами заполнения и именованными областями
 */

import { 
    TemplateDocument, 
    TemplateCell, 
    TemplateRow, 
    TemplateFormat, 
    TemplateFont,
    TemplateMergeCells,
    TemplateColumns,
    NamedItem,
    NamedItemArea,
    CellPosition,
    TemplateTextData,
    CellRange,
    NamedArea
} from '../templatInterfaces';

/**
 * Обновляет документ макета с изменениями
 */
export function updateTemplateDocument(
    original: TemplateDocument, 
    changes: Partial<TemplateDocument>
): TemplateDocument {
    return {
        ...original,
        ...changes
    };
}

/**
 * Находит ячейку по позиции (row, col).
 * row — логический индекс строки (row.index), не индекс в массиве.
 */
export function findCellByPosition(
    template: TemplateDocument, 
    row: number, 
    col: number
): TemplateCell | null {
    if (!template.rowsItem) {
        return null;
    }

    // Ищем строку по row.index (логический индекс)
    const templateRow = template.rowsItem.find(r => (r.index !== undefined ? r.index : template.rowsItem!.indexOf(r)) === row);
    if (!templateRow || !templateRow.row || !templateRow.row.c) {
        return null;
    }

    // Ищем ячейку с индексом col
    // Если ячейка имеет атрибут i, используем его
    // Если нет, индекс определяется порядком в массиве
    let currentIndex = 0;
    for (const cell of templateRow.row.c) {
        if (cell.i !== undefined) {
            if (cell.i === col) {
                return cell;
            }
            currentIndex = cell.i + 1;
        } else {
            if (currentIndex === col) {
                return cell;
            }
            currentIndex++;
        }
    }
    
    return null;
}

/**
 * Извлекает строку из значения (может быть строка или объект парсера { "#text": "..." }).
 * Экспорт для использования при отображении содержимого ячеек.
 */
export function extractStringValue(val: any): string {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        return val['#text'] ?? val.text ?? val.content ?? String(val);
    }
    return String(val);
}

/**
 * Определяет формат заполнения ячейки
 * Возвращает 'parameter' если есть <parameter>, 'template' если есть <tl> с текстом, 'none' если пустая
 */
export function getCellFillPattern(
    template: TemplateDocument, 
    row: number, 
    col: number
): 'parameter' | 'template' | 'none' {
    const cell = findCellByPosition(template, row, col);
    if (!cell || !cell.c) {
        return 'none';
    }

    const cellData = cell.c;

    // Если есть parameter (строка или объект парсера) - формат "параметр"
    const paramStr = extractStringValue(cellData.parameter);
    if (paramStr.trim() !== '') {
        return 'parameter';
    }

    // Если нет parameter, но есть tl с текстом - формат "шаблон"
    if (cellData.tl && hasTextContent(cellData.tl)) {
        return 'template';
    }

    return 'none';
}

/**
 * Проверяет, есть ли текстовое содержимое в TemplateTextData
 */
function hasTextContent(tl: any): boolean {
    if (!tl) {
        return false;
    }

    // Вспомогательная функция для извлечения строкового значения из v8:content
    const getContentString = (content: any): string => {
        if (typeof content === 'string') {
            return content;
        }
        if (content && typeof content === 'object') {
            // Может быть объектом с #text или text
            return content['#text'] || content.text || content.content || String(content);
        }
        return String(content || '');
    };

    // Проверяем наличие v8:item или других элементов с контентом
    if (tl['v8:item']) {
        const item = tl['v8:item'];
        if (Array.isArray(item)) {
            return item.some(i => {
                if (!i || !i['v8:content']) return false;
                const content = getContentString(i['v8:content']);
                return content.trim() !== '';
            });
        } else if (item && item['v8:content']) {
            const content = getContentString(item['v8:content']);
            return content.trim() !== '';
        }
    }

    // Проверяем прямое наличие content или других текстовых полей
    if (tl.content) {
        const content = getContentString(tl.content);
        if (content.trim() !== '') {
            return true;
        }
    }

    // Рекурсивно проверяем вложенные объекты
    for (const key in tl) {
        if (typeof tl[key] === 'object' && tl[key] !== null) {
            if (hasTextContent(tl[key])) {
                return true;
            }
        } else if (typeof tl[key] === 'string' && tl[key].trim() !== '') {
            return true;
        }
    }

    return false;
}

/**
 * Извлекает имя параметра из шаблона вида [ИмяПараметра] или текст [ИмяПараметра]
 * Возвращает null, если параметров несколько или их нет
 */
export function extractParameterFromTemplate(templateText: string): string | null {
    if (!templateText) {
        return null;
    }

    // Регулярное выражение для поиска параметров в квадратных скобках
    const paramRegex = /\[([^\]]+)\]/g;
    const matches = [...templateText.matchAll(paramRegex)];

    if (matches.length === 0) {
        return null;
    }

    // Если параметров несколько, возвращаем null
    if (matches.length > 1) {
        return null;
    }

    // Возвращаем имя единственного параметра
    return matches[0][1];
}

/**
 * Извлекает все параметры из шаблона (все вхождения [Имя])
 */
export function parseTemplateParameters(templateText: string): string[] {
    if (!templateText) {
        return [];
    }

    const paramRegex = /\[([^\]]+)\]/g;
    const matches = [...templateText.matchAll(paramRegex)];
    
    return matches.map(match => match[1]);
}

/**
 * Преобразует имя параметра в шаблон: ИмяПараметра → [ИмяПараметра]
 */
export function convertParameterToTemplate(parameterName: string): string {
    return `[${parameterName}]`;
}

/**
 * Устанавливает ячейку как параметр (формат "параметр")
 * Создает <parameter>Имя</parameter>, удаляет <tl>
 */
export function setCellAsParameter(
    template: TemplateDocument, 
    row: number, 
    col: number, 
    parameterName: string
): TemplateDocument {
    // Создаем новый массив rowsItem с обновленной ячейкой
    if (!template.rowsItem) {
        return template;
    }
    
    const newRowsItem = [...template.rowsItem];
    
    // Убеждаемся, что строка существует
    while (newRowsItem.length <= row) {
        newRowsItem.push({
            index: newRowsItem.length,
            row: {}
        });
    }
    
    const newRow = { ...newRowsItem[row] };
    const newRowData = { ...newRow.row };
    
    // Создаем массив ячеек, если его нет
    if (!newRowData.c) {
        newRowData.c = [];
    }
    
    const newCells = [...newRowData.c];
    let currentColIndex = 0;
    const cellIndex = newCells.findIndex(c => {
        const cellCol = c.i !== undefined ? c.i : currentColIndex;
        currentColIndex = cellCol + 1;
        return cellCol === col;
    });
    
    if (cellIndex >= 0) {
        // Ячейка существует - обновляем её
        const newCell = { ...newCells[cellIndex] };
        const newCellData = newCell.c ? { ...newCell.c } : {};
        // Устанавливаем parameter, удаляем tl
        newCellData.parameter = parameterName;
        delete newCellData.tl;
        newCell.c = newCellData;
        newCells[cellIndex] = newCell;
    } else {
        // Ячейка не существует - создаем новую
        // Определяем правильный индекс для вставки
        let insertIndex = newCells.length;
        let currentColIndex = 0;
        for (let i = 0; i < newCells.length; i++) {
            const cellCol = (newCells[i].i !== undefined ? newCells[i].i : currentColIndex) as number;
            if (cellCol > col) {
                insertIndex = i;
                break;
            }
            currentColIndex = cellCol + 1;
        }
        
        const newCell: TemplateCell = {
            i: col,
            c: {
                parameter: parameterName
            }
        };
        
        newCells.splice(insertIndex, 0, newCell);
    }

    newRowData.c = newCells;
    newRow.row = newRowData;
    newRowsItem[row] = newRow;

    return {
        ...template,
        rowsItem: newRowsItem
    };
}

/**
 * Устанавливает ячейку как шаблон (формат "шаблон")
 * Создает <tl> с текстом, удаляет <parameter>
 */
export function setCellAsTemplate(
    template: TemplateDocument, 
    row: number, 
    col: number, 
    templateText: string
): TemplateDocument {
    // Создаем новый массив rowsItem с обновленной ячейкой
    if (!template.rowsItem) {
        return template;
    }
    
    const newRowsItem = [...template.rowsItem];
    
    // Убеждаемся, что строка существует
    while (newRowsItem.length <= row) {
        newRowsItem.push({
            index: newRowsItem.length,
            row: {}
        });
    }
    
    const newRow = { ...newRowsItem[row] };
    const newRowData = { ...newRow.row };
    
    // Создаем массив ячеек, если его нет
    if (!newRowData.c) {
        newRowData.c = [];
    }
    
    const newCells = [...newRowData.c];
    let currentColIndex = 0;
    const cellIndex = newCells.findIndex(c => {
        const cellCol = c.i !== undefined ? c.i : currentColIndex;
        currentColIndex = cellCol + 1;
        return cellCol === col;
    });
    
    if (cellIndex >= 0) {
        // Ячейка существует - обновляем её
        const newCell = { ...newCells[cellIndex] };
        const newCellData = newCell.c ? { ...newCell.c } : {};
        // Устанавливаем tl, удаляем parameter
        newCellData.tl = {
            'v8:item': {
                'v8:lang': 'ru',
                'v8:content': templateText
            }
        };
        delete newCellData.parameter;
        newCell.c = newCellData;
        newCells[cellIndex] = newCell;
    } else {
        // Ячейка не существует - создаем новую
        // Определяем правильный индекс для вставки
        let insertIndex = newCells.length;
        let currentColIndex = 0;
        for (let i = 0; i < newCells.length; i++) {
            const cellCol = (newCells[i].i !== undefined ? newCells[i].i : currentColIndex) as number;
            if (cellCol > col) {
                insertIndex = i;
                break;
            }
            currentColIndex = cellCol + 1;
        }
        
        const newCell: TemplateCell = {
            i: col,
            c: {
                tl: {
                    'v8:item': {
                        'v8:lang': 'ru',
                        'v8:content': templateText
                    }
                }
            }
        };
        
        newCells.splice(insertIndex, 0, newCell);
    }

    newRowData.c = newCells;
    newRow.row = newRowData;
    newRowsItem[row] = newRow;

    return {
        ...template,
        rowsItem: newRowsItem
    };
}

/**
 * Переключает формат заполнения ячейки
 * Если 'parameter' → преобразует в 'template' (извлекает имя параметра и создает текст [Имя])
 * Если 'template' → пытается извлечь единственный параметр из текста и преобразует в 'parameter'
 */
export function toggleCellFillPattern(
    template: TemplateDocument, 
    row: number, 
    col: number
): TemplateDocument {
    const currentPattern = getCellFillPattern(template, row, col);
    const cell = findCellByPosition(template, row, col);
    
    if (!cell || !cell.c) {
        return template;
    }

    if (currentPattern === 'parameter') {
        // Преобразуем параметр в шаблон
        const parameterName = cell.c.parameter || '';
        const templateText = convertParameterToTemplate(parameterName);
        return setCellAsTemplate(template, row, col, templateText);
    } else if (currentPattern === 'template') {
        // Преобразуем шаблон в параметр (если возможно)
        const tl = cell.c.tl;
        if (tl) {
            const templateText = extractTextFromTemplateTextData(tl);
            if (templateText) {
                const parameterName = extractParameterFromTemplate(templateText);
                if (parameterName) {
                    return setCellAsParameter(template, row, col, parameterName);
                }
            }
        }
    }

    return template;
}

/**
 * Извлекает текстовое содержимое из TemplateTextData
 */
export function extractTextFromTemplateTextData(tl: any): string {
    if (!tl) {
        return '';
    }

    // Вспомогательная функция для извлечения строкового значения из v8:content
    const getContentString = (content: any): string => {
        if (typeof content === 'string') {
            return content;
        }
        if (content && typeof content === 'object') {
            // Может быть объектом с #text или text
            return content['#text'] || content.text || content.content || String(content);
        }
        return String(content || '');
    };

    // Проверяем наличие v8:item с v8:content
    if (tl['v8:item']) {
        const item = tl['v8:item'];
        if (Array.isArray(item)) {
            // Берем первый элемент с контентом
            const itemWithContent = item.find(i => i && i['v8:content']);
            if (itemWithContent && itemWithContent['v8:content']) {
                return getContentString(itemWithContent['v8:content']);
            }
        } else if (item && item['v8:content']) {
            return getContentString(item['v8:content']);
        }
    }

    // Проверяем прямое наличие content
    if (tl.content) {
        return getContentString(tl.content);
    }

    return '';
}

/**
 * Возвращает максимальный индекс колонки в макете
 */
export function getMaxColumns(template: TemplateDocument): number {
    let max = 0;
    if (template.rowsItem) {
        template.rowsItem.forEach(row => {
            if (row.row?.c) {
                let currentColIndex = 0;
                row.row.c.forEach((cell: { i?: number }) => {
                    const colIndex = cell.i !== undefined ? cell.i : currentColIndex;
                    if (colIndex >= max) max = colIndex + 1;
                    currentColIndex = colIndex + 1;
                });
            }
        });
    }
    if (template.columns?.length) {
        template.columns.forEach((cg: { size?: number; columnsItem?: Array<{ index?: number }> }) => {
            if (cg.size !== undefined) max = Math.max(max, cg.size);
            cg.columnsItem?.forEach(item => {
                if (item.index !== undefined && item.index >= max) max = item.index + 1;
            });
        });
    }
    return Math.max(max, 1);
}

/**
 * Возвращает минимальный индекс строки в макете
 */
export function getMinRowIndex(template: TemplateDocument): number {
    if (!template.rowsItem?.length) return 0;
    let min = template.rowsItem[0].index ?? 0;
    template.rowsItem.forEach((row, idx) => {
        const rIndex = row.index !== undefined ? row.index : idx;
        if (rIndex < min) min = rIndex;
    });
    return min;
}

/**
 * Возвращает максимальный индекс строки в макете
 */
export function getMaxRowIndex(template: TemplateDocument): number {
    if (!template.rowsItem?.length) return 0;
    let max = 0;
    template.rowsItem.forEach((row, idx) => {
        const rIndex = row.index !== undefined ? row.index : idx;
        if (rIndex > max) max = rIndex;
    });
    return max;
}

/**
 * Получает все именованные области из документа макета
 */
export function getAllNamedAreas(template: TemplateDocument): Map<string, NamedArea> {
    const namedAreas = new Map<string, NamedArea>();

    if (!template.namedItem || !Array.isArray(template.namedItem)) {
        return namedAreas;
    }

    template.namedItem.forEach(item => {
        if (item.name && item.area) {
            const area = item.area;
            const beginRow = area.beginRow ?? 0;
            const beginCol = area.beginColumn ?? -1;
            const endRow = area.endRow ?? 0;
            const endCol = area.endColumn ?? -1;
            // Если type не задан, но колонки = -1 — это область типа Rows
            let areaType = area.type;
            if (!areaType && beginCol === -1 && endCol === -1) {
                areaType = 'Rows';
            }
            if (!areaType) areaType = 'Rectangle';
            namedAreas.set(item.name, {
                name: item.name,
                areaType,
                startRow: beginRow,
                startCol: beginCol,
                endRow,
                endCol,
                columnsID: area.columnsID
            });
        }
    });

    return namedAreas;
}

/**
 * Получает именованную область по имени
 */
export function getNamedArea(
    template: TemplateDocument, 
    name: string
): NamedArea | null {
    const allAreas = getAllNamedAreas(template);
    return allAreas.get(name) || null;
}

/**
 * Валидирует имя именованной области
 */
export function validateNamedAreaName(
    template: TemplateDocument, 
    name: string,
    oldName?: string
): { valid: boolean; error?: string } {
    if (!name || name.trim() === '') {
        return { valid: false, error: 'Имя области не может быть пустым' };
    }

    const trimmedName = name.trim();
    
    // Проверяем уникальность имени (исключаем старое имя при редактировании)
    const allAreas = getAllNamedAreas(template);
    if (oldName && oldName === trimmedName) {
        // Имя не изменилось - это нормально
    } else if (allAreas.has(trimmedName)) {
        return { valid: false, error: `Область с именем "${trimmedName}" уже существует` };
    }

    // Проверяем допустимые символы (обычно буквы, цифры, подчеркивание)
    if (!/^[a-zA-Zа-яА-Я0-9_]+$/.test(trimmedName)) {
        return { valid: false, error: 'Имя области может содержать только буквы, цифры и подчеркивание' };
    }

    return { valid: true };
}

/**
 * Валидирует именованную область с учетом типа
 */
export function validateNamedArea(
    areaType: string,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
): { valid: boolean; error?: string } {
    if (areaType === 'Rows') {
        // Для типа Rows: координаты колонок должны быть -1
        if (startCol !== -1 || endCol !== -1) {
            return { valid: false, error: 'Для именованных строк координаты колонок должны быть -1 (все колонки)' };
        }
        if (startRow > endRow) {
            return { valid: false, error: 'Начальная строка должна быть меньше конечной' };
        }
        if (startRow < 0 || endRow < 0) {
            return { valid: false, error: 'Номера строк не могут быть отрицательными' };
        }
    } else if (areaType === 'Columns') {
        // Для типа Columns: координаты строк должны быть -1
        if (startRow !== -1 || endRow !== -1) {
            return { valid: false, error: 'Для именованных колонок координаты строк должны быть -1 (все строки)' };
        }
        if (startCol > endCol) {
            return { valid: false, error: 'Начальная колонка должна быть меньше конечной' };
        }
        if (startCol < 0 || endCol < 0) {
            return { valid: false, error: 'Номера колонок не могут быть отрицательными (кроме -1)' };
        }
    } else {
        // Для типа Rectangle: проверяем все координаты
        if (startRow > endRow || startCol > endCol) {
            return { valid: false, error: 'Начальные координаты должны быть меньше конечных' };
        }
        if (startRow < 0 || endRow < 0 || startCol < 0 || endCol < 0) {
            return { valid: false, error: 'Координаты не могут быть отрицательными' };
        }
    }

    return { valid: true };
}

/**
 * Находит все именованные области, которые содержат указанную ячейку
 */
export function findNamedAreaByPosition(
    template: TemplateDocument, 
    row: number, 
    col: number
): NamedArea[] {
    const allAreas = getAllNamedAreas(template);
    const matchingAreas: NamedArea[] = [];

    allAreas.forEach(area => {
        if (area.areaType === 'Rows') {
            // Для типа Rows: проверяем только строки, все колонки (-1 означает все колонки)
            if (row >= area.startRow && row <= area.endRow) {
                matchingAreas.push(area);
            }
        } else if (area.areaType === 'Columns') {
            // Для типа Columns: проверяем только колонки, все строки (-1 означает все строки)
            if (col >= area.startCol && col <= area.endCol) {
                matchingAreas.push(area);
            }
        } else {
            // Для типа Rectangle: проверяем и строки, и колонки
            if (row >= area.startRow && row <= area.endRow &&
                col >= area.startCol && col <= area.endCol) {
                matchingAreas.push(area);
            }
        }
    });

    return matchingAreas;
}

/**
 * Получает именованную область типа "Rows" для указанной строки
 * Возвращает первую найденную область или null
 */
export function getNamedAreaForRow(
    template: TemplateDocument,
    rowIndex: number,
    columnsID?: string
): NamedArea | null {
    const allAreas = getAllNamedAreas(template);
    
    for (const area of allAreas.values()) {
        if (area.areaType === 'Rows') {
            if (rowIndex >= area.startRow && rowIndex <= area.endRow) {
                // Проверяем соответствие columnsID
                if (columnsID) {
                    if (area.columnsID === columnsID) {
                        return area;
                    }
                } else {
                    // Если для строки нет columnsID, ищем области без columnsID
                    if (!area.columnsID) {
                        return area;
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * Получает именованную область типа "Columns" для указанной колонки
 * Возвращает первую найденную область или null
 */
export function getNamedAreaForColumn(
    template: TemplateDocument,
    colIndex: number,
    columnsID?: string
): NamedArea | null {
    const allAreas = getAllNamedAreas(template);
    
    for (const area of allAreas.values()) {
        if (area.areaType === 'Columns') {
            if (colIndex >= area.startCol && colIndex <= area.endCol) {
                // Проверяем соответствие columnsID
                if (columnsID) {
                    if (area.columnsID === columnsID) {
                        return area;
                    }
                } else {
                    // Если для строки нет columnsID, ищем области без columnsID
                    if (!area.columnsID) {
                        return area;
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * Получает все именованные области типа "Rows" для указанной строки
 * Исключает области типа "Rectangle"
 * Возвращает массив всех подходящих областей
 */
export function getNamedAreasForRow(
    template: TemplateDocument,
    rowIndex: number,
    columnsID?: string
): NamedArea[] {
    const allAreas = getAllNamedAreas(template);
    const result: NamedArea[] = [];
    
    for (const area of allAreas.values()) {
        // Исключаем области типа "Rectangle"
        if (area.areaType === 'Rows') {
            if (rowIndex >= area.startRow && rowIndex <= area.endRow) {
                // Проверяем соответствие columnsID
                if (columnsID) {
                    // Если для строки задан columnsID, ищем области с таким же columnsID
                    if (area.columnsID === columnsID) {
                        result.push(area);
                    }
                } else {
                    // Если для строки нет columnsID, ищем области без columnsID
                    if (!area.columnsID) {
                        result.push(area);
                    }
                }
            }
        }
    }
    
    return result;
}

/**
 * Получает все именованные области типа "Columns" для указанной колонки
 * Исключает области типа "Rectangle"
 * Возвращает массив всех подходящих областей
 */
export function getNamedAreasForColumn(
    template: TemplateDocument,
    colIndex: number,
    columnsID?: string
): NamedArea[] {
    const allAreas = getAllNamedAreas(template);
    const result: NamedArea[] = [];
    
    for (const area of allAreas.values()) {
        // Исключаем области типа "Rectangle"
        if (area.areaType === 'Columns') {
            if (colIndex >= area.startCol && colIndex <= area.endCol) {
                // Проверяем соответствие columnsID
                if (columnsID) {
                    // Если для строки задан columnsID, ищем области с таким же columnsID
                    if (area.columnsID === columnsID) {
                        result.push(area);
                    }
                } else {
                    // Если для строки нет columnsID, ищем области без columnsID
                    if (!area.columnsID) {
                        result.push(area);
                    }
                }
            }
        }
    }
    
    return result;
}

/**
 * Определяет, находится ли ячейка на границе именованной области
 * Возвращает объект с флагами для каждой стороны границы
 */
export function isCellOnNamedAreaBoundary(
    template: TemplateDocument,
    rowIndex: number,
    colIndex: number,
    area: NamedArea
): { top: boolean; bottom: boolean; left: boolean; right: boolean } {
    const result = {
        top: false,
        bottom: false,
        left: false,
        right: false
    };
    
    if (area.areaType === 'Rows') {
        // Для типа Rows: верхняя граница на первой строке, нижняя на последней
        // Левая и правая границы — на всех строках области для полного контура
        const inArea = rowIndex >= area.startRow && rowIndex <= area.endRow;
        result.top = rowIndex === area.startRow;
        result.bottom = rowIndex === area.endRow;
        if (inArea) {
            let maxCol = 0;
            if (template.rowsItem) {
                template.rowsItem.forEach(row => {
                    if (row.row && row.row.c) {
                        let currentColIndex = 0;
                        row.row.c.forEach(cell => {
                            const cellCol = cell.i !== undefined ? cell.i : currentColIndex;
                            if (cellCol >= maxCol) {
                                maxCol = cellCol + 1;
                            }
                            currentColIndex = cellCol + 1;
                        });
                    }
                });
            }
            result.left = colIndex === 0;
            result.right = colIndex === maxCol - 1;
        }
    } else if (area.areaType === 'Columns') {
        // Для типа Columns: границы ТОЛЬКО на первой и последней колонке области
        // beginRow=-1 и endRow=-1 означает все строки
        result.left = colIndex === area.startCol;
        result.right = colIndex === area.endCol;
        // Для типа Columns верхняя и нижняя границы должны быть на всех строках
        // Но только на первой и последней колонке области
        if (result.left || result.right) {
            // Определяем общее количество строк для определения верхней и нижней границы
            const totalRows = template.rowsItem ? template.rowsItem.length : 0;
            if (totalRows > 0) {
                // Верхняя граница на первой строке (0), нижняя на последней строке
                // Границы должны быть на всех строках для первой и последней колонки
                result.top = rowIndex === 0;
                result.bottom = rowIndex === totalRows - 1;
            } else {
                result.top = false;
                result.bottom = false;
            }
        } else {
            result.top = false;
            result.bottom = false;
        }
    } else {
        // Для типа Rectangle: границы по всем сторонам
        result.top = rowIndex === area.startRow;
        result.bottom = rowIndex === area.endRow;
        result.left = colIndex === area.startCol;
        result.right = colIndex === area.endCol;
    }
    
    return result;
}

/**
 * Создает именованную область
 */
export function createNamedArea(
    template: TemplateDocument,
    name: string,
    areaType: 'Rectangle' | 'Row' | 'Column' | 'Rows' | 'Columns',
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    columnsID?: string
): TemplateDocument {
    // Валидация
    const validation = validateNamedAreaName(template, name);
    if (!validation.valid) {
        throw new Error(validation.error || 'Недопустимое имя области');
    }

    // Для типов Rows/Columns автоматически устанавливаем координаты -1
    let finalStartRow = startRow;
    let finalEndRow = endRow;
    let finalStartCol = startCol;
    let finalEndCol = endCol;

    if (areaType === 'Rows') {
        // Для именованных строк: координаты колонок = -1
        finalStartCol = -1;
        finalEndCol = -1;
    } else if (areaType === 'Columns') {
        // Для именованных колонок: координаты строк = -1
        finalStartRow = -1;
        finalEndRow = -1;
    }

    const newNamedItem: NamedItem = {
        'xsi:type': 'NamedItemCells',
        name,
        area: {
            type: areaType,
            beginRow: finalStartRow,
            endRow: finalEndRow,
            beginColumn: finalStartCol,
            endColumn: finalEndCol,
            ...(columnsID && { columnsID })
        }
    };

    const newNamedItems = [...(template.namedItem || []), newNamedItem];

    return {
        ...template,
        namedItem: newNamedItems
    };
}

/**
 * Создает именованную область для строк (тип "Rows").
 * columnsID — привязка к формату строк (для отображения в строках с этим columnsID)
 */
export function createNamedRows(
    template: TemplateDocument,
    name: string,
    startRow: number,
    endRow: number,
    columnsID?: string
): TemplateDocument {
    return createNamedArea(template, name, 'Rows', startRow, -1, endRow, -1, columnsID);
}

/**
 * Создает именованную область для колонок (тип "Columns")
 */
export function createNamedColumns(
    template: TemplateDocument,
    name: string,
    startCol: number,
    endCol: number
): TemplateDocument {
    return createNamedArea(template, name, 'Columns', -1, startCol, -1, endCol);
}

/**
 * Генерирует имя для именованной области на основе диапазона
 */
export function generateNamedAreaName(
    template: TemplateDocument,
    areaType: 'Rows' | 'Columns',
    start: number,
    end: number
): string {
    const prefix = areaType === 'Rows' ? 'Строки' : 'Колонки';
    const baseName = `${prefix}_${start}_${end}`;
    
    // Проверяем уникальность и добавляем суффикс при необходимости
    const allAreas = getAllNamedAreas(template);
    let candidateName = baseName;
    let counter = 1;
    
    while (allAreas.has(candidateName)) {
        candidateName = `${baseName}_${counter}`;
        counter++;
    }
    
    return candidateName;
}

/**
 * Обновляет именованную область
 */
export function updateNamedArea(
    template: TemplateDocument,
    oldName: string,
    updates: Partial<NamedArea>
): TemplateDocument {
    const newNamedItems = [...(template.namedItem || [])];
    const itemIndex = newNamedItems.findIndex(item => item.name === oldName);

    if (itemIndex < 0) {
        throw new Error(`Именованная область "${oldName}" не найдена`);
    }

    const existingItem = newNamedItems[itemIndex];
    
    // Если имя изменилось, проверяем уникальность
    if (updates.name && updates.name !== oldName) {
        const validation = validateNamedAreaName(template, updates.name, oldName);
        if (!validation.valid) {
            throw new Error(validation.error || 'Недопустимое имя области');
        }
    }

    // Обновляем область
    const updatedItem: NamedItem = {
        ...existingItem,
        name: updates.name || existingItem.name,
        area: {
            ...existingItem.area,
            type: (updates.areaType || existingItem.area.type) as string,
            beginRow: updates.startRow !== undefined ? updates.startRow : existingItem.area.beginRow,
            endRow: updates.endRow !== undefined ? updates.endRow : existingItem.area.endRow,
            beginColumn: updates.startCol !== undefined ? updates.startCol : existingItem.area.beginColumn,
            endColumn: updates.endCol !== undefined ? updates.endCol : existingItem.area.endColumn
        }
    };

    newNamedItems[itemIndex] = updatedItem;

    return {
        ...template,
        namedItem: newNamedItems
    };
}

/**
 * Удаляет именованную область
 */
export function deleteNamedArea(
    template: TemplateDocument,
    name: string
): TemplateDocument {
    const newNamedItems = (template.namedItem || []).filter(item => item.name !== name);

    return {
        ...template,
        namedItem: newNamedItems.length > 0 ? newNamedItems : undefined
    };
}

/**
 * Переименовывает именованную область
 */
export function renameNamedArea(
    template: TemplateDocument,
    oldName: string,
    newName: string
): TemplateDocument {
    return updateNamedArea(template, oldName, { name: newName });
}

/**
 * Слой формата по 1-based индексу из XML.
 */
function getFormatLayerByOneBasedIndex(
    template: TemplateDocument,
    formatIndex1Based: number | undefined
): TemplateFormat | null {
    if (formatIndex1Based === undefined || formatIndex1Based === null || !template.format?.length) {
        return null;
    }
    const idx = Number(formatIndex1Based) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= template.format.length) {
        return null;
    }
    return template.format[idx] ?? null;
}

/**
 * Наложение слоёв формата: поздние перекрывают ранние (как каскад 1С: колонка/строка/ячейка).
 */
function overlayTemplateFormatLayers(
    ...layers: Array<TemplateFormat | null | undefined>
): TemplateFormat | null {
    const acc: TemplateFormat = {};
    let sawLayer = false;
    for (const layer of layers) {
        if (!layer) {
            continue;
        }
        sawLayer = true;
        (Object.keys(layer) as (keyof TemplateFormat)[]).forEach((k) => {
            const v = layer[k];
            if (v !== undefined) {
                (acc as Record<string, unknown>)[k as string] = v;
            }
        });
    }
    return sawLayer && Object.keys(acc).length > 0 ? acc : null;
}

function getDefaultColumnsGroup(template: TemplateDocument): TemplateColumns | null {
    if (!template.columns?.length) {
        return null;
    }
    const defaultGroup = template.columns.find((c) => !c.id);
    return defaultGroup ?? template.columns[0] ?? null;
}

/**
 * Группа колонок для строки (по columnsID строки или группа по умолчанию).
 */
export function resolveColumnsGroupForRow(template: TemplateDocument, rowIndex: number): TemplateColumns | null {
    if (!template.columns?.length) {
        return null;
    }
    const templateRow = template.rowsItem?.find(
        (r) => (r.index !== undefined ? r.index : template.rowsItem!.indexOf(r)) === rowIndex
    );
    const rowColumnsID = templateRow?.row.columnsID;
    if (rowColumnsID) {
        return template.columns.find((c) => c.id === rowColumnsID) ?? getDefaultColumnsGroup(template);
    }
    return getDefaultColumnsGroup(template);
}

/**
 * Получает эффективный формат ячейки: defaultFormat группы → format группы колонок → формат колонки → строка → ячейка.
 * Иначе границы из формата колонок (частый случай в типовых макетах) не попадали в визуализацию.
 */
export function getEffectiveFormat(
    template: TemplateDocument,
    row: number,
    col: number
): TemplateFormat | null {
    const layers: Array<TemplateFormat | null> = [];

    layers.push(getFormatLayerByOneBasedIndex(template, template.defaultFormatIndex));

    const columnsGroup = resolveColumnsGroupForRow(template, row);
    if (columnsGroup) {
        layers.push(getFormatLayerByOneBasedIndex(template, columnsGroup.formatIndex));
        const colItem = columnsGroup.columnsItem?.find((item) => item.index === col);
        const colFi =
            colItem?.column?.formatIndex ??
            (colItem as { formatIndex?: number } | undefined)?.formatIndex;
        layers.push(getFormatLayerByOneBasedIndex(template, colFi));
    }

    const templateRow = template.rowsItem?.find(
        (r) => (r.index !== undefined ? r.index : template.rowsItem!.indexOf(r)) === row
    );
    if (templateRow?.row) {
        layers.push(getFormatLayerByOneBasedIndex(template, templateRow.row.formatIndex));
    }

    const cell = findCellByPosition(template, row, col);
    if (cell?.c?.f !== undefined) {
        layers.push(getFormatLayerByOneBasedIndex(template, cell.c.f));
    }

    return overlayTemplateFormatLayers(...layers);
}

/**
 * Извлекает строку цвета из поля формата макета (после парсинга XML значение часто приходит как объект с #text).
 */
export function extractTemplateFormatColorString(color: unknown): string {
    if (color === undefined || color === null) {
        return '';
    }
    if (typeof color === 'string') {
        if (color === '[object Object]') {
            return '';
        }
        return color;
    }
    if (typeof color === 'object') {
        const o = color as Record<string, unknown>;
        if (typeof o['#text'] === 'string') {
            return o['#text'];
        }
        if (o['$'] && typeof o['$'] === 'object' && (o['$'] as Record<string, string>)['xmlns:d3p1']) {
            return String(color);
        }
        for (const key of Object.keys(o)) {
            const v = o[key];
            if (typeof v === 'string' && v !== '[object Object]') {
                return v;
            }
        }
        return '';
    }
    return String(color);
}

/**
 * Цвет границы для CSS: неразобранное / стиль 1С → undefined (используется fallback в buildCellBorderCss).
 */
export function resolveTemplateBorderColorForCss(color: unknown): string | undefined {
    const s = extractTemplateFormatColorString(color).trim();
    if (!s || s === '[object Object]') {
        return undefined;
    }
    if (s.startsWith('style:')) {
        return undefined;
    }
    return s;
}

/**
 * Числовой код линии границы из макета 1С (XML: leftBorder, border и т.д.).
 * Соответствует `SpreadsheetDocumentCellLineType` в EDT (см. {@link spreadsheetCellLineType.SpreadsheetDocumentCellLineType}).
 * XSD: `resources/xsd/http_v8.1c.ru_8.2_data_spreadsheet.xsd` — тип `xs:integer`, перечисление в схеме не зафиксировано.
 */
export function formatBorderLineCode(value: unknown): number {
    if (value === undefined || value === null || value === '') {
        return 0;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    const n = parseInt(String(value).trim(), 10);
    return Number.isFinite(n) ? n : 0;
}

/** Есть ли линия границы по коду стороны или полю border. */
export function hasTemplateBorderSide(value: unknown): boolean {
    return formatBorderLineCode(value) > 0;
}

/**
 * Получает эффективный шрифт ячейки
 */
export function getEffectiveFont(
    template: TemplateDocument,
    row: number,
    col: number
): TemplateFont | null {
    const format = getEffectiveFormat(template, row, col);
    if (!format || format.font === undefined) {
        return null;
    }

    const fontIndex = format.font;
    if (template.font && template.font[fontIndex]) {
        return template.font[fontIndex];
    }

    return null;
}

/**
 * Обновляет формат ячейки
 */
export function updateCellFormat(
    template: TemplateDocument,
    row: number,
    col: number,
    formatUpdates: Partial<TemplateFormat>
): TemplateDocument {
    // Находим ячейку
    const cell = findCellByPosition(template, row, col);
    if (!cell || !cell.c) {
        return template;
    }

    // Получаем текущий формат (включая наследование от строки, если у ячейки нет f)
    let currentFormat: TemplateFormat = {};
    const oldFormatIndex = cell.c.f;
    
    const formatArrayIndex = oldFormatIndex !== undefined ? oldFormatIndex - 1 : -1;
    if (formatArrayIndex >= 0 && template.format && template.format[formatArrayIndex] !== undefined) {
        // Ячейка имеет явный formatIndex (1-based в XML) — копируем формат
        currentFormat = { ...template.format[formatArrayIndex] };
    } else {
        // Ячейка наследует формат от строки — берём эффективный формат
        const effective = getEffectiveFormat(template, row, col);
        if (effective) {
            currentFormat = { ...effective };
        }
    }
    
    // Создаем новый формат на основе текущего с обновленными значениями
    // ВАЖНО: Всегда создаем новый формат, чтобы изолировать изменения от других ячеек
    const updatedFormat: TemplateFormat = {
        ...currentFormat,
        ...formatUpdates
    };
    
    // Добавляем новый формат в массив (всегда создаем новый, не обновляем существующий)
    const newFormats = [...(template.format || [])];
    const newFormatIndex = newFormats.length;
    newFormats.push(updatedFormat);
    // В XML 1С индекс формата 1-based
    const newFormatIndex1Based = newFormatIndex + 1;
    
    // Обновляем ячейку с новым индексом формата
    const rowArrayIndex = template.rowsItem?.findIndex(r => (r.index !== undefined ? r.index : template.rowsItem!.indexOf(r)) === row);
    if (!template.rowsItem || rowArrayIndex === undefined || rowArrayIndex < 0) {
        return template;
    }
    const newRowsItem = [...template.rowsItem];
    const newRow = { ...newRowsItem[rowArrayIndex] };
    const newRowData = { ...newRow.row };
    if (!newRowData.c) {
        // Если ячеек нет, создаем массив с одной ячейкой
        newRowData.c = [{
            i: col,
            c: { f: newFormatIndex1Based }
        }];
    } else {
        const newCells = [...newRowData.c];
        let currentColIndex = 0;
        const cellIndex = newCells.findIndex(c => {
            const cellCol = c.i !== undefined ? c.i : currentColIndex;
            currentColIndex = cellCol + 1;
            return cellCol === col;
        });
        
        if (cellIndex >= 0) {
            const newCell = { ...newCells[cellIndex] };
            const newCellData = { ...newCell.c };
            newCellData.f = newFormatIndex1Based;
            newCell.c = newCellData;
            newCells[cellIndex] = newCell;
            newRowData.c = newCells;
        } else {
            // Ячейка не найдена, добавляем новую
            newRowData.c = [...newCells, {
                i: col,
                c: { f: newFormatIndex1Based }
            }];
        }
    }
    
    newRow.row = newRowData;
    newRowsItem[rowArrayIndex] = newRow;
    
    return {
        ...template,
        rowsItem: newRowsItem,
        format: newFormats
    };
}

/**
 * Обновляет шрифт ячейки (через формат)
 */
export function updateCellFont(
    template: TemplateDocument,
    row: number,
    col: number,
    fontUpdates: Partial<TemplateFont>
): TemplateDocument {
    // Получаем текущий формат ячейки
    const currentFormat = getEffectiveFormat(template, row, col);
    if (!currentFormat) {
        // Если формата нет, создаем новый формат со шрифтом
        const newFormat: TemplateFormat = {
            font: template.font ? template.font.length : 0
        };
        return updateCellFormat(template, row, col, newFormat);
    }
    
    // Получаем текущий шрифт или создаем новый
    let currentFont: TemplateFont | null = null;
    let fontIndex = currentFormat.font;
    
    if (fontIndex !== undefined && template.font && template.font[fontIndex]) {
        // Используем существующий шрифт
        currentFont = { ...template.font[fontIndex] };
    } else {
        // Создаем новый шрифт
        fontIndex = template.font ? template.font.length : 0;
        currentFont = {
            '$_faceName': 'Arial',
            '$_height': 10,
            '$_bold': 'false',
            '$_italic': 'false',
            '$_underline': 'false',
            '$_strikeout': 'false',
            '$_kind': 'Regular',
            '$_scale': '100'
        };
    }
    
    // Обновляем шрифт с новыми значениями
    const updatedFont: TemplateFont = {
        ...currentFont,
        ...fontUpdates
    } as TemplateFont;
    
    // Обновляем массив шрифтов
    const updatedFontsArray = [...(template.font || [])];
    if (fontIndex !== undefined && fontIndex < updatedFontsArray.length) {
        updatedFontsArray[fontIndex] = updatedFont;
    } else {
        // Добавляем новый шрифт
        updatedFontsArray.push(updatedFont);
        fontIndex = updatedFontsArray.length - 1;
    }
    
    // Обновляем шаблон с новыми шрифтами
    const templateWithNewFonts = {
        ...template,
        font: updatedFontsArray
    };
    
    // Обновляем формат с новым индексом шрифта и всеми остальными полями
    const formatUpdates: Partial<TemplateFormat> = {
        ...currentFormat,
        font: fontIndex
    };
    
    return updateCellFormat(templateWithNewFonts, row, col, formatUpdates);
}

/**
 * Обновляет выравнивание ячейки
 */
export function updateCellAlignment(
    template: TemplateDocument,
    row: number,
    col: number,
    horizontal?: string,
    vertical?: string
): TemplateDocument {
    return updateCellFormat(template, row, col, {
        horizontalAlignment: horizontal,
        verticalAlignment: vertical
    });
}

/**
 * Обновляет границы ячейки
 */
export function updateCellBorders(
    template: TemplateDocument,
    row: number,
    col: number,
    borders: {
        left?: number;
        top?: number;
        bottom?: number;
        right?: number;
    }
): TemplateDocument {
    return updateCellFormat(template, row, col, {
        leftBorder: borders.left,
        topBorder: borders.top,
        bottomBorder: borders.bottom,
        rightBorder: borders.right
    });
}

/**
 * Обновляет цвета ячейки
 */
export function updateCellColors(
    template: TemplateDocument,
    row: number,
    col: number,
    textColor?: string,
    backColor?: string
): TemplateDocument {
    return updateCellFormat(template, row, col, {
        textColor,
        backColor
    });
}

/**
 * Обновляет примечание к ячейке
 */
export function updateCellNote(
    template: TemplateDocument,
    row: number,
    col: number,
    note: any
): TemplateDocument {
    const cell = findCellByPosition(template, row, col);
    if (!cell || !cell.c) {
        return template;
    }

    const newRowsItem = [...(template.rowsItem || [])];
    const newRow = { ...newRowsItem[row] };
    const newRowData = { ...newRow.row };
    const newCells = [...(newRowData.c || [])];
    const cellIndex = newCells.findIndex((c, idx) => {
        // Учитываем опциональный атрибут i
        const cellCol = c.i !== undefined ? c.i : idx;
        return cellCol === col;
    });

    if (cellIndex >= 0) {
        const newCell = { ...newCells[cellIndex] };
        const newCellData = { ...newCell.c };
        newCellData.note = note;
        newCell.c = newCellData;
        newCells[cellIndex] = newCell;
    }

    newRowData.c = newCells;
    newRow.row = newRowData;
    newRowsItem[row] = newRow;

    return {
        ...template,
        rowsItem: newRowsItem
    };
}

/**
 * Обновляет детальный параметр ячейки
 */
export function updateCellDetailParameter(
    template: TemplateDocument,
    row: number,
    col: number,
    detailParameter: string
): TemplateDocument {
    const cell = findCellByPosition(template, row, col);
    if (!cell || !cell.c) {
        return template;
    }

    const newRowsItem = [...(template.rowsItem || [])];
    const newRow = { ...newRowsItem[row] };
    const newRowData = { ...newRow.row };
    const newCells = [...(newRowData.c || [])];
    const cellIndex = newCells.findIndex((c, idx) => {
        const cellCol = c.i !== undefined ? c.i : idx;
        return cellCol === col;
    });

    if (cellIndex >= 0) {
        const newCell = { ...newCells[cellIndex] };
        const newCellData = { ...newCell.c };
        newCellData.detailParameter = detailParameter;
        newCell.c = newCellData;
        newCells[cellIndex] = newCell;
    }

    newRowData.c = newCells;
    newRow.row = newRowData;
    newRowsItem[row] = newRow;

    return {
        ...template,
        rowsItem: newRowsItem
    };
}

/**
 * Создает примечание к ячейке
 */
export function createCellNote(
    template: TemplateDocument,
    row: number,
    col: number,
    text: string,
    coordinates?: {
        beginRow?: number;
        endRow?: number;
        beginColumn?: number;
        endColumn?: number;
    }
): TemplateDocument {
    const note: any = {
        drawingType: 'Comment',
        id: 0,
        text: {
            'v8:item': {
                'v8:lang': 'ru',
                'v8:content': text
            }
        },
        beginRow: coordinates?.beginRow ?? row,
        endRow: coordinates?.endRow ?? row,
        beginColumn: coordinates?.beginColumn ?? col,
        endColumn: coordinates?.endColumn ?? col,
        autoSize: true,
        pictureSize: 'Stretch'
    };

    return updateCellNote(template, row, col, note);
}

/**
 * Удаляет примечание к ячейке
 */
export function deleteCellNote(
    template: TemplateDocument,
    row: number,
    col: number
): TemplateDocument {
    const cell = findCellByPosition(template, row, col);
    if (!cell || !cell.c) {
        return template;
    }

    const newRowsItem = [...(template.rowsItem || [])];
    const newRow = { ...newRowsItem[row] };
    const newRowData = { ...newRow.row };
    const newCells = [...(newRowData.c || [])];
    const cellIndex = newCells.findIndex((c, idx) => {
        const cellCol = c.i !== undefined ? c.i : idx;
        return cellCol === col;
    });

    if (cellIndex >= 0) {
        const newCell = { ...newCells[cellIndex] };
        const newCellData = { ...newCell.c };
        delete newCellData.note;
        newCell.c = newCellData;
        newCells[cellIndex] = newCell;
    }

    newRowData.c = newCells;
    newRow.row = newRowData;
    newRowsItem[row] = newRow;

    return {
        ...template,
        rowsItem: newRowsItem
    };
}

/**
 * Создает пустую строку
 */
export function createEmptyRow(
    template: TemplateDocument,
    index: number
): TemplateDocument {
    const newRowsItem = [...(template.rowsItem || [])];
    
    const newRow: TemplateRow = {
        index,
        row: {
            empty: true
        }
    };

    newRowsItem.splice(index, 0, newRow);

    // Обновляем индексы последующих строк
    for (let i = index + 1; i < newRowsItem.length; i++) {
        newRowsItem[i] = { ...newRowsItem[i], index: i };
    }

    return {
        ...template,
        rowsItem: newRowsItem
    };
}

/**
 * Проверяет, является ли строка пустой
 */
export function isEmptyRow(
    template: TemplateDocument,
    index: number
): boolean {
    if (!template.rowsItem || index < 0 || index >= template.rowsItem.length) {
        return false;
    }

    const row = template.rowsItem[index];
    return row.row.empty === true;
}

/**
 * Находит позицию в массиве rowsItem для строки с указанным индексом
 */
function findRowArrayIndex(rowsItem: TemplateRow[], rowIndex: number): number {
    return rowsItem.findIndex((r, idx) => (r.index !== undefined ? r.index : idx) === rowIndex);
}

/**
 * Добавляет строку в макет.
 * Вставка по позиции в массиве (не по индексу строки), новый индекс = maxRowIndex + 1.
 */
export function addRow(
    template: TemplateDocument, 
    index: number, 
    position: 'above' | 'below'
): TemplateDocument {
    const newRowsItem = [...(template.rowsItem || [])];
    const arrayIndex = findRowArrayIndex(newRowsItem, index);
    if (arrayIndex < 0) {
        return template;
    }
    // «Ниже» — вставляем в конец массива, чтобы новые строки шли по порядку (75, 76, 77…)
    // «Выше» — вставляем перед выбранной строкой
    const insertArrayIndex = position === 'above' ? arrayIndex : newRowsItem.length;
    const newRowIndex = getMaxRowIndex(template) + 1;

    const newRow: TemplateRow = {
        index: newRowIndex,
        row: {
            columnsID: template.columns?.[0]?.id || '',
            formatIndex: 0,
            c: []
        }
    };

    newRowsItem.splice(insertArrayIndex, 0, newRow);

    return {
        ...template,
        rowsItem: newRowsItem
    };
}

/**
 * Удаляет строку из макета по индексу строки (не по позиции в массиве)
 */
export function deleteRow(
    template: TemplateDocument, 
    index: number
): TemplateDocument {
    const newRowsItem = [...(template.rowsItem || [])];
    const arrayIndex = findRowArrayIndex(newRowsItem, index);
    if (arrayIndex < 0) {
        return template;
    }

    newRowsItem.splice(arrayIndex, 1);

    return {
        ...template,
        rowsItem: newRowsItem
    };
}

/**
 * Обновляет текст ячейки
 */
export function updateCellText(
    template: TemplateDocument, 
    row: number, 
    col: number, 
    text: string
): TemplateDocument {
    const cell = findCellByPosition(template, row, col);
    if (!cell) {
        return template;
    }

    const newRowsItem = [...(template.rowsItem || [])];
    const newRow = { ...newRowsItem[row] };
    const newRowData = { ...newRow.row };
    const newCells = [...(newRowData.c || [])];
    const cellIndex = newCells.findIndex(c => c.i === col);

    if (cellIndex >= 0) {
        const newCell = { ...newCells[cellIndex] };
        const newCellData = { ...newCell.c };
        
        // Обновляем текст в зависимости от формата заполнения
        const fillPattern = getCellFillPattern(template, row, col);
        if (fillPattern === 'parameter') {
            // Если текст начинается с [ и заканчивается ], извлекаем имя параметра
            const match = text.match(/^\[(.+)\]$/);
            if (match) {
                newCellData.parameter = match[1];
                delete newCellData.tl;
            } else {
                // Если формат не соответствует параметру, переключаемся на шаблон
                newCellData.tl = {
                    'v8:item': {
                        'v8:lang': 'ru',
                        'v8:content': text
                    }
                } as TemplateTextData;
                delete newCellData.parameter;
            }
        } else {
            // Обновляем шаблон
            newCellData.tl = {
                'v8:item': {
                    'v8:lang': 'ru',
                    'v8:content': text
                }
            } as TemplateTextData;
            delete newCellData.parameter;
        }
        
        newCell.c = newCellData;
        newCells[cellIndex] = newCell;
    }

    newRowData.c = newCells;
    newRow.row = newRowData;
    newRowsItem[row] = newRow;

    return {
        ...template,
        rowsItem: newRowsItem
    };
}

/**
 * Объединяет ячейки в диапазоне
 * Важно: При объединении текст берется из верхней левой ячейки (startRow, startCol)
 * Содержимое остальных ячеек теряется
 */
export function mergeCells(
    template: TemplateDocument,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
): TemplateDocument {
    // Нормализуем координаты
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    // Если диапазон состоит из одной ячейки, ничего не делаем
    if (minRow === maxRow && minCol === maxCol) {
        return template;
    }

    // Получаем содержимое верхней левой ячейки (может быть пустой)
    const topLeftCell = findCellByPosition(template, minRow, minCol);

    // Создаем новую запись объединения
    const newMerge: TemplateMergeCells = {
        r: minRow,
        c: minCol,
        w: maxCol - minCol + 1,
        h: maxRow - minRow + 1
    };

    // Добавляем объединение в список (или обновляем существующее)
    const newMerges = [...(template.merge || [])];
    const existingMergeIndex = newMerges.findIndex(
        m => m.r === minRow && m.c === minCol
    );

    if (existingMergeIndex >= 0) {
        newMerges[existingMergeIndex] = newMerge;
    } else {
        newMerges.push(newMerge);
    }

    // Удаляем ячейки, которые вошли в объединение (кроме верхней левой)
    const newRowsItem = [...(template.rowsItem || [])];
    for (let row = minRow; row <= maxRow; row++) {
        if (row >= newRowsItem.length) continue;

        const newRow = { ...newRowsItem[row] };
        const newRowData = { ...newRow.row };
        const newCells = [...(newRowData.c || [])];

        // Если верхняя левая ячейка не существует, создаем её
        if (row === minRow) {
            const topLeftExists = newCells.some(cell => {
                const cellCol = cell.i !== undefined ? cell.i : newCells.indexOf(cell);
                return cellCol === minCol;
            });
            if (!topLeftExists) {
                // Создаем пустую ячейку для верхней левой позиции
                const newCell: TemplateCell = { i: minCol, c: topLeftCell?.c || { f: 0 } };
                newCells.push(newCell);
                // Сортируем ячейки по индексу
                newCells.sort((a, b) => {
                    const aIndex = a.i !== undefined ? a.i : 0;
                    const bIndex = b.i !== undefined ? b.i : 0;
                    return aIndex - bIndex;
                });
            }
        }

        // Фильтруем ячейки: оставляем только те, которые не входят в объединение
        // Или являются верхней левой ячейкой
        let currentColIndex = 0;
        const filteredCells = newCells.filter(cell => {
            const cellCol = cell.i !== undefined ? cell.i : currentColIndex;
            currentColIndex = cellCol + 1;
            
            if (cellCol === minCol && row === minRow) {
                return true; // Верхняя левая ячейка - оставляем
            }
            // Проверяем, не входит ли ячейка в диапазон объединения
            if (row >= minRow && row <= maxRow && cellCol >= minCol && cellCol <= maxCol) {
                return false; // Удаляем
            }
            return true; // Оставляем
        });

        newRowData.c = filteredCells;
        newRow.row = newRowData;
        newRowsItem[row] = newRow;
    }

    return {
        ...template,
        rowsItem: newRowsItem,
        merge: newMerges
    };
}

/**
 * Разъединяет объединенные ячейки
 */
export function unmergeCells(
    template: TemplateDocument,
    row: number,
    col: number
): TemplateDocument {
    // Находим объединение, которое содержит эту ячейку
    const merges = template.merge || [];
    const mergeIndex = merges.findIndex(m => {
        const mergeHeight = m.h !== undefined ? m.h : 0;
        return row >= m.r && row < m.r + mergeHeight &&
               col >= m.c && col < m.c + m.w;
    });

    if (mergeIndex < 0) {
        return template; // Нет объединения для этой ячейки
    }

    const merge = merges[mergeIndex];
    const topLeftCell = findCellByPosition(template, merge.r, merge.c);
    
    // Удаляем объединение
    const newMerges = [...merges];
    newMerges.splice(mergeIndex, 1);

    // Восстанавливаем ячейки в диапазоне объединения
    const newRowsItem = [...(template.rowsItem || [])];
    
    // Получаем содержимое верхней левой ячейки (если есть)
    const cellData = topLeftCell?.c || { f: 0 };

    const mergeHeight = merge.h !== undefined ? merge.h : 0;
    for (let r = merge.r; r < merge.r + mergeHeight; r++) {
        if (r >= newRowsItem.length) continue;

        const newRow = { ...newRowsItem[r] };
        const newRowData = { ...newRow.row };
        const newCells = [...(newRowData.c || [])];

        for (let c = merge.c; c < merge.c + merge.w; c++) {
            // Проверяем, не существует ли уже ячейка с таким индексом
            const existingCellIndex = newCells.findIndex(cell => {
                const cellCol = cell.i !== undefined ? cell.i : newCells.indexOf(cell);
                return cellCol === c;
            });
            
            if (existingCellIndex < 0) {
                // Добавляем новую ячейку
                newCells.push({
                    i: c,
                    c: r === merge.r && c === merge.c ? cellData : { f: 0 }
                });
            }
        }

        // Сортируем ячейки по индексу (с учетом undefined)
        newCells.sort((a, b) => {
            const aIndex = a.i !== undefined ? a.i : 0;
            const bIndex = b.i !== undefined ? b.i : 0;
            return aIndex - bIndex;
        });

        newRowData.c = newCells;
        newRow.row = newRowData;
        newRowsItem[r] = newRow;
    }

    return {
        ...template,
        rowsItem: newRowsItem,
        merge: newMerges
    };
}

/**
 * Добавляет колонку в макет
 */
export function addColumn(
    template: TemplateDocument,
    index: number,
    position: 'left' | 'right'
): TemplateDocument {
    const insertIndex = position === 'left' ? index : index + 1;
    const newRowsItem = [...(template.rowsItem || [])];

    // Обновляем индексы ячеек во всех строках
    for (let rowIndex = 0; rowIndex < newRowsItem.length; rowIndex++) {
        const newRow = { ...newRowsItem[rowIndex] };
        const newRowData = { ...newRow.row };
        const newCells = [...(newRowData.c || [])];

        // Обновляем индексы ячеек, которые идут после вставки
        let currentColIdx = 0;
        const updatedCells = newCells.map(cell => {
            const cellCol = cell.i !== undefined ? cell.i : currentColIdx;
            currentColIdx = cellCol + 1;
            
            if (cellCol >= insertIndex) {
                return { ...cell, i: cellCol + 1 };
            }
            return cell;
        });

        // Вставляем новую ячейку в нужную позицию (если нужно)
        const newCellIndex = newCells.findIndex(c => {
            const cellCol = c.i !== undefined ? c.i : newCells.indexOf(c);
            return cellCol === insertIndex;
        });
        if (newCellIndex < 0) {
            updatedCells.push({
                i: insertIndex,
                c: { f: 0 }
            });
            updatedCells.sort((a, b) => {
                const aIndex = a.i !== undefined ? a.i : 0;
                const bIndex = b.i !== undefined ? b.i : 0;
                return aIndex - bIndex;
            });
        }

        newRowData.c = updatedCells;
        newRow.row = newRowData;
        newRowsItem[rowIndex] = newRow;
    }

    // Обновляем индексы объединенных ячеек
    const newMerges = (template.merge || []).map(merge => {
        if (merge.c >= insertIndex) {
            return { ...merge, c: merge.c + 1 };
        }
        if (merge.c + merge.w > insertIndex) {
            // Объединение расширяется
            return { ...merge, w: merge.w + 1 };
        }
        return merge;
    });

    // Обновляем индексы именованных областей
    const newNamedItems = (template.namedItem || []).map(namedItem => {
        const area = namedItem.area;
        if (area.beginColumn >= insertIndex) {
            return {
                ...namedItem,
                area: {
                    ...area,
                    beginColumn: area.beginColumn + 1,
                    endColumn: area.endColumn + 1
                }
            };
        }
        if (area.endColumn >= insertIndex) {
            return {
                ...namedItem,
                area: {
                    ...area,
                    endColumn: area.endColumn + 1
                }
            };
        }
        return namedItem;
    });

    return {
        ...template,
        rowsItem: newRowsItem,
        merge: newMerges,
        namedItem: newNamedItems
    };
}

/**
 * Вычисляет ширину колонки по алгоритму 1С:
 * Ищем все теги <width>, последний найденный определяет последнюю колонку с измененной шириной.
 * Если width=72, это ширина по умолчанию.
 * 
 * @param template - Документ шаблона
 * @param col - Индекс колонки (начиная с 0)
 * @param columnsGroup - Группа колонок (TemplateColumns)
 * @returns Ширина колонки в пикселях (строка с "px" или число)
 */
export function calculateColumnWidth(
    template: TemplateDocument,
    col: number,
    columnsGroup: { columnsItem?: Array<{ index: number; column: { formatIndex?: number } }> } | null
): string | number {
    const DEFAULT_WIDTH = 72; // Ширина по умолчанию в 1С
    
    if (!columnsGroup || !columnsGroup.columnsItem || !template.format) {
        return DEFAULT_WIDTH;
    }
    
    // Ищем все колонки с индексом <= col, которые имеют формат с width
    // Сортируем по индексу колонки (от меньшего к большему)
    const columnsWithWidth: Array<{ index: number; width: string | number }> = [];
    
    for (let i = 0; i <= col; i++) {
        const columnItem = columnsGroup.columnsItem.find(item => item.index === i);
        const formatIndexVal = columnItem?.column?.formatIndex ?? (columnItem as any)?.formatIndex;
        if (columnItem && formatIndexVal !== undefined) {
            const formatIndex = formatIndexVal - 1; // formatIndex начинается с 1
            if (formatIndex >= 0 && formatIndex < template.format.length) {
                const format = template.format[formatIndex];
                if (format && format.width !== undefined && format.width !== null) {
                    columnsWithWidth.push({
                        index: i,
                        width: format.width
                    });
                }
            }
        }
    }
    
    // Если не найдено ни одного формата с width, возвращаем ширину по умолчанию
    if (columnsWithWidth.length === 0) {
        return DEFAULT_WIDTH;
    }
    
    // Берем последний найденный width (последняя колонка с измененной шириной)
    const lastWidth = columnsWithWidth[columnsWithWidth.length - 1].width;
    
    // Если width=72, это ширина по умолчанию
    if (lastWidth === 72 || lastWidth === '72' || lastWidth === '72px') {
        return DEFAULT_WIDTH;
    }
    
    // Нормализуем значение: если число, возвращаем как есть, иначе возвращаем строку
    if (typeof lastWidth === 'number') {
        return lastWidth;
    }
    
    // Если строка, проверяем, содержит ли она "px"
    if (typeof lastWidth === 'string') {
        if (lastWidth.includes('px')) {
            return lastWidth;
        }
        // Если число в строке, преобразуем в число
        const numValue = parseFloat(lastWidth);
        if (!isNaN(numValue)) {
            return numValue;
        }
    }
    
    return DEFAULT_WIDTH;
}

/**
 * Вычисляет высоту строки.
 * Используется высота формата ТЕКУЩЕЙ строки (не каскад от предыдущих).
 * Если у формата нет height или height=0 — возвращаем undefined (автовысота / document.height).
 * 
 * @param template - Документ шаблона
 * @param rowIndex - Индекс строки (начиная с 0)
 * @returns Высота в px (число/строка) или undefined для высоты по умолчанию
 */
export function calculateRowHeight(
    template: TemplateDocument,
    rowIndex: number
): string | number | undefined {
    const defaultHeight = (template.height ?? 20) / 3;

    if (!template.rowsItem || !template.format) {
        return defaultHeight;
    }

    const templateRow = template.rowsItem.find(r => (r.index !== undefined ? r.index : template.rowsItem!.indexOf(r)) === rowIndex);
    if (!templateRow || !templateRow.row || templateRow.row.formatIndex === undefined) {
        return defaultHeight;
    }

    const formatIndex = templateRow.row.formatIndex - 1;
    if (formatIndex < 0 || formatIndex >= template.format.length) {
        return defaultHeight;
    }

    const format = template.format[formatIndex];
    if (!format || format.height === undefined || format.height === null) {
        return defaultHeight;
    }

    const h = format.height;
    if (h === 0 || h === '0' || h === '0px') {
        return defaultHeight;
    }

    if (typeof h === 'number') return h;
    if (typeof h === 'string' && h.includes('px')) return h;
    const num = parseFloat(String(h));
    return !isNaN(num) && num !== 0 ? num : defaultHeight;
}

/**
 * Удаляет колонку из макета
 */
export function deleteColumn(
    template: TemplateDocument,
    index: number
): TemplateDocument {
    const newRowsItem = [...(template.rowsItem || [])];

    // Удаляем ячейки с указанным индексом и обновляем индексы остальных
    for (let rowIndex = 0; rowIndex < newRowsItem.length; rowIndex++) {
        const newRow = { ...newRowsItem[rowIndex] };
        const newRowData = { ...newRow.row };
        const newCells = [...(newRowData.c || [])];

        // Удаляем ячейку с указанным индексом
        let currentColIdx = 0;
        const filteredCells = newCells
            .filter(cell => {
                const cellCol = cell.i !== undefined ? cell.i : currentColIdx;
                currentColIdx = cellCol + 1;
                return cellCol !== index;
            })
            .map(cell => {
                const cellCol = cell.i !== undefined ? cell.i : 0;
                if (cellCol > index) {
                    return { ...cell, i: cellCol - 1 };
                }
                return cell;
            });

        newRowData.c = filteredCells;
        newRow.row = newRowData;
        newRowsItem[rowIndex] = newRow;
    }

    // Обновляем индексы объединенных ячеек
    const newMerges = (template.merge || [])
        .map(merge => {
            // Если объединение начинается после удаляемой колонки
            if (merge.c > index) {
                return { ...merge, c: merge.c - 1 };
            }
            // Если объединение содержит удаляемую колонку
            if (merge.c <= index && merge.c + merge.w > index) {
                if (merge.w > 1) {
                    return { ...merge, w: merge.w - 1 };
                } else {
                    return null; // Удаляем объединение, так как оно состояло из одной ячейки
                }
            }
            return merge;
        })
        .filter((m): m is TemplateMergeCells => m !== null);

    // Обновляем индексы именованных областей
    const newNamedItems = (template.namedItem || [])
        .map(namedItem => {
            const area = namedItem.area;
            // Если область полностью после удаляемой колонки
            if (area.beginColumn > index) {
                return {
                    ...namedItem,
                    area: {
                        ...area,
                        beginColumn: area.beginColumn - 1,
                        endColumn: area.endColumn - 1
                    }
                };
            }
            // Если область содержит удаляемую колонку
            if (area.beginColumn <= index && area.endColumn >= index) {
                if (area.endColumn > area.beginColumn) {
                    return {
                        ...namedItem,
                        area: {
                            ...area,
                            endColumn: area.endColumn - 1
                        }
                    };
                } else {
                    return null; // Область состояла из одной колонки - удаляем
                }
            }
            return namedItem;
        })
        .filter((item): item is NamedItem => item !== null);

    return {
        ...template,
        rowsItem: newRowsItem,
        merge: newMerges,
        namedItem: newNamedItems
    };
}


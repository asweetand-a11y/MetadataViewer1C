"use strict";
/**
 * Утилиты для работы с макетами 1С
 * Функции для изменения структуры макета, работы с форматами заполнения и именованными областями
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmptyRow = exports.deleteCellNote = exports.createCellNote = exports.updateCellDetailParameter = exports.updateCellNote = exports.updateCellColors = exports.updateCellBorders = exports.updateCellAlignment = exports.updateCellFont = exports.updateCellFormat = exports.getEffectiveFont = exports.hasTemplateBorderSide = exports.formatBorderLineCode = exports.resolveTemplateBorderColorForCss = exports.extractTemplateFormatColorString = exports.getEffectiveFormat = exports.resolveColumnsGroupForRow = exports.renameNamedArea = exports.deleteNamedArea = exports.updateNamedArea = exports.generateNamedAreaName = exports.createNamedColumns = exports.createNamedRows = exports.createNamedArea = exports.isCellOnNamedAreaBoundary = exports.getNamedAreasForColumn = exports.getNamedAreasForRow = exports.getNamedAreaForColumn = exports.getNamedAreaForRow = exports.namedAreaMatchesColumnsId = exports.findNamedAreaByPosition = exports.validateNamedArea = exports.validateNamedAreaName = exports.getNamedArea = exports.getAllNamedAreas = exports.getMaxRowIndex = exports.getMinRowIndex = exports.getMaxColumns = exports.extractTextFromTemplateTextData = exports.toggleCellFillPattern = exports.setCellAsTemplate = exports.setCellAsParameter = exports.convertParameterToTemplate = exports.parseTemplateParameters = exports.extractParameterFromTemplate = exports.getCellFillPattern = exports.extractStringValue = exports.findCellByPosition = exports.toTemplateIndex = exports.updateTemplateDocument = void 0;
exports.deleteColumn = exports.calculateRowHeight = exports.calculateColumnWidth = exports.DEFAULT_ROW_HEIGHT_PX = exports.DEFAULT_COLUMN_WIDTH_PX = exports.addColumn = exports.unmergeCells = exports.mergeCells = exports.updateCellText = exports.deleteRow = exports.addRow = exports.isEmptyRow = void 0;
/**
 * Обновляет документ макета с изменениями
 */
function updateTemplateDocument(original, changes) {
    return {
        ...original,
        ...changes
    };
}
exports.updateTemplateDocument = updateTemplateDocument;
/**
 * Находит ячейку по позиции (row, col).
 * row — логический индекс строки (row.index), не индекс в массиве.
 */
/** Приводит индекс строки/колонки из XML (число или строка) к number. */
function toTemplateIndex(value, fallback) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
exports.toTemplateIndex = toTemplateIndex;
function findCellByPosition(template, row, col) {
    if (!template.rowsItem) {
        return null;
    }
    const logicalRow = toTemplateIndex(row, -1);
    const logicalCol = toTemplateIndex(col, -1);
    // Ищем строку по row.index (логический индекс)
    const templateRow = template.rowsItem.find((r, idx) => toTemplateIndex(r.index, idx) === logicalRow);
    if (!templateRow || !templateRow.row || !templateRow.row.c) {
        return null;
    }
    // Ищем ячейку с индексом col
    let currentIndex = 0;
    for (const cell of templateRow.row.c) {
        if (cell.i !== undefined) {
            const cellIndex = toTemplateIndex(cell.i, currentIndex);
            if (cellIndex === logicalCol) {
                return cell;
            }
            currentIndex = cellIndex + 1;
        }
        else {
            if (currentIndex === logicalCol) {
                return cell;
            }
            currentIndex++;
        }
    }
    return null;
}
exports.findCellByPosition = findCellByPosition;
/**
 * Извлекает строку из значения (может быть строка или объект парсера { "#text": "..." }).
 * Экспорт для использования при отображении содержимого ячеек.
 */
function extractStringValue(val) {
    if (val == null)
        return '';
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object') {
        return val['#text'] ?? val.text ?? val.content ?? String(val);
    }
    return String(val);
}
exports.extractStringValue = extractStringValue;
/**
 * Определяет формат заполнения ячейки
 * Возвращает 'parameter' если есть <parameter>, 'template' если есть <tl> с текстом, 'none' если пустая
 */
function getCellFillPattern(template, row, col) {
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
exports.getCellFillPattern = getCellFillPattern;
/**
 * Проверяет, есть ли текстовое содержимое в TemplateTextData
 */
function hasTextContent(tl) {
    if (!tl) {
        return false;
    }
    // Вспомогательная функция для извлечения строкового значения из v8:content
    const getContentString = (content) => {
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
                if (!i || !i['v8:content'])
                    return false;
                const content = getContentString(i['v8:content']);
                return content.trim() !== '';
            });
        }
        else if (item && item['v8:content']) {
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
        }
        else if (typeof tl[key] === 'string' && tl[key].trim() !== '') {
            return true;
        }
    }
    return false;
}
/**
 * Извлекает имя параметра из шаблона вида [ИмяПараметра] или текст [ИмяПараметра]
 * Возвращает null, если параметров несколько или их нет
 */
function extractParameterFromTemplate(templateText) {
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
exports.extractParameterFromTemplate = extractParameterFromTemplate;
/**
 * Извлекает все параметры из шаблона (все вхождения [Имя])
 */
function parseTemplateParameters(templateText) {
    if (!templateText) {
        return [];
    }
    const paramRegex = /\[([^\]]+)\]/g;
    const matches = [...templateText.matchAll(paramRegex)];
    return matches.map(match => match[1]);
}
exports.parseTemplateParameters = parseTemplateParameters;
/**
 * Преобразует имя параметра в шаблон: ИмяПараметра → [ИмяПараметра]
 */
function convertParameterToTemplate(parameterName) {
    return `[${parameterName}]`;
}
exports.convertParameterToTemplate = convertParameterToTemplate;
/**
 * Устанавливает ячейку как параметр (формат "параметр")
 * Создает <parameter>Имя</parameter>, удаляет <tl>
 */
function setCellAsParameter(template, row, col, parameterName) {
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
    }
    else {
        // Ячейка не существует - создаем новую
        // Определяем правильный индекс для вставки
        let insertIndex = newCells.length;
        let currentColIndex = 0;
        for (let i = 0; i < newCells.length; i++) {
            const cellCol = (newCells[i].i !== undefined ? newCells[i].i : currentColIndex);
            if (cellCol > col) {
                insertIndex = i;
                break;
            }
            currentColIndex = cellCol + 1;
        }
        const newCell = {
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
exports.setCellAsParameter = setCellAsParameter;
/**
 * Устанавливает ячейку как шаблон (формат "шаблон")
 * Создает <tl> с текстом, удаляет <parameter>
 */
function setCellAsTemplate(template, row, col, templateText) {
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
    }
    else {
        // Ячейка не существует - создаем новую
        // Определяем правильный индекс для вставки
        let insertIndex = newCells.length;
        let currentColIndex = 0;
        for (let i = 0; i < newCells.length; i++) {
            const cellCol = (newCells[i].i !== undefined ? newCells[i].i : currentColIndex);
            if (cellCol > col) {
                insertIndex = i;
                break;
            }
            currentColIndex = cellCol + 1;
        }
        const newCell = {
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
exports.setCellAsTemplate = setCellAsTemplate;
/**
 * Переключает формат заполнения ячейки
 * Если 'parameter' → преобразует в 'template' (извлекает имя параметра и создает текст [Имя])
 * Если 'template' → пытается извлечь единственный параметр из текста и преобразует в 'parameter'
 */
function toggleCellFillPattern(template, row, col) {
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
    }
    else if (currentPattern === 'template') {
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
exports.toggleCellFillPattern = toggleCellFillPattern;
/**
 * Извлекает текстовое содержимое из TemplateTextData
 */
function extractTextFromTemplateTextData(tl) {
    if (!tl) {
        return '';
    }
    // Вспомогательная функция для извлечения строкового значения из v8:content
    const getContentString = (content) => {
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
        }
        else if (item && item['v8:content']) {
            return getContentString(item['v8:content']);
        }
    }
    // Проверяем прямое наличие content
    if (tl.content) {
        return getContentString(tl.content);
    }
    return '';
}
exports.extractTextFromTemplateTextData = extractTextFromTemplateTextData;
/**
 * Возвращает максимальный индекс колонки в макете
 */
function getMaxColumns(template) {
    let max = 0;
    if (template.rowsItem) {
        template.rowsItem.forEach(row => {
            if (row.row?.c) {
                let currentColIndex = 0;
                row.row.c.forEach((cell) => {
                    const colIndex = cell.i !== undefined ? cell.i : currentColIndex;
                    if (colIndex >= max)
                        max = colIndex + 1;
                    currentColIndex = colIndex + 1;
                });
            }
        });
    }
    if (template.columns?.length) {
        template.columns.forEach((cg) => {
            if (cg.size !== undefined)
                max = Math.max(max, cg.size);
            cg.columnsItem?.forEach(item => {
                if (item.index !== undefined && item.index >= max)
                    max = item.index + 1;
            });
        });
    }
    return Math.max(max, 1);
}
exports.getMaxColumns = getMaxColumns;
/**
 * Возвращает минимальный индекс строки в макете
 */
function getMinRowIndex(template) {
    if (!template.rowsItem?.length)
        return 0;
    let min = toTemplateIndex(template.rowsItem[0].index, 0);
    template.rowsItem.forEach((row, idx) => {
        const rIndex = toTemplateIndex(row.index, idx);
        if (rIndex < min)
            min = rIndex;
    });
    return min;
}
exports.getMinRowIndex = getMinRowIndex;
/**
 * Возвращает максимальный индекс строки в макете
 */
function getMaxRowIndex(template) {
    if (!template.rowsItem?.length)
        return 0;
    let max = 0;
    template.rowsItem.forEach((row, idx) => {
        const rIndex = toTemplateIndex(row.index, idx);
        if (rIndex > max)
            max = rIndex;
    });
    return max;
}
exports.getMaxRowIndex = getMaxRowIndex;
/**
 * Получает все именованные области из документа макета
 */
function getAllNamedAreas(template) {
    const namedAreas = new Map();
    if (!template.namedItem || !Array.isArray(template.namedItem)) {
        return namedAreas;
    }
    template.namedItem.forEach(item => {
        if (item.name && item.area) {
            const area = item.area;
            const beginRow = toTemplateIndex(area.beginRow, 0);
            const beginCol = area.beginColumn === undefined || area.beginColumn === null ? -1 : toTemplateIndex(area.beginColumn, -1);
            const endRow = toTemplateIndex(area.endRow, 0);
            const endCol = area.endColumn === undefined || area.endColumn === null ? -1 : toTemplateIndex(area.endColumn, -1);
            let areaType = area.type;
            if (!areaType && beginCol === -1 && endCol === -1) {
                areaType = 'Rows';
            }
            if (!areaType)
                areaType = 'Rectangle';
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
exports.getAllNamedAreas = getAllNamedAreas;
/**
 * Получает именованную область по имени
 */
function getNamedArea(template, name) {
    const allAreas = getAllNamedAreas(template);
    return allAreas.get(name) || null;
}
exports.getNamedArea = getNamedArea;
/**
 * Валидирует имя именованной области
 */
function validateNamedAreaName(template, name, oldName) {
    if (!name || name.trim() === '') {
        return { valid: false, error: 'Имя области не может быть пустым' };
    }
    const trimmedName = name.trim();
    // Проверяем уникальность имени (исключаем старое имя при редактировании)
    const allAreas = getAllNamedAreas(template);
    if (oldName && oldName === trimmedName) {
        // Имя не изменилось - это нормально
    }
    else if (allAreas.has(trimmedName)) {
        return { valid: false, error: `Область с именем "${trimmedName}" уже существует` };
    }
    // Проверяем допустимые символы (обычно буквы, цифры, подчеркивание)
    if (!/^[a-zA-Zа-яА-Я0-9_]+$/.test(trimmedName)) {
        return { valid: false, error: 'Имя области может содержать только буквы, цифры и подчеркивание' };
    }
    return { valid: true };
}
exports.validateNamedAreaName = validateNamedAreaName;
/**
 * Валидирует именованную область с учетом типа
 */
function validateNamedArea(areaType, startRow, startCol, endRow, endCol) {
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
    }
    else if (areaType === 'Columns') {
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
    }
    else {
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
exports.validateNamedArea = validateNamedArea;
/**
 * Находит все именованные области, которые содержат указанную ячейку
 */
function findNamedAreaByPosition(template, row, col) {
    const allAreas = getAllNamedAreas(template);
    const matchingAreas = [];
    const logicalRow = toTemplateIndex(row, -1);
    const logicalCol = toTemplateIndex(col, -1);
    allAreas.forEach(area => {
        if (area.areaType === 'Rows') {
            if (logicalRow >= area.startRow && logicalRow <= area.endRow) {
                matchingAreas.push(area);
            }
        }
        else if (area.areaType === 'Columns') {
            if (logicalCol >= area.startCol && logicalCol <= area.endCol) {
                matchingAreas.push(area);
            }
        }
        else {
            if (logicalRow >= area.startRow && logicalRow <= area.endRow &&
                logicalCol >= area.startCol && logicalCol <= area.endCol) {
                matchingAreas.push(area);
            }
        }
    });
    return matchingAreas;
}
exports.findNamedAreaByPosition = findNamedAreaByPosition;
/**
 * Получает именованную область типа "Rows" для указанной строки
 * Возвращает первую найденную область или null
 */
/** Область без columnsID действует на все форматы строк, как в конфигураторе 1С. */
function namedAreaMatchesColumnsId(area, columnsID) {
    if (!area.columnsID) {
        return true;
    }
    return area.columnsID === columnsID;
}
exports.namedAreaMatchesColumnsId = namedAreaMatchesColumnsId;
function getNamedAreaForRow(template, rowIndex, columnsID) {
    const allAreas = getAllNamedAreas(template);
    const logicalRow = toTemplateIndex(rowIndex, -1);
    for (const area of allAreas.values()) {
        if (area.areaType === 'Rows') {
            if (logicalRow >= area.startRow && logicalRow <= area.endRow && namedAreaMatchesColumnsId(area, columnsID)) {
                return area;
            }
        }
    }
    return null;
}
exports.getNamedAreaForRow = getNamedAreaForRow;
/**
 * Получает именованную область типа "Columns" для указанной колонки
 * Возвращает первую найденную область или null
 */
function getNamedAreaForColumn(template, colIndex, columnsID) {
    const allAreas = getAllNamedAreas(template);
    const logicalCol = toTemplateIndex(colIndex, -1);
    for (const area of allAreas.values()) {
        if (area.areaType === 'Columns') {
            if (logicalCol >= area.startCol && logicalCol <= area.endCol && namedAreaMatchesColumnsId(area, columnsID)) {
                return area;
            }
        }
    }
    return null;
}
exports.getNamedAreaForColumn = getNamedAreaForColumn;
/**
 * Получает все именованные области типа "Rows" для указанной строки
 * Исключает области типа "Rectangle"
 * Возвращает массив всех подходящих областей
 */
function getNamedAreasForRow(template, rowIndex, columnsID) {
    const allAreas = getAllNamedAreas(template);
    const result = [];
    const logicalRow = toTemplateIndex(rowIndex, -1);
    for (const area of allAreas.values()) {
        if (area.areaType === 'Rows') {
            if (logicalRow >= area.startRow && logicalRow <= area.endRow && namedAreaMatchesColumnsId(area, columnsID)) {
                result.push(area);
            }
        }
    }
    return result;
}
exports.getNamedAreasForRow = getNamedAreasForRow;
/**
 * Получает все именованные области типа "Columns" для указанной колонки
 * Исключает области типа "Rectangle"
 * Возвращает массив всех подходящих областей
 */
function getNamedAreasForColumn(template, colIndex, columnsID) {
    const allAreas = getAllNamedAreas(template);
    const result = [];
    const logicalCol = toTemplateIndex(colIndex, -1);
    for (const area of allAreas.values()) {
        if (area.areaType === 'Columns') {
            if (logicalCol >= area.startCol && logicalCol <= area.endCol && namedAreaMatchesColumnsId(area, columnsID)) {
                result.push(area);
            }
        }
    }
    return result;
}
exports.getNamedAreasForColumn = getNamedAreasForColumn;
/**
 * Определяет, находится ли ячейка на границе именованной области
 * Возвращает объект с флагами для каждой стороны границы
 */
function isCellOnNamedAreaBoundary(template, rowIndex, colIndex, area) {
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
    }
    else if (area.areaType === 'Columns') {
        // Для типа Columns: границы ТОЛЬКО на первой и последней колонке области
        // beginRow=-1 и endRow=-1 означает все строки
        result.left = colIndex === area.startCol;
        result.right = colIndex === area.endCol;
        // Для типа Columns верхняя и нижняя границы должны быть на всех строках
        // Но только на первой и последней колонке области
        if (result.left || result.right) {
            if (template.rowsItem && template.rowsItem.length > 0) {
                const minRow = getMinRowIndex(template);
                const maxRow = getMaxRowIndex(template);
                result.top = toTemplateIndex(rowIndex, -1) === minRow;
                result.bottom = toTemplateIndex(rowIndex, -1) === maxRow;
            }
            else {
                result.top = false;
                result.bottom = false;
            }
        }
        else {
            result.top = false;
            result.bottom = false;
        }
    }
    else {
        // Для типа Rectangle: границы по всем сторонам
        result.top = rowIndex === area.startRow;
        result.bottom = rowIndex === area.endRow;
        result.left = colIndex === area.startCol;
        result.right = colIndex === area.endCol;
    }
    return result;
}
exports.isCellOnNamedAreaBoundary = isCellOnNamedAreaBoundary;
/**
 * Создает именованную область
 */
function createNamedArea(template, name, areaType, startRow, startCol, endRow, endCol, columnsID) {
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
    }
    else if (areaType === 'Columns') {
        // Для именованных колонок: координаты строк = -1
        finalStartRow = -1;
        finalEndRow = -1;
    }
    const newNamedItem = {
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
exports.createNamedArea = createNamedArea;
/**
 * Создает именованную область для строк (тип "Rows").
 * columnsID — привязка к формату строк (для отображения в строках с этим columnsID)
 */
function createNamedRows(template, name, startRow, endRow, columnsID) {
    return createNamedArea(template, name, 'Rows', startRow, -1, endRow, -1, columnsID);
}
exports.createNamedRows = createNamedRows;
/**
 * Создает именованную область для колонок (тип "Columns")
 */
function createNamedColumns(template, name, startCol, endCol) {
    return createNamedArea(template, name, 'Columns', -1, startCol, -1, endCol);
}
exports.createNamedColumns = createNamedColumns;
/**
 * Генерирует имя для именованной области на основе диапазона
 */
function generateNamedAreaName(template, areaType, start, end) {
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
exports.generateNamedAreaName = generateNamedAreaName;
/**
 * Обновляет именованную область
 */
function updateNamedArea(template, oldName, updates) {
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
    const updatedItem = {
        ...existingItem,
        name: updates.name || existingItem.name,
        area: {
            ...existingItem.area,
            type: (updates.areaType || existingItem.area.type),
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
exports.updateNamedArea = updateNamedArea;
/**
 * Удаляет именованную область
 */
function deleteNamedArea(template, name) {
    const newNamedItems = (template.namedItem || []).filter(item => item.name !== name);
    return {
        ...template,
        namedItem: newNamedItems.length > 0 ? newNamedItems : undefined
    };
}
exports.deleteNamedArea = deleteNamedArea;
/**
 * Переименовывает именованную область
 */
function renameNamedArea(template, oldName, newName) {
    return updateNamedArea(template, oldName, { name: newName });
}
exports.renameNamedArea = renameNamedArea;
/**
 * Слой формата по 1-based индексу из XML.
 */
function getFormatLayerByOneBasedIndex(template, formatIndex1Based) {
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
function overlayTemplateFormatLayers(...layers) {
    const acc = {};
    let sawLayer = false;
    for (const layer of layers) {
        if (!layer) {
            continue;
        }
        sawLayer = true;
        Object.keys(layer).forEach((k) => {
            const v = layer[k];
            if (v !== undefined) {
                acc[k] = v;
            }
        });
    }
    return sawLayer && Object.keys(acc).length > 0 ? acc : null;
}
function getDefaultColumnsGroup(template) {
    if (!template.columns?.length) {
        return null;
    }
    const defaultGroup = template.columns.find((c) => !c.id);
    return defaultGroup ?? template.columns[0] ?? null;
}
/**
 * Группа колонок для строки (по columnsID строки или группа по умолчанию).
 */
function resolveColumnsGroupForRow(template, rowIndex) {
    if (!template.columns?.length) {
        return null;
    }
    const logicalRow = toTemplateIndex(rowIndex, -1);
    const templateRow = template.rowsItem?.find((r, idx) => toTemplateIndex(r.index, idx) === logicalRow);
    const rowColumnsID = templateRow?.row.columnsID;
    if (rowColumnsID) {
        return template.columns.find((c) => c.id === rowColumnsID) ?? getDefaultColumnsGroup(template);
    }
    return getDefaultColumnsGroup(template);
}
exports.resolveColumnsGroupForRow = resolveColumnsGroupForRow;
/**
 * Получает эффективный формат ячейки: defaultFormat группы → format группы колонок → формат колонки → строка → ячейка.
 * Иначе границы из формата колонок (частый случай в типовых макетах) не попадали в визуализацию.
 */
function getEffectiveFormat(template, row, col) {
    const layers = [];
    const logicalRow = toTemplateIndex(row, -1);
    const logicalCol = toTemplateIndex(col, -1);
    layers.push(getFormatLayerByOneBasedIndex(template, template.defaultFormatIndex));
    const columnsGroup = resolveColumnsGroupForRow(template, logicalRow);
    if (columnsGroup) {
        layers.push(getFormatLayerByOneBasedIndex(template, columnsGroup.formatIndex));
        const colItem = findColumnItem(columnsGroup, logicalCol);
        const colFi = colItem?.column?.formatIndex ??
            colItem?.formatIndex;
        layers.push(getFormatLayerByOneBasedIndex(template, colFi));
    }
    const templateRow = template.rowsItem?.find((r, idx) => toTemplateIndex(r.index, idx) === logicalRow);
    if (templateRow?.row) {
        layers.push(getFormatLayerByOneBasedIndex(template, templateRow.row.formatIndex));
    }
    const cell = findCellByPosition(template, logicalRow, logicalCol);
    if (cell?.c?.f !== undefined) {
        layers.push(getFormatLayerByOneBasedIndex(template, cell.c.f));
    }
    return overlayTemplateFormatLayers(...layers);
}
exports.getEffectiveFormat = getEffectiveFormat;
/**
 * Извлекает строку цвета из поля формата макета (после парсинга XML значение часто приходит как объект с #text).
 */
function extractTemplateFormatColorString(color) {
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
        const o = color;
        if (typeof o['#text'] === 'string') {
            return o['#text'];
        }
        if (o['$'] && typeof o['$'] === 'object' && o['$']['xmlns:d3p1']) {
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
exports.extractTemplateFormatColorString = extractTemplateFormatColorString;
/**
 * Цвет границы для CSS: неразобранное / стиль 1С → undefined (используется fallback в buildCellBorderCss).
 */
function resolveTemplateBorderColorForCss(color) {
    const s = extractTemplateFormatColorString(color).trim();
    if (!s || s === '[object Object]') {
        return undefined;
    }
    if (s.startsWith('style:')) {
        return undefined;
    }
    return s;
}
exports.resolveTemplateBorderColorForCss = resolveTemplateBorderColorForCss;
/**
 * Числовой код линии границы из макета 1С (XML: leftBorder, border и т.д.).
 * Соответствует `SpreadsheetDocumentCellLineType` в EDT (см. {@link spreadsheetCellLineType.SpreadsheetDocumentCellLineType}).
 * XSD: `resources/xsd/http_v8.1c.ru_8.2_data_spreadsheet.xsd` — тип `xs:integer`, перечисление в схеме не зафиксировано.
 */
function formatBorderLineCode(value) {
    if (value === undefined || value === null || value === '') {
        return 0;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    const n = parseInt(String(value).trim(), 10);
    return Number.isFinite(n) ? n : 0;
}
exports.formatBorderLineCode = formatBorderLineCode;
/** Есть ли линия границы по коду стороны или полю border. */
function hasTemplateBorderSide(value) {
    return formatBorderLineCode(value) > 0;
}
exports.hasTemplateBorderSide = hasTemplateBorderSide;
/**
 * Получает эффективный шрифт ячейки
 */
function getEffectiveFont(template, row, col) {
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
exports.getEffectiveFont = getEffectiveFont;
/**
 * Обновляет формат ячейки
 */
function updateCellFormat(template, row, col, formatUpdates) {
    // Находим ячейку
    const cell = findCellByPosition(template, row, col);
    if (!cell || !cell.c) {
        return template;
    }
    // Получаем текущий формат (включая наследование от строки, если у ячейки нет f)
    let currentFormat = {};
    const oldFormatIndex = cell.c.f;
    const formatArrayIndex = oldFormatIndex !== undefined ? oldFormatIndex - 1 : -1;
    if (formatArrayIndex >= 0 && template.format && template.format[formatArrayIndex] !== undefined) {
        // Ячейка имеет явный formatIndex (1-based в XML) — копируем формат
        currentFormat = { ...template.format[formatArrayIndex] };
    }
    else {
        // Ячейка наследует формат от строки — берём эффективный формат
        const effective = getEffectiveFormat(template, row, col);
        if (effective) {
            currentFormat = { ...effective };
        }
    }
    // Создаем новый формат на основе текущего с обновленными значениями
    // ВАЖНО: Всегда создаем новый формат, чтобы изолировать изменения от других ячеек
    const updatedFormat = {
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
    const rowArrayIndex = template.rowsItem?.findIndex(r => (r.index !== undefined ? r.index : template.rowsItem.indexOf(r)) === row);
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
    }
    else {
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
        }
        else {
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
exports.updateCellFormat = updateCellFormat;
/**
 * Обновляет шрифт ячейки (через формат)
 */
function updateCellFont(template, row, col, fontUpdates) {
    // Получаем текущий формат ячейки
    const currentFormat = getEffectiveFormat(template, row, col);
    if (!currentFormat) {
        // Если формата нет, создаем новый формат со шрифтом
        const newFormat = {
            font: template.font ? template.font.length : 0
        };
        return updateCellFormat(template, row, col, newFormat);
    }
    // Получаем текущий шрифт или создаем новый
    let currentFont = null;
    let fontIndex = currentFormat.font;
    if (fontIndex !== undefined && template.font && template.font[fontIndex]) {
        // Используем существующий шрифт
        currentFont = { ...template.font[fontIndex] };
    }
    else {
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
    const updatedFont = {
        ...currentFont,
        ...fontUpdates
    };
    // Обновляем массив шрифтов
    const updatedFontsArray = [...(template.font || [])];
    if (fontIndex !== undefined && fontIndex < updatedFontsArray.length) {
        updatedFontsArray[fontIndex] = updatedFont;
    }
    else {
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
    const formatUpdates = {
        ...currentFormat,
        font: fontIndex
    };
    return updateCellFormat(templateWithNewFonts, row, col, formatUpdates);
}
exports.updateCellFont = updateCellFont;
/**
 * Обновляет выравнивание ячейки
 */
function updateCellAlignment(template, row, col, horizontal, vertical) {
    return updateCellFormat(template, row, col, {
        horizontalAlignment: horizontal,
        verticalAlignment: vertical
    });
}
exports.updateCellAlignment = updateCellAlignment;
/**
 * Обновляет границы ячейки
 */
function updateCellBorders(template, row, col, borders) {
    return updateCellFormat(template, row, col, {
        leftBorder: borders.left,
        topBorder: borders.top,
        bottomBorder: borders.bottom,
        rightBorder: borders.right
    });
}
exports.updateCellBorders = updateCellBorders;
/**
 * Обновляет цвета ячейки
 */
function updateCellColors(template, row, col, textColor, backColor) {
    return updateCellFormat(template, row, col, {
        textColor,
        backColor
    });
}
exports.updateCellColors = updateCellColors;
/**
 * Обновляет примечание к ячейке
 */
function updateCellNote(template, row, col, note) {
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
exports.updateCellNote = updateCellNote;
/**
 * Обновляет детальный параметр ячейки
 */
function updateCellDetailParameter(template, row, col, detailParameter) {
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
exports.updateCellDetailParameter = updateCellDetailParameter;
/**
 * Создает примечание к ячейке
 */
function createCellNote(template, row, col, text, coordinates) {
    const note = {
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
exports.createCellNote = createCellNote;
/**
 * Удаляет примечание к ячейке
 */
function deleteCellNote(template, row, col) {
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
exports.deleteCellNote = deleteCellNote;
/**
 * Создает пустую строку
 */
function createEmptyRow(template, index) {
    const newRowsItem = [...(template.rowsItem || [])];
    const newRow = {
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
exports.createEmptyRow = createEmptyRow;
/**
 * Проверяет, является ли строка пустой
 */
function isEmptyRow(template, index) {
    if (!template.rowsItem || index < 0 || index >= template.rowsItem.length) {
        return false;
    }
    const row = template.rowsItem[index];
    return row.row.empty === true;
}
exports.isEmptyRow = isEmptyRow;
/**
 * Находит позицию в массиве rowsItem для строки с указанным индексом
 */
function findRowArrayIndex(rowsItem, rowIndex) {
    return rowsItem.findIndex((r, idx) => (r.index !== undefined ? r.index : idx) === rowIndex);
}
/**
 * Добавляет строку в макет.
 * Вставка по позиции в массиве (не по индексу строки), новый индекс = maxRowIndex + 1.
 */
function addRow(template, index, position) {
    const newRowsItem = [...(template.rowsItem || [])];
    const arrayIndex = findRowArrayIndex(newRowsItem, index);
    if (arrayIndex < 0) {
        return template;
    }
    // «Ниже» — вставляем в конец массива, чтобы новые строки шли по порядку (75, 76, 77…)
    // «Выше» — вставляем перед выбранной строкой
    const insertArrayIndex = position === 'above' ? arrayIndex : newRowsItem.length;
    const newRowIndex = getMaxRowIndex(template) + 1;
    const newRow = {
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
exports.addRow = addRow;
/**
 * Удаляет строку из макета по индексу строки (не по позиции в массиве)
 */
function deleteRow(template, index) {
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
exports.deleteRow = deleteRow;
/**
 * Обновляет текст ячейки
 */
function updateCellText(template, row, col, text) {
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
            }
            else {
                // Если формат не соответствует параметру, переключаемся на шаблон
                newCellData.tl = {
                    'v8:item': {
                        'v8:lang': 'ru',
                        'v8:content': text
                    }
                };
                delete newCellData.parameter;
            }
        }
        else {
            // Обновляем шаблон
            newCellData.tl = {
                'v8:item': {
                    'v8:lang': 'ru',
                    'v8:content': text
                }
            };
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
exports.updateCellText = updateCellText;
/**
 * Объединяет ячейки в диапазоне
 * Важно: При объединении текст берется из верхней левой ячейки (startRow, startCol)
 * Содержимое остальных ячеек теряется
 */
function mergeCells(template, startRow, startCol, endRow, endCol) {
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
    const newMerge = {
        r: minRow,
        c: minCol,
        w: maxCol - minCol + 1,
        h: maxRow - minRow + 1
    };
    // Добавляем объединение в список (или обновляем существующее)
    const newMerges = [...(template.merge || [])];
    const existingMergeIndex = newMerges.findIndex(m => m.r === minRow && m.c === minCol);
    if (existingMergeIndex >= 0) {
        newMerges[existingMergeIndex] = newMerge;
    }
    else {
        newMerges.push(newMerge);
    }
    // Удаляем ячейки, которые вошли в объединение (кроме верхней левой)
    const newRowsItem = [...(template.rowsItem || [])];
    for (let row = minRow; row <= maxRow; row++) {
        if (row >= newRowsItem.length)
            continue;
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
                const newCell = { i: minCol, c: topLeftCell?.c || { f: 0 } };
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
exports.mergeCells = mergeCells;
/**
 * Разъединяет объединенные ячейки
 */
function unmergeCells(template, row, col) {
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
        if (r >= newRowsItem.length)
            continue;
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
exports.unmergeCells = unmergeCells;
/**
 * Добавляет колонку в макет
 */
function addColumn(template, index, position) {
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
exports.addColumn = addColumn;
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
/** Ширина колонки по умолчанию в табличном документе 1С. */
exports.DEFAULT_COLUMN_WIDTH_PX = 72;
/** Высота строки по умолчанию (px). document.height в XML — это число строк, не пиксели. */
exports.DEFAULT_ROW_HEIGHT_PX = 20;
function normalizeSpreadsheetSize(value, fallback) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    const n = parseFloat(String(value).replace(/px$/i, ''));
    return Number.isFinite(n) && n > 0 ? n : fallback;
}
function spreadsheetFontHeightPx(font) {
    if (!font) {
        return 0;
    }
    const raw = font.$_height ?? font.height;
    const pt = Number(raw);
    if (!Number.isFinite(pt) || pt <= 0) {
        return 0;
    }
    return pt * (96 / 72);
}
function findColumnItem(columnsGroup, col) {
    if (!columnsGroup?.columnsItem) {
        return undefined;
    }
    const logicalCol = toTemplateIndex(col, -1);
    return columnsGroup.columnsItem.find(item => toTemplateIndex(item.index, -1) === logicalCol);
}
function maxFontSizePxInRow(template, rowIndex) {
    const templateRow = template.rowsItem?.find((r, idx) => toTemplateIndex(r.index, idx) === rowIndex);
    if (!templateRow?.row?.c) {
        return 0;
    }
    let maxPx = 0;
    let currentColIndex = 0;
    for (const cell of templateRow.row.c) {
        const colIndex = cell.i !== undefined ? toTemplateIndex(cell.i, currentColIndex) : currentColIndex;
        currentColIndex = colIndex + 1;
        const px = spreadsheetFontHeightPx(getEffectiveFont(template, rowIndex, colIndex));
        if (px > maxPx) {
            maxPx = px;
        }
    }
    return maxPx;
}
function calculateColumnWidth(template, col, columnsGroup) {
    const logicalCol = toTemplateIndex(col, 0);
    const size = columnsGroup?.size !== undefined ? toTemplateIndex(columnsGroup.size, logicalCol + 1) : undefined;
    if (size !== undefined && logicalCol >= size) {
        return exports.DEFAULT_COLUMN_WIDTH_PX;
    }
    if (!columnsGroup || !columnsGroup.columnsItem || !template.format) {
        return exports.DEFAULT_COLUMN_WIDTH_PX;
    }
    const columnItem = findColumnItem(columnsGroup, logicalCol);
    const formatIndexVal = columnItem?.column?.formatIndex ?? columnItem?.formatIndex;
    if (formatIndexVal === undefined || formatIndexVal === null) {
        return exports.DEFAULT_COLUMN_WIDTH_PX;
    }
    const formatIndex = toTemplateIndex(formatIndexVal, 0) - 1;
    if (formatIndex < 0 || formatIndex >= template.format.length) {
        return exports.DEFAULT_COLUMN_WIDTH_PX;
    }
    const format = template.format[formatIndex];
    if (!format || format.width === undefined || format.width === null) {
        return exports.DEFAULT_COLUMN_WIDTH_PX;
    }
    return normalizeSpreadsheetSize(format.width, exports.DEFAULT_COLUMN_WIDTH_PX);
}
exports.calculateColumnWidth = calculateColumnWidth;
/**
 * Вычисляет высоту строки.
 * Используется высота формата ТЕКУЩЕЙ строки (не каскад от предыдущих).
 * Если у формата нет height или height=0 — возвращаем undefined (автовысота / document.height).
 *
 * @param template - Документ шаблона
 * @param rowIndex - Индекс строки (начиная с 0)
 * @returns Высота в px (число/строка) или undefined для высоты по умолчанию
 */
function calculateRowHeight(template, rowIndex) {
    const logicalRow = toTemplateIndex(rowIndex, -1);
    const autoHeight = Math.max(exports.DEFAULT_ROW_HEIGHT_PX, Math.ceil(maxFontSizePxInRow(template, logicalRow) * 1.2 + 8));
    if (!template.rowsItem || !template.format) {
        return autoHeight;
    }
    const templateRow = template.rowsItem.find((r, idx) => toTemplateIndex(r.index, idx) === logicalRow);
    if (!templateRow || !templateRow.row || templateRow.row.formatIndex === undefined) {
        return autoHeight;
    }
    const formatIndex = toTemplateIndex(templateRow.row.formatIndex, 0) - 1;
    if (formatIndex < 0 || formatIndex >= template.format.length) {
        return autoHeight;
    }
    const format = template.format[formatIndex];
    if (!format || format.height === undefined || format.height === null) {
        return autoHeight;
    }
    const h = normalizeSpreadsheetSize(format.height, 0);
    // 0 в 1С — автовысота по содержимому, не «нулевая строка»
    if (h <= 0) {
        return autoHeight;
    }
    return h;
}
exports.calculateRowHeight = calculateRowHeight;
/**
 * Удаляет колонку из макета
 */
function deleteColumn(template, index) {
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
            }
            else {
                return null; // Удаляем объединение, так как оно состояло из одной ячейки
            }
        }
        return merge;
    })
        .filter((m) => m !== null);
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
            }
            else {
                return null; // Область состояла из одной колонки - удаляем
            }
        }
        return namedItem;
    })
        .filter((item) => item !== null);
    return {
        ...template,
        rowsItem: newRowsItem,
        merge: newMerges,
        namedItem: newNamedItems
    };
}
exports.deleteColumn = deleteColumn;
//# sourceMappingURL=templateUtils.js.map
"use strict";
/**
 * Утилита для сохранения макета 1С в XML
 * Использует @xmldom/xmldom для сохранения структуры XML
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
exports.saveTemplateToXml = void 0;
const xmldom_1 = require("@xmldom/xmldom");
const fs = __importStar(require("fs"));
const commitFileLogger_1 = require("./commitFileLogger");
const fileUtils_1 = require("./fileUtils");
const xmlUtils_1 = require("./xmlUtils");
const xmlStructureValidator_1 = require("../validation/xmlStructureValidator");
/**
 * Сохраняет макет в XML файл с сохранением структуры через xmldom
 * @param templateDocument - Документ макета для сохранения
 * @param originalXml - Исходный XML для сохранения структуры
 * @param templatePath - Путь к файлу Template.xml
 * @param configRoot - Корневая папка конфигурации (для валидации пути)
 * @param extensionPath - Путь к расширению (для загрузки схемы валидации)
 */
function saveTemplateToXml(templateDocument, originalXml, templatePath, configRoot, extensionPath) {
    if (!(0, fileUtils_1.validatePath)(configRoot, templatePath)) {
        throw new Error('Invalid file path: possible path traversal attack');
    }
    // Парсим исходный XML в DOM
    const parser = new xmldom_1.DOMParser();
    const xmlDoc = parser.parseFromString(originalXml, 'text/xml');
    // Проверяем наличие ошибок парсинга
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
        throw new Error('Ошибка парсинга исходного XML: ' + parserError[0].textContent);
    }
    // Находим корневой элемент document
    const documentElement = xmlDoc.documentElement;
    if (!documentElement) {
        throw new Error('Не найден корневой элемент в XML');
    }
    // Обновляем структуру макета в DOM
    updateTemplateInDom(documentElement, templateDocument);
    // Сериализуем DOM обратно в XML
    const serializer = new xmldom_1.XMLSerializer();
    let updatedXml = serializer.serializeToString(xmlDoc);
    updatedXml = (0, xmlUtils_1.normalizeXML)(updatedXml);
    const validation = (0, xmlUtils_1.validateXML)(updatedXml);
    if (!validation.valid) {
        throw new Error(validation.error ?? 'Результат сохранения не является валидным XML');
    }
    const structureValidation = (0, xmlStructureValidator_1.validateXmlStructure)(updatedXml, {
        filePath: templatePath,
        extensionPath
    });
    if (!structureValidation.valid && structureValidation.errors?.length) {
        throw new Error('Структура XML не соответствует схеме: ' + structureValidation.errors.join('; '));
    }
    // Сохраняем файл с BOM (как в оригинальных файлах 1С)
    // ВАЖНО: 1С конфигуратор требует UTF-8 с BOM (EF BB BF)
    const bomBuffer = Buffer.from([0xEF, 0xBB, 0xBF]);
    const contentBuffer = Buffer.from(updatedXml, 'utf-8');
    fs.writeFileSync(templatePath, Buffer.concat([bomBuffer, contentBuffer]));
    // Логируем измененный файл
    commitFileLogger_1.CommitFileLogger.getInstance().logChangedFile(templatePath);
}
exports.saveTemplateToXml = saveTemplateToXml;
/**
 * Обновляет структуру макета в DOM элементе
 * @param documentElement - Корневой элемент document в DOM
 * @param templateDocument - Документ макета с изменениями
 */
function updateTemplateInDom(documentElement, templateDocument) {
    const doc = documentElement.ownerDocument || documentElement;
    // Обновляем rowsItem (строки и ячейки)
    updateRowsItemInDom(documentElement, templateDocument, doc);
    // Обновляем namedItem (именованные области)
    updateNamedItemsInDom(documentElement, templateDocument, doc);
    // Обновляем merge (объединенные ячейки)
    updateMergeInDom(documentElement, templateDocument, doc);
    // Обновляем format (форматы)
    updateFormatsInDom(documentElement, templateDocument, doc);
    // Обновляем font (шрифты)
    updateFontsInDom(documentElement, templateDocument, doc);
    // Обновляем columns (колонки)
    updateColumnsInDom(documentElement, templateDocument, doc);
}
/**
 * Обновляет rowsItem (строки и ячейки) в DOM.
 * По XSD: каждый rowsItem содержит ровно один index и один row.
 */
function updateRowsItemInDom(documentElement, templateDocument, doc) {
    if (!templateDocument.rowsItem || templateDocument.rowsItem.length === 0) {
        return;
    }
    // Удаляем все существующие rowsItem
    const existingRowsItems = Array.from(documentElement.getElementsByTagName('rowsItem'));
    let insertBeforeRef = null;
    if (existingRowsItems.length > 0) {
        insertBeforeRef = existingRowsItems[existingRowsItems.length - 1].nextElementSibling;
        existingRowsItems.forEach(item => {
            if (item.parentNode) {
                item.parentNode.removeChild(item);
            }
        });
    }
    else {
        const firstFormat = documentElement.getElementsByTagName('format')[0];
        const firstMerge = documentElement.getElementsByTagName('merge')[0];
        insertBeforeRef = (firstFormat || firstMerge || null);
    }
    templateDocument.rowsItem.forEach((templateRow) => {
        const rowsItemElement = doc.createElement('rowsItem');
        const indexElement = doc.createElement('index');
        indexElement.textContent = templateRow.index.toString();
        rowsItemElement.appendChild(indexElement);
        if (templateRow.row) {
            const rowElement = doc.createElement('row');
            if (templateRow.row.empty === true) {
                const emptyElement = doc.createElement('empty');
                emptyElement.textContent = 'true';
                rowElement.appendChild(emptyElement);
            }
            else {
                if (templateRow.row.formatIndex !== undefined) {
                    const formatIndexElement = doc.createElement('formatIndex');
                    formatIndexElement.textContent = templateRow.row.formatIndex.toString();
                    rowElement.appendChild(formatIndexElement);
                }
                if (templateRow.row.columnsID) {
                    const columnsIdElement = doc.createElement('columnsID');
                    columnsIdElement.textContent = templateRow.row.columnsID;
                    rowElement.appendChild(columnsIdElement);
                }
                if (templateRow.row.c && templateRow.row.c.length > 0) {
                    templateRow.row.c.forEach(cell => {
                        const cellElement = doc.createElement('c');
                        if (cell.i !== undefined) {
                            const iElement = doc.createElement('i');
                            iElement.textContent = cell.i.toString();
                            cellElement.appendChild(iElement);
                        }
                        if (cell.c) {
                            const innerCElement = doc.createElement('c');
                            if (cell.c.f !== undefined) {
                                const formatElement = doc.createElement('f');
                                formatElement.textContent = cell.c.f.toString();
                                innerCElement.appendChild(formatElement);
                            }
                            if (cell.c.parameter) {
                                const parameterElement = doc.createElement('parameter');
                                parameterElement.textContent = cell.c.parameter;
                                innerCElement.appendChild(parameterElement);
                            }
                            if (cell.c.detailParameter) {
                                const detailParameterElement = doc.createElement('detailParameter');
                                detailParameterElement.textContent = cell.c.detailParameter;
                                innerCElement.appendChild(detailParameterElement);
                            }
                            if (cell.c.tl) {
                                const tlElement = doc.createElement('tl');
                                const itemElement = doc.createElement('v8:item');
                                const langElement = doc.createElement('v8:lang');
                                langElement.textContent = 'ru';
                                itemElement.appendChild(langElement);
                                const contentElement = doc.createElement('v8:content');
                                if (typeof cell.c.tl === 'object' && cell.c.tl['v8:item']) {
                                    const item = cell.c.tl['v8:item'];
                                    if (Array.isArray(item)) {
                                        const firstItem = item.find(i => i['v8:content']);
                                        if (firstItem && firstItem['v8:content']) {
                                            contentElement.textContent = firstItem['v8:content'];
                                        }
                                    }
                                    else if (item && item['v8:content']) {
                                        contentElement.textContent = item['v8:content'];
                                    }
                                }
                                else if (typeof cell.c.tl === 'string') {
                                    contentElement.textContent = cell.c.tl;
                                }
                                itemElement.appendChild(contentElement);
                                tlElement.appendChild(itemElement);
                                innerCElement.appendChild(tlElement);
                            }
                            if (cell.c.note) {
                                const noteElement = createNoteElement(doc, cell.c.note);
                                innerCElement.appendChild(noteElement);
                            }
                            cellElement.appendChild(innerCElement);
                        }
                        rowElement.appendChild(cellElement);
                    });
                }
            }
            rowsItemElement.appendChild(rowElement);
        }
        documentElement.insertBefore(rowsItemElement, insertBeforeRef);
    });
}
/**
 * Создает элемент note для примечания к ячейке
 */
function createNoteElement(doc, note) {
    const noteElement = doc.createElement('note');
    if (note.drawingType) {
        const drawingTypeElement = doc.createElement('drawingType');
        drawingTypeElement.textContent = note.drawingType;
        noteElement.appendChild(drawingTypeElement);
    }
    if (note.id !== undefined) {
        const idElement = doc.createElement('id');
        idElement.textContent = note.id.toString();
        noteElement.appendChild(idElement);
    }
    if (note.formatIndex !== undefined) {
        const formatIndexElement = doc.createElement('formatIndex');
        formatIndexElement.textContent = note.formatIndex.toString();
        noteElement.appendChild(formatIndexElement);
    }
    if (note.text) {
        const textElement = doc.createElement('text');
        const itemElement = doc.createElement('v8:item');
        const langElement = doc.createElement('v8:lang');
        langElement.textContent = 'ru';
        itemElement.appendChild(langElement);
        const contentElement = doc.createElement('v8:content');
        if (typeof note.text === 'object' && note.text['v8:item']) {
            const item = note.text['v8:item'];
            if (Array.isArray(item)) {
                const firstItem = item.find(i => i['v8:content']);
                if (firstItem && firstItem['v8:content']) {
                    contentElement.textContent = firstItem['v8:content'];
                }
            }
            else if (item && item['v8:content']) {
                contentElement.textContent = item['v8:content'];
            }
        }
        else if (typeof note.text === 'string') {
            contentElement.textContent = note.text;
        }
        itemElement.appendChild(contentElement);
        textElement.appendChild(itemElement);
        noteElement.appendChild(textElement);
    }
    // Координаты примечания
    if (note.beginRow !== undefined) {
        const beginRowElement = doc.createElement('beginRow');
        beginRowElement.textContent = note.beginRow.toString();
        noteElement.appendChild(beginRowElement);
    }
    if (note.beginRowOffset !== undefined) {
        const beginRowOffsetElement = doc.createElement('beginRowOffset');
        beginRowOffsetElement.textContent = note.beginRowOffset.toString();
        noteElement.appendChild(beginRowOffsetElement);
    }
    if (note.endRow !== undefined) {
        const endRowElement = doc.createElement('endRow');
        endRowElement.textContent = note.endRow.toString();
        noteElement.appendChild(endRowElement);
    }
    if (note.endRowOffset !== undefined) {
        const endRowOffsetElement = doc.createElement('endRowOffset');
        endRowOffsetElement.textContent = note.endRowOffset.toString();
        noteElement.appendChild(endRowOffsetElement);
    }
    if (note.beginColumn !== undefined) {
        const beginColumnElement = doc.createElement('beginColumn');
        beginColumnElement.textContent = note.beginColumn.toString();
        noteElement.appendChild(beginColumnElement);
    }
    if (note.beginColumnOffset !== undefined) {
        const beginColumnOffsetElement = doc.createElement('beginColumnOffset');
        beginColumnOffsetElement.textContent = note.beginColumnOffset.toString();
        noteElement.appendChild(beginColumnOffsetElement);
    }
    if (note.endColumn !== undefined) {
        const endColumnElement = doc.createElement('endColumn');
        endColumnElement.textContent = note.endColumn.toString();
        noteElement.appendChild(endColumnElement);
    }
    if (note.endColumnOffset !== undefined) {
        const endColumnOffsetElement = doc.createElement('endColumnOffset');
        endColumnOffsetElement.textContent = note.endColumnOffset.toString();
        noteElement.appendChild(endColumnOffsetElement);
    }
    if (note.autoSize !== undefined) {
        const autoSizeElement = doc.createElement('autoSize');
        autoSizeElement.textContent = note.autoSize.toString();
        noteElement.appendChild(autoSizeElement);
    }
    if (note.pictureSize) {
        const pictureSizeElement = doc.createElement('pictureSize');
        pictureSizeElement.textContent = note.pictureSize;
        noteElement.appendChild(pictureSizeElement);
    }
    return noteElement;
}
/**
 * Обновляет namedItem (именованные области) в DOM
 */
function updateNamedItemsInDom(documentElement, templateDocument, doc) {
    // Удаляем все существующие namedItem
    const existingNamedItems = Array.from(documentElement.getElementsByTagName('namedItem'));
    existingNamedItems.forEach(item => {
        if (item.parentNode) {
            item.parentNode.removeChild(item);
        }
    });
    // Добавляем новые namedItem
    if (templateDocument.namedItem && templateDocument.namedItem.length > 0) {
        templateDocument.namedItem.forEach(namedItem => {
            const namedItemElement = doc.createElement('namedItem');
            // Правильный атрибут для xsi:type
            namedItemElement.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:type', 'NamedItemCells');
            const nameElement = doc.createElement('name');
            nameElement.textContent = namedItem.name;
            namedItemElement.appendChild(nameElement);
            if (namedItem.area) {
                const areaElement = doc.createElement('area');
                const areaType = namedItem.area.type || 'Rectangle';
                const typeElement = doc.createElement('type');
                typeElement.textContent = areaType;
                areaElement.appendChild(typeElement);
                // Определяем координаты в зависимости от типа области
                let beginRow = namedItem.area.beginRow;
                let endRow = namedItem.area.endRow;
                let beginColumn = namedItem.area.beginColumn;
                let endColumn = namedItem.area.endColumn;
                // Для типа Rows: координаты колонок должны быть -1 (все колонки)
                if (areaType === 'Rows') {
                    beginColumn = -1;
                    endColumn = -1;
                }
                // Для типа Columns: координаты строк должны быть -1 (все строки)
                else if (areaType === 'Columns') {
                    beginRow = -1;
                    endRow = -1;
                }
                // Координаты могут быть -1 для типов Rows/Columns (все строки/колонки)
                const beginRowElement = doc.createElement('beginRow');
                beginRowElement.textContent = beginRow.toString();
                areaElement.appendChild(beginRowElement);
                const endRowElement = doc.createElement('endRow');
                endRowElement.textContent = endRow.toString();
                areaElement.appendChild(endRowElement);
                const beginColumnElement = doc.createElement('beginColumn');
                beginColumnElement.textContent = beginColumn.toString();
                areaElement.appendChild(beginColumnElement);
                const endColumnElement = doc.createElement('endColumn');
                endColumnElement.textContent = endColumn.toString();
                areaElement.appendChild(endColumnElement);
                namedItemElement.appendChild(areaElement);
            }
            documentElement.appendChild(namedItemElement);
        });
    }
}
/**
 * Обновляет merge (объединенные ячейки) в DOM
 */
function updateMergeInDom(documentElement, templateDocument, doc) {
    // Удаляем все существующие merge
    const existingMerges = Array.from(documentElement.getElementsByTagName('merge'));
    existingMerges.forEach(merge => {
        if (merge.parentNode) {
            merge.parentNode.removeChild(merge);
        }
    });
    // Добавляем новые merge
    if (templateDocument.merge && templateDocument.merge.length > 0) {
        templateDocument.merge.forEach(merge => {
            const mergeElement = doc.createElement('merge');
            // r, c, w - обязательные элементы
            const rElement = doc.createElement('r');
            rElement.textContent = merge.r.toString();
            mergeElement.appendChild(rElement);
            const cElement = doc.createElement('c');
            cElement.textContent = merge.c.toString();
            mergeElement.appendChild(cElement);
            const wElement = doc.createElement('w');
            wElement.textContent = merge.w.toString();
            mergeElement.appendChild(wElement);
            // h - опциональный элемент (может отсутствовать)
            if (merge.h !== undefined) {
                const hElement = doc.createElement('h');
                hElement.textContent = merge.h.toString();
                mergeElement.appendChild(hElement);
            }
            documentElement.appendChild(mergeElement);
        });
    }
}
/**
 * Обновляет format (форматы) в DOM.
 * 1С использует несколько элементов <format> (каждый — отдельный формат).
 */
function updateFormatsInDom(documentElement, templateDocument, doc) {
    // Удаляем все существующие format
    const existingFormats = Array.from(documentElement.getElementsByTagName('format'));
    existingFormats.forEach(format => {
        if (format.parentNode) {
            format.parentNode.removeChild(format);
        }
    });
    // Создаём отдельный элемент format для каждого формата
    if (templateDocument.format && templateDocument.format.length > 0) {
        templateDocument.format.forEach((format) => {
            const formatElement = doc.createElement('format');
            // Добавляем опциональные элементы формата
            if (format.width !== undefined) {
                const widthElement = doc.createElement('width');
                widthElement.textContent = typeof format.width === 'number' ? String(format.width) : format.width;
                formatElement.appendChild(widthElement);
            }
            if (format.height !== undefined) {
                const heightElement = doc.createElement('height');
                heightElement.textContent = typeof format.height === 'number' ? String(format.height) : format.height;
                formatElement.appendChild(heightElement);
            }
            if (format.horizontalAlignment !== undefined) {
                const horizontalAlignmentElement = doc.createElement('horizontalAlignment');
                horizontalAlignmentElement.textContent = format.horizontalAlignment;
                formatElement.appendChild(horizontalAlignmentElement);
            }
            if (format.verticalAlignment !== undefined) {
                const verticalAlignmentElement = doc.createElement('verticalAlignment');
                verticalAlignmentElement.textContent = format.verticalAlignment;
                formatElement.appendChild(verticalAlignmentElement);
            }
            if (format.bySelectedColumns !== undefined) {
                const bySelectedColumnsElement = doc.createElement('bySelectedColumns');
                bySelectedColumnsElement.textContent = format.bySelectedColumns;
                formatElement.appendChild(bySelectedColumnsElement);
            }
            if (format.border !== undefined) {
                const borderElement = doc.createElement('border');
                borderElement.textContent = format.border.toString();
                formatElement.appendChild(borderElement);
            }
            if (format.leftBorder !== undefined) {
                const leftBorderElement = doc.createElement('leftBorder');
                leftBorderElement.textContent = format.leftBorder.toString();
                formatElement.appendChild(leftBorderElement);
            }
            if (format.topBorder !== undefined) {
                const topBorderElement = doc.createElement('topBorder');
                topBorderElement.textContent = format.topBorder.toString();
                formatElement.appendChild(topBorderElement);
            }
            if (format.bottomBorder !== undefined) {
                const bottomBorderElement = doc.createElement('bottomBorder');
                bottomBorderElement.textContent = format.bottomBorder.toString();
                formatElement.appendChild(bottomBorderElement);
            }
            if (format.rightBorder !== undefined) {
                const rightBorderElement = doc.createElement('rightBorder');
                rightBorderElement.textContent = format.rightBorder.toString();
                formatElement.appendChild(rightBorderElement);
            }
            if (format.borderColor !== undefined && format.borderColor !== '') {
                const borderColorElement = doc.createElement('borderColor');
                borderColorElement.textContent = String(format.borderColor);
                formatElement.appendChild(borderColorElement);
            }
            if (format.textPlacement !== undefined) {
                const textPlacementElement = doc.createElement('textPlacement');
                textPlacementElement.textContent = format.textPlacement;
                formatElement.appendChild(textPlacementElement);
            }
            if (format.textOrientation !== undefined) {
                const textOrientationElement = doc.createElement('textOrientation');
                // В 1С: 90° хранится как 900 (1/10 градуса)
                textOrientationElement.textContent = (format.textOrientation * 10).toString();
                formatElement.appendChild(textOrientationElement);
            }
            if (format.font !== undefined) {
                const fontElement = doc.createElement('font');
                fontElement.textContent = format.font.toString();
                formatElement.appendChild(fontElement);
            }
            if (format.fillType !== undefined) {
                const fillTypeElement = doc.createElement('fillType');
                fillTypeElement.textContent = format.fillType;
                formatElement.appendChild(fillTypeElement);
            }
            if (format.indent !== undefined) {
                const indentElement = doc.createElement('indent');
                indentElement.textContent = format.indent.toString();
                formatElement.appendChild(indentElement);
            }
            if (format.autoIndent !== undefined) {
                const autoIndentElement = doc.createElement('autoIndent');
                autoIndentElement.textContent = format.autoIndent.toString();
                formatElement.appendChild(autoIndentElement);
            }
            if (format.leftMargin !== undefined) {
                const leftMarginElement = doc.createElement('leftMargin');
                leftMarginElement.textContent = format.leftMargin.toString();
                formatElement.appendChild(leftMarginElement);
            }
            if (format.rightMargin !== undefined) {
                const rightMarginElement = doc.createElement('rightMargin');
                rightMarginElement.textContent = format.rightMargin.toString();
                formatElement.appendChild(rightMarginElement);
            }
            if (format.topMargin !== undefined) {
                const topMarginElement = doc.createElement('topMargin');
                topMarginElement.textContent = format.topMargin.toString();
                formatElement.appendChild(topMarginElement);
            }
            if (format.bottomMargin !== undefined) {
                const bottomMarginElement = doc.createElement('bottomMargin');
                bottomMarginElement.textContent = format.bottomMargin.toString();
                formatElement.appendChild(bottomMarginElement);
            }
            if (format.textColor !== undefined) {
                const textColorElement = doc.createElement('textColor');
                textColorElement.textContent = format.textColor;
                formatElement.appendChild(textColorElement);
            }
            if (format.backColor !== undefined) {
                const backColorElement = doc.createElement('backColor');
                backColorElement.textContent = format.backColor;
                formatElement.appendChild(backColorElement);
            }
            // Вложенный формат для чисел/дат (может быть вложенным элементом format)
            if (format.format !== undefined) {
                const formatFormatElement = doc.createElement('format');
                // format.format может быть TemplateTextData с структурой v8:item/v8:content
                if (typeof format.format === 'object' && format.format['v8:item']) {
                    const itemElement = doc.createElement('v8:item');
                    const item = format.format['v8:item'];
                    if (Array.isArray(item)) {
                        // Если массив, обрабатываем каждый элемент
                        item.forEach(itemData => {
                            const itemClone = createFormatItemElement(doc, { 'v8:item': itemData });
                            if (itemClone.firstChild) {
                                itemElement.appendChild(itemClone.firstChild);
                            }
                        });
                    }
                    else {
                        // Одиночный элемент
                        if (item['v8:lang']) {
                            const langElement = doc.createElement('v8:lang');
                            langElement.textContent = typeof item['v8:lang'] === 'string' ? item['v8:lang'] : String(item['v8:lang']);
                            itemElement.appendChild(langElement);
                        }
                        if (item['v8:content']) {
                            const contentElement = doc.createElement('v8:content');
                            contentElement.textContent = typeof item['v8:content'] === 'string' ? item['v8:content'] : String(item['v8:content']);
                            itemElement.appendChild(contentElement);
                        }
                    }
                    formatFormatElement.appendChild(itemElement);
                }
                else if (typeof format.format === 'string') {
                    // Если строка, создаем структуру v8:item/v8:content
                    const itemElement = doc.createElement('v8:item');
                    const langElement = doc.createElement('v8:lang');
                    langElement.textContent = 'ru';
                    itemElement.appendChild(langElement);
                    const contentElement = doc.createElement('v8:content');
                    contentElement.textContent = format.format;
                    itemElement.appendChild(contentElement);
                    formatFormatElement.appendChild(itemElement);
                }
                formatElement.appendChild(formatFormatElement);
            }
            if (format.markNegatives !== undefined) {
                const markNegativesElement = doc.createElement('markNegatives');
                markNegativesElement.textContent = format.markNegatives.toString();
                formatElement.appendChild(markNegativesElement);
            }
            documentElement.appendChild(formatElement);
        });
    }
}
/**
 * Создает элемент v8:item для вложенного формата (вспомогательная функция)
 */
function createFormatItemElement(doc, formatData) {
    const itemElement = doc.createElement('v8:item');
    if (typeof formatData === 'object' && formatData['v8:item']) {
        const sourceItem = formatData['v8:item'];
        if (Array.isArray(sourceItem)) {
            // Если массив, берем первый элемент (обычно один)
            const firstItem = sourceItem[0] || sourceItem;
            if (firstItem['v8:lang']) {
                const langElement = doc.createElement('v8:lang');
                langElement.textContent = typeof firstItem['v8:lang'] === 'string' ? firstItem['v8:lang'] : String(firstItem['v8:lang']);
                itemElement.appendChild(langElement);
            }
            if (firstItem['v8:content']) {
                const contentElement = doc.createElement('v8:content');
                contentElement.textContent = typeof firstItem['v8:content'] === 'string' ? firstItem['v8:content'] : String(firstItem['v8:content']);
                itemElement.appendChild(contentElement);
            }
        }
        else {
            // Копируем структуру
            if (sourceItem['v8:lang']) {
                const langElement = doc.createElement('v8:lang');
                langElement.textContent = typeof sourceItem['v8:lang'] === 'string' ? sourceItem['v8:lang'] : String(sourceItem['v8:lang']);
                itemElement.appendChild(langElement);
            }
            if (sourceItem['v8:content']) {
                const contentElement = doc.createElement('v8:content');
                contentElement.textContent = typeof sourceItem['v8:content'] === 'string' ? sourceItem['v8:content'] : String(sourceItem['v8:content']);
                itemElement.appendChild(contentElement);
            }
        }
    }
    else if (typeof formatData === 'string') {
        const langElement = doc.createElement('v8:lang');
        langElement.textContent = 'ru';
        itemElement.appendChild(langElement);
        const contentElement = doc.createElement('v8:content');
        contentElement.textContent = formatData;
        itemElement.appendChild(contentElement);
    }
    return itemElement;
}
/**
 * Обновляет font (шрифты) в DOM
 */
function updateFontsInDom(documentElement, templateDocument, doc) {
    // Удаляем все существующие font
    const existingFonts = Array.from(documentElement.getElementsByTagName('font'));
    existingFonts.forEach(font => {
        if (font.parentNode) {
            font.parentNode.removeChild(font);
        }
    });
    // Добавляем новые font
    if (templateDocument.font && templateDocument.font.length > 0) {
        templateDocument.font.forEach((font, index) => {
            const fontElement = doc.createElement('font');
            // Атрибуты шрифта (парсер добавляет префикс $_)
            if (font['$_faceName']) {
                fontElement.setAttribute('faceName', font['$_faceName']);
            }
            if (font['$_height'] !== undefined) {
                fontElement.setAttribute('height', font['$_height'].toString());
            }
            if (font['$_bold']) {
                fontElement.setAttribute('bold', font['$_bold']);
            }
            if (font['$_italic']) {
                fontElement.setAttribute('italic', font['$_italic']);
            }
            if (font['$_underline']) {
                fontElement.setAttribute('underline', font['$_underline']);
            }
            if (font['$_strikeout']) {
                fontElement.setAttribute('strikeout', font['$_strikeout']);
            }
            if (font['$_kind']) {
                fontElement.setAttribute('kind', font['$_kind']);
            }
            if (font['$_scale']) {
                fontElement.setAttribute('scale', font['$_scale']);
            }
            documentElement.appendChild(fontElement);
        });
    }
}
/**
 * Обновляет columns (колонки) в DOM
 */
function updateColumnsInDom(documentElement, templateDocument, doc) {
    // Удаляем все существующие columns
    const existingColumns = Array.from(documentElement.getElementsByTagName('columns'));
    existingColumns.forEach(columns => {
        if (columns.parentNode) {
            columns.parentNode.removeChild(columns);
        }
    });
    // Добавляем новые columns
    if (templateDocument.columns && templateDocument.columns.length > 0) {
        templateDocument.columns.forEach((columnsGroup, index) => {
            const columnsElement = doc.createElement('columns');
            // Атрибут id (если есть)
            if (columnsGroup.id) {
                columnsElement.setAttribute('id', columnsGroup.id);
            }
            // Элемент size
            if (columnsGroup.size !== undefined) {
                const sizeElement = doc.createElement('size');
                sizeElement.textContent = columnsGroup.size.toString();
                columnsElement.appendChild(sizeElement);
            }
            // Элементы columnsItem
            if (columnsGroup.columnsItem && columnsGroup.columnsItem.length > 0) {
                columnsGroup.columnsItem.forEach(columnItem => {
                    const columnItemElement = doc.createElement('column');
                    // Элемент index
                    if (columnItem.index !== undefined) {
                        const indexElement = doc.createElement('index');
                        indexElement.textContent = columnItem.index.toString();
                        columnItemElement.appendChild(indexElement);
                    }
                    // Элемент column с formatIndex
                    if (columnItem.column && columnItem.column.formatIndex !== undefined) {
                        const columnFormatElement = doc.createElement('column');
                        const formatIndexElement = doc.createElement('formatIndex');
                        formatIndexElement.textContent = columnItem.column.formatIndex.toString();
                        columnFormatElement.appendChild(formatIndexElement);
                        columnItemElement.appendChild(columnFormatElement);
                    }
                    columnsElement.appendChild(columnItemElement);
                });
            }
            documentElement.appendChild(columnsElement);
        });
    }
}
//# sourceMappingURL=templateXmlSaver.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePredefinedXmlWithDom = exports.getPredefinedPath = exports.hasPredefinedFile = exports.parsePredefinedXml = void 0;
const fileUtils_1 = require("../utils/fileUtils");
const xmlUtils_1 = require("../utils/xmlUtils");
const xmldom_1 = require("@xmldom/xmldom");
/**
 * Парсинг файла Predefined.xml
 */
async function parsePredefinedXml(xmlPath) {
    const xml = await (0, fileUtils_1.safeReadFile)(xmlPath);
    const parser = (0, xmlUtils_1.createXMLParser)();
    const j = parser.parse(xml);
    // Проверяем что это PredefinedData
    if (!j.PredefinedData) {
        return [];
    }
    const predefinedData = j.PredefinedData;
    const items = [];
    // Извлекаем элементы
    let itemList = predefinedData.Item;
    if (!itemList) {
        return [];
    }
    if (!Array.isArray(itemList)) {
        itemList = [itemList];
    }
    for (const item of itemList) {
        // Извлекаем код (может быть строкой или объектом с text)
        let key = item.Code || item.Name || 'Unknown';
        if (typeof key === 'object' && key !== null) {
            // Если это объект типа { text: "810", "xsi:type": "xs:decimal" }
            key = key.text || key['#text'] || String(key);
        }
        items.push({
            name: item.Name || 'Unknown',
            key: String(key),
            parents: []
        });
    }
    return items;
}
exports.parsePredefinedXml = parsePredefinedXml;
/**
 * Проверка существования файла Predefined.xml
 */
async function hasPredefinedFile(objectPath) {
    const path = require('path');
    const fs = require('fs').promises;
    // Путь к Predefined.xml: Documents/НачислениеЗарплаты/Ext/Predefined.xml
    const dir = path.dirname(objectPath);
    const predefinedPath = path.join(dir, 'Ext', 'Predefined.xml');
    try {
        await fs.access(predefinedPath);
        return true;
    }
    catch {
        return false;
    }
}
exports.hasPredefinedFile = hasPredefinedFile;
/**
 * Получить путь к файлу Predefined.xml для объекта
 */
function getPredefinedPath(objectPath) {
    const path = require('path');
    const dir = path.dirname(objectPath);
    return path.join(dir, 'Ext', 'Predefined.xml');
}
exports.getPredefinedPath = getPredefinedPath;
/**
 * Парсинг файла Predefined.xml через xmldom
 * Сохраняет структуру XML для последующего сохранения
 */
async function parsePredefinedXmlWithDom(xmlPath) {
    const xml = await (0, fileUtils_1.safeReadFile)(xmlPath);
    // Удаляем BOM если есть
    let cleanXml = xml;
    if (cleanXml.charCodeAt(0) === 0xfeff) {
        cleanXml = cleanXml.slice(1);
    }
    // Парсим через xmldom
    const parser = new xmldom_1.DOMParser({
        locator: {},
        errorHandler: {
            warning: (w) => console.warn('[xmldom] Warning:', w),
            error: (e) => console.error('[xmldom] Error:', e),
            fatalError: (e) => {
                console.error('[xmldom] Fatal error:', e);
                throw new Error(`XML parsing error: ${e}`);
            }
        }
    });
    const doc = parser.parseFromString(cleanXml, 'text/xml');
    // Проверяем ошибки парсинга
    const parserError = doc.getElementsByTagName('parsererror')[0];
    if (parserError) {
        const errorText = parserError.textContent || 'Unknown parsing error';
        throw new Error(`XML parsing error: ${errorText}`);
    }
    // Находим корневой элемент PredefinedData
    const rootElement = doc.documentElement;
    if (!rootElement) {
        throw new Error('Не найден корневой элемент документа');
    }
    // Проверяем localName для обработки namespace
    const rootLocalName = rootElement.localName || rootElement.nodeName.split(':').pop() || rootElement.nodeName;
    if (rootLocalName !== 'PredefinedData') {
        throw new Error(`Не найден корневой элемент PredefinedData. Найден: ${rootElement.nodeName} (localName: ${rootLocalName})`);
    }
    // Парсим элементы - используем простой подход через childNodes
    // Элементы верхнего уровня не имеют родителя (Parent = "Счета")
    const items = [];
    const childNodes = rootElement.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType === 1) { // Element node
            const element = node;
            const localName = element.localName || element.nodeName.split(':').pop() || element.nodeName;
            if (localName === 'Item') {
                // Элементы верхнего уровня не имеют родителя (Parent будет "Счета")
                const parsedItem = parseItemElement(element);
                items.push(parsedItem);
            }
        }
    }
    return {
        items,
        originalXml: xml // Сохраняем исходный XML с BOM
    };
}
exports.parsePredefinedXmlWithDom = parsePredefinedXmlWithDom;
/**
 * Убирает namespace prefix из типа (например, d4p1:CatalogRef -> CatalogRef)
 * Оставляет префиксы типов: xs:, v8:, cfg:
 */
function stripNamespacePrefix(typeText) {
    if (!typeText)
        return typeText;
    // Убираем префиксы вида d4p1:, d5p1: и т.д. (namespace prefixes)
    // Оставляем xs:, v8:, cfg: как префиксы типов
    return typeText.replace(/^d\d+p\d+:/, '').replace(/^[a-z]\d+:/, '');
}
/**
 * Список ссылок из контейнера вида <Displaced|Leading|Base><CalculationType>...</CalculationType>
 */
function parseCalculationTypeRefList(container) {
    const out = [];
    const childNodes = container.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType !== 1)
            continue;
        const el = node;
        const localName = el.localName || el.nodeName.split(':').pop() || el.nodeName;
        if (localName === 'CalculationType') {
            const t = (el.textContent || '').trim();
            if (t) {
                out.push(t);
            }
        }
    }
    return out;
}
/**
 * Рекурсивный парсинг элемента Item
 * @param itemElement - элемент Item для парсинга
 * @param parentName - имя родительского элемента (для вычисления Parent)
 */
function parseItemElement(itemElement, parentName) {
    const item = {
        Name: '',
        Code: '',
        Description: '',
        IsFolder: false
    };
    // Извлекаем id из атрибута элемента
    const id = itemElement.getAttribute('id');
    if (id) {
        item.id = id;
    }
    // Устанавливаем Parent: если есть родитель - используем его имя, иначе "Счета" (технический уровень)
    if (parentName) {
        item.Parent = parentName;
    }
    else {
        item.Parent = 'Счета';
    }
    // Парсим дочерние элементы
    const children = itemElement.childNodes;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType !== 1)
            continue; // Пропускаем текстовые узлы
        const child = node;
        // Получаем localName для обработки namespace
        const localName = child.localName || child.nodeName.split(':').pop() || child.nodeName;
        const textContent = child.textContent || '';
        switch (localName) {
            case 'Name':
                item.Name = textContent;
                break;
            case 'Code':
                // Code может быть числом, но сохраняем как строку
                item.Code = textContent;
                break;
            case 'Description':
                item.Description = textContent;
                break;
            case 'AccountType':
                // Вид счета: Active, Passive, ActivePassive
                const accountType = textContent.trim();
                if (accountType === 'Active' || accountType === 'Passive' || accountType === 'ActivePassive') {
                    item.AccountType = accountType;
                }
                break;
            case 'OffBalance':
                // Забалансовый счет: true/false
                item.OffBalance = textContent.toLowerCase() === 'true' || textContent === '1';
                break;
            case 'Order':
                // Порядок
                item.Order = textContent.trim();
                break;
            case 'AccountingFlags':
                // Таблица признаков учета
                item.AccountingFlags = parseAccountingFlagsTable(child);
                break;
            case 'ExtDimensionTypes':
                // Таблица видов субконто
                item.ExtDimensionTypes = parseExtDimensionTypesTable(child);
                break;
            case 'Type':
                // Type может содержать один или несколько элементов v8:Type с текстом типа
                // Собираем все элементы v8:Type
                const typeTexts = [];
                // Ищем все элементы v8:Type по namespace
                let v8TypeElements = [];
                try {
                    const elements = child.getElementsByTagNameNS('http://v8.1c.ru/8.1/data/core', 'Type');
                    for (let i = 0; i < elements.length; i++) {
                        v8TypeElements.push(elements[i]);
                    }
                }
                catch (e) {
                    // Игнорируем ошибки namespace
                }
                // Если не нашли по namespace, ищем по localName и nodeName
                if (v8TypeElements.length === 0) {
                    const childNodes = child.childNodes;
                    for (let j = 0; j < childNodes.length; j++) {
                        const cn = childNodes[j];
                        if (cn.nodeType === 1) {
                            const cel = cn;
                            const cln = cel.localName || cel.nodeName.split(':').pop() || cel.nodeName;
                            const nodeName = cel.nodeName;
                            // Проверяем namespace или префикс v8:
                            if (cln === 'Type' && (cel.namespaceURI === 'http://v8.1c.ru/8.1/data/core' || nodeName.startsWith('v8:') || nodeName === 'v8:Type')) {
                                v8TypeElements.push(cel);
                            }
                        }
                    }
                }
                // Обрабатываем все найденные элементы v8:Type
                if (v8TypeElements.length > 0) {
                    for (const v8TypeElement of v8TypeElements) {
                        let typeText = v8TypeElement.textContent || '';
                        // Убираем namespace prefix (например, d4p1:, cfg:) для работы с TypeWidget
                        // Оставляем только xs:, v8:, cfg: как префиксы типов
                        typeText = stripNamespacePrefix(typeText);
                        if (typeText) {
                            typeTexts.push(typeText);
                        }
                    }
                }
                else if (textContent.trim()) {
                    // Если v8:Type не найден, но есть текстовое содержимое Type, используем его
                    let typeText = textContent.trim();
                    typeText = stripNamespacePrefix(typeText);
                    if (typeText) {
                        typeTexts.push(typeText);
                    }
                }
                // Объединяем типы через разделитель "|" для составных типов
                if (typeTexts.length > 0) {
                    item.Type = typeTexts.join('|');
                }
                break;
            case 'IsFolder':
                item.IsFolder = textContent.toLowerCase() === 'true' || textContent === '1';
                break;
            case 'ActionPeriodIsBase':
                item.ActionPeriodIsBase = textContent.toLowerCase() === 'true' || textContent === '1';
                break;
            case 'Displaced':
                item.Displaced = parseCalculationTypeRefList(child);
                break;
            case 'Leading':
                item.Leading = parseCalculationTypeRefList(child);
                break;
            case 'Base':
                item.Base = parseCalculationTypeRefList(child);
                break;
            case 'ChildItems':
                // Рекурсивно парсим вложенные элементы, передавая имя текущего элемента как родителя
                const childItems = [];
                const childNodes = child.childNodes;
                for (let j = 0; j < childNodes.length; j++) {
                    const childNode = childNodes[j];
                    if (childNode.nodeType === 1) {
                        const childItemElement = childNode;
                        const childLocalName = childItemElement.localName || childItemElement.nodeName.split(':').pop() || childItemElement.nodeName;
                        if (childLocalName === 'Item') {
                            // Передаем имя текущего элемента как родителя для вложенных элементов
                            childItems.push(parseItemElement(childItemElement, item.Name));
                        }
                    }
                }
                if (childItems.length > 0) {
                    item.ChildItems = { Item: childItems };
                }
                break;
        }
    }
    return item;
}
/**
 * Парсинг таблицы признаков учета (AccountingFlags)
 * Формат XML: <Flag ref="ChartOfAccounts.Управленческий.AccountingFlag.Количественный">true</Flag>
 */
function parseAccountingFlagsTable(accountingFlagsElement) {
    const flags = [];
    // Ищем все элементы Flag внутри AccountingFlags
    const childNodes = accountingFlagsElement.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType !== 1)
            continue;
        const flagElement = node;
        const localName = flagElement.localName || flagElement.nodeName.split(':').pop() || flagElement.nodeName;
        if (localName === 'Flag') {
            // Извлекаем ref атрибут - это полное имя признака учета
            const refAttr = flagElement.getAttribute('ref');
            if (!refAttr)
                continue;
            // Извлекаем короткое имя из полного пути (последняя часть после последней точки)
            const flagName = refAttr.split('.').pop() || refAttr;
            // Извлекаем значение enabled из текстового содержимого
            const textContent = flagElement.textContent || '';
            const enabled = textContent.toLowerCase() === 'true' || textContent === '1';
            flags.push({ flagName, enabled, ref: refAttr });
        }
    }
    return flags;
}
/**
 * Парсинг таблицы видов субконто (ExtDimensionTypes)
 * Формат XML: <ExtDimensionType name="ChartOfCharacteristicTypes.ВидыСубконто.Номенклатура">
 *   <Turnover>false</Turnover>
 *   <AccountingFlags>
 *     <Flag ref="ChartOfAccounts.Управленческий.ExtDimensionAccountingFlag.Суммовой">true</Flag>
 *   </AccountingFlags>
 * </ExtDimensionType>
 */
function parseExtDimensionTypesTable(extDimensionTypesElement) {
    const dimensionTypes = [];
    // Ищем все элементы ExtDimensionType внутри ExtDimensionTypes
    const childNodes = extDimensionTypesElement.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType !== 1)
            continue;
        const dimTypeElement = node;
        const localName = dimTypeElement.localName || dimTypeElement.nodeName.split(':').pop() || dimTypeElement.nodeName;
        if (localName === 'ExtDimensionType') {
            // Извлекаем name из атрибута - это полное имя вида субконто
            const nameAttr = dimTypeElement.getAttribute('name');
            if (!nameAttr)
                continue;
            // Извлекаем короткое имя из полного пути (последняя часть после последней точки)
            const dimensionType = nameAttr.split('.').pop() || nameAttr;
            let turnoverOnly = false;
            const flags = {};
            // Парсим дочерние элементы ExtDimensionType
            const dimTypeChildren = dimTypeElement.childNodes;
            for (let j = 0; j < dimTypeChildren.length; j++) {
                const childNode = dimTypeChildren[j];
                if (childNode.nodeType !== 1)
                    continue;
                const childElement = childNode;
                const childLocalName = childElement.localName || childElement.nodeName.split(':').pop() || childElement.nodeName;
                const childTextContent = childElement.textContent || '';
                if (childLocalName === 'Turnover') {
                    turnoverOnly = childTextContent.toLowerCase() === 'true' || childTextContent === '1';
                }
                else if (childLocalName === 'AccountingFlags') {
                    // Парсим вложенные Flag элементы
                    const flagsChildren = childElement.childNodes;
                    for (let k = 0; k < flagsChildren.length; k++) {
                        const flagNode = flagsChildren[k];
                        if (flagNode.nodeType !== 1)
                            continue;
                        const flagElement = flagNode;
                        const flagLocalName = flagElement.localName || flagElement.nodeName.split(':').pop() || flagElement.nodeName;
                        if (flagLocalName === 'Flag') {
                            // Извлекаем ref атрибут - это полное имя признака учета
                            const refAttr = flagElement.getAttribute('ref');
                            if (!refAttr)
                                continue;
                            // Извлекаем короткое имя из полного пути (последняя часть после последней точки)
                            const flagName = refAttr.split('.').pop() || refAttr;
                            // Извлекаем значение enabled из текстового содержимого
                            const flagTextContent = flagElement.textContent || '';
                            const flagEnabled = flagTextContent.toLowerCase() === 'true' || flagTextContent === '1';
                            flags[flagName] = { enabled: flagEnabled, ref: refAttr };
                        }
                    }
                }
            }
            dimensionTypes.push({ dimensionType, turnoverOnly, flags, name: nameAttr });
        }
    }
    return dimensionTypes;
}
//# sourceMappingURL=predefinedParser.js.map
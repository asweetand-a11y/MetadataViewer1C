"use strict";
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
exports.parseMetadataXml = void 0;
const path = __importStar(require("path"));
const fileUtils_1 = require("../utils/fileUtils");
const xmlUtils_1 = require("../utils/xmlUtils");
const predefinedParser_1 = require("./predefinedParser");
/**
 * Парсинг XML файла метаданных (async)
 */
async function parseMetadataXml(xmlPath) {
    console.log(`[parseMetadataXml] Начало парсинга файла: ${xmlPath}`);
    try {
        const xml = await (0, fileUtils_1.safeReadFile)(xmlPath);
        console.log(`[parseMetadataXml] Файл прочитан, размер: ${xml.length} символов`);
        // КРИТИЧНО: Сохраняем исходный XML для сохранения структуры при записи
        // Пробуем использовать парсер с preserveOrder: true, но если он падает - используем обычный парсер
        let _originalXml = xml;
        try {
            // Пробуем использовать createPreserveOrderParser для сохранения структуры
            const preserveOrderParser = (0, xmlUtils_1.createPreserveOrderParser)();
            preserveOrderParser.parse(xml); // Проверяем, что парсинг работает
            // Если дошли сюда - парсинг успешен, используем исходный XML как есть
        }
        catch (preserveOrderError) {
            // Если парсер с preserveOrder падает - это нормально, используем обычный парсер
            // Но сохраняем исходный XML для применения изменений через строковые замены
            console.warn(`[parseMetadataXml] Парсер с preserveOrder не смог обработать XML, используем обычный парсер. Ошибка:`, preserveOrderError);
            // _originalXml уже установлен в xml выше
        }
        const parser = (0, xmlUtils_1.createXMLParser)();
        const j = parser.parse(xml);
        console.log(`[parseMetadataXml] XML распарсен, ключи верхнего уровня:`, Object.keys(j));
        const meta = j.MetaDataObject;
        if (!meta) {
            throw new Error(`Invalid metadata in ${xmlPath}: no <MetaDataObject>`);
        }
        const keys = Object.keys(meta).filter(k => k !== "@_xmlns" && !k.startsWith("@"));
        console.log(`[parseMetadataXml] Ключи MetaDataObject:`, keys);
        if (keys.length === 0) {
            throw new Error(`Invalid metadata in ${xmlPath}: empty object`);
        }
        const objectType = keys[0];
        console.log(`[parseMetadataXml] Тип объекта: ${objectType}`);
        const objNode = meta[objectType];
        if (!objNode) {
            throw new Error(`Invalid metadata in ${xmlPath}: object node is null or undefined`);
        }
        console.log(`[parseMetadataXml] objNode keys:`, Object.keys(objNode));
        console.log(`[parseMetadataXml] objNode.Properties:`, objNode.Properties ? Object.keys(objNode.Properties) : 'null/undefined');
        // Имя может быть в Properties.Name (атрибут), Properties.name (свойство) или в objNode.name
        // Также проверяем, если Properties - это массив (хотя это маловероятно)
        let name;
        if (objNode.Properties) {
            // Проверяем атрибут Name
            name = objNode.Properties.Name || objNode.Properties.name;
            console.log(`[parseMetadataXml] Имя из Properties: ${name}`);
            // Если Properties - массив, берем первый элемент
            if (!name && Array.isArray(objNode.Properties) && objNode.Properties.length > 0) {
                name = objNode.Properties[0].Name || objNode.Properties[0].name;
            }
        }
        // Если не нашли в Properties, проверяем objNode.name
        if (!name) {
            name = objNode.name;
            console.log(`[parseMetadataXml] Имя из objNode.name: ${name}`);
        }
        // Если все еще не нашли, используем имя файла
        if (!name) {
            name = path.basename(xmlPath, ".xml");
            console.log(`[parseMetadataXml] Имя из имени файла: ${name}`);
        }
        if (!name) {
            throw new Error(`Invalid metadata in ${xmlPath}: cannot determine object name`);
        }
        console.log(`[parseMetadataXml] Финальное имя объекта: ${name}`);
        // Простой маппинг типов объектов (без словаря перевода)
        const objectTypeMap = {
            "Catalog": "Справочник",
            "Document": "Документ",
            "InformationRegister": "Регистр сведений",
            "AccumulationRegister": "Регистр накопления",
            "AccountingRegister": "Регистр бухгалтерии",
            "CalculationRegister": "Регистр расчета",
            "Enum": "Перечисление",
            "Constant": "Константа",
            "CommonModule": "Общий модуль",
            "Report": "Отчет",
            "DataProcessor": "Обработка"
        };
        // Парсим объект
        console.log(`[parseMetadataXml] Начало парсинга свойств и атрибутов`);
        const parsed = {
            objectType: objectTypeMap[objectType] || objectType,
            name,
            sourcePath: xmlPath,
            properties: parseProperties(objNode.Properties),
            // ВАЖНО: для регистров в ChildObjects есть Resource/Dimension, их тоже показываем в UI.
            attributes: [
                ...parseAttributes(objNode.ChildObjects),
                ...parseChildObjectsByTag(objNode.ChildObjects, 'Resource', 'Resource'),
                ...parseChildObjectsByTag(objNode.ChildObjects, 'Dimension', 'Dimension')
            ],
            tabularSections: parseTabularSections(objNode.ChildObjects),
            forms: parseForms(objNode.ChildObjects?.Form || objNode.Forms),
            commands: parseCommands(objNode.ChildObjects?.Command || objNode.Commands),
            predefined: await loadPredefinedData(xmlPath, objNode.ChildObjects),
            // Признаки учета только для планов счетов
            accountingFlags: objectType === 'ChartOfAccounts'
                ? parseAccountingFlags(objNode.ChildObjects)
                : undefined,
            extDimensionAccountingFlags: objectType === 'ChartOfAccounts'
                ? parseExtDimensionAccountingFlags(objNode.ChildObjects)
                : undefined,
            enumValues: objectType === 'Enum' ? parseEnumValues(objNode.ChildObjects) : undefined,
            _originalXml: _originalXml // Сохраняем исходный XML как строку для максимального сохранения структуры
        };
        console.log(`[parseMetadataXml] Парсинг завершен успешно. Объект: ${parsed.objectType}, Имя: ${parsed.name}`);
        return parsed;
    }
    catch (error) {
        console.error(`[parseMetadataXml] Ошибка при парсинге ${xmlPath}:`, error);
        throw error;
    }
}
exports.parseMetadataXml = parseMetadataXml;
/**
 * Загрузка предопределенных данных (из Predefined.xml или ChildObjects)
 */
async function loadPredefinedData(xmlPath, childObjects) {
    // Сначала пробуем загрузить из Ext/Predefined.xml
    const hasPredefined = await (0, predefinedParser_1.hasPredefinedFile)(xmlPath);
    if (hasPredefined) {
        try {
            const predefinedPath = (0, predefinedParser_1.getPredefinedPath)(xmlPath);
            const predefinedItems = await (0, predefinedParser_1.parsePredefinedXml)(predefinedPath);
            if (predefinedItems.length > 0) {
                return predefinedItems;
            }
        }
        catch (err) {
            // Если не удалось загрузить, пробуем из ChildObjects
            console.error('Failed to load Predefined.xml:', err);
        }
    }
    // Если нет Predefined.xml, пробуем из ChildObjects
    return parsePredefinedData(childObjects);
}
/**
 * Убрать префиксы пространств имен из ключа (xr:, xsi:, v8:, cfg: и т.д.)
 */
function removeNamespacePrefix(key) {
    if (key.includes(':')) {
        return key.split(':')[1];
    }
    return key;
}
/**
 * Очистить объект от префиксов пространств имен
 */
function cleanNamespacePrefixes(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => cleanNamespacePrefixes(item));
    }
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
        const cleanKey = removeNamespacePrefix(key);
        cleaned[cleanKey] = cleanNamespacePrefixes(value);
    }
    return cleaned;
}
function parseProperties(node) {
    if (!node)
        return {};
    const props = {};
    for (let key of Object.keys(node)) {
        // Пропускаем служебные поля
        if (key.startsWith('@') || key === 'text')
            continue;
        // Убираем префикс пространства имен
        const cleanKey = removeNamespacePrefix(key);
        const val = node[key];
        // НЕ переводим ключ! Сохраняем английское название для совместимости с FIELD_VALUES
        // Перевод будет выполнен при отображении в webview
        // Специальная обработка для сложных редактируемых полей
        if (cleanKey === 'StandardAttributes' && val) {
            const standardAttr = val["StandardAttribute"] || val["xr:StandardAttribute"];
            if (standardAttr) {
                const attrs = Array.isArray(standardAttr) ? standardAttr : [standardAttr];
                // ВАЖНО: не "очищаем" префиксы и не упрощаем структуру StandardAttributes,
                // иначе теряются namespaces/атрибуты и структура при сохранении начинает отличаться от эталона.
                props[cleanKey] = attrs;
            }
            else {
                props[cleanKey] = "";
            }
            continue;
        }
        if (cleanKey === 'InputByString' && val) {
            const field = val["Field"] || val["xr:Field"];
            if (field) {
                props[cleanKey] = { Field: field };
            }
            else {
                props[cleanKey] = cleanNamespacePrefixes(val);
            }
            continue;
        }
        if (cleanKey === 'RegisterRecords' && val) {
            const item = val["Item"] || val["xr:Item"];
            if (item) {
                const items = Array.isArray(item) ? item : [item];
                props[cleanKey] = items.map((it) => {
                    const cleaned = cleanNamespacePrefixes(it);
                    return {
                        Item: {
                            text: cleaned["#text"] || cleaned.text || "",
                            type: cleaned["type"] || "xr:MDObjectRef"
                        }
                    };
                });
            }
            else {
                props[cleanKey] = "";
            }
            continue;
        }
        // Обрабатываем значение
        if (val && typeof val === "object") {
            // КРИТИЧНО: для сохранения структуры нельзя "упрощать" многоязычные поля до строки.
            // Иначе при сохранении пропадает v8:item (как в эталонном Untitled-1).
            // Оставляем структуру как есть, чтобы xmlDomUtils корректно записал обратно.
            if (cleanKey === 'Synonym' || cleanKey === 'Comment' || cleanKey === 'ToolTip' || cleanKey === 'Title') {
                props[cleanKey] = val;
                continue;
            }
            // КРИТИЧНО: Type нельзя превращать в JSON-строку — иначе она попадает внутрь <v8:Type> как текст.
            // Оставляем структуру (v8:Type/v8:TypeSet + qualifiers) как объект.
            if (cleanKey === 'Type') {
                props[cleanKey] = val;
                continue;
            }
            // Многоязычные поля (Synonym, Title и т.д.)
            // Структура: { "v8:item": { "v8:lang": "ru", "v8:content": "значение" } }
            const item = val["v8:item"] || val["item"];
            if (item) {
                // ВАЖНО: не упрощаем до строки, иначе теряем v8:item структуру.
                // UI сам решит, как отображать/редактировать.
                props[cleanKey] = val;
            }
            // Простые объекты с text
            else if ("text" in val || "#text" in val) {
                props[cleanKey] = val.text || val["#text"];
            }
            // Объекты с xsi:nil="true" (null значения) - Edge case: элемент только с атрибутами
            else if (val["xsi:nil"] === "true" || val["nil"] === "true") {
                // Сохраняем информацию о том, что это был элемент с атрибутом xsi:nil
                props[cleanKey] = {
                    "_xsiNil": true,
                    "_value": ""
                };
            }
            // Пустые объекты - Edge case: пустой элемент
            else if (Object.keys(val).length === 0 || val === null) {
                props[cleanKey] = "";
            }
            // Остальные объекты - очищаем префиксы
            else {
                // ВАЖНО: не превращаем в JSON-строку, иначе при сохранении это уедет в текстовый узел
                // и разрушит структуру (xsi:type, from=..., namespaces и т.д.).
                props[cleanKey] = val;
            }
        }
        else if (typeof val === 'string') {
            // Сохраняем строковые значения как есть (без перевода)
            props[cleanKey] = val;
        }
        else if (typeof val === 'boolean') {
            // Булевы значения сохраняем как строки "true"/"false" для XML
            props[cleanKey] = val ? "true" : "false";
        }
        else if (val === null || val === undefined || val === '') {
            props[cleanKey] = "";
        }
        else {
            props[cleanKey] = val;
        }
    }
    return props;
}
function parseAttributes(childObjects) {
    if (!childObjects)
        return [];
    let attrs = childObjects.Attribute;
    if (!attrs)
        return [];
    if (!Array.isArray(attrs))
        attrs = [attrs];
    return attrs.map((a) => {
        // uuid может приходить как "@_uuid" (fast-xml-parser) либо как "uuid" (в зависимости от источника)
        const uuid = a?.['@_uuid'] || a?.uuid || a?.Properties?.['@_uuid'] || a?.Properties?.uuid;
        // Реквизиты имеют вложенную структуру Properties
        const props = a.Properties || a;
        const parsedType = parseType(props.Type || a.Type);
        return {
            uuid: uuid ? String(uuid) : undefined,
            childObjectKind: 'Attribute',
            name: props.Name || a.name || "Неизвестно",
            type: parsedType,
            // Тип для отображения (без перевода, так как словарь удален)
            typeDisplay: parsedType ? getTypeDisplayString(parsedType) : "Неопределено",
            properties: parseProperties(props)
        };
    });
}
function parseChildObjectsByTag(childObjects, tagName, kind) {
    if (!childObjects)
        return [];
    let items = childObjects[tagName];
    if (!items)
        return [];
    if (!Array.isArray(items))
        items = [items];
    return items.map((a) => {
        const uuid = a?.['@_uuid'] || a?.uuid || a?.Properties?.['@_uuid'] || a?.Properties?.uuid;
        const props = a.Properties || a;
        const parsedType = parseType(props.Type || a.Type);
        return {
            uuid: uuid ? String(uuid) : undefined,
            childObjectKind: kind,
            name: props.Name || a.name || "Неизвестно",
            type: parsedType,
            typeDisplay: parsedType ? getTypeDisplayString(parsedType) : "Неопределено",
            properties: parseProperties(props)
        };
    });
}
/**
 * Парсинг признаков учета по счетам (AccountingFlag)
 */
function parseAccountingFlags(childObjects) {
    if (!childObjects)
        return [];
    let flags = childObjects.AccountingFlag;
    if (!flags)
        return [];
    if (!Array.isArray(flags))
        flags = [flags];
    return flags.map((a) => {
        const uuid = a?.['@_uuid'] || a?.uuid || a?.Properties?.['@_uuid'] || a?.Properties?.uuid;
        const props = a.Properties || a;
        const parsedType = parseType(props.Type || a.Type);
        return {
            uuid: uuid ? String(uuid) : undefined,
            childObjectKind: 'Attribute',
            name: props.Name || a.name || "Неизвестно",
            type: parsedType,
            typeDisplay: parsedType ? getTypeDisplayString(parsedType) : "Неопределено",
            properties: parseProperties(props)
        };
    });
}
/**
 * Парсинг признаков учета по субконто (ExtDimensionAccountingFlag)
 */
function parseExtDimensionAccountingFlags(childObjects) {
    if (!childObjects)
        return [];
    let flags = childObjects.ExtDimensionAccountingFlag;
    if (!flags)
        return [];
    if (!Array.isArray(flags))
        flags = [flags];
    return flags.map((a) => {
        const uuid = a?.['@_uuid'] || a?.uuid || a?.Properties?.['@_uuid'] || a?.Properties?.uuid;
        const props = a.Properties || a;
        const parsedType = parseType(props.Type || a.Type);
        return {
            uuid: uuid ? String(uuid) : undefined,
            childObjectKind: 'Attribute',
            name: props.Name || a.name || "Неизвестно",
            type: parsedType,
            typeDisplay: parsedType ? getTypeDisplayString(parsedType) : "Неопределено",
            properties: parseProperties(props)
        };
    });
}
/**
 * Парсинг значений перечисления (EnumValue)
 */
function parseEnumValues(childObjects) {
    if (!childObjects)
        return [];
    let items = childObjects.EnumValue;
    if (!items)
        return [];
    if (!Array.isArray(items))
        items = [items];
    return items.map((ev) => {
        const uuid = ev?.['@_uuid'] || ev?.uuid || ev?.Properties?.['@_uuid'] || ev?.Properties?.uuid;
        const props = ev.Properties || ev;
        const name = props.Name || ev.name || ev.Name || "Неизвестно";
        return {
            uuid: uuid ? String(uuid) : undefined,
            name: String(name),
            properties: parseProperties(props)
        };
    });
}
function parseTabularSections(childObjects) {
    if (!childObjects)
        return [];
    let tabs = childObjects.TabularSection;
    if (!tabs)
        return [];
    if (!Array.isArray(tabs))
        tabs = [tabs];
    return tabs.map((t) => {
        // uuid может приходить как "@_uuid" (fast-xml-parser) либо как "uuid"
        const uuid = t?.['@_uuid'] || t?.uuid || t?.Properties?.['@_uuid'] || t?.Properties?.uuid;
        // Табличные части также имеют вложенную структуру Properties
        const props = t.Properties || t;
        return {
            uuid: uuid ? String(uuid) : undefined,
            name: props.Name || t.name || "Unknown",
            attributes: parseAttributes(t.ChildObjects)
        };
    });
}
function parseType(node) {
    if (!node)
        return null;
    // Если тип - строка
    if (typeof node === "string") {
        return { kind: node };
    }
    // Если есть вложенный v8:TypeSet (определяемый тип)
    // <Type><v8:TypeSet>cfg:DefinedType.Респондент</v8:TypeSet></Type>
    if (node['v8:TypeSet']) {
        const typeSetStr = node['v8:TypeSet'];
        const typeSetValue = typeof typeSetStr === 'object' && typeSetStr !== null
            ? (typeSetStr.text ?? typeSetStr['#text'] ?? String(typeSetStr))
            : String(typeSetStr);
        return {
            kind: "TypeSet",
            details: { TypeSet: typeSetValue }
        };
    }
    // Если есть вложенный v8:Type (основной формат 1С)
    // <Type><v8:Type>cfg:CatalogRef.Номенклатура</v8:Type></Type>
    // Или составной тип: <Type><v8:Type>...</v8:Type><v8:Type>...</v8:Type></Type>
    if (node['v8:Type']) {
        let typeStr = node['v8:Type'];
        // Если массив типов - это составной тип (не OneOf, а просто массив)
        if (Array.isArray(typeStr)) {
            // Для составных типов возвращаем массив типов
            // Структура: { Type: [{ Type: '...', StringQualifiers: {...} }, ...] }
            const types = typeStr.map(t => {
                const resolved = typeof t === 'string'
                    ? t
                    : (t?.text ?? t?.['#text'] ?? t);
                const typeObj = { Type: resolved };
                // Извлекаем квалификаторы из исходного узла, если они есть
                // Квалификаторы могут быть на том же уровне, что и v8:Type
                if (node['v8:StringQualifiers']) {
                    typeObj.StringQualifiers = node['v8:StringQualifiers'];
                }
                if (node['v8:NumberQualifiers']) {
                    typeObj.NumberQualifiers = node['v8:NumberQualifiers'];
                }
                if (node['v8:DateQualifiers']) {
                    typeObj.DateQualifiers = node['v8:DateQualifiers'];
                }
                return typeObj;
            });
            // Возвращаем объект с массивом Type для правильной сериализации
            return {
                kind: "Composite",
                details: { Type: types }
            };
        }
        // Если объект с text/#text
        if (typeof typeStr === 'object' && typeStr) {
            if (typeStr.text) {
                typeStr = typeStr.text;
            }
            else if (typeStr['#text']) {
                typeStr = typeStr['#text'];
            }
        }
        // Если все еще не строка - вернуть Unknown
        if (typeof typeStr !== 'string') {
            return { kind: "Unknown", details: typeStr };
        }
        // Сохраняем тип как есть (с префиксом xs:, cfg: и т.д.)
        // Префикс будет убран только при отображении
        const result = { kind: typeStr };
        // Парсим квалификаторы, если они есть
        const details = {};
        if (node['v8:StringQualifiers']) {
            const sq = node['v8:StringQualifiers'];
            details.StringQualifiers = {
                Length: sq['v8:Length'] || sq.Length || 10,
                AllowedLength: sq['v8:AllowedLength'] || sq.AllowedLength || 'Variable'
            };
        }
        if (node['v8:NumberQualifiers']) {
            const nq = node['v8:NumberQualifiers'];
            details.NumberQualifiers = {
                Digits: nq['v8:Digits'] || nq.Digits || 10,
                FractionDigits: nq['v8:FractionDigits'] || nq.FractionDigits || 2,
                AllowedSign: nq['v8:AllowedSign'] || nq.AllowedSign || 'Any'
            };
        }
        if (node['v8:DateQualifiers']) {
            const dq = node['v8:DateQualifiers'];
            details.DateQualifiers = {
                DateFractions: dq['v8:DateFractions'] || dq.DateFractions || 'DateTime'
            };
        }
        if (Object.keys(details).length > 0) {
            result.details = details;
        }
        return result;
    }
    // TypeDescription
    if (node.TypeDescription) {
        return parseTypeDescription(node.TypeDescription);
    }
    // OneOf (несколько типов)
    if (node.OneOf) {
        const items = [].concat(node.OneOf.Type ?? []);
        return {
            kind: "OneOf",
            details: items.map(i => parseType(i))
        };
    }
    // ArrayOf (массив)
    if (node.ArrayOf) {
        return {
            kind: "ArrayOf",
            details: parseType(node.ArrayOf.Type)
        };
    }
    return { kind: "Unknown", details: node };
}
function parseTypeDescription(node) {
    const result = { kind: "TypeDescription", details: {} };
    for (const key of Object.keys(node)) {
        if (key === "text")
            continue;
        result.details[key] = node[key];
    }
    return result;
}
/**
 * Получение строки типа для отображения (без перевода)
 */
function getTypeDisplayString(typeRef) {
    if (!typeRef)
        return "Неопределено";
    let kind = typeRef.kind;
    // Убеждаемся, что kind - строка
    if (typeof kind !== 'string') {
        kind = String(kind || 'Unknown');
    }
    // Убираем префикс пространства имен только для отображения
    // (xs:, cfg:, xsi: и т.д.)
    kind = kind.replace(/^(xs|cfg|xsi):/, '');
    // Если это составной тип (CatalogRef.Номенклатура)
    if (kind.includes('.')) {
        // Оставляем как есть, без перевода
        return kind;
    }
    // Специальные типы
    if (kind === 'OneOf') {
        const details = typeRef.details;
        if (details && Array.isArray(details)) {
            const types = details.map(t => getTypeDisplayString(t)).join(', ');
            return `Один из (${types})`;
        }
        return "Один из типов";
    }
    if (kind === 'ArrayOf') {
        const detail = typeRef.details;
        const innerType = detail ? getTypeDisplayString(detail) : "?";
        return `Массив (${innerType})`;
    }
    if (kind === 'TypeDescription') {
        return "Описание типа";
    }
    // Возвращаем как есть (без префикса)
    return kind;
}
function parseForms(forms) {
    if (!forms)
        return [];
    // Формы могут быть в разных форматах:
    // 1. Массив строк: ["ФормаДокумента", "ФормаСписка"]
    // 2. Объект с полем Form: { Form: ["ФормаДокумента"] }
    // 3. Массив объектов: [{ name: "ФормаДокумента", formType: "..." }]
    let list = [];
    // Если это массив - используем напрямую
    if (Array.isArray(forms)) {
        list = forms;
    }
    // Если это объект с полем Form
    else if (forms.Form) {
        list = Array.isArray(forms.Form) ? forms.Form : [forms.Form];
    }
    // Если это объект с полем forms (множественное число)
    else if (forms.forms) {
        list = Array.isArray(forms.forms) ? forms.forms : [forms.forms];
    }
    // Если это строка - одна форма
    else if (typeof forms === 'string') {
        list = [forms];
    }
    else {
        return [];
    }
    return list.map((f) => {
        // Если форма - просто строка
        if (typeof f === 'string') {
            return {
                name: f,
                formType: null
            };
        }
        // Если форма - объект с properties
        // fast-xml-parser с textNodeName: "text" парсит <Form>Имя</Form> как { text: "Имя" }
        return {
            name: f.name || f.Name || f.text || f["#text"] || "Unknown",
            formType: f.FormType ?? f.formType ?? null
        };
    });
}
function parseCommands(commands) {
    if (!commands)
        return [];
    let list = commands.Command;
    if (!list)
        return [];
    if (!Array.isArray(list))
        list = [list];
    return list.map((c) => ({
        name: c.name,
        properties: parseProperties(c)
    }));
}
/**
 * Парсинг предопределенных данных
 */
function parsePredefinedData(childObjects) {
    if (!childObjects)
        return [];
    // Ищем предопределенные элементы
    const predefinedItems = [];
    // Для справочников
    if (childObjects.Catalog) {
        const catalogs = Array.isArray(childObjects.Catalog) ? childObjects.Catalog : [childObjects.Catalog];
        catalogs.forEach((cat) => {
            if (cat.Properties && cat.Properties.Predefined === true) {
                predefinedItems.push({
                    name: cat.name || 'Unknown',
                    key: cat.Properties.PredefinedDataName || cat.name || 'Unknown',
                    parents: []
                });
            }
        });
    }
    // Для перечислений
    if (childObjects.EnumValue) {
        const enumValues = Array.isArray(childObjects.EnumValue) ? childObjects.EnumValue : [childObjects.EnumValue];
        enumValues.forEach((enumVal) => {
            predefinedItems.push({
                name: enumVal.name || 'Unknown',
                key: enumVal.name || 'Unknown',
                parents: []
            });
        });
    }
    // Для планов счетов
    if (childObjects.Account) {
        const accounts = Array.isArray(childObjects.Account) ? childObjects.Account : [childObjects.Account];
        accounts.forEach((acc) => {
            if (acc.Properties && acc.Properties.Predefined === true) {
                predefinedItems.push({
                    name: acc.name || 'Unknown',
                    key: acc.Properties.Code || acc.name || 'Unknown',
                    parents: []
                });
            }
        });
    }
    // Для видов расчета
    if (childObjects.CalculationType) {
        const calcTypes = Array.isArray(childObjects.CalculationType) ? childObjects.CalculationType : [childObjects.CalculationType];
        calcTypes.forEach((ct) => {
            if (ct.Properties && ct.Properties.Predefined === true) {
                predefinedItems.push({
                    name: ct.name || 'Unknown',
                    key: ct.name || 'Unknown',
                    parents: []
                });
            }
        });
    }
    return predefinedItems;
}
//# sourceMappingURL=metadataParser.js.map
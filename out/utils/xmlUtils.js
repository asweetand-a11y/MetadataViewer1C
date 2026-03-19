"use strict";
/**
 * Утилиты для работы с XML
 *
 * Настройки парсера и билдера соответствуют формату XML файлов 1С
 * и проверены тестированием (см. FINAL_ERROR_PROTOCOL.md)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateXML = exports.normalizeXML = exports.createPreserveOrderBuilder = exports.createPreserveOrderParser = exports.createXMLBuilder = exports.createXMLParser = void 0;
const fast_xml_parser_1 = require("fast-xml-parser");
/**
 * Настройки парсера XML
 *
 * Важно: preserveOrder: false используется для корректной работы со структурой XML 1С.
 * При preserveOrder: true структура парсинга меняется, что приводит к ошибкам.
 */
const DEFAULT_PARSER_OPTIONS = {
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "text",
    allowBooleanAttributes: true,
    preserveOrder: false // КРИТИЧНО: должно быть false для корректной работы
};
/**
 * Настройки билдера XML
 *
 * Важно:
 * - indentBy: "\t" - табуляция соответствует формату XML файлов 1С
 * - preserveOrder: false - должно соответствовать настройкам парсера
 */
const DEFAULT_BUILDER_OPTIONS = {
    ignoreAttributes: false,
    attributeNamePrefix: "",
    suppressEmptyNode: false,
    format: true,
    indentBy: "\t",
    suppressBooleanAttributes: false,
    processEntities: true,
    preserveOrder: false,
    alwaysCreateTextNode: true // Всегда создавать текстовые узлы для простых значений (элементы вместо атрибутов)
};
/**
 * Создание XML парсера с дефолтными настройками
 */
function createXMLParser(options = {}) {
    return new fast_xml_parser_1.XMLParser({ ...DEFAULT_PARSER_OPTIONS, ...options });
}
exports.createXMLParser = createXMLParser;
/**
 * Создание XML билдера с дефолтными настройками
 */
function createXMLBuilder(options = {}) {
    return new fast_xml_parser_1.XMLBuilder({ ...DEFAULT_BUILDER_OPTIONS, ...options });
}
exports.createXMLBuilder = createXMLBuilder;
/**
 * Создание XML парсера с preserveOrder: true для сохранения структуры
 */
function createPreserveOrderParser(options = {}) {
    return new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
        textNodeName: "text",
        allowBooleanAttributes: true,
        preserveOrder: true,
        ...options
    });
}
exports.createPreserveOrderParser = createPreserveOrderParser;
/**
 * Создание XML билдера с preserveOrder: true для сохранения структуры
 */
function createPreserveOrderBuilder(options = {}) {
    return new fast_xml_parser_1.XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: "",
        suppressEmptyNode: false,
        format: true,
        indentBy: "\t",
        suppressBooleanAttributes: false,
        processEntities: true,
        preserveOrder: true,
        ...options
    });
}
exports.createPreserveOrderBuilder = createPreserveOrderBuilder;
/**
 * Нормализация XML: добавление декларации и форматирование
 */
function normalizeXML(xml) {
    let result = xml;
    // ВАЖНО: не делаем regex-нормализации пробелов/пустых строк.
    // Для Form.xml и других файлов 1С это может менять текстовые поля (например QueryText).
    // Добавление XML декларации если отсутствует
    if (!String(result || '').trim().startsWith("<?xml")) {
        result = `<?xml version="1.0" encoding="UTF-8"?>\n` + result;
    }
    return result;
}
exports.normalizeXML = normalizeXML;
/**
 * Валидация XML структуры
 */
function validateXML(xml) {
    try {
        // КРИТИЧНО: Проверяем, что xml является строкой и не пустая
        if (typeof xml !== 'string' || xml.trim().length === 0) {
            return { valid: false, error: 'XML is empty or not a string' };
        }
        // Базовая проверка структуры XML перед парсингом
        // Проверяем наличие открывающих и закрывающих тегов
        const openTags = (xml.match(/<[^/!?][^>]*>/g) || []).length;
        const closeTags = (xml.match(/<\/[^>]+>/g) || []).length;
        const selfClosingTags = (xml.match(/<[^/!?][^>]*\/>/g) || []).length;
        // Простая проверка баланса тегов (не идеальная, но помогает отловить явные проблемы)
        if (openTags > closeTags + selfClosingTags + 10) {
            return { valid: false, error: `XML structure error: unbalanced tags (open: ${openTags}, close: ${closeTags}, self-closing: ${selfClosingTags})` };
        }
        // ВАЖНО: Используем более безопасный парсер с обработкой ошибок
        // Проблема: fast-xml-parser может падать на некорректном XML с ошибкой "Cannot read properties of undefined (reading 'addChild')"
        // Решение: используем парсер с минимальными опциями и обработкой ошибок
        try {
            const parser = createXMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: "",
                textNodeName: "text",
                allowBooleanAttributes: true,
                preserveOrder: false,
                // Отключаем проблемные опции, которые могут вызывать ошибки
                stopNodes: [],
                parseTrueNumberOnly: false,
                parseAttributeValue: true,
                trimValues: false,
                processEntities: true,
                htmlEntities: false,
                // Добавляем опции для более безопасного парсинга
                ignoreDeclaration: true,
                ignorePiTags: true,
                removeNSPrefix: false,
                isArray: () => false,
                commentPropName: false,
                cdataPropName: false,
                alwaysCreateTextNode: false // Не всегда создаем текстовые узлы
            });
            const parsed = parser.parse(xml);
            // Проверяем, что парсинг вернул результат
            if (!parsed || typeof parsed !== 'object') {
                return { valid: false, error: 'XML parsing returned invalid result' };
            }
            return { valid: true };
        }
        catch (parseError) {
            const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            // НЕ возвращаем valid: true при ошибках парсера — 1С XDTO может отклонить такой XML.
            return { valid: false, error: `Ошибка парсинга XML: ${parseErrorMessage}` };
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        // Улучшаем сообщение об ошибке для отладки
        let detailedError = `XML validation failed: ${errorMessage}`;
        if (errorStack) {
            // Берем только первые строки стека для краткости
            const stackLines = errorStack.split('\n').slice(0, 3).join('\n');
            detailedError += `\nStack: ${stackLines}`;
        }
        return { valid: false, error: detailedError };
    }
}
exports.validateXML = validateXML;
//# sourceMappingURL=xmlUtils.js.map
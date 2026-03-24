"use strict";
/**
 * Сериализация формы обратно в XML с сохранением структуры через xmldom.
 *
 * ВАЖНО: Используется xmldom (а не fast-xml-parser) для сохранения структуры XML.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeFormToXml = exports.updateFormDomFromData = exports.serializeFormDomToXml = void 0;
const xmldom_1 = require("@xmldom/xmldom");
const formXmlAlignment_1 = require("./generated/formXmlAlignment");
/**
 * В XSD логической формы 1С у ContextMenu, ExtendedTooltip, AutoCommandBar и ряда
 * соседних элементов поля name/id задаются как XML-атрибуты, не как дочерние теги.
 */
function getNameIdFromPlainObject(obj) {
    if (!obj || typeof obj !== 'object')
        return {};
    const nameRaw = obj.name ?? obj.Name;
    const idRaw = obj.id ?? obj.Id;
    const out = {};
    if (nameRaw !== undefined && nameRaw !== null)
        out.name = String(nameRaw);
    if (idRaw !== undefined && idRaw !== null)
        out.id = String(idRaw);
    return out;
}
function applyNameIdAttributes(target, obj) {
    const { name, id } = getNameIdFromPlainObject(obj);
    if (name !== undefined)
        target.setAttribute('name', name);
    if (id !== undefined)
        target.setAttribute('id', id);
}
function isNameOrIdPropertyKey(key) {
    const k = key.toLowerCase();
    return k === 'name' || k === 'id';
}
/** Убрать из объекта свойств ключи, которые в XSD — атрибуты тега, а не дочерние элементы. */
function stripNameIdKeysFromRecord(obj) {
    const o = { ...obj };
    delete o.name;
    delete o.Name;
    delete o.id;
    delete o.Id;
    return o;
}
function formElementHasDirectChildElement(formElement, tagName) {
    for (let i = 0; i < formElement.childNodes.length; i++) {
        const n = formElement.childNodes[i];
        if (n.nodeType === 1 && n.tagName === tagName) {
            return true;
        }
    }
    return false;
}
function normalizeFormCommandForSerialization(cmd) {
    const properties = { ...(cmd.properties || {}) };
    const idRaw = properties.id ?? properties.Id;
    const idAttr = idRaw !== undefined && idRaw !== null && String(idRaw) !== '' ? String(idRaw) : undefined;
    delete properties.id;
    delete properties.Id;
    delete properties.name;
    delete properties.Name;
    return { idAttr, properties };
}
/**
 * Реквизит формы: один дочерний <Type>, имя только в атрибуте name у <Attribute>.
 * Type/Name в properties дают дубликат <Type> или недопустимый <Name>.
 */
function normalizeFormAttributeForSerialization(attr) {
    const properties = { ...(attr.properties || {}) };
    const typeFromProps = properties.Type ?? properties.type;
    delete properties.Type;
    delete properties.type;
    delete properties.Name;
    delete properties.name;
    const typeValue = attr.type ?? typeFromProps;
    return { typeValue, properties };
}
/**
 * В Form.xml у дочернего <UseAlways> реквизита по XSD есть <Field>, а не текст true/false.
 * Редактор хранит boolean — при true подставляем имя реквизита как поле (как в типовых формах 1С).
 * @returns элемент, false если не выводить, null — передать в общую сериализацию (объект с вложениями)
 */
function trySerializeUseAlwaysOnFormAttribute(doc, propKey, value, attributeName, attrContentIndent) {
    if (propKey !== 'UseAlways') {
        return null;
    }
    if (value === false) {
        return false;
    }
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        return null;
    }
    const propElement = doc.createElement('UseAlways');
    const nestedIndent = attrContentIndent + '\t';
    const fieldText = value === true ? attributeName : String(value);
    propElement.appendChild(doc.createTextNode('\n'));
    propElement.appendChild(doc.createTextNode(nestedIndent));
    const fieldEl = doc.createElement('Field');
    fieldEl.appendChild(doc.createTextNode(fieldText));
    propElement.appendChild(fieldEl);
    propElement.appendChild(doc.createTextNode('\n'));
    propElement.appendChild(doc.createTextNode(attrContentIndent));
    return propElement;
}
/**
 * Маппинг префиксов namespace к их URI для 1C:Enterprise
 */
const NAMESPACE_MAP = {
    'v8': 'http://v8.1c.ru/8.1/data/core',
    'xr': 'http://v8.1c.ru/8.3/xcf/readable',
    'cfg': 'http://v8.1c.ru/8.1/data/enterprise/current-config',
    'xs': 'http://www.w3.org/2001/XMLSchema',
    'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'app': 'http://v8.1c.ru/8.2/managed-application/core',
    'dcscor': 'http://v8.1c.ru/8.1/data-composition-system/core',
    'dcssch': 'http://v8.1c.ru/8.1/data-composition-system/schema',
    'dcsset': 'http://v8.1c.ru/8.1/data-composition-system/settings',
    'ent': 'http://v8.1c.ru/8.1/data/enterprise',
    'lf': 'http://v8.1c.ru/8.2/managed-application/logform',
    'style': 'http://v8.1c.ru/8.1/data/ui/style',
    'sys': 'http://v8.1c.ru/8.1/data/ui/fonts/system',
    'v8ui': 'http://v8.1c.ru/8.1/data/ui',
    'web': 'http://v8.1c.ru/8.1/data/ui/colors/web',
    'win': 'http://v8.1c.ru/8.1/data/ui/colors/windows',
};
/**
 * Получает namespace URI по префиксу
 *
 * @param prefix - префикс namespace (например, 'v8', 'xr', 'cfg')
 * @returns namespace URI или null, если префикс не найден
 */
function getNamespaceURI(prefix) {
    return NAMESPACE_MAP[prefix] || null;
}
/**
 * Создает элемент с правильным namespace, если префикс указан
 *
 * @param doc - DOM документ
 * @param tagName - имя тега (может содержать префикс, например, 'v8:item', 'xr:Common')
 * @returns созданный элемент
 */
function createElementWithNamespace(doc, tagName) {
    const namespaceMatch = tagName.match(/^([^:]+):(.+)$/);
    if (namespaceMatch) {
        const prefix = namespaceMatch[1];
        const namespaceURI = getNamespaceURI(prefix);
        if (namespaceURI) {
            const element = doc.createElementNS(namespaceURI, tagName);
            // ВАЖНО: Удаляем xmlns атрибут, если он был автоматически добавлен
            // Namespace должен быть объявлен только в корневом элементе Form
            if (element.hasAttributeNS('http://www.w3.org/2000/xmlns/', `xmlns:${prefix}`)) {
                element.removeAttributeNS('http://www.w3.org/2000/xmlns/', `xmlns:${prefix}`);
            }
            return element;
        }
    }
    return doc.createElement(tagName);
}
/**
 * Устанавливает атрибут namespace для элемента, если нужно
 *
 * @param element - элемент
 * @param tagName - имя тега (может содержать префикс)
 */
function setNamespaceAttributeIfNeeded(element, tagName) {
    const namespaceMatch = tagName.match(/^([^:]+):(.+)$/);
    if (namespaceMatch) {
        const prefix = namespaceMatch[1];
        const namespaceURI = getNamespaceURI(prefix);
        if (namespaceURI) {
            // ВАЖНО: Проверяем, не объявлен ли уже этот namespace в родительских элементах
            // Namespace должен быть объявлен только в корневом элементе, а не в каждом дочернем элементе
            let current = element.parentNode;
            let found = false;
            // Проверяем родительские элементы до корня
            while (current && current.nodeType === 1) { // ELEMENT_NODE
                const parentElement = current;
                const parentNS = parentElement.getAttributeNS('http://www.w3.org/2000/xmlns/', `xmlns:${prefix}`);
                if (parentNS === namespaceURI) {
                    found = true;
                    break;
                }
                // Если дошли до корневого элемента Form, проверяем его тоже
                if (parentElement.tagName === 'Form') {
                    const formNS = parentElement.getAttributeNS('http://www.w3.org/2000/xmlns/', `xmlns:${prefix}`);
                    if (formNS === namespaceURI) {
                        found = true;
                        break;
                    }
                }
                current = parentElement.parentNode;
            }
            // Если namespace не найден в родителях, НЕ добавляем его (он должен быть в корневом элементе Form)
            // Это предотвращает появление xmlns:v8="..." в каждом элементе v8:item
            if (!found) {
                // Namespace должен быть объявлен в корневом элементе Form, а не здесь
                // Не добавляем xmlns атрибут
            }
        }
    }
}
/**
 * Сериализует DOM документ обратно в XML строку с BOM
 *
 * @param doc - DOM документ
 * @returns XML строка (без BOM - BOM добавляется при сохранении файла)
 */
function serializeFormDomToXml(doc) {
    // ВАЖНО: Удаляем все xmlns:v8 атрибуты из дочерних элементов перед сериализацией
    // Namespace должен быть объявлен только в корневом элементе Form
    function removeNamespaceAttributes(element) {
        // Удаляем xmlns:v8 и другие xmlns атрибуты (кроме тех, что в корневом элементе)
        if (element.tagName !== 'Form') {
            const attrsToRemove = [];
            for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                if (attr.name.startsWith('xmlns:') && attr.name !== 'xmlns') {
                    attrsToRemove.push(attr.name);
                }
            }
            for (const attrName of attrsToRemove) {
                element.removeAttribute(attrName);
            }
        }
        // Рекурсивно обрабатываем дочерние элементы
        for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes[i];
            if (child.nodeType === 1) { // ELEMENT_NODE
                removeNamespaceAttributes(child);
            }
        }
    }
    const rootElement = doc.documentElement;
    if (rootElement) {
        removeNamespaceAttributes(rootElement);
    }
    const serializer = new xmldom_1.XMLSerializer();
    let xml = serializer.serializeToString(doc);
    // Проверяем, есть ли уже <?xml ?> декларация
    if (!xml.startsWith('<?xml')) {
        xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
    }
    else {
        // Убеждаемся, что в декларации указана правильная кодировка UTF-8
        xml = xml.replace(/^(<\?xml[^>]+encoding=["'])[^"']+(["'][^>]*\?>)/, '$1UTF-8$2');
    }
    // xmldom иногда удваивает декларацию, исправляем
    xml = xml.replace(/^(<\?xml[^>]+\?>)\s*(<\?xml[^>]+\?>)/, '$1');
    // ВАЖНО: Удаляем xmlns:v8 из всех элементов (кроме корневого Form) через regex
    // Это дополнительная защита на случай, если xmldom все еще добавляет их
    xml = xml.replace(/(<v8:[^>]+)\s+xmlns:v8="http:\/\/v8\.1c\.ru\/8\.1\/data\/core"([^>]*>)/g, '$1$2');
    return xml;
}
exports.serializeFormDomToXml = serializeFormDomToXml;
/**
 * Обновляет DOM документ формы на основе изменений в ParsedFormFull
 *
 * ВАЖНО: Правильный порядок элементов в форме:
 * 1. Свойства формы (VerticalScroll, AutoTime, UsePostingMode, RepostOnWrite, AutoCommandBar, Events и т.д.)
 * 2. ChildItems
 * 3. Attributes
 * 4. Commands
 * 5. Parameters
 * 6. CommandInterface
 *
 * @param doc - DOM документ для обновления
 * @param formElement - корневой элемент <Form>
 * @param formData - данные формы для обновления
 */
function updateFormDomFromData(doc, formElement, formData) {
    // ВАЖНО: Сохраняем оригинальные элементы из DOM для сохранения правильной кодировки атрибутов
    // Сначала находим существующие элементы
    const existingElements = new Map();
    for (let i = 0; i < formElement.childNodes.length; i++) {
        const child = formElement.childNodes[i];
        if (child.nodeType === 1) {
            const element = child;
            existingElements.set(element.tagName, element);
        }
    }
    // ВАЖНО: Сохраняем элементы, которые не обрабатываются через formData (CommandInterface, CommandSet, Parameters и т.д.)
    // Эти элементы нужно сохранить полностью из оригинального DOM
    const elementsToPreserve = ['CommandInterface', 'CommandSet', 'Parameters'];
    const preservedElements = new Map();
    for (const tagName of elementsToPreserve) {
        const existing = existingElements.get(tagName);
        if (existing) {
            preservedElements.set(tagName, existing.cloneNode(true));
        }
    }
    // Удаляем ВСЕ дочерние узлы (включая текстовые) для правильного переупорядочивания
    // Это предотвращает появление пустых строк в начале файла
    while (formElement.firstChild) {
        formElement.removeChild(formElement.firstChild);
    }
    // Добавляем начальный перенос строки
    formElement.appendChild(doc.createTextNode('\n'));
    // 0. Добавляем CommandSet первым (если есть)
    const preservedCommandSet = preservedElements.get('CommandSet');
    if (preservedCommandSet) {
        formElement.appendChild(doc.createTextNode('\t'));
        formElement.appendChild(preservedCommandSet);
        formElement.appendChild(doc.createTextNode('\n'));
    }
    // 1. Добавляем свойства формы (в порядке их появления в properties)
    // По XSD логической формы у <Form> minOccurs=1 для AutoCommandBar — не терять при сохранении.
    const properties = formData.properties && typeof formData.properties === 'object' ? formData.properties : {};
    {
        const propertyOrder = [
            'AutoSaveDataInSettings', 'VerticalScroll', 'AutoTime', 'UsePostingMode', 'RepostOnWrite',
            'AutoCommandBar', 'Events', 'Title', 'WindowOpeningMode',
            'SaveDataInSettings', 'AutoUrl', 'Group',
            'ChildItemsWidth', 'HorizontalStretch', 'VerticalStretch',
            'CommandBarLocation', 'Width', 'Height', 'AutoTitle',
            'CloseButton', 'Representation', 'UseStandardCommands'
        ];
        // Сначала добавляем свойства в определенном порядке
        for (const propName of propertyOrder) {
            let propValue = properties[propName];
            // AutoCommandBar обязателен в Form (XSD); если в модели нет — восстанавливаем из исходного DOM
            if (propName === 'AutoCommandBar' &&
                (propValue === undefined || propValue === null) &&
                existingElements.has('AutoCommandBar')) {
                const fallback = existingElements.get('AutoCommandBar').cloneNode(true);
                formElement.appendChild(doc.createTextNode('\t'));
                formElement.appendChild(fallback);
                formElement.appendChild(doc.createTextNode('\n'));
                continue;
            }
            if (propValue !== undefined && propValue !== null) {
                // ВАЖНО: Для AutoCommandBar используем оригинальный элемент из DOM для сохранения кодировки атрибутов
                const existingElement = existingElements.get(propName);
                let propElement = null;
                if (existingElement && propName === 'AutoCommandBar') {
                    // Для AutoCommandBar клонируем оригинальный элемент, чтобы сохранить правильную кодировку атрибутов
                    const cloned = existingElement.cloneNode(true);
                    const propValueAc = properties[propName];
                    if (typeof propValueAc === 'object' && propValueAc.name && propValueAc.id) {
                        const existingName = cloned.getAttribute('name');
                        const existingId = cloned.getAttribute('id');
                        // Если атрибуты не изменились, используем оригинальный элемент как есть
                        if (existingName === propValueAc.name && existingId === propValueAc.id) {
                            propElement = cloned;
                        }
                        else {
                            // Атрибуты изменились - обновляем их
                            cloned.setAttribute('name', propValueAc.name);
                            cloned.setAttribute('id', propValueAc.id);
                            propElement = cloned;
                        }
                    }
                    else {
                        propElement = cloned;
                    }
                }
                else if (existingElement) {
                    // Для остальных свойств обновляем существующий элемент
                    propElement = updatePropertyElement(doc, existingElement.cloneNode(true), propName, propValue);
                }
                else {
                    // Создаем новый элемент
                    propElement = createPropertyElement(doc, propName, propValue);
                }
                if (propElement) {
                    formElement.appendChild(doc.createTextNode('\t'));
                    formElement.appendChild(propElement);
                    formElement.appendChild(doc.createTextNode('\n'));
                }
            }
        }
        // Затем добавляем остальные свойства
        for (const [key, value] of Object.entries(properties)) {
            if (propertyOrder.includes(key))
                continue; // Уже добавлено
            if (value === undefined || value === null)
                continue;
            const existingElement = existingElements.get(key);
            const propElement = existingElement
                ? updatePropertyElement(doc, existingElement.cloneNode(true), key, value)
                : createPropertyElement(doc, key, value);
            if (propElement) {
                formElement.appendChild(doc.createTextNode('\t'));
                formElement.appendChild(propElement);
                formElement.appendChild(doc.createTextNode('\n'));
            }
        }
    }
    // Если AutoCommandBar так и не появился — типовые значения 1С (иначе XDTO отклонит Form)
    if (!formElementHasDirectChildElement(formElement, 'AutoCommandBar')) {
        const ac = doc.createElement('AutoCommandBar');
        ac.setAttribute('name', 'FormCommandBar');
        ac.setAttribute('id', '-1');
        formElement.appendChild(doc.createTextNode('\t'));
        formElement.appendChild(ac);
        formElement.appendChild(doc.createTextNode('\n'));
    }
    // 2. Добавляем ChildItems
    if (formData.childItems !== undefined) {
        const existingChildItems = existingElements.get('ChildItems');
        const childItemsElement = existingChildItems
            ? updateChildItemsElement(doc, existingChildItems.cloneNode(true), formData.childItems, 1)
            : createChildItemsElement(doc, formData.childItems, 1);
        if (childItemsElement) {
            formElement.appendChild(doc.createTextNode('\t'));
            formElement.appendChild(childItemsElement);
            formElement.appendChild(doc.createTextNode('\n'));
        }
    }
    // 3. Добавляем Attributes (по XSD у Form minOccurs=1 — даже без реквизитов нужен пустой блок)
    {
        const attrsList = Array.isArray(formData.attributes) ? formData.attributes : [];
        const existingAttributes = existingElements.get('Attributes');
        const attributesElement = existingAttributes
            ? updateAttributesElement(doc, existingAttributes.cloneNode(true), attrsList)
            : createAttributesElement(doc, attrsList);
        formElement.appendChild(doc.createTextNode('\t'));
        formElement.appendChild(attributesElement);
        formElement.appendChild(doc.createTextNode('\n'));
    }
    // 4. Добавляем Commands
    if (formData.commands) {
        const existingCommands = existingElements.get('Commands');
        const commandsElement = existingCommands
            ? updateCommandsElement(doc, existingCommands.cloneNode(true), formData.commands)
            : createCommandsElement(doc, formData.commands);
        if (commandsElement) {
            formElement.appendChild(doc.createTextNode('\t'));
            formElement.appendChild(commandsElement);
            formElement.appendChild(doc.createTextNode('\n'));
        }
    }
    // 5. Добавляем Parameters (после Commands, перед CommandInterface)
    // Parameters сохраняется полностью из оригинального DOM, так как его структура
    // может содержать сложные элементы с namespace (dcscor:, dcsset: и т.д.)
    const preservedParameters = preservedElements.get('Parameters');
    if (preservedParameters) {
        formElement.appendChild(doc.createTextNode('\t'));
        formElement.appendChild(preservedParameters);
        formElement.appendChild(doc.createTextNode('\n'));
    }
    // 6. Добавляем CommandInterface (после Parameters)
    // CommandInterface сохраняется полностью из оригинального DOM, так как его структура
    // слишком сложная для полного парсинга/сериализации через properties
    const preservedCommandInterface = preservedElements.get('CommandInterface');
    if (preservedCommandInterface) {
        formElement.appendChild(doc.createTextNode('\t'));
        formElement.appendChild(preservedCommandInterface);
        formElement.appendChild(doc.createTextNode('\n'));
    }
}
exports.updateFormDomFromData = updateFormDomFromData;
/**
 * Обновляет существующий элемент свойства формы (сохраняет оригинальные атрибуты для правильной кодировки)
 *
 * ВАЖНО: Для AutoCommandBar сохраняем оригинальные атрибуты name и id из DOM, чтобы не потерять кодировку
 */
function updatePropertyElement(doc, existingElement, propName, propValue) {
    if (propValue === undefined || propValue === null)
        return null;
    // ВАЖНО: Для AutoCommandBar сохраняем оригинальные атрибуты из DOM
    // Они уже правильно закодированы в UTF-8
    if (propName === 'AutoCommandBar' && typeof propValue === 'object' && propValue.name && propValue.id) {
        // Проверяем, что атрибуты совпадают - если да, просто возвращаем оригинальный элемент
        const existingName = existingElement.getAttribute('name');
        const existingId = existingElement.getAttribute('id');
        if (existingName === propValue.name && existingId === propValue.id) {
            // Атрибуты не изменились - возвращаем оригинальный элемент без изменений
            return existingElement;
        }
        // Атрибуты изменились - обновляем их, но используем оригинальный элемент
        existingElement.setAttribute('name', propValue.name);
        existingElement.setAttribute('id', propValue.id);
        // Очищаем содержимое
        while (existingElement.firstChild) {
            existingElement.removeChild(existingElement.firstChild);
        }
        return existingElement;
    }
    // Для остальных свойств очищаем содержимое, но сохраняем атрибуты
    while (existingElement.firstChild) {
        existingElement.removeChild(existingElement.firstChild);
    }
    // Обновляем содержимое
    if (typeof propValue === 'string' || typeof propValue === 'number' || typeof propValue === 'boolean') {
        existingElement.appendChild(doc.createTextNode(String(propValue)));
    }
    else if (typeof propValue === 'object') {
        // Для сложных структур используем createPropertyElement
        const newElement = createPropertyElement(doc, propName, propValue);
        if (newElement) {
            // Копируем атрибуты из нового элемента в существующий
            for (let i = 0; i < newElement.attributes.length; i++) {
                const attr = newElement.attributes[i];
                existingElement.setAttribute(attr.name, attr.value);
            }
            // Копируем содержимое
            while (newElement.firstChild) {
                existingElement.appendChild(newElement.firstChild);
            }
        }
    }
    return existingElement;
}
/**
 * Создает элемент свойства формы
 */
function createPropertyElement(doc, propName, propValue) {
    if (propValue === undefined || propValue === null)
        return null;
    const propElement = doc.createElement(propName);
    if (typeof propValue === 'string' || typeof propValue === 'number' || typeof propValue === 'boolean') {
        propElement.appendChild(doc.createTextNode(String(propValue)));
    }
    else if (typeof propValue === 'object') {
        // Для сложных структур (AutoCommandBar с name и id, Events с Event и т.д.)
        if (Array.isArray(propValue)) {
            // Массив (например, Events)
            // Добавляем перенос строки после открывающего тега
            propElement.appendChild(doc.createTextNode('\n'));
            // Отступ для элементов массива (2 табуляции, так как Events на уровне 1 таба от корня)
            const itemIndent = '\t\t';
            for (const item of propValue) {
                if (typeof item === 'object' && item.name) {
                    // Отступ перед элементом
                    propElement.appendChild(doc.createTextNode(itemIndent));
                    const eventElement = doc.createElement('Event');
                    eventElement.setAttribute('name', String(item.name));
                    if (item.value) {
                        eventElement.appendChild(doc.createTextNode(String(item.value)));
                    }
                    propElement.appendChild(eventElement);
                    // Перенос строки после элемента
                    propElement.appendChild(doc.createTextNode('\n'));
                }
            }
            propElement.appendChild(doc.createTextNode('\t')); // Отступ перед закрывающим тегом Events
        }
        else {
            // Объект (например, AutoCommandBar)
            // Для AutoCommandBar не добавляем дочерние элементы name и id, так как они уже в атрибутах
            // Но если есть другие свойства, добавляем их с форматированием
            const hasOtherProperties = Object.keys(propValue).some(key => !isNameOrIdPropertyKey(key));
            if (hasOtherProperties) {
                // Добавляем перенос строки после открывающего тега
                propElement.appendChild(doc.createTextNode('\n'));
                // Отступ для свойств (1 табуляция)
                const propIndent = '\t';
                for (const [key, value] of Object.entries(propValue)) {
                    if (value === undefined || value === null)
                        continue;
                    if (isNameOrIdPropertyKey(key))
                        continue; // Пропускаем, так как они в атрибутах
                    // Отступ перед свойством
                    propElement.appendChild(doc.createTextNode(propIndent));
                    const childElement = doc.createElement(key);
                    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                        childElement.appendChild(doc.createTextNode(String(value)));
                    }
                    else if (typeof value === 'object') {
                        // Вложенная структура
                        if ((0, formXmlAlignment_1.logFormTagUsesNameOrIdAsXmlAttributes)(key)) {
                            applyNameIdAttributes(childElement, value);
                        }
                        for (const [nestedKey, nestedValue] of Object.entries(value)) {
                            if (nestedValue === undefined || nestedValue === null)
                                continue;
                            if (isNameOrIdPropertyKey(nestedKey))
                                continue;
                            const nestedElement = doc.createElement(nestedKey);
                            if (typeof nestedValue === 'string' || typeof nestedValue === 'number' || typeof nestedValue === 'boolean') {
                                nestedElement.appendChild(doc.createTextNode(String(nestedValue)));
                            }
                            childElement.appendChild(nestedElement);
                        }
                    }
                    propElement.appendChild(childElement);
                    // Перенос строки после свойства
                    propElement.appendChild(doc.createTextNode('\n'));
                }
            }
            // name/id — атрибуты корневого тега (по XcfLogForm.json)
            if ((0, formXmlAlignment_1.logFormTagUsesNameOrIdAsXmlAttributes)(propName) &&
                typeof propValue === 'object' &&
                !Array.isArray(propValue)) {
                applyNameIdAttributes(propElement, propValue);
            }
            if (propName === 'AutoCommandBar' && typeof propValue === 'object' && !Array.isArray(propValue)) {
                if (propValue.ChildItems && propValue.ChildItems.length > 0) {
                    // Добавляем перенос строки после открывающего тега AutoCommandBar
                    propElement.appendChild(doc.createTextNode('\n'));
                    const childItemsElement = createChildItemsElement(doc, propValue.ChildItems, 1); // AutoCommandBar на уровне 1 таба, ChildItems внутри - на уровне 2
                    if (childItemsElement) {
                        propElement.appendChild(childItemsElement);
                        propElement.appendChild(doc.createTextNode('\t')); // Отступ перед закрывающим тегом AutoCommandBar
                    }
                }
            }
        }
    }
    return propElement;
}
/**
 * Обновляет существующий элемент ChildItems
 */
function updateChildItemsElement(doc, existingElement, childItems, depth = 0) {
    if (!childItems || childItems.length === 0)
        return null;
    // Очищаем содержимое
    while (existingElement.firstChild) {
        existingElement.removeChild(existingElement.firstChild);
    }
    // Добавляем перенос строки после открывающего тега
    existingElement.appendChild(doc.createTextNode('\n'));
    // Отступ для дочерних элементов (depth + 1 табуляций)
    const childIndent = '\t'.repeat(depth + 1);
    // Добавляем новые элементы
    for (const item of childItems) {
        // Отступ перед элементом
        existingElement.appendChild(doc.createTextNode(childIndent));
        const itemElement = createFormItemElement(doc, item, depth + 1);
        if (itemElement) {
            existingElement.appendChild(itemElement);
            // Перенос строки после элемента
            existingElement.appendChild(doc.createTextNode('\n'));
        }
    }
    existingElement.appendChild(doc.createTextNode('\t'.repeat(depth))); // Отступ перед закрывающим тегом ChildItems
    return existingElement;
}
/**
 * Создает элемент ChildItems
 */
function createChildItemsElement(doc, childItems, depth = 0) {
    if (!childItems || childItems.length === 0)
        return null;
    const childItemsElement = doc.createElement('ChildItems');
    // Добавляем перенос строки после открывающего тега
    childItemsElement.appendChild(doc.createTextNode('\n'));
    // Отступ для дочерних элементов (depth + 1 табуляций)
    const childIndent = '\t'.repeat(depth + 1);
    for (const item of childItems) {
        // Отступ перед элементом
        childItemsElement.appendChild(doc.createTextNode(childIndent));
        const itemElement = createFormItemElement(doc, item, depth + 1);
        if (itemElement) {
            childItemsElement.appendChild(itemElement);
            // Перенос строки после элемента
            childItemsElement.appendChild(doc.createTextNode('\n'));
        }
    }
    childItemsElement.appendChild(doc.createTextNode('\t'.repeat(depth))); // Отступ перед закрывающим тегом ChildItems
    return childItemsElement;
}
/**
 * Обновляет существующий элемент Attributes
 */
function updateAttributesElement(doc, existingElement, attributes) {
    // Очищаем содержимое
    while (existingElement.firstChild) {
        existingElement.removeChild(existingElement.firstChild);
    }
    // Пустой <Attributes> допустим по контенту, но элемент обязателен для Form (XSD minOccurs=1)
    if (!attributes || attributes.length === 0) {
        existingElement.appendChild(doc.createTextNode('\n'));
        existingElement.appendChild(doc.createTextNode('\t'));
        return existingElement;
    }
    // Добавляем перенос строки после открывающего тега
    existingElement.appendChild(doc.createTextNode('\n'));
    // Отступ для атрибутов (1 табуляция)
    const attrIndent = '\t';
    // Добавляем новые реквизиты
    for (const attr of attributes) {
        // Отступ перед атрибутом
        existingElement.appendChild(doc.createTextNode(attrIndent));
        const attrElement = doc.createElement('Attribute');
        // ВАЖНО: Используем прямое присвоение значения для сохранения кодировки
        attrElement.setAttribute('name', attr.name);
        const { typeValue, properties: attrProps } = normalizeFormAttributeForSerialization(attr);
        const hasType = !!typeValue;
        const hasProperties = Object.keys(attrProps).length > 0;
        const hasContent = hasType || hasProperties;
        if (hasContent) {
            // Добавляем перенос строки после открывающего тега Attribute
            attrElement.appendChild(doc.createTextNode('\n'));
            // Отступ для содержимого Attribute (2 табуляции от Attributes)
            const attrContentIndent = '\t\t';
            // Добавляем Type
            if (hasType) {
                attrElement.appendChild(doc.createTextNode(attrContentIndent));
                const typeElement = createTypeElement(doc, typeValue);
                if (typeElement) {
                    attrElement.appendChild(typeElement);
                    attrElement.appendChild(doc.createTextNode('\n'));
                }
            }
            // Добавляем свойства
            for (const [key, value] of Object.entries(attrProps)) {
                if (value === undefined || value === null)
                    continue;
                const useAlwaysEl = trySerializeUseAlwaysOnFormAttribute(doc, key, value, attr.name, attrContentIndent);
                if (useAlwaysEl === false) {
                    continue;
                }
                if (useAlwaysEl !== null) {
                    attrElement.appendChild(doc.createTextNode(attrContentIndent));
                    attrElement.appendChild(useAlwaysEl);
                    attrElement.appendChild(doc.createTextNode('\n'));
                    continue;
                }
                // Отступ перед свойством
                attrElement.appendChild(doc.createTextNode(attrContentIndent));
                const propElement = doc.createElement(key);
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    propElement.appendChild(doc.createTextNode(String(value)));
                }
                else if (typeof value === 'object') {
                    // Для сложных структур (например, UseAlways с Field)
                    // Проверяем, это строка Field или объект
                    if (typeof value === 'string') {
                        // UseAlways может быть строкой (Field)
                        propElement.appendChild(doc.createTextNode(value));
                    }
                    else {
                        // Объект с вложенными элементами (например, UseAlways с Field, Visible с xr:Common)
                        // Добавляем перенос строки после открывающего тега
                        propElement.appendChild(doc.createTextNode('\n'));
                        // Отступ для вложенных элементов (3 табуляции от Attributes)
                        const nestedIndent = '\t\t\t';
                        for (const [nestedKey, nestedValue] of Object.entries(value)) {
                            if (nestedValue === undefined || nestedValue === null)
                                continue;
                            // Отступ перед вложенным элементом
                            propElement.appendChild(doc.createTextNode(nestedIndent));
                            // Создаем элемент с правильным namespace
                            const nestedElement = createElementWithNamespace(doc, nestedKey);
                            setNamespaceAttributeIfNeeded(nestedElement, nestedKey);
                            if (typeof nestedValue === 'string' || typeof nestedValue === 'number' || typeof nestedValue === 'boolean') {
                                nestedElement.appendChild(doc.createTextNode(String(nestedValue)));
                            }
                            else if (typeof nestedValue === 'object') {
                                // Еще более вложенная структура
                                // Добавляем перенос строки после открывающего тега
                                nestedElement.appendChild(doc.createTextNode('\n'));
                                // Отступ для глубоко вложенных элементов (4 табуляции от Attributes)
                                const deepIndent = '\t\t\t\t';
                                for (const [deepKey, deepValue] of Object.entries(nestedValue)) {
                                    if (deepValue === undefined || deepValue === null)
                                        continue;
                                    // Отступ перед глубоко вложенным элементом
                                    nestedElement.appendChild(doc.createTextNode(deepIndent));
                                    // Создаем элемент с правильным namespace
                                    const deepElement = createElementWithNamespace(doc, deepKey);
                                    setNamespaceAttributeIfNeeded(deepElement, deepKey);
                                    if (typeof deepValue === 'string' || typeof deepValue === 'number' || typeof deepValue === 'boolean') {
                                        deepElement.appendChild(doc.createTextNode(String(deepValue)));
                                    }
                                    nestedElement.appendChild(deepElement);
                                    nestedElement.appendChild(doc.createTextNode('\n'));
                                }
                                // Отступ перед закрывающим тегом вложенного элемента
                                nestedElement.appendChild(doc.createTextNode(nestedIndent));
                            }
                            propElement.appendChild(nestedElement);
                            propElement.appendChild(doc.createTextNode('\n'));
                        }
                        // Отступ перед закрывающим тегом
                        propElement.appendChild(doc.createTextNode(attrContentIndent));
                    }
                }
                attrElement.appendChild(propElement);
                attrElement.appendChild(doc.createTextNode('\n'));
            }
            // Отступ перед закрывающим тегом Attribute
            attrElement.appendChild(doc.createTextNode(attrIndent));
        }
        existingElement.appendChild(attrElement);
        existingElement.appendChild(doc.createTextNode('\n')); // Перенос строки после Attribute
    }
    existingElement.appendChild(doc.createTextNode('\t')); // Отступ перед закрывающим тегом Attributes
    return existingElement;
}
/**
 * Создает элемент Attributes
 */
function createAttributesElement(doc, attributes) {
    const attributesElement = doc.createElement('Attributes');
    if (!attributes || attributes.length === 0) {
        attributesElement.appendChild(doc.createTextNode('\n'));
        attributesElement.appendChild(doc.createTextNode('\t'));
        return attributesElement;
    }
    // Добавляем перенос строки после открывающего тега
    attributesElement.appendChild(doc.createTextNode('\n'));
    // Отступ для атрибутов (1 табуляция)
    const attrIndent = '\t';
    for (const attr of attributes) {
        // Отступ перед атрибутом
        attributesElement.appendChild(doc.createTextNode(attrIndent));
        const attrElement = doc.createElement('Attribute');
        // ВАЖНО: Используем прямое присвоение значения для сохранения кодировки
        attrElement.setAttribute('name', attr.name);
        const { typeValue, properties: attrProps } = normalizeFormAttributeForSerialization(attr);
        const hasType = !!typeValue;
        const hasProperties = Object.keys(attrProps).length > 0;
        const hasContent = hasType || hasProperties;
        if (hasContent) {
            // Добавляем перенос строки после открывающего тега Attribute
            attrElement.appendChild(doc.createTextNode('\n'));
            // Отступ для содержимого Attribute (2 табуляции от Attributes)
            const attrContentIndent = '\t\t';
            // Добавляем Type
            if (hasType) {
                attrElement.appendChild(doc.createTextNode(attrContentIndent));
                const typeElement = createTypeElement(doc, typeValue);
                if (typeElement) {
                    attrElement.appendChild(typeElement);
                    attrElement.appendChild(doc.createTextNode('\n'));
                }
            }
            // Добавляем свойства
            for (const [key, value] of Object.entries(attrProps)) {
                if (value === undefined || value === null)
                    continue;
                const useAlwaysEl = trySerializeUseAlwaysOnFormAttribute(doc, key, value, attr.name, attrContentIndent);
                if (useAlwaysEl === false) {
                    continue;
                }
                if (useAlwaysEl !== null) {
                    attrElement.appendChild(doc.createTextNode(attrContentIndent));
                    attrElement.appendChild(useAlwaysEl);
                    attrElement.appendChild(doc.createTextNode('\n'));
                    continue;
                }
                // Отступ перед свойством
                attrElement.appendChild(doc.createTextNode(attrContentIndent));
                const propElement = doc.createElement(key);
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    propElement.appendChild(doc.createTextNode(String(value)));
                }
                else if (typeof value === 'object') {
                    // Для сложных структур (например, UseAlways с Field, Visible с xr:Common)
                    // Проверяем, это строка Field или объект
                    if (typeof value === 'string') {
                        // UseAlways может быть строкой (Field)
                        propElement.appendChild(doc.createTextNode(value));
                    }
                    else {
                        // Объект с вложенными элементами
                        // Добавляем перенос строки после открывающего тега
                        propElement.appendChild(doc.createTextNode('\n'));
                        // Отступ для вложенных элементов (3 табуляции от Attributes)
                        const nestedIndent = '\t\t\t';
                        for (const [nestedKey, nestedValue] of Object.entries(value)) {
                            if (nestedValue === undefined || nestedValue === null)
                                continue;
                            // Отступ перед вложенным элементом
                            propElement.appendChild(doc.createTextNode(nestedIndent));
                            // Создаем элемент с правильным namespace
                            const nestedElement = createElementWithNamespace(doc, nestedKey);
                            setNamespaceAttributeIfNeeded(nestedElement, nestedKey);
                            if (typeof nestedValue === 'string' || typeof nestedValue === 'number' || typeof nestedValue === 'boolean') {
                                nestedElement.appendChild(doc.createTextNode(String(nestedValue)));
                            }
                            else if (typeof nestedValue === 'object') {
                                // Еще более вложенная структура
                                // Добавляем перенос строки после открывающего тега
                                nestedElement.appendChild(doc.createTextNode('\n'));
                                // Отступ для глубоко вложенных элементов (4 табуляции от Attributes)
                                const deepIndent = '\t\t\t\t';
                                for (const [deepKey, deepValue] of Object.entries(nestedValue)) {
                                    if (deepValue === undefined || deepValue === null)
                                        continue;
                                    // Отступ перед глубоко вложенным элементом
                                    nestedElement.appendChild(doc.createTextNode(deepIndent));
                                    // Создаем элемент с правильным namespace
                                    const deepElement = createElementWithNamespace(doc, deepKey);
                                    setNamespaceAttributeIfNeeded(deepElement, deepKey);
                                    if (typeof deepValue === 'string' || typeof deepValue === 'number' || typeof deepValue === 'boolean') {
                                        deepElement.appendChild(doc.createTextNode(String(deepValue)));
                                    }
                                    nestedElement.appendChild(deepElement);
                                    nestedElement.appendChild(doc.createTextNode('\n'));
                                }
                                // Отступ перед закрывающим тегом вложенного элемента
                                nestedElement.appendChild(doc.createTextNode(nestedIndent));
                            }
                            propElement.appendChild(nestedElement);
                            propElement.appendChild(doc.createTextNode('\n'));
                        }
                        // Отступ перед закрывающим тегом
                        propElement.appendChild(doc.createTextNode(attrContentIndent));
                    }
                }
                attrElement.appendChild(propElement);
                attrElement.appendChild(doc.createTextNode('\n'));
            }
            // Отступ перед закрывающим тегом Attribute
            attrElement.appendChild(doc.createTextNode(attrIndent));
        }
        attributesElement.appendChild(attrElement);
        attributesElement.appendChild(doc.createTextNode('\n')); // Перенос строки после Attribute
    }
    attributesElement.appendChild(doc.createTextNode('\t')); // Отступ перед закрывающим тегом Attributes
    return attributesElement;
}
/**
 * Обновляет существующий элемент Commands
 */
function updateCommandsElement(doc, existingElement, commands) {
    if (!commands || commands.length === 0)
        return null;
    // Очищаем содержимое
    while (existingElement.firstChild) {
        existingElement.removeChild(existingElement.firstChild);
    }
    // Добавляем перенос строки после открывающего тега
    existingElement.appendChild(doc.createTextNode('\n'));
    // Отступ для команд (1 табуляция)
    const cmdIndent = '\t';
    // Добавляем новые команды
    for (const cmd of commands) {
        // Отступ перед командой
        existingElement.appendChild(doc.createTextNode(cmdIndent));
        const cmdElement = doc.createElement('Command');
        // ВАЖНО: Используем прямое присвоение значения для сохранения кодировки
        cmdElement.setAttribute('name', cmd.name);
        const { idAttr, properties: cmdProps } = normalizeFormCommandForSerialization(cmd);
        if (idAttr !== undefined) {
            cmdElement.setAttribute('id', idAttr);
        }
        // Добавляем свойства
        for (const [key, value] of Object.entries(cmdProps)) {
            if (value === undefined || value === null)
                continue;
            const propElement = doc.createElement(key);
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                propElement.appendChild(doc.createTextNode(String(value)));
            }
            else if (typeof value === 'object') {
                // Для сложных структур пока пропускаем
                continue;
            }
            cmdElement.appendChild(propElement);
        }
        existingElement.appendChild(cmdElement);
        // Перенос строки после команды
        existingElement.appendChild(doc.createTextNode('\n'));
    }
    return existingElement;
}
/**
 * Создает элемент Commands
 */
function createCommandsElement(doc, commands) {
    if (!commands || commands.length === 0)
        return null;
    const commandsElement = doc.createElement('Commands');
    // Добавляем перенос строки после открывающего тега
    commandsElement.appendChild(doc.createTextNode('\n'));
    // Отступ для команд (1 табуляция)
    const cmdIndent = '\t';
    for (const cmd of commands) {
        // Отступ перед командой
        commandsElement.appendChild(doc.createTextNode(cmdIndent));
        const cmdElement = doc.createElement('Command');
        // ВАЖНО: Используем прямое присвоение значения для сохранения кодировки
        cmdElement.setAttribute('name', cmd.name);
        const { idAttr, properties: cmdProps } = normalizeFormCommandForSerialization(cmd);
        if (idAttr !== undefined) {
            cmdElement.setAttribute('id', idAttr);
        }
        // Проверяем, есть ли свойства
        const hasProperties = Object.keys(cmdProps).length > 0;
        if (hasProperties) {
            // Добавляем перенос строки после открывающего тега Command
            cmdElement.appendChild(doc.createTextNode('\n'));
            // Отступ для свойств Command (2 табуляции от Commands)
            const cmdContentIndent = '\t\t';
            // Добавляем свойства
            for (const [key, value] of Object.entries(cmdProps)) {
                if (value === undefined || value === null)
                    continue;
                // Отступ перед свойством
                cmdElement.appendChild(doc.createTextNode(cmdContentIndent));
                const propElement = doc.createElement(key);
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    propElement.appendChild(doc.createTextNode(String(value)));
                }
                else if (typeof value === 'object') {
                    // Для сложных структур (например, Title с v8:item)
                    if (key === 'Title' && typeof value === 'object' && value['v8:item']) {
                        const v8Item = value['v8:item'];
                        // ВАЖНО: Проверяем наличие v8:lang и v8:content, даже если они пустые
                        if (v8Item['v8:lang'] !== undefined && v8Item['v8:content'] !== undefined) {
                            // Добавляем перенос строки после открывающего тега Title
                            propElement.appendChild(doc.createTextNode('\n'));
                            // Отступ для v8:item (3 табуляции от Commands)
                            const v8ItemIndent = '\t\t\t';
                            // Отступ перед v8:item
                            propElement.appendChild(doc.createTextNode(v8ItemIndent));
                            const v8ItemElement = createElementWithNamespace(doc, 'v8:item');
                            // ВАЖНО: НЕ добавляем xmlns:v8 в дочерние элементы - namespace должен быть только в корневом элементе Form
                            // Отступ для вложенных элементов (4 табуляции от Commands)
                            const nestedIndent = '\t\t\t\t';
                            // Добавляем перенос строки после открывающего тега v8:item
                            v8ItemElement.appendChild(doc.createTextNode('\n'));
                            // Отступ перед v8:lang
                            v8ItemElement.appendChild(doc.createTextNode(nestedIndent));
                            const v8LangElement = createElementWithNamespace(doc, 'v8:lang');
                            // ВАЖНО: НЕ добавляем xmlns:v8 в дочерние элементы
                            v8LangElement.appendChild(doc.createTextNode(v8Item['v8:lang']));
                            v8ItemElement.appendChild(v8LangElement);
                            v8ItemElement.appendChild(doc.createTextNode('\n'));
                            // Отступ перед v8:content
                            v8ItemElement.appendChild(doc.createTextNode(nestedIndent));
                            const v8ContentElement = createElementWithNamespace(doc, 'v8:content');
                            // ВАЖНО: НЕ добавляем xmlns:v8 в дочерние элементы
                            v8ContentElement.appendChild(doc.createTextNode(v8Item['v8:content']));
                            v8ItemElement.appendChild(v8ContentElement);
                            v8ItemElement.appendChild(doc.createTextNode('\n'));
                            // Отступ перед закрывающим тегом v8:item
                            v8ItemElement.appendChild(doc.createTextNode(v8ItemIndent));
                            propElement.appendChild(v8ItemElement);
                            propElement.appendChild(doc.createTextNode('\n'));
                            // Отступ перед закрывающим тегом Title
                            propElement.appendChild(doc.createTextNode(cmdContentIndent));
                        }
                    }
                    else {
                        // Для других сложных структур пока пропускаем
                        continue;
                    }
                }
                cmdElement.appendChild(propElement);
                cmdElement.appendChild(doc.createTextNode('\n'));
            }
            // Отступ перед закрывающим тегом Command
            cmdElement.appendChild(doc.createTextNode(cmdIndent));
        }
        commandsElement.appendChild(cmdElement);
        commandsElement.appendChild(doc.createTextNode('\n')); // Перенос строки после команды
    }
    commandsElement.appendChild(doc.createTextNode('\t')); // Отступ перед закрывающим тегом Commands
    return commandsElement;
}
/**
 * Обновляет свойства формы в DOM (старая функция, оставлена для совместимости)
 */
function updateFormProperties(doc, formElement, properties) {
    // Удаляем существующие свойства (кроме Attributes, Commands, ChildItems)
    const toRemove = [];
    for (let i = 0; i < formElement.childNodes.length; i++) {
        const child = formElement.childNodes[i];
        if (child.nodeType === 1) {
            const element = child;
            const tagName = element.tagName;
            if (tagName !== 'Attributes' && tagName !== 'Commands' && tagName !== 'ChildItems' && !tagName.startsWith('xmlns')) {
                toRemove.push(element);
            }
        }
    }
    toRemove.forEach(el => formElement.removeChild(el));
    // Добавляем новые свойства перед Attributes
    const attributesElement = Array.from(formElement.childNodes).find((n) => n.nodeType === 1 && n.tagName === 'Attributes');
    for (const [key, value] of Object.entries(properties)) {
        if (value === undefined || value === null)
            continue;
        const propElement = doc.createElement(key);
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            propElement.appendChild(doc.createTextNode(String(value)));
        }
        else if (typeof value === 'object') {
            // Для сложных структур пока просто пропускаем
            // В будущем можно расширить
            continue;
        }
        if (attributesElement) {
            formElement.insertBefore(propElement, attributesElement);
        }
        else {
            formElement.appendChild(propElement);
        }
    }
}
/**
 * Обновляет реквизиты формы в DOM
 */
function updateFormAttributes(doc, formElement, attributes) {
    // Находим или создаем элемент Attributes
    let attributesElement = Array.from(formElement.childNodes).find((n) => n.nodeType === 1 && n.tagName === 'Attributes');
    if (!attributesElement) {
        attributesElement = doc.createElement('Attributes');
        // Вставляем перед Commands или ChildItems
        const commandsElement = Array.from(formElement.childNodes).find((n) => n.nodeType === 1 && n.tagName === 'Commands');
        const childItemsElement = Array.from(formElement.childNodes).find((n) => n.nodeType === 1 && n.tagName === 'ChildItems');
        const insertBefore = commandsElement || childItemsElement;
        if (insertBefore) {
            formElement.insertBefore(attributesElement, insertBefore);
        }
        else {
            formElement.appendChild(attributesElement);
        }
    }
    else {
        // Удаляем все существующие Attribute
        const toRemove = [];
        for (let i = 0; i < attributesElement.childNodes.length; i++) {
            const child = attributesElement.childNodes[i];
            if (child.nodeType === 1 && child.tagName === 'Attribute') {
                toRemove.push(child);
            }
        }
        toRemove.forEach(el => attributesElement.removeChild(el));
    }
    // Добавляем новые реквизиты
    for (const attr of attributes) {
        const attrElement = doc.createElement('Attribute');
        attrElement.setAttribute('name', attr.name);
        const { typeValue, properties: attrProps } = normalizeFormAttributeForSerialization(attr);
        // Добавляем Type
        if (typeValue) {
            const typeElement = createTypeElement(doc, typeValue);
            if (typeElement) {
                attrElement.appendChild(typeElement);
            }
        }
        // Добавляем свойства
        const attrPropIndent = '\t\t';
        for (const [key, value] of Object.entries(attrProps)) {
            if (value === undefined || value === null)
                continue;
            const useAlwaysEl = trySerializeUseAlwaysOnFormAttribute(doc, key, value, attr.name, attrPropIndent);
            if (useAlwaysEl === false) {
                continue;
            }
            if (useAlwaysEl !== null) {
                attrElement.appendChild(useAlwaysEl);
                continue;
            }
            const propElement = doc.createElement(key);
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                propElement.appendChild(doc.createTextNode(String(value)));
            }
            else if (typeof value === 'object') {
                // Для сложных структур пока пропускаем
                continue;
            }
            attrElement.appendChild(propElement);
        }
        attributesElement.appendChild(attrElement);
    }
}
/**
 * Создает элемент Type из структуры типа с правильным форматированием
 */
function createTypeElement(doc, typeValue) {
    if (!typeValue || typeof typeValue !== 'object')
        return null;
    const typeElement = doc.createElement('Type');
    // Проверяем, есть ли v8:Type (может быть массивом или одиночным значением)
    const v8Types = [];
    if (typeValue['v8:Type']) {
        if (Array.isArray(typeValue['v8:Type'])) {
            v8Types.push(...typeValue['v8:Type']);
        }
        else {
            v8Types.push(String(typeValue['v8:Type']));
        }
    }
    // Проверяем, есть ли другие поля (квалификаторы и т.д.)
    const otherFields = Object.keys(typeValue).filter(k => k !== 'v8:Type');
    const hasOtherFields = otherFields.length > 0;
    const hasMultipleV8Types = v8Types.length > 1;
    // Если есть несколько v8:Type или другие поля, добавляем форматирование
    if (hasMultipleV8Types || hasOtherFields) {
        // Добавляем перенос строки после открывающего тега Type
        typeElement.appendChild(doc.createTextNode('\n'));
        // Отступ для содержимого Type (1 табуляция от Attribute)
        const typeIndent = '\t\t';
        // Добавляем все v8:Type элементы
        for (const v8Type of v8Types) {
            typeElement.appendChild(doc.createTextNode(typeIndent));
            const v8TypeElement = createElementWithNamespace(doc, 'v8:Type');
            // ВАЖНО: НЕ добавляем xmlns:v8 в дочерние элементы - namespace должен быть только в корневом элементе Form
            v8TypeElement.appendChild(doc.createTextNode(v8Type));
            typeElement.appendChild(v8TypeElement);
            typeElement.appendChild(doc.createTextNode('\n'));
        }
        // Добавляем остальные поля (квалификаторы и т.д.)
        for (const key of otherFields) {
            const value = typeValue[key];
            if (value === undefined || value === null)
                continue;
            // Отступ перед квалификатором
            typeElement.appendChild(doc.createTextNode(typeIndent));
            const qualElement = createElementWithNamespace(doc, key);
            setNamespaceAttributeIfNeeded(qualElement, key);
            // Проверяем, есть ли вложенные элементы
            if (typeof value === 'object' && !Array.isArray(value)) {
                const nestedKeys = Object.keys(value);
                if (nestedKeys.length > 0) {
                    // Есть вложенные элементы - добавляем форматирование
                    qualElement.appendChild(doc.createTextNode('\n'));
                    // Отступ для вложенных элементов (2 табуляции от Type)
                    const nestedIndent = '\t\t\t';
                    for (const [nestedKey, nestedValue] of Object.entries(value)) {
                        if (nestedValue === undefined || nestedValue === null)
                            continue;
                        // Отступ перед вложенным элементом
                        qualElement.appendChild(doc.createTextNode(nestedIndent));
                        const nestedElement = createElementWithNamespace(doc, nestedKey);
                        setNamespaceAttributeIfNeeded(nestedElement, nestedKey);
                        if (typeof nestedValue === 'string' || typeof nestedValue === 'number' || typeof nestedValue === 'boolean') {
                            nestedElement.appendChild(doc.createTextNode(String(nestedValue)));
                        }
                        else if (typeof nestedValue === 'object') {
                            // Еще более вложенная структура
                            for (const [deepKey, deepValue] of Object.entries(nestedValue)) {
                                if (deepValue === undefined || deepValue === null)
                                    continue;
                                const deepElement = createElementWithNamespace(doc, deepKey);
                                setNamespaceAttributeIfNeeded(deepElement, deepKey);
                                if (typeof deepValue === 'string' || typeof deepValue === 'number' || typeof deepValue === 'boolean') {
                                    deepElement.appendChild(doc.createTextNode(String(deepValue)));
                                }
                                nestedElement.appendChild(deepElement);
                            }
                        }
                        qualElement.appendChild(nestedElement);
                        qualElement.appendChild(doc.createTextNode('\n'));
                    }
                    // Отступ перед закрывающим тегом квалификатора
                    qualElement.appendChild(doc.createTextNode(typeIndent));
                }
            }
            else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                qualElement.appendChild(doc.createTextNode(String(value)));
            }
            typeElement.appendChild(qualElement);
            typeElement.appendChild(doc.createTextNode('\n'));
        }
        // Отступ перед закрывающим тегом Type
        typeElement.appendChild(doc.createTextNode('\t'));
    }
    else if (v8Types.length === 1) {
        // Только один v8:Type без других полей - добавляем как текстовое содержимое
        typeElement.appendChild(doc.createTextNode('\n'));
        typeElement.appendChild(doc.createTextNode('\t\t'));
        const v8TypeElement = createElementWithNamespace(doc, 'v8:Type');
        setNamespaceAttributeIfNeeded(v8TypeElement, 'v8:Type');
        v8TypeElement.appendChild(doc.createTextNode(v8Types[0]));
        typeElement.appendChild(v8TypeElement);
        typeElement.appendChild(doc.createTextNode('\n'));
        typeElement.appendChild(doc.createTextNode('\t'));
    }
    return typeElement;
}
/**
 * Обновляет команды формы в DOM
 */
function updateFormCommands(doc, formElement, commands) {
    // Находим или создаем элемент Commands
    let commandsElement = Array.from(formElement.childNodes).find((n) => n.nodeType === 1 && n.tagName === 'Commands');
    if (!commandsElement) {
        commandsElement = doc.createElement('Commands');
        // Вставляем перед ChildItems
        const childItemsElement = Array.from(formElement.childNodes).find((n) => n.nodeType === 1 && n.tagName === 'ChildItems');
        if (childItemsElement) {
            formElement.insertBefore(commandsElement, childItemsElement);
        }
        else {
            formElement.appendChild(commandsElement);
        }
    }
    else {
        // Удаляем все существующие Command
        const toRemove = [];
        for (let i = 0; i < commandsElement.childNodes.length; i++) {
            const child = commandsElement.childNodes[i];
            if (child.nodeType === 1 && child.tagName === 'Command') {
                toRemove.push(child);
            }
        }
        toRemove.forEach(el => commandsElement.removeChild(el));
    }
    // Добавляем новые команды
    for (const cmd of commands) {
        const cmdElement = doc.createElement('Command');
        cmdElement.setAttribute('name', cmd.name);
        // Добавляем свойства
        for (const [key, value] of Object.entries(cmd.properties || {})) {
            if (value === undefined || value === null)
                continue;
            const propElement = doc.createElement(key);
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                propElement.appendChild(doc.createTextNode(String(value)));
            }
            else if (typeof value === 'object') {
                // Для сложных структур пока пропускаем
                continue;
            }
            cmdElement.appendChild(propElement);
        }
        commandsElement.appendChild(cmdElement);
    }
}
/**
 * Обновляет ChildItems формы в DOM
 */
function updateFormChildItems(doc, formElement, childItems) {
    // Находим или создаем элемент ChildItems
    let childItemsElement = Array.from(formElement.childNodes).find((n) => n.nodeType === 1 && n.tagName === 'ChildItems');
    if (!childItemsElement) {
        childItemsElement = doc.createElement('ChildItems');
        formElement.appendChild(childItemsElement);
    }
    else {
        // Удаляем все существующие дочерние элементы
        const toRemove = [];
        for (let i = 0; i < childItemsElement.childNodes.length; i++) {
            const child = childItemsElement.childNodes[i];
            if (child.nodeType === 1) {
                toRemove.push(child);
            }
        }
        toRemove.forEach(el => childItemsElement.removeChild(el));
    }
    // Добавляем перенос строки после открывающего тега
    childItemsElement.appendChild(doc.createTextNode('\n'));
    // Отступ для дочерних элементов (1 табуляция)
    const childIndent = '\t';
    // Добавляем новые элементы
    for (const item of childItems) {
        // Отступ перед элементом
        childItemsElement.appendChild(doc.createTextNode(childIndent));
        const itemElement = createFormItemElement(doc, item, 1);
        if (itemElement) {
            childItemsElement.appendChild(itemElement);
            // Перенос строки после элемента
            childItemsElement.appendChild(doc.createTextNode('\n'));
        }
    }
}
/**
 * Создает DOM элемент из FormItem с правильным форматированием
 *
 * @param doc - DOM документ
 * @param item - элемент формы
 * @param depth - уровень вложенности (для отступов)
 */
function createFormItemElement(doc, item, depth = 0) {
    if (!item.type)
        return null;
    const itemElement = doc.createElement(item.type);
    const rawProps = item.properties || {};
    // Устанавливаем атрибуты name и id (в XML это атрибуты тега элемента, не дочерние <name>/<id>)
    if (item.name) {
        itemElement.setAttribute('name', item.name);
    }
    else {
        const fromProps = rawProps.name ?? rawProps.Name;
        if (fromProps !== undefined && fromProps !== null && String(fromProps) !== '') {
            itemElement.setAttribute('name', String(fromProps));
        }
    }
    if (item.id) {
        itemElement.setAttribute('id', item.id);
    }
    else {
        const fromPropsId = rawProps.id ?? rawProps.Id;
        if (fromPropsId !== undefined && fromPropsId !== null && String(fromPropsId) !== '') {
            itemElement.setAttribute('id', String(fromPropsId));
        }
    }
    // Проверяем, есть ли дочерние элементы или свойства
    const hasProperties = item.properties && Object.keys(item.properties).length > 0;
    const hasChildItems = item.childItems && item.childItems.length > 0;
    const hasContent = hasProperties || hasChildItems;
    if (hasContent) {
        // Добавляем перенос строки после открывающего тега
        itemElement.appendChild(doc.createTextNode('\n'));
        // Отступ для содержимого
        const contentIndent = '\t'.repeat(depth + 1);
        // Добавляем свойства
        for (const [key, value] of Object.entries(item.properties || {})) {
            if (value === undefined || value === null)
                continue;
            // Скалярные name/id в properties — дубликаты атрибутов корневого тега (после ошибочного <name> в XML или слияния модели)
            if (isNameOrIdPropertyKey(key) &&
                (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
                continue;
            }
            // Отступ перед свойством
            itemElement.appendChild(doc.createTextNode(contentIndent));
            const propElement = doc.createElement(key);
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                propElement.appendChild(doc.createTextNode(String(value)));
            }
            else if (typeof value === 'object') {
                // Для сложных структур (например, Title с v8:item)
                if (key === 'Title' && typeof value === 'object' && value['v8:item']) {
                    const v8Item = value['v8:item'];
                    // ВАЖНО: Проверяем наличие v8:lang и v8:content, даже если они пустые
                    if (v8Item['v8:lang'] !== undefined && v8Item['v8:content'] !== undefined) {
                        // Добавляем перенос строки после открывающего тега Title
                        propElement.appendChild(doc.createTextNode('\n'));
                        // Отступ для v8:item (depth + 2 табуляции)
                        const v8ItemIndent = '\t'.repeat(depth + 2);
                        // Отступ перед v8:item
                        propElement.appendChild(doc.createTextNode(v8ItemIndent));
                        const v8ItemElement = createElementWithNamespace(doc, 'v8:item');
                        // ВАЖНО: НЕ добавляем xmlns:v8 в дочерние элементы - namespace должен быть только в корневом элементе Form
                        // Отступ для вложенных элементов (depth + 3 табуляции)
                        const nestedIndent = '\t'.repeat(depth + 3);
                        // Добавляем перенос строки после открывающего тега v8:item
                        v8ItemElement.appendChild(doc.createTextNode('\n'));
                        // Отступ перед v8:lang
                        v8ItemElement.appendChild(doc.createTextNode(nestedIndent));
                        const v8LangElement = createElementWithNamespace(doc, 'v8:lang');
                        // ВАЖНО: НЕ добавляем xmlns:v8 в дочерние элементы
                        v8LangElement.appendChild(doc.createTextNode(v8Item['v8:lang']));
                        v8ItemElement.appendChild(v8LangElement);
                        v8ItemElement.appendChild(doc.createTextNode('\n'));
                        // Отступ перед v8:content
                        v8ItemElement.appendChild(doc.createTextNode(nestedIndent));
                        const v8ContentElement = createElementWithNamespace(doc, 'v8:content');
                        // ВАЖНО: НЕ добавляем xmlns:v8 в дочерние элементы
                        v8ContentElement.appendChild(doc.createTextNode(v8Item['v8:content']));
                        v8ItemElement.appendChild(v8ContentElement);
                        v8ItemElement.appendChild(doc.createTextNode('\n'));
                        // Отступ перед закрывающим тегом v8:item
                        v8ItemElement.appendChild(doc.createTextNode(v8ItemIndent));
                        propElement.appendChild(v8ItemElement);
                        propElement.appendChild(doc.createTextNode('\n'));
                        // Отступ перед закрывающим тегом Title
                        propElement.appendChild(doc.createTextNode(contentIndent));
                    }
                }
                else if (typeof value === 'object' && !Array.isArray(value)) {
                    const raw = value;
                    const useAttrNameId = (0, formXmlAlignment_1.logFormTagUsesNameOrIdAsXmlAttributes)(key);
                    const { name: vName, id: vId } = getNameIdFromPlainObject(raw);
                    const hasName = vName !== undefined;
                    const hasId = vId !== undefined;
                    const workValue = !useAttrNameId && (hasName || hasId) ? stripNameIdKeysFromRecord(raw) : raw;
                    if (useAttrNameId && (hasName || hasId)) {
                        applyNameIdAttributes(propElement, raw);
                        // Если есть другие свойства, добавляем их
                        const otherProps = Object.keys(raw).filter(k => !isNameOrIdPropertyKey(k));
                        if (otherProps.length > 0) {
                            // Добавляем перенос строки после открывающего тега
                            propElement.appendChild(doc.createTextNode('\n'));
                            // Отступ для свойств (depth + 2 табуляции)
                            const propIndent = '\t'.repeat(depth + 2);
                            for (const propKey of otherProps) {
                                const propValue = raw[propKey];
                                if (propValue === undefined || propValue === null)
                                    continue;
                                // Отступ перед свойством
                                propElement.appendChild(doc.createTextNode(propIndent));
                                const childPropElement = doc.createElement(propKey);
                                if (typeof propValue === 'string' || typeof propValue === 'number' || typeof propValue === 'boolean') {
                                    childPropElement.appendChild(doc.createTextNode(String(propValue)));
                                }
                                else if (typeof propValue === 'object') {
                                    // Вложенная структура (например, ContextMenu/ExtendedTooltip под SearchStringAddition)
                                    if ((0, formXmlAlignment_1.logFormTagUsesNameOrIdAsXmlAttributes)(propKey)) {
                                        applyNameIdAttributes(childPropElement, propValue);
                                    }
                                    for (const [nestedKey, nestedValue] of Object.entries(propValue)) {
                                        if (nestedValue === undefined || nestedValue === null)
                                            continue;
                                        if (isNameOrIdPropertyKey(nestedKey))
                                            continue;
                                        const nestedElement = doc.createElement(nestedKey);
                                        if (typeof nestedValue === 'string' || typeof nestedValue === 'number' || typeof nestedValue === 'boolean') {
                                            nestedElement.appendChild(doc.createTextNode(String(nestedValue)));
                                        }
                                        childPropElement.appendChild(nestedElement);
                                    }
                                }
                                propElement.appendChild(childPropElement);
                                propElement.appendChild(doc.createTextNode('\n'));
                            }
                            // Отступ перед закрывающим тегом
                            propElement.appendChild(doc.createTextNode('\t'.repeat(depth + 1)));
                        }
                    }
                    else {
                        // Обычная вложенная структура (например, UseAlways с Field, Visible с xr:Common)
                        // Добавляем перенос строки после открывающего тега
                        propElement.appendChild(doc.createTextNode('\n'));
                        // Отступ для вложенных элементов (depth + 2 табуляции)
                        const nestedIndent = '\t'.repeat(depth + 2);
                        for (const [nestedKey, nestedValue] of Object.entries(workValue)) {
                            if (nestedValue === undefined || nestedValue === null)
                                continue;
                            if ((0, formXmlAlignment_1.logFormTagUsesNameOrIdAsXmlAttributes)(key) &&
                                isNameOrIdPropertyKey(nestedKey) &&
                                (typeof nestedValue === 'string' || typeof nestedValue === 'number' || typeof nestedValue === 'boolean')) {
                                propElement.setAttribute(nestedKey.toLowerCase(), String(nestedValue));
                                continue;
                            }
                            // Отступ перед вложенным элементом
                            propElement.appendChild(doc.createTextNode(nestedIndent));
                            // Проверяем, есть ли namespace в имени (например, xr:Common)
                            const namespaceMatch = nestedKey.match(/^([^:]+):(.+)$/);
                            let nestedElement;
                            if (namespaceMatch) {
                                // Элемент с namespace (например, xr:Common)
                                const prefix = namespaceMatch[1];
                                const localName = namespaceMatch[2];
                                // Создаем элемент с namespace
                                nestedElement = doc.createElementNS('http://v8.1c.ru/8.3/xcf/readable', nestedKey);
                                // Устанавливаем префикс namespace, если нужно
                                nestedElement.setAttributeNS('http://www.w3.org/2000/xmlns/', `xmlns:${prefix}`, 'http://v8.1c.ru/8.3/xcf/readable');
                            }
                            else {
                                nestedElement = doc.createElement(nestedKey);
                            }
                            if (typeof nestedValue === 'string' || typeof nestedValue === 'number' || typeof nestedValue === 'boolean') {
                                nestedElement.appendChild(doc.createTextNode(String(nestedValue)));
                            }
                            else if (typeof nestedValue === 'object') {
                                // Еще более вложенная структура
                                // Добавляем перенос строки после открывающего тега
                                nestedElement.appendChild(doc.createTextNode('\n'));
                                // Отступ для глубоко вложенных элементов (depth + 3 табуляции)
                                const deepIndent = '\t'.repeat(depth + 3);
                                if ((0, formXmlAlignment_1.logFormTagUsesNameOrIdAsXmlAttributes)(nestedKey)) {
                                    applyNameIdAttributes(nestedElement, nestedValue);
                                }
                                for (const [deepKey, deepValue] of Object.entries(nestedValue)) {
                                    if (deepValue === undefined || deepValue === null)
                                        continue;
                                    if (isNameOrIdPropertyKey(deepKey))
                                        continue;
                                    // Отступ перед глубоко вложенным элементом
                                    nestedElement.appendChild(doc.createTextNode(deepIndent));
                                    // Создаем элемент с правильным namespace
                                    const deepElement = createElementWithNamespace(doc, deepKey);
                                    setNamespaceAttributeIfNeeded(deepElement, deepKey);
                                    if (typeof deepValue === 'string' || typeof deepValue === 'number' || typeof deepValue === 'boolean') {
                                        deepElement.appendChild(doc.createTextNode(String(deepValue)));
                                    }
                                    nestedElement.appendChild(deepElement);
                                    nestedElement.appendChild(doc.createTextNode('\n'));
                                }
                                // Отступ перед закрывающим тегом вложенного элемента
                                nestedElement.appendChild(doc.createTextNode(nestedIndent));
                            }
                            propElement.appendChild(nestedElement);
                            propElement.appendChild(doc.createTextNode('\n'));
                        }
                        // Отступ перед закрывающим тегом
                        propElement.appendChild(doc.createTextNode('\t'.repeat(depth + 1)));
                    }
                }
                else {
                    // Для массивов и других типов пока пропускаем
                    continue;
                }
            }
            itemElement.appendChild(propElement);
            // Перенос строки после свойства
            itemElement.appendChild(doc.createTextNode('\n'));
        }
        // Добавляем дочерние элементы (ChildItems)
        if (hasChildItems) {
            // Отступ перед ChildItems
            itemElement.appendChild(doc.createTextNode(contentIndent));
            const childItemsElement = createChildItemsElement(doc, item.childItems, depth + 1);
            if (childItemsElement) {
                itemElement.appendChild(childItemsElement);
                // Перенос строки после ChildItems
                itemElement.appendChild(doc.createTextNode('\n'));
            }
        }
        // Отступ перед закрывающим тегом
        itemElement.appendChild(doc.createTextNode('\t'.repeat(depth)));
    }
    return itemElement;
}
/**
 * Основная функция сериализации: обновляет DOM и сериализует в XML
 *
 * @param formData - данные формы с DOM документом
 * @returns XML строка
 */
function serializeFormToXml(formData) {
    // ВАЖНО: Используем оригинальный DOM документ и обновляем только измененные части
    // Это сохраняет правильную кодировку атрибутов с кириллицей
    const newDoc = formData._domDocument.cloneNode(true);
    const formElement = newDoc.documentElement;
    if (!formElement || formElement.tagName !== 'Form') {
        throw new Error(`Expected root tag Form, got ${formElement?.tagName}`);
    }
    // Обновляем атрибуты корневого элемента (если переданы)
    if (formData._rootAttrs) {
        // Обновляем атрибуты
        for (const [key, value] of Object.entries(formData._rootAttrs)) {
            const attrName = key.startsWith('@_') ? key.slice(2) : key;
            // ВАЖНО: Используем прямое присвоение значения, чтобы сохранить кодировку
            formElement.setAttribute(attrName, String(value));
        }
    }
    // Обновляем содержимое формы
    updateFormDomFromData(newDoc, formElement, {
        properties: formData.properties,
        attributes: formData.attributes,
        commands: formData.commands,
        childItems: formData.childItems,
    });
    // Атрибут version у корня Form обязателен для XDTO 1С
    if (!formElement.getAttribute('version')) {
        formElement.setAttribute('version', '2.0');
    }
    // Сериализуем
    return serializeFormDomToXml(newDoc);
}
exports.serializeFormToXml = serializeFormToXml;
//# sourceMappingURL=formSerializerXmldom.js.map
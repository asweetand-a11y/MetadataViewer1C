/**
 * Сериализация Predefined.xml через xmldom
 * Сохраняет структуру и форматирование исходного XML
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { randomUUID } from 'crypto';
import { PredefinedDataItem } from '../predefinedDataInterfaces';
import { formatXml } from '../utils/xmlDomUtils';

/**
 * Полный ref вида ChartOfAccounts.<План>.ExtDimensionAccountingFlag.<Имя> для Flag внутри ExtDimensionType.
 * Если в файле ещё нет таких ref, имя плана берётся из ChartOfAccounts.<План>.AccountingFlag.* (как в эталоне 1С).
 */
function resolveExtDimensionAccountingFlagRefPrefix(doc: Document): string | null {
    const flagCollection = doc.getElementsByTagName('Flag');
    for (let i = 0; i < flagCollection.length; i++) {
        const ref = flagCollection[i].getAttribute('ref');
        if (!ref || !ref.startsWith('ChartOfAccounts.')) {
            continue;
        }
        const parts = ref.split('.');
        const extIdx = parts.findIndex((p) => p === 'ExtDimensionAccountingFlag');
        if (extIdx >= 1 && extIdx < parts.length - 1) {
            return parts.slice(0, extIdx + 1).join('.');
        }
    }
    for (let i = 0; i < flagCollection.length; i++) {
        const ref = flagCollection[i].getAttribute('ref');
        if (!ref || !ref.startsWith('ChartOfAccounts.')) {
            continue;
        }
        const parts = ref.split('.');
        const accIdx = parts.findIndex((p) => p === 'AccountingFlag');
        if (accIdx >= 1 && accIdx < parts.length - 1) {
            const chartName = parts[1];
            if (chartName) {
                return `ChartOfAccounts.${chartName}.ExtDimensionAccountingFlag`;
            }
        }
    }
    return null;
}

/**
 * Определяет namespace prefix из исходного XML (например, d4p1, d5p1)
 * Ищет в первом элементе Type значение типа с префиксом
 */
function detectNamespacePrefix(originalXml: string): string {
    // Ищем паттерн типа с namespace prefix в исходном XML
    // Например: <v8:Type>d4p1:CatalogRef.Номенклатура</v8:Type>
    const match = originalXml.match(/<v8:Type[^>]*>([a-z]\d+p\d+):/i);
    if (match && match[1]) {
        return match[1] + ':';
    }
    // Пробуем другие варианты
    const match2 = originalXml.match(/<Type[^>]*>([a-z]\d+p\d+):/i);
    if (match2 && match2[1]) {
        return match2[1] + ':';
    }
    // По умолчанию возвращаем пустую строку (без префикса)
    return '';
}

/**
 * Добавляет namespace prefix к типу, если он был в исходном XML
 */
function addNamespacePrefix(typeText: string, namespacePrefix: string): string {
    if (!typeText || !namespacePrefix) return typeText;
    // Не добавляем префикс, если тип уже имеет префикс типа (xs:, v8:, cfg:)
    if (typeText.match(/^(xs|v8|cfg):/)) return typeText;
    // Не добавляем, если уже есть namespace prefix
    if (typeText.match(/^[a-z]\d+p\d+:/i)) return typeText;
    return namespacePrefix + typeText;
}

/**
 * Перезаписывает содержимое контейнера Displaced / Leading / Base списком элементов CalculationType.
 */
function rebuildCalculationTypeRefContainer(container: Element, paths: string[] | undefined): void {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    if (!paths || paths.length === 0) {
        return;
    }
    const doc = container.ownerDocument!;
    for (const p of paths) {
        if (!p || !String(p).trim()) {
            continue;
        }
        const el = doc.createElement('CalculationType');
        el.textContent = String(p).trim();
        container.appendChild(el);
    }
}

/**
 * Проверяет, является ли Code числом (можно преобразовать в число и обратно без потери)
 * @param code - значение Code как строка
 * @returns true если Code является числом, false если строка
 */
function isNumericCode(code: string): boolean {
    // Проверка: можно ли преобразовать в число и обратно без потери
    const num = Number(code);
    if (isNaN(num)) return false;
    // Проверяем, что обратное преобразование дает ту же строку
    // Учитываем случаи: "1" -> 1 -> "1", "1.0" -> 1 -> "1" (не число)
    // "000000001" -> 1 -> "1" (не число, так как теряются ведущие нули)
    return String(num) === code || String(num) === code.trim();
}

/**
 * Генерирует UUID для нового элемента Item (атрибут id)
 */
function generateItemId(): string {
    return randomUUID();
}

/**
 * Извлекает шаблон первого элемента Item из исходного XML
 * Сохраняет форматирование и структуру
 */
function extractItemTemplate(originalXml: string): Element | null {
    // Удаляем BOM если есть
    let cleanXml = originalXml;
    if (cleanXml.charCodeAt(0) === 0xfeff) {
        cleanXml = cleanXml.slice(1);
    }
    
    // Парсим через xmldom
    const parser = new DOMParser({
        locator: {},
        errorHandler: {
            warning: (w: any) => console.warn('[xmldom] Warning:', w),
            error: (e: any) => console.error('[xmldom] Error:', e),
            fatalError: (e: any) => {
                console.error('[xmldom] Fatal error:', e);
                throw new Error(`XML parsing error: ${e}`);
            }
        }
    });
    
    const doc = parser.parseFromString(cleanXml, 'text/xml');
    const rootElement = doc.documentElement;
    if (!rootElement) {
        return null;
    }
    
    // Находим первый элемент Item
    const childNodes = rootElement.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType === 1) { // Element node
            const element = node as Element;
            const localName = (element as any).localName || element.nodeName.split(':').pop() || element.nodeName;
            
            if (localName === 'Item') {
                return element;
            }
        }
    }
    
    return null;
}

/**
 * Находит элемент Item по значению Code в DOM
 */
function findItemByCodeInDom(doc: Document, code: string): Element | null {
    const rootElement = doc.documentElement;
    if (!rootElement) {
        return null;
    }
    
    // Ищем элемент Item с нужным Code
    const childNodes = rootElement.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType === 1) { // Element node
            const element = node as Element;
            const localName = (element as any).localName || element.nodeName.split(':').pop() || element.nodeName;
            
            if (localName === 'Item') {
                // Ищем элемент Code внутри Item
                const codeNodes = element.childNodes;
                for (let j = 0; j < codeNodes.length; j++) {
                    const codeNode = codeNodes[j];
                    if (codeNode.nodeType === 1) {
                        const codeElement = codeNode as Element;
                        const codeLocalName = (codeElement as any).localName || codeElement.nodeName.split(':').pop() || codeElement.nodeName;
                        if (codeLocalName === 'Code') {
                            const codeValue = codeElement.textContent || '';
                            if (codeValue === code) {
                                return element;
                            }
                        }
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * Обновляет существующий элемент Item в DOM
 * Сохраняет исходный формат Code (xsi:type) для существующих элементов
 * @param namespacePrefix - префикс namespace для добавления к типу (например, "d4p1:")
 */
function updateItemElementInDom(itemElement: Element, newItem: PredefinedDataItem, namespacePrefix: string = ''): void {
    // Обновляем атрибут id, если он изменился
    if (newItem.id) {
        const currentId = itemElement.getAttribute('id');
        if (currentId !== newItem.id) {
            itemElement.setAttribute('id', newItem.id);
        }
    }
    
    // Собираем информацию о существующих элементах
    const existingElements = new Map<string, Element>();
    const children = itemElement.childNodes;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType !== 1) continue;
        
        const child = node as Element;
        const localName = (child as any).localName || child.nodeName.split(':').pop() || child.nodeName;
        existingElements.set(localName, child);
    }
    
    // Обновляем существующие элементы
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType !== 1) continue;
        
        const child = node as Element;
        const localName = (child as any).localName || child.nodeName.split(':').pop() || child.nodeName;
        
        switch (localName) {
            case 'Name':
                child.textContent = newItem.Name || '';
                break;
            case 'Code':
                // Сохраняем исходный атрибут xsi:type если он был
                const hadXsiType = child.hasAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'type');
                const xsiTypeValue = child.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'type');
                
                child.textContent = String(newItem.Code || '');
                
                // Определяем, является ли новый Code числовым
                const isNewCodeNumeric = isNumericCode(String(newItem.Code || ''));
                
                // Для существующих элементов сохраняем исходный формат, если Code остался числовым
                // Если Code изменился с числового на нечисловой, убираем xsi:type
                // Если Code изменился с нечислового на числовой, добавляем xsi:type
                if (hadXsiType && xsiTypeValue) {
                    // Был xsi:type
                    if (isNewCodeNumeric) {
                        // Новый Code тоже числовой - сохраняем xsi:type
                        child.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:type', xsiTypeValue);
                    } else {
                        // Новый Code не числовой - убираем xsi:type
                        child.removeAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'type');
                    }
                } else if (!hadXsiType) {
                    // Не было xsi:type
                    if (isNewCodeNumeric) {
                        // Новый Code числовой - добавляем xsi:type
                        child.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:type', 'xs:decimal');
                    } else {
                        // Новый Code не числовой - ничего не делаем
                        child.removeAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'type');
                    }
                }
                break;
            case 'Description':
                child.textContent = newItem.Description || '';
                break;
            case 'Type':
                // Обновляем элемент Type
                if (newItem.Type) {
                    // Удаляем все существующие элементы v8:Type
                    const childNodes = child.childNodes;
                    const nodesToRemove: Node[] = [];
                    for (let j = 0; j < childNodes.length; j++) {
                        const cn = childNodes[j];
                        if (cn.nodeType === 1) {
                            const cel = cn as Element;
                            const cln = (cel as any).localName || cel.nodeName.split(':').pop() || cel.nodeName;
                            if (cln === 'Type' && (cel.namespaceURI === 'http://v8.1c.ru/8.1/data/core' || cel.nodeName.startsWith('v8:'))) {
                                nodesToRemove.push(cn);
                            }
                        }
                    }
                    nodesToRemove.forEach(node => child.removeChild(node));
                    
                    // Разделяем типы по разделителю "|" для составных типов
                    const typeParts = newItem.Type.split('|').map(t => t.trim()).filter(t => t);
                    
                    // Создаем новый элемент v8:Type для каждого типа
                    for (const typePart of typeParts) {
                        const v8TypeElement = itemElement.ownerDocument!.createElementNS('http://v8.1c.ru/8.1/data/core', 'v8:Type');
                        // Добавляем namespace prefix при сохранении
                        const typeWithPrefix = addNamespacePrefix(typePart, namespacePrefix);
                        v8TypeElement.textContent = typeWithPrefix;
                        child.appendChild(v8TypeElement);
                    }
                } else {
                    // Если Type не указан, удаляем элемент Type
                    if (child.parentNode) {
                        child.parentNode.removeChild(child);
                    }
                }
                break;
            case 'IsFolder':
                // Для планов счетов IsFolder обычно не используется
                // Проверяем, есть ли AccountType (признак плана счетов)
                const hasAccountType = existingElements.has('AccountType') || itemElement.getElementsByTagName('AccountType').length > 0;
                if (hasAccountType) {
                    // Это план счетов - удаляем IsFolder, если он был
                    if (child.parentNode) {
                        child.parentNode.removeChild(child);
                    }
                } else {
                    // Это не план счетов - обновляем IsFolder
                    child.textContent = newItem.IsFolder ? 'true' : 'false';
                }
                break;
            case 'AccountType':
                // Вид счета: Active, Passive, ActivePassive
                if (newItem.AccountType) {
                    child.textContent = newItem.AccountType;
                } else {
                    // Если AccountType не указан, удаляем элемент
                    if (child.parentNode) {
                        child.parentNode.removeChild(child);
                    }
                }
                break;
            case 'OffBalance':
                // Забалансовый счет: true/false
                if (newItem.OffBalance !== undefined) {
                    child.textContent = newItem.OffBalance ? 'true' : 'false';
                } else {
                    // Если OffBalance не указан, удаляем элемент
                    if (child.parentNode) {
                        child.parentNode.removeChild(child);
                    }
                }
                break;
            case 'Order':
                // Порядок
                if (newItem.Order) {
                    child.textContent = newItem.Order;
                } else {
                    // Если Order не указан, удаляем элемент
                    if (child.parentNode) {
                        child.parentNode.removeChild(child);
                    }
                }
                break;
            case 'AccountingFlags':
                // Таблица признаков учета
                // Формат XML: <Flag ref="ChartOfAccounts.Управленческий.AccountingFlag.Количественный">true</Flag>
                if (newItem.AccountingFlags && newItem.AccountingFlags.length > 0) {
                    // Удаляем старые элементы
                    while (child.firstChild) {
                        child.removeChild(child.firstChild);
                    }
                    // Добавляем новые элементы Flag
                    const doc = itemElement.ownerDocument!;
                    newItem.AccountingFlags.forEach(flag => {
                        const flagElement = doc.createElement('Flag');
                        // Используем ref если есть, иначе пытаемся восстановить путь из существующих Flag элементов
                        if (flag.ref) {
                            flagElement.setAttribute('ref', flag.ref);
                        } else {
                            // Пытаемся найти существующий Flag с таким же именем, чтобы взять ref
                            const existingFlags = child.getElementsByTagName('Flag');
                            let foundRef = false;
                            for (let i = 0; i < existingFlags.length; i++) {
                                const existingFlag = existingFlags[i];
                                const existingRef = existingFlag.getAttribute('ref');
                                if (existingRef && existingRef.endsWith(`.${flag.flagName}`)) {
                                    flagElement.setAttribute('ref', existingRef);
                                    foundRef = true;
                                    break;
                                }
                            }
                            if (!foundRef) {
                                // Если не нашли, используем только имя (система должна восстановить путь)
                                flagElement.setAttribute('ref', flag.flagName);
                            }
                        }
                        flagElement.textContent = flag.enabled ? 'true' : 'false';
                        child.appendChild(flagElement);
                    });
                } else {
                    // Если AccountingFlags пуст, удаляем элемент
                    if (child.parentNode) {
                        child.parentNode.removeChild(child);
                    }
                }
                break;
            case 'ExtDimensionTypes':
                // Таблица видов субконто
                // Формат XML: <ExtDimensionType name="ChartOfCharacteristicTypes.ВидыСубконто.Номенклатура">
                if (newItem.ExtDimensionTypes && newItem.ExtDimensionTypes.length > 0) {
                    const doc = itemElement.ownerDocument!;
                    
                    // Извлекаем префикс пути из существующих элементов ДО удаления
                    let pathPrefix: string | null = null;
                    const existingTypesBeforeDelete = child.getElementsByTagName('ExtDimensionType');
                    for (let i = 0; i < existingTypesBeforeDelete.length; i++) {
                        const existingType = existingTypesBeforeDelete[i];
                        const existingName = existingType.getAttribute('name');
                        if (existingName && existingName.includes('.')) {
                            // Извлекаем префикс до последней точки (например, "ChartOfCharacteristicTypes.ВидыСубконто")
                            const parts = existingName.split('.');
                            if (parts.length >= 2) {
                                pathPrefix = parts.slice(0, -1).join('.');
                                break;
                            }
                        }
                    }
                    
                    // Если не нашли в текущем элементе, ищем во всем документе
                    if (!pathPrefix) {
                        const allExtDimensionTypes = doc.getElementsByTagName('ExtDimensionType');
                        for (let i = 0; i < allExtDimensionTypes.length; i++) {
                            const existingType = allExtDimensionTypes[i];
                            const existingName = existingType.getAttribute('name');
                            if (existingName && existingName.includes('.')) {
                                const parts = existingName.split('.');
                                if (parts.length >= 2) {
                                    pathPrefix = parts.slice(0, -1).join('.');
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Собираем все уникальные флаги ExtDimensionAccountingFlag из всех существующих ExtDimensionType в документе
                    // Это нужно для того, чтобы сохранять все флаги, даже если они не отмечены
                    const allExtDimensionFlags = new Map<string, { ref: string; name: string }>();
                    let flagPathPrefix: string | null = null;
                    
                    // Сначала собираем из существующих элементов ДО удаления
                    for (let i = 0; i < existingTypesBeforeDelete.length; i++) {
                        const existingType = existingTypesBeforeDelete[i];
                        const accountingFlags = existingType.getElementsByTagName('AccountingFlags')[0];
                        if (accountingFlags) {
                            const flags = accountingFlags.getElementsByTagName('Flag');
                            for (let j = 0; j < flags.length; j++) {
                                const flag = flags[j];
                                const ref = flag.getAttribute('ref');
                                if (ref && ref.includes('ExtDimensionAccountingFlag')) {
                                    // Извлекаем имя флага (последняя часть после точки)
                                    const parts = ref.split('.');
                                    const flagName = parts[parts.length - 1];
                                    allExtDimensionFlags.set(flagName, { ref, name: flagName });
                                    
                                    // Извлекаем префикс пути для флагов
                                    if (!flagPathPrefix) {
                                        const extDimFlagIndex = parts.findIndex(p => p === 'ExtDimensionAccountingFlag');
                                        if (extDimFlagIndex >= 0 && extDimFlagIndex < parts.length - 1) {
                                            flagPathPrefix = parts.slice(0, extDimFlagIndex + 1).join('.');
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Если не нашли в текущем элементе, ищем во всем документе
                    if (allExtDimensionFlags.size === 0 || !flagPathPrefix) {
                        const allExtDimensionTypes = doc.getElementsByTagName('ExtDimensionType');
                        for (let i = 0; i < allExtDimensionTypes.length; i++) {
                            const existingType = allExtDimensionTypes[i];
                            const accountingFlags = existingType.getElementsByTagName('AccountingFlags')[0];
                            if (accountingFlags) {
                                const flags = accountingFlags.getElementsByTagName('Flag');
                                for (let j = 0; j < flags.length; j++) {
                                    const flag = flags[j];
                                    const ref = flag.getAttribute('ref');
                                    if (ref && ref.includes('ExtDimensionAccountingFlag')) {
                                        const parts = ref.split('.');
                                        const flagName = parts[parts.length - 1];
                                        if (!allExtDimensionFlags.has(flagName)) {
                                            allExtDimensionFlags.set(flagName, { ref, name: flagName });
                                        }
                                        
                                        // Извлекаем префикс пути для флагов
                                        if (!flagPathPrefix) {
                                            const extDimFlagIndex = parts.findIndex(p => p === 'ExtDimensionAccountingFlag');
                                            if (extDimFlagIndex >= 0 && extDimFlagIndex < parts.length - 1) {
                                                flagPathPrefix = parts.slice(0, extDimFlagIndex + 1).join('.');
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Удаляем старые элементы
                    while (child.firstChild) {
                        child.removeChild(child.firstChild);
                    }
                    
                    // Добавляем новые элементы ExtDimensionType
                    newItem.ExtDimensionTypes.forEach(dimType => {
                        const dimTypeElement = doc.createElement('ExtDimensionType');
                        // Используем name если есть, иначе пытаемся восстановить путь
                        if (dimType.name) {
                            dimTypeElement.setAttribute('name', dimType.name);
                        } else if (pathPrefix) {
                            // Восстанавливаем полный путь используя префикс
                            dimTypeElement.setAttribute('name', `${pathPrefix}.${dimType.dimensionType}`);
                        } else {
                            // Если не нашли префикс, используем только имя (система должна восстановить путь)
                            dimTypeElement.setAttribute('name', dimType.dimensionType);
                        }
                        
                        const turnoverElement = doc.createElement('Turnover');
                        turnoverElement.textContent = dimType.turnoverOnly ? 'true' : 'false';
                        dimTypeElement.appendChild(turnoverElement);
                        
                        // Всегда создаем AccountingFlags, даже если флагов нет в данных
                        // Сохраняем все флаги из метаданных, даже если они не отмечены
                        const accountingFlagsElement = doc.createElement('AccountingFlags');
                        
                        // Создаем набор всех флагов: сначала из метаданных (все найденные), затем из данных пользователя
                        const flagsToSave = new Map<string, { enabled: boolean; ref: string }>();
                        
                        // Добавляем все флаги из метаданных (по умолчанию false)
                        allExtDimensionFlags.forEach((flagInfo, flagName) => {
                            flagsToSave.set(flagName, {
                                enabled: false,
                                ref: flagInfo.ref
                            });
                        });
                        
                        // Обновляем значения из данных пользователя
                        Object.entries(dimType.flags).forEach(([flagName, flagValue]) => {
                            let flagEnabled = false;
                            let flagRef: string | undefined = undefined;
                            if (typeof flagValue === 'boolean') {
                                flagEnabled = flagValue;
                            } else if (flagValue && typeof flagValue === 'object' && 'enabled' in flagValue) {
                                flagEnabled = flagValue.enabled;
                                flagRef = flagValue.ref;
                            }
                            
                            // Определяем ref (короткое имя без точек конфигуратор не принимает)
                            let finalRef: string;
                            if (flagRef && flagRef.includes('.')) {
                                finalRef = flagRef;
                            } else if (flagPathPrefix) {
                                finalRef = `${flagPathPrefix}.${flagName}`;
                            } else {
                                const existingFlagInfo = allExtDimensionFlags.get(flagName);
                                const inferred = resolveExtDimensionAccountingFlagRefPrefix(doc);
                                if (existingFlagInfo?.ref && existingFlagInfo.ref.includes('.')) {
                                    finalRef = existingFlagInfo.ref;
                                } else if (inferred) {
                                    finalRef = `${inferred}.${flagName}`;
                                } else {
                                    finalRef = flagName;
                                }
                            }
                            
                            flagsToSave.set(flagName, {
                                enabled: flagEnabled,
                                ref: finalRef
                            });
                        });
                        
                        // Сохраняем все флаги
                        flagsToSave.forEach((flagInfo, flagName) => {
                            const flagElement = doc.createElement('Flag');
                            flagElement.setAttribute('ref', flagInfo.ref);
                            flagElement.textContent = flagInfo.enabled ? 'true' : 'false';
                            accountingFlagsElement.appendChild(flagElement);
                        });
                        
                        dimTypeElement.appendChild(accountingFlagsElement);
                        child.appendChild(dimTypeElement);
                    });
                } else {
                    // Если ExtDimensionTypes пуст, удаляем элемент
                    if (child.parentNode) {
                        child.parentNode.removeChild(child);
                    }
                }
                break;
            case 'ChildItems':
                // Рекурсивно обрабатываем вложенные элементы
                const childItems = newItem.ChildItems?.Item ? (Array.isArray(newItem.ChildItems.Item) ? newItem.ChildItems.Item : [newItem.ChildItems.Item]) : [];
                
                if (childItems.length > 0) {
                    // Создаем карту существующих дочерних элементов по id
                    const existingChildItemsMap = new Map<string, Element>();
                    const existingChildNodes = Array.from(child.childNodes);
                    for (const node of existingChildNodes) {
                        if (node.nodeType === 1) {
                            const element = node as Element;
                            const localName = (element as any).localName || element.nodeName.split(':').pop() || element.nodeName;
                            if (localName === 'Item') {
                                const id = element.getAttribute('id');
                                if (id) {
                                    existingChildItemsMap.set(id, element);
                                }
                            }
                        }
                    }
                    
                    // Создаем множества id для сопоставления
                    const newChildIds = new Set<string>();
                    childItems.forEach(childItem => {
                        if (childItem.id) {
                            newChildIds.add(childItem.id);
                        }
                    });
                    
                    // Удаляем дочерние элементы, которых нет в новых данных
                    existingChildItemsMap.forEach((element, id) => {
                        if (!newChildIds.has(id)) {
                            child.removeChild(element);
                        }
                    });
                    
                    // Обновляем существующие и добавляем новые дочерние элементы
                    const template = extractItemTemplate(new XMLSerializer().serializeToString(itemElement.ownerDocument!));
                    if (template) {
                        childItems.forEach(childItem => {
                            if (childItem.id && existingChildItemsMap.has(childItem.id)) {
                                // Обновляем существующий элемент
                                const existingChildElement = existingChildItemsMap.get(childItem.id)!;
                                updateItemElementInDom(existingChildElement, childItem, namespacePrefix);
                            } else {
                                // Создаем новый элемент
                                const newChildItem = createItemElementFromTemplate(itemElement.ownerDocument!, template, childItem, namespacePrefix);
                                child.appendChild(newChildItem);
                            }
                        });
                    }
                } else {
                    // Если дочерних элементов нет, удаляем все существующие
                    while (child.firstChild) {
                        child.removeChild(child.firstChild);
                    }
                }
                break;
            case 'ActionPeriodIsBase':
                child.textContent =
                    newItem.ActionPeriodIsBase === undefined
                        ? 'false'
                        : newItem.ActionPeriodIsBase
                          ? 'true'
                          : 'false';
                break;
            case 'Displaced':
                if (newItem.Displaced && newItem.Displaced.length > 0) {
                    rebuildCalculationTypeRefContainer(child, newItem.Displaced);
                } else if (child.parentNode) {
                    child.parentNode.removeChild(child);
                }
                break;
            case 'Leading':
                if (newItem.Leading && newItem.Leading.length > 0) {
                    rebuildCalculationTypeRefContainer(child, newItem.Leading);
                } else if (child.parentNode) {
                    child.parentNode.removeChild(child);
                }
                break;
            case 'Base':
                if (newItem.Base && newItem.Base.length > 0) {
                    rebuildCalculationTypeRefContainer(child, newItem.Base);
                } else if (child.parentNode) {
                    child.parentNode.removeChild(child);
                }
                break;
        }
    }
    
    // Добавляем отсутствующие элементы
    if (!existingElements.has('Code')) {
        const codeElement = itemElement.ownerDocument!.createElement('Code');
        codeElement.textContent = String(newItem.Code || '');
        if (isNumericCode(String(newItem.Code || ''))) {
            codeElement.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:type', 'xs:decimal');
        }
        // Вставляем Code после Name
        const nameElement = existingElements.get('Name');
        if (nameElement && nameElement.nextSibling) {
            itemElement.insertBefore(codeElement, nameElement.nextSibling);
        } else {
            itemElement.appendChild(codeElement);
        }
    }
    
    if (!existingElements.has('Description') && newItem.Description !== undefined) {
        const descElement = itemElement.ownerDocument!.createElement('Description');
        descElement.textContent = newItem.Description || '';
        // Вставляем Description после Code
        const codeElement = existingElements.get('Code');
        if (codeElement && codeElement.nextSibling) {
            itemElement.insertBefore(descElement, codeElement.nextSibling);
        } else {
            itemElement.appendChild(descElement);
        }
    }
    
    if (newItem.Type && !existingElements.has('Type')) {
        const typeElement = itemElement.ownerDocument!.createElement('Type');
        // Разделяем типы по разделителю "|" для составных типов
        const typeParts = newItem.Type.split('|').map(t => t.trim()).filter(t => t);
        
        // Создаем элемент v8:Type для каждого типа
        for (const typePart of typeParts) {
            const v8TypeElement = itemElement.ownerDocument!.createElementNS('http://v8.1c.ru/8.1/data/core', 'v8:Type');
            const typeWithPrefix = addNamespacePrefix(typePart, namespacePrefix);
            v8TypeElement.textContent = typeWithPrefix;
            typeElement.appendChild(v8TypeElement);
        }
        
        // Вставляем Type после Description, если он есть, иначе после Code
        const insertAfter = existingElements.get('Description') || existingElements.get('Code') || existingElements.get('Name');
        if (insertAfter && insertAfter.nextSibling) {
            itemElement.insertBefore(typeElement, insertAfter.nextSibling);
        } else {
            itemElement.appendChild(typeElement);
        }
    }
    
    // Добавляем IsFolder только если он был в исходном XML или если это не план счетов
    // Для планов счетов IsFolder обычно не используется
    const hadIsFolder = existingElements.has('IsFolder');
    if (hadIsFolder && newItem.IsFolder !== undefined) {
        // Обновляем существующий элемент
        const isFolderElement = existingElements.get('IsFolder')!;
        isFolderElement.textContent = newItem.IsFolder ? 'true' : 'false';
    } else if (!hadIsFolder && newItem.IsFolder !== undefined) {
        // Добавляем только если IsFolder был явно установлен и это не план счетов
        // Проверяем, есть ли в документе элементы, характерные для плана счетов (AccountType, AccountingFlags)
        const hasAccountType = existingElements.has('AccountType') || itemElement.getElementsByTagName('AccountType').length > 0;
        if (!hasAccountType) {
            // Это не план счетов, можно добавлять IsFolder
            const isFolderElement = itemElement.ownerDocument!.createElement('IsFolder');
            isFolderElement.textContent = newItem.IsFolder ? 'true' : 'false';
            itemElement.appendChild(isFolderElement);
        }
    }
    
    // Добавляем поля для плана счетов (после Description, перед ChildItems)
    const insertAfterDescription = existingElements.get('Description') || existingElements.get('Code') || existingElements.get('Name');
    
    if (newItem.AccountType && !existingElements.has('AccountType')) {
        const accountTypeElement = itemElement.ownerDocument!.createElement('AccountType');
        accountTypeElement.textContent = newItem.AccountType;
        if (insertAfterDescription && insertAfterDescription.nextSibling) {
            itemElement.insertBefore(accountTypeElement, insertAfterDescription.nextSibling);
        } else {
            itemElement.appendChild(accountTypeElement);
        }
    }
    
    if (newItem.OffBalance !== undefined && !existingElements.has('OffBalance')) {
        const offBalanceElement = itemElement.ownerDocument!.createElement('OffBalance');
        offBalanceElement.textContent = newItem.OffBalance ? 'true' : 'false';
        const accountTypeElement = existingElements.get('AccountType');
        if (accountTypeElement && accountTypeElement.nextSibling) {
            itemElement.insertBefore(offBalanceElement, accountTypeElement.nextSibling);
        } else if (insertAfterDescription && insertAfterDescription.nextSibling) {
            itemElement.insertBefore(offBalanceElement, insertAfterDescription.nextSibling);
        } else {
            itemElement.appendChild(offBalanceElement);
        }
    }
    
    if (newItem.Order && !existingElements.has('Order')) {
        const orderElement = itemElement.ownerDocument!.createElement('Order');
        orderElement.textContent = newItem.Order;
        const offBalanceElement = existingElements.get('OffBalance');
        if (offBalanceElement && offBalanceElement.nextSibling) {
            itemElement.insertBefore(orderElement, offBalanceElement.nextSibling);
        } else {
            const accountTypeElement = existingElements.get('AccountType');
            if (accountTypeElement && accountTypeElement.nextSibling) {
                itemElement.insertBefore(orderElement, accountTypeElement.nextSibling);
            } else if (insertAfterDescription && insertAfterDescription.nextSibling) {
                itemElement.insertBefore(orderElement, insertAfterDescription.nextSibling);
            } else {
                itemElement.appendChild(orderElement);
            }
        }
    }
    
    if (newItem.AccountingFlags && newItem.AccountingFlags.length > 0 && !existingElements.has('AccountingFlags')) {
        const doc = itemElement.ownerDocument!;
        const accountingFlagsElement = doc.createElement('AccountingFlags');
        newItem.AccountingFlags.forEach(flag => {
            const flagItemElement = doc.createElement('Item');
            const flagNameElement = doc.createElement('FlagName');
            flagNameElement.textContent = flag.flagName;
            flagItemElement.appendChild(flagNameElement);
            const enabledElement = doc.createElement('Enabled');
            enabledElement.textContent = flag.enabled ? 'true' : 'false';
            flagItemElement.appendChild(enabledElement);
            accountingFlagsElement.appendChild(flagItemElement);
        });
        const orderElement = existingElements.get('Order');
        if (orderElement && orderElement.nextSibling) {
            itemElement.insertBefore(accountingFlagsElement, orderElement.nextSibling);
        } else {
            const insertBefore = existingElements.get('ChildItems');
            if (insertBefore) {
                itemElement.insertBefore(accountingFlagsElement, insertBefore);
            } else {
                itemElement.appendChild(accountingFlagsElement);
            }
        }
    }
    
    if (newItem.ExtDimensionTypes && newItem.ExtDimensionTypes.length > 0 && !existingElements.has('ExtDimensionTypes')) {
        const doc = itemElement.ownerDocument!;
        const extDimensionTypesElement = doc.createElement('ExtDimensionTypes');
        
        // Извлекаем префикс пути из существующих элементов для восстановления полных путей
        let pathPrefix: string | null = null;
        const allExtDimensionTypes = doc.getElementsByTagName('ExtDimensionType');
        for (let i = 0; i < allExtDimensionTypes.length; i++) {
            const existingType = allExtDimensionTypes[i];
            const existingName = existingType.getAttribute('name');
            if (existingName && existingName.includes('.')) {
                // Извлекаем префикс до последней точки (например, "ChartOfCharacteristicTypes.ВидыСубконто")
                const parts = existingName.split('.');
                if (parts.length >= 2) {
                    pathPrefix = parts.slice(0, -1).join('.');
                    break;
                }
            }
        }
        
        // Собираем все уникальные флаги ExtDimensionAccountingFlag из всех существующих ExtDimensionType в документе
        const allExtDimensionFlags = new Map<string, { ref: string; name: string }>();
        let flagPathPrefix: string | null = null;
        
        for (let i = 0; i < allExtDimensionTypes.length; i++) {
            const existingType = allExtDimensionTypes[i];
            const accountingFlags = existingType.getElementsByTagName('AccountingFlags')[0];
            if (accountingFlags) {
                const flags = accountingFlags.getElementsByTagName('Flag');
                for (let j = 0; j < flags.length; j++) {
                    const flag = flags[j];
                    const ref = flag.getAttribute('ref');
                    if (ref && ref.includes('ExtDimensionAccountingFlag')) {
                        const parts = ref.split('.');
                        const flagName = parts[parts.length - 1];
                        if (!allExtDimensionFlags.has(flagName)) {
                            allExtDimensionFlags.set(flagName, { ref, name: flagName });
                        }
                        
                        // Извлекаем префикс пути для флагов
                        if (!flagPathPrefix) {
                            const extDimFlagIndex = parts.findIndex(p => p === 'ExtDimensionAccountingFlag');
                            if (extDimFlagIndex >= 0 && extDimFlagIndex < parts.length - 1) {
                                flagPathPrefix = parts.slice(0, extDimFlagIndex + 1).join('.');
                            }
                        }
                    }
                }
            }
        }
        
        newItem.ExtDimensionTypes.forEach(dimType => {
            const dimTypeElement = doc.createElement('ExtDimensionType');
            // Используем name если есть, иначе пытаемся восстановить путь
            if (dimType.name) {
                dimTypeElement.setAttribute('name', dimType.name);
            } else if (pathPrefix) {
                // Восстанавливаем полный путь используя префикс
                dimTypeElement.setAttribute('name', `${pathPrefix}.${dimType.dimensionType}`);
            } else {
                // Если нет полного пути, используем только имя (система должна восстановить путь)
                dimTypeElement.setAttribute('name', dimType.dimensionType);
            }
            
            const turnoverElement = doc.createElement('Turnover');
            turnoverElement.textContent = dimType.turnoverOnly ? 'true' : 'false';
            dimTypeElement.appendChild(turnoverElement);
            
            // Всегда создаем AccountingFlags, даже если флагов нет в данных
            // Сохраняем все флаги из метаданных, даже если они не отмечены
            const accountingFlagsElement = doc.createElement('AccountingFlags');
            
            // Создаем набор всех флагов: сначала из метаданных (все найденные), затем из данных пользователя
            const flagsToSave = new Map<string, { enabled: boolean; ref: string }>();
            
            // Добавляем все флаги из метаданных (по умолчанию false)
            allExtDimensionFlags.forEach((flagInfo, flagName) => {
                flagsToSave.set(flagName, {
                    enabled: false,
                    ref: flagInfo.ref
                });
            });
            
            // Обновляем значения из данных пользователя
            Object.entries(dimType.flags).forEach(([flagName, flagValue]) => {
                let flagEnabled = false;
                let flagRef: string | undefined = undefined;
                if (typeof flagValue === 'boolean') {
                    flagEnabled = flagValue;
                } else if (flagValue && typeof flagValue === 'object' && 'enabled' in flagValue) {
                    flagEnabled = flagValue.enabled;
                    flagRef = flagValue.ref;
                }
                
                let finalRef: string;
                if (flagRef && flagRef.includes('.')) {
                    finalRef = flagRef;
                } else if (flagPathPrefix) {
                    finalRef = `${flagPathPrefix}.${flagName}`;
                } else {
                    const existingFlagInfo = allExtDimensionFlags.get(flagName);
                    const inferred = resolveExtDimensionAccountingFlagRefPrefix(doc);
                    if (existingFlagInfo?.ref && existingFlagInfo.ref.includes('.')) {
                        finalRef = existingFlagInfo.ref;
                    } else if (inferred) {
                        finalRef = `${inferred}.${flagName}`;
                    } else {
                        finalRef = flagName;
                    }
                }
                
                flagsToSave.set(flagName, {
                    enabled: flagEnabled,
                    ref: finalRef
                });
            });
            
            // Сохраняем все флаги
            flagsToSave.forEach((flagInfo, flagName) => {
                const flagElement = doc.createElement('Flag');
                flagElement.setAttribute('ref', flagInfo.ref);
                flagElement.textContent = flagInfo.enabled ? 'true' : 'false';
                accountingFlagsElement.appendChild(flagElement);
            });
            
            dimTypeElement.appendChild(accountingFlagsElement);
            extDimensionTypesElement.appendChild(dimTypeElement);
        });
        const accountingFlagsElement = existingElements.get('AccountingFlags');
        if (accountingFlagsElement && accountingFlagsElement.nextSibling) {
            itemElement.insertBefore(extDimensionTypesElement, accountingFlagsElement.nextSibling);
        } else {
            const insertBefore = existingElements.get('ChildItems');
            if (insertBefore) {
                itemElement.insertBefore(extDimensionTypesElement, insertBefore);
            } else {
                itemElement.appendChild(extDimensionTypesElement);
            }
        }
    }

    /** Локальные имена прямых дочерних элементов Item (для плана видов расчёта и др.). */
    function collectItemChildLocalNames(itemEl: Element): Set<string> {
        const s = new Set<string>();
        for (let i = 0; i < itemEl.childNodes.length; i++) {
            const n = itemEl.childNodes[i];
            if (n.nodeType !== 1) {
                continue;
            }
            const e = n as Element;
            const ln = (e as any).localName || e.nodeName.split(':').pop() || e.nodeName;
            s.add(ln);
        }
        return s;
    }
    function getFirstChildItemsElement(itemEl: Element): Element | null {
        for (let i = 0; i < itemEl.childNodes.length; i++) {
            const n = itemEl.childNodes[i];
            if (n.nodeType !== 1) {
                continue;
            }
            const e = n as Element;
            const ln = (e as any).localName || e.nodeName.split(':').pop() || e.nodeName;
            if (ln === 'ChildItems') {
                return e;
            }
        }
        return null;
    }
    function insertBeforeChildItems(itemEl: Element, newEl: Element, boundary: Element | null): void {
        if (boundary) {
            itemEl.insertBefore(newEl, boundary);
        } else {
            itemEl.appendChild(newEl);
        }
    }

    const presentLocals = collectItemChildLocalNames(itemElement);
    const childItemsEl = getFirstChildItemsElement(itemElement);
    const docPvr = itemElement.ownerDocument!;

    const isCalculationTypePredefinedItem =
        presentLocals.has('ActionPeriodIsBase') ||
        presentLocals.has('Displaced') ||
        presentLocals.has('Leading') ||
        presentLocals.has('Base') ||
        newItem.ActionPeriodIsBase !== undefined ||
        newItem.Displaced !== undefined ||
        newItem.Leading !== undefined ||
        newItem.Base !== undefined;

    if (isCalculationTypePredefinedItem && !presentLocals.has('ActionPeriodIsBase')) {
        const el = docPvr.createElement('ActionPeriodIsBase');
        el.textContent =
            newItem.ActionPeriodIsBase === undefined
                ? 'false'
                : newItem.ActionPeriodIsBase
                  ? 'true'
                  : 'false';
        insertBeforeChildItems(itemElement, el, childItemsEl);
        presentLocals.add('ActionPeriodIsBase');
    }

    function ensureCalculationRefBlock(
        tag: 'Displaced' | 'Leading' | 'Base',
        data: string[] | undefined
    ): void {
        if (!isCalculationTypePredefinedItem || !data || data.length === 0 || presentLocals.has(tag)) {
            return;
        }
        const wrap = docPvr.createElement(tag);
        rebuildCalculationTypeRefContainer(wrap, data);
        insertBeforeChildItems(itemElement, wrap, childItemsEl);
        presentLocals.add(tag);
    }
    ensureCalculationRefBlock('Displaced', newItem.Displaced);
    ensureCalculationRefBlock('Leading', newItem.Leading);
    ensureCalculationRefBlock('Base', newItem.Base);

    // Иерархия: в модели дети лежат в ChildItems.Item, но в исходном XML у папки мог не быть
    // узла <ChildItems> (все Item были соседями в корне). Тогда case 'ChildItems' выше не сработает.
    if (!existingElements.has('ChildItems')) {
        const nested = newItem.ChildItems?.Item
            ? Array.isArray(newItem.ChildItems.Item)
                ? newItem.ChildItems.Item
                : [newItem.ChildItems.Item]
            : [];
        if (nested.length > 0) {
            const doc = itemElement.ownerDocument!;
            const template = extractItemTemplate(new XMLSerializer().serializeToString(doc));
            if (template) {
                const childItemsEl = doc.createElement('ChildItems');
                for (const childItem of nested) {
                    childItemsEl.appendChild(
                        createItemElementFromTemplate(doc, template, childItem, namespacePrefix)
                    );
                }
                // После полей элемента (в т.ч. видов субконто у ПС); для справочника — после IsFolder
                itemElement.appendChild(childItemsEl);
            }
        }
    }
}

/**
 * Создает новый элемент Item на основе шаблона
 * @param namespacePrefix - префикс namespace для добавления к типу
 */
function createItemElementFromTemplate(doc: Document, template: Element, newItem: PredefinedDataItem, namespacePrefix: string = ''): Element {
    // Клонируем шаблон
    const itemElement = template.cloneNode(true) as Element;
    
    // Обновляем атрибут id - используем id из данных, если есть, иначе генерируем новый
    const newId = newItem.id || generateItemId();
    itemElement.setAttribute('id', newId);
    
    // Обновляем содержимое
    updateItemElementInDom(itemElement, newItem, namespacePrefix);
    
    return itemElement;
}

/**
 * Сериализует предопределенные элементы в XML через xmldom
 * Сохраняет структуру и форматирование исходного XML
 * 
 * @param originalXml - исходная XML строка (для сохранения структуры)
 * @param items - массив предопределенных элементов
 * @returns обновленная XML строка
 */
export function serializePredefinedXmlWithDom(
    originalXml: string,
    items: PredefinedDataItem[]
): string {
    // Удаляем BOM если есть, но сохраняем для возврата
    let cleanXml = originalXml;
    const hasBom = cleanXml.charCodeAt(0) === 0xfeff;
    if (hasBom) {
        cleanXml = cleanXml.slice(1);
    }
    
    // Определяем namespace prefix из исходного XML
    const namespacePrefix = detectNamespacePrefix(cleanXml);
    
    // Парсим исходный XML
    const parser = new DOMParser({
        locator: {},
        errorHandler: {
            warning: (w: any) => console.warn('[xmldom] Warning:', w),
            error: (e: any) => console.error('[xmldom] Error:', e),
            fatalError: (e: any) => {
                console.error('[xmldom] Fatal error:', e);
                throw new Error(`XML parsing error: ${e}`);
            }
        }
    });
    
    let doc: Document;
    try {
        doc = parser.parseFromString(cleanXml, 'text/xml');
    } catch (error) {
        console.error('[serializePredefinedXmlWithDom] Ошибка парсинга XML:', error);
        throw new Error(`Не удалось распарсить XML: ${error}`);
    }
    
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
    
    const rootLocalName = (rootElement as any).localName || rootElement.nodeName.split(':').pop() || rootElement.nodeName;
    if (rootLocalName !== 'PredefinedData') {
        throw new Error('Не найден корневой элемент PredefinedData');
    }
    
    // Получаем все существующие элементы Item с их id и Code
    const existingIds = new Set<string>();
    const existingItemsByIdMap = new Map<string, Element>();
    const existingCodes = new Set<string>();
    const existingItemsByCodeMap = new Map<string, Element>();
    
    // Собираем элементы в порядке их появления
    const itemsInOrder: Array<{ id?: string, code: string, element: Element }> = [];
    const childNodes = rootElement.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType === 1) {
            const element = node as Element;
            const localName = (element as any).localName || element.nodeName.split(':').pop() || element.nodeName;
            
            if (localName === 'Item') {
                const id = element.getAttribute('id') || '';
                // Ищем элемент Code внутри Item
                const codeNodes = element.childNodes;
                let codeValue = '';
                for (let j = 0; j < codeNodes.length; j++) {
                    const codeNode = codeNodes[j];
                    if (codeNode.nodeType === 1) {
                        const codeElement = codeNode as Element;
                        const codeLocalName = (codeElement as any).localName || codeElement.nodeName.split(':').pop() || codeElement.nodeName;
                        if (codeLocalName === 'Code') {
                            codeValue = codeElement.textContent || '';
                            break;
                        }
                    }
                }
                
                if (id) {
                    existingIds.add(id);
                    existingItemsByIdMap.set(id, element);
                }
                if (codeValue) {
                    existingCodes.add(codeValue);
                    existingItemsByCodeMap.set(codeValue, element);
                }
                itemsInOrder.push({ id, code: codeValue, element });
            }
        }
    }
    
    // Создаем множества для сопоставления
    const newIds = new Set(items.map(item => item.id || '').filter(id => id));
    const newCodes = new Set(items.map(item => String(item.Code || '')));
    const idsToUpdate = new Set<string>();
    const codesToUpdate = new Set<string>();
    const codesToAdd = new Set<string>();
    const codesToRemove = new Set<string>();
    
    // Определяем, какие элементы обновлять, добавлять и удалять
    // Приоритет: сначала по id, потом по Code
    items.forEach(item => {
        const id = item.id || '';
        const code = String(item.Code || '');
        if (id && existingIds.has(id)) {
            idsToUpdate.add(id);
        } else if (code && existingCodes.has(code)) {
            codesToUpdate.add(code);
        } else {
            codesToAdd.add(code);
        }
    });
    
    existingCodes.forEach(code => {
        const element = existingItemsByCodeMap.get(code);
        if (element) {
            const id = element.getAttribute('id') || '';
            // Удаляем только если нет в новых данных ни по id, ни по code
            const itemById = id ? items.find(i => i.id === id) : null;
            const itemByCode = items.find(i => String(i.Code || '') === code);
            if (!itemById && !itemByCode) {
                codesToRemove.add(code);
            }
        }
    });
    
    // 1. Удаляем отсутствующие элементы
    codesToRemove.forEach(code => {
        const element = existingItemsByCodeMap.get(code);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    
    // 2. Обновляем существующие элементы (сначала по id, потом по Code)
    idsToUpdate.forEach(id => {
        const element = existingItemsByIdMap.get(id);
        const item = items.find(i => i.id === id);
        if (element && item) {
            updateItemElementInDom(element, item, namespacePrefix);
        }
    });
    
    codesToUpdate.forEach(code => {
        // Пропускаем, если уже обновлен по id
        const element = existingItemsByCodeMap.get(code);
        const item = items.find(i => String(i.Code || '') === code);
        if (element && item && !idsToUpdate.has(item.id || '')) {
            updateItemElementInDom(element, item, namespacePrefix);
        }
    });
    
    // 3. Добавляем новые элементы в конец
    if (codesToAdd.size > 0) {
        // Извлекаем шаблон
        const template = extractItemTemplate(cleanXml);
        
        if (template) {
            codesToAdd.forEach(code => {
                const item = items.find(i => String(i.Code || '') === code);
                if (item) {
                    const newItemElement = createItemElementFromTemplate(doc, template, item, namespacePrefix);
                    rootElement.appendChild(newItemElement);
                }
            });
        } else {
            // Если шаблон не найден, создаем базовый элемент
            codesToAdd.forEach(code => {
                const item = items.find(i => String(i.Code || '') === code);
                if (item) {
                    const newItemElement = doc.createElement('Item');
                    newItemElement.setAttribute('id', generateItemId());
                    
                    const nameElement = doc.createElement('Name');
                    nameElement.textContent = item.Name || '';
                    newItemElement.appendChild(nameElement);
                    
                    const codeElement = doc.createElement('Code');
                    codeElement.textContent = String(item.Code || '');
                    if (isNumericCode(String(item.Code || ''))) {
                        codeElement.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:type', 'xs:decimal');
                    }
                    newItemElement.appendChild(codeElement);
                    
                    if (item.Description !== undefined) {
                        const descElement = doc.createElement('Description');
                        descElement.textContent = item.Description || '';
                        newItemElement.appendChild(descElement);
                    }
                    
                    if (item.Type) {
                        const typeElement = doc.createElement('Type');
                        // Разделяем типы по разделителю "|" для составных типов
                        const typeParts = item.Type.split('|').map(t => t.trim()).filter(t => t);
                        
                        // Создаем элемент v8:Type для каждого типа
                        for (const typePart of typeParts) {
                            const v8TypeElement = doc.createElementNS('http://v8.1c.ru/8.1/data/core', 'v8:Type');
                            const typeWithPrefix = addNamespacePrefix(typePart, namespacePrefix);
                            v8TypeElement.textContent = typeWithPrefix;
                            typeElement.appendChild(v8TypeElement);
                        }
                        newItemElement.appendChild(typeElement);
                    }
                    
                    // Добавляем IsFolder только если это не план счетов
                    // Проверяем, есть ли в элементе AccountType (признак плана счетов)
                    const hasAccountType = item.AccountType !== undefined;
                    if (item.IsFolder !== undefined && !hasAccountType) {
                        const isFolderElement = doc.createElement('IsFolder');
                        isFolderElement.textContent = item.IsFolder ? 'true' : 'false';
                        newItemElement.appendChild(isFolderElement);
                    }
                    
                    rootElement.appendChild(newItemElement);
                }
            });
        }
    }
    
    // 4. Сериализуем обратно в XML
    const serializer = new XMLSerializer();
    let resultXml = serializer.serializeToString(doc);
    
    // 5. Форматируем результат
    resultXml = formatXml(resultXml);
    
    // 6. Добавляем BOM если был в исходном файле
    if (hasBom) {
        const bomBuffer = Buffer.from([0xEF, 0xBB, 0xBF]);
        const contentBuffer = Buffer.from(resultXml, 'utf8');
        const finalBuffer = Buffer.concat([bomBuffer, contentBuffer]);
        return finalBuffer.toString('utf8');
    }
    
    return resultXml;
}

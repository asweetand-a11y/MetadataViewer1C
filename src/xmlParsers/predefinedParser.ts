import { safeReadFile } from "../utils/fileUtils";
import { createXMLParser } from "../utils/xmlUtils";
import { ParsedPredefined } from "./metadataParser";
import { DOMParser } from "@xmldom/xmldom";
import { PredefinedDataItem } from "../predefinedDataInterfaces";

/**
 * Парсинг файла Predefined.xml
 */
export async function parsePredefinedXml(xmlPath: string): Promise<ParsedPredefined[]> {
    const xml = await safeReadFile(xmlPath);
    const parser = createXMLParser();

    const j = parser.parse(xml);
    
    // Проверяем что это PredefinedData
    if (!j.PredefinedData) {
        return [];
    }

    const predefinedData = j.PredefinedData;
    const items: ParsedPredefined[] = [];

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

/**
 * Проверка существования файла Predefined.xml
 */
export async function hasPredefinedFile(objectPath: string): Promise<boolean> {
    const path = require('path');
    const fs = require('fs').promises;
    
    // Путь к Predefined.xml: Documents/НачислениеЗарплаты/Ext/Predefined.xml
    const dir = path.dirname(objectPath);
    const predefinedPath = path.join(dir, 'Ext', 'Predefined.xml');
    
    try {
        await fs.access(predefinedPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Получить путь к файлу Predefined.xml для объекта
 */
export function getPredefinedPath(objectPath: string): string {
    const path = require('path');
    const dir = path.dirname(objectPath);
    return path.join(dir, 'Ext', 'Predefined.xml');
}

/**
 * Парсинг файла Predefined.xml через xmldom
 * Сохраняет структуру XML для последующего сохранения
 */
export async function parsePredefinedXmlWithDom(xmlPath: string): Promise<{ items: PredefinedDataItem[], originalXml: string }> {
    const xml = await safeReadFile(xmlPath);
    
    // Удаляем BOM если есть
    let cleanXml = xml;
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
    const rootLocalName = (rootElement as any).localName || rootElement.nodeName.split(':').pop() || rootElement.nodeName;
    if (rootLocalName !== 'PredefinedData') {
        throw new Error(`Не найден корневой элемент PredefinedData. Найден: ${rootElement.nodeName} (localName: ${rootLocalName})`);
    }
    
    // Парсим элементы - используем простой подход через childNodes
    // Элементы верхнего уровня не имеют родителя (Parent = "Счета")
    const items: PredefinedDataItem[] = [];
    const childNodes = rootElement.childNodes;
    
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType === 1) { // Element node
            const element = node as Element;
            const localName = (element as any).localName || element.nodeName.split(':').pop() || element.nodeName;
            
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

/**
 * Убирает namespace prefix из типа (например, d4p1:CatalogRef -> CatalogRef)
 * Оставляет префиксы типов: xs:, v8:, cfg:
 */
function stripNamespacePrefix(typeText: string): string {
    if (!typeText) return typeText;
    // Убираем префиксы вида d4p1:, d5p1: и т.д. (namespace prefixes)
    // Оставляем xs:, v8:, cfg: как префиксы типов
    return typeText.replace(/^d\d+p\d+:/, '').replace(/^[a-z]\d+:/, '');
}

/**
 * Список ссылок из контейнера вида <Displaced|Leading|Base><CalculationType>...</CalculationType>
 */
function parseCalculationTypeRefList(container: Element): string[] {
    const out: string[] = [];
    const childNodes = container.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType !== 1) continue;
        const el = node as Element;
        const localName = (el as any).localName || el.nodeName.split(':').pop() || el.nodeName;
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
function parseItemElement(itemElement: Element, parentName?: string): PredefinedDataItem {
    const item: PredefinedDataItem = {
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
    } else {
        item.Parent = 'Счета';
    }
    
    // Парсим дочерние элементы
    const children = itemElement.childNodes;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType !== 1) continue; // Пропускаем текстовые узлы
        
        const child = node as Element;
        // Получаем localName для обработки namespace
        const localName = (child as any).localName || child.nodeName.split(':').pop() || child.nodeName;
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
                    item.AccountType = accountType as 'Active' | 'Passive' | 'ActivePassive';
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
                const typeTexts: string[] = [];
                
                // Ищем все элементы v8:Type по namespace
                let v8TypeElements: Element[] = [];
                try {
                    const elements = child.getElementsByTagNameNS('http://v8.1c.ru/8.1/data/core', 'Type');
                    for (let i = 0; i < elements.length; i++) {
                        v8TypeElements.push(elements[i] as Element);
                    }
                } catch (e) {
                    // Игнорируем ошибки namespace
                }
                
                // Если не нашли по namespace, ищем по localName и nodeName
                if (v8TypeElements.length === 0) {
                    const childNodes = child.childNodes;
                    for (let j = 0; j < childNodes.length; j++) {
                        const cn = childNodes[j];
                        if (cn.nodeType === 1) {
                            const cel = cn as Element;
                            const cln = (cel as any).localName || cel.nodeName.split(':').pop() || cel.nodeName;
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
                } else if (textContent.trim()) {
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
                const childItems: PredefinedDataItem[] = [];
                const childNodes = child.childNodes;
                for (let j = 0; j < childNodes.length; j++) {
                    const childNode = childNodes[j];
                    if (childNode.nodeType === 1) {
                        const childItemElement = childNode as Element;
                        const childLocalName = (childItemElement as any).localName || childItemElement.nodeName.split(':').pop() || childItemElement.nodeName;
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
function parseAccountingFlagsTable(accountingFlagsElement: Element): Array<{ flagName: string; enabled: boolean; ref?: string }> {
    const flags: Array<{ flagName: string; enabled: boolean; ref?: string }> = [];
    
    // Ищем все элементы Flag внутри AccountingFlags
    const childNodes = accountingFlagsElement.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType !== 1) continue;
        
        const flagElement = node as Element;
        const localName = (flagElement as any).localName || flagElement.nodeName.split(':').pop() || flagElement.nodeName;
        
        if (localName === 'Flag') {
            // Извлекаем ref атрибут - это полное имя признака учета
            const refAttr = flagElement.getAttribute('ref');
            if (!refAttr) continue;
            
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
function parseExtDimensionTypesTable(extDimensionTypesElement: Element): Array<{ 
    dimensionType: string; 
    turnoverOnly: boolean; 
    flags: Record<string, { enabled: boolean; ref?: string }>;
    name?: string; // Полное имя вида субконто
}> {
    const dimensionTypes: Array<{ 
        dimensionType: string; 
        turnoverOnly: boolean; 
        flags: Record<string, { enabled: boolean; ref?: string }>;
        name?: string;
    }> = [];
    
    // Ищем все элементы ExtDimensionType внутри ExtDimensionTypes
    const childNodes = extDimensionTypesElement.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType !== 1) continue;
        
        const dimTypeElement = node as Element;
        const localName = (dimTypeElement as any).localName || dimTypeElement.nodeName.split(':').pop() || dimTypeElement.nodeName;
        
        if (localName === 'ExtDimensionType') {
            // Извлекаем name из атрибута - это полное имя вида субконто
            const nameAttr = dimTypeElement.getAttribute('name');
            if (!nameAttr) continue;
            
            // Извлекаем короткое имя из полного пути (последняя часть после последней точки)
            const dimensionType = nameAttr.split('.').pop() || nameAttr;
            
            let turnoverOnly = false;
            const flags: Record<string, { enabled: boolean; ref?: string }> = {};
            
            // Парсим дочерние элементы ExtDimensionType
            const dimTypeChildren = dimTypeElement.childNodes;
            for (let j = 0; j < dimTypeChildren.length; j++) {
                const childNode = dimTypeChildren[j];
                if (childNode.nodeType !== 1) continue;
                
                const childElement = childNode as Element;
                const childLocalName = (childElement as any).localName || childElement.nodeName.split(':').pop() || childElement.nodeName;
                const childTextContent = childElement.textContent || '';
                
                if (childLocalName === 'Turnover') {
                    turnoverOnly = childTextContent.toLowerCase() === 'true' || childTextContent === '1';
                } else if (childLocalName === 'AccountingFlags') {
                    // Парсим вложенные Flag элементы
                    const flagsChildren = childElement.childNodes;
                    for (let k = 0; k < flagsChildren.length; k++) {
                        const flagNode = flagsChildren[k];
                        if (flagNode.nodeType !== 1) continue;
                        
                        const flagElement = flagNode as Element;
                        const flagLocalName = (flagElement as any).localName || flagElement.nodeName.split(':').pop() || flagElement.nodeName;
                        
                        if (flagLocalName === 'Flag') {
                            // Извлекаем ref атрибут - это полное имя признака учета
                            const refAttr = flagElement.getAttribute('ref');
                            if (!refAttr) continue;
                            
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


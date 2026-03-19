/**
 * Утилиты для работы с XML через xmldom
 * 
 * xmldom предоставляет DOM API для работы с XML, что позволяет
 * точно сохранять структуру элементов и атрибутов
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { randomUUID } from 'crypto';
import type { ParsedMetadataObject } from '../xmlParsers/metadataParser';
import type { ParsedFormFull, FormAttribute, FormCommand, FormItem } from '../xmlParsers/formParser';

/**
 * Форматирует XML строку с отступами и переводами строк
 */
export function formatXml(xml: string): string {
    // Улучшенное форматирование: минимизируем лишние переносы строк
    // Удаляем все существующие переносы и пробелы между тегами
    xml = xml.replace(/>\s+</g, '><');
    xml = xml.replace(/>\s+/g, '>');
    xml = xml.replace(/\s+</g, '<');
    
    let formatted = '';
    let indent = 0;
    const tab = '\t';
    let i = 0;
    let inText = false;
    let textStart = 0;
    const tagStack: Array<{ name: string; hasChildren: boolean; startPos: number }> = [];
    
    while (i < xml.length) {
        if (xml[i] === '<') {
            // Если был текст, добавляем его на той же строке
            if (inText && i > textStart) {
                const text = xml.substring(textStart, i).trim();
                if (text) {
                    formatted += text;
                }
                inText = false;
            }
            
            // Проверяем, закрывающий ли это тег
            if (xml[i + 1] === '/') {
                // Закрывающий тег
                const tagEnd = xml.indexOf('>', i);
                if (tagEnd === -1) break;
                
                const closeTagName = xml.substring(i + 2, tagEnd);
                
                // Проверяем, есть ли соответствующий открывающий тег в стеке
                if (tagStack.length > 0) {
                    const lastTag = tagStack[tagStack.length - 1];
                    if (lastTag.name === closeTagName && !lastTag.hasChildren) {
                        // Это закрывающий тег для простого элемента (без вложенных тегов)
                        // Добавляем закрывающий тег на той же строке
                        formatted += xml.substring(i, tagEnd + 1);
                        tagStack.pop();
                        indent = Math.max(0, indent - 1);
                        i = tagEnd + 1;
                        continue;
                    }
                }
                
                // Обычный закрывающий тег (с вложенными элементами)
                indent = Math.max(0, indent - 1);
                formatted += '\n' + tab.repeat(indent);
                formatted += xml.substring(i, tagEnd + 1);
                if (tagStack.length > 0) {
                    tagStack.pop();
                }
                i = tagEnd + 1;
            } else if (xml[i + 1] === '?') {
                // XML декларация <?xml ...?>
                const tagEnd = xml.indexOf('?>', i);
                if (tagEnd === -1) break;
                formatted += xml.substring(i, tagEnd + 2);
                i = tagEnd + 2;
            } else {
                // Открывающий тег
                if (formatted && formatted[formatted.length - 1] !== '\n') {
                    formatted += '\n' + tab.repeat(indent);
                }
                
                // Находим конец тега
                const tagEnd = xml.indexOf('>', i);
                if (tagEnd === -1) break;
                
                const tagContent = xml.substring(i + 1, tagEnd);
                
                // Проверяем, самозакрывающийся ли это тег
                if (tagContent.endsWith('/') || tagContent.includes('xsi:nil="true"')) {
                    formatted += xml.substring(i, tagEnd + 1);
                    i = tagEnd + 1;
                } else {
                    // Извлекаем полное имя тега (включая namespace, до пробела или конца)
                    // Например: "xr:Item", "NumberType", "v8:Type"
                    const tagNameMatch = tagContent.match(/^([^\s]+)/);
                    const tagName = tagNameMatch ? tagNameMatch[1] : '';
                    
                    // Помечаем последний тег в стеке как имеющий дочерние элементы
                    if (tagStack.length > 0) {
                        tagStack[tagStack.length - 1].hasChildren = true;
                    }
                    
                    // Добавляем новый тег в стек
                    tagStack.push({ name: tagName, hasChildren: false, startPos: formatted.length });
                    
                    formatted += xml.substring(i, tagEnd + 1);
                    indent++;
                    i = tagEnd + 1;
                    // Следующий символ может быть текстом
                    if (i < xml.length && xml[i] !== '<') {
                        inText = true;
                        textStart = i;
                    }
                }
            }
        } else {
            if (!inText) {
                inText = true;
                textStart = i;
            }
            i++;
        }
    }
    
    // Добавляем оставшийся текст
    if (inText && i > textStart) {
        const text = xml.substring(textStart, i).trim();
        if (text) {
            formatted += text;
        }
    }
    
    return formatted;
}

/**
 * Применяет изменения к XML строке используя xmldom
 * 
 * @param originalXml - исходная XML строка
 * @param obj - объект с изменениями
 * @param xmlObjectType - тип объекта метаданных (например, 'Constant')
 * @returns обновленная XML строка
 */
export function applyChangesToXmlStringWithDom(
    originalXml: string,
    obj: ParsedMetadataObject,
    xmlObjectType: string
): string {
    console.log('[applyChangesToXmlStringWithDom] Начало обработки XML через xmldom');
    
    // Удаляем BOM если есть
    let cleanXml = originalXml;
    if (cleanXml.charCodeAt(0) === 0xfeff) {
        cleanXml = cleanXml.slice(1);
    }

    // Парсим XML
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
        console.error('[applyChangesToXmlStringWithDom] Ошибка парсинга XML:', error);
        throw new Error(`Не удалось распарсить XML: ${error}`);
    }

    // Проверяем ошибки парсинга
    const parserError = doc.getElementsByTagName('parsererror')[0];
    if (parserError) {
        const errorText = parserError.textContent || 'Unknown parsing error';
        throw new Error(`XML parsing error: ${errorText}`);
    }

    // Находим элемент объекта метаданных
    const metaDataObject = doc.documentElement;
    if (!metaDataObject || metaDataObject.nodeName !== 'MetaDataObject') {
        throw new Error('Не найден корневой элемент MetaDataObject');
    }

    // Находим элемент типа объекта (например, Constant)
    const objElements = metaDataObject.getElementsByTagName(xmlObjectType);
    if (objElements.length === 0) {
        throw new Error(`Объект типа ${xmlObjectType} не найден в XML`);
    }

    const objElement = objElements[0];

    // Применяем изменения к Properties
    if (obj.properties) {
        applyPropertiesChangesWithDom(objElement, obj.properties);
    }

    // Применяем изменения к атрибутам, табличным частям и признакам учета.
    // ВАЖНО: если передан массив (даже пустой) — считаем его "источником истины" и синхронизируем (в т.ч. удаляем).
    // Если поле не передано (undefined) — ничего не делаем, чтобы не удалить случайно все дочерние объекты.
    if (obj.attributes !== undefined || obj.tabularSections !== undefined || obj.accountingFlags !== undefined || obj.extDimensionAccountingFlags !== undefined) {
        applyChildObjectsChangesWithDom(
            objElement, 
            obj.attributes, 
            obj.tabularSections,
            obj.accountingFlags,
            obj.extDimensionAccountingFlags
        );
    }

    // Применяем изменения к значениям перечисления (только для Enum)
    if (xmlObjectType === 'Enum' && obj.enumValues !== undefined) {
        applyEnumValuesChangesWithDom(objElement, obj.enumValues);
    }

    // Сериализуем обратно в XML
    const serializer = new XMLSerializer();
    let updatedXml = serializer.serializeToString(doc);
    
    // ВАЖНО: не форматируем XML целиком. Это меняет текстовые поля (например QueryText) и ломает сравнение структуры.

    return updatedXml;
}

/**
 * Применяет изменения к Properties используя DOM
 */
function applyPropertiesChangesWithDom(objElement: Element, properties: Record<string, any>): void {
    // Находим или создаем элемент Properties
    let propertiesElement = objElement.getElementsByTagName('Properties')[0];
    
    if (!propertiesElement) {
        // Создаем Properties если его нет
        propertiesElement = objElement.ownerDocument!.createElement('Properties');
        objElement.appendChild(propertiesElement);
    }

    // Применяем изменения к каждому свойству
    for (const [key, value] of Object.entries(properties)) {
        if (value === undefined || value === null) {
            continue;
        }

        // Специальная обработка для StandardAttributes
        // ВАЖНО: нельзя пересобирать StandardAttributes с нуля, иначе будут потеряны теги,
        // которые UI не показывает/не редактирует (в эталоне Untitled-1 они должны сохраняться).
        // Поэтому здесь делаем "merge": обновляем/добавляем только те поля, которые реально пришли в formData,
        // а остальное оставляем как в исходном XML.
        if (key === 'StandardAttributes' && Array.isArray(value)) {
            const XR_NS = 'http://v8.1c.ru/8.3/xcf/readable';

            // Находим или создаем элемент StandardAttributes
            let standardAttrsElement = propertiesElement.getElementsByTagName('StandardAttributes')[0];
            if (!standardAttrsElement) {
                standardAttrsElement = objElement.ownerDocument!.createElement('StandardAttributes');
                propertiesElement.appendChild(standardAttrsElement);
            }

            const findExistingStandardAttribute = (name: string): Element | null => {
                const list = (standardAttrsElement as any).getElementsByTagNameNS
                    ? (standardAttrsElement as any).getElementsByTagNameNS(XR_NS, 'StandardAttribute')
                    : standardAttrsElement.getElementsByTagName('xr:StandardAttribute');
                for (let i = 0; i < list.length; i++) {
                    const el = list[i] as Element;
                    if (el && el.getAttribute && el.getAttribute('name') === name) {
                        return el;
                    }
                }
                return null;
            };

            const findDirectChildXr = (parent: Element, localName: string): Element | null => {
                const nodes = (parent as any).childNodes || [];
                for (let i = 0; i < nodes.length; i++) {
                    const n = nodes[i];
                    if (!n || n.nodeType !== 1) continue;
                    const e = n as Element;
                    const ln = (e as any).localName || e.tagName;
                    if (ln === localName || e.tagName === `xr:${localName}`) {
                        return e;
                    }
                }
                return null;
            };

            for (const attrRaw of value) {
                if (typeof attrRaw !== 'object' || attrRaw === null) continue;

                // В UI/парсере может приходить как плоский объект или обертка
                const attr: any = (attrRaw as any)['xr:StandardAttribute'] || (attrRaw as any).StandardAttribute || attrRaw;
                const attrName = String(attr.name ?? attr.Name ?? (attr as any)['@name'] ?? '').trim();
                if (!attrName) continue;

                let attrElement = findExistingStandardAttribute(attrName);
                if (!attrElement) {
                    attrElement = objElement.ownerDocument!.createElementNS(XR_NS, 'xr:StandardAttribute');
                    attrElement.setAttribute('name', attrName);
                    standardAttrsElement.appendChild(attrElement);
                }

                for (const [propKey, propValue] of Object.entries(attr)) {
                    if (propKey === 'name' || propKey === 'Name' || propKey === 'StandardAttribute' || propKey === 'xr:StandardAttribute' || propKey === '@name') {
                        continue;
                    }
                    if (propValue === undefined) {
                        // undefined означает "не трогать"
                        continue;
                    }

                    // ВАЖНО: ключи могут приходить уже с префиксами (например, "xr:FillChecking").
                    // Если добавить префикс повторно, получим невалидные теги вида "xr:xr:FillChecking".
                    const propLocalName = propKey.includes(':') ? propKey.split(':').pop()! : propKey;

                    let propElement = findDirectChildXr(attrElement, propLocalName);
                    if (!propElement) {
                        propElement = objElement.ownerDocument!.createElementNS(XR_NS, `xr:${propLocalName}`);
                        attrElement.appendChild(propElement);
                    }

                    setPropertyValueWithDom(propElement, propValue);
                }
            }

            continue;
        }
        
        // Специальная обработка для RegisterRecords
        if (key === 'RegisterRecords' && Array.isArray(value)) {
            // Находим или создаем элемент RegisterRecords
            let registerRecordsElement = propertiesElement.getElementsByTagName('RegisterRecords')[0];
            if (!registerRecordsElement) {
                registerRecordsElement = objElement.ownerDocument!.createElement('RegisterRecords');
                propertiesElement.appendChild(registerRecordsElement);
            } else {
                // Очищаем существующие элементы
                while (registerRecordsElement.firstChild) {
                    registerRecordsElement.removeChild(registerRecordsElement.firstChild);
                }
            }
            
            // Создаем элементы xr:Item для каждого элемента массива
            for (const item of value) {
                if (typeof item === 'object' && item !== null) {
                    const itemElement = objElement.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.3/xcf/readable',
                        'xr:Item'
                    );
                    
                    // Обрабатываем структуру Item
                    const itemData = item.Item || item['xr:Item'];
                    let itemType = 'xr:MDObjectRef'; // Значение по умолчанию
                    let itemText = '';
                    
                    if (typeof itemData === 'object' && itemData !== null) {
                        // Устанавливаем атрибут xsi:type если есть, иначе используем значение по умолчанию
                        if (itemData.type) {
                            itemType = String(itemData.type);
                        }
                        itemElement.setAttributeNS(
                            'http://www.w3.org/2001/XMLSchema-instance',
                            'xsi:type',
                            itemType
                        );
                        
                        // Устанавливаем текстовое содержимое
                        if (itemData.text !== undefined) {
                            itemText = String(itemData.text);
                        } else if (itemData['#text'] !== undefined) {
                            itemText = String(itemData['#text']);
                        } else {
                            itemText = String(itemData);
                        }
                    } else if (itemData !== undefined) {
                        // Если itemData - это строка, устанавливаем атрибут по умолчанию
                        itemElement.setAttributeNS(
                            'http://www.w3.org/2001/XMLSchema-instance',
                            'xsi:type',
                            itemType
                        );
                        itemText = String(itemData);
                    }
                    
                    itemElement.textContent = itemText;
                    registerRecordsElement.appendChild(itemElement);
                } else if (item !== undefined && item !== null) {
                    // Если item - это строка напрямую, устанавливаем атрибут по умолчанию
                    const itemElement = objElement.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.3/xcf/readable',
                        'xr:Item'
                    );
                    itemElement.setAttributeNS(
                        'http://www.w3.org/2001/XMLSchema-instance',
                        'xsi:type',
                        'xr:MDObjectRef'
                    );
                    itemElement.textContent = String(item);
                    registerRecordsElement.appendChild(itemElement);
                }
            }
            continue;
        }
        
        // Пропускаем tabularSections - они обрабатываются отдельно через applyChildObjectsChangesWithDom
        if (key === 'tabularSections' || key === 'attributes') {
            continue;
        }
        // StandardTabularSections (виды субконто и т.п.) имеет сложную структуру xr:StandardTabularSection с name-атрибутом.
        // Перезапись из formData ломает её (name становится дочерним тегом). Сохраняем из исходного XML.
        if (key === 'StandardTabularSections') {
            continue;
        }

        // Находим существующий элемент свойства
        const existingElements = propertiesElement.getElementsByTagName(key);
        let propertyElement: Element;

        if (existingElements.length > 0) {
            propertyElement = existingElements[0];
        } else {
            // Создаем новый элемент свойства
            propertyElement = objElement.ownerDocument!.createElement(key);
            propertiesElement.appendChild(propertyElement);
        }

        // Устанавливаем значение свойства
        setPropertyValueWithDom(propertyElement, value);
    }
}

/**
 * Устанавливает значение свойства в DOM элемент
 */
function setPropertyValueWithDom(element: Element, value: any): void {
    // Очищаем существующее содержимое
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }

    // КРИТИЧНО: элемент <Type> имеет особую структуру в 1С.
    // Нельзя записывать объект как текст (JSON), нужно всегда разложить в:
    // - <v8:Type>...</v8:Type> (в т.ч. несколько раз для составных типов)
    // - <v8:TypeSet>...</v8:TypeSet> (для определяемых типов)
    // - квалификаторы (<v8:DateQualifiers>, <v8:StringQualifiers>, <v8:NumberQualifiers>)
    if (element.tagName === 'Type') {
        const doc = element.ownerDocument!;

        const asText = (v: any): string => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'string') return v;
            if (typeof v === 'number' || typeof v === 'boolean') return String(v);
            if (typeof v === 'object') {
                if ('#text' in v) return String((v as any)['#text']);
                if ('text' in v) return String((v as any).text);
            }
            return String(v);
        };

        const appendV8 = (tag: 'Type' | 'TypeSet', text: string) => {
            const el = doc.createElementNS('http://v8.1c.ru/8.1/data/core', `v8:${tag}`);
            el.textContent = text;
            element.appendChild(el);
        };

        const appendQualifiers = (qualKey: string, qualValue: any) => {
            const cleanKey = qualKey.startsWith('v8:') ? qualKey.substring(3) : qualKey;
            const qEl = doc.createElementNS('http://v8.1c.ru/8.1/data/core', `v8:${cleanKey}`);
            if (qualValue && typeof qualValue === 'object' && !Array.isArray(qualValue)) {
                for (const [nestedKey, nestedValue] of Object.entries(qualValue)) {
                    const cleanNested = nestedKey.startsWith('v8:') ? nestedKey.substring(3) : nestedKey;
                    const nEl = doc.createElementNS('http://v8.1c.ru/8.1/data/core', `v8:${cleanNested}`);
                    nEl.textContent = asText(nestedValue);
                    qEl.appendChild(nEl);
                }
            } else if (qualValue !== undefined && qualValue !== null) {
                qEl.textContent = asText(qualValue);
            }
            element.appendChild(qEl);
        };

        // Если пришла строка (в т.ч. JSON-строка) — пробуем распарсить, иначе считаем это типом
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(value);
                    setPropertyValueWithDom(element, parsed);
                    return;
                } catch (e) {
                    // ignore
                }
            }
            appendV8('Type', value);
            return;
        }

        if (value && typeof value === 'object') {
            // Определяемый тип
            const typeSetValue = (value as any)['v8:TypeSet'] ?? (value as any).TypeSet;
            if (typeSetValue !== undefined) {
                appendV8('TypeSet', asText(typeSetValue));
                return;
            }

            // Обычный/составной тип
            const typesValue = (value as any)['v8:Type'] ?? (value as any).Type;
            if (typesValue !== undefined) {
                if (Array.isArray(typesValue)) {
                    for (const t of typesValue) {
                        // Составной тип может приходить как массив строк ИЛИ как массив объектов:
                        // [{ Type: 'xs:decimal', NumberQualifiers: {...} }, ...] (как в TypeWidget)
                        if (t && typeof t === 'object' && !Array.isArray(t)) {
                            const tAny = t as any;

                            // Определяемый тип внутри составного
                            const innerTypeSet = tAny['v8:TypeSet'] ?? tAny.TypeSet;
                            if (innerTypeSet !== undefined) {
                                appendV8('TypeSet', asText(innerTypeSet));
                            } else {
                                const innerType = tAny['v8:Type'] ?? tAny.Type;
                                appendV8('Type', asText(innerType !== undefined ? innerType : tAny));
                            }

                            // Квалификаторы на уровне конкретного typeItem
                            const perItemQualifiersKeys = [
                                'v8:StringQualifiers', 'StringQualifiers',
                                'v8:NumberQualifiers', 'NumberQualifiers',
                                'v8:DateQualifiers', 'DateQualifiers'
                            ];
                            for (const qk of perItemQualifiersKeys) {
                                if (qk in tAny) {
                                    appendQualifiers(qk, tAny[qk]);
                                }
                            }

                            continue;
                        }

                        appendV8('Type', asText(t));
                    }
                } else {
                    appendV8('Type', asText(typesValue));
                }
            }

            // Квалификаторы (могут быть с v8: или без)
            const qualifiersKeys = [
                'v8:StringQualifiers', 'StringQualifiers',
                'v8:NumberQualifiers', 'NumberQualifiers',
                'v8:DateQualifiers', 'DateQualifiers'
            ];
            for (const qk of qualifiersKeys) {
                if (qk in (value as any)) {
                    appendQualifiers(qk, (value as any)[qk]);
                }
            }

            return;
        }

        // fallback
        appendV8('Type', asText(value));
        return;
    }

    // Универсальная поддержка структуры fast-xml-parser для элементов с атрибутом xsi:type:
    // формат часто выглядит как { text: "...", type: "xs:string" } или { "#text": "...", type: "xr:MDObjectRef" }.
    // Нельзя сериализовать это как <text>...</text><type>...</type> — должно быть xsi:type атрибутом.
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const vAny = value as any;
        const hasType = 'type' in vAny && (typeof vAny.type === 'string' || typeof vAny.type === 'object');
        const hasText = ('text' in vAny) || ('#text' in vAny);
        const keys = Object.keys(vAny);
        const onlyTypeAndText =
            keys.every(k => k === 'type' || k === 'text' || k === '#text') ||
            (keys.length === 1 && keys[0] === 'type');

        if (hasType && onlyTypeAndText) {
            const typeVal = typeof vAny.type === 'object' && vAny.type !== null && '#text' in vAny.type
                ? String(vAny.type['#text'])
                : String(vAny.type);
            element.setAttributeNS(
                'http://www.w3.org/2001/XMLSchema-instance',
                'xsi:type',
                typeVal
            );

            if (hasText) {
                const textVal = ('text' in vAny) ? vAny.text : vAny['#text'];
                if (textVal !== undefined && textVal !== null) {
                    element.textContent = String(textVal);
                }
            }
            return;
        }
    }

    if (typeof value === 'string') {
        // Проверяем, не является ли это JSON-строкой (для сложных структур)
        if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(value);
                // Если успешно распарсили, обрабатываем как объект
                setPropertyValueWithDom(element, parsed);
                return;
            } catch (e) {
                // Если не JSON, обрабатываем как обычную строку
            }
        }
        // Простое текстовое значение
        element.textContent = value;
    } else if (Array.isArray(value)) {
        // Массив значений
        for (const item of value) {
            if (typeof item === 'object' && item !== null) {
                // Проверяем специальные случаи для RegisterRecords и подобных
                if ('Item' in item || 'xr:Item' in item) {
                    // Для RegisterRecords: <xr:Item xsi:type="xr:MDObjectRef">...</xr:Item>
                    const itemElement = element.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.3/xcf/readable',
                        'xr:Item'
                    );
                    const itemData = (item as any).Item || (item as any)['xr:Item'];
                    let itemType = 'xr:MDObjectRef'; // Значение по умолчанию
                    let itemText = '';
                    
                    if (typeof itemData === 'object' && itemData !== null) {
                        // Устанавливаем атрибут xsi:type если есть, иначе используем значение по умолчанию
                        if (itemData.type) {
                            itemType = String(itemData.type);
                        }
                        itemElement.setAttributeNS(
                            'http://www.w3.org/2001/XMLSchema-instance',
                            'xsi:type',
                            itemType
                        );
                        
                        if (itemData.text !== undefined) {
                            itemText = String(itemData.text);
                        } else {
                            itemText = String(itemData);
                        }
                    } else {
                        // Если itemData - это строка, устанавливаем атрибут по умолчанию
                        itemElement.setAttributeNS(
                            'http://www.w3.org/2001/XMLSchema-instance',
                            'xsi:type',
                            itemType
                        );
                        itemText = String(itemData);
                    }
                    
                    itemElement.textContent = itemText;
                    element.appendChild(itemElement);
                } else if (item.lang || item.content) {
                    // Для многоязычных свойств: <v8:item><v8:lang>...</v8:lang><v8:content>...</v8:content></v8:item>
                    const childElement = element.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.1/data/core',
                        'v8:item'
                    );
                    if (item.lang !== undefined) {
                        const langElement = element.ownerDocument!.createElementNS(
                            'http://v8.1c.ru/8.1/data/core',
                            'v8:lang'
                        );
                        langElement.textContent = String(item.lang);
                        childElement.appendChild(langElement);
                    }
                    if (item.content !== undefined) {
                        const contentElement = element.ownerDocument!.createElementNS(
                            'http://v8.1c.ru/8.1/data/core',
                            'v8:content'
                        );
                        contentElement.textContent = String(item.content);
                        childElement.appendChild(contentElement);
                    }
                    element.appendChild(childElement);
                } else if (item.name && typeof item === 'object') {
                    // Для StandardAttributes и подобных структур с name
                    // Это не должно обрабатываться здесь, но на всякий случай
                    const childElement = element.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.1/data/core',
                        'v8:item'
                    );
                    setPropertyValueWithDom(childElement, item);
                    element.appendChild(childElement);
                } else {
                    // Общий случай для объектов в массиве
                    const childElement = element.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.1/data/core',
                        'v8:item'
                    );
                    setPropertyValueWithDom(childElement, item);
                    element.appendChild(childElement);
                }
            } else {
                // Простое значение в массиве
                const itemElement = element.ownerDocument!.createElementNS(
                    'http://v8.1c.ru/8.1/data/core',
                    'v8:item'
                );
                itemElement.textContent = String(item);
                element.appendChild(itemElement);
            }
        }
    } else if (typeof value === 'object' && value !== null) {
        // Fast-xml-parser иногда отдаёт простое текстовое содержимое как объект вида { text: "..." } или { "#text": "..." }.
        // Для таких случаев это должен быть текстовый узел текущего элемента, а не дочерний <text>.
        const valueKeys = Object.keys(value as any);
        if (valueKeys.length === 1 && (valueKeys[0] === 'text' || valueKeys[0] === '#text')) {
            const t = (value as any)[valueKeys[0]];
            if (t !== undefined && t !== null) {
                element.textContent = String(t);
            }
            return;
        }

        // Проверяем специальные случаи для объектов с xsi:nil
        // Может быть в формате { _xsiNil: true } или { nil: true } / { nil: "true" }
        if (('_xsiNil' in value && (value as any)._xsiNil === true) ||
            ('nil' in value && (((value as any).nil === true) || ((value as any).nil === 'true')) && Object.keys(value).length === 1)) {
            // Для элементов с xsi:nil="true" создаем пустой элемент с атрибутом
            element.setAttributeNS(
                'http://www.w3.org/2001/XMLSchema-instance',
                'xsi:nil',
                'true'
            );
            return;
        }
        
        // Сложный объект - рекурсивно создаем структуру
        for (const [childKey, childValue] of Object.entries(value)) {
            // Пропускаем служебные ключи
            if (childKey === '_xsiNil' || childKey === '_value') {
                continue;
            }

            // Атрибуты xsi:* должны оставаться атрибутами, а не превращаться в дочерние теги.
            if (childKey === 'xsi:nil') {
                element.setAttributeNS(
                    'http://www.w3.org/2001/XMLSchema-instance',
                    'xsi:nil',
                    String(childValue)
                );
                continue;
            }
            if (childKey === 'xsi:type') {
                element.setAttributeNS(
                    'http://www.w3.org/2001/XMLSchema-instance',
                    'xsi:type',
                    String(childValue)
                );
                continue;
            }

            // fast-xml-parser кладёт текст узла в ключ "text" / "#text".
            // Это НЕ дочерний <text>, а textContent текущего элемента.
            if (childKey === 'text' || childKey === '#text') {
                if (childValue !== undefined && childValue !== null) {
                    element.textContent = String(childValue);
                }
                continue;
            }

            // fast-xml-parser кладёт xsi:type как ключ "type".
            // Это НЕ дочерний <type>, а атрибут xsi:type.
            if (childKey === 'type') {
                element.setAttributeNS(
                    'http://www.w3.org/2001/XMLSchema-instance',
                    'xsi:type',
                    String(childValue)
                );
                continue;
            }

            // Атрибуты некоторых xr:* элементов (в эталоне это именно атрибуты, не дочерние теги)
            // Например: <xr:CharacteristicTypes from="...">...</xr:CharacteristicTypes>
            if (childKey === 'from') {
                const ln = (element as any).localName || element.tagName;
                if (ln === 'CharacteristicTypes' || ln === 'CharacteristicValues') {
                    element.setAttribute('from', String(childValue));
                    continue;
                }
            }

            // Повторяющиеся теги с namespace обычно приходят как массив под ключом вида "xr:Something".
            // Их нельзя прокидывать как массив в setPropertyValueWithDom, иначе массив будет сериализован в v8:item.
            if (Array.isArray(childValue) && (childKey.startsWith('xr:') || childKey.startsWith('v8:') || childKey.startsWith('app:'))) {
                const ns = childKey.startsWith('xr:')
                    ? 'http://v8.1c.ru/8.3/xcf/readable'
                    : childKey.startsWith('v8:')
                        ? 'http://v8.1c.ru/8.1/data/core'
                        : 'http://v8.1c.ru/8.2/managed-application/core';

                for (const arrItem of childValue) {
                    const repeatedEl = element.ownerDocument!.createElementNS(ns, childKey);
                    setPropertyValueWithDom(repeatedEl, arrItem);
                    element.appendChild(repeatedEl);
                }
                continue;
            }

            const elementLocalName = (element as any).localName || element.tagName;
            const elementNs = (element as any).namespaceURI || element.namespaceURI;

            // Маппинг значений перечислений для совместимости с разными версиями схем XML 1С.
            // В частности, в некоторых конфигурациях NumberPeriodicity ожидает Year/Quarter/Month/Day,
            // а значение WithinMonth приводит к ошибке сборки CF ("Неверное значение перечисления").
            if (elementLocalName === 'NumberPeriodicity' && typeof childValue === 'string') {
                const v = childValue.trim();
                const map: Record<string, string> = {
                    WithinYear: 'Year',
                    WithinQuarter: 'Quarter',
                    WithinMonth: 'Month'
                };
                const mapped = map[v] || v;
                element.appendChild(element.ownerDocument!.createTextNode(mapped));
                continue;
            }

            // app:item в ChoiceParameters хранит "name" как атрибут, не как дочерний тег.
            // Эталон: <app:item name="Отбор.ВАрхиве">...</app:item>
            if (elementLocalName === 'item' && elementNs === 'http://v8.1c.ru/8.2/managed-application/core' && (childKey === 'name' || childKey === '@name')) {
                element.setAttribute('name', String(childValue));
                continue;
            }

            // InputByString должен содержать несколько xr:Field (как в эталоне), даже если в данных пришёл ключ "Field".
            // Field может быть массивом строк — создаём по одному xr:Field на каждый элемент, не v8:item.
            if (elementLocalName === 'InputByString' && childKey === 'Field') {
                const XR_NS = 'http://v8.1c.ru/8.3/xcf/readable';
                const items = Array.isArray(childValue) ? childValue : [childValue];
                for (const it of items) {
                    const fieldEl = element.ownerDocument!.createElementNS(XR_NS, 'xr:Field');
                    if (typeof it === 'string') {
                        fieldEl.textContent = it;
                    } else if (it && typeof it === 'object' && ('#text' in it || 'text' in it)) {
                        fieldEl.textContent = String((it as any)['#text'] ?? (it as any).text ?? '');
                    } else {
                        setPropertyValueWithDom(fieldEl, it);
                    }
                    element.appendChild(fieldEl);
                }
                continue;
            }
            
            // Обрабатываем специальные случаи ПЕРЕД созданием элемента
            if (childKey === 'Link') {
                // Для ChoiceParameterLinks: <xr:Link><xr:Name>...</xr:Name><xr:DataPath>...</xr:DataPath>...</xr:Link>
                const linkElement = element.ownerDocument!.createElementNS(
                    'http://v8.1c.ru/8.3/xcf/readable',
                    'xr:Link'
                );
                setComplexXmlStructure(linkElement, childValue, 'xr');
                element.appendChild(linkElement);
                continue;
            } else if (childKey === 'Type') {
                // Для Type: <Type><v8:Type>...</v8:Type><v8:DateQualifiers>...</v8:DateQualifiers></Type>
                // Или для составных типов: <Type><v8:Type>...</v8:Type><v8:Type>...</v8:Type></Type>
                // Создаем элемент без namespace (обычный элемент)
                const typeElement = element.ownerDocument!.createElement('Type');
                
                // Проверяем, не является ли это старой структурой OneOf/TypeSet
                // Если childValue - это объект с OneOf и TypeSet, преобразуем в новую структуру
                if (typeof childValue === 'object' && childValue !== null && !Array.isArray(childValue)) {
                    if ('OneOf' in childValue || 'TypeSet' in childValue || (childValue as any).Type === 'OneOf') {
                        // Старая структура OneOf/TypeSet - преобразуем в новую
                        let typesArray: any[] = [];
                        
                        if ((childValue as any).Type === 'OneOf' && 'TypeSet' in childValue) {
                            // Структура: { Type: "OneOf", TypeSet: [...] }
                            const typeSet = (childValue as any).TypeSet;
                            if (Array.isArray(typeSet)) {
                                typesArray = typeSet.map((item: any) => {
                                    if (typeof item === 'object' && item !== null) {
                                        if ('Type' in item || 'v8:Type' in item) {
                                            const typeStr = item.Type || item['v8:Type'];
                                            // Если это объект с #text, извлекаем текст
                                            const cleanType = typeof typeStr === 'object' && typeStr !== null && '#text' in typeStr 
                                                ? typeStr['#text'] 
                                                : typeStr;
                                            return { Type: String(cleanType) };
                                        }
                                        return item;
                                    }
                                    return { Type: String(item) };
                                });
                            } else if (typeSet) {
                                typesArray = [{ Type: String(typeSet) }];
                            }
                        } else if ('OneOf' in childValue && typeof (childValue as any).OneOf === 'object') {
                            // Структура: { OneOf: { Type: [...] } }
                            const oneOfTypes = (childValue as any).OneOf.Type;
                            if (Array.isArray(oneOfTypes)) {
                                typesArray = oneOfTypes.map((item: any) => {
                                    if (typeof item === 'object' && item !== null) {
                                        if ('Type' in item || 'v8:Type' in item) {
                                            const typeStr = item.Type || item['v8:Type'];
                                            const cleanType = typeof typeStr === 'object' && typeStr !== null && '#text' in typeStr 
                                                ? typeStr['#text'] 
                                                : typeStr;
                                            return { Type: String(cleanType) };
                                        }
                                        return item;
                                    }
                                    return { Type: String(item) };
                                });
                            }
                        }
                        
                        // Создаем множественные v8:Type элементы
                        for (const typeItem of typesArray) {
                            const v8TypeElement = typeElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.1/data/core',
                                'v8:Type'
                            );
                            if (typeof typeItem === 'object' && typeItem !== null && 'Type' in typeItem) {
                                v8TypeElement.textContent = String(typeItem.Type);
                            } else {
                                v8TypeElement.textContent = String(typeItem);
                            }
                            typeElement.appendChild(v8TypeElement);
                        }
                        
                        element.appendChild(typeElement);
                        continue;
                    }
                }
                
                // childValue может быть:
                // 1. Массивом строк: ["xs:string", "xs:decimal"] - составной тип
                // 2. Объектом: { Type: "..." } или { Type: ["...", "..."] } или { Type: "...", DateQualifiers: {...} }
                // 3. Строкой: "xs:string" - простой тип
                
                if (Array.isArray(childValue)) {
                    // Составной тип - массив типов напрямую
                    // Может быть массив строк или массив объектов с типом и квалификаторами
                    for (const typeItem of childValue) {
                        if (typeof typeItem === 'object' && typeItem !== null) {
                            // Объект с типом и квалификаторами: { Type: "xs:string", StringQualifiers: {...} }
                            const v8TypeElement = typeElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.1/data/core',
                                'v8:Type'
                            );
                            if ('Type' in typeItem) {
                                v8TypeElement.textContent = String(typeItem.Type);
                            } else {
                                v8TypeElement.textContent = String(typeItem);
                            }
                            typeElement.appendChild(v8TypeElement);
                            
                            // Добавляем квалификаторы если есть
                            for (const [qualKey, qualValue] of Object.entries(typeItem)) {
                                if (qualKey === 'Type') continue;
                                // Убираем префикс v8: если он уже есть
                                const cleanQualKey = qualKey.startsWith('v8:') ? qualKey.substring(3) : qualKey;
                                const qualElement = typeElement.ownerDocument!.createElementNS(
                                    'http://v8.1c.ru/8.1/data/core',
                                    `v8:${cleanQualKey}`
                                );
                                if (typeof qualValue === 'object' && qualValue !== null && !Array.isArray(qualValue)) {
                                    // Вложенные квалификаторы
                                    for (const [nestedKey, nestedValue] of Object.entries(qualValue)) {
                                        // Убираем префикс v8: если он уже есть
                                        const cleanNestedKey = nestedKey.startsWith('v8:') ? nestedKey.substring(3) : nestedKey;
                                        const nestedElement = qualElement.ownerDocument!.createElementNS(
                                            'http://v8.1c.ru/8.1/data/core',
                                            `v8:${cleanNestedKey}`
                                        );
                                        nestedElement.textContent = String(nestedValue);
                                        qualElement.appendChild(nestedElement);
                                    }
                                } else {
                                    qualElement.textContent = String(qualValue);
                                }
                                typeElement.appendChild(qualElement);
                            }
                        } else {
                            // Простая строка
                            const v8Element = typeElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.1/data/core',
                                'v8:Type'
                            );
                            v8Element.textContent = String(typeItem);
                            typeElement.appendChild(v8Element);
                        }
                    }
                } else if (typeof childValue === 'object' && childValue !== null) {
                    // Объект: может быть { Type: "..." } или { Type: ["...", "..."] } или { Type: "...", DateQualifiers: {...} }
                    // Или { TypeSet: "..." } для определяемых типов
                    // Сначала проверяем TypeSet (определяемый тип)
                    if ('TypeSet' in childValue || 'v8:TypeSet' in childValue) {
                        const typeSetValue = (childValue as any).TypeSet || (childValue as any)['v8:TypeSet'];
                        const typeSetElement = typeElement.ownerDocument!.createElementNS(
                            'http://v8.1c.ru/8.1/data/core',
                            'v8:TypeSet'
                        );
                        if (typeof typeSetValue === 'object' && typeSetValue !== null && '#text' in typeSetValue) {
                            typeSetElement.textContent = String((typeSetValue as any)['#text']);
                        } else {
                            typeSetElement.textContent = String(typeSetValue);
                        }
                        typeElement.appendChild(typeSetElement);
                        element.appendChild(typeElement);
                        continue;
                    }
                    // Затем обрабатываем Type (может быть массивом для составных типов)
                    if ('Type' in childValue) {
                        const typeValue = (childValue as any).Type;
                        if (Array.isArray(typeValue)) {
                            // Составной тип - несколько элементов v8:Type
                            // Может быть массив строк или массив объектов
                            for (const typeItem of typeValue) {
                                if (typeof typeItem === 'object' && typeItem !== null) {
                                    // Объект с типом и квалификаторами
                                    const v8TypeElement = typeElement.ownerDocument!.createElementNS(
                                        'http://v8.1c.ru/8.1/data/core',
                                        'v8:Type'
                                    );
                                    if ('Type' in typeItem) {
                                        v8TypeElement.textContent = String(typeItem.Type);
                                    } else {
                                        v8TypeElement.textContent = String(typeItem);
                                    }
                                    typeElement.appendChild(v8TypeElement);
                                    
                                    // Добавляем квалификаторы
                                    for (const [qualKey, qualValue] of Object.entries(typeItem)) {
                                        if (qualKey === 'Type') continue;
                                        // Убираем префикс v8: если он уже есть
                                        const cleanQualKey = qualKey.startsWith('v8:') ? qualKey.substring(3) : qualKey;
                                        const qualElement = typeElement.ownerDocument!.createElementNS(
                                            'http://v8.1c.ru/8.1/data/core',
                                            `v8:${cleanQualKey}`
                                        );
                                        if (typeof qualValue === 'object' && qualValue !== null && !Array.isArray(qualValue)) {
                                            for (const [nestedKey, nestedValue] of Object.entries(qualValue)) {
                                                // Убираем префикс v8: если он уже есть
                                                const cleanNestedKey = nestedKey.startsWith('v8:') ? nestedKey.substring(3) : nestedKey;
                                                const nestedElement = qualElement.ownerDocument!.createElementNS(
                                                    'http://v8.1c.ru/8.1/data/core',
                                                    `v8:${cleanNestedKey}`
                                                );
                                                nestedElement.textContent = String(nestedValue);
                                                qualElement.appendChild(nestedElement);
                                            }
                                        } else {
                                            qualElement.textContent = String(qualValue);
                                        }
                                        typeElement.appendChild(qualElement);
                                    }
                                } else {
                                    // Простая строка
                                    const v8Element = typeElement.ownerDocument!.createElementNS(
                                        'http://v8.1c.ru/8.1/data/core',
                                        'v8:Type'
                                    );
                                    v8Element.textContent = String(typeItem);
                                    typeElement.appendChild(v8Element);
                                }
                            }
                        } else {
                            // Одиночный тип
                            const v8Element = typeElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.1/data/core',
                                'v8:Type'
                            );
                            v8Element.textContent = String(typeValue);
                            typeElement.appendChild(v8Element);
                        }
                    }
                    // Затем обрабатываем остальные свойства (DateQualifiers, NumberQualifiers и т.д.)
                    // Но только если Type не был массивом (для составных типов квалификаторы добавляются к каждому типу отдельно)
                    if (!('Type' in childValue && Array.isArray((childValue as any).Type))) {
                        for (const [typeKey, typeValue] of Object.entries(childValue)) {
                            // Пропускаем Type, так как он уже обработан
                            if (typeKey === 'Type') {
                                continue;
                            }
                            // Все дочерние элементы Type должны быть с namespace v8:
                            const v8Element = typeElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.1/data/core',
                                `v8:${typeKey}`
                            );
                            if (typeof typeValue === 'object' && typeValue !== null && !Array.isArray(typeValue)) {
                                // Рекурсивно обрабатываем вложенные объекты (например, DateQualifiers, NumberQualifiers)
                                // Все вложенные элементы также должны быть с namespace v8:
                                for (const [nestedKey, nestedValue] of Object.entries(typeValue)) {
                                    const nestedElement = v8Element.ownerDocument!.createElementNS(
                                        'http://v8.1c.ru/8.1/data/core',
                                        `v8:${nestedKey}`
                                    );
                                    if (typeof nestedValue === 'object' && nestedValue !== null && !Array.isArray(nestedValue)) {
                                        // Еще один уровень вложенности (например, NumberQualifiers)
                                        for (const [deepKey, deepValue] of Object.entries(nestedValue)) {
                                            const deepElement = nestedElement.ownerDocument!.createElementNS(
                                                'http://v8.1c.ru/8.1/data/core',
                                                `v8:${deepKey}`
                                            );
                                            deepElement.textContent = String(deepValue);
                                            nestedElement.appendChild(deepElement);
                                        }
                                    } else {
                                        nestedElement.textContent = String(nestedValue);
                                    }
                                    v8Element.appendChild(nestedElement);
                                }
                            } else {
                                v8Element.textContent = String(typeValue);
                            }
                            typeElement.appendChild(v8Element);
                        }
                    }
                } else {
                    // Простая строка - одиночный тип
                    const v8Element = typeElement.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.1/data/core',
                        'v8:Type'
                    );
                    v8Element.textContent = String(childValue);
                    typeElement.appendChild(v8Element);
                }
                element.appendChild(typeElement);
                continue;
            } else if (childKey === 'TypeSet' || childKey === 'v8:TypeSet') {
                // TypeSet - это определяемый тип, например cfg:DefinedType.КонтактВзаимодействия
                // Обрабатываем как обычное свойство с namespace v8:
                const cleanKey = childKey.startsWith('v8:') ? childKey.substring(3) : childKey;
                const v8Element = element.ownerDocument!.createElementNS(
                    'http://v8.1c.ru/8.1/data/core',
                    `v8:${cleanKey}`
                );
                if (typeof childValue === 'object' && childValue !== null && '#text' in childValue) {
                    v8Element.textContent = String((childValue as any)['#text']);
                } else {
                    v8Element.textContent = String(childValue);
                }
                element.appendChild(v8Element);
                continue;
            } else if (childKey === 'item') {
                // Для ChoiceParameters: <app:item name="..."><app:value>...</app:value></app:item>
                // НО: если item выглядит как многоязычный v8:item (lang/content), то это НЕ app:item.
                if (typeof childValue === 'object' && childValue !== null) {
                    const cv: any = childValue as any;
                    if ('lang' in cv || 'content' in cv || 'v8:lang' in cv || 'v8:content' in cv) {
                        const v8Item = element.ownerDocument!.createElementNS(
                            'http://v8.1c.ru/8.1/data/core',
                            'v8:item'
                        );
                        setPropertyValueWithDom(v8Item, childValue);
                        element.appendChild(v8Item);
                        continue;
                    }
                }
                if (typeof childValue === 'object' && childValue !== null) {
                    if (Array.isArray(childValue)) {
                        // Массив элементов
                        for (const item of childValue) {
                            const itemElement = element.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.2/managed-application/core',
                                'app:item'
                            );
                            if (item && typeof item === 'object' && 'name' in item) {
                                itemElement.setAttribute('name', String(item.name));
                            }
                            if (item && typeof item === 'object' && 'value' in item) {
                                const valueElement = itemElement.ownerDocument!.createElementNS(
                                    'http://v8.1c.ru/8.2/managed-application/core',
                                    'app:value'
                                );
                                const val = (item as any).value;
                                if (typeof val === 'object' && val !== null && 'text' in val && 'type' in val) {
                                    valueElement.setAttributeNS(
                                        'http://www.w3.org/2001/XMLSchema-instance',
                                        'xsi:type',
                                        String(val.type)
                                    );
                                    valueElement.textContent = String(val.text);
                                } else {
                                    valueElement.textContent = String(val);
                                }
                                itemElement.appendChild(valueElement);
                            }
                            element.appendChild(itemElement);
                        }
                        continue;
                    } else {
                        // Один элемент
                        const itemElement = element.ownerDocument!.createElementNS(
                            'http://v8.1c.ru/8.2/managed-application/core',
                            'app:item'
                        );
                        if ('name' in childValue) {
                            itemElement.setAttribute('name', String(childValue.name));
                        }
                        if ('value' in childValue) {
                            const valueElement = itemElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.2/managed-application/core',
                                'app:value'
                            );
                            const val = (childValue as any).value;
                            if (typeof val === 'object' && val !== null && 'text' in val && 'type' in val) {
                                valueElement.setAttributeNS(
                                    'http://www.w3.org/2001/XMLSchema-instance',
                                    'xsi:type',
                                    String(val.type)
                                );
                                valueElement.textContent = String(val.text);
                            } else {
                                valueElement.textContent = String(val);
                            }
                            itemElement.appendChild(valueElement);
                        }
                        element.appendChild(itemElement);
                        continue;
                    }
                }
            }
            
            // Для всех остальных случаев создаем элемент
            let childElement: Element;
            if (childKey.startsWith('xr:')) {
                childElement = element.ownerDocument!.createElementNS(
                    'http://v8.1c.ru/8.3/xcf/readable',
                    childKey
                );
            } else if (childKey.startsWith('app:')) {
                childElement = element.ownerDocument!.createElementNS(
                    'http://v8.1c.ru/8.2/managed-application/core',
                    childKey
                );
            } else if (childKey.startsWith('v8:')) {
                childElement = element.ownerDocument!.createElementNS(
                    'http://v8.1c.ru/8.1/data/core',
                    childKey
                );
            } else {
                childElement = element.ownerDocument!.createElement(childKey);
            }
            setPropertyValueWithDom(childElement, childValue);
            element.appendChild(childElement);
        }
    } else {
        // Примитивное значение
        element.textContent = String(value);
    }
}

/**
 * Устанавливает сложную XML структуру с учетом namespaces
 */
function setComplexXmlStructure(element: Element, value: any, defaultNamespace?: string): void {
    if (typeof value === 'string') {
        element.textContent = value;
    } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
            for (const item of value) {
                setComplexXmlStructure(element, item, defaultNamespace);
            }
        } else {
            for (const [key, val] of Object.entries(value)) {
                let childElement: Element;
                
                // Определяем namespace
                if (key.startsWith('xr:')) {
                    childElement = element.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.3/xcf/readable',
                        key
                    );
                } else if (key.startsWith('app:')) {
                    childElement = element.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.2/managed-application/core',
                        key
                    );
                } else if (key.startsWith('v8:')) {
                    childElement = element.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.1/data/core',
                        key
                    );
                } else if (defaultNamespace === 'xr') {
                    childElement = element.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.3/xcf/readable',
                        `xr:${key}`
                    );
                } else if (defaultNamespace === 'app') {
                    childElement = element.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.2/managed-application/core',
                        `app:${key}`
                    );
                } else if (defaultNamespace === 'v8') {
                    childElement = element.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.1/data/core',
                        `v8:${key}`
                    );
                } else {
                    childElement = element.ownerDocument!.createElement(key);
                }
                
                // Обрабатываем специальные случаи
                if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    if ('text' in val && 'type' in val) {
                        // Элемент с text и type (например, DataPath)
                        const valType = (val as any).type;
                        const valText = (val as any).text;
                        if (valType) {
                            childElement.setAttributeNS(
                                'http://www.w3.org/2001/XMLSchema-instance',
                                'xsi:type',
                                String(valType)
                            );
                        }
                        childElement.textContent = String(valText);
                    } else {
                        setComplexXmlStructure(childElement, val, defaultNamespace);
                    }
                } else {
                    setComplexXmlStructure(childElement, val, defaultNamespace);
                }
                
                element.appendChild(childElement);
            }
        }
    } else {
        element.textContent = String(value);
    }
}

/**
 * Применяет изменения к значениям перечисления (EnumValue) для типа Enum
 */
function applyEnumValuesChangesWithDom(objElement: Element, enumValues: any[]): void {
    let childObjectsElement = objElement.getElementsByTagName('ChildObjects')[0];
    if (!childObjectsElement) {
        childObjectsElement = objElement.ownerDocument!.createElement('ChildObjects');
        objElement.appendChild(childObjectsElement);
    }

    function getDirectChildrenByTag(parent: Element, tagName: string): Element[] {
        const res: Element[] = [];
        for (let i = 0; i < parent.childNodes.length; i++) {
            const n = parent.childNodes[i];
            if (n.nodeType === 1 && (n as Element).tagName === tagName) {
                res.push(n as Element);
            }
        }
        return res;
    }

    function getNameFromProps(el: Element): string | null {
        const propsEl = el.getElementsByTagName('Properties')[0];
        if (propsEl) {
            const nameEl = propsEl.getElementsByTagName('Name')[0];
            return nameEl?.textContent || null;
        }
        return null;
    }

    const items = Array.isArray(enumValues) ? enumValues : [];
    const keepUuids = new Set<string>();
    const keepNames = new Set<string>();
    for (const v of items) {
        if (v?.uuid) keepUuids.add(String(v.uuid));
        if (v?.name) keepNames.add(String(v.name));
    }

    const existing = getDirectChildrenByTag(childObjectsElement, 'EnumValue');
    for (const el of existing) {
        const uuid = el.getAttribute('uuid');
        const name = getNameFromProps(el);
        const shouldKeep =
            items.length > 0 &&
            ((uuid && keepUuids.has(uuid)) || (name && keepNames.has(name)));
        if (!shouldKeep) {
            childObjectsElement.removeChild(el);
        }
    }

    const V8_NS = 'http://v8.1c.ru/8.1/data/core';
    for (const item of items) {
        if (!item?.name) continue;

        let enumValEl: Element | null = null;
        if (item.uuid) {
            for (const el of getDirectChildrenByTag(childObjectsElement, 'EnumValue')) {
                if (el.getAttribute('uuid') === String(item.uuid)) {
                    enumValEl = el;
                    break;
                }
            }
        }
        if (!enumValEl) {
            for (const el of getDirectChildrenByTag(childObjectsElement, 'EnumValue')) {
                if (getNameFromProps(el) === item.name) {
                    enumValEl = el;
                    break;
                }
            }
        }

        if (!enumValEl) {
            enumValEl = objElement.ownerDocument!.createElement('EnumValue');
            enumValEl.setAttribute('uuid', item.uuid ? String(item.uuid) : randomUUID());
            childObjectsElement.appendChild(enumValEl);
        }

        let propsEl = enumValEl.getElementsByTagName('Properties')[0];
        if (!propsEl) {
            propsEl = enumValEl.ownerDocument!.createElement('Properties');
            enumValEl.appendChild(propsEl);
        }

        const setOrCreateChild = (parent: Element, tagName: string, value: any) => {
            let el = parent.getElementsByTagName(tagName)[0];
            if (!el) {
                el = parent.ownerDocument!.createElement(tagName);
                parent.appendChild(el);
            }
            if (value !== undefined && value !== null) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    setComplexXmlStructure(el, value, '');
                } else {
                    el.textContent = String(value);
                }
            }
        };

        setOrCreateChild(propsEl, 'Name', item.name);
        const props = item.properties || {};
        const synonym = props.Synonym ?? props.synonym;
        if (synonym !== undefined && synonym !== null && (typeof synonym === 'object' || typeof synonym === 'string')) {
            setOrCreateChild(propsEl, 'Synonym', synonym);
        } else {
            setOrCreateChild(propsEl, 'Synonym', {
                'v8:item': { 'v8:lang': 'ru', 'v8:content': String(item.name) }
            });
        }
        const comment = props.Comment ?? props.comment ?? '';
        setOrCreateChild(propsEl, 'Comment', comment !== undefined && comment !== null ? comment : '');
    }
}

/**
 * Применяет изменения к ChildObjects (атрибуты, табличные части, признаки учета)
 */
function applyChildObjectsChangesWithDom(
    objElement: Element,
    attributes?: any[],
    tabularSections?: any[],
    accountingFlags?: any[],
    extDimensionAccountingFlags?: any[]
): void {
    // Находим или создаем элемент ChildObjects
    let childObjectsElement = objElement.getElementsByTagName('ChildObjects')[0];
    
    if (!childObjectsElement) {
        childObjectsElement = objElement.ownerDocument!.createElement('ChildObjects');
        objElement.appendChild(childObjectsElement);
    }

    /**
     * Возвращает прямых детей-элементы заданного тега (без поиска по дереву),
     * чтобы не затрагивать Attribute внутри TabularSection и т.п.
     */
    function getDirectChildrenByTag(parent: Element, tagName: string): Element[] {
        const res: Element[] = [];
        for (let i = 0; i < parent.childNodes.length; i++) {
            const n = parent.childNodes[i];
            if (n.nodeType === 1 && (n as Element).tagName === tagName) {
                res.push(n as Element);
            }
        }
        return res;
    }

    function getNameFromProperties(containerEl: Element): string | null {
        const propsEl = containerEl.getElementsByTagName('Properties')[0];
        if (propsEl) {
            const nameEl = propsEl.getElementsByTagName('Name')[0];
            if (nameEl?.textContent) return nameEl.textContent;
        }
        const nameEl = containerEl.getElementsByTagName('Name')[0];
        return nameEl?.textContent || null;
    }

    function syncAndApplyTopLevel(tagName: 'Attribute' | 'Resource' | 'Dimension' | 'AccountingFlag' | 'ExtDimensionAccountingFlag', items: any[]): void {
        const keepUuids = new Set<string>();
        const keepNames = new Set<string>();
        for (const a of items) {
            if (!a) continue;
            if (a.uuid) keepUuids.add(String(a.uuid));
            if (a.name) keepNames.add(String(a.name));
        }

        const existingEls = getDirectChildrenByTag(childObjectsElement, tagName);
        for (const el of existingEls) {
            const uuid = el.getAttribute('uuid');
            const name = getNameFromProperties(el);
            const shouldKeep =
                (uuid && keepUuids.size > 0 && keepUuids.has(uuid)) ||
                (name && keepNames.has(name)) ||
                (uuid && keepUuids.size === 0 && name && keepNames.has(name));

            if (!shouldKeep) {
                childObjectsElement.removeChild(el);
            }
        }

        for (const item of items) {
            applyChildObjectItemChangesWithDom(childObjectsElement, item, tagName);
        }
    }

    // 1) Синхронизация (удаление/обновление/создание) верхнеуровневых дочерних объектов.
    //    ВАЖНО: для регистров в ChildObjects есть Resource/Dimension — их нельзя смешивать с Attribute.
    if (attributes !== undefined) {
        const all = Array.isArray(attributes) ? attributes : [];

        const attrs = all.filter((a: any) => !a?.childObjectKind || a.childObjectKind === 'Attribute');
        const resources = all.filter((a: any) => a?.childObjectKind === 'Resource');
        const dimensions = all.filter((a: any) => a?.childObjectKind === 'Dimension');

        syncAndApplyTopLevel('Attribute', attrs);
        syncAndApplyTopLevel('Resource', resources);
        syncAndApplyTopLevel('Dimension', dimensions);
    }

    // 2) Синхронизация (удаление) табличных частей верхнего уровня
    if (tabularSections !== undefined) {
        const keepUuids = new Set<string>();
        const keepNames = new Set<string>();
        for (const t of tabularSections) {
            if (!t) continue;
            if (t.uuid) keepUuids.add(String(t.uuid));
            if (t.name) keepNames.add(String(t.name));
        }

        const existingTsEls = getDirectChildrenByTag(childObjectsElement, 'TabularSection');
        for (const el of existingTsEls) {
            const uuid = el.getAttribute('uuid');
            const name = getNameFromProperties(el);
            const shouldKeep =
                (uuid && keepUuids.size > 0 && keepUuids.has(uuid)) ||
                (name && keepNames.has(name)) ||
                (uuid && keepUuids.size === 0 && name && keepNames.has(name));

            if (!shouldKeep) {
                childObjectsElement.removeChild(el);
            }
        }

        // Применяем изменения к табличным частям (создание/обновление + синхронизация реквизитов ТЧ внутри)
        for (const ts of tabularSections) {
            applyTabularSectionChangesWithDom(childObjectsElement, ts);
        }
    }

    // 3) Синхронизация признаков учета по счетам (AccountingFlag)
    if (accountingFlags !== undefined) {
        syncAndApplyTopLevel('AccountingFlag', accountingFlags);
    }

    // 4) Синхронизация признаков учета по субконто (ExtDimensionAccountingFlag)
    if (extDimensionAccountingFlags !== undefined) {
        syncAndApplyTopLevel('ExtDimensionAccountingFlag', extDimensionAccountingFlags);
    }
}

/**
 * Применяет изменения к атрибуту
 */
/**
 * Применяет изменения к элементу ChildObjects с именем (Attribute/Resource/Dimension).
 * ВАЖНО: для Resource/Dimension структура Properties совпадает с Attribute, но теги разные.
 */
function applyNamedChildObjectChangesWithDom(
    childObjectsElement: Element,
    item: any,
    tagName: 'Attribute' | 'Resource' | 'Dimension' | 'AccountingFlag' | 'ExtDimensionAccountingFlag'
): void {
    if (!item?.name) return;

    const elements = childObjectsElement.getElementsByTagName(tagName);
    let element: Element | null = null;

    // 0) Если есть uuid — сначала ищем по нему (это надёжнее имени и работает при дублях)
    if (item.uuid) {
        const targetUuid = String(item.uuid);
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].getAttribute('uuid') === targetUuid) {
                element = elements[i];
                break;
            }
        }
    }

    for (let i = 0; i < elements.length; i++) {
        if (element) break;
        const propertiesElement = elements[i].getElementsByTagName('Properties')[0];
        if (propertiesElement) {
            const nameElement = propertiesElement.getElementsByTagName('Name')[0];
            if (nameElement && nameElement.textContent === item.name) {
                element = elements[i];
                break;
            }
        }
        // Fallback: проверяем отдельный элемент Name (для обратной совместимости)
        if (!element) {
            const nameElement = elements[i].getElementsByTagName('Name')[0];
            if (nameElement && nameElement.textContent === item.name) {
                element = elements[i];
                break;
            }
        }
    }

    if (!element) {
        element = childObjectsElement.ownerDocument!.createElement(tagName);
        element.setAttribute('uuid', item.uuid ? String(item.uuid) : randomUUID());

        // Порядок вставки важен только для Attribute (см. отдельную функцию ниже).
        // Для Resource/Dimension используем стандартное добавление.
        childObjectsElement.appendChild(element);

        const propertiesElement = element.ownerDocument!.createElement('Properties');
        element.appendChild(propertiesElement);

        const nameElement = propertiesElement.ownerDocument!.createElement('Name');
        nameElement.textContent = item.name;
        propertiesElement.appendChild(nameElement);
    }

    let propertiesElement = element.getElementsByTagName('Properties')[0];
    if (!propertiesElement) {
        propertiesElement = element.ownerDocument!.createElement('Properties');
        element.appendChild(propertiesElement);
    }

    let nameElement = propertiesElement.getElementsByTagName('Name')[0];
    if (!nameElement) {
        nameElement = propertiesElement.ownerDocument!.createElement('Name');
        nameElement.textContent = item.name;
        propertiesElement.appendChild(nameElement);
    } else if (nameElement.textContent !== item.name) {
        nameElement.textContent = item.name;
    }

    if (item.properties) {
        for (const [key, value] of Object.entries(item.properties)) {
            if (value === undefined || value === null) continue;
            if (key === 'Name') continue;

            // Специальная обработка для Type - не создаем лишний вложенный элемент
            if (key === 'Type') {
                let typeElement = propertiesElement.getElementsByTagName('Type')[0];
                if (!typeElement) {
                    typeElement = propertiesElement.ownerDocument!.createElement('Type');
                    propertiesElement.appendChild(typeElement);
                } else {
                    while (typeElement.firstChild) {
                        typeElement.removeChild(typeElement.firstChild);
                    }
                }

                if (Array.isArray(value)) {
                    for (const typeItem of value) {
                        if (typeof typeItem === 'object' && typeItem !== null) {
                            const v8TypeElement = typeElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.1/data/core',
                                'v8:Type'
                            );
                            if ('Type' in typeItem) {
                                v8TypeElement.textContent = String((typeItem as any).Type);
                            } else {
                                v8TypeElement.textContent = String(typeItem);
                            }
                            typeElement.appendChild(v8TypeElement);

                            for (const [qualKey, qualValue] of Object.entries(typeItem as any)) {
                                if (qualKey === 'Type') continue;
                                const cleanQualKey = qualKey.startsWith('v8:') ? qualKey.substring(3) : qualKey;
                                const qualElement = typeElement.ownerDocument!.createElementNS(
                                    'http://v8.1c.ru/8.1/data/core',
                                    `v8:${cleanQualKey}`
                                );
                                if (typeof qualValue === 'object' && qualValue !== null && !Array.isArray(qualValue)) {
                                    for (const [nestedKey, nestedValue] of Object.entries(qualValue as any)) {
                                        const cleanNestedKey = nestedKey.startsWith('v8:') ? nestedKey.substring(3) : nestedKey;
                                        const nestedElement = qualElement.ownerDocument!.createElementNS(
                                            'http://v8.1c.ru/8.1/data/core',
                                            `v8:${cleanNestedKey}`
                                        );
                                        nestedElement.textContent = String(nestedValue);
                                        qualElement.appendChild(nestedElement);
                                    }
                                } else {
                                    qualElement.textContent = String(qualValue);
                                }
                                typeElement.appendChild(qualElement);
                            }
                        } else {
                            const v8Element = typeElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.1/data/core',
                                'v8:Type'
                            );
                            v8Element.textContent = String(typeItem);
                            typeElement.appendChild(v8Element);
                        }
                    }
                } else if (typeof value === 'object' && value !== null) {
                    // Объект, например { kind: 'xs:string' }, { Type: '...' }, { 'v8:Type': 'xs:boolean' }
                    const v = value as any;
                    let typeKind = v.kind ?? v.Type ?? v['v8:Type'] ?? '';
                    if (typeof typeKind === 'object' && typeKind != null && ('#text' in typeKind || 'text' in typeKind)) {
                        typeKind = typeKind['#text'] ?? typeKind.text ?? '';
                    }
                    if (typeKind) {
                        const v8Element = typeElement.ownerDocument!.createElementNS(
                            'http://v8.1c.ru/8.1/data/core',
                            'v8:Type'
                        );
                        v8Element.textContent = String(typeKind);
                        typeElement.appendChild(v8Element);
                    }
                } else {
                    const v8Element = typeElement.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.1/data/core',
                        'v8:Type'
                    );
                    v8Element.textContent = String(value);
                    typeElement.appendChild(v8Element);
                }

                continue;
            }

            let propElement = propertiesElement.getElementsByTagName(key)[0];
            if (!propElement) {
                propElement = propertiesElement.ownerDocument!.createElement(key);
                propertiesElement.appendChild(propElement);
            }
            setPropertyValueWithDom(propElement, value);
        }
    }
}

function applyChildObjectItemChangesWithDom(
    childObjectsElement: Element,
    item: any,
    tagName: 'Attribute' | 'Resource' | 'Dimension' | 'AccountingFlag' | 'ExtDimensionAccountingFlag'
): void {
    if (tagName === 'Attribute') {
        applyAttributeChangesWithDom(childObjectsElement, item);
        return;
    }

    // Для AccountingFlag и ExtDimensionAccountingFlag используем ту же логику, что и для Resource/Dimension
    applyNamedChildObjectChangesWithDom(childObjectsElement, item, tagName);
}

function applyAttributeChangesWithDom(childObjectsElement: Element, attr: any): void {
    if (!attr.name) return;

    // Находим существующий атрибут
    // Имя атрибута находится в Properties.Name, а не в отдельном Name
    const attributes = childObjectsElement.getElementsByTagName('Attribute');
    let attributeElement: Element | null = null;

    // 0) Если есть uuid — сначала ищем по нему (это надёжнее имени и работает при дублях)
    if (attr.uuid) {
        const targetUuid = String(attr.uuid);
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i].getAttribute('uuid') === targetUuid) {
                attributeElement = attributes[i];
                break;
            }
        }
    }

    for (let i = 0; i < attributes.length; i++) {
        if (attributeElement) break;
        const propertiesElement = attributes[i].getElementsByTagName('Properties')[0];
        if (propertiesElement) {
            const nameElement = propertiesElement.getElementsByTagName('Name')[0];
            if (nameElement && nameElement.textContent === attr.name) {
                attributeElement = attributes[i];
                break;
            }
        }
        // Fallback: проверяем отдельный элемент Name (для обратной совместимости)
        if (!attributeElement) {
            const nameElement = attributes[i].getElementsByTagName('Name')[0];
            if (nameElement && nameElement.textContent === attr.name) {
                attributeElement = attributes[i];
                break;
            }
        }
    }

    if (!attributeElement) {
        // Создаем новый атрибут
        attributeElement = childObjectsElement.ownerDocument!.createElement('Attribute');
        // Используем uuid из данных, если он есть (чтобы можно было удалять/матчить по uuid),
        // иначе генерируем новый.
        attributeElement.setAttribute('uuid', attr.uuid ? String(attr.uuid) : randomUUID());

        // ВАЖНО: новые реквизиты должны записываться ДО тега <Form> в XML объекта.
        // Поэтому вставляем Attribute перед первым прямым дочерним элементом Form внутри ChildObjects (если он есть).
        let insertBeforeNode: ChildNode | null = null;
        for (let i = 0; i < childObjectsElement.childNodes.length; i++) {
            const n = childObjectsElement.childNodes[i];
            if (n.nodeType === 1 && (n as Element).tagName === 'Form') {
                insertBeforeNode = n as ChildNode;
                break;
            }
        }
        if (insertBeforeNode) {
            childObjectsElement.insertBefore(attributeElement, insertBeforeNode);
        } else {
            childObjectsElement.appendChild(attributeElement);
        }
        
        // Создаем элемент Properties с Name внутри для нового атрибута
        const propertiesElement = attributeElement.ownerDocument!.createElement('Properties');
        attributeElement.appendChild(propertiesElement);
        
        const nameElement = propertiesElement.ownerDocument!.createElement('Name');
        nameElement.textContent = attr.name;
        propertiesElement.appendChild(nameElement);
    }

    // Применяем свойства атрибута (создаем или находим элемент Properties)
    // Убеждаемся, что Name всегда есть в Properties
    let propertiesElement = attributeElement.getElementsByTagName('Properties')[0];
    if (!propertiesElement) {
        propertiesElement = attributeElement.ownerDocument!.createElement('Properties');
        attributeElement.appendChild(propertiesElement);
    }
    
    // Убеждаемся, что Name есть в Properties
    let nameElement = propertiesElement.getElementsByTagName('Name')[0];
    if (!nameElement) {
        nameElement = propertiesElement.ownerDocument!.createElement('Name');
        nameElement.textContent = attr.name;
        propertiesElement.appendChild(nameElement);
    } else if (nameElement.textContent !== attr.name) {
        // Обновляем имя, если оно изменилось
        nameElement.textContent = attr.name;
    }
    
    // Применяем остальные свойства
    if (attr.properties) {
        for (const [key, value] of Object.entries(attr.properties)) {
            if (value === undefined || value === null) continue;
            // Пропускаем Name, так как он уже обработан выше
            if (key === 'Name') continue;

            // Специальная обработка для Type - не создаем лишний вложенный элемент
            if (key === 'Type') {
                // Находим или создаем элемент Type внутри Properties
                let typeElement = propertiesElement.getElementsByTagName('Type')[0];
                if (!typeElement) {
                    typeElement = propertiesElement.ownerDocument!.createElement('Type');
                    propertiesElement.appendChild(typeElement);
                } else {
                    // Очищаем существующий элемент Type
                    while (typeElement.firstChild) {
                        typeElement.removeChild(typeElement.firstChild);
                    }
                }
                
                // Обрабатываем значение Type напрямую, без создания дополнительного элемента
                // value может быть: строкой, массивом, объектом с Type и квалификаторами
                if (Array.isArray(value)) {
                    // Составной тип - массив типов
                    for (const typeItem of value) {
                        if (typeof typeItem === 'object' && typeItem !== null) {
                            // Объект с типом и квалификаторами
                            const v8TypeElement = typeElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.1/data/core',
                                'v8:Type'
                            );
                            if ('Type' in typeItem) {
                                v8TypeElement.textContent = String(typeItem.Type);
                            } else {
                                v8TypeElement.textContent = String(typeItem);
                            }
                            typeElement.appendChild(v8TypeElement);
                            
                            // Добавляем квалификаторы с префиксом v8:
                            for (const [qualKey, qualValue] of Object.entries(typeItem)) {
                                if (qualKey === 'Type') continue;
                                const cleanQualKey = qualKey.startsWith('v8:') ? qualKey.substring(3) : qualKey;
                                const qualElement = typeElement.ownerDocument!.createElementNS(
                                    'http://v8.1c.ru/8.1/data/core',
                                    `v8:${cleanQualKey}`
                                );
                                if (typeof qualValue === 'object' && qualValue !== null && !Array.isArray(qualValue)) {
                                    for (const [nestedKey, nestedValue] of Object.entries(qualValue)) {
                                        const cleanNestedKey = nestedKey.startsWith('v8:') ? nestedKey.substring(3) : nestedKey;
                                        const nestedElement = qualElement.ownerDocument!.createElementNS(
                                            'http://v8.1c.ru/8.1/data/core',
                                            `v8:${cleanNestedKey}`
                                        );
                                        nestedElement.textContent = String(nestedValue);
                                        qualElement.appendChild(nestedElement);
                                    }
                                } else {
                                    qualElement.textContent = String(qualValue);
                                }
                                typeElement.appendChild(qualElement);
                            }
                        } else {
                            // Простая строка
                            const v8Element = typeElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.1/data/core',
                                'v8:Type'
                            );
                            v8Element.textContent = String(typeItem);
                            typeElement.appendChild(v8Element);
                        }
                    }
                } else if (typeof value === 'object' && value !== null) {
                    // Объект: может быть { Type: "..." } или { Type: ["...", "..."] } или { Type: "...", DateQualifiers: {...} }
                    // Проверяем на старую структуру OneOf/TypeSet
                    const valueAny = value as any;
                    if (('OneOf' in valueAny) || ('TypeSet' in valueAny) || (valueAny.Type === 'OneOf')) {
                        // Преобразуем старую структуру в новую
                        let typesArray: any[] = [];
                        if ((valueAny.Type === 'OneOf') && ('TypeSet' in valueAny)) {
                            const typeSet = valueAny.TypeSet;
                            if (Array.isArray(typeSet)) {
                                typesArray = typeSet.map((item: any) => {
                                    if (typeof item === 'object' && item !== null) {
                                        if ('Type' in item || 'v8:Type' in item) {
                                            const typeStr = item.Type || item['v8:Type'];
                                            const cleanType = typeof typeStr === 'object' && typeStr !== null && '#text' in typeStr 
                                                ? typeStr['#text'] 
                                                : typeStr;
                                            return { Type: String(cleanType) };
                                        }
                                        return item;
                                    }
                                    return { Type: String(item) };
                                });
                            }
                        }
                        // Создаем множественные v8:Type элементы
                        for (const typeItem of typesArray) {
                            const v8TypeElement = typeElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.1/data/core',
                                'v8:Type'
                            );
                            if (typeof typeItem === 'object' && typeItem !== null && 'Type' in typeItem) {
                                v8TypeElement.textContent = String(typeItem.Type);
                            } else {
                                v8TypeElement.textContent = String(typeItem);
                            }
                            typeElement.appendChild(v8TypeElement);
                        }
                    } else if ('Type' in value) {
                        const typeValue = (value as any).Type;
                        if (Array.isArray(typeValue)) {
                            // Составной тип
                            for (const typeItem of typeValue) {
                                if (typeof typeItem === 'object' && typeItem !== null) {
                                    const v8TypeElement = typeElement.ownerDocument!.createElementNS(
                                        'http://v8.1c.ru/8.1/data/core',
                                        'v8:Type'
                                    );
                                    if ('Type' in typeItem) {
                                        v8TypeElement.textContent = String(typeItem.Type);
                                    } else {
                                        v8TypeElement.textContent = String(typeItem);
                                    }
                                    typeElement.appendChild(v8TypeElement);
                                    
                                    // Добавляем квалификаторы
                                    for (const [qualKey, qualValue] of Object.entries(typeItem)) {
                                        if (qualKey === 'Type') continue;
                                        const cleanQualKey = qualKey.startsWith('v8:') ? qualKey.substring(3) : qualKey;
                                        const qualElement = typeElement.ownerDocument!.createElementNS(
                                            'http://v8.1c.ru/8.1/data/core',
                                            `v8:${cleanQualKey}`
                                        );
                                        if (typeof qualValue === 'object' && qualValue !== null && !Array.isArray(qualValue)) {
                                            for (const [nestedKey, nestedValue] of Object.entries(qualValue)) {
                                                const cleanNestedKey = nestedKey.startsWith('v8:') ? nestedKey.substring(3) : nestedKey;
                                                const nestedElement = qualElement.ownerDocument!.createElementNS(
                                                    'http://v8.1c.ru/8.1/data/core',
                                                    `v8:${cleanNestedKey}`
                                                );
                                                nestedElement.textContent = String(nestedValue);
                                                qualElement.appendChild(nestedElement);
                                            }
                                        } else {
                                            qualElement.textContent = String(qualValue);
                                        }
                                        typeElement.appendChild(qualElement);
                                    }
                                } else {
                                    const v8Element = typeElement.ownerDocument!.createElementNS(
                                        'http://v8.1c.ru/8.1/data/core',
                                        'v8:Type'
                                    );
                                    v8Element.textContent = String(typeItem);
                                    typeElement.appendChild(v8Element);
                                }
                            }
                        } else {
                            // Одиночный тип
                            const v8Element = typeElement.ownerDocument!.createElementNS(
                                'http://v8.1c.ru/8.1/data/core',
                                'v8:Type'
                            );
                            v8Element.textContent = String(typeValue);
                            typeElement.appendChild(v8Element);
                        }
                        
                        // Добавляем квалификаторы (только если Type не был массивом)
                        if (!Array.isArray(typeValue)) {
                            for (const [typeKey, typeVal] of Object.entries(value)) {
                                if (typeKey === 'Type') continue;
                                // Квалификаторы должны иметь префикс v8:
                                const cleanKey = typeKey.startsWith('v8:') ? typeKey.substring(3) : typeKey;
                                const v8Element = typeElement.ownerDocument!.createElementNS(
                                    'http://v8.1c.ru/8.1/data/core',
                                    `v8:${cleanKey}`
                                );
                                if (typeof typeVal === 'object' && typeVal !== null && !Array.isArray(typeVal)) {
                                    for (const [nestedKey, nestedValue] of Object.entries(typeVal)) {
                                        const cleanNestedKey = nestedKey.startsWith('v8:') ? nestedKey.substring(3) : nestedKey;
                                        const nestedElement = v8Element.ownerDocument!.createElementNS(
                                            'http://v8.1c.ru/8.1/data/core',
                                            `v8:${cleanNestedKey}`
                                        );
                                        nestedElement.textContent = String(nestedValue);
                                        v8Element.appendChild(nestedElement);
                                    }
                                } else {
                                    v8Element.textContent = String(typeVal);
                                }
                                typeElement.appendChild(v8Element);
                            }
                        }
                    } else {
                        // Объект без Type - обрабатываем как обычное свойство
                        setPropertyValueWithDom(typeElement, value);
                    }
                } else {
                    // Простая строка - одиночный тип
                    const v8Element = typeElement.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.1/data/core',
                        'v8:Type'
                    );
                    v8Element.textContent = String(value);
                    typeElement.appendChild(v8Element);
                }
                continue;
            }
            
            // Специальная обработка для TypeSet - должен иметь префикс v8:
            if (key === 'TypeSet' || key === 'v8:TypeSet') {
                const cleanKey = key.startsWith('v8:') ? key.substring(3) : key;
                let typeSetElement = propertiesElement.getElementsByTagNameNS('http://v8.1c.ru/8.1/data/core', 'v8:TypeSet')[0];
                if (!typeSetElement) {
                    typeSetElement = propertiesElement.ownerDocument!.createElementNS(
                        'http://v8.1c.ru/8.1/data/core',
                        'v8:TypeSet'
                    );
                    propertiesElement.appendChild(typeSetElement);
                } else {
                    typeSetElement.textContent = '';
                }
                if (typeof value === 'object' && value !== null && '#text' in value) {
                    typeSetElement.textContent = String((value as any)['#text']);
                } else {
                    typeSetElement.textContent = String(value);
                }
                continue;
            }

            let propElement = propertiesElement.getElementsByTagName(key)[0];
            if (!propElement) {
                propElement = propertiesElement.ownerDocument!.createElement(key);
                propertiesElement.appendChild(propElement);
            }
            setPropertyValueWithDom(propElement, value);
        }
    }
}

/**
 * Применяет изменения к табличной части
 */
function applyTabularSectionChangesWithDom(childObjectsElement: Element, ts: any): void {
    if (!ts.name) return;

    // Находим существующую табличную часть
    // Имя табличной части находится в Properties.Name, а не в отдельном Name
    const tabularSections = childObjectsElement.getElementsByTagName('TabularSection');
    let tsElement: Element | null = null;

    // 0) Если есть uuid — сначала ищем по нему (надёжнее имени)
    if (ts.uuid) {
        const targetUuid = String(ts.uuid);
        for (let i = 0; i < tabularSections.length; i++) {
            if (tabularSections[i].getAttribute('uuid') === targetUuid) {
                tsElement = tabularSections[i];
                break;
            }
        }
    }

    for (let i = 0; i < tabularSections.length; i++) {
        if (tsElement) break;
        const propertiesElement = tabularSections[i].getElementsByTagName('Properties')[0];
        if (propertiesElement) {
            const nameElement = propertiesElement.getElementsByTagName('Name')[0];
            if (nameElement && nameElement.textContent === ts.name) {
                tsElement = tabularSections[i];
                break;
            }
        }
        // Fallback: проверяем отдельный элемент Name (для обратной совместимости)
        if (!tsElement) {
            const nameElement = tabularSections[i].getElementsByTagName('Name')[0];
            if (nameElement && nameElement.textContent === ts.name) {
                tsElement = tabularSections[i];
                break;
            }
        }
    }

    if (!tsElement) {
        // Создаем новую табличную часть
        tsElement = childObjectsElement.ownerDocument!.createElement('TabularSection');
        // Используем uuid из данных, если он есть, иначе генерируем новый
        tsElement.setAttribute('uuid', ts.uuid ? String(ts.uuid) : randomUUID());

        // ВАЖНО: новые табличные части должны записываться ДО тега <Template> в XML объекта.
        // Поэтому вставляем TabularSection перед первым прямым дочерним элементом Template внутри ChildObjects (если он есть).
        let insertBeforeNode: ChildNode | null = null;
        for (let i = 0; i < childObjectsElement.childNodes.length; i++) {
            const n = childObjectsElement.childNodes[i];
            if (n.nodeType === 1 && (n as Element).tagName === 'Template') {
                insertBeforeNode = n as ChildNode;
                break;
            }
        }
        if (insertBeforeNode) {
            childObjectsElement.insertBefore(tsElement, insertBeforeNode);
        } else {
            childObjectsElement.appendChild(tsElement);
        }
        
        // Создаем элемент InternalInfo для новой табличной части (должен быть первым)
        const internalInfoElement = tsElement.ownerDocument!.createElement('InternalInfo');
        
        // Получаем имя объекта и его тип из родительского элемента
        // childObjectsElement находится внутри объекта метаданных, нужно найти его и его Properties.Name
        let objectName = 'Object';
        let objectType = 'Document'; // По умолчанию Document
        let parentElement: Element | null = childObjectsElement.parentElement;
        
        // Маппинг типов объектов на префиксы для GeneratedType
        const objectTypeMap: Record<string, string> = {
            'Document': 'Document',
            'Catalog': 'Catalog',
            'InformationRegister': 'InformationRegister',
            'AccumulationRegister': 'AccumulationRegister',
            'Enum': 'Enum',
            'Characteristic': 'Characteristic',
            'BusinessProcess': 'BusinessProcess',
            'Task': 'Task',
            'ChartOfAccounts': 'ChartOfAccounts',
            'ChartOfCharacteristicTypes': 'ChartOfCharacteristicTypes',
            'ChartOfCalculationTypes': 'ChartOfCalculationTypes',
            'ExternalDataSource': 'ExternalDataSource'
        };
        
        // Ищем родительский объект метаданных (Document, Catalog и т.д.)
        // childObjectsElement находится внутри ChildObjects, который находится внутри объекта метаданных
        let searchElement: Element | null = childObjectsElement.parentElement;
        while (searchElement) {
            const tagName = searchElement.tagName;
            if (tagName in objectTypeMap) {
                objectType = tagName;
                // Ищем Properties внутри этого элемента
                const objProperties = searchElement.getElementsByTagName('Properties')[0];
                if (objProperties) {
                    const objNameElement = objProperties.getElementsByTagName('Name')[0];
                    if (objNameElement && objNameElement.textContent) {
                        objectName = objNameElement.textContent;
                        break;
                    }
                }
            }
            searchElement = searchElement.parentElement;
        }
        
        // Получаем префикс для типа объекта
        const typePrefix = objectTypeMap[objectType] || 'Document';
        
        // Генерируем UUID для TypeId и ValueId
        const typeId1 = randomUUID();
        const valueId1 = randomUUID();
        const typeId2 = randomUUID();
        const valueId2 = randomUUID();
        
        // Создаем xr:GeneratedType для TabularSection
        const tabularSectionTypeElement = tsElement.ownerDocument!.createElementNS(
            'http://v8.1c.ru/8.3/xcf/readable',
            'xr:GeneratedType'
        );
        const typeName = `${typePrefix}TabularSection.${objectName}.${ts.name}`;
        tabularSectionTypeElement.setAttribute('name', typeName);
        tabularSectionTypeElement.setAttribute('category', 'TabularSection');
        
        const typeIdElement = tsElement.ownerDocument!.createElementNS(
            'http://v8.1c.ru/8.3/xcf/readable',
            'xr:TypeId'
        );
        typeIdElement.textContent = typeId1;
        tabularSectionTypeElement.appendChild(typeIdElement);
        
        const valueIdElement1 = tsElement.ownerDocument!.createElementNS(
            'http://v8.1c.ru/8.3/xcf/readable',
            'xr:ValueId'
        );
        valueIdElement1.textContent = valueId1;
        tabularSectionTypeElement.appendChild(valueIdElement1);
        
        internalInfoElement.appendChild(tabularSectionTypeElement);
        
        // Создаем xr:GeneratedType для TabularSectionRow
        const tabularSectionRowTypeElement = tsElement.ownerDocument!.createElementNS(
            'http://v8.1c.ru/8.3/xcf/readable',
            'xr:GeneratedType'
        );
        const rowTypeName = `${typePrefix}TabularSectionRow.${objectName}.${ts.name}`;
        tabularSectionRowTypeElement.setAttribute('name', rowTypeName);
        tabularSectionRowTypeElement.setAttribute('category', 'TabularSectionRow');
        
        const rowTypeIdElement = tsElement.ownerDocument!.createElementNS(
            'http://v8.1c.ru/8.3/xcf/readable',
            'xr:TypeId'
        );
        rowTypeIdElement.textContent = typeId2;
        tabularSectionRowTypeElement.appendChild(rowTypeIdElement);
        
        const rowValueIdElement = tsElement.ownerDocument!.createElementNS(
            'http://v8.1c.ru/8.3/xcf/readable',
            'xr:ValueId'
        );
        rowValueIdElement.textContent = valueId2;
        tabularSectionRowTypeElement.appendChild(rowValueIdElement);
        
        internalInfoElement.appendChild(tabularSectionRowTypeElement);
        
        tsElement.appendChild(internalInfoElement);
        
        // Создаем элемент Properties с Name внутри для новой табличной части
        const propertiesElement = tsElement.ownerDocument!.createElement('Properties');
        tsElement.appendChild(propertiesElement);
        
        const nameElement = propertiesElement.ownerDocument!.createElement('Name');
        nameElement.textContent = ts.name;
        propertiesElement.appendChild(nameElement);
    }

    // Применяем свойства табличной части (создаем или находим элемент Properties)
    // Убеждаемся, что Name всегда есть в Properties
    let propertiesElement = tsElement.getElementsByTagName('Properties')[0];
    if (!propertiesElement) {
        propertiesElement = tsElement.ownerDocument!.createElement('Properties');
        tsElement.appendChild(propertiesElement);
    }
    
    // Убеждаемся, что Name есть в Properties
    let nameElement = propertiesElement.getElementsByTagName('Name')[0];
    if (!nameElement) {
        nameElement = propertiesElement.ownerDocument!.createElement('Name');
        nameElement.textContent = ts.name;
        propertiesElement.appendChild(nameElement);
    } else if (nameElement.textContent !== ts.name) {
        // Обновляем имя, если оно изменилось
        nameElement.textContent = ts.name;
    }
    
    // Применяем остальные свойства
    if (ts.properties) {
        for (const [key, value] of Object.entries(ts.properties)) {
            if (value === undefined || value === null) continue;
            // Пропускаем Name, так как он уже обработан выше
            if (key === 'Name') continue;

            let propElement = propertiesElement.getElementsByTagName(key)[0];
            if (!propElement) {
                propElement = propertiesElement.ownerDocument!.createElement(key);
                propertiesElement.appendChild(propElement);
            }
            setPropertyValueWithDom(propElement, value);
        }
    }

    // Применяем изменения к атрибутам табличной части
    // Атрибуты должны быть внутри ChildObjects внутри TabularSection
    if (ts.attributes && Array.isArray(ts.attributes)) {
        // Находим или создаем элемент ChildObjects внутри TabularSection
        // Ищем ChildObjects только внутри tsElement, а не во всем документе
        let tsChildObjectsElement: Element | null = null;
        for (let i = 0; i < tsElement.childNodes.length; i++) {
            const child = tsElement.childNodes[i];
            if (child.nodeType === 1 && (child as Element).tagName === 'ChildObjects') {
                tsChildObjectsElement = child as Element;
                break;
            }
        }
        
        if (!tsChildObjectsElement) {
            tsChildObjectsElement = tsElement.ownerDocument!.createElement('ChildObjects');
            // Вставляем ChildObjects после Properties, но перед другими элементами (если есть)
            // Находим Properties и вставляем после него
            let insertAfter: Node | null = null;
            for (let i = 0; i < tsElement.childNodes.length; i++) {
                const child = tsElement.childNodes[i];
                if (child.nodeType === 1 && (child as Element).tagName === 'Properties') {
                    insertAfter = child;
                    break;
                }
            }
            if (insertAfter && insertAfter.nextSibling) {
                tsElement.insertBefore(tsChildObjectsElement, insertAfter.nextSibling);
            } else if (insertAfter) {
                tsElement.appendChild(tsChildObjectsElement);
            } else {
                // Если Properties нет, вставляем в начало (но это не должно происходить)
                tsElement.insertBefore(tsChildObjectsElement, tsElement.firstChild);
            }
        }
        
        // Синхронизация (удаление) реквизитов табличной части по uuid/имени
        const keepUuids = new Set<string>();
        const keepNames = new Set<string>();
        for (const a of ts.attributes) {
            if (!a) continue;
            if (a.uuid) keepUuids.add(String(a.uuid));
            if (a.name) keepNames.add(String(a.name));
        }

        const existingAttrEls = [];
        for (let i = 0; i < tsChildObjectsElement.childNodes.length; i++) {
            const n = tsChildObjectsElement.childNodes[i];
            if (n.nodeType === 1 && (n as Element).tagName === 'Attribute') {
                existingAttrEls.push(n as Element);
            }
        }
        for (const el of existingAttrEls) {
            const uuid = el.getAttribute('uuid');
            const propsEl = el.getElementsByTagName('Properties')[0];
            let name: string | null = null;
            if (propsEl) {
                const nameEl = propsEl.getElementsByTagName('Name')[0];
                if (nameEl?.textContent) name = nameEl.textContent;
            }
            if (!name) {
                const nameEl = el.getElementsByTagName('Name')[0];
                name = nameEl?.textContent || null;
            }

            const shouldKeep =
                (uuid && keepUuids.size > 0 && keepUuids.has(uuid)) ||
                (name && keepNames.has(name)) ||
                (uuid && keepUuids.size === 0 && name && keepNames.has(name));

            if (!shouldKeep) {
                tsChildObjectsElement.removeChild(el);
            }
        }

        // Применяем изменения к атрибутам внутри ChildObjects (создание/обновление)
        for (const attr of ts.attributes) {
            applyAttributeChangesWithDom(tsChildObjectsElement, attr);
        }
    }
}

/**
 * Применяет изменения к XML строке формы используя xmldom
 * 
 * @param originalXml - исходная XML строка формы
 * @param formData - объект с изменениями формы
 * @returns обновленная XML строка
 */
function removeButtonsWithMissingCommands(formElement: Element, allowedCommandNames: Set<string>): void {
    // В формах 1С ссылка на команду хранится в <Button><CommandName>Form.Command.<Name></CommandName>...
    // Если команда удалена, а связанные кнопки/ссылки остались — удаляем эти Button целиком.
    if (!allowedCommandNames) return;

    const extractFormCommandName = (raw: any): string | null => {
        if (raw === undefined || raw === null) return null;
        const s = String(raw).trim();
        const m = s.match(/^Form\.Command\.(.+)$/);
        if (!m) return null;
        const name = String(m[1] || '').trim();
        return name || null;
    };

    const buttons = Array.from((formElement as any).getElementsByTagName?.('Button') || []) as Element[];
    for (const btn of buttons) {
        const cmdEl = getDirectElementChildren(btn).find((c) => (c as any).tagName === 'CommandName') || null;
        if (!cmdEl) continue;

        const cmdName = extractFormCommandName(cmdEl.textContent);
        if (!cmdName) continue; // удаляем только ссылки на Form.Command.*

        if (!allowedCommandNames.has(cmdName)) {
            const p = (btn as any).parentNode as Element | null;
            if (p) {
                p.removeChild(btn);
            }
        }
    }
}

export function applyFormChangesToXmlStringWithDom(
    originalXml: string,
    formData: ParsedFormFull
): string {
    console.log('[applyFormChangesToXmlStringWithDom] Начало обработки XML формы через xmldom');

    // Удаляем BOM если есть
    let cleanXml = originalXml;
    if (cleanXml.charCodeAt(0) === 0xfeff) {
        cleanXml = cleanXml.slice(1);
    }

    // Парсим XML
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
        console.error('[applyFormChangesToXmlStringWithDom] Ошибка парсинга XML:', error);
        throw new Error(`Не удалось распарсить XML: ${error}`);
    }

    // Проверяем ошибки парсинга
    const parserError = doc.getElementsByTagName('parsererror')[0];
    if (parserError) {
        const errorText = parserError.textContent || 'Unknown parsing error';
        throw new Error(`XML parsing error: ${errorText}`);
    }

    // Находим элемент Form
    const formElements = doc.getElementsByTagName('Form');
    if (formElements.length === 0) {
        throw new Error('Не найден корневой элемент Form');
    }

    const formElement = formElements[0];

    // Множество команд (для безопасной чистки ссылок CommandName)
    const allowedCommandNames = new Set<string>();
    if (Array.isArray(formData.commands)) {
        for (const c of formData.commands) {
            if (c && c.name) allowedCommandNames.add(String(c.name));
        }
    }

    // Применяем изменения к Properties формы (в Form.xml свойства лежат на корне, без обёртки <Properties>)
    if (formData.properties) {
        applyFormRootPropertiesChangesWithDom(formElement, formData.properties);
    }

    // Атрибуты/команды формы: применяем изменения максимально консервативно.
    // Важно: стараемся менять только то, что пришло из UI, и не трогать сложные узлы.
    if (Array.isArray(formData.attributes) && formData.attributes.length > 0) {
        applyFormAttributesChangesWithDom(formElement, formData.attributes);
    }

    if (Array.isArray(formData.commands) && formData.commands.length > 0) {
        applyFormCommandsChangesWithDom(formElement, formData.commands);
    }

    // Применяем изменения к ChildItems формы
    if (formData.childItems && formData.childItems.length > 0) {
        applyFormChildItemsChangesWithDom(formElement, formData.childItems, allowedCommandNames);
    }

    // Если команда удалена, а связанные кнопки в AutoCommandBar/других вложенных структурах остались — чистим.
    // (соответствует нажатию "Да" в предупреждении о ссылках)
    removeButtonsWithMissingCommands(formElement, allowedCommandNames);

    // Сериализуем обратно в XML
    const serializer = new XMLSerializer();
    const updatedXml = serializer.serializeToString(doc);

    // ВАЖНО: не форматируем XML целиком. Это меняет текстовые поля (например QueryText) и ломает сравнение структуры.
    return updatedXml;
}


/**
 * Применяет изменения к свойствам формы, которые являются непосредственными дочерними узлами <Form>.
 * ВАЖНО: не создаёт новых узлов и не трогает сложные структуры, чтобы сохранять исходную XML-структуру.
 */
function applyFormRootPropertiesChangesWithDom(formElement: Element, properties: Record<string, any>): void {
    const directChildren = Array.from((formElement as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];

    for (const [key, value] of Object.entries(properties || {})) {
        if (value === undefined || value === null) continue;
        const t = typeof value;
        if (t !== 'string' && t !== 'number' && t !== 'boolean') {
            continue;
        }

        const propEl = directChildren.find((el) => (el as any).tagName === key) || null;
        if (!propEl) continue;

        propEl.textContent = String(value);
    }
}

/**
 * Применяет изменения к Attributes формы
 */
function applyFormAttributesChangesWithDom(formElement: Element, attributes: FormAttribute[]): void {
    // Ищем только прямого ребёнка <Attributes>, чтобы не задеть вложенные структуры
    let attributesElement: Element | null = null;
    const directChildren = Array.from((formElement as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
    attributesElement = directChildren.find((el) => (el as any).tagName === 'Attributes') || null;

    if (!attributesElement) {
        attributesElement = formElement.ownerDocument!.createElement('Attributes');
        formElement.appendChild(attributesElement);
    }

    const existingAttrEls = Array.from((attributesElement as any).childNodes || [])
        .filter((n: any) => n && n.nodeType === 1 && (n as Element).tagName === 'Attribute') as Element[];

    const getExistingName = (el: Element): string | null => {
        const a = el.getAttribute('name');
        if (a) return String(a);
        const nameEl = (el as any).getElementsByTagName ? (el as any).getElementsByTagName('Name')[0] : null;
        const t = nameEl && nameEl.textContent ? String(nameEl.textContent) : null;
        return t && t.trim() ? t.trim() : null;
    };

    const byName = new Map<string, Element>();
    for (const el of existingAttrEls) {
        const n = getExistingName(el);
        if (n) byName.set(n, el);
    }

    const desiredNames = new Set<string>();
    for (const a of attributes) {
        if (a && a.name) desiredNames.add(String(a.name));
    }

    // Удаление отсутствующих (консервативно: список из UI считается полным)
    for (const el of existingAttrEls) {
        const n = getExistingName(el);
        if (n && !desiredNames.has(String(n))) {
            attributesElement.removeChild(el);
        }
    }

    // Создание/обновление
    for (const attr of attributes) {
        if (!attr || !attr.name) continue;
        const name = String(attr.name);

        let attrEl = byName.get(name) || null;
        const created = !attrEl;

        if (!attrEl) {
            // Минимальная безопасная структура: <Attribute name="..." />
            attrEl = formElement.ownerDocument!.createElement('Attribute');
            attrEl.setAttribute('name', name);
            attributesElement.appendChild(attrEl);
            byName.set(name, attrEl);

            // Для новых реквизитов применяем тип (если можем восстановить по модели)
            applyFormAttributeTypeWithDom(attrEl, attr, /*created*/ true);
        }

        // Применяем только примитивные свойства.
        // ВАЖНО: не создаём новые узлы для существующих реквизитов (иначе портится структура/форматирование).
        const props = attr.properties && typeof attr.properties === 'object' ? attr.properties : {};
        for (const [k, v] of Object.entries(props)) {
            if (v === undefined || v === null) continue;

            // Никогда не сериализуем служебные ключи
            if (k === '@') continue;

            // id/name должны быть атрибутами, а не вложенными <id>/<name>
            if (k === 'id' || k === 'name') {
                if (created || !attrEl.getAttribute(k)) {
                    attrEl.setAttribute(k, String(v));
                }
                continue;
            }

            // Type/Columns/Settings и прочие сложные узлы не трогаем здесь
            if (k === 'Type' || k === 'Columns' || k === 'Settings' || k === 'ListSettings') {
                continue;
            }

            // UseAlways бывает как <UseAlways><Field>...</Field></UseAlways>.
            // Если пришло примитивное значение — обновляем корректно, не превращая в текстовый узел.
            if (k === 'UseAlways') {
                applyUseAlwaysWithDom(attrEl, v, /*allowCreate*/ created);
                continue;
            }

            const t = typeof v;
            if (t !== 'string' && t !== 'number' && t !== 'boolean') continue;

            const propChildren = getDirectElementChildren(attrEl);
            const existing = propChildren.find((el) => (el as any).tagName === k) || null;

            if (!existing) {
                if (!created) continue;
                const propEl = formElement.ownerDocument!.createElement(k);
                propEl.textContent = String(v);
                attrEl.appendChild(propEl);
                continue;
            }

            existing.textContent = String(v);
        }

        // Для новых реквизитов: если тип был задан в attr.typeDisplay/attr.type (например, Число(10,2)),
        // но props его не содержат, выше мы уже попробовали применить тип.
        // Для существующих реквизитов тип не меняем (консервативно).
        if (created) {
            applyFormAttributeTypeWithDom(attrEl, attr, /*created*/ true);
        }
    }
}

/**
 * Применяет изменения к Commands формы
 */
function applyFormCommandsChangesWithDom(formElement: Element, commands: FormCommand[]): void {
    // Ищем только прямого ребёнка <Commands>
    let commandsElement: Element | null = null;
    const directChildren = Array.from((formElement as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
    commandsElement = directChildren.find((el) => (el as any).tagName === 'Commands') || null;

    if (!commandsElement) {
        commandsElement = formElement.ownerDocument!.createElement('Commands');
        formElement.appendChild(commandsElement);
    }

    const existingCmdEls = Array.from((commandsElement as any).childNodes || [])
        .filter((n: any) => n && n.nodeType === 1 && (n as Element).tagName === 'Command') as Element[];

    const getExistingName = (el: Element): string | null => {
        const a = el.getAttribute('name');
        if (a) return String(a);
        const nameEl = (el as any).getElementsByTagName ? (el as any).getElementsByTagName('Name')[0] : null;
        const t = nameEl && nameEl.textContent ? String(nameEl.textContent) : null;
        return t && t.trim() ? t.trim() : null;
    };

    const byName = new Map<string, Element>();
    for (const el of existingCmdEls) {
        const n = getExistingName(el);
        if (n) byName.set(n, el);
    }

    const desiredNames = new Set<string>();
    for (const c of commands) {
        if (c && c.name) desiredNames.add(String(c.name));
    }

    // Удаление отсутствующих
    for (const el of existingCmdEls) {
        const n = getExistingName(el);
        if (n && !desiredNames.has(String(n))) {
            commandsElement.removeChild(el);
        }
    }

    for (const cmd of commands) {
        if (!cmd || !cmd.name) continue;
        const name = String(cmd.name);

        let cmdEl = byName.get(name) || null;
        const created = !cmdEl;

        if (!cmdEl) {
            cmdEl = formElement.ownerDocument!.createElement('Command');
            cmdEl.setAttribute('name', name);
            commandsElement.appendChild(cmdEl);
            byName.set(name, cmdEl);
        }

        const props = cmd.properties && typeof cmd.properties === 'object' ? cmd.properties : {};
        for (const [k, v] of Object.entries(props)) {
            if (v === undefined || v === null) continue;

            if (k === '@') continue;

            // id/name должны быть атрибутами
            if (k === 'id' || k === 'name') {
                if (created || !cmdEl.getAttribute(k)) {
                    cmdEl.setAttribute(k, String(v));
                }
                continue;
            }

            // Только примитивы и только безопасно (не создаём новые узлы у существующих команд)
            const t = typeof v;
            if (t !== 'string' && t !== 'number' && t !== 'boolean') continue;

            const propChildren = getDirectElementChildren(cmdEl);
            const existing = propChildren.find((el) => (el as any).tagName === k) || null;

            if (!existing) {
                if (!created) continue;
                const propEl = formElement.ownerDocument!.createElement(k);
                propEl.textContent = String(v);
                cmdEl.appendChild(propEl);
                continue;
            }

            existing.textContent = String(v);
        }
    }
}

/**
 * Применяет изменения к ChildItems формы
 */

function childItemKey(tagName: string, name: string | null, id: string | null): string {
    const n = String(name || '').trim();
    const i = String(id || '').trim();
    return `${tagName}::${n}::${i}`;
}

function applyFormAttributeTypeWithDom(attrEl: Element, attr: FormAttribute, created: boolean): void {
    // Консервативно: тип задаём только при создании нового реквизита.
    if (!created) return;

    const typeValue = (attr as any)?.type ?? null;
    if (!typeValue) return;

    const existingType = getDirectElementChildren(attrEl).find((el) => (el as any).tagName === 'Type') || null;
    if (existingType) {
        // Если Type уже есть (например, пришёл из шаблона), не трогаем.
        return;
    }

    const doc = attrEl.ownerDocument!;
    const typeEl = doc.createElement('Type');
    attrEl.appendChild(typeEl);

    // ВАЖНО: используем общий сериализатор, который умеет:
    // - v8:Type / v8:TypeSet
    // - String/Number/DateQualifiers
    // - составной тип (Type: [{Type, *Qualifiers}, ...])
    setPropertyValueWithDom(typeEl, typeValue);
}

function applyUseAlwaysWithDom(ownerEl: Element, value: any, allowCreate: boolean): void {
    if (value === undefined || value === null) return;
    const t = typeof value;
    if (t !== 'string' && t !== 'number' && t !== 'boolean') return;

    const doc = ownerEl.ownerDocument!;
    const useAlwaysEl = getDirectElementChildren(ownerEl).find((el) => (el as any).tagName === 'UseAlways') || null;

    if (!useAlwaysEl) {
        if (!allowCreate) return;
        const el = doc.createElement('UseAlways');
        el.textContent = String(value);
        ownerEl.appendChild(el);
        return;
    }

    // Если <UseAlways> содержит <Field>, меняем Field.textContent, иначе — сам UseAlways.textContent
    const fieldEl = getDirectElementChildren(useAlwaysEl).find((el) => (el as any).tagName === 'Field') || null;
    if (fieldEl) {
        fieldEl.textContent = String(value);
        return;
    }

    useAlwaysEl.textContent = String(value);
}

function getDirectElementChildren(parent: Element): Element[] {
    return Array.from((parent as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
}

function findDirectChildItemsElement(parent: Element): Element | null {
    const kids = getDirectElementChildren(parent);
    return kids.find((k) => (k as any).tagName === 'ChildItems') || null;
}

function ensureDirectChildItemsElement(parent: Element): Element {
    const existing = findDirectChildItemsElement(parent);
    if (existing) return existing;
    const el = parent.ownerDocument!.createElement('ChildItems');
    parent.appendChild(el);
    return el;
}

function ensureFormItemElement(parentChildItemsEl: Element, item: FormItem): Element | null {
    const kids = getDirectElementChildren(parentChildItemsEl);
    const candidates = kids.filter((k) => (k as any).tagName === item.type);

    for (const c of candidates) {
        const nameAttr = c.getAttribute('name');
        const idAttr = c.getAttribute('id');
        if (item.name && nameAttr === item.name) return c;
        if (!item.name && item.id && idAttr === String(item.id)) return c;
        if (item.name && item.id && nameAttr === item.name && idAttr === String(item.id)) return c;
    }

    // create
    const el = parentChildItemsEl.ownerDocument!.createElement(item.type);
    if (item.name) el.setAttribute('name', String(item.name));
    if (item.id) el.setAttribute('id', String(item.id));

    // вставляем в конец (минимум сдвигов индексов)
    parentChildItemsEl.appendChild(el);
    return el;
}

function applyFormItemCreateAllowedWithDom(itemElement: Element, item: FormItem): void {
    if (!itemElement || !item) return;

    // свойства
    const props = item.properties || {};
    for (const [key, value] of Object.entries(props)) {
        if (value === undefined || value === null) continue;
        if (key === '@') continue;
        if (key === 'id' || key === 'name') continue;

        if (key === 'Title' || key === 'Caption') {
            // создадим Title/Caption, если нет
            const kids = getDirectElementChildren(itemElement);
            let titleEl = kids.find((k) => (k as any).tagName === key) || null;
            if (!titleEl) {
                titleEl = itemElement.ownerDocument!.createElement(key);
                itemElement.appendChild(titleEl);
            }

            // создадим v8:item если нет
            const titleKids = getDirectElementChildren(titleEl);
            let v8Item = titleKids.find((k) => (k as any).tagName === 'v8:item') || null;
            if (!v8Item) {
                v8Item = itemElement.ownerDocument!.createElementNS('http://v8.1c.ru/8.1/data/core', 'v8:item');
                titleEl.appendChild(v8Item);
                const langEl = itemElement.ownerDocument!.createElementNS('http://v8.1c.ru/8.1/data/core', 'v8:lang');
                langEl.textContent = 'ru';
                const contentEl = itemElement.ownerDocument!.createElementNS('http://v8.1c.ru/8.1/data/core', 'v8:content');
                contentEl.textContent = '';
                v8Item.appendChild(langEl);
                v8Item.appendChild(contentEl);
            }

            applyMultilingualTitleLikeWithDom(itemElement, key, value);
            continue;
        }

        if (key === 'Events') {
            // создадим Events если нет
            const kids = getDirectElementChildren(itemElement);
            let evEl = kids.find((k) => (k as any).tagName === 'Events') || null;
            if (!evEl) {
                evEl = itemElement.ownerDocument!.createElement('Events');
                itemElement.appendChild(evEl);
            }
            applyEventsWithDom(itemElement, value);
            continue;
        }

        if (key === 'ContextMenu' || key === 'ExtendedTooltip') {
            const kids = getDirectElementChildren(itemElement);
            let cm = kids.find((k) => (k as any).tagName === key) || null;
            if (!cm) {
                cm = itemElement.ownerDocument!.createElement(key);
                itemElement.appendChild(cm);
            }
            applyEmptyElementAttrsWithDom(itemElement, key, value);
            continue;
        }

        const t = typeof value;
        if (t !== 'string' && t !== 'number' && t !== 'boolean') continue;

        const kids = getDirectElementChildren(itemElement);
        let propEl = kids.find((k) => (k as any).tagName === key) || null;
        if (!propEl) {
            propEl = itemElement.ownerDocument!.createElement(key);
            itemElement.appendChild(propEl);
        }
        propEl.textContent = String(value);
    }

    // childItems
    if (Array.isArray(item.childItems) && item.childItems.length > 0) {
        const childItemsEl = ensureDirectChildItemsElement(itemElement);
        applyFormChildItemsListWithDom(childItemsEl, item.childItems);
    }
}

function applyFormChildItemsListWithDom(
    parentChildItemsEl: Element,
    desiredItems: FormItem[],
    allowedCommandNames?: Set<string>
): void {
    const desiredRaw = Array.isArray(desiredItems) ? desiredItems : [];

    const shouldIgnoreType = (type: string): boolean => {
        const t = String(type || '').trim();
        if (!t) return true;
        if (t.startsWith('#')) return true; // preserveOrder '#text'
        // Эти узлы не являются элементами дизайнера в <ChildItems>
        if (t === 'Unknown' || t === 'ContextMenu' || t === 'AutoCommandBar') return true;
        return false;
    };

    const extractFormCommandName = (raw: any): string | null => {
        if (raw === undefined || raw === null) return null;
        const s = String(raw).trim();
        const m = s.match(/^Form\.Command\.(.+)$/);
        if (!m) return null;
        const name = String(m[1] || '').trim();
        return name || null;
    };

    const referencesMissingFormCommand = (it: FormItem): boolean => {
        if (!allowedCommandNames) return false;
        const cmd = it?.properties ? (it as any).properties?.CommandName : undefined;
        const cmdName = extractFormCommandName(cmd);
        if (!cmdName) return false;
        return !allowedCommandNames.has(cmdName);
    };

    // 0) фильтрация "мусорных" элементов и элементов со ссылкой на удалённую Form.Command.*
    const desired = desiredRaw
        .filter((it) => it && !shouldIgnoreType(String(it.type || '')))
        .filter((it) => !referencesMissingFormCommand(it));

    // 1) remove отсутствующие + чистим существующие элементы, которые ссылаются на удалённую Form.Command.*
    const existingKids = getDirectElementChildren(parentChildItemsEl);
    const desiredKeys = new Set(
        desired.map((it) => childItemKey(it.type, it.name || null, it.id ? String(it.id) : null))
    );

    for (const el of existingKids) {
        if (allowedCommandNames) {
            const cmdEl = getDirectElementChildren(el).find((c) => (c as any).tagName === 'CommandName') || null;
            const cmdName = cmdEl ? extractFormCommandName(cmdEl.textContent) : null;
            if (cmdName && !allowedCommandNames.has(cmdName)) {
                // ВАЖНО: удаляем элемент целиком (кнопку), а не только CommandName.
                parentChildItemsEl.removeChild(el);
                continue;
            }
        }

        const tagName = (el as any).tagName;
        const key = childItemKey(tagName, el.getAttribute('name'), el.getAttribute('id'));
        if (!desiredKeys.has(key)) {
            parentChildItemsEl.removeChild(el);
        }
    }

    // 2) ensure (без принудительной перестановки существующих элементов — иначе ломается форматирование)
    for (const it of desired) {
        const key = childItemKey(it.type, it.name || null, it.id ? String(it.id) : null);
        let target: Element | null = null;

        const kidsNow = getDirectElementChildren(parentChildItemsEl);
        for (const el of kidsNow) {
            const k = childItemKey((el as any).tagName, el.getAttribute('name'), el.getAttribute('id'));
            if (k === key) {
                target = el;
                break;
            }
        }

        const created = !target;
        if (!target) {
            target = ensureFormItemElement(parentChildItemsEl, it);
        }
        if (!target) continue;

        // apply properties for created items (allowed)
        if (created) {
            applyFormItemCreateAllowedWithDom(target, it);
        }

        // apply updates (existing logic)
        applyFormItemChangesWithDom(parentChildItemsEl, it, allowedCommandNames);

        // recurse
        if (Array.isArray(it.childItems) && it.childItems.length > 0) {
            const childItemsEl = ensureDirectChildItemsElement(target);
            applyFormChildItemsListWithDom(childItemsEl, it.childItems, allowedCommandNames);
        }
    }
}

function applyFormChildItemsChangesWithDom(
    formElement: Element,
    childItems: FormItem[],
    allowedCommandNames?: Set<string>
): void {
    // ВАЖНО: берём только прямого ребёнка <ChildItems> у <Form>, не первый попавшийся в поддереве.
    let childItemsElement = findDirectChildItemsElement(formElement);

    if (!childItemsElement) {
        childItemsElement = formElement.ownerDocument!.createElement('ChildItems');
        formElement.appendChild(childItemsElement);
    }

    applyFormChildItemsListWithDom(childItemsElement, childItems, allowedCommandNames);
}

/**
 * Применяет изменения к элементу формы (рекурсивно)
 */

/**
 * Обновляет многоязычное свойство Title/Caption в форме без изменения структуры.
 * Поддерживает обновление существующих <v8:item> по lang, обновляя только <v8:content>.
 */
function applyMultilingualTitleLikeWithDom(itemElement: Element, tagName: string, value: any): void {
    // Найдём прямого ребёнка <Title>/<Caption>
    const directChildren = Array.from((itemElement as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
    const titleEl = directChildren.find((el) => (el as any).tagName === tagName) || null;
    if (!titleEl) return;

    // Собираем пары {lang, content} из разных представлений
    const pairs: Array<{ lang?: string; content?: string }> = [];

    const pushPair = (p: any) => {
        if (!p || typeof p !== 'object') return;
        const lang = p.lang ?? p['v8:lang'];
        const content = p.content ?? p['v8:content'];
        const out: any = {};
        if (lang !== undefined) out.lang = String(lang);
        if (content !== undefined) out.content = String(content);
        if (out.lang !== undefined || out.content !== undefined) pairs.push(out);
    };

    if (typeof value === 'string') {
        pairs.push({ content: value });
    } else if (value && typeof value === 'object') {
        // Частый кейс из парсера: { item: [ {lang:'ru'}, {content:'...'} ] }
        const it = (value as any).item || (value as any)['v8:item'] || (value as any).items;
        if (Array.isArray(it)) {
            // 1) если элементы уже в формате {lang, content}
            for (const el of it) {
                if (el && typeof el === 'object' && ('lang' in el || 'content' in el || 'v8:lang' in el || 'v8:content' in el)) {
                    pushPair(el);
                }
            }
            // 2) если это "плоский" массив вида [{lang},{content}] — склеим попарно
            if (pairs.length === 0) {
                for (let i = 0; i < it.length; i += 2) {
                    const a = it[i];
                    const b = it[i + 1];
                    const p: any = {};
                    if (a && typeof a === 'object') {
                        if ('lang' in a) p.lang = String((a as any).lang);
                        if ('v8:lang' in a) p.lang = String((a as any)['v8:lang']);
                        if ('content' in a) p.content = String((a as any).content);
                        if ('v8:content' in a) p.content = String((a as any)['v8:content']);
                    }
                    if (b && typeof b === 'object') {
                        if (p.lang === undefined && ('lang' in b || 'v8:lang' in b)) p.lang = String((b as any).lang ?? (b as any)['v8:lang']);
                        if (p.content === undefined && ('content' in b || 'v8:content' in b)) p.content = String((b as any).content ?? (b as any)['v8:content']);
                    }
                    if (p.lang !== undefined || p.content !== undefined) pairs.push(p);
                }
            }
        } else {
            pushPair(value);
        }
    }

    if (pairs.length === 0) return;

    // Индексация существующих <v8:item> по lang
    const items = Array.from((titleEl as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
    const v8Items = items.filter((el) => ((el as any).tagName === 'v8:item' || (el as any).localName === 'item'));

    const getDirectChildText = (parent: Element, wantedTag: string) => {
        const kids = Array.from((parent as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
        const el = kids.find((k) => (k as any).tagName === wantedTag) || null;
        return el ? (el.textContent ?? '') : '';
    };

    const findDirectChild = (parent: Element, wantedTag: string): Element | null => {
        const kids = Array.from((parent as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
        return kids.find((k) => (k as any).tagName === wantedTag) || null;
    };

    const byLang = new Map<string, Element>();
    for (const itEl of v8Items) {
        const lang = String(getDirectChildText(itEl, 'v8:lang') || '').trim().toLowerCase();
        if (lang) byLang.set(lang, itEl);
    }

    // Обновляем только content в существующих item.
    for (const p of pairs) {
        const langKey = p.lang ? String(p.lang).trim().toLowerCase() : '';
        const targetItem = langKey ? (byLang.get(langKey) || null) : (v8Items[0] || null);
        if (!targetItem) continue;

        if (p.content !== undefined) {
            const contentEl = findDirectChild(targetItem, 'v8:content');
            if (contentEl) contentEl.textContent = String(p.content);
        }
    }
}

/**
 * Обновляет Events (список <Event name="...">handler</Event>) без изменения структуры.
 * Не создаёт новые события, только обновляет текст существующих по атрибуту name.
 */
function applyEventsWithDom(itemElement: Element, value: any): void {
    const directChildren = Array.from((itemElement as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
    const eventsEl = directChildren.find((el) => (el as any).tagName === 'Events') || null;
    if (!eventsEl) return;

    const desired: Array<{ name: string; handler: string }> = [];

    const addEvent = (name: any, handler: any) => {
        const n = String(name || '').trim();
        if (!n) return;
        desired.push({ name: n, handler: String(handler ?? '') });
    };

    const parseOne = (v: any) => {
        if (!v) return;
        if (typeof v !== 'object') return;

        const at = (v as any)['@'] || (v as any)[':@'] || (v as any)['@_'] || null;
        const name = (v as any).name ?? (at ? (at.name ?? at['@_name']) : undefined);
        const handler = (v as any).Event ?? (v as any).handler ?? (v as any).text;
        if (name !== undefined) {
            addEvent(name, handler);
        }
    };

    let fullList = false;

    if (Array.isArray(value)) {
        fullList = true;
        for (const v of value) parseOne(v);
    } else if (value && typeof value === 'object') {
        // 1) single event: { Event: 'Handler', '@': { name: 'OnChange' } }
        if ('Event' in value && ('@' in value || 'name' in value)) {
            parseOne(value);
        }

        // 2) zipped arrays: { Event: [...], '@': [{name:...}, ...] }
        const ev = (value as any).Event;
        const at = (value as any)['@'];
        if (Array.isArray(ev) && Array.isArray(at)) {
            fullList = true;
            const max = Math.min(ev.length, at.length);
            for (let i = 0; i < max; i++) {
                const name = at[i]?.name ?? at[i]?.['@_name'];
                const handler = ev[i];
                addEvent(name, handler);
            }
        }
    }

    if (desired.length === 0) return;

    const eventNodes = Array.from((eventsEl as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
    const eventEls = eventNodes.filter((el) => (el as any).tagName === 'Event');

    const byName = new Map<string, Element>();
    for (const el of eventEls) {
        const nm = String(el.getAttribute('name') || '').trim();
        if (nm) byName.set(nm, el);
    }

    // update/add
    for (const e of desired) {
        const existing = byName.get(e.name) || null;
        if (existing) {
            existing.textContent = e.handler;
        } else {
            const newEl = eventsEl.ownerDocument!.createElement('Event');
            newEl.setAttribute('name', e.name);
            newEl.textContent = e.handler;
            eventsEl.appendChild(newEl);
        }
    }

    // remove (only when we know it's a full list)
    if (fullList) {
        const desiredNames = new Set(desired.map((d) => d.name));
        for (const el of eventEls) {
            const nm = String(el.getAttribute('name') || '').trim();
            if (nm && !desiredNames.has(nm)) {
                eventsEl.removeChild(el);
            }
        }
    }
}

/**
 * Обновляет атрибуты для пустых тегов ContextMenu/ExtendedTooltip (name/id), не создавая новые элементы.
 */
function applyEmptyElementAttrsWithDom(itemElement: Element, tagName: string, value: any): void {
    const directChildren = Array.from((itemElement as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
    const el = directChildren.find((c) => (c as any).tagName === tagName) || null;
    if (!el) return;

    const pick = (v: any) => {
        if (!v || typeof v !== 'object') return null;
        const name = v.name ?? v['@name'] ?? v['@_name'];
        const id = v.id ?? v['@id'] ?? v['@_id'];
        const out: any = {};
        if (name !== undefined) out.name = String(name);
        if (id !== undefined) out.id = String(id);
        return out;
    };

    let attrs = pick(value);
    if (!attrs && Array.isArray(value) && value.length > 0) attrs = pick(value[0]);
    if (!attrs) return;

    if (attrs.name !== undefined) el.setAttribute('name', attrs.name);
    if (attrs.id !== undefined) el.setAttribute('id', attrs.id);
}

function applyFormItemChangesWithDom(
    parentElement: Element,
    item: FormItem,
    allowedCommandNames?: Set<string>
): void {
    if (!item.type) return;

    const directChildren = Array.from((parentElement as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
    const candidates = directChildren.filter((el) => (el as any).tagName === item.type);

    // Находим существующий элемент только среди непосредственных детей (не по всему поддереву)
    let itemElement: Element | null = null;

    for (const existing of candidates) {
        const nameAttr = existing.getAttribute('name');
        const idAttr = existing.getAttribute('id');

        if (item.name && nameAttr === item.name) {
            itemElement = existing;
            break;
        }
        if (!itemElement && item.id && idAttr === item.id) {
            itemElement = existing;
            break;
        }
    }

    // ВАЖНО: не создаём новые элементы при сохранении, чтобы не ломать структуру.
    if (!itemElement) {
        return;
    }

    const extractFormCommandName = (raw: any): string | null => {
        if (raw === undefined || raw === null) return null;
        const s = String(raw).trim();
        const m = s.match(/^Form\.Command\.(.+)$/);
        if (!m) return null;
        const name = String(m[1] || '').trim();
        return name || null;
    };

    if (item.properties) {
        for (const [key, value] of Object.entries(item.properties)) {
            if (value === undefined || value === null) continue;

            // Спец-ключ '@' в модели форм используется как служебный (атрибуты пустых тегов и т.п.).
            // Нельзя сериализовать его как <@> — это ломает XML.
            if (key === '@') continue;

            // name/id в модели дублируются: держим как атрибуты элемента.
            if (key === 'id' || key === 'name') {
                itemElement.setAttribute(key, String(value));
                continue;
            }

            // Если команда удалена, то связанные кнопки должны удаляться целиком.
            if (key === 'CommandName' && allowedCommandNames && typeof value === 'string') {
                const cmdName = extractFormCommandName(value);

                if (cmdName && !allowedCommandNames.has(cmdName)) {
                    // Удаляем весь элемент (обычно <Button>) из родителя.
                    // Это соответствует подтверждению удаления ссылок в UI.
                    parentElement.removeChild(itemElement);
                    return;
                }

                // иначе — падаем ниже в стандартное обновление, но только если узел существует
            }

            // Сложные свойства: обновляем точечно, без пересборки структуры.
            if (key === 'Title' || key === 'Caption') {
                applyMultilingualTitleLikeWithDom(itemElement, key, value);
                continue;
            }
            if (key === 'Events') {
                applyEventsWithDom(itemElement, value);
                continue;
            }
            if (key === 'ContextMenu' || key === 'ExtendedTooltip') {
                applyEmptyElementAttrsWithDom(itemElement, key, value);
                continue;
            }

            // Только примитивы для прочих свойств.
            const t = typeof value;
            if (t !== 'string' && t !== 'number' && t !== 'boolean') {
                continue;
            }

            // Обновляем существующий элемент-свойство, не создаём новый.
            const propChildren = Array.from((itemElement as any).childNodes || []).filter((n: any) => n && n.nodeType === 1) as Element[];
            const propElement = propChildren.find((el) => (el as any).tagName === key) || null;
            if (!propElement) {
                continue;
            }

            propElement.textContent = String(value);
        }
    }

    // Рекурсивно применяем дочерние элементы, но также без создания новых узлов.
    if (item.childItems && item.childItems.length > 0) {
        const childItemsElement = Array.from((itemElement as any).childNodes || []).find(
            (n: any) => n && n.nodeType === 1 && (n as any).tagName === 'ChildItems'
        ) as Element | undefined;
        if (!childItemsElement) return;

        for (const childItem of item.childItems) {
            applyFormItemChangesWithDom(childItemsElement, childItem, allowedCommandNames);
        }
    }
}


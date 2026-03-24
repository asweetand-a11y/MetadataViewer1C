/**
 * Парсер форм для редактора форм на основе xmldom.
 *
 * ВАЖНО: Используется xmldom (а не fast-xml-parser) для сохранения структуры XML.
 *
 * Источник данных:
 * - Form.xml: Documents/<DocumentName>/Forms/<FormName>/Ext/Form.xml
 * - или Catalogs/<CatalogName>/Forms/<FormName>/Ext/Form.xml и т.д.
 */

import * as fs from 'fs';
import { DOMParser } from '@xmldom/xmldom';
import type { ParsedFormFull, FormAttribute, FormCommand, FormItem } from './formParser';

export interface ParsedFormFullXmldom extends ParsedFormFull {
  /** Исходный XML Form.xml (для сохранения структуры при записи) */
  _originalXml: string;
  /** DOM документ (для сохранения структуры) */
  _domDocument: Document;
  /** Атрибуты корневого элемента (включая xmlns) */
  _rootAttrs?: Record<string, any>;
}

function safeReadFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function createDomParser(): DOMParser {
  return new DOMParser({
    locator: {},
    errorHandler: {
      warning: (w: any) => console.warn('[xmldom Form] Warning:', w),
      error: (e: any) => console.error('[xmldom Form] Error:', e),
      fatalError: (e: any) => {
        console.error('[xmldom Form] Fatal error:', e);
        throw new Error(`XML parsing error: ${e}`);
      }
    }
  });
}

/**
 * Извлекает атрибуты элемента в объект
 */
function extractAttributes(element: Element): Record<string, any> {
  const attrs: Record<string, any> = {};
  if (element.attributes) {
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      // Сохраняем namespace атрибутов с префиксом @_
      attrs[`@_${attr.name}`] = attr.value;
    }
  }
  return attrs;
}

/**
 * Извлекает текстовое содержимое элемента (только прямые текстовые узлы)
 */
function extractTextContent(element: Element): string {
  let text = '';
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child.nodeType === 3) { // TEXT_NODE
      const textContent = child.textContent || '';
      if (textContent.trim()) {
        text += textContent;
      }
    }
  }
  return text.trim();
}

/**
 * Извлекает имя формы из пути
 */
function extractFormName(xmlPath: string): string {
  const path = require('path');
  const parts = xmlPath.split(path.sep);
  const formsIndex = parts.findIndex(p => p === 'Forms');
  if (formsIndex >= 0 && formsIndex + 1 < parts.length) {
    return parts[formsIndex + 1];
  }
  return path.basename(path.dirname(path.dirname(xmlPath)));
}

/**
 * Определяет тип формы из пути
 */
function determineFormType(xmlPath: string): string | undefined {
  const path = require('path');
  const pathParts = xmlPath.split(path.sep);
  const formsIndex = pathParts.findIndex(p => p === 'Forms');
  if (formsIndex >= 0 && formsIndex + 1 < pathParts.length) {
    const formName = pathParts[formsIndex + 1];
    if (formName.includes('Список') || formName.toLowerCase().includes('list')) {
      return 'ListForm';
    } else if (formName.includes('Выбор') || formName.toLowerCase().includes('choice')) {
      return 'ChoiceForm';
    } else if (formName.includes('Групп') || formName.toLowerCase().includes('group')) {
      return 'GroupForm';
    }
  }
  return undefined;
}

/**
 * Парсит свойства формы из DOM элемента
 */
function parseFormPropertiesFromDom(formElement: Element): Record<string, any> {
  const props: Record<string, any> = {};
  
  // Основные свойства формы, которые нужно парсить
  const simpleProps = [
    'Title', 'WindowOpeningMode', 'AutoSaveDataInSettings',
    'SaveDataInSettings', 'AutoUrl', 'Group', 'ChildItemsWidth',
    'HorizontalStretch', 'VerticalStretch', 'AutoCommandBar',
    'CommandBarLocation', 'Width', 'Height', 'AutoTitle',
    'CloseButton', 'Representation', 'UseStandardCommands'
  ];
  
  // Проходим по всем дочерним элементам
  for (let i = 0; i < formElement.childNodes.length; i++) {
    const child = formElement.childNodes[i];
    if (child.nodeType !== 1) continue; // ELEMENT_NODE
    
    const element = child as Element;
    const tagName = element.tagName;
    
    // Пропускаем служебные элементы и элементы, которые сохраняются полностью из DOM
    // CommandInterface, CommandSet и Parameters сохраняются полностью из DOM, так как их структура слишком сложная
    if (tagName.startsWith('xmlns') || 
        tagName === 'Attributes' || 
        tagName === 'Commands' || 
        tagName === 'ChildItems' ||
        tagName === 'CommandInterface' ||
        tagName === 'CommandSet' ||
        tagName === 'Parameters') {
      continue;
    }
    
    // Извлекаем значение (текст или структура)
    const textContent = extractTextContent(element);
    const childElements = Array.from(element.childNodes).filter(n => n.nodeType === 1) as Element[];
    
    // Проверяем атрибуты (для AutoCommandBar с name и id)
    const nameAttr = element.getAttribute('name');
    const idAttr = element.getAttribute('id');
    
    if (tagName === 'AutoCommandBar' && nameAttr && idAttr) {
      // AutoCommandBar с атрибутами - сохраняем как объект с name и id
      // ВАЖНО: name и id только в атрибутах, не создаем дочерние элементы name и id
      // Также проверяем, есть ли дочерние элементы (например, Autofill, ChildItems)
      const autoCommandBarObj: any = { name: nameAttr, id: idAttr };
      
      // Парсим дочерние элементы AutoCommandBar (кроме name и id, которые уже в атрибутах)
      for (const childEl of childElements) {
        const childTag = childEl.tagName;
        // Пропускаем дочерние элементы name и id, так как они уже в атрибутах
        if (childTag === 'name' || childTag === 'id') {
          continue;
        }
        
        const childText = extractTextContent(childEl);
        if (childText) {
          autoCommandBarObj[childTag] = childText;
        } else {
          // Для сложных структур (например, ChildItems)
          const nestedChildren = Array.from(childEl.childNodes).filter(n => n.nodeType === 1) as Element[];
          if (nestedChildren.length > 0) {
            // Для ChildItems парсим рекурсивно
            if (childTag === 'ChildItems') {
              const nestedItems = parseFormChildItemsFromDom(childEl);
              if (nestedItems.length > 0) {
                autoCommandBarObj[childTag] = nestedItems;
              }
            } else {
              const nested: any = {};
              for (const nestedEl of nestedChildren) {
                const nestedTag = nestedEl.tagName;
                const nestedText = extractTextContent(nestedEl);
                if (nestedText) {
                  nested[nestedTag] = nestedText;
                }
              }
              if (Object.keys(nested).length > 0) {
                autoCommandBarObj[childTag] = nested;
              }
            }
          }
        }
      }
      
      props[tagName] = autoCommandBarObj;
    } else if (tagName === 'Events' && childElements.length > 0) {
      // Events - массив Event элементов
      const events: any[] = [];
      for (const eventEl of childElements) {
        if (eventEl.tagName === 'Event') {
          const eventName = eventEl.getAttribute('name');
          const eventText = extractTextContent(eventEl);
          if (eventName) {
            events.push({ name: eventName, value: eventText });
          }
        }
      }
      if (events.length > 0) {
        props[tagName] = events;
      }
    } else if (textContent) {
      props[tagName] = textContent;
    } else if (childElements.length > 0) {
      // Для сложных структур парсим дочерние элементы
      const structure: any = {};
      for (const childEl of childElements) {
        const childTag = childEl.tagName;
        const childText = extractTextContent(childEl);
        if (childText) {
          structure[childTag] = childText;
        } else {
          // Вложенная структура
          const nestedChildren = Array.from(childEl.childNodes).filter(n => n.nodeType === 1) as Element[];
          if (nestedChildren.length > 0) {
            const nested: any = {};
            for (const nestedEl of nestedChildren) {
              const nestedTag = nestedEl.tagName;
              const nestedText = extractTextContent(nestedEl);
              if (nestedText) {
                nested[nestedTag] = nestedText;
              }
            }
            structure[childTag] = Object.keys(nested).length > 0 ? nested : {};
          }
        }
      }
      if (Object.keys(structure).length > 0) {
        props[tagName] = structure;
      }
    }
  }
  
  return props;
}

/**
 * Рекурсивно превращает DOM-элемент в объект (для Title, v8:item и т.д.)
 */
function parseElementToObject(element: Element): any {
  const childElements = Array.from(element.childNodes).filter(n => n.nodeType === 1) as Element[];
  const text = extractTextContent(element);
  if (childElements.length === 0) {
    return text || {};
  }
  const result: any = {};
  for (const child of childElements) {
    const tag = child.tagName;
    if (tag.startsWith('xmlns')) continue;
    const childObj = parseElementToObject(child);
    if (result[tag] !== undefined) {
      if (!Array.isArray(result[tag])) result[tag] = [result[tag]];
      result[tag].push(childObj);
    } else {
      result[tag] = childObj;
    }
  }
  return result;
}

/**
 * Дочерний элемент внутри свойства вида SearchStringAddition / ViewStatusAddition / SearchControlAddition.
 * Раньше ContextMenu и ExtendedTooltip с только name/id (без #text) отбрасывались; пустой AdditionSource — тоже.
 */
function captureNestedFormPropertyChild(nestedEl: Element, nestedTag: string): any {
  const nName = nestedEl.getAttribute('name');
  const nId = nestedEl.getAttribute('id');
  const nestedText = extractTextContent(nestedEl);
  const subKids = Array.from(nestedEl.childNodes).filter(n => n.nodeType === 1) as Element[];

  if (subKids.length > 0) {
    const sub: Record<string, any> = {};
    if (nName) sub.name = nName;
    if (nId) sub.id = nId;
    for (const sk of subKids) {
      const skTag = sk.tagName;
      if (
        skTag === 'ChildItems' &&
        (nestedTag === 'ContextMenu' || nestedTag === 'AutoCommandBar')
      ) {
        const items = parseFormChildItemsFromDom(sk);
        if (items.length > 0) sub.ChildItems = items;
      } else {
        const skText = extractTextContent(sk);
        const skDeep = Array.from(sk.childNodes).filter(n => n.nodeType === 1) as Element[];
        if (skDeep.length === 0) {
          if (skText) {
            sub[skTag] = skText;
          } else {
            const skn = sk.getAttribute('name');
            const ski = sk.getAttribute('id');
            if (skn || ski) {
              sub[skTag] = {
                ...(skn ? { name: skn } : {}),
                ...(ski ? { id: ski } : {}),
              };
            } else {
              sub[skTag] = '';
            }
          }
        } else {
          sub[skTag] = parseElementToObject(sk);
        }
      }
    }
    return sub;
  }

  if (nestedText) return nestedText;
  if (nName || nId) {
    return {
      ...(nName ? { name: nName } : {}),
      ...(nId ? { id: nId } : {}),
    };
  }
  return '';
}

/**
 * Парсит один элемент Column внутри Columns (реквизит типа ValueTable)
 */
function parseColumnFromDom(colElement: Element): Record<string, any> {
  const name = colElement.getAttribute('name') || colElement.getAttribute('Name') || '';
  const id = colElement.getAttribute('id') || colElement.getAttribute('ID') || '';
  const result: Record<string, any> = { name, id };
  const typeEl = Array.from(colElement.childNodes).find(
    (n): n is Element => n.nodeType === 1 && ((n as Element).tagName === 'Type' || (n as Element).tagName === 'type')
  ) as Element | undefined;
  if (typeEl) {
    result.Type = parseTypeFromDom(typeEl);
  }
  const titleEl = Array.from(colElement.childNodes).find(
    (n): n is Element => n.nodeType === 1 && ((n as Element).tagName === 'Title' || (n as Element).tagName === 'title')
  ) as Element | undefined;
  if (titleEl) {
    const titleObj = parseElementToObject(titleEl);
    if (typeof titleObj === 'object' && Object.keys(titleObj).length > 0) {
      result.Title = titleObj;
    }
  }
  return result;
}

/**
 * Парсит элемент Columns (колонки реквизита типа v8:ValueTable)
 */
function parseColumnsFromDom(columnsElement: Element): { Column: any[] } | null {
  const columnElements = Array.from(columnsElement.childNodes).filter(
    (n): n is Element => n.nodeType === 1 && (n as Element).tagName === 'Column'
  );
  if (columnElements.length === 0) return null;
  const columnList = columnElements.map((el) => parseColumnFromDom(el));
  return { Column: columnList };
}

/**
 * Парсит реквизиты формы из DOM
 */
function parseFormAttributesFromDom(formElement: Element): FormAttribute[] {
  const attrs: FormAttribute[] = [];
  const attributesElement = Array.from(formElement.childNodes).find(
    (n): n is Element => n.nodeType === 1 && (n as Element).tagName === 'Attributes'
  );
  
  if (!attributesElement) return attrs;
  
  // Ищем все элементы Attribute
  const attributeElements = Array.from(attributesElement.childNodes).filter(
    (n): n is Element => n.nodeType === 1 && (n as Element).tagName === 'Attribute'
  );
  
  for (const attrElement of attributeElements) {
    const nameAttr = attrElement.getAttribute('name');
    if (!nameAttr) continue;
    
    // Парсим Type
    const typeElement = Array.from(attrElement.childNodes).find(
      (n): n is Element => n.nodeType === 1 && (n as Element).tagName === 'Type'
    );
    
    const typeValue = typeElement ? parseTypeFromDom(typeElement) : null;
    
    // Парсим Properties (все элементы кроме Type и name)
    const properties: Record<string, any> = {};
    for (let i = 0; i < attrElement.childNodes.length; i++) {
      const child = attrElement.childNodes[i];
      if (child.nodeType !== 1) continue;
      const childElement = child as Element;
      const childTag = childElement.tagName;
      
      // Пропускаем Type; имя реквизита — атрибут name у <Attribute>, не дочерний <Name>
      if (
        childTag === 'Type' ||
        childTag === 'Name' ||
        childTag === 'name' ||
        childTag.startsWith('xmlns')
      ) {
        continue;
      }
      
      // Реквизиты с типом v8:ValueTable содержат Columns с Column — парсим в массив для панели реквизитов
      if (childTag === 'Columns') {
        const columnsData = parseColumnsFromDom(childElement);
        if (columnsData) {
          properties.Columns = columnsData;
        }
        continue;
      }
      
      const text = extractTextContent(childElement);
      const nestedChildren = Array.from(childElement.childNodes).filter(n => n.nodeType === 1) as Element[];
      
      if (nestedChildren.length > 0) {
        // Сложная структура (например, UseAlways с Field)
        const nested: any = {};
        for (const nestedEl of nestedChildren) {
          const nestedTag = nestedEl.tagName;
          const nestedText = extractTextContent(nestedEl);
          if (nestedText) {
            nested[nestedTag] = nestedText;
          }
        }
        // Если структура имеет одно поле Field, сохраняем как значение Field
        if (Object.keys(nested).length === 1 && nested.Field) {
          properties[childTag] = nested.Field;
        } else if (Object.keys(nested).length > 0) {
          properties[childTag] = nested;
        }
      } else if (text) {
        properties[childTag] = text;
      }
    }
    
    // Извлекаем typeDisplay для совместимости
    const getTypeDisplay = (typeValue: any): string => {
      if (!typeValue) return 'Unknown';
      if (typeof typeValue === 'string') return typeValue;
      if (typeValue['v8:Type']) return String(typeValue['v8:Type']);
      return 'Unknown';
    };
    
    attrs.push({
      name: nameAttr,
      type: typeValue,
      typeDisplay: getTypeDisplay(typeValue),
      properties,
    });
  }
  
  return attrs;
}

/**
 * Парсит тип из DOM элемента Type
 * Возвращает структуру типа с квалификаторами для редактора типов данных
 */
function parseTypeFromDom(typeElement: Element): any {
  // Если есть только текстовое содержимое
  const text = extractTextContent(typeElement);
  const childElements = Array.from(typeElement.childNodes).filter(n => n.nodeType === 1) as Element[];
  
  if (text && childElements.length === 0) {
    // Простой тип (например, xs:string)
    return { 'v8:Type': text };
  }
  
  // Если есть дочерние элементы, парсим структуру типа
  const typeStructure: any = {};
  const v8Types: string[] = [];
  
  for (const childEl of childElements) {
    const childTag = childEl.tagName;
    const childText = extractTextContent(childEl);
    const nestedChildren = Array.from(childEl.childNodes).filter(n => n.nodeType === 1) as Element[];
    
    if (childTag === 'v8:Type') {
      // Собираем все v8:Type элементы (может быть несколько)
      if (childText) {
        v8Types.push(childText);
      }
    } else if (nestedChildren.length > 0) {
      // Вложенная структура (например, NumberQualifiers, StringQualifiers)
      const nested: any = {};
      for (const nestedEl of nestedChildren) {
        const nestedTag = nestedEl.tagName;
        const nestedText = extractTextContent(nestedEl);
        if (nestedText) {
          nested[nestedTag] = nestedText;
        }
      }
      typeStructure[childTag] = Object.keys(nested).length > 0 ? nested : {};
    } else if (childText) {
      typeStructure[childTag] = childText;
    } else {
      typeStructure[childTag] = {};
    }
  }
  
  // Если есть v8:Type элементы, добавляем их в структуру
  if (v8Types.length > 0) {
    if (v8Types.length === 1) {
      typeStructure['v8:Type'] = v8Types[0];
    } else {
      typeStructure['v8:Type'] = v8Types; // Массив
    }
  }
  
  // Если есть текстовое содержимое и структура, объединяем
  if (text && Object.keys(typeStructure).length > 0) {
    if (!typeStructure['v8:Type']) {
      typeStructure['v8:Type'] = text;
    }
  } else if (text && v8Types.length === 0) {
    return { 'v8:Type': text };
  }
  
  return Object.keys(typeStructure).length > 0 ? typeStructure : null;
}

/**
 * Парсит команды формы из DOM
 */
function parseFormCommandsFromDom(formElement: Element): FormCommand[] {
  const commands: FormCommand[] = [];
  const commandsElement = Array.from(formElement.childNodes).find(
    (n): n is Element => n.nodeType === 1 && (n as Element).tagName === 'Commands'
  );
  
  if (!commandsElement) return commands;
  
  // Ищем все элементы Command
  const commandElements = Array.from(commandsElement.childNodes).filter(
    (n): n is Element => n.nodeType === 1 && (n as Element).tagName === 'Command'
  );
  
  for (const cmdElement of commandElements) {
    const nameAttr = cmdElement.getAttribute('name');
    if (!nameAttr) continue;
    
    const properties: Record<string, any> = {};
    const idAttr = cmdElement.getAttribute('id');
    if (idAttr) {
      properties.id = idAttr;
    }
    
    for (let i = 0; i < cmdElement.childNodes.length; i++) {
      const child = cmdElement.childNodes[i];
      if (child.nodeType !== 1) continue;
      const childElement = child as Element;
      const childTag = childElement.tagName;
      
      // Пропускаем служебные элементы
      if (childTag.startsWith('xmlns')) {
        continue;
      }
      // Имя и id команды — атрибуты <Command>, не дочерние теги
      if (
        childTag === 'Name' ||
        childTag === 'name' ||
        childTag === 'id' ||
        childTag === 'Id'
      ) {
        continue;
      }
      
      const text = extractTextContent(childElement);
      const nestedChildren = Array.from(childElement.childNodes).filter(n => n.nodeType === 1) as Element[];
      
      if (nestedChildren.length > 0) {
        // Сложная структура
        const nested: any = {};
        for (const nestedEl of nestedChildren) {
          const nestedTag = nestedEl.tagName;
          const nestedText = extractTextContent(nestedEl);
          if (nestedText) {
            nested[nestedTag] = nestedText;
          }
        }
        properties[childTag] = Object.keys(nested).length > 0 ? nested : {};
      } else if (text) {
        properties[childTag] = text;
      } else {
        // Пустой элемент - сохраняем как пустой объект
        properties[childTag] = {};
      }
    }
    
    commands.push({
      name: nameAttr,
      properties,
    });
  }
  
  return commands;
}

/**
 * Парсит элементы формы (ChildItems) из DOM
 */
function parseFormChildItemsFromDom(childItemsElement: Element | null): FormItem[] {
  if (!childItemsElement) return [];
  
  const items: FormItem[] = [];
  
  // Проходим по всем дочерним элементам в порядке их появления
  let childIndex = 0;
  for (let i = 0; i < childItemsElement.childNodes.length; i++) {
    const child = childItemsElement.childNodes[i];
    if (child.nodeType !== 1) continue; // ELEMENT_NODE
    
    const element = child as Element;
    const tagName = element.tagName;
    
    // Пропускаем текстовые узлы и служебные элементы
    if (tagName.startsWith('#') || tagName.startsWith('xmlns')) {
      continue;
    }
    
    const item = parseFormItemFromDom(element, tagName);
    if (item) {
      items.push(item);
      childIndex++;
    }
  }
  
  return items;
}

/**
 * Парсит один элемент формы из DOM
 */
function parseFormItemFromDom(element: Element, tagName: string): FormItem | null {
  const properties: Record<string, any> = {};
  const childItems: FormItem[] = [];
  
  // Извлекаем атрибуты name и id
  const name = element.getAttribute('name') || undefined;
  const id = element.getAttribute('id') || undefined;
  
  // Парсим свойства и дочерние элементы
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child.nodeType !== 1) continue; // ELEMENT_NODE
    
    const childElement = child as Element;
    const childTag = childElement.tagName;
    
    // Пропускаем служебные элементы
    if (childTag.startsWith('xmlns')) {
      continue;
    }
    
    if (childTag === 'ChildItems') {
      // Рекурсивно парсим дочерние элементы
      const nestedItems = parseFormChildItemsFromDom(childElement);
      if (nestedItems.length > 0) {
        childItems.push(...nestedItems);
      }
    } else if (childTag === 'Events') {
      // Events — массив Event элементов (как у корня формы): <Event name="OnChange">ИмяПроцедуры</Event>
      const eventElements = Array.from(childElement.childNodes).filter(
        (n): n is Element => n.nodeType === 1 && (n as Element).tagName === 'Event'
      );
      const events: Array<{ name: string; value: string }> = [];
      for (const eventEl of eventElements) {
        const eventName = eventEl.getAttribute('name');
        const eventText = extractTextContent(eventEl);
        if (eventName) {
          events.push({ name: eventName, value: eventText });
        }
      }
      if (events.length > 0) {
        properties.Events = events;
      }
    } else {
      // Это свойство элемента
      const text = extractTextContent(childElement);
      const nestedChildren = Array.from(childElement.childNodes).filter(n => n.nodeType === 1) as Element[];
      
      // ВАЖНО: Проверяем атрибуты name и id (для ExtendedTooltip, ContextMenu и т.д.)
      const nameAttr = childElement.getAttribute('name');
      const idAttr = childElement.getAttribute('id');
      
      // Если есть атрибуты name и/или id, сохраняем как объект с этими атрибутами
      if (nameAttr || idAttr) {
        const attrObj: any = {};
        if (nameAttr) attrObj.name = nameAttr;
        if (idAttr) attrObj.id = idAttr;
        
        // Если есть дочерние элементы, добавляем их
        if (nestedChildren.length > 0) {
          for (const nestedEl of nestedChildren) {
            const nestedTag = nestedEl.tagName;
            // ContextMenu и AutoCommandBar табличной части содержат ChildItems с кнопками — парсим их
            if (
              nestedTag === 'ChildItems' &&
              (childTag === 'ContextMenu' || childTag === 'AutoCommandBar')
            ) {
              const parsedChildItems = parseFormChildItemsFromDom(nestedEl);
              if (parsedChildItems.length > 0) {
                attrObj.ChildItems = parsedChildItems;
              }
            } else {
              attrObj[nestedTag] = captureNestedFormPropertyChild(nestedEl, nestedTag);
            }
          }
        }
        
        properties[childTag] = attrObj;
      } else if (nestedChildren.length > 0) {
        // Сложная структура (например, Title с v8:item, Visible с xr:Common, UseAlways с Field)
        const nested: any = {};
        for (const nestedEl of nestedChildren) {
          const nestedTag = nestedEl.tagName;
          const nestedText = extractTextContent(nestedEl);
          const deepNestedChildren = Array.from(nestedEl.childNodes).filter(n => n.nodeType === 1) as Element[];
          
          if (deepNestedChildren.length > 0) {
            // Еще более вложенная структура (например, v8:item с v8:lang и v8:content)
            const deepNested: any = {};
            for (const deepEl of deepNestedChildren) {
              const deepTag = deepEl.tagName;
              const deepText = extractTextContent(deepEl);
              if (deepText) {
                deepNested[deepTag] = deepText;
              } else {
                // Даже если нет текста, сохраняем структуру (может быть пустой объект или вложенная структура)
                const deeperNested = Array.from(deepEl.childNodes).filter(n => n.nodeType === 1) as Element[];
                if (deeperNested.length > 0) {
                  const deeper: any = {};
                  for (const deeperEl of deeperNested) {
                    const deeperTag = deeperEl.tagName;
                    const deeperText = extractTextContent(deeperEl);
                    if (deeperText) {
                      deeper[deeperTag] = deeperText;
                    }
                  }
                  if (Object.keys(deeper).length > 0) {
                    deepNested[deepTag] = deeper;
                  } else {
                    deepNested[deepTag] = {};
                  }
                } else {
                  deepNested[deepTag] = {};
                }
              }
            }
            // ВАЖНО: Сохраняем структуру даже если нет текста (например, v8:item с v8:lang и v8:content)
            if (Object.keys(deepNested).length > 0) {
              nested[nestedTag] = deepNested;
            } else if (nestedText) {
              nested[nestedTag] = nestedText;
            } else {
              // Сохраняем пустой объект для структуры без текста, но с вложенными элементами
              nested[nestedTag] = {};
            }
          } else if (nestedText) {
            nested[nestedTag] = nestedText;
          } else {
            // Пустой элемент - сохраняем как пустой объект
            nested[nestedTag] = {};
          }
        }
        // ВАЖНО: Сохраняем структуру даже если она пустая (например, Title с пустым v8:item)
        properties[childTag] = Object.keys(nested).length > 0 ? nested : {};
      } else if (text) {
        properties[childTag] = text;
      } else {
        // Пустой элемент - сохраняем как пустой объект или пропускаем
        // В зависимости от логики можно сохранить как {}
      }
    }
  }
  
  const item: FormItem = {
    type: tagName,
    name,
    id,
    properties,
  };
  
  if (childItems.length > 0) {
    item.childItems = childItems;
  }
  
  return item;
}

/**
 * Парсит Form.xml в структуру ParsedFormFullXmldom
 */
export async function parseFormXmlFullXmldom(xmlPath: string): Promise<ParsedFormFullXmldom> {
  const xml = safeReadFile(xmlPath);
  
  // Удаляем BOM если есть
  let cleanXml = xml;
  if (xml.charCodeAt(0) === 0xFEFF) {
    cleanXml = xml.slice(1);
  }
  
  const parser = createDomParser();
  const doc = parser.parseFromString(cleanXml, 'text/xml');
  
  // Проверяем на ошибки парсинга
  const parserError = doc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    throw new Error(`XML parsing error in ${xmlPath}: ${parserError[0].textContent}`);
  }
  
  const rootElement = doc.documentElement;
  if (!rootElement || rootElement.tagName !== 'Form') {
    throw new Error(`Файл не является формой: ${xmlPath}`);
  }
  
  const rootAttrs = extractAttributes(rootElement);
  const name = extractFormName(xmlPath);
  const formType = determineFormType(xmlPath);
  
  // Парсим свойства, реквизиты, команды и элементы
  const properties = parseFormPropertiesFromDom(rootElement);
  const attributes = parseFormAttributesFromDom(rootElement);
  const commands = parseFormCommandsFromDom(rootElement);
  
  // Парсим ChildItems
  const childItemsElement = Array.from(rootElement.childNodes).find(
    (n): n is Element => n.nodeType === 1 && (n as Element).tagName === 'ChildItems'
  ) || null;
  const childItems = parseFormChildItemsFromDom(childItemsElement);
  
  return {
    name,
    formType,
    sourcePath: xmlPath,
    properties,
    attributes,
    commands,
    childItems,
    _originalXml: xml,
    _domDocument: doc,
    _rootAttrs: rootAttrs,
  };
}


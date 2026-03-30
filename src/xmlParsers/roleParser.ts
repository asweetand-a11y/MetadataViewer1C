/**
 * Парсер файла прав роли 1С (Rights.xml)
 * Формат: http://v8.1c.ru/8.2/roles
 */

import * as fs from 'fs';
import { DOMParser } from '@xmldom/xmldom';

/** Ограничение доступа к данным (RLS) */
export interface RoleRestrictionByCondition {
  /** Текст условия (запрос RLS) */
  condition: string;
  /** Поле ограничения (опционально) */
  field?: string;
}

/** Одно право на объект */
export interface RoleRight {
  /** Имя права (Read, Insert, Update, Delete, View, Edit, ...) */
  name: string;
  /** Значение права */
  value: boolean;
  /** Ограничение по условию (RLS) */
  restrictionByCondition?: RoleRestrictionByCondition;
}

/** Объект с правами */
export interface RoleObject {
  /** Имя объекта метаданных (например: Catalog.Номенклатура) */
  name: string;
  /** Список прав на объект */
  rights: RoleRight[];
}

/** Шаблон ограничения */
export interface RoleRestrictionTemplate {
  /** Имя шаблона */
  name: string;
  /** Условие шаблона */
  condition: string;
}

/** Разобранные права роли */
export interface ParsedRoleRights {
  /** Устанавливать права для новых объектов */
  setForNewObjects: boolean;
  /** Устанавливать права для реквизитов и табличных частей по умолчанию */
  setForAttributesByDefault: boolean;
  /** Независимые права подчиненных объектов */
  independentRightsOfChildObjects: boolean;
  /** Объекты с правами */
  objects: RoleObject[];
  /** Шаблоны ограничений */
  restrictionTemplates: RoleRestrictionTemplate[];
  /** Исходный XML для сохранения структуры */
  originalXml: string;
}

/**
 * Получает текстовое содержимое дочернего элемента
 */
function getChildText(parent: Element, tagName: string): string {
  const child = parent.getElementsByTagName(tagName)[0];
  return child?.textContent?.trim() ?? '';
}

/**
 * Получает булево значение дочернего элемента
 */
function getChildBool(parent: Element, tagName: string, defaultValue = false): boolean {
  const text = getChildText(parent, tagName);
  if (!text) return defaultValue;
  return text === 'true';
}

/**
 * Парсит файл Rights.xml роли 1С
 */
export async function parseRoleRightsXml(filePath: string): Promise<ParsedRoleRights> {
  const rawContent = fs.readFileSync(filePath);
  // Удаляем BOM если есть
  let xmlString = rawContent.toString('utf8');
  if (xmlString.charCodeAt(0) === 0xfeff) {
    xmlString = xmlString.slice(1);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const root = doc.documentElement;
  if (!root) {
    throw new Error('Не удалось разобрать XML файла прав роли');
  }

  const setForNewObjects = getChildBool(root, 'setForNewObjects');
  const setForAttributesByDefault = getChildBool(root, 'setForAttributesByDefault', true);
  const independentRightsOfChildObjects = getChildBool(root, 'independentRightsOfChildObjects');

  // Парсим объекты
  const objects: RoleObject[] = [];
  const objectNodes = root.getElementsByTagName('object');
  for (let i = 0; i < objectNodes.length; i++) {
    const objNode = objectNodes[i];
    // Пропускаем вложенные объекты (только прямые дети root)
    if (objNode.parentNode !== root) continue;

    const name = getChildText(objNode, 'name');
    const rights: RoleRight[] = [];

    const rightNodes = objNode.getElementsByTagName('right');
    for (let j = 0; j < rightNodes.length; j++) {
      const rightNode = rightNodes[j];
      if (rightNode.parentNode !== objNode) continue;

      const rightName = getChildText(rightNode, 'name');
      const rightValue = getChildBool(rightNode, 'value');

      let restrictionByCondition: RoleRestrictionByCondition | undefined;
      const restrictionNode = rightNode.getElementsByTagName('restrictionByCondition')[0];
      if (restrictionNode && restrictionNode.parentNode === rightNode) {
        restrictionByCondition = {
          condition: getChildText(restrictionNode, 'condition'),
          field: getChildText(restrictionNode, 'field') || undefined,
        };
      }

      rights.push({ name: rightName, value: rightValue, restrictionByCondition });
    }

    objects.push({ name, rights });
  }

  // Парсим шаблоны ограничений
  const restrictionTemplates: RoleRestrictionTemplate[] = [];
  const templateNodes = root.getElementsByTagName('restrictionTemplate');
  for (let i = 0; i < templateNodes.length; i++) {
    const tmplNode = templateNodes[i];
    if (tmplNode.parentNode !== root) continue;
    restrictionTemplates.push({
      name: getChildText(tmplNode, 'name'),
      condition: getChildText(tmplNode, 'condition'),
    });
  }

  return {
    setForNewObjects,
    setForAttributesByDefault,
    independentRightsOfChildObjects,
    objects,
    restrictionTemplates,
    originalXml: xmlString,
  };
}

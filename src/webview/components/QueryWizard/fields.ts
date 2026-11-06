/**
 * Поля метаданных, доступные источникам текущего оператора.
 */

import type { QueryMetadataNode } from '../DcsEditor/MetadataTreePanel';
import { baseTableKey } from '../../../querySchema';
import { completionMetadata } from '../../queryLanguage/completion/provider';
import type { QueryOperator, QuerySource } from '../../../querySchema';
import { detectVirtualTable } from './virtual';

function leavesUnder(node: QueryMetadataNode, tableKey: string, out: string[]): void {
  for (const child of node.children || []) {
    const text = String(child.insertText || '');
    const hasChildren = Array.isArray(child.children) && child.children.length > 0;
    if (text.startsWith(`${tableKey}.`) && !text.includes('(') && !hasChildren) {
      out.push(text.slice(tableKey.length + 1));
    }
    if (!text.endsWith('(')) leavesUnder(child, tableKey, out);
  }
}

function findTableNode(node: QueryMetadataNode, tableKey: string): QueryMetadataNode | null {
  if (node.insertText === tableKey) return node;
  for (const child of node.children || []) {
    const found = findTableNode(child, tableKey);
    if (found) return found;
  }
  return null;
}

/** Имена полей таблицы относительно ключа метаданных `Справочник.Номенклатура`. */
export function fieldsOfTable(tree: QueryMetadataNode | null, tableKey: string): string[] {
  if (!tree || !tableKey) return [];
  const node = findTableNode(tree, tableKey);
  if (!node) return [];
  const out: string[] = [];
  leavesUnder(node, tableKey, out);
  return out;
}

interface FieldGroups {
  dimensions: string[];
  resources: string[];
  attributes: string[];
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const name = item.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function roleKind(role: string | undefined, inherited: 'dimensions' | 'resources' | 'attributes'): 'dimensions' | 'resources' | 'attributes' {
  const text = String(role || '').toLowerCase();
  if (text === 'dimension') return 'dimensions';
  if (text === 'resource' || text === 'measure') return 'resources';
  if (text === 'attribute' || text === 'requisite') return 'attributes';
  return inherited;
}

function groupKind(label: string): 'dimensions' | 'resources' | 'attributes' {
  const text = label.toLowerCase();
  if (text.includes('измер') || text.includes('dimension')) return 'dimensions';
  if (text.includes('ресурс') || text.includes('resource')) return 'resources';
  return 'attributes';
}

/** Делит поля объекта на измерения, ресурсы и реквизиты по группам дерева. */
function fieldGroups(tree: QueryMetadataNode | null, tableKey: string): FieldGroups {
  const groups: FieldGroups = { dimensions: [], resources: [], attributes: [] };
  if (!tree || !tableKey) return groups;
  const node = findTableNode(tree, tableKey);
  if (!node) return groups;

  const walk = (current: QueryMetadataNode, kind: 'dimensions' | 'resources' | 'attributes') => {
    for (const child of current.children || []) {
      const nextKind = child.kind === 'group' ? groupKind(child.label) : roleKind(child.role, kind);
      const text = String(child.insertText || '');
      const hasChildren = Array.isArray(child.children) && child.children.length > 0;
      if (text.startsWith(`${tableKey}.`) && !text.includes('(') && !hasChildren) {
        groups[nextKind].push(text.slice(tableKey.length + 1));
      }
      if (!text.endsWith('(')) walk(child, nextKind);
    }
  };
  walk(node, 'attributes');
  groups.dimensions = unique(groups.dimensions);
  groups.resources = unique(groups.resources);
  groups.attributes = unique(groups.attributes);
  return groups;
}

function withSuffix(names: string[], suffix: string): string[] {
  return names.map((name) => `${name}${suffix}`);
}

/**
 * Имена полей виртуальной таблицы: к ресурсам добавляются Остаток, Оборот, Приход и остальные суффиксы языка запросов.
 * Для обычной таблицы возвращает null.
 */
function virtualFieldNames(tableName: string, groups: FieldGroups): string[] | null {
  const virtual = detectVirtualTable(tableName);
  if (!virtual) return null;
  const { family, kind } = virtual;
  const { dimensions, attributes } = groups;
  const resources = groups.resources.filter((name) => !name.includes('.'));
  const subconto = [1, 2, 3].flatMap((index) => [`Субконто${index}`, `ВидСубконто${index}`]);
  const periods = ['ПериодГод', 'ПериодПолугодие', 'ПериодКвартал', 'ПериодМесяц', 'ПериодДекада', 'ПериодНеделя', 'ПериодДень'];

  if (family === 'AccumulationRegister') {
    if (kind === 'Остатки') return unique([...dimensions, ...withSuffix(resources, 'Остаток')]);
    if (kind === 'Обороты') {
      return unique([
        'Период', 'Регистратор', 'НомерСтроки',
        ...dimensions,
        ...withSuffix(resources, 'Оборот'),
        ...withSuffix(resources, 'Приход'),
        ...withSuffix(resources, 'Расход'),
      ]);
    }
    if (kind === 'ОстаткиИОбороты') {
      return unique([
        'Период', 'Регистратор', 'НомерСтроки',
        ...dimensions,
        ...withSuffix(resources, 'НачальныйОстаток'),
        ...withSuffix(resources, 'Приход'),
        ...withSuffix(resources, 'Расход'),
        ...withSuffix(resources, 'Оборот'),
        ...withSuffix(resources, 'КонечныйОстаток'),
      ]);
    }
    return unique(['Период', 'Регистратор', 'НомерСтроки', 'Активность', 'ВидДвижения', ...dimensions, ...resources, ...attributes]);
  }

  if (family === 'InformationRegister') {
    if (kind === 'СрезПоследних' || kind === 'СрезПервых') return unique(['Период', ...dimensions, ...resources, ...attributes]);
    return unique(['Период', 'Регистратор', 'НомерСтроки', 'Активность', ...dimensions, ...resources, ...attributes]);
  }

  if (family === 'AccountingRegister') {
    const balance = resources.flatMap((name) => [
      `${name}Остаток`, `${name}ОстатокДт`, `${name}ОстатокКт`, `${name}РазвернутыйОстатокДт`, `${name}РазвернутыйОстатокКт`,
    ]);
    const turn = resources.flatMap((name) => [`${name}Оборот`, `${name}ОборотДт`, `${name}ОборотКт`]);
    if (kind === 'Остатки') return unique(['Счет', ...subconto, ...dimensions, ...balance]);
    if (kind === 'Обороты') return unique(['Период', 'Регистратор', 'НомерСтроки', 'Счет', 'КорСчет', ...subconto, ...dimensions, ...periods, ...turn]);
    if (kind === 'ОстаткиИОбороты') {
      const both = resources.flatMap((name) => [
        `${name}НачальныйОстаток`, `${name}НачальныйОстатокДт`, `${name}НачальныйОстатокКт`,
        `${name}ОборотДт`, `${name}ОборотКт`,
        `${name}КонечныйОстаток`, `${name}КонечныйОстатокДт`, `${name}КонечныйОстатокКт`,
      ]);
      return unique(['Период', 'Регистратор', 'НомерСтроки', 'Счет', ...subconto, ...dimensions, ...periods, ...both]);
    }
    if (kind === 'ОборотыДтКт') {
      const sides = [1, 2, 3].flatMap((index) => [`СубконтоДт${index}`, `СубконтоКт${index}`]);
      return unique(['Период', 'Регистратор', 'НомерСтроки', 'СчетДт', 'СчетКт', ...sides, ...dimensions, ...withSuffix(resources, 'Оборот')]);
    }
    return unique(['Период', 'Регистратор', 'НомерСтроки', 'Активность', 'Счет', 'КорСчет', ...subconto, ...dimensions, ...resources, ...attributes]);
  }

  if (family === 'CalculationRegister') {
    return unique([
      'Период', 'Регистратор', 'НомерСтроки', 'ВидРасчета',
      'ПериодДействия', 'ПериодДействияНачало', 'ПериодДействияКонец',
      'БазовыйПериодНачало', 'БазовыйПериодКонец', 'Активность', 'Результат',
      ...dimensions, ...resources, ...attributes,
    ]);
  }
  return null;
}

/** Поля таблицы из индекса конфигурации. null — индекс ещё не загружен или таблица в нём не найдена. */
function namesFromIndex(tableName: string): string[] | null {
  const index = completionMetadata();
  if (!index || !tableName) return null;
  const table = index.resolveTable(tableName.split('.'));
  if (!table) return null;
  return index.fieldsOf(table).map((field) => field.name);
}

/** Имена полей источника без псевдонима. Для виртуальной таблицы — поля результата. */
export function sourceFieldNames(source: QuerySource, tree: QueryMetadataNode | null): string[] {
  if (source.kind === 'nested' && source.nested) {
    return (source.nested.operators[0]?.fields ?? []).map((field) => field.alias || field.expression);
  }
  if (source.tempFields.length) return source.tempFields.slice();
  const indexed = namesFromIndex(source.tableName);
  if (indexed) return indexed;
  const tableKey = baseTableKey(source.tableName);
  const groups = fieldGroups(tree, tableKey);
  const virtual = virtualFieldNames(source.tableName, groups);
  if (virtual) return virtual;
  const leaves = fieldsOfTable(tree, tableKey);
  if (leaves.length) return leaves;
  return unique([...groups.dimensions, ...groups.resources, ...groups.attributes]);
}

/**
 * Поля, допустимые в параметре «Условие» виртуальной таблицы.
 * Это измерения и реквизиты регистра, без суффиксов остатка и оборота.
 */
export function virtualConditionFieldNames(source: QuerySource, tree: QueryMetadataNode | null): string[] {
  const index = completionMetadata();
  const base = baseTableKey(source.tableName);
  if (index && base) {
    const table = index.resolveTable(base.split('.'));
    if (table && table.type !== 'derived') {
      return index.fieldsOf({ type: 'object', object: table.object }).filter((field) => field.group !== 'standard').map((field) => field.name);
    }
  }
  const groups = fieldGroups(tree, baseTableKey(source.tableName));
  return unique([...groups.dimensions, ...groups.resources, ...groups.attributes]);
}

/** Выражения полей источников: `Псевдоним.Поле`. */
export function sourceFieldExprs(op: QueryOperator, tree: QueryMetadataNode | null): string[] {
  const out: string[] = [];
  for (const source of op.sources) {
    for (const name of sourceFieldNames(source, tree)) {
      out.push(source.alias ? `${source.alias}.${name}` : name);
    }
  }
  return out;
}

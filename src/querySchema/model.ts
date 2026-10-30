/**
 * Фабрики пустой схемы и вспомогательные операции конструктора запросов.
 */

import type {
  AggregateField,
  BatchItem,
  DropQuery,
  QueryField,
  QueryJoin,
  QueryOperator,
  QuerySchema,
  QuerySource,
  SelectQuery,
} from './types';

let counter = 0;

/** Устойчивый идентификатор узла схемы в рамках сессии редактора. */
export function newId(): string {
  counter += 1;
  return `q${Date.now().toString(36)}${counter.toString(36)}`;
}

/** Глубокая копия схемы. В модели только данные JSON. */
export function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createOperator(): QueryOperator {
  return {
    id: newId(),
    unionType: 'none',
    sources: [],
    fields: [],
    joins: [],
    conditions: [],
    having: '',
    groupingEnabled: false,
    groupingSets: [],
    aggregates: [],
    allowed: false,
    distinct: false,
    firstCount: '',
  };
}

export function createSelectQuery(): SelectQuery {
  return {
    kind: 'select',
    id: newId(),
    operators: [createOperator()],
    into: '',
    order: [],
    autoOrder: false,
    indexes: [],
    totalsEnabled: false,
    totalExpressions: [],
    totalGroupings: [],
    forUpdate: false,
    forUpdateTables: [],
    dataCompositionFields: [],
    dataCompositionFilters: [],
    requiredJoins: [],
    characteristics: [],
  };
}

export function createDropQuery(tableName = ''): DropQuery {
  return { kind: 'drop', id: newId(), tableName };
}

export function createEmptySchema(dataCompositionMode = false): QuerySchema {
  return { batch: [createSelectQuery()], dataCompositionMode };
}

export function createField(expression: string, alias = ''): QueryField {
  return { id: newId(), expression, alias };
}

export function createSource(tableName: string, alias: string, kind: QuerySource['kind'] = 'table'): QuerySource {
  return { id: newId(), kind, tableName, alias, tempFields: [] };
}

export function createJoin(leftSourceId: string, rightSourceId: string, joinType: QueryJoin['joinType'], condition: string): QueryJoin {
  return { id: newId(), leftSourceId, rightSourceId, joinType, condition };
}

export function createAggregate(expression: string, alias = ''): AggregateField {
  return { id: newId(), expression, alias };
}

const VIRTUAL_TABLES = new Set([
  'Обороты',
  'Остатки',
  'ОстаткиИОбороты',
  'ОборотыДтКт',
  'ДвиженияССубконто',
  'СрезПоследних',
  'СрезПервых',
  'Движения',
  'ПериодДействия',
  'ДанныеГрафика',
  'ФактическийПериодДействия',
]);

/** Имя таблицы метаданных без виртуальной таблицы и без аргументов. */
export function baseTableKey(tableName: string): string {
  const noArgs = String(tableName || '').replace(/\(.*/, '').trim();
  const parts = noArgs.split('.').filter(Boolean);
  if (parts.length >= 3 && VIRTUAL_TABLES.has(parts[parts.length - 1])) {
    return parts.slice(0, -1).join('.');
  }
  return noArgs;
}

/** Подбирает псевдоним, которого ещё нет среди занятых имён. */
export function aliasFromTable(tableName: string, used: Set<string>): string {
  const noArgs = String(tableName || '').replace(/\(.*/, '').trim();
  const parts = noArgs.split('.').filter(Boolean);
  let base = parts[parts.length - 1] || 'Источник';
  if (VIRTUAL_TABLES.has(base) && parts.length >= 2) {
    base = parts[parts.length - 2];
  }
  let alias = base;
  let n = 1;
  while (used.has(alias.toLowerCase())) {
    n += 1;
    alias = `${base}${n}`;
  }
  return alias;
}

export function usedAliases(op: QueryOperator): Set<string> {
  return new Set(op.sources.map((s) => s.alias.toLowerCase()));
}

export function getBatchItem(schema: QuerySchema, index: number): BatchItem | null {
  return schema.batch[index] ?? null;
}

export function getSelect(schema: QuerySchema, index: number): SelectQuery | null {
  const item = schema.batch[index];
  return item && item.kind === 'select' ? item : null;
}

export function batchItemLabel(item: BatchItem, index: number): string {
  if (item.kind === 'drop') {
    return `Уничтожить ${item.tableName || '…'}`;
  }
  const into = item.into ? ` → ${item.into}` : '';
  const first = item.operators[0]?.sources[0];
  const src = first?.alias || first?.tableName || 'выбор';
  return `Запрос ${index + 1}: ${src}${into}`;
}

/** Выражение выглядит как агрегатная функция языка запросов. */
export function isAggregateExpression(expression: string): boolean {
  return /^(СУММА|КОЛИЧЕСТВО|МАКСИМУМ|МИНИМУМ|СРЕДНЕЕ|SUM|COUNT|MIN|MAX|AVG)\s*\(/i.test(expression.trim());
}

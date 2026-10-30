/**
 * Модель схемы запроса конструктора.
 * Повторяет смысловые части платформенного QuerySchema 1С без вызова платформы.
 */

/** Как текущий оператор соединяется с предыдущим. У первого оператора всегда `none`. */
export type UnionKind = 'none' | 'distinct' | 'all';

export type JoinType = 'inner' | 'left' | 'right' | 'full';

export type SortDirection = 'asc' | 'desc';

export type HierarchyMode = 'none' | 'hierarchy' | 'only';

/** Источник секции ИЗ: таблица, вложенный запрос или временная таблица. */
export interface QuerySource {
  id: string;
  kind: 'table' | 'nested' | 'temp';
  /** Имя таблицы вместе с аргументами виртуальной таблицы, если они есть. */
  tableName: string;
  alias: string;
  nested?: SelectQuery;
  /** Имена полей описания временной таблицы. В текст запроса сами по себе не попадают. */
  tempFields: string[];
}

export interface QueryField {
  id: string;
  expression: string;
  alias: string;
}

export interface QueryJoin {
  id: string;
  leftSourceId: string;
  rightSourceId: string;
  joinType: JoinType;
  condition: string;
}

export interface QueryCondition {
  id: string;
  expression: string;
}

export interface GroupingSet {
  id: string;
  fields: string[];
}

export interface AggregateField {
  id: string;
  expression: string;
  alias: string;
}

/** Один оператор ВЫБРАТЬ внутри объединения. */
export interface QueryOperator {
  id: string;
  unionType: UnionKind;
  sources: QuerySource[];
  fields: QueryField[];
  joins: QueryJoin[];
  conditions: QueryCondition[];
  having: string;
  groupingEnabled: boolean;
  groupingSets: GroupingSet[];
  aggregates: AggregateField[];
  allowed: boolean;
  distinct: boolean;
  /** Число или параметр: `10`, `&Количество`. Пустая строка — ограничения нет. */
  firstCount: string;
}

export interface OrderField {
  id: string;
  expression: string;
  direction: SortDirection;
}

export interface IndexDef {
  id: string;
  fields: string[];
}

export interface TotalExpression {
  id: string;
  expression: string;
  alias: string;
}

export interface TotalGrouping {
  id: string;
  expression: string;
  overall: boolean;
  hierarchy: HierarchyMode;
}

export interface DataCompositionField {
  id: string;
  expression: string;
  alias: string;
}

export interface DataCompositionFilter {
  id: string;
  expression: string;
}

/** Описание характеристики в расширении {ХАРАКТЕРИСТИКИ}. */
export interface CharacteristicDef {
  id: string;
  dataType: string;
  typesSource: string;
  keyField: string;
  nameField: string;
  valueTypeField: string;
  valuesSource: string;
  objectField: string;
  typeField: string;
  valueField: string;
}

export interface SelectQuery {
  kind: 'select';
  id: string;
  operators: QueryOperator[];
  into: string;
  order: OrderField[];
  autoOrder: boolean;
  indexes: IndexDef[];
  totalsEnabled: boolean;
  totalExpressions: TotalExpression[];
  totalGroupings: TotalGrouping[];
  forUpdate: boolean;
  forUpdateTables: string[];
  dataCompositionFields: DataCompositionField[];
  dataCompositionFilters: DataCompositionFilter[];
  requiredJoins: QueryJoin[];
  characteristics: CharacteristicDef[];
}

export interface DropQuery {
  kind: 'drop';
  id: string;
  tableName: string;
}

export type BatchItem = SelectQuery | DropQuery;

export interface QuerySchema {
  batch: BatchItem[];
  dataCompositionMode: boolean;
}

export interface ParseFailure {
  ok: false;
  message: string;
  offset: number;
}

export interface ParseSuccess {
  ok: true;
  schema: QuerySchema;
}

export type ParseResult = ParseSuccess | ParseFailure;

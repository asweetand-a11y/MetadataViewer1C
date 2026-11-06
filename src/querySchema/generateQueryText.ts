/**
 * Сборка текста запроса 1С из схемы конструктора.
 * Порядок секций совпадает с языком запросов: выборка, помещение, источники,
 * отбор, группировка, объединения, порядок, итоги, индексы, блокировка.
 */

import type {
  BatchItem,
  CharacteristicDef,
  IndexDef,
  JoinType,
  QueryOperator,
  QuerySchema,
  QuerySource,
  SelectQuery,
  TotalGrouping,
} from './types';

/** Между запросами пакета: «;» на своей строке и разделитель конструктора 1С. */
export const QUERY_BATCH_SEPARATOR = `\n;\n\n${'/'.repeat(80)}\n`;

/** Собирает текст пакета запросов. */
export function generateQueryText(schema: QuerySchema): string {
  const parts = schema.batch.map((item) => generateBatchItem(item));
  return parts.join(QUERY_BATCH_SEPARATOR);
}

function generateBatchItem(item: BatchItem): string {
  if (item.kind === 'drop') {
    return `УНИЧТОЖИТЬ ${item.tableName.trim()}`;
  }
  return generateSelect(item);
}

/** Собирает один запрос на выборку, включая вложенные запросы источников. */
export function generateSelect(query: SelectQuery): string {
  const chunks: string[] = [];
  query.operators.forEach((op, index) => {
    if (index > 0) {
      chunks.push(op.unionType === 'all' ? 'ОБЪЕДИНИТЬ ВСЕ' : 'ОБЪЕДИНИТЬ');
      chunks.push('');
    }
    chunks.push(generateOperator(op, index === 0 ? query : null));
  });

  if (query.order.length) {
    const lines = query.order.map((f) => `\t${f.expression}${f.direction === 'desc' ? ' УБЫВ' : ''}`);
    chunks.push(`УПОРЯДОЧИТЬ ПО\n${lines.join(',\n')}`);
  }
  if (query.autoOrder) chunks.push('АВТОУПОРЯДОЧИВАНИЕ');
  if (query.totalsEnabled && (query.totalExpressions.length || query.totalGroupings.length)) {
    chunks.push(generateTotals(query));
  }
  if (query.indexes.some((idx) => idx.fields.length)) {
    chunks.push(generateIndexes(query.indexes));
  }
  if (query.forUpdate) {
    const tables = query.forUpdateTables.map((t) => t.trim()).filter(Boolean);
    chunks.push(tables.length ? `ДЛЯ ИЗМЕНЕНИЯ\n\t${tables.join(',\n\t')}` : 'ДЛЯ ИЗМЕНЕНИЯ');
  }
  if (query.dataCompositionFilters.length) {
    const body = query.dataCompositionFilters.map((f) => f.expression.trim()).filter(Boolean);
    if (body.length) chunks.push(`{ГДЕ\n${body.map((l) => `\t${l}`).join(',\n')}\n}`);
  }
  for (const ch of query.characteristics) {
    const text = generateCharacteristic(ch);
    if (text) chunks.push(text);
  }
  for (const note of tempNotes(query)) chunks.push(note);
  for (const note of requiredJoinNotes(query)) chunks.push(note);

  return chunks.filter((c) => c !== '').join('\n');
}

function generateOperator(op: QueryOperator, queryForHead: SelectQuery | null): string {
  const lines: string[] = [];
  let head = 'ВЫБРАТЬ';
  if (op.allowed) head += ' РАЗРЕШЕННЫЕ';
  if (op.firstCount.trim()) head += ` ПЕРВЫЕ ${op.firstCount.trim()}`;
  if (op.distinct) head += ' РАЗЛИЧНЫЕ';
  lines.push(head);

  const fieldLines = op.fields
    .map((f) => formatFieldLine(f.expression, f.alias))
    .filter(Boolean);
  if (fieldLines.length) {
    lines.push(fieldLines.map((l) => `\t${l}`).join(',\n'));
  }

  if (queryForHead && queryForHead.dataCompositionFields.length) {
    const body = queryForHead.dataCompositionFields
      .map((f) => formatFieldLine(f.expression, f.alias))
      .filter(Boolean);
    if (body.length) lines.push(`{ВЫБРАТЬ\n${body.map((l) => `\t${l}`).join(',\n')}\n}`);
  }

  if (queryForHead && queryForHead.into.trim()) {
    lines.push(`ПОМЕСТИТЬ ${queryForHead.into.trim()}`);
  }

  const from = generateFrom(op);
  if (from) lines.push(from);

  const conds = op.conditions.map((c) => c.expression.trim()).filter(Boolean);
  if (conds.length) lines.push(`ГДЕ\n\t${conds.join('\n\tИ ')}`);

  if (op.groupingEnabled && op.groupingSets.some((s) => s.fields.length || op.groupingSets.length > 1)) {
    lines.push(generateGroupBy(op));
  }
  if (op.having.trim()) lines.push(`ИМЕЮЩИЕ\n\t${op.having.trim()}`);
  return lines.join('\n');
}

function formatFieldLine(expression: string, alias: string): string {
  const expr = expression.trim();
  if (!expr) return '';
  const a = alias.trim();
  return a ? `${expr} КАК ${formatAlias(a)}` : expr;
}

function formatAlias(alias: string): string {
  if (/^[A-Za-zА-Яа-яЁё_][0-9A-Za-zА-Яа-яЁё_]*$/.test(alias)) return alias;
  return `"${alias.replace(/"/g, '""')}"`;
}

function joinWord(type: JoinType): string {
  if (type === 'left') return 'ЛЕВОЕ СОЕДИНЕНИЕ';
  if (type === 'right') return 'ПРАВОЕ СОЕДИНЕНИЕ';
  if (type === 'full') return 'ПОЛНОЕ СОЕДИНЕНИЕ';
  return 'ВНУТРЕННЕЕ СОЕДИНЕНИЕ';
}

function inlineSource(source: QuerySource): string {
  if (source.kind === 'nested' && source.nested) {
    const inner = generateSelect(source.nested).trim();
    const indented = inner.split('\n').map((line) => `\t${line}`).join('\n');
    const alias = source.alias.trim() ? ` КАК ${formatAlias(source.alias.trim())}` : '';
    return `(\n${indented}\n)${alias}`;
  }
  const name = (source.tableName || source.alias).trim();
  const alias = source.alias.trim();
  if (!alias || alias === name) return name;
  return `${name} КАК ${formatAlias(alias)}`;
}

function generateFrom(op: QueryOperator): string {
  if (!op.sources.length) return '';
  const byId = new Map(op.sources.map((s) => [s.id, s]));
  const children = new Set(op.joins.map((j) => j.rightSourceId));
  let roots = op.sources.filter((s) => !children.has(s.id));
  if (!roots.length) roots = [op.sources[0]];

  const emitJoins = (leftId: string, indent: number): string[] => {
    const lines: string[] = [];
    const pad = '\t'.repeat(indent);
    for (const join of op.joins.filter((j) => j.leftSourceId === leftId)) {
      const right = byId.get(join.rightSourceId);
      if (!right) continue;
      lines.push(`${pad}${joinWord(join.joinType)} ${inlineSource(right)}`);
      lines.push(`${pad}ПО ${join.condition.trim() || 'ИСТИНА'}`);
      lines.push(...emitJoins(right.id, indent + 1));
    }
    return lines;
  };

  const parts = roots.map((root) => {
    const head = `\t${inlineSource(root)}`;
    const joins = emitJoins(root.id, 2);
    return joins.length ? `${head}\n${joins.join('\n')}` : head;
  });
  return `ИЗ\n${parts.join(',\n')}`;
}

function generateGroupBy(op: QueryOperator): string {
  const sets = op.groupingSets;
  if (sets.length <= 1) {
    const fields = (sets[0]?.fields ?? []).map((f) => f.trim()).filter(Boolean);
    if (!fields.length) return '';
    return `СГРУППИРОВАТЬ ПО\n${fields.map((f) => `\t${f}`).join(',\n')}`;
  }
  const body = sets
    .map((set) => {
      const fields = set.fields.map((f) => f.trim()).filter(Boolean);
      return `\t(${fields.join(', ')})`;
    })
    .join(',\n');
  return `СГРУППИРОВАТЬ ПО\n\tГРУППИРУЮЩИМ НАБОРАМ (\n${body}\n\t)`;
}

function generateTotals(query: SelectQuery): string {
  const exprs = query.totalExpressions
    .map((f) => formatFieldLine(f.expression, f.alias))
    .filter(Boolean)
    .map((l) => `\t${l}`);
  const groups = query.totalGroupings
    .map((g) => emitTotalGroup(g))
    .filter(Boolean)
    .map((l) => `\t${l}`);
  const lines = ['ИТОГИ'];
  if (exprs.length) lines.push(exprs.join(',\n'));
  if (groups.length) lines.push(`ПО\n${groups.join(',\n')}`);
  return lines.join('\n');
}

function emitTotalGroup(g: TotalGrouping): string {
  if (g.overall || !g.expression.trim()) return g.overall ? 'ОБЩИЕ' : '';
  if (g.hierarchy === 'only') return `${g.expression.trim()} ТОЛЬКО ИЕРАРХИЯ`;
  if (g.hierarchy === 'hierarchy') return `${g.expression.trim()} ИЕРАРХИЯ`;
  return g.expression.trim();
}

function generateIndexes(indexes: IndexDef[]): string {
  const filled = indexes.filter((idx) => idx.fields.length);
  const flat = filled.flatMap((idx) => idx.fields.map((f) => f.trim()).filter(Boolean));
  if (!flat.length) return '';
  const lines: string[] = [];
  if (filled.length > 1) {
    lines.push(`//QW-INDEXES\t${filled.map((idx) => idx.fields.length).join('\t')}`);
  }
  lines.push(`ИНДЕКСИРОВАТЬ ПО\n${flat.map((f) => `\t${f}`).join(',\n')}`);
  return lines.join('\n');
}

function generateCharacteristic(ch: CharacteristicDef): string {
  const lines: string[] = ['{ХАРАКТЕРИСТИКИ'];
  if (ch.dataType.trim()) lines.push(`ТИП(${ch.dataType.trim()})`);
  if (ch.typesSource.trim()) lines.push(`ВИДЫХАРАКТЕРИСТИК ${ch.typesSource.trim()}`);
  if (ch.keyField.trim()) lines.push(`ПОЛЕКЛЮЧА ${ch.keyField.trim()}`);
  if (ch.nameField.trim()) lines.push(`ПОЛЕИМЕНИ ${ch.nameField.trim()}`);
  if (ch.valueTypeField.trim()) lines.push(`ПОЛЕТИПАЗНАЧЕНИЯ ${ch.valueTypeField.trim()}`);
  if (ch.valuesSource.trim()) lines.push(`ЗНАЧЕНИЯХАРАКТЕРИСТИК ${ch.valuesSource.trim()}`);
  if (ch.objectField.trim()) lines.push(`ПОЛЕОБЪЕКТА ${ch.objectField.trim()}`);
  if (ch.typeField.trim()) lines.push(`ПОЛЕВИДА ${ch.typeField.trim()}`);
  if (ch.valueField.trim()) lines.push(`ПОЛЕЗНАЧЕНИЯ ${ch.valueField.trim()}`);
  if (lines.length === 1) return '';
  lines.push('}');
  return lines.join('\n');
}

function tempNotes(query: SelectQuery): string[] {
  const notes: string[] = [];
  for (const op of query.operators) {
    for (const src of op.sources) {
      if (src.kind === 'temp' && src.tempFields.length && src.alias.trim()) {
        notes.push(['//QW-TEMP', src.alias.trim(), ...src.tempFields].join('\t'));
      }
    }
  }
  return notes;
}

function requiredJoinNotes(query: SelectQuery): string[] {
  const sources = query.operators[0]?.sources ?? [];
  const aliasById = new Map(sources.map((s) => [s.id, s.alias]));
  const notes: string[] = [];
  for (const join of query.requiredJoins) {
    const left = aliasById.get(join.leftSourceId) || '';
    const right = aliasById.get(join.rightSourceId) || '';
    if (!left || !right) continue;
    const condition = join.condition.replace(/\s+/g, ' ').trim();
    notes.push(['//QW-REQ', left, right, join.joinType, condition].join('\t'));
  }
  return notes;
}

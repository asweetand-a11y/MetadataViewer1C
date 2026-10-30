/**
 * Разбор текста запроса 1С в схему конструктора.
 * При ошибке схема не строится: вызывающий код сохраняет исходный текст.
 */

/* eslint-disable no-constant-condition -- разбор идёт циклами до конца текста или ошибки */

import { createEmptySchema, createOperator, createSelectQuery, isAggregateExpression, newId } from './model';
import type {
  CharacteristicDef,
  DataCompositionFilter,
  HierarchyMode,
  IndexDef,
  JoinType,
  ParseResult,
  QueryField,
  QueryJoin,
  QueryOperator,
  QuerySchema,
  QuerySource,
  SelectQuery,
  SortDirection,
  TotalGrouping,
  UnionKind,
} from './types';

const KEYWORDS = [
  'АВТОУПОРЯДОЧИВАНИЕ',
  'ИНДЕКСИРОВАТЬ',
  'СГРУППИРОВАТЬ',
  'ГРУППИРУЮЩИМ',
  'ОБЪЕДИНИТЬ',
  'РАЗРЕШЕННЫЕ',
  'УПОРЯДОЧИТЬ',
  'УНИЧТОЖИТЬ',
  'РАЗЛИЧНЫЕ',
  'ПОМЕСТИТЬ',
  'ИЗМЕНЕНИЯ',
  'СОЕДИНЕНИЕ',
  'ИЕРАРХИЯ',
  'ХАРАКТЕРИСТИКИ',
  'ВНУТРЕННЕЕ',
  'ВЫБРАТЬ',
  'ИМЕЮЩИЕ',
  'ПЕРВЫЕ',
  'ПОЛНОЕ',
  'ПРАВОЕ',
  'ВНЕШНЕЕ',
  'НАБОРАМ',
  'ЛЕВОЕ',
  'ИТОГИ',
  'ОБЩИЕ',
  'ДЛЯ',
  'ГДЕ',
  'ВСЕ',
  'КАК',
  'ИЗ',
  'ПО',
  'НЕ',
  'ИЛИ',
  'И',
  'AUTOORDER',
  'DISTINCT',
  'ALLOWED',
  'HIERARCHY',
  'UPDATE',
  'SELECT',
  'HAVING',
  'TOTALS',
  'INDEX',
  'GROUP',
  'ORDER',
  'UNION',
  'WHERE',
  'INNER',
  'OUTER',
  'FIRST',
  'RIGHT',
  'LEFT',
  'JOIN',
  'INTO',
  'FROM',
  'DROP',
  'FOR',
  'ONLY',
  'FULL',
  'ALL',
  'ASC',
  'DESC',
  'TOP',
  'AND',
  'NOT',
  'AS',
  'ON',
  'BY',
  'OF',
  'OR',
  'ВОЗР',
  'УБЫВ',
  'ТОЛЬКО',
].sort((a, b) => b.length - a.length);

const CLAUSE_STOPS = new Set([
  'ПОМЕСТИТЬ',
  'INTO',
  'ИЗ',
  'FROM',
  'ГДЕ',
  'WHERE',
  'СГРУППИРОВАТЬ',
  'GROUP',
  'ИМЕЮЩИЕ',
  'HAVING',
  'ОБЪЕДИНИТЬ',
  'UNION',
  'УПОРЯДОЧИТЬ',
  'ORDER',
  'АВТОУПОРЯДОЧИВАНИЕ',
  'AUTOORDER',
  'ИТОГИ',
  'TOTALS',
  'ИНДЕКСИРОВАТЬ',
  'INDEX',
  'ДЛЯ',
  'FOR',
  ';',
  ')',
]);

const JOIN_STARTERS = new Set([
  'ВНУТРЕННЕЕ',
  'ЛЕВОЕ',
  'ПРАВОЕ',
  'ПОЛНОЕ',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'JOIN',
]);

export class QueryParseError extends Error {
  readonly offset: number;

  constructor(message: string, offset: number) {
    super(message);
    this.offset = offset;
  }
}

/** Позиция ошибки в строке и колонке, обе величины с единицы. */
export function offsetToLineCol(text: string, offset: number): { line: number; col: number } {
  let line = 1;
  let col = 1;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i += 1) {
    if (text[i] === '\n') {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
  }
  return { line, col };
}

interface PendingReq {
  left: string;
  right: string;
  joinType: JoinType;
  condition: string;
}

interface PendingTemp {
  alias: string;
  fields: string[];
}

/**
 * Разбирает пакет запросов.
 * Пустой текст становится пустой схемой выборки, а не ошибкой.
 */
export function parseQueryText(text: string, dataCompositionMode = false): ParseResult {
  try {
    const src = text.replace(/^\uFEFF/, '');
    if (!src.trim()) {
      return { ok: true, schema: createEmptySchema(dataCompositionMode) };
    }
    const cursor = new Cursor(src);
    const schema: QuerySchema = { batch: [], dataCompositionMode };
    while (true) {
      cursor.skip();
      if (cursor.eof()) break;
      const kw = cursor.peekKw();
      if (kw === 'УНИЧТОЖИТЬ' || kw === 'DROP') {
        schema.batch.push(cursor.parseDrop());
      } else {
        schema.batch.push(cursor.parseSelect());
      }
      cursor.skip();
      if (cursor.peekChar() === ';') {
        cursor.i += 1;
        continue;
      }
      if (cursor.eof()) break;
      const next = cursor.peekKw();
      if (next === 'ВЫБРАТЬ' || next === 'SELECT' || next === 'УНИЧТОЖИТЬ' || next === 'DROP') {
        continue;
      }
      break;
    }
    if (!schema.batch.length) schema.batch.push(createSelectQuery());
    return { ok: true, schema };
  } catch (error) {
    if (error instanceof QueryParseError) {
      return { ok: false, message: error.message, offset: error.offset };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message, offset: 0 };
  }
}

class Cursor {
  readonly s: string;
  i = 0;
  private pendingIndexCounts: number[] | null = null;
  private reqs: PendingReq[] = [];
  private temps: PendingTemp[] = [];

  constructor(src: string) {
    this.s = src;
  }

  eof(): boolean {
    return this.skipIndex(this.i, false) >= this.s.length;
  }

  peekChar(): string {
    const i = this.skipIndex(this.i, false);
    return this.s.charAt(i);
  }

  peekKw(): string | null {
    return keywordAt(this.s, this.skipIndex(this.i, false));
  }

  skip(): void {
    this.i = this.skipIndex(this.i, true);
  }

  fail(message: string): never {
    const near = this.s.slice(this.i, this.i + 40).replace(/\s+/g, ' ');
    throw new QueryParseError(`${message}. Рядом с: «${near}»`, this.i);
  }

  take(options: string[]): string | null {
    const kw = this.peekKw();
    if (!kw || options.indexOf(kw) < 0) return null;
    this.skip();
    this.i += kw.length;
    return kw;
  }

  expect(options: string[]): string {
    const kw = this.take(options);
    if (!kw) this.fail(`Ожидалось: ${options.join(' или ')}`);
    return kw;
  }

  parseDrop(): { kind: 'drop'; id: string; tableName: string } {
    this.expect(['УНИЧТОЖИТЬ', 'DROP']);
    const tableName = this.readDotted();
    return { kind: 'drop', id: newId(), tableName };
  }

  parseSelect(): SelectQuery {
    const savedReqs = this.reqs;
    const savedTemps = this.temps;
    this.reqs = [];
    this.temps = [];
    const query = createSelectQuery();
    query.operators = [];
    let union: UnionKind = 'none';
    while (true) {
      const op = createOperator();
      op.unionType = union;
      this.parseOperator(op, query);
      query.operators.push(op);
      if (this.take(['ОБЪЕДИНИТЬ', 'UNION'])) {
        union = this.take(['ВСЕ', 'ALL']) ? 'all' : 'distinct';
        continue;
      }
      break;
    }
    if (!query.operators.length) query.operators.push(createOperator());
    this.parseTail(query);
    this.bindSideData(query);
    this.reqs = savedReqs;
    this.temps = savedTemps;
    return query;
  }

  private parseOperator(op: QueryOperator, query: SelectQuery): void {
    this.expect(['ВЫБРАТЬ', 'SELECT']);
    while (true) {
      if (this.take(['РАЗРЕШЕННЫЕ', 'ALLOWED'])) {
        op.allowed = true;
        continue;
      }
      if (this.take(['РАЗЛИЧНЫЕ', 'DISTINCT'])) {
        op.distinct = true;
        continue;
      }
      if (this.take(['ПЕРВЫЕ', 'FIRST', 'TOP'])) {
        op.firstCount = this.readSimple();
        continue;
      }
      break;
    }

    const fieldsChunk = this.readUntil(CLAUSE_STOPS);
    op.fields = splitFields(fieldsChunk.text);

    while (true) {
      if (this.peekChar() === '{') {
        this.parseBrace(query);
        continue;
      }
      if (this.take(['ПОМЕСТИТЬ', 'INTO'])) {
        query.into = this.readDotted();
        continue;
      }
      if (this.take(['ИЗ', 'FROM'])) {
        this.parseFrom(op);
        continue;
      }
      if (this.take(['ГДЕ', 'WHERE'])) {
        const expr = this.readUntil(CLAUSE_STOPS).text.trim();
        op.conditions = expr ? [{ id: newId(), expression: expr }] : [];
        continue;
      }
      if (this.take(['СГРУППИРОВАТЬ'])) {
        this.expect(['ПО']);
        this.parseGroup(op);
        continue;
      }
      if (this.take(['GROUP'])) {
        this.expect(['BY']);
        this.parseGroup(op);
        continue;
      }
      if (this.take(['ИМЕЮЩИЕ', 'HAVING'])) {
        op.having = this.readUntil(CLAUSE_STOPS).text.trim();
        continue;
      }
      break;
    }

    if (op.groupingEnabled) {
      op.aggregates = op.fields.filter((f) => isAggregateExpression(f.expression)).map((f) => ({
        id: newId(),
        expression: f.expression,
        alias: f.alias,
      }));
    }
  }

  private parseFrom(op: QueryOperator): void {
    while (true) {
      const source = this.readSource();
      op.sources.push(source);
      let leftId = source.id;
      while (this.isJoinStarter()) {
        const joinType = this.readJoinType();
        const right = this.readSource();
        op.sources.push(right);
        this.expect(['ПО', 'ON']);
        const stops = new Set(CLAUSE_STOPS);
        JOIN_STARTERS.forEach((k) => stops.add(k));
        const condition = this.readUntil(stops, new Set([','])).text.trim() || 'ИСТИНА';
        const join: QueryJoin = {
          id: newId(),
          leftSourceId: leftId,
          rightSourceId: right.id,
          joinType,
          condition,
        };
        op.joins.push(join);
        leftId = right.id;
      }
      this.skip();
      if (this.s.charAt(this.i) === ',') {
        this.i += 1;
        continue;
      }
      break;
    }
  }

  private isJoinStarter(): boolean {
    const kw = this.peekKw();
    return !!kw && JOIN_STARTERS.has(kw);
  }

  private readJoinType(): JoinType {
    const kw = this.peekKw();
    if (kw === 'ЛЕВОЕ' || kw === 'LEFT') {
      this.take([kw]);
      this.take(['ВНЕШНЕЕ', 'OUTER']);
      this.expect(['СОЕДИНЕНИЕ', 'JOIN']);
      return 'left';
    }
    if (kw === 'ПРАВОЕ' || kw === 'RIGHT') {
      this.take([kw]);
      this.take(['ВНЕШНЕЕ', 'OUTER']);
      this.expect(['СОЕДИНЕНИЕ', 'JOIN']);
      return 'right';
    }
    if (kw === 'ПОЛНОЕ' || kw === 'FULL') {
      this.take([kw]);
      this.take(['ВНЕШНЕЕ', 'OUTER']);
      this.expect(['СОЕДИНЕНИЕ', 'JOIN']);
      return 'full';
    }
    if (kw === 'ВНУТРЕННЕЕ' || kw === 'INNER') {
      this.take([kw]);
      this.expect(['СОЕДИНЕНИЕ', 'JOIN']);
      return 'inner';
    }
    this.expect(['JOIN', 'СОЕДИНЕНИЕ']);
    return 'inner';
  }

  private readSource(): QuerySource {
    this.skip();
    if (this.s.charAt(this.i) === '(') {
      const wrapped = this.readBalanced();
      const inner = wrapped.slice(1, -1);
      const nestedCursor = new Cursor(inner);
      const nested = nestedCursor.parseSelect();
      nestedCursor.skip();
      if (!nestedCursor.eof()) nestedCursor.fail('Лишний текст во вложенном запросе');
      const alias = this.readOptionalAlias() || 'ВложенныйЗапрос';
      return { id: newId(), kind: 'nested', tableName: '', alias, nested, tempFields: [] };
    }
    const tableName = this.readTableName();
    const alias = this.readOptionalAlias() || tableName.replace(/\(.*/, '').split('.').pop() || 'Т';
    return { id: newId(), kind: 'table', tableName, alias, tempFields: [] };
  }

  private parseGroup(op: QueryOperator): void {
    op.groupingEnabled = true;
    if (this.take(['ГРУППИРУЮЩИМ'])) {
      this.expect(['НАБОРАМ']);
      this.expectChar('(');
      const sets: string[][] = [];
      while (true) {
        this.skip();
        if (this.s.charAt(this.i) === ')') {
          this.i += 1;
          break;
        }
        const wrapped = this.readBalanced();
        sets.push(splitComma(wrapped.slice(1, -1)).map((f) => f.trim()).filter(Boolean));
        this.skip();
        if (this.s.charAt(this.i) === ',') this.i += 1;
      }
      op.groupingSets = sets.map((fields) => ({ id: newId(), fields }));
      return;
    }
    const chunk = this.readUntil(CLAUSE_STOPS).text;
    const fields = splitComma(chunk).map((f) => f.trim()).filter(Boolean);
    op.groupingSets = [{ id: newId(), fields }];
  }

  private parseTail(query: SelectQuery): void {
    while (true) {
      this.skip();
      if (this.i >= this.s.length || this.s.charAt(this.i) === ';' || this.s.charAt(this.i) === ')') break;
      if (this.peekChar() === '{') {
        this.parseBrace(query);
        continue;
      }
      if (this.take(['УПОРЯДОЧИТЬ'])) {
        this.expect(['ПО']);
        query.order = parseOrder(this.readUntil(CLAUSE_STOPS).text);
        continue;
      }
      if (this.take(['ORDER'])) {
        this.expect(['BY']);
        query.order = parseOrder(this.readUntil(CLAUSE_STOPS).text);
        continue;
      }
      if (this.take(['АВТОУПОРЯДОЧИВАНИЕ', 'AUTOORDER'])) {
        query.autoOrder = true;
        continue;
      }
      if (this.take(['ИТОГИ', 'TOTALS'])) {
        this.parseTotals(query);
        continue;
      }
      if (this.take(['ИНДЕКСИРОВАТЬ'])) {
        this.expect(['ПО']);
        query.indexes = this.parseIndexes();
        continue;
      }
      if (this.take(['INDEX'])) {
        this.expect(['BY']);
        query.indexes = this.parseIndexes();
        continue;
      }
      if (this.take(['ДЛЯ'])) {
        this.expect(['ИЗМЕНЕНИЯ']);
        this.parseForUpdate(query);
        continue;
      }
      if (this.take(['FOR'])) {
        this.expect(['UPDATE']);
        this.take(['OF']);
        this.parseForUpdate(query);
        continue;
      }
      const kw = this.peekKw();
      if (kw === 'ВЫБРАТЬ' || kw === 'SELECT' || kw === 'УНИЧТОЖИТЬ' || kw === 'DROP') break;
      this.fail('Неожиданный фрагмент запроса');
    }
  }

  private parseTotals(query: SelectQuery): void {
    query.totalsEnabled = true;
    const exprStops = new Set(CLAUSE_STOPS);
    exprStops.add('ПО');
    exprStops.add('BY');
    const exprs = this.readUntil(exprStops).text;
    query.totalExpressions = splitFields(exprs);
    if (this.take(['ПО', 'BY'])) {
      const groups = this.readUntil(CLAUSE_STOPS).text;
      query.totalGroupings = splitComma(groups).map(parseTotalGroup).filter((g): g is TotalGrouping => !!g);
    }
  }

  private parseIndexes(): IndexDef[] {
    const fields = splitComma(this.readUntil(CLAUSE_STOPS).text).map((f) => f.trim()).filter(Boolean);
    const counts = this.pendingIndexCounts;
    this.pendingIndexCounts = null;
    if (!counts || !counts.length) {
      return fields.length ? [{ id: newId(), fields }] : [];
    }
    const indexes: IndexDef[] = [];
    let offset = 0;
    for (const count of counts) {
      indexes.push({ id: newId(), fields: fields.slice(offset, offset + count) });
      offset += count;
    }
    if (offset < fields.length) indexes.push({ id: newId(), fields: fields.slice(offset) });
    return indexes.filter((idx) => idx.fields.length);
  }

  private parseForUpdate(query: SelectQuery): void {
    query.forUpdate = true;
    if (this.eof() || this.peekChar() === ';' || this.peekChar() === ')' || this.peekKw() || this.peekChar() === '{') {
      return;
    }
    const chunk = this.readUntil(CLAUSE_STOPS).text;
    query.forUpdateTables = splitComma(chunk).map((f) => f.trim()).filter(Boolean);
  }

  private parseBrace(query: SelectQuery): void {
    const inner = this.readBraceInner();
    const innerCursor = new Cursor(inner);
    const kw = innerCursor.peekKw();
    if (kw === 'ВЫБРАТЬ' || kw === 'SELECT') {
      innerCursor.take([kw]);
      query.dataCompositionFields = splitFields(inner.slice(innerCursor.i));
      return;
    }
    if (kw === 'ГДЕ' || kw === 'WHERE') {
      innerCursor.take([kw]);
      const filters: DataCompositionFilter[] = splitFields(inner.slice(innerCursor.i)).map((f) => ({
        id: newId(),
        expression: f.alias ? `${f.expression} КАК ${f.alias}` : f.expression,
      }));
      query.dataCompositionFilters = filters;
      return;
    }
    if (kw === 'ХАРАКТЕРИСТИКИ') {
      innerCursor.take([kw]);
      query.characteristics.push(...parseCharacteristics(inner.slice(innerCursor.i)));
    }
  }

  private bindSideData(query: SelectQuery): void {
    for (const temp of this.temps) {
      for (const op of query.operators) {
        const src = op.sources.find((s) => s.alias.toLowerCase() === temp.alias.toLowerCase());
        if (!src) continue;
        src.kind = 'temp';
        src.tempFields = temp.fields;
      }
    }
    const sources = query.operators[0]?.sources ?? [];
    for (const req of this.reqs) {
      const left = sources.find((s) => s.alias.toLowerCase() === req.left.toLowerCase());
      const right = sources.find((s) => s.alias.toLowerCase() === req.right.toLowerCase());
      if (!left || !right) continue;
      query.requiredJoins.push({
        id: newId(),
        leftSourceId: left.id,
        rightSourceId: right.id,
        joinType: req.joinType,
        condition: req.condition,
      });
    }
  }

  private readUntil(stops: Set<string>, extraStops?: Set<string>): { text: string; kw: string | null } {
    let out = '';
    let paren = 0;
    let brace = 0;
    let bracket = 0;
    let quote = false;
    while (this.i < this.s.length) {
      const c = this.s.charAt(this.i);
      const n = this.s.charAt(this.i + 1);
      if (quote) {
        out += c;
        if (c === '"' && n === '"') {
          out += n;
          this.i += 2;
          continue;
        }
        if (c === '"') quote = false;
        this.i += 1;
        continue;
      }
      if (c === '/' && n === '/') {
        const lineEnd = this.s.indexOf('\n', this.i);
        const line = this.s.slice(this.i, lineEnd < 0 ? this.s.length : lineEnd);
        if (paren === 0 && brace === 0 && bracket === 0 && line.startsWith('//QW-')) {
          return { text: out.trim(), kw: null };
        }
        this.i = lineEnd < 0 ? this.s.length : lineEnd + 1;
        continue;
      }
      if (c === '/' && n === '*') {
        const end = this.s.indexOf('*/', this.i + 2);
        this.i = end < 0 ? this.s.length : end + 2;
        continue;
      }
      if (c === '"') {
        quote = true;
        out += c;
        this.i += 1;
        continue;
      }
      if (c === '(') paren += 1;
      else if (c === ')') {
        if (paren === 0 && brace === 0 && bracket === 0 && stops.has(')')) {
          return { text: out.trim(), kw: ')' };
        }
        paren = Math.max(0, paren - 1);
      } else if (c === '{') {
        if (paren === 0 && brace === 0 && bracket === 0) {
          return { text: out.trim(), kw: '{' };
        }
        brace += 1;
      } else if (c === '}') brace = Math.max(0, brace - 1);
      else if (c === '[') bracket += 1;
      else if (c === ']') bracket = Math.max(0, bracket - 1);
      else if (c === ';' && paren === 0 && brace === 0 && bracket === 0 && stops.has(';')) {
        return { text: out.trim(), kw: ';' };
      }

      if (paren === 0 && brace === 0 && bracket === 0) {
        if (extraStops && extraStops.has(c)) return { text: out.trim(), kw: c };
        const kw = keywordAt(this.s, this.i);
        if (kw && stops.has(kw)) return { text: out.trim(), kw };
      }
      out += c;
      this.i += 1;
    }
    return { text: out.trim(), kw: null };
  }

  private readOptionalAlias(): string | undefined {
    if (this.take(['КАК', 'AS'])) return this.readIdent();
    if (this.peekKw()) return undefined;
    if (!this.peekIdent()) return undefined;
    return this.readIdent();
  }

  private peekIdent(): boolean {
    const i = this.skipIndex(this.i, false);
    const c = this.s.charAt(i);
    return c === '"' || isWordStart(c);
  }

  private readSimple(): string {
    this.skip();
    if (this.s.charAt(this.i) === '&') {
      this.i += 1;
      return `&${this.readIdent()}`;
    }
    if (isDigit(this.s.charAt(this.i))) {
      const start = this.i;
      while (isDigit(this.s.charAt(this.i))) this.i += 1;
      return this.s.slice(start, this.i);
    }
    return this.readIdent();
  }

  private readDotted(): string {
    let name = this.readIdent();
    while (true) {
      const i = this.skipIndex(this.i, false);
      if (this.s.charAt(i) !== '.') break;
      this.i = i + 1;
      name += `.${this.readIdent()}`;
    }
    return name;
  }

  private readTableName(): string {
    let name = this.readDotted();
    const i = this.skipIndex(this.i, false);
    if (this.s.charAt(i) === '(') {
      this.i = i;
      name += this.readBalanced();
    }
    return name;
  }

  private readIdent(): string {
    this.skip();
    if (this.s.charAt(this.i) === '"') {
      this.i += 1;
      let out = '';
      while (this.i < this.s.length) {
        const c = this.s.charAt(this.i);
        const n = this.s.charAt(this.i + 1);
        if (c === '"' && n === '"') {
          out += '"';
          this.i += 2;
          continue;
        }
        if (c === '"') {
          this.i += 1;
          break;
        }
        out += c;
        this.i += 1;
      }
      return out;
    }
    if (!isWordStart(this.s.charAt(this.i))) this.fail('Ожидалось имя');
    const start = this.i;
    this.i += 1;
    while (isWord(this.s.charAt(this.i))) this.i += 1;
    return this.s.slice(start, this.i);
  }

  private expectChar(ch: string): void {
    this.skip();
    if (this.s.charAt(this.i) !== ch) this.fail(`Ожидался символ ${ch}`);
    this.i += 1;
  }

  private readBalanced(): string {
    this.skip();
    if (this.s.charAt(this.i) !== '(') this.fail('Ожидалась скобка');
    return this.readBalancedFromOpen();
  }

  /** Читает группу скобок, текущий символ уже открывающая скобка. */
  private readBalancedFromOpen(): string {
    const start = this.i;
    let depth = 0;
    let quote = false;
    while (this.i < this.s.length) {
      const c = this.s.charAt(this.i);
      const n = this.s.charAt(this.i + 1);
      if (quote) {
        if (c === '"' && n === '"') {
          this.i += 2;
          continue;
        }
        if (c === '"') quote = false;
        this.i += 1;
        continue;
      }
      if (c === '"') {
        quote = true;
        this.i += 1;
        continue;
      }
      if (c === '/' && n === '/') {
        const lineEnd = this.s.indexOf('\n', this.i);
        this.i = lineEnd < 0 ? this.s.length : lineEnd + 1;
        continue;
      }
      if (c === '/' && n === '*') {
        const end = this.s.indexOf('*/', this.i + 2);
        this.i = end < 0 ? this.s.length : end + 2;
        continue;
      }
      if (c === '(') depth += 1;
      if (c === ')') {
        depth -= 1;
        this.i += 1;
        if (depth === 0) return this.s.slice(start, this.i);
        continue;
      }
      this.i += 1;
    }
    this.fail('Не закрыта скобка');
  }

  private readBraceInner(): string {
    this.skip();
    if (this.s.charAt(this.i) !== '{') this.fail('Ожидалась фигурная скобка');
    this.i += 1;
    const start = this.i;
    let depth = 1;
    let quote = false;
    while (this.i < this.s.length) {
      const c = this.s.charAt(this.i);
      const n = this.s.charAt(this.i + 1);
      if (quote) {
        if (c === '"' && n === '"') {
          this.i += 2;
          continue;
        }
        if (c === '"') quote = false;
        this.i += 1;
        continue;
      }
      if (c === '"') {
        quote = true;
        this.i += 1;
        continue;
      }
      if (c === '{') depth += 1;
      if (c === '}') {
        depth -= 1;
        if (depth === 0) {
          const inner = this.s.slice(start, this.i);
          this.i += 1;
          return inner;
        }
      }
      this.i += 1;
    }
    this.fail('Не закрыта фигурная скобка');
  }

  private skipIndex(pos: number, record: boolean): number {
    let i = pos;
    while (i < this.s.length) {
      const c = this.s.charAt(i);
      const n = this.s.charAt(i + 1);
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        i += 1;
        continue;
      }
      if (c === '/' && n === '/') {
        const lineEnd = this.s.indexOf('\n', i);
        const end = lineEnd < 0 ? this.s.length : lineEnd;
        const line = this.s.slice(i, end).replace(/\r$/, '');
        if (record && line.startsWith('//QW-')) this.captureNote(line);
        i = lineEnd < 0 ? this.s.length : lineEnd + 1;
        continue;
      }
      if (c === '/' && n === '*') {
        const end = this.s.indexOf('*/', i + 2);
        i = end < 0 ? this.s.length : end + 2;
        continue;
      }
      break;
    }
    return i;
  }

  private captureNote(line: string): void {
    const body = line.replace(/^\/\/QW-/, '');
    const parts = body.split('\t');
    const kind = (parts[0] || '').trim();
    if (kind === 'INDEXES') {
      this.pendingIndexCounts = parts.slice(1).map((p) => Number(p)).filter((n) => Number.isFinite(n) && n > 0);
      return;
    }
    if (kind === 'REQ' && parts.length >= 5) {
      const joinType = asJoinType(parts[3] || '');
      this.reqs.push({
        left: parts[1] || '',
        right: parts[2] || '',
        joinType,
        condition: parts.slice(4).join('\t'),
      });
      return;
    }
    if (kind === 'TEMP' && parts.length >= 2) {
      this.temps.push({ alias: parts[1] || '', fields: parts.slice(2).filter(Boolean) });
    }
  }
}

function asJoinType(value: string): JoinType {
  if (value === 'left' || value === 'right' || value === 'full' || value === 'inner') return value;
  return 'inner';
}

function keywordAt(src: string, index: number): string | null {
  if (index > 0 && isWord(src.charAt(index - 1))) return null;
  const slice = src.slice(index, index + 40).toLocaleUpperCase('ru-RU');
  for (const kw of KEYWORDS) {
    if (!slice.startsWith(kw)) continue;
    const after = src.charAt(index + kw.length);
    if (after && isWord(after)) continue;
    return kw;
  }
  return null;
}

function isWordStart(ch: string): boolean {
  return /[A-Za-zА-Яа-яЁё_]/.test(ch);
}

function isWord(ch: string): boolean {
  return /[0-9A-Za-zА-Яа-яЁё_]/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function splitComma(src: string): string[] {
  return splitBy(src, ',');
}

function splitFields(src: string): QueryField[] {
  return splitComma(src)
    .map((part) => splitAlias(part))
    .filter((f) => f.expression.trim().length > 0);
}

function splitAlias(field: string): QueryField {
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let quote = false;
  let last = -1;
  let lastLen = 0;
  for (let i = 0; i < field.length; i += 1) {
    const c = field.charAt(i);
    const n = field.charAt(i + 1);
    if (quote) {
      if (c === '"' && n === '"') {
        i += 1;
        continue;
      }
      if (c === '"') quote = false;
      continue;
    }
    if (c === '"') {
      quote = true;
      continue;
    }
    if (c === '(') paren += 1;
    else if (c === ')') paren = Math.max(0, paren - 1);
    else if (c === '{') brace += 1;
    else if (c === '}') brace = Math.max(0, brace - 1);
    else if (c === '[') bracket += 1;
    else if (c === ']') bracket = Math.max(0, bracket - 1);
    if (paren === 0 && brace === 0 && bracket === 0) {
      const kw = keywordAt(field, i);
      if (kw === 'КАК' || kw === 'AS') {
        last = i;
        lastLen = kw.length;
      }
    }
  }
  if (last < 0) return { id: newId(), expression: field.trim(), alias: '' };
  return {
    id: newId(),
    expression: field.slice(0, last).trim(),
    alias: unquote(field.slice(last + lastLen)),
  };
}

function unquote(value: string): string {
  const t = value.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/""/g, '"');
  }
  return t;
}

function splitBy(src: string, separator: string): string[] {
  const out: string[] = [];
  let start = 0;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let quote = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src.charAt(i);
    const n = src.charAt(i + 1);
    if (quote) {
      if (c === '"' && n === '"') {
        i += 1;
        continue;
      }
      if (c === '"') quote = false;
      continue;
    }
    if (c === '"') {
      quote = true;
      continue;
    }
    if (c === '/' && n === '/') {
      const lineEnd = src.indexOf('\n', i);
      i = lineEnd < 0 ? src.length : lineEnd;
      continue;
    }
    if (c === '(') paren += 1;
    else if (c === ')') paren = Math.max(0, paren - 1);
    else if (c === '{') brace += 1;
    else if (c === '}') brace = Math.max(0, brace - 1);
    else if (c === '[') bracket += 1;
    else if (c === ']') bracket = Math.max(0, bracket - 1);
    else if (c === separator && paren === 0 && brace === 0 && bracket === 0) {
      out.push(src.slice(start, i));
      start = i + 1;
    }
  }
  out.push(src.slice(start));
  return out;
}

function parseOrder(src: string): SelectQuery['order'] {
  return splitComma(src)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const dir = stripDirection(part);
      return { id: newId(), expression: dir.expression, direction: dir.direction };
    })
    .filter((f) => f.expression.length > 0);
}

function stripDirection(item: string): { expression: string; direction: SortDirection } {
  let paren = 0;
  let quote = false;
  let lastKw = '';
  let lastAt = -1;
  for (let i = 0; i < item.length; i += 1) {
    const c = item.charAt(i);
    const n = item.charAt(i + 1);
    if (quote) {
      if (c === '"' && n === '"') {
        i += 1;
        continue;
      }
      if (c === '"') quote = false;
      continue;
    }
    if (c === '"') {
      quote = true;
      continue;
    }
    if (c === '(') paren += 1;
    else if (c === ')') paren = Math.max(0, paren - 1);
    if (paren === 0) {
      const kw = keywordAt(item, i);
      if (kw === 'УБЫВ' || kw === 'ВОЗР' || kw === 'ASC' || kw === 'DESC') {
        lastKw = kw;
        lastAt = i;
      }
    }
  }
  if (lastAt < 0) return { expression: item.trim(), direction: 'asc' };
  const after = item.slice(lastAt + lastKw.length).trim();
  if (after) return { expression: item.trim(), direction: 'asc' };
  const direction: SortDirection = lastKw === 'УБЫВ' || lastKw === 'DESC' ? 'desc' : 'asc';
  return { expression: item.slice(0, lastAt).trim(), direction };
}

function parseTotalGroup(item: string): TotalGrouping | null {
  const raw = item.trim();
  if (!raw) return null;
  if (/^(ОБЩИЕ|OVERALL)$/i.test(raw)) {
    return { id: newId(), expression: '', overall: true, hierarchy: 'none' };
  }
  let hierarchy: HierarchyMode = 'none';
  let expression = raw;
  const only = raw.match(/^(.*)\s+ТОЛЬКО\s+ИЕРАРХИЯ$/i) || raw.match(/^(.*)\s+ONLY\s+HIERARCHY$/i);
  const hier = raw.match(/^(.*)\s+ИЕРАРХИЯ$/i) || raw.match(/^(.*)\s+HIERARCHY$/i);
  if (only) {
    hierarchy = 'only';
    expression = (only[1] || '').trim();
  } else if (hier) {
    hierarchy = 'hierarchy';
    expression = (hier[1] || '').trim();
  }
  return { id: newId(), expression, overall: false, hierarchy };
}

const CHAR_MARKERS = [
  'ЗНАЧЕНИЯХАРАКТЕРИСТИК',
  'ПОЛЕТИПАЗНАЧЕНИЯ',
  'ВИДЫХАРАКТЕРИСТИК',
  'ПОЛЕЗНАЧЕНИЯ',
  'ПОЛЕОБЪЕКТА',
  'ПОЛЕКЛЮЧА',
  'ПОЛЕИМЕНИ',
  'ПОЛЕВИДА',
  'ТИП',
];

function parseCharacteristics(body: string): CharacteristicDef[] {
  const chunks = body
    .split(/(?=ТИП\s*\()/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const parts = chunks.length ? chunks : [body.trim()];
  return parts.filter(Boolean).map(parseOneCharacteristic);
}

function parseOneCharacteristic(body: string): CharacteristicDef {
  const found: { marker: string; index: number }[] = [];
  const upper = body.toLocaleUpperCase('ru-RU');
  for (const marker of CHAR_MARKERS) {
    let from = 0;
    while (from < upper.length) {
      const index = upper.indexOf(marker, from);
      if (index < 0) break;
      const before = index > 0 ? upper.charAt(index - 1) : '';
      const after = upper.charAt(index + marker.length);
      if ((!before || !isWord(before)) && (!after || !isWord(after))) {
        found.push({ marker, index });
        break;
      }
      from = index + marker.length;
    }
  }
  found.sort((a, b) => a.index - b.index);
  const ch: CharacteristicDef = {
    id: newId(),
    dataType: '',
    typesSource: '',
    keyField: '',
    nameField: '',
    valueTypeField: '',
    valuesSource: '',
    objectField: '',
    typeField: '',
    valueField: '',
  };
  for (let n = 0; n < found.length; n += 1) {
    const current = found[n];
    const next = found[n + 1];
    const value = body.slice(current.index + current.marker.length, next ? next.index : body.length).trim();
    assignCharacteristic(ch, current.marker, value);
  }
  return ch;
}

function assignCharacteristic(ch: CharacteristicDef, marker: string, value: string): void {
  if (marker === 'ТИП') {
    const m = value.match(/^\(([\s\S]*)\)\s*$/);
    ch.dataType = (m ? m[1] : value).trim();
    return;
  }
  const map: Record<string, keyof CharacteristicDef> = {
    ВИДЫХАРАКТЕРИСТИК: 'typesSource',
    ПОЛЕКЛЮЧА: 'keyField',
    ПОЛЕИМЕНИ: 'nameField',
    ПОЛЕТИПАЗНАЧЕНИЯ: 'valueTypeField',
    ЗНАЧЕНИЯХАРАКТЕРИСТИК: 'valuesSource',
    ПОЛЕОБЪЕКТА: 'objectField',
    ПОЛЕВИДА: 'typeField',
    ПОЛЕЗНАЧЕНИЯ: 'valueField',
  };
  const key = map[marker];
  if (key && key !== 'id') ch[key] = value.trim();
}

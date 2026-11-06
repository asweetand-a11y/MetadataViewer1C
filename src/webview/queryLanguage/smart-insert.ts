/**
 * «Умная» вставка из дерева конфигурации по двойному щелчку — в запрос,
 * где стоит курсор (с учётом пакета, вложенных запросов и ОБЪЕДИНИТЬ):
 * - реквизит добавляется в список ВЫБРАТЬ; его таблица, если её ещё нет
 *   в ИЗ, — левым соединением;
 * - таблица добавляется левым соединением;
 * - условие ПО подбирается по типам реквизитов, иначе ИСТИНА (выделяется);
 * - временные таблицы предыдущих запросов пакета — тоже таблицы, со своими полями;
 * - нет ИЗ — таблица становится первым источником, нет запроса — создаётся.
 */

import { batchQueryAt } from "./batch";
import { tokenize, type Token } from "./lexer";
import {
  AFTER_FROM,
  AFTER_SELECT,
  SELECT_MODIFIERS,
  analyzeQuery,
  innermostScope,
  isKeyword,
  matchParen,
  splitStatements,
  splitTopLevel,
  unionPart,
} from "./completion/query-context";
import type { MetadataIndex, TableField, TableRef } from "./completion/metadata-index";

/** Что выбрано в дереве: таблица (путь как в запросе) или реквизит таблицы. */
export type SmartTarget =
  | { kind: "table"; path: string[] }
  | { kind: "field"; table: string[]; field: string };

export type TextEdit = { start: number; end: number; text: string };

export type SmartInsertResult = {
  /** Правки в смещениях исходного текста, не пересекаются. */
  edits: TextEdit[];
  /** Выделение после правок — в смещениях нового текста. */
  selection: { start: number; end: number };
};

// Маркеры выделения внутри вставляемого текста; убираются перед возвратом.
const SEL_START = "\u0001";
const SEL_END = "\u0002";
const CURSOR = SEL_START + SEL_END;

const upper = (token: Token | undefined) => (token?.kind === "word" ? token.text.toUpperCase() : "");
const is = (token: Token | undefined, ...words: string[]) => words.includes(upper(token));

function stripMarkers(value: string): string {
  return value.split(SEL_START).join("").split(SEL_END).join("");
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index--) {
    if (predicate(items[index])) return index;
  }
  return -1;
}

type ParsedSource = { alias: string; key: string; table?: TableRef; first: Token };

type ParsedQuery = {
  select: Token;
  /** Последняя лексема перед списком полей: ВЫБРАТЬ, РАЗЛИЧНЫЕ, число после ПЕРВЫЕ. */
  head: Token;
  items: Token[][];
  /** Имя после ПОМЕСТИТЬ — ИЗ вставляется после него. */
  into?: Token;
  from?: Token;
  sources: ParsedSource[];
  /** Последняя лексема раздела ИЗ — соединение добавляется после неё. */
  fromLast?: Token;
};

/** Запрос пакета под курсором и смещение, прижатое к его тексту. */
function locate(text: string, offset: number) {
  const tokens = tokenize(text).filter((token) => token.kind !== "comment");
  const statements = splitStatements(tokens);
  // Как в «Структуре запроса»: курсор в пустых строках после блока относится к этому блоку.
  const anchored = batchQueryAt(
    statements.filter((s) => s.tokens.length).map((s) => ({ ...s, start: s.tokens[0].start })),
    offset,
  );
  const statement = anchored ?? statements[statements.length - 1];
  if (anchored) {
    const first = anchored.tokens[0].start;
    const last = anchored.tokens[anchored.tokens.length - 1].end;
    offset = Math.min(Math.max(offset, first), last);
  }
  return { statement, offset };
}

/** Таблица по пути: объект конфигурации или временная таблица, созданная до запроса под курсором. */
function resolverAt(text: string, offset: number, index: MetadataIndex): Resolve {
  const { tempTables } = analyzeQuery(text, offset, index);
  return (path) => index.resolveTable(path) ?? (path.length === 1 ? tempTables.get(path[0].toLowerCase()) : undefined);
}

/** Реквизит из дерева конфигурации при перетаскивании в редактор: JSON { table, field }. */
export const FIELD_DRAG_TYPE = "application/x-queryeditor-field";

/**
 * Псевдоним, под которым таблица уже есть в запросе под курсором, — для
 * перетаскивания реквизита из дерева: «Сотрудники.Наименование».
 */
export function tableAlias(text: string, offset: number, table: string[], index: MetadataIndex): string | undefined {
  const located = locate(text, offset);
  if (!located.statement?.tokens.some((token) => is(token, "ВЫБРАТЬ", "SELECT"))) return undefined;
  const scope = unionPart(innermostScope(located.statement.tokens, located.offset), located.offset);
  const resolve = resolverAt(text, located.offset, index);
  const key = tableKey(table, resolve(table), index);
  return parseQuery(scope, index, resolve)?.sources.find((source) => source.key === key)?.alias;
}

/**
 * Как подключить таблицу к запросу под курсором (у которого уже есть ИЗ): её псевдоним
 * и правка — левое соединение с подобранным условием (или ИСТИНА); если таблица уже
 * есть в запросе — её псевдоним без правок. null — запроса с ИЗ под курсором нет.
 */
export function tableJoin(
  text: string,
  offset: number,
  table: string[],
  index: MetadataIndex,
): { alias: string; edits: TextEdit[] } | null {
  const located = locate(text, offset);
  if (!located.statement?.tokens.some((token) => is(token, "ВЫБРАТЬ", "SELECT"))) return null;
  const scope = unionPart(innermostScope(located.statement.tokens, located.offset), located.offset);
  const resolve = resolverAt(text, located.offset, index);
  const query = parseQuery(scope, index, resolve);
  if (!query?.from) return null;
  const resolved = resolve(table);
  const key = tableKey(table, resolved, index);
  const existing = query.sources.find((source) => source.key === key);
  if (existing) return { alias: existing.alias, edits: [] };
  const alias = uniqueAlias(defaultAlias(table), query.sources);
  const join = joinEdit(text, query, table.join("."), alias, joinCondition(resolved, alias, query.sources, index));
  const clean = stripMarkers(join.text);
  return { alias, edits: [{ ...join, text: clean }] };
}

export function smartInsert(text: string, offset: number, target: SmartTarget, index: MetadataIndex): SmartInsertResult {
  const located = locate(text, offset);
  const statement = located.statement;
  offset = located.offset;

  const edits: TextEdit[] = [];
  const tablePath = target.kind === "table" ? target.path : target.table;
  // Временная таблица этого же запроса (курсор в пустых строках после него) — новый запрос из неё.
  const createsTarget =
    tablePath.length === 1 &&
    statement.tokens.some(
      (token, i) => is(token, "ПОМЕСТИТЬ", "INTO") && statement.tokens[i + 1]?.text.toLowerCase() === tablePath[0].toLowerCase(),
    );
  if (createsTarget || !statement.tokens.some((token) => is(token, "ВЫБРАТЬ", "SELECT"))) {
    edits.push(newQuery(text, statement.tokens, offset, target));
  } else {
    const scope = unionPart(innermostScope(statement.tokens, offset), offset);
    // Временные таблицы, созданные до этого запроса пакета.
    const resolve = resolverAt(text, offset, index);
    const query = parseQuery(scope, index, resolve);
    if (query) editQuery(text, query, target, index, resolve, edits);
  }
  return finish(text, edits, offset);
}

// ---------- Новый запрос ----------

function newQuery(text: string, statementTokens: Token[], offset: number, target: SmartTarget): TextEdit {
  const table = target.kind === "table" ? target.path : target.table;
  const alias = defaultAlias(table);
  const item = target.kind === "field" ? `${alias}.${target.field} КАК ${target.field}` : "*";
  const query = `ВЫБРАТЬ\n\t${item}\nИЗ\n\t${table.join(".")} КАК ${alias}${CURSOR}`;
  // Курсор в другом запросе (например, УНИЧТОЖИТЬ) — новый запрос после него.
  const last = statementTokens[statementTokens.length - 1];
  if (last) return { start: last.end, end: last.end, text: `;\n\n${query}` };
  // После «;» предыдущего запроса — с новой строки, через пустую.
  const before = text.slice(0, offset);
  const gap = !before.trim() || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  return { start: offset, end: offset, text: gap + query };
}

// ---------- Изменение запроса ----------

/** Таблица по пути из запроса: объект конфигурации или временная таблица. */
type Resolve = (path: string[]) => TableRef | undefined;

function editQuery(
  text: string,
  query: ParsedQuery,
  target: SmartTarget,
  index: MetadataIndex,
  resolve: Resolve,
  edits: TextEdit[],
) {
  const tablePath = target.kind === "table" ? target.path : target.table;
  const table = resolve(tablePath);
  const key = tableKey(tablePath, table, index);

  // Реквизит таблицы, которая уже есть в запросе, — берём её псевдоним.
  const existing = target.kind === "field" ? query.sources.find((source) => source.key === key) : undefined;
  let alias = existing?.alias;
  let join: TextEdit | undefined;
  if (!alias) {
    alias = uniqueAlias(defaultAlias(tablePath), query.sources);
    join = joinEdit(text, query, tablePath.join("."), alias, joinCondition(table, alias, query.sources, index));
  }

  if (target.kind === "field") {
    const name = uniqueName(target.field, query.items);
    // Курсор после поля, если условие соединения не нужно править.
    const cursor = join?.text.includes(SEL_START) ? "" : CURSOR;
    edits.push(selectItemEdit(text, query, `${alias}.${target.field} КАК ${name}${cursor}`));
  } else if (!query.items.length) {
    // ВЫБРАТЬ без полей с ИЗ недопустим.
    edits.push(selectItemEdit(text, query, "*"));
  }
  if (join) {
    if (!join.text.includes(SEL_START) && target.kind === "table") join.text += CURSOR;
    edits.push(join);
  }
}

function selectItemEdit(text: string, query: ParsedQuery, item: string): TextEdit {
  const { items, select, head } = query;
  if (!items.length) {
    return { start: head.end, end: head.end, text: `\n${lineIndent(text, select.start)}\t${item}` };
  }
  // «ВЫБРАТЬ *» — звёздочку заменяем полем.
  if (items.length === 1 && items[0].length === 1 && items[0][0].text === "*") {
    return { start: items[0][0].start, end: items[0][0].end, text: item };
  }
  const last = items[items.length - 1];
  const indent = sameLine(text, select, last[0]) ? `${lineIndent(text, select.start)}\t` : lineIndent(text, last[0].start);
  const end = last[last.length - 1].end;
  return { start: end, end, text: `,\n${indent}${item}` };
}

function joinEdit(text: string, query: ParsedQuery, table: string, alias: string, condition: string | null): TextEdit {
  const { from, fromLast, select } = query;
  if (!from || !fromLast) {
    // Первый источник: «ИЗ» после списка полей (и ПОМЕСТИТЬ).
    const lastItem = query.items[query.items.length - 1];
    const after = query.into ?? lastItem?.[lastItem.length - 1] ?? query.head;
    const indent = lineIndent(text, select.start);
    return { start: after.end, end: after.end, text: `\n${indent}ИЗ\n${indent}\t${table} КАК ${alias}` };
  }
  const first = query.sources[0]?.first ?? fromLast;
  const base = sameLine(text, from, first) ? lineIndent(text, from.start) : lineIndent(text, first.start);
  const on = condition ?? `${SEL_START}ИСТИНА${SEL_END}`;
  return {
    start: fromLast.end,
    end: fromLast.end,
    text: `\n${base}\tЛЕВОЕ СОЕДИНЕНИЕ ${table} КАК ${alias}\n${base}\tПО ${on}`,
  };
}

// ---------- Разбор запроса ----------

function parseQuery(scope: Token[], index: MetadataIndex, resolve: Resolve): ParsedQuery | null {
  const depthAt: number[] = [];
  let depth = 0;
  for (const token of scope) {
    if (token.text === ")") depth--;
    depthAt.push(depth);
    if (token.text === "(") depth++;
  }
  const topLevel = (from: number, match: (token: Token) => boolean) => {
    for (let i = from; i < scope.length; i++) if (depthAt[i] === 0 && match(scope[i])) return i;
    return -1;
  };

  const selectIndex = topLevel(0, (token) => is(token, "ВЫБРАТЬ", "SELECT"));
  if (selectIndex < 0) return null;
  let i = selectIndex + 1;
  for (;;) {
    if (is(scope[i], ...SELECT_MODIFIERS)) i++;
    else if (is(scope[i], "ПЕРВЫЕ", "TOP")) i += 2;
    else break;
  }
  const head = scope[Math.min(i, scope.length) - 1];
  let listEnd = topLevel(i, (token) => is(token, ...AFTER_SELECT));
  if (listEnd < 0) listEnd = scope.length;
  const items = splitTopLevel(scope.slice(i, listEnd), (token) => token.text === ",").filter((item) => item.length);

  const into = is(scope[listEnd], "ПОМЕСТИТЬ", "INTO") && scope[listEnd + 1]?.kind === "word" ? scope[listEnd + 1] : undefined;
  const fromIndex = topLevel(listEnd, (token) => is(token, "ИЗ", "FROM"));
  if (fromIndex < 0) return { select: scope[selectIndex], head, items, into, sources: [] };

  let fromEnd = topLevel(fromIndex + 1, (token) => is(token, ...AFTER_FROM));
  if (fromEnd < 0) fromEnd = scope.length;
  const fromLast = fromEnd - 1 > fromIndex ? scope[fromEnd - 1] : undefined;

  const sources: ParsedSource[] = [];
  let expect = true;
  for (let k = fromIndex + 1; k < fromEnd; k++) {
    const token = scope[k];
    if (expect) {
      expect = false;
      k = readSource(scope, k, index, resolve, sources) - 1;
    } else if (token.text === "(") {
      k = matchParen(scope, k);
    } else if (is(token, "СОЕДИНЕНИЕ", "JOIN") || token.text === ",") {
      expect = true;
    }
  }
  return { select: scope[selectIndex], head, items, into, from: scope[fromIndex], sources, fromLast };
}

/** Источник: путь к таблице или вложенный запрос в скобках, затем псевдоним. */
function readSource(tokens: Token[], i: number, index: MetadataIndex, resolve: Resolve, sources: ParsedSource[]): number {
  const first = tokens[i];
  let path: string[] = [];
  if (first?.text === "(") {
    i = matchParen(tokens, i) + 1;
  } else if (first?.kind === "word") {
    path = [first.text];
    i++;
    while (tokens[i]?.text === "." && tokens[i + 1]?.kind === "word") {
      path.push(tokens[i + 1].text);
      i += 2;
    }
    if (tokens[i]?.text === "(") i = matchParen(tokens, i) + 1; // параметры виртуальной таблицы
  } else {
    return i + 1;
  }

  let alias = path[path.length - 1] ?? "";
  if (is(tokens[i], "КАК", "AS") && tokens[i + 1]?.kind === "word") {
    alias = tokens[i + 1].text;
    i += 2;
  } else if (tokens[i]?.kind === "word" && !isKeyword(tokens[i])) {
    alias = tokens[i].text;
    i++;
  }
  const table = path.length ? resolve(path) : undefined;
  if (alias) sources.push({ alias, key: tableKey(path, table, index), table, first });
  return i;
}

// ---------- Условие соединения ----------

/** Тип ссылки на объект таблицы, если у неё есть поле Ссылка: «Справочник.Валюты». */
function refType(table: TableRef, index: MetadataIndex): string | undefined {
  if (table.type !== "object") return undefined;
  return index.fieldsOf(table).some((field) => field.name === "Ссылка") ? index.describeTable(table).toLowerCase() : undefined;
}

const hasType = (types: string[], type: string) => types.some((t) => t.toLowerCase() === type);

function joinCondition(table: TableRef | undefined, alias: string, sources: ParsedSource[], index: MetadataIndex): string | null {
  if (!table) return null;
  // Временные таблицы соединяются по своим полям с типами из запроса, их создавшего.
  const withTables = sources.filter((source) => source.table);

  // Табличная часть и её объект (или другая табличная часть того же объекта).
  for (const source of withTables) {
    const other = source.table!;
    if (other.type === "derived" || table.type === "derived") continue;
    const sameObject = other.object === table.object;
    if (sameObject && (table.type === "tabular" || other.type === "tabular")) {
      return `${alias}.Ссылка = ${source.alias}.Ссылка`;
    }
  }
  // Реквизит новой таблицы ссылается на существующую: КурсыВалют.Валюта = Валюты.Ссылка.
  for (const source of withTables) {
    const ref = refType(source.table!, index);
    const field = ref && index.fieldsOf(table).find((f) => f.name !== "Ссылка" && hasType(f.types, ref));
    if (field) return `${alias}.${field.name} = ${source.alias}.Ссылка`;
  }
  // Реквизит существующей таблицы ссылается на новую.
  const ref = refType(table, index);
  if (ref) {
    for (const source of withTables) {
      const field = index.fieldsOf(source.table!).find((f) => f.name !== "Ссылка" && hasType(f.types, ref));
      if (field) return `${source.alias}.${field.name} = ${alias}.Ссылка`;
    }
  }

  // Общие поля ссылочного типа: сначала с одинаковым именем (все такие — через И),
  // потом первая пара с разными именами.
  const own = refFields(table, index);
  for (const source of withTables) {
    const pairs = commonRefFields(own, refFields(source.table!, index), true);
    if (pairs.length) return pairs.map(([mine, theirs]) => `${alias}.${mine.name} = ${source.alias}.${theirs.name}`).join(" И ");
  }
  for (const source of withTables) {
    const [pair] = commonRefFields(own, refFields(source.table!, index), false);
    if (pair) return `${alias}.${pair[0].name} = ${source.alias}.${pair[1].name}`;
  }
  return null;
}

/**
 * Поля таблицы со ссылочными типами (справочники, документы, перечисления…).
 * Стандартные (Ссылка, Регистратор, Родитель) не берём: два регистра по
 * Регистратор не соединяют.
 */
function refFields(table: TableRef, index: MetadataIndex): TableField[] {
  return index
    .fieldsOf(table)
    .filter((field) => field.group !== "standard")
    .map((field) => ({ ...field, types: field.types.filter((type) => index.objectByType(type)) }))
    .filter((field) => field.types.length);
}

/**
 * Пары полей с общим ссылочным типом. sameName — только одноимённые (все),
 * иначе — с разными именами. Если среди пар есть измерения у обеих таблиц —
 * берутся только они: регистры соединяют по измерениям.
 */
function commonRefFields(mine: TableField[], theirs: TableField[], sameName: boolean): [TableField, TableField][] {
  const pairs: [TableField, TableField][] = [];
  for (const a of mine) {
    for (const b of theirs) {
      const named = a.name.toLowerCase() === b.name.toLowerCase();
      if (named !== sameName) continue;
      // Без совпадения имён — только поля одного ссылочного типа: составные
      // («ПредметПубликации» — что угодно) совпадают по типу случайно.
      if (!named && (a.types.length > 1 || b.types.length > 1)) continue;
      if (a.types.some((type) => hasType(b.types, type.toLowerCase()))) pairs.push([a, b]);
    }
  }
  const dimensions = pairs.filter(([a, b]) => a.group === "dimension" && b.group === "dimension");
  return dimensions.length ? dimensions : pairs;
}

// ---------- Имена ----------

function tableKey(path: string[], table: TableRef | undefined, index: MetadataIndex) {
  return (table ? index.describeTable(table) : path.join(".")).toLowerCase();
}

/** Псевдоним как у конструктора: Валюты, РеализацияТоваровУслугТовары, ТоварыНаСкладахОстатки. */
function defaultAlias(path: string[]) {
  return path.slice(1).join("") || path[0];
}

function uniqueAlias(base: string, sources: ParsedSource[]) {
  const taken = new Set(sources.map((source) => source.alias.toLowerCase()));
  let alias = base;
  for (let n = 1; taken.has(alias.toLowerCase()); n++) alias = `${base}${n}`;
  return alias;
}

/** Имя поля в выборке: Наименование, Наименование1… — без повторов. */
function uniqueName(base: string, items: Token[][]) {
  const taken = new Set(
    items.map((item) => {
      const as = findLastIndex(item, (token) => is(token, "КАК", "AS"));
      return (as >= 0 ? item[as + 1]?.text : item[item.length - 1]?.text)?.toLowerCase() ?? "";
    }),
  );
  let name = base;
  for (let n = 1; taken.has(name.toLowerCase()); n++) name = `${base}${n}`;
  return name;
}

// ---------- Текст ----------

function lineIndent(text: string, offset: number) {
  const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
  return /^[ \t]*/.exec(text.slice(lineStart))![0];
}

const sameLine = (text: string, a: Token, b: Token) => !text.slice(Math.min(a.start, b.start), Math.max(a.start, b.start)).includes("\n");

/** Сливает вставки в одно место, вычисляет выделение по маркерам и убирает их. */
function finish(text: string, raw: TextEdit[], offset: number): SmartInsertResult {
  const edits: TextEdit[] = [];
  for (const edit of [...raw].sort((a, b) => a.start - b.start)) {
    const previous = edits[edits.length - 1];
    if (previous && previous.start === edit.start && previous.end === previous.start && edit.end === edit.start) {
      previous.text += edit.text;
    } else {
      edits.push({ ...edit });
    }
  }

  let result = "";
  let position = 0;
  for (const edit of edits) {
    result += text.slice(position, edit.start) + edit.text;
    position = edit.end;
  }
  result += text.slice(position);

  const start = result.indexOf(SEL_START);
  const end = result.indexOf(SEL_END) - 1;
  const clean = stripMarkers;
  return {
    edits: edits.map((edit) => ({ ...edit, text: clean(edit.text) })),
    // Без маркеров (запрос не разобран) курсор остаётся на месте.
    selection: start >= 0 ? { start, end: Math.max(start, end) } : { start: offset, end: offset },
  };
}

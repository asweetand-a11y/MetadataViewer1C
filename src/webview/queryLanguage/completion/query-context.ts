/**
 * Разбор текста запроса вокруг курсора для автодополнения: какие таблицы
 * доступны под какими псевдонимами, какие временные таблицы созданы
 * предыдущими запросами пакета и какие у них поля.
 */

import { tokenize, type Token } from "../lexer";
import { AS_KEYWORDS, CONSTANTS, KEYWORDS, WORD_OPERATORS, spellings } from "../vocabulary";
import type { MetadataIndex, TableField, TableRef } from "./metadata-index";

const upper = (token: Token | undefined) => (token?.kind === "word" ? token.text.toUpperCase() : "");
const KEYWORD_WORDS = new Set(spellings(KEYWORDS, AS_KEYWORDS, WORD_OPERATORS, CONSTANTS).map((w) => w.toUpperCase()));
export const isKeyword = (token: Token | undefined) => KEYWORD_WORDS.has(upper(token));
const is = (token: Token | undefined, ...words: string[]) => words.includes(upper(token));

/** Секции, которые завершают список источников ИЗ. */
export const AFTER_FROM = ["ГДЕ", "WHERE", "СГРУППИРОВАТЬ", "GROUP", "ИМЕЮЩИЕ", "HAVING", "УПОРЯДОЧИТЬ", "ORDER", "ИТОГИ", "TOTALS", "ДЛЯ", "FOR", "ИНДЕКСИРОВАТЬ", "INDEX", "АВТОУПОРЯДОЧИВАНИЕ", "AUTOORDER", "ОБЪЕДИНИТЬ", "UNION"];
/** Секции, которые завершают список полей ВЫБРАТЬ. */
export const AFTER_SELECT = ["ПОМЕСТИТЬ", "INTO", "ИЗ", "FROM", ...AFTER_FROM];
export const SELECT_MODIFIERS = ["РАЗРЕШЕННЫЕ", "ALLOWED", "РАЗЛИЧНЫЕ", "DISTINCT"];

export type Source = { alias: string; table: TableRef };

export type QueryContext = {
  /** Источники текущего (под)запроса по псевдониму в нижнем регистре. */
  sources: Map<string, Source>;
  /** Временные таблицы, созданные запросами пакета до текущего, по имени в нижнем регистре. */
  tempTables: Map<string, TableRef>;
};

type Ctx = { index: MetadataIndex | null; tempTables: Map<string, TableRef> };

/** Анализ запроса для позиции курсора (смещение в тексте). */
export function analyzeQuery(text: string, offset: number, index: MetadataIndex | null): QueryContext {
  const tokens = tokenize(text).filter((t) => t.kind !== "comment");
  const statements = splitStatements(tokens);
  const ctx: Ctx = { index, tempTables: new Map() };

  let current: Token[] = [];
  for (const statement of statements) {
    const containsCursor = statement.start <= offset && offset <= statement.end;
    if (containsCursor) {
      current = statement.tokens;
      break;
    }
    if (statement.start > offset) break;
    registerTempTable(statement.tokens, ctx);
  }

  const scope = unionPart(innermostScope(current, offset), offset);
  return { sources: sourcesOf(scope, ctx), tempTables: ctx.tempTables };
}

/** Все временные таблицы пакета (ПОМЕСТИТЬ) в порядке создания — для дерева конфигурации. */
export function tempTablesOf(text: string, index: MetadataIndex | null): Extract<TableRef, { type: "derived" }>[] {
  const ctx: Ctx = { index, tempTables: new Map() };
  for (const statement of splitStatements(tokenize(text).filter((t) => t.kind !== "comment"))) {
    registerTempTable(statement.tokens, ctx);
  }
  return [...ctx.tempTables.values()].filter((table): table is Extract<TableRef, { type: "derived" }> => table.type === "derived");
}

/** Поля, доступные после пути «Псевдоним.Поле.Поле…»; null — путь не распознан. */
export function fieldsAfterPath(path: string[], context: QueryContext, index: MetadataIndex | null): TableField[] | null {
  const source = context.sources.get(path[0].toLowerCase()) ?? tempAsSource(path[0], context);
  if (!source) return null;
  let fields = index ? index.fieldsOf(source.table) : source.table.type === "derived" ? source.table.fields : [];
  for (const part of path.slice(1)) {
    const field = fields.find((f) => f.name.toLowerCase() === part.toLowerCase());
    if (!field || !index) return null;
    fields = uniqueFields(field.types.flatMap((type) => index.fieldsOfType(type)));
  }
  return fields;
}

/** Поле по полному пути «Псевдоним.Поле…» — для всплывающих подсказок. */
export function fieldAtPath(path: string[], context: QueryContext, index: MetadataIndex | null): TableField | null {
  if (path.length < 2) return null;
  const fields = fieldsAfterPath(path.slice(0, -1), context, index);
  const name = path[path.length - 1].toLowerCase();
  return fields?.find((f) => f.name.toLowerCase() === name) ?? null;
}

function tempAsSource(name: string, context: QueryContext): Source | undefined {
  const table = context.tempTables.get(name.toLowerCase());
  return table ? { alias: name, table } : undefined;
}

function uniqueFields(fields: TableField[]): TableField[] {
  const seen = new Map<string, TableField>();
  for (const field of fields) {
    const key = field.name.toLowerCase();
    const existing = seen.get(key);
    if (!existing) seen.set(key, field);
    else existing.types = [...new Set([...existing.types, ...field.types])];
  }
  return [...seen.values()];
}

// ---------- Разбиение на запросы и области ----------

export function splitStatements(tokens: Token[]) {
  const statements: { tokens: Token[]; start: number; end: number }[] = [];
  let current: Token[] = [];
  let start = 0;
  for (const token of tokens) {
    if (token.text === ";" && token.kind === "symbol") {
      statements.push({ tokens: current, start, end: token.start });
      current = [];
      start = token.end;
    } else {
      current.push(token);
    }
  }
  statements.push({ tokens: current, start, end: Number.MAX_SAFE_INTEGER });
  return statements;
}

/** Самый внутренний подзапрос «(ВЫБРАТЬ …)», содержащий курсор; иначе весь запрос. */
export function innermostScope(tokens: Token[], offset: number): Token[] {
  let scope = tokens;
  for (;;) {
    let found: Token[] | null = null;
    for (let i = 0; i < scope.length; i++) {
      if (scope[i].text !== "(" || !is(scope[i + 1], "ВЫБРАТЬ", "SELECT")) continue;
      const close = matchParen(scope, i);
      const end = close < scope.length ? scope[close].start : Number.MAX_SAFE_INTEGER;
      if (scope[i].end <= offset && offset <= end) {
        found = scope.slice(i + 1, close);
        break;
      }
      i = close;
    }
    if (!found) return scope;
    scope = found;
  }
}

/** Часть объединения (ОБЪЕДИНИТЬ), в которой стоит курсор. */
export function unionPart(tokens: Token[], offset: number): Token[] {
  const parts = splitTopLevel(tokens, (t) => is(t, "ОБЪЕДИНИТЬ", "UNION"));
  return parts.find((part) => part.length && part[0].start <= offset && offset <= part[part.length - 1].end + 1)
    ?? parts.find((part) => part.length && part[0].start > offset)
    ?? parts[parts.length - 1]
    ?? [];
}

function firstUnionPart(tokens: Token[]): Token[] {
  return splitTopLevel(tokens, (t) => is(t, "ОБЪЕДИНИТЬ", "UNION"))[0] ?? [];
}

export function splitTopLevel(tokens: Token[], isSeparator: (token: Token) => boolean): Token[][] {
  const parts: Token[][] = [[]];
  let depth = 0;
  for (const token of tokens) {
    if (token.text === "(") depth++;
    else if (token.text === ")") depth--;
    if (depth === 0 && isSeparator(token)) parts.push([]);
    else parts[parts.length - 1].push(token);
  }
  return parts;
}

export function matchParen(tokens: Token[], open: number): number {
  let depth = 0;
  for (let i = open; i < tokens.length; i++) {
    if (tokens[i].text === "(") depth++;
    else if (tokens[i].text === ")" && --depth === 0) return i;
  }
  return tokens.length;
}

// ---------- Источники ----------

function sourcesOf(tokens: Token[], ctx: Ctx): Map<string, Source> {
  const sources = new Map<string, Source>();
  collectSources(tokens, ctx, sources, false);
  return sources;
}

/** Ищет источники после ИЗ, СОЕДИНЕНИЕ и запятых в списке ИЗ (только верхний уровень). */
function collectSources(tokens: Token[], ctx: Ctx, sources: Map<string, Source>, startsInFrom: boolean) {
  let inFrom = startsInFrom;
  let expectSource = startsInFrom;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (expectSource) {
      expectSource = false;
      i = readSource(tokens, i, ctx, sources) - 1;
      continue;
    }
    if (token.text === "(") {
      i = matchParen(tokens, i);
      continue;
    }
    if (is(token, "ИЗ", "FROM")) {
      inFrom = true;
      expectSource = true;
    } else if (is(token, "СОЕДИНЕНИЕ", "JOIN")) {
      expectSource = true;
    } else if (inFrom && token.text === ",") {
      expectSource = true;
    } else if (is(token, ...AFTER_FROM)) {
      inFrom = false;
    }
  }
}

/** Читает один источник с позиции i; возвращает позицию после него. */
function readSource(tokens: Token[], i: number, ctx: Ctx, sources: Map<string, Source>): number {
  let table: TableRef | undefined;
  let defaultAlias = "";

  if (tokens[i]?.text === "(") {
    const close = matchParen(tokens, i);
    const inner = tokens.slice(i + 1, close);
    if (is(inner[0], "ВЫБРАТЬ", "SELECT")) {
      table = { type: "derived", name: "Вложенный запрос", fields: selectFields(firstUnionPart(inner), ctx) };
    } else {
      // Скобки вокруг группы соединений: источники внутри видны снаружи.
      collectSources(inner, ctx, sources, true);
    }
    i = close + 1;
  } else if (tokens[i]?.kind === "word") {
    const path = [tokens[i].text];
    i++;
    while (tokens[i]?.text === "." && tokens[i + 1]?.kind === "word") {
      path.push(tokens[i + 1].text);
      i += 2;
    }
    if (tokens[i]?.text === "(") i = matchParen(tokens, i) + 1; // параметры виртуальной таблицы
    defaultAlias = path[path.length - 1];
    table =
      ctx.index?.resolveTable(path) ??
      (path.length === 1 ? ctx.tempTables.get(path[0].toLowerCase()) : undefined) ??
      { type: "derived", name: path.join("."), fields: [] };
  } else {
    return i + 1;
  }

  let alias = defaultAlias;
  if (is(tokens[i], "КАК", "AS") && tokens[i + 1]?.kind === "word") {
    alias = tokens[i + 1].text;
    i += 2;
  } else if (tokens[i]?.kind === "word" && !isKeyword(tokens[i])) {
    alias = tokens[i].text;
    i += 1;
  }
  if (table && alias) sources.set(alias.toLowerCase(), { alias, table });
  return i;
}

// ---------- Поля выборки и временные таблицы ----------

/** Поля списка ВЫБРАТЬ: имя — псевдоним после КАК или последняя часть пути. */
function selectFields(part: Token[], ctx: Ctx): TableField[] {
  let i = part.findIndex((t) => is(t, "ВЫБРАТЬ", "SELECT"));
  if (i < 0) return [];
  i++;
  while (i < part.length) {
    if (is(part[i], ...SELECT_MODIFIERS)) i++;
    else if (is(part[i], "ПЕРВЫЕ", "TOP")) i += 2;
    else break;
  }
  let end = i;
  for (let depth = 0; end < part.length; end++) {
    if (part[end].text === "(") depth++;
    else if (part[end].text === ")") depth--;
    else if (depth === 0 && is(part[end], ...AFTER_SELECT)) break;
  }

  const context: QueryContext = { sources: sourcesOf(part, ctx), tempTables: ctx.tempTables };
  const fields: TableField[] = [];
  for (const item of splitTopLevel(part.slice(i, end), (t) => t.text === ",")) {
    const asIndex = findLastTopLevel(item, (t) => is(t, "КАК", "AS"));
    const expression = asIndex >= 0 ? item.slice(0, asIndex) : item;
    const path = pathOf(unwrapIsNull(expression));
    const name = asIndex >= 0 && item[asIndex + 1]?.kind === "word" ? item[asIndex + 1].text : path?.[path.length - 1];
    if (!name) continue;
    const field = path && path.length > 1 ? fieldAtPath(path, context, ctx.index) : null;
    fields.push({ name, types: field?.types ?? [], synonym: field?.synonym, group: "attribute" });
  }
  return fields;
}

/** ЕСТЬNULL(Путь, …) — тип берём по пути. */
function unwrapIsNull(tokens: Token[]): Token[] {
  if (is(tokens[0], "ЕСТЬNULL", "ISNULL") && tokens[1]?.text === "(") {
    const comma = tokens.findIndex((t, i) => i > 1 && t.text === ",");
    if (comma > 2) return tokens.slice(2, comma);
  }
  return tokens;
}

/** Выражение — это путь «А.Б.В»? */
function pathOf(tokens: Token[]): string[] | null {
  if (!tokens.length || tokens.length % 2 === 0) return null;
  const path: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const expected = i % 2 === 0 ? tokens[i].kind === "word" : tokens[i].text === ".";
    if (!expected) return null;
    if (i % 2 === 0) path.push(tokens[i].text);
  }
  return path;
}

function findLastTopLevel(tokens: Token[], match: (t: Token) => boolean): number {
  let depth = 0;
  let found = -1;
  tokens.forEach((t, i) => {
    if (t.text === "(") depth++;
    else if (t.text === ")") depth--;
    else if (depth === 0 && match(t)) found = i;
  });
  return found;
}

/** Если запрос создаёт временную таблицу (ПОМЕСТИТЬ Имя), запоминает её поля. */
function registerTempTable(tokens: Token[], ctx: Ctx) {
  const part = firstUnionPart(tokens);
  const into = findLastTopLevel(part, (t) => is(t, "ПОМЕСТИТЬ", "INTO"));
  const name = into >= 0 ? part[into + 1] : undefined;
  if (!name || name.kind !== "word") return;
  ctx.tempTables.set(name.text.toLowerCase(), { type: "derived", name: name.text, fields: selectFields(part, ctx) });
}

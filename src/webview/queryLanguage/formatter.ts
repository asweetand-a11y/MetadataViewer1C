/**
 * Форматирование текста запроса в стиле конструктора запросов 1С:
 * секции (ВЫБРАТЬ, ИЗ, ГДЕ…) с новой строки, их содержимое — с отступом табом,
 * поля по одному на строку, условия — с И/ИЛИ в начале строки, соединения и ПО —
 * отдельными строками, ВЫБОР — многострочно, подзапросы — с вложенным отступом,
 * запросы пакета разделены строкой из «/».
 *
 * Ключевые слова и функции приводятся к верхнему регистру, имена полей и таблиц
 * не меняются. Если после форматирования последовательность лексем не совпала
 * с исходной, текст возвращается без изменений — форматирование не должно
 * менять смысл запроса.
 */

import { tokenize, type Token } from "./lexer";
import {
  AS_KEYWORDS,
  CONSTANTS,
  FUNCTIONS,
  KEYWORDS,
  METADATA_ROOTS,
  PERIODS,
  PRIMITIVE_TYPES,
  REFS_OPERATOR,
  WORD_OPERATORS,
  spellings,
  type WordPair,
} from "./vocabulary";

const upperSet = (...groups: (readonly WordPair[])[]) =>
  new Set(spellings(...groups).map((word) => word.toUpperCase()));

const KEYWORD_WORDS = upperSet(KEYWORDS, AS_KEYWORDS, WORD_OPERATORS, CONSTANTS);
const FUNCTION_WORDS = upperSet(FUNCTIONS);
const TYPE_WORDS = upperSet(PRIMITIVE_TYPES);
const PERIOD_WORDS = upperSet(PERIODS);
const AS_WORDS = upperSet(AS_KEYWORDS);
const REFS_WORDS = upperSet([REFS_OPERATOR]);
/** Каноническое написание корней метаданных: справочник → Справочник. */
const METADATA_ROOT_SPELLING = new Map(
  spellings(METADATA_ROOTS).map((word) => [word.toUpperCase(), word]),
);
/** Ключевые слова, которые пишутся вплотную к скобке: ПЕРИОДАМИ(ДЕНЬ, ...). */
const KEYWORDS_BEFORE_PAREN = new Set(["ПЕРИОДАМИ", "PERIODS"]);

const QUERY_SEPARATOR = "\n;\n\n" + "/".repeat(80) + "\n";

type Word = {
  /** Как слово выводится. */
  text: string;
  upper: string;
  /** Ключевое слово языка, а не имя поля, таблицы или функции. */
  keyword: boolean;
  /** Пишется вплотную к открывающей скобке: функция, тип, имя таблицы. */
  attachParen: boolean;
};

export function formatQuery(text: string): string {
  const tokens = tokenize(text).filter((token) => !isSeparatorComment(token));
  const words = analyzeWords(tokens);

  const blocks: string[] = [];
  let pending: Token[] = [];
  for (const statement of splitStatements(tokens)) {
    pending.push(...statement);
    if (!pending.some((token) => token.kind !== "comment")) continue;
    blocks.push(render(words, (f) => f.query(pending, 0, false)));
    pending = [];
  }

  let result = blocks.join(QUERY_SEPARATOR);
  // Комментарии после последнего запроса.
  if (pending.length > 0) {
    result += (result ? "\n\n" : "") + render(words, (f) => f.expression(pending, 0));
  }
  if (text.endsWith("\n")) result += "\n";

  return sameMeaning(text, result) ? result : text;
}

function render(words: Map<Token, Word>, build: (formatter: QueryFormatter) => void): string {
  const writer = new Writer(words);
  build(new QueryFormatter(words, writer));
  return writer.finish().join("\n");
}

/** Строка-разделитель вида «/////» — форматтер расставляет такие сам. */
function isSeparatorComment(token: Token) {
  return token.kind === "comment" && /^\/{3,}\s*$/.test(token.text);
}

function splitStatements(tokens: Token[]): Token[][] {
  const statements: Token[][] = [[]];
  for (const token of tokens) {
    if (token.kind === "symbol" && token.text === ";") statements.push([]);
    else statements[statements.length - 1].push(token);
  }
  return statements;
}

/** Совпадают ли лексемы (без учёта регистра слов, «;» и строк-разделителей). */
function sameMeaning(before: string, after: string) {
  const normalize = (text: string) =>
    tokenize(text)
      .filter((token) => token.text !== ";" && !isSeparatorComment(token))
      .map((token) => (token.kind === "word" ? token.text.toUpperCase() : token.text));
  const a = normalize(before);
  const b = normalize(after);
  return a.length === b.length && a.every((text, i) => text === b[i]);
}

/**
 * Определяет роль каждого слова по соседям — теми же правилами, что и подсветка:
 * после точки — имя, перед скобкой — функция, после КАК — псевдоним или тип.
 */
function analyzeWords(tokens: Token[]): Map<Token, Word> {
  const significant = tokens.filter((token) => token.kind !== "comment");
  const words = new Map<Token, Word>();
  let depth = 0;

  significant.forEach((token, i) => {
    if (token.text === "(") depth++;
    else if (token.text === ")") depth = Math.max(0, depth - 1);
    if (token.kind !== "word") return;

    const prev = significant[i - 1];
    const next = significant[i + 1];
    const upper = token.text.toUpperCase();
    const prevWord = prev && words.get(prev);

    const name: Word = { text: token.text, upper, keyword: false, attachParen: true };
    const builtin: Word = { text: upper, upper, keyword: false, attachParen: true };
    const keyword: Word = {
      text: upper,
      upper,
      keyword: true,
      attachParen: KEYWORDS_BEFORE_PAREN.has(upper),
    };

    let word: Word;
    if (prev?.text === ".") {
      word = name;
    } else if (next?.text === "(") {
      if (FUNCTION_WORDS.has(upper) || TYPE_WORDS.has(upper)) word = builtin;
      else word = KEYWORD_WORDS.has(upper) ? keyword : name;
    } else if (prevWord?.keyword && AS_WORDS.has(prevWord.upper)) {
      word = TYPE_WORDS.has(upper) ? builtin : name;
    } else if (next?.text === ".") {
      word = { ...name, text: METADATA_ROOT_SPELLING.get(upper) ?? token.text };
    } else if (REFS_WORDS.has(upper)) {
      const refsTarget = next?.kind === "word" && significant[i + 2]?.text === ".";
      word = refsTarget ? keyword : name;
    } else if (KEYWORD_WORDS.has(upper)) {
      word = keyword;
    } else if (PERIOD_WORDS.has(upper) && depth > 0) {
      word = builtin;
    } else {
      word = name;
    }
    words.set(token, word);
  });

  return words;
}

/** Собирает строки результата и расставляет пробелы между лексемами. */
class Writer {
  private readonly words: Map<Token, Word>;
  private readonly out: string[] = [];
  private line = "";
  private indent = 0;
  private last: Token | undefined;
  private beforeLast: Token | undefined;
  /** После комментария в конце строки следующая лексема переносится. */
  private breakPending = false;

  constructor(words: Map<Token, Word>) {
    this.words = words;
  }

  /** Начинает новую строку с заданным отступом. */
  newLine(indent: number) {
    if (this.line) this.out.push("\t".repeat(this.indent) + this.line);
    this.line = "";
    this.indent = indent;
    this.last = this.beforeLast = undefined;
    this.breakPending = false;
  }

  blankLine() {
    this.newLine(this.indent);
    if (this.out.length > 0 && this.out[this.out.length - 1] !== "") this.out.push("");
  }

  write(token: Token) {
    if (token.kind === "comment") {
      this.comment(token);
      return;
    }
    if (this.breakPending) this.newLine(this.indent);
    if (this.line && this.needsSpace(token)) this.line += " ";
    this.line += this.words.get(token)?.text ?? token.text;
    this.beforeLast = this.last;
    this.last = token;
  }

  writeAll(tokens: Token[]) {
    tokens.forEach((token) => this.write(token));
  }

  finish(): string[] {
    this.newLine(0);
    while (this.out[this.out.length - 1] === "") this.out.pop();
    return this.out;
  }

  private comment(token: Token) {
    if (token.lineBreaksBefore === 0 && this.line) {
      this.line += " " + token.text;
      this.breakPending = true;
    } else {
      const indent = this.indent;
      this.newLine(indent);
      this.line = token.text;
      this.newLine(indent);
    }
  }

  private needsSpace(token: Token): boolean {
    const prev = this.last;
    if (!prev) return false;
    if (prev.text === ",") return true;
    if ([",", ")", ".", "}"].includes(token.text)) return false;
    if (["(", ".", "{"].includes(prev.text)) return false;
    if (token.text === "(") return !this.words.get(prev)?.attachParen;
    if ((prev.text === "-" || prev.text === "+") && this.isUnary()) return false;
    return true;
  }

  /** Знак последней записанной лексемы — унарный (−1, (+2), КОГДА -Х). */
  private isUnary() {
    const before = this.beforeLast;
    if (!before) return true;
    if (before.kind === "symbol") return before.text !== ")";
    return this.words.get(before)?.keyword ?? false;
  }
}

type Clause = { head: string; tokens: Token[] };

type ClauseLayout = "list" | "conditions" | "sources" | "inline" | "union";

const CLAUSE_STARTS = new Set([
  "ВЫБРАТЬ", "SELECT",
  "ПОМЕСТИТЬ", "INTO",
  "ИЗ", "FROM",
  "ГДЕ", "WHERE",
  "СГРУППИРОВАТЬ", "GROUP",
  "ИМЕЮЩИЕ", "HAVING",
  "ОБЪЕДИНИТЬ", "UNION",
  "УПОРЯДОЧИТЬ", "ORDER",
  "АВТОУПОРЯДОЧИВАНИЕ", "AUTOORDER",
  "ИТОГИ", "TOTALS",
  "ИНДЕКСИРОВАТЬ", "INDEX",
  "ДЛЯ", "FOR",
  "УНИЧТОЖИТЬ", "DROP",
]);

const SELECT_MODIFIERS = new Set(["РАЗРЕШЕННЫЕ", "ALLOWED", "РАЗЛИЧНЫЕ", "DISTINCT", "ПЕРВЫЕ", "TOP"]);
const BY = ["ПО", "BY"];
const JOIN_STARTS = new Set(["ЛЕВОЕ", "ПРАВОЕ", "ПОЛНОЕ", "ВНУТРЕННЕЕ", "LEFT", "RIGHT", "FULL", "INNER"]);
const JOIN_PARTS = new Set([...JOIN_STARTS, "ВНЕШНЕЕ", "OUTER"]);

class QueryFormatter {
  private readonly words: Map<Token, Word>;
  private readonly w: Writer;

  constructor(words: Map<Token, Word>, writer: Writer) {
    this.words = words;
    this.w = writer;
  }

  /**
   * Запрос (или подзапрос). continueLine — первая секция продолжает текущую
   * строку: «(ВЫБРАТЬ» внутри выражения.
   */
  query(tokens: Token[], indent: number, continueLine: boolean) {
    this.splitClauses(tokens).forEach((clause, i) => {
      this.clause(clause, indent, continueLine && i === 0);
    });
  }

  /** Выражение в одну строку; подзапросы и ВЫБОР в начале выражения — многострочно. */
  expression(tokens: Token[], indent: number) {
    const first = this.nextSignificant(tokens, 0);
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.text === "(" && this.is(tokens[this.nextSignificant(tokens, i + 1)], "ВЫБРАТЬ", "SELECT")) {
        const close = this.matchingParen(tokens, i);
        this.w.write(token);
        this.query(tokens.slice(i + 1, close), i === first ? indent : indent + 1, true);
        if (close < tokens.length) this.w.write(tokens[close]);
        i = close;
        continue;
      }

      if (i === first && this.is(token, "ВЫБОР", "CASE")) {
        const end = this.matchingCaseEnd(tokens, i);
        this.caseBlock(tokens.slice(i, end + 1), indent);
        i = end;
        continue;
      }

      this.w.write(token);
    }
  }

  private clause(clause: Clause, indent: number, continueLine: boolean) {
    const { head, tokens } = clause;
    let i = 0;
    // Комментарии на отдельных строках перед секцией.
    while (tokens[i]?.kind === "comment") this.w.write(tokens[i++]);

    if (!head) {
      if (!continueLine) this.w.newLine(indent);
      this.expression(tokens.slice(i), indent);
      return;
    }

    const [headerEnd, layout] = this.header(tokens, i, head);
    if (layout === "union") this.w.blankLine();
    if (!continueLine) this.w.newLine(indent);
    this.w.writeAll(tokens.slice(i, headerEnd));

    const body = tokens.slice(headerEnd);
    switch (layout) {
      case "list":
        this.list(body, indent + 1);
        break;
      case "conditions":
        this.conditions(body, indent + 1, true);
        break;
      case "sources":
        this.sources(body, indent + 1);
        break;
      case "union":
        this.w.writeAll(body);
        this.w.blankLine();
        break;
      case "inline":
        this.expression(body, indent + 1);
        break;
    }
  }

  /** Конец заголовка секции (ВЫБРАТЬ РАЗЛИЧНЫЕ ПЕРВЫЕ 10, СГРУППИРОВАТЬ ПО…) и раскладка её тела. */
  private header(tokens: Token[], start: number, head: string): [number, ClauseLayout] {
    let i = this.nextSignificant(tokens, start) + 1;
    const skipIf = (...names: string[]) => {
      const next = this.nextSignificant(tokens, i);
      if (this.is(tokens[next], ...names)) i = next + 1;
    };

    switch (head) {
      case "ВЫБРАТЬ":
      case "SELECT":
        for (;;) {
          const next = this.nextSignificant(tokens, i);
          const token = tokens[next];
          const afterTop = this.is(tokens[this.prevSignificant(tokens, next - 1)], "ПЕРВЫЕ", "TOP");
          const isModifier = token && this.words.get(token)?.keyword && SELECT_MODIFIERS.has(this.words.get(token)!.upper);
          const isTopCount = token && afterTop && (token.kind === "number" || token.kind === "param");
          if (!isModifier && !isTopCount) break;
          i = next + 1;
        }
        return [i, "list"];
      case "СГРУППИРОВАТЬ":
      case "GROUP":
        skipIf(...BY);
        skipIf("ГРУППИРУЮЩИМ", "GROUPING");
        skipIf("НАБОРАМ", "SETS");
        return [i, "list"];
      case "УПОРЯДОЧИТЬ":
      case "ORDER":
      case "ИНДЕКСИРОВАТЬ":
      case "INDEX":
      case "ИТОГИ":
      case "TOTALS":
        skipIf(...BY);
        return [i, "list"];
      case "ПО":
      case "BY":
        return [i, "list"];
      case "ИЗ":
      case "FROM":
        return [i, "sources"];
      case "ГДЕ":
      case "WHERE":
      case "ИМЕЮЩИЕ":
      case "HAVING":
        return [i, "conditions"];
      case "ОБЪЕДИНИТЬ":
      case "UNION":
        skipIf("ВСЕ", "ALL");
        return [i, "union"];
      default:
        // ПОМЕСТИТЬ ВТ, УНИЧТОЖИТЬ ВТ, ДЛЯ ИЗМЕНЕНИЯ, АВТОУПОРЯДОЧИВАНИЕ — одной строкой.
        return [tokens.length, "inline"];
    }
  }

  /** Элементы через запятую — каждый с новой строки. */
  private list(tokens: Token[], indent: number) {
    const { parts, separators } = this.splitTop(tokens, (token) => token.text === ",");
    parts.forEach((part, i) => {
      const rest = this.trailingCommentsToCurrentLine(part);
      if (rest.length === 0 && i === parts.length - 1) return;
      this.w.newLine(indent);
      this.expression(rest, indent);
      if (separators[i]) this.w.write(separators[i]);
    });
  }

  /** Условия: каждое И/ИЛИ верхнего уровня — с новой строки. */
  private conditions(tokens: Token[], indent: number, firstOnNewLine: boolean) {
    this.splitConditions(tokens).forEach((part, i) => {
      const rest = this.trailingCommentsToCurrentLine(part);
      if (i > 0 || firstOnNewLine) this.w.newLine(indent);
      this.expression(rest, indent);
    });
  }

  /** Источники ИЗ: таблицы через запятую, соединения и ПО — отдельными строками. */
  private sources(tokens: Token[], indent: number) {
    const { parts, separators } = this.splitTop(tokens, (token) => token.text === ",");
    parts.forEach((part, i) => {
      for (const segment of this.splitJoins(this.trailingCommentsToCurrentLine(part))) {
        if (segment.kind === "table") {
          this.w.newLine(indent);
          this.expression(segment.tokens, indent);
        } else if (segment.kind === "join") {
          this.w.newLine(indent + 1);
          this.expression(segment.tokens, indent + 1);
        } else {
          this.w.newLine(indent + 1);
          this.w.write(segment.tokens[0]);
          this.conditions(segment.tokens.slice(1), indent + 2, false);
        }
      }
      if (separators[i]) this.w.write(separators[i]);
    });
  }

  private caseBlock(tokens: Token[], indent: number) {
    const hasEnd = this.is(tokens[tokens.length - 1], "КОНЕЦ", "END");
    const inner = tokens.slice(1, hasEnd ? -1 : undefined);

    const parts: Token[][] = [[]];
    let depth = 0;
    let caseDepth = 0;
    for (const token of inner) {
      if (token.text === "(") depth++;
      else if (token.text === ")") depth--;
      else if (this.is(token, "ВЫБОР", "CASE")) caseDepth++;
      else if (this.is(token, "КОНЕЦ", "END")) caseDepth--;
      else if (depth === 0 && caseDepth === 0 && this.is(token, "КОГДА", "WHEN", "ТОГДА", "THEN", "ИНАЧЕ", "ELSE")) {
        parts.push([]);
      }
      parts[parts.length - 1].push(token);
    }

    this.w.write(tokens[0]);
    this.w.writeAll(parts[0]); // ВЫБОР Выражение КОГДА ...
    for (const part of parts.slice(1)) {
      const partIndent = this.is(part[0], "ТОГДА", "THEN") ? indent + 2 : indent + 1;
      this.w.newLine(partIndent);
      this.w.write(part[0]);
      this.expression(part.slice(1), partIndent);
    }
    if (hasEnd) {
      this.w.newLine(indent);
      this.w.write(tokens[tokens.length - 1]);
    }
  }

  private splitClauses(tokens: Token[]): Clause[] {
    const clauses: Clause[] = [{ head: "", tokens: [] }];
    let depth = 0;

    for (const token of tokens) {
      const current = clauses[clauses.length - 1];
      if (token.text === "(" || token.text === "{") depth++;
      else if (token.text === ")" || token.text === "}") depth--;

      const word = this.words.get(token);
      const startsClause =
        depth === 0 &&
        word?.keyword &&
        (CLAUSE_STARTS.has(word.upper) ||
          // ИТОГИ СУММА(...) ПО ... — «ПО» начинает список группировок итогов.
          (BY.includes(word.upper) &&
            (current.head === "ИТОГИ" || current.head === "TOTALS") &&
            current.tokens.filter((t) => t.kind !== "comment").length > 1));

      if (startsClause) {
        // Комментарии на отдельных строках перед секцией относятся к ней.
        const moved: Token[] = [];
        while (current.tokens.length > 0) {
          const last = current.tokens[current.tokens.length - 1];
          if (last.kind !== "comment" || last.lineBreaksBefore === 0) break;
          moved.unshift(current.tokens.pop()!);
        }
        clauses.push({ head: word.upper, tokens: [...moved, token] });
      } else {
        current.tokens.push(token);
      }
    }

    return clauses.filter((clause) => clause.tokens.length > 0);
  }

  private splitTop(tokens: Token[], isSeparator: (token: Token) => boolean) {
    const parts: Token[][] = [[]];
    const separators: Token[] = [];
    let depth = 0;
    for (const token of tokens) {
      if (token.text === "(" || token.text === "{") depth++;
      else if (token.text === ")" || token.text === "}") depth--;
      if (depth === 0 && isSeparator(token)) {
        separators.push(token);
        parts.push([]);
      } else {
        parts[parts.length - 1].push(token);
      }
    }
    return { parts, separators };
  }

  /** Делит условие по И/ИЛИ верхнего уровня; «МЕЖДУ А И Б» не делится. */
  private splitConditions(tokens: Token[]): Token[][] {
    const parts: Token[][] = [[]];
    let depth = 0;
    let caseDepth = 0;
    let between = false;
    for (const token of tokens) {
      if (token.text === "(" || token.text === "{") depth++;
      else if (token.text === ")" || token.text === "}") depth--;
      else if (this.is(token, "ВЫБОР", "CASE")) caseDepth++;
      else if (this.is(token, "КОНЕЦ", "END")) caseDepth--;
      else if (depth === 0 && caseDepth === 0) {
        if (this.is(token, "МЕЖДУ", "BETWEEN")) between = true;
        else if (this.is(token, "И", "AND") && between) between = false;
        else if (this.is(token, "И", "AND", "ИЛИ", "OR") && parts[parts.length - 1].length > 0) {
          parts.push([]);
        }
      }
      parts[parts.length - 1].push(token);
    }
    return parts;
  }

  private splitJoins(tokens: Token[]) {
    const segments: { kind: "table" | "join" | "on"; tokens: Token[] }[] = [{ kind: "table", tokens: [] }];
    let depth = 0;
    let prev: Token | undefined;
    for (const token of tokens) {
      if (token.text === "(" || token.text === "{") depth++;
      else if (token.text === ")" || token.text === "}") depth--;
      else if (depth === 0) {
        const word = this.words.get(token);
        const prevIsJoinPart = prev && JOIN_PARTS.has(this.words.get(prev)?.upper ?? "");
        const joinStart =
          word?.keyword &&
          (JOIN_STARTS.has(word.upper) ||
            ((word.upper === "СОЕДИНЕНИЕ" || word.upper === "JOIN") && !prevIsJoinPart));
        if (joinStart) segments.push({ kind: "join", tokens: [] });
        else if (this.is(token, "ПО", "ON")) segments.push({ kind: "on", tokens: [] });
      }
      segments[segments.length - 1].tokens.push(token);
      if (token.kind !== "comment") prev = token;
    }
    return segments.filter((segment) => segment.tokens.length > 0);
  }

  /** Комментарии, стоявшие в конце предыдущей строки, дописывает к ней же. */
  private trailingCommentsToCurrentLine(tokens: Token[]) {
    let i = 0;
    while (tokens[i]?.kind === "comment" && tokens[i].lineBreaksBefore === 0) this.w.write(tokens[i++]);
    return tokens.slice(i);
  }

  private matchingParen(tokens: Token[], open: number) {
    let depth = 0;
    for (let i = open; i < tokens.length; i++) {
      if (tokens[i].text === "(") depth++;
      else if (tokens[i].text === ")" && --depth === 0) return i;
    }
    return tokens.length;
  }

  private matchingCaseEnd(tokens: Token[], start: number) {
    let depth = 0;
    for (let i = start; i < tokens.length; i++) {
      if (this.is(tokens[i], "ВЫБОР", "CASE")) depth++;
      else if (this.is(tokens[i], "КОНЕЦ", "END") && --depth === 0) return i;
    }
    return tokens.length - 1;
  }

  private nextSignificant(tokens: Token[], from: number) {
    let i = from;
    while (tokens[i]?.kind === "comment") i++;
    return i;
  }

  private prevSignificant(tokens: Token[], from: number) {
    let i = from;
    while (tokens[i]?.kind === "comment") i--;
    return i;
  }

  private is(token: Token | undefined, ...names: string[]) {
    const word = token && this.words.get(token);
    return !!word?.keyword && names.includes(word.upper);
  }
}

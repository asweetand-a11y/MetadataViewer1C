/**
 * Проверка синтаксиса запроса по грамматике SDBL (LGPL-3.0-or-later,
 * разборщик в sdbl/generated). Возвращает ошибки с позициями в тексте;
 * сообщения ANTLR переведены на русский.
 */

import {
  BailErrorStrategy,
  BaseErrorListener,
  CharStream,
  CommonTokenStream,
  DefaultErrorStrategy,
  ParseCancellationException,
  PredictionMode,
  type ATNSimulator,
  type Recognizer,
  type Token,
} from "antlr4ng";
import { SDBLLexer } from "./sdbl/generated/SDBLLexer";
import { SDBLParser } from "./sdbl/generated/SDBLParser";
import { splitStatements, tokenize } from "../queryLanguage/lexer";

export type SyntaxError = {
  /** Смещения в тексте: начало и конец ошибочного места. */
  start: number;
  end: number;
  message: string;
};

/** Как называть лексемы в сообщениях: «ИЗ», «)», «конец текста». */
function describe(token: Token | null | undefined): string {
  if (!token || token.type === -1) return "конец текста";
  const text = token.text ?? "";
  return text.length > 40 ? `«${text.slice(0, 40)}…»` : `«${text}»`;
}

class Collector extends BaseErrorListener {
  readonly errors: SyntaxError[] = [];
  constructor(private readonly text: string) {
    super();
  }

  override syntaxError<S extends Token, T extends ATNSimulator>(
    _recognizer: Recognizer<T>,
    offendingSymbol: S | null,
    line: number,
    column: number,
    message: string,
  ): void {
    // Ошибки лексера приходят без лексемы — тогда позиция по строке и столбцу.
    if (offendingSymbol) {
      const eof = offendingSymbol.type === -1;
      const start = eof ? lastVisible(this.text) : offendingSymbol.start;
      const end = eof ? this.text.length : offendingSymbol.stop + 1;
      this.errors.push({ start, end: Math.max(end, start + 1), message: translate(message, offendingSymbol) });
    } else {
      const start = offsetAt(this.text, line, column);
      this.errors.push({ start, end: start + 1, message: "Недопустимый символ" });
    }
  }
}

/** Результаты разбора запросов пакета по их тексту: при наборе меняется обычно один запрос. */
const cache = new Map<string, SyntaxError[]>();
const CACHE_LIMIT = 500;

/**
 * Ошибки синтаксиса во всём тексте (пакете запросов). Каждый запрос пакета
 * разбирается отдельно и запоминается — повторно проверяется только изменённый.
 */
export function checkSyntax(text: string): SyntaxError[] {
  const tokens = tokenize(text).filter((token) => token.kind !== "comment");
  const errors: SyntaxError[] = [];
  for (const statement of splitStatements(tokens)) {
    // Пустой запрос (только комментарии и пробелы) — не ошибка: так бывает в конце пакета.
    if (!statement.tokens.length) continue;
    const start = statement.start;
    const end = Math.min(statement.end, text.length);
    const segment = text.slice(start, end);
    let found = cache.get(segment);
    if (!found) {
      found = checkPackage(segment);
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
      cache.set(segment, found);
    }
    for (const error of found) errors.push({ ...error, start: error.start + start, end: error.end + start });
  }
  return errors;
}

/** Разбор одного фрагмента как пакета запросов. */
function checkPackage(text: string): SyntaxError[] {
  if (!text.trim()) return [];
  const collector = new Collector(text);
  const lexer = new SDBLLexer(CharStream.fromString(text));
  lexer.removeErrorListeners();
  lexer.addErrorListener(collector);
  const stream = new CommonTokenStream(lexer);
  const parser = new SDBLParser(stream);
  parser.removeErrorListeners();

  // Сначала быстрый режим SLL без восстановления: правильный текст так разбирается в разы быстрее.
  // Если он споткнулся — полный разбор LL с сообщениями об ошибках.
  parser.interpreter.predictionMode = PredictionMode.SLL;
  parser.errorHandler = new BailErrorStrategy();
  try {
    parser.queryPackage();
    if (!collector.errors.length) return [];
  } catch (error) {
    if (!(error instanceof ParseCancellationException)) throw error;
  }
  collector.errors.length = 0;
  lexer.reset();
  stream.setTokenSource(lexer);
  parser.reset();
  parser.interpreter.predictionMode = PredictionMode.LL;
  parser.errorHandler = new DefaultErrorStrategy();
  parser.addErrorListener(collector);
  parser.queryPackage();

  const visible = stream.getTokens().filter((token) => token.channel === 0 && token.type !== -1);
  const semicolons = visible.filter((token) => token.type === SDBLLexer.SEMICOLON).map((token) => token.start);
  // После первой ошибки ANTLR часто сообщает о наведённых — по одной на запрос пакета.
  const reported = new Set<number>();
  const errors: SyntaxError[] = [];
  for (const error of collector.errors) {
    const statement = semicolons.filter((offset) => offset < error.start).length;
    if (reported.has(statement)) continue;
    reported.add(statement);
    errors.push(refine(error, visible, text));
  }
  return errors;
}

/** Понятнее для частых случаев: лишняя запятая перед ИЗ/ПОМЕСТИТЬ/«)», незаконченный запрос. */
function refine(error: SyntaxError, visible: Token[], text: string): SyntaxError {
  const at = visible.findIndex((token) => token.start === error.start);
  const previous = visible[at - 1];
  const current = visible[at];
  if (previous?.type === SDBLLexer.COMMA && current && [SDBLLexer.FROM, SDBLLexer.INTO, SDBLLexer.RPAREN].includes(current.type)) {
    return { start: previous.start, end: previous.stop + 1, message: `Лишняя запятая перед ${describe(current)}` };
  }
  // Следующий запрос без «;» перед ним.
  if (current && previous && (current.type === SDBLLexer.SELECT || current.type === SDBLLexer.DROP) && error.message.includes("«;»")) {
    return { start: current.start, end: current.stop + 1, message: `Пропущена «;» перед ${describe(current)}` };
  }
  if (error.end === text.length && at < 0) {
    // Конец текста: подсвечиваем последнее слово запроса, а не последнюю букву.
    const last = visible[visible.length - 1];
    if (last) return { start: last.start, end: last.stop + 1, message: error.message };
  }
  return error;
}

function translate(message: string, token: Token): string {
  const found = describe(token);
  if (message.startsWith("missing ")) {
    return `Пропущено ${expected(message.slice("missing ".length).split(" at ")[0])} перед ${found}`;
  }
  if (message.startsWith("extraneous input")) return `Лишнее ${found}`;
  if (message.startsWith("mismatched input") || message.startsWith("no viable alternative")) {
    const wanted = /expecting (.+)$/.exec(message)?.[1];
    return token.type === -1
      ? "Запрос не закончен"
      : wanted
        ? `Неожиданное ${found}, ожидалось ${expected(wanted)}`
        : `Неожиданное ${found}`;
  }
  if (message.startsWith("token recognition error")) return "Недопустимый символ";
  return `Ошибка синтаксиса у ${found}`;
}

/** «{'ИЗ', 'FROM'}», «')'», «IDENTIFIER» → по-русски, без английских вариантов. */
function expected(raw: string): string {
  const items = raw.replace(/^\{|\}$/g, "").split(/,\s*/);
  const names = items
    .map((item) => {
      const literal = /^'(.*)'$/.exec(item)?.[1];
      if (literal !== undefined) return literal;
      return TOKEN_NAMES[item] ?? null;
    })
    .filter((name): name is string => Boolean(name) && !/^[A-Z]{2,}$/.test(name!));
  const unique = [...new Set(names)];
  if (!unique.length) return "другое";
  const shown = unique.slice(0, 5).map((name) => `«${name}»`).join(", ");
  return unique.length > 5 ? `${shown}…` : shown;
}

/** Служебные имена лексем ANTLR, которые стоит показывать по-русски. */
const TOKEN_NAMES: Record<string, string> = {
  IDENTIFIER: "имя",
  DECIMAL: "число",
  FLOAT: "число",
  STR: "строка",
  PARAMETER_IDENTIFIER: "параметр",
  SEMICOLON: ";",
  COMMA: ",",
  RPAREN: ")",
  LPAREN: "(",
  DOT: ".",
  "<EOF>": "конец текста",
  SELECT: "ВЫБРАТЬ",
  FROM: "ИЗ",
  BY: "ПО",
  AS: "КАК",
  END: "КОНЕЦ",
  THEN: "ТОГДА",
  WHEN: "КОГДА",
};

function lastVisible(text: string): number {
  const trimmed = text.trimEnd();
  return Math.max(0, trimmed.length - 1);
}

function offsetAt(text: string, line: number, column: number): number {
  let offset = 0;
  for (let i = 1; i < line; i++) {
    const next = text.indexOf("\n", offset);
    if (next < 0) break;
    offset = next + 1;
  }
  return Math.min(text.length, offset + column);
}

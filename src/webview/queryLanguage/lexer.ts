/**
 * Лексер языка запросов для разбора текста вне Monaco (структура пакета,
 * форматирование). Подсветку делает отдельный токенизатор Monarch в grammar.ts.
 */

export type TokenKind = "word" | "param" | "number" | "string" | "comment" | "symbol";

export type Token = {
  kind: TokenKind;
  text: string;
  start: number;
  end: number;
  /** Сколько переводов строки было между предыдущей лексемой и этой. */
  lineBreaksBefore: number;
};

const WORD_START = /[\p{L}_]/u;
const WORD_PART = /[\p{L}\p{N}_]/u;
const DIGIT = /[0-9]/;
const TWO_CHAR_OPERATORS = new Set(["<>", "<=", ">="]);

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let lineBreaks = 0;
  let i = 0;

  const push = (kind: TokenKind, start: number, end: number) => {
    tokens.push({ kind, text: text.slice(start, end), start, end, lineBreaksBefore: lineBreaks });
    lineBreaks = 0;
  };

  while (i < text.length) {
    const ch = text[i];
    const start = i;

    if (ch === "\n") {
      lineBreaks++;
      i++;
    } else if (/\s/.test(ch)) {
      i++;
    } else if (ch === "/" && text[i + 1] === "/") {
      const lineEnd = text.indexOf("\n", i);
      i = lineEnd < 0 ? text.length : lineEnd;
      // Без завершающего \r, если перевод строки виндовый.
      push("comment", start, text[i - 1] === "\r" ? i - 1 : i);
    } else if (ch === '"') {
      i++;
      while (i < text.length) {
        if (text[i] === '"' && text[i + 1] === '"') i += 2;
        else if (text[i++] === '"') break;
      }
      push("string", start, i);
    } else if (ch === "&" && WORD_START.test(text[i + 1] ?? "")) {
      i += 2;
      while (i < text.length && WORD_PART.test(text[i])) i++;
      push("param", start, i);
    } else if (WORD_START.test(ch)) {
      i++;
      while (i < text.length && WORD_PART.test(text[i])) i++;
      push("word", start, i);
    } else if (DIGIT.test(ch)) {
      while (i < text.length && DIGIT.test(text[i])) i++;
      if (text[i] === "." && DIGIT.test(text[i + 1] ?? "")) {
        i++;
        while (i < text.length && DIGIT.test(text[i])) i++;
      }
      push("number", start, i);
    } else {
      i += TWO_CHAR_OPERATORS.has(text.slice(i, i + 2)) ? 2 : 1;
      push("symbol", start, i);
    }
  }

  return tokens;
}

/** Пакет запросов, разделённый «;». Пустой хвост после последней точки с запятой сохраняется. */
export function splitStatements(tokens: Token[]): { tokens: Token[]; start: number; end: number }[] {
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

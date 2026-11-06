/**
 * Применение функции из дерева «Функции языка запросов» к полю выборки под
 * курсором: «Т.Наименование КАК Наименование» + ВРЕГ →
 * «ВРЕГ(Т.Наименование) КАК Наименование». Выражение поля становится первым
 * параметром шаблона функции, остальные параметры — поля для заполнения.
 */

import { tokenize, type Token } from "./lexer";
import {
  AFTER_SELECT,
  SELECT_MODIFIERS,
  innermostScope,
  splitStatements,
  splitTopLevel,
  unionPart,
} from "./completion/query-context";

/** Заменить text[start, end) сниппетом. */
export type FieldWrap = { start: number; end: number; snippet: string };

const upper = (token: Token | undefined) => (token?.kind === "word" ? token.text.toUpperCase() : "");
const is = (token: Token | undefined, ...words: string[]) => words.includes(upper(token));

/** Первый параметр шаблона: ${1:Строка}. */
const FIRST_PLACEHOLDER = /\$\{1:[^}]*\}/;

/** null — курсор не на поле выборки или функцию не к чему применить (нет параметров). */
export function wrapSelectField(text: string, offset: number, snippet: string): FieldWrap | null {
  if (!FIRST_PLACEHOLDER.test(snippet)) return null;

  const tokens = tokenize(text).filter((token) => token.kind !== "comment");
  const statement = splitStatements(tokens).find((s) => s.start <= offset && offset <= s.end);
  if (!statement) return null;
  const scope = unionPart(innermostScope(statement.tokens, offset), offset);

  const item = selectItemAt(text, scope, offset);
  if (!item) return null;

  const as = lastTopLevel(item, (token) => is(token, "КАК", "AS"));
  const expression = as >= 0 ? item.slice(0, as) : item;
  if (!expression.length || (expression.length === 1 && expression[0].text === "*")) return null;

  const start = expression[0].start;
  const end = expression[expression.length - 1].end;
  // Без КАК имя поля — последняя часть пути; после обёртки его надо задать явно.
  const path = isPath(expression);
  const alias = as < 0 && path ? ` КАК ${expression[expression.length - 1].text}` : "";
  const wrapped = snippet.replace(FIRST_PLACEHOLDER, escapeSnippet(text.slice(start, end)));
  return { start, end, snippet: wrapped + alias };
}

/** Поле списка ВЫБРАТЬ, на котором стоит курсор: внутри поля или на его строке (если оно там одно). */
function selectItemAt(text: string, scope: Token[], offset: number): Token[] | null {
  let depth = 0;
  const depthAt = scope.map((token) => {
    if (token.text === ")") depth--;
    const current = depth;
    if (token.text === "(") depth++;
    return current;
  });
  const select = scope.findIndex((token, i) => depthAt[i] === 0 && is(token, "ВЫБРАТЬ", "SELECT"));
  if (select < 0) return null;

  let i = select + 1;
  for (;;) {
    if (is(scope[i], ...SELECT_MODIFIERS)) i++;
    else if (is(scope[i], "ПЕРВЫЕ", "TOP")) i += 2;
    else break;
  }
  let end = scope.findIndex((token, k) => k >= i && depthAt[k] === 0 && is(token, ...AFTER_SELECT));
  if (end < 0) end = scope.length;
  const items = splitTopLevel(scope.slice(i, end), (token) => token.text === ",").filter((item) => item.length);

  const inside = items.find((item) => item[0].start <= offset && offset <= item[item.length - 1].end);
  if (inside) return inside;
  // Курсор в отступе или после запятой — поле на той же строке, если оно там одно.
  const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
  const newline = text.indexOf("\n", offset);
  const lineEnd = newline < 0 ? text.length : newline;
  const onLine = items.filter((item) => item[0].start >= lineStart && item[0].start <= lineEnd);
  return onLine.length === 1 ? onLine[0] : null;
}

function lastTopLevel(tokens: Token[], match: (token: Token) => boolean): number {
  let depth = 0;
  let found = -1;
  tokens.forEach((token, i) => {
    if (token.text === "(") depth++;
    else if (token.text === ")") depth--;
    else if (depth === 0 && match(token)) found = i;
  });
  return found;
}

/** Выражение — путь «А.Б.В». */
function isPath(tokens: Token[]) {
  return tokens.length % 2 === 1 && tokens.every((token, i) => (i % 2 === 0 ? token.kind === "word" : token.text === "."));
}

/** Текст внутри сниппета Monaco: «$», «}» и «\» — служебные. */
function escapeSnippet(value: string) {
  return value.replace(/[\\$}]/g, "\\$&");
}

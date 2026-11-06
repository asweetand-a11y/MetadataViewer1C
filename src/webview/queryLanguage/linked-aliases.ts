/**
 * Связанное редактирование псевдонима таблицы: правка «ФЛ» в «КАК ФЛ» раздела ИЗ
 * меняет псевдоним во всём запросе сразу — во всех путях «ФЛ.…». Границы — запрос пакета, часть
 * ОБЪЕДИНИТЬ и подзапрос, в котором объявлен псевдоним; вложенные подзапросы
 * со своими таблицами не затрагиваются.
 *
 * Так же — имя временной таблицы после ПОМЕСТИТЬ: меняется во всех запросах пакета,
 * которые её используют.
 */

import { tokenize, type Token } from "./lexer";
import { AFTER_FROM, innermostScope, isKeyword, matchParen, splitStatements, unionPart } from "./completion/query-context";

export type TextRange = { start: number; end: number };

const upper = (token: Token | undefined) => (token?.kind === "word" ? token.text.toUpperCase() : "");
const is = (token: Token | undefined, ...words: string[]) => words.includes(upper(token));

/** Вхождения псевдонима под курсором; null — под курсором не псевдоним таблицы. */
export function linkedAliasRanges(text: string, offset: number): TextRange[] | null {
  const tokens = tokenize(text).filter((token) => token.kind !== "comment");
  // Курсор внутри слова или сразу за ним (так бывает во время набора).
  const word = tokens.find((token) => token.kind === "word" && token.start <= offset && offset <= token.end);
  if (!word) return null;
  const statements = splitStatements(tokens);
  const statement = statements.find((s) => s.start <= word.start && word.end <= s.end);
  if (!statement) return null;
  const before = statement.tokens[statement.tokens.indexOf(word) - 1];
  if (is(before, "ПОМЕСТИТЬ", "INTO")) return tempTableRanges(statements.slice(statements.indexOf(statement) + 1), word);

  const scope = ownTokens(unionPart(innermostScope(statement.tokens, word.start), word.start));
  const name = word.text.toLowerCase();
  // Правка запускается только с определения «КАК Псевдоним»; правка «ФЛ» в «ФЛ.Поле» — обычная.
  const definition = aliasDefinition(scope, name);
  if (definition !== word) return null;

  // Определение и начала путей «Псевдоним.…» (не «Т.Псевдоним» — это поле).
  const ranges = scope
    .filter(
      (token, i) =>
        token === definition ||
        (token.kind === "word" && token.text.toLowerCase() === name && scope[i + 1]?.text === "." && scope[i - 1]?.text !== "."),
    )
    .map((token) => ({ start: token.start, end: token.end }));
  return ranges.some((range) => range.start === word.start) ? ranges : null;
}

/**
 * Имя временной таблицы после ПОМЕСТИТЬ — и его упоминания в следующих запросах
 * пакета: источники, УНИЧТОЖИТЬ, пути «ВТ.Поле», если таблица подключена без псевдонима
 * или с псевдонимом, равным имени («ИЗ ВТ КАК ВТ» — меняется и псевдоним); псевдоним
 * другой таблицы «КАК ВТ» и пути через него не трогаются. До запроса,
 * который создаёт таблицу с тем же именем заново, или до УНИЧТОЖИТЬ включительно.
 */
function tempTableRanges(following: { tokens: Token[] }[], definition: Token): TextRange[] {
  const name = definition.text.toLowerCase();
  const same = (token: Token | undefined) => token?.kind === "word" && token.text.toLowerCase() === name;
  const ranges: TextRange[] = [{ start: definition.start, end: definition.end }];
  for (const statement of following) {
    const list = statement.tokens;
    // Пересоздана — дальше это уже другая таблица.
    if (list.some((token, i) => same(token) && is(list[i - 1], "ПОМЕСТИТЬ", "INTO"))) break;
    // Источник — имя без точки по бокам и не после КАК («КАК ВТ» — псевдоним другой таблицы).
    const sources = list.filter(
      (token, i) => same(token) && list[i - 1]?.text !== "." && list[i + 1]?.text !== "." && !is(list[i - 1], "КАК", "AS"),
    );
    // Пути «ВТ.Поле» — только если «ВТ» здесь означает эту таблицу: она подключена
    // без псевдонима или с псевдонимом, равным имени («ИЗ ВТ КАК ВТ» — меняется и он).
    const sameAliases = sources.flatMap((token) => {
      const i = list.indexOf(token);
      return is(list[i + 1], "КАК", "AS") && same(list[i + 2]) ? [list[i + 2]] : [];
    });
    const implicitAlias = sources.some((token) => {
      const next = list[list.indexOf(token) + 1];
      return !is(next, "КАК", "AS") && (next?.kind !== "word" || isKeyword(next));
    });
    const renamePaths = implicitAlias || sameAliases.length > 0;
    list.forEach((token, i) => {
      const path = same(token) && list[i + 1]?.text === "." && list[i - 1]?.text !== ".";
      if (sources.includes(token) || sameAliases.includes(token) || (path && renamePaths)) {
        ranges.push({ start: token.start, end: token.end });
      }
    });
    if (is(list[0], "УНИЧТОЖИТЬ", "DROP") && same(list[1])) break;
  }
  return ranges;
}

/** Лексемы области без вложенных подзапросов «(ВЫБРАТЬ …)»: у них свои псевдонимы. */
function ownTokens(scope: Token[]): Token[] {
  const own: Token[] = [];
  for (let i = 0; i < scope.length; i++) {
    if (scope[i].text === "(" && is(scope[i + 1], "ВЫБРАТЬ", "SELECT")) {
      i = matchParen(scope, i);
      continue;
    }
    own.push(scope[i]);
  }
  return own;
}

/** «КАК Псевдоним» в разделе ИЗ этой области. */
function aliasDefinition(scope: Token[], name: string): Token | undefined {
  const from = scope.findIndex((token) => is(token, "ИЗ", "FROM"));
  if (from < 0) return undefined;
  for (let i = from + 1; i < scope.length; i++) {
    if (is(scope[i], ...AFTER_FROM)) break;
    if (is(scope[i], "КАК", "AS") && scope[i + 1]?.kind === "word" && scope[i + 1].text.toLowerCase() === name) return scope[i + 1];
  }
  return undefined;
}

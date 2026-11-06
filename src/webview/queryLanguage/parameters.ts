/**
 * Параметры запроса (&Имя) — как на вкладке «Параметры» консоли запросов 1С.
 * Параметры в строках и комментариях лексер параметрами не считает.
 */

import { tokenize } from "./lexer";

export type QueryParameter = {
  /** Имя без «&» в написании первого вхождения. */
  name: string;
  /** Вхождения в тексте по порядку: смещения начала «&» и конца имени. */
  occurrences: { start: number; end: number }[];
};

export function collectParameters(text: string): QueryParameter[] {
  // Имена параметров в 1С регистронезависимы.
  const byName = new Map<string, QueryParameter>();
  for (const token of tokenize(text)) {
    if (token.kind !== "param") continue;
    const name = token.text.slice(1);
    const key = name.toUpperCase();
    let parameter = byName.get(key);
    if (!parameter) {
      parameter = { name, occurrences: [] };
      byName.set(key, parameter);
    }
    parameter.occurrences.push({ start: token.start, end: token.end });
  }
  return [...byName.values()];
}

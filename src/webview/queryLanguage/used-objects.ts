/**
 * Объекты конфигурации, которые упоминаются в тексте запроса: источники
 * (Справочник.Сотрудники, РегистрСведений.Х.СрезПоследних), табличные части,
 * ЗНАЧЕНИЕ(Перечисление.Х.Значение), ССЫЛКА Документ.Х, ВЫРАЗИТЬ(… КАК Справочник.Х).
 * Комментарии и строки не учитываются.
 */

import type { MdObject } from "../../queryModel/model";
import { tokenize } from "./lexer";
import type { MetadataIndex } from "./completion/metadata-index";

export function usedObjects(text: string, index: MetadataIndex): Set<MdObject> {
  const tokens = tokenize(text).filter((token) => token.kind !== "comment");
  const used = new Set<MdObject>();
  tokens.forEach((token, i) => {
    // «Вид.Имя» в начале пути: «Т.Справочник.Х» — поле, а не объект.
    if (token.kind !== "word" || tokens[i - 1]?.text === "." || tokens[i + 1]?.text !== ".") return;
    const name = tokens[i + 2];
    if (name?.kind !== "word") return;
    const kind = index.rootKind(token.text);
    const object = kind && index.object(kind, name.text);
    if (object) used.add(object);
  });
  return used;
}

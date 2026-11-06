/**
 * Автодополнение и всплывающие подсказки языка запросов.
 * Работает и без загруженной конфигурации (ключевые слова, функции,
 * псевдонимы, временные таблицы); с конфигурацией — ещё объекты и поля.
 */

import type * as MonacoApi from "monaco-editor";
import type { ConfigurationModel } from "../../../queryModel/model";
import { tokenize } from "../lexer";
import { AS_KEYWORDS, CONSTANTS, FUNCTIONS, KEYWORDS, METADATA_ROOTS, WORD_OPERATORS, type WordPair } from "../vocabulary";
import { MetadataIndex, queryNameOf, type TableField } from "./metadata-index";
import { analyzeQuery, fieldAtPath, fieldsAfterPath, splitStatements, type QueryContext } from "./query-context";

type Monaco = typeof MonacoApi;
type CompletionItem = MonacoApi.languages.CompletionItem;

// Текущая конфигурация. Хранится глобально: Monaco живёт дольше модулей при горячей перезагрузке.
const METADATA = Symbol.for("queryeditor.sdbl.metadata");
type MetadataStore = { [METADATA]?: MetadataIndex | null };

/** Подключает загруженную конфигурацию к автодополнению (null — отключить). */
export function setCompletionMetadata(model: ConfigurationModel | null) {
  (globalThis as MetadataStore)[METADATA] = model ? new MetadataIndex(model) : null;
}

const currentIndex = () => (globalThis as MetadataStore)[METADATA] ?? null;
/** Метаданные активной конфигурации — для перетаскивания реквизитов в редактор. */
export const completionMetadata = currentIndex;

/** Составные конструкции — подсказываются целиком. */
const PHRASES: WordPair[] = [
  ["СГРУППИРОВАТЬ ПО", "GROUP BY"],
  ["УПОРЯДОЧИТЬ ПО", "ORDER BY"],
  ["ИНДЕКСИРОВАТЬ ПО", "INDEX BY"],
  ["ЛЕВОЕ СОЕДИНЕНИЕ", "LEFT JOIN"],
  ["ВНУТРЕННЕЕ СОЕДИНЕНИЕ", "INNER JOIN"],
  ["ПОЛНОЕ СОЕДИНЕНИЕ", "FULL JOIN"],
  ["ПРАВОЕ СОЕДИНЕНИЕ", "RIGHT JOIN"],
  ["ОБЪЕДИНИТЬ ВСЕ", "UNION ALL"],
  ["В ИЕРАРХИИ", "IN HIERARCHY"],
  ["ДЛЯ ИЗМЕНЕНИЯ", "FOR UPDATE"],
  ["ЕСТЬ NULL", "IS NULL"],
];

const IDENT = "[\\p{L}_][\\p{L}\\p{N}_]*";
/** Цепочка «А.Б.» и недописанное слово перед курсором. */
const CHAIN_BEFORE_CURSOR = new RegExp(`((?:${IDENT}\\s*\\.\\s*)*)(${IDENT})?$`, "u");
const WORD_AT = new RegExp(IDENT, "gu");
/**
 * Слово или запятая перед курсором, за которыми начинается выражение,
 * и пробел или перевод строки после них.
 */
const ALIAS_TRIGGER =
  /(?:(?:^|[^\p{L}\p{N}_])(ГДЕ|WHERE|И|AND|ИЛИ|OR|НЕ|NOT|ПО|ON|BY|ВЫБРАТЬ|SELECT|РАЗЛИЧНЫЕ|DISTINCT|РАЗРЕШЕННЫЕ|ALLOWED|КОГДА|WHEN|ТОГДА|THEN|ИНАЧЕ|ELSE|ИМЕЮЩИЕ|HAVING)|(?:ПЕРВЫЕ|TOP)\s+\d+|(,))\s+$/iu;
/** Функции, первый аргумент которых обычно поле: после «СУММА(» — псевдонимы. */
const FIELD_FUNCTIONS = [
  "СУММА", "SUM", "КОЛИЧЕСТВО", "COUNT", "МАКСИМУМ", "MAX", "МИНИМУМ", "MIN", "СРЕДНЕЕ", "AVG",
  "ЕСТЬNULL", "ISNULL", "ВЫРАЗИТЬ", "CAST", "ПРЕДСТАВЛЕНИЕ", "PRESENTATION", "ПРЕДСТАВЛЕНИЕССЫЛКИ", "REFPRESENTATION",
  "ТИПЗНАЧЕНИЯ", "VALUETYPE", "ПОДСТРОКА", "SUBSTRING", "СТРОКА", "STRING", "ДЛИНАСТРОКИ", "STRINGLENGTH",
  "ВРЕГ", "UPPER", "НРЕГ", "LOWER", "СОКРЛ", "TRIML", "СОКРП", "TRIMR", "СОКРЛП", "TRIMALL", "ЛЕВ", "LEFT", "ПРАВ", "RIGHT",
  "ГОД", "YEAR", "КВАРТАЛ", "QUARTER", "МЕСЯЦ", "MONTH", "ДЕНЬГОДА", "DAYOFYEAR", "ДЕНЬ", "DAY", "НЕДЕЛЯ", "WEEK",
  "ДЕНЬНЕДЕЛИ", "WEEKDAY", "ЧАС", "HOUR", "МИНУТА", "MINUTE", "СЕКУНДА", "SECOND",
  "НАЧАЛОПЕРИОДА", "BEGINOFPERIOD", "КОНЕЦПЕРИОДА", "ENDOFPERIOD", "ДОБАВИТЬКДАТЕ", "DATEADD", "РАЗНОСТЬДАТ", "DATEDIFF",
  "ОКР", "ROUND", "ЦЕЛ", "INT", "ABS",
];
const FUNCTION_OPEN = new RegExp(`(?:^|[^\\p{L}\\p{N}_])(?:${FIELD_FUNCTIONS.join("|")})\\s*\\(\\s*$`, "iu");
/** Разделы запроса: по ближайшему из них слева понятно, где курсор. */
const CLAUSES = new Set(["ВЫБРАТЬ", "SELECT", "ИЗ", "FROM", "ПО", "ON", "BY", "ГДЕ", "WHERE", "СГРУППИРОВАТЬ", "GROUP", "ИМЕЮЩИЕ", "HAVING", "УПОРЯДОЧИТЬ", "ORDER", "ИТОГИ", "TOTALS", "ОБЪЕДИНИТЬ", "UNION", "ПОМЕСТИТЬ", "INTO"]);
/** «ПО» после этих слов — не условие соединения. */
const NOT_JOIN_BY = new Set(["СГРУППИРОВАТЬ", "GROUP", "УПОРЯДОЧИТЬ", "ORDER", "ИНДЕКСИРОВАТЬ", "INDEX", "ИЕРАРХИИ", "HIERARCHY"]);
const GROUP_WORDS = new Set(["СГРУППИРОВАТЬ", "GROUP"]);
/** После этих слов выражение начинается всегда. */
const EXPRESSION_START = new Set([
  "ВЫБРАТЬ", "SELECT", "РАЗЛИЧНЫЕ", "DISTINCT", "РАЗРЕШЕННЫЕ", "ALLOWED", "ПЕРВЫЕ",
  "ГДЕ", "WHERE", "ИМЕЮЩИЕ", "HAVING", "КОГДА", "WHEN", "ТОГДА", "THEN", "ИНАЧЕ", "ELSE",
]);

/**
 * Начало выражения, где пора выбирать таблицу:
 * - после «ВЫБРАТЬ» (и РАЗЛИЧНЫЕ, ПЕРВЫЕ N) и запятой в его списке;
 * - после «ГДЕ», «ИМЕЮЩИЕ», «ПО» соединения и «И», «ИЛИ», «НЕ» в этих условиях
 *   (кроме «И» в «МЕЖДУ … И …»);
 * - после «СГРУППИРОВАТЬ ПО» и запятой в нём;
 * - после «КОГДА», «ТОГДА», «ИНАЧЕ» и скобки функций вроде СУММА(, ЕСТЬNULL(, ГОД(.
 */
export function isAliasListPosition(text: string, offset: number): boolean {
  // Комментарий в конце строки («ФЛ.Наименование, // …» и Enter) не мешает.
  const before = text.slice(Math.max(0, offset - 200), offset).replace(/\/\/[^\n]*/g, "");
  if (insideStringOrComment(text, offset)) return false;
  if (FUNCTION_OPEN.test(before)) return true;
  const match = ALIAS_TRIGGER.exec(before);
  if (!match) return false;
  const comma = Boolean(match[2]);
  const word = comma ? "," : (match[1] ?? "ПЕРВЫЕ").toUpperCase();
  if (EXPRESSION_START.has(word)) return true;

  const tokens = tokenize(text).filter((token) => token.kind !== "comment" && token.end <= offset);
  // «ПО» соединения или «СГРУППИРОВАТЬ ПО», но не «УПОРЯДОЧИТЬ ПО» и т.п.
  const byAllowed = (i: number) => {
    const previous = upperText(tokens[i - 1]);
    return !NOT_JOIN_BY.has(previous) || GROUP_WORDS.has(previous);
  };
  if (word === "ПО" || word === "ON" || word === "BY") return byAllowed(tokens.length - 1);

  // Слева на том же уровне скобок: ближайший раздел — ВЫБРАТЬ или СГРУППИРОВАТЬ ПО
  // (для запятой), ГДЕ, ИМЕЮЩИЕ, ПО соединения или КОГДА (для И/ИЛИ/НЕ).
  tokens.pop();
  let depth = 0;
  let seenAnd = false;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token.text === ")") depth++;
    else if (token.text === "(") {
      // Запятая в скобках — аргументы функции; условие в скобках продолжается левее.
      if (depth === 0) {
        if (comma) return false;
        continue;
      }
      depth--;
    } else if (token.text === ";") return false;
    if (depth > 0 || token.kind !== "word") continue;
    const upper = token.text.toUpperCase();
    if (comma) {
      if (upper === "ПО" || upper === "BY") return GROUP_WORDS.has(upperText(tokens[i - 1]));
      if (CLAUSES.has(upper)) return upper === "ВЫБРАТЬ" || upper === "SELECT";
      continue;
    }
    if ((upper === "И" || upper === "AND") && !seenAnd) seenAnd = true;
    if ((upper === "МЕЖДУ" || upper === "BETWEEN") && (word === "И" || word === "AND") && !seenAnd) return false;
    if (upper === "КОГДА" || upper === "WHEN") return true;
    if (upper === "ПО" || upper === "ON") return !NOT_JOIN_BY.has(upperText(tokens[i - 1]));
    if (CLAUSES.has(upper)) return upper === "ГДЕ" || upper === "WHERE" || upper === "ИМЕЮЩИЕ" || upper === "HAVING";
  }
  return false;
}

/** Курсор в условии ПО соединения (не СГРУППИРОВАТЬ ПО и т.п.). */
function inJoinCondition(text: string, offset: number): boolean {
  return conditionClause(text, offset) === "join";
}

/** В каком условии курсор: ГДЕ, ПО соединения или ни в каком. */
function conditionClause(text: string, offset: number): "where" | "join" | null {
  const tokens = tokenize(text).filter((token) => token.kind !== "comment" && token.end <= offset);
  let depth = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token.text === ")") depth++;
    else if (token.text === "(") {
      if (depth > 0) depth--;
    } else if (token.text === ";") return null;
    if (depth > 0 || token.kind !== "word") continue;
    const upper = token.text.toUpperCase();
    if (upper === "ПО" || upper === "ON") return NOT_JOIN_BY.has(upperText(tokens[i - 1])) ? null : "join";
    if (upper === "ГДЕ" || upper === "WHERE") return "where";
    if (CLAUSES.has(upper)) return null;
  }
  return null;
}

/** Перед путём — начало условия: ГДЕ, И, ИЛИ, НЕ (не скобка функции). */
const CONDITION_START = /(?:^|[^\p{L}\p{N}_])(?:ГДЕ|WHERE|И|AND|ИЛИ|OR|НЕ|NOT)\s+$/iu;
/** Команда: после «Поле = » сразу открыть список значений (параметр, предопределённые…). */
const VALUES_COMMAND = "queryeditor.comparisonValues";
/** Следующий запрос подсказок — от этой команды: показать только значения. */
let valuesOnly = false;

/** Есть ли что предложить: позиция подходит и в запросе есть таблицы с псевдонимами. */
export function shouldListAliases(text: string, offset: number): boolean {
  return isAliasListPosition(text, offset) && analyzeQuery(text, offset, currentIndex()).sources.size > 0;
}

const upperText = (token: { text: string } | undefined) => token?.text.toUpperCase() ?? "";

/** «Псевдоним.Поле = » перед курсором (возможно, с начатым словом) — сравнение с полем. */
const COMPARISON_BEFORE_CURSOR = new RegExp(`(${IDENT}(?:\\s*\\.\\s*${IDENT})+)\\s*(?:<>|<=|>=|=|<|>)\\s*(${IDENT})?$`, "u");

export function registerCompletion(monaco: Monaco, languageId: string): MonacoApi.IDisposable[] {
  const { CompletionItemKind: Kind, CompletionItemInsertTextRule: Rule } = monaco.languages;

  const completion = monaco.languages.registerCompletionItemProvider(languageId, {
    // Пробел — только чтобы после «Поле = » сразу показать значения.
    triggerCharacters: [".", " ", "("],
    provideCompletionItems(model, position, trigger) {
      const text = model.getValue();
      const offset = model.getOffsetAt(position);
      if (insideStringOrComment(text, offset)) return { suggestions: [] };

      const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      // Пробел и «(» — только чтобы сразу показать псевдонимы или значения, иначе список не нужен.
      const bySpace = trigger.triggerCharacter === " " || trigger.triggerCharacter === "(";
      const match = CHAIN_BEFORE_CURSOR.exec(line);
      const chain = (match?.[1] ?? "").split(".").map((s) => s.trim()).filter(Boolean);
      const prefix = match?.[2] ?? "";
      const range = new monaco.Range(
        position.lineNumber,
        position.column - prefix.length,
        position.lineNumber,
        position.column,
      );

      const index = currentIndex();
      const context = analyzeQuery(text, offset, index);
      const english = /^[A-Za-z]/.test(prefix);
      const item = (partial: Omit<CompletionItem, "range">): CompletionItem => ({ ...partial, range });

      // «Т.Поле = » — параметр, значения перечисления, предопределённые элементы и пустая ссылка;
      // по пробелу — только они, по Ctrl+Space — сверху общего списка.
      const comparison = COMPARISON_BEFORE_CURSOR.exec(line);
      // В условии соединения справа обычно поле другой таблицы: псевдонимы вместо параметра.
      const joinComparison = Boolean(comparison) && inJoinCondition(text, offset);
      const valueItems = comparison ? comparisonValues(comparison[1], context, index, !joinComparison) : [];
      // Поле выбрано из списка в ГДЕ, вставлено «Поле = » — только значения.
      const forceValues = valuesOnly;
      valuesOnly = false;
      if (forceValues && comparison && !comparison[2] && valueItems.length) return { suggestions: valueItems.map((entry) => ({ ...entry, range })) };
      // После «ВЫБРАТЬ », запятой в ВЫБРАТЬ, «ГДЕ », «ПО », «И »… — псевдонимы таблиц запроса;
      // выбранный дополняется точкой и списком полей.
      // incomplete: начатое слово запрашивает полный список заново.
      const aliasPosition = !prefix && chain.length === 0 && (joinComparison || isAliasListPosition(text, offset));
      const aliasItems = aliasPosition
        ? [...context.sources.values()].map((source, i) =>
            item({
              label: source.alias,
              kind: Kind.Variable,
              insertText: `${source.alias}.`,
              detail: describeSource(source.table, index),
              sortText: `!0${String(i).padStart(4, "0")}`, // в порядке таблиц в ИЗ, перед значениями
              command: { id: "editor.action.triggerSuggest", title: "Поля" },
            }),
          )
        : [];
      if (bySpace) {
        if (comparison && !comparison[2]) return { suggestions: [...aliasItems, ...valueItems.map(item)] };
        return { suggestions: aliasItems };
      }
      if (aliasItems.length) return { suggestions: [...aliasItems, ...valueItems.map(item)], incomplete: true };

      // После точки: объекты вида, таблицы объекта или поля.
      if (chain.length > 0) {
        const items = afterDot(chain, context, index);
        // Новое поле списка ВЫБРАТЬ: выбранный реквизит вставляется сразу с «КАК Имя».
        const chainStart = offset - prefix.length - (match?.[1].length ?? 0);
        const restOfLine = model.getLineContent(position.lineNumber).slice(position.column - 1);
        const newSelectItem =
          !restOfLine.trim() &&
          SELECT_ITEM_START.test(text.slice(Math.max(0, chainStart - 100), chainStart)) &&
          isAliasListPosition(text, chainStart);
        // Новое условие в ГДЕ: выбранный реквизит вставляется с « = », и сразу список значений.
        const newCondition =
          !newSelectItem &&
          !restOfLine.trim() &&
          CONDITION_START.test(text.slice(Math.max(0, chainStart - 100), chainStart)) &&
          conditionClause(text, chainStart) === "where";
        if (newCondition) {
          return {
            suggestions: items.map((entry) =>
              entry.kind !== Kind.Field && entry.kind !== Kind.Property
                ? item(entry)
                : item({ ...entry, insertText: `${String(entry.insertText)} = `, command: { id: VALUES_COMMAND, title: "Значения" } }),
            ),
          };
        }
        if (!newSelectItem) return { suggestions: items.map(item) };
        const taken = namesInStatement(text, offset);
        return {
          suggestions: items.map((entry) => {
            if (entry.kind !== Kind.Field && entry.kind !== Kind.Property) return item(entry);
            const name = String(entry.insertText);
            const alias = uniqueName([...chain.slice(1), name].join(""), taken);
            return item({ ...entry, insertText: `${name} КАК ${alias}` });
          }),
        };
      }

      const suggestions: CompletionItem[] = [];
      for (const source of context.sources.values()) {
        suggestions.push(
          item({ label: source.alias, kind: Kind.Variable, insertText: source.alias, detail: describeSource(source.table, index), sortText: `0${source.alias}` }),
        );
      }
      for (const table of context.tempTables.values()) {
        if (table.type !== "derived" || context.sources.has(table.name.toLowerCase())) continue;
        suggestions.push(
          item({ label: table.name, kind: Kind.Struct, insertText: table.name, detail: "Временная таблица", sortText: `1${table.name}` }),
        );
      }
      const pick = (pair: WordPair) => (english ? pair[1] : pair[0]);
      for (const pair of [...KEYWORDS, ...AS_KEYWORDS, ...WORD_OPERATORS, ...CONSTANTS, ...PHRASES]) {
        const word = pick(pair);
        suggestions.push(item({ label: word, kind: Kind.Keyword, insertText: word, sortText: `3${word}` }));
      }
      for (const pair of FUNCTIONS) {
        const word = pick(pair);
        suggestions.push(
          item({ label: word, kind: Kind.Function, insertText: `${word}($0)`, insertTextRules: Rule.InsertAsSnippet, sortText: `4${word}` }),
        );
      }
      for (const pair of METADATA_ROOTS) {
        const word = pick(pair);
        suggestions.push(item({ label: word, kind: Kind.Module, insertText: word, sortText: `2${word}` }));
      }
      return { suggestions: dedupe([...valueItems.map(item), ...suggestions]) };
    },
  });

  /**
   * Варианты значения для сравнения с полем: параметр «&ИмяПоля» (кроме условий соединения), для булева —
   * ИСТИНА и ЛОЖЬ, для ссылочных типов — ЗНАЧЕНИЕ(Перечисление.Пол.Мужской) и т.п.
   */
  function comparisonValues(
    rawPath: string,
    context: QueryContext,
    index: MetadataIndex | null,
    withParameter: boolean,
  ): Omit<CompletionItem, "range">[] {
    const path = rawPath.split(".").map((part) => part.trim());
    const parameter = `&${path[path.length - 1]}`;
    const items: Omit<CompletionItem, "range">[] = withParameter
      ? [{ label: parameter, kind: Kind.Variable, insertText: parameter, detail: "Параметр запроса", sortText: "!0" }]
      : [];
    const field = index && fieldAtPath(path, context, index);
    if (!index || !field) return items;
    let order = 0;
    for (const type of field.types) {
      if (type === "Булево") {
        for (const word of ["ИСТИНА", "ЛОЖЬ"]) {
          items.push({ label: word, kind: Kind.Keyword, insertText: word, sortText: `!1${String(order++).padStart(5, "0")}` });
        }
        continue;
      }
      const object = index.objectByType(type);
      if (!object) continue;
      const full = `${queryNameOf(object.kind)}.${object.name}`;
      const value = (name: string, kind: MonacoApi.languages.CompletionItemKind, documentation?: string) =>
        items.push({
          label: { label: name, description: full },
          kind,
          insertText: `ЗНАЧЕНИЕ(${full}.${name})`,
          filterText: name,
          detail: `ЗНАЧЕНИЕ(${full}.${name})`,
          documentation,
          // Порядок как в метаданных: сначала типы поля, внутри — значения по порядку.
          sortText: `!1${String(order++).padStart(5, "0")}`,
        });
      for (const name of object.values ?? []) value(name, Kind.EnumMember);
      for (const predefined of object.predefined ?? []) value(predefined.name, Kind.EnumMember, predefined.description);
      if (object.kind !== "InformationRegister" && object.kind !== "AccumulationRegister") value("ПустаяСсылка", Kind.Constant);
    }
    return items;
  }

  function afterDot(chain: string[], context: QueryContext, index: MetadataIndex | null): Omit<CompletionItem, "range">[] {
    const rootKind = index?.rootKind(chain[0]);
    if (index && rootKind) {
      // Справочник. → объекты вида
      if (chain.length === 1) {
        return index.objects(rootKind).map((object) => ({
          label: object.name,
          kind: Kind.Class,
          insertText: object.name,
          detail: object.synonym,
          sortText: object.name,
        }));
      }
      // Справочник.Сотрудники. → виртуальные таблицы, табличные части, значения перечисления и предопределённые
      const object = chain.length === 2 ? index.object(rootKind, chain[1]) : undefined;
      if (!object) return [];
      const kindName = queryNameOf(object.kind);
      return [
        ...index.subTables(object).map((sub) => ({
          label: sub.name,
          kind: sub.kind === "virtual" ? Kind.Method : Kind.Struct,
          insertText: sub.name,
          detail: sub.kind === "virtual" ? "Виртуальная таблица" : `Табличная часть${sub.synonym ? ` — ${sub.synonym}` : ""}`,
          sortText: `0${sub.name}`,
        })),
        ...(object.values ?? []).map((value) => ({
          label: value,
          kind: Kind.EnumMember,
          insertText: value,
          detail: `${kindName}.${object.name}`,
          sortText: `1${value}`,
        })),
        ...(object.predefined ?? []).map((item) => ({
          label: item.name,
          kind: Kind.EnumMember,
          insertText: item.name,
          detail: item.description ? `Предопределенный — ${item.description}` : "Предопределенный",
          sortText: `1${item.name}`,
        })),
        ...(object.kind !== "InformationRegister" && object.kind !== "AccumulationRegister"
          ? [{ label: "ПустаяСсылка", kind: Kind.Constant, insertText: "ПустаяСсылка", sortText: "2" }]
          : []),
      ];
    }

    const fields = fieldsAfterPath(chain, context, index);
    return (fields ?? []).map((field) => fieldItem(field));
  }

  function fieldItem(field: TableField): Omit<CompletionItem, "range"> {
    const order = { dimension: 0, resource: 1, attribute: 2, standard: 3 }[field.group];
    return {
      label: { label: field.name, description: field.types.join(" | ") || undefined },
      kind: field.group === "standard" ? Kind.Property : Kind.Field,
      insertText: field.name,
      detail: field.types.join(" | ") || undefined,
      documentation: field.synonym,
      sortText: `${order}${field.name}`,
    };
  }

  const hover = monaco.languages.registerHoverProvider(languageId, {
    provideHover(model, position) {
      const lineText = model.getLineContent(position.lineNumber);
      const word = wordAt(lineText, position.column - 1);
      if (!word) return null;

      // Цепочка до слова под курсором включительно: «Т.Сотрудник.ФизическоеЛицо».
      const before = CHAIN_BEFORE_CURSOR.exec(lineText.slice(0, word.end));
      const chain = [...(before?.[1] ?? "").split(".").map((s) => s.trim()).filter(Boolean), word.text];
      const index = currentIndex();
      const context = analyzeQuery(model.getValue(), model.getOffsetAt(position), index);
      const range = new monaco.Range(position.lineNumber, word.start + 1, position.lineNumber, word.end + 1);

      const lines = describeChain(chain, context, index);
      return lines ? { range, contents: lines.map((value) => ({ value })) } : null;
    },
  });

  const values = monaco.editor.registerCommand(VALUES_COMMAND, () => {
    valuesOnly = true;
    const editor = monaco.editor.getEditors().find((candidate) => candidate.hasTextFocus());
    editor?.trigger("values", "editor.action.triggerSuggest", {});
  });

  return [completion, hover, values];
}

function describeChain(chain: string[], context: QueryContext, index: MetadataIndex | null): string[] | null {
  const rootKind = index?.rootKind(chain[0]);
  if (index && rootKind) {
    const object = chain.length >= 2 ? index.object(rootKind, chain[1]) : undefined;
    if (!object) return null;
    const title = `**${queryNameOf(object.kind)}.${object.name}**`;
    if (chain.length === 2) return [title + (object.synonym ? ` — ${object.synonym}` : "")];
    const sub = index.subTables(object).find((s) => s.name.toLowerCase() === chain[2].toLowerCase());
    return sub ? [`${title}.${sub.name} — ${sub.kind === "virtual" ? "виртуальная таблица" : "табличная часть"}`] : null;
  }

  if (chain.length === 1) {
    const source = context.sources.get(chain[0].toLowerCase());
    if (source) return [`**${source.alias}** — ${describeSource(source.table, index)}`];
    const temp = context.tempTables.get(chain[0].toLowerCase());
    return temp ? [`**${chain[0]}** — временная таблица`] : null;
  }

  const field = fieldAtPath(chain, context, index);
  if (!field) return null;
  return [
    `**${field.name}**${field.types.length ? `: ${field.types.join(" | ")}` : ""}`,
    ...(field.synonym ? [field.synonym] : []),
  ];
}

function describeSource(table: Parameters<MetadataIndex["describeTable"]>[0], index: MetadataIndex | null) {
  if (index) return index.describeTable(table);
  return table.type === "derived" ? table.name : "";
}

function wordAt(line: string, column: number) {
  WORD_AT.lastIndex = 0;
  for (let m = WORD_AT.exec(line); m; m = WORD_AT.exec(line)) {
    if (m.index <= column && column <= m.index + m[0].length) {
      return { text: m[0], start: m.index, end: m.index + m[0].length };
    }
  }
  return null;
}

function insideStringOrComment(text: string, offset: number): boolean {
  return tokenize(text).some(
    (t) => (t.kind === "string" || t.kind === "comment") && t.start < offset && offset <= t.end && !(t.kind === "string" && offset === t.end && text[t.end - 1] === '"'),
  );
}

/** Перед путём — начало элемента списка ВЫБРАТЬ: запятая, ВЫБРАТЬ, РАЗЛИЧНЫЕ, ПЕРВЫЕ N. */
const SELECT_ITEM_START = /(?:,|(?:^|[^\p{L}\p{N}_])(?:ВЫБРАТЬ|SELECT|РАЗЛИЧНЫЕ|DISTINCT|РАЗРЕШЕННЫЕ|ALLOWED|\d+))\s*$/iu;

/** Имена после КАК в запросе под курсором — чтобы имя нового поля не повторялось. */
function namesInStatement(text: string, offset: number): Set<string> {
  const statement = splitStatements(tokenize(text).filter((token) => token.kind !== "comment")).find(
    (s) => s.start <= offset && offset <= s.end,
  );
  const tokens = statement?.tokens ?? [];
  return new Set(
    tokens.filter((token, i) => token.kind === "word" && /^(КАК|AS)$/i.test(tokens[i - 1]?.text ?? "")).map((token) => token.text.toLowerCase()),
  );
}

/** Наименование, Наименование1… — как у конструктора запросов. */
function uniqueName(base: string, taken: Set<string>): string {
  let name = base;
  for (let n = 1; taken.has(name.toLowerCase()); n++) name = `${base}${n}`;
  return name;
}

function dedupe(items: CompletionItem[]): CompletionItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    // ПустаяСсылка разных типов составного поля — разные варианты.
    const key = typeof item.label === "string" ? `${item.label}|${item.kind}` : `${item.label.label}|${item.label.description}|${item.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

import type { languages } from "monaco-editor";
import {
  AS_KEYWORDS,
  CONSTANTS,
  FUNCTIONS,
  INTO_KEYWORD,
  KEYWORDS,
  METADATA_ROOTS,
  PERIODS,
  PRIMITIVE_TYPES,
  REFS_OPERATOR,
  VIRTUAL_TABLES,
  WORD_OPERATORS,
  spellings,
} from "./vocabulary";

/** Идентификатор языка в Monaco (SDBL — общепринятое название языка запросов 1С). */
export const LANGUAGE_ID = "1c-query";

export const languageConfiguration: languages.LanguageConfiguration = {
  comments: { lineComment: "//" },
  brackets: [
    ["(", ")"],
    ["{", "}"],
  ],
  autoClosingPairs: [
    { open: "(", close: ")" },
    { open: "{", close: "}" },
    { open: '"', close: '"', notIn: ["string", "comment"] },
  ],
  surroundingPairs: [
    { open: "(", close: ")" },
    { open: "{", close: "}" },
    { open: '"', close: '"' },
  ],
  // Слово — идентификатор (с кириллицей), параметр &Имя или число.
  wordPattern: /-?\d*\.\d+|&?[\p{L}_][\p{L}\p{N}_]*/u,
};

/**
 * Токенизатор Monarch. Контекст учитывается там, где это важно для подсветки:
 * - после точки идёт имя поля/таблицы, а не ключевое слово (Док.Ссылка, Т.Количество);
 * - после КАК идёт псевдоним или тип (КАК Количество, КАК ЧИСЛО(15, 2));
 * - после ПОМЕСТИТЬ идёт имя временной таблицы — оно выделяется жирным;
 * - имя функции подсвечивается только перед скобкой (СУММА(...), но не поле Сумма).
 */
export const monarchLanguage: languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".sdbl",
  ignoreCase: true,
  unicode: true,

  keywords: spellings(KEYWORDS),
  asKeywords: spellings(AS_KEYWORDS),
  wordOperators: spellings(WORD_OPERATORS),
  refsOperator: spellings([REFS_OPERATOR]),
  intoKeyword: spellings([INTO_KEYWORD]),
  constants: spellings(CONSTANTS),
  functions: spellings(FUNCTIONS),
  periods: spellings(PERIODS),
  primitiveTypes: spellings(PRIMITIVE_TYPES),
  metadataRoots: spellings(METADATA_ROOTS),
  virtualTables: spellings(VIRTUAL_TABLES),

  ident: /[\p{L}_][\p{L}\p{N}_]*/u,

  brackets: [
    { open: "(", close: ")", token: "delimiter.parenthesis" },
    { open: "{", close: "}", token: "delimiter.curly" },
  ],

  tokenizer: {
    root: [
      { include: "@whitespace" },

      [/&@ident/, "variable.parameter"],
      [/\d+\.\d+/, "number.float"],
      [/\d+/, "number"],
      [/"/, "string", "@string"],

      // Оператор «Поле ССЫЛКА Документ.Заказ». Без пути к метаданным справа
      // это обычное поле: ВЫБРАТЬ Ссылка ИЗ Справочник.Номенклатура.
      [/(?:ССЫЛКА|REFS)(?=\s+@ident\s*\.)/, "keyword.operator"],

      // Перед скобкой: функция, тип с квалификаторами или ключевое слово — В (, ИЕРАРХИИ (
      [
        /@ident(?=\s*\()/,
        {
          cases: {
            "@functions": "predefined",
            "@primitiveTypes": "type",
            "@wordOperators": "keyword.operator",
            "@keywords": "keyword",
            "@default": "identifier",
          },
        },
      ],
      // Начало пути к метаданным: Справочник.Номенклатура
      [
        /@ident(?=\s*\.)/,
        {
          cases: {
            "@metadataRoots": "type",
            "@default": "identifier",
          },
        },
      ],
      [
        /@ident/,
        {
          cases: {
            "@asKeywords": { token: "keyword", next: "@alias" },
            "@intoKeyword": { token: "keyword", next: "@tempTable" },
            "@refsOperator": "identifier",
            "@keywords": "keyword",
            "@wordOperators": "keyword.operator",
            "@constants": "constant",
            "@periods": "constant",
            "@default": "identifier",
          },
        },
      ],

      [/\./, "delimiter", "@member"],
      [/[(){}]/, "@brackets"],
      [/<>|<=|>=|[=<>+\-*/]/, "operator"],
      [/[,;]/, "delimiter"],
    ],

    whitespace: [
      [/\s+/, ""],
      [/\/\/.*$/, "comment"],
    ],

    string: [
      [/[^"]+/, "string"],
      [/""/, "string.escape"],
      [/"/, "string", "@pop"],
    ],

    // Имя после точки: поле, табличная часть или виртуальная таблица.
    member: [
      { include: "@whitespace" },
      [
        /@ident/,
        {
          cases: {
            "@virtualTables": { token: "type", next: "@pop" },
            "@default": { token: "identifier", next: "@pop" },
          },
        },
      ],
      [/(?=.)/, "", "@pop"],
    ],

    // Имя после ПОМЕСТИТЬ: временная таблица.
    tempTable: [
      { include: "@whitespace" },
      [/@ident/, "identifier.temptable", "@pop"],
      [/(?=.)/, "", "@pop"],
    ],

    // Имя после КАК: псевдоним или тип в ВЫРАЗИТЬ(... КАК ...).
    alias: [
      { include: "@whitespace" },
      [
        /@ident(?=\s*\.)/,
        {
          cases: {
            "@metadataRoots": { token: "type", next: "@pop" },
            "@default": { token: "identifier", next: "@pop" },
          },
        },
      ],
      [
        /@ident/,
        {
          cases: {
            "@primitiveTypes": { token: "type", next: "@pop" },
            "@default": { token: "identifier", next: "@pop" },
          },
        },
      ],
      [/(?=.)/, "", "@pop"],
    ],
  },
};

/**
 * Словарь языка запросов 1С:Предприятия 8 (русский и английский варианты).
 * Используется токенизатором для подсветки, а в следующих этапах —
 * для автодополнения и подсказок.
 */

/** Пара «русское написание — английское написание». */
export type WordPair = readonly [ru: string, en: string];

/** Ключевые слова конструкций запроса. */
export const KEYWORDS: readonly WordPair[] = [
  ["ВЫБРАТЬ", "SELECT"],
  ["РАЗРЕШЕННЫЕ", "ALLOWED"],
  ["РАЗЛИЧНЫЕ", "DISTINCT"],
  ["ПЕРВЫЕ", "TOP"],
  ["ПОМЕСТИТЬ", "INTO"],
  ["ИЗ", "FROM"],
  ["ПУСТАЯТАБЛИЦА", "EMPTYTABLE"],
  ["ЛЕВОЕ", "LEFT"],
  ["ПРАВОЕ", "RIGHT"],
  ["ПОЛНОЕ", "FULL"],
  ["ВНУТРЕННЕЕ", "INNER"],
  ["ВНЕШНЕЕ", "OUTER"],
  ["СОЕДИНЕНИЕ", "JOIN"],
  ["ПО", "ON"],
  ["ПО", "BY"],
  ["ГДЕ", "WHERE"],
  ["СГРУППИРОВАТЬ", "GROUP"],
  ["ГРУППИРУЮЩИМ", "GROUPING"],
  ["НАБОРАМ", "SETS"],
  ["ИМЕЮЩИЕ", "HAVING"],
  ["ОБЪЕДИНИТЬ", "UNION"],
  ["ВСЕ", "ALL"],
  ["УПОРЯДОЧИТЬ", "ORDER"],
  ["ВОЗР", "ASC"],
  ["УБЫВ", "DESC"],
  ["АВТОУПОРЯДОЧИВАНИЕ", "AUTOORDER"],
  ["ИТОГИ", "TOTALS"],
  ["ОБЩИЕ", "OVERALL"],
  ["ТОЛЬКО", "ONLY"],
  ["ИЕРАРХИЯ", "HIERARCHY"],
  ["ИЕРАРХИИ", "HIERARCHY"],
  ["ПЕРИОДАМИ", "PERIODS"],
  ["ДЛЯ", "FOR"],
  ["ИЗМЕНЕНИЯ", "UPDATE"],
  ["ИНДЕКСИРОВАТЬ", "INDEX"],
  ["УНИЧТОЖИТЬ", "DROP"],
  ["ВЫБОР", "CASE"],
  ["КОГДА", "WHEN"],
  ["ТОГДА", "THEN"],
  ["ИНАЧЕ", "ELSE"],
  ["КОНЕЦ", "END"],
  // Расширение языка запросов для системы компоновки данных: {ХАРАКТЕРИСТИКИ ...}
  ["ХАРАКТЕРИСТИКИ", "CHARACTERISTICS"],
  ["ВИДЫХАРАКТЕРИСТИК", "CHARACTERISTICTYPES"],
  ["ЗНАЧЕНИЯХАРАКТЕРИСТИК", "CHARACTERISTICVALUES"],
  ["ПОЛЕКЛЮЧА", "KEYFIELD"],
  ["ПОЛЕИМЕНИ", "NAMEFIELD"],
  ["ПОЛЕТИПАЗНАЧЕНИЯ", "VALUETYPEFIELD"],
  ["ПОЛЕОБЪЕКТА", "OBJECTFIELD"],
  ["ПОЛЕВИДА", "TYPEFIELD"],
  ["ПОЛЕЗНАЧЕНИЯ", "VALUEFIELD"],
];

/** «КАК» выделено отдельно: после него идёт псевдоним или тип. */
export const AS_KEYWORDS: readonly WordPair[] = [["КАК", "AS"]];

/** «ССЫЛКА» совпадает с именем стандартного реквизита, поэтому токенизатор разбирает его отдельно. */
export const REFS_OPERATOR: WordPair = ["ССЫЛКА", "REFS"];

/** После него — имя временной таблицы (входит и в KEYWORDS). */
export const INTO_KEYWORD: WordPair = ["ПОМЕСТИТЬ", "INTO"];

/** Логические операторы и операторы сравнения, записываемые словами. */
export const WORD_OPERATORS: readonly WordPair[] = [
  ["И", "AND"],
  ["ИЛИ", "OR"],
  ["НЕ", "NOT"],
  ["В", "IN"],
  ["МЕЖДУ", "BETWEEN"],
  ["ПОДОБНО", "LIKE"],
  ["СПЕЦСИМВОЛ", "ESCAPE"],
  ["ЕСТЬ", "IS"],
  REFS_OPERATOR,
];

/** Литералы. */
export const CONSTANTS: readonly WordPair[] = [
  ["ИСТИНА", "TRUE"],
  ["ЛОЖЬ", "FALSE"],
  ["НЕОПРЕДЕЛЕНО", "UNDEFINED"],
  ["NULL", "NULL"],
];

/** Встроенные функции языка запросов. */
export const FUNCTIONS: readonly WordPair[] = [
  // Агрегатные
  ["СУММА", "SUM"],
  ["КОЛИЧЕСТВО", "COUNT"],
  ["МАКСИМУМ", "MAX"],
  ["МИНИМУМ", "MIN"],
  ["СРЕДНЕЕ", "AVG"],
  // Работа с датами
  ["ГОД", "YEAR"],
  ["КВАРТАЛ", "QUARTER"],
  ["МЕСЯЦ", "MONTH"],
  ["ДЕНЬГОДА", "DAYOFYEAR"],
  ["ДЕНЬ", "DAY"],
  ["НЕДЕЛЯ", "WEEK"],
  ["ДЕНЬНЕДЕЛИ", "WEEKDAY"],
  ["ЧАС", "HOUR"],
  ["МИНУТА", "MINUTE"],
  ["СЕКУНДА", "SECOND"],
  ["НАЧАЛОПЕРИОДА", "BEGINOFPERIOD"],
  ["КОНЕЦПЕРИОДА", "ENDOFPERIOD"],
  ["ДОБАВИТЬКДАТЕ", "DATEADD"],
  ["РАЗНОСТЬДАТ", "DATEDIFF"],
  ["ДАТАВРЕМЯ", "DATETIME"],
  // Работа со строками
  ["ПОДСТРОКА", "SUBSTRING"],
  ["СТРОКА", "STRING"],
  ["ДЛИНАСТРОКИ", "STRINGLENGTH"],
  ["СОКРЛ", "TRIML"],
  ["СОКРП", "TRIMR"],
  ["СОКРЛП", "TRIMALL"],
  ["ЛЕВ", "LEFT"],
  ["ПРАВ", "RIGHT"],
  ["СТРНАЙТИ", "STRFIND"],
  ["ВРЕГ", "UPPER"],
  ["НРЕГ", "LOWER"],
  ["СТРЗАМЕНИТЬ", "STRREPLACE"],
  // Математические
  ["ACOS", "ACOS"],
  ["ASIN", "ASIN"],
  ["ATAN", "ATAN"],
  ["COS", "COS"],
  ["SIN", "SIN"],
  ["TAN", "TAN"],
  ["EXP", "EXP"],
  ["LOG", "LOG"],
  ["LOG10", "LOG10"],
  ["POW", "POW"],
  ["SQRT", "SQRT"],
  ["ОКР", "ROUND"],
  ["ЦЕЛ", "INT"],
  // Прочие
  ["ВЫРАЗИТЬ", "CAST"],
  ["ЕСТЬNULL", "ISNULL"],
  ["ЗНАЧЕНИЕ", "VALUE"],
  ["ТИП", "TYPE"],
  ["ТИПЗНАЧЕНИЯ", "VALUETYPE"],
  ["ПРЕДСТАВЛЕНИЕ", "PRESENTATION"],
  ["ПРЕДСТАВЛЕНИЕССЫЛКИ", "REFPRESENTATION"],
  ["УНИКАЛЬНЫЙИДЕНТИФИКАТОР", "UUID"],
  ["РАЗМЕРХРАНИМЫХДАННЫХ", "STOREDDATASIZE"],
  ["АВТОНОМЕРЗАПИСИ", "RECORDAUTONUMBER"],
  ["СГРУППИРОВАНОПО", "GROUPEDBY"],
];

/** Значения периодичности: НАЧАЛОПЕРИОДА(Дата, МЕСЯЦ), ПЕРИОДАМИ(ДЕНЬ, ...). */
export const PERIODS: readonly WordPair[] = [
  ["СЕКУНДА", "SECOND"],
  ["МИНУТА", "MINUTE"],
  ["ЧАС", "HOUR"],
  ["ДЕНЬ", "DAY"],
  ["НЕДЕЛЯ", "WEEK"],
  ["ДЕКАДА", "TENDAYS"],
  ["МЕСЯЦ", "MONTH"],
  ["КВАРТАЛ", "QUARTER"],
  ["ПОЛУГОДИЕ", "HALFYEAR"],
  ["ГОД", "YEAR"],
];

/** Примитивные типы для ВЫРАЗИТЬ(... КАК ЧИСЛО(15, 2)) и ТИП(...). */
export const PRIMITIVE_TYPES: readonly WordPair[] = [
  ["ЧИСЛО", "NUMBER"],
  ["СТРОКА", "STRING"],
  ["ДАТА", "DATE"],
  ["БУЛЕВО", "BOOLEAN"],
];

/** Корневые виды объектов метаданных: Справочник.Номенклатура и т.п. */
export const METADATA_ROOTS: readonly WordPair[] = [
  ["Справочник", "Catalog"],
  ["Документ", "Document"],
  ["ЖурналДокументов", "DocumentJournal"],
  ["Перечисление", "Enum"],
  ["ПланВидовХарактеристик", "ChartOfCharacteristicTypes"],
  ["ПланСчетов", "ChartOfAccounts"],
  ["ПланВидовРасчета", "ChartOfCalculationTypes"],
  ["РегистрСведений", "InformationRegister"],
  ["РегистрНакопления", "AccumulationRegister"],
  ["РегистрБухгалтерии", "AccountingRegister"],
  ["РегистрРасчета", "CalculationRegister"],
  ["БизнесПроцесс", "BusinessProcess"],
  ["Задача", "Task"],
  ["ПланОбмена", "ExchangePlan"],
  ["Константа", "Constant"],
  ["Последовательность", "Sequence"],
  ["КритерийОтбора", "FilterCriterion"],
  ["ВнешнийИсточникДанных", "ExternalDataSource"],
];

/** Виртуальные таблицы: РегистрНакопления.Товары.Остатки(...) и т.п. */
export const VIRTUAL_TABLES: readonly WordPair[] = [
  ["Остатки", "Balance"],
  ["Обороты", "Turnovers"],
  ["ОстаткиИОбороты", "BalanceAndTurnovers"],
  ["СрезПервых", "SliceFirst"],
  ["СрезПоследних", "SliceLast"],
  ["ДвиженияССубконто", "RecordsWithExtDimensions"],
  ["ОборотыДтКт", "DrCrTurnovers"],
  ["ДанныеГрафика", "ScheduleData"],
  ["ФактическийПериодДействия", "ActualActionPeriod"],
  ["ЗадачиПоИсполнителю", "TaskByPerformer"],
  ["Изменения", "Changes"],
];

/** Все написания из набора пар без повторов. */
export function spellings(...groups: readonly (readonly WordPair[])[]): string[] {
  return [...new Set(groups.flat(2))];
}

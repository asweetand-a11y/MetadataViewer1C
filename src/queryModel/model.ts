/**
 * Модель метаданных конфигурации для автодополнения в запросах.
 * Хранит только то, что видно из языка запросов: объекты, их реквизиты
 * с типами, табличные части, измерения и ресурсы регистров. Стандартные
 * реквизиты (Ссылка, Код, Регистратор…) и поля виртуальных таблиц
 * не хранятся — они выводятся из вида объекта и его свойств.
 */

/** 2 — предопределённые элементы (predefined). */
export const MODEL_FORMAT_VERSION = 2;

export type MdKind =
  | "Catalog"
  | "Document"
  | "DocumentJournal"
  | "Enum"
  | "ChartOfCharacteristicTypes"
  | "ChartOfAccounts"
  | "ChartOfCalculationTypes"
  | "InformationRegister"
  | "AccumulationRegister"
  | "AccountingRegister"
  | "CalculationRegister"
  | "BusinessProcess"
  | "Task"
  | "ExchangePlan"
  | "Constant"
  | "Sequence"
  | "FilterCriterion";

export type MdKindInfo = {
  kind: MdKind;
  /** Папка в выгрузке конфигурации в файлы. */
  folder: string;
  /** Как вид называется в тексте запроса: Справочник.Имя. */
  queryName: string;
  /** Для списков в интерфейсе. */
  plural: string;
};

export const MD_KINDS: readonly MdKindInfo[] = [
  { kind: "Catalog", folder: "Catalogs", queryName: "Справочник", plural: "Справочники" },
  { kind: "Document", folder: "Documents", queryName: "Документ", plural: "Документы" },
  { kind: "DocumentJournal", folder: "DocumentJournals", queryName: "ЖурналДокументов", plural: "Журналы документов" },
  { kind: "Enum", folder: "Enums", queryName: "Перечисление", plural: "Перечисления" },
  { kind: "ChartOfCharacteristicTypes", folder: "ChartsOfCharacteristicTypes", queryName: "ПланВидовХарактеристик", plural: "Планы видов характеристик" },
  { kind: "ChartOfAccounts", folder: "ChartsOfAccounts", queryName: "ПланСчетов", plural: "Планы счетов" },
  { kind: "ChartOfCalculationTypes", folder: "ChartsOfCalculationTypes", queryName: "ПланВидовРасчета", plural: "Планы видов расчета" },
  { kind: "InformationRegister", folder: "InformationRegisters", queryName: "РегистрСведений", plural: "Регистры сведений" },
  { kind: "AccumulationRegister", folder: "AccumulationRegisters", queryName: "РегистрНакопления", plural: "Регистры накопления" },
  { kind: "AccountingRegister", folder: "AccountingRegisters", queryName: "РегистрБухгалтерии", plural: "Регистры бухгалтерии" },
  { kind: "CalculationRegister", folder: "CalculationRegisters", queryName: "РегистрРасчета", plural: "Регистры расчета" },
  { kind: "BusinessProcess", folder: "BusinessProcesses", queryName: "БизнесПроцесс", plural: "Бизнес-процессы" },
  { kind: "Task", folder: "Tasks", queryName: "Задача", plural: "Задачи" },
  { kind: "ExchangePlan", folder: "ExchangePlans", queryName: "ПланОбмена", plural: "Планы обмена" },
  { kind: "Constant", folder: "Constants", queryName: "Константа", plural: "Константы" },
  { kind: "Sequence", folder: "Sequences", queryName: "Последовательность", plural: "Последовательности" },
  { kind: "FilterCriterion", folder: "FilterCriteria", queryName: "КритерийОтбора", plural: "Критерии отбора" },
];

/** Папка с определяемыми типами: нужна, чтобы раскрыть их в реальные типы реквизитов. */
export const DEFINED_TYPES_FOLDER = "DefinedTypes";

export type MdField = {
  name: string;
  synonym?: string;
  /**
   * Типы в нотации языка запросов: «Справочник.Сотрудники», «Число(15, 2)»,
   * «Строка(100)», «Дата», «Булево»… Составной тип — несколько элементов.
   */
  type: string[];
};

export type MdTable = {
  name: string;
  synonym?: string;
  fields: MdField[];
};

/** Предопределённый элемент справочника, плана видов характеристик, счетов, видов расчёта. */
export type MdPredefined = {
  name: string;
  /** Наименование, если отличается от имени. */
  description?: string;
};

export type MdObject = {
  kind: MdKind;
  name: string;
  synonym?: string;
  /** Реквизиты (у журналов — графы, у задач — и реквизиты адресации). */
  fields: MdField[];
  /** Измерения регистров и последовательностей. */
  dimensions?: MdField[];
  /** Ресурсы регистров. */
  resources?: MdField[];
  /** Табличные части. */
  tables?: MdTable[];
  /** Значения перечисления. */
  values?: string[];
  /** Предопределённые элементы (из Ext/Predefined.xml), включая вложенные в группы. */
  predefined?: MdPredefined[];
  /** Свойства, от которых зависят стандартные реквизиты и виртуальные таблицы. */
  props?: Record<string, string | string[] | boolean>;
};

export type ConfigurationModel = {
  formatVersion: number;
  /** Уникальный идентификатор конфигурации из Configuration.xml. */
  id: string;
  name: string;
  synonym?: string;
  version?: string;
  vendor?: string;
  /** Время загрузки (ISO). */
  loadedAt: string;
  objects: MdObject[];
};

/** Сведения о загрузке: размеры и время разбора. */
export type ImportStats = {
  /** Размер модели в JSON (UTF-8), байт. */
  modelBytes: number;
  /** Суммарный размер прочитанных XML-файлов, байт. */
  sourceBytes: number;
  sourceFiles: number;
  parseSeconds: number;
};

/** Краткие сведения для списка конфигураций — без загрузки всей модели. */
export type ConfigurationSummary = {
  id: string;
  name: string;
  synonym?: string;
  version?: string;
  vendor?: string;
  loadedAt: string;
  counts: Partial<Record<MdKind, number>>;
  /** Нет у конфигураций, загруженных до появления этих сведений. */
  stats?: ImportStats;
  /**
   * Файл встроенной типовой конфигурации в public/configurations (собирается
   * скриптом scripts/build-configuration.ts). У загруженных пользователем — нет.
   */
  builtinFile?: string;
  /** Размер файла builtinFile — сколько скачивается при первом выборе. */
  builtinBytes?: number;
};

export function summarize(model: ConfigurationModel, stats?: ImportStats): ConfigurationSummary {
  const counts: Partial<Record<MdKind, number>> = {};
  for (const object of model.objects) counts[object.kind] = (counts[object.kind] ?? 0) + 1;
  const { id, name, synonym, version, vendor, loadedAt } = model;
  return { id, name, synonym, version, vendor, loadedAt, counts, ...(stats ? { stats } : {}) };
}

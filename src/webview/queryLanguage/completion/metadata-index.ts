/**
 * Индекс загруженной конфигурации для автодополнения: поиск объектов,
 * их полей (стандартные реквизиты + реквизиты + измерения/ресурсы),
 * табличных частей и виртуальных таблиц.
 */

import { MD_KINDS, type ConfigurationModel, type MdField, type MdKind, type MdObject, type MdTable } from "../../../queryModel/model";
import { METADATA_ROOTS } from "../vocabulary";

export type FieldGroup = "standard" | "dimension" | "resource" | "attribute";

export type TableField = {
  name: string;
  /** Типы в нотации запросов: «Справочник.Сотрудники», «Число(15, 2)»… Пусто — неизвестен. */
  types: string[];
  synonym?: string;
  group: FieldGroup;
};

/** Таблица-источник запроса. */
export type TableRef =
  | { type: "object"; object: MdObject }
  | { type: "tabular"; object: MdObject; table: MdTable }
  | { type: "virtual"; object: MdObject; name: string }
  | { type: "derived"; name: string; fields: TableField[] };

export type SubTable = { name: string; kind: "tabular" | "virtual"; synonym?: string };

const ref = (object: MdObject) => `${queryNameOf(object.kind)}.${object.name}`;

export function queryNameOf(kind: MdKind) {
  return MD_KINDS.find((k) => k.kind === kind)!.queryName;
}

const std = (name: string, types: string[] = []): TableField => ({ name, types, group: "standard" });
const toFields = (fields: MdField[] | undefined, group: FieldGroup): TableField[] =>
  (fields ?? []).map((f) => ({ name: f.name, types: f.type, synonym: f.synonym, group }));
const withSuffix = (fields: MdField[] | undefined, suffixes: string[]): TableField[] =>
  (fields ?? []).flatMap((f) =>
    suffixes.map((suffix) => ({ name: f.name + suffix, types: f.type, synonym: f.synonym, group: "resource" as const })),
  );

const PERIOD_FIELDS = [
  std("Период", ["Дата"]),
  std("Регистратор"),
  std("НомерСтроки", ["Число"]),
  ...["Секунда", "Минута", "Час", "День", "Неделя", "Декада", "Месяц", "Квартал", "Полугодие", "Год"].map((p) =>
    std(`${p}Периода`, ["Дата"]),
  ),
];

/** Стандартные реквизиты объекта — по его виду и свойствам. */
function standardFields(object: MdObject): TableField[] {
  const self = [ref(object)];
  const p = object.props ?? {};
  const has = (key: string) => typeof p[key] === "string" && p[key] !== "0";
  const hierarchical = p.hierarchical === true;
  const common = [std("Ссылка", self), std("ПометкаУдаления", ["Булево"])];

  switch (object.kind) {
    case "Catalog":
      return [
        ...common,
        ...(has("codeLength") ? [std("Код")] : []),
        ...(has("descriptionLength") ? [std("Наименование", ["Строка"])] : []),
        ...(hierarchical ? [std("Родитель", self)] : []),
        ...(hierarchical && p.hierarchyType !== "HierarchyOfItems" ? [std("ЭтоГруппа", ["Булево"])] : []),
        ...(Array.isArray(p.owners) && p.owners.length ? [std("Владелец", p.owners)] : []),
        std("Предопределенный", ["Булево"]),
        std("ИмяПредопределенныхДанных", ["Строка"]),
        std("Представление", ["Строка"]),
      ];
    case "Document":
      return [...common, std("Дата", ["Дата"]), std("Номер"), std("Проведен", ["Булево"]), std("Представление", ["Строка"])];
    case "DocumentJournal":
      return [
        std("Ссылка"),
        std("Дата", ["Дата"]),
        std("Номер"),
        std("Проведен", ["Булево"]),
        std("ПометкаУдаления", ["Булево"]),
        std("Тип"),
        std("Представление", ["Строка"]),
      ];
    case "Enum":
      return [std("Ссылка", self), std("Порядок", ["Число"]), std("Представление", ["Строка"])];
    case "ChartOfCharacteristicTypes":
      return [
        ...common,
        std("Код"),
        std("Наименование", ["Строка"]),
        ...(hierarchical ? [std("Родитель", self), std("ЭтоГруппа", ["Булево"])] : []),
        std("ТипЗначения"),
        std("Предопределенный", ["Булево"]),
        std("ИмяПредопределенныхДанных", ["Строка"]),
        std("Представление", ["Строка"]),
      ];
    case "ChartOfAccounts":
      return [
        ...common,
        std("Код"),
        std("Наименование", ["Строка"]),
        std("Родитель", self),
        std("Вид"),
        std("Забалансовый", ["Булево"]),
        std("Порядок", ["Строка"]),
        std("Предопределенный", ["Булево"]),
        std("ИмяПредопределенныхДанных", ["Строка"]),
        std("Представление", ["Строка"]),
      ];
    case "ChartOfCalculationTypes":
      return [
        ...common,
        std("Код"),
        std("Наименование", ["Строка"]),
        std("ПериодДействияБазовый", ["Булево"]),
        std("Предопределенный", ["Булево"]),
        std("ИмяПредопределенныхДанных", ["Строка"]),
        std("Представление", ["Строка"]),
      ];
    case "ExchangePlan":
      return [
        ...common,
        std("Код", ["Строка"]),
        std("Наименование", ["Строка"]),
        std("НомерОтправленного", ["Число"]),
        std("НомерПринятого", ["Число"]),
        std("ЭтотУзел", ["Булево"]),
        std("Представление", ["Строка"]),
      ];
    case "BusinessProcess":
      return [
        ...common,
        std("Дата", ["Дата"]),
        std("Номер"),
        std("ВедущаяЗадача"),
        std("Стартован", ["Булево"]),
        std("Завершен", ["Булево"]),
        std("Представление", ["Строка"]),
      ];
    case "Task":
      return [
        ...common,
        std("Дата", ["Дата"]),
        std("Номер"),
        std("Наименование", ["Строка"]),
        std("БизнесПроцесс"),
        std("ТочкаМаршрута"),
        std("Выполнена", ["Булево"]),
        std("Представление", ["Строка"]),
      ];
    case "InformationRegister": {
      const periodical = typeof p.periodicity === "string" && p.periodicity !== "Nonperiodical";
      const subordinate = p.writeMode === "RecorderSubordinate";
      return [
        ...(periodical ? [std("Период", ["Дата"])] : []),
        ...(subordinate ? [std("Регистратор"), std("НомерСтроки", ["Число"]), std("Активность", ["Булево"])] : []),
      ];
    }
    case "AccumulationRegister":
      return [
        std("Период", ["Дата"]),
        std("Регистратор"),
        std("НомерСтроки", ["Число"]),
        std("Активность", ["Булево"]),
        ...(p.registerType === "Balance" ? [std("ВидДвижения")] : []),
      ];
    case "AccountingRegister":
      return [
        std("Период", ["Дата"]),
        std("Регистратор"),
        std("НомерСтроки", ["Число"]),
        std("Активность", ["Булево"]),
        std("Счет"),
        ...(p.correspondence === true ? [std("СчетДт"), std("СчетКт")] : []),
      ];
    case "CalculationRegister":
      return [
        std("Регистратор"),
        std("НомерСтроки", ["Число"]),
        std("Активность", ["Булево"]),
        std("ВидРасчета", Array.isArray(p.chartOfCalculationTypes) ? p.chartOfCalculationTypes : []),
        std("ПериодРегистрации", ["Дата"]),
        std("Сторно", ["Булево"]),
        ...(p.actionPeriod === true
          ? [std("ПериодДействия", ["Дата"]), std("ПериодДействияНачало", ["Дата"]), std("ПериодДействияКонец", ["Дата"])]
          : []),
        ...(p.basePeriod === true ? [std("БазовыйПериодНачало", ["Дата"]), std("БазовыйПериодКонец", ["Дата"])] : []),
      ];
    case "Constant":
      return [std("Значение", Array.isArray(p.valueType) ? p.valueType : [])];
    case "Sequence":
      return [std("Период", ["Дата"]), std("Регистратор")];
    case "FilterCriterion":
      return [std("Значение", Array.isArray(p.valueType) ? p.valueType : []), std("Ссылка")];
  }
}

/** Виртуальные таблицы и поля каждой из них. */
function virtualTables(object: MdObject): { name: string; fields: () => TableField[] }[] {
  const p = object.props ?? {};
  const dims = () => toFields(object.dimensions, "dimension");
  const attrs = () => toFields(object.fields, "attribute");
  const res = () => toFields(object.resources, "resource");

  switch (object.kind) {
    case "InformationRegister": {
      if (typeof p.periodicity !== "string" || p.periodicity === "Nonperiodical") return [];
      const slice = () => [...standardFields(object), ...dims(), ...res(), ...attrs()];
      return [
        { name: "СрезПоследних", fields: slice },
        { name: "СрезПервых", fields: slice },
      ];
    }
    case "AccumulationRegister": {
      const turnovers = (suffixes: string[]) => () => [...PERIOD_FIELDS, ...dims(), ...withSuffix(object.resources, suffixes)];
      if (p.registerType === "Balance") {
        return [
          { name: "Остатки", fields: () => [...dims(), ...withSuffix(object.resources, ["Остаток"])] },
          { name: "Обороты", fields: turnovers(["Приход", "Расход", "Оборот"]) },
          {
            name: "ОстаткиИОбороты",
            fields: turnovers(["НачальныйОстаток", "Приход", "Расход", "Оборот", "КонечныйОстаток"]),
          },
        ];
      }
      return [{ name: "Обороты", fields: turnovers(["Оборот"]) }];
    }
    case "AccountingRegister": {
      const account = [std("Счет"), std("Субконто1"), std("Субконто2"), std("Субконто3")];
      return [
        { name: "Остатки", fields: () => [...account, ...dims(), ...withSuffix(object.resources, ["Остаток", "ОстатокДт", "ОстатокКт"])] },
        { name: "Обороты", fields: () => [...PERIOD_FIELDS, ...account, ...dims(), ...withSuffix(object.resources, ["Оборот", "ОборотДт", "ОборотКт"])] },
        {
          name: "ОстаткиИОбороты",
          fields: () => [
            ...PERIOD_FIELDS,
            ...account,
            ...dims(),
            ...withSuffix(object.resources, ["НачальныйОстаток", "ОборотДт", "ОборотКт", "КонечныйОстаток"]),
          ],
        },
        { name: "ОборотыДтКт", fields: () => [...PERIOD_FIELDS, std("СчетДт"), std("СчетКт"), ...dims(), ...withSuffix(object.resources, ["Оборот"])] },
        { name: "ДвиженияССубконто", fields: () => [...standardFields(object), ...dims(), ...res(), ...attrs()] },
      ];
    }
    case "CalculationRegister":
      return [
        ...(p.actionPeriod === true
          ? [{ name: "ФактическийПериодДействия", fields: () => [...standardFields(object), ...dims()] }]
          : []),
        ...(Array.isArray(p.schedule) && p.schedule.length
          ? [{ name: "ДанныеГрафика", fields: () => [...standardFields(object), ...dims()] }]
          : []),
      ];
    case "Task":
      return [{ name: "ЗадачиПоИсполнителю", fields: () => [...standardFields(object), ...attrs()] }];
    default:
      return [];
  }
}

export class MetadataIndex {
  readonly model: ConfigurationModel;
  private readonly byKind = new Map<MdKind, Map<string, MdObject>>();
  private readonly kindByRoot = new Map<string, MdKind>();

  constructor(model: ConfigurationModel) {
    this.model = model;
    for (const object of model.objects) {
      let map = this.byKind.get(object.kind);
      if (!map) this.byKind.set(object.kind, (map = new Map()));
      map.set(object.name.toLowerCase(), object);
    }
    // «Справочник» и «Catalog» — оба ведут к справочникам.
    for (const [ru, en] of METADATA_ROOTS) {
      const kind = MD_KINDS.find((k) => k.queryName === ru)?.kind;
      if (kind) {
        this.kindByRoot.set(ru.toLowerCase(), kind);
        this.kindByRoot.set(en.toLowerCase(), kind);
      }
    }
  }

  rootKind(word: string): MdKind | undefined {
    return this.kindByRoot.get(word.toLowerCase());
  }

  objects(kind: MdKind): MdObject[] {
    return [...(this.byKind.get(kind)?.values() ?? [])];
  }

  object(kind: MdKind, name: string): MdObject | undefined {
    return this.byKind.get(kind)?.get(name.toLowerCase());
  }

  /** «Справочник.Сотрудники» → объект. */
  objectByType(type: string): MdObject | undefined {
    const dot = type.indexOf(".");
    if (dot < 0) return undefined;
    const kind = this.rootKind(type.slice(0, dot));
    return kind ? this.object(kind, type.slice(dot + 1)) : undefined;
  }

  /** Табличные части и виртуальные таблицы объекта. */
  subTables(object: MdObject): SubTable[] {
    return [
      ...virtualTables(object).map((v) => ({ name: v.name, kind: "virtual" as const })),
      ...(object.tables ?? []).map((t) => ({ name: t.name, kind: "tabular" as const, synonym: t.synonym })),
    ];
  }

  /** Путь таблицы из текста запроса: [Справочник, Сотрудники] / [..., ТабЧасть] / [..., Остатки]. */
  resolveTable(path: string[]): TableRef | undefined {
    if (path.length < 2) return undefined;
    const kind = this.rootKind(path[0]);
    const object = kind && this.object(kind, path[1]);
    if (!object) return undefined;
    if (path.length === 2) return { type: "object", object };
    const part = path[2].toLowerCase();
    const table = object.tables?.find((t) => t.name.toLowerCase() === part);
    if (table && path.length === 3) return { type: "tabular", object, table };
    const virtual = virtualTables(object).find((v) => v.name.toLowerCase() === part);
    if (virtual && path.length === 3) return { type: "virtual", object, name: virtual.name };
    return undefined;
  }

  fieldsOf(table: TableRef): TableField[] {
    switch (table.type) {
      case "object": {
        const o = table.object;
        return [
          ...standardFields(o),
          ...toFields(o.dimensions, "dimension"),
          ...toFields(o.resources, "resource"),
          ...toFields(o.fields, "attribute"),
        ];
      }
      case "tabular":
        return [
          std("Ссылка", [ref(table.object)]),
          std("НомерСтроки", ["Число"]),
          ...toFields(table.table.fields, "attribute"),
        ];
      case "virtual":
        return virtualTables(table.object).find((v) => v.name === table.name)?.fields() ?? [];
      case "derived":
        return table.fields;
    }
  }

  /** Поля значения ссылочного типа: «Справочник.Сотрудники» → реквизиты справочника. */
  fieldsOfType(type: string): TableField[] {
    const object = this.objectByType(type);
    return object ? this.fieldsOf({ type: "object", object }) : [];
  }

  describeTable(table: TableRef): string {
    switch (table.type) {
      case "object":
        return ref(table.object);
      case "tabular":
        return `${ref(table.object)}.${table.table.name}`;
      case "virtual":
        return `${ref(table.object)}.${table.name}`;
      case "derived":
        return table.name;
    }
  }
}

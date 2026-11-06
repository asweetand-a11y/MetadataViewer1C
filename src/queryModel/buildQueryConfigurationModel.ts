/**
 * Модель метаданных для языка запросов из уже разобранных объектов конфигурации.
 * Типы полей переводятся в нотацию запросов: CatalogRef.Имя → Справочник.Имя.
 */

import type { MetadataMember, ParsedMetadataObject } from "../metadata_utils/UniversalMetadataParser";
import {
  MD_KINDS,
  MODEL_FORMAT_VERSION,
  type ConfigurationModel,
  type MdField,
  type MdKind,
  type MdObject,
  type MdPredefined,
  type MdTable,
} from "./model";

const DIR_TO_KIND = new Map(MD_KINDS.map((kind) => [kind.folder, kind.kind]));

const REF_TYPES: Record<string, string> = {
  CatalogRef: "Справочник",
  DocumentRef: "Документ",
  EnumRef: "Перечисление",
  ChartOfCharacteristicTypesRef: "ПланВидовХарактеристик",
  ChartOfAccountsRef: "ПланСчетов",
  ChartOfCalculationTypesRef: "ПланВидовРасчета",
  BusinessProcessRef: "БизнесПроцесс",
  BusinessProcessRoutePointRef: "ТочкаМаршрутаБизнесПроцесса",
  TaskRef: "Задача",
  ExchangePlanRef: "ПланОбмена",
};

const SIMPLE_TYPES: Record<string, string> = {
  "xs:dateTime": "Дата",
  "xs:boolean": "Булево",
  "xs:base64Binary": "ДвоичныеДанные",
  "v8:ValueStorage": "ХранилищеЗначения",
  "v8:UUID": "УникальныйИдентификатор",
  "v8:Null": "NULL",
  "cfg:AnyRef": "ЛюбаяСсылка",
};

const QUERY_NAME_BY_KIND = new Map(MD_KINDS.map((kind) => [kind.kind as string, kind.queryName]));

type PropReader = "text" | "bool" | "refs" | "type";

const PROPS: Partial<Record<MdKind, [string, string, PropReader][]>> = {
  Catalog: [
    ["Hierarchical", "hierarchical", "bool"],
    ["HierarchyType", "hierarchyType", "text"],
    ["Owners", "owners", "refs"],
    ["CodeLength", "codeLength", "text"],
    ["DescriptionLength", "descriptionLength", "text"],
  ],
  Document: [["NumberLength", "numberLength", "text"]],
  DocumentJournal: [["RegisteredDocuments", "registeredDocuments", "refs"]],
  ChartOfCharacteristicTypes: [
    ["Hierarchical", "hierarchical", "bool"],
    ["CodeLength", "codeLength", "text"],
    ["DescriptionLength", "descriptionLength", "text"],
    ["Type", "valueType", "type"],
  ],
  ChartOfAccounts: [
    ["CodeLength", "codeLength", "text"],
    ["DescriptionLength", "descriptionLength", "text"],
    ["ExtDimensionTypes", "extDimensionTypes", "refs"],
    ["MaxExtDimensionCount", "maxExtDimensionCount", "text"],
  ],
  ChartOfCalculationTypes: [
    ["CodeLength", "codeLength", "text"],
    ["DescriptionLength", "descriptionLength", "text"],
    ["DependenceOnCalculationTypes", "dependence", "text"],
    ["ActionPeriodUse", "actionPeriodUse", "bool"],
  ],
  InformationRegister: [
    ["InformationRegisterPeriodicity", "periodicity", "text"],
    ["WriteMode", "writeMode", "text"],
  ],
  AccumulationRegister: [["RegisterType", "registerType", "text"]],
  AccountingRegister: [
    ["ChartOfAccounts", "chartOfAccounts", "refs"],
    ["Correspondence", "correspondence", "bool"],
  ],
  CalculationRegister: [
    ["Periodicity", "periodicity", "text"],
    ["ActionPeriod", "actionPeriod", "bool"],
    ["BasePeriod", "basePeriod", "bool"],
    ["Schedule", "schedule", "refs"],
    ["ChartOfCalculationTypes", "chartOfCalculationTypes", "refs"],
  ],
  BusinessProcess: [
    ["Task", "task", "refs"],
    ["NumberLength", "numberLength", "text"],
  ],
  Task: [
    ["NumberLength", "numberLength", "text"],
    ["DescriptionLength", "descriptionLength", "text"],
  ],
  ExchangePlan: [
    ["CodeLength", "codeLength", "text"],
    ["DescriptionLength", "descriptionLength", "text"],
  ],
  Constant: [["Type", "valueType", "type"]],
  Sequence: [["Documents", "documents", "refs"]],
  FilterCriterion: [["Type", "valueType", "type"]],
};

type DefinedTypeResolver = (name: string) => string[];

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (!isRecord(value)) return "";
  if (typeof value.text === "string") return value.text.trim();
  if (typeof value["#text"] === "string") return String(value["#text"]).trim();
  return "";
}

function synonymOf(properties: Record<string, unknown> | undefined): string | undefined {
  const synonym = properties?.Synonym;
  const node = isRecord(synonym) ? synonym : undefined;
  const items = asArray((node?.item ?? node?.Item) as unknown);
  const item = items.map((entry) => (isRecord(entry) ? entry : { content: entry })).find((entry) => textOf(entry.lang) === "ru") ?? items[0];
  const record = isRecord(item) ? item : undefined;
  const text = record ? textOf(record.content) || textOf(record.Content) : textOf(item);
  return text || undefined;
}

function convertType(raw: string, typeNode: Record<string, unknown>): string {
  if (raw === "xs:decimal") {
    const qualifiers = isRecord(typeNode.NumberQualifiers) ? typeNode.NumberQualifiers : {};
    const digits = textOf(qualifiers.Digits);
    const fraction = textOf(qualifiers.FractionDigits);
    if (!digits || digits === "0") return "Число";
    return fraction && fraction !== "0" ? `Число(${digits}, ${fraction})` : `Число(${digits})`;
  }
  if (raw === "xs:string") {
    const qualifiers = isRecord(typeNode.StringQualifiers) ? typeNode.StringQualifiers : {};
    const length = textOf(qualifiers.Length);
    return length && length !== "0" ? `Строка(${length})` : "Строка";
  }
  if (raw in SIMPLE_TYPES) return SIMPLE_TYPES[raw];
  const ref = /^cfg:(\w+Ref)(?:\.(.+))?$/.exec(raw);
  if (ref && ref[1] in REF_TYPES) {
    return ref[2] ? `${REF_TYPES[ref[1]]}.${ref[2]}` : `${REF_TYPES[ref[1]]}Ссылка`;
  }
  return raw.replace(/^(cfg|v8|xs):/, "");
}

function typesOf(typeValue: unknown, resolveDefined: DefinedTypeResolver): string[] {
  if (!isRecord(typeValue)) return [];
  const types: string[] = [];
  for (const item of asArray(typeValue.Type)) types.push(convertType(textOf(item), typeValue));
  for (const item of asArray(typeValue.TypeSet)) {
    const raw = textOf(item);
    const defined = /^cfg:DefinedType\.(.+)$/.exec(raw);
    const characteristic = /^cfg:Characteristic\.(.+)$/.exec(raw);
    if (defined) types.push(...resolveDefined(defined[1]));
    else if (characteristic) types.push(`Характеристика.${characteristic[1]}`);
    else if (raw) types.push(convertType(raw, {}));
  }
  return [...new Set(types.filter(Boolean))];
}

function convertMdRef(raw: string): string {
  const [kind, ...rest] = raw.split(".");
  const queryName = QUERY_NAME_BY_KIND.get(kind);
  return queryName && rest.length ? [queryName, ...rest].join(".") : raw;
}

function refsOf(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [convertMdRef(value.trim())] : [];
  if (!isRecord(value)) return [];
  const items = asArray(value.Item ?? value.item);
  return items.map(textOf).filter(Boolean).map(convertMdRef);
}

function createDefinedTypeResolver(definitions: Map<string, unknown>): DefinedTypeResolver {
  const cache = new Map<string, string[]>();
  const resolving = new Set<string>();
  const resolve: DefinedTypeResolver = (name) => {
    const cached = cache.get(name);
    if (cached) return cached;
    if (resolving.has(name) || !definitions.has(name)) return [`ОпределяемыйТип.${name}`];
    resolving.add(name);
    const types = typesOf(definitions.get(name), resolve);
    resolving.delete(name);
    cache.set(name, types);
    return types;
  };
  return resolve;
}

function readProps(kind: MdKind, properties: Record<string, unknown>, resolveDefined: DefinedTypeResolver) {
  const result: Record<string, string | string[] | boolean> = {};
  for (const [tag, key, reader] of PROPS[kind] ?? []) {
    const value = properties[tag];
    if (value === undefined) continue;
    if (reader === "bool") result[key] = value === true || textOf(value) === "true";
    else if (reader === "text") {
      const text = textOf(value);
      if (text) result[key] = text;
    } else {
      const list = reader === "refs" ? refsOf(value) : typesOf(value, resolveDefined);
      if (list.length) result[key] = list;
    }
  }
  return Object.keys(result).length ? result : undefined;
}

function fieldOf(member: MetadataMember, resolveDefined: DefinedTypeResolver): MdField | null {
  const name = member.name?.trim();
  if (!name) return null;
  const properties = member.properties ?? {};
  const synonym = synonymOf(properties);
  return {
    name,
    ...(synonym && synonym !== name ? { synonym } : {}),
    type: typesOf(properties.Type, resolveDefined),
  };
}

function inTabularSection(member: MetadataMember): boolean {
  return (member.path ?? []).includes("TabularSection");
}

function fieldsOf(members: MetadataMember[], kinds: string[], resolveDefined: DefinedTypeResolver, tabular: boolean): MdField[] {
  return members
    .filter((member) => kinds.includes(member.kind) && inTabularSection(member) === tabular)
    .map((member) => fieldOf(member, resolveDefined))
    .filter((field): field is MdField => field !== null);
}

function tablesOf(obj: ParsedMetadataObject, resolveDefined: DefinedTypeResolver): MdTable[] {
  const sections = (obj.members || []).filter((member) => member.kind === "TabularSection" && member.name);
  return sections.map((section) => {
    const name = section.name as string;
    const synonym = synonymOf(section.properties);
    const fields = (obj.members || [])
      .filter((member) => {
        if (member.kind !== "Attribute") return false;
        const path = member.path ?? [];
        const at = path.indexOf("TabularSection");
        return at >= 0 && path[at + 1] === name;
      })
      .map((member) => fieldOf(member, resolveDefined))
      .filter((field): field is MdField => field !== null);
    return { name, ...(synonym && synonym !== name ? { synonym } : {}), fields };
  });
}

function predefinedOf(items: MetadataMember[] | undefined): MdPredefined[] {
  const result: MdPredefined[] = [];
  const walk = (nodes: unknown) => {
    for (const node of asArray(nodes as unknown)) {
      if (!isRecord(node) && !("properties" in (node as object))) continue;
      const record = node as MetadataMember & Record<string, unknown>;
      const properties = isRecord(record.properties) ? record.properties : record;
      const name = textOf(properties.Name) || (typeof record.name === "string" ? record.name : "");
      const description = textOf(properties.Description);
      if (name) result.push({ name, ...(description && description !== name ? { description } : {}) });
      const children = isRecord(properties.ChildItems) ? properties.ChildItems.Item ?? properties.ChildItems : properties.ChildItems;
      if (children) walk(children);
    }
  };
  walk(items);
  return result;
}

function toObject(obj: ParsedMetadataObject, kind: MdKind, resolveDefined: DefinedTypeResolver): MdObject | null {
  const name = obj.name?.trim();
  if (!name) return null;
  const properties = obj.properties ?? {};
  const synonym = synonymOf(properties) || (obj.displayName !== name ? obj.displayName : undefined);
  const members = obj.members || [];
  const object: MdObject = {
    kind,
    name,
    ...(synonym && synonym !== name ? { synonym } : {}),
    fields: fieldsOf(members, ["Attribute", "AddressingAttribute", "Column", "AccountingFlag"], resolveDefined, false),
  };
  const dimensions = fieldsOf(members, ["Dimension"], resolveDefined, false);
  const resources = fieldsOf(members, ["Resource"], resolveDefined, false);
  const tables = tablesOf(obj, resolveDefined);
  const values = members.filter((member) => member.kind === "EnumValue" && member.name).map((member) => member.name as string);
  const predefined = predefinedOf(obj.predefined);
  const props = readProps(kind, properties, resolveDefined);
  if (dimensions.length) object.dimensions = dimensions;
  if (resources.length) object.resources = resources;
  if (tables.length) object.tables = tables;
  if (values.length) object.values = values;
  if (predefined.length) object.predefined = predefined;
  if (props) object.props = props;
  return object;
}

/** Собирает модель языка запросов. Формы, команды и макеты в неё не входят. */
export function buildQueryConfigurationModel(
  objects: ParsedMetadataObject[],
  info: { id: string; name: string; synonym?: string; version?: string },
): ConfigurationModel {
  const definitions = new Map<string, unknown>();
  for (const object of objects) {
    if (object.objectType === "DefinedType" || object.objectTypeDir === "DefinedTypes") {
      definitions.set(object.name, object.properties?.Type);
    }
  }
  const resolveDefined = createDefinedTypeResolver(definitions);
  const mdObjects: MdObject[] = [];
  for (const object of objects) {
    const kind = DIR_TO_KIND.get(object.objectTypeDir || "");
    if (!kind) continue;
    const built = toObject(object, kind, resolveDefined);
    if (built) mdObjects.push(built);
  }
  return {
    formatVersion: MODEL_FORMAT_VERSION,
    id: info.id,
    name: info.name,
    ...(info.synonym ? { synonym: info.synonym } : {}),
    ...(info.version ? { version: info.version } : {}),
    loadedAt: new Date().toISOString(),
    objects: mdObjects,
  };
}

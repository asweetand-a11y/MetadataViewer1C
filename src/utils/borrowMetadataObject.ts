/**
 * Заимствование объекта основной конфигурации в расширение.
 * Повторяет тонкую оболочку cfe-borrow: ObjectBelonging=Adopted,
 * ссылка на uuid источника, только свойства-ворота и пустой ChildObjects.
 * Полный набор свойств и Form.xml не копируются. ConfigDumpInfo не правится.
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { createBackup, safeReadFile, safeWriteFile, validatePath } from './fileUtils';
import { finalizeOneCXml } from './oneCXmlStyle';
import { metadataFilePath } from './createMetadataObject';
import { ensureModulePropertyState, rootPropertiesXml } from './extensionPropertyState';

const TYPE_ORDER = [
    'Language', 'Subsystem', 'StyleItem', 'Style',
    'CommonPicture', 'SessionParameter', 'Role', 'CommonTemplate',
    'FilterCriterion', 'CommonModule', 'CommonAttribute', 'ExchangePlan',
    'XDTOPackage', 'WebService', 'HTTPService', 'WSReference',
    'EventSubscription', 'ScheduledJob', 'SettingsStorage', 'FunctionalOption',
    'FunctionalOptionsParameter', 'DefinedType', 'Bot', 'PaletteColor', 'CommonCommand', 'CommandGroup',
    'Constant', 'CommonForm', 'Catalog', 'Document',
    'DocumentNumerator', 'Sequence', 'DocumentJournal', 'Enum',
    'Report', 'DataProcessor', 'InformationRegister', 'AccumulationRegister',
    'ChartOfCharacteristicTypes', 'ChartOfAccounts', 'AccountingRegister',
    'ChartOfCalculationTypes', 'CalculationRegister',
    'BusinessProcess', 'Task', 'ExternalDataSource', 'IntegrationService',
];

const TYPES_WITH_CHILD_OBJECTS = new Set([
    'Catalog', 'Document', 'ExchangePlan', 'ChartOfAccounts',
    'ChartOfCharacteristicTypes', 'ChartOfCalculationTypes',
    'BusinessProcess', 'Task', 'Enum',
    'InformationRegister', 'AccumulationRegister', 'AccountingRegister', 'CalculationRegister',
    'DataProcessor', 'Report', 'DocumentJournal', 'FilterCriterion', 'SettingsStorage',
    'Sequence', 'HTTPService', 'WebService', 'IntegrationService', 'Subsystem',
]);

const COMMON_MODULE_PROPS = [
    'Global', 'ClientManagedApplication', 'Server', 'ExternalConnection',
    'ClientOrdinaryApplication', 'ServerCall',
];

const TYPE_GATE_PROPS: Record<string, string[]> = {
    InformationRegister: ['InformationRegisterPeriodicity', 'WriteMode'],
};

const TYPES_WITH_OWNERS = new Set(['Catalog', 'ChartOfCharacteristicTypes']);

/** Виды модулей в порядке выгрузки Конфигуратора. */
export const MODULE_KINDS_BY_TYPE: Record<string, string[]> = {
    CommonModule: ['Module'],
    HTTPService: ['Module'],
    WebService: ['Module'],
    Catalog: ['ObjectModule', 'ManagerModule'],
    Document: ['ObjectModule', 'ManagerModule'],
    Report: ['ObjectModule', 'ManagerModule'],
    DataProcessor: ['ObjectModule', 'ManagerModule'],
    ExchangePlan: ['ObjectModule', 'ManagerModule'],
    ChartOfCharacteristicTypes: ['ObjectModule', 'ManagerModule'],
    ChartOfAccounts: ['ObjectModule', 'ManagerModule'],
    ChartOfCalculationTypes: ['ObjectModule', 'ManagerModule'],
    BusinessProcess: ['ObjectModule', 'ManagerModule'],
    Task: ['ObjectModule', 'ManagerModule'],
    InformationRegister: ['RecordSetModule', 'ManagerModule'],
    AccumulationRegister: ['RecordSetModule', 'ManagerModule'],
    AccountingRegister: ['RecordSetModule', 'ManagerModule'],
    CalculationRegister: ['RecordSetModule', 'ManagerModule'],
    Sequence: ['RecordSetModule', 'ManagerModule'],
    Constant: ['ValueManagerModule', 'ManagerModule'],
    Enum: ['ManagerModule'],
    DocumentJournal: ['ManagerModule'],
    FilterCriterion: ['ManagerModule'],
};

export const AUTO_MODULE_TYPES = new Set(['CommonModule', 'HTTPService', 'WebService']);

const GENERATED_TYPES: Record<string, Array<[string, string]>> = {
    Catalog: [['CatalogObject', 'Object'], ['CatalogRef', 'Ref'], ['CatalogSelection', 'Selection'], ['CatalogList', 'List'], ['CatalogManager', 'Manager']],
    Document: [['DocumentObject', 'Object'], ['DocumentRef', 'Ref'], ['DocumentSelection', 'Selection'], ['DocumentList', 'List'], ['DocumentManager', 'Manager']],
    Enum: [['EnumRef', 'Ref'], ['EnumManager', 'Manager'], ['EnumList', 'List']],
    Constant: [['ConstantManager', 'Manager'], ['ConstantValueManager', 'ValueManager'], ['ConstantValueKey', 'ValueKey']],
    InformationRegister: [['InformationRegisterRecord', 'Record'], ['InformationRegisterManager', 'Manager'], ['InformationRegisterSelection', 'Selection'], ['InformationRegisterList', 'List'], ['InformationRegisterRecordSet', 'RecordSet'], ['InformationRegisterRecordKey', 'RecordKey'], ['InformationRegisterRecordManager', 'RecordManager']],
    AccumulationRegister: [['AccumulationRegisterRecord', 'Record'], ['AccumulationRegisterManager', 'Manager'], ['AccumulationRegisterSelection', 'Selection'], ['AccumulationRegisterList', 'List'], ['AccumulationRegisterRecordSet', 'RecordSet'], ['AccumulationRegisterRecordKey', 'RecordKey']],
    AccountingRegister: [['AccountingRegisterRecord', 'Record'], ['AccountingRegisterExtDimensions', 'ExtDimensions'], ['AccountingRegisterManager', 'Manager'], ['AccountingRegisterSelection', 'Selection'], ['AccountingRegisterList', 'List'], ['AccountingRegisterRecordSet', 'RecordSet'], ['AccountingRegisterRecordKey', 'RecordKey']],
    CalculationRegister: [['CalculationRegisterRecord', 'Record'], ['CalculationRegisterManager', 'Manager'], ['CalculationRegisterSelection', 'Selection'], ['CalculationRegisterList', 'List'], ['CalculationRegisterRecordSet', 'RecordSet'], ['CalculationRegisterRecordKey', 'RecordKey'], ['RecalculationsManager', 'Recalcs']],
    ChartOfAccounts: [['ChartOfAccountsObject', 'Object'], ['ChartOfAccountsRef', 'Ref'], ['ChartOfAccountsSelection', 'Selection'], ['ChartOfAccountsList', 'List'], ['ChartOfAccountsManager', 'Manager'], ['ChartOfAccountsExtDimensionTypes', 'ExtDimensionTypes'], ['ChartOfAccountsExtDimensionTypesRow', 'ExtDimensionTypesRow']],
    ChartOfCharacteristicTypes: [['ChartOfCharacteristicTypesObject', 'Object'], ['ChartOfCharacteristicTypesRef', 'Ref'], ['ChartOfCharacteristicTypesSelection', 'Selection'], ['ChartOfCharacteristicTypesList', 'List'], ['Characteristic', 'Characteristic'], ['ChartOfCharacteristicTypesManager', 'Manager']],
    ChartOfCalculationTypes: [['ChartOfCalculationTypesObject', 'Object'], ['ChartOfCalculationTypesRef', 'Ref'], ['ChartOfCalculationTypesSelection', 'Selection'], ['ChartOfCalculationTypesList', 'List'], ['ChartOfCalculationTypesManager', 'Manager'], ['DisplacingCalculationTypes', 'DisplacingCalculationTypes'], ['DisplacingCalculationTypesRow', 'DisplacingCalculationTypesRow'], ['BaseCalculationTypes', 'BaseCalculationTypes'], ['BaseCalculationTypesRow', 'BaseCalculationTypesRow'], ['LeadingCalculationTypes', 'LeadingCalculationTypes'], ['LeadingCalculationTypesRow', 'LeadingCalculationTypesRow']],
    BusinessProcess: [['BusinessProcessObject', 'Object'], ['BusinessProcessRef', 'Ref'], ['BusinessProcessSelection', 'Selection'], ['BusinessProcessList', 'List'], ['BusinessProcessManager', 'Manager'], ['BusinessProcessRoutePointRef', 'RoutePointRef']],
    Task: [['TaskObject', 'Object'], ['TaskRef', 'Ref'], ['TaskSelection', 'Selection'], ['TaskList', 'List'], ['TaskManager', 'Manager']],
    ExchangePlan: [['ExchangePlanObject', 'Object'], ['ExchangePlanRef', 'Ref'], ['ExchangePlanSelection', 'Selection'], ['ExchangePlanList', 'List'], ['ExchangePlanManager', 'Manager']],
    DocumentJournal: [['DocumentJournalSelection', 'Selection'], ['DocumentJournalList', 'List'], ['DocumentJournalManager', 'Manager']],
    Report: [['ReportObject', 'Object'], ['ReportManager', 'Manager']],
    DataProcessor: [['DataProcessorObject', 'Object'], ['DataProcessorManager', 'Manager']],
    DefinedType: [['DefinedType', 'DefinedType']],
    ExternalDataSource: [['ExternalDataSourceManager', 'Manager'], ['ExternalDataSourceTablesManager', 'TablesManager'], ['ExternalDataSourceCubesManager', 'CubesManager']],
    Sequence: [['SequenceRecord', 'Record'], ['SequenceManager', 'Manager'], ['SequenceRecordSet', 'RecordSet']],
    FilterCriterion: [['FilterCriterionManager', 'Manager'], ['FilterCriterionList', 'List']],
    SettingsStorage: [['SettingsStorageManager', 'Manager']],
    IntegrationService: [['IntegrationServiceManager', 'Manager']],
    WSReference: [['WSReferenceManager', 'Manager']],
};

export function isExtensionConfigurationXml(xml: string): boolean {
    return /<ConfigurationExtensionPurpose>/.test(xml) || /<NamePrefix>/.test(rootPropertiesXml(xml));
}

export function readNamePrefix(configurationXml: string): string {
    const match = /<NamePrefix>([^<]*)<\/NamePrefix>/.exec(configurationXml);
    return match ? match[1] : '';
}

function scalarProperty(properties: string, name: string): string | null {
    const match = new RegExp(`<${name}>([^<]*)</${name}>`).exec(properties);
    return match ? match[1] : null;
}

function rawElement(properties: string, tag: string): string | null {
    const match = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`).exec(properties);
    if (!match) {
        return null;
    }
    const inner = match[0].replace(new RegExp(`^<${tag}\\b[^>]*>`), '').replace(new RegExp(`</${tag}>$`), '');
    return inner.trim() ? match[0].trim() : null;
}

function buildInternalInfo(typeName: string, objectName: string): string {
    const types = GENERATED_TYPES[typeName];
    if (!types || types.length === 0) {
        return '\t\t<InternalInfo/>';
    }
    const lines = ['\t\t<InternalInfo>'];
    if (typeName === 'ExchangePlan') {
        lines.push(`\t\t\t<xr:ThisNode>${randomUUID()}</xr:ThisNode>`);
    }
    for (const [prefix, category] of types) {
        lines.push(`\t\t\t<xr:GeneratedType name="${prefix}.${objectName}" category="${category}">`);
        lines.push(`\t\t\t\t<xr:TypeId>${randomUUID()}</xr:TypeId>`);
        lines.push(`\t\t\t\t<xr:ValueId>${randomUUID()}</xr:ValueId>`);
        lines.push('\t\t\t</xr:GeneratedType>');
    }
    lines.push('\t\t</InternalInfo>');
    return lines.join('\n');
}

function buildBorrowedXml(params: {
    header: string;
    typeName: string;
    objectName: string;
    sourceUuid: string;
    sourceXml: string;
}): string {
    const properties = rootPropertiesXml(params.sourceXml);
    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        params.header,
        `\t<${params.typeName} uuid="${randomUUID()}">`,
        buildInternalInfo(params.typeName, params.objectName),
        '\t\t<Properties>',
        '\t\t\t<ObjectBelonging>Adopted</ObjectBelonging>',
        `\t\t\t<Name>${params.objectName}</Name>`,
        '\t\t\t<Comment/>',
        `\t\t\t<ExtendedConfigurationObject>${params.sourceUuid}</ExtendedConfigurationObject>`,
    ];
    if (params.typeName === 'CommonModule') {
        for (const propName of COMMON_MODULE_PROPS) {
            lines.push(`\t\t\t<${propName}>${scalarProperty(properties, propName) ?? 'false'}</${propName}>`);
        }
    }
    if (params.typeName === 'DefinedType') {
        const typeXml = rawElement(properties, 'Type');
        if (typeXml) {
            lines.push(`\t\t\t${typeXml}`);
        }
    }
    for (const gate of TYPE_GATE_PROPS[params.typeName] ?? []) {
        const value = scalarProperty(properties, gate);
        if (value !== null) {
            lines.push(`\t\t\t<${gate}>${value}</${gate}>`);
        }
    }
    if (TYPES_WITH_OWNERS.has(params.typeName)) {
        const owners = rawElement(properties, 'Owners');
        if (owners) {
            lines.push(`\t\t\t${owners}`);
        }
    }
    lines.push('\t\t</Properties>');
    if (params.sourceXml.includes('<ChildObjects') || TYPES_WITH_CHILD_OBJECTS.has(params.typeName)) {
        lines.push('\t\t<ChildObjects/>');
    }
    lines.push(`\t</${params.typeName}>`);
    lines.push('</MetaDataObject>');
    return lines.join('\n');
}

/** Вставка в ChildObjects расширения по порядку видов, без пересборки всего XML. */
async function registerInExtensionConfiguration(extensionRoot: string, typeName: string, objectName: string): Promise<void> {
    const configurationPath = path.join(extensionRoot, 'Configuration.xml');
    if (!validatePath(extensionRoot, configurationPath)) {
        throw new Error('Путь Configuration.xml выходит за каталог расширения');
    }
    const xml = await safeReadFile(configurationPath);
    const tag = `<${typeName}>${objectName}</${typeName}>`;
    if (xml.includes(tag)) {
        return;
    }
    const start = xml.indexOf('<ChildObjects>');
    const end = xml.indexOf('</ChildObjects>');
    if (start < 0 || end < start) {
        throw new Error('В расширении нет ChildObjects');
    }
    const body = xml.slice(start, end);
    const newline = xml.includes('\r\n') ? '\r\n' : '\n';
    const line = `\t\t\t${tag}`;
    const typeIndex = TYPE_ORDER.indexOf(typeName);
    const childPattern = /<([A-Za-z0-9]+)>[^<]*<\/\1>/g;
    let afterSameType = -1;
    let beforeLaterType = -1;
    let match: RegExpExecArray | null;
    while ((match = childPattern.exec(body)) !== null) {
        const childIndex = TYPE_ORDER.indexOf(match[1]);
        if (childIndex < 0) {
            continue;
        }
        if (match[1] === typeName) {
            afterSameType = start + match.index + match[0].length;
        } else if (typeIndex >= 0 && childIndex > typeIndex && beforeLaterType < 0) {
            beforeLaterType = start + match.index;
        }
    }
    let updated: string;
    if (afterSameType >= 0) {
        updated = xml.slice(0, afterSameType) + newline + line + xml.slice(afterSameType);
    } else if (beforeLaterType >= 0) {
        updated = xml.slice(0, beforeLaterType) + line + newline + xml.slice(beforeLaterType);
    } else {
        updated = xml.slice(0, end) + line + newline + xml.slice(end);
    }
    await createBackup(configurationPath);
    await safeWriteFile(configurationPath, updated);
}

export async function borrowMetadataObject(params: {
    sourceRoot: string;
    extensionRoot: string;
    xmlObjectType: string;
    name: string;
    modules: string[];
}): Promise<{ filePath: string; alreadyExisted: boolean }> {
    const sourceFile = metadataFilePath(params.sourceRoot, params.xmlObjectType, params.name);
    const targetFile = metadataFilePath(params.extensionRoot, params.xmlObjectType, params.name);
    if (!validatePath(params.sourceRoot, sourceFile) || !validatePath(params.extensionRoot, targetFile)) {
        throw new Error('Путь объекта выходит за каталог конфигурации или расширения');
    }
    if (!fs.existsSync(sourceFile)) {
        throw new Error(`Нет файла источника: ${sourceFile}`);
    }
    const extensionConfiguration = await safeReadFile(path.join(params.extensionRoot, 'Configuration.xml'));
    if (!isExtensionConfigurationXml(extensionConfiguration)) {
        throw new Error('Выбранный каталог не является расширением');
    }
    const headerMatch = /<MetaDataObject\b[^>]*>/.exec(extensionConfiguration);
    if (!headerMatch) {
        throw new Error('В расширении не найден заголовок MetaDataObject');
    }

    let alreadyExisted = fs.existsSync(targetFile);
    if (!alreadyExisted) {
        const sourceXml = await safeReadFile(sourceFile);
        if (/<ObjectBelonging>\s*Adopted\s*<\/ObjectBelonging>/.test(rootPropertiesXml(sourceXml))) {
            throw new Error('Источник уже заимствован. Заимствуют объект основной конфигурации');
        }
        const uuidMatch = new RegExp(`<${params.xmlObjectType}[^>]*uuid="([^"]+)"`).exec(sourceXml);
        if (!uuidMatch) {
            throw new Error('У объекта источника нет uuid');
        }
        const xml = buildBorrowedXml({
            header: headerMatch[0],
            typeName: params.xmlObjectType,
            objectName: params.name,
            sourceUuid: uuidMatch[1],
            sourceXml,
        });
        await safeWriteFile(targetFile, finalizeOneCXml(xml, null));
    }

    await registerInExtensionConfiguration(params.extensionRoot, params.xmlObjectType, params.name);

    const allowed = new Set(MODULE_KINDS_BY_TYPE[params.xmlObjectType] ?? []);
    for (const kind of params.modules) {
        if (!allowed.has(kind)) {
            continue;
        }
        const modulePath = path.join(path.dirname(targetFile), params.name, 'Ext', `${kind}.bsl`);
        if (!validatePath(params.extensionRoot, modulePath)) {
            throw new Error('Путь модуля выходит за каталог расширения');
        }
        if (!fs.existsSync(modulePath)) {
            await safeWriteFile(modulePath, '\uFEFF');
        }
        await ensureModulePropertyState(modulePath);
    }

    return { filePath: targetFile, alreadyExisted };
}

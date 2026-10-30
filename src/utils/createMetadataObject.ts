/**
 * Создание нового объекта метаданных в XML-выгрузке:
 * клон соседнего объекта того же типа или минимальный каркас.
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { CreatePath } from '../ConfigurationFormats/utils';
import { validateXML } from './xmlUtils';
import { validateXmlStructure } from '../validation/xmlStructureValidator';
import { safeWriteFile } from './fileUtils';
import { ensureMetadataInConfigurationXml, removeMetadataFromConfigurationXml } from './configurationXmlUpdater';
import { markConfigurationChangedInDump, removeMetadataObjectFromConfigDump } from './configDumpInfoUpdater';
import { finalizeOneCXml } from './oneCXmlStyle';
import { validatePath } from './fileUtils';
import {
    applySubsystemMembershipChanges,
    loadSubsystemMembershipForObject,
    shouldOfferSubsystemMembership,
} from './subsystemMembership';

/** Суффикс id папки дерева → тип XML. Роли, формы, сервисы и XDTO сюда не входят. */
export const FOLDER_SUFFIX_TO_TYPE: Record<string, string> = {
    catalogs: 'Catalog',
    documents: 'Document',
    documentNumerators: 'DocumentNumerator',
    sequences: 'Sequence',
    documentJournals: 'DocumentJournal',
    enums: 'Enum',
    reports: 'Report',
    dataProcessors: 'DataProcessor',
    chartsOfCharacteristicTypes: 'ChartOfCharacteristicTypes',
    chartsOfAccounts: 'ChartOfAccounts',
    chartsOfCalculationTypes: 'ChartOfCalculationTypes',
    informationRegisters: 'InformationRegister',
    accumulationRegisters: 'AccumulationRegister',
    accountingRegisters: 'AccountingRegister',
    calculationRegisters: 'CalculationRegister',
    businessProcesses: 'BusinessProcess',
    tasks: 'Task',
    externalDataSources: 'ExternalDataSource',
    constants: 'Constant',
    commonModules: 'CommonModule',
    sessionParameters: 'SessionParameter',
    exchangePlans: 'ExchangePlan',
    filterCriteria: 'FilterCriterion',
    eventSubscriptions: 'EventSubscription',
    scheduledJobs: 'ScheduledJob',
    functionalOptions: 'FunctionalOption',
    functionalOptionsParameters: 'FunctionalOptionsParameter',
    definedTypes: 'DefinedType',
    settingsStorages: 'SettingsStorage',
    commonCommands: 'CommonCommand',
    commandGroups: 'CommandGroup',
    commonAttributes: 'CommonAttribute',
};

const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё_][A-Za-zА-Яа-яЁё0-9_]*$/;

/** Пары «префикс имени типа, категория» для xr:GeneratedType. */
const GENERATED_TYPES: Record<string, Array<[string, string]>> = {
    Catalog: [
        ['CatalogObject', 'Object'],
        ['CatalogRef', 'Ref'],
        ['CatalogSelection', 'Selection'],
        ['CatalogList', 'List'],
        ['CatalogManager', 'Manager'],
    ],
    Document: [
        ['DocumentObject', 'Object'],
        ['DocumentRef', 'Ref'],
        ['DocumentSelection', 'Selection'],
        ['DocumentList', 'List'],
        ['DocumentManager', 'Manager'],
    ],
    Enum: [
        ['EnumRef', 'Ref'],
        ['EnumManager', 'Manager'],
        ['EnumList', 'List'],
    ],
    Constant: [
        ['ConstantManager', 'Manager'],
        ['ConstantValueManager', 'ValueManager'],
        ['ConstantValueKey', 'ValueKey'],
    ],
    InformationRegister: registerTypes('InformationRegister'),
    AccumulationRegister: registerTypes('AccumulationRegister'),
    AccountingRegister: registerTypes('AccountingRegister'),
    CalculationRegister: registerTypes('CalculationRegister'),
    ChartOfCharacteristicTypes: refObjectTypes('ChartOfCharacteristicTypes'),
    ChartOfAccounts: refObjectTypes('ChartOfAccounts'),
    ChartOfCalculationTypes: refObjectTypes('ChartOfCalculationTypes'),
    BusinessProcess: refObjectTypes('BusinessProcess'),
    Task: refObjectTypes('Task'),
    ExchangePlan: refObjectTypes('ExchangePlan'),
    Report: [
        ['ReportObject', 'Object'],
        ['ReportManager', 'Manager'],
    ],
    DataProcessor: [
        ['DataProcessorObject', 'Object'],
        ['DataProcessorManager', 'Manager'],
    ],
    DocumentJournal: [
        ['DocumentJournalSelection', 'Selection'],
        ['DocumentJournalList', 'List'],
        ['DocumentJournalManager', 'Manager'],
    ],
    Sequence: [
        ['SequenceRecord', 'Record'],
        ['SequenceRecordSet', 'RecordSet'],
        ['SequenceManager', 'Manager'],
    ],
    FilterCriterion: [
        ['FilterCriterionList', 'List'],
        ['FilterCriterionManager', 'Manager'],
    ],
    SettingsStorage: [['SettingsStorageManager', 'Manager']],
    CommonCommand: [['CommonCommand', 'Command']],
    DocumentNumerator: [['DocumentNumeratorManager', 'Manager']],
};

/** У этих типов в XSD нет ChildObjects. Пустой тег ломает загрузку. */
const TYPES_WITHOUT_CHILD_OBJECTS = new Set([
    'SessionParameter',
    'Constant',
    'DefinedType',
    'CommonModule',
    'CommonAttribute',
    'EventSubscription',
    'ScheduledJob',
    'FunctionalOption',
    'FunctionalOptionsParameter',
    'CommonCommand',
    'CommandGroup',
    'DocumentNumerator',
    'FilterCriterion',
]);

const TYPES_WITH_TYPE_PROPERTY = new Set([
    'Constant',
    'SessionParameter',
    'DefinedType',
    'FilterCriterion',
    'CommonAttribute',
]);

function registerTypes(prefix: string): Array<[string, string]> {
    return [
        [`${prefix}Record`, 'Record'],
        [`${prefix}Manager`, 'Manager'],
        [`${prefix}Selection`, 'Selection'],
        [`${prefix}List`, 'List'],
        [`${prefix}RecordSet`, 'RecordSet'],
        [`${prefix}RecordKey`, 'RecordKey'],
        [`${prefix}RecordManager`, 'RecordManager'],
    ];
}

function refObjectTypes(prefix: string): Array<[string, string]> {
    return [
        [`${prefix}Object`, 'Object'],
        [`${prefix}Ref`, 'Ref'],
        [`${prefix}Selection`, 'Selection'],
        [`${prefix}List`, 'List'],
        [`${prefix}Manager`, 'Manager'],
    ];
}

export function isValidMetadataName(name: string): boolean {
    return NAME_PATTERN.test(name);
}

export function metadataFilePath(configRoot: string, xmlObjectType: string, name: string): string {
    const relative = CreatePath(`${xmlObjectType}.${name}`);
    return path.join(configRoot, relative + '.xml');
}

/**
 * Создаёт XML объекта и строку в Configuration.xml.
 * В ConfigDumpInfo.xml меняется только configVersion самой конфигурации,
 * чтобы инкрементальная загрузка взяла родителя вместе с новым объектом.
 * Строку версии нового объекта не пишем: хеш считает платформа.
 */
export async function createMetadataObject(params: {
    configRoot: string;
    xmlObjectType: string;
    name: string;
    synonym: string;
    extensionPath: string;
}): Promise<{ filePath: string }> {
    const { configRoot, xmlObjectType, name, extensionPath } = params;
    const synonym = params.synonym.trim() || name;
    if (!isValidMetadataName(name)) {
        throw new Error('Имя должно начинаться с буквы или «_» и содержать только буквы, цифры и «_».');
    }

    const filePath = metadataFilePath(configRoot, xmlObjectType, name);
    if (fs.existsSync(filePath)) {
        throw new Error(`Файл уже существует: ${filePath}`);
    }
    if (configDumpContains(configRoot, xmlObjectType, name)) {
        throw new Error(`Объект ${xmlObjectType}.${name} уже есть в ConfigDumpInfo.xml`);
    }

    const sibling = findSiblingXml(configRoot, xmlObjectType, name);
    const xml = sibling
        ? cloneObjectXml(fs.readFileSync(sibling, 'utf8'), xmlObjectType, path.basename(sibling, '.xml'), name, synonym)
        : buildSkeletonXml(configRoot, xmlObjectType, name, synonym);

    const wellFormed = validateXML(xml);
    if (!wellFormed.valid) {
        throw new Error(wellFormed.error || 'XML не прошёл проверку');
    }
    const structure = validateXmlStructure(xml, {
        extensionPath,
        xmlObjectType,
        rootTag: 'MetaDataObject',
    });
    if (!structure.valid && structure.errors && structure.errors.length > 0) {
        throw new Error(structure.errors.slice(0, 3).join('; '));
    }

    await safeWriteFile(filePath, finalizeOneCXml(xml, null));

    if (xmlObjectType === 'CommonModule') {
        const moduleDir = path.join(configRoot, 'CommonModules', name, 'Ext');
        await fs.promises.mkdir(moduleDir, { recursive: true });
        const modulePath = path.join(moduleDir, 'Module.bsl');
        if (!fs.existsSync(modulePath)) {
            await safeWriteFile(modulePath, '\uFEFF');
        }
    }

    await ensureMetadataInConfigurationXml({
        configRoot,
        xmlObjectType,
        objectName: name,
    });
    await markConfigurationChangedInDump(configRoot);

    return { filePath };
}

/** Каталог типа по CreatePath, без отдельной таблицы соответствий. */
function typeDirectory(xmlObjectType: string): string {
    return CreatePath(`${xmlObjectType}.Object`).split('/')[0];
}

/**
 * Путь узла дерева вида «корень/Catalogs/Имя» → тип и имя объекта, который умеем создавать.
 * Вложенные формы и модули (три и больше сегмента) сюда не попадают.
 */
export function resolveCreatableObjectFromTreePath(
    configRoot: string,
    itemPath: string
): { xmlObjectType: string; name: string } | null {
    const relative = path.relative(configRoot, itemPath).replace(/\\/g, '/');
    const parts = relative.split('/').filter(Boolean);
    if (parts.length !== 2) {
        return null;
    }
    const name = parts[1].replace(/\.xml$/i, '');
    if (!isValidMetadataName(name)) {
        return null;
    }
    const xmlObjectType = Object.values(FOLDER_SUFFIX_TO_TYPE).find((type) => typeDirectory(type) === parts[0]);
    if (!xmlObjectType) {
        return null;
    }
    return { xmlObjectType, name };
}

/**
 * Удаляет объект: состав на диске, строку в Configuration.xml и записи ConfigDumpInfo.
 */
export async function deleteMetadataObject(params: {
    configRoot: string;
    xmlObjectType: string;
    name: string;
    extensionPath: string;
}): Promise<void> {
    const { configRoot, xmlObjectType, name, extensionPath } = params;
    if (!isValidMetadataName(name) || !Object.values(FOLDER_SUFFIX_TO_TYPE).includes(xmlObjectType)) {
        throw new Error('Удаление этого объекта не поддерживается');
    }

    const filePath = metadataFilePath(configRoot, xmlObjectType, name);
    const objectDir = path.join(path.dirname(filePath), name);
    if (!validatePath(configRoot, filePath) || !validatePath(configRoot, objectDir)) {
        throw new Error('Путь объекта выходит за корень конфигурации');
    }

    const mdRef = `${xmlObjectType}.${name}`;
    if (shouldOfferSubsystemMembership(filePath, xmlObjectType)) {
        const rows = await loadSubsystemMembershipForObject({ configRoot, mdRef });
        const included = rows.filter((row) => row.included).map((row) => ({ relPath: row.relPath, included: false }));
        if (included.length > 0) {
            await applySubsystemMembershipChanges({
                configRoot,
                mdRef,
                rows: included,
                extensionPath,
                validateStructure: false,
            });
        }
    }

    await removeMetadataFromConfigurationXml({ configRoot, xmlObjectType, objectName: name });
    await removeMetadataObjectFromConfigDump({ configRoot, xmlObjectType, objectName: name });

    if (fs.existsSync(objectDir) && fs.statSync(objectDir).isDirectory()) {
        await fs.promises.rm(objectDir, { recursive: true, force: true });
    }
    if (fs.existsSync(filePath)) {
        await fs.promises.rm(filePath, { force: true });
    }
}

function configDumpContains(configRoot: string, xmlObjectType: string, name: string): boolean {
    const dumpPath = path.join(configRoot, 'ConfigDumpInfo.xml');
    if (!fs.existsSync(dumpPath)) {
        return false;
    }
    const text = fs.readFileSync(dumpPath, 'utf8');
    return text.includes(`name="${xmlObjectType}.${name}"`);
}

function findSiblingXml(configRoot: string, xmlObjectType: string, name: string): string | null {
    const target = metadataFilePath(configRoot, xmlObjectType, name);
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
        return null;
    }
    const files = fs.readdirSync(dir).filter((file) => file.toLowerCase().endsWith('.xml'));
    for (const file of files) {
        if (file.toLowerCase() === `${name}.xml`.toLowerCase()) {
            continue;
        }
        return path.join(dir, file);
    }
    return null;
}

/** Удаляет состав объекта, не трогая вложенные ChildObjects внутри уже удалённого блока. */
function clearTopLevelChildObjects(xml: string): string {
    const propsEnd = xml.lastIndexOf('</Properties>');
    const start = propsEnd < 0 ? xml.indexOf('<ChildObjects') : xml.indexOf('<ChildObjects', propsEnd);
    if (start < 0) {
        return xml;
    }
    const tagEnd = xml.indexOf('>', start);
    if (tagEnd < 0) {
        return xml;
    }
    if (xml.slice(start, tagEnd + 1).endsWith('/>')) {
        return xml;
    }

    let depth = 0;
    let index = start;
    while (index < xml.length) {
        const open = xml.indexOf('<ChildObjects', index);
        const close = xml.indexOf('</ChildObjects>', index);
        if (close < 0) {
            return xml;
        }
        if (open !== -1 && open < close) {
            depth += 1;
            index = open + '<ChildObjects'.length;
            continue;
        }
        depth -= 1;
        const end = close + '</ChildObjects>'.length;
        if (depth === 0) {
            return xml.slice(0, start) + '<ChildObjects/>' + xml.slice(end);
        }
        index = end;
    }
    return xml;
}

function cloneObjectXml(
    source: string,
    xmlObjectType: string,
    oldName: string,
    newName: string,
    synonym: string
): string {
    let xml = source.replace(/^\uFEFF/, '');
    xml = clearTopLevelChildObjects(xml);

    const typeUuid = new RegExp(`(<${xmlObjectType}\\b[^>]*\\suuid=["'])[0-9a-fA-F-]{36}(["'])`);
    xml = xml.replace(typeUuid, `$1${randomUUID()}$2`);

    xml = xml.replace(/<((?:[\w.-]+:)?TypeId)>[\s\S]*?<\/\1>/g, (_match, tag) => `<${tag}>${randomUUID()}</${tag}>`);
    xml = xml.replace(/<((?:[\w.-]+:)?ValueId)>[\s\S]*?<\/\1>/g, (_match, tag) => `<${tag}>${randomUUID()}</${tag}>`);

    const nameAttr = new RegExp(`(name="[^"]*\\.)${escapeRegExp(oldName)}"`, 'g');
    xml = xml.replace(nameAttr, `$1${newName}"`);
    // Текстовые ссылки вроде Catalog.СтароеИмя.StandardAttribute и cfg:CatalogRef.СтароеИмя.
    const dottedName = new RegExp(`\\.${escapeRegExp(oldName)}(?![0-9A-Za-zА-Яа-яЁё_])`, 'g');
    xml = xml.replace(dottedName, `.${newName}`);

    xml = xml.replace(/<Name>[^<]*<\/Name>/, `<Name>${escapeXml(newName)}</Name>`);
    xml = xml.replace(
        /(<Synonym>[\s\S]*?<v8:content>)[\s\S]*?(<\/v8:content>)/,
        `$1${escapeXml(synonym)}$2`
    );
    xml = xml.replace(/<([A-Za-z0-9]+)>([^<]*\.(?:Form|Template|Command)\.[^<]*)<\/\1>/g, '<$1/>');
    return xml;
}

function buildSkeletonXml(configRoot: string, xmlObjectType: string, name: string, synonym: string): string {
    const openTag = readMetaDataObjectOpenTag(configRoot);
    const uuid = randomUUID();
    const generated = (GENERATED_TYPES[xmlObjectType] ?? [])
        .map(([prefix, category]) => generatedTypeXml(prefix, name, category))
        .join('\n\t\t\t');
    const typeProperty = TYPES_WITH_TYPE_PROPERTY.has(xmlObjectType)
        ? '\n\t\t\t<Type>\n\t\t\t\t<v8:Type>xs:string</v8:Type>\n\t\t\t</Type>'
        : '';
    const extra = extraProperties(xmlObjectType);
    const internalInfo = generated
        ? `\t\t<InternalInfo>\n\t\t\t${generated}\n\t\t</InternalInfo>\n`
        : '';
    const childObjects = TYPES_WITHOUT_CHILD_OBJECTS.has(xmlObjectType) ? '' : '\t\t<ChildObjects/>\n';

    return `<?xml version="1.0" encoding="UTF-8"?>\n${openTag}\n\t<${xmlObjectType} uuid="${uuid}">\n${internalInfo}\t\t<Properties>\n\t\t\t<Name>${escapeXml(name)}</Name>\n\t\t\t<Synonym>\n\t\t\t\t<v8:item>\n\t\t\t\t\t<v8:lang>ru</v8:lang>\n\t\t\t\t\t<v8:content>${escapeXml(synonym)}</v8:content>\n\t\t\t\t</v8:item>\n\t\t\t</Synonym>\n\t\t\t<Comment/>${typeProperty}${extra}\n\t\t</Properties>\n${childObjects}\t</${xmlObjectType}>\n</MetaDataObject>\n`;
}

function extraProperties(xmlObjectType: string): string {
    if (xmlObjectType === 'Catalog' || xmlObjectType === 'ExchangePlan' || xmlObjectType === 'ChartOfCharacteristicTypes'
        || xmlObjectType === 'ChartOfAccounts' || xmlObjectType === 'ChartOfCalculationTypes') {
        return `
\t\t\t<Hierarchical>false</Hierarchical>
\t\t\t<CodeLength>9</CodeLength>
\t\t\t<DescriptionLength>25</DescriptionLength>
\t\t\t<CodeType>String</CodeType>
\t\t\t<CodeAllowedLength>Variable</CodeAllowedLength>`;
    }
    if (xmlObjectType === 'Document') {
        return `
\t\t\t<NumberType>String</NumberType>
\t\t\t<NumberLength>9</NumberLength>
\t\t\t<NumberAllowedLength>Variable</NumberAllowedLength>
\t\t\t<NumberPeriodicity>Nonperiodical</NumberPeriodicity>
\t\t\t<Posting>Allow</Posting>`;
    }
    if (xmlObjectType === 'CommonModule') {
        return `
\t\t\t<Global>false</Global>
\t\t\t<Server>true</Server>
\t\t\t<ExternalConnection>false</ExternalConnection>
\t\t\t<ClientManagedApplication>false</ClientManagedApplication>
\t\t\t<ServerCall>false</ServerCall>`;
    }
    if (xmlObjectType === 'ScheduledJob') {
        return `
\t\t\t<MethodName></MethodName>
\t\t\t<Use>false</Use>
\t\t\t<Predefined>true</Predefined>`;
    }
    if (xmlObjectType === 'EventSubscription') {
        return `
\t\t\t<Event>BeforeWrite</Event>
\t\t\t<Handler></Handler>`;
    }
    return '';
}

function generatedTypeXml(prefix: string, name: string, category: string): string {
    return `<xr:GeneratedType name="${prefix}.${escapeXml(name)}" category="${category}">
\t\t\t\t<xr:TypeId>${randomUUID()}</xr:TypeId>
\t\t\t\t<xr:ValueId>${randomUUID()}</xr:ValueId>
\t\t\t</xr:GeneratedType>`;
}

function readMetaDataObjectOpenTag(configRoot: string): string {
    const configurationPath = path.join(configRoot, 'Configuration.xml');
    const xml = fs.readFileSync(configurationPath, 'utf8').replace(/^\uFEFF/, '');
    const match = xml.match(/<MetaDataObject\b[^>]*>/);
    if (!match) {
        throw new Error('В Configuration.xml не найден элемент MetaDataObject');
    }
    return match[0];
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Маппинг типа файла/контекста → JSON-схема для валидации структуры XML.
 * Схемы предсгенерированы в resources/xsd/*.json
 */

export interface SchemaContext {
    /** Путь к файлу (например, Document.xml, Form.xml) */
    filePath?: string;
    /** Тип объекта в XML (Document, Catalog, Form и т.д.) */
    xmlObjectType?: string;
    /** Корневой тег XML (MetaDataObject, Form, DataCompositionSchema и т.д.) */
    rootTag?: string;
}

/** Имена JSON-схем в resources/xsd/ */
const SCHEMA_FILES = {
    metadata: 'MDClasses.json',
    form: 'xcf_logform.json',
    dcs: 'data-composition-system_schema.json',
    predefined: 'xcf_predef.json',
    dumpinfo: 'xcf_dumpinfo.json',
    spreadsheet: 'spreadsheet_schema.json',
} as const;

/**
 * Определяет путь к JSON-схеме для валидации XML
 * @param xmlContent - содержимое XML (для определения корневого элемента)
 * @param context - контекст (filePath, xmlObjectType)
 * @returns имя файла схемы или null
 */
export function getJsonSchemaNameForXml(
    xmlContent: string,
    context?: SchemaContext
): string | null {
    const rootTag = context?.rootTag ?? extractRootTag(xmlContent);
    const filePath = context?.filePath ?? '';
    const xmlObjectType = context?.xmlObjectType;

    if (rootTag === 'MetaDataObject' || (xmlObjectType && isMetadataType(xmlObjectType))) {
        return SCHEMA_FILES.metadata;
    }
    if (rootTag === 'Form' || filePath.endsWith('Form.xml')) {
        return SCHEMA_FILES.form;
    }
    if (rootTag === 'DataCompositionSchema' || (filePath.includes('Report') && filePath.endsWith('Template.xml'))) {
        return SCHEMA_FILES.dcs;
    }
    if (filePath.endsWith('Template.xml') && !filePath.includes('Report')) {
        return SCHEMA_FILES.spreadsheet;
    }
    if (rootTag === 'PredefinedData' || filePath.endsWith('Predefined.xml')) {
        return SCHEMA_FILES.predefined;
    }
    if (rootTag === 'ConfigDumpInfo' || filePath.endsWith('ConfigDumpInfo.xml')) {
        return SCHEMA_FILES.dumpinfo;
    }

    return null;
}

function extractRootTag(xml: string): string | null {
    const match = xml.match(/<([^\s/>!?][^\s/>]*)/);
    return match ? match[1] : null;
}

function isMetadataType(type: string): boolean {
    const metadataTypes = [
        'Document', 'Catalog', 'Report', 'DataProcessor', 'Enum', 'Constant',
        'InformationRegister', 'AccumulationRegister', 'AccountingRegister', 'CalculationRegister',
        'CommonModule', 'Subsystem', 'Role', 'SessionParameter', 'CommonForm', 'CommonTemplate'
    ];
    return metadataTypes.includes(type);
}

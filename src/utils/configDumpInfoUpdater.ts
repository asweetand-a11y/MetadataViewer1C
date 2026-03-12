/**
 * Утилита для обновления ConfigDumpInfo.xml при изменении предопределенных элементов
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { randomUUID, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Обновляет ConfigDumpInfo.xml для предопределенных элементов
 * 
 * @param params - параметры обновления
 * @returns результат обновления
 */
export async function updateConfigDumpInfoForPredefined(params: {
    configDumpInfoPath: string;
    objectType: string;
    objectName: string;
    predefinedId?: string;
}): Promise<{ updated: boolean; id: string }> {
    const { configDumpInfoPath, objectType, objectName, predefinedId } = params;
    
    // Читаем ConfigDumpInfo.xml
    const configDumpInfoUri = vscode.Uri.file(configDumpInfoPath);
    const configXml = await vscode.workspace.fs.readFile(configDumpInfoUri);
    
    // Удаляем BOM если есть
    let cleanXml = Buffer.from(configXml).toString('utf8');
    if (cleanXml.charCodeAt(0) === 0xfeff) {
        cleanXml = cleanXml.slice(1);
    }
    
    // Парсим через xmldom
    const parser = new DOMParser({
        locator: {},
        errorHandler: {
            warning: (w: any) => console.warn('[xmldom] Warning:', w),
            error: (e: any) => console.error('[xmldom] Error:', e),
            fatalError: (e: any) => {
                console.error('[xmldom] Fatal error:', e);
                throw new Error(`XML parsing error: ${e}`);
            }
        }
    });
    
    const doc = parser.parseFromString(cleanXml, 'text/xml');
    
    // Проверяем ошибки парсинга
    const parserError = doc.getElementsByTagName('parsererror')[0];
    if (parserError) {
        const errorText = parserError.textContent || 'Unknown parsing error';
        throw new Error(`XML parsing error: ${errorText}`);
    }
    
    // Находим корневой элемент ConfigDumpInfo
    const rootElement = doc.documentElement;
    if (!rootElement || rootElement.nodeName !== 'ConfigDumpInfo') {
        throw new Error('Не найден корневой элемент ConfigDumpInfo');
    }
    
    // Находим ConfigVersions -> Metadata
    // Структура: <ConfigDumpInfo><ConfigVersions><Metadata>...</Metadata><Metadata>...</Metadata></ConfigVersions></ConfigDumpInfo>
    const configVersions = rootElement.getElementsByTagName('ConfigVersions')[0];
    if (!configVersions) {
        throw new Error('Не найден элемент ConfigVersions');
    }
    
    // Metadata - это массив элементов Metadata внутри ConfigVersions
    // Находим родительский элемент (ConfigVersions)
    const metadataParent = configVersions;
    
    // Формируем имя для поиска: Catalog.Номенклатура.Predefined
    const predefinedName = `${objectType}.${objectName}.Predefined`;
    
    // Ищем существующую запись среди всех элементов Metadata
    const allMetadata = Array.from(configVersions.getElementsByTagName('Metadata'));
    let foundMetadata: Element | null = null;
    
    for (const metadata of allMetadata) {
        const nameAttr = metadata.getAttribute('name');
        if (nameAttr === predefinedName) {
            foundMetadata = metadata;
            break;
        }
    }
    
    // Генерируем новый configVersion (32 hex символа)
    const configVersion = generateConfigVersion();
    
    if (foundMetadata) {
        // Обновляем существующую запись
        foundMetadata.setAttribute('configVersion', configVersion);
        const id = foundMetadata.getAttribute('id') || predefinedId || generatePredefinedId();
        if (!foundMetadata.getAttribute('id')) {
            foundMetadata.setAttribute('id', id);
        }
        
        // Сохраняем обновленный XML
        await saveConfigDumpInfo(configDumpInfoPath, doc);
        
        return { updated: true, id };
    } else {
        // Создаем новую запись
        const newId = predefinedId || generatePredefinedId();
        const newMetadata = doc.createElement('Metadata');
        newMetadata.setAttribute('name', predefinedName);
        newMetadata.setAttribute('id', newId);
        newMetadata.setAttribute('configVersion', configVersion);
        
        // Добавляем в конец массива Metadata (в ConfigVersions)
        metadataParent.appendChild(newMetadata);
        
        // Сохраняем обновленный XML
        await saveConfigDumpInfo(configDumpInfoPath, doc);
        
        return { updated: true, id: newId };
    }
}

/**
 * Генерирует UUID с суффиксом .1c для ID предопределенных элементов
 */
function generatePredefinedId(): string {
    return randomUUID() + '.1c';
}

/**
 * Генерирует configVersion (32 hex символа)
 */
function generateConfigVersion(): string {
    const bytes = randomBytes(16);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Сохраняет ConfigDumpInfo.xml с BOM
 */
async function saveConfigDumpInfo(path: string, doc: Document): Promise<void> {
    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(doc);
    
    // Добавляем BOM
    const bomBuffer = Buffer.from([0xEF, 0xBB, 0xBF]);
    const contentBuffer = Buffer.from(xmlString, 'utf8');
    const finalBuffer = Buffer.concat([bomBuffer, contentBuffer]);
    
    // Сохраняем файл
    const uri = vscode.Uri.file(path);
    await vscode.workspace.fs.writeFile(uri, finalBuffer);
}

/**
 * Маппинг директорий типов метаданных на префикс имени в ConfigDumpInfo.
 * Например: DataProcessors -> DataProcessor.ibs_ИмяОбработки
 */
const TYPE_DIR_TO_METADATA_PREFIX: Record<string, string> = {
    'Catalogs': 'Catalog',
    'Documents': 'Document',
    'Enums': 'Enum',
    'Reports': 'Report',
    'DataProcessors': 'DataProcessor',
    'ChartsOfCharacteristicTypes': 'ChartOfCharacteristicTypes',
    'ChartsOfAccounts': 'ChartOfAccounts',
    'ChartsOfCalculationTypes': 'ChartOfCalculationTypes',
    'InformationRegisters': 'InformationRegister',
    'AccumulationRegisters': 'AccumulationRegister',
    'AccountingRegisters': 'AccountingRegister',
    'CalculationRegisters': 'CalculationRegister',
    'BusinessProcesses': 'BusinessProcess',
    'Tasks': 'Task',
    'Constants': 'Constant',
    'CommonModules': 'CommonModule',
    'CommonForms': 'CommonForm',
    'ExternalDataSources': 'ExternalDataSource',
    'DefinedTypes': 'DefinedType',
    'ExchangePlans': 'ExchangePlan',
    'DocumentJournals': 'DocumentJournal',
    'Sequences': 'Sequence',
    'DocumentNumerators': 'DocumentNumerator',
    'WebServices': 'WebService',
    'HTTPServices': 'HTTPService',
    'Subsystems': 'Subsystem',
    'Roles': 'Role',
    'SessionParameters': 'SessionParameter',
    'CommonAttributes': 'CommonAttribute',
    'EventSubscriptions': 'EventSubscription',
    'ScheduledJobs': 'ScheduledJob',
};

/**
 * Извлекает uuid объекта из XML-файла метаданных.
 * Ищет в MetaDataObject.<Type>.Properties.Uuid или атрибуте uuid.
 */
function extractUuidFromObjectXml(xmlContent: string, _objectType: string): string | null {
    // Ищем uuid в Properties: <Properties uuid="xxx"> или <v8:Uuid>xxx</v8:Uuid> или <Uuid>xxx</Uuid>
    const patterns = [
        /<Properties[^>]*\suuid=["']([0-9a-fA-F-]{36})["']/,
        /<(?:v8:)?Uuid[^>]*>([0-9a-fA-F-]{36})<\/(?:v8:)?Uuid\s*>/,
        /uuid=["']([0-9a-fA-F-]{36})["']/,
    ];
    for (const re of patterns) {
        const m = xmlContent.match(re);
        if (m && m[1]) return m[1].trim();
    }
    return null;
}

/**
 * Синхронизирует ConfigDumpInfo.xml с файловой структурой конфигурации.
 * Добавляет записи Metadata для объектов, которые есть в файловой системе,
 * но отсутствуют в ConfigDumpInfo (например, при ручном добавлении обработки).
 *
 * @param configRoot - корневой путь конфигурации (каталог с ConfigDumpInfo.xml)
 * @param outputChannel - опциональный канал для логирования
 * @returns количество добавленных объектов
 */
export async function syncConfigDumpInfoWithFileSystem(
    configRoot: string,
    outputChannel?: vscode.OutputChannel
): Promise<{ addedCount: number; errors: string[] }> {
    const { scanMetadataRoot } = await import('../metadata_utils/MetadataScanner');

    const configDumpInfoPath = path.join(configRoot, 'ConfigDumpInfo.xml');
    if (!fs.existsSync(configDumpInfoPath)) {
        return { addedCount: 0, errors: [`ConfigDumpInfo.xml не найден: ${configDumpInfoPath}`] };
    }

    const result = { addedCount: 0, errors: [] as string[] };

    try {
        const scanResult = await scanMetadataRoot(configRoot);
        const objectsInFs = scanResult.objects;

        const configDumpInfoUri = vscode.Uri.file(configDumpInfoPath);
        const configXml = await vscode.workspace.fs.readFile(configDumpInfoUri);
        let cleanXml = Buffer.from(configXml).toString('utf8');
        if (cleanXml.charCodeAt(0) === 0xfeff) {
            cleanXml = cleanXml.slice(1);
        }

        const parser = new DOMParser({
            locator: {},
            errorHandler: {
                warning: () => {},
                error: (e: any) => result.errors.push(`XML: ${e}`),
                fatalError: (e: any) => {
                    throw new Error(`XML parsing error: ${e}`);
                }
            }
        });
        const doc = parser.parseFromString(cleanXml, 'text/xml');
        const parserError = doc.getElementsByTagName('parsererror')[0];
        if (parserError) {
            result.errors.push(`XML parsing error: ${parserError.textContent || 'Unknown'}`);
            return result;
        }

        const rootElement = doc.documentElement;
        if (!rootElement || rootElement.nodeName !== 'ConfigDumpInfo') {
            result.errors.push('Не найден корневой элемент ConfigDumpInfo');
            return result;
        }

        const configVersions = rootElement.getElementsByTagName('ConfigVersions')[0];
        if (!configVersions) {
            result.errors.push('Не найден элемент ConfigVersions');
            return result;
        }

        // Собираем имена объектов, уже присутствующих в ConfigDumpInfo.
        // В формате CF: ConfigVersions содержит один элемент Metadata name="Configuration",
        // а реальные объекты — вложенные Metadata внутри него.
        const existingNames = new Set<string>();
        const directMetadata = configVersions.getElementsByTagName('Metadata');
        for (let i = 0; i < directMetadata.length; i++) {
            const m = directMetadata[i];
            const name = m.getAttribute('name');
            if (name) existingNames.add(name);
            // Вложенные Metadata (объекты внутри Configuration)
            const nested = m.getElementsByTagName('Metadata');
            for (let j = 0; j < nested.length; j++) {
                const n = nested[j].getAttribute('name');
                if (n) existingNames.add(n);
            }
        }

        // Контейнер для новых объектов: элемент Configuration (если есть) или ConfigVersions
        let metadataContainer: Element | null = null;
        for (let i = 0; i < directMetadata.length; i++) {
            const m = directMetadata[i];
            if (m.getAttribute('name') === 'Configuration') {
                metadataContainer = m;
                break;
            }
        }
        const container = metadataContainer ?? configVersions;

        for (const obj of objectsInFs) {
            const metadataPrefix = TYPE_DIR_TO_METADATA_PREFIX[obj.objectTypeDir];
            if (!metadataPrefix) continue;

            const metadataName = `${metadataPrefix}.${obj.fsName}`;
            if (existingNames.has(metadataName)) continue;

            let objectId: string = randomUUID();
            try {
                const xmlContent = fs.readFileSync(obj.mainXmlPath, 'utf8');
                const extracted = extractUuidFromObjectXml(xmlContent, metadataPrefix);
                if (extracted) objectId = extracted;
            } catch {
                // Используем сгенерированный UUID
            }

            const configVersion = generateConfigVersion();
            const newMetadata = doc.createElement('Metadata');
            newMetadata.setAttribute('name', metadataName);
            newMetadata.setAttribute('id', objectId);
            newMetadata.setAttribute('configVersion', configVersion);
            container.appendChild(newMetadata);
            existingNames.add(metadataName);
            result.addedCount++;

            if (outputChannel) {
                outputChannel.appendLine(
                    `[syncConfigDumpInfo] Добавлена запись: ${metadataName} (id=${objectId})`
                );
            }
        }

        if (result.addedCount > 0) {
            await saveConfigDumpInfo(configDumpInfoPath, doc);
        }
    } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e));
    }

    return result;
}


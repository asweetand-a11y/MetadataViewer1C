/**
 * Утилита для автоматического добавления объектов метаданных в Configuration.xml
 * при сохранении через редактор метаданных.
 *
 * Платформа 1С требует, чтобы все объекты метаданных верхнего уровня были
 * объявлены в ChildObjects конфигурации. Иначе при загрузке возникает ошибка:
 * "нельзя добавлять объекты метаданных без загрузки родительского объекта".
 */

import * as path from 'path';
import { safeReadFile, safeWriteFile, createBackup, validatePath } from './fileUtils';

/** Типы объектов метаданных, которые должны быть в Configuration.ChildObjects */
const CONFIGURATION_CHILD_TYPES = new Set([
    'Catalog', 'Document', 'Enum', 'Report', 'DataProcessor', 'InformationRegister',
    'AccumulationRegister', 'AccountingRegister', 'CalculationRegister',
    'ChartOfCharacteristicTypes', 'ChartOfAccounts', 'ChartOfCalculationTypes',
    'BusinessProcess', 'Task', 'Constant', 'CommonModule', 'CommonPicture', 'CommonTemplate',
    'DefinedType', 'CommandGroup', 'Subsystem', 'Language',
    'ExchangePlan', 'DocumentJournal', 'DocumentNumerator', 'Sequence',
    'SessionParameter', 'CommonAttribute', 'FilterCriterion', 'EventSubscription',
    'ScheduledJob', 'FunctionalOption', 'FunctionalOptionsParameter', 'SettingsStorage',
    'CommonCommand', 'ExternalDataSource',
]);

/**
 * Проверяет, нужно ли добавлять объект в Configuration.xml
 */
function shouldAddToConfiguration(xmlObjectType: string): boolean {
    return CONFIGURATION_CHILD_TYPES.has(xmlObjectType);
}

/**
 * Добавляет объект метаданных в Configuration.xml, если его там ещё нет.
 *
 * @param configRoot - корень конфигурации (папка с Configuration.xml)
 * @param xmlObjectType - тип объекта в XML (Catalog, Document, Enum и т.д.)
 * @param objectName - имя объекта (например, "Графики")
 * @returns { changed: true } если Configuration.xml был обновлён
 */
export async function ensureMetadataInConfigurationXml(params: {
    configRoot: string;
    xmlObjectType: string;
    objectName: string;
}): Promise<{ changed: boolean }> {
    const { configRoot, xmlObjectType, objectName } = params;

    if (!shouldAddToConfiguration(xmlObjectType)) {
        return { changed: false };
    }

    const configurationPath = path.join(configRoot, 'Configuration.xml');
    if (!validatePath(configRoot, configurationPath)) {
        return { changed: false };
    }

    let xml: string;
    try {
        xml = await safeReadFile(configurationPath);
    } catch {
        return { changed: false };
    }

    const tag = `<${xmlObjectType}>${objectName}</${xmlObjectType}>`;
    if (xml.includes(tag)) {
        return { changed: false };
    }

    const eol = xml.includes('\r\n') ? '\r\n' : '\n';
    const line = `\t\t\t${tag}`;
    const sameType = new RegExp(`<${xmlObjectType}>[^<]*</${xmlObjectType}>`, 'g');
    let lastIndex = -1;
    let lastLength = 0;
    let match: RegExpExecArray | null;
    while ((match = sameType.exec(xml)) !== null) {
        lastIndex = match.index;
        lastLength = match[0].length;
    }

    let updatedXml: string;
    if (lastIndex >= 0) {
        const at = lastIndex + lastLength;
        updatedXml = xml.slice(0, at) + eol + line + xml.slice(at);
    } else {
        const end = xml.indexOf('</ChildObjects>');
        if (end < 0) {
            return { changed: false };
        }
        updatedXml = xml.slice(0, end) + line + eol + xml.slice(end);
    }

    await createBackup(configurationPath);
    await safeWriteFile(configurationPath, updatedXml);

    return { changed: true };
}

/**
 * Убирает объект из Configuration.xml, не переписывая остальной документ.
 */
export async function removeMetadataFromConfigurationXml(params: {
    configRoot: string;
    xmlObjectType: string;
    objectName: string;
}): Promise<{ changed: boolean }> {
    const { configRoot, xmlObjectType, objectName } = params;
    if (!shouldAddToConfiguration(xmlObjectType) || !objectName) {
        return { changed: false };
    }

    const configurationPath = path.join(configRoot, 'Configuration.xml');
    if (!validatePath(configRoot, configurationPath)) {
        return { changed: false };
    }

    let xml = await safeReadFile(configurationPath);
    const hasBom = xml.charCodeAt(0) === 0xfeff;
    if (hasBom) {
        xml = xml.slice(1);
    }

    const escapedName = objectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
        `[ \\t]*<${xmlObjectType}>${escapedName}<\\/${xmlObjectType}>[ \\t]*(?:\\r?\\n)?`
    );
    if (!pattern.test(xml)) {
        return { changed: false };
    }

    xml = xml.replace(pattern, '');
    await safeWriteFile(configurationPath, (hasBom ? '\uFEFF' : '') + xml);
    return { changed: true };
}

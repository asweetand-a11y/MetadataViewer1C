/**
 * Утилита для автоматического добавления объектов метаданных в Configuration.xml
 * при сохранении через редактор метаданных.
 *
 * Платформа 1С требует, чтобы все объекты метаданных верхнего уровня были
 * объявлены в ChildObjects конфигурации. Иначе при загрузке возникает ошибка:
 * "нельзя добавлять объекты метаданных без загрузки родительского объекта".
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import * as path from 'path';
import { safeReadFile, safeWriteFile, createBackup, validatePath } from './fileUtils';

/** Типы объектов метаданных, которые должны быть в Configuration.ChildObjects */
const CONFIGURATION_CHILD_TYPES = new Set([
    'Catalog', 'Document', 'Enum', 'Report', 'DataProcessor', 'InformationRegister',
    'AccumulationRegister', 'AccountingRegister', 'CalculationRegister',
    'ChartOfCharacteristicTypes', 'ChartOfAccounts', 'ChartOfCalculationTypes',
    'BusinessProcess', 'Task', 'Constant', 'CommonModule', 'CommonPicture', 'CommonTemplate',
    'DefinedType', 'CommandGroup', 'Subsystem', 'Language',
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

    // Удаляем BOM если есть
    if (xml.charCodeAt(0) === 0xfeff) {
        xml = xml.slice(1);
    }

    const parser = new DOMParser({
        locator: {},
        errorHandler: {
            warning: () => {},
            error: (e: unknown) => console.warn('[configurationXmlUpdater] XML parse error:', e),
            fatalError: (e: unknown) => console.error('[configurationXmlUpdater] XML fatal:', e),
        },
    });

    const doc = parser.parseFromString(xml, 'text/xml');
    const parserError = doc.getElementsByTagName('parsererror')[0];
    if (parserError) {
        console.warn('[configurationXmlUpdater] Configuration.xml parse error:', parserError.textContent);
        return { changed: false };
    }

    const configuration = doc.getElementsByTagName('Configuration')[0];
    if (!configuration) {
        return { changed: false };
    }

    const childObjects = configuration.getElementsByTagName('ChildObjects')[0];
    if (!childObjects) {
        return { changed: false };
    }

    // Проверяем, есть ли уже такой объект (tagName или localName для учёта namespace)
    const existing = Array.from(childObjects.childNodes).find((n) => {
        if (n.nodeType !== 1) return false;
        const el = n as Element;
        const tag = el.localName || el.tagName;
        return tag === xmlObjectType && el.textContent?.trim() === objectName;
    });
    if (existing) {
        return { changed: false };
    }

    // Создаём новый элемент в namespace MDClasses (как у родительских элементов)
    const ns = configuration.namespaceURI || 'http://v8.1c.ru/8.3/MDClasses';
    const newEl = doc.createElementNS(ns, xmlObjectType);
    newEl.appendChild(doc.createTextNode(objectName));

    // Вставляем после последнего элемента того же типа
    const children = Array.from(childObjects.childNodes).filter((n) => n.nodeType === 1);
    let lastOfType: Element | null = null;
    for (let i = children.length - 1; i >= 0; i--) {
        const el = children[i] as Element;
        const tag = el.localName || el.tagName;
        if (tag === xmlObjectType) {
            lastOfType = el;
            break;
        }
    }

    if (lastOfType && lastOfType.nextSibling) {
        childObjects.insertBefore(newEl, lastOfType.nextSibling);
    } else if (lastOfType) {
        childObjects.appendChild(newEl);
    } else {
        // Нет элементов такого типа — добавляем в конец
        childObjects.appendChild(newEl);
    }

    const serializer = new XMLSerializer();
    const updatedXml = serializer.serializeToString(doc);

    // Добавляем BOM
    const bom = '\uFEFF';
    const finalContent = bom + updatedXml;

    await createBackup(configurationPath);
    await safeWriteFile(configurationPath, finalContent);

    return { changed: true };
}

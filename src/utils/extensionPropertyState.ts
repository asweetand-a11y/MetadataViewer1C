/**
 * Пометка расширенного свойства заимствованного объекта.
 * Повторяет cfe-borrow set_property_state_flag: с формата 2.19 (8.3.26)
 * PropertyState пишется в конец собственного InternalInfo объекта.
 * На 2.18 и ниже платформа элемент выбрасывает, поэтому его не пишем.
 */

import * as fs from 'fs';
import * as path from 'path';
import { safeReadFile, safeWriteFile } from './fileUtils';
import { finalizeOneCXml, styleForExistingOneCXml } from './oneCXmlStyle';

const MODULE_FILE_KINDS = ['ObjectModule', 'ManagerModule', 'RecordSetModule', 'ValueManagerModule', 'Module'];

/** "2.20" → 220. Строковое сравнение версий неверно: "2.9" > "2.17". */
export function formatRank(version: string): number {
    const match = /^(\d+)\.(\d+)$/.exec(version || '');
    return match ? Number(match[1]) * 100 + Number(match[2]) : 0;
}

export function readFormatVersion(xml: string): string {
    const match = /<MetaDataObject[^>]+version="(\d+\.\d+)"/.exec(xml);
    return match ? match[1] : '2.17';
}

/** Свойства самого объекта: первый блок Properties, до ChildObjects. */
export function rootPropertiesXml(xml: string): string {
    const start = xml.indexOf('<Properties>');
    const end = xml.indexOf('</Properties>');
    if (start < 0 || end < 0 || end < start) {
        return '';
    }
    return xml.slice(start, end + '</Properties>'.length);
}

export function isAdoptedObjectXml(xml: string): boolean {
    return /<ObjectBelonging>\s*Adopted\s*<\/ObjectBelonging>/.test(rootPropertiesXml(xml));
}

function propertyStateBlock(propertyName: string, indent: string, newline: string): string {
    return [
        `${indent}<xr:PropertyState>`,
        `${indent}\t<xr:Property>${propertyName}</xr:Property>`,
        `${indent}\t<xr:State>Extended</xr:State>`,
        `${indent}</xr:PropertyState>`,
    ].join(newline);
}

/**
 * Дописывает xr:PropertyState в первый InternalInfo.
 * Повторный вызов с тем же свойством текст не меняет.
 */
export function setPropertyStateInXml(text: string, propertyName: string, formatVersion: string): string {
    if (formatRank(formatVersion) < 219) {
        return text;
    }
    const newline = text.includes('\r\n') ? '\r\n' : '\n';
    const empty = /([ \t]*)<InternalInfo\s*\/>/.exec(text);
    const opened = /([ \t]*)<InternalInfo>([\s\S]*?)<\/InternalInfo>/.exec(text);

    if (empty && (!opened || empty.index < opened.index)) {
        const indent = empty[1];
        const block = propertyStateBlock(propertyName, indent + '\t', newline);
        const replacement = `${indent}<InternalInfo>${newline}${block}${newline}${indent}</InternalInfo>`;
        return text.slice(0, empty.index) + replacement + text.slice(empty.index + empty[0].length);
    }
    if (!opened) {
        return text;
    }
    if (new RegExp(`<xr:Property>${propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</xr:Property>`).test(opened[2])) {
        return text;
    }
    const indent = opened[1];
    const block = propertyStateBlock(propertyName, indent + '\t', newline);
    const closeAt = opened.index + opened[0].length - '</InternalInfo>'.length - indent.length;
    return text.slice(0, closeAt) + block + newline + text.slice(closeAt);
}

/**
 * Перед записью заимствованного объекта: движения и уже лежащие на диске
 * модуль и форма помечаются Extended, иначе платформа считает их заменой.
 */
export function applyAdoptedExtensionFlags(xml: string, objectFilePath: string): string {
    if (!isAdoptedObjectXml(xml)) {
        return xml;
    }
    const version = readFormatVersion(xml);
    if (formatRank(version) < 219) {
        return xml;
    }
    let text = xml;
    const properties = rootPropertiesXml(text);
    if (/<RegisterRecords\b[^>]*>[\s\S]*?<xr:Item\b/.test(properties)) {
        text = setPropertyStateInXml(text, 'RegisterRecords', version);
    }
    const folder = objectFilePath.replace(/\.xml$/i, '');
    for (const kind of MODULE_FILE_KINDS) {
        if (fs.existsSync(path.join(folder, 'Ext', `${kind}.bsl`))) {
            text = setPropertyStateInXml(text, kind, version);
        }
    }
    if (fs.existsSync(path.join(folder, 'Ext', 'Form.xml'))) {
        text = setPropertyStateInXml(text, 'Form', version);
    }
    return text;
}

/** Путь модуля Ext → файл метаданных и имя свойства PropertyState. */
export function modulePropertyFromBslPath(bslPath: string): { objectXmlPath: string; propertyName: string } | null {
    const normalized = bslPath.replace(/\\/g, '/');
    const formModule = /^(.*)\/([^/]+)\/Ext\/Form\/Module\.bsl$/i.exec(normalized);
    if (formModule) {
        return {
            objectXmlPath: path.normalize(`${formModule[1]}/${formModule[2]}.xml`),
            propertyName: 'Form',
        };
    }
    const objectModule = /^(.*)\/([^/]+)\/Ext\/(ObjectModule|ManagerModule|RecordSetModule|ValueManagerModule|Module)\.bsl$/i.exec(normalized);
    if (objectModule) {
        return {
            objectXmlPath: path.normalize(`${objectModule[1]}/${objectModule[2]}.xml`),
            propertyName: objectModule[3],
        };
    }
    return null;
}

/** Ставит PropertyState, если модуль принадлежит заимствованному объекту. */
export async function ensureModulePropertyState(bslPath: string): Promise<boolean> {
    const parsed = modulePropertyFromBslPath(bslPath);
    if (!parsed || !fs.existsSync(parsed.objectXmlPath)) {
        return false;
    }
    const xml = await safeReadFile(parsed.objectXmlPath);
    if (!isAdoptedObjectXml(xml)) {
        return false;
    }
    const next = setPropertyStateInXml(xml, parsed.propertyName, readFormatVersion(xml));
    if (next === xml) {
        return false;
    }
    await safeWriteFile(
        parsed.objectXmlPath,
        finalizeOneCXml(next, styleForExistingOneCXml(parsed.objectXmlPath))
    );
    return true;
}

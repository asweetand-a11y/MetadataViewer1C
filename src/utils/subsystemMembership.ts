/**
 * Участие объекта метаданных в подсистемах (каталог cf/Subsystems, вложенные xml, Properties.Content / xr:Item).
 */

import * as fs from "fs";
import * as path from "path";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { safeReadFile, safeWriteFile, validatePath } from "./fileUtils";
import { validateXML, normalizeXML } from "./xmlUtils";
import { validateXmlStructure } from "../validation/xmlStructureValidator";

const XR_NS = "http://v8.1c.ru/8.3/xcf/readable";
const XSI_NS = "http://www.w3.org/2001/XMLSchema-instance";

export interface SubsystemMembershipRow {
    /** Путь от корня конфигурации, POSIX: Subsystems/Имя.xml или вложенный */
    relPath: string;
    /** Подпись (синоним ru или имя) */
    label: string;
    /** Объект входит в Content этой подсистемы */
    included: boolean;
}

/**
 * Нужно ли показывать вкладку «Подсистемы» для данного файла объекта.
 */
export function shouldOfferSubsystemMembership(filePath: string, xmlObjectType: string | undefined): boolean {
    const base = path.basename(filePath);
    if (base === "Configuration.xml") {
        return false;
    }
    const norm = filePath.replace(/\\/g, "/");
    if (/\/Subsystems\/.*\.xml$/i.test(norm)) {
        return false;
    }
    if (xmlObjectType === "Subsystem") {
        return false;
    }
    return true;
}

/** Резервные копии createBackup: Имя.backup.<дата>.xml — не объекты подсистем */
function isSubsystemMetadataBackupFile(fileName: string): boolean {
    return /\.backup\./i.test(fileName);
}

/**
 * Рекурсивно перечисляет XML-файлы подсистем под cf/Subsystems.
 */
export function enumerateSubsystemMetadataXmlFiles(configRoot: string): string[] {
    const root = path.join(configRoot, "Subsystems");
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
        return [];
    }
    const out: string[] = [];
    const walk = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const ent of entries) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                walk(full);
            } else if (ent.isFile() && ent.name.endsWith(".xml")) {
                // Интерфейс команд подсистемы (…/Ext/CommandInterface.xml) — не метаданные подсистемы
                if (ent.name.toLowerCase() === "commandinterface.xml") {
                    continue;
                }
                if (isSubsystemMetadataBackupFile(ent.name)) {
                    continue;
                }
                out.push(full);
            }
        }
    };
    walk(root);
    return out.sort((a, b) => a.localeCompare(b, "ru"));
}

function readSubsystemDisplayLabel(xml: string, fallbackName: string): string {
    const syn = xml.match(/<Synonym>[\s\S]*?<v8:content>([^<]*)<\/v8:content>/);
    if (syn && syn[1].trim()) {
        return syn[1].trim();
    }
    const nameMatch = xml.match(/<Properties>[\s\S]*?<Name>([^<]+)<\/Name>/);
    if (nameMatch) {
        return nameMatch[1].trim();
    }
    return fallbackName;
}

function createDomParser(): DOMParser {
    return new DOMParser({
        locator: {},
        errorHandler: {
            warning: () => {},
            error: (e: unknown) => console.warn("[subsystemMembership] DOM parse error:", e),
            fatalError: (e: unknown) => console.error("[subsystemMembership] DOM fatal:", e),
        },
    });
}

function getMetaSubsystemElement(doc: Document): Element | null {
    const root = doc.documentElement;
    if (!root || root.localName !== "MetaDataObject") {
        return null;
    }
    for (let c = root.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 1 && (c as Element).localName === "Subsystem") {
            return c as Element;
        }
    }
    return null;
}

function findChildElementByLocalName(parent: Element, localName: string): Element | null {
    for (let n = parent.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 1 && (n as Element).localName === localName) {
            return n as Element;
        }
    }
    return null;
}

function getContentItemElements(contentEl: Element): Element[] {
    const items: Element[] = [];
    for (let n = contentEl.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 1 && (n as Element).localName === "Item") {
            items.push(n as Element);
        }
    }
    return items;
}

export function extractContentMdRefsFromXmlString(xml: string): string[] {
    const parser = createDomParser();
    const doc = parser.parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror")[0]) {
        return [];
    }
    const subsystemEl = getMetaSubsystemElement(doc);
    if (!subsystemEl) {
        return [];
    }
    const properties = findChildElementByLocalName(subsystemEl, "Properties");
    if (!properties) {
        return [];
    }
    const contentEl = findChildElementByLocalName(properties, "Content");
    if (!contentEl) {
        return [];
    }
    return getContentItemElements(contentEl)
        .map((el) => el.textContent?.trim() || "")
        .filter(Boolean);
}

/**
 * Загрузка списка подсистем и флагов участия для MDObjectRef (например ChartOfAccounts.Управленческий).
 */
export async function loadSubsystemMembershipForObject(params: {
    configRoot: string;
    mdRef: string;
}): Promise<SubsystemMembershipRow[]> {
    const files = enumerateSubsystemMetadataXmlFiles(params.configRoot);
    const rows: SubsystemMembershipRow[] = [];
    for (const abs of files) {
        const xml = await safeReadFile(abs);
        const relPath = path.relative(params.configRoot, abs).replace(/\\/g, "/");
        const label = readSubsystemDisplayLabel(xml, path.basename(abs, ".xml"));
        const refs = extractContentMdRefsFromXmlString(xml);
        rows.push({ relPath, label, included: refs.includes(params.mdRef) });
    }
    return rows;
}

function resolveSubsystemXmlAbsPath(configRoot: string, relPath: string): string {
    const normalizedRel = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (normalizedRel.includes("..") || normalizedRel.split("/").some((p) => p === "..")) {
        throw new Error("Недопустимый путь подсистемы");
    }
    if (!normalizedRel.startsWith("Subsystems/")) {
        throw new Error("Файл подсистемы должен находиться в каталоге Subsystems");
    }
    const abs = path.resolve(path.join(configRoot, ...normalizedRel.split("/")));
    if (!validatePath(configRoot, abs)) {
        throw new Error("Путь вне корня конфигурации");
    }
    if (isSubsystemMetadataBackupFile(path.basename(abs))) {
        throw new Error("Нельзя использовать файл резервной копии как подсистему");
    }
    return abs;
}

/**
 * Вставить <Properties> в типичном порядке 1С: после <InternalInfo>, перед <ChildObjects>.
 */
function insertNewSubsystemProperties(subsystemEl: Element, properties: Element): void {
    const internalInfo = findChildElementByLocalName(subsystemEl, "InternalInfo");
    if (internalInfo) {
        if (internalInfo.nextSibling) {
            subsystemEl.insertBefore(properties, internalInfo.nextSibling);
        } else {
            subsystemEl.appendChild(properties);
        }
        return;
    }
    const childObjects = findChildElementByLocalName(subsystemEl, "ChildObjects");
    if (childObjects) {
        subsystemEl.insertBefore(properties, childObjects);
        return;
    }
    if (subsystemEl.firstChild) {
        subsystemEl.insertBefore(properties, subsystemEl.firstChild);
    } else {
        subsystemEl.appendChild(properties);
    }
}

function ensurePropertiesContent(doc: Document, subsystemEl: Element): Element {
    let properties = findChildElementByLocalName(subsystemEl, "Properties");
    if (!properties) {
        properties = doc.createElement("Properties");
        insertNewSubsystemProperties(subsystemEl, properties);
    }
    let contentEl = findChildElementByLocalName(properties, "Content");
    if (!contentEl) {
        contentEl = doc.createElement("Content");
        properties.appendChild(contentEl);
    }
    return contentEl;
}

/**
 * Добавляет или удаляет ссылку mdRef в Content одного файла подсистемы.
 * @returns true если файл изменён и записан
 */
async function applyMdRefToSingleSubsystemFile(params: {
    absPath: string;
    mdRef: string;
    include: boolean;
    extensionPath: string;
    validateStructure: boolean;
}): Promise<boolean> {
    let xml = await safeReadFile(params.absPath);
    const hadBom = xml.charCodeAt(0) === 0xfeff;
    if (hadBom) {
        xml = xml.slice(1);
    }

    const parser = createDomParser();
    const doc = parser.parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror")[0]) {
        throw new Error(`Не удалось разобрать XML подсистемы: ${path.basename(params.absPath)}`);
    }
    const subsystemEl = getMetaSubsystemElement(doc);
    if (!subsystemEl) {
        throw new Error(`В файле нет MetaDataObject/Subsystem: ${path.basename(params.absPath)}`);
    }

    const contentEl = ensurePropertiesContent(doc, subsystemEl);
    const items = getContentItemElements(contentEl);
    const matching = items.filter((el) => (el.textContent?.trim() || "") === params.mdRef);
    let changed = false;

    if (params.include) {
        if (matching.length === 0) {
            const itemEl = doc.createElementNS(XR_NS, "xr:Item");
            itemEl.setAttributeNS(XSI_NS, "xsi:type", "xr:MDObjectRef");
            itemEl.appendChild(doc.createTextNode(params.mdRef));
            contentEl.appendChild(itemEl);
            changed = true;
        }
    } else {
        for (const el of matching) {
            el.parentNode?.removeChild(el);
            changed = true;
        }
    }

    if (!changed) {
        return false;
    }

    const serializer = new XMLSerializer();
    let updated = serializer.serializeToString(doc);
    updated = normalizeXML(updated);

    const validation = validateXML(updated);
    if (!validation.valid) {
        throw new Error(`Валидация XML подсистемы ${path.basename(params.absPath)}: ${validation.error || ""}`);
    }

    if (params.validateStructure) {
        const structureResult = validateXmlStructure(updated, {
            extensionPath: params.extensionPath,
            filePath: params.absPath,
            xmlObjectType: "Subsystem",
            rootTag: "MetaDataObject",
        });
        if (!structureResult.valid && structureResult.errors?.length) {
            throw new Error(
                `Структура XML подсистемы ${path.basename(params.absPath)}: ${structureResult.errors.slice(0, 3).join("; ")}`
            );
        }
    }

    const finalContent = (hadBom ? "\uFEFF" : "") + updated;
    await safeWriteFile(params.absPath, finalContent);
    return true;
}

/**
 * Применяет набор флагов подсистем к файлам cf/Subsystems.
 */
export async function applySubsystemMembershipChanges(params: {
    configRoot: string;
    mdRef: string;
    rows: Pick<SubsystemMembershipRow, "relPath" | "included">[];
    extensionPath: string;
    validateStructure: boolean;
}): Promise<string[]> {
    const changedFiles: string[] = [];
    for (const row of params.rows) {
        const abs = resolveSubsystemXmlAbsPath(params.configRoot, row.relPath);
        const written = await applyMdRefToSingleSubsystemFile({
            absPath: abs,
            mdRef: params.mdRef,
            include: row.included,
            extensionPath: params.extensionPath,
            validateStructure: params.validateStructure,
        });
        if (written) {
            changedFiles.push(abs);
        }
    }
    return changedFiles;
}

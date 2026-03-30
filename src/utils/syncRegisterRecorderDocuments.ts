/**
 * Синхронизация ссылок на регистр в XML документов (Properties / RegisterRecords / xr:Item).
 * В конфигураторе 1С регистраторы для регистров задаются в документах, а не в файле регистра.
 */

import * as fs from "fs";
import * as path from "path";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { safeReadFile, safeWriteFile, validatePath } from "./fileUtils";
import { normalizeXML, validateXML } from "./xmlUtils";

const XR_NS = "http://v8.1c.ru/8.3/xcf/readable";
const XSI_NS = "http://www.w3.org/2001/XMLSchema-instance";

/** Типы регистров, для которых поддерживается привязка через RegisterRecords документов */
export const REGISTER_RECORDER_XML_TYPES = new Set([
    "InformationRegister",
    "AccumulationRegister",
    "AccountingRegister",
    "CalculationRegister",
]);

export function isRegisterRecorderXmlType(xmlObjectType: string | undefined): boolean {
    return Boolean(xmlObjectType && REGISTER_RECORDER_XML_TYPES.has(xmlObjectType));
}

function createDomParser(): DOMParser {
    return new DOMParser({
        locator: {},
        errorHandler: {
            warning: () => {},
            error: (e: unknown) => console.warn("[syncRegisterRecorderDocuments] DOM parse error:", e),
            fatalError: (e: unknown) => console.error("[syncRegisterRecorderDocuments] DOM fatal:", e),
        },
    });
}

function findChildElementByLocalName(parent: Element, localName: string): Element | null {
    for (let n = parent.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 1 && (n as Element).localName === localName) {
            return n as Element;
        }
    }
    return null;
}

function getMetaDataDocumentElement(doc: Document): Element | null {
    const root = doc.documentElement;
    if (!root || root.localName !== "MetaDataObject") {
        return null;
    }
    for (let c = root.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 1 && (c as Element).localName === "Document") {
            return c as Element;
        }
    }
    return null;
}

/**
 * Извлекает ссылки xr:MDObjectRef из RegisterRecords документа.
 */
export function extractRegisterRefsFromDocumentXml(xml: string): string[] {
    const parser = createDomParser();
    const doc = parser.parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror")[0]) {
        return [];
    }
    const documentEl = getMetaDataDocumentElement(doc);
    if (!documentEl) {
        return [];
    }
    const properties = findChildElementByLocalName(documentEl, "Properties");
    if (!properties) {
        return [];
    }
    const registerRecords = findChildElementByLocalName(properties, "RegisterRecords");
    if (!registerRecords) {
        return [];
    }
    const refs: string[] = [];
    for (let n = registerRecords.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 1 && (n as Element).localName === "Item") {
            const t = ((n as Element).textContent || "").trim();
            if (t) {
                refs.push(t);
            }
        }
    }
    return refs;
}

function preserveXmlDeclaration(original: string, serialized: string): string {
    const decl = original.match(/^<\?xml[^?]*\?>\s*/);
    if (!decl) {
        return serialized;
    }
    const withoutDecl = serialized.replace(/^<\?xml[^?]*\?>\s*/, "");
    return decl[0] + withoutDecl;
}

/**
 * Добавляет или удаляет ссылку на регистр в RegisterRecords документа.
 */
export function patchDocumentRegisterRecorderRef(
    originalXml: string,
    registerRef: string,
    shouldHave: boolean
): string {
    const parser = createDomParser();
    const doc = parser.parseFromString(originalXml, "text/xml");
    if (doc.getElementsByTagName("parsererror")[0]) {
        return originalXml;
    }
    const documentEl = getMetaDataDocumentElement(doc);
    if (!documentEl) {
        return originalXml;
    }
    const properties = findChildElementByLocalName(documentEl, "Properties");
    if (!properties) {
        return originalXml;
    }

    let registerRecords = findChildElementByLocalName(properties, "RegisterRecords");

    const listItems = (rr: Element): Element[] => {
        const out: Element[] = [];
        for (let n = rr.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === 1 && (n as Element).localName === "Item") {
                out.push(n as Element);
            }
        }
        return out;
    };

    if (!registerRecords) {
        if (!shouldHave) {
            return originalXml;
        }
        registerRecords = doc.createElement("RegisterRecords");
        properties.appendChild(registerRecords);
    }

    const items = listItems(registerRecords);
    const matching = items.filter((el) => (el.textContent || "").trim() === registerRef);

    if (shouldHave) {
        if (matching.length > 0) {
            return originalXml;
        }
        const item = doc.createElementNS(XR_NS, "xr:Item");
        item.setAttributeNS(XSI_NS, "xsi:type", "xr:MDObjectRef");
        item.textContent = registerRef;
        registerRecords.appendChild(item);
    } else {
        for (const el of matching) {
            registerRecords.removeChild(el);
        }
        if (listItems(registerRecords).length === 0) {
            properties.removeChild(registerRecords);
        }
    }

    const serialized = new XMLSerializer().serializeToString(doc);
    return preserveXmlDeclaration(originalXml, serialized);
}

/**
 * Ищет каталог Documents (выгрузка в корень или src/cf).
 */
export async function resolveDocumentsDirectory(configRoot: string): Promise<string | null> {
    const candidates = [path.join(configRoot, "Documents"), path.join(configRoot, "src", "cf", "Documents")];
    for (const dir of candidates) {
        try {
            const st = await fs.promises.stat(dir);
            if (st.isDirectory()) {
                return dir;
            }
        } catch {
            /* нет каталога */
        }
    }
    return null;
}

/**
 * Однократный обход всех документов: карта «ссылка на регистр» → имена документов (без .xml).
 */
export async function buildRegisterRefToDocumentNamesMap(configRoot: string): Promise<Map<string, string[]>> {
    const map = new Map<string, Set<string>>();
    const docsDir = await resolveDocumentsDirectory(configRoot);
    if (!docsDir) {
        return new Map();
    }
    let files: string[];
    try {
        files = await fs.promises.readdir(docsDir);
    } catch {
        return new Map();
    }
    for (const f of files) {
        if (!f.endsWith(".xml")) {
            continue;
        }
        const full = path.join(docsDir, f);
        let xml: string;
        try {
            xml = await safeReadFile(full);
        } catch {
            continue;
        }
        const refs = extractRegisterRefsFromDocumentXml(xml);
        const base = path.basename(f, ".xml");
        for (const ref of refs) {
            if (!map.has(ref)) {
                map.set(ref, new Set());
            }
            map.get(ref)!.add(base);
        }
    }
    const out = new Map<string, string[]>();
    const collator = new Intl.Collator("ru");
    for (const [ref, set] of map) {
        out.set(ref, [...set].sort((a, b) => collator.compare(a, b)));
    }
    return out;
}

export interface SyncRegisterRecorderDocumentsParams {
    configRoot: string;
    registerXmlType: string;
    registerName: string;
    selectedDocumentNames: string[];
}

export interface SyncRegisterRecorderDocumentsResult {
    updatedFiles: string[];
    errors: string[];
}

/**
 * Для каждого документа в каталоге Documents добавляет или удаляет ссылку на регистр.
 */
export async function syncRegisterRecorderDocuments(
    params: SyncRegisterRecorderDocumentsParams
): Promise<SyncRegisterRecorderDocumentsResult> {
    const { configRoot, registerXmlType, registerName, selectedDocumentNames } = params;
    const registerRef = `${registerXmlType}.${registerName}`;
    const selected = new Set(
        (selectedDocumentNames || []).map((n) => String(n).trim()).filter(Boolean)
    );

    const updatedFiles: string[] = [];
    const errors: string[] = [];

    const docsDir = await resolveDocumentsDirectory(configRoot);
    if (!docsDir) {
        return { updatedFiles, errors: ["Каталог Documents не найден (ожидались Documents или src/cf/Documents)."] };
    }

    let files: string[];
    try {
        files = await fs.promises.readdir(docsDir);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { updatedFiles, errors: [`Не удалось прочитать каталог Documents: ${msg}`] };
    }

    const xmlFiles = files.filter((f) => f.endsWith(".xml"));

    for (const f of xmlFiles) {
        const docPath = path.join(docsDir, f);
        if (!validatePath(configRoot, docPath)) {
            errors.push(`Пропуск файла (некорректный путь): ${docPath}`);
            continue;
        }

        const baseName = path.basename(f, ".xml");
        const shouldHave = selected.has(baseName);

        let originalXml: string;
        try {
            originalXml = await safeReadFile(docPath);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${f}: ${msg}`);
            continue;
        }

        const hasRef = extractRegisterRefsFromDocumentXml(originalXml).includes(registerRef);
        if (hasRef === shouldHave) {
            continue;
        }

        let nextXml: string;
        try {
            nextXml = patchDocumentRegisterRecorderRef(originalXml, registerRef, shouldHave);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${f}: патч RegisterRecords — ${msg}`);
            continue;
        }

        nextXml = normalizeXML(nextXml);
        const validation = validateXML(nextXml);
        if (!validation.valid) {
            errors.push(`${f}: валидация XML после патча — ${validation.error || "неизвестная ошибка"}`);
            continue;
        }

        try {
            await safeWriteFile(docPath, nextXml);
            updatedFiles.push(docPath);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${f}: запись — ${msg}`);
        }
    }

    return { updatedFiles, errors };
}

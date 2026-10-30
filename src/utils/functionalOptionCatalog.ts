/**
 * Имена реквизитов, табличных частей, измерений и ресурсов для состава функциональной опции.
 * Читает XML объекта без полного разбора метаданных.
 */

import * as fs from 'fs';
import type { MetadataFileRef } from '../metadata_utils/MetadataScanner';
import type { FunctionalOptionMembers } from '../Metadata/types';

const DIR_TO_META: Record<string, string> = {
    Catalogs: 'Catalog',
    Documents: 'Document',
    Reports: 'Report',
    DataProcessors: 'DataProcessor',
    ChartsOfCharacteristicTypes: 'ChartOfCharacteristicTypes',
    ChartsOfAccounts: 'ChartOfAccounts',
    ChartsOfCalculationTypes: 'ChartOfCalculationTypes',
    ExchangePlans: 'ExchangePlan',
    BusinessProcesses: 'BusinessProcess',
    Tasks: 'Task',
    InformationRegisters: 'InformationRegister',
    AccumulationRegisters: 'AccumulationRegister',
    AccountingRegisters: 'AccountingRegister',
    CalculationRegisters: 'CalculationRegister',
};

function findTag(xml: string, tag: string, from: number, closing: boolean): number {
    const needle = closing ? `</${tag}>` : `<${tag}`;
    let pos = from;
    while (pos < xml.length) {
        const index = xml.indexOf(needle, pos);
        if (index < 0) {
            return -1;
        }
        if (closing) {
            return index;
        }
        const after = xml[index + needle.length];
        if (after === '>' || after === '/' || after === ' ' || after === '\t' || after === '\n' || after === '\r') {
            return index;
        }
        pos = index + needle.length;
    }
    return -1;
}

function readElementBody(xml: string, openAt: number, tag: string): { body: string; end: number } | null {
    const openEnd = xml.indexOf('>', openAt);
    if (openEnd < 0) {
        return null;
    }
    if (xml[openEnd - 1] === '/') {
        return { body: '', end: openEnd + 1 };
    }
    let depth = 1;
    let pos = openEnd + 1;
    while (depth > 0) {
        const nextOpen = findTag(xml, tag, pos, false);
        const nextClose = findTag(xml, tag, pos, true);
        if (nextClose < 0) {
            return null;
        }
        if (nextOpen >= 0 && nextOpen < nextClose) {
            depth += 1;
            pos = nextOpen + tag.length + 1;
            continue;
        }
        depth -= 1;
        pos = nextClose + tag.length + 3;
        if (depth === 0) {
            return { body: xml.slice(openEnd + 1, nextClose), end: pos };
        }
    }
    return null;
}

function splitTopLevel(inner: string): { tag: string; body: string }[] {
    const items: { tag: string; body: string }[] = [];
    let pos = 0;
    while (pos < inner.length) {
        const lt = inner.indexOf('<', pos);
        if (lt < 0) {
            break;
        }
        if (inner.startsWith('</', lt) || inner.startsWith('<?', lt) || inner.startsWith('<!--', lt)) {
            pos = lt + 1;
            continue;
        }
        const match = /^<([A-Za-z][A-Za-z0-9]*)\b/.exec(inner.slice(lt));
        if (!match) {
            pos = lt + 1;
            continue;
        }
        const tag = match[1];
        const read = readElementBody(inner, lt, tag);
        if (!read) {
            break;
        }
        items.push({ tag, body: read.body });
        pos = read.end;
    }
    return items;
}

function firstName(body: string): string {
    const match = /<Name>([^<]*)<\/Name>/.exec(body);
    return match ? match[1].trim() : '';
}

function plainText(body: string): string {
    const text = body.trim();
    return text.includes('<') ? '' : text;
}

function namesOf(inner: string, tag: string): string[] {
    return splitTopLevel(inner)
        .filter((item) => item.tag === tag)
        .map((item) => firstName(item.body) || plainText(item.body))
        .filter(Boolean);
}

/** Состав верхнего ChildObjects объекта: реквизиты, табличные части, формы, команды. */
export function readFunctionalOptionMembersFromXml(xml: string, owner: string): FunctionalOptionMembers {
    const empty: FunctionalOptionMembers = {
        owner,
        attributes: [],
        tabularSections: [],
        dimensions: [],
        resources: [],
        forms: [],
        commands: [],
    };
    const propsEnd = xml.indexOf('</Properties>');
    if (propsEnd < 0) {
        return empty;
    }
    const childAt = findTag(xml, 'ChildObjects', propsEnd, false);
    if (childAt < 0) {
        return empty;
    }
    const child = readElementBody(xml, childAt, 'ChildObjects');
    if (!child) {
        return empty;
    }
    const top = splitTopLevel(child.body);
    const attributes: string[] = [];
    const tabularSections: { name: string; attributes: string[] }[] = [];
    const dimensions: string[] = [];
    const resources: string[] = [];
    const forms: string[] = [];
    const commands: string[] = [];

    for (const item of top) {
        if (item.tag === 'Attribute') {
            const name = firstName(item.body);
            if (name) {
                attributes.push(name);
            }
            continue;
        }
        if (item.tag === 'Dimension') {
            const name = firstName(item.body);
            if (name) {
                dimensions.push(name);
            }
            continue;
        }
        if (item.tag === 'Resource') {
            const name = firstName(item.body);
            if (name) {
                resources.push(name);
            }
            continue;
        }
        if (item.tag === 'Form') {
            const name = plainText(item.body) || firstName(item.body);
            if (name) {
                forms.push(name);
            }
            continue;
        }
        if (item.tag === 'Command') {
            const name = firstName(item.body) || plainText(item.body);
            if (name) {
                commands.push(name);
            }
            continue;
        }
        if (item.tag === 'TabularSection') {
            const nestedAt = findTag(item.body, 'ChildObjects', 0, false);
            const head = nestedAt >= 0 ? item.body.slice(0, nestedAt) : item.body;
            const name = firstName(head);
            if (!name) {
                continue;
            }
            let sectionAttributes: string[] = [];
            if (nestedAt >= 0) {
                const nested = readElementBody(item.body, nestedAt, 'ChildObjects');
                if (nested) {
                    sectionAttributes = namesOf(nested.body, 'Attribute');
                }
            }
            tabularSections.push({ name, attributes: sectionAttributes });
        }
    }

    return { owner, attributes, tabularSections, dimensions, resources, forms, commands };
}

export async function collectFunctionalOptionMembers(objects: MetadataFileRef[]): Promise<FunctionalOptionMembers[]> {
    const result: FunctionalOptionMembers[] = [];
    for (const obj of objects) {
        const meta = DIR_TO_META[obj.objectTypeDir];
        if (!meta) {
            continue;
        }
        try {
            const xml = await fs.promises.readFile(obj.mainXmlPath, 'utf8');
            const members = readFunctionalOptionMembersFromXml(xml, `${meta}.${obj.displayName}`);
            const hasChildren = members.attributes.length
                || members.tabularSections.length
                || members.dimensions.length
                || members.resources.length
                || members.forms.length
                || members.commands.length;
            if (hasChildren) {
                result.push(members);
            }
        } catch {
            /* повреждённый файл не блокирует редактор */
        }
    }
    return result;
}

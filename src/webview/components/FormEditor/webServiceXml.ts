/**
 * Чтение и точечная правка XML веб-сервиса: пакеты XDTO и операции.
 * Правки операций делаются внутри блока Operation, без пересборки всего файла.
 */

export interface WebServiceOperation {
    uuid: string;
    name: string;
    synonym: string;
    comment: string;
    returnType: string;
    nillable: boolean;
    transactioned: boolean;
    procedureName: string;
    dataLockControlMode: string;
}

/** Пакеты платформы из диалога «Выбор пакетов XDTO» конфигуратора. */
export const STANDARD_XDTO_PACKAGES: readonly string[] = [
    'http://v8.1c.ru/8.1/data-composition-system/appearance-template',
    'http://v8.1c.ru/8.1/data-composition-system/area-template',
    'http://v8.1c.ru/8.1/data-composition-system/common',
    'http://v8.1c.ru/8.1/data-composition-system/composition-template',
    'http://v8.1c.ru/8.1/data-composition-system/core',
    'http://v8.1c.ru/8.1/data-composition-system/details',
    'http://v8.1c.ru/8.1/data-composition-system/result',
    'http://v8.1c.ru/8.1/data-composition-system/schema',
    'http://v8.1c.ru/8.1/data-composition-system/settings',
    'http://v8.1c.ru/8.1/data/core',
    'http://v8.1c.ru/8.1/data/enterprise',
    'http://v8.1c.ru/8.1/data/enterprise/current-config',
    'http://v8.1c.ru/8.1/data/txted',
];

export const WEB_SERVICE_OTHER_KEYS = ['Namespace', 'XDTOPackages', 'DescriptorFileName'] as const;
export const WEB_SERVICE_SESSION_KEYS = ['ReuseSessions', 'SessionMaxAge'] as const;

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function valueText(value: unknown): string {
    if (typeof value === 'string') {
        return value.trim();
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const text = record['#text'] ?? record.text;
        return typeof text === 'string' ? text.trim() : '';
    }
    return '';
}

/** URI пакетов из свойства XDTOPackages, как его отдаёт парсер XML. */
export function readXdtoPackageUris(value: unknown): string[] {
    if (!value || typeof value !== 'object') {
        return [];
    }
    const record = value as Record<string, unknown>;
    const raw = record['xr:Item'] ?? record.Item;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return items
        .map((item) => {
            if (!item || typeof item !== 'object') {
                return '';
            }
            const row = item as Record<string, unknown>;
            return valueText(row['xr:Value'] ?? row.Value);
        })
        .filter(Boolean);
}

/** Собирает XDTOPackages обратно в структуру xr:Item, сохраняя шаблон уже записанного элемента. */
export function writeXdtoPackageUris(previous: unknown, uris: string[]): Record<string, unknown> {
    const record = previous && typeof previous === 'object' ? previous as Record<string, unknown> : {};
    const raw = record['xr:Item'] ?? record.Item;
    const existing = Array.isArray(raw) ? raw[0] : raw;
    const template = existing && typeof existing === 'object'
        ? existing as Record<string, unknown>
        : { 'xr:Presentation': '', 'xr:CheckState': '0', 'xr:Value': '' };

    const items = uris.map((uri) => {
        const item = { ...template };
        const current = item['xr:Value'] ?? item.Value;
        if (current && typeof current === 'object') {
            item['xr:Value'] = { ...(current as Record<string, unknown>), '#text': uri };
            delete item.Value;
        } else {
            item['xr:Value'] = uri;
            delete item.Value;
        }
        return item;
    });

    if (items.length === 0) {
        return {};
    }
    return { 'xr:Item': items.length === 1 ? items[0] : items };
}

function operationBlock(xml: string, uuid: string): { start: number; end: number; block: string } | null {
    const marker = `uuid="${uuid}"`;
    const at = xml.indexOf(marker);
    if (at < 0) {
        return null;
    }
    const start = xml.lastIndexOf('<Operation', at);
    const end = xml.indexOf('</Operation>', at);
    if (start < 0 || end < 0) {
        return null;
    }
    const close = end + '</Operation>'.length;
    return { start, end: close, block: xml.slice(start, close) };
}

function tagText(block: string, tag: string): string {
    const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`));
    return match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
}

function replaceTag(block: string, tag: string, value: string): string {
    const pattern = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>|<${tag}\\s*/>`);
    return block.replace(pattern, `<${tag}>${escapeXml(value)}</${tag}>`);
}

function replaceSynonym(block: string, synonym: string): string {
    const empty = '<Synonym/>';
    const pattern = /<Synonym\b[^>]*>[\s\S]*?<\/Synonym>|<Synonym\s*\/>/;
    if (!synonym.trim()) {
        return block.replace(pattern, empty);
    }
    const filled = `<Synonym><v8:item><v8:lang>ru</v8:lang><v8:content>${escapeXml(synonym)}</v8:content></v8:item></Synonym>`;
    if (pattern.test(block)) {
        return block.replace(pattern, filled);
    }
    return block;
}

export function readWebServiceOperations(xml: string): WebServiceOperation[] {
    if (!xml) {
        return [];
    }
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    return Array.from(doc.getElementsByTagName('Operation')).map((element) => {
        const properties = Array.from(element.children).find((child) => child.localName === 'Properties');
        const block = properties ? properties.outerHTML : '';
        const synonymNode = properties
            ? Array.from(properties.getElementsByTagName('v8:content'))[0]
            : undefined;
        return {
            uuid: element.getAttribute('uuid') || '',
            name: tagText(block, 'Name'),
            synonym: synonymNode?.textContent?.trim() || '',
            comment: tagText(block, 'Comment'),
            returnType: tagText(block, 'XDTOReturningValueType'),
            nillable: tagText(block, 'Nillable') === 'true',
            transactioned: tagText(block, 'Transactioned') === 'true',
            procedureName: tagText(block, 'ProcedureName'),
            dataLockControlMode: tagText(block, 'DataLockControlMode') || 'Managed',
        };
    }).filter((operation) => operation.uuid);
}

export function updateWebServiceOperation(xml: string, operation: WebServiceOperation): string {
    const found = operationBlock(xml, operation.uuid);
    if (!found) {
        return xml;
    }
    let block = found.block;
    block = replaceTag(block, 'Name', operation.name);
    block = replaceTag(block, 'Comment', operation.comment);
    block = replaceTag(block, 'XDTOReturningValueType', operation.returnType);
    block = replaceTag(block, 'Nillable', operation.nillable ? 'true' : 'false');
    block = replaceTag(block, 'Transactioned', operation.transactioned ? 'true' : 'false');
    block = replaceTag(block, 'ProcedureName', operation.procedureName);
    block = replaceTag(block, 'DataLockControlMode', operation.dataLockControlMode);
    block = replaceSynonym(block, operation.synonym);
    return xml.slice(0, found.start) + block + xml.slice(found.end);
}

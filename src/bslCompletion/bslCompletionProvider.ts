/**
 * Автодополнение BSL: справочник синтаксиса и имена объектов текущей выгрузки.
 * Список открывается при наборе слова и после точки.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface SyntaxMethod {
    name: string;
    signature?: string;
    description?: string;
    returns?: string;
}

interface SyntaxSide {
    methods?: SyntaxMethod[];
    properties?: Array<string | { name?: string }>;
}

interface SyntaxCatalog {
    ГлобальныйКонтекст?: {
        methods?: SyntaxMethod[];
        properties?: Array<string | { name?: string }>;
    };
    МакетыМетаданных?: Record<string, Record<string, SyntaxSide>>;
}

const KEYWORDS = [
    'Процедура', 'КонецПроцедуры', 'Функция', 'КонецФункции',
    'Если', 'Тогда', 'Иначе', 'ИначеЕсли', 'КонецЕсли',
    'Для', 'Каждого', 'Из', 'Цикл', 'КонецЦикла', 'По', 'Пока',
    'Попытка', 'Исключение', 'КонецПопытки',
    'Перем', 'Экспорт', 'Возврат', 'Продолжить', 'Прервать', 'Перейти',
    'Новый', 'Знач', 'Неопределено', 'Истина', 'Ложь', 'NULL',
    'И', 'Или', 'Не', 'В', 'Как', 'Выполнить',
];

const MANAGERS = [
    'Справочники', 'Документы', 'РегистрыСведений', 'РегистрыНакопления',
    'РегистрыБухгалтерии', 'РегистрыРасчета', 'ПланыСчетов',
    'ПланыВидовХарактеристик', 'ПланыВидовРасчета', 'ПланыОбмена',
    'Перечисления', 'БизнесПроцессы', 'Задачи', 'ЖурналыДокументов',
    'Последовательности', 'Константы', 'Обработки', 'Отчеты',
];

const FOLDER_BY_MANAGER: Record<string, string> = {
    Справочники: 'Catalogs',
    Документы: 'Documents',
    РегистрыСведений: 'InformationRegisters',
    РегистрыНакопления: 'AccumulationRegisters',
    РегистрыБухгалтерии: 'AccountingRegisters',
    РегистрыРасчета: 'CalculationRegisters',
    ПланыСчетов: 'ChartsOfAccounts',
    ПланыВидовХарактеристик: 'ChartsOfCharacteristicTypes',
    ПланыВидовРасчета: 'ChartsOfCalculationTypes',
    ПланыОбмена: 'ExchangePlans',
    Перечисления: 'Enums',
    БизнесПроцессы: 'BusinessProcesses',
    Задачи: 'Tasks',
    ЖурналыДокументов: 'DocumentJournals',
    Последовательности: 'Sequences',
    Константы: 'Constants',
    Обработки: 'DataProcessors',
    Отчеты: 'Reports',
};

const CREATE_METHODS = 'СоздатьЭлемент|СоздатьДокумент|СоздатьГруппу|СоздатьСчет|СоздатьВидРасчета|СоздатьУзел|СоздатьБизнесПроцесс|СоздатьЗадачу|Создать';
const REF_METHODS = 'НайтиПоКоду|НайтиПоНомеру|НайтиПоНаименованию|НайтиПоРеквизиту|ПолучитьСсылку|Получить|ПолучитьПервое|ПолучитьПоследнее|СрезПервых|СрезПоследних|Скопировать';
const SET_METHODS = 'СоздатьНаборЗаписей';

const TABULAR_METHODS = [
    'Вставить', 'Выгрузить', 'ВыгрузитьКолонки', 'ВыгрузитьКолонку', 'Добавить',
    'Загрузить', 'ЗагрузитьКолонку', 'Индекс', 'Итог', 'Количество', 'Найти',
    'НайтиСтроки', 'Очистить', 'Получить', 'Свернуть', 'Сдвинуть', 'Сортировать', 'Удалить',
];

const RECORDSET_METHODS = [
    'Отбор', 'Прочитать', 'Записать', 'Добавить', 'Количество', 'Выгрузить',
    'Загрузить', 'Очистить', 'Получить', 'Удалить', 'Индекс',
];

const WORD = '[A-Za-zА-Яа-яЁё_][0-9A-Za-zА-Яа-яЁё_]*';

type PlatformMember = [string, string, string];

interface PlatformTypeDef {
    methods: PlatformMember[];
    properties: PlatformMember[];
}

interface ResolvedPlatform {
    typeName: string;
    keys: string[];
}

let syntax: SyntaxCatalog | null = null;
let platformTypes: Record<string, PlatformTypeDef> | null = null;
const namesCache = new Map<string, { at: number; names: Map<string, string[]> }>();
const membersCache = new Map<string, { mtimeMs: number; attributes: string[]; tables: Map<string, string[]>; enumValues: string[] }>();

function loadSyntax(extensionPath: string): SyntaxCatalog {
    if (syntax) {
        return syntax;
    }
    const filePath = path.join(extensionPath, 'resources', 'bsl-syntax.json');
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        syntax = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw) as SyntaxCatalog;
    } catch {
        syntax = {};
    }
    return syntax;
}

function loadPlatformTypes(extensionPath: string): Record<string, PlatformTypeDef> {
    if (platformTypes) {
        return platformTypes;
    }
    const filePath = path.join(extensionPath, 'resources', 'bsl-platform-types.json');
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        platformTypes = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw) as Record<string, PlatformTypeDef>;
    } catch {
        platformTypes = {};
    }
    return platformTypes;
}

function canonicalPlatform(name: string): string {
    const types = platformTypes || {};
    return Object.keys(types).find((key) => key.toLowerCase() === name.toLowerCase()) || '';
}

function findConfigRoot(filePath: string): string | null {
    let dir = path.dirname(filePath);
    for (let i = 0; i < 8; i++) {
        if (fs.existsSync(path.join(dir, 'Configuration.xml'))) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            break;
        }
        dir = parent;
    }
    return null;
}

function objectNames(configRoot: string, manager: string): string[] {
    const now = Date.now();
    let cached = namesCache.get(configRoot);
    if (!cached || now - cached.at > 5000) {
        const names = new Map<string, string[]>();
        for (const [collection, folder] of Object.entries(FOLDER_BY_MANAGER)) {
            const dir = path.join(configRoot, folder);
            let files: string[] = [];
            try {
                files = fs.readdirSync(dir)
                    .filter((file) => file.toLowerCase().endsWith('.xml'))
                    .map((file) => file.slice(0, -4));
            } catch {
                files = [];
            }
            names.set(collection, files.sort((a, b) => a.localeCompare(b, 'ru')));
        }
        cached = { at: now, names };
        namesCache.set(configRoot, cached);
    }
    return cached.names.get(manager) || [];
}

function memberNames(configRoot: string, manager: string, objectName: string): { attributes: string[]; tables: Map<string, string[]>; enumValues: string[] } {
    const empty = { attributes: [] as string[], tables: new Map<string, string[]>(), enumValues: [] as string[] };
    const folder = FOLDER_BY_MANAGER[manager];
    if (!folder) {
        return empty;
    }
    const filePath = path.join(configRoot, folder, `${objectName}.xml`);
    let stat: fs.Stats;
    try {
        stat = fs.statSync(filePath);
    } catch {
        return empty;
    }
    const cached = membersCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
        return cached;
    }
    const xml = fs.readFileSync(filePath, 'utf8');
    const parts = xml.split(/<TabularSection\b/);
    const tables = new Map<string, string[]>();
    for (let i = 1; i < parts.length; i++) {
        const name = parts[i].match(/<Name>([^<]+)<\/Name>/);
        const end = parts[i].search(/<\/TabularSection>/);
        const body = end >= 0 ? parts[i].slice(0, end) : parts[i];
        if (name) {
            tables.set(name[1], collectTagNames(body, 'Attribute'));
        }
    }
    const result = {
        mtimeMs: stat.mtimeMs,
        attributes: collectTagNames(parts[0], 'Attribute'),
        tables,
        enumValues: collectTagNames(xml, 'EnumValue'),
    };
    membersCache.set(filePath, result);
    return result;
}

function collectTagNames(xml: string, tag: string): string[] {
    const re = new RegExp(`<${tag}\\b[\\s\\S]*?<Name>([^<]+)</Name>`, 'g');
    const names: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = re.exec(xml)) !== null) {
        if (!names.includes(match[1])) {
            names.push(match[1]);
        }
    }
    return names;
}

function propName(value: string | { name?: string }): string {
    return typeof value === 'string' ? value : (value.name || '');
}

function startsWith(value: string, prefix: string): boolean {
    return value.toLowerCase().startsWith(prefix.toLowerCase());
}

function item(
    label: string,
    kind: vscode.CompletionItemKind,
    range: vscode.Range,
    insert: string,
    detail?: string
): vscode.CompletionItem {
    const completion = new vscode.CompletionItem(label, kind);
    completion.insertText = insert;
    completion.range = range;
    completion.filterText = label;
    completion.sortText = label.toLowerCase();
    if (detail) {
        completion.detail = detail;
    }
    return completion;
}

function methodItems(methods: SyntaxMethod[] | undefined, prefix: string, range: vscode.Range): vscode.CompletionItem[] {
    const list: vscode.CompletionItem[] = [];
    for (const method of methods || []) {
        if (!method.name || !startsWith(method.name, prefix)) {
            continue;
        }
        list.push(item(
            method.name,
            vscode.CompletionItemKind.Method,
            range,
            `${method.name}(`,
            method.signature || method.description
        ));
    }
    return list;
}

function sideOf(catalog: SyntaxCatalog, manager: string, typeName: string): SyntaxSide | undefined {
    return catalog.МакетыМетаданных?.[manager]?.[typeName];
}

function inCommentOrString(lineBefore: string): boolean {
    const withoutStrings = lineBefore.replace(/"(?:[^"]|"")*"/g, '""');
    if (withoutStrings.includes('//')) {
        return true;
    }
    const quotes = lineBefore.match(/"/g);
    return !!quotes && quotes.length % 2 === 1;
}

function lastAssignment(text: string, varName: string): string | null {
    const re = new RegExp(`(?:^|[\\r\\n;])[ \\t]*${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*=[ \\t]*([^\\r\\n;]+)`, 'gi');
    let last: string | null = null;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        last = match[1].trim();
    }
    return last;
}

type MemberKind = 'manager' | 'object' | 'ref' | 'recordSet' | 'tabular';

function classifyCall(rhs: string): { manager: string; objectName: string; kind: MemberKind; tabName?: string } | null {
    const managers = MANAGERS.join('|');
    const call = rhs.match(new RegExp(`^(${managers})\\.(${WORD})\\.(${WORD})`, 'i'));
    if (!call) {
        const bare = rhs.match(new RegExp(`^(${managers})\\.(${WORD})\\s*$`, 'i'));
        if (bare) {
            return { manager: canonicalManager(bare[1]), objectName: bare[2], kind: 'manager' };
        }
        return null;
    }
    const method = call[3];
    let kind: MemberKind = 'manager';
    if (new RegExp(`^(?:${CREATE_METHODS})$`, 'i').test(method)) {
        kind = 'object';
    } else if (new RegExp(`^(?:${REF_METHODS})$`, 'i').test(method) || /^ПустаяСсылка$/i.test(method)) {
        kind = 'ref';
    } else if (new RegExp(`^(?:${SET_METHODS})$`, 'i').test(method)) {
        kind = 'recordSet';
    }
    return { manager: canonicalManager(call[1]), objectName: call[2], kind };
}

function canonicalManager(name: string): string {
    return MANAGERS.find((manager) => manager.toLowerCase() === name.toLowerCase()) || name;
}

export function registerBslCompletion(context: vscode.ExtensionContext): void {
    const catalog = loadSyntax(context.extensionPath);
    loadPlatformTypes(context.extensionPath);
    const trigger = ['.', '_'].concat(
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        'абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('')
    );
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            [{ language: 'bsl' }, { language: '1c' }, { pattern: '**/*.bsl' }],
            {
                provideCompletionItems(document, position) {
                    const line = document.lineAt(position.line).text;
                    const before = line.slice(0, position.character);
                    if (inCommentOrString(before)) {
                        return undefined;
                    }
                    const wordMatch = before.match(new RegExp(`${WORD}$`));
                    const word = wordMatch ? wordMatch[0] : '';
                    const start = position.character - word.length;
                    const range = new vscode.Range(position.line, start, position.line, position.character);
                    const stem = before.slice(0, start);
                    const configRoot = findConfigRoot(document.uri.fsPath);
                    const head = document.getText(new vscode.Range(new vscode.Position(Math.max(0, position.line - 400), 0), position));

                    if (stem.endsWith('.')) {
                        return afterDot(catalog, configRoot, stem, word, range, head);
                    }
                    if (/Новый\s+$/i.test(stem)) {
                        return platformTypeNames(word, range);
                    }

                    return globalCompletion(catalog, head, word, range);
                },
            },
            ...trigger
        )
    );
}

function constructorKeys(expr: string): string[] {
    const match = expr.match(/^Новый\s+(?:Фиксированная)?Структура\s*\(\s*"([^"]*)"/i);
    if (!match) {
        return [];
    }
    return match[1]
        .split(',')
        .map((part) => part.trim())
        .filter((part) => new RegExp(`^${WORD}$`).test(part));
}

function splitCall(expr: string): { base: string; method: string } | null {
    if (!expr.endsWith(')')) {
        return null;
    }
    let depth = 0;
    for (let i = expr.length - 1; i >= 0; i--) {
        const char = expr[i];
        if (char === ')') {
            depth++;
        } else if (char === '(') {
            depth--;
            if (depth === 0) {
                const head = expr.slice(0, i).replace(/\s+$/, '');
                const match = head.match(new RegExp(`^(.*?)\\.(${WORD})$`));
                if (!match) {
                    return null;
                }
                return { base: match[1].trim(), method: match[2] };
            }
        }
    }
    return null;
}

function resolvePlatform(expr: string, head: string, depth: number): ResolvedPlatform | null {
    if (depth > 8) {
        return null;
    }
    const text = expr.trim();
    if (!text || !platformTypes) {
        return null;
    }
    const constructed = text.match(new RegExp(`^Новый\\s+(${WORD})`, 'i'));
    if (constructed) {
        const typeName = canonicalPlatform(constructed[1]);
        return typeName ? { typeName, keys: constructorKeys(text) } : null;
    }
    const call = splitCall(text);
    if (call) {
        const base = resolvePlatform(call.base, head, depth + 1);
        const method = base
            ? platformTypes[base.typeName].methods.find((row) => row[0].toLowerCase() === call.method.toLowerCase())
            : undefined;
        const typeName = method && method[2] ? canonicalPlatform(method[2]) : '';
        return typeName ? { typeName, keys: [] } : null;
    }
    const dotted = text.match(new RegExp(`^(.*)\\.(${WORD})$`));
    if (dotted) {
        const base = resolvePlatform(dotted[1], head, depth + 1);
        if (!base) {
            return null;
        }
        if (base.keys.some((key) => key.toLowerCase() === dotted[2].toLowerCase())) {
            return null;
        }
        const property = platformTypes[base.typeName].properties.find((row) => row[0].toLowerCase() === dotted[2].toLowerCase());
        const typeName = property && property[1] ? canonicalPlatform(property[1]) : '';
        return typeName ? { typeName, keys: [] } : null;
    }
    if (new RegExp(`^${WORD}$`).test(text)) {
        const rhs = lastAssignment(head, text);
        return rhs ? resolvePlatform(rhs, head, depth + 1) : null;
    }
    return null;
}

function platformItems(left: string, head: string, prefix: string, range: vscode.Range): vscode.CompletionItem[] {
    const resolved = resolvePlatform(left, head, 0);
    if (!resolved || !platformTypes) {
        return [];
    }
    const def = platformTypes[resolved.typeName];
    const list: vscode.CompletionItem[] = [];
    for (const [name, signature] of def.methods) {
        if (startsWith(name, prefix)) {
            list.push(item(name, vscode.CompletionItemKind.Method, range, `${name}(`, signature || resolved.typeName));
        }
    }
    for (const [name, typeName] of def.properties) {
        if (name && !name.startsWith('<') && startsWith(name, prefix)) {
            list.push(item(name, vscode.CompletionItemKind.Field, range, name, typeName || resolved.typeName));
        }
    }
    for (const key of resolved.keys) {
        if (startsWith(key, prefix) && !list.some((entry) => String(entry.label).toLowerCase() === key.toLowerCase())) {
            list.push(item(key, vscode.CompletionItemKind.Field, range, key, 'ключ'));
        }
    }
    return list;
}

function platformTypeNames(prefix: string, range: vscode.Range): vscode.CompletionItem[] {
    return Object.keys(platformTypes || {})
        .filter((name) => startsWith(name, prefix))
        .map((name) => item(name, vscode.CompletionItemKind.Class, range, name, 'Новый'));
}

function afterDot(
    catalog: SyntaxCatalog,
    configRoot: string | null,
    stem: string,
    word: string,
    range: vscode.Range,
    head: string
): vscode.CompletionItem[] {
    const left = stem.slice(0, -1).replace(/\s+$/, '');
    const managers = MANAGERS.join('|');
    const onlyManager = left.match(new RegExp(`^(${managers})$`, 'i'));
    if (onlyManager) {
        const manager = canonicalManager(onlyManager[1]);
        const names = configRoot ? objectNames(configRoot, manager) : [];
        return names
            .filter((name) => startsWith(name, word))
            .map((name) => item(name, vscode.CompletionItemKind.Class, range, name, manager));
    }
    const managerObject = left.match(new RegExp(`^(${managers})\\.(${WORD})$`, 'i'));
    if (managerObject) {
        return membersOf(catalog, configRoot, canonicalManager(managerObject[1]), managerObject[2], 'manager', word, range);
    }
    const call = left.match(new RegExp(`(${managers})\\.(${WORD})\\.(${WORD})\\s*\\([^)]*\\)\\s*$`, 'i'));
    if (call) {
        const classified = classifyCall(`${call[1]}.${call[2]}.${call[3]}`);
        if (classified) {
            return membersOf(catalog, configRoot, classified.manager, classified.objectName, classified.kind, word, range);
        }
    }
    const three = left.match(new RegExp(`(${managers})\\.(${WORD})\\.(${WORD})$`, 'i'));
    if (three && configRoot) {
        const manager = canonicalManager(three[1]);
        const columns = memberNames(configRoot, manager, three[2]).tables.get(three[3]);
        if (columns) {
            return tabularItems(columns, word, range);
        }
    }
    const variable = left.match(new RegExp(`(${WORD})$`));
    if (variable && !MANAGERS.some((manager) => manager.toLowerCase() === variable[1].toLowerCase())) {
        const rhs = lastAssignment(head, variable[1]);
        const classified = rhs ? classifyCall(rhs) : null;
        if (classified) {
            return membersOf(catalog, configRoot, classified.manager, classified.objectName, classified.kind, word, range);
        }
    }
    return platformItems(left, head, word, range);
}

function membersOf(
    catalog: SyntaxCatalog,
    configRoot: string | null,
    manager: string,
    objectName: string,
    kind: MemberKind,
    prefix: string,
    range: vscode.Range,
    extra?: string
): vscode.CompletionItem[] {
    if (kind === 'recordSet') {
        return RECORDSET_METHODS.filter((name) => startsWith(name, prefix)).map((name) =>
            item(name, name === 'Отбор' ? vscode.CompletionItemKind.Field : vscode.CompletionItemKind.Method, range, name === 'Отбор' ? name : `${name}(`, 'набор записей')
        );
    }
    if (kind === 'tabular') {
        const members = configRoot ? memberNames(configRoot, manager, objectName) : null;
        const columns = extra && members ? (members.tables.get(extra) || []) : [];
        return tabularItems(columns, prefix, range);
    }
    const sideName = kind === 'object' ? 'object' : kind === 'ref' ? 'ref' : 'manager';
    const side = sideOf(catalog, manager, sideName);
    const list = methodItems(side?.methods, prefix, range);
    if (manager === 'Перечисления' && kind === 'manager' && configRoot) {
        for (const value of memberNames(configRoot, manager, objectName).enumValues) {
            if (startsWith(value, prefix)) {
                list.push(item(value, vscode.CompletionItemKind.EnumMember, range, value, 'значение'));
            }
        }
    }
    if ((kind === 'object' || kind === 'ref') && configRoot) {
        const members = memberNames(configRoot, manager, objectName);
        for (const name of members.attributes) {
            if (startsWith(name, prefix)) {
                list.push(item(name, vscode.CompletionItemKind.Field, range, name, 'реквизит'));
            }
        }
        if (kind === 'object') {
            for (const name of members.tables.keys()) {
                if (startsWith(name, prefix)) {
                    list.push(item(name, vscode.CompletionItemKind.Struct, range, name, 'табличная часть'));
                }
            }
        }
        for (const property of side?.properties || []) {
            const name = propName(property);
            if (name && startsWith(name, prefix)) {
                list.push(item(name, vscode.CompletionItemKind.Field, range, name, 'свойство'));
            }
        }
    }
    return list;
}

function tabularItems(columns: string[], prefix: string, range: vscode.Range): vscode.CompletionItem[] {
    const list = TABULAR_METHODS.filter((name) => startsWith(name, prefix)).map((name) =>
        item(name, vscode.CompletionItemKind.Method, range, `${name}(`, 'табличная часть')
    );
    for (const name of columns) {
        if (startsWith(name, prefix)) {
            list.push(item(name, vscode.CompletionItemKind.Field, range, name, 'колонка'));
        }
    }
    if (startsWith('НомерСтроки', prefix)) {
        list.push(item('НомерСтроки', vscode.CompletionItemKind.Field, range, 'НомерСтроки', 'Число'));
    }
    return list;
}

function globalCompletion(
    catalog: SyntaxCatalog,
    head: string,
    word: string,
    range: vscode.Range
): vscode.CompletionItem[] {
    if (!word) {
        return [];
    }
    const list: vscode.CompletionItem[] = [];
    const seen = new Set<string>();
    const push = (completion: vscode.CompletionItem) => {
        const key = `${completion.kind}:${completion.label}`;
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        list.push(completion);
    };

    for (const keyword of KEYWORDS) {
        if (startsWith(keyword, word)) {
            push(item(keyword, vscode.CompletionItemKind.Keyword, range, keyword));
        }
    }
    for (const manager of MANAGERS) {
        if (startsWith(manager, word)) {
            push(item(manager, vscode.CompletionItemKind.Module, range, manager));
        }
    }

    const assignRe = new RegExp(`(?:^|[\\r\\n;])[ \\t]*(${WORD})[ \\t]*=`, 'g');
    let match: RegExpExecArray | null;
    while ((match = assignRe.exec(head)) !== null) {
        if (startsWith(match[1], word)) {
            push(item(match[1], vscode.CompletionItemKind.Variable, range, match[1], 'переменная'));
        }
    }

    const lines = head.split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
        const trimmed = lines[i].trim();
        const params = trimmed.match(/^(?:Процедура|Функция|Procedure|Function)\s+[^(]+\(([^)]*)\)/i);
        if (params) {
            for (const part of params[1].split(',')) {
                const name = part.replace(/^(Знач|ByVal)\s+/i, '').split('=')[0].trim();
                if (name && startsWith(name, word)) {
                    push(item(name, vscode.CompletionItemKind.Variable, range, name, 'параметр'));
                }
            }
            break;
        }
        if (/^(КонецПроцедуры|КонецФункции|EndProcedure|EndFunction)/i.test(trimmed) && i !== lines.length - 1) {
            break;
        }
    }

    if (word.length >= 2) {
        const global = catalog.ГлобальныйКонтекст;
        for (const method of methodItems(global?.methods, word, range)) {
            push(method);
        }
        for (const property of global?.properties || []) {
            const name = propName(property);
            if (name && startsWith(name, word)) {
                push(item(name, vscode.CompletionItemKind.Field, range, name, 'свойство'));
            }
        }
    }
    return list;
}

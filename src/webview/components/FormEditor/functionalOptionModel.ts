/**
 * Подписи и дерево состава функциональной опции.
 */

import type { FunctionalOptionMembers } from '../../../Metadata/types';

const TYPE_TITLE: Record<string, string> = {
    Subsystem: 'Подсистема',
    Constant: 'Константа',
    SessionParameter: 'Параметр сеанса',
    CommonCommand: 'Общая команда',
    CommonForm: 'Общая форма',
    CommonAttribute: 'Общий реквизит',
    FilterCriterion: 'Критерий отбора',
    ExchangePlan: 'План обмена',
    Catalog: 'Справочник',
    Document: 'Документ',
    DocumentJournal: 'Журнал документов',
    Enum: 'Перечисление',
    Report: 'Отчет',
    DataProcessor: 'Обработка',
    ChartOfCharacteristicTypes: 'План видов характеристик',
    ChartOfAccounts: 'План счетов',
    ChartOfCalculationTypes: 'План видов расчета',
    InformationRegister: 'Регистр сведений',
    AccumulationRegister: 'Регистр накопления',
    AccountingRegister: 'Регистр бухгалтерии',
    CalculationRegister: 'Регистр расчета',
    BusinessProcess: 'Бизнес-процесс',
    Task: 'Задача',
};

const SECTIONS: { title: string; refPrefix: string; meta: string }[] = [
    { title: 'Подсистемы', refPrefix: 'SubsystemRef', meta: 'Subsystem' },
    { title: 'Константы', refPrefix: 'ConstantRef', meta: 'Constant' },
    { title: 'Параметры сеанса', refPrefix: 'SessionParameterRef', meta: 'SessionParameter' },
    { title: 'Общие команды', refPrefix: 'CommonCommandRef', meta: 'CommonCommand' },
    { title: 'Общие формы', refPrefix: 'CommonFormRef', meta: 'CommonForm' },
    { title: 'Общие реквизиты', refPrefix: 'CommonAttributeRef', meta: 'CommonAttribute' },
    { title: 'Критерии отбора', refPrefix: 'FilterCriterionRef', meta: 'FilterCriterion' },
    { title: 'Планы обмена', refPrefix: 'ExchangePlanRef', meta: 'ExchangePlan' },
    { title: 'Справочники', refPrefix: 'CatalogRef', meta: 'Catalog' },
    { title: 'Документы', refPrefix: 'DocumentRef', meta: 'Document' },
    { title: 'Журналы документов', refPrefix: 'DocumentJournalRef', meta: 'DocumentJournal' },
    { title: 'Перечисления', refPrefix: 'EnumRef', meta: 'Enum' },
    { title: 'Отчеты', refPrefix: 'ReportRef', meta: 'Report' },
    { title: 'Обработки', refPrefix: 'DataProcessorRef', meta: 'DataProcessor' },
    { title: 'Планы видов характеристик', refPrefix: 'ChartOfCharacteristicTypesRef', meta: 'ChartOfCharacteristicTypes' },
    { title: 'Планы счетов', refPrefix: 'ChartOfAccountsRef', meta: 'ChartOfAccounts' },
    { title: 'Планы видов расчета', refPrefix: 'ChartOfCalculationTypesRef', meta: 'ChartOfCalculationTypes' },
    { title: 'Регистры сведений', refPrefix: 'InformationRegisterRef', meta: 'InformationRegister' },
    { title: 'Регистры накопления', refPrefix: 'AccumulationRegisterRef', meta: 'AccumulationRegister' },
    { title: 'Регистры бухгалтерии', refPrefix: 'AccountingRegisterRef', meta: 'AccountingRegister' },
    { title: 'Регистры расчета', refPrefix: 'CalculationRegisterRef', meta: 'CalculationRegister' },
    { title: 'Бизнес-процессы', refPrefix: 'BusinessProcessRef', meta: 'BusinessProcess' },
    { title: 'Задачи', refPrefix: 'TaskRef', meta: 'Task' },
];

export interface FunctionalOptionTreeNode {
    id: string;
    title: string;
    path?: string;
    children: FunctionalOptionTreeNode[];
}

export interface FunctionalOptionStorageOption {
    path: string;
    title: string;
    group: string;
}

export function readFunctionalOptionContent(value: unknown): string[] {
    if (!value || typeof value !== 'object') {
        return [];
    }
    const raw = (value as Record<string, unknown>)['xr:Object'];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return list.map((item) => {
        if (typeof item === 'string') {
            return item.trim();
        }
        if (item && typeof item === 'object') {
            const text = (item as Record<string, unknown>)['#text'] ?? (item as Record<string, unknown>).text;
            return typeof text === 'string' ? text.trim() : '';
        }
        return '';
    }).filter(Boolean);
}

export function writeFunctionalOptionContent(paths: string[]): { 'xr:Object': string[] } {
    return { 'xr:Object': paths };
}

export function functionalOptionStorageLabel(path: string): string {
    const parts = path.split('.').filter(Boolean);
    if (parts.length === 0) {
        return '';
    }
    const typeTitle = TYPE_TITLE[parts[0]] || parts[0];
    if (parts.length === 2) {
        return `${typeTitle} ${parts[1]}`;
    }
    if (parts.length === 4) {
        return `${typeTitle} ${parts[1]}.${parts[3]}`;
    }
    if (parts.length === 6 && parts[2] === 'TabularSection') {
        return `${typeTitle} ${parts[1]}.${parts[3]}.${parts[5]}`;
    }
    return path;
}

function objectNodes(meta: string, names: string[], membersByOwner: Map<string, FunctionalOptionMembers>): FunctionalOptionTreeNode[] {
    return names.map((name) => {
        const owner = `${meta}.${name}`;
        const members = membersByOwner.get(owner);
        const children: FunctionalOptionTreeNode[] = [];
        if (members?.attributes.length) {
            children.push({
                id: `${owner}.attributes`,
                title: 'Реквизиты',
                children: members.attributes.map((attr) => ({
                    id: `${owner}.Attribute.${attr}`,
                    title: attr,
                    path: `${owner}.Attribute.${attr}`,
                    children: [],
                })),
            });
        }
        if (members?.dimensions.length) {
            children.push({
                id: `${owner}.dimensions`,
                title: 'Измерения',
                children: members.dimensions.map((attr) => ({
                    id: `${owner}.Dimension.${attr}`,
                    title: attr,
                    path: `${owner}.Dimension.${attr}`,
                    children: [],
                })),
            });
        }
        if (members?.resources.length) {
            children.push({
                id: `${owner}.resources`,
                title: 'Ресурсы',
                children: members.resources.map((attr) => ({
                    id: `${owner}.Resource.${attr}`,
                    title: attr,
                    path: `${owner}.Resource.${attr}`,
                    children: [],
                })),
            });
        }
        if (members?.tabularSections.length) {
            children.push({
                id: `${owner}.tabular`,
                title: 'Табличные части',
                children: members.tabularSections.map((section) => ({
                    id: `${owner}.TabularSection.${section.name}`,
                    title: section.name,
                    path: `${owner}.TabularSection.${section.name}`,
                    children: section.attributes.map((attr) => ({
                        id: `${owner}.TabularSection.${section.name}.Attribute.${attr}`,
                        title: attr,
                        path: `${owner}.TabularSection.${section.name}.Attribute.${attr}`,
                        children: [],
                    })),
                })),
            });
        }
        if (members?.forms.length) {
            children.push({
                id: `${owner}.forms`,
                title: 'Формы',
                children: members.forms.map((form) => ({
                    id: `${owner}.Form.${form}`,
                    title: form,
                    path: `${owner}.Form.${form}`,
                    children: [],
                })),
            });
        }
        if (members?.commands.length) {
            children.push({
                id: `${owner}.commands`,
                title: 'Команды',
                children: members.commands.map((command) => ({
                    id: `${owner}.Command.${command}`,
                    title: command,
                    path: `${owner}.Command.${command}`,
                    children: [],
                })),
            });
        }
        return { id: owner, title: name, path: owner, children };
    });
}

export function buildFunctionalOptionTree(
    referenceTypes: string[],
    members: FunctionalOptionMembers[]
): FunctionalOptionTreeNode[] {
    const membersByOwner = new Map(members.map((item) => [item.owner, item]));
    const namesByPrefix = new Map<string, string[]>();
    for (const raw of referenceTypes) {
        const dot = raw.indexOf('.');
        if (dot < 0) {
            continue;
        }
        const prefix = raw.slice(0, dot);
        const name = raw.slice(dot + 1);
        const list = namesByPrefix.get(prefix) ?? [];
        list.push(name);
        namesByPrefix.set(prefix, list);
    }
    const sections: FunctionalOptionTreeNode[] = [];
    for (const section of SECTIONS) {
        const names = [...new Set(namesByPrefix.get(section.refPrefix) ?? [])].sort((a, b) => a.localeCompare(b, 'ru'));
        if (names.length === 0) {
            continue;
        }
        sections.push({
            id: `section:${section.meta}`,
            title: section.title,
            children: objectNodes(section.meta, names, membersByOwner),
        });
    }
    return sections;
}

export function functionalOptionStorageOptions(
    referenceTypes: string[],
    members: FunctionalOptionMembers[]
): FunctionalOptionStorageOption[] {
    const options: FunctionalOptionStorageOption[] = [];
    for (const raw of referenceTypes) {
        if (!raw.startsWith('ConstantRef.')) {
            continue;
        }
        const name = raw.slice('ConstantRef.'.length);
        options.push({
            path: `Constant.${name}`,
            title: `Константа ${name}`,
            group: 'Константы',
        });
    }
    for (const item of members) {
        const type = item.owner.split('.')[0];
        const typeTitle = TYPE_TITLE[type] || type;
        const objectName = item.owner.slice(type.length + 1);
        for (const attr of item.attributes) {
            options.push({
                path: `${item.owner}.Attribute.${attr}`,
                title: `${objectName}.${attr}`,
                group: `${typeTitle}: реквизиты`,
            });
        }
        for (const resource of item.resources) {
            options.push({
                path: `${item.owner}.Resource.${resource}`,
                title: `${objectName}.${resource}`,
                group: `${typeTitle}: ресурсы`,
            });
        }
    }
    options.sort((a, b) => a.group.localeCompare(b.group, 'ru') || a.title.localeCompare(b.title, 'ru'));
    return options;
}

export function filterFunctionalOptionTree(nodes: FunctionalOptionTreeNode[], query: string): FunctionalOptionTreeNode[] {
    const text = query.trim().toLocaleLowerCase('ru');
    if (!text) {
        return nodes;
    }
    const visit = (node: FunctionalOptionTreeNode): FunctionalOptionTreeNode | null => {
        const children = node.children.map(visit).filter((child): child is FunctionalOptionTreeNode => child !== null);
        const self = node.title.toLocaleLowerCase('ru').includes(text) || (node.path || '').toLocaleLowerCase('ru').includes(text);
        if (!self && children.length === 0) {
            return null;
        }
        return { ...node, children };
    };
    return nodes.map(visit).filter((node): node is FunctionalOptionTreeNode => node !== null);
}

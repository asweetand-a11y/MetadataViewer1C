/**
 * Источники и события подписки на событие — как списки в конфигураторе.
 * Имя события в XML английское, подпись русская.
 */

export interface SubscriptionEvent {
    id: string;
    label: string;
}

const historyForm = { id: 'GenerateFromDataHistoryVersionProcessing', label: 'ОбработкаФормированияПоВерсииИсторииДанных' };
const historyAfter = { id: 'AfterWriteDataHistoryVersionProcessing', label: 'ОбработкаПослеЗаписиВерсииИсторииДанных' };

const copy = { id: 'OnCopy', label: 'ПриКопировании' };
const filling = { id: 'Filling', label: 'ОбработкаЗаполнения' };
const beforeWrite = { id: 'BeforeWrite', label: 'ПередЗаписью' };
const onWrite = { id: 'OnWrite', label: 'ПриЗаписи' };
const beforeDelete = { id: 'BeforeDelete', label: 'ПередУдалением' };
const fillCheck = { id: 'FillCheckProcessing', label: 'ОбработкаПроверкиЗаполнения' };
const newCode = { id: 'OnSetNewCode', label: 'ПриУстановкеНовогоКода' };
const newNumber = { id: 'OnSetNewNumber', label: 'ПриУстановкеНовогоНомера' };

const objectBase: SubscriptionEvent[] = [copy, filling, beforeWrite, onWrite, beforeDelete, fillCheck, historyForm];

const managerFull: SubscriptionEvent[] = [
    { id: 'ChoiceDataGetProcessing', label: 'ОбработкаПолученияДанныхВыбора' },
    { id: 'FormGetProcessing', label: 'ОбработкаПолученияФормы' },
    { id: 'PresentationFieldsGetProcessing', label: 'ОбработкаПолученияПолейПредставления' },
    { id: 'PresentationGetProcessing', label: 'ОбработкаПолученияПредставления' },
    historyAfter,
];

const managerFormOnly: SubscriptionEvent[] = [
    { id: 'FormGetProcessing', label: 'ОбработкаПолученияФормы' },
];

const recordSetShort: SubscriptionEvent[] = [beforeWrite, onWrite, fillCheck];

export const SUBSCRIPTION_EVENTS: Record<string, SubscriptionEvent[]> = {
    CatalogObject: [newCode, ...objectBase],
    ChartOfCharacteristicTypesObject: [newCode, ...objectBase],
    ExchangePlanObject: [newCode, ...objectBase],
    DocumentObject: [
        newNumber, copy, filling, beforeWrite, onWrite, beforeDelete,
        { id: 'Posting', label: 'ОбработкаПроведения' },
        { id: 'UndoPosting', label: 'ОбработкаУдаленияПроведения' },
        fillCheck, historyForm,
    ],
    ChartOfAccountsObject: objectBase,
    ChartOfCalculationTypesObject: objectBase,
    BusinessProcessObject: [
        newNumber, copy, filling, beforeWrite, onWrite, beforeDelete,
        { id: 'InteractiveActivationProcessing', label: 'ОбработкаИнтерактивнойАктивации' },
        fillCheck, historyForm,
    ],
    TaskObject: [
        newNumber, copy, filling, beforeWrite, onWrite, beforeDelete,
        { id: 'InteractiveActivationProcessing', label: 'ОбработкаИнтерактивнойАктивации' },
        { id: 'CheckExecutionProcessing', label: 'ОбработкаПроверкиВыполнения' },
        { id: 'BeforeExecute', label: 'ПередВыполнением' },
        { id: 'BeforeInteractiveExecute', label: 'ПередИнтерактивнымВыполнением' },
        fillCheck, historyForm,
    ],
    InformationRegisterRecordSet: [beforeWrite, onWrite, filling, fillCheck, historyForm],
    AccumulationRegisterRecordSet: recordSetShort,
    AccountingRegisterRecordSet: recordSetShort,
    CalculationRegisterRecordSet: recordSetShort,
    CatalogManager: managerFull,
    DocumentManager: managerFull,
    ChartOfCharacteristicTypesManager: managerFull,
    ChartOfAccountsManager: managerFull,
    ChartOfCalculationTypesManager: managerFull,
    BusinessProcessManager: managerFull,
    TaskManager: managerFull,
    ExchangePlanManager: managerFull,
    EnumManager: [
        { id: 'ChoiceDataGetProcessing', label: 'ОбработкаПолученияДанныхВыбора' },
        { id: 'FormGetProcessing', label: 'ОбработкаПолученияФормы' },
    ],
    ReportManager: managerFormOnly,
    DataProcessorManager: managerFormOnly,
    InformationRegisterManager: [managerFormOnly[0], historyAfter],
    AccumulationRegisterManager: managerFormOnly,
    AccountingRegisterManager: managerFormOnly,
    CalculationRegisterManager: managerFormOnly,
};

export const SOURCE_PREFIX_LABEL: Record<string, string> = {
    CatalogObject: 'Справочник (объект)',
    CatalogManager: 'Справочник (менеджер)',
    DocumentObject: 'Документ (объект)',
    DocumentManager: 'Документ (менеджер)',
    EnumManager: 'Перечисление (менеджер)',
    ChartOfCharacteristicTypesObject: 'План видов характеристик (объект)',
    ChartOfCharacteristicTypesManager: 'План видов характеристик (менеджер)',
    ChartOfAccountsObject: 'План счетов (объект)',
    ChartOfAccountsManager: 'План счетов (менеджер)',
    ChartOfCalculationTypesObject: 'План видов расчета (объект)',
    ChartOfCalculationTypesManager: 'План видов расчета (менеджер)',
    BusinessProcessObject: 'Бизнес-процесс (объект)',
    BusinessProcessManager: 'Бизнес-процесс (менеджер)',
    TaskObject: 'Задача (объект)',
    TaskManager: 'Задача (менеджер)',
    ExchangePlanObject: 'План обмена (объект)',
    ExchangePlanManager: 'План обмена (менеджер)',
    ReportManager: 'Отчет (менеджер)',
    DataProcessorManager: 'Обработка (менеджер)',
    InformationRegisterRecordSet: 'Регистр сведений (набор записей)',
    InformationRegisterManager: 'Регистр сведений (менеджер)',
    AccumulationRegisterRecordSet: 'Регистр накопления (набор записей)',
    AccumulationRegisterManager: 'Регистр накопления (менеджер)',
    AccountingRegisterRecordSet: 'Регистр бухгалтерии (набор записей)',
    AccountingRegisterManager: 'Регистр бухгалтерии (менеджер)',
    CalculationRegisterRecordSet: 'Регистр расчета (набор записей)',
    CalculationRegisterManager: 'Регистр расчета (менеджер)',
};

/** Из ссылочного типа конфигурации получаем виды источника подписки. */
const REF_TO_SOURCE_PREFIXES: Record<string, string[]> = {
    CatalogRef: ['CatalogObject', 'CatalogManager'],
    DocumentRef: ['DocumentObject', 'DocumentManager'],
    EnumRef: ['EnumManager'],
    ChartOfCharacteristicTypesRef: ['ChartOfCharacteristicTypesObject', 'ChartOfCharacteristicTypesManager'],
    ChartOfAccountsRef: ['ChartOfAccountsObject', 'ChartOfAccountsManager'],
    ChartOfCalculationTypesRef: ['ChartOfCalculationTypesObject', 'ChartOfCalculationTypesManager'],
    BusinessProcessRef: ['BusinessProcessObject', 'BusinessProcessManager'],
    TaskRef: ['TaskObject', 'TaskManager'],
    ExchangePlanRef: ['ExchangePlanObject', 'ExchangePlanManager'],
    ReportRef: ['ReportManager'],
    DataProcessorRef: ['DataProcessorManager'],
    InformationRegisterRecordSet: ['InformationRegisterRecordSet'],
    InformationRegisterManager: ['InformationRegisterManager'],
    AccumulationRegisterRecordSet: ['AccumulationRegisterRecordSet'],
    AccumulationRegisterManager: ['AccumulationRegisterManager'],
    AccountingRegisterRecordSet: ['AccountingRegisterRecordSet'],
    AccountingRegisterManager: ['AccountingRegisterManager'],
    CalculationRegisterRecordSet: ['CalculationRegisterRecordSet'],
    CalculationRegisterManager: ['CalculationRegisterManager'],
};

export interface SubscriptionSourceOption {
    /** cfg:CatalogObject.Валюты */
    value: string;
    /** Валюты — справочник (объект) */
    label: string;
    /** Валюты */
    objectName: string;
    /** Справочник (объект) */
    typeTitle: string;
    prefix: string;
}

export function subscriptionSourceOptions(referenceTypes: string[]): SubscriptionSourceOption[] {
    const seen = new Set<string>();
    const options: SubscriptionSourceOption[] = [];
    for (const raw of referenceTypes) {
        if (typeof raw !== 'string') {
            continue;
        }
        const kind = raw.replace(/^cfg:/, '');
        const dot = kind.indexOf('.');
        if (dot < 0) {
            continue;
        }
        const refPrefix = kind.slice(0, dot);
        const name = kind.slice(dot + 1);
        const targets = REF_TO_SOURCE_PREFIXES[refPrefix];
        if (!targets) {
            continue;
        }
        for (const prefix of targets) {
            const value = `cfg:${prefix}.${name}`;
            if (seen.has(value)) {
                continue;
            }
            seen.add(value);
            const typeTitle = SOURCE_PREFIX_LABEL[prefix] || prefix;
            options.push({
                value,
                objectName: name,
                typeTitle,
                label: `${name} — ${typeTitle}`,
                prefix,
            });
        }
    }
    options.sort((a, b) => a.typeTitle.localeCompare(b.typeTitle, 'ru') || a.objectName.localeCompare(b.objectName, 'ru'));
    return options;
}

export function readSubscriptionSources(value: unknown): string[] {
    if (!value || typeof value !== 'object') {
        return [];
    }
    const raw = (value as Record<string, unknown>)['v8:Type'];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return list.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

export function writeSubscriptionSources(types: string[]): { 'v8:Type': string | string[] } {
    const normalized = types.map((type) => type.startsWith('cfg:') ? type : `cfg:${type}`);
    return { 'v8:Type': normalized.length === 1 ? normalized[0] : normalized };
}

export function sourcePrefix(type: string): string {
    const kind = type.replace(/^cfg:/, '');
    return kind.split('.')[0] || '';
}

export function eventsForSources(types: string[]): SubscriptionEvent[] {
    const prefix = types.length > 0 ? sourcePrefix(types[0]) : '';
    const known = SUBSCRIPTION_EVENTS[prefix] ?? [];
    return known;
}

export function eventLabel(eventId: string, types: string[]): string {
    const found = eventsForSources(types).find((event) => event.id === eventId);
    return found?.label || eventId;
}

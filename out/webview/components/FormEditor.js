"use strict";
/**
 * Компонент формы на основе JSON Schema Form
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormEditor = void 0;
const react_1 = __importStar(require("react"));
const core_1 = __importDefault(require("@rjsf/core"));
const validator_ajv8_1 = __importDefault(require("@rjsf/validator-ajv8"));
const schemaGenerator_1 = require("../../schemas/schemaGenerator");
const TypeWidget_1 = require("../widgets/TypeWidget");
const MultilingualWidget_1 = require("../widgets/MultilingualWidget");
const typeUtils_1 = require("../utils/typeUtils");
const AttributeTypeEditorModal_1 = require("./FormEditor/AttributeTypeEditorModal");
const AddAttributeToObjectModal_1 = require("./FormEditor/AddAttributeToObjectModal");
const AddTabularSectionModal_1 = require("./FormEditor/AddTabularSectionModal");
const AddTabularAttributeModal_1 = require("./FormEditor/AddTabularAttributeModal");
const EditTabularAttributeTypeModal_1 = require("./FormEditor/EditTabularAttributeTypeModal");
const RegisterRecordsEditorModal_1 = require("./FormEditor/RegisterRecordsEditorModal");
const ConfirmModal_1 = require("./FormEditor/ConfirmModal");
const EnumValueEditorModal_1 = require("./FormEditor/EnumValueEditorModal");
const SimpleMultilingualEditor_1 = require("./FormEditor/SimpleMultilingualEditor");
const CharacteristicTypeEditorModal_1 = require("./FormEditor/CharacteristicTypeEditorModal");
const AccountingFlagEditorModal_1 = require("./FormEditor/AccountingFlagEditorModal");
const field_values_1 = require("../../metadata/field-values");
const widgets = {
    TypeWidget: TypeWidget_1.TypeWidget,
    MultilingualWidget: MultilingualWidget_1.MultilingualWidget
};
/**
 * Свойства вкладки «Данные» плана счетов в конфигураторе 1С (порядок отображения).
 */
const CHART_OF_ACCOUNTS_DATA_PROPERTY_KEYS = [
    'CodeLength',
    'DescriptionLength',
    'CodeMask',
    'AutoOrderByCode',
    'OrderLength',
    'DefaultPresentation',
];
/** Свойства вкладки «Расчёт» конфигуратора для плана видов расчёта */
const CHART_OF_CALCULATION_TYPES_DATA_PROPERTY_KEYS = [
    'DependenceOnCalculationTypes',
    'BaseCalculationTypes',
    'ActionPeriodUse',
    'ScheduleValue',
];
/** Свойства регистра сведений (порядок как в конфигураторе, «Основные») */
const INFORMATION_REGISTER_PROPERTY_KEYS = [
    'InformationRegisterPeriodicity',
    'WriteMode',
    'MainFilterOnPeriod',
    'EnableTotalsSliceFirst',
    'EnableTotalsSliceLast',
    'RecordPresentation',
    'ExtendedRecordPresentation',
    'DefaultRecordForm',
    'AuxiliaryRecordForm',
    'UseStandardCommands',
    'IncludeHelpInContents',
    'DataLockControlMode',
    'FullTextSearch',
    'DataHistory',
    'UpdateDataHistoryImmediatelyAfterWrite',
    'ExecuteAfterWriteDataHistoryVersionProcessing',
    'ListPresentation',
    'ExtendedListPresentation',
    'Explanation',
    'EditType',
];
/** Свойства регистра накопления */
const ACCUMULATION_REGISTER_PROPERTY_KEYS = [
    'RegisterType',
    'EnableTotalsSplitting',
    'UseStandardCommands',
    'IncludeHelpInContents',
    'DataLockControlMode',
    'FullTextSearch',
    'ListPresentation',
    'ExtendedListPresentation',
    'Explanation',
    'DefaultListForm',
    'AuxiliaryListForm',
];
/** Свойства регистра бухгалтерии */
const ACCOUNTING_REGISTER_PROPERTY_KEYS = [
    'ChartOfAccounts',
    'Correspondence',
    'PeriodAdjustmentLength',
    'UseStandardCommands',
    'IncludeHelpInContents',
    'DataLockControlMode',
    'FullTextSearch',
    'RecordPresentation',
    'ExtendedRecordPresentation',
    'ListPresentation',
    'ExtendedListPresentation',
    'Explanation',
    'DefaultRecordForm',
    'AuxiliaryRecordForm',
    'DefaultListForm',
    'AuxiliaryListForm',
];
/** Свойства регистра расчёта */
const CALCULATION_REGISTER_PROPERTY_KEYS = [
    'Periodicity',
    'ActionPeriod',
    'BasePeriod',
    'Schedule',
    'ScheduleValue',
    'ScheduleDate',
    'ChartOfCalculationTypes',
    'UseStandardCommands',
    'IncludeHelpInContents',
    'DataLockControlMode',
    'FullTextSearch',
    'ListPresentation',
    'ExtendedListPresentation',
    'Explanation',
    'DefaultListForm',
    'AuxiliaryListForm',
];
/** Извлекает ссылки ChartOfCalculationTypes.<Имя> из свойства BaseCalculationTypes (formData). */
function extractBaseCalculationTypeRefs(raw) {
    if (!raw || typeof raw !== 'object') {
        return [];
    }
    const obj = raw;
    const items = obj['xr:Item'] ?? obj['Item'];
    if (items === undefined || items === null) {
        return [];
    }
    const list = Array.isArray(items) ? items : [items];
    const refs = [];
    for (const it of list) {
        if (typeof it === 'string') {
            const s = it.trim();
            if (s) {
                refs.push(s);
            }
        }
        else if (it && typeof it === 'object') {
            const t = it['#text'] ?? it.text;
            const s = String(t ?? '').trim();
            if (s) {
                refs.push(s);
            }
        }
    }
    return refs;
}
/** Значение BaseCalculationTypes для formData (сохранение через xmlDomUtils). */
function buildBaseCalculationTypesFormValue(refs) {
    if (refs.length === 0) {
        return { 'xr:Item': [] };
    }
    return {
        'xr:Item': refs.map((text) => ({
            type: 'xr:MDObjectRef',
            '#text': text
        }))
    };
}
/** Пары [ChartOfCalculationTypes.Имя, отображаемое имя] из метаданных webview. */
function collectChartOfCalculationPlanOptions(referenceTypes) {
    const map = new Map();
    for (const rt of referenceTypes || []) {
        if (typeof rt !== 'string') {
            continue;
        }
        const trimmed = rt.trim();
        const p = trimmed.startsWith('cfg:') ? trimmed.slice(4).trim() : trimmed;
        if (p.startsWith('ChartOfCalculationTypesRef.')) {
            const name = p.slice('ChartOfCalculationTypesRef.'.length);
            if (name) {
                map.set(`ChartOfCalculationTypes.${name}`, name);
            }
            continue;
        }
        if (p.startsWith('ChartOfCalculationTypes.') && !p.startsWith('ChartOfCalculationTypesRef.')) {
            const rest = p.slice('ChartOfCalculationTypes.'.length);
            if (rest && !rest.includes('.')) {
                map.set(`ChartOfCalculationTypes.${rest}`, rest);
            }
        }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ru'));
}
function collectChartOfCalculationPlanOptionsFromRegisters(registers) {
    const map = new Map();
    for (const r of registers || []) {
        if (typeof r !== 'string')
            continue;
        const p = r.startsWith('cfg:') ? r.slice(4) : r.trim();
        if (!p.startsWith('ChartOfCalculationTypes.'))
            continue;
        const rest = p.slice('ChartOfCalculationTypes.'.length);
        if (rest && !rest.includes('.'))
            map.set(`ChartOfCalculationTypes.${rest}`, rest);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ru'));
}
function mergeChartOfCalculationPlanOptionLists(a, b) {
    const map = new Map();
    for (const [ref, label] of [...a, ...b])
        map.set(ref, label);
    return [...map.entries()].sort((x, y) => x[1].localeCompare(y[1], 'ru'));
}
function calculationScheduleResourceRef(irRef, resourceName) {
    return `${irRef}.Resource.${resourceName}`;
}
function calculationScheduleDimensionRef(irRef, dimensionName) {
    return `${irRef}.Dimension.${dimensionName}`;
}
/** Пары [ChartOfAccounts.Имя, отображаемое имя] из метаданных webview. */
function collectChartOfAccountsPlanOptions(referenceTypes) {
    const map = new Map();
    for (const rt of referenceTypes || []) {
        if (typeof rt !== 'string') {
            continue;
        }
        const p = rt.startsWith('cfg:') ? rt.slice(4) : rt;
        if (!p.startsWith('ChartOfAccountsRef.')) {
            continue;
        }
        const name = p.slice('ChartOfAccountsRef.'.length);
        map.set(`ChartOfAccounts.${name}`, name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ru'));
}
/** Пары [имя документа, подпись] из DocumentRef в метаданных webview. */
function collectDocumentSelectOptions(referenceTypes) {
    const map = new Map();
    for (const rt of referenceTypes || []) {
        if (typeof rt !== 'string') {
            continue;
        }
        const p = rt.startsWith('cfg:') ? rt.slice(4) : rt;
        if (!p.startsWith('DocumentRef.')) {
            continue;
        }
        const name = p.slice('DocumentRef.'.length);
        if (name) {
            map.set(name, name);
        }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ru'));
}
/** Генерирует UUID через Web Crypto API или простой fallback (webview/браузер). */
function getRandomUUID() {
    const c = globalThis?.crypto;
    if (typeof c?.randomUUID === 'function')
        return c.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
const FormEditor = ({ objectType, formData, onChange, metadata, activeTab = 'properties', selectedObject, onSelectedObjectChange }) => {
    // Состояния для модальных окон табличных частей (всегда на верхнем уровне)
    // ВАЖНО: Все модальные окна должны быть скрыты по умолчанию
    const [showAddTabularModal, setShowAddTabularModal] = (0, react_1.useState)(false);
    const [showAddAttributeModal, setShowAddAttributeModal] = (0, react_1.useState)(null);
    const [editingAttribute, setEditingAttribute] = (0, react_1.useState)(null);
    // Состояние для редактирования типа реквизита (не табличной части)
    const [editingAttributeType, setEditingAttributeType] = (0, react_1.useState)(null);
    // Состояние для модального окна добавления реквизита (не в табличную часть)
    const [showAddAttributeToObjectModal, setShowAddAttributeToObjectModal] = (0, react_1.useState)(false);
    // Какой именно элемент ChildObjects добавляем в объект (для регистров: Dimension/Resource)
    const [newObjectChildKind, setNewObjectChildKind] = (0, react_1.useState)('Attribute');
    // Состояние для редактора RegisterRecords
    const [showRegisterRecordsEditor, setShowRegisterRecordsEditor] = (0, react_1.useState)(false);
    const [editingRegisterRecordIndex, setEditingRegisterRecordIndex] = (0, react_1.useState)(null);
    const [newRegisterRecord, setNewRegisterRecord] = (0, react_1.useState)('');
    // Состояния для типов значения характеристик
    const [showCharacteristicTypeModal, setShowCharacteristicTypeModal] = (0, react_1.useState)(false);
    const [editingCharacteristicTypeIndex, setEditingCharacteristicTypeIndex] = (0, react_1.useState)(null);
    // Состояния для признаков учета
    const [showAccountingFlagModal, setShowAccountingFlagModal] = (0, react_1.useState)(false);
    const [editingAccountingFlag, setEditingAccountingFlag] = (0, react_1.useState)(null);
    const [addingAccountingFlagType, setAddingAccountingFlagType] = (0, react_1.useState)(null);
    // Состояния для значений перечисления (Enum)
    const [showEnumValueModal, setShowEnumValueModal] = (0, react_1.useState)(false);
    const [editingEnumValueIndex, setEditingEnumValueIndex] = (0, react_1.useState)(null);
    const [newEnumValueName, setNewEnumValueName] = (0, react_1.useState)('');
    const [newEnumValueSynonym, setNewEnumValueSynonym] = (0, react_1.useState)(null);
    const [newEnumValueComment, setNewEnumValueComment] = (0, react_1.useState)(null);
    // Подтверждение опасных действий (удаление) — делаем модалкой, т.к. window.confirm в webview часто неудобен/неочевиден
    const [confirmModal, setConfirmModal] = (0, react_1.useState)(null);
    const calculationTypePlanOptions = (0, react_1.useMemo)(() => mergeChartOfCalculationPlanOptionLists(collectChartOfCalculationPlanOptions(metadata.referenceTypes), collectChartOfCalculationPlanOptionsFromRegisters(metadata.registers)), [metadata.referenceTypes, metadata.registers]);
    const chartOfAccountsPlanOptions = (0, react_1.useMemo)(() => collectChartOfAccountsPlanOptions(metadata.referenceTypes), [metadata.referenceTypes]);
    const documentSelectOptions = (0, react_1.useMemo)(() => collectDocumentSelectOptions(metadata.referenceTypes), [metadata.referenceTypes]);
    /** Модалки ожидают обязательный `registers`; init может прислать только referenceTypes. */
    const metadataWithRegisters = (0, react_1.useMemo)(() => ({
        ...metadata,
        registers: metadata.registers ?? [],
    }), [metadata]);
    // Состояния для формы добавления табличной части
    const [newTabularName, setNewTabularName] = (0, react_1.useState)('');
    const [newTabularSynonym, setNewTabularSynonym] = (0, react_1.useState)(null);
    const [newTabularComment, setNewTabularComment] = (0, react_1.useState)(null);
    // Состояния для формы добавления реквизита
    const [newAttrName, setNewAttrName] = (0, react_1.useState)('');
    const [newAttrSynonym, setNewAttrSynonym] = (0, react_1.useState)(null);
    const [newAttrComment, setNewAttrComment] = (0, react_1.useState)(null);
    const [newAttrType, setNewAttrType] = (0, react_1.useState)(null);
    // ВАЖНО: Сбрасываем все состояния модальных окон при монтировании компонента
    // Это гарантирует, что редакторы скрыты по умолчанию при первой загрузке
    (0, react_1.useEffect)(() => {
        console.log('[FormEditor] Монтирование компонента - сбрасываем все модальные окна');
        setShowAddTabularModal(false);
        setShowAddAttributeModal(null);
        setEditingAttribute(null);
        setEditingAttributeType(null);
        setShowAddAttributeToObjectModal(false);
        setShowRegisterRecordsEditor(false);
        setEditingRegisterRecordIndex(null);
        setConfirmModal(null);
        setShowCharacteristicTypeModal(false);
        setEditingCharacteristicTypeIndex(null);
        setShowEnumValueModal(false);
        setEditingEnumValueIndex(null);
        console.log('[FormEditor] Состояния модальных окон после сброса:', {
            showAddTabularModal: false,
            showAddAttributeModal: null,
            editingAttribute: null,
            editingAttributeType: null,
            showAddAttributeToObjectModal: false,
            showRegisterRecordsEditor: false,
            editingRegisterRecordIndex: null,
            confirmModal: null
        });
    }, []); // Пустой массив зависимостей = выполняется только при монтировании
    // ВАЖНО: Сбрасываем все состояния модальных окон при изменении activeTab или selectedObject
    // Это гарантирует, что редакторы скрыты при переключении вкладок или объектов
    (0, react_1.useEffect)(() => {
        console.log('[FormEditor] Изменение activeTab или selectedObject - сбрасываем все модальные окна', {
            activeTab,
            selectedObjectName: selectedObject?.name,
            selectedObjectPath: selectedObject?.sourcePath
        });
        // Принудительно закрываем все модальные окна при изменении вкладки или объекта
        setShowAddTabularModal(false);
        setShowAddAttributeModal(null);
        setEditingAttribute(null);
        setEditingAttributeType(null);
        setShowAddAttributeToObjectModal(false);
        setShowRegisterRecordsEditor(false);
        setEditingRegisterRecordIndex(null);
        setConfirmModal(null);
        setShowCharacteristicTypeModal(false);
        setEditingCharacteristicTypeIndex(null);
        setShowAccountingFlagModal(false);
        setEditingAccountingFlag(null);
        setAddingAccountingFlagType(null);
        console.log('[FormEditor] Состояния модальных окон после сброса при изменении вкладки/объекта');
    }, [activeTab, selectedObject?.name, selectedObject?.sourcePath]); // Используем более специфичные зависимости
    // Генерируем схему для объекта
    const schema = (0, react_1.useMemo)(() => {
        return (0, schemaGenerator_1.generateSchema)(objectType, { properties: formData || {} });
    }, [objectType, formData]);
    // UI Schema для улучшения отображения
    const uiSchema = (0, react_1.useMemo)(() => {
        const ui = {
            Name: {
                'ui:placeholder': 'Введите имя объекта'
            },
            Synonym: {
                'ui:widget': 'MultilingualWidget'
            },
            Comment: {
                'ui:widget': 'MultilingualWidget'
            }
        };
        // Редактор типов для определяемых типов (DefinedType)
        if (objectType === 'DefinedType') {
            ui.Type = {
                'ui:widget': 'TypeWidget',
                'ui:options': {
                    registers: metadata.registers,
                    referenceTypes: metadata.referenceTypes,
                    definedTypeMode: true
                }
            };
        }
        // Добавляем виджет для Type в реквизитах
        if (formData && formData.attributes) {
            formData.attributes.forEach((attr, index) => {
                ui[`attributes_${index}_Type`] = {
                    'ui:widget': 'TypeWidget',
                    'ui:options': {
                        registers: metadata.registers,
                        referenceTypes: metadata.referenceTypes
                    }
                };
            });
        }
        return ui;
    }, [formData, metadata, objectType]);
    const handleSubmit = (data) => {
        onChange(data.formData);
    };
    const handleChange = (data) => {
        onChange(data.formData);
    };
    /**
     * Логгер для webview (для диагностики через Toggle Developer Tools).
     * Не должен ломать выполнение, даже если console недоступен.
     */
    const log = (...args) => {
        try {
            // eslint-disable-next-line no-console
            console.log('[FormEditor]', ...args);
        }
        catch {
            // ignore
        }
    };
    const openConfirm = (message, onConfirm) => {
        // Если модалка уже открыта — не даём открыть вторую (иначе пользователь может "перекликивать" фон).
        if (confirmModal) {
            log('confirm modal already open -> ignore', { message });
            return;
        }
        log('open confirm modal', { message });
        setConfirmModal({ message, onConfirm });
    };
    const handleConfirmModalConfirm = () => {
        if (confirmModal) {
            const action = confirmModal.onConfirm;
            setConfirmModal(null);
            action();
        }
    };
    const handleConfirmModalCancel = () => setConfirmModal(null);
    /**
     * Удаляет реквизит верхнего уровня у выбранного объекта.
     * @param {number} index - индекс реквизита в selectedObject.attributes
     */
    const handleDeleteObjectAttribute = (index) => {
        const baseObject = selectedObject || formData;
        if (!baseObject)
            return;
        const baseAttrs = baseObject.attributes;
        const attributes = Array.isArray(baseAttrs) ? [...baseAttrs] : [];
        const attr = attributes[index];
        const attrName = typeof attr?.name === 'string'
            ? attr.name
            : (attr?.name?.content || attr?.name?.['v8:content'] || attr?.properties?.Name || `Реквизит ${index + 1}`);
        log('click delete object attribute', {
            index,
            attrName,
            hasSelectedObject: Boolean(selectedObject),
            attrsCountBefore: attributes.length
        });
        openConfirm(`Удалить реквизит "${attrName}"?`, () => {
            const attrsAfter = [...attributes];
            attrsAfter.splice(index, 1);
            const updatedObject = { ...baseObject, attributes: attrsAfter };
            log('delete object attribute -> applying', {
                index,
                attrName,
                attrsCountAfter: attrsAfter.length,
                willCallOnSelectedObjectChange: Boolean(onSelectedObjectChange)
            });
            // Структурные изменения (attributes/tabularSections) должны обновлять selectedObject,
            // а formData (properties) не трогаем — иначе можно "запачкать" Properties.
            if (onSelectedObjectChange) {
                onSelectedObjectChange(updatedObject);
                // помечаем dirty через onChange(properties) без изменений
                onChange(formData);
            }
            else {
                // Fallback для старого сценария, когда редактируется только formData
                handleChange({
                    formData: {
                        ...(formData || {}),
                        attributes: attrsAfter
                    }
                });
            }
            // Если был открыт редактор типа удаляемого реквизита — закрываем.
            if (editingAttributeType !== null) {
                if (editingAttributeType === index)
                    setEditingAttributeType(null);
                else if (editingAttributeType > index)
                    setEditingAttributeType(editingAttributeType - 1);
            }
        });
    };
    /**
     * Удаляет табличную часть у выбранного объекта.
     * @param {number} tsIndex - индекс табличной части
     */
    const handleDeleteTabularSection = (tsIndex) => {
        const baseObject = selectedObject || formData;
        if (!baseObject)
            return;
        const baseTs = baseObject.tabularSections;
        const tabularSections = Array.isArray(baseTs) ? [...baseTs] : [];
        const ts = tabularSections[tsIndex];
        const tsName = ts?.name || ts?.properties?.Name || `Табличная часть ${tsIndex + 1}`;
        log('click delete tabular section', {
            tsIndex,
            tsName,
            hasSelectedObject: Boolean(selectedObject),
            tabularCountBefore: tabularSections.length
        });
        openConfirm(`Удалить табличную часть "${tsName}"?`, () => {
            const tsAfter = [...tabularSections];
            tsAfter.splice(tsIndex, 1);
            const updatedObject = { ...baseObject, tabularSections: tsAfter };
            log('delete tabular section -> applying', {
                tsIndex,
                tsName,
                tabularCountAfter: tsAfter.length,
                willCallOnSelectedObjectChange: Boolean(onSelectedObjectChange)
            });
            if (onSelectedObjectChange) {
                onSelectedObjectChange(updatedObject);
                onChange(formData);
            }
            else {
                handleChange({
                    formData: {
                        ...(formData || {}),
                        tabularSections: tsAfter
                    }
                });
            }
            // Закрываем/поправляем состояния модалок, если они были привязаны к удалённой табличной части.
            if (showAddAttributeModal !== null) {
                if (showAddAttributeModal === tsIndex)
                    setShowAddAttributeModal(null);
                else if (showAddAttributeModal > tsIndex)
                    setShowAddAttributeModal(showAddAttributeModal - 1);
            }
            if (editingAttribute) {
                if (editingAttribute.tsIndex === tsIndex)
                    setEditingAttribute(null);
                else if (editingAttribute.tsIndex > tsIndex) {
                    setEditingAttribute({ tsIndex: editingAttribute.tsIndex - 1, attrIndex: editingAttribute.attrIndex });
                }
            }
        });
    };
    /** Добавить значение перечисления */
    const handleAddEnumValue = () => {
        setEditingEnumValueIndex(null);
        setNewEnumValueName('');
        setNewEnumValueSynonym(null);
        setNewEnumValueComment(null);
        setShowEnumValueModal(true);
    };
    /** Редактировать значение перечисления */
    const handleEditEnumValue = (index) => {
        const baseObject = selectedObject || formData;
        const enumValues = baseObject?.enumValues || [];
        const ev = enumValues[index];
        if (ev) {
            setEditingEnumValueIndex(index);
            setNewEnumValueName(ev.name || '');
            setNewEnumValueSynonym(ev.properties?.Synonym ?? ev.properties?.synonym ?? null);
            setNewEnumValueComment(ev.properties?.Comment ?? ev.properties?.comment ?? '');
            setShowEnumValueModal(true);
        }
    };
    /** Сохранить значение перечисления (добавление или редактирование) */
    const handleSaveEnumValue = () => {
        const baseObject = selectedObject || formData;
        if (!baseObject)
            return;
        const enumValues = Array.isArray(baseObject.enumValues) ? [...baseObject.enumValues] : [];
        const newVal = {
            name: newEnumValueName.trim(),
            properties: {
                Name: newEnumValueName.trim(),
                Synonym: newEnumValueSynonym,
                Comment: newEnumValueComment ?? ''
            }
        };
        if (editingEnumValueIndex !== null) {
            const existing = enumValues[editingEnumValueIndex];
            if (existing) {
                enumValues[editingEnumValueIndex] = {
                    ...existing,
                    name: newVal.name,
                    properties: newVal.properties,
                    uuid: existing.uuid
                };
            }
        }
        else {
            enumValues.push(newVal);
        }
        const updatedObject = { ...baseObject, enumValues };
        if (onSelectedObjectChange) {
            onSelectedObjectChange(updatedObject);
        }
        onChange(formData);
        setShowEnumValueModal(false);
        setEditingEnumValueIndex(null);
        setNewEnumValueName('');
        setNewEnumValueSynonym(null);
        setNewEnumValueComment(null);
    };
    /** Удалить значение перечисления */
    const handleDeleteEnumValue = (index) => {
        const baseObject = selectedObject || formData;
        if (!baseObject)
            return;
        const enumValues = Array.isArray(baseObject.enumValues) ? [...baseObject.enumValues] : [];
        const ev = enumValues[index];
        const evName = ev?.name || `Значение ${index + 1}`;
        openConfirm(`Удалить значение перечисления "${evName}"?`, () => {
            const updated = enumValues.filter((_, i) => i !== index);
            const updatedObject = { ...baseObject, enumValues: updated };
            if (onSelectedObjectChange) {
                onSelectedObjectChange(updatedObject);
            }
            onChange(formData);
        });
    };
    /**
     * Удаляет реквизит табличной части.
     * @param {number} tsIndex - индекс табличной части
     * @param {number} attrIndex - индекс реквизита табличной части
     */
    const handleDeleteTabularAttribute = (tsIndex, attrIndex) => {
        const baseObject = selectedObject || formData;
        if (!baseObject)
            return;
        const baseTs = baseObject.tabularSections;
        const tabularSections = Array.isArray(baseTs) ? [...baseTs] : [];
        const ts = tabularSections[tsIndex];
        if (!ts)
            return;
        const attrs = Array.isArray(ts.attributes) ? [...ts.attributes] : [];
        const attr = attrs[attrIndex];
        const attrName = attr?.name || attr?.properties?.Name || `Реквизит ${attrIndex + 1}`;
        const tsName = ts?.name || ts?.properties?.Name || `Табличная часть ${tsIndex + 1}`;
        log('click delete tabular attribute', {
            tsIndex,
            tsName,
            attrIndex,
            attrName,
            hasSelectedObject: Boolean(selectedObject),
            tsAttrsCountBefore: attrs.length
        });
        openConfirm(`Удалить реквизит "${attrName}" из табличной части "${tsName}"?`, () => {
            const tabAfter = [...tabularSections];
            const tsCurrent = tabAfter[tsIndex];
            const attrsAfter = Array.isArray(tsCurrent?.attributes) ? [...tsCurrent.attributes] : [];
            attrsAfter.splice(attrIndex, 1);
            tabAfter[tsIndex] = { ...tsCurrent, attributes: attrsAfter };
            const updatedObject = { ...baseObject, tabularSections: tabAfter };
            log('delete tabular attribute -> applying', {
                tsIndex,
                tsName,
                attrIndex,
                attrName,
                tsAttrsCountAfter: attrsAfter.length,
                willCallOnSelectedObjectChange: Boolean(onSelectedObjectChange)
            });
            if (onSelectedObjectChange) {
                onSelectedObjectChange(updatedObject);
                onChange(formData);
            }
            else {
                handleChange({
                    formData: {
                        ...(formData || {}),
                        tabularSections: tabAfter
                    }
                });
            }
            if (editingAttribute && editingAttribute.tsIndex === tsIndex) {
                if (editingAttribute.attrIndex === attrIndex)
                    setEditingAttribute(null);
                else if (editingAttribute.attrIndex > attrIndex) {
                    setEditingAttribute({ tsIndex, attrIndex: editingAttribute.attrIndex - 1 });
                }
            }
        });
    };
    // Обработчики для табличных частей (определяем до условных возвратов)
    const handleAddTabularSection = () => {
        if (!newTabularName.trim() || !selectedObject) {
            alert('Укажите имя табличной части');
            return;
        }
        const newTS = {
            name: newTabularName,
            properties: {
                Name: newTabularName,
                Synonym: newTabularSynonym,
                Comment: newTabularComment
            },
            attributes: []
        };
        const updatedSections = [...(selectedObject.tabularSections || []), newTS];
        const updatedObject = {
            ...selectedObject,
            tabularSections: updatedSections
        };
        handleChange({
            formData: {
                ...(formData || {}),
                tabularSections: updatedSections
            }
        });
        // Обновляем selectedObject
        if (onSelectedObjectChange) {
            onSelectedObjectChange(updatedObject);
        }
        setNewTabularName('');
        setNewTabularSynonym(null);
        setNewTabularComment(null);
        setShowAddTabularModal(false);
    };
    const handleAddAttribute = (tsIndex) => {
        if (!newAttrName.trim() || !selectedObject) {
            alert('Укажите имя реквизита');
            return;
        }
        if (!newAttrType) {
            alert('Укажите тип реквизита');
            return;
        }
        const updatedSections = [...(selectedObject.tabularSections || [])];
        if (!updatedSections[tsIndex].attributes) {
            updatedSections[tsIndex].attributes = [];
        }
        // Создаем новый реквизит с полной структурой
        const newAttribute = {
            name: newAttrName,
            type: newAttrType,
            properties: {
                Name: newAttrName,
                Synonym: newAttrSynonym,
                Comment: newAttrComment,
                Type: newAttrType // И в properties для совместимости
            }
        };
        updatedSections[tsIndex].attributes.push(newAttribute);
        const updatedObject = {
            ...selectedObject,
            tabularSections: updatedSections
        };
        // Обновляем formData
        handleChange({
            formData: {
                ...(formData || {}),
                tabularSections: updatedSections
            }
        });
        // Обновляем selectedObject для синхронизации
        if (onSelectedObjectChange) {
            onSelectedObjectChange(updatedObject);
        }
        setNewAttrName('');
        setNewAttrSynonym(null);
        setNewAttrComment(null);
        setNewAttrType(null);
        setShowAddAttributeModal(null);
    };
    // Обработчик добавления реквизита в объект (не в табличную часть)
    const handleAddAttributeToObject = () => {
        if (!newAttrName.trim() || !selectedObject) {
            alert(newObjectChildKind === 'Resource'
                ? 'Укажите имя ресурса'
                : newObjectChildKind === 'Dimension'
                    ? 'Укажите имя измерения'
                    : 'Укажите имя реквизита');
            return;
        }
        if (!newAttrType) {
            alert('Укажите тип');
            return;
        }
        const uuid = globalThis?.crypto?.randomUUID ? globalThis.crypto.randomUUID() : undefined;
        // Создаем новый реквизит с полной структурой
        const newAttribute = {
            uuid,
            childObjectKind: newObjectChildKind,
            name: newAttrName,
            type: newAttrType,
            properties: {
                Name: newAttrName,
                Synonym: newAttrSynonym,
                Comment: newAttrComment,
                Type: newAttrType,
                PasswordMode: false,
                Format: null,
                EditFormat: null,
                ToolTip: null,
                MarkNegatives: false,
                Mask: null,
                MultiLine: false,
                ExtendedEdit: false,
                MinValue: null,
                MaxValue: null,
                FillFromFillingValue: false,
                FillValue: null,
                FillChecking: 'DontCheck',
                ChoiceFoldersAndItems: 'Items',
                ChoiceParameterLinks: null,
                ChoiceParameters: null,
                QuickChoice: 'Auto',
                CreateOnInput: 'Auto',
                ChoiceForm: null,
                LinkByType: null,
                ChoiceHistoryOnInput: 'Auto',
                Indexing: 'DontIndex',
                FullTextSearch: 'Use',
                DataHistory: 'Use'
            }
        };
        const updatedAttributes = [...(selectedObject.attributes || []), newAttribute];
        const updatedObject = {
            ...selectedObject,
            attributes: updatedAttributes
        };
        // Обновляем formData
        handleChange({
            formData: {
                ...(formData || {}),
                attributes: updatedAttributes
            }
        });
        // Обновляем selectedObject для синхронизации
        if (onSelectedObjectChange) {
            onSelectedObjectChange(updatedObject);
        }
        // Очищаем форму
        setNewAttrName('');
        setNewAttrSynonym(null);
        setNewAttrComment(null);
        setNewAttrType(null);
        setShowAddAttributeToObjectModal(false);
        setNewObjectChildKind('Attribute');
    };
    const handleEditAttributeType = (tsIndex, attrIndex) => {
        setEditingAttribute({ tsIndex, attrIndex });
    };
    // Обработчик сохранения типа реквизита (не табличной части)
    const handleSaveAttributeTypeForAttribute = (newType) => {
        if (editingAttributeType === null)
            return;
        const attrIndex = editingAttributeType;
        const baseAttrs = (formData?.attributes ?? selectedObject?.attributes);
        const updatedAttributes = [...(Array.isArray(baseAttrs) ? baseAttrs : [])];
        if (updatedAttributes[attrIndex]) {
            // Обновляем typeDisplay для корректного отображения
            const newTypeDisplay = (0, typeUtils_1.formatTypeForDisplay)(newType);
            // Убеждаемся, что тип правильно сохраняется
            // Для составных типов структура должна быть { Type: [...] }
            const typeToSave = newType && typeof newType === 'object' && newType.Type && Array.isArray(newType.Type)
                ? newType
                : newType;
            updatedAttributes[attrIndex] = {
                ...updatedAttributes[attrIndex],
                type: typeToSave,
                typeDisplay: newTypeDisplay,
                properties: {
                    ...updatedAttributes[attrIndex].properties,
                    Type: typeToSave
                }
            };
            const updatedObject = {
                ...selectedObject,
                attributes: updatedAttributes
            };
            handleChange({
                formData: {
                    ...formData,
                    attributes: updatedAttributes
                }
            });
            // Обновляем selectedObject - ВАЖНО: делаем это после handleChange
            if (onSelectedObjectChange) {
                onSelectedObjectChange(updatedObject);
            }
        }
        setEditingAttributeType(null);
    };
    const handleSaveAttributeType = (newType) => {
        if (!editingAttribute)
            return;
        const { tsIndex, attrIndex } = editingAttribute;
        const baseTs = (formData?.tabularSections ?? selectedObject?.tabularSections);
        const updatedSections = [...(Array.isArray(baseTs) ? baseTs : [])];
        if (updatedSections[tsIndex]?.attributes?.[attrIndex]) {
            updatedSections[tsIndex].attributes[attrIndex].type = newType;
            updatedSections[tsIndex].attributes[attrIndex].properties = {
                ...updatedSections[tsIndex].attributes[attrIndex].properties,
                Type: newType
            };
            const updatedObject = {
                ...selectedObject,
                tabularSections: updatedSections
            };
            handleChange({
                formData: {
                    ...formData,
                    tabularSections: updatedSections
                }
            });
            // Обновляем selectedObject
            if (onSelectedObjectChange) {
                onSelectedObjectChange(updatedObject);
            }
        }
        setEditingAttribute(null);
    };
    if (!formData) {
        return (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement("div", { className: "form-editor-loading" }, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0444\u043E\u0440\u043C\u044B..."),
            react_1.default.createElement(ConfirmModal_1.ConfirmModal, { isOpen: !!confirmModal, message: confirmModal?.message || '', onConfirm: handleConfirmModalConfirm, onCancel: handleConfirmModalCancel })));
    }
    // Обработчик сохранения RegisterRecords
    const handleSaveRegisterRecord = (register) => {
        const registerRecords = formData?.RegisterRecords;
        const currentRecords = Array.isArray(registerRecords) ? [...registerRecords] : [];
        const newRecord = {
            Item: {
                '#text': register,
                'xsi:type': 'xr:MDObjectRef'
            }
        };
        if (editingRegisterRecordIndex !== null) {
            // Редактирование существующей записи
            currentRecords[editingRegisterRecordIndex] = newRecord;
        }
        else {
            // Добавление новой записи
            currentRecords.push(newRecord);
        }
        handleChange({
            formData: {
                ...formData,
                RegisterRecords: currentRecords
            }
        });
        setShowRegisterRecordsEditor(false);
        setNewRegisterRecord('');
        setEditingRegisterRecordIndex(null);
    };
    const handleCloseRegisterRecordsEditor = () => {
        setShowRegisterRecordsEditor(false);
        setNewRegisterRecord('');
        setEditingRegisterRecordIndex(null);
    };
    // Обработчики для типов значения характеристик
    const getCharacteristicTypes = () => {
        const typeProp = formData?.Type || selectedObject?.properties?.Type;
        if (!typeProp)
            return [];
        const typesArray = typeProp['v8:Type'] || typeProp.Type;
        if (Array.isArray(typesArray)) {
            return typesArray.map((t) => {
                if (typeof t === 'string')
                    return t;
                if (typeof t === 'object' && t !== null) {
                    return t['#text'] || t.text || t.kind || String(t);
                }
                return String(t);
            });
        }
        if (typesArray) {
            const str = typeof typesArray === 'string' ? typesArray : (typesArray['#text'] || typesArray.text || typesArray.kind || String(typesArray));
            return [str];
        }
        return [];
    };
    const handleAddCharacteristicType = (typeValue) => {
        console.log('[FormEditor] handleAddCharacteristicType called:', typeValue);
        const currentTypes = getCharacteristicTypes();
        console.log('[FormEditor] currentTypes:', currentTypes);
        const updatedTypes = [...currentTypes, typeValue];
        console.log('[FormEditor] updatedTypes:', updatedTypes);
        // Обновляем properties.Type с правильной структурой
        const updatedProperties = {
            ...formData,
            Type: {
                'v8:Type': updatedTypes
            }
        };
        console.log('[FormEditor] updatedProperties:', updatedProperties);
        handleChange({ formData: updatedProperties });
        // Обновляем selectedObject
        if (onSelectedObjectChange && selectedObject) {
            const updatedObject = {
                ...selectedObject,
                properties: updatedProperties
            };
            onSelectedObjectChange(updatedObject);
        }
        setShowCharacteristicTypeModal(false);
        setEditingCharacteristicTypeIndex(null);
    };
    const handleEditCharacteristicType = (typeValue) => {
        if (editingCharacteristicTypeIndex === null)
            return;
        console.log('[FormEditor] handleEditCharacteristicType called:', { typeValue, index: editingCharacteristicTypeIndex });
        const currentTypes = getCharacteristicTypes();
        console.log('[FormEditor] currentTypes:', currentTypes);
        const updatedTypes = [...currentTypes];
        updatedTypes[editingCharacteristicTypeIndex] = typeValue;
        console.log('[FormEditor] updatedTypes:', updatedTypes);
        // Обновляем properties.Type с правильной структурой
        const updatedProperties = {
            ...formData,
            Type: {
                'v8:Type': updatedTypes
            }
        };
        console.log('[FormEditor] updatedProperties:', updatedProperties);
        handleChange({ formData: updatedProperties });
        // Обновляем selectedObject
        if (onSelectedObjectChange && selectedObject) {
            const updatedObject = {
                ...selectedObject,
                properties: updatedProperties
            };
            onSelectedObjectChange(updatedObject);
        }
        setShowCharacteristicTypeModal(false);
        setEditingCharacteristicTypeIndex(null);
    };
    const handleDeleteCharacteristicType = (index) => {
        const currentTypes = getCharacteristicTypes();
        if (index < 0 || index >= currentTypes.length)
            return;
        setConfirmModal({
            message: `Вы уверены, что хотите удалить тип "${currentTypes[index]}"?`,
            onConfirm: () => {
                const updatedTypes = currentTypes.filter((_, i) => i !== index);
                // Обновляем properties.Type с правильной структурой
                // Если массив пустой, устанавливаем пустой объект Type с пустым массивом
                // Это нужно для корректного сохранения в XML (пустой элемент Type)
                const updatedProperties = {
                    ...formData,
                    Type: {
                        'v8:Type': updatedTypes
                    }
                };
                handleChange({ formData: updatedProperties });
                // Обновляем selectedObject
                if (onSelectedObjectChange && selectedObject) {
                    const updatedObject = {
                        ...selectedObject,
                        properties: updatedProperties
                    };
                    onSelectedObjectChange(updatedObject);
                }
                setConfirmModal(null);
            }
        });
    };
    const handleSaveCharacteristicType = (typeValue) => {
        console.log('[FormEditor] handleSaveCharacteristicType called:', { typeValue, editingCharacteristicTypeIndex });
        if (editingCharacteristicTypeIndex !== null) {
            handleEditCharacteristicType(typeValue);
        }
        else {
            handleAddCharacteristicType(typeValue);
        }
    };
    // Обработчики для признаков учета
    const handleAddAccountingFlag = (flagType, flag) => {
        if (!selectedObject || !onSelectedObjectChange)
            return;
        const newFlag = {
            uuid: flag.uuid || getRandomUUID(),
            childObjectKind: 'Attribute',
            name: flag.name,
            type: { kind: 'xs:boolean' },
            typeDisplay: 'Булево',
            properties: {
                Name: flag.name,
                Type: { 'v8:Type': 'xs:boolean' },
                ...(flag.synonym && { Synonym: flag.synonym }),
                ...(flag.comment && { Comment: flag.comment })
            }
        };
        const updatedObject = { ...selectedObject };
        if (flagType === 'accountingFlag') {
            updatedObject.accountingFlags = [...(updatedObject.accountingFlags || []), newFlag];
        }
        else {
            updatedObject.extDimensionAccountingFlags = [...(updatedObject.extDimensionAccountingFlags || []), newFlag];
        }
        onSelectedObjectChange(updatedObject);
        setShowAccountingFlagModal(false);
        setEditingAccountingFlag(null);
    };
    const handleEditAccountingFlag = (flag) => {
        if (!selectedObject || !onSelectedObjectChange || !editingAccountingFlag)
            return;
        const updatedObject = { ...selectedObject };
        const flagType = editingAccountingFlag.type;
        const index = editingAccountingFlag.index;
        const flags = flagType === 'accountingFlag'
            ? (updatedObject.accountingFlags || [])
            : (updatedObject.extDimensionAccountingFlags || []);
        if (index >= 0 && index < flags.length) {
            const updatedFlag = {
                ...flags[index],
                name: flag.name,
                properties: {
                    ...flags[index].properties,
                    Name: flag.name,
                    Type: { 'v8:Type': 'xs:boolean' },
                    ...(flag.synonym !== undefined && { Synonym: flag.synonym }),
                    ...(flag.comment !== undefined && { Comment: flag.comment })
                }
            };
            if (flagType === 'accountingFlag') {
                updatedObject.accountingFlags = [...flags];
                updatedObject.accountingFlags[index] = updatedFlag;
            }
            else {
                updatedObject.extDimensionAccountingFlags = [...flags];
                updatedObject.extDimensionAccountingFlags[index] = updatedFlag;
            }
            onSelectedObjectChange(updatedObject);
        }
        setShowAccountingFlagModal(false);
        setEditingAccountingFlag(null);
    };
    const handleDeleteAccountingFlag = (flagType, index) => {
        if (!selectedObject || !onSelectedObjectChange)
            return;
        const flags = flagType === 'accountingFlag'
            ? (selectedObject.accountingFlags || [])
            : (selectedObject.extDimensionAccountingFlags || []);
        if (index < 0 || index >= flags.length)
            return;
        const flagName = flags[index].name || `Признак учета ${index + 1}`;
        openConfirm(`Вы уверены, что хотите удалить признак учета "${flagName}"?`, () => {
            const updatedObject = { ...selectedObject };
            if (flagType === 'accountingFlag') {
                updatedObject.accountingFlags = flags.filter((_, i) => i !== index);
            }
            else {
                updatedObject.extDimensionAccountingFlags = flags.filter((_, i) => i !== index);
            }
            onSelectedObjectChange(updatedObject);
            setConfirmModal(null);
        });
    };
    const handleSaveAccountingFlag = (flag) => {
        if (editingAccountingFlag) {
            handleEditAccountingFlag(flag);
        }
        else {
            // Это не должно произойти, так как тип должен быть передан при открытии модального окна
            console.error('[FormEditor] handleSaveAccountingFlag: editingAccountingFlag is null');
        }
    };
    // Рендерим разные секции в зависимости от активной вкладки
    let content = null;
    if (activeTab === 'attributes' && (selectedObject?.attributes || formData?.attributes)) {
        const baseAttrs = (formData?.attributes ?? selectedObject?.attributes);
        const attributes = Array.isArray(baseAttrs) ? baseAttrs : [];
        const isRegister = String(objectType || '').toLowerCase().includes('регистр');
        const openAddObjectChildModal = (kind) => {
            setNewObjectChildKind(kind);
            setShowAddAttributeToObjectModal(true);
        };
        content = (react_1.default.createElement("div", { className: "form-editor" },
            react_1.default.createElement("div", { className: "section-header", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                react_1.default.createElement("h3", null,
                    "\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B (",
                    attributes.length,
                    ")"),
                react_1.default.createElement("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                    isRegister && (react_1.default.createElement(react_1.default.Fragment, null,
                        react_1.default.createElement("button", { className: "btn-add-attribute", type: "button", onClick: () => openAddObjectChildModal('Dimension'), style: {
                                padding: '6px 12px',
                                background: 'var(--vscode-button-background)',
                                color: 'var(--vscode-button-foreground)',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            } },
                            react_1.default.createElement("span", null, "\u2795"),
                            react_1.default.createElement("span", null, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435")),
                        react_1.default.createElement("button", { className: "btn-add-attribute", type: "button", onClick: () => openAddObjectChildModal('Resource'), style: {
                                padding: '6px 12px',
                                background: 'var(--vscode-button-background)',
                                color: 'var(--vscode-button-foreground)',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            } },
                            react_1.default.createElement("span", null, "\u2795"),
                            react_1.default.createElement("span", null, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u0441\u0443\u0440\u0441")))),
                    react_1.default.createElement("button", { className: "btn-add-attribute", type: "button", onClick: () => openAddObjectChildModal('Attribute'), style: {
                            padding: '6px 12px',
                            background: 'var(--vscode-button-background)',
                            color: 'var(--vscode-button-foreground)',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        } },
                        react_1.default.createElement("span", null, "\u2795"),
                        react_1.default.createElement("span", null, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442")))),
            react_1.default.createElement("div", { className: "attributes-list" }, attributes.map((attr, index) => {
                if (!attr)
                    return null;
                return (react_1.default.createElement("div", { key: index, className: "attribute-card" },
                    react_1.default.createElement("div", { className: "attribute-header" },
                        react_1.default.createElement("h4", null,
                            (attr.childObjectKind === 'Resource'
                                ? '[Ресурс] '
                                : attr.childObjectKind === 'Dimension'
                                    ? '[Измерение] '
                                    : ''),
                            typeof attr.name === 'string' ? attr.name : (attr.name?.content || attr.name?.['v8:content'] || attr.properties?.Name || 'Без имени')),
                        react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                            react_1.default.createElement("span", { className: "attribute-type" }, (0, typeUtils_1.formatTypeForDisplay)(attr.type)),
                            react_1.default.createElement("button", { className: "btn-edit-type", type: "button", onClick: (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingAttributeType(index);
                                }, title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0442\u0438\u043F\u043E\u0432", "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0442\u0438\u043F\u043E\u0432", style: {
                                    padding: '4px 8px',
                                    fontSize: '16px',
                                    background: 'var(--vscode-button-secondaryBackground)',
                                    color: 'var(--vscode-button-secondaryForeground)',
                                    border: '1px solid var(--vscode-button-border)',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    lineHeight: '1'
                                } }, "\u270E"),
                            react_1.default.createElement("button", { className: "btn-edit-type", type: "button", onClick: (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteObjectAttribute(index);
                                }, title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", style: {
                                    padding: '4px 8px',
                                    fontSize: '16px',
                                    background: 'var(--vscode-errorForeground)',
                                    color: 'var(--vscode-button-foreground)',
                                    border: '1px solid var(--vscode-button-border)',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    lineHeight: '1'
                                } }, "\u00D7"))),
                    react_1.default.createElement("div", { className: "attribute-properties" },
                        attr.properties?.Synonym && (react_1.default.createElement("div", { className: "property-row" },
                            react_1.default.createElement("span", { className: "property-name" }, "Synonym:"),
                            react_1.default.createElement("div", { className: "property-value-inline" },
                                react_1.default.createElement(SimpleMultilingualEditor_1.SimpleMultilingualEditor, { value: attr.properties.Synonym, onChange: (newValue) => {
                                        const updatedAttributes = selectedObject.attributes.map((a, i) => i === index ? { ...a, properties: { ...a.properties, Synonym: newValue } } : a);
                                        handleChange({
                                            formData: {
                                                ...formData,
                                                attributes: updatedAttributes
                                            }
                                        });
                                    } })))),
                        attr.properties?.Comment && (react_1.default.createElement("div", { className: "property-row" },
                            react_1.default.createElement("span", { className: "property-name" }, "Comment:"),
                            react_1.default.createElement("div", { className: "property-value-inline" },
                                react_1.default.createElement(SimpleMultilingualEditor_1.SimpleMultilingualEditor, { value: attr.properties.Comment, onChange: (newValue) => {
                                        const updatedAttributes = selectedObject.attributes.map((a, i) => i === index ? { ...a, properties: { ...a.properties, Comment: newValue } } : a);
                                        handleChange({
                                            formData: {
                                                ...formData,
                                                attributes: updatedAttributes
                                            }
                                        });
                                    } })))),
                        Object.entries(attr.properties || {}).slice(0, 5).map(([key, value]) => {
                            // Пропускаем поле Type, Synonym и Comment - они обрабатываются отдельно
                            if (key === 'Type' || key === 'Synonym' || key === 'Comment') {
                                return null;
                            }
                            // Если это простое значение (не объект), показываем редактируемое поле
                            if (typeof value !== 'object' || value === null) {
                                return (react_1.default.createElement("div", { key: key, className: "property-row" },
                                    react_1.default.createElement("span", { className: "property-name" },
                                        key,
                                        ":"),
                                    react_1.default.createElement("div", { className: "property-value-inline" },
                                        react_1.default.createElement(FieldInput, { field: key, value: value, onChange: (newValue) => {
                                                const updatedAttributes = selectedObject.attributes.map((a, i) => i === index ? { ...a, properties: { ...a.properties, [key]: newValue } } : a);
                                                handleChange({
                                                    formData: {
                                                        ...formData,
                                                        attributes: updatedAttributes
                                                    }
                                                });
                                            }, objectType: objectType, label: key }))));
                            }
                            // Для объектов показываем JSON или пустую строку
                            return (react_1.default.createElement("div", { key: key, className: "property-row" },
                                react_1.default.createElement("span", { className: "property-name" },
                                    key,
                                    ":"),
                                react_1.default.createElement("span", { className: "property-value" }, (() => {
                                    try {
                                        return JSON.stringify(value).substring(0, 50);
                                    }
                                    catch {
                                        return '';
                                    }
                                })())));
                        }))));
            }))));
    }
    else if (activeTab === 'tabular' && (selectedObject?.tabularSections || formData?.tabularSections)) {
        const baseTs = (formData?.tabularSections ?? selectedObject?.tabularSections);
        const tabularSections = Array.isArray(baseTs) ? baseTs : [];
        content = (react_1.default.createElement("div", { className: "form-editor" },
            react_1.default.createElement("div", { className: "section-header" },
                react_1.default.createElement("h3", null,
                    "\u0422\u0430\u0431\u043B\u0438\u0447\u043D\u044B\u0435 \u0447\u0430\u0441\u0442\u0438 (",
                    tabularSections.length,
                    ")"),
                react_1.default.createElement("button", { className: "btn-primary btn-add-tabular", onClick: () => setShowAddTabularModal(true) },
                    react_1.default.createElement("span", { className: "btn-icon" }, "\u2795"),
                    react_1.default.createElement("span", null, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0442\u0430\u0431\u043B\u0438\u0447\u043D\u0443\u044E \u0447\u0430\u0441\u0442\u044C"))),
            react_1.default.createElement("div", { className: "tabular-list" }, tabularSections.map((ts, tsIndex) => {
                if (!ts)
                    return null;
                return (react_1.default.createElement("div", { key: tsIndex, className: "tabular-card" },
                    react_1.default.createElement("div", { className: "tabular-header" },
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h4", null, ts.name),
                            ts.properties?.Synonym && (react_1.default.createElement("div", { className: "tabular-synonym" }, (() => {
                                const syn = ts.properties.Synonym;
                                if (!syn)
                                    return '';
                                if (typeof syn === 'string')
                                    return syn;
                                if (typeof syn === 'object' && syn !== null) {
                                    if (syn['v8:item']) {
                                        const items = Array.isArray(syn['v8:item']) ? syn['v8:item'] : [syn['v8:item']];
                                        return items.map((item) => {
                                            if (typeof item === 'object' && item !== null) {
                                                return item['v8:content'] || '';
                                            }
                                            return String(item || '');
                                        }).filter((s) => s).join(', ');
                                    }
                                    if (syn.content)
                                        return String(syn.content);
                                    if (syn['v8:content'])
                                        return String(syn['v8:content']);
                                }
                                return '';
                            })())),
                            ts.properties?.Comment && (react_1.default.createElement("div", { className: "tabular-comment" }, (() => {
                                const com = ts.properties.Comment;
                                if (!com)
                                    return '';
                                if (typeof com === 'string')
                                    return com;
                                if (typeof com === 'object' && com !== null) {
                                    if (com['v8:item']) {
                                        const items = Array.isArray(com['v8:item']) ? com['v8:item'] : [com['v8:item']];
                                        return items.map((item) => {
                                            if (typeof item === 'object' && item !== null) {
                                                return item['v8:content'] || '';
                                            }
                                            return String(item || '');
                                        }).filter((s) => s).join(', ');
                                    }
                                    if (com.content)
                                        return String(com.content);
                                    if (com['v8:content'])
                                        return String(com['v8:content']);
                                }
                                return '';
                            })()))),
                        react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                            react_1.default.createElement("span", { className: "tabular-attributes-count" },
                                "\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u043E\u0432: ",
                                ts.attributes?.length || 0),
                            react_1.default.createElement("button", { className: "btn-edit-type", type: "button", onClick: (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteTabularSection(tsIndex);
                                }, title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", style: {
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    background: 'var(--vscode-errorForeground)',
                                    color: 'var(--vscode-button-foreground)',
                                    border: '1px solid var(--vscode-button-border)',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                } }, "\u00D7"))),
                    ts.attributes && Array.isArray(ts.attributes) && ts.attributes.length > 0 && (react_1.default.createElement("div", { className: "tabular-attributes-list" }, ts.attributes.map((attr, attrIndex) => {
                        if (!attr)
                            return null;
                        return (react_1.default.createElement("div", { key: attrIndex, className: "tabular-attribute-item" },
                            react_1.default.createElement("div", { className: "attribute-info" },
                                react_1.default.createElement("span", { className: "attribute-name" }, attr.name || `Реквизит ${attrIndex + 1}`),
                                attr.properties?.Synonym && (react_1.default.createElement("span", { className: "attribute-synonym" }, (() => {
                                    const syn = attr.properties.Synonym;
                                    if (!syn)
                                        return '';
                                    if (typeof syn === 'string')
                                        return syn;
                                    if (typeof syn === 'object' && syn !== null) {
                                        if (syn['v8:item']) {
                                            const items = Array.isArray(syn['v8:item']) ? syn['v8:item'] : [syn['v8:item']];
                                            return items.map((item) => {
                                                if (typeof item === 'object' && item !== null) {
                                                    return item['v8:content'] || '';
                                                }
                                                return String(item || '');
                                            }).filter((s) => s).join(', ');
                                        }
                                        // Если это объект без v8:item, пробуем найти content напрямую
                                        if (syn.content)
                                            return String(syn.content);
                                        if (syn['v8:content'])
                                            return String(syn['v8:content']);
                                    }
                                    return '';
                                })())),
                                attr.properties?.Comment && (react_1.default.createElement("span", { className: "attribute-comment" }, (() => {
                                    const com = attr.properties.Comment;
                                    if (!com)
                                        return '';
                                    if (typeof com === 'string')
                                        return com;
                                    if (typeof com === 'object' && com !== null) {
                                        if (com['v8:item']) {
                                            const items = Array.isArray(com['v8:item']) ? com['v8:item'] : [com['v8:item']];
                                            return items.map((item) => {
                                                if (typeof item === 'object' && item !== null) {
                                                    return item['v8:content'] || '';
                                                }
                                                return String(item || '');
                                            }).filter((s) => s).join(', ');
                                        }
                                        // Если это объект без v8:item, пробуем найти content напрямую
                                        if (com.content)
                                            return String(com.content);
                                        if (com['v8:content'])
                                            return String(com['v8:content']);
                                    }
                                    return '';
                                })())),
                                react_1.default.createElement("span", { className: "attribute-type" }, (0, typeUtils_1.formatTypeForDisplay)(attr.type))),
                            react_1.default.createElement("div", { style: { display: 'flex', gap: '8px' } },
                                react_1.default.createElement("button", { className: "btn-edit-type", type: "button", onClick: (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleEditAttributeType(tsIndex, attrIndex);
                                    }, title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0442\u0438\u043F\u043E\u0432", "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0442\u0438\u043F\u043E\u0432" }, "\u270E"),
                                react_1.default.createElement("button", { className: "btn-edit-type", type: "button", onClick: (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteTabularAttribute(tsIndex, attrIndex);
                                    }, title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", style: {
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                        background: 'var(--vscode-errorForeground)',
                                        color: 'var(--vscode-button-foreground)',
                                        border: '1px solid var(--vscode-button-border)',
                                        borderRadius: '3px',
                                        cursor: 'pointer'
                                    } }, "\u00D7"))));
                    }))),
                    react_1.default.createElement("button", { className: "btn-add-attribute", onClick: () => setShowAddAttributeModal(tsIndex) },
                        react_1.default.createElement("span", { className: "btn-icon" }, "\u2795"),
                        react_1.default.createElement("span", null, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442"))));
            }))));
    }
    else if (activeTab === 'enumValues') {
        const baseEnumValues = selectedObject?.enumValues ?? formData?.enumValues ?? [];
        const enumValues = Array.isArray(baseEnumValues) ? baseEnumValues : [];
        content = (react_1.default.createElement("div", { className: "form-editor" },
            react_1.default.createElement("div", { className: "section-header" },
                react_1.default.createElement("h3", null,
                    "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F (",
                    enumValues.length,
                    ")"),
                react_1.default.createElement("button", { type: "button", className: "btn-add", onClick: handleAddEnumValue, title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435" }, "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C")),
            react_1.default.createElement("div", { className: "attributes-list" }, enumValues.map((ev, index) => {
                const name = ev.name || ev.properties?.Name || `Значение ${index + 1}`;
                const synonym = ev.properties?.Synonym ?? ev.properties?.synonym;
                const synonymStr = typeof synonym === 'string' ? synonym : (synonym?.['v8:item']?.['v8:content'] ?? synonym?.content ?? '');
                const comment = ev.properties?.Comment ?? ev.properties?.comment ?? '';
                return (react_1.default.createElement("div", { key: ev.uuid || index, className: "attribute-card" },
                    react_1.default.createElement("div", { className: "attribute-header" },
                        react_1.default.createElement("span", { className: "attribute-name" }, name),
                        react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                            react_1.default.createElement("span", { className: "attribute-index" },
                                "#",
                                index + 1),
                            react_1.default.createElement("button", { type: "button", className: "btn-edit-type", onClick: () => handleEditEnumValue(index), title: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C", "aria-label": "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C" }, "\u270E"),
                            react_1.default.createElement("button", { type: "button", className: "btn-edit-type", onClick: () => handleDeleteEnumValue(index), title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", style: {
                                    background: 'var(--vscode-errorForeground)',
                                    color: 'var(--vscode-button-foreground)'
                                } }, "\u00D7"))),
                    (synonymStr || comment) && (react_1.default.createElement("div", { className: "attribute-meta" },
                        synonymStr && react_1.default.createElement("span", null, synonymStr),
                        comment && react_1.default.createElement("span", { className: "attribute-comment" }, comment)))));
            })),
            react_1.default.createElement(EnumValueEditorModal_1.EnumValueEditorModal, { isOpen: showEnumValueModal, isEdit: editingEnumValueIndex !== null, name: newEnumValueName, synonym: newEnumValueSynonym, comment: newEnumValueComment, onClose: () => setShowEnumValueModal(false), onSave: handleSaveEnumValue, onNameChange: setNewEnumValueName, onSynonymChange: setNewEnumValueSynonym, onCommentChange: setNewEnumValueComment })));
    }
    else if (activeTab === 'forms' && selectedObject?.forms) {
        content = (react_1.default.createElement("div", { className: "form-editor" },
            react_1.default.createElement("div", { className: "section-header" },
                react_1.default.createElement("h3", null,
                    "\u0424\u043E\u0440\u043C\u044B (",
                    selectedObject.forms.length,
                    ")")),
            react_1.default.createElement("div", { className: "forms-list" }, selectedObject.forms.map((form, index) => (react_1.default.createElement("div", { key: index, className: "form-card" },
                react_1.default.createElement("h4", null, form.name || `Форма ${index + 1}`)))))));
    }
    else if (activeTab === 'commands' && selectedObject?.commands) {
        content = (react_1.default.createElement("div", { className: "form-editor" },
            react_1.default.createElement("div", { className: "section-header" },
                react_1.default.createElement("h3", null,
                    "\u041A\u043E\u043C\u0430\u043D\u0434\u044B (",
                    selectedObject.commands.length,
                    ")")),
            react_1.default.createElement("div", { className: "commands-list" }, selectedObject.commands.map((cmd, index) => (react_1.default.createElement("div", { key: index, className: "command-card" },
                react_1.default.createElement("h4", null, cmd.name || `Команда ${index + 1}`)))))));
    }
    else if (activeTab === 'properties' && formData) {
        // Группируем свойства
        const basicFields = ['Name', 'Synonym', 'Comment'];
        const standardAttributes = formData.StandardAttributes;
        const registerRecords = formData.RegisterRecords;
        const isDocument = String(objectType || '').toLowerCase() === 'документ' ||
            String(objectType || '').toLowerCase() === 'document';
        const isChartOfAccountsProps = objectType === 'ChartOfAccounts' ||
            objectType === 'План счетов' ||
            (selectedObject?.sourcePath &&
                String(selectedObject.sourcePath).replace(/\\/g, '/').includes('ChartsOfAccounts'));
        const isChartOfCalculationTypesProps = objectType === 'ChartOfCalculationTypes' ||
            objectType === 'План видов расчета' ||
            (selectedObject?.sourcePath &&
                String(selectedObject.sourcePath).replace(/\\/g, '/').includes('ChartsOfCalculationTypes'));
        const pathNorm = selectedObject?.sourcePath
            ? String(selectedObject.sourcePath).replace(/\\/g, '/')
            : '';
        const isInformationRegister = objectType === 'InformationRegister' ||
            objectType === 'Регистр сведений' ||
            pathNorm.includes('InformationRegisters');
        const isAccumulationRegister = objectType === 'AccumulationRegister' ||
            objectType === 'Регистр накопления' ||
            pathNorm.includes('AccumulationRegisters');
        const isAccountingRegister = objectType === 'AccountingRegister' ||
            objectType === 'Регистр бухгалтерии' ||
            pathNorm.includes('AccountingRegisters');
        const isCalculationRegister = objectType === 'CalculationRegister' ||
            objectType === 'Регистр расчета' ||
            pathNorm.includes('CalculationRegisters');
        // Все остальные поля
        const additionalFields = Object.keys(formData).filter(key => !basicFields.includes(key) &&
            key !== 'StandardAttributes' &&
            key !== 'RegisterRecords' &&
            key !== 'attributes' &&
            key !== 'tabularSections' &&
            key !== 'forms' &&
            key !== 'commands' &&
            !(isChartOfAccountsProps && CHART_OF_ACCOUNTS_DATA_PROPERTY_KEYS.includes(key)) &&
            !(isChartOfCalculationTypesProps && CHART_OF_CALCULATION_TYPES_DATA_PROPERTY_KEYS.includes(key)) &&
            !(isInformationRegister && INFORMATION_REGISTER_PROPERTY_KEYS.includes(key)) &&
            !(isAccumulationRegister && ACCUMULATION_REGISTER_PROPERTY_KEYS.includes(key)) &&
            !(isAccountingRegister && ACCOUNTING_REGISTER_PROPERTY_KEYS.includes(key)) &&
            !(isCalculationRegister && CALCULATION_REGISTER_PROPERTY_KEYS.includes(key)));
        /** Карточка свойства регистра (скаляр или JSON-объект из XML). */
        const renderRegisterScalarField = (field, scheduleHint) => {
            const raw = formData[field];
            const value = raw === undefined || raw === null ? '' : typeof raw === 'object' ? raw : raw;
            return (react_1.default.createElement("div", { key: field, className: "property-card" },
                react_1.default.createElement("div", { className: "property-header" },
                    react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)(field))),
                react_1.default.createElement("div", { className: "property-value" },
                    scheduleHint ? (react_1.default.createElement("div", { style: {
                            fontSize: '12px',
                            color: 'var(--vscode-descriptionForeground)',
                            marginBottom: '6px'
                        } }, scheduleHint)) : null,
                    typeof value === 'object' && value !== null ? (react_1.default.createElement("textarea", { value: JSON.stringify(value, null, 2), onChange: (e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                handleChange({ formData: { ...formData, [field]: parsed } });
                            }
                            catch {
                                /* не JSON */
                            }
                        }, className: "property-textarea", rows: 4 })) : (react_1.default.createElement(FieldInput, { field: field, value: value, onChange: (newValue) => {
                            handleChange({ formData: { ...formData, [field]: newValue } });
                        }, objectType: objectType, label: (0, field_values_1.getFieldLabel)(field) })))));
        };
        content = (react_1.default.createElement("div", { className: "form-editor" },
            react_1.default.createElement("div", { className: "properties-group" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("h3", null, "\u041E\u0441\u043D\u043E\u0432\u043D\u044B\u0435")),
                react_1.default.createElement("div", { className: "properties-cards" }, basicFields.map(field => {
                    const value = formData[field];
                    return (react_1.default.createElement("div", { key: field, className: "property-card" },
                        react_1.default.createElement("div", { className: "property-header" },
                            react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)(field))),
                        react_1.default.createElement("div", { className: "property-value" }, (field === 'Synonym' || field === 'Comment') && typeof value === 'object' && value?.['v8:item'] ? (react_1.default.createElement("div", { className: "multilingual-wrapper" },
                            react_1.default.createElement(SimpleMultilingualEditor_1.SimpleMultilingualEditor, { value: value, onChange: (newValue) => {
                                    handleChange({ formData: { ...formData, [field]: newValue } });
                                } }))) : (react_1.default.createElement(FieldInput, { field: field, value: value, onChange: (newValue) => {
                                handleChange({ formData: { ...formData, [field]: newValue } });
                            }, objectType: objectType, label: (0, field_values_1.getFieldLabel)(field) })))));
                }))),
            isChartOfCalculationTypesProps && (react_1.default.createElement("div", { className: "properties-group chart-of-calculation-types-calc" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("h3", null, "\u0420\u0430\u0441\u0447\u0451\u0442")),
                react_1.default.createElement("div", { className: "properties-cards" }, CHART_OF_CALCULATION_TYPES_DATA_PROPERTY_KEYS.map(field => {
                    if (field === 'BaseCalculationTypes') {
                        const selectedRefs = extractBaseCalculationTypeRefs(formData.BaseCalculationTypes);
                        const knownRefSet = new Set(calculationTypePlanOptions.map(([r]) => r));
                        const orphanRefs = selectedRefs.filter((r) => !knownRefSet.has(r));
                        return (react_1.default.createElement("div", { key: field, className: "property-card" },
                            react_1.default.createElement("div", { className: "property-header" },
                                react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)(field))),
                            react_1.default.createElement("div", { className: "property-value chart-calc-base-plans" },
                                react_1.default.createElement("div", { style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        maxHeight: '280px',
                                        overflowY: 'auto'
                                    } },
                                    calculationTypePlanOptions.map(([ref, label]) => (react_1.default.createElement("label", { key: ref, style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        } },
                                        react_1.default.createElement("input", { type: "checkbox", checked: selectedRefs.includes(ref), onChange: () => {
                                                const next = selectedRefs.includes(ref)
                                                    ? selectedRefs.filter((x) => x !== ref)
                                                    : [...selectedRefs, ref];
                                                handleChange({
                                                    formData: {
                                                        ...formData,
                                                        BaseCalculationTypes: buildBaseCalculationTypesFormValue(next)
                                                    }
                                                });
                                            } }),
                                        react_1.default.createElement("span", { title: ref }, label)))),
                                    orphanRefs.map((ref) => {
                                        const short = ref.includes('.') ? ref.split('.').pop() || ref : ref;
                                        return (react_1.default.createElement("label", { key: `orphan-${ref}`, style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                opacity: 0.9
                                            } },
                                            react_1.default.createElement("input", { type: "checkbox", checked: true, onChange: () => {
                                                    const next = selectedRefs.filter((x) => x !== ref);
                                                    handleChange({
                                                        formData: {
                                                            ...formData,
                                                            BaseCalculationTypes: buildBaseCalculationTypesFormValue(next)
                                                        }
                                                    });
                                                } }),
                                            react_1.default.createElement("span", { title: ref },
                                                short,
                                                ' ',
                                                react_1.default.createElement("span", { style: { color: 'var(--vscode-descriptionForeground)', fontSize: '11px' } }, "(\u043D\u0435\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438)"))));
                                    }),
                                    calculationTypePlanOptions.length === 0 && orphanRefs.length === 0 && (react_1.default.createElement("span", { style: {
                                            fontSize: '12px',
                                            color: 'var(--vscode-descriptionForeground)'
                                        } }, "\u041F\u043B\u0430\u043D\u044B \u0432\u0438\u0434\u043E\u0432 \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0432 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u0440\u0435\u043D\u044C \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438 \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043E\u0431\u044A\u0435\u043A\u0442 \u0438\u0437 \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0438 CF."))))));
                    }
                    const raw = formData[field];
                    const value = raw === undefined || raw === null
                        ? ''
                        : typeof raw === 'object'
                            ? raw
                            : raw;
                    return (react_1.default.createElement("div", { key: field, className: "property-card" },
                        react_1.default.createElement("div", { className: "property-header" },
                            react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)(field))),
                        react_1.default.createElement("div", { className: "property-value" }, typeof value === 'object' && value !== null ? (react_1.default.createElement("textarea", { value: JSON.stringify(value, null, 2), onChange: e => {
                                try {
                                    const parsed = JSON.parse(e.target.value);
                                    handleChange({ formData: { ...formData, [field]: parsed } });
                                }
                                catch {
                                    /* не JSON */
                                }
                            }, className: "property-textarea", rows: 4 })) : (react_1.default.createElement(FieldInput, { field: field, value: value, onChange: newValue => {
                                handleChange({ formData: { ...formData, [field]: newValue } });
                            }, objectType: objectType, label: (0, field_values_1.getFieldLabel)(field) })))));
                })))),
            isChartOfAccountsProps && (react_1.default.createElement("div", { className: "properties-group chart-of-accounts-data" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("h3", null, "\u0414\u0430\u043D\u043D\u044B\u0435")),
                react_1.default.createElement("div", { className: "properties-cards" }, CHART_OF_ACCOUNTS_DATA_PROPERTY_KEYS.map(field => {
                    const raw = formData[field];
                    const value = raw === undefined || raw === null
                        ? ''
                        : typeof raw === 'object'
                            ? raw
                            : raw;
                    return (react_1.default.createElement("div", { key: field, className: "property-card" },
                        react_1.default.createElement("div", { className: "property-header" },
                            react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)(field))),
                        react_1.default.createElement("div", { className: "property-value" }, typeof value === 'object' && value !== null ? (react_1.default.createElement("textarea", { value: JSON.stringify(value, null, 2), onChange: e => {
                                try {
                                    const parsed = JSON.parse(e.target.value);
                                    handleChange({ formData: { ...formData, [field]: parsed } });
                                }
                                catch {
                                    /* не JSON */
                                }
                            }, className: "property-textarea", rows: 4 })) : (react_1.default.createElement(FieldInput, { field: field, value: value, onChange: newValue => {
                                handleChange({ formData: { ...formData, [field]: newValue } });
                            }, objectType: objectType, label: (0, field_values_1.getFieldLabel)(field) })))));
                })))),
            isInformationRegister && (react_1.default.createElement("div", { className: "properties-group information-register-props" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("h3", null, "\u0420\u0435\u0433\u0438\u0441\u0442\u0440 \u0441\u0432\u0435\u0434\u0435\u043D\u0438\u0439")),
                react_1.default.createElement("div", { className: "properties-cards" }, INFORMATION_REGISTER_PROPERTY_KEYS.map((field) => renderRegisterScalarField(field))))),
            isAccumulationRegister && (react_1.default.createElement("div", { className: "properties-group accumulation-register-props" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("h3", null, "\u0420\u0435\u0433\u0438\u0441\u0442\u0440 \u043D\u0430\u043A\u043E\u043F\u043B\u0435\u043D\u0438\u044F")),
                react_1.default.createElement("div", { className: "properties-cards" }, ACCUMULATION_REGISTER_PROPERTY_KEYS.map((field) => renderRegisterScalarField(field))))),
            isAccountingRegister && (react_1.default.createElement("div", { className: "properties-group accounting-register-props" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("h3", null, "\u0420\u0435\u0433\u0438\u0441\u0442\u0440 \u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440\u0438\u0438")),
                react_1.default.createElement("div", { className: "properties-cards" }, ACCOUNTING_REGISTER_PROPERTY_KEYS.map((field) => {
                    if (field === 'ChartOfAccounts') {
                        const currentValue = typeof formData.ChartOfAccounts === 'string' ? formData.ChartOfAccounts : '';
                        const inList = chartOfAccountsPlanOptions.some(([ref]) => ref === currentValue);
                        const orphanRef = currentValue && !inList ? currentValue : '';
                        const hasPlans = chartOfAccountsPlanOptions.length > 0;
                        return (react_1.default.createElement("div", { key: field, className: "property-card" },
                            react_1.default.createElement("div", { className: "property-header" },
                                react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)(field))),
                            react_1.default.createElement("div", { className: "property-value" }, hasPlans ? (react_1.default.createElement("select", { value: currentValue, onChange: (e) => {
                                    const v = e.target.value;
                                    handleChange({
                                        formData: {
                                            ...formData,
                                            ChartOfAccounts: v
                                        }
                                    });
                                }, className: "property-select", style: { width: '100%', padding: '8px' } },
                                react_1.default.createElement("option", { value: "" }, "-- \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043B\u0430\u043D \u0441\u0447\u0435\u0442\u043E\u0432 --"),
                                chartOfAccountsPlanOptions.map(([ref, label]) => (react_1.default.createElement("option", { key: ref, value: ref }, label))),
                                orphanRef ? (react_1.default.createElement("option", { value: orphanRef },
                                    orphanRef.includes('.') ? orphanRef.split('.').pop() : orphanRef,
                                    ' ',
                                    "(\u043D\u0435\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445)")) : null)) : (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement("input", { type: "text", value: currentValue, onChange: (e) => {
                                        handleChange({
                                            formData: { ...formData, ChartOfAccounts: e.target.value }
                                        });
                                    }, placeholder: "ChartOfAccounts.\u0418\u043C\u044F\u041F\u043B\u0430\u043D\u0430", className: "property-input", style: { width: '100%', padding: '8px' } }),
                                react_1.default.createElement("div", { style: {
                                        marginTop: '6px',
                                        fontSize: '12px',
                                        color: 'var(--vscode-descriptionForeground)'
                                    } }, "\u041F\u043B\u0430\u043D\u044B \u0441\u0447\u0435\u0442\u043E\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0432 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445 \u2014 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0432\u0440\u0443\u0447\u043D\u0443\u044E."))))));
                    }
                    return renderRegisterScalarField(field);
                })))),
            isCalculationRegister && (react_1.default.createElement("div", { className: "properties-group calculation-register-props" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("h3", null, "\u0420\u0435\u0433\u0438\u0441\u0442\u0440 \u0440\u0430\u0441\u0447\u0451\u0442\u0430")),
                react_1.default.createElement("div", { className: "properties-cards" }, CALCULATION_REGISTER_PROPERTY_KEYS.map((field) => {
                    if (field === 'ChartOfCalculationTypes') {
                        const currentValue = typeof formData.ChartOfCalculationTypes === 'string'
                            ? formData.ChartOfCalculationTypes
                            : '';
                        const inList = calculationTypePlanOptions.some(([ref]) => ref === currentValue);
                        const orphanRef = currentValue && !inList ? currentValue : '';
                        const hasPlans = calculationTypePlanOptions.length > 0;
                        return (react_1.default.createElement("div", { key: field, className: "property-card" },
                            react_1.default.createElement("div", { className: "property-header" },
                                react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)(field))),
                            react_1.default.createElement("div", { className: "property-value" }, hasPlans ? (react_1.default.createElement("select", { value: currentValue, onChange: (e) => {
                                    const v = e.target.value;
                                    handleChange({
                                        formData: {
                                            ...formData,
                                            ChartOfCalculationTypes: v
                                        }
                                    });
                                }, className: "property-select", style: { width: '100%', padding: '8px' } },
                                react_1.default.createElement("option", { value: "" }, "-- \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043B\u0430\u043D \u0432\u0438\u0434\u043E\u0432 \u0440\u0430\u0441\u0447\u0451\u0442\u0430 --"),
                                calculationTypePlanOptions.map(([ref, label]) => (react_1.default.createElement("option", { key: ref, value: ref }, label))),
                                orphanRef ? (react_1.default.createElement("option", { value: orphanRef },
                                    orphanRef.includes('.') ? orphanRef.split('.').pop() : orphanRef,
                                    ' ',
                                    "(\u043D\u0435\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445)")) : null)) : (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement("input", { type: "text", value: currentValue, onChange: (e) => {
                                        handleChange({
                                            formData: {
                                                ...formData,
                                                ChartOfCalculationTypes: e.target.value
                                            }
                                        });
                                    }, placeholder: "ChartOfCalculationTypes.\u0418\u043C\u044F\u041F\u043B\u0430\u043D\u0430", className: "property-input", style: { width: '100%', padding: '8px' } }),
                                react_1.default.createElement("div", { style: {
                                        marginTop: '6px',
                                        fontSize: '12px',
                                        color: 'var(--vscode-descriptionForeground)'
                                    } }, "\u041F\u043B\u0430\u043D\u044B \u0432\u0438\u0434\u043E\u0432 \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0432 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445 \u2014 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0432\u0440\u0443\u0447\u043D\u0443\u044E."))))));
                    }
                    if (field === 'Schedule') {
                        const calcRegStubName = (typeof formData?.Name === 'string' && formData.Name.trim()) ||
                            (selectedObject?.name ? String(selectedObject.name).trim() : '') ||
                            '…';
                        const entries = metadata.informationRegistersSchedule ?? [];
                        const scheduleRef = typeof formData.Schedule === 'string' ? formData.Schedule.trim() : '';
                        const selectedEntry = entries.find((e) => e.ref === scheduleRef);
                        const scheduleOrphan = scheduleRef && !selectedEntry ? scheduleRef : '';
                        const valueStr = typeof formData.ScheduleValue === 'string' ? formData.ScheduleValue.trim() : '';
                        const dateStr = typeof formData.ScheduleDate === 'string' ? formData.ScheduleDate.trim() : '';
                        const resourceOpts = selectedEntry && scheduleRef
                            ? selectedEntry.resources.map((r) => ({
                                ref: calculationScheduleResourceRef(scheduleRef, r),
                                short: r
                            }))
                            : [];
                        const dateDimNamesForPicker = selectedEntry && scheduleRef
                            ? (selectedEntry.dateDimensions?.length ?? 0) > 0
                                ? selectedEntry.dateDimensions
                                : selectedEntry.dimensions
                            : [];
                        const dimensionOpts = selectedEntry && scheduleRef
                            ? dateDimNamesForPicker.map((d) => ({
                                ref: calculationScheduleDimensionRef(scheduleRef, d),
                                short: d
                            }))
                            : [];
                        const scheduleDateOnlyDateTypes = Boolean(selectedEntry?.dateDimensions && selectedEntry.dateDimensions.length > 0);
                        const valueInList = resourceOpts.some((x) => x.ref === valueStr);
                        const valueOrphan = valueStr && !valueInList ? valueStr : '';
                        const dateInList = dimensionOpts.some((x) => x.ref === dateStr);
                        const dateOrphan = dateStr && !dateInList ? dateStr : '';
                        const hasIrCatalog = entries.length > 0;
                        const patchSchedule = (patch) => {
                            handleChange({ formData: { ...formData, ...patch } });
                        };
                        return (react_1.default.createElement(react_1.default.Fragment, { key: "calc-schedule-trio" },
                            react_1.default.createElement("div", { className: "property-card" },
                                react_1.default.createElement("div", { className: "property-header" },
                                    react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)('Schedule'))),
                                react_1.default.createElement("div", { className: "property-value" }, hasIrCatalog ? (react_1.default.createElement("select", { className: "property-select", style: { width: '100%', padding: '8px' }, value: scheduleRef, onChange: (e) => {
                                        const v = e.target.value;
                                        patchSchedule({ Schedule: v, ScheduleValue: '', ScheduleDate: '' });
                                    } },
                                    react_1.default.createElement("option", { value: "" }, "-- \u041D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u044B\u0439 \u0440\u0435\u0433\u0438\u0441\u0442\u0440 \u0441\u0432\u0435\u0434\u0435\u043D\u0438\u0439 (\u0433\u0440\u0430\u0444\u0438\u043A) --"),
                                    entries.map((e) => (react_1.default.createElement("option", { key: e.ref, value: e.ref }, e.displayName))),
                                    scheduleOrphan ? (react_1.default.createElement("option", { value: scheduleOrphan },
                                        scheduleOrphan,
                                        " (\u043D\u0435\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445)")) : null)) : (react_1.default.createElement(react_1.default.Fragment, null,
                                    react_1.default.createElement("input", { type: "text", className: "property-input", style: { width: '100%', padding: '8px' }, value: scheduleRef, placeholder: "InformationRegister.\u0418\u043C\u044F\u0413\u0440\u0430\u0444\u0438\u043A\u0430", onChange: (e) => patchSchedule({ Schedule: e.target.value }) }),
                                    react_1.default.createElement("div", { style: {
                                            marginTop: '6px',
                                            fontSize: '12px',
                                            color: 'var(--vscode-descriptionForeground)'
                                        } }, "\u041D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u044B\u0435 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u044B \u0441\u0432\u0435\u0434\u0435\u043D\u0438\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u2014 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0432\u0440\u0443\u0447\u043D\u0443\u044E."))))),
                            react_1.default.createElement("div", { className: "property-card" },
                                react_1.default.createElement("div", { className: "property-header" },
                                    react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)('ScheduleValue'))),
                                react_1.default.createElement("div", { className: "property-value" }, hasIrCatalog && selectedEntry && scheduleRef && resourceOpts.length > 0 ? (react_1.default.createElement("select", { className: "property-select", style: { width: '100%', padding: '8px' }, value: valueStr, onChange: (e) => patchSchedule({ ScheduleValue: e.target.value }) },
                                    react_1.default.createElement("option", { value: "" }, "-- \u0420\u0435\u0441\u0443\u0440\u0441 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430 (\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0433\u0440\u0430\u0444\u0438\u043A\u0430) --"),
                                    resourceOpts.map((x) => (react_1.default.createElement("option", { key: x.ref, value: x.ref }, x.short))),
                                    valueOrphan ? (react_1.default.createElement("option", { value: valueOrphan },
                                        valueOrphan,
                                        " (\u043D\u0435\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445)")) : null)) : (react_1.default.createElement("input", { type: "text", className: "property-input", style: { width: '100%', padding: '8px' }, value: valueStr, disabled: Boolean(hasIrCatalog && !scheduleRef), placeholder: "InformationRegister.\u0418\u043C\u044F.Resource.\u0418\u043C\u044F\u0420\u0435\u0441\u0443\u0440\u0441\u0430", onChange: (e) => patchSchedule({ ScheduleValue: e.target.value }) })))),
                            react_1.default.createElement("div", { className: "property-card" },
                                react_1.default.createElement("div", { className: "property-header" },
                                    react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)('ScheduleDate'))),
                                react_1.default.createElement("div", { className: "property-value" }, hasIrCatalog && selectedEntry && scheduleRef && dimensionOpts.length > 0 ? (react_1.default.createElement("select", { className: "property-select", style: { width: '100%', padding: '8px' }, value: dateStr, onChange: (e) => patchSchedule({ ScheduleDate: e.target.value }) },
                                    react_1.default.createElement("option", { value: "" }, scheduleDateOnlyDateTypes
                                        ? '-- Измерение типа «Дата» (дата графика) --'
                                        : '-- Измерение регистра (дата графика) --'),
                                    dimensionOpts.map((x) => (react_1.default.createElement("option", { key: x.ref, value: x.ref }, x.short))),
                                    dateOrphan ? (react_1.default.createElement("option", { value: dateOrphan },
                                        dateOrphan,
                                        " (\u043D\u0435\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445)")) : null)) : (react_1.default.createElement("input", { type: "text", className: "property-input", style: { width: '100%', padding: '8px' }, value: dateStr, disabled: Boolean(hasIrCatalog && !scheduleRef), placeholder: "InformationRegister.\u0418\u043C\u044F.Dimension.\u0418\u043C\u044F\u0418\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F", onChange: (e) => patchSchedule({ ScheduleDate: e.target.value }) })))),
                            react_1.default.createElement("div", { className: "property-card", style: { borderStyle: 'dashed' } },
                                react_1.default.createElement("div", { className: "property-value", style: {
                                        fontSize: '12px',
                                        lineHeight: 1.5,
                                        color: 'var(--vscode-descriptionForeground)'
                                    } },
                                    react_1.default.createElement("div", null,
                                        "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0420\u0430\u0441\u0447\u0435\u0442\u0430.",
                                        calcRegStubName,
                                        ": \u0412 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0435 \u0433\u0440\u0430\u0444\u0438\u043A\u0430 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D \u043D\u0435\u043F\u0435\u0440\u0438\u043E\u0434\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0440\u0435\u0433\u0438\u0441\u0442\u0440 \u0441\u0432\u0435\u0434\u0435\u043D\u0438\u0439."),
                                    react_1.default.createElement("div", { style: { marginTop: '8px' } },
                                        "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0420\u0430\u0441\u0447\u0435\u0442\u0430.",
                                        calcRegStubName,
                                        ": \u0412 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0435 \u0434\u0430\u0442\u044B \u0433\u0440\u0430\u0444\u0438\u043A\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u043E \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435 \u0442\u0438\u043F\u0430 \u00AB\u0414\u0430\u0442\u0430\u00BB.")))));
                    }
                    if (field === 'ScheduleValue' || field === 'ScheduleDate') {
                        return null;
                    }
                    return renderRegisterScalarField(field);
                })))),
            (isInformationRegister ||
                isAccumulationRegister ||
                isAccountingRegister ||
                isCalculationRegister) && (react_1.default.createElement("div", { className: "properties-group register-recorder-documents" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("h3", null, "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B (RegisterRecords)")),
                react_1.default.createElement("div", { className: "properties-cards" },
                    react_1.default.createElement("div", { className: "property-card" },
                        react_1.default.createElement("div", { className: "property-header" },
                            react_1.default.createElement("h4", null, "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u044B")),
                        react_1.default.createElement("div", { className: "property-value" }, isInformationRegister && formData?.WriteMode !== 'RecorderSubordinate' ? (react_1.default.createElement("div", { style: { fontSize: '13px' } }, (selectedObject?.recorderDocumentNames?.length ?? 0) === 0 ? (react_1.default.createElement("span", { style: { color: 'var(--vscode-descriptionForeground)' } }, "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432 \u0441 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F\u043C\u0438 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0443 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E (\u0438\u043B\u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 Documents \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D).")) : (react_1.default.createElement("ul", { style: { margin: 0, paddingLeft: '1.2em' } }, (selectedObject?.recorderDocumentNames || []).map((n) => (react_1.default.createElement("li", { key: n }, n))))))) : (react_1.default.createElement("div", { style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                maxHeight: '280px',
                                overflowY: 'auto'
                            } },
                            documentSelectOptions.map(([docName]) => {
                                const selected = Array.isArray(selectedObject?.recorderDocumentNames)
                                    ? selectedObject.recorderDocumentNames.includes(docName)
                                    : false;
                                return (react_1.default.createElement("label", { key: docName, style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        fontSize: '13px'
                                    } },
                                    react_1.default.createElement("input", { type: "checkbox", checked: selected, onChange: () => {
                                            if (!selectedObject || !onSelectedObjectChange)
                                                return;
                                            const cur = Array.isArray(selectedObject.recorderDocumentNames)
                                                ? [...selectedObject.recorderDocumentNames]
                                                : [];
                                            const next = selected
                                                ? cur.filter((x) => x !== docName)
                                                : [...cur, docName];
                                            onSelectedObjectChange({
                                                ...selectedObject,
                                                recorderDocumentNames: next
                                            });
                                            onChange(formData);
                                        } }),
                                    react_1.default.createElement("span", { title: `Document.${docName}` }, docName)));
                            }),
                            (Array.isArray(selectedObject?.recorderDocumentNames)
                                ? selectedObject.recorderDocumentNames
                                : [])
                                .filter((n) => !documentSelectOptions.some(([d]) => d === n))
                                .map((n) => (react_1.default.createElement("label", { key: `orphan-${n}`, style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    opacity: 0.9
                                } },
                                react_1.default.createElement("input", { type: "checkbox", checked: true, onChange: () => {
                                        if (!selectedObject || !onSelectedObjectChange)
                                            return;
                                        const cur = [...(selectedObject.recorderDocumentNames || [])];
                                        onSelectedObjectChange({
                                            ...selectedObject,
                                            recorderDocumentNames: cur.filter((x) => x !== n)
                                        });
                                        onChange(formData);
                                    } }),
                                react_1.default.createElement("span", { title: n },
                                    n,
                                    ' ',
                                    react_1.default.createElement("span", { style: {
                                            color: 'var(--vscode-descriptionForeground)',
                                            fontSize: '11px'
                                        } }, "(\u043D\u0435\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445)"))))),
                            documentSelectOptions.length === 0 &&
                                !(selectedObject?.recorderDocumentNames?.length ?? 0) && (react_1.default.createElement("span", { style: {
                                    fontSize: '12px',
                                    color: 'var(--vscode-descriptionForeground)'
                                } }, "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0432 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u0440\u0435\u043D\u044C \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438."))))))))),
            standardAttributes && (react_1.default.createElement("div", { className: "properties-group" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("h3", null, "\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0435 \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B"),
                    react_1.default.createElement("span", { className: "section-count" },
                        "(",
                        Array.isArray(standardAttributes) ? standardAttributes.length : 1,
                        ")")),
                react_1.default.createElement("div", { className: "standard-attributes-list" }, Array.isArray(standardAttributes) ? (standardAttributes.map((attr, index) => {
                    // Определяем имя атрибута из разных возможных источников
                    const rawAttrName = attr.Name ||
                        attr.name ||
                        attr['xr:StandardAttribute']?.Name ||
                        attr['xr:StandardAttribute']?.name ||
                        `Стандартный атрибут ${index + 1}`;
                    // Переводим имя атрибута через getFieldLabel
                    const attrName = (0, field_values_1.getFieldLabel)(rawAttrName);
                    // Получаем свойства для отображения
                    const displayProps = attr['xr:StandardAttribute'] || attr;
                    return (react_1.default.createElement("div", { key: index, className: "standard-attribute-card" },
                        react_1.default.createElement("div", { className: "attribute-header" },
                            react_1.default.createElement("h4", null, attrName)),
                        react_1.default.createElement("div", { className: "attribute-properties" }, Object.entries(displayProps)
                            .filter(([key]) => !['name', 'Name', 'xr:StandardAttribute'].includes(key))
                            .slice(0, 8)
                            .map(([key, val]) => {
                            // Если это простое значение (не объект), показываем редактируемое поле
                            if (typeof val !== 'object' || val === null) {
                                return (react_1.default.createElement("div", { key: key, className: "property-row" },
                                    react_1.default.createElement("span", { className: "property-name" },
                                        (0, field_values_1.getFieldLabel)(key),
                                        ":"),
                                    react_1.default.createElement("div", { className: "property-value-inline" },
                                        react_1.default.createElement(FieldInput, { field: key, value: val, onChange: (newValue) => {
                                                const updatedProps = { ...displayProps, [key]: newValue };
                                                handleChange({
                                                    formData: {
                                                        ...formData,
                                                        StandardAttributes: Array.isArray(standardAttributes)
                                                            ? standardAttributes.map((sa, i) => i === index ? updatedProps : sa)
                                                            : updatedProps
                                                    }
                                                });
                                            }, objectType: objectType, label: key }))));
                            }
                            // Для объектов обрабатываем специальные случаи
                            let displayValue;
                            if (val && typeof val === 'object') {
                                // Проверяем на xsi:nil
                                if (val['xsi:nil'] === 'true' || val['xsi:nil'] === true || val['@_xsi:nil'] === 'true') {
                                    displayValue = '';
                                }
                                else if (val['#text'] !== undefined) {
                                    displayValue = String(val['#text']);
                                }
                                else if (val.text !== undefined) {
                                    displayValue = String(val.text);
                                }
                                else {
                                    // Для других объектов показываем JSON, но ограничиваем длину
                                    displayValue = JSON.stringify(val).substring(0, 50);
                                }
                            }
                            else {
                                displayValue = String(val || '');
                            }
                            return (react_1.default.createElement("div", { key: key, className: "property-row" },
                                react_1.default.createElement("span", { className: "property-name" },
                                    (0, field_values_1.getFieldLabel)(key),
                                    ":"),
                                react_1.default.createElement("span", { className: "property-value" }, displayValue || '(пусто)')));
                        }))));
                })) : (react_1.default.createElement("div", { className: "standard-attribute-card" },
                    react_1.default.createElement("div", { className: "attribute-header" },
                        react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)(standardAttributes.Name ||
                            standardAttributes.name ||
                            standardAttributes['xr:StandardAttribute']?.Name ||
                            standardAttributes['xr:StandardAttribute']?.name ||
                            'Стандартный атрибут'))),
                    Object.keys(standardAttributes).length > 1 && (react_1.default.createElement("div", { className: "attribute-properties" }, Object.entries(standardAttributes)
                        .filter(([key]) => !['name', 'Name', 'xr:StandardAttribute'].includes(key))
                        .slice(0, 8)
                        .map(([key, val]) => {
                        // Обрабатываем специальные случаи для объектов
                        let displayValue;
                        if (val && typeof val === 'object') {
                            // Проверяем на xsi:nil
                            if (val['xsi:nil'] === 'true' || val['xsi:nil'] === true || val['@_xsi:nil'] === 'true') {
                                displayValue = '';
                            }
                            else if (val['#text'] !== undefined) {
                                displayValue = String(val['#text']);
                            }
                            else if (val.text !== undefined) {
                                displayValue = String(val.text);
                            }
                            else {
                                // Для других объектов показываем JSON, но ограничиваем длину
                                displayValue = JSON.stringify(val).substring(0, 50);
                            }
                        }
                        else {
                            displayValue = String(val || '');
                        }
                        return (react_1.default.createElement("div", { key: key, className: "property-row" },
                            react_1.default.createElement("span", { className: "property-name" },
                                (0, field_values_1.getFieldLabel)(key),
                                ":"),
                            react_1.default.createElement("span", { className: "property-value" }, displayValue || '(пусто)')));
                    })))))))),
            isDocument && (react_1.default.createElement("div", { className: "properties-group" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("h3", null, "\u0414\u0432\u0438\u0436\u0435\u043D\u0438\u044F \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430"),
                    react_1.default.createElement("span", { className: "section-count" },
                        "(",
                        registerRecords ? (Array.isArray(registerRecords) ? registerRecords.length : 1) : 0,
                        ")"),
                    react_1.default.createElement("button", { className: "btn-primary btn-add-tabular", onClick: () => {
                            setNewRegisterRecord('');
                            setEditingRegisterRecordIndex(null);
                            setShowRegisterRecordsEditor(true);
                        } },
                        react_1.default.createElement("span", { className: "btn-icon" }, "\u2795"),
                        react_1.default.createElement("span", null, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u0433\u0438\u0441\u0442\u0440"))),
                registerRecords ? (react_1.default.createElement("div", { className: "register-records-list" }, Array.isArray(registerRecords) ? (registerRecords.map((record, index) => {
                    // Обрабатываем разные форматы RegisterRecords
                    const recordName = record.Item?.text ||
                        record.Item?.['#text'] ||
                        record.Item ||
                        record.name ||
                        record.Name ||
                        `Регистр ${index + 1}`;
                    return (react_1.default.createElement("div", { key: index, className: "register-record-card" },
                        react_1.default.createElement("div", { className: "record-header" },
                            react_1.default.createElement("h4", null, recordName),
                            react_1.default.createElement("div", { style: { display: 'flex', gap: '8px' } },
                                react_1.default.createElement("button", { className: "btn-edit-type", onClick: () => {
                                        const currentRegister = record.Item?.text ||
                                            record.Item?.['#text'] ||
                                            record.Item ||
                                            record.name ||
                                            record.Name || '';
                                        setNewRegisterRecord(currentRegister);
                                        setEditingRegisterRecordIndex(index);
                                        setShowRegisterRecordsEditor(true);
                                    }, title: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", "aria-label": "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", style: {
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                        background: 'var(--vscode-button-secondaryBackground)',
                                        color: 'var(--vscode-button-secondaryForeground)',
                                        border: '1px solid var(--vscode-button-border)',
                                        borderRadius: '3px',
                                        cursor: 'pointer'
                                    } }, "\u270E"),
                                react_1.default.createElement("button", { className: "btn-edit-type", onClick: () => {
                                        const updatedRecords = [...registerRecords];
                                        updatedRecords.splice(index, 1);
                                        handleChange({
                                            formData: {
                                                ...formData,
                                                RegisterRecords: updatedRecords.length > 0 ? updatedRecords : undefined
                                            }
                                        });
                                    }, title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", style: {
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                        background: 'var(--vscode-errorForeground)',
                                        color: 'var(--vscode-button-foreground)',
                                        border: '1px solid var(--vscode-button-border)',
                                        borderRadius: '3px',
                                        cursor: 'pointer'
                                    } }, "\u00D7"))),
                        react_1.default.createElement("div", { className: "record-content" }, record.Item && typeof record.Item === 'object' ? (react_1.default.createElement("div", { className: "property-row" },
                            react_1.default.createElement("span", { className: "property-name" }, "\u0422\u0438\u043F:"),
                            react_1.default.createElement("span", { className: "property-value" }, record.Item['xsi:type'] || record.Item.type || 'Не указан'))) : record.name || record.Name ? (react_1.default.createElement("div", { className: "property-row" },
                            react_1.default.createElement("span", { className: "property-name" }, "\u0418\u043C\u044F:"),
                            react_1.default.createElement("span", { className: "property-value" }, record.name || record.Name))) : (react_1.default.createElement("div", { className: "property-row" },
                            react_1.default.createElement("span", { className: "property-value" }, String(record).substring(0, 100)))))));
                })) : (react_1.default.createElement("div", { className: "register-record-card" },
                    react_1.default.createElement("div", { className: "record-header" },
                        react_1.default.createElement("h4", null, "\u0414\u0432\u0438\u0436\u0435\u043D\u0438\u0435 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430"),
                        react_1.default.createElement("button", { className: "btn-edit-type", onClick: () => {
                                const currentRegister = registerRecords.Item?.text ||
                                    registerRecords.Item?.['#text'] ||
                                    registerRecords.Item ||
                                    registerRecords.name ||
                                    registerRecords.Name || '';
                                setNewRegisterRecord(currentRegister);
                                setEditingRegisterRecordIndex(0);
                                setShowRegisterRecordsEditor(true);
                            }, title: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", "aria-label": "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", style: {
                                padding: '4px 8px',
                                fontSize: '12px',
                                background: 'var(--vscode-button-secondaryBackground)',
                                color: 'var(--vscode-button-secondaryForeground)',
                                border: '1px solid var(--vscode-button-border)',
                                borderRadius: '3px',
                                cursor: 'pointer'
                            } }, "\u270E")),
                    react_1.default.createElement("div", { className: "record-content" }, typeof registerRecords === 'object' ? (react_1.default.createElement("div", { className: "property-row" },
                        react_1.default.createElement("span", { className: "property-name" }, "\u0414\u0430\u043D\u043D\u044B\u0435:"),
                        react_1.default.createElement("span", { className: "property-value" }, JSON.stringify(registerRecords, null, 2).substring(0, 200)))) : (react_1.default.createElement("span", { className: "property-value" }, String(registerRecords).substring(0, 100)))))))) : (react_1.default.createElement("div", { className: "register-records-empty", style: { padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' } }, "\u041D\u0435\u0442 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0439 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \"+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u0433\u0438\u0441\u0442\u0440\" \u0434\u043B\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F.")))),
            additionalFields.length > 0 && (react_1.default.createElement("div", { className: "properties-group" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("h3", null, "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E"),
                    react_1.default.createElement("span", { className: "section-count" },
                        "(",
                        additionalFields.length,
                        ")")),
                react_1.default.createElement("div", { className: "additional-properties-list" }, additionalFields.map(field => {
                    const value = formData[field];
                    // Специальная обработка для ExtDimensionTypes
                    if (field === 'ExtDimensionTypes') {
                        // Фильтруем планы видов характеристик из referenceTypes
                        const chartOfCharacteristicTypesOptions = (metadata.referenceTypes || [])
                            .filter((refType) => {
                            if (typeof refType !== 'string')
                                return false;
                            // Ищем типы вида cfg:ChartOfCharacteristicTypesRef.ИмяПлана
                            return refType.startsWith('cfg:ChartOfCharacteristicTypesRef.') ||
                                refType.startsWith('ChartOfCharacteristicTypesRef.');
                        })
                            .map((refType) => {
                            // Извлекаем имя плана: cfg:ChartOfCharacteristicTypesRef.ИмяПлана -> ChartOfCharacteristicTypes.ИмяПлана
                            const match = refType.match(/ChartOfCharacteristicTypesRef\.(.+)$/);
                            if (match) {
                                return `ChartOfCharacteristicTypes.${match[1]}`;
                            }
                            return refType.replace(/^cfg:/, '').replace(/Ref\./, '.');
                        })
                            .sort();
                        const currentValue = typeof value === 'string' ? value : '';
                        const isValid = !currentValue || currentValue.startsWith('ChartOfCharacteristicTypes.');
                        return (react_1.default.createElement("div", { key: field, className: "property-card" },
                            react_1.default.createElement("div", { className: "property-header" },
                                react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)(field))),
                            react_1.default.createElement("div", { className: "property-value" },
                                react_1.default.createElement("select", { value: chartOfCharacteristicTypesOptions.includes(currentValue) ? currentValue : '', onChange: (e) => {
                                        const newValue = e.target.value;
                                        if (newValue) {
                                            handleChange({ formData: { ...formData, [field]: newValue } });
                                        }
                                    }, className: "property-select", style: {
                                        width: '100%',
                                        marginBottom: '8px',
                                        padding: '8px',
                                        fontSize: '14px',
                                        border: '1px solid var(--vscode-input-border)',
                                        backgroundColor: 'var(--vscode-input-background)',
                                        color: 'var(--vscode-input-foreground)'
                                    } },
                                    react_1.default.createElement("option", { value: "" }, "-- \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043B\u0430\u043D \u0432\u0438\u0434\u043E\u0432 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A --"),
                                    chartOfCharacteristicTypesOptions.map((option) => (react_1.default.createElement("option", { key: option, value: option }, option)))),
                                react_1.default.createElement("input", { type: "text", value: currentValue, onChange: (e) => {
                                        const newValue = e.target.value;
                                        handleChange({ formData: { ...formData, [field]: newValue } });
                                    }, placeholder: "ChartOfCharacteristicTypes.\u0418\u043C\u044F\u041F\u043B\u0430\u043D\u0430", className: "property-input", style: {
                                        width: '100%',
                                        padding: '8px',
                                        fontSize: '14px',
                                        border: isValid ? '1px solid var(--vscode-input-border)' : '1px solid var(--vscode-errorForeground)',
                                        backgroundColor: 'var(--vscode-input-background)',
                                        color: 'var(--vscode-input-foreground)'
                                    } }),
                                !isValid && currentValue && (react_1.default.createElement("div", { style: {
                                        marginTop: '4px',
                                        fontSize: '12px',
                                        color: 'var(--vscode-errorForeground)'
                                    } }, "\u041E\u0448\u0438\u0431\u043A\u0430: \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C\u0441\u044F \u0441 \"ChartOfCharacteristicTypes.\"")),
                                react_1.default.createElement("div", { style: {
                                        marginTop: '4px',
                                        fontSize: '12px',
                                        color: 'var(--vscode-descriptionForeground)'
                                    } }, "\u0422\u0438\u043F \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E ChartOfCharacteristicTypes"))));
                    }
                    // Редактор типов для определяемых типов (DefinedType)
                    if (field === 'Type' && objectType === 'DefinedType') {
                        return (react_1.default.createElement("div", { key: field, className: "property-card" },
                            react_1.default.createElement("div", { className: "property-header" },
                                react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)(field))),
                            react_1.default.createElement("div", { className: "property-value" },
                                react_1.default.createElement(TypeWidget_1.TypeWidget, { ...{
                                        id: `defined-type-${field}`,
                                        value: value,
                                        onChange: (newValue) => {
                                            handleChange({ formData: { ...formData, [field]: newValue } });
                                        },
                                        schema: {},
                                        label: (0, field_values_1.getFieldLabel)(field),
                                        required: false,
                                        readonly: false,
                                        rawErrors: [],
                                        errorSchema: {},
                                        registry: {},
                                        formContext: {},
                                        options: {
                                            registers: metadata.registers,
                                            referenceTypes: metadata.referenceTypes,
                                            definedTypeMode: true
                                        }
                                    } }))));
                    }
                    return (react_1.default.createElement("div", { key: field, className: "property-card" },
                        react_1.default.createElement("div", { className: "property-header" },
                            react_1.default.createElement("h4", null, (0, field_values_1.getFieldLabel)(field))),
                        react_1.default.createElement("div", { className: "property-value" }, typeof value === 'object' && value !== null ? (react_1.default.createElement("textarea", { value: JSON.stringify(value, null, 2), onChange: (e) => {
                                try {
                                    const parsed = JSON.parse(e.target.value);
                                    handleChange({ formData: { ...formData, [field]: parsed } });
                                }
                                catch {
                                    // Оставляем как строку если не валидный JSON
                                }
                            }, className: "property-textarea", rows: 4 })) : (react_1.default.createElement(FieldInput, { field: field, value: value, onChange: (newValue) => {
                                handleChange({ formData: { ...formData, [field]: newValue } });
                            }, objectType: objectType, label: (0, field_values_1.getFieldLabel)(field) })))));
                }))))));
    }
    else if (activeTab === 'characteristicTypes') {
        // Проверяем, является ли объект планом видов характеристик
        const isChartOfCharacteristicTypes = objectType === 'ChartOfCharacteristicTypes' ||
            objectType === 'План видов характеристик' ||
            (selectedObject?.sourcePath && selectedObject.sourcePath.includes('ChartsOfCharacteristicTypes'));
        if (!isChartOfCharacteristicTypes) {
            content = (react_1.default.createElement("div", { className: "form-editor" },
                react_1.default.createElement("div", { className: "editor-empty" },
                    react_1.default.createElement("p", null, "\u042D\u0442\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432 \u0442\u0438\u043F\u0430 \"\u041F\u043B\u0430\u043D \u0432\u0438\u0434\u043E\u0432 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\""))));
        }
        else {
            const characteristicTypes = getCharacteristicTypes();
            content = (react_1.default.createElement("div", { className: "form-editor" },
                react_1.default.createElement("div", { className: "section-header", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                    react_1.default.createElement("h3", null,
                        "\u0422\u0438\u043F\u044B \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A (",
                        characteristicTypes.length,
                        ")"),
                    react_1.default.createElement("button", { className: "btn-primary btn-add-characteristic-type", type: "button", onClick: () => {
                            setEditingCharacteristicTypeIndex(null);
                            setShowCharacteristicTypeModal(true);
                        }, style: {
                            padding: '6px 12px',
                            background: 'var(--vscode-button-background)',
                            color: 'var(--vscode-button-foreground)',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        } },
                        react_1.default.createElement("span", null, "\u2795"),
                        react_1.default.createElement("span", null, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0442\u0438\u043F \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F"))),
                react_1.default.createElement("div", { className: "characteristic-types-list" }, characteristicTypes.length === 0 ? (react_1.default.createElement("div", { className: "characteristic-types-empty", style: { padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' } }, "\u041D\u0435\u0442 \u0442\u0438\u043F\u043E\u0432 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \"\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0442\u0438\u043F \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F\" \u0434\u043B\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F.")) : (characteristicTypes.map((typeValue, index) => (react_1.default.createElement("div", { key: index, className: "characteristic-type-card", style: {
                        padding: '12px',
                        marginBottom: '8px',
                        border: '1px solid var(--vscode-panel-border)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--vscode-editor-background)'
                    } },
                    react_1.default.createElement("div", { className: "characteristic-type-header", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h4", { style: { margin: 0, fontSize: '14px', fontWeight: '500' } }, (0, typeUtils_1.formatTypeForDisplay)({ kind: typeValue })),
                            react_1.default.createElement("div", { style: { fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' } }, typeValue)),
                        react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                            react_1.default.createElement("button", { className: "btn-edit-type", type: "button", onClick: (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingCharacteristicTypeIndex(index);
                                    setShowCharacteristicTypeModal(true);
                                }, title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0442\u0438\u043F\u043E\u0432", "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0442\u0438\u043F\u043E\u0432", style: {
                                    padding: '4px 8px',
                                    fontSize: '16px',
                                    background: 'var(--vscode-button-secondaryBackground)',
                                    color: 'var(--vscode-button-secondaryForeground)',
                                    border: '1px solid var(--vscode-button-border)',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    lineHeight: '1'
                                } }, "\u270E"),
                            react_1.default.createElement("button", { className: "btn-delete-type", type: "button", onClick: (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteCharacteristicType(index);
                                }, title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", style: {
                                    padding: '4px 8px',
                                    fontSize: '16px',
                                    background: 'var(--vscode-errorForeground)',
                                    color: 'var(--vscode-button-foreground)',
                                    border: '1px solid var(--vscode-button-border)',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    lineHeight: '1'
                                } }, "\u00D7"))))))))));
        }
    }
    else if (activeTab === 'accountingFlags') {
        // Проверяем, является ли объект планом счетов
        const isChartOfAccounts = objectType === 'ChartOfAccounts' ||
            (selectedObject?.sourcePath && selectedObject.sourcePath.includes('ChartsOfAccounts'));
        if (!isChartOfAccounts) {
            content = (react_1.default.createElement("div", { className: "form-editor" },
                react_1.default.createElement("div", { className: "editor-empty" },
                    react_1.default.createElement("p", null, "\u042D\u0442\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432 \u0442\u0438\u043F\u0430 \"\u041F\u043B\u0430\u043D \u0441\u0447\u0435\u0442\u043E\u0432\""))));
        }
        else {
            const accountingFlags = selectedObject?.accountingFlags || [];
            const extDimensionAccountingFlags = selectedObject?.extDimensionAccountingFlags || [];
            content = (react_1.default.createElement("div", { className: "form-editor" },
                react_1.default.createElement("div", { className: "properties-group", style: { marginBottom: '24px' } },
                    react_1.default.createElement("div", { className: "section-header", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                        react_1.default.createElement("h3", null,
                            "\u041F\u043E \u0441\u0447\u0435\u0442\u0430\u043C (",
                            accountingFlags.length,
                            ")"),
                        react_1.default.createElement("button", { className: "btn-primary", type: "button", onClick: () => {
                                setEditingAccountingFlag(null);
                                setAddingAccountingFlagType('accountingFlag');
                                setShowAccountingFlagModal(true);
                            }, style: {
                                padding: '6px 12px',
                                background: 'var(--vscode-button-background)',
                                color: 'var(--vscode-button-foreground)',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            } },
                            react_1.default.createElement("span", null, "\u2795"),
                            react_1.default.createElement("span", null, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u0438\u0437\u043D\u0430\u043A \u0443\u0447\u0435\u0442\u0430"))),
                    react_1.default.createElement("div", { className: "accounting-flags-list" }, accountingFlags.length === 0 ? (react_1.default.createElement("div", { style: { padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' } }, "\u041D\u0435\u0442 \u043F\u0440\u0438\u0437\u043D\u0430\u043A\u043E\u0432 \u0443\u0447\u0435\u0442\u0430 \u043F\u043E \u0441\u0447\u0435\u0442\u0430\u043C. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \"\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u0438\u0437\u043D\u0430\u043A \u0443\u0447\u0435\u0442\u0430\" \u0434\u043B\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F.")) : (accountingFlags.map((flag, index) => (react_1.default.createElement("div", { key: index, className: "accounting-flag-card", style: {
                            padding: '12px',
                            marginBottom: '8px',
                            border: '1px solid var(--vscode-panel-border)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--vscode-editor-background)'
                        } },
                        react_1.default.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                            react_1.default.createElement("div", null,
                                react_1.default.createElement("h4", { style: { margin: 0, fontSize: '14px', fontWeight: '500' } }, flag.name || `Признак учета ${index + 1}`),
                                flag.properties?.Synonym && (react_1.default.createElement("div", { style: { fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' } }, (() => {
                                    const syn = flag.properties.Synonym;
                                    if (typeof syn === 'string')
                                        return syn;
                                    if (syn?.['v8:item']) {
                                        const items = Array.isArray(syn['v8:item']) ? syn['v8:item'] : [syn['v8:item']];
                                        return items.map((item) => item['v8:content'] || '').filter(Boolean).join(', ');
                                    }
                                    return '';
                                })())),
                                react_1.default.createElement("div", { style: { fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' } }, "\u0422\u0438\u043F: xs:boolean")),
                            react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                                react_1.default.createElement("button", { type: "button", onClick: () => {
                                        setEditingAccountingFlag({ type: 'accountingFlag', index });
                                        setShowAccountingFlagModal(true);
                                    }, title: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", "aria-label": "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", style: {
                                        padding: '4px 8px',
                                        fontSize: '16px',
                                        background: 'var(--vscode-button-secondaryBackground)',
                                        color: 'var(--vscode-button-secondaryForeground)',
                                        border: '1px solid var(--vscode-button-border)',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        lineHeight: '1'
                                    } }, "\u270E"),
                                react_1.default.createElement("button", { type: "button", onClick: () => handleDeleteAccountingFlag('accountingFlag', index), title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", style: {
                                        padding: '4px 8px',
                                        fontSize: '16px',
                                        background: 'var(--vscode-errorForeground)',
                                        color: 'var(--vscode-button-foreground)',
                                        border: '1px solid var(--vscode-button-border)',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        lineHeight: '1'
                                    } }, "\u00D7"))))))))),
                react_1.default.createElement("div", { className: "properties-group" },
                    react_1.default.createElement("div", { className: "section-header", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                        react_1.default.createElement("h3", null,
                            "\u041F\u043E \u0441\u0443\u0431\u043A\u043E\u043D\u0442\u043E (",
                            extDimensionAccountingFlags.length,
                            ")"),
                        react_1.default.createElement("button", { className: "btn-primary", type: "button", onClick: () => {
                                setEditingAccountingFlag(null);
                                setAddingAccountingFlagType('extDimensionAccountingFlag');
                                setShowAccountingFlagModal(true);
                            }, style: {
                                padding: '6px 12px',
                                background: 'var(--vscode-button-background)',
                                color: 'var(--vscode-button-foreground)',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            } },
                            react_1.default.createElement("span", null, "\u2795"),
                            react_1.default.createElement("span", null, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u0438\u0437\u043D\u0430\u043A \u0443\u0447\u0435\u0442\u0430"))),
                    react_1.default.createElement("div", { className: "accounting-flags-list" }, extDimensionAccountingFlags.length === 0 ? (react_1.default.createElement("div", { style: { padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' } }, "\u041D\u0435\u0442 \u043F\u0440\u0438\u0437\u043D\u0430\u043A\u043E\u0432 \u0443\u0447\u0435\u0442\u0430 \u043F\u043E \u0441\u0443\u0431\u043A\u043E\u043D\u0442\u043E. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \"\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u0438\u0437\u043D\u0430\u043A \u0443\u0447\u0435\u0442\u0430\" \u0434\u043B\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F.")) : (extDimensionAccountingFlags.map((flag, index) => (react_1.default.createElement("div", { key: index, className: "accounting-flag-card", style: {
                            padding: '12px',
                            marginBottom: '8px',
                            border: '1px solid var(--vscode-panel-border)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--vscode-editor-background)'
                        } },
                        react_1.default.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                            react_1.default.createElement("div", null,
                                react_1.default.createElement("h4", { style: { margin: 0, fontSize: '14px', fontWeight: '500' } }, flag.name || `Признак учета ${index + 1}`),
                                flag.properties?.Synonym && (react_1.default.createElement("div", { style: { fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' } }, (() => {
                                    const syn = flag.properties.Synonym;
                                    if (typeof syn === 'string')
                                        return syn;
                                    if (syn?.['v8:item']) {
                                        const items = Array.isArray(syn['v8:item']) ? syn['v8:item'] : [syn['v8:item']];
                                        return items.map((item) => item['v8:content'] || '').filter(Boolean).join(', ');
                                    }
                                    return '';
                                })())),
                                react_1.default.createElement("div", { style: { fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' } }, "\u0422\u0438\u043F: xs:boolean")),
                            react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                                react_1.default.createElement("button", { type: "button", onClick: () => {
                                        setEditingAccountingFlag({ type: 'extDimensionAccountingFlag', index });
                                        setShowAccountingFlagModal(true);
                                    }, title: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", "aria-label": "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", style: {
                                        padding: '4px 8px',
                                        fontSize: '16px',
                                        background: 'var(--vscode-button-secondaryBackground)',
                                        color: 'var(--vscode-button-secondaryForeground)',
                                        border: '1px solid var(--vscode-button-border)',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        lineHeight: '1'
                                    } }, "\u270E"),
                                react_1.default.createElement("button", { type: "button", onClick: () => handleDeleteAccountingFlag('extDimensionAccountingFlag', index), title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", style: {
                                        padding: '4px 8px',
                                        fontSize: '16px',
                                        background: 'var(--vscode-errorForeground)',
                                        color: 'var(--vscode-button-foreground)',
                                        border: '1px solid var(--vscode-button-border)',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        lineHeight: '1'
                                    } }, "\u00D7")))))))))));
        }
    }
    else {
        // Основная форма для свойств (fallback на JSON Schema Form)
        content = (react_1.default.createElement("div", { className: "form-editor" },
            react_1.default.createElement(core_1.default, { schema: schema, uiSchema: uiSchema, formData: formData, widgets: widgets, validator: validator_ajv8_1.default, onChange: handleChange, onSubmit: handleSubmit, liveValidate: false, showErrorList: false })));
    }
    // Все модальные окна рендерятся один раз в конце компонента
    return (react_1.default.createElement(react_1.default.Fragment, null,
        content,
        react_1.default.createElement(AttributeTypeEditorModal_1.AttributeTypeEditorModal, { isOpen: activeTab === 'attributes' && editingAttributeType !== null, attributeIndex: editingAttributeType, attributeType: (() => {
                if (editingAttributeType === null)
                    return null;
                const baseAttrs = (formData?.attributes ?? selectedObject?.attributes);
                const attributes = Array.isArray(baseAttrs) ? baseAttrs : [];
                return attributes[editingAttributeType]?.type || null;
            })(), metadata: metadataWithRegisters, onClose: () => setEditingAttributeType(null), onSave: handleSaveAttributeTypeForAttribute }),
        react_1.default.createElement(AddAttributeToObjectModal_1.AddAttributeToObjectModal, { isOpen: activeTab === 'attributes' && showAddAttributeToObjectModal, kind: newObjectChildKind, name: newAttrName, synonym: newAttrSynonym, comment: newAttrComment, type: newAttrType, metadata: metadataWithRegisters, onClose: () => setShowAddAttributeToObjectModal(false), onSave: handleAddAttributeToObject, onNameChange: setNewAttrName, onSynonymChange: setNewAttrSynonym, onCommentChange: setNewAttrComment, onTypeChange: setNewAttrType }),
        react_1.default.createElement(AddTabularSectionModal_1.AddTabularSectionModal, { isOpen: activeTab === 'tabular' && showAddTabularModal, name: newTabularName, synonym: newTabularSynonym, comment: newTabularComment, onClose: () => setShowAddTabularModal(false), onSave: handleAddTabularSection, onNameChange: setNewTabularName, onSynonymChange: setNewTabularSynonym, onCommentChange: setNewTabularComment }),
        react_1.default.createElement(AddTabularAttributeModal_1.AddTabularAttributeModal, { isOpen: activeTab === 'tabular' && showAddAttributeModal !== null, name: newAttrName, synonym: newAttrSynonym, comment: newAttrComment, type: newAttrType, metadata: metadataWithRegisters, onClose: () => setShowAddAttributeModal(null), onSave: () => showAddAttributeModal !== null && handleAddAttribute(showAddAttributeModal), onNameChange: setNewAttrName, onSynonymChange: setNewAttrSynonym, onCommentChange: setNewAttrComment, onTypeChange: setNewAttrType }),
        react_1.default.createElement(EditTabularAttributeTypeModal_1.EditTabularAttributeTypeModal, { isOpen: activeTab === 'tabular' && editingAttribute !== null, tsIndex: editingAttribute?.tsIndex ?? -1, attrIndex: editingAttribute?.attrIndex ?? -1, attributeType: (() => {
                if (!editingAttribute || editingAttribute.tsIndex === undefined || editingAttribute.attrIndex === undefined)
                    return null;
                const baseTs = (formData?.tabularSections ?? selectedObject?.tabularSections);
                const tabularSections = Array.isArray(baseTs) ? baseTs : [];
                const section = tabularSections[editingAttribute.tsIndex];
                if (!section?.attributes)
                    return null;
                return section.attributes[editingAttribute.attrIndex]?.type || null;
            })(), metadata: metadataWithRegisters, onClose: () => setEditingAttribute(null), onSave: handleSaveAttributeType }),
        react_1.default.createElement(AttributeTypeEditorModal_1.AttributeTypeEditorModal, { isOpen: activeTab === 'properties' && editingAttributeType !== null, attributeIndex: editingAttributeType, attributeType: (() => {
                if (editingAttributeType === null)
                    return null;
                const baseAttrs = (formData?.attributes ?? selectedObject?.attributes);
                const attributes = Array.isArray(baseAttrs) ? baseAttrs : [];
                return attributes[editingAttributeType]?.type || null;
            })(), metadata: metadataWithRegisters, onClose: () => setEditingAttributeType(null), onSave: handleSaveAttributeTypeForAttribute }),
        react_1.default.createElement(RegisterRecordsEditorModal_1.RegisterRecordsEditorModal, { isOpen: activeTab === 'properties' && showRegisterRecordsEditor, registerRecord: newRegisterRecord, isEditing: editingRegisterRecordIndex !== null, registers: metadata?.registers || [], onClose: handleCloseRegisterRecordsEditor, onSave: handleSaveRegisterRecord, onRegisterChange: setNewRegisterRecord }),
        react_1.default.createElement(CharacteristicTypeEditorModal_1.CharacteristicTypeEditorModal, { isOpen: activeTab === 'characteristicTypes' && showCharacteristicTypeModal, typeValue: editingCharacteristicTypeIndex !== null ? getCharacteristicTypes()[editingCharacteristicTypeIndex] : null, metadata: metadataWithRegisters, onClose: () => {
                setShowCharacteristicTypeModal(false);
                setEditingCharacteristicTypeIndex(null);
            }, onSave: handleSaveCharacteristicType }),
        react_1.default.createElement(AccountingFlagEditorModal_1.AccountingFlagEditorModal, { isOpen: activeTab === 'accountingFlags' && showAccountingFlagModal, flag: (() => {
                if (!editingAccountingFlag || !selectedObject)
                    return null;
                const flags = editingAccountingFlag.type === 'accountingFlag'
                    ? (selectedObject.accountingFlags || [])
                    : (selectedObject.extDimensionAccountingFlags || []);
                return flags[editingAccountingFlag.index] || null;
            })(), flagType: editingAccountingFlag?.type || addingAccountingFlagType || undefined, onClose: () => {
                setShowAccountingFlagModal(false);
                setEditingAccountingFlag(null);
                setAddingAccountingFlagType(null);
            }, onSave: (flag, flagTypeFromModal) => {
                const finalFlagType = flagTypeFromModal || editingAccountingFlag?.type || addingAccountingFlagType;
                if (editingAccountingFlag && finalFlagType) {
                    handleEditAccountingFlag(flag);
                }
                else if (finalFlagType) {
                    handleAddAccountingFlag(finalFlagType, flag);
                    setAddingAccountingFlagType(null);
                }
            } }),
        react_1.default.createElement(ConfirmModal_1.ConfirmModal, { isOpen: !!confirmModal, message: confirmModal?.message || '', onConfirm: handleConfirmModalConfirm, onCancel: handleConfirmModalCancel })));
};
exports.FormEditor = FormEditor;
// Функция для определения типа поля и получения вариантов значений
function getFieldTypeAndOptions(field, objectType) {
    if (field === 'PeriodAdjustmentLength') {
        return { type: 'number' };
    }
    // Boolean поля
    const booleanFields = {
        'UseStandardCommands': true,
        'IncludeHelpInContents': true,
        'AutoOrderByCode': true,
        'PostInPrivilegedMode': true,
        'UnpostInPrivilegedMode': true,
        'CheckUnique': true,
        'Autonumbering': true,
        'UpdateDataHistoryImmediatelyAfterWrite': true,
        'ExecuteAfterWriteDataHistoryVersionProcessing': true,
        'ActionPeriodUse': true,
        'MainFilterOnPeriod': true,
        'EnableTotalsSliceFirst': true,
        'EnableTotalsSliceLast': true,
        'EnableTotalsSplitting': true,
        'Correspondence': true,
        'ActionPeriod': true,
        'BasePeriod': true,
        // Реквизиты
        'PasswordMode': true,
        'MarkNegatives': true,
        'MultiLine': true,
        'ExtendedEdit': true,
        'FillFromFillingValue': true,
        // Стандартные атрибуты
        'xr:MultiLine': true,
        'xr:FillFromFillingValue': true,
        'xr:ExtendedEdit': true,
        'xr:PasswordMode': true,
        'xr:MarkNegatives': true
    };
    if (booleanFields[field]) {
        return { type: 'boolean', options: [true, false] };
    }
    // Enum поля - определяем по схеме
    // Примечание: некоторые поля могут иметь разные значения в разных контекстах,
    // поэтому объединяем все возможные значения
    const enumFields = {
        // Свойства документа
        'Posting': ['Allow', 'Deny'],
        'RealTimePosting': ['Allow', 'Deny'],
        'RegisterRecordsDeletion': ['AutoDeleteOnUnpost', 'DontDeleteOnUnpost'],
        'RegisterRecordsWritingOnPost': ['WriteSelected', 'WriteModified'],
        'SequenceFilling': ['AutoFillOff', 'AutoFillOn', 'AutoFillOnWrite'],
        'NumberType': ['String', 'Number'],
        'NumberAllowedLength': ['Variable', 'Fixed'],
        'CodeAllowedLength': ['Variable', 'Fixed'],
        // ВАЖНО: в реальных конфигурациях (RZDZUP) NumberPeriodicity хранится как Year/Quarter/Month/Day (а не Within*).
        // Значение WithinMonth приводит к ошибке сборки CF ("Неверное значение перечисления").
        'NumberPeriodicity': ['Nonperiodical', 'Year', 'Quarter', 'Month', 'Day'],
        'CreateOnInput': ['Use', 'DontUse', 'Auto', 'DontCreate', 'Create'],
        'SearchStringModeOnInputByString': ['Begin', 'AnyPart'],
        'FullTextSearchOnInputByString': ['DontUse', 'Use'],
        'ChoiceDataGetModeOnInputByString': ['Background', 'Directly', 'OnDemand'],
        'DataLockControlMode': ['Automatic', 'Managed', 'AutomaticAndManaged'],
        'FullTextSearch': ['DontUse', 'Use'],
        'ChoiceHistoryOnInput': ['DontUse', 'Use', 'Auto'],
        'DataHistory': ['DontUse', 'Use'],
        // Реквизиты (без префикса xr:)
        'FillChecking': ['DontCheck', 'ShowError', 'ShowWarning'],
        'ChoiceFoldersAndItems': ['Items', 'FoldersAndItems'],
        'QuickChoice': ['Auto', 'DontUse', 'Use'],
        'Indexing': ['DontIndex', 'Index', 'IndexWithAdditionalOrder'],
        'TypeReductionMode': ['TransformValues', 'DontTransform'],
        'LinkByType': [],
        // Стандартные атрибуты
        'xr:FillChecking': ['DontCheck', 'ShowError', 'ShowWarning'],
        'xr:CreateOnInput': ['Auto', 'DontCreate', 'Create'],
        'xr:TypeReductionMode': ['TransformValues', 'DontTransform'],
        'xr:QuickChoice': ['Auto', 'DontUse', 'Use'],
        'xr:ChoiceHistoryOnInput': ['Auto', 'DontUse', 'Use'],
        'xr:DataHistory': ['DontUse', 'Use'],
        'xr:FullTextSearch': ['DontUse', 'Use'],
        // Квалификаторы
        'v8:AllowedLength': ['Fixed', 'Variable'],
        'v8:Sign': ['Any', 'Nonnegative'],
        'v8:AllowedSign': ['Any', 'Nonnegative'],
        'v8:DateFractions': ['Date', 'Time', 'DateTime'],
        // Другие
        'HierarchyType': ['HierarchyFoldersAndItems', 'HierarchyOfItems'],
        'WriteRegisterRecordsOnPosting': ['WriteSelected', 'WriteModified'],
        // Поля из FIELD_VALUES, которые должны быть выпадающими списками
        'CodeSeries': ['WholeCatalog', 'WithinOwnerSubordination', 'WithinOwnerHierarchy', 'WholeCharacteristicKind'],
        'PredefinedDataUpdate': ['Auto', 'DontAutoUpdate', 'AutoUpdateUseDefaultLanguage'],
        'EditType': ['InDialog', 'BothWays'],
        'DefaultPresentation': ['AsDescription', 'AsCode'],
        'ChoiceMode': ['BothWays', 'InDialog'],
        'SearchOnInput': ['Auto', 'Use', 'DontUse'],
        'FullTextSearchUsing': ['Allow', 'Use', 'DontUse'],
        'SubordinationUse': ['ToItems', 'ToFolders', 'ToFoldersAndItems'],
        'DataSeparation': ['DontUse', 'Separate'],
        'SeparatedDataUse': ['Independently', 'IndependentlyAndSimultaneously'],
        'TaskNumberAutoPrefix': ['BusinessProcessNumber', 'DontUse'],
        'Representation': ['Picture', 'Auto', 'PictureAndText'],
        'Category': ['FormCommandBar', 'FormNavigationPanel', 'ActionsPanel', 'NavigationPanel'],
        'TemplateType': ['BinaryData', 'SpreadsheetDocument', 'TextDocument', 'DataCompositionSchema'],
        'DependenceOnCalculationTypes': ['DontDepend', 'OnActionPeriod', 'OnRegistrationPeriod'],
        'RegisterType': ['Turnovers', 'Balances'],
        'InformationRegisterPeriodicity': [
            'Nonperiodical',
            'Second',
            'Day',
            'Month',
            'Quarter',
            'Year',
            'RecorderPosition'
        ],
        'Periodicity': ['Nonperiodical', 'Second', 'Day', 'Month', 'Quarter', 'Year']
    };
    if (enumFields[field]) {
        return { type: 'enum', options: enumFields[field] };
    }
    // Проверяем FIELD_VALUES для автоматического определения enum полей
    const fieldValues = (0, field_values_1.getFieldValues)(field);
    if (fieldValues && fieldValues.length > 0 && fieldValues[0] !== '') {
        // Исключаем boolean поля (true/false) и числовые значения
        const nonBooleanValues = fieldValues.filter(v => v !== 'true' && v !== 'false' && !/^\d+$/.test(v));
        if (nonBooleanValues.length > 0) {
            return { type: 'enum', options: nonBooleanValues };
        }
    }
    // По умолчанию строка
    return { type: 'string' };
}
// Компонент для отображения поля с выбором значения
const FieldInput = ({ field, value, onChange, objectType, label }) => {
    const fieldInfo = getFieldTypeAndOptions(field, objectType);
    // Числовое поле
    if (fieldInfo.type === 'number') {
        const strVal = value === null || value === undefined ? '' : String(value);
        return (react_1.default.createElement("input", { type: "number", min: 0, value: strVal, onChange: (e) => onChange(e.target.value), className: "property-input", placeholder: "0" }));
    }
    // Boolean поле
    if (fieldInfo.type === 'boolean') {
        const boolValue = value === true || value === 'true' || value === 'True';
        return (react_1.default.createElement("select", { value: String(boolValue), onChange: (e) => onChange(e.target.value === 'true'), className: "property-select" },
            react_1.default.createElement("option", { value: "true" }, "\u0414\u0430 (true)"),
            react_1.default.createElement("option", { value: "false" }, "\u041D\u0435\u0442 (false)")));
    }
    // Enum поле
    if (fieldInfo.type === 'enum' && fieldInfo.options) {
        const stringValue = value !== null && value !== undefined ? String(value) : '';
        const isAccumulationRegisterRegisterType = field === 'RegisterType' &&
            (objectType === 'AccumulationRegister' || objectType === 'Регистр накопления');
        const opts = [...fieldInfo.options];
        if (!isAccumulationRegisterRegisterType) {
            if (stringValue && !opts.includes(stringValue)) {
                opts.push(stringValue);
            }
        }
        const selectValue = isAccumulationRegisterRegisterType
            ? (() => {
                const c = (0, field_values_1.normalizeAccumulationRegisterTypeValue)(stringValue);
                return c === 'Turnovers' || c === 'Balances' ? c : '';
            })()
            : stringValue;
        return (react_1.default.createElement("select", { value: selectValue, onChange: (e) => onChange(e.target.value), className: "property-select" },
            react_1.default.createElement("option", { value: "" }, "-- \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 --"),
            opts.map((option) => (react_1.default.createElement("option", { key: option, value: option }, (0, field_values_1.getEnumValueLabel)(option, field))))));
    }
    // Строковое поле (по умолчанию)
    return (react_1.default.createElement("input", { type: "text", value: typeof value === 'string' ? value : '', onChange: (e) => onChange(e.target.value), className: "property-input", placeholder: `Введите ${label.toLowerCase()}...` }));
};
//# sourceMappingURL=FormEditor.js.map
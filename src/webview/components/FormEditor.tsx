/**
 * Компонент формы на основе JSON Schema Form
 */

import React, { useMemo, useState, useEffect } from 'react';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import { JSONSchema7 } from 'json-schema';
import { generateSchema } from '../../schemas/schemaGenerator';
import { TypeWidget } from '../widgets/TypeWidget';
import { MultilingualWidget } from '../widgets/MultilingualWidget';
import { formatTypeForDisplay } from '../utils/typeUtils';
import { AttributeTypeEditorModal } from './FormEditor/AttributeTypeEditorModal';
import { AddAttributeToObjectModal } from './FormEditor/AddAttributeToObjectModal';
import { AddTabularSectionModal } from './FormEditor/AddTabularSectionModal';
import { AddTabularAttributeModal } from './FormEditor/AddTabularAttributeModal';
import { EditTabularAttributeTypeModal } from './FormEditor/EditTabularAttributeTypeModal';
import { RegisterRecordsEditorModal } from './FormEditor/RegisterRecordsEditorModal';
import { ConfirmModal } from './FormEditor/ConfirmModal';
import { EnumValueEditorModal } from './FormEditor/EnumValueEditorModal';
import { SimpleMultilingualEditor } from './FormEditor/SimpleMultilingualEditor';
import { CharacteristicTypeEditorModal } from './FormEditor/CharacteristicTypeEditorModal';
import { AccountingFlagEditorModal } from './FormEditor/AccountingFlagEditorModal';
import { WebServiceOperationsTab } from './FormEditor/WebServiceOperationsTab';
import { WebServiceXdtoPackagesField } from './FormEditor/WebServiceXdtoPackagesField';
import { WEB_SERVICE_OTHER_KEYS, WEB_SERVICE_SESSION_KEYS } from './FormEditor/webServiceXml';
import { EventSubscriptionEventField, EventSubscriptionSourceField } from './FormEditor/EventSubscriptionFields';
import { FunctionalOptionContentEditor, FunctionalOptionLocationField } from './FormEditor/FunctionalOptionFields';
import { UiButton, UiTextField, UiCheckbox, UiSelect, UiTable, UiTableRow, UiTableCell } from '../ui';
import {
  getFieldLabel,
  getEnumValueLabel,
  getFieldValues,
  normalizeAccumulationRegisterTypeValue
} from '../../metadata/field-values';
import type { FunctionalOptionMembers, InformationRegisterScheduleEntry } from '../../metadata/types';

interface FormEditorProps {
  objectType: string;
  formData: any;
  onChange: (data: any) => void;
  metadata: {
    registers?: string[];
    referenceTypes: string[];
    informationRegistersSchedule?: InformationRegisterScheduleEntry[];
    functionalOptionMembers?: FunctionalOptionMembers[];
  };
  activeTab?: string;
  selectedObject?: any;
  onSelectedObjectChange?: (obj: any) => void;
}

const widgets = {
  TypeWidget: TypeWidget,
  MultilingualWidget: MultilingualWidget
};

/** Объекты, у которых свойство Type — это тип значения, а не произвольная строка. */
const VALUE_TYPE_EDITOR_OBJECT_TYPES = new Set([
  'DefinedType', 'Определяемый тип',
  'SessionParameter', 'Параметр сеанса',
  'FilterCriterion', 'Критерий отбора',
  'Constant', 'Константа',
  'CommonAttribute', 'Общий реквизит',
  'ChartOfCharacteristicTypes', 'План видов характеристик',
]);

function usesValueTypeEditor(objectType: string, xmlObjectType?: string): boolean {
  return VALUE_TYPE_EDITOR_OBJECT_TYPES.has(objectType)
    || (!!xmlObjectType && VALUE_TYPE_EDITOR_OBJECT_TYPES.has(xmlObjectType));
}

function isDefinedTypeObject(objectType: string, xmlObjectType?: string): boolean {
  return objectType === 'DefinedType'
    || objectType === 'Определяемый тип'
    || xmlObjectType === 'DefinedType';
}

/**
 * Свойства вкладки «Данные» плана счетов в конфигураторе 1С (порядок отображения).
 */
const CHART_OF_ACCOUNTS_DATA_PROPERTY_KEYS: readonly string[] = [
  'CodeLength',
  'DescriptionLength',
  'CodeMask',
  'AutoOrderByCode',
  'OrderLength',
  'DefaultPresentation',
];

/** Свойства вкладки «Расчёт» конфигуратора для плана видов расчёта */
const CHART_OF_CALCULATION_TYPES_DATA_PROPERTY_KEYS: readonly string[] = [
  'DependenceOnCalculationTypes',
  'BaseCalculationTypes',
  'ActionPeriodUse',
  'ScheduleValue',
];

/** Свойства регистра сведений (порядок как в конфигураторе, «Основные») */
const INFORMATION_REGISTER_PROPERTY_KEYS: readonly string[] = [
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
const ACCUMULATION_REGISTER_PROPERTY_KEYS: readonly string[] = [
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
const ACCOUNTING_REGISTER_PROPERTY_KEYS: readonly string[] = [
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
const CALCULATION_REGISTER_PROPERTY_KEYS: readonly string[] = [
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
/** Текст локализованной строки 1С: строка, v8:item или content. */
function readLocalString(value: unknown): string {
  if (value == null || value === '') {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  const obj = value as Record<string, unknown>;
  const rawItem = obj['v8:item'];
  if (rawItem != null) {
    const items = Array.isArray(rawItem) ? rawItem : [rawItem];
    return items
      .map((item) => {
        if (item && typeof item === 'object') {
          const rec = item as Record<string, unknown>;
          return String(rec['v8:content'] ?? rec.content ?? '');
        }
        return String(item ?? '');
      })
      .filter((part) => part.length > 0)
      .join(', ');
  }
  if (obj.content != null) {
    return String(obj.content);
  }
  if (obj['v8:content'] != null) {
    return String(obj['v8:content']);
  }
  return '';
}

/** Имя реквизита или табличной части для списка. */
function childObjectDisplayName(attr: any, fallback: string): string {
  if (!attr) {
    return fallback;
  }
  if (typeof attr.name === 'string' && attr.name.trim()) {
    return attr.name;
  }
  return readLocalString(attr.name) || readLocalString(attr.properties?.Name) || fallback;
}

function extractBaseCalculationTypeRefs(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') {
    return [];
  }
  const obj = raw as Record<string, unknown>;
  const items = obj['xr:Item'] ?? obj['Item'];
  if (items === undefined || items === null) {
    return [];
  }
  const list = Array.isArray(items) ? items : [items];
  const refs: string[] = [];
  for (const it of list) {
    if (typeof it === 'string') {
      const s = it.trim();
      if (s) {
        refs.push(s);
      }
    } else if (it && typeof it === 'object') {
      const t = (it as { '#text'?: unknown; text?: unknown })['#text'] ?? (it as { text?: unknown }).text;
      const s = String(t ?? '').trim();
      if (s) {
        refs.push(s);
      }
    }
  }
  return refs;
}

/** Значение BaseCalculationTypes для formData (сохранение через xmlDomUtils). */
function buildBaseCalculationTypesFormValue(
  refs: string[]
): { 'xr:Item': Array<{ type: string; '#text': string }> } {
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
function collectChartOfCalculationPlanOptions(referenceTypes: string[] | undefined): Array<[string, string]> {
  const map = new Map<string, string>();
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

function collectChartOfCalculationPlanOptionsFromRegisters(registers: string[] | undefined): Array<[string, string]> {
  const map = new Map<string, string>();
  for (const r of registers || []) {
    if (typeof r !== 'string') continue;
    const p = r.startsWith('cfg:') ? r.slice(4) : r.trim();
    if (!p.startsWith('ChartOfCalculationTypes.')) continue;
    const rest = p.slice('ChartOfCalculationTypes.'.length);
    if (rest && !rest.includes('.')) map.set(`ChartOfCalculationTypes.${rest}`, rest);
  }
  return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ru'));
}
function mergeChartOfCalculationPlanOptionLists(a: Array<[string, string]>, b: Array<[string, string]>): Array<[string, string]> {
  const map = new Map<string, string>();
  for (const [ref, label] of [...a, ...b]) map.set(ref, label);
  return [...map.entries()].sort((x, y) => x[1].localeCompare(y[1], 'ru'));
}

function calculationScheduleResourceRef(irRef: string, resourceName: string): string {
  return `${irRef}.Resource.${resourceName}`;
}

function calculationScheduleDimensionRef(irRef: string, dimensionName: string): string {
  return `${irRef}.Dimension.${dimensionName}`;
}

/** Пары [ChartOfAccounts.Имя, отображаемое имя] из метаданных webview. */
function collectChartOfAccountsPlanOptions(referenceTypes: string[]): Array<[string, string]> {
  const map = new Map<string, string>();
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
function collectDocumentSelectOptions(referenceTypes: string[]): Array<[string, string]> {
  const map = new Map<string, string>();
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

/** LocalString в метаданных: пустой тег или v8:item, не голый текст. */
const MULTILINGUAL_METADATA_FIELDS = new Set([
  'Synonym', 'Format', 'EditFormat', 'ToolTip',
  'ObjectPresentation', 'ExtendedObjectPresentation',
  'ListPresentation', 'ExtendedListPresentation',
  'Explanation', 'ExtendedPresentation',
  'RecordPresentation', 'ExtendedRecordPresentation',
]);

function isMultilingualMetadataField(field: string): boolean {
  return MULTILINGUAL_METADATA_FIELDS.has(field);
}

/** Генерирует UUID через Web Crypto API или простой fallback (webview/браузер). */
function getRandomUUID(): string {
  const c = (globalThis as any)?.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export const FormEditor: React.FC<FormEditorProps> = ({
  objectType,
  formData,
  onChange,
  metadata,
  activeTab = 'properties',
  selectedObject,
  onSelectedObjectChange
}) => {
  // Состояния для модальных окон табличных частей (всегда на верхнем уровне)
  // ВАЖНО: Все модальные окна должны быть скрыты по умолчанию
  const [showAddTabularModal, setShowAddTabularModal] = useState<boolean>(false);
  const [showAddAttributeModal, setShowAddAttributeModal] = useState<number | null>(null);
  const [editingAttribute, setEditingAttribute] = useState<{ tsIndex: number; attrIndex: number } | null>(null);
  // Состояние для редактирования типа реквизита (не табличной части)
  const [editingAttributeType, setEditingAttributeType] = useState<number | null>(null);
  // Состояние для модального окна добавления реквизита (не в табличную часть)
  const [showAddAttributeToObjectModal, setShowAddAttributeToObjectModal] = useState<boolean>(false);
  // Какой именно элемент ChildObjects добавляем в объект (для регистров: Dimension/Resource)
  const [newObjectChildKind, setNewObjectChildKind] = useState<'Attribute' | 'Resource' | 'Dimension'>('Attribute');
  // Состояние для редактора RegisterRecords
  const [showRegisterRecordsEditor, setShowRegisterRecordsEditor] = useState<boolean>(false);
  const [editingRegisterRecordIndex, setEditingRegisterRecordIndex] = useState<number | null>(null);
  const [newRegisterRecord, setNewRegisterRecord] = useState<string>('');
  
  // Состояния для типов значения характеристик
  const [showCharacteristicTypeModal, setShowCharacteristicTypeModal] = useState<boolean>(false);
  const [editingCharacteristicTypeIndex, setEditingCharacteristicTypeIndex] = useState<number | null>(null);
  
  // Состояния для признаков учета
  const [showAccountingFlagModal, setShowAccountingFlagModal] = useState<boolean>(false);
  const [editingAccountingFlag, setEditingAccountingFlag] = useState<{ type: 'accountingFlag' | 'extDimensionAccountingFlag'; index: number } | null>(null);
  const [addingAccountingFlagType, setAddingAccountingFlagType] = useState<'accountingFlag' | 'extDimensionAccountingFlag' | null>(null);

  // Состояния для значений перечисления (Enum)
  const [showEnumValueModal, setShowEnumValueModal] = useState<boolean>(false);
  const [editingEnumValueIndex, setEditingEnumValueIndex] = useState<number | null>(null);
  const [newEnumValueName, setNewEnumValueName] = useState('');
  const [newEnumValueSynonym, setNewEnumValueSynonym] = useState<any>(null);
  const [newEnumValueComment, setNewEnumValueComment] = useState<any>(null);

  // Подтверждение опасных действий (удаление) — делаем модалкой, т.к. window.confirm в webview часто неудобен/неочевиден
  const [confirmModal, setConfirmModal] = useState<null | { message: string; onConfirm: () => void }>(null);
  const [listFilter, setListFilter] = useState('');

  const calculationTypePlanOptions = useMemo(
    () =>
      mergeChartOfCalculationPlanOptionLists(
        collectChartOfCalculationPlanOptions(metadata.referenceTypes),
        collectChartOfCalculationPlanOptionsFromRegisters(metadata.registers)
      ),
    [metadata.referenceTypes, metadata.registers]
  );

  const chartOfAccountsPlanOptions = useMemo(
    () => collectChartOfAccountsPlanOptions(metadata.referenceTypes),
    [metadata.referenceTypes]
  );

  const documentSelectOptions = useMemo(
    () => collectDocumentSelectOptions(metadata.referenceTypes),
    [metadata.referenceTypes]
  );

  /** Модалки ожидают обязательный `registers`; init может прислать только referenceTypes. */
  const metadataWithRegisters = useMemo(
    () => ({
      ...metadata,
      registers: metadata.registers ?? [],
    }),
    [metadata]
  );

  // Состояния для формы добавления табличной части
  const [newTabularName, setNewTabularName] = useState('');
  const [newTabularSynonym, setNewTabularSynonym] = useState<any>(null);
  const [newTabularComment, setNewTabularComment] = useState<any>(null);
  
  // Состояния для формы добавления реквизита
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrSynonym, setNewAttrSynonym] = useState<any>(null);
  const [newAttrComment, setNewAttrComment] = useState<any>(null);
  const [newAttrType, setNewAttrType] = useState<any>(null);
  
  // ВАЖНО: Сбрасываем все состояния модальных окон при монтировании компонента
  // Это гарантирует, что редакторы скрыты по умолчанию при первой загрузке
  useEffect(() => {
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
  useEffect(() => {
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
  const schema = useMemo(() => {
    return generateSchema(objectType, { properties: formData || {} });
  }, [objectType, formData]);

  // UI Schema для улучшения отображения
  const uiSchema = useMemo(() => {
    const ui: any = {
      Name: {
        'ui:placeholder': 'Введите имя объекта'
      },
      Synonym: {
        'ui:widget': 'MultilingualWidget'
      }
    };

    if (usesValueTypeEditor(objectType, selectedObject?.xmlObjectType)) {
      ui.Type = {
        'ui:widget': 'TypeWidget',
        'ui:options': {
          registers: metadata.registers,
          referenceTypes: metadata.referenceTypes,
          definedTypeMode: isDefinedTypeObject(objectType, selectedObject?.xmlObjectType)
        }
      };
    }

    // Добавляем виджет для Type в реквизитах
    if (formData && formData.attributes) {
      formData.attributes.forEach((attr: any, index: number) => {
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
  }, [formData, metadata, objectType, selectedObject?.xmlObjectType]);

  const handleSubmit = (data: any) => {
    onChange(data.formData);
  };

  const handleChange = (data: any) => {
    onChange(data.formData);
  };

  /**
   * Логгер для webview (для диагностики через Toggle Developer Tools).
   * Не должен ломать выполнение, даже если console недоступен.
   */
  const log = (...args: any[]) => {
    try {
      // eslint-disable-next-line no-console
      console.log('[FormEditor]', ...args);
    } catch {
      // ignore
    }
  };

  const openConfirm = (message: string, onConfirm: () => void) => {
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
  const handleDeleteObjectAttribute = (index: number) => {
    const baseObject = selectedObject || formData;
    if (!baseObject) return;
    const baseAttrs = baseObject.attributes;
    const attributes = Array.isArray(baseAttrs) ? [...baseAttrs] : [];
    const attr = attributes[index];
    const attrName =
      typeof attr?.name === 'string'
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
      } else {
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
        if (editingAttributeType === index) setEditingAttributeType(null);
        else if (editingAttributeType > index) setEditingAttributeType(editingAttributeType - 1);
      }
    });

  };

  /**
   * Удаляет табличную часть у выбранного объекта.
   * @param {number} tsIndex - индекс табличной части
   */
  const handleDeleteTabularSection = (tsIndex: number) => {
    const baseObject = selectedObject || formData;
    if (!baseObject) return;
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
      } else {
        handleChange({
          formData: {
            ...(formData || {}),
            tabularSections: tsAfter
          }
        });
      }

      // Закрываем/поправляем состояния модалок, если они были привязаны к удалённой табличной части.
      if (showAddAttributeModal !== null) {
        if (showAddAttributeModal === tsIndex) setShowAddAttributeModal(null);
        else if (showAddAttributeModal > tsIndex) setShowAddAttributeModal(showAddAttributeModal - 1);
      }
      if (editingAttribute) {
        if (editingAttribute.tsIndex === tsIndex) setEditingAttribute(null);
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
  const handleEditEnumValue = (index: number) => {
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
    if (!baseObject) return;
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
    } else {
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
  const handleDeleteEnumValue = (index: number) => {
    const baseObject = selectedObject || formData;
    if (!baseObject) return;
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
  const handleDeleteTabularAttribute = (tsIndex: number, attrIndex: number) => {
    const baseObject = selectedObject || formData;
    if (!baseObject) return;
    const baseTs = baseObject.tabularSections;
    const tabularSections = Array.isArray(baseTs) ? [...baseTs] : [];
    const ts = tabularSections[tsIndex];
    if (!ts) return;

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
      } else {
        handleChange({
          formData: {
            ...(formData || {}),
            tabularSections: tabAfter
          }
        });
      }

      if (editingAttribute && editingAttribute.tsIndex === tsIndex) {
        if (editingAttribute.attrIndex === attrIndex) setEditingAttribute(null);
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
  
  const handleAddAttribute = (tsIndex: number) => {
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
      type: newAttrType, // Сохраняем тип в поле type
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
      alert(
        newObjectChildKind === 'Resource'
          ? 'Укажите имя ресурса'
          : newObjectChildKind === 'Dimension'
          ? 'Укажите имя измерения'
          : 'Укажите имя реквизита'
      );
      return;
    }
    
    if (!newAttrType) {
      alert('Укажите тип');
      return;
    }

    const uuid: string | undefined =
      (globalThis as any)?.crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : undefined;
    
    // Создаем новый реквизит с полной структурой
    const newAttribute = {
      uuid,
      childObjectKind: newObjectChildKind,
      name: newAttrName,
      type: newAttrType, // Сохраняем тип в поле type
      properties: {
        Name: newAttrName,
        Synonym: newAttrSynonym,
        Comment: newAttrComment,
        Type: newAttrType, // И в properties для совместимости
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
        Use: 'ForItem',
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
  
  const handleEditAttributeType = (tsIndex: number, attrIndex: number) => {
    setEditingAttribute({ tsIndex, attrIndex });
  };
  
  // Обработчик сохранения типа реквизита (не табличной части)
  const handleSaveAttributeTypeForAttribute = (newType: any) => {
    if (editingAttributeType === null) return;
    
    const attrIndex = editingAttributeType;
    const baseAttrs = (formData?.attributes ?? selectedObject?.attributes);
    const updatedAttributes = [...(Array.isArray(baseAttrs) ? baseAttrs : [])];
    
    if (updatedAttributes[attrIndex]) {
      // Обновляем typeDisplay для корректного отображения
      const newTypeDisplay = formatTypeForDisplay(newType);
      
      // Убеждаемся, что тип правильно сохраняется
      // Для составных типов структура должна быть { Type: [...] }
      const typeToSave = newType && typeof newType === 'object' && newType.Type && Array.isArray(newType.Type)
        ? newType
        : newType;
      
      updatedAttributes[attrIndex] = {
        ...updatedAttributes[attrIndex],
        type: typeToSave,
        typeDisplay: newTypeDisplay, // Обновляем typeDisplay
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
  
  const handleSaveAttributeType = (newType: any) => {
    if (!editingAttribute) return;
    
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
    return (
      <>
        <div className="form-editor-loading">Загрузка формы...</div>
        {/* Модальные окна рендерятся всегда, даже при загрузке */}
        <ConfirmModal
          isOpen={!!confirmModal}
          message={confirmModal?.message || ''}
          onConfirm={handleConfirmModalConfirm}
          onCancel={handleConfirmModalCancel}
        />
      </>
    );
  }

  // Обработчик сохранения RegisterRecords
  const handleSaveRegisterRecord = (register: string) => {
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
    } else {
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
  const getCharacteristicTypes = (): string[] => {
    const typeProp = formData?.Type || selectedObject?.properties?.Type;
    if (!typeProp) return [];
    const typesArray = typeProp['v8:Type'] || typeProp.Type;
    if (Array.isArray(typesArray)) {
      return typesArray.map((t: any) => {
        if (typeof t === 'string') return t;
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

  const handleAddCharacteristicType = (typeValue: string) => {
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

  const handleEditCharacteristicType = (typeValue: string) => {
    if (editingCharacteristicTypeIndex === null) return;
    
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

  const handleDeleteCharacteristicType = (index: number) => {
    const currentTypes = getCharacteristicTypes();
    if (index < 0 || index >= currentTypes.length) return;
    
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

  const handleSaveCharacteristicType = (typeValue: string) => {
    console.log('[FormEditor] handleSaveCharacteristicType called:', { typeValue, editingCharacteristicTypeIndex });
    if (editingCharacteristicTypeIndex !== null) {
      handleEditCharacteristicType(typeValue);
    } else {
      handleAddCharacteristicType(typeValue);
    }
  };

  // Обработчики для признаков учета
  const handleAddAccountingFlag = (flagType: 'accountingFlag' | 'extDimensionAccountingFlag', flag: { name: string; synonym?: any; comment?: any; uuid?: string }) => {
    if (!selectedObject || !onSelectedObjectChange) return;

    const newFlag: any = {
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
    } else {
      updatedObject.extDimensionAccountingFlags = [...(updatedObject.extDimensionAccountingFlags || []), newFlag];
    }

    onSelectedObjectChange(updatedObject);
    setShowAccountingFlagModal(false);
    setEditingAccountingFlag(null);
  };

  const handleEditAccountingFlag = (flag: { name: string; synonym?: any; comment?: any; uuid?: string }) => {
    if (!selectedObject || !onSelectedObjectChange || !editingAccountingFlag) return;

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
      } else {
        updatedObject.extDimensionAccountingFlags = [...flags];
        updatedObject.extDimensionAccountingFlags[index] = updatedFlag;
      }

      onSelectedObjectChange(updatedObject);
    }

    setShowAccountingFlagModal(false);
    setEditingAccountingFlag(null);
  };

  const handleDeleteAccountingFlag = (flagType: 'accountingFlag' | 'extDimensionAccountingFlag', index: number) => {
    if (!selectedObject || !onSelectedObjectChange) return;

    const flags = flagType === 'accountingFlag'
      ? (selectedObject.accountingFlags || [])
      : (selectedObject.extDimensionAccountingFlags || []);

    if (index < 0 || index >= flags.length) return;

    const flagName = flags[index].name || `Признак учета ${index + 1}`;

    openConfirm(
      `Вы уверены, что хотите удалить признак учета "${flagName}"?`,
      () => {
        const updatedObject = { ...selectedObject };
        if (flagType === 'accountingFlag') {
          updatedObject.accountingFlags = flags.filter((_: unknown, i: number) => i !== index);
        } else {
          updatedObject.extDimensionAccountingFlags = flags.filter((_: unknown, i: number) => i !== index);
        }
        onSelectedObjectChange(updatedObject);
        setConfirmModal(null);
      }
    );
  };

  const handleSaveAccountingFlag = (flag: { name: string; synonym?: any; comment?: any; uuid?: string }) => {
    if (editingAccountingFlag) {
      handleEditAccountingFlag(flag);
    } else {
      // Это не должно произойти, так как тип должен быть передан при открытии модального окна
      console.error('[FormEditor] handleSaveAccountingFlag: editingAccountingFlag is null');
    }
  };

  // Рендерим разные секции в зависимости от активной вкладки
  let content: React.ReactNode = null;

  if (activeTab === 'attributes' && (selectedObject?.attributes || formData?.attributes)) {
    const baseAttrs = (formData?.attributes ?? selectedObject?.attributes);
    const attributes = Array.isArray(baseAttrs) ? baseAttrs : [];
    const typeKey = String(objectType || '').toLowerCase();
    const isRegister = typeKey.includes('регистр') || typeKey.includes('register');
    const openAddObjectChildModal = (kind: 'Attribute' | 'Resource' | 'Dimension') => {
      setNewObjectChildKind(kind);
      setShowAddAttributeToObjectModal(true);
    };
    content = (
      <div className="form-editor">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{isRegister ? 'Состав' : 'Реквизиты'} ({attributes.length})</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isRegister && (
              <>
                <UiButton icon="add" onClick={() => openAddObjectChildModal('Dimension')}>
                  Добавить измерение
                </UiButton>
                <UiButton icon="add" onClick={() => openAddObjectChildModal('Resource')}>
                  Добавить ресурс
                </UiButton>
              </>
            )}
            <UiButton icon="add" onClick={() => openAddObjectChildModal('Attribute')}>
              Добавить реквизит
            </UiButton>
          </div>
        </div>
        <div className="ui-toolbar">
          <UiTextField
            className="ui-filter"
            value={listFilter}
            onChange={setListFilter}
            placeholder="Фильтр по имени…"
          />
        </div>
        {(() => {
          const kindOf = (attr: any): 'Dimension' | 'Resource' | 'Attribute' =>
            attr?.childObjectKind === 'Resource' || attr?.childObjectKind === 'Dimension'
              ? attr.childObjectKind
              : 'Attribute';
          const filtered = attributes
            .map((attr: any, index: number) => ({ attr, index }))
            .filter(({ attr }) => {
              if (!attr) return false;
              return childObjectDisplayName(attr, '').toLowerCase().includes(listFilter.toLowerCase());
            });
          const renderRow = (attr: any, index: number) => (
            <UiTableRow key={index}>
              <UiTableCell>{childObjectDisplayName(attr, 'Без имени')}</UiTableCell>
              <UiTableCell>{formatTypeForDisplay(attr.type)}</UiTableCell>
              <UiTableCell>
                <div className="ui-row-actions">
                  <UiButton icon="edit" title="Тип" onClick={() => setEditingAttributeType(index)} />
                  <UiButton icon="close" danger title="Удалить" onClick={() => handleDeleteObjectAttribute(index)} />
                </div>
              </UiTableCell>
            </UiTableRow>
          );
          if (!isRegister) {
            return (
              <UiTable columns={['Имя', 'Тип', '']}>
                {filtered.map(({ attr, index }) => renderRow(attr, index))}
              </UiTable>
            );
          }
          const groups: Array<{ kind: 'Dimension' | 'Resource' | 'Attribute'; title: string }> = [
            { kind: 'Dimension', title: 'Измерения' },
            { kind: 'Resource', title: 'Ресурсы' },
            { kind: 'Attribute', title: 'Реквизиты' },
          ];
          return (
            <div className="child-kind-groups">
              {groups.map((group) => {
                const rows = filtered.filter(({ attr }) => kindOf(attr) === group.kind);
                return (
                  <section key={group.kind} className="child-kind-group">
                    <h4>{group.title} ({rows.length})</h4>
                    {rows.length === 0 ? (
                      <p className="child-kind-empty">Нет элементов</p>
                    ) : (
                      <UiTable columns={['Имя', 'Тип', '']}>
                        {rows.map(({ attr, index }) => renderRow(attr, index))}
                      </UiTable>
                    )}
                  </section>
                );
              })}
            </div>
          );
        })()}
      </div>
    );
  } else if (activeTab === 'tabular' && (selectedObject?.tabularSections || formData?.tabularSections)) {
    const baseTs = (formData?.tabularSections ?? selectedObject?.tabularSections);
    const tabularSections = Array.isArray(baseTs) ? baseTs : [];
    content = (
      <div className="form-editor">
        <div className="section-header">
          <h3>Табличные части ({tabularSections.length})</h3>
          <UiButton icon="add" onClick={() => setShowAddTabularModal(true)}>
            Добавить табличную часть
          </UiButton>
        </div>
        
        <div className="tabular-sections">
          {tabularSections.map((ts: any, tsIndex: number) => {
            if (!ts) return null;
            const synonym = readLocalString(ts.properties?.Synonym);
            const comment = readLocalString(ts.properties?.Comment);
            const attrs = Array.isArray(ts.attributes) ? ts.attributes : [];
            return (
              <section key={ts.uuid || tsIndex} className="tabular-section">
                <div className="tabular-section__header">
                  <div className="tabular-section__heading">
                    <span className="tabular-section__title">{ts.name}</span>
                    {synonym ? <span className="tabular-section__meta">{synonym}</span> : null}
                    {comment ? <span className="tabular-section__meta tabular-section__meta--comment">{comment}</span> : null}
                  </div>
                  <div className="tabular-section__tools">
                    <span className="tabular-attributes-count">Реквизитов: {attrs.length}</span>
                    <UiButton
                      icon="close"
                      danger
                      title="Удалить"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteTabularSection(tsIndex);
                      }}
                    />
                  </div>
                </div>
                {attrs.length > 0 && (
                  <UiTable columns={['Имя', 'Синоним', 'Тип', '']}>
                    {attrs.map((attr: any, attrIndex: number) => {
                      if (!attr) return null;
                      return (
                        <UiTableRow key={attr.uuid || attrIndex}>
                          <UiTableCell>{childObjectDisplayName(attr, `Реквизит ${attrIndex + 1}`)}</UiTableCell>
                          <UiTableCell>{readLocalString(attr.properties?.Synonym)}</UiTableCell>
                          <UiTableCell>{formatTypeForDisplay(attr.type)}</UiTableCell>
                          <UiTableCell>
                            <div className="ui-row-actions">
                              <UiButton
                                icon="edit"
                                title="Открыть редактор типов"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleEditAttributeType(tsIndex, attrIndex);
                                }}
                              />
                              <UiButton
                                icon="close"
                                danger
                                title="Удалить"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteTabularAttribute(tsIndex, attrIndex);
                                }}
                              />
                            </div>
                          </UiTableCell>
                        </UiTableRow>
                      );
                    })}
                  </UiTable>
                )}
                <div className="tabular-section__footer">
                  <UiButton secondary icon="add" onClick={() => setShowAddAttributeModal(tsIndex)}>
                    Добавить реквизит
                  </UiButton>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  } else if (activeTab === 'enumValues') {
    const baseEnumValues = selectedObject?.enumValues ?? formData?.enumValues ?? [];
    const enumValues = Array.isArray(baseEnumValues) ? baseEnumValues : [];
    content = (
      <div className="form-editor">
        <div className="section-header">
          <h3>Значения перечисления ({enumValues.length})</h3>
          <UiButton icon="add" onClick={handleAddEnumValue} title="Добавить значение">
            Добавить
          </UiButton>
        </div>
        <div className="attributes-list">
          {enumValues.map((ev: any, index: number) => {
            const name = ev.name || ev.properties?.Name || `Значение ${index + 1}`;
            const synonym = ev.properties?.Synonym ?? ev.properties?.synonym;
            const synonymStr = typeof synonym === 'string' ? synonym : (synonym?.['v8:item']?.['v8:content'] ?? synonym?.content ?? '');
            const comment = ev.properties?.Comment ?? ev.properties?.comment ?? '';
            return (
              <div key={ev.uuid || index} className="attribute-card">
                <div className="attribute-header">
                  <span className="attribute-name">{name}</span>
                  <div className="ui-row-actions">
                    <span className="attribute-index">#{index + 1}</span>
                    <UiButton icon="edit" title="Изменить" onClick={() => handleEditEnumValue(index)} />
                    <UiButton icon="close" danger title="Удалить" onClick={() => handleDeleteEnumValue(index)} />
                  </div>
                </div>
                {(synonymStr || comment) && (
                  <div className="attribute-meta">
                    {synonymStr && <span>{synonymStr}</span>}
                    {comment && <span className="attribute-comment">{comment}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <EnumValueEditorModal
          isOpen={showEnumValueModal}
          isEdit={editingEnumValueIndex !== null}
          name={newEnumValueName}
          synonym={newEnumValueSynonym}
          comment={newEnumValueComment}
          onClose={() => setShowEnumValueModal(false)}
          onSave={handleSaveEnumValue}
          onNameChange={setNewEnumValueName}
          onSynonymChange={setNewEnumValueSynonym}
          onCommentChange={setNewEnumValueComment}
        />
      </div>
    );
  } else if (activeTab === 'forms' && selectedObject?.forms) {
    content = (
      <div className="form-editor">
        <div className="section-header">
          <h3>Формы ({selectedObject.forms.length})</h3>
        </div>
        <div className="forms-list">
          <UiTable columns={['Имя']}>
            {selectedObject.forms.map((form: any, index: number) => (
              <UiTableRow key={index}>
                <UiTableCell>{form.name || `Форма ${index + 1}`}</UiTableCell>
              </UiTableRow>
            ))}
          </UiTable>
        </div>
      </div>
    );
  } else if (activeTab === 'commands' && selectedObject?.commands) {
    content = (
      <div className="form-editor">
        <div className="section-header">
          <h3>Команды ({selectedObject.commands.length})</h3>
        </div>
        <div className="commands-list">
          <UiTable columns={['Имя']}>
            {selectedObject.commands.map((cmd: any, index: number) => (
              <UiTableRow key={index}>
                <UiTableCell>{cmd.name || `Команда ${index + 1}`}</UiTableCell>
              </UiTableRow>
            ))}
          </UiTable>
        </div>
      </div>
    );
  } else if (activeTab === 'composition') {
    content = (
      <FunctionalOptionContentEditor
        value={formData?.Content}
        referenceTypes={metadata.referenceTypes || []}
        members={metadata.functionalOptionMembers || []}
        onChange={(next) => {
          handleChange({ formData: { ...formData, Content: next } });
        }}
      />
    );
  } else if (activeTab === 'operations') {
    content = (
      <WebServiceOperationsTab
        xml={selectedObject?._originalXml || ''}
        onXmlChange={(xml) => {
          if (!selectedObject || !onSelectedObjectChange) {
            return;
          }
          onSelectedObjectChange({ ...selectedObject, _originalXml: xml });
        }}
      />
    );
  } else if (activeTab === 'properties' && formData) {
    // Группируем свойства
    const basicFields = ['Name', 'Synonym', 'Comment'];
    const standardAttributes = formData.StandardAttributes;
    const registerRecords = formData.RegisterRecords;
    const isDocument =
      String(objectType || '').toLowerCase() === 'документ' ||
      String(objectType || '').toLowerCase() === 'document';
    const isWebService =
      objectType === 'WebService' ||
      objectType === 'Web-сервис' ||
      objectType === 'Веб-сервис' ||
      (selectedObject?.sourcePath && String(selectedObject.sourcePath).replace(/\\/g, '/').includes('/WebServices/'));
    const functionalOptionPath = selectedObject?.sourcePath
      ? String(selectedObject.sourcePath).replace(/\\/g, '/')
      : '';
    const isFunctionalOption =
      objectType === 'FunctionalOption' ||
      objectType === 'Функциональная опция' ||
      (functionalOptionPath.includes('/FunctionalOptions/') && !functionalOptionPath.includes('/FunctionalOptionsParameters/'));

    const isChartOfAccountsProps =
      objectType === 'ChartOfAccounts' ||
      objectType === 'План счетов' ||
      (selectedObject?.sourcePath &&
        String(selectedObject.sourcePath).replace(/\\/g, '/').includes('ChartsOfAccounts'));

    const isChartOfCalculationTypesProps =
      objectType === 'ChartOfCalculationTypes' ||
      objectType === 'План видов расчета' ||
      (selectedObject?.sourcePath &&
        String(selectedObject.sourcePath).replace(/\\/g, '/').includes('ChartsOfCalculationTypes'));

    const pathNorm = selectedObject?.sourcePath
      ? String(selectedObject.sourcePath).replace(/\\/g, '/')
      : '';
    const isInformationRegister =
      objectType === 'InformationRegister' ||
      objectType === 'Регистр сведений' ||
      pathNorm.includes('InformationRegisters');
    const isAccumulationRegister =
      objectType === 'AccumulationRegister' ||
      objectType === 'Регистр накопления' ||
      pathNorm.includes('AccumulationRegisters');
    const isAccountingRegister =
      objectType === 'AccountingRegister' ||
      objectType === 'Регистр бухгалтерии' ||
      pathNorm.includes('AccountingRegisters');
    const isCalculationRegister =
      objectType === 'CalculationRegister' ||
      objectType === 'Регистр расчета' ||
      pathNorm.includes('CalculationRegisters');
    
    // Все остальные поля
    const additionalFields = Object.keys(formData).filter(key => 
      !basicFields.includes(key) && 
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
      !(isCalculationRegister && CALCULATION_REGISTER_PROPERTY_KEYS.includes(key)) &&
      !(isWebService && (WEB_SERVICE_OTHER_KEYS as readonly string[]).includes(key)) &&
      !(isWebService && (WEB_SERVICE_SESSION_KEYS as readonly string[]).includes(key)) &&
      !(isFunctionalOption && key === 'Content')
    );

    /** Карточка свойства регистра (скаляр или JSON-объект из XML). */
    const renderRegisterScalarField = (field: string, scheduleHint?: string) => {
      const raw = formData[field];
      const value =
        raw === undefined || raw === null ? '' : typeof raw === 'object' ? raw : raw;
      return (
        <div key={field} className="property-card">
          <div className="property-header">
            <h4>{getFieldLabel(field)}</h4>
          </div>
          <div className="property-value">
            {scheduleHint ? (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--vscode-descriptionForeground)',
                  marginBottom: '6px'
                }}
              >
                {scheduleHint}
              </div>
            ) : null}
            {typeof value === 'object' && value !== null ? (
              <textarea
                value={JSON.stringify(value, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleChange({ formData: { ...formData, [field]: parsed } });
                  } catch {
                    /* не JSON */
                  }
                }}
                className="property-textarea"
                rows={4}
              />
            ) : (
              <FieldInput
                field={field}
                value={value}
                onChange={(newValue) => {
                  handleChange({ formData: { ...formData, [field]: newValue } });
                }}
                objectType={objectType}
                label={getFieldLabel(field)}
              />
            )}
          </div>
        </div>
      );
    };

    content = (
      <div className="form-editor">
        {/* Группа "Основные" */}
        <div className="properties-group">
          <div className="section-header">
            <h3>Основные</h3>
          </div>
          <div className="properties-cards">
            {basicFields.map(field => {
              const value = formData[field];
              return (
                <div key={field} className="property-card">
                  <div className="property-header">
                    <h4>{getFieldLabel(field)}</h4>
                  </div>
                  <div className="property-value">
                    {field === 'Synonym' && typeof value === 'object' && value?.['v8:item'] ? (
                      <div className="multilingual-wrapper">
                        <SimpleMultilingualEditor
                          value={value}
                          onChange={(newValue) => {
                            handleChange({ formData: { ...formData, [field]: newValue } });
                          }}
                        />
                      </div>
                    ) : (
                      <FieldInput
                        field={field}
                        value={value}
                        onChange={(newValue) => {
                          handleChange({ formData: { ...formData, [field]: newValue } });
                        }}
                        objectType={objectType}
                        label={getFieldLabel(field)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isWebService && (
          <div className="properties-group">
            <div className="section-header">
              <h3>Прочее</h3>
            </div>
            <div className="properties-cards">
              {WEB_SERVICE_OTHER_KEYS.filter((field) => field in formData || field === 'XDTOPackages').map((field) => (
                <div key={field} className="property-card">
                  <div className="property-header">
                    <h4>{getFieldLabel(field)}</h4>
                  </div>
                  <div className="property-value">
                    {field === 'XDTOPackages' ? (
                      <WebServiceXdtoPackagesField
                        value={formData[field]}
                        onChange={(newValue) => {
                          handleChange({ formData: { ...formData, [field]: newValue } });
                        }}
                      />
                    ) : (
                      <FieldInput
                        field={field}
                        value={formData[field] ?? ''}
                        onChange={(newValue) => {
                          handleChange({ formData: { ...formData, [field]: newValue } });
                        }}
                        objectType={objectType}
                        label={getFieldLabel(field)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isWebService && (
          <div className="properties-group">
            <div className="section-header">
              <h3>Управление сеансами</h3>
            </div>
            <div className="properties-cards">
              {WEB_SERVICE_SESSION_KEYS.filter((field) => field in formData || field === 'ReuseSessions' || field === 'SessionMaxAge').map((field) => (
                <div key={field} className="property-card">
                  <div className="property-header">
                    <h4>{getFieldLabel(field)}</h4>
                  </div>
                  <div className="property-value">
                    <FieldInput
                      field={field}
                      value={formData[field] ?? ''}
                      onChange={(newValue) => {
                        handleChange({ formData: { ...formData, [field]: newValue } });
                      }}
                      objectType={objectType}
                      label={getFieldLabel(field)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Вкладка «Данные» конфигуратора: длина кода, маска, автопорядок и т.д. */}
        {isChartOfCalculationTypesProps && (
          <div className="properties-group chart-of-calculation-types-calc">
            <div className="section-header">
              <h3>Расчёт</h3>
            </div>
            <div className="properties-cards">
              {CHART_OF_CALCULATION_TYPES_DATA_PROPERTY_KEYS.map(field => {
                if (field === 'BaseCalculationTypes') {
                  const selectedRefs = extractBaseCalculationTypeRefs(formData.BaseCalculationTypes);
                  const knownRefSet = new Set(calculationTypePlanOptions.map(([r]) => r));
                  const orphanRefs = selectedRefs.filter((r) => !knownRefSet.has(r));
                  return (
                    <div key={field} className="property-card">
                      <div className="property-header">
                        <h4>{getFieldLabel(field)}</h4>
                      </div>
                      <div className="property-value chart-calc-base-plans">
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            maxHeight: '280px',
                            overflowY: 'auto'
                          }}
                        >
                          {calculationTypePlanOptions.map(([ref, label]) => (
                            <label
                              key={ref}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                fontSize: '13px'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedRefs.includes(ref)}
                                onChange={() => {
                                  const next = selectedRefs.includes(ref)
                                    ? selectedRefs.filter((x) => x !== ref)
                                    : [...selectedRefs, ref];
                                  handleChange({
                                    formData: {
                                      ...formData,
                                      BaseCalculationTypes: buildBaseCalculationTypesFormValue(next)
                                    }
                                  });
                                }}
                              />
                              <span title={ref}>{label}</span>
                            </label>
                          ))}
                          {orphanRefs.map((ref) => {
                            const short = ref.includes('.') ? ref.split('.').pop() || ref : ref;
                            return (
                              <label
                                key={`orphan-${ref}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  opacity: 0.9
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked
                                  onChange={() => {
                                    const next = selectedRefs.filter((x) => x !== ref);
                                    handleChange({
                                      formData: {
                                        ...formData,
                                        BaseCalculationTypes: buildBaseCalculationTypesFormValue(next)
                                      }
                                    });
                                  }}
                                />
                                <span title={ref}>
                                  {short}{' '}
                                  <span style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '11px' }}>
                                    (нет в списке конфигурации)
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                          {calculationTypePlanOptions.length === 0 && orphanRefs.length === 0 && (
                            <span
                              style={{
                                fontSize: '12px',
                                color: 'var(--vscode-descriptionForeground)'
                              }}
                            >
                              Планы видов расчёта не найдены в метаданных. Проверьте корень конфигурации или откройте объект
                              из выгрузки CF.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                const raw = formData[field];
                const value =
                  raw === undefined || raw === null
                    ? ''
                    : typeof raw === 'object'
                      ? raw
                      : raw;
                return (
                  <div key={field} className="property-card">
                    <div className="property-header">
                      <h4>{getFieldLabel(field)}</h4>
                    </div>
                    <div className="property-value">
                      {isMultilingualMetadataField(field) ? (
                        <SimpleMultilingualEditor
                          value={value}
                          onChange={(newValue) => {
                            handleChange({ formData: { ...formData, [field]: newValue } });
                          }}
                        />
                      ) : typeof value === 'object' && value !== null ? (
                        <textarea
                          value={JSON.stringify(value, null, 2)}
                          onChange={e => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleChange({ formData: { ...formData, [field]: parsed } });
                            } catch {
                              /* не JSON */
                            }
                          }}
                          className="property-textarea"
                          rows={4}
                        />
                      ) : (
                        <FieldInput
                          field={field}
                          value={value}
                          onChange={newValue => {
                            handleChange({ formData: { ...formData, [field]: newValue } });
                          }}
                          objectType={objectType}
                          label={getFieldLabel(field)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isChartOfAccountsProps && (
          <div className="properties-group chart-of-accounts-data">
            <div className="section-header">
              <h3>Данные</h3>
            </div>
            <div className="properties-cards">
              {CHART_OF_ACCOUNTS_DATA_PROPERTY_KEYS.map(field => {
                const raw = formData[field];
                const value =
                  raw === undefined || raw === null
                    ? ''
                    : typeof raw === 'object'
                      ? raw
                      : raw;
                return (
                  <div key={field} className="property-card">
                    <div className="property-header">
                      <h4>{getFieldLabel(field)}</h4>
                    </div>
                    <div className="property-value">
                      {isMultilingualMetadataField(field) ? (
                        <SimpleMultilingualEditor
                          value={value}
                          onChange={(newValue) => {
                            handleChange({ formData: { ...formData, [field]: newValue } });
                          }}
                        />
                      ) : typeof value === 'object' && value !== null ? (
                        <textarea
                          value={JSON.stringify(value, null, 2)}
                          onChange={e => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleChange({ formData: { ...formData, [field]: parsed } });
                            } catch {
                              /* не JSON */
                            }
                          }}
                          className="property-textarea"
                          rows={4}
                        />
                      ) : (
                        <FieldInput
                          field={field}
                          value={value}
                          onChange={newValue => {
                            handleChange({ formData: { ...formData, [field]: newValue } });
                          }}
                          objectType={objectType}
                          label={getFieldLabel(field)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isInformationRegister && (
          <div className="properties-group information-register-props">
            <div className="section-header">
              <h3>Регистр сведений</h3>
            </div>
            <div className="properties-cards">
              {INFORMATION_REGISTER_PROPERTY_KEYS.map((field) => renderRegisterScalarField(field))}
            </div>
          </div>
        )}

        {isAccumulationRegister && (
          <div className="properties-group accumulation-register-props">
            <div className="section-header">
              <h3>Регистр накопления</h3>
            </div>
            <div className="properties-cards">
              {ACCUMULATION_REGISTER_PROPERTY_KEYS.map((field) => renderRegisterScalarField(field))}
            </div>
          </div>
        )}

        {isAccountingRegister && (
          <div className="properties-group accounting-register-props">
            <div className="section-header">
              <h3>Регистр бухгалтерии</h3>
            </div>
            <div className="properties-cards">
              {ACCOUNTING_REGISTER_PROPERTY_KEYS.map((field) => {
                if (field === 'ChartOfAccounts') {
                  const currentValue = typeof formData.ChartOfAccounts === 'string' ? formData.ChartOfAccounts : '';
                  const inList = chartOfAccountsPlanOptions.some(([ref]) => ref === currentValue);
                  const orphanRef =
                    currentValue && !inList ? currentValue : '';
                  const hasPlans = chartOfAccountsPlanOptions.length > 0;
                  return (
                    <div key={field} className="property-card">
                      <div className="property-header">
                        <h4>{getFieldLabel(field)}</h4>
                      </div>
                      <div className="property-value">
                        {hasPlans ? (
                          <select
                            value={currentValue}
                            onChange={(e) => {
                              const v = e.target.value;
                              handleChange({
                                formData: {
                                  ...formData,
                                  ChartOfAccounts: v
                                }
                              });
                            }}
                            className="property-select"
                            style={{ width: '100%', padding: '8px' }}
                          >
                            <option value="">-- Выберите план счетов --</option>
                            {chartOfAccountsPlanOptions.map(([ref, label]) => (
                              <option key={ref} value={ref}>
                                {label}
                              </option>
                            ))}
                            {orphanRef ? (
                              <option value={orphanRef}>
                                {orphanRef.includes('.') ? orphanRef.split('.').pop() : orphanRef}{' '}
                                (нет в списке метаданных)
                              </option>
                            ) : null}
                          </select>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={currentValue}
                              onChange={(e) => {
                                handleChange({
                                  formData: { ...formData, ChartOfAccounts: e.target.value }
                                });
                              }}
                              placeholder="ChartOfAccounts.ИмяПлана"
                              className="property-input"
                              style={{ width: '100%', padding: '8px' }}
                            />
                            <div
                              style={{
                                marginTop: '6px',
                                fontSize: '12px',
                                color: 'var(--vscode-descriptionForeground)'
                              }}
                            >
                              Планы счетов не найдены в метаданных — укажите ссылку вручную.
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }
                return renderRegisterScalarField(field);
              })}
            </div>
          </div>
        )}

        {isCalculationRegister && (
          <div className="properties-group calculation-register-props">
            <div className="section-header">
              <h3>Регистр расчёта</h3>
            </div>
            <div className="properties-cards">
              {CALCULATION_REGISTER_PROPERTY_KEYS.map((field) => {
                if (field === 'ChartOfCalculationTypes') {
                  const currentValue =
                    typeof formData.ChartOfCalculationTypes === 'string'
                      ? formData.ChartOfCalculationTypes
                      : '';
                  const inList = calculationTypePlanOptions.some(([ref]) => ref === currentValue);
                  const orphanRef = currentValue && !inList ? currentValue : '';
                  const hasPlans = calculationTypePlanOptions.length > 0;
                  return (
                    <div key={field} className="property-card">
                      <div className="property-header">
                        <h4>{getFieldLabel(field)}</h4>
                      </div>
                      <div className="property-value">
                        {hasPlans ? (
                          <select
                            value={currentValue}
                            onChange={(e) => {
                              const v = e.target.value;
                              handleChange({
                                formData: {
                                  ...formData,
                                  ChartOfCalculationTypes: v
                                }
                              });
                            }}
                            className="property-select"
                            style={{ width: '100%', padding: '8px' }}
                          >
                            <option value="">-- Выберите план видов расчёта --</option>
                            {calculationTypePlanOptions.map(([ref, label]) => (
                              <option key={ref} value={ref}>
                                {label}
                              </option>
                            ))}
                            {orphanRef ? (
                              <option value={orphanRef}>
                                {orphanRef.includes('.') ? orphanRef.split('.').pop() : orphanRef}{' '}
                                (нет в списке метаданных)
                              </option>
                            ) : null}
                          </select>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={currentValue}
                              onChange={(e) => {
                                handleChange({
                                  formData: {
                                    ...formData,
                                    ChartOfCalculationTypes: e.target.value
                                  }
                                });
                              }}
                              placeholder="ChartOfCalculationTypes.ИмяПлана"
                              className="property-input"
                              style={{ width: '100%', padding: '8px' }}
                            />
                            <div
                              style={{
                                marginTop: '6px',
                                fontSize: '12px',
                                color: 'var(--vscode-descriptionForeground)'
                              }}
                            >
                              Планы видов расчёта не найдены в метаданных — укажите ссылку вручную.
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }
                if (field === 'Schedule') {
                  const calcRegStubName =
                    (typeof formData?.Name === 'string' && formData.Name.trim()) ||
                    (selectedObject?.name ? String(selectedObject.name).trim() : '') ||
                    '…';
                  const entries = metadata.informationRegistersSchedule ?? [];
                  const scheduleRef =
                    typeof formData.Schedule === 'string' ? formData.Schedule.trim() : '';
                  const selectedEntry = entries.find((e) => e.ref === scheduleRef);
                  const scheduleOrphan = scheduleRef && !selectedEntry ? scheduleRef : '';
                  const valueStr =
                    typeof formData.ScheduleValue === 'string' ? formData.ScheduleValue.trim() : '';
                  const dateStr =
                    typeof formData.ScheduleDate === 'string' ? formData.ScheduleDate.trim() : '';
                  const resourceOpts =
                    selectedEntry && scheduleRef
                      ? selectedEntry.resources.map((r) => ({
                          ref: calculationScheduleResourceRef(scheduleRef, r),
                          short: r
                        }))
                      : [];
                  const dateDimNamesForPicker =
                    selectedEntry && scheduleRef
                      ? (selectedEntry.dateDimensions?.length ?? 0) > 0
                        ? selectedEntry.dateDimensions!
                        : selectedEntry.dimensions
                      : [];
                  const dimensionOpts =
                    selectedEntry && scheduleRef
                      ? dateDimNamesForPicker.map((d) => ({
                          ref: calculationScheduleDimensionRef(scheduleRef, d),
                          short: d
                        }))
                      : [];
                  const scheduleDateOnlyDateTypes =
                    Boolean(selectedEntry?.dateDimensions && selectedEntry.dateDimensions.length > 0);
                  const valueInList = resourceOpts.some((x) => x.ref === valueStr);
                  const valueOrphan = valueStr && !valueInList ? valueStr : '';
                  const dateInList = dimensionOpts.some((x) => x.ref === dateStr);
                  const dateOrphan = dateStr && !dateInList ? dateStr : '';
                  const hasIrCatalog = entries.length > 0;
                  const patchSchedule = (patch: Record<string, string>) => {
                    handleChange({ formData: { ...formData, ...patch } });
                  };
                  return (
                    <React.Fragment key="calc-schedule-trio">
                      <div className="property-card">
                        <div className="property-header">
                          <h4>{getFieldLabel('Schedule')}</h4>
                        </div>
                        <div className="property-value">
                          {hasIrCatalog ? (
                            <select
                              className="property-select"
                              style={{ width: '100%', padding: '8px' }}
                              value={scheduleRef}
                              onChange={(e) => {
                                const v = e.target.value;
                                patchSchedule({ Schedule: v, ScheduleValue: '', ScheduleDate: '' });
                              }}
                            >
                              <option value="">-- Независимый регистр сведений (график) --</option>
                              {entries.map((e) => (
                                <option key={e.ref} value={e.ref}>
                                  {e.displayName}
                                </option>
                              ))}
                              {scheduleOrphan ? (
                                <option value={scheduleOrphan}>
                                  {scheduleOrphan} (нет в списке метаданных)
                                </option>
                              ) : null}
                            </select>
                          ) : (
                            <>
                              <input
                                type="text"
                                className="property-input"
                                style={{ width: '100%', padding: '8px' }}
                                value={scheduleRef}
                                placeholder="InformationRegister.ИмяГрафика"
                                onChange={(e) => patchSchedule({ Schedule: e.target.value })}
                              />
                              <div
                                style={{
                                  marginTop: '6px',
                                  fontSize: '12px',
                                  color: 'var(--vscode-descriptionForeground)'
                                }}
                              >
                                Независимые регистры сведений не найдены — укажите ссылку вручную.
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="property-card">
                        <div className="property-header">
                          <h4>{getFieldLabel('ScheduleValue')}</h4>
                        </div>
                        <div className="property-value">
                          {hasIrCatalog && selectedEntry && scheduleRef && resourceOpts.length > 0 ? (
                            <select
                              className="property-select"
                              style={{ width: '100%', padding: '8px' }}
                              value={valueStr}
                              onChange={(e) => patchSchedule({ ScheduleValue: e.target.value })}
                            >
                              <option value="">-- Ресурс регистра (значение графика) --</option>
                              {resourceOpts.map((x) => (
                                <option key={x.ref} value={x.ref}>
                                  {x.short}
                                </option>
                              ))}
                              {valueOrphan ? (
                                <option value={valueOrphan}>
                                  {valueOrphan} (нет в списке метаданных)
                                </option>
                              ) : null}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className="property-input"
                              style={{ width: '100%', padding: '8px' }}
                              value={valueStr}
                              disabled={Boolean(hasIrCatalog && !scheduleRef)}
                              placeholder="InformationRegister.Имя.Resource.ИмяРесурса"
                              onChange={(e) => patchSchedule({ ScheduleValue: e.target.value })}
                            />
                          )}
                        </div>
                      </div>
                      <div className="property-card">
                        <div className="property-header">
                          <h4>{getFieldLabel('ScheduleDate')}</h4>
                        </div>
                        <div className="property-value">
                          {hasIrCatalog && selectedEntry && scheduleRef && dimensionOpts.length > 0 ? (
                            <select
                              className="property-select"
                              style={{ width: '100%', padding: '8px' }}
                              value={dateStr}
                              onChange={(e) => patchSchedule({ ScheduleDate: e.target.value })}
                            >
                              <option value="">
                                {scheduleDateOnlyDateTypes
                                  ? '-- Измерение типа «Дата» (дата графика) --'
                                  : '-- Измерение регистра (дата графика) --'}
                              </option>
                              {dimensionOpts.map((x) => (
                                <option key={x.ref} value={x.ref}>
                                  {x.short}
                                </option>
                              ))}
                              {dateOrphan ? (
                                <option value={dateOrphan}>
                                  {dateOrphan} (нет в списке метаданных)
                                </option>
                              ) : null}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className="property-input"
                              style={{ width: '100%', padding: '8px' }}
                              value={dateStr}
                              disabled={Boolean(hasIrCatalog && !scheduleRef)}
                              placeholder="InformationRegister.Имя.Dimension.ИмяИзмерения"
                              onChange={(e) => patchSchedule({ ScheduleDate: e.target.value })}
                            />
                          )}
                        </div>
                      </div>
                      <div className="property-card" style={{ borderStyle: 'dashed' }}>
                        <div
                          className="property-value"
                          style={{
                            fontSize: '12px',
                            lineHeight: 1.5,
                            color: 'var(--vscode-descriptionForeground)'
                          }}
                        >
                          <div>
                            РегистрРасчета.{calcRegStubName}: В качестве графика должен быть назначен
                            непериодический регистр сведений.
                          </div>
                          <div style={{ marginTop: '8px' }}>
                            РегистрРасчета.{calcRegStubName}: В качестве даты графика должно быть назначено
                            измерение типа «Дата».
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }
                if (field === 'ScheduleValue' || field === 'ScheduleDate') {
                  return null;
                }
                return renderRegisterScalarField(field);
              })}
            </div>
          </div>
        )}

        {(isInformationRegister ||
          isAccumulationRegister ||
          isAccountingRegister ||
          isCalculationRegister) && (
          <div className="properties-group register-recorder-documents">
            <div className="section-header">
              <h3>Документы (RegisterRecords)</h3>
            </div>
            <div className="properties-cards">
              <div className="property-card">
                <div className="property-header">
                  <h4>Регистраторы</h4>
                </div>
                <div className="property-value">
                  {isInformationRegister && formData?.WriteMode !== 'RecorderSubordinate' ? (
                    <div style={{ fontSize: '13px' }}>
                      {(selectedObject?.recorderDocumentNames?.length ?? 0) === 0 ? (
                        <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                          Документов с движениями по этому регистру не найдено (или каталог Documents недоступен).
                        </span>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
                          {(selectedObject?.recorderDocumentNames || []).map((n: string) => (
                            <li key={n}>{n}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        maxHeight: '280px',
                        overflowY: 'auto'
                      }}
                    >
                      {documentSelectOptions.map(([docName]) => {
                        const selected = Array.isArray(selectedObject?.recorderDocumentNames)
                          ? selectedObject!.recorderDocumentNames!.includes(docName)
                          : false;
                        return (
                          <label
                            key={docName}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {
                                if (!selectedObject || !onSelectedObjectChange) return;
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
                              }}
                            />
                            <span title={`Document.${docName}`}>{docName}</span>
                          </label>
                        );
                      })}
                      {(Array.isArray(selectedObject?.recorderDocumentNames)
                        ? selectedObject!.recorderDocumentNames!
                        : []
                      )
                        .filter((n: string) => !documentSelectOptions.some(([d]) => d === n))
                        .map((n: string) => (
                          <label
                            key={`orphan-${n}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              opacity: 0.9
                            }}
                          >
                            <input
                              type="checkbox"
                              checked
                              onChange={() => {
                                if (!selectedObject || !onSelectedObjectChange) return;
                                const cur = [...(selectedObject.recorderDocumentNames || [])];
                                onSelectedObjectChange({
                                  ...selectedObject,
                                  recorderDocumentNames: cur.filter((x) => x !== n)
                                });
                                onChange(formData);
                              }}
                            />
                            <span title={n}>
                              {n}{' '}
                              <span
                                style={{
                                  color: 'var(--vscode-descriptionForeground)',
                                  fontSize: '11px'
                                }}
                              >
                                (нет в списке метаданных)
                              </span>
                            </span>
                          </label>
                        ))}
                      {documentSelectOptions.length === 0 &&
                        !(selectedObject?.recorderDocumentNames?.length ?? 0) && (
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--vscode-descriptionForeground)'
                            }}
                          >
                            Документы не найдены в метаданных. Проверьте корень конфигурации.
                          </span>
                        )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Группа "Стандартные реквизиты" */}
        {standardAttributes && (
          <div className="properties-group">
            <div className="section-header">
              <h3>Стандартные реквизиты</h3>
              <span className="section-count">({Array.isArray(standardAttributes) ? standardAttributes.length : 1})</span>
            </div>
            <div className="standard-attributes-list">
              {Array.isArray(standardAttributes) ? (
                standardAttributes.map((attr: any, index: number) => {
                  // Определяем имя атрибута из разных возможных источников
                  const rawAttrName = attr.Name || 
                                     attr.name || 
                                     attr['xr:StandardAttribute']?.Name ||
                                     attr['xr:StandardAttribute']?.name ||
                                     `Стандартный атрибут ${index + 1}`;
                  // Переводим имя атрибута через getFieldLabel
                  const attrName = getFieldLabel(rawAttrName);
                  
                  // Получаем свойства для отображения
                  const displayProps = attr['xr:StandardAttribute'] || attr;
                  
                  return (
                    <div key={index} className="standard-attribute-card">
                      <div className="attribute-header">
                        <h4>{attrName}</h4>
                      </div>
                    <div className="attribute-properties">
                      {Object.entries(displayProps)
                        .filter(([key]) => !['name', 'Name', 'xr:StandardAttribute'].includes(key))
                        .slice(0, 8)
                        .map(([key, val]: [string, any]) => {
                          // Если это простое значение (не объект), показываем редактируемое поле
                          if (typeof val !== 'object' || val === null) {
                            return (
                              <div key={key} className="property-row">
                                <span className="property-name">{getFieldLabel(key)}:</span>
                                <div className="property-value-inline">
                                  <FieldInput
                                    field={key}
                                    value={val}
                                    onChange={(newValue) => {
                                      const updatedProps = { ...displayProps, [key]: newValue };
                                      handleChange({ 
                                        formData: { 
                                          ...formData, 
                                          StandardAttributes: Array.isArray(standardAttributes)
                                            ? standardAttributes.map((sa: any, i: number) => 
                                                i === index ? updatedProps : sa
                                              )
                                            : updatedProps
                                        } 
                                      });
                                    }}
                                    objectType={objectType}
                                    label={key}
                                  />
                                </div>
                              </div>
                            );
                          }
                          
                          // Для объектов обрабатываем специальные случаи
                          let displayValue: string;
                          if (val && typeof val === 'object') {
                            // Проверяем на xsi:nil
                            if (val['xsi:nil'] === 'true' || val['xsi:nil'] === true || val['@_xsi:nil'] === 'true') {
                              displayValue = '';
                            } else if (val['#text'] !== undefined) {
                              displayValue = String(val['#text']);
                            } else if (val.text !== undefined) {
                              displayValue = String(val.text);
                            } else {
                              // Для других объектов показываем JSON, но ограничиваем длину
                              displayValue = JSON.stringify(val).substring(0, 50);
                            }
                          } else {
                            displayValue = String(val || '');
                          }
                          
                          return (
                            <div key={key} className="property-row">
                              <span className="property-name">{getFieldLabel(key)}:</span>
                              <span className="property-value">{displayValue || '(пусто)'}</span>
                            </div>
                          );
                        })}
                    </div>
                    </div>
                  );
                })
              ) : (
                <div className="standard-attribute-card">
                  <div className="attribute-header">
                    <h4>
                      {getFieldLabel(
                        standardAttributes.Name || 
                        standardAttributes.name || 
                        standardAttributes['xr:StandardAttribute']?.Name ||
                        standardAttributes['xr:StandardAttribute']?.name ||
                        'Стандартный атрибут'
                      )}
                    </h4>
                  </div>
                  {Object.keys(standardAttributes).length > 1 && (
                    <div className="attribute-properties">
                      {Object.entries(standardAttributes)
                        .filter(([key]) => !['name', 'Name', 'xr:StandardAttribute'].includes(key))
                        .slice(0, 8)
                        .map(([key, val]: [string, any]) => {
                          // Обрабатываем специальные случаи для объектов
                          let displayValue: string;
                          if (val && typeof val === 'object') {
                            // Проверяем на xsi:nil
                            if (val['xsi:nil'] === 'true' || val['xsi:nil'] === true || val['@_xsi:nil'] === 'true') {
                              displayValue = '';
                            } else if (val['#text'] !== undefined) {
                              displayValue = String(val['#text']);
                            } else if (val.text !== undefined) {
                              displayValue = String(val.text);
                            } else {
                              // Для других объектов показываем JSON, но ограничиваем длину
                              displayValue = JSON.stringify(val).substring(0, 50);
                            }
                          } else {
                            displayValue = String(val || '');
                          }
                          
                          return (
                            <div key={key} className="property-row">
                              <span className="property-name">{getFieldLabel(key)}:</span>
                              <span className="property-value">{displayValue || '(пусто)'}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Группа "Движения документа" (только для документов) */}
        {isDocument && (
        <div className="properties-group">
          <div className="section-header">
            <h3>Движения документа</h3>
            <span className="section-count">
              ({registerRecords ? (Array.isArray(registerRecords) ? registerRecords.length : 1) : 0})
            </span>
            <UiButton
              icon="add"
              onClick={() => {
                setNewRegisterRecord('');
                setEditingRegisterRecordIndex(null);
                setShowRegisterRecordsEditor(true);
              }}
            >
              Добавить регистр
            </UiButton>
          </div>
          {registerRecords ? (
            <div className="register-records-list">
              {Array.isArray(registerRecords) ? (
                registerRecords.map((record: any, index: number) => {
                  // Обрабатываем разные форматы RegisterRecords
                  const recordName = record.Item?.text || 
                                   record.Item?.['#text'] || 
                                   record.Item || 
                                   record.name || 
                                   record.Name ||
                                   `Регистр ${index + 1}`;
                  
                  return (
                    <div key={index} className="register-record-card">
                      <div className="record-header">
                        <h4>{recordName}</h4>
                        <div className="ui-row-actions">
                          <UiButton
                            icon="edit"
                            title="Редактировать"
                            onClick={() => {
                              const currentRegister = record.Item?.text || 
                                                    record.Item?.['#text'] || 
                                                    record.Item || 
                                                    record.name || 
                                                    record.Name || '';
                              setNewRegisterRecord(currentRegister);
                              setEditingRegisterRecordIndex(index);
                              setShowRegisterRecordsEditor(true);
                            }}
                          />
                          <UiButton
                            icon="close"
                            danger
                            title="Удалить"
                            onClick={() => {
                              const updatedRecords = [...registerRecords];
                              updatedRecords.splice(index, 1);
                              handleChange({
                                formData: {
                                  ...formData,
                                  RegisterRecords: updatedRecords.length > 0 ? updatedRecords : undefined
                                }
                              });
                            }}
                          />
                        </div>
                      </div>
                      <div className="record-content">
                        {record.Item && typeof record.Item === 'object' ? (
                          <div className="property-row">
                            <span className="property-name">Тип:</span>
                            <span className="property-value">
                              {record.Item['xsi:type'] || record.Item.type || 'Не указан'}
                            </span>
                          </div>
                        ) : record.name || record.Name ? (
                          <div className="property-row">
                            <span className="property-name">Имя:</span>
                            <span className="property-value">{record.name || record.Name}</span>
                          </div>
                        ) : (
                          <div className="property-row">
                            <span className="property-value">{String(record).substring(0, 100)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="register-record-card">
                  <div className="record-header">
                    <h4>Движение регистра</h4>
                    <UiButton
                      icon="edit"
                      title="Редактировать"
                      onClick={() => {
                        const currentRegister = registerRecords.Item?.text || 
                                              registerRecords.Item?.['#text'] || 
                                              registerRecords.Item || 
                                              registerRecords.name || 
                                              registerRecords.Name || '';
                        setNewRegisterRecord(currentRegister);
                        setEditingRegisterRecordIndex(0);
                        setShowRegisterRecordsEditor(true);
                      }}
                    />
                  </div>
                  <div className="record-content">
                    {typeof registerRecords === 'object' ? (
                      <div className="property-row">
                        <span className="property-name">Данные:</span>
                        <span className="property-value">
                          {JSON.stringify(registerRecords, null, 2).substring(0, 200)}
                        </span>
                      </div>
                    ) : (
                      <span className="property-value">{String(registerRecords).substring(0, 100)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="register-records-empty" style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
              Нет движений документа. Нажмите "+ Добавить регистр" для добавления.
              </div>
            )}
        </div>
        )}

        {/* Группа "Дополнительно" */}
        {additionalFields.length > 0 && (
          <div className="properties-group">
            <div className="section-header">
              <h3>Дополнительно</h3>
              <span className="section-count">({additionalFields.length})</span>
            </div>
            <div className="additional-properties-list">
              {additionalFields.map(field => {
                const value = formData[field];
                
                // Специальная обработка для ExtDimensionTypes
                if (field === 'ExtDimensionTypes') {
                  // Фильтруем планы видов характеристик из referenceTypes
                  const chartOfCharacteristicTypesOptions = (metadata.referenceTypes || [])
                    .filter((refType: string) => {
                      if (typeof refType !== 'string') return false;
                      // Ищем типы вида cfg:ChartOfCharacteristicTypesRef.ИмяПлана
                      return refType.startsWith('cfg:ChartOfCharacteristicTypesRef.') || 
                             refType.startsWith('ChartOfCharacteristicTypesRef.');
                    })
                    .map((refType: string) => {
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
                  
                  return (
                    <div key={field} className="property-card">
                      <div className="property-header">
                        <h4>{getFieldLabel(field)}</h4>
                      </div>
                      <div className="property-value">
                        <select
                          value={chartOfCharacteristicTypesOptions.includes(currentValue) ? currentValue : ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            if (newValue) {
                              handleChange({ formData: { ...formData, [field]: newValue } });
                            }
                          }}
                          className="property-select"
                          style={{
                            width: '100%',
                            marginBottom: '8px',
                            padding: '8px',
                            fontSize: '14px',
                            border: '1px solid var(--vscode-input-border)',
                            backgroundColor: 'var(--vscode-input-background)',
                            color: 'var(--vscode-input-foreground)'
                          }}
                        >
                          <option value="">-- Выберите план видов характеристик --</option>
                          {chartOfCharacteristicTypesOptions.map((option: string) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            handleChange({ formData: { ...formData, [field]: newValue } });
                          }}
                          placeholder="ChartOfCharacteristicTypes.ИмяПлана"
                          className="property-input"
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '14px',
                            border: isValid ? '1px solid var(--vscode-input-border)' : '1px solid var(--vscode-errorForeground)',
                            backgroundColor: 'var(--vscode-input-background)',
                            color: 'var(--vscode-input-foreground)'
                          }}
                        />
                        {!isValid && currentValue && (
                          <div style={{ 
                            marginTop: '4px', 
                            fontSize: '12px', 
                            color: 'var(--vscode-errorForeground)' 
                          }}>
                            Ошибка: значение должно начинаться с "ChartOfCharacteristicTypes."
                          </div>
                        )}
                        <div style={{ 
                          marginTop: '4px', 
                          fontSize: '12px', 
                          color: 'var(--vscode-descriptionForeground)' 
                        }}>
                          Тип может быть только ChartOfCharacteristicTypes
                        </div>
                      </div>
                    </div>
                  );
                }

                if (field === 'Type' && usesValueTypeEditor(objectType, selectedObject?.xmlObjectType)) {
                  return (
                    <div key={field} className="property-card">
                      <div className="property-header">
                        <h4>{getFieldLabel(field)}</h4>
                      </div>
                      <div className="property-value">
                        <TypeWidget
                          {...({
                            id: `defined-type-${field}`,
                            value: value,
                            onChange: (newValue: any) => {
                              handleChange({ formData: { ...formData, [field]: newValue } });
                            },
                            schema: {},
                            label: getFieldLabel(field),
                            required: false,
                            readonly: false,
                            rawErrors: [],
                            errorSchema: {},
                            registry: {},
                            formContext: {},
                            options: {
                              registers: metadata.registers,
                              referenceTypes: metadata.referenceTypes,
                              definedTypeMode: isDefinedTypeObject(objectType, selectedObject?.xmlObjectType)
                            }
                          } as any)}
                        />
                      </div>
                    </div>
                  );
                }

                if (field === 'Location' && isFunctionalOption) {
                  return (
                    <div key={field} className="property-card property-card-wide">
                      <div className="property-header">
                        <h4>{getFieldLabel(field)}</h4>
                      </div>
                      <div className="property-value">
                        <FunctionalOptionLocationField
                          value={value}
                          referenceTypes={metadata.referenceTypes || []}
                          members={metadata.functionalOptionMembers || []}
                          onChange={(newValue) => {
                            handleChange({ formData: { ...formData, Location: newValue } });
                          }}
                        />
                      </div>
                    </div>
                  );
                }

                if (field === 'PrivilegedGetMode' && isFunctionalOption) {
                  const privileged = value === true || value === 'true' || value === 'True';
                  return (
                    <div key={field} className="property-card property-card-wide">
                      <div className="property-header">
                        <h4>{getFieldLabel(field)}</h4>
                      </div>
                      <div className="property-value">
                        <UiCheckbox
                          checked={privileged}
                          onChange={(checked) => {
                            handleChange({ formData: { ...formData, PrivilegedGetMode: checked ? 'true' : 'false' } });
                          }}
                          label={privileged ? 'Да' : 'Нет'}
                        />
                      </div>
                    </div>
                  );
                }

                if (field === 'Source') {
                  return (
                    <div key={field} className="property-card property-card-wide">
                      <div className="property-header">
                        <h4>{getFieldLabel(field)}</h4>
                      </div>
                      <div className="property-value">
                        <EventSubscriptionSourceField
                          value={value}
                          referenceTypes={metadata.referenceTypes || []}
                          currentEvent={typeof formData.Event === 'string' ? formData.Event : ''}
                          onChange={(newValue, eventStillValid) => {
                            handleChange({
                              formData: {
                                ...formData,
                                Source: newValue,
                                Event: eventStillValid ? formData.Event : '',
                              },
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                }

                if (field === 'Event') {
                  return (
                    <div key={field} className="property-card property-card-wide">
                      <div className="property-header">
                        <h4>{getFieldLabel(field)}</h4>
                      </div>
                      <div className="property-value">
                        <EventSubscriptionEventField
                          value={value}
                          source={formData.Source}
                          onChange={(newValue) => {
                            handleChange({ formData: { ...formData, Event: newValue } });
                          }}
                        />
                      </div>
                    </div>
                  );
                }

                if (field === 'Handler') {
                  return (
                    <div key={field} className="property-card property-card-wide">
                      <div className="property-header">
                        <h4>{getFieldLabel(field)}</h4>
                      </div>
                      <div className="property-value">
                        <UiTextField
                          value={typeof value === 'string' ? value : ''}
                          placeholder="ОбщийМодуль.ИмяМодуля.ИмяПроцедуры"
                          onChange={(newValue) => {
                            handleChange({ formData: { ...formData, [field]: newValue } });
                          }}
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={field} className="property-card">
                    <div className="property-header">
                      <h4>{getFieldLabel(field)}</h4>
                    </div>
                    <div className="property-value">
                      {isMultilingualMetadataField(field) ? (
                        <SimpleMultilingualEditor
                          value={value}
                          onChange={(newValue) => {
                            handleChange({ formData: { ...formData, [field]: newValue } });
                          }}
                        />
                      ) : typeof value === 'object' && value !== null ? (
                        <textarea
                          value={JSON.stringify(value, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleChange({ formData: { ...formData, [field]: parsed } });
                            } catch {
                              // Оставляем как строку если не валидный JSON
                            }
                          }}
                          className="property-textarea"
                          rows={4}
                        />
                      ) : (
                        <FieldInput
                          field={field}
                          value={value}
                          onChange={(newValue) => {
                            handleChange({ formData: { ...formData, [field]: newValue } });
                          }}
                          objectType={objectType}
                          label={getFieldLabel(field)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  } else if (activeTab === 'characteristicTypes') {
    // Проверяем, является ли объект планом видов характеристик
    const isChartOfCharacteristicTypes = 
      objectType === 'ChartOfCharacteristicTypes' || 
      objectType === 'План видов характеристик' ||
      (selectedObject?.sourcePath && selectedObject.sourcePath.includes('ChartsOfCharacteristicTypes'));
    
    if (!isChartOfCharacteristicTypes) {
      content = (
        <div className="form-editor">
          <div className="editor-empty">
            <p>Эта вкладка доступна только для объектов типа "План видов характеристик"</p>
          </div>
        </div>
      );
    } else {
      const characteristicTypes = getCharacteristicTypes();
      
      content = (
        <div className="form-editor">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Типы значения характеристик ({characteristicTypes.length})</h3>
            <UiButton
              icon="add"
              onClick={() => {
                setEditingCharacteristicTypeIndex(null);
                setShowCharacteristicTypeModal(true);
              }}
            >
              Добавить тип значения
            </UiButton>
          </div>
          
          <div className="characteristic-types-list">
            {characteristicTypes.length === 0 ? (
              <div className="characteristic-types-empty" style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
                Нет типов значения характеристик. Нажмите "Добавить тип значения" для добавления.
              </div>
            ) : (
              characteristicTypes.map((typeValue: string, index: number) => (
                <div key={index} className="characteristic-type-card" style={{
                  padding: '12px',
                  marginBottom: '8px',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--vscode-editor-background)'
                }}>
                  <div className="characteristic-type-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                        {formatTypeForDisplay({ kind: typeValue })}
                      </h4>
                      <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' }}>
                        {typeValue}
                      </div>
                    </div>
                    <div className="ui-row-actions">
                      <UiButton
                        icon="edit"
                        title="Открыть редактор типов"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingCharacteristicTypeIndex(index);
                          setShowCharacteristicTypeModal(true);
                        }}
                      />
                      <UiButton
                        icon="close"
                        danger
                        title="Удалить"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteCharacteristicType(index);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }
  } else if (activeTab === 'accountingFlags') {
    // Проверяем, является ли объект планом счетов
    const isChartOfAccounts = 
      objectType === 'ChartOfAccounts' ||
      (selectedObject?.sourcePath && selectedObject.sourcePath.includes('ChartsOfAccounts'));
    
    if (!isChartOfAccounts) {
      content = (
        <div className="form-editor">
          <div className="editor-empty">
            <p>Эта вкладка доступна только для объектов типа "План счетов"</p>
          </div>
        </div>
      );
    } else {
      const accountingFlags = selectedObject?.accountingFlags || [];
      const extDimensionAccountingFlags = selectedObject?.extDimensionAccountingFlags || [];
      
      content = (
        <div className="form-editor">
          {/* Группа "По счетам" */}
          <div className="properties-group" style={{ marginBottom: '24px' }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>По счетам ({accountingFlags.length})</h3>
              <UiButton
                icon="add"
                onClick={() => {
                  setEditingAccountingFlag(null);
                  setAddingAccountingFlagType('accountingFlag');
                  setShowAccountingFlagModal(true);
                }}
              >
                Добавить признак учета
              </UiButton>
            </div>
            
            <div className="accounting-flags-list">
              {accountingFlags.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
                  Нет признаков учета по счетам. Нажмите "Добавить признак учета" для добавления.
                </div>
              ) : (
                accountingFlags.map((flag: any, index: number) => (
                  <div key={index} className="accounting-flag-card" style={{
                    padding: '12px',
                    marginBottom: '8px',
                    border: '1px solid var(--vscode-panel-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--vscode-editor-background)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                          {flag.name || `Признак учета ${index + 1}`}
                        </h4>
                        {flag.properties?.Synonym && (
                          <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' }}>
                            {(() => {
                              const syn = flag.properties.Synonym;
                              if (typeof syn === 'string') return syn;
                              if (syn?.['v8:item']) {
                                const items = Array.isArray(syn['v8:item']) ? syn['v8:item'] : [syn['v8:item']];
                                return items.map((item: any) => item['v8:content'] || '').filter(Boolean).join(', ');
                              }
                              return '';
                            })()}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' }}>
                          Тип: xs:boolean
                        </div>
                      </div>
                      <div className="ui-row-actions">
                        <UiButton
                          icon="edit"
                          title="Редактировать"
                          onClick={() => {
                            setEditingAccountingFlag({ type: 'accountingFlag', index });
                            setShowAccountingFlagModal(true);
                          }}
                        />
                        <UiButton
                          icon="close"
                          danger
                          title="Удалить"
                          onClick={() => handleDeleteAccountingFlag('accountingFlag', index)}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Группа "По субконто" */}
          <div className="properties-group">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>По субконто ({extDimensionAccountingFlags.length})</h3>
              <UiButton
                icon="add"
                onClick={() => {
                  setEditingAccountingFlag(null);
                  setAddingAccountingFlagType('extDimensionAccountingFlag');
                  setShowAccountingFlagModal(true);
                }}
              >
                Добавить признак учета
              </UiButton>
            </div>
            
            <div className="accounting-flags-list">
              {extDimensionAccountingFlags.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
                  Нет признаков учета по субконто. Нажмите "Добавить признак учета" для добавления.
                </div>
              ) : (
                extDimensionAccountingFlags.map((flag: any, index: number) => (
                  <div key={index} className="accounting-flag-card" style={{
                    padding: '12px',
                    marginBottom: '8px',
                    border: '1px solid var(--vscode-panel-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--vscode-editor-background)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                          {flag.name || `Признак учета ${index + 1}`}
                        </h4>
                        {flag.properties?.Synonym && (
                          <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' }}>
                            {(() => {
                              const syn = flag.properties.Synonym;
                              if (typeof syn === 'string') return syn;
                              if (syn?.['v8:item']) {
                                const items = Array.isArray(syn['v8:item']) ? syn['v8:item'] : [syn['v8:item']];
                                return items.map((item: any) => item['v8:content'] || '').filter(Boolean).join(', ');
                              }
                              return '';
                            })()}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' }}>
                          Тип: xs:boolean
                        </div>
                      </div>
                      <div className="ui-row-actions">
                        <UiButton
                          icon="edit"
                          title="Редактировать"
                          onClick={() => {
                            setEditingAccountingFlag({ type: 'extDimensionAccountingFlag', index });
                            setShowAccountingFlagModal(true);
                          }}
                        />
                        <UiButton
                          icon="close"
                          danger
                          title="Удалить"
                          onClick={() => handleDeleteAccountingFlag('extDimensionAccountingFlag', index)}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }
  } else {
  // Основная форма для свойств (fallback на JSON Schema Form)
    content = (
      <div className="form-editor">
        <Form
          schema={schema}
          uiSchema={uiSchema}
          formData={formData}
          widgets={widgets}
          validator={validator}
          onChange={handleChange}
          onSubmit={handleSubmit}
          liveValidate={false}
          showErrorList={false}
        />
      </div>
    );
  }

  // Все модальные окна рендерятся один раз в конце компонента
  return (
    <>
      {content}
      {/* Модальные окна для attributes */}
      <AttributeTypeEditorModal
        isOpen={activeTab === 'attributes' && editingAttributeType !== null}
        attributeIndex={editingAttributeType}
        attributeType={(() => {
          if (editingAttributeType === null) return null;
          const baseAttrs = (formData?.attributes ?? selectedObject?.attributes);
          const attributes = Array.isArray(baseAttrs) ? baseAttrs : [];
          return attributes[editingAttributeType]?.type || null;
      })()}
        metadata={metadataWithRegisters}
        onClose={() => setEditingAttributeType(null)}
        onSave={handleSaveAttributeTypeForAttribute}
      />
      <AddAttributeToObjectModal
        isOpen={activeTab === 'attributes' && showAddAttributeToObjectModal}
        kind={newObjectChildKind}
        name={newAttrName}
        synonym={newAttrSynonym}
        comment={newAttrComment}
        type={newAttrType}
        metadata={metadataWithRegisters}
        onClose={() => setShowAddAttributeToObjectModal(false)}
        onSave={handleAddAttributeToObject}
        onNameChange={setNewAttrName}
        onSynonymChange={setNewAttrSynonym}
        onCommentChange={setNewAttrComment}
        onTypeChange={setNewAttrType}
      />

      {/* Модальные окна для tabular */}
      <AddTabularSectionModal
        isOpen={activeTab === 'tabular' && showAddTabularModal}
        name={newTabularName}
        synonym={newTabularSynonym}
        comment={newTabularComment}
        onClose={() => setShowAddTabularModal(false)}
        onSave={handleAddTabularSection}
        onNameChange={setNewTabularName}
        onSynonymChange={setNewTabularSynonym}
        onCommentChange={setNewTabularComment}
      />
      <AddTabularAttributeModal
        isOpen={activeTab === 'tabular' && showAddAttributeModal !== null}
        name={newAttrName}
        synonym={newAttrSynonym}
        comment={newAttrComment}
        type={newAttrType}
        metadata={metadataWithRegisters}
        onClose={() => setShowAddAttributeModal(null)}
        onSave={() => showAddAttributeModal !== null && handleAddAttribute(showAddAttributeModal)}
        onNameChange={setNewAttrName}
        onSynonymChange={setNewAttrSynonym}
        onCommentChange={setNewAttrComment}
        onTypeChange={setNewAttrType}
      />
      <EditTabularAttributeTypeModal
        isOpen={activeTab === 'tabular' && editingAttribute !== null}
        tsIndex={editingAttribute?.tsIndex ?? -1}
        attrIndex={editingAttribute?.attrIndex ?? -1}
        attributeType={(() => {
          if (!editingAttribute || editingAttribute.tsIndex === undefined || editingAttribute.attrIndex === undefined) return null;
          const baseTs = (formData?.tabularSections ?? selectedObject?.tabularSections);
          const tabularSections = Array.isArray(baseTs) ? baseTs : [];
          const section = tabularSections[editingAttribute.tsIndex];
          if (!section?.attributes) return null;
          return section.attributes[editingAttribute.attrIndex]?.type || null;
                })()}
        metadata={metadataWithRegisters}
        onClose={() => setEditingAttribute(null)}
        onSave={handleSaveAttributeType}
      />

      {/* Модальные окна для properties */}
      <AttributeTypeEditorModal
        isOpen={activeTab === 'properties' && editingAttributeType !== null}
        attributeIndex={editingAttributeType}
        attributeType={(() => {
          if (editingAttributeType === null) return null;
          const baseAttrs = (formData?.attributes ?? selectedObject?.attributes);
          const attributes = Array.isArray(baseAttrs) ? baseAttrs : [];
          return attributes[editingAttributeType]?.type || null;
        })()}
        metadata={metadataWithRegisters}
        onClose={() => setEditingAttributeType(null)}
        onSave={handleSaveAttributeTypeForAttribute}
      />
      <RegisterRecordsEditorModal
        isOpen={activeTab === 'properties' && showRegisterRecordsEditor}
        registerRecord={newRegisterRecord}
        isEditing={editingRegisterRecordIndex !== null}
        registers={metadata?.registers || []}
        onClose={handleCloseRegisterRecordsEditor}
        onSave={handleSaveRegisterRecord}
        onRegisterChange={setNewRegisterRecord}
      />

      {/* Модальное окно для типов значения характеристик */}
      <CharacteristicTypeEditorModal
        isOpen={activeTab === 'characteristicTypes' && showCharacteristicTypeModal}
        typeValue={editingCharacteristicTypeIndex !== null ? getCharacteristicTypes()[editingCharacteristicTypeIndex] : null}
        metadata={metadataWithRegisters}
        onClose={() => {
          setShowCharacteristicTypeModal(false);
          setEditingCharacteristicTypeIndex(null);
        }}
        onSave={handleSaveCharacteristicType}
      />

      {/* Модальное окно для признаков учета */}
      <AccountingFlagEditorModal
        isOpen={activeTab === 'accountingFlags' && showAccountingFlagModal}
        flag={(() => {
          if (!editingAccountingFlag || !selectedObject) return null;
          const flags = editingAccountingFlag.type === 'accountingFlag'
            ? (selectedObject.accountingFlags || [])
            : (selectedObject.extDimensionAccountingFlags || []);
          return flags[editingAccountingFlag.index] || null;
        })()}
        flagType={editingAccountingFlag?.type || addingAccountingFlagType || undefined}
        onClose={() => {
          setShowAccountingFlagModal(false);
          setEditingAccountingFlag(null);
          setAddingAccountingFlagType(null);
        }}
        onSave={(flag, flagTypeFromModal) => {
          const finalFlagType = flagTypeFromModal || editingAccountingFlag?.type || addingAccountingFlagType;
          if (editingAccountingFlag && finalFlagType) {
            handleEditAccountingFlag(flag);
          } else if (finalFlagType) {
            handleAddAccountingFlag(finalFlagType, flag);
            setAddingAccountingFlagType(null);
          }
        }}
      />

      {/* Общее модальное окно подтверждения */}
      <ConfirmModal
        isOpen={!!confirmModal}
        message={confirmModal?.message || ''}
        onConfirm={handleConfirmModalConfirm}
        onCancel={handleConfirmModalCancel}
      />
    </>
  );
};


// Функция для определения типа поля и получения вариантов значений
function getFieldTypeAndOptions(field: string, objectType: string): { type: 'boolean' | 'enum' | 'string' | 'number'; options?: any[] } {
  if (field === 'PeriodAdjustmentLength') {
    return { type: 'number' };
  }

  // Boolean поля
  const booleanFields: Record<string, boolean> = {
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
  const enumFields: Record<string, any[]> = {
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
    'CreateOnInput': ['Use', 'DontUse', 'Auto', 'DontCreate', 'Create'], // Объединяем значения для документа и реквизитов
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
    'LinkByType': [], // Строковое поле (может быть пустым или содержать путь)
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
  const fieldValues = getFieldValues(field);
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
const FieldInput: React.FC<{
  field: string;
  value: any;
  onChange: (value: any) => void;
  objectType: string;
  label: string;
}> = ({ field, value, onChange, objectType, label }) => {
  const fieldInfo = getFieldTypeAndOptions(field, objectType);

  if (fieldInfo.type === 'number') {
    const strVal = value === null || value === undefined ? '' : String(value);
    return (
      <UiTextField
        type="number"
        value={strVal}
        onChange={onChange}
        placeholder="0"
      />
    );
  }

  if (fieldInfo.type === 'boolean') {
    const boolValue = value === true || value === 'true' || value === 'True';
    return (
      <UiCheckbox
        checked={boolValue}
        onChange={onChange}
        label={boolValue ? 'Да' : 'Нет'}
      />
    );
  }

  if (fieldInfo.type === 'enum' && fieldInfo.options) {
    const stringValue = value !== null && value !== undefined ? String(value) : '';
    const isAccumulationRegisterRegisterType =
      field === 'RegisterType' &&
      (objectType === 'AccumulationRegister' || objectType === 'Регистр накопления');
    const opts = [...fieldInfo.options];
    if (!isAccumulationRegisterRegisterType) {
      if (stringValue && !opts.includes(stringValue)) {
        opts.push(stringValue);
      }
    }
    const selectValue = isAccumulationRegisterRegisterType
      ? (() => {
          const c = normalizeAccumulationRegisterTypeValue(stringValue);
          return c === 'Turnovers' || c === 'Balances' ? c : '';
        })()
      : stringValue;
    return (
      <UiSelect
        value={selectValue}
        placeholder="-- Выберите значение --"
        onChange={onChange}
        options={opts.map((option) => ({
          value: option,
          label: getEnumValueLabel(option, field),
        }))}
      />
    );
  }

  return (
    <UiTextField
      value={typeof value === 'string' ? value : ''}
      onChange={onChange}
      placeholder={`Введите ${label.toLowerCase()}...`}
    />
  );
};


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
import { getFieldLabel, getEnumValueLabel, getFieldValues } from '../../metadata/field-values';

interface FormEditorProps {
  objectType: string;
  formData: any;
  onChange: (data: any) => void;
  metadata: {
    registers: string[];
    referenceTypes: string[];
  };
  activeTab?: string;
  selectedObject?: any;
  onSelectedObjectChange?: (obj: any) => void;
}

const widgets = {
  TypeWidget: TypeWidget,
  MultilingualWidget: MultilingualWidget
};

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
  }, [formData, metadata, objectType]);

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
    const isRegister = String(objectType || '').toLowerCase().includes('регистр');
    const openAddObjectChildModal = (kind: 'Attribute' | 'Resource' | 'Dimension') => {
      setNewObjectChildKind(kind);
      setShowAddAttributeToObjectModal(true);
    };
    content = (
      <div className="form-editor">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Реквизиты ({attributes.length})</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isRegister && (
              <>
                <button
                  className="btn-add-attribute"
                  type="button"
                  onClick={() => openAddObjectChildModal('Dimension')}
                  style={{
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
                  }}
                >
                  <span>➕</span>
                  <span>Добавить измерение</span>
                </button>
                <button
                  className="btn-add-attribute"
                  type="button"
                  onClick={() => openAddObjectChildModal('Resource')}
                  style={{
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
                  }}
                >
                  <span>➕</span>
                  <span>Добавить ресурс</span>
                </button>
              </>
            )}
            <button
              className="btn-add-attribute"
              type="button"
              onClick={() => openAddObjectChildModal('Attribute')}
              style={{
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
              }}
            >
              <span>➕</span>
              <span>Добавить реквизит</span>
            </button>
          </div>
        </div>
        <div className="attributes-list">
          {attributes.map((attr: any, index: number) => {
            if (!attr) return null;
            return (
              <div key={index} className="attribute-card">
                <div className="attribute-header">
                  <h4>
                    {(attr.childObjectKind === 'Resource'
                      ? '[Ресурс] '
                      : attr.childObjectKind === 'Dimension'
                      ? '[Измерение] '
                      : '')}
                    {typeof attr.name === 'string' ? attr.name : (attr.name?.content || attr.name?.['v8:content'] || attr.properties?.Name || 'Без имени')}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="attribute-type">
                      {formatTypeForDisplay(attr.type)}
                    </span>
                    <button
                      className="btn-edit-type"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingAttributeType(index);
                      }}
                      title="Открыть редактор типов"
                      aria-label="Открыть редактор типов"
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '16px',
                        background: 'var(--vscode-button-secondaryBackground)',
                        color: 'var(--vscode-button-secondaryForeground)',
                        border: '1px solid var(--vscode-button-border)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        lineHeight: '1'
                      }}
                    >
                      ✎
                    </button>
                    <button
                      className="btn-edit-type"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteObjectAttribute(index);
                      }}
                      title="Удалить"
                      aria-label="Удалить"
                      style={{
                        padding: '4px 8px',
                        fontSize: '16px',
                        background: 'var(--vscode-errorForeground)',
                        color: 'var(--vscode-button-foreground)',
                        border: '1px solid var(--vscode-button-border)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        lineHeight: '1'
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="attribute-properties">
                  {attr.properties?.Synonym && (
                    <div className="property-row">
                      <span className="property-name">Synonym:</span>
                      <div className="property-value-inline">
                        <SimpleMultilingualEditor
                          value={attr.properties.Synonym}
                          onChange={(newValue) => {
                            const updatedAttributes = selectedObject.attributes.map((a: any, i: number) => 
                              i === index ? { ...a, properties: { ...a.properties, Synonym: newValue } } : a
                            );
                            handleChange({ 
                              formData: { 
                                ...formData, 
                                attributes: updatedAttributes
                              } 
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {attr.properties?.Comment && (
                    <div className="property-row">
                      <span className="property-name">Comment:</span>
                      <div className="property-value-inline">
                        <SimpleMultilingualEditor
                          value={attr.properties.Comment}
                          onChange={(newValue) => {
                            const updatedAttributes = selectedObject.attributes.map((a: any, i: number) => 
                              i === index ? { ...a, properties: { ...a.properties, Comment: newValue } } : a
                            );
                            handleChange({ 
                              formData: { 
                                ...formData, 
                                attributes: updatedAttributes
                              } 
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
                {Object.entries(attr.properties || {}).slice(0, 5).map(([key, value]: [string, any]) => {
                  // Пропускаем поле Type, Synonym и Comment - они обрабатываются отдельно
                  if (key === 'Type' || key === 'Synonym' || key === 'Comment') {
                    return null;
                  }
                  
                  // Если это простое значение (не объект), показываем редактируемое поле
                  if (typeof value !== 'object' || value === null) {
                    return (
                      <div key={key} className="property-row">
                        <span className="property-name">{key}:</span>
                        <div className="property-value-inline">
                          <FieldInput
                            field={key}
                            value={value}
                            onChange={(newValue) => {
                              const updatedAttributes = selectedObject.attributes.map((a: any, i: number) => 
                                i === index ? { ...a, properties: { ...a.properties, [key]: newValue } } : a
                              );
                              handleChange({ 
                                formData: { 
                                  ...formData, 
                                  attributes: updatedAttributes
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
                  
                  // Для объектов показываем JSON или пустую строку
                  return (
                    <div key={key} className="property-row">
                      <span className="property-name">{key}:</span>
                      <span className="property-value">
                        {(() => {
                          try {
                            return JSON.stringify(value).substring(0, 50);
                          } catch {
                            return '';
                          }
                        })()}
                      </span>
                    </div>
                  );
                })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (activeTab === 'tabular' && (selectedObject?.tabularSections || formData?.tabularSections)) {
    const baseTs = (formData?.tabularSections ?? selectedObject?.tabularSections);
    const tabularSections = Array.isArray(baseTs) ? baseTs : [];
    content = (
      <div className="form-editor">
        <div className="section-header">
          <h3>Табличные части ({tabularSections.length})</h3>
          <button 
            className="btn-primary btn-add-tabular"
            onClick={() => setShowAddTabularModal(true)}
          >
            <span className="btn-icon">➕</span>
            <span>Добавить табличную часть</span>
          </button>
        </div>
        
        <div className="tabular-list">
          {tabularSections.map((ts: any, tsIndex: number) => {
            if (!ts) return null;
            return (
              <div key={tsIndex} className="tabular-card">
                <div className="tabular-header">
                  <div>
                    <h4>{ts.name}</h4>
                    {ts.properties?.Synonym && (
                      <div className="tabular-synonym">
                        {(() => {
                          const syn = ts.properties.Synonym;
                          if (!syn) return '';
                          if (typeof syn === 'string') return syn;
                          if (typeof syn === 'object' && syn !== null) {
                            if (syn['v8:item']) {
                              const items = Array.isArray(syn['v8:item']) ? syn['v8:item'] : [syn['v8:item']];
                              return items.map((item: any) => {
                                if (typeof item === 'object' && item !== null) {
                                  return item['v8:content'] || '';
                                }
                                return String(item || '');
                              }).filter((s: string) => s).join(', ');
                            }
                            if (syn.content) return String(syn.content);
                            if (syn['v8:content']) return String(syn['v8:content']);
                          }
                          return '';
                        })()}
                      </div>
                    )}
                    {ts.properties?.Comment && (
                      <div className="tabular-comment">
                        {(() => {
                          const com = ts.properties.Comment;
                          if (!com) return '';
                          if (typeof com === 'string') return com;
                          if (typeof com === 'object' && com !== null) {
                            if (com['v8:item']) {
                              const items = Array.isArray(com['v8:item']) ? com['v8:item'] : [com['v8:item']];
                              return items.map((item: any) => {
                                if (typeof item === 'object' && item !== null) {
                                  return item['v8:content'] || '';
                                }
                                return String(item || '');
                              }).filter((s: string) => s).join(', ');
                            }
                            if (com.content) return String(com.content);
                            if (com['v8:content']) return String(com['v8:content']);
                          }
                          return '';
                        })()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="tabular-attributes-count">
                      Реквизитов: {ts.attributes?.length || 0}
                    </span>
                    <button
                      className="btn-edit-type"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteTabularSection(tsIndex);
                      }}
                      title="Удалить"
                      aria-label="Удалить"
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        background: 'var(--vscode-errorForeground)',
                        color: 'var(--vscode-button-foreground)',
                        border: '1px solid var(--vscode-button-border)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                {ts.attributes && Array.isArray(ts.attributes) && ts.attributes.length > 0 && (
                  <div className="tabular-attributes-list">
                    {ts.attributes.map((attr: any, attrIndex: number) => {
                      if (!attr) return null;
                      return (
                        <div key={attrIndex} className="tabular-attribute-item">
                          <div className="attribute-info">
                            <span className="attribute-name">{attr.name || `Реквизит ${attrIndex + 1}`}</span>
                            {attr.properties?.Synonym && (
                              <span className="attribute-synonym">
                                {(() => {
                                  const syn = attr.properties.Synonym;
                                  if (!syn) return '';
                                  if (typeof syn === 'string') return syn;
                                  if (typeof syn === 'object' && syn !== null) {
                                    if (syn['v8:item']) {
                                      const items = Array.isArray(syn['v8:item']) ? syn['v8:item'] : [syn['v8:item']];
                                      return items.map((item: any) => {
                                        if (typeof item === 'object' && item !== null) {
                                          return item['v8:content'] || '';
                                        }
                                        return String(item || '');
                                      }).filter((s: string) => s).join(', ');
                                    }
                                    // Если это объект без v8:item, пробуем найти content напрямую
                                    if (syn.content) return String(syn.content);
                                    if (syn['v8:content']) return String(syn['v8:content']);
                                  }
                                  return '';
                                })()}
                              </span>
                            )}
                            {attr.properties?.Comment && (
                              <span className="attribute-comment">
                                {(() => {
                                  const com = attr.properties.Comment;
                                  if (!com) return '';
                                  if (typeof com === 'string') return com;
                                  if (typeof com === 'object' && com !== null) {
                                    if (com['v8:item']) {
                                      const items = Array.isArray(com['v8:item']) ? com['v8:item'] : [com['v8:item']];
                                      return items.map((item: any) => {
                                        if (typeof item === 'object' && item !== null) {
                                          return item['v8:content'] || '';
                                        }
                                        return String(item || '');
                                      }).filter((s: string) => s).join(', ');
                                    }
                                    // Если это объект без v8:item, пробуем найти content напрямую
                                    if (com.content) return String(com.content);
                                    if (com['v8:content']) return String(com['v8:content']);
                                  }
                                  return '';
                                })()}
                              </span>
                            )}
                            <span className="attribute-type">
                              {formatTypeForDisplay(attr.type)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn-edit-type"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditAttributeType(tsIndex, attrIndex);
                              }}
                              title="Открыть редактор типов"
                              aria-label="Открыть редактор типов"
                            >
                              ✎
                            </button>
                            <button
                              className="btn-edit-type"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteTabularAttribute(tsIndex, attrIndex);
                              }}
                              title="Удалить"
                              aria-label="Удалить"
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                background: 'var(--vscode-errorForeground)',
                                color: 'var(--vscode-button-foreground)',
                                border: '1px solid var(--vscode-button-border)',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <button
                  className="btn-add-attribute"
                  onClick={() => setShowAddAttributeModal(tsIndex)}
                >
                  <span className="btn-icon">➕</span>
                  <span>Добавить реквизит</span>
                </button>
              </div>
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
          <button type="button" className="btn-add" onClick={handleAddEnumValue} title="Добавить значение">
            + Добавить
          </button>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="attribute-index">#{index + 1}</span>
                    <button
                      type="button"
                      className="btn-edit-type"
                      onClick={() => handleEditEnumValue(index)}
                      title="Изменить"
                      aria-label="Изменить"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="btn-edit-type"
                      onClick={() => handleDeleteEnumValue(index)}
                      title="Удалить"
                      aria-label="Удалить"
                      style={{
                        background: 'var(--vscode-errorForeground)',
                        color: 'var(--vscode-button-foreground)'
                      }}
                    >
                      ×
                    </button>
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
          {selectedObject.forms.map((form: any, index: number) => (
            <div key={index} className="form-card">
              <h4>{form.name || `Форма ${index + 1}`}</h4>
            </div>
          ))}
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
          {selectedObject.commands.map((cmd: any, index: number) => (
            <div key={index} className="command-card">
              <h4>{cmd.name || `Команда ${index + 1}`}</h4>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (activeTab === 'properties' && formData) {
    // Группируем свойства
    const basicFields = ['Name', 'Synonym', 'Comment'];
    const standardAttributes = formData.StandardAttributes;
    const registerRecords = formData.RegisterRecords;
    const isDocument =
      String(objectType || '').toLowerCase() === 'документ' ||
      String(objectType || '').toLowerCase() === 'document';
    
    // Все остальные поля
    const additionalFields = Object.keys(formData).filter(key => 
      !basicFields.includes(key) && 
      key !== 'StandardAttributes' && 
      key !== 'RegisterRecords' &&
      key !== 'attributes' &&
      key !== 'tabularSections' &&
      key !== 'forms' &&
      key !== 'commands'
    );

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
                    {(field === 'Synonym' || field === 'Comment') && typeof value === 'object' && value?.['v8:item'] ? (
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
            <button
              className="btn-primary btn-add-tabular"
              onClick={() => {
                setNewRegisterRecord('');
                setEditingRegisterRecordIndex(null);
                setShowRegisterRecordsEditor(true);
              }}
            >
              <span className="btn-icon">➕</span>
              <span>Добавить регистр</span>
            </button>
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
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-edit-type"
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
                            title="Редактировать"
                            aria-label="Редактировать"
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '12px',
                              background: 'var(--vscode-button-secondaryBackground)',
                              color: 'var(--vscode-button-secondaryForeground)',
                              border: '1px solid var(--vscode-button-border)',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                          >
                            ✎
                          </button>
                          <button
                            className="btn-edit-type"
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
                            title="Удалить"
                            aria-label="Удалить"
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '12px',
                              background: 'var(--vscode-errorForeground)',
                              color: 'var(--vscode-button-foreground)',
                              border: '1px solid var(--vscode-button-border)',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                          >
                            ×
                          </button>
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
                    <button
                      className="btn-edit-type"
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
                      title="Редактировать"
                      aria-label="Редактировать"
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '12px',
                        background: 'var(--vscode-button-secondaryBackground)',
                        color: 'var(--vscode-button-secondaryForeground)',
                        border: '1px solid var(--vscode-button-border)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ✎
                    </button>
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

                // Редактор типов для определяемых типов (DefinedType)
                if (field === 'Type' && objectType === 'DefinedType') {
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
                              definedTypeMode: true
                            }
                          } as any)}
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
                      {typeof value === 'object' && value !== null ? (
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
            <button 
              className="btn-primary btn-add-characteristic-type"
              type="button"
              onClick={() => {
                setEditingCharacteristicTypeIndex(null);
                setShowCharacteristicTypeModal(true);
              }}
              style={{
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
              }}
            >
              <span>➕</span>
              <span>Добавить тип значения</span>
            </button>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn-edit-type"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingCharacteristicTypeIndex(index);
                          setShowCharacteristicTypeModal(true);
                        }}
                        title="Открыть редактор типов"
                        aria-label="Открыть редактор типов"
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: '16px',
                          background: 'var(--vscode-button-secondaryBackground)',
                          color: 'var(--vscode-button-secondaryForeground)',
                          border: '1px solid var(--vscode-button-border)',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          lineHeight: '1'
                        }}
                      >
                        ✎
                      </button>
                      <button
                        className="btn-delete-type"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteCharacteristicType(index);
                        }}
                        title="Удалить"
                        aria-label="Удалить"
                        style={{
                          padding: '4px 8px',
                          fontSize: '16px',
                          background: 'var(--vscode-errorForeground)',
                          color: 'var(--vscode-button-foreground)',
                          border: '1px solid var(--vscode-button-border)',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          lineHeight: '1'
                        }}
                      >
                        ×
                      </button>
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
              <button 
                className="btn-primary"
                type="button"
                onClick={() => {
                  setEditingAccountingFlag(null);
                  setAddingAccountingFlagType('accountingFlag');
                  setShowAccountingFlagModal(true);
                }}
                style={{
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
                }}
              >
                <span>➕</span>
                <span>Добавить признак учета</span>
              </button>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccountingFlag({ type: 'accountingFlag', index });
                            setShowAccountingFlagModal(true);
                          }}
                          title="Редактировать"
                          aria-label="Редактировать"
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '16px',
                            background: 'var(--vscode-button-secondaryBackground)',
                            color: 'var(--vscode-button-secondaryForeground)',
                            border: '1px solid var(--vscode-button-border)',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            lineHeight: '1'
                          }}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccountingFlag('accountingFlag', index)}
                          title="Удалить"
                          aria-label="Удалить"
                          style={{
                            padding: '4px 8px',
                            fontSize: '16px',
                            background: 'var(--vscode-errorForeground)',
                            color: 'var(--vscode-button-foreground)',
                            border: '1px solid var(--vscode-button-border)',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            lineHeight: '1'
                          }}
                        >
                          ×
                        </button>
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
              <button 
                className="btn-primary"
                type="button"
                onClick={() => {
                  setEditingAccountingFlag(null);
                  setAddingAccountingFlagType('extDimensionAccountingFlag');
                  setShowAccountingFlagModal(true);
                }}
                style={{
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
                }}
              >
                <span>➕</span>
                <span>Добавить признак учета</span>
              </button>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccountingFlag({ type: 'extDimensionAccountingFlag', index });
                            setShowAccountingFlagModal(true);
                          }}
                          title="Редактировать"
                          aria-label="Редактировать"
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '16px',
                            background: 'var(--vscode-button-secondaryBackground)',
                            color: 'var(--vscode-button-secondaryForeground)',
                            border: '1px solid var(--vscode-button-border)',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            lineHeight: '1'
                          }}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccountingFlag('extDimensionAccountingFlag', index)}
                          title="Удалить"
                          aria-label="Удалить"
                          style={{
                            padding: '4px 8px',
                            fontSize: '16px',
                            background: 'var(--vscode-errorForeground)',
                            color: 'var(--vscode-button-foreground)',
                            border: '1px solid var(--vscode-button-border)',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            lineHeight: '1'
                          }}
                        >
                          ×
                        </button>
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
        metadata={metadata}
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
        metadata={metadata}
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
        metadata={metadata}
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
        metadata={metadata}
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
        metadata={metadata}
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
        metadata={metadata}
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
  // Boolean поля
  const booleanFields: Record<string, boolean> = {
    'UseStandardCommands': true,
    'IncludeHelpInContents': true,
    'PostInPrivilegedMode': true,
    'UnpostInPrivilegedMode': true,
    'CheckUnique': true,
    'Autonumbering': true,
    'UpdateDataHistoryImmediatelyAfterWrite': true,
    'ExecuteAfterWriteDataHistoryVersionProcessing': true,
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
    'TemplateType': ['BinaryData', 'SpreadsheetDocument', 'TextDocument', 'DataCompositionSchema']
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

  // Boolean поле
  if (fieldInfo.type === 'boolean') {
    const boolValue = value === true || value === 'true' || value === 'True';
    return (
      <select
        value={String(boolValue)}
        onChange={(e) => onChange(e.target.value === 'true')}
        className="property-select"
      >
        <option value="true">Да (true)</option>
        <option value="false">Нет (false)</option>
      </select>
    );
  }

  // Enum поле
  if (fieldInfo.type === 'enum' && fieldInfo.options) {
    const stringValue = value !== null && value !== undefined ? String(value) : '';
    return (
      <select
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        className="property-select"
      >
        <option value="">-- Выберите значение --</option>
        {fieldInfo.options.map((option) => (
          <option key={option} value={option}>
            {getEnumValueLabel(option)}
          </option>
        ))}
      </select>
    );
  }

  // Строковое поле (по умолчанию)
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      className="property-input"
      placeholder={`Введите ${label.toLowerCase()}...`}
    />
  );
};


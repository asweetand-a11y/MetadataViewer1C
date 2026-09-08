/**
 * Модальное окно редактирования типа для предопределенных элементов
 * Используется для редактирования типа в планах видов характеристик
 */

import React, { useMemo } from 'react';
import { Modal } from '../FormEditor/Modal';
import { UiButton } from '../../ui';
import { TypeWidget } from '../../widgets/TypeWidget';

interface PredefinedTypeEditorModalProps {
  isOpen: boolean;
  typeValue: string | null; // Строка типа без namespace prefix (например, "CatalogRef.Номенклатура")
  metadata: {
    registers: string[];
    referenceTypes: string[];
  };
  onClose: () => void;
  onSave: (typeValue: string) => void; // Возвращает тип без namespace prefix
}

export const PredefinedTypeEditorModal: React.FC<PredefinedTypeEditorModalProps> = ({
  isOpen,
  typeValue,
  metadata,
  onClose,
  onSave
}) => {
  // Преобразуем строку типа в объект для TypeWidget
  // TypeWidget ожидает тип с префиксом cfg: для ссылочных типов
  // Поддерживает составные типы через разделитель "|"
  const initialTypeValue = useMemo(() => {
    if (typeValue) {
      // Проверяем, является ли это составным типом (разделитель "|")
      if (typeValue.includes('|')) {
        // Составной тип - преобразуем в массив
        const typeParts = typeValue.split('|').map(t => t.trim()).filter(t => t);
        const typesWithPrefix = typeParts.map(part => {
          let typeWithPrefix = part;
          if (!part.match(/^(xs|v8|cfg):/)) {
            // Проверяем, является ли это ссылочным типом
            const isReferenceType = part.includes('.') && 
              (part.startsWith('Catalog') || 
               part.startsWith('Document') || 
               part.startsWith('Enum') ||
               part.startsWith('ChartOfCharacteristicTypes') ||
               part.startsWith('ChartOfAccounts') ||
               part.startsWith('InformationRegister') ||
               part.startsWith('AccumulationRegister') ||
               part.startsWith('AccountingRegister') ||
               part.startsWith('CalculationRegister'));
            
            if (isReferenceType) {
              typeWithPrefix = `cfg:${part}`;
            }
          }
          return { Type: typeWithPrefix };
        });
        
        // Возвращаем объект с массивом Type для составного типа
        return { Type: typesWithPrefix };
      } else {
        // Одиночный тип
        let typeWithPrefix = typeValue;
        if (!typeValue.match(/^(xs|v8|cfg):/)) {
          // Проверяем, является ли это ссылочным типом
          const isReferenceType = typeValue.includes('.') && 
            (typeValue.startsWith('Catalog') || 
             typeValue.startsWith('Document') || 
             typeValue.startsWith('Enum') ||
             typeValue.startsWith('ChartOfCharacteristicTypes') ||
             typeValue.startsWith('ChartOfAccounts') ||
             typeValue.startsWith('InformationRegister') ||
             typeValue.startsWith('AccumulationRegister') ||
             typeValue.startsWith('AccountingRegister') ||
             typeValue.startsWith('CalculationRegister'));
          
          if (isReferenceType) {
            typeWithPrefix = `cfg:${typeValue}`;
          }
        }
        
        // Преобразуем строку в объект для TypeWidget
        // TypeWidget ожидает объект вида { 'v8:Type': '...' }
        return {
          'v8:Type': typeWithPrefix
        };
      }
    }
    return null;
  }, [typeValue, isOpen]);

  // Обработчик изменения типа от TypeWidget
  // TypeWidget вызывает onChange при нажатии кнопки "Сохранить" внутри себя
  const handleTypeChange = (type: any) => {
    console.log('[PredefinedTypeEditorModal] handleTypeChange called with:', type);
    
    if (!type) {
      console.warn('[PredefinedTypeEditorModal] No type received');
      onClose();
      return;
    }

    // TypeWidget возвращает:
    // - { 'v8:Type': 'cfg:CatalogRef.Номенклатура' } для одного типа
    // - { 'v8:TypeSet': '...' } для определяемых типов
    // - { Type: [{ Type: '...' }, ...] } для составных типов (несколько типов)
    let typeString: string | null = null;

    // Проверяем составной тип (массив типов)
    if (type.Type && Array.isArray(type.Type)) {
      // Составной тип - преобразуем массив в строку с разделителем "|"
      const typeStrings = type.Type.map((t: any) => {
        if (t.Type) {
          const typeVal = typeof t.Type === 'string' ? t.Type : (t.Type['#text'] || String(t.Type));
          // Убираем префиксы xs:, v8:, cfg: для внутреннего представления
          return typeVal.replace(/^(xs|v8|cfg):/, '');
        } else if (t.TypeSet) {
          const typeSetVal = typeof t.TypeSet === 'string' ? t.TypeSet : (t.TypeSet['#text'] || String(t.TypeSet));
          return typeSetVal.replace(/^(xs|v8|cfg):/, '');
        }
        return null;
      }).filter((t: string | null) => t !== null);
      
      typeString = typeStrings.join('|');
      console.log('[PredefinedTypeEditorModal] Составной тип:', typeString);
    } else if (type['v8:Type']) {
      typeString = typeof type['v8:Type'] === 'string' 
        ? type['v8:Type']
        : (type['v8:Type']['#text'] || String(type['v8:Type']));
    } else if (type['v8:TypeSet']) {
      typeString = typeof type['v8:TypeSet'] === 'string'
        ? type['v8:TypeSet']
        : (type['v8:TypeSet']['#text'] || String(type['v8:TypeSet']));
    } else if (type.kind) {
      // Fallback для ParsedTypeRef
      typeString = type.kind;
    }

    console.log('[PredefinedTypeEditorModal] Extracted typeString:', typeString);

    if (typeString) {
      // Убираем префикс cfg: для возврата (namespace prefix будет добавлен при сохранении в XML)
      // Для составных типов уже обработано выше
      const cleanType = typeString.replace(/^cfg:/, '');
      onSave(cleanType);
    } else {
      console.warn('[PredefinedTypeEditorModal] Could not extract type string from:', type);
    }
    onClose();
  };

  const footer = (
    <UiButton secondary onClick={onClose}>Закрыть</UiButton>
  );

  return (
    <Modal
      isOpen={isOpen}
      title={typeValue ? "Редактировать тип" : "Выбрать тип"}
      onClose={onClose}
      footer={footer}
    >
      <div className="form-field">
        <label>Тип</label>
        <TypeWidget
          {...({
            id: 'predefined-type-editor',
            value: initialTypeValue,
            onChange: handleTypeChange,
            schema: {},
            label: 'Type',
            required: false,
            readonly: false,
            rawErrors: [],
            errorSchema: {},
            registry: {},
            formContext: {},
            options: {
              registers: metadata.registers,
              referenceTypes: metadata.referenceTypes
            }
          } as any)}
        />
      </div>
    </Modal>
  );
};

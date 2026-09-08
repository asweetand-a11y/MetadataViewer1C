/**
 * Модальное окно редактирования типа значения характеристик
 * Используется для добавления/редактирования типов значения характеристик в планах видов характеристик
 */

import React, { useMemo } from 'react';
import { Modal } from './Modal';
import { UiButton } from '../../ui';
import { TypeWidget } from '../../widgets/TypeWidget';

interface CharacteristicTypeEditorModalProps {
  isOpen: boolean;
  typeValue: string | null; // Строка типа "cfg:CatalogRef.Номенклатура"
  metadata: {
    registers: string[];
    referenceTypes: string[];
  };
  onClose: () => void;
  onSave: (typeValue: string) => void;
}

export const CharacteristicTypeEditorModal: React.FC<CharacteristicTypeEditorModalProps> = ({
  isOpen,
  typeValue,
  metadata,
  onClose,
  onSave
}) => {
  // Преобразуем строку типа в объект для TypeWidget
  const initialTypeValue = useMemo(() => {
    if (typeValue) {
      // Преобразуем строку "cfg:CatalogRef.Номенклатура" в объект для TypeWidget
      // TypeWidget ожидает объект вида { 'v8:Type': '...' }
      return {
        'v8:Type': typeValue
      };
    }
    return null;
  }, [typeValue, isOpen]);

  // Обработчик изменения типа от TypeWidget
  // TypeWidget вызывает onChange при нажатии кнопки "Сохранить" внутри себя
  const handleTypeChange = (type: any) => {
    console.log('[CharacteristicTypeEditorModal] handleTypeChange called with:', type);
    
    if (!type) {
      console.warn('[CharacteristicTypeEditorModal] No type received');
      onClose();
      return;
    }

    // TypeWidget возвращает объект вида { 'v8:Type': 'cfg:CatalogRef.Номенклатура' }
    // или { 'v8:TypeSet': '...' } для определяемых типов
    let typeString: string | null = null;

    if (type['v8:Type']) {
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

    console.log('[CharacteristicTypeEditorModal] Extracted typeString:', typeString);

    if (typeString) {
      onSave(typeString);
    } else {
      console.warn('[CharacteristicTypeEditorModal] Could not extract type string from:', type);
    }
    onClose();
  };

  const footer = (
    <UiButton secondary onClick={onClose}>Закрыть</UiButton>
  );

  return (
    <Modal
      isOpen={isOpen}
      title={typeValue ? "Редактировать тип значения характеристик" : "Добавить тип значения характеристик"}
      onClose={onClose}
      footer={footer}
    >
      <div className="form-field">
        <label>Тип значения</label>
        <TypeWidget
          {...({
            id: 'characteristic-type-editor',
            value: initialTypeValue,
            onChange: handleTypeChange,
            schema: {},
            label: 'Type',
            required: true,
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

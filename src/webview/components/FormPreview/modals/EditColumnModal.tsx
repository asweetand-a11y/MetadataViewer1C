/**
 * Модальное окно редактирования колонки табличной части
 */

import React from 'react';
import { Modal } from '../../FormEditor/Modal';
import { UiButton } from '../../../ui';
import { TypeWidget } from '../../../widgets/TypeWidget';
import { formatTypeForDisplay } from '../../../utils/typeUtils';

import type { AttributeColumnDraft } from '../FormPreviewApp';

interface EditColumnModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  name: string;
  title: string;
  type: any;
  metadata: {
    registers: string[];
    referenceTypes: string[];
  };
  onClose: () => void;
  onSave: (data: { name: string; title: string; type: any }) => void;
  onNameChange: (name: string) => void;
  onTitleChange: (title: string) => void;
  onTypeChange: (type: any) => void;
}

export const EditColumnModal: React.FC<EditColumnModalProps> = ({
  isOpen,
  mode,
  name,
  title,
  type,
  metadata,
  onClose,
  onSave,
  onNameChange,
  onTitleChange,
  onTypeChange
}) => {
  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (!type) return;
    onSave({
      name: trimmedName,
      title: title.trim() || '',
      type
    });
  };

  const footer = (
    <>
      <UiButton secondary onClick={onClose}>Отмена</UiButton>
      <UiButton onClick={handleSave}>
        {mode === 'add' ? 'Создать' : 'Сохранить'}
      </UiButton>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      title={mode === 'add' ? 'Новая колонка' : 'Редактировать колонку'}
      onClose={onClose}
      footer={footer}
    >
      <div className="form-field">
        <label>Имя *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Введите имя колонки..."
          className="property-input"
        />
      </div>
      <div className="form-field">
        <label>Заголовок</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Текст, отображаемый в шапке"
          className="property-input"
        />
      </div>
      <div className="form-field">
        <label>Тип *</label>
        <TypeWidget
          {...({
            id: 'form-preview-column-type',
            value: type,
            onChange: onTypeChange,
            schema: {},
            label: 'ColumnType',
            required: true,
            readonly: false,
            rawErrors: [],
            errorSchema: {},
            registry: {},
            formContext: {},
            options: {
              registers: metadata.registers,
              referenceTypes: metadata.referenceTypes,
            },
          } as any)}
        />
      </div>
    </Modal>
  );
};


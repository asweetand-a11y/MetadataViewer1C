/**
 * Модальное окно добавления реквизита/ресурса/измерения в объект
 */

import React from 'react';
import { Modal } from './Modal';
import { UiButton } from '../../ui';
import { TypeWidget } from '../../widgets/TypeWidget';
import { SimpleMultilingualEditor } from './SimpleMultilingualEditor';

interface AddAttributeToObjectModalProps {
  isOpen: boolean;
  kind: 'Attribute' | 'Resource' | 'Dimension';
  name: string;
  synonym: any;
  comment: any;
  type: any;
  metadata: {
    registers: string[];
    referenceTypes: string[];
  };
  onClose: () => void;
  onSave: () => void;
  onNameChange: (name: string) => void;
  onSynonymChange: (synonym: any) => void;
  onCommentChange: (comment: any) => void;
  onTypeChange: (type: any) => void;
}

export const AddAttributeToObjectModal: React.FC<AddAttributeToObjectModalProps> = ({
  isOpen,
  kind,
  name,
  synonym,
  comment,
  type,
  metadata,
  onClose,
  onSave,
  onNameChange,
  onSynonymChange,
  onCommentChange,
  onTypeChange
}) => {
  const getTitle = () => {
    if (kind === 'Resource') return 'Новый ресурс';
    if (kind === 'Dimension') return 'Новое измерение';
    return 'Новый реквизит';
  };

  const getNameLabel = () => {
    if (kind === 'Resource') return 'Имя ресурса *';
    if (kind === 'Dimension') return 'Имя измерения *';
    return 'Имя *';
  };

  const footer = (
    <>
      <UiButton secondary onClick={onClose}>Отмена</UiButton>
      <UiButton onClick={onSave}>Создать</UiButton>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      title={getTitle()}
      onClose={onClose}
      footer={footer}
    >
      <div className="form-field">
        <label>{getNameLabel()}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Введите имя..."
          className="property-input"
        />
      </div>
      <div className="form-field">
        <label>Синоним</label>
        <SimpleMultilingualEditor
          value={synonym}
          onChange={onSynonymChange}
        />
      </div>
      <div className="form-field">
        <label>Комментарий</label>
        <SimpleMultilingualEditor
          value={comment}
          onChange={onCommentChange}
        />
      </div>
      <div className="form-field">
        <label>Тип *</label>
        <TypeWidget
          {...({
            id: 'new-attr-to-object-type',
            value: type,
            onChange: onTypeChange,
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


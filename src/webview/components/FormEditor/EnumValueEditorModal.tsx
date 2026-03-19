/**
 * Модальное окно добавления/редактирования значения перечисления
 * Стиль соответствует AddAttributeToObjectModal (реквизиты)
 */

import React from 'react';
import { Modal } from './Modal';
import { SimpleMultilingualEditor } from './SimpleMultilingualEditor';

interface EnumValueEditorModalProps {
  isOpen: boolean;
  isEdit: boolean;
  name: string;
  synonym: any;
  comment: any;
  onClose: () => void;
  onSave: () => void;
  onNameChange: (name: string) => void;
  onSynonymChange: (synonym: any) => void;
  onCommentChange: (comment: any) => void;
}

export const EnumValueEditorModal: React.FC<EnumValueEditorModalProps> = ({
  isOpen,
  isEdit,
  name,
  synonym,
  comment,
  onClose,
  onSave,
  onNameChange,
  onSynonymChange,
  onCommentChange
}) => {
  const footer = (
    <>
      <button className="btn-secondary" onClick={onClose}>Отмена</button>
      <button className="btn-primary" onClick={onSave} disabled={!name.trim()}>Сохранить</button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      title={isEdit ? 'Изменить значение' : 'Добавить значение'}
      onClose={onClose}
      footer={footer}
    >
      <div className="form-field">
        <label>Имя *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Имя значения"
          className="property-input"
        />
      </div>
      <div className="form-field">
        <label>Синоним</label>
        <SimpleMultilingualEditor
          value={synonym || { 'v8:item': { 'v8:lang': 'ru', 'v8:content': name } }}
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
    </Modal>
  );
};

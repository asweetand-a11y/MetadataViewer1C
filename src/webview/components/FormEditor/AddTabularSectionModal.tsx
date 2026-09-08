/**
 * Модальное окно добавления табличной части
 */

import React from 'react';
import { Modal } from './Modal';
import { UiButton } from '../../ui';
import { SimpleMultilingualEditor } from './SimpleMultilingualEditor';

interface AddTabularSectionModalProps {
  isOpen: boolean;
  name: string;
  synonym: any;
  comment: any;
  onClose: () => void;
  onSave: () => void;
  onNameChange: (name: string) => void;
  onSynonymChange: (synonym: any) => void;
  onCommentChange: (comment: any) => void;
}

export const AddTabularSectionModal: React.FC<AddTabularSectionModalProps> = ({
  isOpen,
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
      <UiButton secondary onClick={onClose}>Отмена</UiButton>
      <UiButton onClick={onSave}>Создать</UiButton>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      title="Новая табличная часть"
      onClose={onClose}
      footer={footer}
    >
      <div className="form-field">
        <label>Имя *</label>
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
    </Modal>
  );
};


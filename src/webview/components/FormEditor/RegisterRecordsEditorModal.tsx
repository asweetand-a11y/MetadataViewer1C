/**
 * Модальное окно редактора RegisterRecords
 */

import React from 'react';
import { Modal } from './Modal';
import { UiButton } from '../../ui';

interface RegisterRecordsEditorModalProps {
  isOpen: boolean;
  registerRecord: string;
  isEditing: boolean;
  registers: string[];
  onClose: () => void;
  onSave: (register: string) => void;
  onRegisterChange: (register: string) => void;
}

export const RegisterRecordsEditorModal: React.FC<RegisterRecordsEditorModalProps> = ({
  isOpen,
  registerRecord,
  isEditing,
  registers,
  onClose,
  onSave,
  onRegisterChange
}) => {
  const handleSave = () => {
    if (!registerRecord.trim()) {
      alert('Выберите регистр');
      return;
    }
    onSave(registerRecord);
  };

  const footer = (
    <>
      <UiButton secondary onClick={onClose}>Отмена</UiButton>
      <UiButton onClick={handleSave}>
        {isEditing ? 'Сохранить' : 'Добавить'}
      </UiButton>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      title={isEditing ? 'Редактировать регистр' : 'Добавить регистр'}
      onClose={onClose}
      footer={footer}
    >
      <div className="form-field">
        <label>Регистр *</label>
        <select
          value={registerRecord}
          onChange={(e) => onRegisterChange(e.target.value)}
          className="property-select"
          style={{ width: '100%', padding: '8px 12px' }}
        >
          <option value="">Выберите регистр...</option>
          {registers.map((register: string) => (
            <option key={register} value={register}>
              {register}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
};


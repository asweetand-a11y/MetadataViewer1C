/**
 * Модальное окно редактирования признака учета
 * Используется для добавления/редактирования признаков учета в планах счетов
 * Тип признака учета всегда xs:boolean
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { UiButton } from '../../ui';
import { SimpleMultilingualEditor } from './SimpleMultilingualEditor';

interface AccountingFlagEditorModalProps {
  isOpen: boolean;
  flag: any | null; // Признак учета для редактирования (null при добавлении)
  flagType?: 'accountingFlag' | 'extDimensionAccountingFlag'; // Тип признака учета (для добавления)
  onClose: () => void;
  onSave: (flag: { name: string; synonym?: any; comment?: any; uuid?: string }, flagType?: 'accountingFlag' | 'extDimensionAccountingFlag') => void;
}

export const AccountingFlagEditorModal: React.FC<AccountingFlagEditorModalProps> = ({
  isOpen,
  flag,
  flagType,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [synonym, setSynonym] = useState<any>(null);
  const [comment, setComment] = useState<any>(null);

  // Инициализация значений при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      if (flag) {
        // Редактирование существующего признака
        setName(flag.name || flag.properties?.Name || '');
        setSynonym(flag.properties?.Synonym || null);
        setComment(flag.properties?.Comment || null);
      } else {
        // Добавление нового признака
        setName('');
        setSynonym(null);
        setComment(null);
      }
    }
  }, [isOpen, flag]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Имя признака учета не может быть пустым');
      return;
    }

    onSave({
      name: name.trim(),
      synonym: synonym || null,
      comment: comment || null,
      uuid: flag?.uuid || flag?.properties?.uuid || undefined
    }, flagType);
  };

  const footer = (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
      <UiButton secondary onClick={onClose}>Отмена</UiButton>
      <UiButton onClick={handleSave}>Сохранить</UiButton>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      title={flag ? "Редактировать признак учета" : "Добавить признак учета"}
      onClose={onClose}
      footer={footer}
    >
      <div className="form-field" style={{ marginBottom: '16px' }}>
        <label>Имя *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Введите имя признака учета"
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '14px',
            border: '1px solid var(--vscode-input-border)',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)'
          }}
        />
      </div>

      <div className="form-field" style={{ marginBottom: '16px' }}>
        <label>Синоним</label>
        <SimpleMultilingualEditor
          value={synonym}
          onChange={setSynonym}
        />
      </div>

      <div className="form-field" style={{ marginBottom: '16px' }}>
        <label>Комментарий</label>
        <SimpleMultilingualEditor
          value={comment}
          onChange={setComment}
        />
      </div>

      <div className="form-field" style={{ marginBottom: '16px' }}>
        <label>Тип</label>
        <input
          type="text"
          value="xs:boolean"
          disabled
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '14px',
            border: '1px solid var(--vscode-input-border)',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            opacity: 0.6,
            cursor: 'not-allowed'
          }}
        />
        <small style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px' }}>
          Тип признака учета всегда xs:boolean и не может быть изменен
        </small>
      </div>
    </Modal>
  );
};

/**
 * Модальное окно редактирования команды формы
 */

import React from 'react';
import { Modal } from '../../FormEditor/Modal';
import { UiButton } from '../../../ui';

interface EditCommandModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  name: string;
  title: string;
  toolTip: string;
  modifiesSavedData: boolean;
  onClose: () => void;
  onSave: (data: { name: string; title: string; toolTip: string; modifiesSavedData: boolean }) => void;
  onNameChange: (name: string) => void;
  onTitleChange: (title: string) => void;
  onToolTipChange: (toolTip: string) => void;
  onModifiesSavedDataChange: (modifiesSavedData: boolean) => void;
}

export const EditCommandModal: React.FC<EditCommandModalProps> = ({
  isOpen,
  mode,
  name,
  title,
  toolTip,
  modifiesSavedData,
  onClose,
  onSave,
  onNameChange,
  onTitleChange,
  onToolTipChange,
  onModifiesSavedDataChange
}) => {
  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSave({
      name: trimmedName,
      title: title.trim(),
      toolTip: toolTip.trim(),
      modifiesSavedData
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

  const derivedCommandName = name.trim() ? `Form.Command.${name.trim()}` : '';

  return (
    <Modal
      isOpen={isOpen}
      title={mode === 'add' ? 'Новая команда' : 'Редактировать команду'}
      onClose={onClose}
      footer={footer}
    >
      <div className="form-field">
        <label>Имя (атрибут name) *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Введите имя..."
          className="property-input"
        />
      </div>

      <div className="form-field">
        <label>CommandName</label>
        <div className="edt-grid__cell--mono" style={{ padding: '6px 8px', border: '1px solid var(--vscode-panel-border)', borderRadius: 3 }}>
          {derivedCommandName}
        </div>
      </div>

      <div className="form-field">
        <label>Представление (Title)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Например: Подбор"
          className="property-input"
        />
      </div>

      <div className="form-field">
        <label>Подсказка (ToolTip)</label>
        <input
          type="text"
          value={toolTip}
          onChange={(e) => onToolTipChange(e.target.value)}
          placeholder="Например: Подбор сотрудников"
          className="property-input"
        />
      </div>

      <div className="form-field">
        <label>
          <input
            type="checkbox"
            checked={modifiesSavedData}
            onChange={(e) => onModifiesSavedDataChange(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          ModifiesSavedData
        </label>
      </div>
    </Modal>
  );
};


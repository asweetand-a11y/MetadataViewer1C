/**
 * Модальное окно подтверждения действий
 */

import React from 'react';
import { Modal } from './Modal';
import { UiButton } from '../../ui';

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Удалить',
  cancelLabel = 'Отмена'
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const footer = (
    <>
      <UiButton secondary onClick={onCancel}>
        {cancelLabel}
      </UiButton>
      <UiButton onClick={handleConfirm}>
        {confirmLabel}
      </UiButton>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      title="Подтверждение"
      onClose={onCancel}
      footer={footer}
    >
      <div className="form-field">
        <div style={{ whiteSpace: 'pre-wrap' }}>{message}</div>
      </div>
    </Modal>
  );
};


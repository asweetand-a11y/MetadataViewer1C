/**
 * Модальное окно подтверждения удаления с поддержкой дополнительной информации
 */

import React from 'react';
import { Modal } from '../../FormEditor/Modal';
import { UiButton } from '../../../ui';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  message: string;
  warningInfo?: string | React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  width?: string | number;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  message,
  warningInfo,
  onConfirm,
  onCancel,
  confirmLabel = 'Удалить',
  cancelLabel = 'Отмена',
  width
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

  const contentStyle = width ? { width: typeof width === 'number' ? `${width}px` : width } : undefined;

  return (
    <Modal
      isOpen={isOpen}
      title="Подтверждение"
      onClose={onCancel}
      footer={footer}
    >
      <div className="form-field" style={contentStyle}>
        <div style={{ whiteSpace: 'pre-wrap' }}>
          {message}
          {warningInfo && (
            <>
              {'\n\n'}
              {typeof warningInfo === 'string' ? warningInfo : warningInfo}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};


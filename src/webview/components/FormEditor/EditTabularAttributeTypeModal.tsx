/**
 * Модальное окно редактирования типа реквизита табличной части
 */

import React from 'react';
import { Modal } from './Modal';
import { UiButton } from '../../ui';
import { TypeWidget } from '../../widgets/TypeWidget';

interface EditTabularAttributeTypeModalProps {
  isOpen: boolean;
  tsIndex: number;
  attrIndex: number;
  attributeType: any;
  metadata: {
    registers: string[];
    referenceTypes: string[];
  };
  onClose: () => void;
  onSave: (type: any) => void;
}

export const EditTabularAttributeTypeModal: React.FC<EditTabularAttributeTypeModalProps> = ({
  isOpen,
  tsIndex,
  attrIndex,
  attributeType,
  metadata,
  onClose,
  onSave
}) => {
  const footer = (
    <UiButton secondary onClick={onClose}>Закрыть</UiButton>
  );

  return (
    <Modal
      isOpen={isOpen}
      title="Редактировать тип реквизита"
      onClose={onClose}
      footer={footer}
    >
      <div className="form-field">
        <label>Тип</label>
        <TypeWidget
          {...({
            id: `edit-attr-type-${tsIndex}-${attrIndex}`,
            value: attributeType,
            onChange: onSave,
            schema: {},
            label: 'Type',
            required: false,
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


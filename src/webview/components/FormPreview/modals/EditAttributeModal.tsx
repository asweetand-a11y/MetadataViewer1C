/**
 * Модальное окно редактирования реквизита формы
 */

import React from 'react';
import { Modal } from '../../FormEditor/Modal';
import { UiButton } from '../../../ui';
import { TypeWidget } from '../../../widgets/TypeWidget';
import { formatTypeForDisplay } from '../../../utils/typeUtils';
import { EditColumnModal } from './EditColumnModal';
import type { AttributeColumnDraft } from '../FormPreviewApp';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface EditAttributeModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  name: string;
  useAlways: boolean;
  type: any;
  columns: AttributeColumnDraft[];
  isValueTable: boolean;
  metadata: {
    registers: string[];
    referenceTypes: string[];
  };
  onClose: () => void;
  onSave: (data: { name: string; useAlways: boolean; type: any; columns?: AttributeColumnDraft[] }) => void;
  onNameChange: (name: string) => void;
  onUseAlwaysChange: (useAlways: boolean) => void;
  onTypeChange: (type: any) => void;
  onColumnsChange: (columns: AttributeColumnDraft[]) => void;
  // Обработчики для работы с колонками
  columnModal: { mode: 'add' | 'edit'; index?: number } | null;
  columnDraftName: string;
  columnDraftTitle: string;
  columnDraftType: any;
  onColumnModalChange: (modal: { mode: 'add' | 'edit'; index?: number } | null) => void;
  onColumnDraftNameChange: (name: string) => void;
  onColumnDraftTitleChange: (title: string) => void;
  onColumnDraftTypeChange: (type: any) => void;
  onColumnSave: (data: { name: string; title: string; type: any }) => void;
  confirmDeleteColumnIndex: number | null;
  onConfirmDeleteColumnIndexChange: (index: number | null) => void;
  onDeleteColumn: (index: number) => void;
}

export const EditAttributeModal: React.FC<EditAttributeModalProps> = ({
  isOpen,
  mode,
  name,
  useAlways,
  type,
  columns,
  isValueTable,
  metadata,
  onClose,
  onSave,
  onNameChange,
  onUseAlwaysChange,
  onTypeChange,
  onColumnsChange,
  columnModal,
  columnDraftName,
  columnDraftTitle,
  columnDraftType,
  onColumnModalChange,
  onColumnDraftNameChange,
  onColumnDraftTitleChange,
  onColumnDraftTypeChange,
  onColumnSave,
  confirmDeleteColumnIndex,
  onConfirmDeleteColumnIndexChange,
  onDeleteColumn
}) => {
  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (!type) return;
    onSave({
      name: trimmedName,
      useAlways,
      type,
      columns: isValueTable ? columns : undefined
    });
  };

  const handleAddColumn = () => {
    onColumnDraftNameChange('');
    onColumnDraftTitleChange('');
    onColumnDraftTypeChange(null);
    onColumnModalChange({ mode: 'add' });
  };

  const handleEditColumn = (index: number) => {
    const target = columns[index];
    if (!target) return;
    onColumnDraftNameChange(target.name || '');
    onColumnDraftTitleChange(target.title || '');
    onColumnDraftTypeChange(target.type ?? null);
    onColumnModalChange({ mode: 'edit', index });
  };

  const handleColumnSave = (data: { name: string; title: string; type: any }) => {
    onColumnSave(data);
    onColumnModalChange(null);
    onColumnDraftNameChange('');
    onColumnDraftTitleChange('');
    onColumnDraftTypeChange(null);
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
    <>
      <Modal
        isOpen={isOpen}
        title={mode === 'add' ? 'Новый реквизит' : 'Редактировать реквизит'}
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
          <label>Тип *</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <TypeWidget
                {...({
                  id: 'form-preview-attr-type',
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
                    referenceTypes: metadata.referenceTypes,
                  },
                } as any)}
              />
            </div>
            <div className="edt-grid__cell--mono" title={formatTypeForDisplay(type)} style={{ whiteSpace: 'nowrap' }}>
              {formatTypeForDisplay(type)}
            </div>
          </div>
        </div>

        {isValueTable ? (
          <div className="form-field">
            <div className="attr-columns__header">
              <label>Колонки табличной части</label>
              <div className="attr-columns__actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddColumn}
                >
                  Добавить колонку
                </button>
              </div>
            </div>
            <div className="edt-grid attr-columns-grid">
              <table className="edt-grid__table">
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Заголовок</th>
                    <th>Тип</th>
                    <th style={{ width: 80 }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="form-preview__empty">Нет колонок</td>
                    </tr>
                  ) : (
                    columns.map((col, idx) => (
                      <tr key={`attr-col-${idx}`}>
                        <td>{col.name}</td>
                        <td>{col.title || ''}</td>
                        <td className="edt-grid__cell--mono">{formatTypeForDisplay(col.type)}</td>
                        <td className="attr-columns__actionsCell">
                          <button
                            type="button"
                            className="edt-icon-btn"
                            title="Редактировать"
                            aria-label="Редактировать"
                            onClick={() => handleEditColumn(idx)}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="edt-icon-btn"
                            title="Удалить"
                            aria-label="Удалить"
                            onClick={() => onConfirmDeleteColumnIndexChange(idx)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Вложенное модальное окно редактирования колонки */}
      <EditColumnModal
        isOpen={!!columnModal}
        mode={columnModal?.mode || 'add'}
        name={columnDraftName}
        title={columnDraftTitle}
        type={columnDraftType}
        metadata={metadata}
        onClose={() => onColumnModalChange(null)}
        onSave={handleColumnSave}
        onNameChange={onColumnDraftNameChange}
        onTitleChange={onColumnDraftTitleChange}
        onTypeChange={onColumnDraftTypeChange}
      />

      {/* Вложенное модальное окно подтверждения удаления колонки */}
      <ConfirmDeleteModal
        isOpen={confirmDeleteColumnIndex !== null}
        message={confirmDeleteColumnIndex !== null ? `Удалить колонку "${columns[confirmDeleteColumnIndex]?.name || `Колонка ${confirmDeleteColumnIndex + 1}`}"?` : ''}
        onConfirm={() => {
          if (confirmDeleteColumnIndex !== null) {
            onDeleteColumn(confirmDeleteColumnIndex);
            onConfirmDeleteColumnIndexChange(null);
          }
        }}
        onCancel={() => onConfirmDeleteColumnIndexChange(null)}
        width={420}
      />
    </>
  );
};


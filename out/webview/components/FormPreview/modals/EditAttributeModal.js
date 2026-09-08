"use strict";
/**
 * Модальное окно редактирования реквизита формы
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditAttributeModal = void 0;
const react_1 = __importDefault(require("react"));
const Modal_1 = require("../../FormEditor/Modal");
const ui_1 = require("../../../ui");
const TypeWidget_1 = require("../../../widgets/TypeWidget");
const typeUtils_1 = require("../../../utils/typeUtils");
const EditColumnModal_1 = require("./EditColumnModal");
const ConfirmDeleteModal_1 = require("./ConfirmDeleteModal");
const EditAttributeModal = ({ isOpen, mode, name, useAlways, type, columns, isValueTable, metadata, onClose, onSave, onNameChange, onUseAlwaysChange, onTypeChange, onColumnsChange, columnModal, columnDraftName, columnDraftTitle, columnDraftType, onColumnModalChange, onColumnDraftNameChange, onColumnDraftTitleChange, onColumnDraftTypeChange, onColumnSave, confirmDeleteColumnIndex, onConfirmDeleteColumnIndexChange, onDeleteColumn }) => {
    const handleSave = () => {
        const trimmedName = name.trim();
        if (!trimmedName)
            return;
        if (!type)
            return;
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
    const handleEditColumn = (index) => {
        const target = columns[index];
        if (!target)
            return;
        onColumnDraftNameChange(target.name || '');
        onColumnDraftTitleChange(target.title || '');
        onColumnDraftTypeChange(target.type ?? null);
        onColumnModalChange({ mode: 'edit', index });
    };
    const handleColumnSave = (data) => {
        onColumnSave(data);
        onColumnModalChange(null);
        onColumnDraftNameChange('');
        onColumnDraftTitleChange('');
        onColumnDraftTypeChange(null);
    };
    const footer = (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(ui_1.UiButton, { secondary: true, onClick: onClose }, "\u041E\u0442\u043C\u0435\u043D\u0430"),
        react_1.default.createElement(ui_1.UiButton, { onClick: handleSave }, mode === 'add' ? 'Создать' : 'Сохранить')));
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(Modal_1.Modal, { isOpen: isOpen, title: mode === 'add' ? 'Новый реквизит' : 'Редактировать реквизит', onClose: onClose, footer: footer },
            react_1.default.createElement("div", { className: "form-field" },
                react_1.default.createElement("label", null, "\u0418\u043C\u044F *"),
                react_1.default.createElement("input", { type: "text", value: name, onChange: (e) => onNameChange(e.target.value), placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F...", className: "property-input" })),
            react_1.default.createElement("div", { className: "form-field" },
                react_1.default.createElement("label", null, "\u0422\u0438\u043F *"),
                react_1.default.createElement("div", { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                    react_1.default.createElement("div", { style: { flex: 1, minWidth: 0 } },
                        react_1.default.createElement(TypeWidget_1.TypeWidget, { ...{
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
                            } })),
                    react_1.default.createElement("div", { className: "edt-grid__cell--mono", title: (0, typeUtils_1.formatTypeForDisplay)(type), style: { whiteSpace: 'nowrap' } }, (0, typeUtils_1.formatTypeForDisplay)(type)))),
            isValueTable ? (react_1.default.createElement("div", { className: "form-field" },
                react_1.default.createElement("div", { className: "attr-columns__header" },
                    react_1.default.createElement("label", null, "\u041A\u043E\u043B\u043E\u043D\u043A\u0438 \u0442\u0430\u0431\u043B\u0438\u0447\u043D\u043E\u0439 \u0447\u0430\u0441\u0442\u0438"),
                    react_1.default.createElement("div", { className: "attr-columns__actions" },
                        react_1.default.createElement("button", { type: "button", className: "btn-secondary", onClick: handleAddColumn }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u043B\u043E\u043D\u043A\u0443"))),
                react_1.default.createElement("div", { className: "edt-grid attr-columns-grid" },
                    react_1.default.createElement("table", { className: "edt-grid__table" },
                        react_1.default.createElement("thead", null,
                            react_1.default.createElement("tr", null,
                                react_1.default.createElement("th", null, "\u0418\u043C\u044F"),
                                react_1.default.createElement("th", null, "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A"),
                                react_1.default.createElement("th", null, "\u0422\u0438\u043F"),
                                react_1.default.createElement("th", { style: { width: 80 } }, "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F"))),
                        react_1.default.createElement("tbody", null, columns.length === 0 ? (react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { colSpan: 4, className: "form-preview__empty" }, "\u041D\u0435\u0442 \u043A\u043E\u043B\u043E\u043D\u043E\u043A"))) : (columns.map((col, idx) => (react_1.default.createElement("tr", { key: `attr-col-${idx}` },
                            react_1.default.createElement("td", null, col.name),
                            react_1.default.createElement("td", null, col.title || ''),
                            react_1.default.createElement("td", { className: "edt-grid__cell--mono" }, (0, typeUtils_1.formatTypeForDisplay)(col.type)),
                            react_1.default.createElement("td", { className: "attr-columns__actionsCell" },
                                react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", "aria-label": "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", onClick: () => handleEditColumn(idx) }, "\u270E"),
                                react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", onClick: () => onConfirmDeleteColumnIndexChange(idx) }, "\u00D7"))))))))))) : null),
        react_1.default.createElement(EditColumnModal_1.EditColumnModal, { isOpen: !!columnModal, mode: columnModal?.mode || 'add', name: columnDraftName, title: columnDraftTitle, type: columnDraftType, metadata: metadata, onClose: () => onColumnModalChange(null), onSave: handleColumnSave, onNameChange: onColumnDraftNameChange, onTitleChange: onColumnDraftTitleChange, onTypeChange: onColumnDraftTypeChange }),
        react_1.default.createElement(ConfirmDeleteModal_1.ConfirmDeleteModal, { isOpen: confirmDeleteColumnIndex !== null, message: confirmDeleteColumnIndex !== null ? `Удалить колонку "${columns[confirmDeleteColumnIndex]?.name || `Колонка ${confirmDeleteColumnIndex + 1}`}"?` : '', onConfirm: () => {
                if (confirmDeleteColumnIndex !== null) {
                    onDeleteColumn(confirmDeleteColumnIndex);
                    onConfirmDeleteColumnIndexChange(null);
                }
            }, onCancel: () => onConfirmDeleteColumnIndexChange(null), width: 420 })));
};
exports.EditAttributeModal = EditAttributeModal;
//# sourceMappingURL=EditAttributeModal.js.map
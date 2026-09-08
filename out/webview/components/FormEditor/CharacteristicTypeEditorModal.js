"use strict";
/**
 * Модальное окно редактирования типа значения характеристик
 * Используется для добавления/редактирования типов значения характеристик в планах видов характеристик
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CharacteristicTypeEditorModal = void 0;
const react_1 = __importStar(require("react"));
const Modal_1 = require("./Modal");
const ui_1 = require("../../ui");
const TypeWidget_1 = require("../../widgets/TypeWidget");
const CharacteristicTypeEditorModal = ({ isOpen, typeValue, metadata, onClose, onSave }) => {
    // Преобразуем строку типа в объект для TypeWidget
    const initialTypeValue = (0, react_1.useMemo)(() => {
        if (typeValue) {
            // Преобразуем строку "cfg:CatalogRef.Номенклатура" в объект для TypeWidget
            // TypeWidget ожидает объект вида { 'v8:Type': '...' }
            return {
                'v8:Type': typeValue
            };
        }
        return null;
    }, [typeValue, isOpen]);
    // Обработчик изменения типа от TypeWidget
    // TypeWidget вызывает onChange при нажатии кнопки "Сохранить" внутри себя
    const handleTypeChange = (type) => {
        console.log('[CharacteristicTypeEditorModal] handleTypeChange called with:', type);
        if (!type) {
            console.warn('[CharacteristicTypeEditorModal] No type received');
            onClose();
            return;
        }
        // TypeWidget возвращает объект вида { 'v8:Type': 'cfg:CatalogRef.Номенклатура' }
        // или { 'v8:TypeSet': '...' } для определяемых типов
        let typeString = null;
        if (type['v8:Type']) {
            typeString = typeof type['v8:Type'] === 'string'
                ? type['v8:Type']
                : (type['v8:Type']['#text'] || String(type['v8:Type']));
        }
        else if (type['v8:TypeSet']) {
            typeString = typeof type['v8:TypeSet'] === 'string'
                ? type['v8:TypeSet']
                : (type['v8:TypeSet']['#text'] || String(type['v8:TypeSet']));
        }
        else if (type.kind) {
            // Fallback для ParsedTypeRef
            typeString = type.kind;
        }
        console.log('[CharacteristicTypeEditorModal] Extracted typeString:', typeString);
        if (typeString) {
            onSave(typeString);
        }
        else {
            console.warn('[CharacteristicTypeEditorModal] Could not extract type string from:', type);
        }
        onClose();
    };
    const footer = (react_1.default.createElement(ui_1.UiButton, { secondary: true, onClick: onClose }, "\u0417\u0430\u043A\u0440\u044B\u0442\u044C"));
    return (react_1.default.createElement(Modal_1.Modal, { isOpen: isOpen, title: typeValue ? "Редактировать тип значения характеристик" : "Добавить тип значения характеристик", onClose: onClose, footer: footer },
        react_1.default.createElement("div", { className: "form-field" },
            react_1.default.createElement("label", null, "\u0422\u0438\u043F \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F"),
            react_1.default.createElement(TypeWidget_1.TypeWidget, { ...{
                    id: 'characteristic-type-editor',
                    value: initialTypeValue,
                    onChange: handleTypeChange,
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
                        referenceTypes: metadata.referenceTypes
                    }
                } }))));
};
exports.CharacteristicTypeEditorModal = CharacteristicTypeEditorModal;
//# sourceMappingURL=CharacteristicTypeEditorModal.js.map
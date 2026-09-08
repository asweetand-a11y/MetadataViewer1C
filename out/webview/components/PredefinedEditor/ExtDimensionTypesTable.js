"use strict";
/**
 * Компонент таблицы видов субконто для плана счетов
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
exports.ExtDimensionTypesTable = void 0;
const react_1 = __importStar(require("react"));
const ui_1 = require("../../ui");
const ExtDimensionTypesTable = ({ dimensionTypes, extDimensionAccountingFlags, item, onChange }) => {
    const extDimTypes = item.ExtDimensionTypes || [];
    // Собираем все доступные предопределенные элементы из всех видов субконто
    const availablePredefinedItems = (0, react_1.useMemo)(() => {
        console.log('[ExtDimensionTypesTable] dimensionTypes:', dimensionTypes);
        console.log('[ExtDimensionTypesTable] dimensionTypes.length:', dimensionTypes?.length || 0);
        const allItems = [];
        // Добавляем элементы из метаданных
        if (dimensionTypes && Array.isArray(dimensionTypes) && dimensionTypes.length > 0) {
            dimensionTypes.forEach((dt, index) => {
                console.log(`[ExtDimensionTypesTable] dimensionTypes[${index}]:`, {
                    name: dt.name,
                    chartOfCharacteristicTypesName: dt.chartOfCharacteristicTypesName,
                    predefinedItemsCount: dt.predefinedItems?.length || 0
                });
                if (dt.predefinedItems && Array.isArray(dt.predefinedItems)) {
                    console.log(`[ExtDimensionTypesTable] predefinedItems для ${dt.name}:`, dt.predefinedItems.length, 'элементов');
                    dt.predefinedItems.forEach(item => {
                        if (item && !allItems.includes(item)) {
                            allItems.push(item);
                        }
                    });
                }
                else {
                    console.warn(`[ExtDimensionTypesTable] dimensionTypes[${index}] не имеет predefinedItems или это не массив`);
                }
            });
        }
        else {
            console.warn('[ExtDimensionTypesTable] dimensionTypes пустой или не является массивом');
        }
        // Также добавляем уже используемые виды субконто, если их нет в списке доступных
        extDimTypes.forEach(dimType => {
            if (dimType.dimensionType && !allItems.includes(dimType.dimensionType)) {
                allItems.push(dimType.dimensionType);
                console.log(`[ExtDimensionTypesTable] Добавлен используемый вид субконто: ${dimType.dimensionType}`);
            }
        });
        console.log('[ExtDimensionTypesTable] Всего доступных элементов:', allItems.length);
        if (allItems.length > 0) {
            console.log('[ExtDimensionTypesTable] Список элементов:', allItems);
        }
        return allItems.sort();
    }, [dimensionTypes, extDimTypes]);
    // Собираем все уникальные имена признаков из flags всех extDimTypes
    // Динамически добавляем все признаки учета, которые есть в данных
    const allFlagNames = new Set(extDimensionAccountingFlags);
    extDimTypes.forEach(dimType => {
        if (dimType.flags) {
            Object.keys(dimType.flags).forEach(flagName => {
                allFlagNames.add(flagName);
            });
        }
    });
    const allAccountingFlags = Array.from(allFlagNames);
    const handleAddDimensionType = () => {
        console.log('[ExtDimensionTypesTable] handleAddDimensionType - availablePredefinedItems:', availablePredefinedItems);
        if (availablePredefinedItems.length === 0) {
            console.warn('[ExtDimensionTypesTable] Нет доступных элементов для добавления');
            return;
        }
        const newExtDimTypes = [...extDimTypes, {
                dimensionType: availablePredefinedItems[0],
                turnoverOnly: false,
                flags: {}
            }];
        onChange({ ...item, ExtDimensionTypes: newExtDimTypes });
    };
    const handleRemoveDimensionType = (index) => {
        const newExtDimTypes = extDimTypes.filter((_, i) => i !== index);
        onChange({ ...item, ExtDimensionTypes: newExtDimTypes.length > 0 ? newExtDimTypes : undefined });
    };
    const handleDimensionTypeChange = (index, dimensionType) => {
        const newExtDimTypes = [...extDimTypes];
        newExtDimTypes[index] = { ...newExtDimTypes[index], dimensionType };
        onChange({ ...item, ExtDimensionTypes: newExtDimTypes });
    };
    const handleTurnoverChange = (index, turnoverOnly) => {
        const newExtDimTypes = [...extDimTypes];
        newExtDimTypes[index] = { ...newExtDimTypes[index], turnoverOnly };
        onChange({ ...item, ExtDimensionTypes: newExtDimTypes });
    };
    const handleFlagChange = (index, flagName, enabled) => {
        const newExtDimTypes = [...extDimTypes];
        const flags = { ...newExtDimTypes[index].flags };
        const currentFlagValue = flags[flagName];
        if (enabled) {
            // Сохраняем в том же формате, в котором были данные
            if (currentFlagValue && typeof currentFlagValue === 'object' && 'enabled' in currentFlagValue) {
                // Сохраняем как объект с ref если он был
                flags[flagName] = { enabled: true, ref: currentFlagValue.ref };
            }
            else {
                // Сохраняем как boolean для обратной совместимости
                flags[flagName] = true;
            }
        }
        else {
            delete flags[flagName];
        }
        newExtDimTypes[index] = { ...newExtDimTypes[index], flags };
        onChange({ ...item, ExtDimensionTypes: newExtDimTypes });
    };
    return (react_1.default.createElement("div", { style: { marginTop: '12px' } },
        react_1.default.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
            react_1.default.createElement("label", { style: { fontWeight: 'bold', fontSize: '13px' } }, "\u0412\u0438\u0434\u044B \u0441\u0443\u0431\u043A\u043E\u043D\u0442\u043E:"),
            react_1.default.createElement(ui_1.UiButton, { icon: "add", disabled: availablePredefinedItems.length === 0, onClick: handleAddDimensionType }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C")),
        extDimTypes.length === 0 ? (react_1.default.createElement("div", { style: { fontSize: '12px', color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' } }, "\u041D\u0435\u0442 \u0432\u0438\u0434\u043E\u0432 \u0441\u0443\u0431\u043A\u043E\u043D\u0442\u043E")) : (react_1.default.createElement("div", { style: { overflowX: 'auto' } },
            react_1.default.createElement("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '600px' } },
                react_1.default.createElement("thead", null,
                    react_1.default.createElement("tr", { style: { borderBottom: '1px solid var(--vscode-panel-border)' } },
                        react_1.default.createElement("th", { style: { padding: '6px', textAlign: 'left', fontWeight: 'bold' } }, "\u0412\u0438\u0434 \u0441\u0443\u0431\u043A\u043E\u043D\u0442\u043E"),
                        react_1.default.createElement("th", { style: { padding: '6px', textAlign: 'center', fontWeight: 'bold' } }, "\u0422\u043E\u043B\u044C\u043A\u043E \u043E\u0431\u043E\u0440\u043E\u0442\u044B"),
                        allAccountingFlags.map(flagName => (react_1.default.createElement("th", { key: flagName, style: { padding: '6px', textAlign: 'center', fontWeight: 'bold' } }, flagName))),
                        react_1.default.createElement("th", { style: { padding: '6px', width: '60px' } }))),
                react_1.default.createElement("tbody", null, extDimTypes.map((dimType, index) => {
                    // Создаем список опций, включая текущее значение, даже если его нет в availablePredefinedItems
                    const allDimensionTypes = new Set(availablePredefinedItems);
                    if (dimType.dimensionType && !allDimensionTypes.has(dimType.dimensionType)) {
                        allDimensionTypes.add(dimType.dimensionType);
                    }
                    const dimensionTypeOptions = Array.from(allDimensionTypes);
                    return (react_1.default.createElement("tr", { key: index, style: { borderBottom: '1px solid var(--vscode-panel-border)' } },
                        react_1.default.createElement("td", { style: { padding: '6px' } },
                            react_1.default.createElement("select", { value: dimType.dimensionType, onChange: (e) => handleDimensionTypeChange(index, e.target.value), style: {
                                    width: '100%',
                                    padding: '4px 8px',
                                    border: '1px solid var(--vscode-input-border)',
                                    background: 'var(--vscode-input-background)',
                                    color: 'var(--vscode-input-foreground)',
                                    borderRadius: '3px',
                                    fontSize: '12px'
                                } }, dimensionTypeOptions.map((itemName) => (react_1.default.createElement("option", { key: itemName, value: itemName }, itemName))))),
                        react_1.default.createElement("td", { style: { padding: '6px', textAlign: 'center' } },
                            react_1.default.createElement("input", { type: "checkbox", checked: dimType.turnoverOnly, onChange: (e) => handleTurnoverChange(index, e.target.checked), style: { cursor: 'pointer' } })),
                        allAccountingFlags.map(flagName => {
                            // Обрабатываем как boolean или объект с enabled
                            const flagValue = dimType.flags[flagName];
                            const isChecked = typeof flagValue === 'boolean'
                                ? flagValue
                                : (flagValue && typeof flagValue === 'object' && 'enabled' in flagValue ? flagValue.enabled : false);
                            return (react_1.default.createElement("td", { key: flagName, style: { padding: '6px', textAlign: 'center' } },
                                react_1.default.createElement("input", { type: "checkbox", checked: isChecked, onChange: (e) => handleFlagChange(index, flagName, e.target.checked), style: { cursor: 'pointer' } })));
                        }),
                        react_1.default.createElement("td", { style: { padding: '6px', textAlign: 'center' } },
                            react_1.default.createElement(ui_1.UiButton, { icon: "close", danger: true, title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", onClick: () => handleRemoveDimensionType(index) }))));
                })))))));
};
exports.ExtDimensionTypesTable = ExtDimensionTypesTable;
//# sourceMappingURL=ExtDimensionTypesTable.js.map
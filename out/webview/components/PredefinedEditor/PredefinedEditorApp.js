"use strict";
/**
 * Редактор предопределенных элементов
 * Отображает иерархию плоской таблицей с отступами; редактирование — в модальном окне.
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
exports.PredefinedEditorApp = void 0;
const react_1 = __importStar(require("react"));
const predefinedTreeMutations_1 = require("../../../utils/predefinedTreeMutations");
const PredefinedTypeEditorModal_1 = require("./PredefinedTypeEditorModal");
const AccountingFlagsTable_1 = require("./AccountingFlagsTable");
const ExtDimensionTypesTable_1 = require("./ExtDimensionTypesTable");
require("../../styles/editor.css");
require("./PredefinedEditorApp.css");
/** Рекурсивно разворачивает дерево Item в плоский список с путём и глубиной */
function pathsEqual(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}
/** Кастомный выбор родителя: нативный select в webview на Windows даёт белый список опций. */
function ParentPathCombobox({ value, flatRows, onChange }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const wrapRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onDocMouseDown = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [open]);
    const currentLabel = value.length === 0
        ? '(Верхний уровень)'
        : (() => {
            const row = flatRows.find((r) => pathsEqual(r.path, value));
            return row ? `${row.item.Code} ${row.item.Name}` : value.join('.');
        })();
    return (react_1.default.createElement("div", { className: "predefined-combobox", ref: wrapRef },
        react_1.default.createElement("button", { type: "button", className: "predefined-combobox-trigger", onClick: () => setOpen((o) => !o), "aria-expanded": open, "aria-haspopup": "listbox" },
            react_1.default.createElement("span", { className: "predefined-combobox-value" }, currentLabel),
            react_1.default.createElement("span", { className: "predefined-combobox-chevron", "aria-hidden": true }, "\u25BE")),
        open && (react_1.default.createElement("ul", { className: "predefined-combobox-list", role: "listbox" },
            react_1.default.createElement("li", { role: "option", "aria-selected": value.length === 0, className: value.length === 0 ? 'is-selected' : undefined, onClick: () => {
                    onChange([]);
                    setOpen(false);
                } }, "(\u0412\u0435\u0440\u0445\u043D\u0438\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C)"),
            flatRows.map(({ item: pItem, path: pPath, depth: pDepth }) => {
                const selected = pathsEqual(pPath, value);
                return (react_1.default.createElement("li", { key: pPath.join('-'), role: "option", "aria-selected": selected, className: selected ? 'is-selected' : undefined, style: { paddingLeft: `${10 + pDepth * 14}px` }, onClick: () => {
                        onChange(pPath);
                        setOpen(false);
                    } }, `${'\u2014 '.repeat(pDepth)}${pItem.Code} ${pItem.Name}`));
            })))));
}
function flattenPredefinedItems(items) {
    const out = [];
    function walk(list, prefixPath, depth) {
        list.forEach((item, i) => {
            const path = [...prefixPath, i];
            out.push({ item, path, depth });
            const children = item.ChildItems?.Item;
            if (children && children.length > 0) {
                walk(children, path, depth + 1);
            }
        });
    }
    walk(items, [], 0);
    return out;
}
/** Глубокая копия элемента для редактирования (признаки учёта и виды субконто) */
function copyPredefinedItemForEdit(source) {
    return {
        ...source,
        Displaced: source.Displaced ? [...source.Displaced] : source.Displaced,
        Leading: source.Leading ? [...source.Leading] : source.Leading,
        Base: source.Base ? [...source.Base] : source.Base,
        AccountingFlags: source.AccountingFlags && source.AccountingFlags.length > 0
            ? source.AccountingFlags.map((flag) => ({
                flagName: flag.flagName,
                enabled: flag.enabled,
                ref: flag.ref
            }))
            : source.AccountingFlags,
        ExtDimensionTypes: source.ExtDimensionTypes && source.ExtDimensionTypes.length > 0
            ? source.ExtDimensionTypes.map((dimType) => {
                const copiedFlags = {};
                if (dimType.flags) {
                    Object.entries(dimType.flags).forEach(([key, value]) => {
                        if (typeof value === 'boolean') {
                            copiedFlags[key] = value;
                        }
                        else if (value && typeof value === 'object' && 'enabled' in value) {
                            copiedFlags[key] = { enabled: value.enabled, ref: value.ref };
                        }
                    });
                }
                return {
                    dimensionType: dimType.dimensionType,
                    turnoverOnly: dimType.turnoverOnly,
                    flags: copiedFlags,
                    name: dimType.name
                };
            })
            : source.ExtDimensionTypes
    };
}
function accountTypeLabel(v) {
    if (!v)
        return '—';
    if (v === 'Active')
        return 'Активный';
    if (v === 'Passive')
        return 'Пассивный';
    if (v === 'ActivePassive')
        return 'Активно-пассивный';
    return v;
}
/** Чекбоксы полных ссылок ChartOfCalculationTypes.<План>.<Имя> по группам планов. */
function CalculationTypeRefsPane(props) {
    const { groups, value, excludeRef, onChange } = props;
    const selected = new Set(value);
    const toggle = (ref) => {
        const next = new Set(selected);
        if (next.has(ref)) {
            next.delete(ref);
        }
        else {
            next.add(ref);
        }
        onChange([...next]);
    };
    if (!groups.length) {
        return (react_1.default.createElement("div", { style: { padding: '8px', color: 'var(--vscode-descriptionForeground)', fontSize: '12px' } }, "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E \u043F\u043B\u0430\u043D\u0430\u0445 \u0432\u0438\u0434\u043E\u0432 \u0440\u0430\u0441\u0447\u0451\u0442\u0430 (\u043A\u0430\u0442\u0430\u043B\u043E\u0433 ChartsOfCalculationTypes \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u043F\u0443\u0441\u0442)."));
    }
    return (react_1.default.createElement("div", { style: { maxHeight: '320px', overflowY: 'auto', fontSize: '12px' } }, groups.map((g) => (react_1.default.createElement("div", { key: g.chartName, style: { marginBottom: '12px' } },
        react_1.default.createElement("div", { style: { fontWeight: 600, marginBottom: '6px' } }, g.chartName),
        g.refs
            .filter((r) => !excludeRef || r !== excludeRef)
            .map((r) => {
            const short = r.split('.').pop() || r;
            return (react_1.default.createElement("label", { key: r, style: { display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px', marginBottom: '4px', cursor: 'pointer' } },
                react_1.default.createElement("input", { type: "checkbox", checked: selected.has(r), onChange: () => toggle(r) }),
                react_1.default.createElement("span", { title: r }, short)));
        }))))));
}
function rowHasChildren(item) {
    return !!(item.ChildItems?.Item && item.ChildItems.Item.length > 0);
}
/** Таблица предопределённых элементов с иерархией по отступам и сворачиванием веток */
const PredefinedTable = ({ rows, isChartOfAccounts, isChartOfCharacteristicTypes, collapsedPathKeys, onToggleBranch, onEditPath, onDeletePath }) => {
    const visibleRows = (0, react_1.useMemo)(() => {
        return rows.filter(({ path }) => {
            for (let d = 0; d < path.length - 1; d++) {
                const prefixKey = path.slice(0, d + 1).join(',');
                if (collapsedPathKeys.has(prefixKey))
                    return false;
            }
            return true;
        });
    }, [rows, collapsedPathKeys]);
    return (react_1.default.createElement("div", { className: "predefined-table-wrap" },
        react_1.default.createElement("table", { className: "predefined-flat-table" },
            react_1.default.createElement("thead", null,
                react_1.default.createElement("tr", null,
                    react_1.default.createElement("th", { className: "col-code" }, "\u041A\u043E\u0434"),
                    react_1.default.createElement("th", { className: "col-name" }, "\u041D\u0430\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0435"),
                    isChartOfCharacteristicTypes && react_1.default.createElement("th", { className: "col-type" }, "\u0422\u0438\u043F"),
                    isChartOfAccounts && (react_1.default.createElement(react_1.default.Fragment, null,
                        react_1.default.createElement("th", { className: "col-account-type" }, "\u0412\u0438\u0434"),
                        react_1.default.createElement("th", { className: "col-off" }, "\u0417\u0430\u0431\u0430\u043B\u0430\u043D\u0441\u043E\u0432\u044B\u0439"),
                        react_1.default.createElement("th", { className: "col-order" }, "\u041F\u043E\u0440\u044F\u0434\u043E\u043A"))),
                    react_1.default.createElement("th", { className: "col-folder" }, "\u041F\u0430\u043F\u043A\u0430"),
                    react_1.default.createElement("th", { className: "col-actions" }, "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F"))),
            react_1.default.createElement("tbody", null, visibleRows.map(({ item, path, depth }) => {
                const rowKey = item.id
                    ? `${path.join('-')}-${item.id}`
                    : `${path.join('-')}-${item.Code}-${item.Name}`;
                const pathKey = path.join(',');
                const hasKids = rowHasChildren(item);
                const branchCollapsed = collapsedPathKeys.has(pathKey);
                const typePreview = item.Type && item.Type.length > 48 ? `${item.Type.slice(0, 48)}…` : item.Type || '';
                return (react_1.default.createElement("tr", { key: rowKey },
                    react_1.default.createElement("td", { className: "col-code" }, item.Code),
                    react_1.default.createElement("td", { className: "col-name" },
                        react_1.default.createElement("span", { className: "predefined-name-cell", style: { paddingLeft: depth * 20 }, title: item.Description || item.Name },
                            hasKids ? (react_1.default.createElement("button", { type: "button", className: "predefined-tree-toggle", "aria-expanded": !branchCollapsed, "aria-label": branchCollapsed ? 'Развернуть дочерние элементы' : 'Свернуть дочерние элементы', title: branchCollapsed ? 'Развернуть' : 'Свернуть', onClick: (e) => {
                                    e.stopPropagation();
                                    onToggleBranch(path);
                                } }, branchCollapsed ? '▶' : '▼')) : (react_1.default.createElement("span", { className: "predefined-tree-toggle-placeholder", "aria-hidden": true })),
                            react_1.default.createElement("span", { className: "predefined-icon", "aria-hidden": true }, item.IsFolder ? '📁' : '📄'),
                            react_1.default.createElement("span", { className: "predefined-name-text" }, item.Name))),
                    isChartOfCharacteristicTypes && (react_1.default.createElement("td", { className: "col-type predefined-type-cell", title: item.Type || '' }, typePreview || '—')),
                    isChartOfAccounts && (react_1.default.createElement(react_1.default.Fragment, null,
                        react_1.default.createElement("td", { className: "col-account-type" }, accountTypeLabel(item.AccountType)),
                        react_1.default.createElement("td", { className: "col-off" }, item.OffBalance === undefined ? '—' : item.OffBalance ? 'Да' : 'Нет'),
                        react_1.default.createElement("td", { className: "col-order" }, item.Order || '—'))),
                    react_1.default.createElement("td", { className: "col-folder" }, item.IsFolder ? 'Да' : 'Нет'),
                    react_1.default.createElement("td", { className: "col-actions" },
                        react_1.default.createElement("button", { type: "button", className: "btn-edit-type predefined-table-action", onClick: () => onEditPath(path), title: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", "aria-label": "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C" }, "\u270E"),
                        react_1.default.createElement("button", { type: "button", className: "btn-edit-type predefined-table-action predefined-table-action-delete", onClick: () => onDeletePath(path), title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" }, "\u00D7"))));
            })))));
};
const PredefinedEditorApp = ({ vscode }) => {
    const [items, setItems] = (0, react_1.useState)([]);
    const [editingItem, setEditingItem] = (0, react_1.useState)(null);
    const [editingChild, setEditingChild] = (0, react_1.useState)(null);
    const [showAddModal, setShowAddModal] = (0, react_1.useState)(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = (0, react_1.useState)(false);
    const [deleteIndex, setDeleteIndex] = (0, react_1.useState)(null);
    const [deleteChild, setDeleteChild] = (0, react_1.useState)(null);
    const [objectType, setObjectType] = (0, react_1.useState)('');
    const [metadata, setMetadata] = (0, react_1.useState)({
        registers: [],
        referenceTypes: []
    });
    const [chartOfAccountsData, setChartOfAccountsData] = (0, react_1.useState)(undefined);
    const [chartOfCalculationTypesData, setChartOfCalculationTypesData] = (0, react_1.useState)(undefined);
    const [showTypeModal, setShowTypeModal] = (0, react_1.useState)(false);
    const [typeModalContext, setTypeModalContext] = (0, react_1.useState)({
        mode: 'add',
        currentType: ''
    });
    const [newItem, setNewItem] = (0, react_1.useState)({
        Name: '',
        Code: '',
        Description: '',
        Type: '',
        IsFolder: false
    });
    /** Путь к родителю при добавлении ([] — корень, как в XML) */
    const [addParentPath, setAddParentPath] = (0, react_1.useState)([]);
    /** Ключи path.join(',') свёрнутых узлов (дочерние строки скрыты) */
    const [collapsedPathKeys, setCollapsedPathKeys] = (0, react_1.useState)(() => new Set());
    const toggleBranchCollapsed = (0, react_1.useCallback)((path) => {
        const k = path.join(',');
        setCollapsedPathKeys((prev) => {
            const next = new Set(prev);
            if (next.has(k))
                next.delete(k);
            else
                next.add(k);
            return next;
        });
    }, []);
    /** Раскрыть все предки пути (после добавления в свёрнутую ветку новый элемент виден) */
    const expandAncestorsOfPath = (0, react_1.useCallback)((parentPath) => {
        if (parentPath.length === 0)
            return;
        setCollapsedPathKeys((prev) => {
            const next = new Set(prev);
            for (let d = 0; d < parentPath.length; d++) {
                next.delete(parentPath.slice(0, d + 1).join(','));
            }
            return next;
        });
    }, []);
    // Проверка, является ли объект планом видов характеристик
    const isChartOfCharacteristicTypes = (0, react_1.useMemo)(() => {
        return objectType === 'ChartOfCharacteristicTypes' ||
            objectType === 'План видов характеристик' ||
            objectType.includes('ChartOfCharacteristicTypes');
    }, [objectType]);
    // Проверка, является ли объект планом счетов
    const isChartOfAccounts = (0, react_1.useMemo)(() => {
        return objectType === 'ChartOfAccounts' ||
            objectType === 'План счетов' ||
            objectType.includes('ChartOfAccounts');
    }, [objectType]);
    const isChartOfCalculationTypes = (0, react_1.useMemo)(() => {
        return (objectType === 'ChartOfCalculationTypes' ||
            objectType === 'План видов расчета' ||
            objectType.includes('ChartOfCalculationTypes'));
    }, [objectType]);
    const flatRows = (0, react_1.useMemo)(() => flattenPredefinedItems(items), [items]);
    // Обработка сообщений от extension
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            console.log('[PredefinedEditorApp] Получено сообщение:', message.type, 'элементов:', message.payload?.length || 0);
            if (message.type === 'init') {
                const initMsg = message;
                console.log('[PredefinedEditorApp] Инициализация с данными:', initMsg.payload);
                setItems(initMsg.payload || []);
                if (initMsg.objectType) {
                    setObjectType(initMsg.objectType);
                }
                if (initMsg.metadata) {
                    setMetadata(initMsg.metadata);
                }
                if (initMsg.chartOfAccountsData) {
                    console.log('[PredefinedEditorApp] Получены данные плана счетов:', {
                        accountingFlags: initMsg.chartOfAccountsData.accountingFlags?.length || 0,
                        extDimensionAccountingFlags: initMsg.chartOfAccountsData.extDimensionAccountingFlags?.length || 0,
                        dimensionTypes: initMsg.chartOfAccountsData.dimensionTypes?.length || 0
                    });
                    if (initMsg.chartOfAccountsData.dimensionTypes && initMsg.chartOfAccountsData.dimensionTypes.length > 0) {
                        console.log('[PredefinedEditorApp] Виды субконто:', initMsg.chartOfAccountsData.dimensionTypes.map(dt => ({
                            name: dt.name,
                            chartOfCharacteristicTypesName: dt.chartOfCharacteristicTypesName,
                            predefinedItemsCount: dt.predefinedItems?.length || 0
                        })));
                    }
                    setChartOfAccountsData(initMsg.chartOfAccountsData);
                }
                else {
                    console.warn('[PredefinedEditorApp] Данные плана счетов не получены');
                }
                if (initMsg.chartOfCalculationTypesData) {
                    setChartOfCalculationTypesData(initMsg.chartOfCalculationTypesData);
                }
                else {
                    setChartOfCalculationTypesData(undefined);
                }
            }
            else if (message.type === 'saved') {
                if (message.payload?.success) {
                    setEditingItem(null);
                    setEditingChild(null);
                    setShowAddModal(false);
                    setShowTypeModal(false);
                    setShowDeleteConfirm(false);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        // Запрашиваем данные при загрузке
        console.log('[PredefinedEditorApp] Компонент загружен, запрашиваем данные');
        vscode.postMessage({ type: 'requestData' });
        // Отправляем сообщение о готовности
        requestAnimationFrame(() => {
            setTimeout(() => {
                vscode.postMessage({ type: 'webviewReady' });
            }, 50);
        });
        return () => window.removeEventListener('message', handleMessage);
    }, [vscode]);
    const handleSave = () => {
        vscode.postMessage({ type: 'save', payload: items });
    };
    const handleAdd = () => {
        if (!newItem.Name) {
            alert('Заполните обязательное поле: Имя');
            return;
        }
        if (!isChartOfCalculationTypes && !newItem.Code) {
            alert('Заполните обязательные поля: Имя и Код');
            return;
        }
        // Убираем Type если это не план видов характеристик
        // Убираем поля плана счетов если это не план счетов
        const itemToAdd = {
            Name: newItem.Name,
            Code: newItem.Code ?? '',
            Description: newItem.Description || '',
            Type: isChartOfCharacteristicTypes ? (newItem.Type || '') : '',
            IsFolder: newItem.IsFolder || false,
            // Поля плана счетов
            AccountType: isChartOfAccounts ? newItem.AccountType : undefined,
            OffBalance: isChartOfAccounts ? newItem.OffBalance : undefined,
            Order: isChartOfAccounts ? newItem.Order : undefined,
            AccountingFlags: isChartOfAccounts && newItem.AccountingFlags ? newItem.AccountingFlags : undefined,
            ExtDimensionTypes: isChartOfAccounts && newItem.ExtDimensionTypes ? newItem.ExtDimensionTypes : undefined,
            ActionPeriodIsBase: isChartOfCalculationTypes ? Boolean(newItem.ActionPeriodIsBase) : undefined,
            Displaced: isChartOfCalculationTypes && newItem.Displaced?.length
                ? [...newItem.Displaced]
                : isChartOfCalculationTypes
                    ? []
                    : undefined,
            Leading: isChartOfCalculationTypes && newItem.Leading?.length
                ? [...newItem.Leading]
                : isChartOfCalculationTypes
                    ? []
                    : undefined,
            Base: isChartOfCalculationTypes && newItem.Base?.length
                ? [...newItem.Base]
                : isChartOfCalculationTypes
                    ? []
                    : undefined
        };
        const updatedItems = (0, predefinedTreeMutations_1.insertItemUnderParent)(items, addParentPath, itemToAdd);
        setItems(updatedItems);
        expandAncestorsOfPath(addParentPath);
        vscode.postMessage({ type: 'addItem', payload: { item: itemToAdd, parentPath: addParentPath } });
        setNewItem({ Name: '', Code: '', Description: '', Type: '', IsFolder: false });
        setAddParentPath([]);
        setShowAddModal(false);
    };
    /** Получить элемент по пути [rootIndex, childIndex1, childIndex2, ...] */
    const getItemByPath = (itemsList, path) => {
        if (path.length === 0)
            return null;
        let current = itemsList[path[0]];
        for (let i = 1; i < path.length; i++) {
            if (!current?.ChildItems?.Item)
                return null;
            current = current.ChildItems.Item[path[i]];
        }
        return current ?? null;
    };
    /** Обновить вложенный элемент по относительному пути (path без rootIndex) */
    const updateItemAtPath = (item, relPath, newValue) => {
        if (relPath.length === 0)
            return newValue;
        const [first, ...rest] = relPath;
        if (!item.ChildItems?.Item || first >= item.ChildItems.Item.length)
            return null;
        const updatedChildren = [...item.ChildItems.Item];
        const updatedChild = updateItemAtPath(updatedChildren[first], rest, newValue);
        if (!updatedChild)
            return null;
        updatedChildren[first] = updatedChild;
        return { ...item, ChildItems: { Item: updatedChildren } };
    };
    /** Удалить вложенный элемент по относительному пути */
    const removeItemAtPath = (item, relPath) => {
        if (relPath.length === 0)
            return null;
        if (relPath.length === 1) {
            const idx = relPath[0];
            if (!item.ChildItems?.Item || idx >= item.ChildItems.Item.length)
                return null;
            const updatedChildren = item.ChildItems.Item.filter((_, i) => i !== idx);
            if (updatedChildren.length === 0) {
                const { ChildItems, ...rest } = item;
                return rest;
            }
            return { ...item, ChildItems: { Item: updatedChildren } };
        }
        const [first, ...rest] = relPath;
        if (!item.ChildItems?.Item || first >= item.ChildItems.Item.length)
            return null;
        const updatedChildren = [...item.ChildItems.Item];
        const updatedChild = removeItemAtPath(updatedChildren[first], rest);
        if (updatedChild === null)
            return null;
        updatedChildren[first] = updatedChild;
        return { ...item, ChildItems: { Item: updatedChildren } };
    };
    /** Открыть редактирование элемента по пути (корень или вложенный) */
    const handleEditByPath = (path) => {
        if (path.length < 1)
            return;
        const target = getItemByPath(items, path);
        if (!target)
            return;
        setEditingChild({ path });
        setEditingItem(copyPredefinedItemForEdit(target));
    };
    const handleUpdate = (updatedItem) => {
        if (!updatedItem.Name) {
            alert('Заполните обязательное поле: Имя');
            return;
        }
        if (!isChartOfCalculationTypes && !updatedItem.Code) {
            alert('Заполните обязательные поля: Имя и Код');
            return;
        }
        // Убираем Type если это не план видов характеристик
        if (!isChartOfCharacteristicTypes) {
            updatedItem.Type = '';
        }
        // Убираем поля плана счетов если это не план счетов
        if (!isChartOfAccounts) {
            updatedItem.AccountType = undefined;
            updatedItem.OffBalance = undefined;
            updatedItem.Order = undefined;
            updatedItem.AccountingFlags = undefined;
            updatedItem.ExtDimensionTypes = undefined;
        }
        if (!isChartOfCalculationTypes) {
            updatedItem.Displaced = undefined;
            updatedItem.Leading = undefined;
            updatedItem.Base = undefined;
            updatedItem.ActionPeriodIsBase = undefined;
        }
        if (editingChild) {
            const path = editingChild.path;
            const updatedChildItem = {
                ...updatedItem,
                Displaced: updatedItem.Displaced ? [...updatedItem.Displaced] : undefined,
                Leading: updatedItem.Leading ? [...updatedItem.Leading] : undefined,
                Base: updatedItem.Base ? [...updatedItem.Base] : undefined,
                AccountingFlags: updatedItem.AccountingFlags
                    ? updatedItem.AccountingFlags.map((flag) => ({ ...flag }))
                    : undefined,
                ExtDimensionTypes: updatedItem.ExtDimensionTypes
                    ? updatedItem.ExtDimensionTypes.map((dimType) => ({
                        ...dimType,
                        flags: dimType.flags ? { ...dimType.flags } : {}
                    }))
                    : undefined
            };
            if (path.length === 1) {
                const rootIndex = path[0];
                const updatedItems = [...items];
                updatedItems[rootIndex] = updatedChildItem;
                setItems(updatedItems);
                vscode.postMessage({
                    type: 'updateItem',
                    payload: { index: rootIndex, item: updatedChildItem }
                });
            }
            else {
                const rootIndex = path[0];
                const updatedRootItem = updateItemAtPath(items[rootIndex], path.slice(1), updatedChildItem);
                if (updatedRootItem) {
                    const updatedItems = [...items];
                    updatedItems[rootIndex] = updatedRootItem;
                    setItems(updatedItems);
                    vscode.postMessage({
                        type: 'updateItem',
                        payload: { index: rootIndex, item: updatedRootItem }
                    });
                }
            }
            setEditingChild(null);
        }
        setEditingItem(null);
    };
    const handleCancelEdit = () => {
        setEditingItem(null);
        setEditingChild(null);
    };
    const handleDelete = (index) => {
        setDeleteIndex(index);
        setDeleteChild(null);
        setShowDeleteConfirm(true);
    };
    const handleDeleteChild = (path) => {
        if (path.length < 2)
            return;
        setDeleteChild({ path });
        setDeleteIndex(null);
        setShowDeleteConfirm(true);
    };
    /** Удаление по пути: корень или вложенный элемент */
    const handleDeleteByPath = (path) => {
        if (path.length === 1) {
            handleDelete(path[0]);
        }
        else {
            handleDeleteChild(path);
        }
    };
    const handleConfirmDelete = () => {
        if (deleteChild && deleteChild.path.length >= 2) {
            const path = deleteChild.path;
            const rootIndex = path[0];
            const relPath = path.slice(1);
            const updatedRootItem = removeItemAtPath(items[rootIndex], relPath);
            if (updatedRootItem !== null) {
                const updatedItems = [...items];
                updatedItems[rootIndex] = updatedRootItem;
                setItems(updatedItems);
                vscode.postMessage({
                    type: 'updateItem',
                    payload: { index: rootIndex, item: updatedRootItem }
                });
            }
            setDeleteChild(null);
        }
        else if (deleteIndex !== null) {
            // Удаление обычного элемента
            const updatedItems = items.filter((_, i) => i !== deleteIndex);
            setItems(updatedItems);
            vscode.postMessage({ type: 'deleteItem', payload: { index: deleteIndex } });
            setDeleteIndex(null);
        }
        setShowDeleteConfirm(false);
    };
    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
        setDeleteIndex(null);
        setDeleteChild(null);
    };
    const handleOpenTypeModal = (mode, currentType = '') => {
        setTypeModalContext({ mode, currentType });
        setShowTypeModal(true);
    };
    const handleTypeSave = (selectedType) => {
        if (typeModalContext.mode === 'add') {
            setNewItem({ ...newItem, Type: selectedType });
        }
        else if (typeModalContext.mode === 'edit' && editingItem) {
            setEditingItem({ ...editingItem, Type: selectedType });
        }
        setShowTypeModal(false);
    };
    return (react_1.default.createElement("div", { className: "predefined-editor-wrapper" },
        react_1.default.createElement("div", { className: "predefined-editor" },
            react_1.default.createElement("div", { className: "editor-header" },
                react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                    react_1.default.createElement("h2", null, "\u041F\u0440\u0435\u0434\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u043D\u044B\u0435 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B"),
                    react_1.default.createElement("span", { style: { fontSize: '13px', color: 'var(--vscode-descriptionForeground)' } },
                        "\u042D\u043B\u0435\u043C\u0435\u043D\u0442\u044B (",
                        items.length,
                        ")")),
                react_1.default.createElement("div", { className: "header-actions" },
                    react_1.default.createElement("button", { className: "btn-add", onClick: () => setShowAddModal(true) }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"),
                    react_1.default.createElement("button", { className: "btn-save", onClick: handleSave }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"))),
            react_1.default.createElement("div", { className: "editor-content" },
                showAddModal && (react_1.default.createElement("div", { className: "modal-overlay", onClick: () => {
                        setShowAddModal(false);
                        setAddParentPath([]);
                        setNewItem({
                            Name: '',
                            Code: '',
                            Description: '',
                            Type: '',
                            IsFolder: false,
                            AccountType: undefined,
                            OffBalance: undefined,
                            Order: undefined,
                            AccountingFlags: undefined,
                            ExtDimensionTypes: undefined,
                            ActionPeriodIsBase: undefined,
                            Displaced: undefined,
                            Leading: undefined,
                            Base: undefined
                        });
                    } },
                    react_1.default.createElement("div", { className: "modal", onClick: (e) => e.stopPropagation() },
                        react_1.default.createElement("h3", null, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u044D\u043B\u0435\u043C\u0435\u043D\u0442"),
                        react_1.default.createElement("div", { className: "modal-content" },
                            react_1.default.createElement("label", { className: "predefined-combobox-label" },
                                "\u0420\u043E\u0434\u0438\u0442\u0435\u043B\u044C:",
                                react_1.default.createElement(ParentPathCombobox, { value: addParentPath, flatRows: flatRows, onChange: setAddParentPath })),
                            react_1.default.createElement("label", null,
                                "\u0418\u043C\u044F: *",
                                react_1.default.createElement("input", { type: "text", value: newItem.Name || '', onChange: (e) => setNewItem({ ...newItem, Name: e.target.value }) })),
                            react_1.default.createElement("label", null,
                                "\u041A\u043E\u0434:",
                                !isChartOfCalculationTypes ? ' *' : '',
                                react_1.default.createElement("input", { type: "text", value: newItem.Code || '', onChange: (e) => setNewItem({ ...newItem, Code: e.target.value }) })),
                            react_1.default.createElement("label", null,
                                "\u041D\u0430\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0435:",
                                react_1.default.createElement("input", { type: "text", value: newItem.Description || '', onChange: (e) => setNewItem({ ...newItem, Description: e.target.value }) })),
                            isChartOfCharacteristicTypes && (react_1.default.createElement("label", null,
                                "\u0422\u0438\u043F:",
                                react_1.default.createElement("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                                    react_1.default.createElement("input", { type: "text", value: newItem.Type || '', readOnly: true, placeholder: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430 \u0442\u0438\u043F\u0430", style: { flex: 1 } }),
                                    react_1.default.createElement("button", { type: "button", onClick: () => handleOpenTypeModal('add', newItem.Type || ''), title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0442\u0438\u043F\u043E\u0432", "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0442\u0438\u043F\u043E\u0432", style: {
                                            padding: '6px 12px',
                                            background: 'var(--vscode-button-secondaryBackground)',
                                            color: 'var(--vscode-button-secondaryForeground)',
                                            border: '1px solid var(--vscode-button-border)',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        } }, "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0442\u0438\u043F")))),
                            isChartOfCalculationTypes && (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement("label", { className: "checkbox-label" },
                                    react_1.default.createElement("input", { type: "checkbox", checked: newItem.ActionPeriodIsBase === true, onChange: (e) => setNewItem({ ...newItem, ActionPeriodIsBase: e.target.checked }) }),
                                    "\u0411\u0430\u0437\u043E\u0432\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F"),
                                react_1.default.createElement("p", { style: { fontSize: '11px', color: 'var(--vscode-descriptionForeground)', margin: '4px 0 0' } }, "\u0421\u0432\u044F\u0437\u0438 \u0432\u044B\u0442\u0435\u0441\u043D\u044F\u044E\u0449\u0438\u0445, \u0432\u0435\u0434\u0443\u0449\u0438\u0445 \u0438 \u0431\u0430\u0437\u043E\u0432\u044B\u0445 \u0432\u0438\u0434\u043E\u0432 \u0437\u0430\u0434\u0430\u0439\u0442\u0435 \u043F\u043E\u0441\u043B\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0447\u0435\u0440\u0435\u0437 \u00AB\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u00BB."))),
                            isChartOfAccounts && (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement("label", null,
                                    "\u0412\u0438\u0434:",
                                    react_1.default.createElement("select", { value: newItem.AccountType || '', onChange: (e) => setNewItem({ ...newItem, AccountType: e.target.value }) },
                                        react_1.default.createElement("option", { value: "" }, "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"),
                                        react_1.default.createElement("option", { value: "Active" }, "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0439"),
                                        react_1.default.createElement("option", { value: "Passive" }, "\u041F\u0430\u0441\u0441\u0438\u0432\u043D\u044B\u0439"),
                                        react_1.default.createElement("option", { value: "ActivePassive" }, "\u0410\u043A\u0442\u0438\u0432\u043D\u043E-\u041F\u0430\u0441\u0441\u0438\u0432\u043D\u044B\u0439"))),
                                react_1.default.createElement("label", { className: "checkbox-label" },
                                    react_1.default.createElement("input", { type: "checkbox", checked: newItem.OffBalance || false, onChange: (e) => setNewItem({ ...newItem, OffBalance: e.target.checked }) }),
                                    "\u0417\u0430\u0431\u0430\u043B\u0430\u043D\u0441\u043E\u0432\u044B\u0439"),
                                react_1.default.createElement("label", null,
                                    "\u041F\u043E\u0440\u044F\u0434\u043E\u043A:",
                                    react_1.default.createElement("input", { type: "text", value: newItem.Order || '', onChange: (e) => setNewItem({ ...newItem, Order: e.target.value }), placeholder: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A" })),
                                chartOfAccountsData && (react_1.default.createElement(react_1.default.Fragment, null,
                                    react_1.default.createElement("div", { style: { marginTop: '12px', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' } }, "\u041F\u0440\u0438\u0437\u043D\u0430\u043A\u0438 \u0443\u0447\u0435\u0442\u0430:"),
                                    react_1.default.createElement(AccountingFlagsTable_1.AccountingFlagsTable, { accountingFlags: chartOfAccountsData.accountingFlags, item: newItem, onChange: (item) => setNewItem(item) }),
                                    react_1.default.createElement("div", { style: { marginTop: '12px', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' } }, "\u0412\u0438\u0434\u044B \u0441\u0443\u0431\u043A\u043E\u043D\u0442\u043E:"),
                                    react_1.default.createElement(ExtDimensionTypesTable_1.ExtDimensionTypesTable, { dimensionTypes: chartOfAccountsData.dimensionTypes, extDimensionAccountingFlags: chartOfAccountsData.extDimensionAccountingFlags, item: newItem, onChange: (item) => setNewItem(item) }))))),
                            react_1.default.createElement("label", { className: "checkbox-label" },
                                react_1.default.createElement("input", { type: "checkbox", checked: newItem.IsFolder || false, onChange: (e) => setNewItem({ ...newItem, IsFolder: e.target.checked }) }),
                                "\u041F\u0430\u043F\u043A\u0430")),
                        react_1.default.createElement("div", { className: "modal-actions" },
                            react_1.default.createElement("button", { className: "btn-primary", onClick: handleAdd }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"),
                            react_1.default.createElement("button", { className: "btn-secondary", onClick: () => {
                                    setShowAddModal(false);
                                    setAddParentPath([]);
                                    setNewItem({
                                        Name: '',
                                        Code: '',
                                        Description: '',
                                        Type: '',
                                        IsFolder: false,
                                        AccountType: undefined,
                                        OffBalance: undefined,
                                        Order: undefined,
                                        AccountingFlags: undefined,
                                        ExtDimensionTypes: undefined,
                                        ActionPeriodIsBase: undefined,
                                        Displaced: undefined,
                                        Leading: undefined,
                                        Base: undefined
                                    });
                                } }, "\u041E\u0442\u043C\u0435\u043D\u0430"))))),
                items.length === 0 ? (react_1.default.createElement("div", { className: "empty-state" }, "\u0414\u043B\u044F \u0434\u0430\u043D\u043D\u043E\u0433\u043E \u043E\u0431\u044A\u0435\u043A\u0442\u0430 \u043F\u0440\u0435\u0434\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u043D\u044B\u0435 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u044B")) : (react_1.default.createElement(PredefinedTable, { rows: flatRows, isChartOfAccounts: isChartOfAccounts, isChartOfCharacteristicTypes: isChartOfCharacteristicTypes, collapsedPathKeys: collapsedPathKeys, onToggleBranch: toggleBranchCollapsed, onEditPath: handleEditByPath, onDeletePath: handleDeleteByPath })),
                showTypeModal && (react_1.default.createElement(PredefinedTypeEditorModal_1.PredefinedTypeEditorModal, { isOpen: showTypeModal, typeValue: typeModalContext.currentType || null, metadata: metadata, onClose: () => setShowTypeModal(false), onSave: handleTypeSave })),
                editingChild && editingItem && (react_1.default.createElement("div", { className: "modal-overlay", onClick: handleCancelEdit },
                    react_1.default.createElement("div", { className: "modal edit-item-modal", onClick: (e) => e.stopPropagation(), style: {
                            maxWidth: isChartOfCalculationTypes ? '680px' : '600px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            overflowX: 'hidden'
                        } },
                        react_1.default.createElement("h3", { style: { marginBottom: '16px' } },
                            "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435: ",
                            editingItem.Name || 'Элемент'),
                        react_1.default.createElement(EditItemCard, { item: editingItem, isChartOfCharacteristicTypes: isChartOfCharacteristicTypes, isChartOfAccounts: isChartOfAccounts, isChartOfCalculationTypes: isChartOfCalculationTypes, chartOfAccountsData: chartOfAccountsData, chartOfCalculationTypesData: chartOfCalculationTypesData, onSave: handleUpdate, onCancel: handleCancelEdit, onChange: setEditingItem, onOpenTypeModal: handleOpenTypeModal, showInModal: true })))),
                showDeleteConfirm && (react_1.default.createElement("div", { className: "modal-overlay", onClick: handleCancelDelete },
                    react_1.default.createElement("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: '400px' } },
                        react_1.default.createElement("h3", null, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F"),
                        react_1.default.createElement("div", { className: "modal-content" },
                            react_1.default.createElement("p", null, "\u0412\u044B \u0443\u0432\u0435\u0440\u0435\u043D\u044B, \u0447\u0442\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u0442\u043E\u0442 \u044D\u043B\u0435\u043C\u0435\u043D\u0442?")),
                        react_1.default.createElement("div", { className: "modal-actions" },
                            react_1.default.createElement("button", { className: "btn-primary", onClick: handleConfirmDelete, style: { background: 'var(--vscode-errorForeground)' } }, "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"),
                            react_1.default.createElement("button", { className: "btn-secondary", onClick: handleCancelDelete }, "\u041E\u0442\u043C\u0435\u043D\u0430")))))))));
};
exports.PredefinedEditorApp = PredefinedEditorApp;
const EditItemCard = ({ item, isChartOfCharacteristicTypes, isChartOfAccounts, isChartOfCalculationTypes = false, chartOfAccountsData, chartOfCalculationTypesData, onSave, onCancel, onChange, onOpenTypeModal, showInModal = false }) => {
    const [calcTab, setCalcTab] = (0, react_1.useState)('main');
    (0, react_1.useEffect)(() => {
        setCalcTab('main');
    }, [item?.id, item?.Name]);
    if (!item)
        return null;
    const handleSave = () => {
        if (!item.Name) {
            alert('Заполните обязательное поле: Имя');
            return;
        }
        if (!isChartOfCalculationTypes && !item.Code) {
            alert('Заполните обязательные поля: Имя и Код');
            return;
        }
        onSave(item);
    };
    const selfCalcRef = isChartOfCalculationTypes && chartOfCalculationTypesData?.currentPlanName && item.Name
        ? `ChartOfCalculationTypes.${chartOfCalculationTypesData.currentPlanName}.${item.Name}`
        : undefined;
    const calcTabLabels = {
        main: 'Основное',
        displaced: 'Вытесняющие',
        leading: 'Ведущие',
        base: 'Базовые'
    };
    return (react_1.default.createElement("div", { className: "attribute-card", style: {
            border: showInModal ? '1px solid var(--vscode-panel-border)' : '2px solid var(--vscode-focusBorder)',
            padding: showInModal ? '0' : undefined
        } },
        react_1.default.createElement("div", { className: "attribute-header" },
            !showInModal && react_1.default.createElement("h4", null, "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430"),
            react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                react_1.default.createElement("button", { className: "btn-edit-type", type: "button", onClick: handleSave, title: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C", "aria-label": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C", style: {
                        padding: '4px 8px',
                        fontSize: '12px',
                        background: 'var(--vscode-button-background)',
                        color: 'var(--vscode-button-foreground)',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                    } }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"),
                react_1.default.createElement("button", { className: "btn-edit-type", type: "button", onClick: onCancel, title: "\u041E\u0442\u043C\u0435\u043D\u0430", "aria-label": "\u041E\u0442\u043C\u0435\u043D\u0430", style: {
                        padding: '4px 8px',
                        fontSize: '12px',
                        background: 'var(--vscode-button-secondaryBackground)',
                        color: 'var(--vscode-button-secondaryForeground)',
                        border: '1px solid var(--vscode-button-border)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                    } }, "\u041E\u0442\u043C\u0435\u043D\u0430"))),
        react_1.default.createElement("div", { className: "attribute-properties" },
            react_1.default.createElement("div", { className: "property-row" },
                react_1.default.createElement("span", { className: "property-name" }, "\u0418\u043C\u044F: *"),
                react_1.default.createElement("input", { type: "text", value: item.Name || '', onChange: (e) => onChange({ ...item, Name: e.target.value }), placeholder: "\u0418\u043C\u044F", style: {
                        padding: '4px 8px',
                        border: '1px solid var(--vscode-input-border)',
                        background: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        borderRadius: '3px',
                        fontSize: '12px',
                        flex: 1
                    } })),
            react_1.default.createElement("div", { className: "property-row" },
                react_1.default.createElement("span", { className: "property-name" },
                    "\u041A\u043E\u0434:",
                    !isChartOfCalculationTypes ? ' *' : ''),
                react_1.default.createElement("input", { type: "text", value: item.Code || '', onChange: (e) => onChange({ ...item, Code: e.target.value }), placeholder: "\u041A\u043E\u0434", style: {
                        padding: '4px 8px',
                        border: '1px solid var(--vscode-input-border)',
                        background: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        borderRadius: '3px',
                        fontSize: '12px',
                        flex: 1
                    } })),
            react_1.default.createElement("div", { className: "property-row" },
                react_1.default.createElement("span", { className: "property-name" }, "\u041D\u0430\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0435:"),
                react_1.default.createElement("input", { type: "text", value: item.Description || '', onChange: (e) => onChange({ ...item, Description: e.target.value }), placeholder: "\u041D\u0430\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0435", style: {
                        padding: '4px 8px',
                        border: '1px solid var(--vscode-input-border)',
                        background: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        borderRadius: '3px',
                        fontSize: '12px',
                        flex: 1
                    } })),
            isChartOfCalculationTypes && (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("div", { style: {
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginTop: '8px',
                        marginBottom: '8px'
                    } }, Object.keys(calcTabLabels).map((t) => (react_1.default.createElement("button", { key: t, type: "button", onClick: () => setCalcTab(t), style: {
                        padding: '4px 10px',
                        fontSize: '12px',
                        borderRadius: '3px',
                        border: calcTab === t
                            ? '1px solid var(--vscode-focusBorder)'
                            : '1px solid var(--vscode-button-border)',
                        background: calcTab === t ? 'var(--vscode-button-background)' : 'var(--vscode-button-secondaryBackground)',
                        color: calcTab === t ? 'var(--vscode-button-foreground)' : 'var(--vscode-button-secondaryForeground)',
                        cursor: 'pointer'
                    } }, calcTabLabels[t])))),
                calcTab === 'main' && (react_1.default.createElement("div", { className: "property-row" },
                    react_1.default.createElement("span", { className: "property-name" }, "\u0411\u0430\u0437\u043E\u0432\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434:"),
                    react_1.default.createElement("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' } },
                        react_1.default.createElement("input", { type: "checkbox", checked: item.ActionPeriodIsBase === true, onChange: (e) => onChange({ ...item, ActionPeriodIsBase: e.target.checked }) }),
                        react_1.default.createElement("span", null, item.ActionPeriodIsBase ? 'Да' : 'Нет')))),
                calcTab === 'displaced' && (react_1.default.createElement(CalculationTypeRefsPane, { groups: chartOfCalculationTypesData?.groups ?? [], value: item.Displaced || [], excludeRef: selfCalcRef, onChange: (refs) => onChange({ ...item, Displaced: refs }) })),
                calcTab === 'leading' && (react_1.default.createElement(CalculationTypeRefsPane, { groups: chartOfCalculationTypesData?.groups ?? [], value: item.Leading || [], excludeRef: selfCalcRef, onChange: (refs) => onChange({ ...item, Leading: refs }) })),
                calcTab === 'base' && (react_1.default.createElement(CalculationTypeRefsPane, { groups: chartOfCalculationTypesData?.groups ?? [], value: item.Base || [], excludeRef: selfCalcRef, onChange: (refs) => onChange({ ...item, Base: refs }) })))),
            isChartOfCharacteristicTypes && (react_1.default.createElement("div", { className: "property-row" },
                react_1.default.createElement("span", { className: "property-name" }, "\u0422\u0438\u043F:"),
                react_1.default.createElement("div", { style: { display: 'flex', gap: '8px', alignItems: 'center', flex: 1 } },
                    react_1.default.createElement("input", { type: "text", value: item.Type || '', readOnly: true, placeholder: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430 \u0442\u0438\u043F\u0430", style: {
                            padding: '4px 8px',
                            border: '1px solid var(--vscode-input-border)',
                            background: 'var(--vscode-input-background)',
                            color: 'var(--vscode-input-foreground)',
                            borderRadius: '3px',
                            fontSize: '12px',
                            flex: 1,
                            fontFamily: 'monospace'
                        } }),
                    react_1.default.createElement("button", { type: "button", onClick: () => onOpenTypeModal('edit', item.Type || ''), title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0442\u0438\u043F\u043E\u0432", "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0442\u0438\u043F\u043E\u0432", style: {
                            padding: '4px 8px',
                            background: 'var(--vscode-button-secondaryBackground)',
                            color: 'var(--vscode-button-secondaryForeground)',
                            border: '1px solid var(--vscode-button-border)',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            whiteSpace: 'nowrap'
                        } }, "\u0412\u044B\u0431\u0440\u0430\u0442\u044C")))),
            isChartOfAccounts && (react_1.default.createElement(react_1.default.Fragment, null,
                item.Parent && (react_1.default.createElement("div", { className: "property-row" },
                    react_1.default.createElement("span", { className: "property-name" }, "\u0420\u043E\u0434\u0438\u0442\u0435\u043B\u044C:"),
                    react_1.default.createElement("input", { type: "text", value: item.Parent, readOnly: true, style: {
                            padding: '4px 8px',
                            border: '1px solid var(--vscode-input-border)',
                            background: 'var(--vscode-input-background)',
                            color: 'var(--vscode-input-foreground)',
                            borderRadius: '3px',
                            fontSize: '12px',
                            flex: 1,
                            opacity: 0.7,
                            cursor: 'not-allowed'
                        } }))),
                react_1.default.createElement("div", { className: "property-row" },
                    react_1.default.createElement("span", { className: "property-name" }, "\u0412\u0438\u0434:"),
                    react_1.default.createElement("select", { value: item.AccountType || '', onChange: (e) => onChange({ ...item, AccountType: e.target.value }), className: "predefined-select-inline" },
                        react_1.default.createElement("option", { value: "" }, "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"),
                        react_1.default.createElement("option", { value: "Active" }, "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0439"),
                        react_1.default.createElement("option", { value: "Passive" }, "\u041F\u0430\u0441\u0441\u0438\u0432\u043D\u044B\u0439"),
                        react_1.default.createElement("option", { value: "ActivePassive" }, "\u0410\u043A\u0442\u0438\u0432\u043D\u043E-\u041F\u0430\u0441\u0441\u0438\u0432\u043D\u044B\u0439"))),
                react_1.default.createElement("div", { className: "property-row" },
                    react_1.default.createElement("span", { className: "property-name" }, "\u0417\u0430\u0431\u0430\u043B\u0430\u043D\u0441\u043E\u0432\u044B\u0439:"),
                    react_1.default.createElement("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' } },
                        react_1.default.createElement("input", { type: "checkbox", checked: item.OffBalance || false, onChange: (e) => onChange({ ...item, OffBalance: e.target.checked }), style: { cursor: 'pointer' } }),
                        react_1.default.createElement("span", null, item.OffBalance ? 'Да' : 'Нет'))),
                react_1.default.createElement("div", { className: "property-row" },
                    react_1.default.createElement("span", { className: "property-name" }, "\u041F\u043E\u0440\u044F\u0434\u043E\u043A:"),
                    react_1.default.createElement("input", { type: "text", value: item.Order || '', onChange: (e) => onChange({ ...item, Order: e.target.value }), placeholder: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A", style: {
                            padding: '4px 8px',
                            border: '1px solid var(--vscode-input-border)',
                            background: 'var(--vscode-input-background)',
                            color: 'var(--vscode-input-foreground)',
                            borderRadius: '3px',
                            fontSize: '12px',
                            flex: 1
                        } })),
                chartOfAccountsData && (react_1.default.createElement(react_1.default.Fragment, null,
                    react_1.default.createElement(AccountingFlagsTable_1.AccountingFlagsTable, { accountingFlags: chartOfAccountsData.accountingFlags, item: item, onChange: onChange }),
                    react_1.default.createElement(ExtDimensionTypesTable_1.ExtDimensionTypesTable, { dimensionTypes: chartOfAccountsData.dimensionTypes, extDimensionAccountingFlags: chartOfAccountsData.extDimensionAccountingFlags, item: item, onChange: onChange }))))),
            react_1.default.createElement("div", { className: "property-row" },
                react_1.default.createElement("span", { className: "property-name" }, "\u041F\u0430\u043F\u043A\u0430:"),
                react_1.default.createElement("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' } },
                    react_1.default.createElement("input", { type: "checkbox", checked: item.IsFolder || false, onChange: (e) => onChange({ ...item, IsFolder: e.target.checked }), style: { cursor: 'pointer' } }),
                    react_1.default.createElement("span", null, item.IsFolder ? 'Да' : 'Нет'))))));
};
//# sourceMappingURL=PredefinedEditorApp.js.map
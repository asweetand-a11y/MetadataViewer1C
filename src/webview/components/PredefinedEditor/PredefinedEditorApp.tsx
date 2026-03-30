/**
 * Редактор предопределенных элементов
 * Отображает иерархию плоской таблицей с отступами; редактирование — в модальном окне.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PredefinedDataItem } from '../../../predefinedDataInterfaces';
import { insertItemUnderParent } from '../../../utils/predefinedTreeMutations';
import { PredefinedTypeEditorModal } from './PredefinedTypeEditorModal';
import { AccountingFlagsTable } from './AccountingFlagsTable';
import { ExtDimensionTypesTable } from './ExtDimensionTypesTable';
import '../../styles/editor.css';
import './PredefinedEditorApp.css';

interface PredefinedEditorAppProps {
  vscode: any;
}

interface ChartOfAccountsData {
  accountingFlags: string[];
  extDimensionAccountingFlags: string[];
  dimensionTypes: Array<{
    name: string;
    chartOfCharacteristicTypesName: string;
    predefinedItems: string[];
  }>;
}

/** Контекст ссылок для предопределённых видов расчёта (все планы в конфигурации). */
interface ChartOfCalculationTypesData {
  currentPlanName: string;
  groups: Array<{ chartName: string; refs: string[] }>;
}

interface InitMessage {
  type: 'init';
  payload: PredefinedDataItem[];
  objectType?: string;
  metadata?: {
    registers: string[];
    referenceTypes: string[];
  };
  chartOfAccountsData?: ChartOfAccountsData;
  chartOfCalculationTypesData?: ChartOfCalculationTypesData;
}

/** Плоская строка дерева для таблицы предопределённых элементов */
interface FlatPredefinedRow {
  item: PredefinedDataItem;
  path: number[];
  depth: number;
}

/** Рекурсивно разворачивает дерево Item в плоский список с путём и глубиной */
function pathsEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

interface ParentPathComboboxProps {
  value: number[];
  flatRows: FlatPredefinedRow[];
  onChange: (path: number[]) => void;
}

/** Кастомный выбор родителя: нативный select в webview на Windows даёт белый список опций. */
function ParentPathCombobox({ value, flatRows, onChange }: ParentPathComboboxProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const currentLabel =
    value.length === 0
      ? '(Верхний уровень)'
      : (() => {
          const row = flatRows.find((r) => pathsEqual(r.path, value));
          return row ? `${row.item.Code} ${row.item.Name}` : value.join('.');
        })();

  return (
    <div className="predefined-combobox" ref={wrapRef}>
      <button
        type="button"
        className="predefined-combobox-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="predefined-combobox-value">{currentLabel}</span>
        <span className="predefined-combobox-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul className="predefined-combobox-list" role="listbox">
          <li
            role="option"
            aria-selected={value.length === 0}
            className={value.length === 0 ? 'is-selected' : undefined}
            onClick={() => {
              onChange([]);
              setOpen(false);
            }}
          >
            (Верхний уровень)
          </li>
          {flatRows.map(({ item: pItem, path: pPath, depth: pDepth }) => {
            const selected = pathsEqual(pPath, value);
            return (
              <li
                key={pPath.join('-')}
                role="option"
                aria-selected={selected}
                className={selected ? 'is-selected' : undefined}
                style={{ paddingLeft: `${10 + pDepth * 14}px` }}
                onClick={() => {
                  onChange(pPath);
                  setOpen(false);
                }}
              >
                {`${'\u2014 '.repeat(pDepth)}${pItem.Code} ${pItem.Name}`}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function flattenPredefinedItems(items: PredefinedDataItem[]): FlatPredefinedRow[] {
  const out: FlatPredefinedRow[] = [];
  function walk(list: PredefinedDataItem[], prefixPath: number[], depth: number): void {
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
function copyPredefinedItemForEdit(source: PredefinedDataItem): PredefinedDataItem {
  return {
    ...source,
    Displaced: source.Displaced ? [...source.Displaced] : source.Displaced,
    Leading: source.Leading ? [...source.Leading] : source.Leading,
    Base: source.Base ? [...source.Base] : source.Base,
    AccountingFlags:
      source.AccountingFlags && source.AccountingFlags.length > 0
        ? source.AccountingFlags.map((flag) => ({
            flagName: flag.flagName,
            enabled: flag.enabled,
            ref: flag.ref
          }))
        : source.AccountingFlags,
    ExtDimensionTypes:
      source.ExtDimensionTypes && source.ExtDimensionTypes.length > 0
        ? source.ExtDimensionTypes.map((dimType) => {
            const copiedFlags: Record<string, boolean | { enabled: boolean; ref?: string }> = {};
            if (dimType.flags) {
              Object.entries(dimType.flags).forEach(([key, value]) => {
                if (typeof value === 'boolean') {
                  copiedFlags[key] = value;
                } else if (value && typeof value === 'object' && 'enabled' in value) {
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

function accountTypeLabel(v: string | undefined): string {
  if (!v) return '—';
  if (v === 'Active') return 'Активный';
  if (v === 'Passive') return 'Пассивный';
  if (v === 'ActivePassive') return 'Активно-пассивный';
  return v;
}

/** Чекбоксы полных ссылок ChartOfCalculationTypes.<План>.<Имя> по группам планов. */
function CalculationTypeRefsPane(props: {
  groups: Array<{ chartName: string; refs: string[] }>;
  value: string[];
  excludeRef?: string;
  onChange: (refs: string[]) => void;
}): React.ReactElement {
  const { groups, value, excludeRef, onChange } = props;
  const selected = new Set(value);
  const toggle = (ref: string) => {
    const next = new Set(selected);
    if (next.has(ref)) {
      next.delete(ref);
    } else {
      next.add(ref);
    }
    onChange([...next]);
  };
  if (!groups.length) {
    return (
      <div style={{ padding: '8px', color: 'var(--vscode-descriptionForeground)', fontSize: '12px' }}>
        Нет данных о планах видов расчёта (каталог ChartsOfCalculationTypes недоступен или пуст).
      </div>
    );
  }
  return (
    <div style={{ maxHeight: '320px', overflowY: 'auto', fontSize: '12px' }}>
      {groups.map((g) => (
        <div key={g.chartName} style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>{g.chartName}</div>
          {g.refs
            .filter((r) => !excludeRef || r !== excludeRef)
            .map((r) => {
              const short = r.split('.').pop() || r;
              return (
                <label
                  key={r}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px', marginBottom: '4px', cursor: 'pointer' }}
                >
                  <input type="checkbox" checked={selected.has(r)} onChange={() => toggle(r)} />
                  <span title={r}>{short}</span>
                </label>
              );
            })}
        </div>
      ))}
    </div>
  );
}

interface PredefinedTableProps {
  rows: FlatPredefinedRow[];
  isChartOfAccounts: boolean;
  isChartOfCharacteristicTypes: boolean;
  collapsedPathKeys: Set<string>;
  onToggleBranch: (path: number[]) => void;
  onEditPath: (path: number[]) => void;
  onDeletePath: (path: number[]) => void;
}

function rowHasChildren(item: PredefinedDataItem): boolean {
  return !!(item.ChildItems?.Item && item.ChildItems.Item.length > 0);
}

/** Таблица предопределённых элементов с иерархией по отступам и сворачиванием веток */
const PredefinedTable: React.FC<PredefinedTableProps> = ({
  rows,
  isChartOfAccounts,
  isChartOfCharacteristicTypes,
  collapsedPathKeys,
  onToggleBranch,
  onEditPath,
  onDeletePath
}) => {
  const visibleRows = useMemo(() => {
    return rows.filter(({ path }) => {
      for (let d = 0; d < path.length - 1; d++) {
        const prefixKey = path.slice(0, d + 1).join(',');
        if (collapsedPathKeys.has(prefixKey)) return false;
      }
      return true;
    });
  }, [rows, collapsedPathKeys]);

  return (
    <div className="predefined-table-wrap">
      <table className="predefined-flat-table">
        <thead>
          <tr>
            <th className="col-code">Код</th>
            <th className="col-name">Наименование</th>
            {isChartOfCharacteristicTypes && <th className="col-type">Тип</th>}
            {isChartOfAccounts && (
              <>
                <th className="col-account-type">Вид</th>
                <th className="col-off">Забалансовый</th>
                <th className="col-order">Порядок</th>
              </>
            )}
            <th className="col-folder">Папка</th>
            <th className="col-actions">Действия</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map(({ item, path, depth }) => {
            const rowKey = item.id
              ? `${path.join('-')}-${item.id}`
              : `${path.join('-')}-${item.Code}-${item.Name}`;
            const pathKey = path.join(',');
            const hasKids = rowHasChildren(item);
            const branchCollapsed = collapsedPathKeys.has(pathKey);
            const typePreview =
              item.Type && item.Type.length > 48 ? `${item.Type.slice(0, 48)}…` : item.Type || '';
            return (
              <tr key={rowKey}>
                <td className="col-code">{item.Code}</td>
                <td className="col-name">
                  <span
                    className="predefined-name-cell"
                    style={{ paddingLeft: depth * 20 }}
                    title={item.Description || item.Name}
                  >
                    {hasKids ? (
                      <button
                        type="button"
                        className="predefined-tree-toggle"
                        aria-expanded={!branchCollapsed}
                        aria-label={branchCollapsed ? 'Развернуть дочерние элементы' : 'Свернуть дочерние элементы'}
                        title={branchCollapsed ? 'Развернуть' : 'Свернуть'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBranch(path);
                        }}
                      >
                        {branchCollapsed ? '▶' : '▼'}
                      </button>
                    ) : (
                      <span className="predefined-tree-toggle-placeholder" aria-hidden />
                    )}
                    <span className="predefined-icon" aria-hidden>
                      {item.IsFolder ? '📁' : '📄'}
                    </span>
                    <span className="predefined-name-text">{item.Name}</span>
                  </span>
                </td>
                {isChartOfCharacteristicTypes && (
                  <td className="col-type predefined-type-cell" title={item.Type || ''}>
                    {typePreview || '—'}
                  </td>
                )}
                {isChartOfAccounts && (
                  <>
                    <td className="col-account-type">{accountTypeLabel(item.AccountType)}</td>
                    <td className="col-off">{item.OffBalance === undefined ? '—' : item.OffBalance ? 'Да' : 'Нет'}</td>
                    <td className="col-order">{item.Order || '—'}</td>
                  </>
                )}
                <td className="col-folder">{item.IsFolder ? 'Да' : 'Нет'}</td>
                <td className="col-actions">
                  <button
                    type="button"
                    className="btn-edit-type predefined-table-action"
                    onClick={() => onEditPath(path)}
                    title="Редактировать"
                    aria-label="Редактировать"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="btn-edit-type predefined-table-action predefined-table-action-delete"
                    onClick={() => onDeletePath(path)}
                    title="Удалить"
                    aria-label="Удалить"
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const PredefinedEditorApp: React.FC<PredefinedEditorAppProps> = ({ vscode }) => {
  const [items, setItems] = useState<PredefinedDataItem[]>([]);
  const [editingItem, setEditingItem] = useState<PredefinedDataItem | null>(null);
  const [editingChild, setEditingChild] = useState<{ path: number[] } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleteChild, setDeleteChild] = useState<{ path: number[] } | null>(null);
  const [objectType, setObjectType] = useState<string>('');
  const [metadata, setMetadata] = useState<{ registers: string[]; referenceTypes: string[] }>({
    registers: [],
    referenceTypes: []
  });
  const [chartOfAccountsData, setChartOfAccountsData] = useState<ChartOfAccountsData | undefined>(undefined);
  const [chartOfCalculationTypesData, setChartOfCalculationTypesData] = useState<
    ChartOfCalculationTypesData | undefined
  >(undefined);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeModalContext, setTypeModalContext] = useState<{ mode: 'add' | 'edit'; currentType: string }>({ 
    mode: 'add', 
    currentType: '' 
  });
  const [newItem, setNewItem] = useState<Partial<PredefinedDataItem>>({
    Name: '',
    Code: '',
    Description: '',
    Type: '',
    IsFolder: false
  });
  /** Путь к родителю при добавлении ([] — корень, как в XML) */
  const [addParentPath, setAddParentPath] = useState<number[]>([]);
  /** Ключи path.join(',') свёрнутых узлов (дочерние строки скрыты) */
  const [collapsedPathKeys, setCollapsedPathKeys] = useState<Set<string>>(() => new Set());

  const toggleBranchCollapsed = useCallback((path: number[]) => {
    const k = path.join(',');
    setCollapsedPathKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  /** Раскрыть все предки пути (после добавления в свёрнутую ветку новый элемент виден) */
  const expandAncestorsOfPath = useCallback((parentPath: number[]) => {
    if (parentPath.length === 0) return;
    setCollapsedPathKeys((prev) => {
      const next = new Set(prev);
      for (let d = 0; d < parentPath.length; d++) {
        next.delete(parentPath.slice(0, d + 1).join(','));
      }
      return next;
    });
  }, []);

  // Проверка, является ли объект планом видов характеристик
  const isChartOfCharacteristicTypes = useMemo(() => {
    return objectType === 'ChartOfCharacteristicTypes' || 
           objectType === 'План видов характеристик' ||
           objectType.includes('ChartOfCharacteristicTypes');
  }, [objectType]);

  // Проверка, является ли объект планом счетов
  const isChartOfAccounts = useMemo(() => {
    return objectType === 'ChartOfAccounts' || 
           objectType === 'План счетов' ||
           objectType.includes('ChartOfAccounts');
  }, [objectType]);

  const isChartOfCalculationTypes = useMemo(() => {
    return (
      objectType === 'ChartOfCalculationTypes' ||
      objectType === 'План видов расчета' ||
      objectType.includes('ChartOfCalculationTypes')
    );
  }, [objectType]);

  const flatRows = useMemo(() => flattenPredefinedItems(items), [items]);

  // Обработка сообщений от extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('[PredefinedEditorApp] Получено сообщение:', message.type, 'элементов:', message.payload?.length || 0);
      
      if (message.type === 'init') {
        const initMsg = message as InitMessage;
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
        } else {
          console.warn('[PredefinedEditorApp] Данные плана счетов не получены');
        }
        if (initMsg.chartOfCalculationTypesData) {
          setChartOfCalculationTypesData(initMsg.chartOfCalculationTypesData);
        } else {
          setChartOfCalculationTypesData(undefined);
        }
      } else if (message.type === 'saved') {
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
    const itemToAdd: PredefinedDataItem = {
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
      Displaced:
        isChartOfCalculationTypes && newItem.Displaced?.length
          ? [...newItem.Displaced]
          : isChartOfCalculationTypes
            ? []
            : undefined,
      Leading:
        isChartOfCalculationTypes && newItem.Leading?.length
          ? [...newItem.Leading]
          : isChartOfCalculationTypes
            ? []
            : undefined,
      Base:
        isChartOfCalculationTypes && newItem.Base?.length
          ? [...newItem.Base]
          : isChartOfCalculationTypes
            ? []
            : undefined
    };
    const updatedItems = insertItemUnderParent(items, addParentPath, itemToAdd);
    setItems(updatedItems);
    expandAncestorsOfPath(addParentPath);
    vscode.postMessage({ type: 'addItem', payload: { item: itemToAdd, parentPath: addParentPath } });
    setNewItem({ Name: '', Code: '', Description: '', Type: '', IsFolder: false });
    setAddParentPath([]);
    setShowAddModal(false);
  };

  /** Получить элемент по пути [rootIndex, childIndex1, childIndex2, ...] */
  const getItemByPath = (itemsList: PredefinedDataItem[], path: number[]): PredefinedDataItem | null => {
    if (path.length === 0) return null;
    let current: PredefinedDataItem | undefined = itemsList[path[0]];
    for (let i = 1; i < path.length; i++) {
      if (!current?.ChildItems?.Item) return null;
      current = current.ChildItems.Item[path[i]];
    }
    return current ?? null;
  };

  /** Обновить вложенный элемент по относительному пути (path без rootIndex) */
  const updateItemAtPath = (
    item: PredefinedDataItem,
    relPath: number[],
    newValue: PredefinedDataItem
  ): PredefinedDataItem | null => {
    if (relPath.length === 0) return newValue;
    const [first, ...rest] = relPath;
    if (!item.ChildItems?.Item || first >= item.ChildItems.Item.length) return null;
    const updatedChildren = [...item.ChildItems.Item];
    const updatedChild = updateItemAtPath(updatedChildren[first], rest, newValue);
    if (!updatedChild) return null;
    updatedChildren[first] = updatedChild;
    return { ...item, ChildItems: { Item: updatedChildren } };
  };

  /** Удалить вложенный элемент по относительному пути */
  const removeItemAtPath = (
    item: PredefinedDataItem,
    relPath: number[]
  ): PredefinedDataItem | null => {
    if (relPath.length === 0) return null;
    if (relPath.length === 1) {
      const idx = relPath[0];
      if (!item.ChildItems?.Item || idx >= item.ChildItems.Item.length) return null;
      const updatedChildren = item.ChildItems.Item.filter((_, i) => i !== idx);
      if (updatedChildren.length === 0) {
        const { ChildItems, ...rest } = item;
        return rest as PredefinedDataItem;
      }
      return { ...item, ChildItems: { Item: updatedChildren } };
    }
    const [first, ...rest] = relPath;
    if (!item.ChildItems?.Item || first >= item.ChildItems.Item.length) return null;
    const updatedChildren = [...item.ChildItems.Item];
    const updatedChild = removeItemAtPath(updatedChildren[first], rest);
    if (updatedChild === null) return null;
    updatedChildren[first] = updatedChild;
    return { ...item, ChildItems: { Item: updatedChildren } };
  };

  /** Открыть редактирование элемента по пути (корень или вложенный) */
  const handleEditByPath = (path: number[]) => {
    if (path.length < 1) return;
    const target = getItemByPath(items, path);
    if (!target) return;
    setEditingChild({ path });
    setEditingItem(copyPredefinedItemForEdit(target));
  };

  const handleUpdate = (updatedItem: PredefinedDataItem) => {
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
      const updatedChildItem: PredefinedDataItem = {
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
      } else {
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

  const handleDelete = (index: number) => {
    setDeleteIndex(index);
    setDeleteChild(null);
    setShowDeleteConfirm(true);
  };

  const handleDeleteChild = (path: number[]) => {
    if (path.length < 2) return;
    setDeleteChild({ path });
    setDeleteIndex(null);
    setShowDeleteConfirm(true);
  };

  /** Удаление по пути: корень или вложенный элемент */
  const handleDeleteByPath = (path: number[]) => {
    if (path.length === 1) {
      handleDelete(path[0]);
    } else {
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
    } else if (deleteIndex !== null) {
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

  const handleOpenTypeModal = (mode: 'add' | 'edit', currentType: string = '') => {
    setTypeModalContext({ mode, currentType });
    setShowTypeModal(true);
  };

  const handleTypeSave = (selectedType: string) => {
    if (typeModalContext.mode === 'add') {
      setNewItem({ ...newItem, Type: selectedType });
    } else if (typeModalContext.mode === 'edit' && editingItem) {
      setEditingItem({ ...editingItem, Type: selectedType });
    }
    setShowTypeModal(false);
  };

  return (
    <div className="predefined-editor-wrapper">
      <div className="predefined-editor">
      <div className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>Предопределенные элементы</h2>
          <span style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)' }}>
            Элементы ({items.length})
          </span>
        </div>
        <div className="header-actions">
          <button className="btn-add" onClick={() => setShowAddModal(true)}>Добавить</button>
          <button className="btn-save" onClick={handleSave}>Сохранить</button>
        </div>
      </div>

      <div className="editor-content">
        {showAddModal && (
          <div className="modal-overlay" onClick={() => { 
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
          }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Добавить элемент</h3>
              <div className="modal-content">
                <label className="predefined-combobox-label">
                  Родитель:
                  <ParentPathCombobox value={addParentPath} flatRows={flatRows} onChange={setAddParentPath} />
                </label>
                <label>
                  Имя: *
                  <input 
                    type="text" 
                    value={newItem.Name || ''} 
                    onChange={(e) => setNewItem({...newItem, Name: e.target.value})} 
                  />
                </label>
                <label>
                  Код:{!isChartOfCalculationTypes ? ' *' : ''}
                  <input 
                    type="text" 
                    value={newItem.Code || ''} 
                    onChange={(e) => setNewItem({...newItem, Code: e.target.value})} 
                  />
                </label>
                <label>
                  Наименование:
                  <input 
                    type="text" 
                    value={newItem.Description || ''} 
                    onChange={(e) => setNewItem({...newItem, Description: e.target.value})} 
                  />
                </label>
                {isChartOfCharacteristicTypes && (
                  <label>
                    Тип:
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        value={newItem.Type || ''} 
                        readOnly
                        placeholder="Нажмите кнопку для выбора типа"
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button"
                        onClick={() => handleOpenTypeModal('add', newItem.Type || '')}
                        title="Открыть редактор типов"
                        aria-label="Открыть редактор типов"
                        style={{
                          padding: '6px 12px',
                          background: 'var(--vscode-button-secondaryBackground)',
                          color: 'var(--vscode-button-secondaryForeground)',
                          border: '1px solid var(--vscode-button-border)',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Выбрать тип
                      </button>
                    </div>
                  </label>
                )}
                {isChartOfCalculationTypes && (
                  <>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newItem.ActionPeriodIsBase === true}
                        onChange={(e) => setNewItem({ ...newItem, ActionPeriodIsBase: e.target.checked })}
                      />
                      Базовый период действия
                    </label>
                    <p style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', margin: '4px 0 0' }}>
                      Связи вытесняющих, ведущих и базовых видов задайте после добавления через «Редактировать».
                    </p>
                  </>
                )}
                {isChartOfAccounts && (
                  <>
                    <label>
                      Вид:
                      <select
                        value={newItem.AccountType || ''}
                        onChange={(e) => setNewItem({...newItem, AccountType: e.target.value as 'Active' | 'Passive' | 'ActivePassive' | undefined})}
                      >
                        <option value="">Не указан</option>
                        <option value="Active">Активный</option>
                        <option value="Passive">Пассивный</option>
                        <option value="ActivePassive">Активно-Пассивный</option>
                      </select>
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={newItem.OffBalance || false} 
                        onChange={(e) => setNewItem({...newItem, OffBalance: e.target.checked})} 
                      />
                      Забалансовый
                    </label>
                    <label>
                      Порядок:
                      <input 
                        type="text" 
                        value={newItem.Order || ''} 
                        onChange={(e) => setNewItem({...newItem, Order: e.target.value})} 
                        placeholder="Порядок"
                      />
                    </label>
                    {chartOfAccountsData && (
                      <>
                        <div style={{ marginTop: '12px', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                          Признаки учета:
                        </div>
                        <AccountingFlagsTable
                          accountingFlags={chartOfAccountsData.accountingFlags}
                          item={newItem as PredefinedDataItem}
                          onChange={(item) => setNewItem(item)}
                        />
                        <div style={{ marginTop: '12px', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                          Виды субконто:
                        </div>
                        <ExtDimensionTypesTable
                          dimensionTypes={chartOfAccountsData.dimensionTypes}
                          extDimensionAccountingFlags={chartOfAccountsData.extDimensionAccountingFlags}
                          item={newItem as PredefinedDataItem}
                          onChange={(item) => setNewItem(item)}
                        />
                      </>
                    )}
                  </>
                )}
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={newItem.IsFolder || false} 
                    onChange={(e) => setNewItem({...newItem, IsFolder: e.target.checked})} 
                  />
                  Папка
                </label>
              </div>
              <div className="modal-actions">
                <button className="btn-primary" onClick={handleAdd}>Добавить</button>
                <button 
                  className="btn-secondary" 
                  onClick={() => { 
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
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty-state">
            Для данного объекта предопределенные элементы не созданы
          </div>
        ) : (
          <PredefinedTable
            rows={flatRows}
            isChartOfAccounts={isChartOfAccounts}
            isChartOfCharacteristicTypes={isChartOfCharacteristicTypes}
            collapsedPathKeys={collapsedPathKeys}
            onToggleBranch={toggleBranchCollapsed}
            onEditPath={handleEditByPath}
            onDeletePath={handleDeleteByPath}
          />
        )}

        {showTypeModal && (
          <PredefinedTypeEditorModal
            isOpen={showTypeModal}
            typeValue={typeModalContext.currentType || null}
            metadata={metadata}
            onClose={() => setShowTypeModal(false)}
            onSave={handleTypeSave}
          />
        )}

        {editingChild && editingItem && (
          <div className="modal-overlay" onClick={handleCancelEdit}>
            <div 
              className="modal edit-item-modal" 
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: isChartOfCalculationTypes ? '680px' : '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
            >
              <h3 style={{ marginBottom: '16px' }}>
                Редактирование: {editingItem.Name || 'Элемент'}
              </h3>
              <EditItemCard
                item={editingItem}
                isChartOfCharacteristicTypes={isChartOfCharacteristicTypes}
                isChartOfAccounts={isChartOfAccounts}
                isChartOfCalculationTypes={isChartOfCalculationTypes}
                chartOfAccountsData={chartOfAccountsData}
                chartOfCalculationTypesData={chartOfCalculationTypesData}
                onSave={handleUpdate}
                onCancel={handleCancelEdit}
                onChange={setEditingItem}
                onOpenTypeModal={handleOpenTypeModal}
                showInModal
              />
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={handleCancelDelete}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <h3>Подтверждение удаления</h3>
              <div className="modal-content">
                <p>Вы уверены, что хотите удалить этот элемент?</p>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn-primary" 
                  onClick={handleConfirmDelete} 
                  style={{ background: 'var(--vscode-errorForeground)' }}
                >
                  Удалить
                </button>
                <button className="btn-secondary" onClick={handleCancelDelete}>Отмена</button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

type CalcPredefinedEditorTab = 'main' | 'displaced' | 'leading' | 'base';

interface EditItemCardProps {
  item: PredefinedDataItem | null;
  isChartOfCharacteristicTypes: boolean;
  isChartOfAccounts: boolean;
  isChartOfCalculationTypes?: boolean;
  chartOfAccountsData?: ChartOfAccountsData;
  chartOfCalculationTypesData?: ChartOfCalculationTypesData;
  onSave: (item: PredefinedDataItem) => void;
  onCancel: () => void;
  onChange: (item: PredefinedDataItem) => void;
  onOpenTypeModal: (mode: 'add' | 'edit', currentType?: string) => void;
  showInModal?: boolean;
}

const EditItemCard: React.FC<EditItemCardProps> = ({ 
  item, 
  isChartOfCharacteristicTypes,
  isChartOfAccounts,
  isChartOfCalculationTypes = false,
  chartOfAccountsData,
  chartOfCalculationTypesData,
  onSave, 
  onCancel, 
  onChange,
  onOpenTypeModal,
  showInModal = false
}) => {
  const [calcTab, setCalcTab] = useState<CalcPredefinedEditorTab>('main');

  useEffect(() => {
    setCalcTab('main');
  }, [item?.id, item?.Name]);

  if (!item) return null;

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

  const selfCalcRef =
    isChartOfCalculationTypes && chartOfCalculationTypesData?.currentPlanName && item.Name
      ? `ChartOfCalculationTypes.${chartOfCalculationTypesData.currentPlanName}.${item.Name}`
      : undefined;

  const calcTabLabels: Record<CalcPredefinedEditorTab, string> = {
    main: 'Основное',
    displaced: 'Вытесняющие',
    leading: 'Ведущие',
    base: 'Базовые'
  };

  return (
    <div 
      className="attribute-card" 
      style={{ 
        border: showInModal ? '1px solid var(--vscode-panel-border)' : '2px solid var(--vscode-focusBorder)',
        padding: showInModal ? '0' : undefined
      }}
    >
      <div className="attribute-header">
        {!showInModal && <h4>Редактирование элемента</h4>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-edit-type"
            type="button"
            onClick={handleSave}
            title="Сохранить"
            aria-label="Сохранить"
            style={{ 
              padding: '4px 8px', 
              fontSize: '12px',
              background: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Сохранить
          </button>
          <button
            className="btn-edit-type"
            type="button"
            onClick={onCancel}
            title="Отмена"
            aria-label="Отмена"
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              background: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: '1px solid var(--vscode-button-border)',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Отмена
          </button>
        </div>
      </div>
      <div className="attribute-properties">
        <div className="property-row">
          <span className="property-name">Имя: *</span>
          <input 
            type="text" 
            value={item.Name || ''} 
            onChange={(e) => onChange({...item, Name: e.target.value})} 
            placeholder="Имя"
            style={{
              padding: '4px 8px',
              border: '1px solid var(--vscode-input-border)',
              background: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              borderRadius: '3px',
              fontSize: '12px',
              flex: 1
            }}
          />
        </div>
        <div className="property-row">
          <span className="property-name">Код:{!isChartOfCalculationTypes ? ' *' : ''}</span>
          <input 
            type="text" 
            value={item.Code || ''} 
            onChange={(e) => onChange({...item, Code: e.target.value})} 
            placeholder="Код"
            style={{
              padding: '4px 8px',
              border: '1px solid var(--vscode-input-border)',
              background: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              borderRadius: '3px',
              fontSize: '12px',
              flex: 1
            }}
          />
        </div>
        <div className="property-row">
          <span className="property-name">Наименование:</span>
          <input 
            type="text" 
            value={item.Description || ''} 
            onChange={(e) => onChange({...item, Description: e.target.value})} 
            placeholder="Наименование"
            style={{
              padding: '4px 8px',
              border: '1px solid var(--vscode-input-border)',
              background: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              borderRadius: '3px',
              fontSize: '12px',
              flex: 1
            }}
          />
        </div>
        {isChartOfCalculationTypes && (
          <>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '8px',
                marginBottom: '8px'
              }}
            >
              {(Object.keys(calcTabLabels) as CalcPredefinedEditorTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCalcTab(t)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    borderRadius: '3px',
                    border:
                      calcTab === t
                        ? '1px solid var(--vscode-focusBorder)'
                        : '1px solid var(--vscode-button-border)',
                    background: calcTab === t ? 'var(--vscode-button-background)' : 'var(--vscode-button-secondaryBackground)',
                    color: calcTab === t ? 'var(--vscode-button-foreground)' : 'var(--vscode-button-secondaryForeground)',
                    cursor: 'pointer'
                  }}
                >
                  {calcTabLabels[t]}
                </button>
              ))}
            </div>
            {calcTab === 'main' && (
              <div className="property-row">
                <span className="property-name">Базовый период:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={item.ActionPeriodIsBase === true}
                    onChange={(e) => onChange({ ...item, ActionPeriodIsBase: e.target.checked })}
                  />
                  <span>{item.ActionPeriodIsBase ? 'Да' : 'Нет'}</span>
                </label>
              </div>
            )}
            {calcTab === 'displaced' && (
              <CalculationTypeRefsPane
                groups={chartOfCalculationTypesData?.groups ?? []}
                value={item.Displaced || []}
                excludeRef={selfCalcRef}
                onChange={(refs) => onChange({ ...item, Displaced: refs })}
              />
            )}
            {calcTab === 'leading' && (
              <CalculationTypeRefsPane
                groups={chartOfCalculationTypesData?.groups ?? []}
                value={item.Leading || []}
                excludeRef={selfCalcRef}
                onChange={(refs) => onChange({ ...item, Leading: refs })}
              />
            )}
            {calcTab === 'base' && (
              <CalculationTypeRefsPane
                groups={chartOfCalculationTypesData?.groups ?? []}
                value={item.Base || []}
                excludeRef={selfCalcRef}
                onChange={(refs) => onChange({ ...item, Base: refs })}
              />
            )}
          </>
        )}
        {isChartOfCharacteristicTypes && (
          <div className="property-row">
            <span className="property-name">Тип:</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
              <input 
                type="text" 
                value={item.Type || ''} 
                readOnly
                placeholder="Нажмите кнопку для выбора типа"
                style={{
                  padding: '4px 8px',
                  border: '1px solid var(--vscode-input-border)',
                  background: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  borderRadius: '3px',
                  fontSize: '12px',
                  flex: 1,
                  fontFamily: 'monospace'
                }}
              />
              <button 
                type="button"
                onClick={() => onOpenTypeModal('edit', item.Type || '')}
                title="Открыть редактор типов"
                aria-label="Открыть редактор типов"
                style={{
                  padding: '4px 8px',
                  background: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: '1px solid var(--vscode-button-border)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  whiteSpace: 'nowrap'
                }}
              >
                Выбрать
              </button>
            </div>
          </div>
        )}
        {isChartOfAccounts && (
          <>
            {item.Parent && (
              <div className="property-row">
                <span className="property-name">Родитель:</span>
                <input 
                  type="text" 
                  value={item.Parent} 
                  readOnly
                  style={{
                    padding: '4px 8px',
                    border: '1px solid var(--vscode-input-border)',
                    background: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    borderRadius: '3px',
                    fontSize: '12px',
                    flex: 1,
                    opacity: 0.7,
                    cursor: 'not-allowed'
                  }}
                />
              </div>
            )}
            <div className="property-row">
              <span className="property-name">Вид:</span>
              <select
                value={item.AccountType || ''}
                onChange={(e) => onChange({...item, AccountType: e.target.value as 'Active' | 'Passive' | 'ActivePassive' | undefined})}
                className="predefined-select-inline"
              >
                <option value="">Не указан</option>
                <option value="Active">Активный</option>
                <option value="Passive">Пассивный</option>
                <option value="ActivePassive">Активно-Пассивный</option>
              </select>
            </div>
            <div className="property-row">
              <span className="property-name">Забалансовый:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={item.OffBalance || false} 
                  onChange={(e) => onChange({...item, OffBalance: e.target.checked})}
                  style={{ cursor: 'pointer' }}
                />
                <span>{item.OffBalance ? 'Да' : 'Нет'}</span>
              </label>
            </div>
            <div className="property-row">
              <span className="property-name">Порядок:</span>
              <input 
                type="text" 
                value={item.Order || ''} 
                onChange={(e) => onChange({...item, Order: e.target.value})} 
                placeholder="Порядок"
                style={{
                  padding: '4px 8px',
                  border: '1px solid var(--vscode-input-border)',
                  background: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  borderRadius: '3px',
                  fontSize: '12px',
                  flex: 1
                }}
              />
            </div>
            {chartOfAccountsData && (
              <>
                <AccountingFlagsTable
                  accountingFlags={chartOfAccountsData.accountingFlags}
                  item={item}
                  onChange={onChange}
                />
                <ExtDimensionTypesTable
                  dimensionTypes={chartOfAccountsData.dimensionTypes}
                  extDimensionAccountingFlags={chartOfAccountsData.extDimensionAccountingFlags}
                  item={item}
                  onChange={onChange}
                />
              </>
            )}
          </>
        )}
        <div className="property-row">
          <span className="property-name">Папка:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={item.IsFolder || false} 
              onChange={(e) => onChange({...item, IsFolder: e.target.checked})}
              style={{ cursor: 'pointer' }}
            />
            <span>{item.IsFolder ? 'Да' : 'Нет'}</span>
          </label>
        </div>
      </div>
    </div>
  );
};

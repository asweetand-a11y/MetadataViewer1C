/**
 * Редактор прав роли 1С — React компонент
 * Интерфейс аналогичен конфигуратору 1С:Предприятие
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './RoleEditorApp.css';

// ─── Типы ────────────────────────────────────────────────────────────────────

interface RoleRestrictionByCondition {
  condition: string;
  field?: string;
}

interface RoleRight {
  name: string;
  value: boolean;
  restrictionByCondition?: RoleRestrictionByCondition;
}

interface RoleObject {
  name: string;
  rights: RoleRight[];
}

interface RoleRestrictionTemplate {
  name: string;
  condition: string;
}

interface ParsedRoleRights {
  setForNewObjects: boolean;
  setForAttributesByDefault: boolean;
  independentRightsOfChildObjects: boolean;
  objects: RoleObject[];
  restrictionTemplates: RoleRestrictionTemplate[];
  originalXml: string;
}

interface MetadataObjectInfo {
  objectType: string;
  name: string;
  fullName: string;
}

interface InitPayload {
  rights: ParsedRoleRights;
  roleName: string;
  metadataObjects: MetadataObjectInfo[];
}

// ─── Права для типов объектов ─────────────────────────────────────────────────

/** Все возможные права по типам объектов */
const RIGHTS_BY_TYPE: Record<string, string[]> = {
  Configuration: [
    'Administration', 'DataAdministration', 'UpdateDatabaseConfiguration',
    'ExclusiveMode', 'ActiveUsers', 'EventLog', 'ThinClient', 'WebClient',
    'MobileClient', 'ThickClient', 'ExternalConnection', 'Automation',
    'MainWindowModeNormal', 'MainWindowModeWorkplace', 'MainWindowModeEmbeddedWorkplace',
    'MainWindowModeFullscreenWorkplace', 'MainWindowModeKiosk',
    'TechnicalSpecialistMode', 'SystemInteractionMode',
  ],
  Subsystem: ['View'],
  CommonForm: ['Use'],
  CommonCommand: ['Use'],
  FilterCriterion: ['View', 'InteractiveView'],
  FunctionalOption: ['View'],
  Constant: [
    'Read', 'Update', 'View', 'Edit',
    'ReadDataHistory', 'UpdateDataHistory', 'UpdateDataHistorySettings',
    'UpdateDataHistoryVersionComment', 'ViewDataHistory', 'EditDataHistoryVersionComment',
    'SwitchToDataHistoryVersion',
  ],
  Catalog: [
    'Read', 'Insert', 'Update', 'Delete', 'View', 'InteractiveInsert',
    'Edit', 'InteractiveDelete', 'InteractiveDeleteMarked', 'InteractiveSetDeletionMark',
    'InteractiveClearDeletionMark', 'InputByString', 'Posting', 'UndoPosting',
    'InteractivePosting', 'InteractivePostingRegular', 'InteractiveUndoPosting',
    'ReadDataHistory', 'UpdateDataHistory', 'UpdateDataHistorySettings',
    'UpdateDataHistoryVersionComment', 'ViewDataHistory', 'EditDataHistoryVersionComment',
    'SwitchToDataHistoryVersion',
  ],
  Document: [
    'Read', 'Insert', 'Update', 'Delete', 'View', 'InteractiveInsert',
    'Edit', 'InteractiveDelete', 'InteractiveDeleteMarked', 'InteractiveSetDeletionMark',
    'InteractiveClearDeletionMark', 'Posting', 'UndoPosting',
    'InteractivePosting', 'InteractivePostingRegular', 'InteractiveUndoPosting',
    'ReadDataHistory', 'UpdateDataHistory', 'UpdateDataHistorySettings',
    'UpdateDataHistoryVersionComment', 'ViewDataHistory', 'EditDataHistoryVersionComment',
    'SwitchToDataHistoryVersion',
  ],
  Enum: ['Read', 'View'],
  Report: ['Use', 'View', 'InteractiveOpenExternal'],
  DataProcessor: ['Use', 'View', 'InteractiveOpenExternal'],
  ChartOfCharacteristicTypes: [
    'Read', 'Insert', 'Update', 'Delete', 'View', 'InteractiveInsert',
    'Edit', 'InteractiveDelete', 'InteractiveDeleteMarked', 'InteractiveSetDeletionMark',
    'InteractiveClearDeletionMark', 'InputByString',
    'ReadDataHistory', 'UpdateDataHistory', 'UpdateDataHistorySettings',
    'UpdateDataHistoryVersionComment', 'ViewDataHistory', 'EditDataHistoryVersionComment',
    'SwitchToDataHistoryVersion',
  ],
  ChartOfAccounts: [
    'Read', 'Insert', 'Update', 'Delete', 'View', 'InteractiveInsert',
    'Edit', 'InteractiveDelete', 'InteractiveDeleteMarked', 'InteractiveSetDeletionMark',
    'InteractiveClearDeletionMark', 'InputByString',
    'ReadDataHistory', 'UpdateDataHistory', 'UpdateDataHistorySettings',
    'UpdateDataHistoryVersionComment', 'ViewDataHistory', 'EditDataHistoryVersionComment',
    'SwitchToDataHistoryVersion',
  ],
  ChartOfCalculationTypes: [
    'Read', 'Insert', 'Update', 'Delete', 'View', 'InteractiveInsert',
    'Edit', 'InteractiveDelete', 'InteractiveDeleteMarked', 'InteractiveSetDeletionMark',
    'InteractiveClearDeletionMark', 'InputByString',
    'ReadDataHistory', 'UpdateDataHistory', 'UpdateDataHistorySettings',
    'UpdateDataHistoryVersionComment', 'ViewDataHistory', 'EditDataHistoryVersionComment',
    'SwitchToDataHistoryVersion',
  ],
  InformationRegister: [
    'Read', 'Update', 'View', 'Edit', 'TotalsControl',
    'ReadDataHistory', 'UpdateDataHistory', 'UpdateDataHistorySettings',
    'UpdateDataHistoryVersionComment', 'ViewDataHistory', 'EditDataHistoryVersionComment',
    'SwitchToDataHistoryVersion',
  ],
  AccumulationRegister: ['Read', 'Update', 'View', 'Edit', 'TotalsControl'],
  AccountingRegister: ['Read', 'Update', 'View', 'Edit', 'TotalsControl'],
  CalculationRegister: ['Read', 'Update', 'View', 'Edit'],
  BusinessProcess: [
    'Read', 'Insert', 'Update', 'Delete', 'View', 'InteractiveInsert',
    'Edit', 'InteractiveDelete', 'InteractiveDeleteMarked', 'InteractiveSetDeletionMark',
    'InteractiveClearDeletionMark', 'Start', 'InteractiveStart',
  ],
  Task: [
    'Read', 'Insert', 'Update', 'Delete', 'View', 'InteractiveInsert',
    'Edit', 'InteractiveDelete', 'InteractiveDeleteMarked', 'InteractiveSetDeletionMark',
    'InteractiveClearDeletionMark', 'InputByString',
  ],
  ExchangePlan: [
    'Read', 'Insert', 'Update', 'Delete', 'View', 'InteractiveInsert',
    'Edit', 'InteractiveDelete', 'InteractiveDeleteMarked', 'InteractiveSetDeletionMark',
    'InteractiveClearDeletionMark',
  ],
  DocumentJournal: ['Read', 'View'],
  Sequence: ['Read', 'Update'],
};

/** Русские описания прав */
const RIGHT_DESCRIPTIONS: Record<string, string> = {
  Administration: 'Администрирование',
  DataAdministration: 'Администрирование данных',
  UpdateDatabaseConfiguration: 'Обновление конфигурации базы данных',
  ExclusiveMode: 'Монопольный режим',
  ActiveUsers: 'Активные пользователи',
  EventLog: 'Журнал регистрации',
  ThinClient: 'Тонкий клиент',
  WebClient: 'Веб-клиент',
  MobileClient: 'Мобильный клиент',
  ThickClient: 'Толстый клиент',
  ExternalConnection: 'Внешнее соединение',
  Automation: 'Automation',
  MainWindowModeNormal: 'Режим основного окна «Обычный»',
  MainWindowModeWorkplace: 'Режим основного окна «Рабочее место»',
  MainWindowModeEmbeddedWorkplace: 'Режим основного окна «Встроенное рабочее место»',
  MainWindowModeFullscreenWorkplace: 'Режим основного окна «Полноэкранное рабочее место»',
  MainWindowModeKiosk: 'Режим основного окна «Киоск»',
  TechnicalSpecialistMode: 'Режим технического специалиста',
  SystemInteractionMode: 'Регистрация системы взаимодействия',
  Read: 'Чтение',
  Insert: 'Добавление',
  Update: 'Изменение',
  Delete: 'Удаление',
  View: 'Просмотр',
  Edit: 'Редактирование',
  InteractiveInsert: 'Интерактивное добавление',
  InteractiveDelete: 'Интерактивное удаление',
  InteractiveDeleteMarked: 'Интерактивное удаление помеченных',
  InteractiveSetDeletionMark: 'Интерактивная пометка на удаление',
  InteractiveClearDeletionMark: 'Интерактивное снятие пометки на удаление',
  InputByString: 'Ввод по строке',
  Posting: 'Проведение',
  UndoPosting: 'Отмена проведения',
  InteractivePosting: 'Интерактивное проведение',
  InteractivePostingRegular: 'Интерактивное проведение (обычное)',
  InteractiveUndoPosting: 'Интерактивная отмена проведения',
  TotalsControl: 'Управление итогами',
  Start: 'Запуск',
  InteractiveStart: 'Интерактивный запуск',
  Use: 'Использование',
  InteractiveView: 'Интерактивный просмотр',
  InteractiveOpenExternal: 'Интерактивное открытие внешнее',
  ReadDataHistory: 'Чтение истории данных',
  UpdateDataHistory: 'Изменение истории данных',
  UpdateDataHistorySettings: 'Изменение настроек истории данных',
  UpdateDataHistoryVersionComment: 'Изменение комментария версии истории данных',
  ViewDataHistory: 'Просмотр истории данных',
  EditDataHistoryVersionComment: 'Редактирование комментария версии истории данных',
  SwitchToDataHistoryVersion: 'Переход к версии истории данных',
};

/** Русские названия типов объектов */
const TYPE_LABELS: Record<string, string> = {
  Configuration: 'Конфигурация',
  Subsystem: 'Подсистемы',
  CommonForm: 'Общие формы',
  CommonCommand: 'Общие команды',
  FilterCriterion: 'Критерии отбора',
  FunctionalOption: 'Функциональные опции',
  Constant: 'Константы',
  Catalog: 'Справочники',
  Document: 'Документы',
  Enum: 'Перечисления',
  Report: 'Отчеты',
  DataProcessor: 'Обработки',
  ChartOfCharacteristicTypes: 'Планы видов характеристик',
  ChartOfAccounts: 'Планы счетов',
  ChartOfCalculationTypes: 'Планы видов расчета',
  InformationRegister: 'Регистры сведений',
  AccumulationRegister: 'Регистры накопления',
  AccountingRegister: 'Регистры бухгалтерии',
  CalculationRegister: 'Регистры расчета',
  BusinessProcess: 'Бизнес-процессы',
  Task: 'Задачи',
  ExchangePlan: 'Планы обмена',
  DocumentJournal: 'Журналы документов',
  Sequence: 'Последовательности',
};

/** Иконки типов объектов (emoji) */
const TYPE_ICONS: Record<string, string> = {
  Configuration: '⚙️',
  Subsystem: '📁',
  CommonForm: '📋',
  CommonCommand: '▶️',
  FilterCriterion: '🔍',
  FunctionalOption: '🔧',
  Constant: '📌',
  Catalog: '📒',
  Document: '📄',
  Enum: '📊',
  Report: '📈',
  DataProcessor: '⚙️',
  ChartOfCharacteristicTypes: '📐',
  ChartOfAccounts: '💰',
  ChartOfCalculationTypes: '🧮',
  InformationRegister: '📋',
  AccumulationRegister: '📦',
  AccountingRegister: '📚',
  CalculationRegister: '🔢',
  BusinessProcess: '🔄',
  Task: '✅',
  ExchangePlan: '🔁',
  DocumentJournal: '📓',
  Sequence: '🔗',
};

/**
 * Получает список прав для данного типа объекта
 */
function getRightsForType(objectType: string): string[] {
  return RIGHTS_BY_TYPE[objectType] ?? RIGHTS_BY_TYPE['Catalog'] ?? [];
}

// ─── Модальное окно RLS ───────────────────────────────────────────────────────

interface RlsModalProps {
  rightName: string;
  objectName: string;
  restriction?: RoleRestrictionByCondition;
  onSave: (restriction: RoleRestrictionByCondition | undefined) => void;
  onClose: () => void;
}

const RlsModal: React.FC<RlsModalProps> = ({ rightName, objectName, restriction, onSave, onClose }) => {
  const [condition, setCondition] = useState(restriction?.condition ?? '');
  const [field, setField] = useState(restriction?.field ?? '');

  const handleSave = () => {
    if (!condition.trim()) {
      onSave(undefined);
    } else {
      onSave({ condition: condition.trim(), field: field.trim() || undefined });
    }
  };

  const handleClear = () => {
    onSave(undefined);
  };

  return (
    <div className="rls-modal-overlay" onClick={onClose}>
      <div className="rls-modal" onClick={e => e.stopPropagation()}>
        <div className="rls-modal-title">
          Ограничение доступа к данным — {RIGHT_DESCRIPTIONS[rightName] ?? rightName}
          <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, opacity: 0.7 }}>{objectName}</div>
        </div>
        <div>
          <label>Условие (текст запроса RLS):</label>
          <textarea
            value={condition}
            onChange={e => setCondition(e.target.value)}
            placeholder="Введите условие ограничения доступа..."
            rows={5}
          />
        </div>
        <div>
          <label>Поле (опционально):</label>
          <textarea
            value={field}
            onChange={e => setField(e.target.value)}
            placeholder="Имя поля (необязательно)"
            rows={2}
          />
        </div>
        <div className="rls-modal-actions">
          <button className="btn btn-secondary" onClick={handleClear}>Очистить</button>
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSave}>Сохранить</button>
        </div>
      </div>
    </div>
  );
};

// ─── Таблица прав объекта ─────────────────────────────────────────────────────

interface RightsTableProps {
  objectName: string;
  objectType: string;
  rights: RoleRight[];
  onChange: (rights: RoleRight[]) => void;
}

const RightsTable: React.FC<RightsTableProps> = ({ objectName, objectType, rights, onChange }) => {
  const [rlsModal, setRlsModal] = useState<{ rightName: string } | null>(null);
  const [hoveredRight, setHoveredRight] = useState<string | null>(null);

  const availableRights = useMemo(() => getRightsForType(objectType), [objectType]);

  // Строим карту текущих прав
  const rightsMap = useMemo(() => {
    const map: Record<string, RoleRight> = {};
    for (const r of rights) {
      map[r.name] = r;
    }
    return map;
  }, [rights]);

  const handleToggle = useCallback((rightName: string, checked: boolean) => {
    const newRights = [...rights];
    const idx = newRights.findIndex(r => r.name === rightName);
    if (checked) {
      if (idx === -1) {
        newRights.push({ name: rightName, value: true });
      } else {
        newRights[idx] = { ...newRights[idx], value: true };
      }
    } else {
      if (idx !== -1) {
        // Если есть RLS — просто снимаем value, но оставляем запись
        const existing = newRights[idx];
        if (existing.restrictionByCondition) {
          newRights[idx] = { ...existing, value: false };
        } else {
          newRights.splice(idx, 1);
        }
      }
    }
    onChange(newRights);
  }, [rights, onChange]);

  const handleRlsSave = useCallback((rightName: string, restriction: RoleRestrictionByCondition | undefined) => {
    const newRights = [...rights];
    const idx = newRights.findIndex(r => r.name === rightName);
    if (restriction) {
      if (idx === -1) {
        newRights.push({ name: rightName, value: true, restrictionByCondition: restriction });
      } else {
        newRights[idx] = { ...newRights[idx], restrictionByCondition: restriction };
      }
    } else {
      if (idx !== -1) {
        const { restrictionByCondition: _, ...rest } = newRights[idx];
        newRights[idx] = rest;
      }
    }
    onChange(newRights);
    setRlsModal(null);
  }, [rights, onChange]);

  const handleSelectAll = () => {
    const newRights = [...rights];
    for (const rightName of availableRights) {
      if (!newRights.find(r => r.name === rightName)) {
        newRights.push({ name: rightName, value: true });
      } else {
        const idx = newRights.findIndex(r => r.name === rightName);
        newRights[idx] = { ...newRights[idx], value: true };
      }
    }
    onChange(newRights);
  };

  const handleClearAll = () => {
    // Удаляем все права для этого объекта (оставляем только те, у которых есть RLS)
    const newRights = rights.filter(r => r.restrictionByCondition && availableRights.includes(r.name))
      .map(r => ({ ...r, value: false }));
    onChange(newRights);
  };

  const currentRlsRight = rlsModal ? rightsMap[rlsModal.rightName] : undefined;

  return (
    <>
      <div className="role-rights-toolbar">
        <span className="role-rights-toolbar-label">Все права:</span>
        <button className="btn btn-secondary" onClick={handleSelectAll} title="Установить все права">
          Установить все
        </button>
        <button className="btn btn-secondary" onClick={handleClearAll} title="Снять все права">
          Снять все
        </button>
      </div>
      <div className="role-rights-table-wrapper">
        <table className="role-rights-table">
          <thead>
            <tr>
              <th className="col-right-name">Право</th>
              <th className="col-value">Значение</th>
              <th>Ограничение доступа</th>
            </tr>
          </thead>
          <tbody>
            {availableRights.map(rightName => {
              const right = rightsMap[rightName];
              const isChecked = right?.value ?? false;
              const hasRestriction = !!right?.restrictionByCondition;

              return (
                <tr
                  key={rightName}
                  className={hasRestriction ? 'has-restriction' : ''}
                  onMouseEnter={() => setHoveredRight(rightName)}
                  onMouseLeave={() => setHoveredRight(null)}
                >
                  <td>
                    <div className="right-name-cell">
                      <span className="right-name-label">
                        {RIGHT_DESCRIPTIONS[rightName] ?? rightName}
                      </span>
                    </div>
                  </td>
                  <td className="col-value">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => handleToggle(rightName, e.target.checked)}
                    />
                  </td>
                  <td>
                    {hasRestriction ? (
                      <span
                        className="right-rls-badge"
                        onClick={() => setRlsModal({ rightName })}
                        title="Нажмите для редактирования ограничения"
                      >
                        RLS: {right!.restrictionByCondition!.condition.slice(0, 30)}
                        {right!.restrictionByCondition!.condition.length > 30 ? '…' : ''}
                      </span>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 10, padding: '2px 6px', opacity: hoveredRight === rightName ? 1 : 0.3 }}
                        onClick={() => setRlsModal({ rightName })}
                        title="Добавить ограничение доступа к данным (RLS)"
                      >
                        + RLS
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="role-rights-description">
        {hoveredRight
          ? `${RIGHT_DESCRIPTIONS[hoveredRight] ?? hoveredRight} — ${hoveredRight}`
          : 'Наведите на право для просмотра описания'}
      </div>

      {rlsModal && (
        <RlsModal
          rightName={rlsModal.rightName}
          objectName={objectName}
          restriction={currentRlsRight?.restrictionByCondition}
          onSave={restriction => handleRlsSave(rlsModal.rightName, restriction)}
          onClose={() => setRlsModal(null)}
        />
      )}
    </>
  );
};

// ─── Основной компонент ───────────────────────────────────────────────────────

interface RoleEditorAppProps {
  vscode: any;
}

export const RoleEditorApp: React.FC<RoleEditorAppProps> = ({ vscode }) => {
  const [rights, setRights] = useState<ParsedRoleRights | null>(null);
  const [roleName, setRoleName] = useState('');
  const [metadataObjects, setMetadataObjects] = useState<MetadataObjectInfo[]>([]);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Инициализация — получаем данные от extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'init') {
        const payload = message.payload as InitPayload;
        setRights(payload.rights);
        setRoleName(payload.roleName);
        setMetadataObjects(payload.metadataObjects);
        setDirty(false);
      } else if (message.type === 'saved') {
        setSaving(false);
        if (message.payload?.success) {
          setDirty(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ type: 'requestData' });
    return () => window.removeEventListener('message', handleMessage);
  }, [vscode]);

  // Группируем объекты метаданных по типу
  const groupedObjects = useMemo(() => {
    const groups: Record<string, MetadataObjectInfo[]> = {};
    for (const obj of metadataObjects) {
      if (!groups[obj.objectType]) groups[obj.objectType] = [];
      groups[obj.objectType].push(obj);
    }
    return groups;
  }, [metadataObjects]);

  // Фильтрация по поиску
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedObjects;
    const q = searchQuery.toLowerCase();
    const result: Record<string, MetadataObjectInfo[]> = {};
    for (const [type, items] of Object.entries(groupedObjects)) {
      const filtered = items.filter(
        obj => obj.name.toLowerCase().includes(q) || obj.fullName.toLowerCase().includes(q)
      );
      if (filtered.length > 0) result[type] = filtered;
    }
    return result;
  }, [groupedObjects, searchQuery]);

  // Карта прав по объектам
  const rightsMap = useMemo(() => {
    if (!rights) return {};
    const map: Record<string, RoleRight[]> = {};
    for (const obj of rights.objects) {
      map[obj.name] = obj.rights;
    }
    return map;
  }, [rights]);

  const handleObjectSelect = (fullName: string) => {
    setSelectedObject(fullName);
  };

  const handleToggleGroup = (type: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleRightsChange = useCallback((objectFullName: string, newRights: RoleRight[]) => {
    setRights(prev => {
      if (!prev) return prev;
      const objects = [...prev.objects];
      const idx = objects.findIndex(o => o.name === objectFullName);
      if (newRights.length === 0) {
        // Удаляем объект из списка если нет прав
        if (idx !== -1) objects.splice(idx, 1);
      } else {
        if (idx === -1) {
          objects.push({ name: objectFullName, rights: newRights });
        } else {
          objects[idx] = { ...objects[idx], rights: newRights };
        }
      }
      return { ...prev, objects };
    });
    setDirty(true);
  }, []);

  const handleOptionChange = (field: keyof ParsedRoleRights, value: boolean) => {
    setRights(prev => prev ? { ...prev, [field]: value } : prev);
    setDirty(true);
  };

  const handleSave = () => {
    if (!rights) return;
    setSaving(true);
    vscode.postMessage({ type: 'save', payload: rights });
  };

  if (!rights) {
    return (
      <div className="role-editor-wrapper">
        <div className="role-editor-loading">Загрузка данных роли…</div>
      </div>
    );
  }

  const selectedObjectInfo = selectedObject
    ? metadataObjects.find(o => o.fullName === selectedObject)
    : null;

  const selectedRights = selectedObject ? (rightsMap[selectedObject] ?? []) : [];
  const selectedObjectType = selectedObjectInfo?.objectType ?? 'Catalog';

  const sortedTypes = Object.keys(filteredGroups).sort((a, b) => {
    const la = TYPE_LABELS[a] ?? a;
    const lb = TYPE_LABELS[b] ?? b;
    return la.localeCompare(lb, 'ru');
  });

  return (
    <div className="role-editor-wrapper">
      {/* Заголовок */}
      <div className="role-editor-header">
        <div className="role-editor-title">Права роли: {roleName}</div>
        <div className="role-editor-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !dirty}
            title={dirty ? 'Сохранить изменения (Ctrl+S)' : 'Нет изменений'}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Опции роли */}
      <div className="role-options">
        <label className="role-option-label">
          <input
            type="checkbox"
            checked={rights.setForNewObjects}
            onChange={e => handleOptionChange('setForNewObjects', e.target.checked)}
          />
          Устанавливать права для новых объектов
        </label>
        <label className="role-option-label">
          <input
            type="checkbox"
            checked={rights.setForAttributesByDefault}
            onChange={e => handleOptionChange('setForAttributesByDefault', e.target.checked)}
          />
          Устанавливать права для реквизитов и табличных частей по умолчанию
        </label>
        <label className="role-option-label">
          <input
            type="checkbox"
            checked={rights.independentRightsOfChildObjects}
            onChange={e => handleOptionChange('independentRightsOfChildObjects', e.target.checked)}
          />
          Независимые права подчиненных объектов
        </label>
      </div>

      {/* Основная область */}
      <div className="role-editor-body">
        {/* Левая панель — дерево объектов */}
        <div className="role-objects-panel">
          <div className="role-objects-panel-header">Объекты</div>
          <div className="role-objects-search">
            <input
              type="text"
              placeholder="Поиск объекта…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="role-objects-tree">
            {sortedTypes.map(type => {
              const items = filteredGroups[type];
              const isCollapsed = collapsedGroups.has(type);
              const label = TYPE_LABELS[type] ?? type;
              const icon = TYPE_ICONS[type] ?? '📄';

              return (
                <div key={type} className="role-object-group">
                  <div
                    className="role-object-group-header"
                    onClick={() => handleToggleGroup(type)}
                  >
                    <span className="role-object-group-icon">{isCollapsed ? '▶' : '▼'}</span>
                    <span>{icon}</span>
                    <span>{label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>
                      {items.length}
                    </span>
                  </div>
                  {!isCollapsed && items.map(obj => {
                    const objRights = rightsMap[obj.fullName] ?? [];
                    const activeRightsCount = objRights.filter(r => r.value).length;
                    const isSelected = selectedObject === obj.fullName;

                    return (
                      <div
                        key={obj.fullName}
                        className={[
                          'role-object-item',
                          isSelected ? 'selected' : '',
                          activeRightsCount > 0 ? 'has-rights' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => handleObjectSelect(obj.fullName)}
                        title={obj.fullName}
                      >
                        <span className="role-object-item-icon">{icon}</span>
                        <span className="role-object-item-name">{obj.name}</span>
                        {activeRightsCount > 0 && (
                          <span className="role-object-item-badge">{activeRightsCount}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Правая панель — таблица прав */}
        <div className="role-rights-panel">
          <div className="role-rights-panel-header">
            Права{selectedObject ? `: ${selectedObject}` : ''}
          </div>
          {!selectedObject ? (
            <div className="role-rights-empty">
              Выберите объект в левой панели для редактирования прав
            </div>
          ) : (
            <RightsTable
              objectName={selectedObject}
              objectType={selectedObjectType}
              rights={selectedRights}
              onChange={newRights => handleRightsChange(selectedObject, newRights)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

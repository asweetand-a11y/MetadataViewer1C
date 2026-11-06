/**
 * Визуальный конструктор запроса по образцу обработки КонструкторЗапросов.
 * Схема правится на вкладках, текст собирается и разбирается локально.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { QueryMetadataNode } from '../DcsEditor/MetadataTreePanel';
import type { ConfigurationModel } from '../../../queryModel/model';
import {
  cloneData,
  createEmptySchema,
  generateQueryText,
  generateSelect,
  getSelect,
  offsetToLineCol,
  parseQueryText,
  type QuerySchema,
} from '../../../querySchema';
import { AdditionallyPage, ConditionsPage, JoinsPage, OrderPage } from './CorePages';
import { BatchPage, DropPage, GroupingPage, IndexesPage, TotalsPage, UnionsPage } from './AdvancedPages';
import { CharacteristicsPage, DataCompositionPage } from './DcsPages';
import { QueryTextPage } from './QueryTextPage';
import { TablesPage } from './TablesPage';
import { SmallButton } from './widgets';
import '../DcsEditor/QueryEditorEnhanced.css';
import './QueryWizard.css';

type TabId =
  | 'tables'
  | 'joins'
  | 'grouping'
  | 'conditions'
  | 'additionally'
  | 'unions'
  | 'indexes'
  | 'order'
  | 'totals'
  | 'drop'
  | 'dcs'
  | 'chars'
  | 'batch'
  | 'text';

const TAB_TITLES: Record<TabId, string> = {
  tables: 'Таблицы и поля',
  joins: 'Связи',
  grouping: 'Группировка',
  conditions: 'Условия',
  additionally: 'Дополнительно',
  unions: 'Объединения/Псевдонимы',
  indexes: 'Индексы',
  order: 'Порядок',
  totals: 'Итоги',
  drop: 'Уничтожение таблицы',
  dcs: 'Компоновка данных',
  chars: 'Характеристики',
  batch: 'Пакет запросов',
  text: 'Запрос',
};

export interface QueryWizardProps {
  isOpen: boolean;
  queryText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  fullscreen?: boolean;
  dataCompositionMode?: boolean;
  metadataTree?: QueryMetadataNode | null;
  queryModel?: ConfigurationModel | null;
  nested?: boolean;
}

function visibleTabs(schema: QuerySchema | null, dataCompositionMode: boolean, nested: boolean, batchIndex: number): TabId[] {
  if (!schema) return ['text'];
  const item = schema?.batch[batchIndex];
  if (item?.kind === 'drop') {
    return nested ? ['drop', 'text'] : ['drop', 'batch', 'text'];
  }
  const tabs: TabId[] = ['tables', 'joins', 'grouping', 'conditions', 'additionally', 'unions', 'indexes', 'order'];
  if (!dataCompositionMode && !nested) tabs.push('totals');
  if (dataCompositionMode) tabs.push('dcs', 'chars');
  if (!nested) tabs.push('batch');
  tabs.push('text');
  return tabs;
}

export const QueryWizard: React.FC<QueryWizardProps> = ({
  isOpen,
  queryText,
  onSave,
  onCancel,
  fullscreen = false,
  dataCompositionMode = false,
  metadataTree = null,
  queryModel = null,
  nested = false,
}) => {
  const [schema, setSchema] = useState<QuerySchema | null>(null);
  const [raw, setRaw] = useState(queryText);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [textDirty, setTextDirty] = useState(false);
  const [tab, setTab] = useState<TabId>('tables');
  const [batchIndex, setBatchIndex] = useState(0);
  const [operatorIndex, setOperatorIndex] = useState(0);
  const [nestedSourceId, setNestedSourceId] = useState<string | null>(null);
  const saveRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!isOpen) return;
    const parsed = parseQueryText(queryText, dataCompositionMode);
    setChanged(false);
    setTextDirty(false);
    setBatchIndex(0);
    setOperatorIndex(0);
    setTab('tables');
    if (parsed.ok) {
      setSchema(parsed.schema);
      setRaw(queryText);
      setError(null);
    } else {
      const pos = offsetToLineCol(queryText, parsed.offset);
      setSchema(null);
      setRaw(queryText);
      setError(`Текст не разобран (${pos.line}:${pos.col}): ${parsed.message}`);
      setTab('text');
    }
  }, [isOpen, queryText, dataCompositionMode]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const tabs = useMemo(
    () => visibleTabs(schema, dataCompositionMode, nested, batchIndex),
    [schema, dataCompositionMode, nested, batchIndex],
  );

  useEffect(() => {
    if (tabs.indexOf(tab) < 0) setTab(tabs[0] || 'text');
  }, [tabs, tab]);

  if (!isOpen) return null;

  const applyText = (): QuerySchema | null => {
    const parsed = parseQueryText(raw, dataCompositionMode);
    if (!parsed.ok) {
      const pos = offsetToLineCol(raw, parsed.offset);
      setSchema(null);
      setError(`Текст не разобран (${pos.line}:${pos.col}): ${parsed.message}`);
      return null;
    }
    setSchema(parsed.schema);
    setError(null);
    setTextDirty(false);
    setChanged(true);
    return parsed.schema;
  };

  const selectTab = (next: TabId) => {
    if (tab === 'text' && next !== 'text' && textDirty) applyText();
    setTab(next);
  };

  const onVisual = (next: QuerySchema) => {
    next.dataCompositionMode = dataCompositionMode;
    setSchema(next);
    setRaw(generateQueryText(next));
    setError(null);
    setTextDirty(false);
    setChanged(true);
  };

  const save = () => {
    if (textDirty) {
      const parsed = parseQueryText(raw, dataCompositionMode);
      onSave(parsed.ok ? generateQueryText(parsed.schema) : raw);
      return;
    }
    if (!changed) {
      onSave(queryText);
      return;
    }
    if (schema) onSave(generateQueryText(schema));
    else onSave(raw);
  };
  saveRef.current = save;

  const pageProps = {
    schema: schema || createEmptySchema(dataCompositionMode),
    batchIndex,
    operatorIndex,
    metadataTree,
    onChange: onVisual,
    setBatchIndex,
    setOperatorIndex,
  };

  const nestedSource = (() => {
    if (!schema || !nestedSourceId) return null;
    const query = getSelect(schema, batchIndex);
    return query?.operators[operatorIndex]?.sources.find((s) => s.id === nestedSourceId) || null;
  })();

  const body = (
    <div className="qw">
      <div className="qw-tabs">
        {tabs.map((id) => (
          <button key={id} type="button" className={`qw-tab ${tab === id ? 'is-active' : ''}`} onClick={() => selectTab(id)}>
            {TAB_TITLES[id]}
          </button>
        ))}
      </div>
      {schema && schema.batch.length > 1 ? (
        <div className="qw-toolbar">
          <span>Пакет</span>
          <select className="qw-select" style={{ width: 280 }} value={batchIndex} onChange={(e) => { setBatchIndex(Number(e.target.value)); setOperatorIndex(0); }}>
            {schema.batch.map((item, index) => (
              <option key={item.id} value={index}>
                {item.kind === 'drop' ? `Уничтожить ${item.tableName}` : `Запрос ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="qw-body">
        {error ? (
          <div className="qw-error">
            {error}
            <div className="qw-row">
              <SmallButton onClick={() => onVisual(createEmptySchema(dataCompositionMode))}>Начать с пустого запроса</SmallButton>
            </div>
          </div>
        ) : null}
        {schema && tab === 'tables' ? <TablesPage {...pageProps} queryModel={queryModel} onEditNested={setNestedSourceId} /> : null}
        {schema && tab === 'joins' ? <JoinsPage {...pageProps} /> : null}
        {schema && tab === 'grouping' ? <GroupingPage {...pageProps} /> : null}
        {schema && tab === 'conditions' ? <ConditionsPage {...pageProps} /> : null}
        {schema && tab === 'additionally' ? <AdditionallyPage {...pageProps} /> : null}
        {schema && tab === 'unions' ? <UnionsPage {...pageProps} /> : null}
        {schema && tab === 'indexes' ? <IndexesPage {...pageProps} /> : null}
        {schema && tab === 'order' ? <OrderPage {...pageProps} /> : null}
        {schema && tab === 'totals' ? <TotalsPage {...pageProps} /> : null}
        {schema && tab === 'drop' ? <DropPage {...pageProps} /> : null}
        {schema && tab === 'dcs' ? <DataCompositionPage {...pageProps} /> : null}
        {schema && tab === 'chars' ? <CharacteristicsPage {...pageProps} /> : null}
        {schema && tab === 'batch' ? <BatchPage {...pageProps} /> : null}
        {tab === 'text' ? (
          <QueryTextPage
            value={raw}
            model={queryModel}
            onChange={(value) => {
              setRaw(value);
              setTextDirty(true);
              setChanged(true);
            }}
          />
        ) : null}
      </div>
      <div className="qw-footer">
        <span className="qw-empty">Ctrl+Enter — сохранить</span>
        <span style={{ display: 'flex', gap: 8 }}>
          <SmallButton onClick={onCancel}>Отмена</SmallButton>
          <SmallButton className="is-primary" onClick={save}>{fullscreen ? 'Сохранить (Ctrl+Enter)' : 'Сохранить и автообновить поля'}</SmallButton>
        </span>
      </div>
      {nestedSource ? (
        <QueryWizard
          isOpen
          nested
          queryText={nestedSource.nested ? generateSelect(nestedSource.nested) : 'ВЫБРАТЬ'}
          metadataTree={metadataTree}
          queryModel={queryModel}
          onCancel={() => setNestedSourceId(null)}
          onSave={(text) => {
            const parsed = parseQueryText(text, false);
            const select = parsed.ok ? parsed.schema.batch.find((item) => item.kind === 'select') : null;
            if (!parsed.ok || !select || select.kind !== 'select' || !schema) return;
            const next = cloneData(schema);
            const query = getSelect(next, batchIndex);
            const source = query?.operators[operatorIndex]?.sources.find((s) => s.id === nestedSourceId);
            if (!source) return;
            source.kind = 'nested';
            source.nested = select;
            onVisual(next);
            setNestedSourceId(null);
          }}
        />
      ) : null}
    </div>
  );

  if (fullscreen) {
    return <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>{body}</div>;
  }
  return (
    <div className="query-editor-enhanced__overlay" onClick={onCancel}>
      <div className="query-editor-enhanced__modal" onClick={(e) => e.stopPropagation()} style={nested ? { width: 'min(1100px, calc(100vw - 64px))', height: 'min(680px, calc(100vh - 64px))' } : undefined}>
        <div className="query-editor-enhanced__header">
          <h3>{nested ? 'Вложенный запрос' : 'Конструктор запроса'}</h3>
          <button type="button" className="query-editor-enhanced__close" onClick={onCancel}>✕</button>
        </div>
        {body}
      </div>
    </div>
  );
};

/**
 * Вкладка «Таблицы и поля»: источники, выбранные поля и диалоги источника.
 */

import React, { useRef, useState } from 'react';
import type { QueryMetadataNode } from '../DcsEditor/MetadataTreePanel';
import { ArbitraryConditionModal } from '../DcsEditor/ArbitraryConditionModal';
import { VirtualTableParamsModal } from '../DcsEditor/VirtualTableParamsModal';
import {
  aliasFromTable,
  cloneData,
  createField,
  createSelectQuery,
  createSource,
  getSelect,
  newId,
  usedAliases,
  type QueryOperator,
  type QuerySchema,
  type QuerySource,
} from '../../../querySchema';
import { sourceFieldExprs, sourceFieldNames, virtualConditionFieldNames } from './fields';
import { detectVirtualTable, formatVirtualArgs, initialVirtualValues, normalizeTableName } from './virtual';
import { MiniDialog, PickList, SmallButton } from './widgets';

export interface TablesPageProps {
  schema: QuerySchema;
  batchIndex: number;
  operatorIndex: number;
  metadataTree: QueryMetadataNode | null;
  onChange: (schema: QuerySchema) => void;
  onEditNested: (sourceId: string) => void;
}

function mutate(props: TablesPageProps, recipe: (op: QueryOperator) => void): void {
  const next = cloneData(props.schema);
  const op = getSelect(next, props.batchIndex)?.operators[props.operatorIndex];
  if (!op) return;
  recipe(op);
  props.onChange(next);
}

function MetadataBrowser(props: {
  tree: QueryMetadataNode | null;
  selectedId: string | null;
  onSelect: (node: QueryMetadataNode) => void;
  onActivate?: (node: QueryMetadataNode) => void;
}): JSX.Element {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ root: true });
  if (!props.tree) return <div className="qw-empty">Дерево метаданных не загружено</div>;

  const render = (node: QueryMetadataNode, depth: number): JSX.Element => {
    const kids = node.children || [];
    const open = expanded[node.id] !== false && (depth < 1 || !!expanded[node.id]);
    return (
      <div key={node.id}>
        <div
          className={`qw-tree__row ${props.selectedId === node.id ? 'is-selected' : ''}`}
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => {
            props.onSelect(node);
            if (kids.length) setExpanded((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            (props.onActivate || props.onSelect)(node);
          }}
        >
          {kids.length ? (open ? '▾ ' : '▸ ') : '· '}
          {node.label}
        </div>
        {open ? kids.map((child) => render(child, depth + 1)) : null}
      </div>
    );
  };

  return <div className="qw-tree">{render(props.tree, 0)}</div>;
}

function applyNode(props: TablesPageProps, node: QueryMetadataNode): void {
  const text = String(node.insertText || '').trim();
  if (!text) return;
  const hasChildren = (node.children || []).length > 0;
  const virtual = text.endsWith('(');
  if (node.kind === 'object' || virtual || (node.kind === 'member' && hasChildren)) {
    addSource(props, normalizeTableName(text));
    return;
  }
  addFieldPath(props, text);
}

function addSource(props: TablesPageProps, tableName: string, kind: QuerySource['kind'] = 'table', tempFields: string[] = []): void {
  mutate(props, (op) => {
    const alias = aliasFromTable(tableName, usedAliases(op));
    const source = createSource(tableName, alias, kind);
    source.tempFields = tempFields;
    op.sources.push(source);
  });
}

function addFieldPath(props: TablesPageProps, insertText: string): void {
  mutate(props, (op) => {
    const parts = insertText.split('.');
    if (parts.length < 2) {
      op.fields.push(createField(insertText));
      return;
    }
    let best: { source: QuerySource; rest: string } | null = null;
    for (const source of op.sources) {
      const base = source.tableName.replace(/\(.*/, '');
      if (insertText === base || insertText.startsWith(`${base}.`)) {
        const rest = insertText === base ? '' : insertText.slice(base.length + 1);
        if (!best || base.length > best.source.tableName.length) best = { source, rest };
      }
    }
    if (best && best.rest) {
      op.fields.push(createField(`${best.source.alias}.${best.rest}`));
      return;
    }
    const table = parts.slice(0, -1).join('.');
    const field = parts[parts.length - 1] || '';
    const alias = aliasFromTable(table, usedAliases(op));
    const source = createSource(table, alias);
    op.sources.push(source);
    op.fields.push(createField(`${alias}.${field}`));
  });
}

export const TablesPage: React.FC<TablesPageProps> = (props) => {
  const query = getSelect(props.schema, props.batchIndex);
  const op = query?.operators[props.operatorIndex];
  const [metaId, setMetaId] = useState<string | null>(null);
  const [metaNode, setMetaNode] = useState<QueryMetadataNode | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [aliasDraft, setAliasDraft] = useState('');
  const [tempOpen, setTempOpen] = useState(false);
  const [tempName, setTempName] = useState('ВТ');
  const [tempFields, setTempFields] = useState('');
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [exprOpen, setExprOpen] = useState(false);
  const [vtOpen, setVtOpen] = useState(false);
  const [vtCondOpen, setVtCondOpen] = useState(false);
  const [vtCondDraft, setVtCondDraft] = useState('');
  const [pickedField, setPickedField] = useState<string | null>(null);
  const [openSources, setOpenSources] = useState<Record<string, boolean>>({});
  const applyCondition = useRef<(next: string) => void>(() => undefined);

  if (!query || !op) return <div className="qw-empty">Для уничтожения таблицы эта страница скрыта.</div>;

  const source = op.sources.find((s) => s.id === sourceId) || null;
  const virtual = source ? detectVirtualTable(source.tableName) : null;

  return (
    <div>
      <div className="qw-row">
        <label className="qw-check">
          Поместить
          <input
            className="qw-input"
            style={{ width: 180 }}
            value={query.into}
            onChange={(e) => {
              const next = cloneData(props.schema);
              const q = getSelect(next, props.batchIndex);
              if (!q) return;
              q.into = e.target.value;
              props.onChange(next);
            }}
          />
        </label>
      </div>
      <div className="qw-split is-3">
        <div>
          <div className="qw-list__title">База данных</div>
          <MetadataBrowser
            tree={props.metadataTree}
            selectedId={metaId}
            onSelect={(node) => {
              setMetaId(node.id);
              setMetaNode(node);
            }}
            onActivate={(node) => applyNode(props, node)}
          />
        </div>
        <div>
          <div className="qw-list">
            <div className="qw-list__title">Таблицы</div>
            <div className="qw-list__body">
              {op.sources.length === 0 ? <div className="qw-empty">Добавьте таблицу из базы данных</div> : null}
              {op.sources.map((item) => {
                const names = sourceFieldNames(item, props.metadataTree);
                const opened = openSources[item.id] !== false;
                return (
                  <div key={item.id}>
                    <div
                      className={`qw-list__item ${item.id === sourceId && !pickedField ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSourceId(item.id);
                        setPickedField(null);
                      }}
                    >
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenSources((prev) => ({ ...prev, [item.id]: prev[item.id] === false }));
                        }}
                      >
                        {names.length ? (opened ? '▾ ' : '▸ ') : '· '}
                      </span>
                      {item.alias}{item.tableName ? ` — ${item.tableName}` : ' — вложенный запрос'}
                    </div>
                    {opened ? names.map((name) => {
                      const expr = item.alias ? `${item.alias}.${name}` : name;
                      return (
                        <div
                          key={`${item.id}:${name}`}
                          className={`qw-list__item ${pickedField === expr ? 'is-selected' : ''}`}
                          style={{ paddingLeft: 22 }}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/plain', expr);
                            event.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() => {
                            setSourceId(item.id);
                            setPickedField(expr);
                          }}
                          onDoubleClick={() => mutate(props, (current) => current.fields.push(createField(expr)))}
                        >
                          {name}
                        </div>
                      );
                    }) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="qw-colbtns">
          <SmallButton disabled={!metaNode?.insertText} onClick={() => metaNode && applyNode(props, metaNode)}>Добавить</SmallButton>
          <SmallButton disabled={!source} onClick={() => mutate(props, (item) => { item.sources = item.sources.filter((s) => s.id !== sourceId); })}>Удалить</SmallButton>
          <SmallButton onClick={() => mutate(props, (item) => { item.sources = []; })}>Удалить все</SmallButton>
          <SmallButton onClick={() => {
            const id = newId();
            mutate(props, (item) => {
              const nested = createSelectQuery();
              const alias = aliasFromTable('ВложенныйЗапрос', usedAliases(item));
              const src = createSource('', alias, 'nested');
              src.id = id;
              src.nested = nested;
              item.sources.push(src);
            });
            props.onEditNested(id);
          }}>Вложенный запрос</SmallButton>
          <SmallButton onClick={() => setTempOpen(true)}>Временная таблица</SmallButton>
          <SmallButton disabled={!source || source.kind === 'nested'} onClick={() => setReplaceOpen(true)}>Заменить таблицу</SmallButton>
          <SmallButton disabled={!source} onClick={() => { setAliasDraft(source?.alias || ''); setRenameOpen(true); }}>Переименовать</SmallButton>
          <SmallButton disabled={!virtual} onClick={() => setVtOpen(true)}>Параметры таблицы</SmallButton>
          <SmallButton disabled={!pickedField} onClick={() => {
            if (!pickedField) return;
            mutate(props, (item) => item.fields.push(createField(pickedField)));
          }}>Поле →</SmallButton>
          <SmallButton disabled={!source} onClick={() => mutate(props, (item) => {
            const current = item.sources.find((row) => row.id === sourceId);
            if (!current) return;
            const have = new Set(item.fields.map((field) => field.expression));
            sourceFieldNames(current, props.metadataTree).forEach((name) => {
              const expr = current.alias ? `${current.alias}.${name}` : name;
              if (!have.has(expr)) item.fields.push(createField(expr));
            });
          })}>Все поля →</SmallButton>
        </div>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(event) => {
            event.preventDefault();
            const expr = event.dataTransfer.getData('text/plain').trim();
            if (!expr) return;
            mutate(props, (item) => item.fields.push(createField(expr)));
          }}
        >
          <PickList
            title="Поля"
            items={op.fields.map((f) => ({ id: f.id, label: f.alias ? `${f.expression} КАК ${f.alias}` : f.expression }))}
            selectedId={fieldId}
            onSelect={setFieldId}
            onActivate={(id) => {
              const field = op.fields.find((f) => f.id === id);
              if (!field) return;
              setFieldId(id);
              setExprOpen(true);
            }}
          />
          <div className="qw-row" style={{ marginTop: 6 }}>
            <SmallButton onClick={() => {
              if (pickedField) {
                mutate(props, (item) => item.fields.push(createField(pickedField)));
                return;
              }
              if (metaNode?.insertText && (metaNode.kind === 'member' || metaNode.kind === 'object')) {
                applyNode(props, metaNode);
              }
            }}>Добавить поле</SmallButton>
            <SmallButton onClick={() => mutate(props, (item) => {
              const have = new Set(item.fields.map((f) => f.expression));
              sourceFieldExprs(item, props.metadataTree).forEach((expr) => {
                if (!have.has(expr)) item.fields.push(createField(expr));
              });
            })}>Все поля</SmallButton>
            <SmallButton disabled={!fieldId} onClick={() => mutate(props, (item) => { item.fields = item.fields.filter((f) => f.id !== fieldId); })}>Удалить</SmallButton>
            <SmallButton onClick={() => mutate(props, (item) => { item.fields = []; })}>Удалить все</SmallButton>
            <SmallButton onClick={() => { setFieldId(null); setExprOpen(true); }}>Произвольное выражение</SmallButton>
          </div>
        </div>
      </div>

      {renameOpen && source ? (
        <MiniDialog title="Псевдоним источника" onClose={() => setRenameOpen(false)}>
          <input className="qw-input" value={aliasDraft} onChange={(e) => setAliasDraft(e.target.value)} />
          <div className="qw-row" style={{ marginTop: 8 }}>
            <SmallButton className="is-primary" onClick={() => {
              mutate(props, (item) => {
                const src = item.sources.find((s) => s.id === source.id);
                if (src && aliasDraft.trim()) src.alias = aliasDraft.trim();
              });
              setRenameOpen(false);
            }}>ОК</SmallButton>
          </div>
        </MiniDialog>
      ) : null}

      {tempOpen ? (
        <MiniDialog title="Описание временной таблицы" onClose={() => setTempOpen(false)}>
          <div className="qw-row">Имя <input className="qw-input" value={tempName} onChange={(e) => setTempName(e.target.value)} /></div>
          <div>Поля (по одному в строке)</div>
          <textarea className="qw-area" value={tempFields} onChange={(e) => setTempFields(e.target.value)} />
          <div className="qw-row" style={{ marginTop: 8 }}>
            <SmallButton onClick={() => {
              const fields = tempFields.split(/[\n,;]/).map((f) => f.trim()).filter(Boolean);
              addSource(props, tempName.trim() || 'ВТ', 'temp', fields);
              setTempOpen(false);
            }}>ОК</SmallButton>
          </div>
        </MiniDialog>
      ) : null}

      {replaceOpen && source ? (
        <MiniDialog title="Заменить таблицу" onClose={() => setReplaceOpen(false)} wide>
          <MetadataBrowser
            tree={props.metadataTree}
            selectedId={metaId}
            onSelect={(node) => {
              const text = node.insertText || '';
              if (!text) return;
              const table = node.kind === 'member' && !(node.children || []).length ? '' : normalizeTableName(text);
              if (!table || table.split('.').length > 4 && node.kind === 'member' && !(node.children || []).length) return;
              if (node.kind === 'member' && !(node.children || []).length && !text.endsWith('(')) return;
              mutate(props, (item) => {
                const src = item.sources.find((s) => s.id === source.id);
                if (src) src.tableName = normalizeTableName(text);
              });
              setReplaceOpen(false);
            }}
          />
        </MiniDialog>
      ) : null}

      <ArbitraryConditionModal
        isOpen={exprOpen}
        initialValue={op.fields.find((f) => f.id === fieldId)?.expression || ''}
        fields={sourceFieldExprs(op, props.metadataTree)}
        onCancel={() => setExprOpen(false)}
        onSave={(value) => {
          mutate(props, (item) => {
            const existing = item.fields.find((f) => f.id === fieldId);
            if (existing) existing.expression = value.trim();
            else if (value.trim()) item.fields.push(createField(value.trim()));
          });
          setExprOpen(false);
        }}
      />

      {virtual && source ? (
        <VirtualTableParamsModal
          isOpen={vtOpen}
          family={virtual.family}
          kind={virtual.kind}
          initialValues={initialVirtualValues(virtual)}
          onCancel={() => setVtOpen(false)}
          onEditCondition={(current, apply) => {
            applyCondition.current = apply;
            setVtCondDraft(current);
            setVtCondOpen(true);
          }}
          onSave={(values) => {
            const tableName = formatVirtualArgs(virtual, values);
            mutate(props, (item) => {
              const src = item.sources.find((s) => s.id === source.id);
              if (src) src.tableName = tableName;
            });
            setVtOpen(false);
          }}
        />
      ) : null}
      <ArbitraryConditionModal
        isOpen={vtCondOpen}
        initialValue={vtCondDraft}
        fields={source ? virtualConditionFieldNames(source, props.metadataTree) : []}
        onCancel={() => setVtCondOpen(false)}
        onSave={(value) => {
          applyCondition.current(value.trim());
          setVtCondOpen(false);
        }}
      />
    </div>
  );
};

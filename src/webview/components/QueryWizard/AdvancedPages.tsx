/**
 * Группировка, объединения, индексы, итоги, уничтожение и пакет.
 */

import React, { useState } from 'react';
import type { QueryMetadataNode } from '../DcsEditor/MetadataTreePanel';
import { ArbitraryConditionModal } from '../DcsEditor/ArbitraryConditionModal';
import {
  cloneData,
  createAggregate,
  createDropQuery,
  createField,
  createOperator,
  createSelectQuery,
  getSelect,
  isAggregateExpression,
  newId,
  type QueryOperator,
  type QuerySchema,
  type SelectQuery,
  type UnionKind,
} from '../../../querySchema';
import { sourceFieldExprs } from './fields';
import { PickList, SmallButton } from './widgets';

interface PageProps {
  schema: QuerySchema;
  batchIndex: number;
  operatorIndex: number;
  metadataTree: QueryMetadataNode | null;
  onChange: (schema: QuerySchema) => void;
  setBatchIndex?: (index: number) => void;
  setOperatorIndex?: (index: number) => void;
}

function edit(props: PageProps, recipe: (query: SelectQuery, op: QueryOperator) => void): void {
  const next = cloneData(props.schema);
  const query = getSelect(next, props.batchIndex);
  const op = query?.operators[props.operatorIndex];
  if (!query || !op) return;
  recipe(query, op);
  props.onChange(next);
}

export const GroupingPage: React.FC<PageProps> = (props) => {
  const op = getSelect(props.schema, props.batchIndex)?.operators[props.operatorIndex];
  const [setIndex, setSetIndex] = useState(0);
  const [availableId, setAvailableId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [aggId, setAggId] = useState<string | null>(null);
  const [exprOpen, setExprOpen] = useState(false);
  if (!op) return null;
  const currentSet = op.groupingSets[setIndex];
  const fields = sourceFieldExprs(op, props.metadataTree);

  return (
    <div>
      <label className="qw-check">
        <input type="checkbox" checked={op.groupingEnabled} onChange={(e) => edit(props, (_q, item) => {
          item.groupingEnabled = e.target.checked;
          if (e.target.checked && !item.groupingSets.length) {
            item.groupingSets = [{ id: newId(), fields: item.fields.filter((f) => !isAggregateExpression(f.expression)).map((f) => f.expression) }];
            item.aggregates = item.fields.filter((f) => isAggregateExpression(f.expression)).map((f) => createAggregate(f.expression, f.alias));
          }
        })} />
        Группировка
      </label>
      <div className="qw-row">
        <span>Набор</span>
        <select className="qw-select" style={{ width: 160 }} value={setIndex} onChange={(e) => setSetIndex(Number(e.target.value))}>
          {op.groupingSets.map((set, index) => <option key={set.id} value={index}>Набор {index + 1}</option>)}
        </select>
        <SmallButton onClick={() => edit(props, (_q, item) => item.groupingSets.push({ id: newId(), fields: [] }))}>Добавить набор</SmallButton>
        <SmallButton disabled={!currentSet} onClick={() => edit(props, (_q, item) => { item.groupingSets = item.groupingSets.filter((_, i) => i !== setIndex); })}>Удалить набор</SmallButton>
      </div>
      <div className="qw-split">
        <PickList title="Доступные поля" items={fields.map((f) => ({ id: f, label: f }))} selectedId={availableId} onSelect={setAvailableId} />
        <div className="qw-colbtns">
          <SmallButton disabled={!availableId || !currentSet} onClick={() => edit(props, (_q, item) => {
            const set = item.groupingSets[setIndex];
            if (set && availableId && set.fields.indexOf(availableId) < 0) set.fields.push(availableId);
          })}>В группировку</SmallButton>
          <SmallButton disabled={!availableId} onClick={() => edit(props, (_q, item) => {
            if (!availableId) return;
            const expr = `СУММА(${availableId})`;
            item.aggregates.push(createAggregate(expr));
            if (!item.fields.some((f) => f.expression === expr)) item.fields.push(createField(expr));
          })}>В суммы</SmallButton>
        </div>
        <div>
          <PickList
            title="Поля группировки"
            items={(currentSet?.fields || []).map((f) => ({ id: f, label: f }))}
            selectedId={groupId}
            onSelect={setGroupId}
          />
          <SmallButton disabled={!groupId} onClick={() => edit(props, (_q, item) => {
            const set = item.groupingSets[setIndex];
            if (set) set.fields = set.fields.filter((f) => f !== groupId);
          })}>Удалить поле</SmallButton>
          <PickList
            title="Суммируемые поля"
            items={op.aggregates.map((a) => ({ id: a.id, label: a.alias ? `${a.expression} КАК ${a.alias}` : a.expression }))}
            selectedId={aggId}
            onSelect={setAggId}
            onActivate={() => setExprOpen(true)}
          />
          <SmallButton disabled={!aggId} onClick={() => edit(props, (_q, item) => { item.aggregates = item.aggregates.filter((a) => a.id !== aggId); })}>Удалить сумму</SmallButton>
          <SmallButton onClick={() => { setAggId(null); setExprOpen(true); }}>Произвольная сумма</SmallButton>
        </div>
      </div>
      <ArbitraryConditionModal
        isOpen={exprOpen}
        initialValue={op.aggregates.find((a) => a.id === aggId)?.expression || ''}
        fields={fields}
        onCancel={() => setExprOpen(false)}
        onSave={(value) => {
          edit(props, (_q, item) => {
            const row = item.aggregates.find((a) => a.id === aggId);
            if (row) row.expression = value.trim();
            else if (value.trim()) item.aggregates.push(createAggregate(value.trim()));
          });
          setExprOpen(false);
        }}
      />
    </div>
  );
};

export const UnionsPage: React.FC<PageProps> = (props) => {
  const query = getSelect(props.schema, props.batchIndex);
  if (!query) return null;
  const rows = Math.max(0, ...query.operators.map((op) => op.fields.length));

  const changeOps = (recipe: (q: SelectQuery) => void) => {
    const next = cloneData(props.schema);
    const q = getSelect(next, props.batchIndex);
    if (!q) return;
    recipe(q);
    props.onChange(next);
  };

  return (
    <div>
      <div className="qw-row">
        {query.operators.map((op, index) => (
          <label key={op.id} className="qw-check">
            <input type="radio" checked={index === props.operatorIndex} onChange={() => props.setOperatorIndex?.(index)} />
            {index === 0 ? 'Основной' : op.unionType === 'all' ? `Все ${index + 1}` : `Объединение ${index + 1}`}
          </label>
        ))}
        <SmallButton onClick={() => changeOps((q) => {
          const op = createOperator();
          op.unionType = 'all';
          q.operators.push(op);
        })}>Добавить</SmallButton>
        <SmallButton onClick={() => changeOps((q) => {
          const src = q.operators[props.operatorIndex];
          if (!src) return;
          const copy = cloneData(src);
          copy.id = newId();
          copy.unionType = 'all';
          q.operators.splice(props.operatorIndex + 1, 0, copy);
        })}>Копировать</SmallButton>
        <SmallButton disabled={query.operators.length < 2} onClick={() => changeOps((q) => {
          q.operators = q.operators.filter((_, i) => i !== props.operatorIndex);
          q.operators[0].unionType = 'none';
          props.setOperatorIndex?.(0);
        })}>Удалить</SmallButton>
      </div>
      {props.operatorIndex > 0 ? (
        <div className="qw-row">
          <span>Тип объединения</span>
          <select className="qw-select" style={{ width: 220 }} value={query.operators[props.operatorIndex]?.unionType || 'all'} onChange={(e) => changeOps((q) => {
            const op = q.operators[props.operatorIndex];
            if (op) op.unionType = e.target.value as UnionKind;
          })}>
            <option value="all">Объединить все</option>
            <option value="distinct">Объединить</option>
          </select>
        </div>
      ) : null}
      <table className="qw-table">
        <thead>
          <tr>
            <th>Псевдоним</th>
            {query.operators.map((op, index) => <th key={op.id}>{index === 0 ? 'Запрос' : `Часть ${index + 1}`}</th>)}
            <th />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              <td>
                <input className="qw-input" value={query.operators[0]?.fields[row]?.alias || ''} onChange={(e) => changeOps((q) => {
                  const field = q.operators[0]?.fields[row];
                  if (field) field.alias = e.target.value;
                })} />
              </td>
              {query.operators.map((op) => (
                <td key={op.id}>
                  <input className="qw-input" value={op.fields[row]?.expression || ''} onChange={(e) => changeOps((q) => {
                    const target = q.operators.find((item) => item.id === op.id);
                    if (!target) return;
                    while (target.fields.length <= row) target.fields.push(createField(''));
                    target.fields[row].expression = e.target.value;
                  })} />
                </td>
              ))}
              <td>
                <SmallButton onClick={() => changeOps((q) => q.operators.forEach((item) => item.fields.splice(row, 1)))}>Удалить</SmallButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="qw-row" style={{ marginTop: 8 }}>
        <SmallButton onClick={() => changeOps((q) => q.operators.forEach((item) => item.fields.push(createField(''))))}>Добавить колонку</SmallButton>
        <SmallButton disabled={rows < 2} onClick={() => changeOps((q) => q.operators.forEach((item) => {
          if (item.fields.length >= 2) {
            const last = item.fields.pop();
            const prev = item.fields.pop();
            if (prev && last) item.fields.push(last, prev);
          }
        }))}>Поменять две последние</SmallButton>
      </div>
    </div>
  );
};

export const IndexesPage: React.FC<PageProps> = (props) => {
  const query = getSelect(props.schema, props.batchIndex);
  const op = query?.operators[props.operatorIndex];
  const [indexId, setIndexId] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  if (!query || !op) return null;
  const index = query.indexes.find((i) => i.id === indexId) || query.indexes[0] || null;
  const available = op.fields.map((f) => f.alias || f.expression).filter(Boolean);

  const change = (recipe: (q: SelectQuery) => void) => {
    const next = cloneData(props.schema);
    const q = getSelect(next, props.batchIndex);
    if (!q) return;
    recipe(q);
    props.onChange(next);
  };

  return (
    <div className="qw-split" style={{ gridTemplateColumns: 'minmax(140px, 0.8fr) auto minmax(140px, 1fr) auto minmax(160px, 1fr)' }}>
      <PickList
        title="Индексы"
        items={query.indexes.map((idx, n) => ({ id: idx.id, label: `Индекс ${n + 1} (${idx.fields.length})` }))}
        selectedId={index?.id || null}
        onSelect={setIndexId}
      />
      <div className="qw-colbtns">
        <SmallButton onClick={() => change((q) => q.indexes.push({ id: newId(), fields: [] }))}>Добавить индекс</SmallButton>
        <SmallButton disabled={!index} onClick={() => change((q) => { q.indexes = q.indexes.filter((i) => i.id !== index?.id); })}>Удалить индекс</SmallButton>
      </div>
      <PickList title="Поля" items={available.map((f) => ({ id: f, label: f }))} selectedId={fieldName} onSelect={setFieldName} />
      <div className="qw-colbtns">
        <SmallButton disabled={!index || !fieldName} onClick={() => change((q) => {
          const row = q.indexes.find((i) => i.id === (index?.id || ''));
          if (row && fieldName) row.fields.push(fieldName);
        })}>Добавить</SmallButton>
        <SmallButton disabled={!index} onClick={() => change((q) => {
          const row = q.indexes.find((i) => i.id === (index?.id || ''));
          if (row) row.fields = available.slice();
        })}>Добавить все</SmallButton>
        <SmallButton disabled={!chosen || !index} onClick={() => change((q) => {
          const row = q.indexes.find((i) => i.id === (index?.id || ''));
          if (row) row.fields = row.fields.filter((f) => f !== chosen);
        })}>Удалить</SmallButton>
        <SmallButton disabled={!index} onClick={() => change((q) => {
          const row = q.indexes.find((i) => i.id === (index?.id || ''));
          if (row) row.fields = [];
        })}>Удалить все</SmallButton>
      </div>
      <PickList
        title="Поля индекса"
        items={(index?.fields || []).map((f, n) => ({ id: `${n}:${f}`, label: f }))}
        selectedId={chosen ? (index?.fields || []).map((f, n) => `${n}:${f}`).find((id) => id.endsWith(`:${chosen}`)) || null : null}
        onSelect={(id) => setChosen(id.slice(id.indexOf(':') + 1))}
      />
    </div>
  );
};

export const TotalsPage: React.FC<PageProps> = (props) => {
  const query = getSelect(props.schema, props.batchIndex);
  const op = query?.operators[props.operatorIndex];
  const [exprId, setExprId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [availableId, setAvailableId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  if (!query || !op) return null;
  const fields = [...op.fields.map((f) => f.alias || f.expression), ...sourceFieldExprs(op, props.metadataTree)];

  const change = (recipe: (q: SelectQuery) => void) => {
    const next = cloneData(props.schema);
    const q = getSelect(next, props.batchIndex);
    if (!q) return;
    recipe(q);
    props.onChange(next);
  };

  return (
    <div>
      <label className="qw-check">
        <input type="checkbox" checked={query.totalsEnabled} onChange={(e) => change((q) => { q.totalsEnabled = e.target.checked; })} />
        Итоги
      </label>
      <div className="qw-split" style={{ marginTop: 8 }}>
        <PickList title="Поля" items={fields.filter((v, i, a) => a.indexOf(v) === i).map((f) => ({ id: f, label: f }))} selectedId={availableId} onSelect={setAvailableId} />
        <div className="qw-colbtns">
          <SmallButton disabled={!availableId} onClick={() => change((q) => q.totalExpressions.push({ id: newId(), expression: `СУММА(${availableId})`, alias: '' }))}>В выражения</SmallButton>
          <SmallButton disabled={!availableId} onClick={() => change((q) => q.totalGroupings.push({ id: newId(), expression: availableId || '', overall: false, hierarchy: 'none' }))}>В группировки</SmallButton>
          <SmallButton onClick={() => change((q) => q.totalGroupings.push({ id: newId(), expression: '', overall: true, hierarchy: 'none' }))}>Общие итоги</SmallButton>
        </div>
        <div>
          <PickList title="Выражения итогов" items={query.totalExpressions.map((f) => ({ id: f.id, label: f.expression }))} selectedId={exprId} onSelect={setExprId} onActivate={() => setOpen(true)} />
          <SmallButton disabled={!exprId} onClick={() => change((q) => { q.totalExpressions = q.totalExpressions.filter((f) => f.id !== exprId); })}>Удалить выражение</SmallButton>
          <PickList
            title="Группировки итогов"
            items={query.totalGroupings.map((g) => ({
              id: g.id,
              label: g.overall ? 'ОБЩИЕ' : `${g.expression}${g.hierarchy === 'hierarchy' ? ' ИЕРАРХИЯ' : ''}${g.hierarchy === 'only' ? ' ТОЛЬКО ИЕРАРХИЯ' : ''}`,
            }))}
            selectedId={groupId}
            onSelect={setGroupId}
          />
          <div className="qw-row">
            <SmallButton disabled={!groupId} onClick={() => change((q) => {
              const row = q.totalGroupings.find((g) => g.id === groupId);
              if (!row || row.overall) return;
              row.hierarchy = row.hierarchy === 'none' ? 'hierarchy' : row.hierarchy === 'hierarchy' ? 'only' : 'none';
            })}>Иерархия</SmallButton>
            <SmallButton disabled={!groupId} onClick={() => change((q) => { q.totalGroupings = q.totalGroupings.filter((g) => g.id !== groupId); })}>Удалить группировку</SmallButton>
          </div>
        </div>
      </div>
      <ArbitraryConditionModal
        isOpen={open}
        initialValue={query.totalExpressions.find((f) => f.id === exprId)?.expression || ''}
        fields={fields}
        onCancel={() => setOpen(false)}
        onSave={(value) => {
          change((q) => {
            const row = q.totalExpressions.find((f) => f.id === exprId);
            if (row) row.expression = value.trim();
          });
          setOpen(false);
        }}
      />
    </div>
  );
};

export const DropPage: React.FC<PageProps> = (props) => {
  const item = props.schema.batch[props.batchIndex];
  if (!item || item.kind !== 'drop') return <div className="qw-empty">Выберите в пакете запрос уничтожения таблицы.</div>;
  return (
    <label className="qw-check">
      Имя таблицы
      <input className="qw-input" style={{ width: 240 }} value={item.tableName} onChange={(e) => {
        const next = cloneData(props.schema);
        const row = next.batch[props.batchIndex];
        if (row && row.kind === 'drop') row.tableName = e.target.value;
        props.onChange(next);
      }} />
    </label>
  );
};

export const BatchPage: React.FC<PageProps> = (props) => {
  const change = (recipe: (schema: QuerySchema) => void, nextIndex?: number) => {
    const next = cloneData(props.schema);
    recipe(next);
    props.onChange(next);
    if (nextIndex !== undefined) props.setBatchIndex?.(nextIndex);
  };
  const move = (dir: number) => {
    const index = props.batchIndex;
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= props.schema.batch.length) return;
    change((schema) => {
      const [row] = schema.batch.splice(index, 1);
      schema.batch.splice(nextIndex, 0, row);
    }, nextIndex);
  };

  return (
    <div>
      <div className="qw-row">
        <SmallButton onClick={() => change((schema) => schema.batch.push(createSelectQuery()), props.schema.batch.length)}>Добавить запрос</SmallButton>
        <SmallButton onClick={() => change((schema) => schema.batch.push(createDropQuery('ВТ')), props.schema.batch.length)}>Уничтожить таблицу</SmallButton>
        <SmallButton onClick={() => change((schema) => {
          const src = schema.batch[props.batchIndex];
          if (!src) return;
          const copy = cloneData(src);
          copy.id = newId();
          schema.batch.splice(props.batchIndex + 1, 0, copy);
        }, props.batchIndex + 1)}>Копировать</SmallButton>
        <SmallButton disabled={props.schema.batch.length < 2} onClick={() => change((schema) => {
          schema.batch = schema.batch.filter((_, i) => i !== props.batchIndex);
        }, Math.max(0, props.batchIndex - 1))}>Удалить</SmallButton>
        <SmallButton onClick={() => move(-1)}>Вверх</SmallButton>
        <SmallButton onClick={() => move(1)}>Вниз</SmallButton>
      </div>
      <PickList
        title="Пакет запросов"
        items={props.schema.batch.map((item, index) => ({
          id: item.id,
          label: item.kind === 'drop' ? `Уничтожить ${item.tableName || '…'}` : `Запрос ${index + 1}${item.into ? ` → ${item.into}` : ''}`,
        }))}
        selectedId={props.schema.batch[props.batchIndex]?.id || null}
        onSelect={(id) => {
          const index = props.schema.batch.findIndex((item) => item.id === id);
          if (index >= 0) props.setBatchIndex?.(index);
        }}
      />
    </div>
  );
};

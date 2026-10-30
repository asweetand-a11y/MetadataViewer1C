/**
 * Вкладки связей, условий, дополнительных параметров и порядка.
 */

import React, { useState } from 'react';
import { ArbitraryConditionModal } from '../DcsEditor/ArbitraryConditionModal';
import type { QueryMetadataNode } from '../DcsEditor/MetadataTreePanel';
import {
  cloneData,
  createJoin,
  getSelect,
  newId,
  type JoinType,
  type QueryOperator,
  type QuerySchema,
  type SelectQuery,
} from '../../../querySchema';
import { sourceFieldExprs } from './fields';
import { PickList, SmallButton } from './widgets';

interface PageProps {
  schema: QuerySchema;
  batchIndex: number;
  operatorIndex: number;
  metadataTree: QueryMetadataNode | null;
  onChange: (schema: QuerySchema) => void;
}

function edit(props: PageProps, recipe: (query: SelectQuery, op: QueryOperator) => void): void {
  const next = cloneData(props.schema);
  const query = getSelect(next, props.batchIndex);
  const op = query?.operators[props.operatorIndex];
  if (!query || !op) return;
  recipe(query, op);
  props.onChange(next);
}

export const JoinsPage: React.FC<PageProps> = (props) => {
  const op = getSelect(props.schema, props.batchIndex)?.operators[props.operatorIndex];
  const [joinId, setJoinId] = useState<string | null>(null);
  const [exprOpen, setExprOpen] = useState(false);
  if (!op) return null;
  const join = op.joins.find((j) => j.id === joinId) || null;
  const label = (id: string) => op.sources.find((s) => s.id === id)?.alias || '?';

  return (
    <div>
      <div className="qw-row">
        <SmallButton disabled={op.sources.length < 2} onClick={() => edit(props, (_q, item) => {
          const right = item.sources[item.sources.length - 1];
          const left = item.sources[item.sources.length - 2];
          item.joins.push(createJoin(left.id, right.id, 'left', `${left.alias}.Ссылка = ${right.alias}.Ссылка`));
        })}>Добавить связь</SmallButton>
        <SmallButton disabled={!join} onClick={() => edit(props, (_q, item) => { item.joins = item.joins.filter((j) => j.id !== joinId); })}>Удалить</SmallButton>
      </div>
      <table className="qw-table">
        <thead>
          <tr><th>Левая таблица</th><th>Тип</th><th>Правая таблица</th><th>Условие</th></tr>
        </thead>
        <tbody>
          {op.joins.map((item) => (
            <tr key={item.id} onClick={() => setJoinId(item.id)} style={{ background: item.id === joinId ? 'var(--vscode-list-inactiveSelectionBackground)' : undefined }}>
              <td>
                <select className="qw-select" value={item.leftSourceId} onChange={(e) => edit(props, (_q, cur) => {
                  const row = cur.joins.find((j) => j.id === item.id);
                  if (row) row.leftSourceId = e.target.value;
                })}>
                  {op.sources.map((s) => <option key={s.id} value={s.id}>{s.alias}</option>)}
                </select>
              </td>
              <td>
                <select className="qw-select" value={item.joinType} onChange={(e) => edit(props, (_q, cur) => {
                  const row = cur.joins.find((j) => j.id === item.id);
                  if (row) row.joinType = e.target.value as JoinType;
                })}>
                  <option value="inner">Внутреннее</option>
                  <option value="left">Левое</option>
                  <option value="right">Правое</option>
                  <option value="full">Полное</option>
                </select>
              </td>
              <td>{label(item.rightSourceId)}</td>
              <td>
                <button type="button" className="qw-btn" onClick={() => { setJoinId(item.id); setExprOpen(true); }}>{item.condition || 'Задать условие'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ArbitraryConditionModal
        isOpen={exprOpen}
        initialValue={join?.condition || ''}
        fields={sourceFieldExprs(op, props.metadataTree)}
        onCancel={() => setExprOpen(false)}
        onSave={(value) => {
          edit(props, (_q, item) => {
            const row = item.joins.find((j) => j.id === joinId);
            if (row) row.condition = value.trim() || 'ИСТИНА';
          });
          setExprOpen(false);
        }}
      />
    </div>
  );
};

export const ConditionsPage: React.FC<PageProps> = (props) => {
  const op = getSelect(props.schema, props.batchIndex)?.operators[props.operatorIndex];
  const [condId, setCondId] = useState<string | null>(null);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [exprOpen, setExprOpen] = useState(false);
  if (!op) return null;
  const fields = sourceFieldExprs(op, props.metadataTree);

  return (
    <div className="qw-split">
      <PickList
        title="Доступные поля"
        items={fields.map((f) => ({ id: f, label: f }))}
        selectedId={fieldId}
        onSelect={setFieldId}
      />
      <div className="qw-colbtns">
        <SmallButton disabled={!fieldId} onClick={() => edit(props, (_q, item) => item.conditions.push({ id: newId(), expression: fieldId || '' }))}>Добавить</SmallButton>
        <SmallButton onClick={() => edit(props, (_q, item) => {
          const have = new Set(item.conditions.map((c) => c.expression));
          fields.forEach((f) => { if (!have.has(f)) item.conditions.push({ id: newId(), expression: f }); });
        })}>Добавить все</SmallButton>
        <SmallButton onClick={() => { setCondId(null); setExprOpen(true); }}>Произвольное</SmallButton>
        <SmallButton disabled={!condId} onClick={() => edit(props, (_q, item) => {
          const row = item.conditions.find((c) => c.id === condId);
          if (row) item.conditions.push({ id: newId(), expression: row.expression });
        })}>Копировать</SmallButton>
        <SmallButton disabled={!condId} onClick={() => edit(props, (_q, item) => { item.conditions = item.conditions.filter((c) => c.id !== condId); })}>Удалить</SmallButton>
        <SmallButton onClick={() => edit(props, (_q, item) => { item.conditions = []; })}>Удалить все</SmallButton>
      </div>
      <PickList
        title="Условия"
        items={op.conditions.map((c) => ({ id: c.id, label: c.expression }))}
        selectedId={condId}
        onSelect={setCondId}
        onActivate={(id) => { setCondId(id); setExprOpen(true); }}
      />
      <ArbitraryConditionModal
        isOpen={exprOpen}
        initialValue={op.conditions.find((c) => c.id === condId)?.expression || ''}
        fields={fields}
        onCancel={() => setExprOpen(false)}
        onSave={(value) => {
          edit(props, (_q, item) => {
            const row = item.conditions.find((c) => c.id === condId);
            if (row) row.expression = value.trim();
            else if (value.trim()) item.conditions.push({ id: newId(), expression: value.trim() });
          });
          setExprOpen(false);
        }}
      />
    </div>
  );
};

export const AdditionallyPage: React.FC<PageProps> = (props) => {
  const query = getSelect(props.schema, props.batchIndex);
  const op = query?.operators[props.operatorIndex];
  const [availableId, setAvailableId] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  if (!query || !op) return null;
  const chosen = new Set(query.forUpdateTables);

  return (
    <div>
      <div className="qw-row">
        <span>Выборка записей</span>
        <label className="qw-check">
          <input type="checkbox" checked={!!op.firstCount} onChange={(e) => edit(props, (_q, item) => { item.firstCount = e.target.checked ? (item.firstCount || '1') : ''; })} />
          Первые
        </label>
        <input className="qw-input" style={{ width: 80 }} disabled={!op.firstCount} value={op.firstCount} onChange={(e) => edit(props, (_q, item) => { item.firstCount = e.target.value; })} />
        <label className="qw-check">
          <input type="checkbox" checked={op.distinct} onChange={(e) => edit(props, (_q, item) => { item.distinct = e.target.checked; })} />
          Без повторяющихся
        </label>
        <label className="qw-check">
          <input type="checkbox" checked={op.allowed} onChange={(e) => edit(props, (_q, item) => { item.allowed = e.target.checked; })} />
          Разрешенные
        </label>
      </div>
      <label className="qw-check">
        <input type="checkbox" checked={query.forUpdate} onChange={(e) => edit(props, (q) => { q.forUpdate = e.target.checked; })} />
        Для изменения
      </label>
      <div className="qw-split" style={{ marginTop: 8 }}>
        <PickList
          title="Доступные таблицы"
          items={op.sources.filter((s) => !chosen.has(s.alias)).map((s) => ({ id: s.alias, label: s.alias }))}
          selectedId={availableId}
          onSelect={setAvailableId}
        />
        <div className="qw-colbtns">
          <SmallButton disabled={!availableId} onClick={() => edit(props, (q) => { if (availableId) q.forUpdateTables.push(availableId); })}>Добавить</SmallButton>
          <SmallButton onClick={() => edit(props, (q, item) => { q.forUpdateTables = item.sources.map((s) => s.alias); })}>Добавить все</SmallButton>
          <SmallButton disabled={!chosenId} onClick={() => edit(props, (q) => { q.forUpdateTables = q.forUpdateTables.filter((n) => n !== chosenId); })}>Удалить</SmallButton>
          <SmallButton onClick={() => edit(props, (q) => { q.forUpdateTables = []; })}>Удалить все</SmallButton>
        </div>
        <PickList
          title="Таблицы для изменения"
          items={query.forUpdateTables.map((name) => ({ id: name, label: name }))}
          selectedId={chosenId}
          onSelect={setChosenId}
        />
      </div>
    </div>
  );
};

export const OrderPage: React.FC<PageProps> = (props) => {
  const query = getSelect(props.schema, props.batchIndex);
  const op = query?.operators[props.operatorIndex];
  const [availableId, setAvailableId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  if (!query || !op) return null;
  const available = [
    ...op.fields.map((f) => f.alias || f.expression),
    ...sourceFieldExprs(op, props.metadataTree),
  ].filter((v, i, arr) => v && arr.indexOf(v) === i);

  const move = (dir: number) => edit(props, (q) => {
    const index = q.order.findIndex((f) => f.id === orderId);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= q.order.length) return;
    const [row] = q.order.splice(index, 1);
    q.order.splice(next, 0, row);
  });

  return (
    <div>
      <label className="qw-check">
        <input type="checkbox" checked={query.autoOrder} onChange={(e) => edit(props, (q) => { q.autoOrder = e.target.checked; })} />
        Автоупорядочивание
      </label>
      <div className="qw-split" style={{ marginTop: 8 }}>
        <PickList title="Доступные поля" items={available.map((f) => ({ id: f, label: f }))} selectedId={availableId} onSelect={setAvailableId} />
        <div className="qw-colbtns">
          <SmallButton disabled={!availableId} onClick={() => edit(props, (q) => { if (availableId) q.order.push({ id: newId(), expression: availableId, direction: 'asc' }); })}>Добавить</SmallButton>
          <SmallButton onClick={() => edit(props, (q, item) => {
            q.order = item.fields.map((f) => ({ id: newId(), expression: f.alias || f.expression, direction: 'asc' as const }));
          })}>Добавить все</SmallButton>
          <SmallButton disabled={!orderId} onClick={() => edit(props, (q) => { q.order = q.order.filter((f) => f.id !== orderId); })}>Удалить</SmallButton>
          <SmallButton onClick={() => edit(props, (q) => { q.order = []; })}>Удалить все</SmallButton>
          <SmallButton disabled={!orderId} onClick={() => move(-1)}>Вверх</SmallButton>
          <SmallButton disabled={!orderId} onClick={() => move(1)}>Вниз</SmallButton>
          <SmallButton disabled={!orderId} onClick={() => edit(props, (q) => {
            const row = q.order.find((f) => f.id === orderId);
            if (row) row.direction = row.direction === 'asc' ? 'desc' : 'asc';
          })}>Возр / Убыв</SmallButton>
        </div>
        <PickList
          title="Порядок"
          items={query.order.map((f) => ({ id: f.id, label: `${f.expression}${f.direction === 'desc' ? ' УБЫВ' : ''}` }))}
          selectedId={orderId}
          onSelect={setOrderId}
        />
      </div>
    </div>
  );
};

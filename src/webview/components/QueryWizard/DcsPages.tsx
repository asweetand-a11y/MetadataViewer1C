/**
 * Вкладки компоновки данных и характеристик.
 */

import React, { useState } from 'react';
import type { QueryMetadataNode } from '../DcsEditor/MetadataTreePanel';
import {
  cloneData,
  getSelect,
  newId,
  type CharacteristicDef,
  type JoinType,
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

function change(props: PageProps, recipe: (query: SelectQuery) => void): void {
  const next = cloneData(props.schema);
  const query = getSelect(next, props.batchIndex);
  if (!query) return;
  recipe(query);
  props.onChange(next);
}

function emptyCharacteristic(): CharacteristicDef {
  return {
    id: newId(),
    dataType: '',
    typesSource: '',
    keyField: '',
    nameField: '',
    valueTypeField: '',
    valuesSource: '',
    objectField: '',
    typeField: '',
    valueField: '',
  };
}

export const DataCompositionPage: React.FC<PageProps> = (props) => {
  const query = getSelect(props.schema, props.batchIndex);
  const op = query?.operators[props.operatorIndex];
  const [sub, setSub] = useState<'tables' | 'fields' | 'filters'>('fields');
  const [availableId, setAvailableId] = useState<string | null>(null);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [joinId, setJoinId] = useState<string | null>(null);
  if (!query || !op) return null;
  const fields = sourceFieldExprs(op, props.metadataTree);

  return (
    <div>
      <div className="qw-row">
        <SmallButton onClick={() => setSub('tables')}>Таблицы</SmallButton>
        <SmallButton onClick={() => setSub('fields')}>Поля</SmallButton>
        <SmallButton onClick={() => setSub('filters')}>Условия</SmallButton>
      </div>
      {sub === 'tables' ? (
        <div>
          <div className="qw-empty">Обязательные соединения для компоновки. В текст запроса они попадают комментарием и не мешают выполнению.</div>
          <div className="qw-row">
            <SmallButton disabled={op.sources.length < 2} onClick={() => change(props, (q) => {
              const left = op.sources[0];
              const right = op.sources[1];
              q.requiredJoins.push({
                id: newId(),
                leftSourceId: left.id,
                rightSourceId: right.id,
                joinType: 'left',
                condition: `${left.alias}.Ссылка = ${right.alias}.Ссылка`,
              });
            })}>Добавить</SmallButton>
            <SmallButton disabled={!joinId} onClick={() => change(props, (q) => { q.requiredJoins = q.requiredJoins.filter((j) => j.id !== joinId); })}>Удалить</SmallButton>
          </div>
          <table className="qw-table">
            <thead><tr><th>Левая</th><th>Тип</th><th>Правая</th><th>Условие</th></tr></thead>
            <tbody>
              {query.requiredJoins.map((join) => (
                <tr key={join.id} onClick={() => setJoinId(join.id)}>
                  <td>{op.sources.find((s) => s.id === join.leftSourceId)?.alias}</td>
                  <td>
                    <select className="qw-select" value={join.joinType} onChange={(e) => change(props, (q) => {
                      const row = q.requiredJoins.find((j) => j.id === join.id);
                      if (row) row.joinType = e.target.value as JoinType;
                    })}>
                      <option value="inner">Внутреннее</option>
                      <option value="left">Левое</option>
                      <option value="right">Правое</option>
                      <option value="full">Полное</option>
                    </select>
                  </td>
                  <td>{op.sources.find((s) => s.id === join.rightSourceId)?.alias}</td>
                  <td>
                    <input className="qw-input" value={join.condition} onChange={(e) => change(props, (q) => {
                      const row = q.requiredJoins.find((j) => j.id === join.id);
                      if (row) row.condition = e.target.value;
                    })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {sub === 'fields' ? (
        <div className="qw-split">
          <PickList title="Доступные поля" items={fields.map((f) => ({ id: f, label: f }))} selectedId={availableId} onSelect={setAvailableId} />
          <div className="qw-colbtns">
            <SmallButton disabled={!availableId} onClick={() => change(props, (q) => q.dataCompositionFields.push({ id: newId(), expression: availableId || '', alias: '' }))}>Добавить</SmallButton>
            <SmallButton onClick={() => change(props, (q) => { q.dataCompositionFields = fields.map((f) => ({ id: newId(), expression: f, alias: '' })); })}>Добавить все</SmallButton>
            <SmallButton disabled={!fieldId} onClick={() => change(props, (q) => { q.dataCompositionFields = q.dataCompositionFields.filter((f) => f.id !== fieldId); })}>Удалить</SmallButton>
            <SmallButton onClick={() => change(props, (q) => { q.dataCompositionFields = []; })}>Удалить все</SmallButton>
          </div>
          <PickList title="Поля компоновки" items={query.dataCompositionFields.map((f) => ({ id: f.id, label: f.alias ? `${f.expression} КАК ${f.alias}` : f.expression }))} selectedId={fieldId} onSelect={setFieldId} />
        </div>
      ) : null}
      {sub === 'filters' ? (
        <div className="qw-split">
          <PickList title="Доступные поля" items={fields.map((f) => ({ id: f, label: f }))} selectedId={availableId} onSelect={setAvailableId} />
          <div className="qw-colbtns">
            <SmallButton disabled={!availableId} onClick={() => change(props, (q) => q.dataCompositionFilters.push({ id: newId(), expression: availableId || '' }))}>Добавить</SmallButton>
            <SmallButton onClick={() => change(props, (q) => { q.dataCompositionFilters = fields.map((f) => ({ id: newId(), expression: f })); })}>Добавить все</SmallButton>
            <SmallButton disabled={!filterId} onClick={() => change(props, (q) => { q.dataCompositionFilters = q.dataCompositionFilters.filter((f) => f.id !== filterId); })}>Удалить</SmallButton>
            <SmallButton onClick={() => change(props, (q) => { q.dataCompositionFilters = []; })}>Удалить все</SmallButton>
          </div>
          <PickList title="Условия компоновки" items={query.dataCompositionFilters.map((f) => ({ id: f.id, label: f.expression }))} selectedId={filterId} onSelect={setFilterId} />
        </div>
      ) : null}
    </div>
  );
};

export const CharacteristicsPage: React.FC<PageProps> = (props) => {
  const query = getSelect(props.schema, props.batchIndex);
  const [charId, setCharId] = useState<string | null>(null);
  if (!query) return null;
  const current = query.characteristics.find((c) => c.id === charId) || query.characteristics[0] || null;

  const patch = (recipe: (row: CharacteristicDef) => void) => {
    if (!current) return;
    change(props, (q) => {
      const row = q.characteristics.find((c) => c.id === current.id);
      if (row) recipe(row);
    });
  };

  const field = (label: string, key: keyof CharacteristicDef) => (
    <label key={key} className="qw-row">
      <span style={{ width: 220 }}>{label}</span>
      <input className="qw-input" value={current ? String(current[key] || '') : ''} disabled={!current} onChange={(e) => patch((row) => { (row[key] as string) = e.target.value; })} />
    </label>
  );

  return (
    <div>
      <div className="qw-row">
        <SmallButton onClick={() => {
          const row = emptyCharacteristic();
          change(props, (q) => q.characteristics.push(row));
          setCharId(row.id);
        }}>Добавить</SmallButton>
        <SmallButton disabled={!current} onClick={() => change(props, (q) => { q.characteristics = q.characteristics.filter((c) => c.id !== current?.id); })}>Удалить</SmallButton>
      </div>
      <PickList
        title="Характеристики"
        items={query.characteristics.map((c, i) => ({ id: c.id, label: c.dataType || `Характеристика ${i + 1}` }))}
        selectedId={current?.id || null}
        onSelect={setCharId}
      />
      {field('Тип (без ТИП)', 'dataType')}
      {field('Виды характеристик', 'typesSource')}
      {field('Поле ключа', 'keyField')}
      {field('Поле имени', 'nameField')}
      {field('Поле типа значения', 'valueTypeField')}
      {field('Значения характеристик', 'valuesSource')}
      {field('Поле объекта', 'objectField')}
      {field('Поле вида', 'typeField')}
      {field('Поле значения', 'valueField')}
    </div>
  );
};

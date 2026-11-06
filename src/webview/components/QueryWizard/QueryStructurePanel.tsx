/**
 * Пакет запросов, параметры и функции языка запросов справа от текста.
 */

import React, { useMemo, useState } from "react";
import type * as monaco from "monaco-editor";
import { batchQueryAt, batchQueryTitle, parseBatch } from "../../queryLanguage/batch";
import { FUNCTION_CATALOG, isCatalogFolder, type CatalogFolder, type CatalogItem } from "../../queryLanguage/function-catalog";
import { collectParameters } from "../../queryLanguage/parameters";
import { appendBatchQuery, insertQuerySnippet, selectOffsetRange } from "../../queryLanguage/editorActions";

const FUNCTIONS_FOLDER = "Функции";

export function QueryStructurePanel(props: {
  text: string;
  editor: monaco.editor.IStandaloneCodeEditor | null;
}): JSX.Element {
  const queries = useMemo(() => parseBatch(props.text), [props.text]);
  const parameters = useMemo(() => collectParameters(props.text), [props.text]);
  const offset = props.editor?.getPosition() ? props.editor.getModel()?.getOffsetAt(props.editor.getPosition()!) ?? 0 : 0;
  const active = batchQueryAt(queries, offset);

  return (
    <div className="qw-structure">
      <section>
        <div className="qw-list__title">Структура запроса</div>
        <div className="qw-structure__body">
          {queries.length === 0 ? <div className="qw-empty">Запрос пуст</div> : null}
          <button
            type="button"
            className="qw-structure__item"
            onClick={() => props.editor && appendBatchQuery(props.editor)}
          >
            + Добавить запрос
          </button>
          {queries.map((query) => (
            <button
              key={`${query.index}-${query.start}`}
              type="button"
              className={`qw-structure__item ${query === active ? "is-active" : ""}`}
              onClick={() => props.editor && selectOffsetRange(props.editor, query.start, query.end)}
            >
              {batchQueryTitle(query)}
            </button>
          ))}
        </div>
      </section>
      <section>
        <div className="qw-list__title">Параметры</div>
        <div className="qw-structure__body">
          {parameters.length === 0 ? <div className="qw-empty">Параметров нет</div> : null}
          {parameters.map((parameter) => (
            <button
              key={parameter.name.toUpperCase()}
              type="button"
              className="qw-structure__item"
              onClick={() => {
                if (!props.editor) return;
                const cursor = props.editor.getModel()?.getOffsetAt(props.editor.getPosition()!) ?? 0;
                const next = parameter.occurrences.find((item) => item.start >= cursor) ?? parameter.occurrences[0];
                selectOffsetRange(props.editor, next.start, next.end);
              }}
            >
              &amp;{parameter.name}{parameter.occurrences.length > 1 ? ` (${parameter.occurrences.length})` : ""}
            </button>
          ))}
        </div>
      </section>
      <FunctionTree onInsert={(snippet, applyToField) => props.editor && insertQuerySnippet(props.editor, snippet, applyToField)} />
    </div>
  );
}

function FunctionTree(props: { onInsert: (snippet: string, applyToField: boolean) => void }): JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(FUNCTION_CATALOG.map((folder) => `/${folder.label}`)));
  const toggle = (id: string) => {
    setExpanded((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const renderNodes = (nodes: (CatalogFolder | CatalogItem)[], depth: number, parentId: string, functions = false): React.ReactNode =>
    nodes.map((node) => {
      const id = `${parentId}/${node.label}`;
      if (!isCatalogFolder(node)) {
        return (
          <button key={id} type="button" className="qw-structure__item" style={{ paddingLeft: 8 + depth * 12 }} onClick={() => props.onInsert(node.snippet, functions)}>
            {node.label}
          </button>
        );
      }
      const open = expanded.has(id);
      return (
        <div key={id}>
          <button type="button" className="qw-structure__item" style={{ paddingLeft: 8 + depth * 12 }} onClick={() => toggle(id)}>
            {open ? "▾ " : "▸ "}{node.label}
          </button>
          {open ? renderNodes(node.children, depth + 1, id, functions || (depth === 0 && node.label === FUNCTIONS_FOLDER)) : null}
        </div>
      );
    });
  return (
    <section>
      <div className="qw-list__title">Функции языка запросов</div>
      <div className="qw-structure__body">{renderNodes(FUNCTION_CATALOG, 0, "")}</div>
    </section>
  );
}

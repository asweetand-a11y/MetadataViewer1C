/**
 * Ленивое дерево объектов конфигурации для редактора запросов.
 * Дети узла считаются при раскрытии. Временные таблицы берутся из текста запроса.
 */

import React, { useMemo, useState } from "react";
import { MD_KINDS, type ConfigurationModel, type MdObject } from "../../../queryModel/model";
import { MetadataIndex, type TableField } from "../../queryLanguage/completion/metadata-index";
import { tempTablesOf } from "../../queryLanguage/completion/query-context";
import { FIELD_DRAG_TYPE, type SmartTarget } from "../../queryLanguage/smart-insert";
import { usedObjects } from "../../queryLanguage/used-objects";
import "../DcsEditor/MetadataTreePanel.css";

type Icon = "kind" | "object" | "group" | "table" | "virtual" | "field" | "value";

export type QueryTreeNode = {
  id: string;
  label: string;
  detail?: string;
  title?: string;
  icon: Icon;
  insert?: string;
  target?: SmartTarget;
  children?: () => QueryTreeNode[];
};

const PAGE = 300;

export function QueryMetadataTree(props: {
  model: ConfigurationModel | null;
  text: string;
  onSmartInsert?: (target: SmartTarget) => void;
  onActivate?: (node: QueryTreeNode) => void;
}): JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState<Set<string>>(new Set());
  const [onlyUsed, setOnlyUsed] = useState(false);
  const index = useMemo(() => (props.model ? new MetadataIndex(props.model) : null), [props.model]);
  const query = search.trim().toLowerCase();
  const used = useMemo(() => (index && onlyUsed ? usedObjects(props.text, index) : null), [index, onlyUsed, props.text]);
  const temps = useMemo(() => (index ? tempTableNodes(index, props.text, query) : []), [index, props.text, query]);
  const roots = useMemo(() => (index ? [...kindNodes(index, query, used), ...temps] : []), [index, query, used, temps]);

  const toggle = (id: string) => {
    setExpanded((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isExpanded = (node: QueryTreeNode, depth: number) => ((query || used) && depth === 0) || expanded.has(node.id);

  const activate = (node: QueryTreeNode) => {
    if (node.target && props.onSmartInsert) props.onSmartInsert(node.target);
    else props.onActivate?.(node);
  };

  const renderNodes = (nodes: QueryTreeNode[], depth: number): React.ReactNode => {
    const parentId = nodes[0]?.id.split("/").slice(0, -1).join("/") ?? "";
    const limited = depth === 1 && nodes.length > PAGE && !showAll.has(parentId);
    const visible = limited ? nodes.slice(0, PAGE) : nodes;
    return (
      <>
        {visible.map((node) => {
          const hasChildren = Boolean(node.children);
          const open = hasChildren && isExpanded(node, depth);
          return (
            <div key={node.id} className="md-tree__node">
              <div
                className="md-tree__row"
                style={{ paddingLeft: 8 + depth * 14 }}
                title={node.title || node.insert}
                draggable={Boolean(node.insert)}
                onDragStart={(event) => {
                  if (!node.insert) return;
                  event.dataTransfer.setData("text/plain", node.insert);
                  if (node.target?.kind === "field") {
                    event.dataTransfer.setData(FIELD_DRAG_TYPE, JSON.stringify({ table: node.target.table, field: node.target.field }));
                  }
                  event.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => hasChildren && toggle(node.id)}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  if (node.target || node.insert) activate(node);
                }}
              >
                <span className="md-tree__spacer">{hasChildren ? (open ? "▾" : "▸") : "·"}</span>
                <span className={`md-tree__label ${node.insert ? "is-draggable" : ""}`}>{node.label}</span>
                {node.detail ? <span className="md-tree__detail">{node.detail}</span> : null}
              </div>
              {open && node.children ? renderNodes(node.children(), depth + 1) : null}
            </div>
          );
        })}
        {limited ? (
          <button type="button" className="md-tree__more" style={{ paddingLeft: 12 + depth * 14 }} onClick={() => setShowAll((set) => new Set(set).add(parentId))}>
            Показать все ({nodes.length})
          </button>
        ) : null}
      </>
    );
  };

  if (!props.model) return <div className="qw-empty">Загрузка конфигурации…</div>;

  return (
    <div className="md-tree">
      <div className="md-tree__toolbar">
        <input className="md-tree__search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск объекта" aria-label="Поиск объекта" />
        <button type="button" className="md-tree__filter" onClick={() => setOnlyUsed((value) => !value)}>
          {onlyUsed ? "Все объекты" : "Только из запроса"}
        </button>
      </div>
      <div className="md-tree__content">
        {roots.length === 0 ? <div className="qw-empty">{used && !used.size ? "В запросе нет объектов конфигурации" : "Ничего не найдено"}</div> : renderNodes(roots, 0)}
      </div>
    </div>
  );
}

function kindNodes(index: MetadataIndex, query: string, used: Set<MdObject> | null): QueryTreeNode[] {
  return MD_KINDS.flatMap(({ kind, plural, queryName }) => {
    const all = index.objects(kind).filter((object) => !used || used.has(object)).sort((a, b) => a.name.localeCompare(b.name, "ru"));
    const objects = query ? all.filter((object) => object.name.toLowerCase().includes(query) || object.synonym?.toLowerCase().includes(query)) : all;
    if (!objects.length) return [];
    const id = `k:${kind}`;
    return [{
      id,
      label: plural,
      detail: String(objects.length),
      icon: "kind" as const,
      children: () => objects.map((object) => objectNode(index, object, `${id}/${object.name}`, queryName)),
    }];
  });
}

function tempTableNodes(index: MetadataIndex, text: string, query: string): QueryTreeNode[] {
  const tables = tempTablesOf(text, index).filter((table) => table.name.toLowerCase().includes(query));
  if (!tables.length) return [];
  return [{
    id: "temp",
    label: "Временные таблицы",
    detail: String(tables.length),
    icon: "kind",
    children: () => tables.map((table) => ({
      id: `temp/${table.name}`,
      label: table.name,
      title: "Временная таблица",
      icon: "table" as const,
      insert: table.name,
      target: { kind: "table" as const, path: [table.name] },
      children: () => fieldNodes(table.fields, `temp/${table.name}`, [table.name]),
    })),
  }];
}

function objectNode(index: MetadataIndex, object: MdObject, id: string, queryName: string): QueryTreeNode {
  const full = `${queryName}.${object.name}`;
  return {
    id,
    label: object.name,
    title: object.synonym,
    icon: "object",
    insert: full,
    target: { kind: "table", path: [queryName, object.name] },
    children: () => objectChildren(index, object, id, full),
  };
}

function objectChildren(index: MetadataIndex, object: MdObject, id: string, full: string): QueryTreeNode[] {
  const all = index.fieldsOf({ type: "object", object });
  const reference = all.filter((field) => field.group === "standard" && field.name === "Ссылка");
  const standard = all.filter((field) => field.group === "standard" && field.name !== "Ссылка");
  const groups: QueryTreeNode[] = fieldNodes(reference, id, full.split("."));
  const addGroup = (key: string, label: string, fields: TableField[]) => {
    if (!fields.length) return;
    groups.push({
      id: `${id}/${key}`,
      label,
      detail: String(fields.length),
      icon: "group",
      children: () => fieldNodes(fields, `${id}/${key}`, full.split(".")),
    });
  };
  addGroup("dimensions", "Измерения", all.filter((field) => field.group === "dimension"));
  addGroup("resources", "Ресурсы", all.filter((field) => field.group === "resource"));
  addGroup("attributes", "Реквизиты", all.filter((field) => field.group === "attribute"));
  const subTables = index.subTables(object);
  const tabular = subTables.filter((item) => item.kind === "tabular");
  if (tabular.length) {
    groups.push({
      id: `${id}/tables`,
      label: "Табличные части",
      detail: String(tabular.length),
      icon: "group",
      children: () => tabular.map((item) => tableNode(index, [full, item.name], `${id}/tables/${item.name}`, "table", item.synonym)),
    });
  }
  const virtual = subTables.filter((item) => item.kind === "virtual");
  if (virtual.length) {
    groups.push({
      id: `${id}/virtual`,
      label: "Виртуальные таблицы",
      detail: String(virtual.length),
      icon: "group",
      children: () => virtual.map((item) => tableNode(index, [full, item.name], `${id}/virtual/${item.name}`, "virtual")),
    });
  }
  if (object.values?.length) {
    groups.push({
      id: `${id}/values`,
      label: "Значения",
      detail: String(object.values.length),
      icon: "group",
      children: () => object.values!.map((value) => ({
        id: `${id}/values/${value}`,
        label: value,
        icon: "value" as const,
        insert: `ЗНАЧЕНИЕ(${full}.${value})`,
      })),
    });
  }
  if (object.predefined?.length) {
    groups.push({
      id: `${id}/predefined`,
      label: "Предопределенные",
      detail: String(object.predefined.length),
      icon: "group",
      children: () => object.predefined!.map((item) => ({
        id: `${id}/predefined/${item.name}`,
        label: item.name,
        title: item.description,
        icon: "value" as const,
        insert: `ЗНАЧЕНИЕ(${full}.${item.name})`,
      })),
    });
  }
  addGroup("standard", "Стандартные реквизиты", standard);
  return groups;
}

function tableNode(index: MetadataIndex, [full, name]: [string, string], id: string, icon: "table" | "virtual", synonym?: string): QueryTreeNode {
  const path = `${full}.${name}`;
  return {
    id,
    label: name,
    title: synonym ?? (icon === "virtual" ? "Виртуальная таблица" : undefined),
    icon,
    insert: path,
    target: { kind: "table", path: path.split(".") },
    children: () => {
      const table = index.resolveTable(path.split("."));
      return table ? fieldNodes(index.fieldsOf(table), id, path.split(".")) : [];
    },
  };
}

function fieldNodes(fields: TableField[], parentId: string, table: string[]): QueryTreeNode[] {
  return fields.map((field) => ({
    id: `${parentId}/${field.name}`,
    label: field.name,
    detail: field.types.join(" | ") || undefined,
    title: field.synonym,
    icon: "field" as const,
    insert: field.name,
    target: { kind: "field" as const, table, field: field.name },
  }));
}

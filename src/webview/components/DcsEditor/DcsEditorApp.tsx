/**
 * DcsEditorApp
 *
 * EDT‑подобный webview редактор СКД (DataCompositionSchema).
 * MVP: редактирование в памяти (без сохранения в XML).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TypeWidget } from '../../widgets/TypeWidget';
import { QueryEditorEnhanced } from './QueryEditorEnhanced';
import { MetadataTreePanel, type QueryMetadataNode } from './MetadataTreePanel';
import { setQueryMetadataCompletionTree } from '../../utils/monacoQueryLanguage';
import { GROUPING_OUTPUT_PARAMS, GROUPING_PARAM_MAP } from './dcsGroupingParams';
type DcsNode = {
  path: string;
  tag: string;
  attrs: Record<string, any>;
  text?: string;
  children: DcsNode[];
};

type ParsedDcsSchema = {
  sourcePath: string;
  rootTag: string;
  children: DcsNode[];
  _originalXml: string;
  _raw?: any; // Опциональный, не отправляется из extension (циклические ссылки DOM)
  _rootAttrs?: Record<string, any>;
};

type ParsedReportDcs = {
  reportName: string;
  reportPath: string;
  templateName: string;
  templatePath: string;
  mainRef: string;
  schema: ParsedDcsSchema;
};

type DcsEditorInitMessage = {
  type: 'dcsEditorInit';
  payload: ParsedReportDcs;
  metadata?: {
    registers: string[];
    referenceTypes: string[];
  };
};

type TreeNode = {
  path: string;
  label: string;
  tag: string;
  children: TreeNode[];
};

type DcsListRow = {
  key: string;
  title: string;
  subtitle?: string;
  nodePath?: string;
  queryParamName?: string;
};

type DcsTabId =
  | 'datasets'
  | 'links'
  | 'calcFields'
  | 'resources'
  | 'parameters'
  | 'layouts'
  | 'nested'
  | 'settings';

function normalizeTextForSearch(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function localTag(tag: string): string {
  const t = String(tag || '');
  const idx = t.lastIndexOf(':');
  return idx >= 0 ? t.slice(idx + 1) : t;
}

function stripNamespacePrefix(typeText: string): string {
  const s = String(typeText || '').trim();
  // Пример из DCS: d4p1:CatalogRef.Организации
  // Для TypeWidget нужны значения без namespace-префикса.
  const idx = s.indexOf(':');
  if (idx >= 0) {
    const left = s.slice(0, idx);
    const right = s.slice(idx + 1);
    // оставляем xs:/v8: как есть (это не namespace, это префикс типа)
    if (left === 'xs' || left === 'v8' || left === 'cfg') return s;
    return right;
  }
  return s;
}

function objectToDcsChildren(value: any): DcsNode[] {
  if (!value || typeof value !== 'object') return [];
  const children: DcsNode[] = [];
  for (const k of Object.keys(value)) {
    const v = (value as any)[k];
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === 'object') {
          children.push({ path: '', tag: k, attrs: {}, children: objectToDcsChildren(item) });
        } else {
          children.push({ path: '', tag: k, attrs: {}, text: String(item ?? ''), children: [] });
        }
      }
      continue;
    }
    if (v && typeof v === 'object') {
      children.push({ path: '', tag: k, attrs: {}, children: objectToDcsChildren(v) });
    } else {
      children.push({ path: '', tag: k, attrs: {}, text: String(v ?? ''), children: [] });
    }
  }
  return children;
}

/**
 * Утилиты для работы с деревом DCS (локальные, без зависимостей от парсера XML).
 */
function isWhitespaceNode(tag: string): boolean {
  return !String(tag || '').trim();
}

function isScalarNode(node: DcsNode | null | undefined): boolean {
  if (!node) return false;
  return !Array.isArray(node.children) || node.children.length === 0;
}

function findChildNodeByLocalTag(node: DcsNode | null | undefined, wantedLocalTag: string): DcsNode | null {
  if (!node) return null;
  for (const ch of node.children || []) {
    if (localTag(ch.tag) === wantedLocalTag) return ch;
  }
  return null;
}

function getChildTextByLocalTag(node: DcsNode | null | undefined, wantedLocalTag: string): string {
  const ch = findChildNodeByLocalTag(node, wantedLocalTag);
  return String(ch?.text ?? '').trim();
}

/** Извлекает текст из узла value параметра (поддержка v8:LocalStringType и простого текста) */
function extractValueFromParameterValue(valueNode: DcsNode | null | undefined): string {
  if (!valueNode) return '';
  let val = String(valueNode.text || '').trim();
  if (val) return val;
  if (!valueNode.children?.length) return '';
  // v8:LocalStringType: value -> v8:item -> v8:content
  const itemNode = findChildNodeByLocalTag(valueNode, 'item');
  if (itemNode) {
    const contentNode = findChildNodeByLocalTag(itemNode, 'content');
    return String(contentNode?.text ?? '').trim();
  }
  // Прямой поиск content в детях (на случай другой структуры)
  const contentNode = (valueNode.children || []).find((c) => localTag(c.tag) === 'content');
  return contentNode ? String(contentNode.text ?? '').trim() : '';
}

function findAllNodes(root: DcsNode[]): Array<{ path: string; node: DcsNode }> {
  const out: Array<{ path: string; node: DcsNode }> = [];
  const walk = (n: DcsNode) => {
    if (!n) return;
    out.push({ path: n.path, node: n });
    if (Array.isArray(n.children)) for (const ch of n.children) walk(ch);
  };
  for (const n of root || []) walk(n);
  return out;
}

function findFirstPathByLocalTag(root: DcsNode[], wantedLocalTag: string): string {
  const walk = (list: DcsNode[]): string => {
    for (const n of list || []) {
      if (!n) continue;
      if (localTag(n.tag) === wantedLocalTag) return n.path;
      const nested = walk(n.children || []);
      if (nested) return nested;
    }
    return '';
  };
  return walk(root || []);
}

function getNodeAtPath(root: DcsNode[], nodePath: string): DcsNode | null {
  if (!nodePath) return null;
  const idxs = nodePath.split('.').map((s) => Number(s));
  let list: DcsNode[] | undefined = root;
  let cur: DcsNode | null = null;
  for (const idx of idxs) {
    if (!Array.isArray(list) || !Number.isFinite(idx) || idx < 0 || idx >= list.length) return null;
    cur = list[idx];
    list = cur?.children;
  }
  return cur;
}

function updateNodeAtPath(root: DcsNode[], nodePath: string, updater: (n: DcsNode) => DcsNode): DcsNode[] {
  const idxs = String(nodePath || '').split('.').map((s) => Number(s)).filter((n) => Number.isFinite(n));
  if (idxs.length === 0) return root;

  const rec = (list: DcsNode[], depth: number): DcsNode[] => {
    const idx = idxs[depth];
    if (!Array.isArray(list) || idx < 0 || idx >= list.length) return list;

    const next = list.slice();
    if (depth === idxs.length - 1) {
      next[idx] = updater(next[idx]);
      return next;
    }

    const cur = next[idx];
    next[idx] = { ...cur, children: rec(cur.children || [], depth + 1) };
    return next;
  };

  return rec(root || [], 0);
}

function reindexPaths(nodes: DcsNode[], basePath: string = ''): DcsNode[] {
  const walk = (list: DcsNode[], parentPath: string): DcsNode[] => {
    return (list || []).map((n, idx) => {
      const p = parentPath ? `${parentPath}.${idx}` : `${idx}`;
      return {
        ...n,
        path: p,
        children: walk(n.children || [], p),
      };
    });
  };
  return walk(nodes || [], basePath);
}

function makeTextNode(tag: string, text: string): DcsNode {
  return { path: '', tag, attrs: {}, text, children: [] };
}

function makeLocalStringTitleNode(title: string): DcsNode {
  return {
    path: '',
    tag: 'title',
    attrs: { '@_xsi:type': 'v8:LocalStringType' },
    children: [
      {
        path: '',
        tag: 'v8:item',
        attrs: {},
        children: [makeTextNode('v8:lang', 'ru'), makeTextNode('v8:content', title || '')],
      },
    ],
  };
}

function getLocalStringTitle(node: DcsNode): string {
  const titleNode = findChildNodeByLocalTag(node, 'title');
  if (!titleNode) return '';
  const items = (titleNode.children || []).filter((c) => localTag(c.tag) === 'item');
  if (items.length === 0) return '';

  const pickContent = (it: DcsNode): string => {
    const content = findChildNodeByLocalTag(it, 'content');
    return String(content?.text ?? '').trim();
  };

  const ruItem = items.find((it) => String(getChildTextByLocalTag(it, 'lang') || '').trim().toLowerCase() === 'ru');
  return pickContent(ruItem || items[0]);
}

function upsertLocalStringTitle(node: DcsNode, value: string): DcsNode {
  const titleIdx = (node.children || []).findIndex((c) => localTag(c.tag) === 'title');
  if (titleIdx < 0) {
    return { ...node, children: [...(node.children || []), makeLocalStringTitleNode(value)] };
  }

  const titleNode = node.children[titleIdx];
  const itemIdx = (titleNode.children || []).findIndex((c) => localTag(c.tag) === 'item');
  // Убеждаемся, что атрибут xsi:type присутствует
  const nextTitle = { ...titleNode, attrs: { ...titleNode.attrs, '@_xsi:type': 'v8:LocalStringType' } };
  let itemNode: DcsNode;

  if (itemIdx < 0) {
    itemNode = { path: '', tag: 'v8:item', attrs: {}, children: [makeTextNode('v8:lang', 'ru'), makeTextNode('v8:content', value)] };
    nextTitle.children = [...(titleNode.children || []), itemNode];
  } else {
    itemNode = titleNode.children[itemIdx];
    const contentIdx = (itemNode.children || []).findIndex((c) => localTag(c.tag) === 'content');
    let nextItem = { ...itemNode };
    if (contentIdx < 0) {
      nextItem.children = [...(itemNode.children || []), makeTextNode('v8:content', value)];
    } else {
      const contentNode = itemNode.children[contentIdx];
      const nextChildren = itemNode.children.slice();
      nextChildren[contentIdx] = { ...contentNode, text: value };
      nextItem.children = nextChildren;
    }
    const nextTitleChildren = titleNode.children.slice();
    nextTitleChildren[itemIdx] = nextItem;
    nextTitle.children = nextTitleChildren;
  }

  const nextRootChildren = node.children.slice();
  nextRootChildren[titleIdx] = nextTitle;
  return { ...node, children: nextRootChildren };
}

function upsertChildTextByLocalTag(node: DcsNode, wantedLocalTag: string, value: string, overrideTag?: string): DcsNode {
  const idx = (node.children || []).findIndex((c) => localTag(c.tag) === wantedLocalTag);
  if (idx < 0) {
    const tag = overrideTag || wantedLocalTag;
    return { ...node, children: [...(node.children || []), makeTextNode(tag, value)] };
  }
  const nextChildren = node.children.slice();
  nextChildren[idx] = { ...nextChildren[idx], text: value };
  return { ...node, children: nextChildren };
}

function removeChildByLocalTag(node: DcsNode, wantedLocalTag: string): DcsNode {
  const nextChildren = (node.children || []).filter((c) => localTag(c.tag) !== wantedLocalTag);
  return { ...node, children: nextChildren };
}

/** Параметры, требующие v8:LocalStringType (Заголовок и др.) */
const OUTPUT_PARAMS_LOCAL_STRING = new Set(['Заголовок']);

/** Префиксы namespace для XDTO-совместимости 1С (dcscor=core, dcsset=settings) */
const DCSCOR = 'dcscor';
const DCSSET = 'dcsset';

function makeOutputParameterValueNode(paramName: string, paramValue: string, valueTag = 'dcscor:value'): DcsNode {
  if (OUTPUT_PARAMS_LOCAL_STRING.has(paramName)) {
    return {
      path: '',
      tag: valueTag,
      attrs: { '@_xsi:type': 'v8:LocalStringType' } as Record<string, string>,
      children: [{
        path: '',
        tag: 'v8:item',
        attrs: {},
        children: [
          makeTextNode('v8:lang', 'ru'),
          makeTextNode('v8:content', paramValue),
        ],
      }],
    };
  }
  return { ...makeTextNode('value', paramValue), tag: valueTag };
}

/** Добавляет или обновляет параметр в outputParameters группировки (use = включён) */
function upsertOutputParameter(structNode: DcsNode, paramName: string, paramValue: string, use = true): DcsNode {
  let outParamsNode = (structNode.children || []).find((c) => localTag(c.tag) === 'outputParameters');
  const firstItem = outParamsNode?.children?.[0];
  const paramTag = firstItem ? (findChildNodeByLocalTag(firstItem, 'parameter')?.tag as string) || `${DCSCOR}:parameter` : `${DCSCOR}:parameter`;
  const valueTag = firstItem ? (findChildNodeByLocalTag(firstItem, 'value')?.tag as string) || `${DCSCOR}:value` : `${DCSCOR}:value`;
  const useTag = firstItem ? (findChildNodeByLocalTag(firstItem, 'use')?.tag as string) || `${DCSCOR}:use` : `${DCSCOR}:use`;
  const itemChildren = [
    { ...makeTextNode('parameter', paramName), tag: paramTag },
    makeOutputParameterValueNode(paramName, paramValue, valueTag),
    { ...makeTextNode('use', use ? 'true' : 'false'), tag: useTag },
  ];
  if (!outParamsNode) {
    const itemTag = `${DCSCOR}:item`;
    const outParamsTag = `${DCSSET}:outputParameters`;
    const newItem = { path: '', tag: itemTag, attrs: { '@_xsi:type': 'dcsset:SettingsParameterValue' } as Record<string, string>, children: itemChildren };
    outParamsNode = { path: '', tag: outParamsTag, attrs: {} as Record<string, string>, children: [newItem] };
    return { ...structNode, children: [...(structNode.children || []), outParamsNode] };
  }
  const items = outParamsNode.children || [];
  const itemIdx = items.findIndex((it) => {
    const p = findChildNodeByLocalTag(it, 'parameter');
    return p && String(p.text || '').trim() === paramName;
  });
  const newItemNode = {
    path: '',
    tag: (items[0]?.tag as string) || `${DCSCOR}:item`,
    attrs: (items[0]?.attrs as Record<string, string>) || { '@_xsi:type': 'dcsset:SettingsParameterValue' } as Record<string, string>,
    children: itemChildren,
  };
  let nextItems: DcsNode[];
  if (itemIdx >= 0) {
    nextItems = items.slice();
    nextItems[itemIdx] = newItemNode;
  } else {
    nextItems = [...items, newItemNode];
  }
  const nextOutParams = { ...outParamsNode, children: nextItems };
  const outIdx = (structNode.children || []).findIndex((c) => localTag(c.tag) === 'outputParameters');
  const nextChildren = (structNode.children || []).slice();
  nextChildren[outIdx] = nextOutParams;
  return { ...structNode, children: nextChildren };
}

/** Устанавливает флаг use для параметра outputParameters */
function setOutputParameterUse(structNode: DcsNode, paramName: string, use: boolean): DcsNode {
  const outParamsNode = (structNode.children || []).find((c) => localTag(c.tag) === 'outputParameters');
  if (!outParamsNode?.children) return structNode;
  const itemIdx = outParamsNode.children.findIndex((it) => {
    const p = findChildNodeByLocalTag(it, 'parameter');
    return p && String(p.text || '').trim() === paramName;
  });
  if (itemIdx < 0) return structNode;
  const item = outParamsNode.children[itemIdx];
  let useNode = findChildNodeByLocalTag(item, 'use');
  const nextItemChildren = (item.children || []).slice();
  if (useNode) {
    const useIdx = nextItemChildren.findIndex((c) => localTag(c.tag) === 'use');
    nextItemChildren[useIdx] = { ...nextItemChildren[useIdx], text: use ? 'true' : 'false' };
  } else {
    nextItemChildren.push(makeTextNode('use', use ? 'true' : 'false'));
  }
  const nextItem = { ...item, children: nextItemChildren };
  const nextItems = outParamsNode.children.slice();
  nextItems[itemIdx] = nextItem;
  const nextOutParams = { ...outParamsNode, children: nextItems };
  const outIdx = (structNode.children || []).findIndex((c) => localTag(c.tag) === 'outputParameters');
  const nextChildren = (structNode.children || []).slice();
  nextChildren[outIdx] = nextOutParams;
  return { ...structNode, children: nextChildren };
}

function getNodeLabel(node: DcsNode): string {
  const lt = localTag(node.tag);
  if (lt === 'dataSet') return getChildTextByLocalTag(node, 'name') || 'dataSet';
  if (lt === 'parameter') return getLocalStringTitle(node) || getChildTextByLocalTag(node, 'name') || 'parameter';
  if (lt === 'field') return getLocalStringTitle(node) || getChildTextByLocalTag(node, 'dataPath') || getChildTextByLocalTag(node, 'field') || 'field';
  if (lt === 'calculatedField') return getLocalStringTitle(node) || getChildTextByLocalTag(node, 'dataPath') || 'calculatedField';
  if (lt === 'totalField') return getChildTextByLocalTag(node, 'dataPath') || 'totalField';
  if (lt === 'settingsVariant') return getChildTextByLocalTag(node, 'name') || 'settingsVariant';
  return lt || node.tag || 'node';
}

function buildTree(nodes: DcsNode[] | undefined): TreeNode[] {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .filter((n) => n && !isWhitespaceNode(n.tag))
    .map((n) => ({
      path: n.path,
      tag: n.tag,
      label: getNodeLabel(n),
      children: buildTree(n.children),
    }));
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const q = normalizeTextForSearch(query);
  if (!q) return nodes;

  const walk = (n: TreeNode): TreeNode | null => {
    const selfMatch = normalizeTextForSearch(n.label).includes(q) || normalizeTextForSearch(n.tag).includes(q);
    const kids = n.children.map(walk).filter(Boolean) as TreeNode[];
    if (selfMatch || kids.length) return { ...n, children: kids };
    return null;
  };

  return nodes.map(walk).filter(Boolean) as TreeNode[];
}

function dcsNodeToObject(node: DcsNode | null | undefined): any {
  if (!node) return undefined;
  if (!node.children || node.children.length === 0) return node.text ?? '';
  const obj: any = {};
  for (const ch of node.children || []) {
    const key = ch.tag;
    const val = dcsNodeToObject(ch);
    if (obj[key] === undefined) obj[key] = val;
    else if (Array.isArray(obj[key])) obj[key].push(val);
    else obj[key] = [obj[key], val];
  }
  return obj;
}

function objectToDcsNode(tag: string, value: any): DcsNode {
  if (value === null || value === undefined) return { path: '', tag, attrs: {}, text: '', children: [] };
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { path: '', tag, attrs: {}, text: String(value), children: [] };
  }
  return { path: '', tag, attrs: {}, children: objectToDcsChildren(value) };
}

function buildTypeWidgetValueFromValueTypeNode(valueTypeNode: DcsNode | null | undefined): any {
  if (!valueTypeNode) return null;
  return dcsNodeToObject(valueTypeNode);
}

function applyTypeWidgetValueToParameter(parameterNode: DcsNode, typeWidgetValue: any): DcsNode {
  const idx = (parameterNode.children || []).findIndex((c) => localTag(c.tag) === 'valueType');
  const nextValueType: DcsNode = objectToDcsNode('valueType', typeWidgetValue);

  if (idx < 0) {
    return { ...parameterNode, children: [...(parameterNode.children || []), nextValueType] };
  }
  const nextChildren = parameterNode.children.slice();
  // сохраняем исходный tag (если он был с namespace-префиксом)
  nextChildren[idx] = { ...nextValueType, tag: parameterNode.children[idx].tag };
  return { ...parameterNode, children: nextChildren };
}

function getFirstTypeFromValueType(node: DcsNode): string {
  const vt = findChildNodeByLocalTag(node, 'valueType');
  if (!vt) return '';
  const t = findChildNodeByLocalTag(vt, 'Type');
  const v8t = findChildNodeByLocalTag(vt, 'Type') || findChildNodeByLocalTag(vt, 'v8:Type');
  const raw = String((t?.text ?? v8t?.text ?? '')).trim();
  if (!raw) {
    // иногда тип лежит как v8:Type внутри valueType
    const anyTypeNode = (vt.children || []).find((c) => localTag(c.tag) === 'Type');
    return stripNamespacePrefix(String(anyTypeNode?.text ?? '').trim());
  }
  return stripNamespacePrefix(raw);
}

function extractFieldNamesFromQuery(query: string): string[] {
  const text = String(query || '');
  if (!text.trim()) return [];

  // 1) Разбиваем на пакеты запросов по ';' (но игнорируем ';' внутри строк/комментариев/скобок { })
  const splitPackages = (s: string): string[] => {
    const out: string[] = [];
    let start = 0;
    let i = 0;
    let inString = false;
    let inLineComment = false;
    let inBlockComment = false;
    let braceDepth = 0; // Глубина вложенности скобок { }

    while (i < s.length) {
      const ch = s[i];
      const next = s[i + 1];

      if (inLineComment) {
        if (ch === '\n') inLineComment = false;
        i++;
        continue;
      }

      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          i += 2;
          continue;
        }
        i++;
        continue;
      }

      if (inString) {
        // 1С: экранирование двойной кавычки часто делается как "" внутри строки
        if (ch === '"' && next === '"') {
          i += 2;
          continue;
        }
        if (ch === '"') {
          inString = false;
          i++;
          continue;
        }
        i++;
        continue;
      }

      // normal
      if (ch === '/' && next === '/') {
        inLineComment = true;
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = true;
        i++;
        continue;
      }

      // Обработка скобок { } - специальные символы компоновки данных 1С
      if (ch === '{') {
        braceDepth++;
        i++;
        continue;
      }
      if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        i++;
        continue;
      }

      // Игнорируем ';' внутри скобок { }
      if (ch === ';' && braceDepth === 0) {
        out.push(s.slice(start, i));
        start = i + 1;
        i++;
        continue;
      }

      i++;
    }

    out.push(s.slice(start));
    return out;
  };

  const packages = splitPackages(text).map((p) => p.trim()).filter(Boolean);
  if (packages.length === 0) return [];

  // По текущей логике автообновления полей работаем по последнему непустому пакету.
  const pkg = packages[packages.length - 1];

  // 2) Токенизация пакета (игнорируем строки/комментарии), чтобы корректно обработать ПОМЕСТИТЬ/ВЫБРАТЬ.
  type Tok = { upper: string; raw: string; idx: number };

  const tokenize = (s: string): Tok[] => {
    const toks: Tok[] = [];
    let i = 0;
    let inString = false;
    let inLineComment = false;
    let inBlockComment = false;
    let braceDepth = 0; // Глубина вложенности скобок { }
    let inSelectSection = false; // Находимся ли мы в секции SELECT (между ВЫБРАТЬ и ИЗ)

    const isIdentStart = (c: string) => /[A-Za-zА-Яа-я_]/.test(c);
    const isIdentPart = (c: string) => /[0-9A-Za-zА-Яа-я_]/.test(c);

    while (i < s.length) {
      const ch = s[i];
      const next = s[i + 1];

      if (inLineComment) {
        if (ch === '\n') inLineComment = false;
        i++;
        continue;
      }
      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          i += 2;
          continue;
        }
        i++;
        continue;
      }
      if (inString) {
        if (ch === '"' && next === '"') {
          i += 2;
          continue;
        }
        if (ch === '"') {
          inString = false;
          i++;
          continue;
        }
        i++;
        continue;
      }

      // normal
      if (ch === '/' && next === '/') {
        inLineComment = true;
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = true;
        i++;
        continue;
      }

      // Проверяем ключевые слова для определения секции SELECT
      if (isIdentStart(ch)) {
        const start = i;
        i++;
        while (i < s.length && isIdentPart(s[i])) i++;
        const raw = s.slice(start, i);
        const upper = raw.toUpperCase();
        
        // Начало секции SELECT
        if (upper === 'ВЫБРАТЬ' || upper === 'SELECT') {
          inSelectSection = true;
          toks.push({ raw, upper, idx: start });
          continue;
        }
        // Конец секции SELECT
        if (upper === 'ИЗ' || upper === 'FROM') {
          inSelectSection = false;
          braceDepth = 0; // Сбрасываем счетчик скобок при выходе из секции SELECT
          toks.push({ raw, upper, idx: start });
          continue;
        }
        
        toks.push({ raw, upper, idx: start });
        continue;
      }

      // Обработка скобок { } - специальные символы компоновки данных 1С
      // Учитываем их только в секции SELECT (для группировки полей)
      if (ch === '{') {
        if (inSelectSection) {
          braceDepth++;
          // Если скобка содержит ВЫБРАТЬ/SELECT, это подзапрос, не пропускаем токенизацию
          // Проверяем содержимое скобки впереди
          let lookAhead = i + 1;
          let foundSelect = false;
          while (lookAhead < Math.min(s.length, i + 100)) { // Ограничиваем поиск
            if (s[lookAhead] === '}') break;
            const wordStart = lookAhead;
            while (lookAhead < s.length && isIdentPart(s[lookAhead])) lookAhead++;
            const word = s.slice(wordStart, lookAhead).toUpperCase();
            if (word === 'ВЫБРАТЬ' || word === 'SELECT') {
              foundSelect = true;
              break;
            }
            if (lookAhead >= s.length || !isIdentStart(s[lookAhead])) lookAhead++;
          }
          // Если это не подзапрос, пропускаем токенизацию внутри скобок
          if (!foundSelect) {
            i++;
            continue;
          }
        }
        i++;
        continue;
      }
      if (ch === '}') {
        if (inSelectSection && braceDepth > 0) {
          braceDepth = Math.max(0, braceDepth - 1);
          i++;
          continue;
        }
        i++;
        continue;
      }

      // Пропускаем токенизацию внутри скобок { } только в секции SELECT
      if (inSelectSection && braceDepth > 0) {
        i++;
        continue;
      }

      i++;
    }

    return toks;
  };

  const toks = tokenize(pkg);
  if (toks.length === 0) return [];

  // 3) Проверяем наличие ОБЪЕДИНИТЬ/UNION в запросе
  let hasUnion = false;
  let firstUnionIdx: number | null = null;
  for (let i = 0; i < toks.length; i++) {
    const upper = toks[i].upper;
    // Проверяем ОБЪЕДИНИТЬ, UNION, а также ОБЪЕДИНИТЬ ВСЕ (следующий токен может быть ВСЕ/ALL)
    if (upper === 'ОБЪЕДИНИТЬ' || upper === 'UNION') {
      hasUnion = true;
      if (firstUnionIdx === null) firstUnionIdx = i;
      break;
    }
  }

  // 4) Ищем все SELECT/ВЫБРАТЬ
  const selectIdxs: number[] = [];
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].upper === 'ВЫБРАТЬ' || toks[i].upper === 'SELECT') selectIdxs.push(i);
  }
  if (selectIdxs.length === 0) return [];

  let chosen: { startTokIdx: number; endTokIdx: number } | null = null;

  if (hasUnion && firstUnionIdx !== null) {
    // Если есть ОБЪЕДИНИТЬ, обрабатываем только первый SELECT блок (до первого ОБЪЕДИНИТЬ)
    const firstSelectIdx = selectIdxs[0];
    if (firstSelectIdx !== undefined) {
      // Ищем конец первого SELECT блока (до первого ОБЪЕДИНИТЬ)
      chosen = { startTokIdx: firstSelectIdx, endTokIdx: firstUnionIdx };
    }
  } else {
    // Если нет ОБЪЕДИНИТЬ, выбираем финальный SELECT, который НЕ содержит ПОМЕСТИТЬ
    const selectRanges = selectIdxs.map((startTokIdx, idx) => {
      const endTokIdx = idx + 1 < selectIdxs.length ? selectIdxs[idx + 1] : toks.length;
      return { startTokIdx, endTokIdx };
    });

    for (const r of selectRanges) {
      let hasPomestit = false;
      for (let i = r.startTokIdx; i < r.endTokIdx; i++) {
        if (toks[i].upper === 'ПОМЕСТИТЬ') {
          hasPomestit = true;
          break;
        }
      }
      if (!hasPomestit) chosen = r; // берём последний без ПОМЕСТИТЬ
    }
  }

  if (!chosen) return [];

  // 5) Найдём индекс первого ИЗ/FROM в выбранном SELECT-блоке
  let fromTokIdx: number | null = null;
  for (let i = chosen.startTokIdx; i < chosen.endTokIdx; i++) {
    if (toks[i].upper === 'ИЗ' || toks[i].upper === 'FROM') {
      fromTokIdx = i;
      break;
    }
  }

  // Если нет FROM, извлекаем из всего SELECT-блока (маловероятный случай)
  const selectEnd = fromTokIdx !== null ? fromTokIdx : chosen.endTokIdx;

  // 6) Извлекаем алиасы: КАК/AS <Identifier> только из секции SELECT ... ИЗ
  const out: string[] = [];
  const push = (v: string) => {
    const s = String(v || '').trim();
    if (s && !out.includes(s)) out.push(s);
  };

  for (let i = chosen.startTokIdx; i < selectEnd - 1; i++) {
    const t = toks[i].upper;
    if (t === 'КАК' || t === 'AS') {
      const nextTok = toks[i + 1];
      if (nextTok?.raw) push(nextTok.raw);
    }
  }

  return out;
}

/**
 * Извлекает пары (имя поля, алиас) из запроса
 * Возвращает массив объектов { fieldName: string, alias?: string }
 * 
 * @param query - текст запроса
 * @returns массив объектов с именами полей и их алиасами
 */
function extractFieldNamesWithAliases(query: string): Array<{ fieldName: string; alias?: string }> {
  const text = String(query || '');
  if (!text.trim()) return [];

  // Используем ту же логику разбивки на пакеты
  const splitPackages = (s: string): string[] => {
    const out: string[] = [];
    let start = 0;
    let i = 0;
    let inString = false;
    let inLineComment = false;
    let inBlockComment = false;
    let braceDepth = 0;

    while (i < s.length) {
      const ch = s[i];
      const next = s[i + 1];

      if (inLineComment) {
        if (ch === '\n') inLineComment = false;
        i++;
        continue;
      }

      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          i += 2;
          continue;
        }
        i++;
        continue;
      }

      if (inString) {
        if (ch === '"' && next === '"') {
          i += 2;
          continue;
        }
        if (ch === '"') {
          inString = false;
          i++;
          continue;
        }
        i++;
        continue;
      }

      if (ch === '/' && next === '/') {
        inLineComment = true;
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = true;
        i++;
        continue;
      }

      if (ch === '{') {
        braceDepth++;
        i++;
        continue;
      }
      if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        i++;
        continue;
      }

      if (ch === ';' && braceDepth === 0) {
        out.push(s.slice(start, i));
        start = i + 1;
        i++;
        continue;
      }

      i++;
    }

    out.push(s.slice(start));
    return out;
  };

  const packages = splitPackages(text).map((p) => p.trim()).filter(Boolean);
  if (packages.length === 0) return [];

  const pkg = packages[packages.length - 1];

  // Проверяем наличие ОБЪЕДИНИТЬ/UNION в запросе
  // Ищем ОБЪЕДИНИТЬ, UNION, ОБЪЕДИНИТЬ ВСЕ, UNION ALL
  const unionMatch = pkg.match(/\b(?:ОБЪЕДИНИТЬ(?:\s+ВСЕ)?|UNION(?:\s+ALL)?)\b/i);
  const hasUnion = unionMatch !== null;
  
  let selectClause: string;
  if (hasUnion && unionMatch) {
    // Если есть ОБЪЕДИНИТЬ, обрабатываем только первый SELECT блок (до первого ОБЪЕДИНИТЬ)
    const firstPart = pkg.slice(0, unionMatch.index);
    const firstSelectMatch = firstPart.match(/\b(?:ВЫБРАТЬ|SELECT)\s+(.+?)\s+(?:ИЗ|FROM)\b/is);
    if (!firstSelectMatch) return [];
    selectClause = firstSelectMatch[1];
  } else {
    // Если нет ОБЪЕДИНИТЬ, ищем секцию SELECT ... FROM как обычно
    const selectMatch = pkg.match(/\b(?:ВЫБРАТЬ|SELECT)\s+(.+?)\s+(?:ИЗ|FROM)\b/is);
    if (!selectMatch) return [];
    selectClause = selectMatch[1];
  }
  
  // Разбиваем на поля по запятой (учитывая скобки, строки, комментарии)
  const extractFields = (clause: string): Array<{ fieldName: string; alias?: string }> => {
    const fields: Array<{ fieldName: string; alias?: string }> = [];
    let start = 0;
    let depth = 0;
    let braceDepth = 0;
    let inString = false;
    let inComment = false;

    for (let i = 0; i <= clause.length; i++) {
      const ch = clause[i] || '';
      const next = clause[i + 1] || '';

      if (inComment) {
        if (ch === '\n') inComment = false;
        continue;
      }

      if (inString) {
        if (ch === '"' && next === '"') {
          i++;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }

      if (ch === '/' && next === '/') {
        inComment = true;
        i++;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;

      // Разделитель полей - запятая на верхнем уровне
      if ((ch === ',' || i === clause.length) && depth === 0 && braceDepth === 0 && !inString) {
        const fieldText = clause.slice(start, i).trim();
        if (fieldText) {
          // Ищем КАК/AS
          // Ищем КАК/AS - если есть, то алиас используется как имя поля
          const kakMatch = fieldText.match(/^(.+?)\s+(?:КАК|AS)\s+(.+)$/is);
          if (kakMatch) {
            const alias = kakMatch[2].trim();
            // Алиас используется как имя поля
            fields.push({ fieldName: alias, alias });
          } else {
            // Нет алиаса, берем последнюю часть выражения
            const fieldName = fieldText.split(/\./).pop()?.trim() || fieldText.trim();
            fields.push({ fieldName });
          }
        }
        start = i + 1;
      }
    }

    return fields;
  };

  return extractFields(selectClause);
}

const TreeNodeView: React.FC<{
  node: TreeNode;
  selectedPath: string;
  onSelect: (p: string) => void;
}> = ({ node, selectedPath, onSelect }) => {
  const isSelected = node.path === selectedPath;
  return (
    <div className="tree-node">
      <div
        className={`tree-node__label ${isSelected ? 'is-selected' : ''}`}
        onClick={() => onSelect(node.path)}
        title={node.label}
      >
        {node.label}
      </div>
      {node.children.length > 0 && (
        <div className="tree-node__children">
          {node.children.map((ch) => (
            <TreeNodeView key={ch.path} node={ch} selectedPath={selectedPath} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

const TreeView: React.FC<{
  nodes: TreeNode[];
  selectedPath: string;
  onSelect: (p: string) => void;
}> = ({ nodes, selectedPath, onSelect }) => {
  return (
    <div className="tree-view">
      {nodes.map((n) => (
        <TreeNodeView key={n.path} node={n} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </div>
  );
};

const DcsList: React.FC<{
  rows: DcsListRow[];
  selectedKey: string;
  onSelect: (rowKey: string) => void;
}> = ({ rows, selectedKey, onSelect }) => {
  return (
    <div className="dcs-list">
      <table className="edt-grid__table dcs-list__table">
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.key === selectedKey ? 'is-selected' : ''}>
              <td>
                <button
                  type="button"
                  className="dcs-list__rowBtn"
                  onClick={() => onSelect(r.key)}
                  title={r.subtitle ? `${r.title} — ${r.subtitle}` : r.title}
                >
                  <div className="dcs-list__title">{r.title}</div>
                  {r.subtitle ? <div className="dcs-list__subtitle">{r.subtitle}</div> : null}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <div className="dcs-empty">Нет данных</div> : null}
    </div>
  );
};

const DcsDatasetDetails: React.FC<{
  node: DcsNode | null;
  metadata: { registers: string[]; referenceTypes: string[] };
  selectedFieldKey: string;
  onSelectFieldKey: (key: string) => void;
  onChangeDataSetQuery: (dataSetPath: string, value: string) => void;
  onUpdateNode: (nodePath: string, updater: (n: DcsNode) => DcsNode) => void;
  onOpenQueryEditor: (dataSetPath: string, queryText: string) => void;
}> = ({ node, metadata, selectedFieldKey, onSelectFieldKey, onChangeDataSetQuery, onUpdateNode, onOpenQueryEditor }) => {
  if (!node || localTag(node.tag) !== 'dataSet') {
    return <div className="dcs-empty">Выберите набор данных</div>;
  }

  const name = getChildTextByLocalTag(node, 'name');
  const dsType = String((node.attrs as any)?.['@_xsi:type'] || (node.attrs as any)?.['@_type'] || '').trim();

  const queryNode = findChildNodeByLocalTag(node, 'query');
  const queryText = String(queryNode?.text ?? '');

  const fields = (node.children || []).filter((c) => localTag(c.tag) === 'field');
  const fieldRows = fields.map((f, i) => {
    const dataPath = getChildTextByLocalTag(f, 'dataPath');
    const fieldName = getChildTextByLocalTag(f, 'field');
    const title = getLocalStringTitle(f);
    const roleNode = (f.children || []).find((c) => localTag(c.tag) === 'role');
    const roleDim = roleNode ? getChildTextByLocalTag(roleNode, 'dimension') : '';
    const roleRes = roleNode ? getChildTextByLocalTag(roleNode, 'resource') : '';
    const role = [roleDim ? 'dimension' : '', roleRes ? 'resource' : ''].filter(Boolean).join(', ');
    return { i, key: f.path, fieldNode: f, fieldName, dataPath, title, role };
  });

  const selectedField = fieldRows.find((r) => r.key === selectedFieldKey) || null;
  const isSelectedFieldValid = !!selectedField;
  const selectedRoleNode = selectedField ? selectedField.fieldNode.children.find((c) => localTag(c.tag) === 'role') : null;
  const isDim = selectedRoleNode ? String(getChildTextByLocalTag(selectedRoleNode, 'dimension') || '').toLowerCase() === 'true' : false;
  const isRes = selectedRoleNode ? String(getChildTextByLocalTag(selectedRoleNode, 'resource') || '').toLowerCase() === 'true' : false;

  return (
    <div className="dcs-details">
      <div className="dcs-details__head">
        <div className="dcs-details__name">{name ? name : 'Набор данных'}</div>
        {dsType ? <div className="dcs-details__meta">{dsType}</div> : null}
      </div>

      <div className="dcs-section">
        <div className="dcs-section__title">
          Запрос
          {queryNode && (
            <button
              type="button"
              className="dcs-section__action-btn"
              onClick={() => onOpenQueryEditor(node.path, queryText)}
              title="Открыть редактор запроса"
              aria-label="Открыть редактор запроса"
            >
              ✎ Редактировать
            </button>
          )}
        </div>
        <div className="dcs-section__body">
          {queryNode ? (
            <div
              className="dcs-query-preview"
              onClick={() => onOpenQueryEditor(node.path, queryText)}
              title="Кликните для редактирования"
            >
              {queryText ? (
                <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', opacity: 0.8, cursor: 'pointer' }}>
                  {queryText.substring(0, 300)}
                  {queryText.length > 300 && '...'}
                </pre>
              ) : (
                <div className="dcs-empty" style={{ cursor: 'pointer' }}>Кликните для добавления запроса...</div>
              )}
            </div>
          ) : (
            <div className="dcs-empty">Запрос не найден (ожидается &lt;query&gt; для DataSetQuery)</div>
          )}
        </div>
      </div>

      <div className="dcs-section">
        <div className="dcs-section__title">Поля</div>
        <div className="dcs-section__body">
          <table className="edt-grid__table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Поле</th>
                <th style={{ width: '35%' }}>DataPath</th>
                <th>Заголовок</th>
                <th style={{ width: '14%' }}>Роль</th>
              </tr>
            </thead>
            <tbody>
              {fieldRows.map((r) => (
                <tr
                  key={r.i}
                  className={r.key === selectedFieldKey ? 'is-selected' : ''}
                  onClick={() => onSelectFieldKey(r.key)}
                >
                  <td>{r.fieldName}</td>
                  <td>{r.dataPath}</td>
                  <td>{r.title}</td>
                  <td>{r.role}</td>
                </tr>
              ))}
              {fieldRows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ opacity: 0.7 }}>Нет полей</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="dcs-empty" style={{ paddingLeft: 0 }}>
            Кликни по строке поля, чтобы открыть редактор свойств поля ниже.
          </div>
          <div className="dcs-fieldsEditor">
            <div className="dcs-section__title">Свойства поля</div>
            {isSelectedFieldValid ? (
              <div className="dcs-section__body">
                <table className="edt-grid__table">
                  <tbody>
                    <tr>
                      <td style={{ width: '35%', opacity: 0.8 }}>Имя</td>
                      <td>
                        <input
                          className="edt-props-editor__input"
                          value={selectedField.fieldName}
                          onChange={(e) => onUpdateNode(selectedField.key, (n) => upsertChildTextByLocalTag(n, 'field', e.target.value))}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style={{ opacity: 0.8 }}>DataPath</td>
                      <td>
                        <input
                          className="edt-props-editor__input"
                          value={selectedField.dataPath}
                          onChange={(e) => onUpdateNode(selectedField.key, (n) => upsertChildTextByLocalTag(n, 'dataPath', e.target.value))}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style={{ opacity: 0.8 }}>Заголовок</td>
                      <td>
                        <input
                          className="edt-props-editor__input"
                          value={selectedField.title}
                          onChange={(e) => onUpdateNode(selectedField.key, (n) => upsertLocalStringTitle(n, e.target.value))}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style={{ opacity: 0.8 }}>Роль</td>
                      <td>
                        <label style={{ marginRight: 12 }}>
                          <input
                            type="checkbox"
                            checked={isDim}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              onUpdateNode(selectedField.key, (fieldNode) => {
                                const roleNode = fieldNode.children.find((c) => localTag(c.tag) === 'role');
                                if (!roleNode) {
                                  if (!enabled) return fieldNode;
                                  const newRole: DcsNode = {
                                    path: '',
                                    tag: 'role',
                                    attrs: {},
                                    children: [{ path: '', tag: 'dcscom:dimension', attrs: {}, text: 'true', children: [] }],
                                  };
                                  return { ...fieldNode, children: [...(fieldNode.children || []), newRole] };
                                }
                                const nextRole = enabled
                                  ? upsertChildTextByLocalTag(roleNode, 'dimension', 'true', 'dcscom:dimension')
                                  : removeChildByLocalTag(roleNode, 'dimension');
                                const nextChildren = fieldNode.children.slice();
                                const idx = nextChildren.findIndex((c) => c === roleNode);
                                nextChildren[idx] = nextRole;
                                return { ...fieldNode, children: nextChildren };
                              });
                            }}
                          />{' '}
                          Измерение
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={isRes}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              onUpdateNode(selectedField.key, (fieldNode) => {
                                const roleNode = fieldNode.children.find((c) => localTag(c.tag) === 'role');
                                if (!roleNode) {
                                  if (!enabled) return fieldNode;
                                  const newRole: DcsNode = {
                                    path: '',
                                    tag: 'role',
                                    attrs: {},
                                    children: [{ path: '', tag: 'dcscom:resource', attrs: {}, text: 'true', children: [] }],
                                  };
                                  return { ...fieldNode, children: [...(fieldNode.children || []), newRole] };
                                }
                                const nextRole = enabled
                                  ? upsertChildTextByLocalTag(roleNode, 'resource', 'true', 'dcscom:resource')
                                  : removeChildByLocalTag(roleNode, 'resource');
                                const nextChildren = fieldNode.children.slice();
                                const idx = nextChildren.findIndex((c) => c === roleNode);
                                nextChildren[idx] = nextRole;
                                return { ...fieldNode, children: nextChildren };
                              });
                            }}
                          />{' '}
                          Ресурс
                        </label>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dcs-empty">Поле не выбрано</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DcsParameterDetails: React.FC<{
  node: DcsNode | null;
  onChangeNodeText: (nodePath: string, value: string) => void;
  onUpdateNode: (nodePath: string, updater: (n: DcsNode) => DcsNode) => void;
  metadata: { registers: string[]; referenceTypes: string[] };
}> = ({ node, onChangeNodeText, onUpdateNode, metadata }) => {
  // Показываем только параметры схемы (а не параметры макетов/шаблонов)
  if (!node || localTag(node.tag) !== 'parameter') return <div className="dcs-empty">Выберите параметр</div>;

  const name = getChildTextByLocalTag(node, 'name');
  const title = getLocalStringTitle(node);
  const typeText = getFirstTypeFromValueType(node);

  const valueNode = findChildNodeByLocalTag(node, 'value');
  const exprNode = findChildNodeByLocalTag(node, 'expression');
  const useRestrictionNode = findChildNodeByLocalTag(node, 'useRestriction');
  const denyIncompleteNode = findChildNodeByLocalTag(node, 'denyIncompleteValues');
  const useNode = findChildNodeByLocalTag(node, 'use');
  const valueListAllowedNode = findChildNodeByLocalTag(node, 'valueListAllowed');

  const isScalarValue = isScalarNode(valueNode);

  return (
    <div className="dcs-details">
      <div className="dcs-details__head">
        <div className="dcs-details__name">{title || name || 'Параметр'}</div>
        {typeText ? <div className="dcs-details__meta">{typeText}</div> : null}
      </div>

      <div className="dcs-section">
        <div className="dcs-section__title">Основное</div>
        <div className="dcs-section__body">
          <table className="edt-grid__table">
            <tbody>
              <tr>
                <td style={{ width: '35%', opacity: 0.8 }}>Имя</td>
                <td>
                  <input
                    className="edt-props-editor__input"
                    value={name}
                    onChange={(e) => onChangeNodeText(findChildNodeByLocalTag(node, 'name')?.path || '', e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>Заголовок</td>
                <td>
                  <input
                    className="edt-props-editor__input"
                    value={title}
                    onChange={(e) => onUpdateNode(node.path, (n) => upsertLocalStringTitle(n, e.target.value))}
                  />
                </td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>Тип</td>
                <td>
                  <TypeWidget
                    value={buildTypeWidgetValueFromValueTypeNode(findChildNodeByLocalTag(node, 'valueType'))}
                    onChange={(newType: any) => onUpdateNode(node.path, (n) => applyTypeWidgetValueToParameter(n, newType))}
                    options={{
                      registers: metadata.registers,
                      referenceTypes: metadata.referenceTypes,
                    }}
                    id="dcs-param-type"
                    name="dcs-param-type"
                    label="Тип"
                    schema={{ type: 'object' } as any}
                    uiSchema={{} as any}
                    required={false}
                    disabled={false}
                    readonly={false}
                    autofocus={false}
                    rawErrors={[]}
                    formContext={{} as any}
                    registry={{} as any}
                    onBlur={() => {}}
                    onFocus={() => {}}
                  />
                </td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>Ограничение</td>
                <td>
                  <label>
                    <input
                      type="checkbox"
                      checked={String(useRestrictionNode?.text || '').trim().toLowerCase() === 'true'}
                      onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'useRestriction', e.target.checked ? 'true' : 'false'))}
                    />{' '}
                    useRestriction
                  </label>
                </td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>Запрет незаполненных</td>
                <td>
                  <label>
                    <input
                      type="checkbox"
                      checked={String(denyIncompleteNode?.text || '').trim().toLowerCase() === 'true'}
                      onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'denyIncompleteValues', e.target.checked ? 'true' : 'false'))}
                    />{' '}
                    denyIncompleteValues
                  </label>
                </td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>Использование</td>
                <td>
                  <input
                    className="edt-props-editor__input"
                    value={String(useNode?.text || '')}
                    onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'use', e.target.value))}
                    placeholder="Always"
                  />
                </td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>Доступен список значений</td>
                <td>
                  <label>
                    <input
                      type="checkbox"
                      checked={String(valueListAllowedNode?.text || '').trim().toLowerCase() === 'true'}
                      onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'valueListAllowed', e.target.checked ? 'true' : 'false'))}
                    />{' '}
                    valueListAllowed
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="dcs-section">
        <div className="dcs-section__title">Выражение</div>
        <div className="dcs-section__body">
          <input
            className="edt-props-editor__input"
            value={String(exprNode?.text || '')}
            onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'expression', e.target.value))}
            placeholder="expression"
          />
        </div>
      </div>

      <div className="dcs-section">
        <div className="dcs-section__title">Значение</div>
        <div className="dcs-section__body">
          <textarea
            className="dcs-query__textarea"
            value={String(valueNode?.text || '')}
            onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'value', e.target.value))}
            spellCheck={false}
            placeholder="value"
          />
          {!isScalarValue ? (
            <div className="dcs-empty">Значение сложной структуры пока не редактируем (отображаем ниже как справку).</div>
          ) : null}
          {!isScalarValue && valueNode ? (
            <pre style={{ margin: '8px 0 0', fontSize: 12, whiteSpace: 'pre-wrap' }}>{JSON.stringify(valueNode, null, 2)}</pre>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const DcsLinkDetails: React.FC<{
  node: DcsNode | null;
  onChangeNodeText: (nodePath: string, value: string) => void;
  onUpdateNode: (nodePath: string, updater: (n: DcsNode) => DcsNode) => void;
}> = ({ node, onUpdateNode }) => {
  if (!node || localTag(node.tag) !== 'dataSetLink') return <div className="dcs-empty">Выберите связь</div>;

  const src = getChildTextByLocalTag(node, 'sourceDataSet');
  const dst = getChildTextByLocalTag(node, 'destinationDataSet');
  const srcExpr = getChildTextByLocalTag(node, 'sourceExpression');
  const dstExpr = getChildTextByLocalTag(node, 'destinationExpression');
  const condNode = findChildNodeByLocalTag(node, 'linkConditionExpression');

  return (
    <div className="dcs-details">
      <div className="dcs-details__head">
        <div className="dcs-details__name">{[src, dst].filter(Boolean).join(' → ') || 'Связь наборов данных'}</div>
      </div>

      <div className="dcs-section">
        <div className="dcs-section__title">Поля связи</div>
        <div className="dcs-section__body">
          <table className="edt-grid__table">
            <tbody>
              <tr>
                <td style={{ width: '35%', opacity: 0.8 }}>Источник</td>
                <td>
                  <input className="edt-props-editor__input" value={src} onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'sourceDataSet', e.target.value))} />
                </td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>Приемник</td>
                <td>
                  <input className="edt-props-editor__input" value={dst} onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'destinationDataSet', e.target.value))} />
                </td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>Поле источника</td>
                <td>
                  <input className="edt-props-editor__input" value={srcExpr} onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'sourceExpression', e.target.value))} />
                </td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>Поле приемника</td>
                <td>
                  <input className="edt-props-editor__input" value={dstExpr} onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'destinationExpression', e.target.value))} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="dcs-section">
        <div className="dcs-section__title">Условие связи</div>
        <div className="dcs-section__body">
          <input
            className="edt-props-editor__input"
            value={String(condNode?.text || '')}
            onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'linkConditionExpression', e.target.value))}
            placeholder="linkConditionExpression"
          />
        </div>
      </div>
    </div>
  );
};

const DcsCalculatedFieldDetails: React.FC<{
  node: DcsNode | null;
  onUpdateNode: (nodePath: string, updater: (n: DcsNode) => DcsNode) => void;
}> = ({ node, onUpdateNode }) => {
  if (!node || localTag(node.tag) !== 'calculatedField') return <div className="dcs-empty">Выберите вычисляемое поле</div>;
  const dataPath = getChildTextByLocalTag(node, 'dataPath');
  const expr = getChildTextByLocalTag(node, 'expression');
  const title = getLocalStringTitle(node);
  return (
    <div className="dcs-details">
      <div className="dcs-details__head">
        <div className="dcs-details__name">{title || dataPath || 'Вычисляемое поле'}</div>
      </div>
      <div className="dcs-section">
        <div className="dcs-section__title">DataPath</div>
        <div className="dcs-section__body">
          <input className="edt-props-editor__input" value={dataPath} onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'dataPath', e.target.value))} />
        </div>
      </div>
      <div className="dcs-section">
        <div className="dcs-section__title">Заголовок</div>
        <div className="dcs-section__body">
          <input className="edt-props-editor__input" value={title} onChange={(e) => onUpdateNode(node.path, (n) => upsertLocalStringTitle(n, e.target.value))} />
        </div>
      </div>
      <div className="dcs-section">
        <div className="dcs-section__title">Выражение</div>
        <div className="dcs-section__body">
          <textarea className="dcs-query__textarea" value={expr} onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'expression', e.target.value))} />
        </div>
      </div>
    </div>
  );
};

const DcsResourceDetails: React.FC<{
  node: DcsNode | null;
  onUpdateNode: (nodePath: string, updater: (n: DcsNode) => DcsNode) => void;
}> = ({ node, onUpdateNode }) => {
  if (!node || localTag(node.tag) !== 'totalField') return <div className="dcs-empty">Выберите ресурс</div>;
  const dataPath = getChildTextByLocalTag(node, 'dataPath');
  const expr = getChildTextByLocalTag(node, 'expression');
  return (
    <div className="dcs-details">
      <div className="dcs-details__head">
        <div className="dcs-details__name">{dataPath || 'Ресурс'}</div>
      </div>
      <div className="dcs-section">
        <div className="dcs-section__title">DataPath</div>
        <div className="dcs-section__body">
          <input className="edt-props-editor__input" value={dataPath} onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'dataPath', e.target.value))} />
        </div>
      </div>
      <div className="dcs-section">
        <div className="dcs-section__title">Выражение</div>
        <div className="dcs-section__body">
          <input className="edt-props-editor__input" value={expr} onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'expression', e.target.value))} />
        </div>
      </div>
    </div>
  );
};

// Рекурсивный компонент для отображения вложенных группировок (column/row таблицы и вложенные)
const NestedGroupingView: React.FC<{
  structure: any;
  level: number;
  onUpdateNode: (nodePath: string, updater: (n: DcsNode) => DcsNode) => void;
  groupingOtherSettingsExpanded?: Record<string, boolean>;
  setGroupingOtherSettingsExpanded?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}> = ({ structure, level, onUpdateNode, groupingOtherSettingsExpanded = {}, setGroupingOtherSettingsExpanded = () => {} }) => {
  if (!structure) return null;
  const hasFields = structure.fields && structure.fields.length > 0;
  const hasOutputParams = structure.outputParams && structure.outputParams.length > 0 && structure.structNode;
  const hasNested = structure.nested && structure.nested.length > 0;
  if (!hasFields && !hasOutputParams && !hasNested) return null;
  
  const indent = level * 20;
  
  return (
    <div style={{ marginLeft: indent, marginTop: level > 0 ? 8 : 0, borderLeft: level > 0 ? '2px solid var(--vscode-panel-border)' : 'none', paddingLeft: level > 0 ? 8 : 0 }}>
      {hasFields && (
        <table className="edt-grid__table">
          <tbody>
            {structure.fields.map((gf: any, idx: number) => {
              const fieldNode = findChildNodeByLocalTag(gf.node, 'field');
              const groupTypeNode = findChildNodeByLocalTag(gf.node, 'groupType');
              return (
                <React.Fragment key={gf.path}>
                  <tr>
                    <td style={{ width: '70%' }}>
                      {level > 0 && <span style={{ opacity: 0.5, marginRight: 4 }}>↳</span>}
                      <input
                        className="edt-props-editor__input"
                        value={gf.field}
                        onChange={(e) => {
                          if (fieldNode) {
                            onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                          }
                        }}
                      />
                    </td>
                    <td style={{ width: '30%' }}>
                      <select
                        className="edt-props-editor__input"
                        value={gf.groupType}
                        onChange={(e) => {
                          if (groupTypeNode) {
                            onUpdateNode(groupTypeNode.path, (n) => ({ ...n, text: e.target.value }));
                          }
                        }}
                      >
                        <option value="Items">Элементы</option>
                        <option value="Hierarchy">Иерархия</option>
                        <option value="OnlyHierarchy">Только иерархия</option>
                      </select>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
      {/* Другие настройки для column/row */}
      {hasOutputParams && (
        <div style={{ marginTop: 8, fontSize: 11 }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setGroupingOtherSettingsExpanded((prev: Record<string, boolean>) => ({ ...prev, [structure.path]: !(prev[structure.path] ?? true) }))}
            onKeyDown={(e) => e.key === 'Enter' && setGroupingOtherSettingsExpanded((prev: Record<string, boolean>) => ({ ...prev, [structure.path]: !(prev[structure.path] ?? true) }))}
            style={{ fontWeight: 'bold', marginBottom: 4, opacity: 0.8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ transform: (groupingOtherSettingsExpanded[structure.path] ?? true) ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
            Другие настройки
          </div>
          {(groupingOtherSettingsExpanded[structure.path] ?? true) && (
            <table className="edt-grid__table" style={{ fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ width: 28, paddingRight: 4 }} title="Включить/выключить параметр" />
                  <th style={{ width: '42%' }}>Параметр</th>
                  <th style={{ width: '50%' }}>Значение</th>
                </tr>
              </thead>
              <tbody>
                {structure.outputParams.map((op: any, opIdx: number) => {
                  const paramDef = GROUPING_PARAM_MAP.get(op.parameter);
                  const options = paramDef?.options;
                  const paramLabel = paramDef?.label || op.parameter.replace(/([а-яa-z])([А-ЯA-Z])/g, '$1 $2');
                  const isChild = !!paramDef?.parentParameter;
                  const opUse = op.use !== undefined ? op.use : true;
                  const handleValueChange = (newVal: string) => {
                    if (!structure.structNode) return;
                    onUpdateNode(structure.structNode.path, (n) => upsertOutputParameter(n, op.parameter, newVal, opUse));
                  };
                  const handleUseChange = (checked: boolean) => {
                    if (!structure.structNode) return;
                    if (op.node) {
                      onUpdateNode(structure.structNode.path, (n) => setOutputParameterUse(n, op.parameter, checked));
                    } else if (checked) {
                      onUpdateNode(structure.structNode.path, (n) => upsertOutputParameter(n, op.parameter, '', true));
                    }
                  };
                  return (
                    <tr key={opIdx}>
                      <td style={{ paddingRight: 4, verticalAlign: 'middle' }}>
                        <input
                          type="checkbox"
                          checked={opUse}
                          onChange={(e) => handleUseChange(e.target.checked)}
                          title={opUse ? 'Параметр включён' : 'Параметр выключен'}
                        />
                      </td>
                      <td style={{ opacity: opUse ? 0.9 : 0.5, paddingLeft: isChild ? 24 : undefined }}>{paramLabel}</td>
                      <td>
                        {options ? (
                          <select
                            className="edt-props-editor__input"
                            style={{ fontSize: 11 }}
                            value={op.value}
                            onChange={(e) => handleValueChange(e.target.value)}
                            disabled={!opUse}
                          >
                            <option value="">—</option>
                            {options.map((opt: { value: string; label: string }) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="edt-props-editor__input"
                            style={{ fontSize: 11 }}
                            value={op.value}
                            onChange={(e) => handleValueChange(e.target.value)}
                            placeholder="—"
                            disabled={!opUse}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* Рекурсивно отображаем вложенные группировки */}
      {hasNested && structure.nested.map((nested: any, idx: number) => (
        <NestedGroupingView
          key={idx}
          structure={nested}
          level={level + 1}
          onUpdateNode={onUpdateNode}
          groupingOtherSettingsExpanded={groupingOtherSettingsExpanded}
          setGroupingOtherSettingsExpanded={setGroupingOtherSettingsExpanded}
        />
      ))}
    </div>
  );
};

const DcsSettingsVariantDetails: React.FC<{
  node: DcsNode | null;
  onUpdateNode: (nodePath: string, updater: (n: DcsNode) => DcsNode) => void;
  onUpdateNodeReindex?: (nodePath: string, updater: (n: DcsNode) => DcsNode) => void;
  schemaChildren: DcsNode[];
}> = ({ node, onUpdateNode, onUpdateNodeReindex, schemaChildren }) => {
  // Поддержка настроек на уровне схемы (если нет вариантов)
  const isSchemaSettings = node?.path === '__schema__';
  const schemaRoot = useMemo(() => {
    if (!isSchemaSettings) return null;
    // Ищем корневой узел DataCompositionSchema
    return schemaChildren.find((ch) => localTag(ch.tag) === 'DataCompositionSchema') || schemaChildren[0] || null;
  }, [isSchemaSettings, schemaChildren]);

  if (!node || (localTag(node.tag) !== 'settingsVariant' && !isSchemaSettings)) {
    return <div className="dcs-empty">Выберите вариант настроек</div>;
  }

  const name = isSchemaSettings ? 'Настройки схемы' : getChildTextByLocalTag(node, 'name');
  const presentation = isSchemaSettings ? '' : (getChildTextByLocalTag(node, 'presentation') || getChildTextByLocalTag(node, 'dcsset:presentation'));

  const settingsRoot = useMemo(() => {
    if (isSchemaSettings) {
      // Для схемы ищем defaultSettings или создаем виртуальный корень
      const defaultSettings = schemaChildren.find((ch) => localTag(ch.tag) === 'defaultSettings');
      return defaultSettings || schemaRoot;
    }
    
    const direct = findChildNodeByLocalTag(node, 'settings');
    if (direct) return direct;
    const all = findAllNodes([node]);
    return all.find((x) => localTag(x.node.tag) === 'settings')?.node || null;
  }, [node, isSchemaSettings, schemaRoot, schemaChildren]);

  const [activeSettingsTab, setActiveSettingsTab] = useState<'fields' | 'filters' | 'order' | 'structure' | 'other'>('fields');
  
  // Состояния для форм добавления
  const [addingField, setAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [addingFilter, setAddingFilter] = useState(false);
  const [newFilterField, setNewFilterField] = useState('');
  const [addingOrder, setAddingOrder] = useState(false);
  const [newOrderField, setNewOrderField] = useState('');
  const [addingGrouping, setAddingGrouping] = useState(false);
  const [newGroupingField, setNewGroupingField] = useState('');
  const [parentGroupingPath, setParentGroupingPath] = useState<string | null>(null);
  /** Состояние сворачивания секции «Другие настройки» по пути группировки: true = развёрнуто */
  const [groupingOtherSettingsExpanded, setGroupingOtherSettingsExpanded] = useState<Record<string, boolean>>({});

  // Извлечение основных секций settings
  const selectionNode = useMemo(() => findChildNodeByLocalTag(settingsRoot, 'selection'), [settingsRoot]);
  const filterNode = useMemo(() => findChildNodeByLocalTag(settingsRoot, 'filter'), [settingsRoot]);
  const orderNode = useMemo(() => findChildNodeByLocalTag(settingsRoot, 'order'), [settingsRoot]);
  const structureNode = useMemo(() => {
    const direct = findChildNodeByLocalTag(settingsRoot, 'structure');
    if (direct) return direct;
    
    // Для схемы ищем структуру глубже - она может быть на уровне схемы, а не в settings
    if (isSchemaSettings && !direct) {
      // Ищем во всех детях схемы
      const allNodes = findAllNodes(schemaChildren);
      return allNodes.find((n) => localTag(n.node.tag) === 'structure')?.node || null;
    }
    
    // ВАЖНО: В некоторых отчетах нет обёртки <structure>, а элементы StructureItem* находятся прямо в settings
    // Создаём виртуальный узел структуры из прямых дочерних элементов settings с типом StructureItem*
    if (!direct && settingsRoot) {
      const structureItems = (settingsRoot.children || []).filter((ch) => {
        const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
        return t.includes('StructureItem');
      });
      
      if (structureItems.length > 0) {
        // Возвращаем виртуальный узел с элементами структуры
        return {
          ...settingsRoot,
          children: structureItems,
          tag: 'dcsset:structure',
        };
      }
    }
    
    return null;
  }, [settingsRoot, isSchemaSettings, schemaChildren]);
  // Поля (selection items)
  const selectedFields = useMemo(() => {
    if (!selectionNode) return [];
    return (selectionNode.children || []).filter((ch) => localTag(ch.tag) === 'item').map((item) => {
      const fieldNode = findChildNodeByLocalTag(item, 'field');
      const fieldName = String(fieldNode?.text || '').trim();
      return { node: item, fieldName, path: item.path };
    });
  }, [selectionNode]);

  // Отборы (filter items)
  const filterItems = useMemo(() => {
    if (!filterNode) return [];
    return (filterNode.children || []).filter((ch) => localTag(ch.tag) === 'item').map((item) => {
      const useNode = findChildNodeByLocalTag(item, 'use');
      const leftNode = findChildNodeByLocalTag(item, 'left');
      const compTypeNode = findChildNodeByLocalTag(item, 'comparisonType');
      const rightNode = findChildNodeByLocalTag(item, 'right');
      return {
        node: item,
        path: item.path,
        use: String(useNode?.text || 'true').toLowerCase() === 'true',
        field: String(leftNode?.text || '').trim(),
        comparisonType: String(compTypeNode?.text || 'Equal').trim(),
        value: String(rightNode?.text || '').trim(),
      };
    });
  }, [filterNode]);

  // Сортировки (order items)
  const orderItems = useMemo(() => {
    if (!orderNode) return [];
    return (orderNode.children || []).filter((ch) => localTag(ch.tag) === 'item').map((item) => {
      const fieldNode = findChildNodeByLocalTag(item, 'field');
      const orderTypeNode = findChildNodeByLocalTag(item, 'orderType');
      return {
        node: item,
        path: item.path,
        field: String(fieldNode?.text || '').trim(),
        orderType: String(orderTypeNode?.text || 'Asc').trim(),
      };
    });
  }, [orderNode]);

  // Элементы структуры (группировки/таблицы/диаграммы)
  const structureItems = useMemo(() => {
    if (!structureNode) return [];
    return (structureNode.children || []).filter((ch) => localTag(ch.tag) === 'item').map((item) => {
      const itemType = String(item.attrs?.['@_xsi:type'] || '').trim();
      const isTable = itemType.includes('StructureItemTable');
      const isGroup = itemType.includes('StructureItemGroup');
      const isChart = itemType.includes('StructureItemChart');
      
      // Функция извлечения полей группировки из groupItems
      // ВАЖНО: В groupItems могут быть как GroupItemField (поля), так и StructureItemGroup/Table (вложенные группировки)
      const extractGroupFields = (groupItemsNode: DcsNode | null) => {
        if (!groupItemsNode) return [];
        return (groupItemsNode.children || []).filter((ch) => {
          if (localTag(ch.tag) !== 'item') return false;
          const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
          // Только поля группировки (GroupItemField), не вложенные группировки
          return t.includes('GroupItemField') || (!t && !ch.children?.some(c => localTag(c.tag) === 'groupItems'));
        }).map((gItem) => {
          const fieldNode = findChildNodeByLocalTag(gItem, 'field');
          const groupTypeNode = findChildNodeByLocalTag(gItem, 'groupType');
          return {
            node: gItem,
            path: gItem.path,
            field: String(fieldNode?.text || '').trim(),
            groupType: String(groupTypeNode?.text || 'Items').trim(),
          };
        });
      };
      
      // Функция извлечения параметров диаграммы
      const extractChartParams = (chartNode: DcsNode) => {
        const outputParamsNode = findChildNodeByLocalTag(chartNode, 'outputParameters');
        if (!outputParamsNode) return { chartType: '', title: '' };
        
        let chartType = '';
        let chartTitle = '';
        
        // Ищем параметр типДиаграммы (ChartType)
        const chartTypeItems = (outputParamsNode.children || []).filter((ch) => {
          if (localTag(ch.tag) !== 'item') return false;
          const paramNode = findChildNodeByLocalTag(ch, 'parameter');
          const paramText = String(paramNode?.text || '').trim();
          return paramText.includes('типДиаграммы') || paramText.includes('ChartType');
        });
        
        if (chartTypeItems.length > 0) {
          const valueNode = findChildNodeByLocalTag(chartTypeItems[0], 'value');
          // Тип диаграммы хранится в тексте узла value (например, "Pie3D", "Column")
          chartType = String(valueNode?.text || '').trim();
          // Если текст пустой, пытаемся извлечь из атрибута xsi:type
          if (!chartType && valueNode?.attrs?.['@_xsi:type']) {
            const typeAttr = String(valueNode.attrs['@_xsi:type'] || '').trim();
            // Если это ChartType, извлекаем значение из текста (может быть вложенным)
            if (typeAttr.includes('ChartType')) {
              chartType = typeAttr.replace(/.*ChartType/, '').trim() || typeAttr;
            }
          }
        }
        
        // Ищем заголовок диаграммы
        const titleItems = (outputParamsNode.children || []).filter((ch) => {
          if (localTag(ch.tag) !== 'item') return false;
          const paramNode = findChildNodeByLocalTag(ch, 'parameter');
          const paramText = String(paramNode?.text || '').trim();
          return paramText.includes('заголовок') || paramText.includes('Title');
        });
        
        if (titleItems.length > 0) {
          const titleValueNode = findChildNodeByLocalTag(titleItems[0], 'value');
          if (titleValueNode) {
            const titleItemNode = findChildNodeByLocalTag(titleValueNode, 'item');
            if (titleItemNode) {
              const contentNode = findChildNodeByLocalTag(titleItemNode, 'content');
              chartTitle = String(contentNode?.text || '').trim();
            }
          }
        }
        
        return { chartType, title: chartTitle };
      };
      
      // Функция извлечения вложенных группировок и диаграмм из groupItems
      const extractNestedGroupingsFromGroupItems = (groupItemsNode: DcsNode | null): DcsNode[] => {
        if (!groupItemsNode) return [];
        return (groupItemsNode.children || []).filter((ch) => {
          if (localTag(ch.tag) !== 'item') return false;
          const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
          // Вложенные группировки (StructureItemGroup или StructureItemTable) или диаграммы (StructureItemChart)
          return t.includes('StructureItemGroup') || t.includes('StructureItemTable') || t.includes('StructureItemChart');
        });
      };
      
      // Функция извлечения вложенной структуры (для row/column с вложенными item)
      // ВАЖНО: Вложенные группировки могут быть как прямыми дочерними элементами, так и внутри groupItems
      const extractNestedStructure = (parentNode: DcsNode | null): any => {
        if (!parentNode) return null;
        
        const groupItemsNode = findChildNodeByLocalTag(parentNode, 'groupItems');
        const fields = extractGroupFields(groupItemsNode);
        
        // outputParameters для column/row (и вложенных группировок)
        const outParamsNode = findChildNodeByLocalTag(parentNode, 'outputParameters');
        const existingParamsMap = new Map<string, { value: string; node: DcsNode; use: boolean }>();
        if (outParamsNode?.children) {
          for (const ch of outParamsNode.children) {
            if (localTag(ch.tag) !== 'item') continue;
            const paramNode = findChildNodeByLocalTag(ch, 'parameter');
            const valueNode = findChildNodeByLocalTag(ch, 'value');
            const useNode = findChildNodeByLocalTag(ch, 'use');
            const param = String(paramNode?.text || '').trim();
            const val = extractValueFromParameterValue(valueNode);
            const use = useNode ? String(useNode.text || 'true').toLowerCase() === 'true' : true;
            if (param) existingParamsMap.set(param, { value: val, node: ch, use });
          }
        }
        const outputParams: Array<{ parameter: string; value: string; node: DcsNode | null; use: boolean }> = GROUPING_OUTPUT_PARAMS.map((def) => {
          const existing = existingParamsMap.get(def.parameter);
          return existing
            ? { parameter: def.parameter, value: existing.value, node: existing.node, use: existing.use }
            : { parameter: def.parameter, value: '', node: null, use: false };
        });
        
        // Ищем вложенные <dcsset:item> - они могут быть:
        // 1. Прямыми дочерними элементами родительской группировки (как в отчете ПродажаМебели)
        // 2. Внутри groupItems (альтернативный вариант)
        const nestedItemsFromDirectChildren = (parentNode.children || []).filter((ch) => {
          if (localTag(ch.tag) !== 'item') return false;
          const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
          // Ищем группировки (StructureItemGroup/Table) и диаграммы (StructureItemChart), пропускаем поля и другие типы
          return t.includes('StructureItemGroup') || t.includes('StructureItemTable') || t.includes('StructureItemChart');
        });
        
        // Также ищем вложенные группировки внутри groupItems
        const nestedItemsFromGroupItems = extractNestedGroupingsFromGroupItems(groupItemsNode);
        
        // Объединяем оба источника вложенных группировок и диаграмм
        const allNestedItems = [...nestedItemsFromDirectChildren, ...nestedItemsFromGroupItems];
        
        // Обрабатываем вложенные элементы: группировки рекурсивно, диаграммы отдельно
        const nested = allNestedItems.map((nestedItem) => {
          const nestedType = String(nestedItem.attrs?.['@_xsi:type'] || '').trim();
          if (nestedType.includes('StructureItemChart')) {
            // Для диаграммы возвращаем структуру с параметрами диаграммы
            return {
              node: nestedItem,
              path: nestedItem.path,
              fields: [],
              nested: [],
              isChart: true,
              chartParams: extractChartParams(nestedItem),
            };
          } else {
            // Для группировки рекурсивно извлекаем структуру
            return extractNestedStructure(nestedItem);
          }
        }).filter(Boolean);
        
        return {
          node: parentNode,
          path: parentNode.path,
          fields,
          nested,
          outputParams,
          outputParamsNode: outParamsNode,
          structNode: parentNode,
        };
      };
      
      // Имя и вариант использования группировки (для отображения как в 1С)
      const groupName = String(findChildNodeByLocalTag(item, 'name')?.text || '').trim();
      let groupUseVariant = '';
      const outputParamsNode = findChildNodeByLocalTag(item, 'outputParameters');
      if (outputParamsNode?.children) {
        const variantItem = outputParamsNode.children.find((ch) => {
          if (localTag(ch.tag) !== 'item') return false;
          const paramNode = findChildNodeByLocalTag(ch, 'parameter');
          const p = String(paramNode?.text || '').trim();
          return p === 'ВариантИспользованияГруппировки' || p.includes('GroupUseVariant');
        });
        if (variantItem) {
          const valNode = findChildNodeByLocalTag(variantItem, 'value');
          groupUseVariant = String(valNode?.text || '').trim();
        }
      }
      const GROUP_USE_VARIANT_LABELS: Record<string, string> = {
        AdditionalInformation: 'Дополнительная информация',
        Items: 'Детальные записи',
        DontUse: 'Не использовать',
      };
      // Формат как в 1С: <Дополнительная информация> (Заголовок), <Детальные записи>
      const variantLabel = groupUseVariant ? (GROUP_USE_VARIANT_LABELS[groupUseVariant] || groupUseVariant) : null;
      const groupDisplayLabel = variantLabel
        ? `<${variantLabel}>` + (groupName ? ` (${groupName})` : '')
        : groupName ? groupName : `<Детальные записи>`;

      // outputParameters — «Другие настройки». Объединяем полный список параметров с существующими в XML.
      const existingParamsMap = new Map<string, { value: string; node: DcsNode; use: boolean }>();
      if (outputParamsNode?.children) {
        for (const ch of outputParamsNode.children) {
          if (localTag(ch.tag) !== 'item') continue;
          const paramNode = findChildNodeByLocalTag(ch, 'parameter');
          const valueNode = findChildNodeByLocalTag(ch, 'value');
          const useNode = findChildNodeByLocalTag(ch, 'use');
          const param = String(paramNode?.text || '').trim();
          const val = extractValueFromParameterValue(valueNode);
          const use = useNode ? String(useNode.text || 'true').toLowerCase() === 'true' : true;
          if (param) existingParamsMap.set(param, { value: val, node: ch, use });
        }
      }
        const outputParams: Array<{ parameter: string; value: string; node: DcsNode | null; use: boolean }> = GROUPING_OUTPUT_PARAMS.map((def) => {
        const existing = existingParamsMap.get(def.parameter);
        return existing
          ? { parameter: def.parameter, value: existing.value, node: existing.node, use: existing.use }
          : { parameter: def.parameter, value: '', node: null, use: false };
      });

      // Проверка SelectedItemAuto / OrderItemAuto (автоматический режим полей)
      const selectionNode = findChildNodeByLocalTag(item, 'selection');
      const orderNode = findChildNodeByLocalTag(item, 'order');
      const hasSelectedItemAuto = (selectionNode?.children || []).some((ch) =>
        String(ch.attrs?.['@_xsi:type'] || '').includes('SelectedItemAuto')
      );
      const hasOrderItemAuto = (orderNode?.children || []).some((ch) =>
        String(ch.attrs?.['@_xsi:type'] || '').includes('OrderItemAuto')
      );
      const isAutoMode = hasSelectedItemAuto && hasOrderItemAuto;

      // Элемент use для включения/отключения группировки
      const useNode = findChildNodeByLocalTag(item, 'use');

      // Для таблицы ищем column и row
      let columnStructure: any = null;
      let rowStructure: any = null;
      let groupFields: any[] = [];
      let chartParams: { chartType: string; title: string } | null = null;
      let nestedCharts: any[] = [];
      
      if (isChart) {
        // Извлекаем параметры диаграммы
        chartParams = extractChartParams(item);
        
        // Диаграммы не имеют groupItems, но могут быть вложены в группировки
        // Вложенные диаграммы извлекаются через extractNestedStructure для группировок
      } else if (isTable) {
        const colNode = findChildNodeByLocalTag(item, 'column');
        const rowNode = findChildNodeByLocalTag(item, 'row');
        
        columnStructure = extractNestedStructure(colNode);
        rowStructure = extractNestedStructure(rowNode);
      } else {
        const groupItemsNode = findChildNodeByLocalTag(item, 'groupItems');
        groupFields = extractGroupFields(groupItemsNode);
        
        // ВАЖНО: Ищем вложенные группировки внутри groupItems
        // Они могут быть как item с типом StructureItemGroup/Table внутри groupItems
        const nestedGroupingsInGroupItems = extractNestedGroupingsFromGroupItems(groupItemsNode);
        if (nestedGroupingsInGroupItems.length > 0) {
          // Добавляем информацию о вложенных группировках
          // Они будут обработаны рекурсивно при отображении
        }
      }
      
      // Обрабатываем вложенные группировки и диаграммы для обычных группировок
      // ВАЖНО: Вложенные элементы могут быть:
      // 1. Прямыми дочерними элементами (как в отчете ПродажаМебели)
      // 2. Внутри groupItems
      let nestedFromGroupItems: any[] = [];
      if (isGroup) {
        // Ищем вложенные группировки и диаграммы как прямые дочерние элементы
        const nestedFromDirectChildren = (item.children || []).filter((ch) => {
          if (localTag(ch.tag) !== 'item') return false;
          const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
          return t.includes('StructureItemGroup') || t.includes('StructureItemTable') || t.includes('StructureItemChart');
        });
        
        // Также ищем внутри groupItems
        const groupItemsNode = findChildNodeByLocalTag(item, 'groupItems');
        const nestedFromGroupItemsNodes = extractNestedGroupingsFromGroupItems(groupItemsNode);
        
        // Объединяем оба источника
        const allNestedGroupings = [...nestedFromDirectChildren, ...nestedFromGroupItemsNodes];
        
        nestedFromGroupItems = allNestedGroupings.map((nestedNode) => {
          const nestedType = String(nestedNode.attrs?.['@_xsi:type'] || '').trim();
          const isNestedChart = nestedType.includes('StructureItemChart');
          
          if (isNestedChart) {
            // Для диаграммы извлекаем только параметры
            return {
              node: nestedNode,
              path: nestedNode.path,
              isChart: true,
              chartParams: extractChartParams(nestedNode),
              fields: [],
              nested: []
            };
          }
          
          // Для группировки рекурсивно извлекаем структуру
          const nestedGroupItemsNode = findChildNodeByLocalTag(nestedNode, 'groupItems');
          const nestedFields = extractGroupFields(nestedGroupItemsNode);
          const nestedName = String(findChildNodeByLocalTag(nestedNode, 'name')?.text || '').trim();
          let nestedUseVariant = '';
          const nestedOutputParams = findChildNodeByLocalTag(nestedNode, 'outputParameters');
          const variantItem = (nestedOutputParams?.children || []).find((ch) => {
            if (localTag(ch.tag) !== 'item') return false;
            const p = String(findChildNodeByLocalTag(ch, 'parameter')?.text || '').trim();
            return p === 'ВариантИспользованияГруппировки' || p.includes('GroupUseVariant');
          });
          if (variantItem) {
            nestedUseVariant = String(findChildNodeByLocalTag(variantItem, 'value')?.text || '').trim();
          }
          const nestedVariantLabel = nestedUseVariant ? (GROUP_USE_VARIANT_LABELS[nestedUseVariant] || nestedUseVariant) : null;
          const nestedDisplayLabel = nestedVariantLabel
            ? `<${nestedVariantLabel}>` + (nestedName ? ` (${nestedName})` : '')
            : nestedName ? nestedName : `<Детальные записи>`;
          const nestedOutputParamsNode = findChildNodeByLocalTag(nestedNode, 'outputParameters');
          const nestedExistingParamsMap = new Map<string, { value: string; node: DcsNode; use: boolean }>();
          if (nestedOutputParamsNode?.children) {
            for (const ch of nestedOutputParamsNode.children) {
              if (localTag(ch.tag) !== 'item') continue;
              const p = String(findChildNodeByLocalTag(ch, 'parameter')?.text || '').trim();
              const vn = findChildNodeByLocalTag(ch, 'value');
              const un = findChildNodeByLocalTag(ch, 'use');
              const v = extractValueFromParameterValue(vn);
              const use = un ? String(un.text || 'true').toLowerCase() === 'true' : true;
              if (p) nestedExistingParamsMap.set(p, { value: v, node: ch, use });
            }
          }
          const nestedOutputParamsList: Array<{ parameter: string; value: string; node: DcsNode | null; use: boolean }> = GROUPING_OUTPUT_PARAMS.map((def) => {
            const existing = nestedExistingParamsMap.get(def.parameter);
            return existing
              ? { parameter: def.parameter, value: existing.value, node: existing.node, use: existing.use }
              : { parameter: def.parameter, value: '', node: null, use: false };
          });
          const nestedSel = findChildNodeByLocalTag(nestedNode, 'selection');
          const nestedOrd = findChildNodeByLocalTag(nestedNode, 'order');
          const nestedIsAuto = (nestedSel?.children || []).some((ch) => String(ch.attrs?.['@_xsi:type'] || '').includes('SelectedItemAuto'))
            && (nestedOrd?.children || []).some((ch) => String(ch.attrs?.['@_xsi:type'] || '').includes('OrderItemAuto'));
          
          // Рекурсивно ищем еще более вложенные группировки и диаграммы
          const nestedNestedDirect = (nestedNode.children || []).filter((ch) => {
            if (localTag(ch.tag) !== 'item') return false;
            const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
            return t.includes('StructureItemGroup') || t.includes('StructureItemTable') || t.includes('StructureItemChart');
          });
          const nestedNestedFromGroupItems = extractNestedGroupingsFromGroupItems(nestedGroupItemsNode);
          const allNestedNested = [...nestedNestedDirect, ...nestedNestedFromGroupItems];
          
          return {
            node: nestedNode,
            path: nestedNode.path,
            isChart: false,
            fields: nestedFields,
            groupDisplayLabel: nestedDisplayLabel,
            isAutoMode: nestedIsAuto,
            outputParams: nestedOutputParamsList,
            outputParamsNode: nestedOutputParamsNode,
            structNode: nestedNode,
            nested: allNestedNested.map(nn => {
              const nnType = String(nn.attrs?.['@_xsi:type'] || '').trim();
              if (nnType.includes('StructureItemChart')) {
                return {
                  node: nn,
                  path: nn.path,
                  isChart: true,
                  chartParams: extractChartParams(nn),
                  fields: [],
                  nested: []
                };
              }
              const nnGroupItems = findChildNodeByLocalTag(nn, 'groupItems');
              return {
                node: nn,
                path: nn.path,
                isChart: false,
                fields: extractGroupFields(nnGroupItems),
                nested: []
              };
            })
          };
        });
        
        // Отдельно извлекаем вложенные диаграммы
        nestedCharts = nestedFromGroupItems.filter(n => n.isChart);
      }
      
      return {
        node: item,
        path: item.path,
        itemType,
        isTable,
        isGroup,
        isChart,
        groupFields,
        columnStructure,
        rowStructure,
        chartParams,
        nestedCharts,
        groupDisplayLabel,
        isAutoMode,
        useNode,
        outputParams,
        outputParamsNode,
        structNode: item,
        // Вложенные группировки и диаграммы из groupItems (для обычных группировок)
        nestedFromGroupItems,
      };
    });
  }, [structureNode, schemaChildren]);

  const structuralUpdate = onUpdateNodeReindex || onUpdateNode;

  // Добавить поле
  const handleAddField = useCallback(() => {
    if (!newFieldName.trim()) return;
    const fieldName = newFieldName.trim();
    
    if (!selectionNode) {
      structuralUpdate(settingsRoot!.path, (s) => {
        const newSelection: DcsNode = {
          path: '',
          tag: 'dcsset:selection',
          attrs: {},
          children: [{
            path: '',
            tag: 'dcsset:item',
            attrs: { '@_xsi:type': 'dcsset:SelectedItemField' },
            children: [{ path: '', tag: 'dcsset:field', attrs: {}, text: fieldName, children: [] }],
          }],
        };
        return { ...s, children: [...s.children, newSelection] };
      });
    } else {
      structuralUpdate(selectionNode.path, (sel) => {
        const newItem: DcsNode = {
          path: '',
          tag: 'dcsset:item',
          attrs: { '@_xsi:type': 'dcsset:SelectedItemField' },
          children: [{ path: '', tag: 'dcsset:field', attrs: {}, text: fieldName, children: [] }],
        };
        return { ...sel, children: [...sel.children, newItem] };
      });
    }
    
    setNewFieldName('');
    setAddingField(false);
  }, [settingsRoot, selectionNode, structuralUpdate, newFieldName]);

  // Удалить поле
  const handleDeleteField = useCallback((fieldPath: string) => {
    if (!selectionNode) return;
    structuralUpdate(selectionNode.path, (sel) => {
      const idx = sel.children.findIndex((ch) => ch.path === fieldPath);
      if (idx < 0) return sel;
      const nextChildren = sel.children.filter((_, i) => i !== idx);
      return { ...sel, children: nextChildren };
    });
  }, [selectionNode, structuralUpdate]);

  // Добавить отбор
  const handleAddFilter = useCallback(() => {
    if (!newFilterField.trim()) return;
    const fieldName = newFilterField.trim();

    if (!filterNode) {
      structuralUpdate(settingsRoot!.path, (s) => {
        const newFilter: DcsNode = {
          path: '',
          tag: 'dcsset:filter',
          attrs: {},
          children: [{
            path: '',
            tag: 'dcsset:item',
            attrs: { '@_xsi:type': 'dcsset:FilterItemComparison' },
            children: [
              { path: '', tag: 'dcsset:use', attrs: {}, text: 'true', children: [] },
              { path: '', tag: 'dcsset:left', attrs: { '@_xsi:type': 'dcscor:Field' }, text: fieldName, children: [] },
              { path: '', tag: 'dcsset:comparisonType', attrs: {}, text: 'Equal', children: [] },
            ],
          }],
        };
        return { ...s, children: [...s.children, newFilter] };
      });
    } else {
      structuralUpdate(filterNode.path, (filt) => {
        const newItem: DcsNode = {
          path: '',
          tag: 'dcsset:item',
          attrs: { '@_xsi:type': 'dcsset:FilterItemComparison' },
          children: [
            { path: '', tag: 'dcsset:use', attrs: {}, text: 'true', children: [] },
            { path: '', tag: 'dcsset:left', attrs: { '@_xsi:type': 'dcscor:Field' }, text: fieldName, children: [] },
            { path: '', tag: 'dcsset:comparisonType', attrs: {}, text: 'Equal', children: [] },
          ],
        };
        return { ...filt, children: [...filt.children, newItem] };
      });
    }
    
    setNewFilterField('');
    setAddingFilter(false);
  }, [settingsRoot, filterNode, structuralUpdate, newFilterField]);

  // Удалить отбор
  const handleDeleteFilter = useCallback((filterPath: string) => {
    if (!filterNode) return;
    structuralUpdate(filterNode.path, (filt) => {
      const idx = filt.children.findIndex((ch) => ch.path === filterPath);
      if (idx < 0) return filt;
      const nextChildren = filt.children.filter((_, i) => i !== idx);
      return { ...filt, children: nextChildren };
    });
  }, [filterNode, structuralUpdate]);

  // Добавить сортировку
  const handleAddOrder = useCallback(() => {
    if (!newOrderField.trim()) return;
    const fieldName = newOrderField.trim();

    if (!orderNode) {
      structuralUpdate(settingsRoot!.path, (s) => {
        const newOrder: DcsNode = {
          path: '',
          tag: 'dcsset:order',
          attrs: {},
          children: [{
            path: '',
            tag: 'dcsset:item',
            attrs: { '@_xsi:type': 'dcsset:OrderItemField' },
            children: [
              { path: '', tag: 'dcsset:field', attrs: {}, text: fieldName, children: [] },
              { path: '', tag: 'dcsset:orderType', attrs: {}, text: 'Asc', children: [] },
            ],
          }],
        };
        return { ...s, children: [...s.children, newOrder] };
      });
    } else {
      structuralUpdate(orderNode.path, (ord) => {
        const newItem: DcsNode = {
          path: '',
          tag: 'dcsset:item',
          attrs: { '@_xsi:type': 'dcsset:OrderItemField' },
          children: [
            { path: '', tag: 'dcsset:field', attrs: {}, text: fieldName, children: [] },
            { path: '', tag: 'dcsset:orderType', attrs: {}, text: 'Asc', children: [] },
          ],
        };
        return { ...ord, children: [...ord.children, newItem] };
      });
    }
    
    setNewOrderField('');
    setAddingOrder(false);
  }, [settingsRoot, orderNode, structuralUpdate, newOrderField]);

  // Удалить сортировку
  const handleDeleteOrder = useCallback((orderPath: string) => {
    if (!orderNode) return;
    structuralUpdate(orderNode.path, (ord) => {
      const idx = ord.children.findIndex((ch) => ch.path === orderPath);
      if (idx < 0) return ord;
      const nextChildren = ord.children.filter((_, i) => i !== idx);
      return { ...ord, children: nextChildren };
    });
  }, [orderNode, structuralUpdate]);

  // Получить список всех доступных группировок для выбора родителя (включая вложенные)
  const getAllGroupingsForParent = useCallback((): Array<{ path: string; label: string; node: DcsNode }> => {
    const result: Array<{ path: string; label: string; node: DcsNode }> = [];
    
    // Рекурсивная функция для обхода узлов структуры
    const walkNode = (node: DcsNode, prefix: string = '') => {
      const nodeType = String(node.attrs?.['@_xsi:type'] || '').trim();
      const isGroup = nodeType.includes('StructureItemGroup');
      const isTable = nodeType.includes('StructureItemTable');
      const isColumn = localTag(node.tag) === 'column';
      const isRow = localTag(node.tag) === 'row';
      
      const isChart = nodeType.includes('StructureItemChart');
      
      // Добавляем узел в список, если это группировка, таблица или диаграмма
      if (isGroup || isTable || isChart) {
        let label = '';
        if (isTable) {
          label = prefix + '📊 Таблица';
        } else if (isChart) {
          // Для диаграммы пытаемся извлечь заголовок
          const outputParamsNode = findChildNodeByLocalTag(node, 'outputParameters');
          let chartTitle = '';
          if (outputParamsNode) {
            const titleItems = (outputParamsNode.children || []).filter((ch) => {
              if (localTag(ch.tag) !== 'item') return false;
              const paramNode = findChildNodeByLocalTag(ch, 'parameter');
              return String(paramNode?.text || '').trim().includes('заголовок') || String(paramNode?.text || '').trim().includes('Title');
            });
            if (titleItems.length > 0) {
              const titleValueNode = findChildNodeByLocalTag(titleItems[0], 'value');
              if (titleValueNode) {
                const titleItemNode = findChildNodeByLocalTag(titleValueNode, 'item');
                if (titleItemNode) {
                  const contentNode = findChildNodeByLocalTag(titleItemNode, 'content');
                  chartTitle = String(contentNode?.text || '').trim();
                }
              }
            }
          }
          label = prefix + (chartTitle ? `📊 Диаграмма: ${chartTitle}` : '📊 Диаграмма');
        } else {
          label = prefix + '📁 Группировка';
        }
        result.push({ path: node.path, label, node });
      } else if (isColumn || isRow) {
        const label = prefix + (isColumn ? '📋 Колонки' : '📊 Строки');
        result.push({ path: node.path, label, node });
      }
      
      // Рекурсивно обходим дочерние элементы
      for (const child of node.children || []) {
        const childType = String(child.attrs?.['@_xsi:type'] || '').trim();
        const childLocalTag = localTag(child.tag);
        
        // Пропускаем поля группировки (GroupItemField)
        if (childType.includes('GroupItemField') || childLocalTag === 'field' || childLocalTag === 'groupType') {
          continue;
        }
        
        // Если это item с типом группировки, таблицы, диаграммы или column/row, рекурсивно обходим
        if (childLocalTag === 'item' && (childType.includes('StructureItem') || childType === '')) {
          walkNode(child, prefix + '  ');
        } else if (childLocalTag === 'column' || childLocalTag === 'row') {
          walkNode(child, prefix + '  ');
        } else if (childLocalTag === 'groupItems') {
          // Обходим элементы внутри groupItems
          for (const groupItem of child.children || []) {
            if (localTag(groupItem.tag) === 'item') {
              walkNode(groupItem, prefix + '  ');
            }
          }
        }
      }
    };
    
        // Обходим все элементы структуры верхнего уровня
        for (const item of structureItems) {
          walkNode(item.node, '');
          
          // Для таблиц добавляем column и row
          if (item.isTable) {
            const colNode = findChildNodeByLocalTag(item.node, 'column');
            const rowNode = findChildNodeByLocalTag(item.node, 'row');
            
            if (colNode) {
              result.push({ path: colNode.path, label: '  📋 Колонки', node: colNode });
              walkNode(colNode, '    ');
            }
            if (rowNode) {
              result.push({ path: rowNode.path, label: '  📊 Строки', node: rowNode });
              walkNode(rowNode, '    ');
            }
          }
        }
        
        // Добавляем диаграммы в список (для возможности вложенности в группировки)
        for (const item of structureItems) {
          if (item.isChart) {
            const chartLabel = item.chartParams?.title || item.chartParams?.chartType || '📊 Диаграмма';
            result.push({ path: item.path, label: `  📊 ${chartLabel}`, node: item.node });
          }
        }
    
    return result;
  }, [structureItems]);

  // Добавить простую группировку (может быть вложенной)
  const handleAddGrouping = useCallback(() => {
    if (!settingsRoot || !newGroupingField.trim()) return;
    const fieldName = newGroupingField.trim();

    // Создаем новую группировку
    const newGroupItem: DcsNode = {
      path: '',
      tag: 'dcsset:item',
      attrs: { '@_xsi:type': 'dcsset:StructureItemGroup' },
      children: [{
        path: '',
        tag: 'dcsset:groupItems',
        attrs: {},
        children: [{
          path: '',
          tag: 'dcsset:item',
          attrs: { '@_xsi:type': 'dcsset:GroupItemField' },
          children: [
            { path: '', tag: 'dcsset:field', attrs: {}, text: fieldName, children: [] },
            { path: '', tag: 'dcsset:groupType', attrs: {}, text: 'Items', children: [] },
            { path: '', tag: 'dcsset:periodAdditionType', attrs: {}, text: 'None', children: [] },
          ],
        }],
      }],
    };

    // Если выбран родитель, добавляем как вложенную группировку
    if (parentGroupingPath && structureNode) {
      // Находим информацию о родительском узле из getAllGroupingsForParent
      // getAllGroupingsForParent возвращает пути относительно structureNode.children,
      // но нам нужен полный путь относительно schemaChildren
      const allGroupings = getAllGroupingsForParent();
      const parentInfo = allGroupings.find(g => g.path === parentGroupingPath);
      
      if (parentInfo && parentInfo.node) {
        const parentNode = parentInfo.node;
        // Строим полный путь к родительскому узлу в schemaChildren
        // Сначала находим путь к структуре
        const structurePathInSchema = findFirstPathByLocalTag(schemaChildren, 'structure');
        if (structurePathInSchema) {
          const structureInSchema = getNodeAtPath(schemaChildren, structurePathInSchema);
          if (structureInSchema) {
            // Рекурсивно ищем родительский узел в структуре и строим к нему путь
            const findNodePath = (nodes: DcsNode[], targetNode: DcsNode, basePath: string = ''): string | null => {
              for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                const currentPath = basePath ? `${basePath}.${i}` : `${i}`;
                // Сравниваем по ссылке или по path, если он есть
                if (node === targetNode || (node.path && targetNode.path && node.path === targetNode.path)) {
                  return currentPath;
                }
                if (node.children && node.children.length > 0) {
                  const found = findNodePath(node.children, targetNode, currentPath);
                  if (found) return found;
                }
              }
              return null;
            };
            
            const relativePath = findNodePath(structureInSchema.children || [], parentNode);
            if (relativePath !== null) {
              const fullParentPath = `${structurePathInSchema}.${relativePath}`;
              
              structuralUpdate(fullParentPath, (parent) => {
                const parentLocalTag = localTag(parent.tag);
                const parentType = String(parent.attrs?.['@_xsi:type'] || '').trim();
                const isParentGroup = parentType.includes('StructureItemGroup');
                const isParentTable = parentType.includes('StructureItemTable');
                
                // По XSD и тестам: вложенные группировки (StructureItemGroup/Table) и поля (GroupItemField)
                // размещаются внутри groupItems. column и row также содержат groupItems.
                let groupItemsNode = findChildNodeByLocalTag(parent, 'groupItems');
                if (parentLocalTag === 'column' || parentLocalTag === 'row' || isParentGroup || isParentTable) {
                  if (groupItemsNode) {
                    const groupItemsIdx = parent.children!.findIndex((ch) => ch.path === groupItemsNode!.path);
                    if (groupItemsIdx >= 0) {
                      const nextChildren = parent.children!.slice();
                      nextChildren[groupItemsIdx] = {
                        ...groupItemsNode,
                        children: [...(groupItemsNode.children || []), newGroupItem],
                      };
                      return { ...parent, children: nextChildren };
                    }
                  } else if (isParentGroup || isParentTable) {
                    // Создаём groupItems если отсутствует (для новой группировки)
                    const newGroupItems: DcsNode = {
                      path: '',
                      tag: 'dcsset:groupItems',
                      attrs: {},
                      children: [newGroupItem],
                    };
                    return { ...parent, children: [...(parent.children || []), newGroupItems] };
                  }
                }
                
                return parent;
              });
            }
          }
        }
      }
    } else {
      // Добавляем на верхний уровень структуры
      if (!structureNode) {
        structuralUpdate(settingsRoot.path, (s) => {
          const newStructure: DcsNode = {
            path: '',
            tag: 'dcsset:structure',
            attrs: {},
            children: [newGroupItem],
          };
          return { ...s, children: [...s.children, newStructure] };
        });
      } else {
        structuralUpdate(structureNode.path, (struct) => {
          return { ...struct, children: [...struct.children, newGroupItem] };
        });
      }
    }
    
    setNewGroupingField('');
    setParentGroupingPath(null);
    setAddingGrouping(false);
  }, [settingsRoot, structureNode, structuralUpdate, newGroupingField, parentGroupingPath]);

  // Удалить элемент структуры (группировку/таблицу)
  const handleDeleteStructureItem = useCallback((itemPath: string) => {
    if (!structureNode) return;
    structuralUpdate(structureNode.path, (struct) => {
      const idx = struct.children.findIndex((ch) => ch.path === itemPath);
      if (idx < 0) return struct;
      const nextChildren = struct.children.filter((_, i) => i !== idx);
      return { ...struct, children: nextChildren };
    });
  }, [structureNode, structuralUpdate]);

  return (
    <div className="dcs-details">
      <div className="dcs-details__head">
        <div className="dcs-details__name">{presentation || name || 'Вариант настроек'}</div>
      </div>

      <div className="dcs-section">
        <div className="dcs-section__title">Основное</div>
        <div className="dcs-section__body">
          <table className="edt-grid__table">
            <tbody>
              <tr>
                <td style={{ width: '35%', opacity: 0.8 }}>Имя</td>
                <td>
                  <input
                    className="edt-props-editor__input"
                    value={name}
                    onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'name', e.target.value))}
                  />
                </td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>Представление</td>
                <td>
                  <input
                    className="edt-props-editor__input"
                    value={presentation}
                    onChange={(e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'presentation', e.target.value, 'dcsset:presentation'))}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {!settingsRoot ? (
        <div className="dcs-section">
          <div className="dcs-section__title">Настройки</div>
          <div className="dcs-section__body">
            <div className="dcs-empty">У варианта настроек не найден узел settings.</div>
          </div>
        </div>
      ) : (
        <div className="dcs-section">
          <div className="dcs-section__title">Настройки отчета</div>
          <div className="dcs-section__body">
            <div className="dcs-top-tabs" style={{ marginBottom: 10 }}>
              <button
                className={`dcs-top-tab ${activeSettingsTab === 'fields' ? 'is-active' : ''}`}
                onClick={() => setActiveSettingsTab('fields')}
              >
                Поля <span className="dcs-top-tab__count">{selectedFields.length}</span>
              </button>
              <button
                className={`dcs-top-tab ${activeSettingsTab === 'filters' ? 'is-active' : ''}`}
                onClick={() => setActiveSettingsTab('filters')}
              >
                Отборы <span className="dcs-top-tab__count">{filterItems.length}</span>
              </button>
              <button
                className={`dcs-top-tab ${activeSettingsTab === 'order' ? 'is-active' : ''}`}
                onClick={() => setActiveSettingsTab('order')}
              >
                Сортировки <span className="dcs-top-tab__count">{orderItems.length}</span>
              </button>
              <button
                className={`dcs-top-tab ${activeSettingsTab === 'structure' ? 'is-active' : ''}`}
                onClick={() => setActiveSettingsTab('structure')}
              >
                Группировки <span className="dcs-top-tab__count">{structureItems.length}</span>
              </button>
              <button
                className={`dcs-top-tab ${activeSettingsTab === 'other' ? 'is-active' : ''}`}
                onClick={() => setActiveSettingsTab('other')}
              >
                Прочее
              </button>
            </div>

            {activeSettingsTab === 'fields' && (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                  {!addingField ? (
                    <button type="button" className="edt-icon-btn" title="Добавить поле" onClick={() => setAddingField(true)}>+</button>
                  ) : (
                    <>
                      <input
                        className="edt-props-editor__input"
                        style={{ width: 200 }}
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="Имя поля..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddField();
                          if (e.key === 'Escape') { setAddingField(false); setNewFieldName(''); }
                        }}
                      />
                      <button type="button" className="edt-icon-btn" title="Добавить" onClick={handleAddField} disabled={!newFieldName.trim()}>✓</button>
                      <button type="button" className="edt-icon-btn" title="Отмена" onClick={() => { setAddingField(false); setNewFieldName(''); }}>✕</button>
                    </>
                  )}
                </div>
                {selectedFields.length === 0 ? (
                  <div className="dcs-empty">Нет выбранных полей. Нажмите "+" для добавления.</div>
                ) : (
                  <table className="edt-grid__table">
                    <thead>
                      <tr>
                        <th style={{ width: '80%' }}>Поле</th>
                        <th style={{ width: '20%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFields.map((f, idx) => (
                        <tr key={f.path}>
                          <td>
                            <input
                              className="edt-props-editor__input"
                              value={f.fieldName}
                              onChange={(e) => {
                                const fieldNode = findChildNodeByLocalTag(f.node, 'field');
                                if (fieldNode) {
                                  onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                                }
                              }}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="edt-icon-btn"
                              title="Удалить"
                              onClick={() => handleDeleteField(f.path)}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeSettingsTab === 'filters' && (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                  {!addingFilter ? (
                    <button type="button" className="edt-icon-btn" title="Добавить отбор" onClick={() => setAddingFilter(true)}>+</button>
                  ) : (
                    <>
                      <input
                        className="edt-props-editor__input"
                        style={{ width: 200 }}
                        value={newFilterField}
                        onChange={(e) => setNewFilterField(e.target.value)}
                        placeholder="Имя поля для отбора..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddFilter();
                          if (e.key === 'Escape') { setAddingFilter(false); setNewFilterField(''); }
                        }}
                      />
                      <button type="button" className="edt-icon-btn" title="Добавить" onClick={handleAddFilter} disabled={!newFilterField.trim()}>✓</button>
                      <button type="button" className="edt-icon-btn" title="Отмена" onClick={() => { setAddingFilter(false); setNewFilterField(''); }}>✕</button>
                    </>
                  )}
                </div>
                {filterItems.length === 0 ? (
                  <div className="dcs-empty">Нет отборов. Нажмите "+" для добавления.</div>
                ) : (
                  <table className="edt-grid__table">
                    <thead>
                      <tr>
                        <th style={{ width: '5%' }}>✓</th>
                        <th style={{ width: '40%' }}>Поле</th>
                        <th style={{ width: '30%' }}>Условие</th>
                        <th style={{ width: '20%' }}>Значение</th>
                        <th style={{ width: '5%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterItems.map((f) => {
                        const useNode = findChildNodeByLocalTag(f.node, 'use');
                        const leftNode = findChildNodeByLocalTag(f.node, 'left');
                        const compTypeNode = findChildNodeByLocalTag(f.node, 'comparisonType');
                        const rightNode = findChildNodeByLocalTag(f.node, 'right');
                        return (
                          <tr key={f.path}>
                            <td>
                              <input
                                type="checkbox"
                                checked={f.use}
                                onChange={(e) => {
                                  if (useNode) {
                                    onUpdateNode(useNode.path, (n) => ({ ...n, text: e.target.checked ? 'true' : 'false' }));
                                  }
                                }}
                              />
                            </td>
                            <td>
                              <input
                                className="edt-props-editor__input"
                                value={f.field}
                                onChange={(e) => {
                                  if (leftNode) {
                                    onUpdateNode(leftNode.path, (n) => ({ ...n, text: e.target.value }));
                                  }
                                }}
                              />
                            </td>
                            <td>
                              <select
                                className="edt-props-editor__input"
                                value={f.comparisonType}
                                onChange={(e) => {
                                  if (compTypeNode) {
                                    onUpdateNode(compTypeNode.path, (n) => ({ ...n, text: e.target.value }));
                                  }
                                }}
                              >
                                <option value="Equal">Равно</option>
                                <option value="NotEqual">Не равно</option>
                                <option value="Greater">Больше</option>
                                <option value="GreaterOrEqual">Больше или равно</option>
                                <option value="Less">Меньше</option>
                                <option value="LessOrEqual">Меньше или равно</option>
                                <option value="InList">В списке</option>
                                <option value="InHierarchy">В иерархии</option>
                                <option value="Contains">Содержит</option>
                                <option value="BeginsWith">Начинается с</option>
                              </select>
                            </td>
                            <td>
                              <input
                                className="edt-props-editor__input"
                                value={f.value}
                                onChange={(e) => {
                                  if (rightNode) {
                                    onUpdateNode(rightNode.path, (n) => ({ ...n, text: e.target.value }));
                                  } else if (f.node) {
                                    structuralUpdate(f.node.path, (item) => ({
                                      ...item,
                                      children: [
                                        ...item.children,
                                        { path: '', tag: 'dcsset:right', attrs: {}, text: e.target.value, children: [] },
                                      ],
                                    }));
                                  }
                                }}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="edt-icon-btn"
                                title="Удалить"
                                onClick={() => handleDeleteFilter(f.path)}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeSettingsTab === 'order' && (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                  {!addingOrder ? (
                    <button type="button" className="edt-icon-btn" title="Добавить сортировку" onClick={() => setAddingOrder(true)}>+</button>
                  ) : (
                    <>
                      <input
                        className="edt-props-editor__input"
                        style={{ width: 200 }}
                        value={newOrderField}
                        onChange={(e) => setNewOrderField(e.target.value)}
                        placeholder="Имя поля для сортировки..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddOrder();
                          if (e.key === 'Escape') { setAddingOrder(false); setNewOrderField(''); }
                        }}
                      />
                      <button type="button" className="edt-icon-btn" title="Добавить" onClick={handleAddOrder} disabled={!newOrderField.trim()}>✓</button>
                      <button type="button" className="edt-icon-btn" title="Отмена" onClick={() => { setAddingOrder(false); setNewOrderField(''); }}>✕</button>
                    </>
                  )}
                </div>
                {orderItems.length === 0 ? (
                  <div className="dcs-empty">Нет сортировок. Нажмите "+" для добавления.</div>
                ) : (
                  <table className="edt-grid__table">
                    <thead>
                      <tr>
                        <th style={{ width: '70%' }}>Поле</th>
                        <th style={{ width: '25%' }}>Направление</th>
                        <th style={{ width: '5%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((o) => {
                        const fieldNode = findChildNodeByLocalTag(o.node, 'field');
                        const orderTypeNode = findChildNodeByLocalTag(o.node, 'orderType');
                        return (
                          <tr key={o.path}>
                            <td>
                              <input
                                className="edt-props-editor__input"
                                value={o.field}
                                onChange={(e) => {
                                  if (fieldNode) {
                                    onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                                  }
                                }}
                              />
                            </td>
                            <td>
                              <select
                                className="edt-props-editor__input"
                                value={o.orderType}
                                onChange={(e) => {
                                  if (orderTypeNode) {
                                    onUpdateNode(orderTypeNode.path, (n) => ({ ...n, text: e.target.value }));
                                  }
                                }}
                              >
                                <option value="Asc">По возрастанию</option>
                                <option value="Desc">По убыванию</option>
                              </select>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="edt-icon-btn"
                                title="Удалить"
                                onClick={() => handleDeleteOrder(o.path)}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeSettingsTab === 'structure' && (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {!addingGrouping ? (
                    <button type="button" className="edt-icon-btn" title="Добавить группировку" onClick={() => setAddingGrouping(true)}>+</button>
                  ) : (
                    <>
                      <input
                        className="edt-props-editor__input"
                        style={{ width: 200 }}
                        value={newGroupingField}
                        onChange={(e) => setNewGroupingField(e.target.value)}
                        placeholder="Имя поля для группировки..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddGrouping();
                          if (e.key === 'Escape') { setAddingGrouping(false); setNewGroupingField(''); setParentGroupingPath(null); }
                        }}
                      />
                      {structureItems.length > 0 && (
                        <select
                          className="edt-props-editor__input"
                          style={{ width: 250 }}
                          value={parentGroupingPath || ''}
                          onChange={(e) => setParentGroupingPath(e.target.value || null)}
                        >
                          <option value="">-- На верхний уровень --</option>
                          {getAllGroupingsForParent().map((g) => (
                            <option key={g.path} value={g.path}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      )}
                      <button type="button" className="edt-icon-btn" title="Добавить" onClick={handleAddGrouping} disabled={!newGroupingField.trim()}>✓</button>
                      <button type="button" className="edt-icon-btn" title="Отмена" onClick={() => { setAddingGrouping(false); setNewGroupingField(''); setParentGroupingPath(null); }}>✕</button>
                    </>
                  )}
                </div>
                {structureItems.length === 0 ? (
                  <div className="dcs-empty">Нет элементов структуры (группировок, таблиц, диаграмм). Нажмите "+" для добавления.</div>
                ) : (
                  <div>
                    {structureItems.map((struct, idx) => (
                      <div key={struct.path} style={{ marginBottom: 16, padding: 10, border: '1px solid var(--vscode-panel-border)', borderRadius: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            {(struct.isGroup || struct.isTable) && (
                              <input
                                type="checkbox"
                                checked={struct.useNode ? String(struct.useNode.text || 'true').toLowerCase() === 'true' : true}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  if (struct.useNode) {
                                    onUpdateNode(struct.useNode.path, (n) => ({ ...n, text: checked ? 'true' : 'false' }));
                                  } else {
                                    onUpdateNode(struct.path, (n) => {
                                      const useChild = { path: '', tag: 'dcsset:use', attrs: {}, text: checked ? 'true' : 'false', children: [] };
                                      return { ...n, children: [...(n.children || []), useChild] };
                                    });
                                  }
                                }}
                                title="Включить/отключить группировку"
                              />
                            )}
                            <div style={{ fontSize: 13, fontWeight: 'bold', opacity: 0.9 }}>
                              {struct.isTable && '📊 Таблица'}
                              {struct.isGroup && (struct.groupDisplayLabel ? `📁 ${struct.groupDisplayLabel}` : '📁 Группировка')}
                              {struct.isChart && (struct.chartParams?.title ? `📊 Диаграмма: ${struct.chartParams.title}` : '📊 Диаграмма')}
                              {!struct.isTable && !struct.isGroup && !struct.isChart && `Элемент ${idx + 1}`}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="edt-icon-btn"
                            title="Удалить элемент структуры"
                            onClick={() => handleDeleteStructureItem(struct.path)}
                          >
                            ×
                          </button>
                        </div>
                        {struct.isTable ? (
                          <div>
                            {/* Колонки таблицы */}
                            {struct.columnStructure && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, opacity: 0.8 }}>📋 Колонки</div>
                                <NestedGroupingView structure={struct.columnStructure} level={0} onUpdateNode={onUpdateNode} groupingOtherSettingsExpanded={groupingOtherSettingsExpanded} setGroupingOtherSettingsExpanded={setGroupingOtherSettingsExpanded} />
                              </div>
                            )}
                            {/* Строки таблицы */}
                            {struct.rowStructure && (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, opacity: 0.8 }}>📊 Строки</div>
                                <NestedGroupingView structure={struct.rowStructure} level={0} onUpdateNode={onUpdateNode} groupingOtherSettingsExpanded={groupingOtherSettingsExpanded} setGroupingOtherSettingsExpanded={setGroupingOtherSettingsExpanded} />
                              </div>
                            )}
                            {!struct.columnStructure && !struct.rowStructure && (
                              <div className="dcs-empty" style={{ fontSize: 12, padding: 6 }}>Нет полей в таблице</div>
                            )}
                          </div>
                        ) : struct.isChart ? (
                          <div>
                            {/* Параметры диаграммы */}
                            <table className="edt-grid__table">
                              <thead>
                                <tr>
                                  <th style={{ width: '30%' }}>Параметр</th>
                                  <th style={{ width: '70%' }}>Значение</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>Тип диаграммы</td>
                                  <td>
                                    <input
                                      className="edt-props-editor__input"
                                      value={struct.chartParams?.chartType || ''}
                                      readOnly
                                      style={{ opacity: 0.7 }}
                                      placeholder="Pie3D, Column и т.д."
                                    />
                                  </td>
                                </tr>
                                {struct.chartParams?.title && (
                                  <tr>
                                    <td>Заголовок</td>
                                    <td>
                                      <input
                                        className="edt-props-editor__input"
                                        value={struct.chartParams.title}
                                        readOnly
                                        style={{ opacity: 0.7 }}
                                      />
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.6 }}>
                              Для редактирования параметров диаграммы используйте вкладку "Прочее"
                            </div>
                          </div>
                        ) : (
                          <div>
                            {struct.groupFields.length > 0 ? (
                              <table className="edt-grid__table">
                                <thead>
                                  <tr>
                                    <th style={{ width: '70%' }}>Поле группировки</th>
                                    <th style={{ width: '30%' }}>Тип</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {struct.groupFields.map((gf) => {
                                    const fieldNode = findChildNodeByLocalTag(gf.node, 'field');
                                    const groupTypeNode = findChildNodeByLocalTag(gf.node, 'groupType');
                                    return (
                                      <tr key={gf.path}>
                                        <td>
                                          <input
                                            className="edt-props-editor__input"
                                            value={gf.field}
                                            onChange={(e) => {
                                              if (fieldNode) {
                                                onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                                              }
                                            }}
                                          />
                                        </td>
                                        <td>
                                          <select
                                            className="edt-props-editor__input"
                                            value={gf.groupType}
                                            onChange={(e) => {
                                              if (groupTypeNode) {
                                                onUpdateNode(groupTypeNode.path, (n) => ({ ...n, text: e.target.value }));
                                              }
                                            }}
                                          >
                                            <option value="Items">Элементы</option>
                                            <option value="Hierarchy">Иерархия</option>
                                            <option value="OnlyHierarchy">Только иерархия</option>
                                          </select>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            ) : struct.isAutoMode ? (
                              <div style={{ fontSize: 12, padding: 6, opacity: 0.85 }}>
                                Авто (все поля из отбора)
                              </div>
                            ) : (
                              <div className="dcs-empty" style={{ fontSize: 12, padding: 6 }}>Нет полей группировки</div>
                            )}
                            {/* Другие настройки (outputParameters) — сворачиваемая секция */}
                            {struct.outputParams && struct.outputParams.length > 0 && struct.structNode && (
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--vscode-panel-border)' }}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setGroupingOtherSettingsExpanded((prev) => ({ ...prev, [struct.path]: !(prev[struct.path] ?? true) }))}
                                  onKeyDown={(e) => e.key === 'Enter' && setGroupingOtherSettingsExpanded((prev) => ({ ...prev, [struct.path]: !(prev[struct.path] ?? true) }))}
                                  style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, opacity: 0.8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                  <span style={{ transform: (groupingOtherSettingsExpanded[struct.path] ?? true) ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
                                  Другие настройки
                                </div>
                                {(groupingOtherSettingsExpanded[struct.path] ?? true) && (
                                  <table className="edt-grid__table">
                                    <thead>
                                      <tr>
                                        <th style={{ width: 28, paddingRight: 4 }} title="Включить/выключить параметр" />
                                        <th style={{ width: '38%' }}>Параметр</th>
                                        <th style={{ width: '54%' }}>Значение</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {struct.outputParams.map((op, opIdx) => {
                                        const paramDef = GROUPING_PARAM_MAP.get(op.parameter);
                                        const options = paramDef?.options;
                                        const paramLabel = paramDef?.label || op.parameter.replace(/([а-яa-z])([А-ЯA-Z])/g, '$1 $2');
                                        const isChild = !!paramDef?.parentParameter;
                                        const handleValueChange = (newVal: string) => {
                                          if (!struct.structNode) return;
                                          // Всегда обновляем через structNode: valueNode.path может быть '' у новых узлов
                                          onUpdateNode(struct.structNode.path, (n) => upsertOutputParameter(n, op.parameter, newVal, op.use));
                                        };
                                        const handleUseChange = (checked: boolean) => {
                                          if (!struct.structNode) return;
                                          if (op.node) {
                                            onUpdateNode(struct.structNode.path, (n) => setOutputParameterUse(n, op.parameter, checked));
                                          } else if (checked) {
                                            onUpdateNode(struct.structNode.path, (n) => upsertOutputParameter(n, op.parameter, '', true));
                                          }
                                        };
                                        return (
                                          <tr key={opIdx}>
                                            <td style={{ paddingRight: 4, verticalAlign: 'middle' }}>
                                              <input
                                                type="checkbox"
                                                checked={op.use}
                                                onChange={(e) => handleUseChange(e.target.checked)}
                                                title={op.use ? 'Параметр включён' : 'Параметр выключен'}
                                              />
                                            </td>
                                            <td style={{ opacity: op.use ? 0.9 : 0.5, paddingLeft: isChild ? 24 : undefined }}>{paramLabel}</td>
                                            <td>
                                              {options ? (
                                                <select
                                                  className="edt-props-editor__input"
                                                  value={op.value}
                                                  onChange={(e) => handleValueChange(e.target.value)}
                                                  disabled={!op.use}
                                                >
                                                  <option value="">—</option>
                                                  {options.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                  ))}
                                                </select>
                                              ) : (
                                                <input
                                                  className="edt-props-editor__input"
                                                  value={op.value}
                                                  onChange={(e) => handleValueChange(e.target.value)}
                                                  placeholder="—"
                                                  disabled={!op.use}
                                                />
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                            {/* Отображаем вложенные диаграммы */}
                            {struct.nestedCharts && struct.nestedCharts.length > 0 && (
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--vscode-panel-border)' }}>
                                <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, opacity: 0.8 }}>Вложенные диаграммы:</div>
                                {struct.nestedCharts.map((chart: any, chartIdx: number) => (
                                  <div key={chartIdx} style={{ marginBottom: 8, padding: 8, border: '1px solid var(--vscode-panel-border)', borderRadius: 4, marginLeft: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, opacity: 0.9 }}>
                                      📊 {chart.chartParams?.title || chart.chartParams?.chartType || 'Диаграмма'}
                                    </div>
                                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                                      Тип: {chart.chartParams?.chartType || 'не указан'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Отображаем вложенные группировки и диаграммы из groupItems */}
                            {struct.nestedFromGroupItems && struct.nestedFromGroupItems.length > 0 && (
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--vscode-panel-border)' }}>
                                <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, opacity: 0.8 }}>Вложенные элементы:</div>
                                {struct.nestedFromGroupItems.map((nested: any, idx: number) => (
                                  <div key={idx} style={{ marginBottom: 12, padding: 8, border: '1px solid var(--vscode-panel-border)', borderRadius: 4, marginLeft: 16 }}>
                                    {nested.isChart ? (
                                      <>
                                        <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, opacity: 0.9 }}>
                                          📊 {nested.chartParams?.title || nested.chartParams?.chartType || 'Диаграмма'}
                                        </div>
                                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                                          Тип: {nested.chartParams?.chartType || 'не указан'}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, opacity: 0.9 }}>
                                          📁 {nested.groupDisplayLabel || 'Вложенная группировка'}
                                        </div>
                                        {nested.fields && nested.fields.length > 0 ? (
                                          <table className="edt-grid__table">
                                            <thead>
                                              <tr>
                                                <th style={{ width: '70%' }}>Поле группировки</th>
                                                <th style={{ width: '30%' }}>Тип</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {nested.fields.map((gf: any) => {
                                                const fieldNode = findChildNodeByLocalTag(gf.node, 'field');
                                                const groupTypeNode = findChildNodeByLocalTag(gf.node, 'groupType');
                                                return (
                                                  <tr key={gf.path}>
                                                    <td>
                                                      <input
                                                        className="edt-props-editor__input"
                                                        value={gf.field}
                                                        onChange={(e) => {
                                                          if (fieldNode) {
                                                            onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                                                          }
                                                        }}
                                                      />
                                                    </td>
                                                    <td>
                                                      <select
                                                        className="edt-props-editor__input"
                                                        value={gf.groupType}
                                                        onChange={(e) => {
                                                          if (groupTypeNode) {
                                                            onUpdateNode(groupTypeNode.path, (n) => ({ ...n, text: e.target.value }));
                                                          }
                                                        }}
                                                      >
                                                        <option value="Items">Элементы</option>
                                                        <option value="Hierarchy">Иерархия</option>
                                                        <option value="OnlyHierarchy">Только иерархия</option>
                                                      </select>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        ) : nested.isAutoMode ? (
                                          <div style={{ fontSize: 12, padding: 6, opacity: 0.85 }}>Авто (все поля из отбора)</div>
                                        ) : (
                                          <div className="dcs-empty" style={{ fontSize: 12, padding: 6 }}>Нет полей группировки</div>
                                        )}
                                        {nested.outputParams && nested.outputParams.length > 0 && nested.structNode && (
                                          <div style={{ marginTop: 8, fontSize: 11 }}>
                                            <div
                                              role="button"
                                              tabIndex={0}
                                              onClick={() => setGroupingOtherSettingsExpanded((prev) => ({ ...prev, [nested.path]: !(prev[nested.path] ?? true) }))}
                                              onKeyDown={(e) => e.key === 'Enter' && setGroupingOtherSettingsExpanded((prev) => ({ ...prev, [nested.path]: !(prev[nested.path] ?? true) }))}
                                              style={{ fontWeight: 'bold', marginBottom: 4, opacity: 0.8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                              <span style={{ transform: (groupingOtherSettingsExpanded[nested.path] ?? true) ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
                                              Другие настройки
                                            </div>
                                            {(groupingOtherSettingsExpanded[nested.path] ?? true) && (
                                              <table className="edt-grid__table" style={{ fontSize: 11 }}>
                                                <thead>
                                                  <tr>
                                                    <th style={{ width: 28, paddingRight: 4 }} title="Включить/выключить параметр" />
                                                    <th style={{ width: '42%' }}>Параметр</th>
                                                    <th style={{ width: '50%' }}>Значение</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {nested.outputParams.map((op: any, opIdx: number) => {
                                                    const paramDef = GROUPING_PARAM_MAP.get(op.parameter);
                                                    const options = paramDef?.options;
                                                    const paramLabel = paramDef?.label || op.parameter.replace(/([а-яa-z])([А-ЯA-Z])/g, '$1 $2');
                                                    const isChild = !!paramDef?.parentParameter;
                                                    const opUse = op.use !== undefined ? op.use : true;
                                                    const handleValueChange = (newVal: string) => {
                                                      if (!nested.structNode) return;
                                                      const opUse = op.use !== undefined ? op.use : true;
                                                      onUpdateNode(nested.structNode.path, (n) => upsertOutputParameter(n, op.parameter, newVal, opUse));
                                                    };
                                                    const handleUseChange = (checked: boolean) => {
                                                      if (!nested.structNode) return;
                                                      if (op.node) {
                                                        onUpdateNode(nested.structNode.path, (n) => setOutputParameterUse(n, op.parameter, checked));
                                                      } else if (checked) {
                                                        onUpdateNode(nested.structNode.path, (n) => upsertOutputParameter(n, op.parameter, '', true));
                                                      }
                                                    };
                                                    return (
                                                      <tr key={opIdx}>
                                                        <td style={{ paddingRight: 4, verticalAlign: 'middle' }}>
                                                          <input
                                                            type="checkbox"
                                                            checked={opUse}
                                                            onChange={(e) => handleUseChange(e.target.checked)}
                                                            title={opUse ? 'Параметр включён' : 'Параметр выключен'}
                                                          />
                                                        </td>
                                                        <td style={{ opacity: opUse ? 0.9 : 0.5, paddingLeft: isChild ? 24 : undefined }}>{paramLabel}</td>
                                                        <td>
                                                          {options ? (
                                                            <select
                                                              className="edt-props-editor__input"
                                                              style={{ fontSize: 11 }}
                                                              value={op.value}
                                                              onChange={(e) => handleValueChange(e.target.value)}
                                                              disabled={!opUse}
                                                            >
                                                              <option value="">—</option>
                                                              {options.map((opt: { value: string; label: string }) => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                              ))}
                                                            </select>
                                                          ) : (
                                                            <input
                                                              className="edt-props-editor__input"
                                                              style={{ fontSize: 11 }}
                                                              value={op.value}
                                                              onChange={(e) => handleValueChange(e.target.value)}
                                                              placeholder="—"
                                                              disabled={!opUse}
                                                            />
                                                          )}
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            )}
                                          </div>
                                        )}
                                        {/* Рекурсивно отображаем еще более вложенные группировки и диаграммы */}
                                        {nested.nested && nested.nested.length > 0 && nested.nested.map((nn: any, nnIdx: number) => (
                                          <div key={nnIdx} style={{ marginTop: 8, padding: 6, border: '1px solid var(--vscode-panel-border)', borderRadius: 4, marginLeft: 16 }}>
                                            {nn.isChart ? (
                                              <>
                                                <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4, opacity: 0.8 }}>
                                                  📊 {nn.chartParams?.title || nn.chartParams?.chartType || 'Диаграмма'}
                                                </div>
                                                <div style={{ fontSize: 10, opacity: 0.6 }}>
                                                  Тип: {nn.chartParams?.chartType || 'не указан'}
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4, opacity: 0.8 }}>📁 Вложенная группировка (уровень 2)</div>
                                                {nn.fields && nn.fields.length > 0 && (
                                                  <table className="edt-grid__table">
                                                    <tbody>
                                                      {nn.fields.map((gf: any) => {
                                                        const fieldNode = findChildNodeByLocalTag(gf.node, 'field');
                                                        return (
                                                          <tr key={gf.path}>
                                                            <td>
                                                              <input
                                                                className="edt-props-editor__input"
                                                                value={gf.field}
                                                                onChange={(e) => {
                                                                  if (fieldNode) {
                                                                    onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                                                                  }
                                                                }}
                                                              />
                                                            </td>
                                                          </tr>
                                                        );
                                                      })}
                                                    </tbody>
                                                  </table>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        ))}
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                  Группировки определяют структуру отчета. Могут быть простыми (Group), табличными (Table) с колонками и строками, или диаграммами (Chart).
                </div>
              </div>
            )}

            {activeSettingsTab === 'other' && (
              <div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                  Расширенное представление всех узлов settings. Используйте для редактирования structure, conditionalAppearance и других настроек.
                </div>
                <div style={{ border: '1px solid var(--vscode-panel-border)', borderRadius: 3, padding: 8, maxHeight: 400, overflow: 'auto', fontSize: 11, fontFamily: 'monospace' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(settingsRoot, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const DcsEditorApp: React.FC<{ vscode: any }> = ({ vscode }) => {
  const [report, setReport] = useState<ParsedReportDcs | null>(null);
  const [metadata, setMetadata] = useState<{ registers: string[]; referenceTypes: string[] }>({ registers: [], referenceTypes: [] });
  const [metadataTree, setMetadataTree] = useState<QueryMetadataNode | null>(null);
  const [treeQuery, setTreeQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [dcsTab, setDcsTab] = useState<DcsTabId>('datasets');
  const [schemaChildren, setSchemaChildren] = useState<DcsNode[]>([]);
  const [originalSchema, setOriginalSchema] = useState<{ _originalXml: string; _raw?: any; _rootAttrs?: Record<string, any> } | null>(null);
  const [selectedDatasetKey, setSelectedDatasetKey] = useState<string>('');
  const [selectedParameterKey, setSelectedParameterKey] = useState<string>('');
  const [selectedLinkKey, setSelectedLinkKey] = useState<string>('');
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>('');
  const [selectedCalcKey, setSelectedCalcKey] = useState<string>('');
  const [selectedResourceKey, setSelectedResourceKey] = useState<string>('');
  const [isQueryEditorOpen, setIsQueryEditorOpen] = useState(false);
  const [queryBeingEdited, setQueryBeingEdited] = useState({ dataSetPath: '', queryText: '' });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as Partial<DcsEditorInitMessage>;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'dcsEditorInit') {
        const payload = msg.payload as ParsedReportDcs;
        const md = msg.metadata;
        if (md) {
          setMetadata({
            registers: Array.isArray(md.registers) ? md.registers : [],
            referenceTypes: Array.isArray(md.referenceTypes) ? md.referenceTypes : [],
          });
        }

        const mt = (msg as any).metadataTree as QueryMetadataNode | null | undefined;
        if (mt && typeof mt === 'object') {
          setMetadataTree(mt);
          setQueryMetadataCompletionTree(mt as any);
        } else {
          setMetadataTree(null);
          setQueryMetadataCompletionTree(null);
        }

        setReport(payload);
        const children = Array.isArray(payload?.schema?.children) ? payload.schema.children : [];
        setSchemaChildren(children);

        // ВАЖНО: _raw больше не отправляется из extension (циклические ссылки DOM)
        // Проверяем только _originalXml
        if (payload?.schema?._originalXml) {
          setOriginalSchema({
            _originalXml: payload.schema._originalXml,
            _raw: null, // Не используется, DOM хранится на стороне extension
            _rootAttrs: payload.schema._rootAttrs
          });
        } else {
          setOriginalSchema(null);
        }

        // По умолчанию на вкладке «Наборы данных» выбираем первый dataSet (а не первый узел корня, который часто dataSource).
        const firstDataSetPath = findFirstPathByLocalTag(children, 'dataSet');
        const fallbackPath = children.length > 0 ? '0' : '';
        setSelectedPath(firstDataSetPath || fallbackPath);
        setSelectedDatasetKey(firstDataSetPath || fallbackPath);
        setSelectedFieldKey('');

        setDcsTab('datasets');
        return;
      }

      if (msg.type === 'metadataTreeReady') {
        const mt = (msg as any).metadataTree as QueryMetadataNode | null | undefined;
        if (mt && typeof mt === 'object') {
          setMetadataTree(mt);
          setQueryMetadataCompletionTree(mt as any);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Fallback: если редактор запроса открыт, а дерево не пришло — запрашиваем
  useEffect(() => {
    if (!isQueryEditorOpen || metadataTree) return;
    const id = window.setTimeout(() => {
      vscode.postMessage({ type: 'requestMetadataTree' });
    }, 300);
    return () => window.clearTimeout(id);
  }, [isQueryEditorOpen, metadataTree, vscode]);

  const selectedNode = useMemo(() => getNodeAtPath(schemaChildren, selectedPath), [schemaChildren, selectedPath]);

  const datasets = useMemo(() => {
    return schemaChildren
      .filter((node) => localTag(node.tag) === 'dataSet')
      .map((node) => {
        const name = getChildTextByLocalTag(node, 'name') || getNodeLabel(node);
        const dsType = String((node.attrs as any)?.['@_xsi:type'] || '').trim();
        return { key: node.path, nodePath: node.path, title: name, subtitle: dsType ? dsType : undefined } as DcsListRow;
      });
  }, [schemaChildren]);

  const settingsVariants = useMemo(() => {
    const variants = schemaChildren
      .filter((node) => localTag(node.tag) === 'settingsVariant')
      .map((node) => {
        const name = getChildTextByLocalTag(node, 'name') || getNodeLabel(node);
        const pres = getChildTextByLocalTag(node, 'dcsset:presentation') || getChildTextByLocalTag(node, 'presentation');
        return { key: node.path, nodePath: node.path, title: name, subtitle: pres ? pres : undefined } as DcsListRow;
      });
    
    // Если нет вариантов, создаем виртуальный элемент "Настройки схемы"
    if (variants.length === 0 && schemaChildren.length > 0) {
      return [{ key: '__schema__', nodePath: '__schema__', title: 'Настройки схемы (defaultSettings)', subtitle: undefined } as DcsListRow];
    }
    
    return variants;
  }, [schemaChildren]);

  const parameters = useMemo(() => {
    // Важно: показываем параметры схемы (только верхний уровень DataCompositionSchema/parameter).
    return schemaChildren
      .filter((node) => localTag(node.tag) === 'parameter' && !!findChildNodeByLocalTag(node, 'name'))
      .map((node) => {
        const name = getChildTextByLocalTag(node, 'name') || getNodeLabel(node);
        const title = getLocalStringTitle(node);
        const typeText = getFirstTypeFromValueType(node);
        return {
          key: node.path,
          nodePath: node.path,
          title: title ? title : name,
          subtitle: typeText ? typeText : undefined,
        } as DcsListRow;
      });
  }, [schemaChildren]);

  const dataSetLinks = useMemo(() => {
    // Связи наборов данных в 1С СКД встречаются как <dataSetLink>
    // Пример: Reports/Договорники/.../Template.xml
    return schemaChildren
      .filter((node) => localTag(node.tag) === 'dataSetLink')
      .map((node) => {
        const src = getChildTextByLocalTag(node, 'sourceDataSet');
        const dst = getChildTextByLocalTag(node, 'destinationDataSet');
        const srcExpr = getChildTextByLocalTag(node, 'sourceExpression');
        const dstExpr = getChildTextByLocalTag(node, 'destinationExpression');
        const cond = getChildTextByLocalTag(node, 'linkConditionExpression');
        const title = [src, dst].filter(Boolean).join(' → ');
        const subtitle = cond || [srcExpr, dstExpr].filter(Boolean).join(' = ');
        return {
          key: node.path,
          nodePath: node.path,
          title: title ? title : getNodeLabel(node),
          subtitle: subtitle ? subtitle : undefined,
        } as DcsListRow;
      });
  }, [schemaChildren]);

  const calculatedFields = useMemo(() => {
    return schemaChildren
      .filter((node) => localTag(node.tag) === 'calculatedField')
      .map((node) => {
        const dp = getChildTextByLocalTag(node, 'dataPath');
        const title = getLocalStringTitle(node);
        return { key: node.path, nodePath: node.path, title: title || dp || 'calculatedField' } as DcsListRow;
      });
  }, [schemaChildren]);

  const resources = useMemo(() => {
    return schemaChildren
      .filter((node) => localTag(node.tag) === 'totalField')
      .map((node) => {
        const dp = getChildTextByLocalTag(node, 'dataPath');
        return { key: node.path, nodePath: node.path, title: dp || 'totalField' } as DcsListRow;
      });
  }, [schemaChildren]);

  const onSelectNodePath = useCallback((p: string) => {
    setSelectedPath(p);
  }, []);

  const onChangeNodeTextAtPath = useCallback((nodePath: string, value: string) => {
    if (!nodePath) return;
    setSchemaChildren((prev) => updateNodeAtPath(prev, nodePath, (n) => ({ ...n, text: value })));
  }, []);

  const onUpdateNodeAtPath = useCallback((nodePath: string, updater: (n: DcsNode) => DcsNode) => {
    if (!nodePath) return;
    setSchemaChildren((prev) => updateNodeAtPath(prev, nodePath, updater));
  }, []);

  // Для структурных правок (добавление/удаление узлов) нужно пересчитать path у дерева.
  const onUpdateNodeAtPathReindex = useCallback((nodePath: string, updater: (n: DcsNode) => DcsNode) => {
    if (!nodePath) return;
    setSchemaChildren((prev) => reindexPaths(updateNodeAtPath(prev, nodePath, updater)));
  }, []);

  const handleSave = useCallback(() => {
    if (!vscode || !originalSchema || !report) return;

    vscode.postMessage({
      type: 'saveDcs',
      payload: {
        schemaChildren,
        _originalXml: originalSchema._originalXml,
        // _raw НЕ отправляем - DOM хранится на стороне extension
        _rootAttrs: originalSchema._rootAttrs,
        reportPath: report.reportPath,
        templatePath: report.templatePath,
        rootTag: report.schema?.rootTag || 'DataCompositionSchema',
        templateName: report.templateName,
      },
    });
  }, [vscode, originalSchema, report, schemaChildren]);

  const handleChangeDataSetQuery = useCallback((dataSetPath: string, nextQuery: string) => {
    setSchemaChildren((prev) => {
      const next = updateNodeAtPath(prev, dataSetPath, (ds) => {
        // обновляем query
        let updated = upsertChildTextByLocalTag(ds, 'query', nextQuery);

        // ИСПРАВЛЕНО: СИНХРОНИЗИРУЕМ список полей с запросом (добавляем новые, удаляем отсутствующие)
        // extractFieldNamesFromQuery возвращает алиасы (часть после КАК), которые используются как имена полей
        const fieldNames = extractFieldNamesFromQuery(nextQuery);
        const fieldsWithAliases = extractFieldNamesWithAliases(nextQuery);
        
        // Создаем map: алиас (fieldName) -> алиас (для заголовка)
        // extractFieldNamesWithAliases возвращает { fieldName: алиас, alias: алиас } если есть КАК
        const aliasMap = new Map<string, string>();
        for (const f of fieldsWithAliases) {
          if (f.alias && f.fieldName) {
            // fieldName уже является алиасом (часть после КАК), alias тоже
            aliasMap.set(f.fieldName, f.alias);
          }
        }
        
        // Если не удалось извлечь поля из запроса (пользователь редактирует),
        // НЕ трогаем существующие поля
        if (fieldNames.length === 0) {
          return updated;
        }
        
        const existingFields = (updated.children || []).filter((c) => localTag(c.tag) === 'field');
        const existingByName = new Map<string, DcsNode>();
        for (const f of existingFields) {
          const n = getChildTextByLocalTag(f, 'field') || getChildTextByLocalTag(f, 'dataPath');
          if (n) existingByName.set(n, f);
        }
        
        // Строим НОВЫЙ список полей из извлеченных имен (которые являются алиасами)
        // Сохраняем свойства (title, role) для существующих полей
        const newFields: DcsNode[] = [];
        for (const name of fieldNames) {
          if (existingByName.has(name)) {
            // Поле уже было - копируем его со всеми свойствами (title, role, etc)
            // Обновляем заголовок, если есть алиас в запросе
            const existing = existingByName.get(name)!;
            const alias = aliasMap.get(name);
            if (alias) {
              // Обновляем заголовок поля из алиаса
              const updatedField = upsertLocalStringTitle(existing, alias);
              newFields.push(updatedField);
            } else {
              newFields.push(existing);
            }
          } else {
            // Новое поле - создаем
            // name - это уже алиас (часть после КАК), если был КАК в запросе
            const fieldChildren: DcsNode[] = [makeTextNode('dataPath', name), makeTextNode('field', name)];
            // Проверяем, был ли это алиас (извлеченный с помощью КАК)
            const fieldInfo = fieldsWithAliases.find(f => f.fieldName === name && f.alias);
            if (fieldInfo && fieldInfo.alias) {
              // Устанавливаем алиас как заголовок поля
              fieldChildren.push(makeLocalStringTitleNode(fieldInfo.alias));
            } else {
              // Если нет алиаса, используем имя поля как заголовок
              fieldChildren.push(makeLocalStringTitleNode(name));
            }
            newFields.push({
              path: '',
              tag: 'field',
              attrs: { '@_xsi:type': 'DataSetFieldField' },
              children: fieldChildren,
            });
          }
        }
        
        // Удаляем все старые поля и заменяем на новый список
        const otherChildren = (updated.children || []).filter((c) => localTag(c.tag) !== 'field');
        
        // Находим позицию для вставки полей (после <name>)
        const nameIdx = otherChildren.findIndex((c) => localTag(c.tag) === 'name');
        const insertIdx = nameIdx >= 0 ? nameIdx + 1 : 0;
        
        // Вставляем новый список полей
        const merged = [
          ...otherChildren.slice(0, insertIdx),
          ...newFields,
          ...otherChildren.slice(insertIdx)
        ];
        
        updated = { ...updated, children: merged };
        return updated;
      });
      return reindexPaths(next);
    });
    setSelectedFieldKey('');
  }, []);

  const handleAddLink = useCallback(() => {
    setSchemaChildren((prev) => {
      const dsNames = prev.filter((n) => localTag(n.tag) === 'dataSet').map((n) => getChildTextByLocalTag(n, 'name')).filter(Boolean);
      const src = dsNames[0] || '';
      const dst = dsNames[1] || dsNames[0] || '';
      const newNode: DcsNode = {
        path: '',
        tag: 'dataSetLink',
        attrs: {},
        children: [
          makeTextNode('sourceDataSet', src),
          makeTextNode('destinationDataSet', dst),
          makeTextNode('sourceExpression', ''),
          makeTextNode('destinationExpression', ''),
          makeTextNode('linkConditionExpression', ''),
        ],
      };
      const lastLinkIdx = (() => {
        let idx = -1;
        for (let i = 0; i < prev.length; i++) if (localTag(prev[i].tag) === 'dataSetLink') idx = i;
        return idx;
      })();
      const insertIdx = lastLinkIdx >= 0 ? lastLinkIdx + 1 : prev.length;
      const inserted = [...prev.slice(0, insertIdx), newNode, ...prev.slice(insertIdx)];
      const re = reindexPaths(inserted);
      const newPath = String(insertIdx);
      setSelectedPath(newPath);
      setSelectedLinkKey(newPath);
      return re;
    });
  }, []);

  const handleDeleteSelectedLink = useCallback(() => {
    setSchemaChildren((prev) => {
      const idx = Number(String((selectedLinkKey || selectedPath) || '').split('.')[0]);
      if (!Number.isFinite(idx) || idx < 0 || idx >= prev.length) return prev;
      const node = prev[idx];
      if (!node || localTag(node.tag) !== 'dataSetLink') return prev;
      const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
      const re = reindexPaths(next);
      const firstLink = findFirstPathByLocalTag(re, 'dataSetLink');
      setSelectedPath(firstLink);
      setSelectedLinkKey(firstLink);
      return re;
    });
  }, [selectedLinkKey, selectedPath]);

  const handleAddCalculatedField = useCallback(() => {
    setSchemaChildren((prev) => {
      const dataPath = `НовоеПоле${prev.filter((n) => localTag(n.tag) === 'calculatedField').length + 1}`;
      
      const newNode: DcsNode = {
        path: '',
        tag: 'calculatedField',
        attrs: {},
        children: [
          makeTextNode('dataPath', dataPath),
          makeTextNode('expression', ''),
          makeLocalStringTitleNode(''),
        ],
      };
      
      // Вычисляемое поле добавляется только на уровне схемы СКД, не в набор данных
      const lastIdx = (() => { let idx = -1; for (let i = 0; i < prev.length; i++) if (localTag(prev[i].tag) === 'calculatedField') idx = i; return idx; })();
      const insertIdx = lastIdx >= 0 ? lastIdx + 1 : prev.length;
      const inserted = [...prev.slice(0, insertIdx), newNode, ...prev.slice(insertIdx)];
      const re = reindexPaths(inserted);
      const newPath = String(insertIdx);
      setSelectedPath(newPath);
      setSelectedCalcKey(newPath);
      return re;
    });
  }, []);;

  const handleDeleteSelectedCalculatedField = useCallback(() => {
    setSchemaChildren((prev) => {
      const idx = Number(String((selectedCalcKey || selectedPath) || '').split('.')[0]);
      if (!Number.isFinite(idx) || idx < 0 || idx >= prev.length) return prev;
      const node = prev[idx];
      if (!node || localTag(node.tag) !== 'calculatedField') return prev;
      const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
      const re = reindexPaths(next);
      const first = findFirstPathByLocalTag(re, 'calculatedField');
      setSelectedPath(first);
      setSelectedCalcKey(first);
      return re;
    });
  }, [selectedCalcKey, selectedPath]);

  const handleAddResource = useCallback(() => {
    setSchemaChildren((prev) => {
      const newNode: DcsNode = {
        path: '',
        tag: 'totalField',
        attrs: {},
        children: [
          makeTextNode('dataPath', `НовыйРесурс${prev.filter((n) => localTag(n.tag) === 'totalField').length + 1}`),
          makeTextNode('expression', ''),
        ],
      };
      const lastIdx = (() => { let idx = -1; for (let i = 0; i < prev.length; i++) if (localTag(prev[i].tag) === 'totalField') idx = i; return idx; })();
      const insertIdx = lastIdx >= 0 ? lastIdx + 1 : prev.length;
      const inserted = [...prev.slice(0, insertIdx), newNode, ...prev.slice(insertIdx)];
      const re = reindexPaths(inserted);
      const newPath = String(insertIdx);
      setSelectedPath(newPath);
      setSelectedResourceKey(newPath);
      return re;
    });
  }, []);

  const handleDeleteSelectedResource = useCallback(() => {
    setSchemaChildren((prev) => {
      const idx = Number(String((selectedResourceKey || selectedPath) || '').split('.')[0]);
      if (!Number.isFinite(idx) || idx < 0 || idx >= prev.length) return prev;
      const node = prev[idx];
      if (!node || localTag(node.tag) !== 'totalField') return prev;
      const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
      const re = reindexPaths(next);
      const first = findFirstPathByLocalTag(re, 'totalField');
      setSelectedPath(first);
      setSelectedResourceKey(first);
      return re;
    });
  }, [selectedResourceKey, selectedPath]);

  // Коллбек для обновления calculatedField (без синхронизации с dataSet)
  // Вычисляемые поля находятся только на уровне схемы СКД, не в наборах данных
  const onUpdateCalculatedField = useCallback((calcFieldPath: string, updater: (n: DcsNode) => DcsNode) => {
    if (!calcFieldPath) return;
    
    setSchemaChildren((prev) => {
      const calcField = getNodeAtPath(prev, calcFieldPath);
      if (!calcField || localTag(calcField.tag) !== 'calculatedField') return prev;
      
      // Обновляем только calculatedField, без синхронизации с dataSet
      return updateNodeAtPath(prev, calcFieldPath, updater);
    });
  }, []);

  const handleAddDataSet = useCallback(() => {
    setSchemaChildren((prev) => {
      const nextName = `НовыйНаборДанных${prev.filter((n) => localTag(n.tag) === 'dataSet').length + 1}`;
      const newNode: DcsNode = {
        path: '',
        tag: 'dataSet',
        attrs: { '@_xsi:type': 'DataSetQuery' },
        children: [
          makeTextNode('name', nextName),
          makeTextNode('query', ''),
        ],
      };
      const lastDataSetIdx = (() => {
        let idx = -1;
        for (let i = 0; i < prev.length; i++) if (localTag(prev[i].tag) === 'dataSet') idx = i;
        return idx;
      })();
      const insertIdx = lastDataSetIdx >= 0 ? lastDataSetIdx + 1 : prev.length;
      const inserted = [...prev.slice(0, insertIdx), newNode, ...prev.slice(insertIdx)];
      const re = reindexPaths(inserted);
      const newPath = String(insertIdx);
      setSelectedPath(newPath);
      setSelectedDatasetKey(newPath);
      setSelectedFieldKey('');
      return re;
    });
  }, []);

  const handleDeleteSelectedDataSet = useCallback(() => {
    setSchemaChildren((prev) => {
      const node = getNodeAtPath(prev, selectedDatasetKey || selectedPath);
      if (!node || localTag(node.tag) !== 'dataSet') return prev;
      const dsName = getChildTextByLocalTag(node, 'name');
      const idx = Number(String((selectedDatasetKey || selectedPath) || '').split('.')[0]);
      if (!Number.isFinite(idx) || idx < 0 || idx >= prev.length) return prev;
      let next = prev.slice(0, idx).concat(prev.slice(idx + 1));
      // удаляем связи, которые ссылаются на удаленный набор данных
      if (dsName) {
        next = next.filter((n) => {
          if (localTag(n.tag) !== 'dataSetLink') return true;
          const src = getChildTextByLocalTag(n, 'sourceDataSet');
          const dst = getChildTextByLocalTag(n, 'destinationDataSet');
          return src !== dsName && dst !== dsName;
        });
      }
      const re = reindexPaths(next);
      const firstDs = findFirstPathByLocalTag(re, 'dataSet');
      setSelectedPath(firstDs);
      setSelectedDatasetKey(firstDs);
      setSelectedFieldKey('');
      return re;
    });
  }, [selectedDatasetKey, selectedPath]);

  const handleAddParameter = useCallback(() => {
    setSchemaChildren((prev) => {
      const existing = prev.filter((n) => localTag(n.tag) === 'parameter').length;
      const nextName = `НовыйПараметр${existing + 1}`;
      const newNode: DcsNode = {
        path: '',
        tag: 'parameter',
        attrs: {},
        children: [
          makeTextNode('name', nextName),
          makeLocalStringTitleNode(nextName),
          { path: '', tag: 'valueType', attrs: {}, children: [makeTextNode('v8:Type', 'xs:string')] },
          makeTextNode('useRestriction', 'false'),
          makeTextNode('use', 'Always'),
        ],
      };
      // вставим после последнего параметра, иначе в конец
      const lastParamIdx = (() => {
        let idx = -1;
        for (let i = 0; i < prev.length; i++) if (localTag(prev[i].tag) === 'parameter') idx = i;
        return idx;
      })();
      const insertIdx = lastParamIdx >= 0 ? lastParamIdx + 1 : prev.length;
      const inserted = [...prev.slice(0, insertIdx), newNode, ...prev.slice(insertIdx)];
      const re = reindexPaths(inserted);
      const newPath = String(insertIdx);
      setSelectedPath(newPath);
      setSelectedParameterKey(newPath);
      return re;
    });
  }, []);

  const handleDeleteSelectedParameter = useCallback(() => {
    setSchemaChildren((prev) => {
      const idx = Number(String((selectedParameterKey || selectedPath) || '').split('.')[0]);
      if (!Number.isFinite(idx) || idx < 0 || idx >= prev.length) return prev;
      const node = prev[idx];
      if (!node || localTag(node.tag) !== 'parameter') return prev;
      const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
      const re = reindexPaths(next);
      const firstParam = findFirstPathByLocalTag(re, 'parameter');
      setSelectedPath(firstParam);
      setSelectedParameterKey(firstParam);
      return re;
    });
  }, [selectedParameterKey, selectedPath]);

  const dcsTabs: Array<{ id: DcsTabId; label: string; count?: number }> = useMemo(() => {
    // Набор вкладок по конструктору СКД 1С:Предприятие (см. статью)
    // https://cors.su/eto-interesno/konstruktor-skd-v-1s/
    return [
      { id: 'datasets', label: 'Наборы данных', count: datasets.length },
      { id: 'links', label: 'Связи', count: dataSetLinks.length },
      { id: 'calcFields', label: 'Вычисляемые поля', count: calculatedFields.length },
      { id: 'resources', label: 'Ресурсы', count: resources.length },
      { id: 'parameters', label: 'Параметры', count: parameters.length },
      { id: 'layouts', label: 'Макеты' },
      { id: 'nested', label: 'Вложенные схемы' },
      { id: 'settings', label: 'Настройки', count: settingsVariants.length },
    ];
  }, [datasets.length, dataSetLinks.length, calculatedFields.length, resources.length, parameters.length, settingsVariants.length]);

  const leftTitle = useMemo(() => {
    switch (dcsTab) {
      case 'datasets': return 'Наборы данных';
      case 'links': return 'Связи наборов данных';
      case 'calcFields': return 'Вычисляемые поля';
      case 'resources': return 'Ресурсы';
      case 'parameters': return 'Параметры';
      case 'settings': return 'Варианты настроек';
      default: return 'Раздел';
    }
  }, [dcsTab]);

  const leftRows = useMemo(() => {
    switch (dcsTab) {
      case 'datasets': return datasets;
      case 'links': return dataSetLinks;
      case 'calcFields': return calculatedFields;
      case 'resources': return resources;
      case 'parameters': return parameters;
      case 'settings': return settingsVariants;
      default: return [];
    }
  }, [dcsTab, datasets, dataSetLinks, calculatedFields, resources, parameters, settingsVariants]);

  const nodeTitle = selectedNode ? getNodeLabel(selectedNode) : '—';

  if (!report) {
    return (
      <div className="edt-form-editor">
        <div className="form-preview__empty">Загрузка схемы компоновки данных…</div>
      </div>
    );
  }

  return (
    <div className="edt-form-editor">
      <div className="edt-header">
        <div className="edt-header__title">Редактор СКД (MVP)</div>
        <div className="edt-header__sub">
          <span title={report.reportPath}>Отчет: {report.reportName}</span>
          <span className="edt-header__sep">•</span>
          <span title={report.templatePath}>Шаблон: {report.templateName}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="edt-icon-btn"
            title={originalSchema ? 'Сохранить изменения в XML' : 'Исходный XML не загружен'}
            onClick={handleSave}
            disabled={!originalSchema}
            style={{ width: 'auto', padding: '0 10px' }}
          >
            Сохранить
          </button>
        </div>
      </div>

      <div className="dcs-top-tabs">
        {dcsTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`dcs-top-tab ${dcsTab === t.id ? 'is-active' : ''}`}
            onClick={() => {
              setDcsTab(t.id);
              // при переключении на разделы с линейным списком — выбираем первый элемент
              if (t.id === 'datasets' && datasets.length > 0) {
                setSelectedPath(datasets[0].nodePath || datasets[0].key);
                setSelectedDatasetKey(datasets[0].key);
                setSelectedFieldKey('');
              }
              if (t.id === 'links' && dataSetLinks.length > 0) {
                setSelectedPath(dataSetLinks[0].nodePath || dataSetLinks[0].key);
                setSelectedLinkKey(dataSetLinks[0].key);
              }
              if (t.id === 'calcFields') {
                if (calculatedFields.length > 0) {
                  setSelectedPath(calculatedFields[0].nodePath || calculatedFields[0].key);
                  setSelectedCalcKey(calculatedFields[0].key);
                } else {
                  setSelectedCalcKey('');
                  setSelectedPath('');
                }
              }
              if (t.id === 'resources') {
                if (resources.length > 0) {
                  setSelectedPath(resources[0].nodePath || resources[0].key);
                  setSelectedResourceKey(resources[0].key);
                } else {
                  setSelectedResourceKey('');
                  setSelectedPath('');
                }
              }
              if (t.id === 'parameters' && parameters.length > 0) {
                setSelectedPath(parameters[0].nodePath || parameters[0].key);
                setSelectedParameterKey(parameters[0].key);
              }
              if (t.id === 'settings' && settingsVariants.length > 0) {
                setSelectedPath(settingsVariants[0].nodePath || settingsVariants[0].key);
              }
            }}
          >
            {t.label}{typeof t.count === 'number' ? <span className="dcs-top-tab__count">{t.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="edt-layout edt-top">
        <div className="edt-pane edt-pane--left">
          <div className="edt-tabs">
            <button className="edt-tab is-active" type="button">{leftTitle}</button>
          </div>
          <div className="edt-toolbar">
            {dcsTab === 'datasets' ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="edt-icon-btn" title="Добавить набор данных" onClick={handleAddDataSet}>+</button>
                <button type="button" className="edt-icon-btn" title="Удалить выбранный набор данных" onClick={handleDeleteSelectedDataSet} disabled={!selectedDatasetKey}>×</button>
              </div>
            ) : null}
            {dcsTab === 'links' ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="edt-icon-btn" title="Добавить связь" onClick={handleAddLink}>+</button>
                <button type="button" className="edt-icon-btn" title="Удалить выбранную связь" onClick={handleDeleteSelectedLink} disabled={!selectedLinkKey}>×</button>
              </div>
            ) : null}
            {dcsTab === 'calcFields' ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="edt-icon-btn" title="Добавить вычисляемое поле" onClick={handleAddCalculatedField}>+</button>
                <button type="button" className="edt-icon-btn" title="Удалить выбранное вычисляемое поле" onClick={handleDeleteSelectedCalculatedField} disabled={!selectedCalcKey}>×</button>
              </div>
            ) : null}
            {dcsTab === 'resources' ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="edt-icon-btn" title="Добавить ресурс" onClick={handleAddResource}>+</button>
                <button type="button" className="edt-icon-btn" title="Удалить выбранный ресурс" onClick={handleDeleteSelectedResource} disabled={!selectedResourceKey}>×</button>
              </div>
            ) : null}
            {dcsTab === 'parameters' ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="edt-icon-btn" title="Добавить параметр" onClick={handleAddParameter}>+</button>
                <button type="button" className="edt-icon-btn" title="Удалить выбранный параметр" onClick={handleDeleteSelectedParameter} disabled={!selectedParameterKey}>×</button>
              </div>
            ) : null}
            <input
              className="edt-search"
              value={treeQuery}
              onChange={(e) => setTreeQuery(e.target.value)}
              placeholder="Поиск…"
            />
          </div>
          <div className="edt-pane__content">
            <DcsList
              rows={leftRows.filter((r) => normalizeTextForSearch(r.title + ' ' + (r.subtitle || '')).includes(normalizeTextForSearch(treeQuery)))}
              selectedKey={
                dcsTab === 'datasets'
                  ? selectedDatasetKey
                  : dcsTab === 'parameters'
                    ? selectedParameterKey
                    : dcsTab === 'links'
                      ? selectedLinkKey
                      : selectedPath
              }
              onSelect={(key) => {
                const row = leftRows.find((r) => r.key === key);
                const p = row?.nodePath || key;
                onSelectNodePath(p);
                if (dcsTab === 'datasets') {
                  setSelectedDatasetKey(key);
                  setSelectedFieldKey('');
                }
                if (dcsTab === 'links') setSelectedLinkKey(key);
                if (dcsTab === 'calcFields') setSelectedCalcKey(key);
                if (dcsTab === 'resources') setSelectedResourceKey(key);
                if (dcsTab === 'parameters') setSelectedParameterKey(key);
              }}
            />
          </div>
        </div>

        <div className="edt-pane edt-pane--right">
          <div className="edt-toolbar">
            <div style={{ fontSize: 12, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nodeTitle}>
              {nodeTitle}
            </div>
          </div>

          <div className="edt-pane__content">
            <div className="dcs-detailsRoot">
              {dcsTab === 'datasets' ? (
                <DcsDatasetDetails
                  node={selectedNode}
                  metadata={metadata}
                  selectedFieldKey={selectedFieldKey}
                  onSelectFieldKey={setSelectedFieldKey}
                  onChangeDataSetQuery={handleChangeDataSetQuery}
                  onUpdateNode={onUpdateNodeAtPath}
                  onOpenQueryEditor={(dataSetPath: string, queryText: string) => {
                    setQueryBeingEdited({ dataSetPath, queryText });
                    setIsQueryEditorOpen(true);
                  }}
                />
              ) : dcsTab === 'links' ? (
                dataSetLinks.length > 0 ? (
                  <DcsLinkDetails node={selectedNode} onChangeNodeText={onChangeNodeTextAtPath} onUpdateNode={onUpdateNodeAtPath} />
                ) : (
                  <div className="dcs-empty">Связи наборов данных не обнаружены в схеме.</div>
                )
              ) : dcsTab === 'calcFields' ? (
                calculatedFields.length > 0 ? (
                  <DcsCalculatedFieldDetails node={selectedNode} onUpdateNode={onUpdateCalculatedField} />
                ) : (
                  <div className="dcs-empty">Нет вычисляемых полей.</div>
                )
              ) : dcsTab === 'resources' ? (
                resources.length > 0 ? (
                  <DcsResourceDetails node={selectedNode} onUpdateNode={onUpdateNodeAtPath} />
                ) : (
                  <div className="dcs-empty">Нет ресурсов (totalField).</div>
                )
              ) : dcsTab === 'parameters' ? (
                <DcsParameterDetails node={selectedNode} onChangeNodeText={onChangeNodeTextAtPath} onUpdateNode={onUpdateNodeAtPath} metadata={metadata} />
              ) : dcsTab === 'settings' ? (
                settingsVariants.length > 0 ? (
                  <DcsSettingsVariantDetails node={selectedNode} onUpdateNode={onUpdateNodeAtPath} onUpdateNodeReindex={onUpdateNodeAtPathReindex} schemaChildren={schemaChildren} />
                ) : (
                  <div className="dcs-empty">Нет вариантов настроек.</div>
                )
              ) : (
                <div className="dcs-empty">MVP: раздел «{dcsTabs.find((t) => t.id === dcsTab)?.label}» будет добавлен следующим шагом.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно редактора запроса */}
      <QueryEditorEnhanced
        isOpen={isQueryEditorOpen}
        queryText={queryBeingEdited.queryText}
        rightPanel={metadataTree ? (
          <MetadataTreePanel tree={metadataTree} />
        ) : (
          <div className="dcs-metadata-tree-loading">Загрузка дерева метаданных…</div>
        )}
        onSave={(newQuery) => {
          handleChangeDataSetQuery(queryBeingEdited.dataSetPath, newQuery);
          setIsQueryEditorOpen(false);
        }}
        onCancel={() => setIsQueryEditorOpen(false)}
      />
    </div>
  );
};



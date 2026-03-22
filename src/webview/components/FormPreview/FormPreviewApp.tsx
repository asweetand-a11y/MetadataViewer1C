/**
 * FormPreviewApp
 *
 * EDT-подобный предпросмотр формы:
 * - Верхняя часть: дерево элементов + вкладки (Элементы/Командный интерфейс)
 * - Правая верхняя часть: вкладки (Реквизиты/Команды/Параметры)
 * - Нижняя часть: "Дизайнер" — визуализация структуры, приближенная к компоновке (Pages/Group/Table/Field)
 *
 * Важно: без редактирования/сохранения/drag&drop.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ParsedFormFull, FormAttribute, FormCommand, FormItem } from '../../../xmlParsers/formParser';

interface FormPreviewAppProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vscode: any;
}

type LeftTab = 'elements' | 'commandInterface';

type RightTab = 'attributes' | 'commands' | 'parameters';

/** Специальный путь для выбора самой формы (корень) в панели свойств. */
const FORM_ROOT_PATH = '__form__';

type TreeNode = {
  /** Путь в дереве вида "0.1.2" */
  path: string;
  item: FormItem;
  children: TreeNode[];
};

/**
 * Безопасно форматирует значение для отображения.
 */
import { TypeWidget } from '../../widgets/TypeWidget';
import { formatTypeForDisplay, extractTypeString } from '../../utils/typeUtils';
import { EditAttributeModal } from './modals/EditAttributeModal';
import { EditCommandModal } from './modals/EditCommandModal';
import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';

function formatValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getCommandCaptionFromItem(item: FormItem): string {
  if (!item) return 'Команда';
  const props = (item.properties || {}) as any;
  const cmdName =
    extractScalarText(props.CommandName) ||
    extractScalarText(props.Command) ||
    extractScalarText(props.CommandRef) ||
    '';
  if (cmdName) {
    return cmdName;
  }
  const fallback =
    getItemTitleFromProps(props) ||
    props?.Representation ||
    props?.Title ||
    item.name ||
    'Команда';
  return typeof fallback === 'string' ? fallback : formatValue(fallback);
}

/**
 * Для кнопки с ссылкой вида Form.Command.ИмяКоманды возвращает текст процедуры из Action соответствующей команды формы.
 * В типовых формах 1С нажатие часто обрабатывается через команду, без отдельного Event name="Click".
 */
function resolveActionProcedureFromButtonCommandRefs(
  props: Record<string, any> | undefined,
  commands: FormCommand[] | undefined
): string {
  if (!props || !commands?.length) return '';
  // Совместимость: старый баг convertRawFormItem дублировал поля — CommandName оказывался во вложенном properties
  let p: Record<string, any> = props;
  const inner = p.properties;
  if (
    inner &&
    typeof inner === 'object' &&
    !Array.isArray(inner) &&
    !extractScalarText(p.CommandName) &&
    extractScalarText(inner.CommandName)
  ) {
    p = inner as Record<string, any>;
  }
  const cmdRef =
    extractScalarText(p.CommandName) ||
    extractScalarText(p.Command) ||
    extractScalarText(p.CommandRef) ||
    '';
  const trimmed = cmdRef.trim();
  const m = trimmed.match(/^Form\.Command\.(.+)$/i);
  const shortName = m ? m[1].trim() : '';
  if (!shortName) return '';
  const cmd = commands.find((c) => c.name === shortName);
  if (!cmd?.properties) return '';
  return extractScalarText((cmd.properties as any).Action).trim();
}

/**
 * Иммутабельно обновляет элемент формы по пути вида "0.1.2".
 * Нужно для редактирования свойств в webview без потери ссылочной целостности React-состояния.
 */
function updateFormItemAtPath(form: ParsedFormFull, path: string, updater: (item: FormItem) => FormItem): ParsedFormFull {
  const idxs = String(path || '').split('.').map(s => Number(s)).filter(n => Number.isFinite(n));
  if (idxs.length === 0) return form;

  const rootItems = Array.isArray(form.childItems) ? form.childItems : [];
  const nextForm: ParsedFormFull = {
    ...form,
    childItems: [...rootItems],
  };

  let list: FormItem[] = nextForm.childItems;

  for (let depth = 0; depth < idxs.length; depth++) {
    const idx = idxs[depth];
    if (!Array.isArray(list) || idx < 0 || idx >= list.length) {
      return form;
    }

    const current = list[idx];
    const cloned: FormItem = {
      ...current,
      properties: { ...(current.properties || {}) },
      childItems: Array.isArray(current.childItems) ? [...current.childItems] : undefined,
    };

    if (depth === idxs.length - 1) {
      list[idx] = updater(cloned);
      return nextForm;
    }

    list[idx] = cloned;
    list = cloned.childItems || (cloned.childItems = []);
  }

  return nextForm;
}

/**
 * Применяет изменение одного свойства на FormItem.
 * Важно: синхронизируем name/id в корневых полях FormItem, чтобы дерево/дизайнер обновлялись ожидаемо.
 */
function applyItemPropertyUpdate(item: FormItem, key: string, value: any): FormItem {
  const props = item.properties || {};
  const next: FormItem = {
    ...item,
    properties: { ...props, [key]: value },
  };

  if (key === 'name') {
    next.name = value ? String(value) : '';
  }
  if (key === 'id') {
    next.id = value ? String(value) : '';
  }

  return next;
}


function updateCommandNameRefsInAny(value: any, oldCommandName: string, newCommandName: string): any {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value === oldCommandName ? newCommandName : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((v) => {
      const nv = updateCommandNameRefsInAny(v, oldCommandName, newCommandName);
      if (nv !== v) changed = true;
      return nv;
    });
    return changed ? next : value;
  }

  if (typeof value === 'object') {
    let changed = false;
    const next: any = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value as any)) {
      const nv = updateCommandNameRefsInAny(v, oldCommandName, newCommandName);
      if (nv !== v) changed = true;
      next[k] = nv;
    }
    return changed ? next : value;
  }

  return value;
}

function updateCommandNameRefsInItem(item: FormItem, oldCommandName: string, newCommandName: string): FormItem {
  const nextProps = updateCommandNameRefsInAny(item.properties || {}, oldCommandName, newCommandName);
  const nextChildren = Array.isArray(item.childItems)
    ? item.childItems.map((ch) => updateCommandNameRefsInItem(ch, oldCommandName, newCommandName))
    : undefined;

  const propsChanged = nextProps !== (item.properties || {});
  const childrenChanged =
    Array.isArray(item.childItems) && Array.isArray(nextChildren)
      ? nextChildren.some((c, i) => c !== item.childItems![i])
      : false;

  if (!propsChanged && !childrenChanged) return item;

  return {
    ...item,
    properties: nextProps,
    childItems: nextChildren,
  };
}

function updateCommandNameRefsInForm(form: ParsedFormFull, oldCommandName: string, newCommandName: string): ParsedFormFull {
  if (!oldCommandName || oldCommandName === newCommandName) return form;

  const items = Array.isArray(form.childItems) ? form.childItems : [];
  const nextItems = items.map((it) => updateCommandNameRefsInItem(it, oldCommandName, newCommandName));

  const changed = nextItems.some((it, i) => it !== items[i]);
  if (!changed) return form;

  return { ...form, childItems: nextItems };
}


type CommandUsage = {
  itemPath: string;
  itemType: string;
  itemName: string;
  propPath: string;
};

function findCommandNameUsagesInAny(value: any, target: string, propPath: string, out: CommandUsage[], ctx: Omit<CommandUsage, 'propPath'>, limit: number) {
  if (out.length >= limit) return;
  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    if (value === target) {
      out.push({ ...ctx, propPath });
    }
    return;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      findCommandNameUsagesInAny(value[i], target, `${propPath}[${i}]`, out, ctx, limit);
      if (out.length >= limit) return;
    }
    return;
  }

  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as any)) {
      findCommandNameUsagesInAny(v, target, propPath ? `${propPath}.${k}` : k, out, ctx, limit);
      if (out.length >= limit) return;
    }
  }
}

function findCommandNameUsagesInForm(form: ParsedFormFull, commandName: string, limit: number = 50): CommandUsage[] {
  if (!commandName) return [];

  const out: CommandUsage[] = [];

  const walk = (items: FormItem[] | undefined, basePath: string) => {
    if (!Array.isArray(items)) return;

    for (let i = 0; i < items.length; i++) {
      if (out.length >= limit) return;
      const item = items[i];
      const itemPath = basePath ? `${basePath}.${i}` : String(i);
      const itemType = item?.type || 'Unknown';
      const itemName = item?.name || extractTitle((item?.properties as any)?.Title) || '';

      const ctx = { itemPath, itemType, itemName };
      findCommandNameUsagesInAny(item?.properties || {}, commandName, 'properties', out, ctx, limit);

      walk(item?.childItems, itemPath);
    }
  };

  walk(form.childItems, '');
  return out;
}

/**
 * Строит дерево узлов для отображения (строго из childItems).
 */
function buildTree(items: FormItem[] | undefined, basePath = ''): TreeNode[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items.map((item, index) => {
    const path = basePath ? `${basePath}.${index}` : String(index);
    const children = buildTree(item.childItems, path);
    return { path, item, children };
  });
}

/**
 * Пытается получить короткий заголовок для узла.
 */
function getItemLabel(item: FormItem): string {
  const name = item.name || (item.properties as any)?.name;
  const id = item.id || (item.properties as any)?.id;

  const type = item.type || 'Unknown';
  const suffix = name ? ` ${String(name)}` : id ? ` #${String(id)}` : '';
  return `${type}${suffix}`;
}

/** Человекочитаемое название типа элемента для заголовка панели «Свойства». */
const ELEMENT_TYPE_LABELS: Record<string, string> = {
  InputField: 'Поле ввода',
  SelectField: 'Поле выбора',
  CheckboxField: 'Поле флажка',
  CheckBoxField: 'Поле флажка',
  LabelField: 'Поле надписи',
  Button: 'Кнопка',
  UsualGroup: 'Группа',
  ColumnGroup: 'Группа колонок',
  Table: 'Таблица',
  Form: 'Форма',
  LabelDecoration: 'Оформление надписи',
  PictureDecoration: 'Оформление картинки',
};

function getPropertiesPanelTitle(item: FormItem | null): string {
  if (!item) return 'Свойства';
  const type = item.type || '';
  return `Свойства: ${ELEMENT_TYPE_LABELS[type] || type || 'Элемент'}`;
}

function normalizeTextForSearch(s: string): string {
  return String(s || '').toLowerCase().trim();
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const q = normalizeTextForSearch(query);
  if (!q) return nodes;

  const match = (node: TreeNode): boolean => {
    const label = normalizeTextForSearch(getItemLabel(node.item));
    return label.includes(q);
  };

  const recur = (node: TreeNode): TreeNode | null => {
    const children = node.children.map(recur).filter(Boolean) as TreeNode[];
    if (match(node) || children.length > 0) {
      return { ...node, children };
    }
    return null;
  };

  return nodes.map(recur).filter(Boolean) as TreeNode[];
}

/**
 * =====================
 * Designer: Table columns
 * =====================
 */

function hasTruthy(value: any): boolean {
  return value !== undefined && value !== null && value !== false && value !== 'false' && value !== 'False';
}

function collectColumnsFromItem(item: FormItem, prefix: string): string[] {
  if (isPanelItemType(item.type)) return [];
  const t = getItemTitleFromProps(item.properties);
  const dp = getDataPath(item.properties);

  const showInHeader = (item.properties as any)?.ShowInHeader;
  const headerAllowed = showInHeader === undefined || showInHeader === true || showInHeader === 'true' || showInHeader === 'True';

  // ColumnGroup: разворачиваем embedded children (properties['0..'] чаще всего)
  if (item.type === 'ColumnGroup') {
    const embedded = getEmbeddedNumericChildren(item);
    if (embedded.length > 0) {
      const cols: string[] = [];
      for (const e of embedded) {
        const groupTitle = getItemTitleFromProps(e.properties) || e.name || '';
        const groupShow = (e.properties as any)?.ShowInHeader;
        const groupAllowed = groupShow === undefined || groupShow === true || groupShow === 'true' || groupShow === 'True';
        if (!groupAllowed) continue;

        const child = getVisualChildren(e);
        // Листовые колонки внутри группы
        const leafCols: string[] = [];
        for (const ch of child) {
          if (ch.type === 'InputField' || ch.type === 'LabelField' || ch.type === 'PictureField' || ch.type === 'TableField' || ch.type === 'CheckBoxField') {
            const chTitle = getItemTitleFromProps(ch.properties) || ch.name || deriveLabelFromDataPath(getDataPath(ch.properties)) || '';
            if (!chTitle) continue;
            leafCols.push(groupTitle ? `${groupTitle} / ${chTitle}` : chTitle);
          }
        }

        if (leafCols.length > 0) {
          cols.push(...leafCols);
        } else if (groupTitle) {
          cols.push(groupTitle);
        }
      }
      return cols;
    }
  }

  // Листовые элементы (колонки)
  if (item.type === 'InputField' || item.type === 'LabelField' || item.type === 'PictureField' || item.type === 'TableField' || item.type === 'CheckBoxField') {
    if (!headerAllowed && !t) return [];
    const colTitle = t || item.name || deriveLabelFromDataPath(dp) || '';
    if (!colTitle) return [];
    return [prefix ? `${prefix} / ${colTitle}` : colTitle];
  }

  // Прочие: если есть дети — пробуем рекурсивно
  const children = getVisualChildren(item);
  if (children.length > 0) {
    const cols: string[] = [];
    for (const ch of children) {
      if (isPanelItemType(ch.type)) continue;
      cols.push(...collectColumnsFromItem(ch, prefix));
    }
    return cols;
  }

  return [];
}

function uniqStable(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const k = String(v || '').trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/**
 * Вычисляет колонки таблицы по дочерним элементам Table:
 * - прямые InputField/LabelField/etc
 * - ColumnGroup (часто embedded в properties['0..'] с ShowInHeader/Title/ChildItems)
 */
function deriveTableColumns(table: FormItem): string[] {
  const cols: string[] = [];

  // Прямые дети (и embedded дети, если childItems отсутствуют)
  const children = getVisualChildren(table);
  for (const ch of children) {
    // Пропускаем добавки/панели, не являющиеся колонками
    if (
      ch.type === 'CommandBar' ||
      isPanelItemType(ch.type) ||
      ch.type === 'SearchStringAddition' ||
      ch.type === 'ViewStatusAddition'
    ) {
      continue;
    }
    cols.push(...collectColumnsFromItem(ch, ''));
  }

  return uniqStable(cols);
}
/**
 * Двухуровневая шапка: групповые колонки + leaf-колонки.
 */
function deriveTableColumnsStructured(table: FormItem): {
  ungrouped: string[];
  groups: Array<{ title: string; columns: string[] }>;
} {
  const ungrouped: string[] = [];
  const groups: Array<{ title: string; columns: string[] }> = [];

  const children = getVisualChildren(table);

  // Локальный helper для leaf-колонок
  const leafTitle = (it: FormItem): string => {
    const t = getItemTitleFromProps(it.properties);
    const dp = getDataPath(it.properties);
    return t || it.name || deriveLabelFromDataPath(dp) || '';
  };

  const collectLeafsWithPrefix = (it: FormItem, prefix: string): string[] => {
    if (!it) return [];

    if (it.type === 'InputField' || it.type === 'LabelField' || it.type === 'PictureField' || it.type === 'TableField' || it.type === 'CheckBoxField') {
      const t = leafTitle(it);
      return t ? [prefix ? `${prefix} / ${t}` : t] : [];
    }

    // nested ColumnGroup
    if (it.type === 'ColumnGroup') {
      const embedded = getEmbeddedNumericChildren(it);
      const entries = embedded.length > 0 ? embedded : getVisualChildren(it);
      const cols: string[] = [];
      for (const e of entries) {
        const gTitle = getItemTitleFromProps(e.properties) || e.name || '';
        const allowed = (e.properties as any)?.ShowInHeader;
        const ok = allowed === undefined || allowed === true || allowed === 'true' || allowed === 'True';
        if (!ok) continue;
        const ch = getVisualChildren(e);
        if (ch.length === 0) {
          if (gTitle) cols.push(prefix ? `${prefix} / ${gTitle}` : gTitle);
          continue;
        }
        for (const c of ch) {
          cols.push(...collectLeafsWithPrefix(c, gTitle ? (prefix ? `${prefix} / ${gTitle}` : gTitle) : prefix));
        }
      }
      return cols;
    }

    const ch = getVisualChildren(it);
    if (ch.length === 0) return [];

    const out: string[] = [];
    for (const c of ch) out.push(...collectLeafsWithPrefix(c, prefix));
    return out;
  };

  for (const ch of children) {
    if (ch.type === 'CommandBar' || isPanelItemType(ch.type)) continue;

    if (ch.type === 'ColumnGroup') {
      const embedded = getEmbeddedNumericChildren(ch);
      const entries = embedded.length > 0 ? embedded : getVisualChildren(ch);

      for (const e of entries) {
        const title = getItemTitleFromProps(e.properties) || e.name || '';
        const allowed = (e.properties as any)?.ShowInHeader;
        const ok = allowed === undefined || allowed === true || allowed === 'true' || allowed === 'True';
        if (!ok) continue;

        const cols = collectLeafsWithPrefix(e, title).map(s => s.replace(new RegExp('^' + title + '\\s*/\\s*'), ''));
        const cleanCols = uniqStable(cols);
        if (cleanCols.length > 0) {
          groups.push({ title: title || 'Группа', columns: cleanCols });
        } else if (title) {
          groups.push({ title, columns: [''] });
        }
      }

      continue;
    }

    // Прочие колонки → ungrouped
    const cols = collectLeafsWithPrefix(ch, '');
    if (cols.length > 0) ungrouped.push(...cols);
  }

  return {
    ungrouped: uniqStable(ungrouped),
    groups: groups.filter(g => g.title && g.columns.length > 0),
  };
}
/**
 * ============================
 * Designer: 3-level table header
 * ============================
 */

type TableHeadCell = {
  key: string;
  rowStart: number;
  rowSpan: number;
  colStart: number;
  colSpan: number;
  label: string;
  kind: 'group' | 'subgroup' | 'leaf' | 'spacer';
};

type TableHeadModel = {
  rowCount: number;
  colCount: number;
  cells: TableHeadCell[];
  leafTitles: string[];
};

type ColNode =
  | { kind: 'leaf'; title: string }
  | { kind: 'group'; title: string; children: ColNode[] };

function isShowInHeaderEnabled(value: any): boolean {
  return value === undefined || value === true || value === 'true' || value === 'True';
}

function getLeafTitle(it: FormItem): string {
  const t = getItemTitleFromProps(it.properties);
  const dp = getDataPath(it.properties);
  return t || it.name || deriveLabelFromDataPath(dp) || '';
}

function toLeafNodes(items: FormItem[], prefix: string): ColNode[] {
  const out: ColNode[] = [];
  for (const it of items) {
    if (!it) continue;
    if (it.type === 'CommandBar' || isPanelItemType(it.type)) continue;

    if (it.type === 'InputField' || it.type === 'LabelField' || it.type === 'PictureField' || it.type === 'TableField' || it.type === 'CheckBoxField') {
      const lt = getLeafTitle(it);
      const title = lt ? (prefix ? `${prefix} / ${lt}` : lt) : '';
      if (title) out.push({ kind: 'leaf', title });
      continue;
    }

    if (it.type === 'ColumnGroup') {
      const nodes = parseColumnGroupToNodes(it, 1);
      out.push(...nodes);
      continue;
    }

    // fallback: искать leaf внутри
    const ch = getVisualChildren(it);
    if (ch.length > 0) out.push(...toLeafNodes(ch, prefix));
  }
  return out;
}

function parseColumnGroupToNodes(colGroup: FormItem, groupLevel: 1 | 2): ColNode[] {
  // В 1C формы ColumnGroup часто embedded в properties['0..']
  const embedded = getEmbeddedNumericChildren(colGroup);
  const entries = embedded.length > 0 ? embedded : getVisualChildren(colGroup);

  const groups: ColNode[] = [];

  for (const entry of entries) {
    const groupTitle = getItemTitleFromProps(entry.properties) || entry.name || '';
    const allowed = isShowInHeaderEnabled((entry.properties as any)?.ShowInHeader);
    if (!allowed) continue;

    const children = getVisualChildren(entry);

    // На уровне 1 (верхняя группа) допускаем подгруппы, на уровне 2 — только leaf.
    if (groupLevel === 1) {
      const subGroups = children.filter(c => c.type === 'ColumnGroup');
      const leafLike = children.filter(c => c.type !== 'ColumnGroup');

      const childNodes: ColNode[] = [];

      // Сначала leaf-колонки напрямую под группой
      const directLeaf = toLeafNodes(leafLike, '');
      childNodes.push(...directLeaf);

      // Затем подгруппы
      for (const sg of subGroups) {
        const sgEmbedded = getEmbeddedNumericChildren(sg);
        const sgEntries = sgEmbedded.length > 0 ? sgEmbedded : getVisualChildren(sg);

        // Каждая embedded-запись внутри sg трактуется как подгруппа
        for (const sgEntry of sgEntries) {
          const sgTitle = getItemTitleFromProps(sgEntry.properties) || sgEntry.name || '';
          const sgAllowed = isShowInHeaderEnabled((sgEntry.properties as any)?.ShowInHeader);
          if (!sgAllowed) continue;

          const sgChildren = getVisualChildren(sgEntry);
          const sgLeaf = toLeafNodes(sgChildren, '');

          if (sgLeaf.length > 0) {
            childNodes.push({ kind: 'group', title: sgTitle || 'Подгруппа', children: sgLeaf });
          } else if (sgTitle) {
            childNodes.push({ kind: 'group', title: sgTitle, children: [{ kind: 'leaf', title: '' }] });
          }
        }
      }

      if (childNodes.length > 0) {
        groups.push({ kind: 'group', title: groupTitle || 'Группа', children: childNodes });
      } else if (groupTitle) {
        groups.push({ kind: 'group', title: groupTitle, children: [{ kind: 'leaf', title: '' }] });
      }
    } else {
      // groupLevel 2: коллапсируем всё в leaf
      const leafOrGroups = toLeafNodes(children, '');
      const finalLeaf = flattenColNodesToLeafNodes(leafOrGroups).length > 0
        ? flattenColNodesToLeafNodes(leafOrGroups)
        : [{ kind: 'leaf', title: '' } as ColNode];
      groups.push({ kind: 'group', title: groupTitle || 'Подгруппа', children: finalLeaf as ColNode[] });
    }
  }

  return groups;
}

function flattenLeafTitles(nodes: ColNode[]): string[] {
  const out: string[] = [];
  const walk = (n: ColNode) => {
    if (n.kind === 'leaf') {
      out.push(n.title);
      return;
    }
    for (const ch of n.children) walk(ch);
  };
  for (const n of nodes) walk(n);
  return out;
}

function countLeaves(n: ColNode): number {
  if (n.kind === 'leaf') return 1;
  let sum = 0;
  for (const ch of n.children) sum += countLeaves(ch);
  return Math.max(1, sum);
}

function buildTableHeadModel(table: FormItem): TableHeadModel {
  // rowCount зависит от глубины группировки:
  // - 0: только leaf -> 1 строка
  // - 1: Group -> leaf -> 2 строки
  // - 2: Group -> SubGroup -> leaf -> 3 строки
  const calcDepth = (n: ColNode): number => {
    if (n.kind === 'leaf') return 0;
    const childDepth = n.children.reduce((m, ch) => Math.max(m, calcDepth(ch)), 0);
    return 1 + childDepth;
  };

  const topNodes: ColNode[] = [];
  const children = getVisualChildren(table);

  for (const ch of children) {
    if (!ch) continue;
    if (ch.type === 'CommandBar' || isPanelItemType(ch.type)) continue;

    if (ch.type === 'ColumnGroup') {
      topNodes.push(...parseColumnGroupToNodes(ch, 1));
      continue;
    }

    if (ch.type === 'InputField' || ch.type === 'LabelField' || ch.type === 'PictureField' || ch.type === 'TableField' || ch.type === 'CheckBoxField') {
      const t = getLeafTitle(ch);
      if (t) topNodes.push({ kind: 'leaf', title: t });
      continue;
    }

    const leaf = toLeafNodes([ch], '');
    topNodes.push(...leaf);
  }

  const maxDepth = topNodes.reduce((m, n) => Math.max(m, calcDepth(n)), 0);
  const rowCount = maxDepth <= 0 ? 1 : (maxDepth === 1 ? 2 : 3);

  const cells: TableHeadCell[] = [];

  let colCursor = 1;

  const placeLeafCell = (label: string, rowStart: number, rowSpan: number, colStart: number, colSpan: number, kind: TableHeadCell['kind']) => {
    cells.push({
      key: `${rowStart}-${colStart}-${label}-${kind}`,
      rowStart,
      rowSpan,
      colStart,
      colSpan,
      label,
      kind,
    });
  };

  const placeSpacer = (rowStart: number, colStart: number, colSpan: number) => {
    cells.push({
      key: `${rowStart}-${colStart}-spacer-${colSpan}`,
      rowStart,
      rowSpan: 1,
      colStart,
      colSpan,
      label: '',
      kind: 'spacer',
    });
  };

  const renderNode = (n: ColNode) => {
    if (n.kind === 'leaf') {
      // Негруппированная колонка — rowspan = rowCount
      placeLeafCell(n.title, 1, rowCount, colCursor, 1, 'leaf');
      colCursor += 1;
      return;
    }

    // Group level 1
    const groupLeaves = countLeaves(n);
    const groupStart = colCursor;

    placeLeafCell(n.title, 1, 1, groupStart, groupLeaves, 'group');

    // Подгруппы (group children) и прямые leaf
    let hasSubgroups = false;
    for (const ch of n.children) {
      if (ch.kind === 'group') {
        hasSubgroups = true;
        break;
      }
    }

    if (rowCount === 2 || !hasSubgroups) {
      // 2-уровневая шапка: group(row1) + leaf(row2)
      for (const ch of n.children) {
        if (ch.kind === 'leaf') {
          placeLeafCell(ch.title, 2, 1, colCursor, 1, 'leaf');
          colCursor += 1;
        } else {
          const cnt = countLeaves(ch);
          placeLeafCell(ch.title, 2, 1, colCursor, cnt, 'subgroup');
          colCursor += cnt;
        }
      }
      return;
    }

    // 3-уровневая шапка: group(row1) + subgroup(row2) + leaf(row3)
    for (const ch of n.children) {
      if (ch.kind === 'leaf') {
        // Прямая колонка внутри группы: subgroup-spacer + leaf(row3)
        placeLeafCell('', 2, 1, colCursor, 1, 'spacer');
        placeLeafCell(ch.title, 3, 1, colCursor, 1, 'leaf');
        colCursor += 1;
        continue;
      }

      const subLeaves = countLeaves(ch);
      const subStart = colCursor;
      placeLeafCell(ch.title, 2, 1, subStart, subLeaves, 'subgroup');

      // leaf row
      if (ch.children.length === 0) {
        placeSpacer(3, subStart, subLeaves);
        colCursor += subLeaves;
        continue;
      }

      for (const leaf of ch.children) {
        if (leaf.kind === 'leaf') {
          placeLeafCell(leaf.title, 3, 1, colCursor, 1, 'leaf');
          colCursor += 1;
        } else {
          // если глубже — коллапс в spacer
          const cnt = countLeaves(leaf);
          placeSpacer(3, colCursor, cnt);
          colCursor += cnt;
        }
      }
    }
  };

  for (const n of topNodes) {
    renderNode(n);
  }

  const colCount = Math.max(colCursor - 1, 1);
  const leafTitles = flattenLeafTitles(topNodes).map(s => String(s || '').trim());

  // Если ничего не нашли — показываем 3 колонки-заглушки
  if (leafTitles.filter(Boolean).length === 0) {
    return {
      rowCount,
      colCount: 3,
      leafTitles: ['...', '...', '...'],
      cells: [
        { key: '1-1-...', rowStart: 1, rowSpan: Math.max(1, rowCount), colStart: 1, colSpan: 1, label: '...', kind: 'leaf' },
        { key: '1-2-...', rowStart: 1, rowSpan: Math.max(1, rowCount), colStart: 2, colSpan: 1, label: '...', kind: 'leaf' },
        { key: '1-3-...', rowStart: 1, rowSpan: Math.max(1, rowCount), colStart: 3, colSpan: 1, label: '...', kind: 'leaf' },
      ],
    };
  }

  return { rowCount, colCount, cells, leafTitles };
}
function flattenColNodesToLeafNodes(nodes: ColNode[], prefix: string = ''): ColNode[] {
  const out: ColNode[] = [];

  const walk = (n: ColNode, pfx: string) => {
    if (n.kind === 'leaf') {
      const t = String(n.title || '').trim();
      if (!t) {
        out.push({ kind: 'leaf', title: '' });
        return;
      }
      out.push({ kind: 'leaf', title: pfx ? `${pfx} / ${t}` : t });
      return;
    }

    const nextPrefix = n.title ? (pfx ? `${pfx} / ${n.title}` : n.title) : pfx;
    for (const ch of n.children) {
      walk(ch, nextPrefix);
    }
  };

  for (const n of nodes) {
    walk(n, prefix);
  }

  return out;
}
export const FormPreviewApp: React.FC<FormPreviewAppProps> = ({ vscode }) => {
  const [form, setForm] = useState<ParsedFormFull | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [metadata, setMetadata] = useState<{
    registers: string[];
    referenceTypes: string[];
    referenceTypeStructures?: Record<string, { attributes: Array<{ name: string; typeDisplay: string }>; tabularSections: Array<{ name: string; attributes: Array<{ name: string; typeDisplay: string }> }> }>;
  }>({ registers: [], referenceTypes: [] });
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [leftTab, setLeftTab] = useState<LeftTab>('elements');
  const [rightTab, setRightTab] = useState<RightTab>('attributes');
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState<boolean>(false);
  const [treeQuery, setTreeQuery] = useState<string>('');

  /** Ширина левой панели (Элементы) в % от ширины верхнего блока. min 20, max 60. */
  const [leftPaneWidthPercent, setLeftPaneWidthPercent] = useState(34);
  /** Высота нижней панели (Дизайнер) в % от высоты layout. min 15, max 75. */
  const [bottomPanelHeightPercent, setBottomPanelHeightPercent] = useState(47);
  const layoutRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);

  /** Обработка перетаскивания вертикального разделителя (левая/правая панель). */
  const handleVerticalResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startPercent = leftPaneWidthPercent;
    const MIN = 20;
    const MAX = 60;

    const onMove = (moveEvent: MouseEvent) => {
      const el = topRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / rect.width) * 100;
      const next = Math.min(MAX, Math.max(MIN, startPercent + deltaPercent));
      setLeftPaneWidthPercent(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('edt-resizing');
      setIsDraggingVertical(false);
    };
    document.body.classList.add('edt-resizing');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    setIsDraggingVertical(true);
  }, [leftPaneWidthPercent]);

  /** Обработка перетаскивания горизонтального разделителя (верх / Дизайнер). */
  const handleHorizontalResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startPercent = bottomPanelHeightPercent;
    const MIN = 15;
    const MAX = 75;

    const onMove = (moveEvent: MouseEvent) => {
      const el = layoutRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const deltaY = moveEvent.clientY - startY;
      const deltaPercent = -(deltaY / rect.height) * 100;
      const next = Math.min(MAX, Math.max(MIN, startPercent + deltaPercent));
      setBottomPanelHeightPercent(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('edt-resizing');
      setIsDraggingHorizontal(false);
    };
    document.body.classList.add('edt-resizing');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    setIsDraggingHorizontal(true);
  }, [bottomPanelHeightPercent]);

  // Реквизиты формы (таб "Реквизиты")
  const [selectedAttributeIndex, setSelectedAttributeIndex] = useState<number | null>(null);
  const [attributeModal, setAttributeModal] = useState<null | { mode: 'add' | 'edit'; index?: number }>(null);
  const [attrDraftName, setAttrDraftName] = useState<string>('');
  const [attrDraftUseAlways, setAttrDraftUseAlways] = useState<boolean>(false);
  const [attrDraftType, setAttrDraftType] = useState<any>(null);
  const [attrDraftColumns, setAttrDraftColumns] = useState<AttributeColumnDraft[]>([]);
  const [columnModal, setColumnModal] = useState<null | { mode: 'add' | 'edit'; index?: number }>(null);
  const [columnDraftName, setColumnDraftName] = useState<string>('');
  const [columnDraftTitle, setColumnDraftTitle] = useState<string>('');
  const [columnDraftType, setColumnDraftType] = useState<any>(null);
  const [confirmDeleteColumnIndex, setConfirmDeleteColumnIndex] = useState<number | null>(null);
  const [confirmDeleteAttrIndex, setConfirmDeleteAttrIndex] = useState<number | null>(null);

  const resetColumnEditors = () => {
    setAttrDraftColumns([]);
    setColumnModal(null);
    setColumnDraftName('');
    setColumnDraftTitle('');
    setColumnDraftType(null);
    setConfirmDeleteColumnIndex(null);
  };

  const closeAttributeModal = () => {
    setAttributeModal(null);
    resetColumnEditors();
  };

  // Команды формы (таб "Команды")
  const [selectedCommandIndex, setSelectedCommandIndex] = useState<number | null>(null);
  const [commandModal, setCommandModal] = useState<null | { mode: 'add' | 'edit'; index?: number }>(null);
  const [cmdDraftName, setCmdDraftName] = useState<string>('');
  const [cmdDraftTitle, setCmdDraftTitle] = useState<string>('');
  const [cmdDraftToolTip, setCmdDraftToolTip] = useState<string>('');
  const [cmdDraftModifiesSavedData, setCmdDraftModifiesSavedData] = useState<boolean>(false);
  const [confirmDeleteCmdIndex, setConfirmDeleteCmdIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      if (message.type === 'formPreviewInit') {
        const payload = message.payload as ParsedFormFull;
        const md = (message as any).metadata as {
          registers?: string[];
          referenceTypes?: string[];
          referenceTypeStructures?: Record<string, { attributes: Array<{ name: string; typeDisplay: string }>; tabularSections: Array<{ name: string; attributes: Array<{ name: string; typeDisplay: string }> }> }>;
        } | undefined;
        if (md) {
          setMetadata({
            registers: Array.isArray(md.registers) ? md.registers : [],
            referenceTypes: Array.isArray(md.referenceTypes) ? md.referenceTypes : [],
            referenceTypeStructures: md.referenceTypeStructures && typeof md.referenceTypeStructures === 'object' ? md.referenceTypeStructures : undefined,
          });
        }
        const normalized = attachPanelsToForm(payload);
        setForm(normalized);
        setIsDirty(false);
        const hasAny = Array.isArray(normalized?.childItems) && normalized.childItems.length > 0;
        setSelectedPath(hasAny ? '0' : '');
        setLeftTab('elements');
        setRightTab('attributes');
      }

      if (message.type === 'formPreviewSaved') {
        if ((message as any).success) {
          setIsDirty(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const setFormAndDirty = (
    updater: ParsedFormFull | null | ((prev: ParsedFormFull | null) => ParsedFormFull | null)
  ) => {
    setForm((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      if (next !== prev) setIsDirty(true);
      return next;
    });
  };

  const handleSave = () => {
    if (!form) return;
    vscode.postMessage({ type: 'saveForm', payload: form });
  };

  const tree = useMemo(() => buildTree(form?.childItems), [form]);
  const filteredTree = useMemo(() => filterTree(tree, treeQuery), [tree, treeQuery]);

  const selectedItem = useMemo((): FormItem | null => {
    if (!form) return null;
    if (selectedPath === FORM_ROOT_PATH) {
      return { type: 'Form', name: form.name, properties: form.properties || {} };
    }
    if (!selectedPath) return null;
    const idxs = selectedPath.split('.').map(s => Number(s));
    let current: FormItem | null = null;
    let list: FormItem[] | undefined = form.childItems;

    for (const idx of idxs) {
      if (!Array.isArray(list) || !Number.isFinite(idx) || idx < 0 || idx >= list.length) {
        return null;
      }
      current = list[idx];
      list = current?.childItems;
    }

    return current;
  }, [form, selectedPath]);

  const onSelect = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

  const attributesList = form?.attributes || [];
  const canManageAttributes = rightTab === 'attributes';
  const hasSelectedAttribute =
    selectedAttributeIndex !== null &&
    selectedAttributeIndex >= 0 &&
    selectedAttributeIndex < attributesList.length;

  const commandsList = form?.commands || [];
  const canManageCommands = rightTab === 'commands';
  const hasSelectedCommand =
    selectedCommandIndex !== null &&
    selectedCommandIndex >= 0 &&
    selectedCommandIndex < commandsList.length;

  const deleteCommandName = useMemo(() => {
    if (!form) return '';
    if (confirmDeleteCmdIndex === null) return '';
    const c = commandsList[confirmDeleteCmdIndex] as any;
    const fromProps = extractScalarText(c?.properties?.CommandName);
    if (fromProps) return fromProps;
    const n = String(c?.name || '').trim();
    return n ? `Form.Command.${n}` : '';
  }, [form, confirmDeleteCmdIndex, commandsList]);

  const deleteCommandUsages = useMemo(() => {
    if (!form) return [] as CommandUsage[];
    if (!deleteCommandName) return [] as CommandUsage[];
    return findCommandNameUsagesInForm(form, deleteCommandName, 50);
  }, [form, deleteCommandName]);
  const isValueTableAttr = isValueTableTypeValue(attrDraftType);

  // Обработчик сохранения атрибута
  const handleSaveAttribute = (data: { name: string; useAlways: boolean; type: any; columns?: AttributeColumnDraft[] }) => {
    const { name, useAlways, type, columns } = data;
    if (!name.trim() || !type) return;

    setFormAndDirty((prev) => {
      if (!prev) return prev;
      const attrs = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
      const formattedType = formatTypeForDisplay(type);
      const baseProperties = {
        ...(attributeModal?.mode === 'edit' && attributeModal.index !== undefined ? (attrs[attributeModal.index]?.properties || {}) : {}),
        Name: name,
        UseAlways: useAlways,
        Type: type,
      } as Record<string, any>;
      
      const isValueTable = isValueTableTypeValue(type);
      if (isValueTable && columns) {
        const serializedColumns = serializeAttributeColumns(columns);
        if (serializedColumns) {
          baseProperties.Columns = serializedColumns;
        } else {
          delete baseProperties.Columns;
        }
      } else {
        delete baseProperties.Columns;
      }

      const nextAttr: FormAttribute = {
        name,
        type,
        typeDisplay: formattedType,
        properties: baseProperties,
      };

      if (attributeModal?.mode === 'add') {
        attrs.push(nextAttr);
        setSelectedAttributeIndex(attrs.length - 1);
      } else {
        const idx = attributeModal?.index;
        if (typeof idx === 'number' && idx >= 0 && idx < attrs.length) {
          attrs[idx] = nextAttr;
          setSelectedAttributeIndex(idx);
        }
      }

      return { ...prev, attributes: attrs };
    });

    closeAttributeModal();
  };

  // Обработчик сохранения колонки
  const handleSaveColumn = (data: { name: string; title: string; type: any }) => {
    const { name, title, type } = data;
    if (!name.trim() || !type) return;

    setAttrDraftColumns((prev) => {
      const target =
        columnModal?.mode === 'edit' && typeof columnModal.index === 'number'
          ? prev[columnModal.index] || undefined
          : undefined;
      const baseRaw = target?.raw ? { ...target.raw } : {};
      const nextCol: AttributeColumnDraft = {
        ...(target || {}),
        raw: baseRaw,
        name,
        title: title.trim() || undefined,
        type,
      };
      const next = [...prev];
      if (columnModal?.mode === 'edit' && typeof columnModal.index === 'number' && columnModal.index >= 0 && columnModal.index < next.length) {
        next[columnModal.index] = nextCol;
      } else {
        next.push(nextCol);
      }
      return next;
    });
    setColumnModal(null);
    setColumnDraftName('');
    setColumnDraftTitle('');
    setColumnDraftType(null);
  };

  // Обработчик удаления колонки
  const handleDeleteColumn = (index: number) => {
    setAttrDraftColumns((prev) => prev.filter((_, i) => i !== index));
    setConfirmDeleteColumnIndex(null);
  };

  // Обработчик сохранения команды
  const handleSaveCommand = (data: { name: string; title: string; toolTip: string; modifiesSavedData: boolean }) => {
    const { name, title, toolTip, modifiesSavedData } = data;
    if (!name.trim()) return;

    setFormAndDirty((prev) => {
      if (!prev) return prev;
      const cmds = Array.isArray(prev.commands) ? [...prev.commands] : [];

      const toRuItem = (text: string) => {
        const t = String(text || '').trim();
        if (!t) return undefined;
        return { item: { lang: 'ru', content: t } };
      };

      const derivedCommandName = `Form.Command.${name}`;

      // Если редактируем существующую команду и меняем name — обновляем все ссылки CommandName по форме.
      const oldDerivedCommandName = (() => {
        if (commandModal?.mode !== 'edit') return '';
        const idx = commandModal.index;
        if (typeof idx !== 'number' || idx < 0 || idx >= cmds.length) return '';
        const base = cmds[idx];
        const baseProps = (base as any)?.properties || {};
        const fromProps = extractScalarText((baseProps as any).CommandName);
        if (fromProps) return fromProps;
        const baseName = String(base?.name || '').trim();
        return baseName ? `Form.Command.${baseName}` : '';
      })();

      if (commandModal?.mode === 'add') {
        const maxId = cmds.reduce((m, c) => {
          const n = Number((c as any)?.properties?.id);
          return Number.isFinite(n) ? Math.max(m, n) : m;
        }, 0);
        const id = String(maxId + 1);
        const nextCmd: FormCommand = {
          name,
          properties: {
            id,
            Title: toRuItem(title),
            ToolTip: toRuItem(toolTip),
            Action: name,
            CommandName: derivedCommandName,
            ModifiesSavedData: Boolean(modifiesSavedData),
          },
        };
        cmds.push(nextCmd);
        setSelectedCommandIndex(cmds.length - 1);
        return { ...prev, commands: cmds };
      }

      const idx = commandModal?.index;
      if (typeof idx !== 'number' || idx < 0 || idx >= cmds.length) return prev;
      const base = cmds[idx];
      const baseProps = (base as any)?.properties || {};
      const id = String(baseProps.id || '');

      const nextCmd: FormCommand = {
        name,
        properties: {
          ...baseProps,
          id,
          Title: toRuItem(title) ?? baseProps.Title,
          ToolTip: toRuItem(toolTip) ?? baseProps.ToolTip,
          Action: name,
          CommandName: derivedCommandName,
          ModifiesSavedData: Boolean(modifiesSavedData),
        },
      };

      cmds[idx] = nextCmd;
      setSelectedCommandIndex(idx);

      if (oldDerivedCommandName) {
        // Переименование/перепривязка команды
        return updateCommandNameRefsInForm(
          { ...prev, commands: cmds },
          oldDerivedCommandName,
          derivedCommandName
        );
      }

      return { ...prev, commands: cmds };
    });

    setCommandModal(null);
  };

  if (!form) {
    return (
      <div className="form-preview edt-form-editor">
        <div className="form-preview__empty">Загрузка формы…</div>
      </div>
      );
  }

  const title = (form.properties as any)?.Title ? String((form.properties as any).Title) : form.name || 'Форма';

  return (
    <div className="form-preview edt-form-editor">
      <div className="edt-header">
        <div className="edt-header__title">
          <div className="edt-header__name-row">
            <div className="edt-header__name">{title}</div>
            <button
              type="button"
              className="edt-header__props-btn"
              title="Свойства формы"
              aria-label="Свойства формы"
              onClick={() => {
                setSelectedPath(FORM_ROOT_PATH);
                setPropertiesPanelOpen(true);
              }}
            >
              Свойства
            </button>
          </div>
          {form.formType ? <div className="edt-header__meta">{form.formType}</div> : null}
        </div>
        <div className="edt-header__path" title={form.sourcePath}>{form.sourcePath}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="edt-icon-btn"
            title={isDirty ? 'Сохранить форму' : 'Нет несохранённых изменений'}
            onClick={handleSave}
            disabled={!isDirty}
            style={{ width: 'auto', padding: '0 10px' }}
          >
            Сохранить
          </button>
        </div>
      </div>

      <div ref={layoutRef} className="edt-layout">
        <div className="edt-layout__main">
        {/* Верхняя зона */}
        <div ref={topRef} className="edt-top">
          {/* Слева: дерево */}
          <div className="edt-pane edt-pane--left" style={{ width: `${leftPaneWidthPercent}%`, flexShrink: 0 }}>
            <PaneTabs
              tabs={[
                { id: 'elements', label: 'Элементы' },
                { id: 'commandInterface', label: 'Командный интерфейс' },
              ]}
              active={leftTab}
              onChange={setLeftTab}
            />

            {leftTab === 'elements' ? (
              <>
                <div className="edt-toolbar">
                  <input
                    className="edt-search"
                    placeholder="Поиск (Ctrl+F)"
                    value={treeQuery}
                    onChange={(e) => setTreeQuery(e.target.value)}
                  />
                </div>
                <div className="edt-pane__body">
                  <TreeView
                  nodes={filteredTree}
                  selectedPath={selectedPath}
                  onSelect={onSelect}
                  onPropertiesClick={(path) => {
                    onSelect(path);
                    setPropertiesPanelOpen(true);
                  }}
                />
                </div>
              </>
            ) : (
              <div className="edt-pane__body">
                <div className="form-preview__empty">
                  Командный интерфейс (MVP): будет добавлен после парсинга дерева команд.
                </div>
              </div>
            )}
          </div>

          <div
            className="edt-resizer edt-resizer--vertical"
            role="separator"
            aria-label="Изменить ширину панелей"
            onMouseDown={handleVerticalResizerMouseDown}
          />

          {/* Справа: реквизиты/команды/параметры */}
          <div className="edt-pane edt-pane--right" style={{ flex: 1, minWidth: 0 }}>
            <div className="edt-toolbar edt-toolbar--icons">
              <button
                type="button"
                className="edt-icon-btn"
                disabled={!(canManageAttributes || canManageCommands)}
                title={canManageCommands ? 'Добавить команду' : 'Добавить реквизит'}
                aria-label={canManageCommands ? 'Добавить команду' : 'Добавить реквизит'}
                onClick={() => {
                  if (canManageAttributes) {
                    setAttributeModal({ mode: 'add' });
                    setAttrDraftName('');
                    setAttrDraftUseAlways(false);
                    setAttrDraftType(null);
                    resetColumnEditors();
                    return;
                  }
                  if (canManageCommands) {
                    setCommandModal({ mode: 'add' });
                    setCmdDraftName('');
                    setCmdDraftTitle('');
                    setCmdDraftToolTip('');
                    setCmdDraftModifiesSavedData(false);
                  }
                }}
              >
                ＋
              </button>
              <button
                type="button"
                className="edt-icon-btn"
                disabled={
                  (canManageAttributes && !hasSelectedAttribute) ||
                  (canManageCommands && !hasSelectedCommand) ||
                  (!canManageAttributes && !canManageCommands)
                }
                title={canManageCommands ? 'Редактировать команду' : 'Редактировать реквизит'}
                aria-label={canManageCommands ? 'Редактировать команду' : 'Редактировать реквизит'}
                onClick={() => {
                  if (canManageAttributes) {
                    if (!hasSelectedAttribute || selectedAttributeIndex === null) return;
                    const a = attributesList[selectedAttributeIndex];
                    resetColumnEditors();
                    setAttributeModal({ mode: 'edit', index: selectedAttributeIndex });
                    setAttrDraftName(a?.name || '');
                    const useAlways = (a?.properties as any)?.UseAlways ?? (a?.properties as any)?.useAlways;
                    setAttrDraftUseAlways(Boolean(useAlways));
                    const rawType = (a?.properties as any)?.Type;
                    setAttrDraftType(rawType ?? (a as any)?.type ?? null);
                    setAttrDraftColumns(parseAttributeColumnDrafts(a));
                    return;
                  }
                  if (canManageCommands) {
                    if (!hasSelectedCommand || selectedCommandIndex === null) return;
                    const c = commandsList[selectedCommandIndex];
                    setCommandModal({ mode: 'edit', index: selectedCommandIndex });
                    setCmdDraftName(c?.name || '');
                    setCmdDraftTitle(extractTitle((c?.properties as any)?.Title));
                    setCmdDraftToolTip(extractTitle((c?.properties as any)?.ToolTip));
                    setCmdDraftModifiesSavedData(Boolean((c?.properties as any)?.ModifiesSavedData));
                  }
                }}
              >
                ✎
              </button>
              <button
                type="button"
                className="edt-icon-btn"
                disabled={
                  (canManageAttributes && !hasSelectedAttribute) ||
                  (canManageCommands && !hasSelectedCommand) ||
                  (!canManageAttributes && !canManageCommands)
                }
                title={canManageCommands ? 'Удалить команду' : 'Удалить реквизит'}
                aria-label={canManageCommands ? 'Удалить команду' : 'Удалить реквизит'}
                onClick={() => {
                  if (canManageAttributes) {
                    if (!hasSelectedAttribute || selectedAttributeIndex === null) return;
                    setConfirmDeleteAttrIndex(selectedAttributeIndex);
                    return;
                  }
                  if (canManageCommands) {
                    if (!hasSelectedCommand || selectedCommandIndex === null) return;
                    setConfirmDeleteCmdIndex(selectedCommandIndex);
                  }
                }}
              >
                ×
              </button>
            </div>

            <PaneTabs
              tabs={[
                { id: 'attributes', label: 'Реквизиты' },
                { id: 'commands', label: 'Команды' },
                { id: 'parameters', label: 'Параметры' },
              ]}
              active={rightTab}
              onChange={setRightTab}
            />

            <div className="edt-pane__body">
              {rightTab === 'attributes' ? (
                <AttributesGrid
                  attributes={attributesList}
                  selectedIndex={selectedAttributeIndex}
                  onSelectIndex={(idx) => setSelectedAttributeIndex(idx)}
                  referenceTypeStructures={metadata.referenceTypeStructures}
                />
              ) : rightTab === 'commands' ? (
                <CommandsGrid
                  commands={commandsList}
                  selectedIndex={selectedCommandIndex}
                  onSelectIndex={(idx) => setSelectedCommandIndex(idx)}
                />
              ) : (
                <div className="form-preview__empty">
                  Параметры (MVP): не парсятся из XML формы — добавим на следующем шаге.
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="edt-resizer edt-resizer--horizontal"
          role="separator"
          aria-label="Изменить высоту панели Дизайнер"
          onMouseDown={handleHorizontalResizerMouseDown}
        />

        {/* Нижняя зона: дизайнер */}
        <div className="edt-bottom" style={{ height: `${bottomPanelHeightPercent}%`, flexShrink: 0 }}>
          <div className="edt-bottom__title">Дизайнер</div>
          <div className="edt-bottom__canvas">
            {selectedItem ? (
              <div className="edt-bottom__hint">Выделено: <b>{getItemLabel(selectedItem)}</b></div>
            ) : null}
            <DesignerPreview items={form.childItems || []} selectedPath={selectedPath} onSelect={onSelect} />
          </div>
        </div>
        </div>

        {/* Панель «Свойства» — полноценная правая колонка на всю высоту */}
        {propertiesPanelOpen && (
          <div className="edt-properties-panel" style={{ width: 320, minWidth: 260, flexShrink: 0 }}>
            <PropertiesPanel
              item={selectedItem}
              commands={form.commands || []}
              title={getPropertiesPanelTitle(selectedItem)}
              onClose={() => setPropertiesPanelOpen(false)}
              onPropertyChange={(key, nextValue) => {
                if (!selectedPath) return;
                setFormAndDirty((prev) => {
                  if (!prev) return prev;
                  if (selectedPath === FORM_ROOT_PATH) {
                    return { ...prev, properties: { ...prev.properties, [key]: nextValue } };
                  }
                  return updateFormItemAtPath(prev, selectedPath, (it) => applyItemPropertyUpdate(it, key, nextValue));
                });
              }}
              onOpenModuleAtProcedure={(procedureName) => {
                (typeof vscode !== 'undefined' && vscode.postMessage) &&
                  vscode.postMessage({ type: 'openFormModuleAtProcedure', procedureName });
              }}
            />
          </div>
        )}
      </div>

      {/* Модалки для реквизитов */}
      <EditAttributeModal
        isOpen={!!attributeModal}
        mode={attributeModal?.mode || 'add'}
        name={attrDraftName}
        useAlways={attrDraftUseAlways}
        type={attrDraftType}
        columns={attrDraftColumns}
        isValueTable={isValueTableAttr}
        metadata={metadata}
        onClose={closeAttributeModal}
        onSave={handleSaveAttribute}
        onNameChange={setAttrDraftName}
        onUseAlwaysChange={setAttrDraftUseAlways}
        onTypeChange={setAttrDraftType}
        onColumnsChange={setAttrDraftColumns}
        columnModal={columnModal}
        columnDraftName={columnDraftName}
        columnDraftTitle={columnDraftTitle}
        columnDraftType={columnDraftType}
        onColumnModalChange={setColumnModal}
        onColumnDraftNameChange={setColumnDraftName}
        onColumnDraftTitleChange={setColumnDraftTitle}
        onColumnDraftTypeChange={setColumnDraftType}
        onColumnSave={handleSaveColumn}
        confirmDeleteColumnIndex={confirmDeleteColumnIndex}
        onConfirmDeleteColumnIndexChange={setConfirmDeleteColumnIndex}
        onDeleteColumn={handleDeleteColumn}
      />

      <ConfirmDeleteModal
        isOpen={confirmDeleteAttrIndex !== null}
        message={confirmDeleteAttrIndex !== null ? `Удалить реквизит "${attributesList[confirmDeleteAttrIndex]?.name || `Реквизит ${confirmDeleteAttrIndex + 1}`}"?` : ''}
        onConfirm={() => {
          const idx = confirmDeleteAttrIndex;
          if (idx === null) return;
          setFormAndDirty((prev) => {
            if (!prev) return prev;
            const attrs = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
            if (idx < 0 || idx >= attrs.length) return prev;
            attrs.splice(idx, 1);
            return { ...prev, attributes: attrs };
          });
          setSelectedAttributeIndex((prevSel) => {
            if (prevSel === null) return null;
            if (prevSel === idx) return null;
            if (prevSel > idx) return prevSel - 1;
            return prevSel;
          });
          setConfirmDeleteAttrIndex(null);
        }}
        onCancel={() => setConfirmDeleteAttrIndex(null)}
        width={480}
      />

      {/* Модалки для команд */}
      <EditCommandModal
        isOpen={!!commandModal}
        mode={commandModal?.mode || 'add'}
        name={cmdDraftName}
        title={cmdDraftTitle}
        toolTip={cmdDraftToolTip}
        modifiesSavedData={cmdDraftModifiesSavedData}
        onClose={() => setCommandModal(null)}
        onSave={handleSaveCommand}
        onNameChange={setCmdDraftName}
        onTitleChange={setCmdDraftTitle}
        onToolTipChange={setCmdDraftToolTip}
        onModifiesSavedDataChange={setCmdDraftModifiesSavedData}
      />

      <ConfirmDeleteModal
        isOpen={confirmDeleteCmdIndex !== null}
        message={confirmDeleteCmdIndex !== null ? `Удалить команду "${commandsList[confirmDeleteCmdIndex]?.name || `Команда ${confirmDeleteCmdIndex + 1}`}"?` : ''}
        warningInfo={deleteCommandUsages.length > 0 ? (
          <>
            {'\n\n'}
            ВНИМАНИЕ: команда используется в форме ({deleteCommandUsages.length}{deleteCommandUsages.length >= 50 ? '+' : ''} мест).
            {'\n\n'}
            Примеры:
            {deleteCommandUsages.slice(0, 12).map((u, i) => (
              `\n- [${u.itemPath}] ${u.itemType}${u.itemName ? ` ${u.itemName}` : ''} → ${u.propPath}`
            )).join('')}
          </>
        ) : undefined}
        onConfirm={() => {
          const idx = confirmDeleteCmdIndex;
          if (idx === null) return;
          setFormAndDirty((prev) => {
            if (!prev) return prev;
            const cmds = Array.isArray(prev.commands) ? [...prev.commands] : [];
            if (idx < 0 || idx >= cmds.length) return prev;
            const base = cmds[idx] as any;
            const baseProps = base?.properties || {};
            const oldCommandName = extractScalarText(baseProps.CommandName) || (base?.name ? `Form.Command.${String(base.name)}` : '');

            cmds.splice(idx, 1);

            // Удаление: чистим ссылки на удалённую команду (делаем пустыми)
            const nextForm = updateCommandNameRefsInForm(
              { ...prev, commands: cmds },
              oldCommandName,
              ''
            );

            return nextForm;
          });
          setSelectedCommandIndex((prevSel) => {
            if (prevSel === null) return null;
            if (prevSel === idx) return null;
            if (prevSel > idx) return prevSel - 1;
            return prevSel;
          });
          setConfirmDeleteCmdIndex(null);
        }}
        onCancel={() => setConfirmDeleteCmdIndex(null)}
        width={480}
      />
    </div>
  );
};

/**
 * Универсальные табы для панелей.
 */
const PaneTabs = <T extends string>(props: {
  tabs: Array<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
}) => {
  return (
    <div className="edt-tabs">
      {props.tabs.map(t => (
        <button
          key={t.id}
          type="button"
          className={`edt-tab ${props.active === t.id ? 'is-active' : ''}`}
          onClick={() => props.onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

/**
 * Дерево элементов формы.
 */
const TreeView: React.FC<{
  nodes: TreeNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
  onPropertiesClick?: (path: string) => void;
}> = ({ nodes, selectedPath, onSelect, onPropertiesClick }) => {
  if (!nodes || nodes.length === 0) {
    return <div className="form-preview__empty">Нет элементов (ChildItems)</div>;
  }

  return (
    <ul className="form-preview-tree edt-tree">
      {nodes.map(n => (
        <TreeNodeView
          key={n.path}
          node={n}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onPropertiesClick={onPropertiesClick}
        />
      ))}
    </ul>
  );
};

const TreeNodeView: React.FC<{
  node: TreeNode;
  selectedPath: string;
  onSelect: (path: string) => void;
  onPropertiesClick?: (path: string) => void;
}> = ({ node, selectedPath, onSelect, onPropertiesClick }) => {
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children.length > 0;
  const sequenceIconUrl =
    (typeof window !== 'undefined' && (window as any).__FORM_PREVIEW_SEQUENCE_ICON__) || '';

  const itemContent = (
    <>
      <span className="form-preview-tree__item-label">{getItemLabel(node.item)}</span>
      {onPropertiesClick && sequenceIconUrl ? (
        <button
          type="button"
          className="form-preview-tree__item-props-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onPropertiesClick(node.path);
          }}
          title="Свойства"
          aria-label="Свойства"
        >
          <img src={sequenceIconUrl} width={16} height={16} alt="" aria-hidden />
        </button>
      ) : null}
    </>
  );

  if (hasChildren) {
    return (
      <li className="form-preview-tree__node">
        <details open>
          <summary className="form-preview-tree__summary">
            <button
              type="button"
              className={`form-preview-tree__item ${isSelected ? 'is-selected' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onSelect(node.path);
              }}
              title={node.path}
            >
              {itemContent}
            </button>
          </summary>
          <ul className="form-preview-tree">
            {node.children.map(ch => (
              <TreeNodeView
                key={ch.path}
                node={ch}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onPropertiesClick={onPropertiesClick}
              />
            ))}
          </ul>
        </details>
      </li>
    );
  }

  return (
    <li className="form-preview-tree__node">
      <button
        type="button"
        className={`form-preview-tree__item ${isSelected ? 'is-selected' : ''}`}
        onClick={() => onSelect(node.path)}
        title={node.path}
      >
        {itemContent}
      </button>
    </li>
  );
};

type AttributeTreeRow =
  | {
      kind: 'attribute';
      key: string;
      depth: number;
      name: string;
      type: string;
      attrIndex: number;
      isExpandable: boolean;
      isExpanded: boolean;
      expandKey: string;
    }
  | {
      kind: 'column';
      key: string;
      depth: number;
      name: string;
      type: string;
    }
  | {
      kind: 'refAttribute';
      key: string;
      depth: number;
      name: string;
      type: string;
    }
  | {
      kind: 'tabularSection';
      key: string;
      depth: number;
      name: string;
      type: string;
      expandKey: string;
      isExpanded: boolean;
      isExpandable: boolean;
    }
  | {
      kind: 'tabularSectionAttribute';
      key: string;
      depth: number;
      name: string;
      type: string;
    };

export interface AttributeColumnDraft {
  name: string;
  title?: string;
  type: any;
  id?: string;
  raw?: any;
}

function buildTitleNodeFromText(text: string): any {
  if (!text) return undefined;
  return {
    'v8:item': [
      {
        'v8:lang': 'ru',
        'v8:content': text,
      },
    ],
  };
}

function parseAttributeColumnDrafts(attr?: FormAttribute): AttributeColumnDraft[] {
  const props = attr?.properties;
  if (!props || typeof props !== 'object') return [];
  const columnsNode = (props as any).Columns;
  if (!columnsNode) return [];
  const columnSource = (columnsNode as any).Column ?? columnsNode;
  const list = Array.isArray(columnSource) ? columnSource : [columnSource];
  return list
    .map((col: any, idx: number) => {
      if (!col || typeof col !== 'object') return null;
      const name = String(col.name ?? col.Name ?? `Колонка ${idx + 1}`);
      const id = col.id ?? col.ID;
      return {
        name,
        title: extractTitle(col.Title),
        type: col.Type ?? null,
        id: typeof id === 'string' ? id : undefined,
        raw: col,
      } as AttributeColumnDraft;
    })
    .filter((c): c is AttributeColumnDraft => Boolean(c));
}

function serializeAttributeColumns(drafts: AttributeColumnDraft[]): any | undefined {
  if (!Array.isArray(drafts) || drafts.length === 0) return undefined;
  return {
    Column: drafts.map((col, index) => {
      const entry: any = {
        ...(col.raw || {}),
      };
      entry.name = col.name || `Column${index + 1}`;
      if (col.id) {
        entry.id = col.id;
      }
      entry.Type = col.type || 'xs:string';
      if (col.title && col.title.trim()) {
        entry.Title = buildTitleNodeFromText(col.title.trim());
      } else {
        delete entry.Title;
      }
      return entry;
    }),
  };
}

function extractAttributeColumns(attr: FormAttribute): Array<{ name: string; type: string }> {
  return parseAttributeColumnDrafts(attr).map((col) => ({
    name: col.name,
    type: formatTypeForDisplay(col.type),
  }));
}

function isValueTableTypeValue(typeValue: any): boolean {
  if (!typeValue) return false;
  const raw = extractTypeString(typeValue);
  if (raw && raw.toLowerCase().includes('valuetable')) return true;
  if (typeof typeValue === 'object' && typeValue.kind && String(typeValue.kind).toLowerCase() === 'valuetable') {
    return true;
  }
  const formatted = formatTypeForDisplay(typeValue);
  return typeof formatted === 'string' && formatted.toLowerCase().includes('valuetable');
}

/**
 * Таблица реквизитов формы (как в EDT: список).
 */
const AttributesGrid: React.FC<{
  attributes: FormAttribute[];
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  referenceTypeStructures?: Record<string, { attributes: Array<{ name: string; typeDisplay: string }>; tabularSections: Array<{ name: string; attributes: Array<{ name: string; typeDisplay: string }> }> }>;
}> = ({ attributes, selectedIndex, onSelectIndex, referenceTypeStructures = {} }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleRow = useCallback((key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const rows: AttributeTreeRow[] = useMemo(() => {
    const list = Array.isArray(attributes) ? attributes : [];
    const result: AttributeTreeRow[] = [];

    list.forEach((attr, index) => {
      const typeText = attr.typeDisplay || formatTypeForDisplay(attr.type) || '';
      const columns = extractAttributeColumns(attr);
      const refStruct = referenceTypeStructures[attr.name || ''];
      const hasRefStruct = refStruct && (refStruct.attributes.length > 0 || refStruct.tabularSections.length > 0);
      const expandKey = `${attr.name || ''}#${index}`;
      const isExpanded = Boolean(expanded[expandKey]);

      result.push({
        kind: 'attribute',
        key: `attr-${expandKey}`,
        depth: 0,
        name: attr.name || '',
        type: typeText,
        attrIndex: index,
        isExpandable: columns.length > 0 || hasRefStruct,
        isExpanded,
        expandKey,
      });

      if (isExpanded) {
        if (columns.length > 0) {
          columns.forEach((col, colIndex) => {
            result.push({
              kind: 'column',
              key: `attr-${expandKey}-col-${colIndex}`,
              depth: 1,
              name: col.name,
              type: col.type,
            });
          });
        }
        if (hasRefStruct && refStruct) {
          refStruct.attributes.forEach((ra, raIdx) => {
            result.push({
              kind: 'refAttribute',
              key: `attr-${expandKey}-ref-${raIdx}`,
              depth: 1,
              name: ra.name,
              type: ra.typeDisplay || '',
            });
          });
          refStruct.tabularSections.forEach((ts, tsIdx) => {
            const tsExpandKey = `${expandKey}-ts-${tsIdx}`;
            const tsExpanded = Boolean(expanded[tsExpandKey]);
            result.push({
              kind: 'tabularSection',
              key: `attr-${expandKey}-ts-${tsIdx}`,
              depth: 1,
              name: ts.name,
              type: '',
              expandKey: tsExpandKey,
              isExpanded: tsExpanded,
              isExpandable: ts.attributes.length > 0,
            });
            if (tsExpanded && ts.attributes.length > 0) {
              ts.attributes.forEach((tsa, tsaIdx) => {
                result.push({
                  kind: 'tabularSectionAttribute',
                  key: `attr-${expandKey}-ts-${tsIdx}-attr-${tsaIdx}`,
                  depth: 2,
                  name: tsa.name,
                  type: tsa.typeDisplay || '',
                });
              });
            }
          });
        }
      }
    });

    return result;
  }, [attributes, expanded, referenceTypeStructures]);

  return (
    <div className="edt-grid">
      <table className="edt-grid__table">
        <thead>
          <tr>
            <th>Реквизит</th>
            <th>Тип</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="form-preview__empty">Нет реквизитов формы</td>
            </tr>
          ) : (
            rows.map((r) => {
              const isAttributeRow = r.kind === 'attribute';
              const isTabularSectionRow = r.kind === 'tabularSection';
              const attrRow = isAttributeRow ? (r as Extract<AttributeTreeRow, { kind: 'attribute' }>) : null;
              const tsRow = isTabularSectionRow ? (r as Extract<AttributeTreeRow, { kind: 'tabularSection' }>) : null;
              const isSubrow = r.kind === 'column' || r.kind === 'refAttribute' || r.kind === 'tabularSection' || r.kind === 'tabularSectionAttribute';
              const toggleKey = attrRow?.expandKey ?? tsRow?.expandKey;
              const showToggle = (isAttributeRow && attrRow?.isExpandable) || (isTabularSectionRow && tsRow?.isExpandable);
              const isExpanded = attrRow?.isExpanded ?? tsRow?.isExpanded ?? false;
              return (
                <tr
                  key={r.key}
                  className={`${isAttributeRow && selectedIndex === attrRow?.attrIndex ? 'is-selected' : ''} ${isSubrow ? 'is-subrow' : ''}`}
                  onClick={isAttributeRow && attrRow ? () => onSelectIndex(attrRow.attrIndex) : undefined}
                  style={{ cursor: isAttributeRow ? 'pointer' : 'default' }}
                >
                  <td className="edt-grid__cell--main">
                    <div className={`attr-tree-cell depth-${r.depth}`}>
                      {showToggle && toggleKey ? (
                        <button
                          type="button"
                          className="attr-tree-cell__toggle"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(toggleKey);
                          }}
                          aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      ) : (
                        <span className="attr-tree-cell__spacer" />
                      )}
                      <span>{r.name || (r.kind === 'column' ? '(колонка)' : r.kind === 'tabularSectionAttribute' ? '(реквизит)' : '(без имени)')}</span>
                    </div>
                  </td>
                  <td className="edt-grid__cell--mono">{r.type}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Таблица команд формы.
 */
const CommandsGrid: React.FC<{
  commands: FormCommand[];
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
}> = ({ commands, selectedIndex, onSelectIndex }) => {
  const rows = useMemo(() => {
    return (Array.isArray(commands) ? commands : []).map((c, index) => {
      const title = extractTitle((c.properties as any)?.Title);
      const cmdNameRaw = (c.properties as any)?.CommandName;
      const cmdName = extractScalarText(cmdNameRaw) || (c.name ? `Form.Command.${c.name}` : '');
      return {
        index,
        name: c.name,
        representation: title,
        commandName: cmdName,
      };
    });
  }, [commands]);

  return (
    <div className="edt-grid">
      <table className="edt-grid__table">
        <thead>
          <tr>
            <th>Команда</th>
            <th>Представление</th>
            <th>Имя команды</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="form-preview__empty">Нет команд формы</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r.name || String(r.index)}
                className={selectedIndex === r.index ? 'is-selected' : ''}
                onClick={() => onSelectIndex(r.index)}
                style={{ cursor: 'pointer' }}
              >
                <td className="edt-grid__cell--main">{r.name}</td>
                <td>{r.representation}</td>
                <td className="edt-grid__cell--mono">{r.commandName}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Редактор свойств выбранного элемента формы (MVP).
 * Изменения применяются "в памяти" (state) и сразу отражаются в дизайнере.
 */
const ElementPropertiesEditor: React.FC<{
  item: FormItem | null;
  onChange: (key: string, nextValue: any) => void;
  /** Фильтр по имени свойства (поиск в панели «Свойства»). */
  searchFilter?: string;
}> = ({ item, onChange, searchFilter }) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Ширина колонки «Свойство» в % (остальное — «Значение»). */
  const [propColWidthPercent, setPropColWidthPercent] = useState(38);
  const tableRef = useRef<HTMLTableElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleColResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startPercent = propColWidthPercent;
    const el = tableRef.current;
    if (!el) return;

    const onMove = (moveEvent: MouseEvent) => {
      const tableRect = el.getBoundingClientRect();
      const tableWidth = tableRect.width;
      if (tableWidth <= 0) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / tableWidth) * 100;
      const next = Math.min(70, Math.max(15, startPercent + deltaPercent));
      setPropColWidthPercent(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('edt-resizing-props-cols');
      setIsResizing(false);
    };
    document.body.classList.add('edt-resizing-props-cols');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    setIsResizing(true);
  }, [propColWidthPercent]);

  const rows = useMemo(() => {
    const props = item?.properties;
    if (!props || typeof props !== 'object') return [] as Array<{ key: string; value: any; type: string }>;

    let list = Object.keys(props)
      .filter((k) => k !== 'Events') // обработчики отображаются в секции «События»
      .map((k) => ({
        key: k,
        value: (props as any)[k],
        type: Array.isArray((props as any)[k]) ? 'array' : ((props as any)[k] === null ? 'null' : typeof (props as any)[k]),
      }));
    const q = (searchFilter || '').trim().toLowerCase();
    if (q) {
      list = list.filter((r) => r.key.toLowerCase().includes(q));
    }
    return list;
  }, [item, searchFilter]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const r of rows) {
      next[r.key] = formatValue(r.value);
    }
    setDrafts(next);
    setErrors({});
  }, [item, rows]);

  if (!item) {
    return <div className="form-preview__empty">Выберите элемент в дереве слева</div>;
  }

  const onChangeDraft = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const clearError = (key: string) => {
    setErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const setError = (key: string, msg: string) => {
    setErrors((prev) => ({ ...prev, [key]: msg }));
  };

  const apply = (key: string) => {
    const original = (item.properties as any)?.[key];
    const draft = drafts[key];

    if (typeof original === 'string') {
      clearError(key);
      onChange(key, draft);
      return;
    }

    if (typeof original === 'number') {
      const n = Number(draft);
      if (!Number.isFinite(n)) {
        setError(key, 'Ожидалось число');
        return;
      }
      clearError(key);
      onChange(key, n);
      return;
    }

    if (typeof original === 'boolean') {
      clearError(key);
      onChange(key, Boolean(draft));
      return;
    }

    if (original === null || original === undefined) {
      // MVP: не редактируем null/undefined, чтобы случайно не ломать структуру.
      return;
    }

    if (typeof original === 'object') {
      try {
        const parsed = JSON.parse(draft);
        clearError(key);
        onChange(key, parsed);
      } catch {
        setError(key, 'Некорректный JSON');
      }
      return;
    }

    clearError(key);
    onChange(key, draft);
  };

  return (
    <div className="edt-grid edt-props-editor">
      <table ref={tableRef} className="edt-grid__table edt-props-editor__table" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: `${propColWidthPercent}%` }} />
          <col style={{ width: '10px' }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th className="edt-props-editor__cell-property">Свойство</th>
            <th className="edt-props-editor__resizer-cell" aria-hidden>
              <div
                className="edt-props-editor__resizer"
                role="separator"
                aria-label="Изменить ширину колонок"
                title="Перетащите для изменения ширины колонок"
                onMouseDown={handleColResizeMouseDown}
              />
            </th>
            <th>Значение</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="form-preview__empty">У элемента нет свойств</td>
            </tr>
          ) : (
            rows.map((r) => {
              const err = errors[r.key];
              const isBool = typeof r.value === 'boolean';
              const isJson = typeof r.value === 'object' && r.value !== null;
              const isNum = typeof r.value === 'number';
              const isNullish = r.value === null || r.value === undefined;

              return (
                <tr key={r.key}>
                  <td className="edt-grid__cell--mono edt-props-editor__cell-property" title={r.key}>{r.key}</td>
                  <td className="edt-props-editor__resizer-cell" />
                  <td>
                    {isBool ? (
                      <label className="edt-props-editor__bool">
                        <input
                          type="checkbox"
                          checked={Boolean(r.value)}
                          onChange={(e) => onChange(r.key, e.target.checked)}
                        />
                        <span>{Boolean(r.value) ? 'true' : 'false'}</span>
                      </label>
                    ) : isJson ? (
                      <>
                        <textarea
                          className={`edt-props-editor__textarea ${err ? 'is-error' : ''}`}
                          value={drafts[r.key] ?? ''}
                          onChange={(e) => onChangeDraft(r.key, e.target.value)}
                          onBlur={() => apply(r.key)}
                        />
                        {err ? <div className="edt-props-editor__error">{err}</div> : null}
                      </>
                    ) : (
                      <>
                        <input
                          className={`edt-props-editor__input ${err ? 'is-error' : ''}`}
                          value={drafts[r.key] ?? ''}
                          disabled={isNullish}
                          onChange={(e) => onChangeDraft(r.key, e.target.value)}
                          onBlur={() => apply(r.key)}
                          inputMode={isNum ? 'numeric' : undefined}
                        />
                        {err ? <div className="edt-props-editor__error">{err}</div> : null}
                      </>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Типовые имена событий по типу элемента формы (для панели «События»).
 * Полный справочник: docs/form-element-events.md (по документации ИТС 1С).
 */
const DEFAULT_EVENTS_BY_TYPE: Record<string, string[]> = {
  Form: [
    'ПриСозданииНаСервере', 'ПриОткрытии', 'ПриПовторномОткрытии', 'ПередОткрытием',
    'ПередЗакрытием', 'ПриЗакрытии', 'ПередЗаписью', 'ПередЗаписьюНаСервере',
    'ПриЗаписиНаСервере', 'ПослеЗаписиНаСервере', 'ПослеЗаписи', 'ПриЧтенииНаСервере',
    'ОбработкаВыбора', 'ОбработкаЗаписиНовогоОбъекта', 'ОбработкаАктивизацииОбъекта',
    'ОбработкаОповещения', 'ОбработкаПроверкиЗаполнения', 'ОбновлениеОтображения',
    'ВнешнееСобытие', 'ОтключениеВнешнейКомпонентыПриОшибке',
  ],
  InputField: [
    'ПриИзменении', 'НачалоВыбора', 'ОбработкаВыбора', 'Очистка', 'Открытие',
    'ИзменениеТекстаРедактирования', 'АвтоПодборТекста',
  ],
  SelectField: ['ПриИзменении', 'НачалоВыбора', 'ОбработкаВыбора', 'Очистка'],
  CheckboxField: ['ПриИзменении'],
  CheckBoxField: ['ПриИзменении'],
  Button: ['Нажатие'],
  Table: [
    'Выбор', 'ВыборЗначения', 'ПриАктивизацииСтроки', 'ПриНачалеРедактирования',
    'ПриОкончанииРедактирования', 'ПередНачаломДобавления', 'ПередНачаломИзменения',
    'ОбработкаВыбора', 'ОбработкаЗаписиНовогоОбъекта', 'ПриВыводеСтроки', 'ПриПолученииДанных',
    'ПриИзмененииФлажка', 'ПриСменеТекущегоРодителя', 'НачалоПеретаскивания',
    'ОкончаниеПеретаскивания', 'ПроверкаПеретаскивания',
  ],
  UsualGroup: [],
  ColumnGroup: [],
  LabelDecoration: [],
  PictureDecoration: ['Нажатие'],
};

/**
 * Соответствие русских имён событий и атрибута name в Form.xml (Event name="...").
 * Используется для подстановки обработчиков из item.properties.Events в панель «События».
 */
const EVENT_RUSSIAN_TO_XML_NAME: Record<string, string> = {
  ПриСозданииНаСервере: 'OnCreateAtServer',
  ПриОткрытии: 'OnOpen',
  ПриПовторномОткрытии: 'OnReopen',
  ПередОткрытием: 'BeforeOpen',
  ПередЗакрытием: 'BeforeClose',
  ПриЗакрытии: 'OnClose',
  ПередЗаписью: 'BeforeWrite',
  ПередЗаписьюНаСервере: 'BeforeWriteAtServer',
  ПриЗаписиНаСервере: 'OnWriteAtServer',
  ПослеЗаписиНаСервере: 'AfterWriteAtServer',
  ПослеЗаписи: 'AfterWrite',
  ПриЧтенииНаСервере: 'OnReadAtServer',
  ОбработкаВыбора: 'ChoiceProcessing',
  ОбработкаЗаписиНовогоОбъекта: 'NewObjectWriteProcessing',
  ОбработкаАктивизацииОбъекта: 'ObjectActivationProcessing',
  ОбработкаОповещения: 'NotificationProcessing',
  ОбработкаПроверкиЗаполнения: 'FillCheckProcessing',
  ОбновлениеОтображения: 'RefreshDisplay',
  ВнешнееСобытие: 'ExternalEvent',
  ОтключениеВнешнейКомпонентыПриОшибке: 'AddInDetachmentOnError',
  ПриИзменении: 'OnChange',
  НачалоВыбора: 'StartChoice',
  Очистка: 'Clearing',
  Открытие: 'Opening',
  ИзменениеТекстаРедактирования: 'EditTextChange',
  АвтоПодборТекста: 'AutoTextSelection',
  Нажатие: 'Click',
  Выбор: 'Selection',
  ВыборЗначения: 'Choice',
  ПриАктивизацииСтроки: 'OnActivateRow',
  ПриНачалеРедактирования: 'OnStartEdit',
  ПриОкончанииРедактирования: 'OnEditEnd',
  ПередНачаломДобавления: 'BeforeAddRow',
  ПередНачаломИзменения: 'BeforeChangeRow',
  ПриВыводеСтроки: 'OnRowOutput',
  ПриПолученииДанных: 'OnDataGet',
  ПриИзмененииФлажка: 'OnCheckChange',
  ПриСменеТекущегоРодителя: 'OnCurrentParentChange',
  НачалоПеретаскивания: 'DragStart',
  ОкончаниеПеретаскивания: 'DragEnd',
  ПроверкаПеретаскивания: 'DragCheck',
};

/**
 * Панель «Свойства»: заголовок, поиск, секции «Основные» и «События».
 */
const PropertiesPanel: React.FC<{
  item: FormItem | null;
  /** Команды формы — нужны, чтобы показать процедуру для кнопки, связанной через CommandName без Event Click. */
  commands?: FormCommand[];
  title: string;
  onClose: () => void;
  onPropertyChange: (key: string, nextValue: any) => void;
  /** Открыть модуль формы и перейти к процедуре/функции (по имени обработчика). */
  onOpenModuleAtProcedure?: (procedureName: string) => void;
}> = ({ item, commands, title, onClose, onPropertyChange, onOpenModuleAtProcedure }) => {
  const [propertySearch, setPropertySearch] = useState('');
  /** Высота блока «Основные» в пикселях (перетаскиваемый разделитель). */
  const [mainSectionHeight, setMainSectionHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef({ y: 0, height: 0 });

  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { y: e.clientY, height: mainSectionHeight };
    setIsResizing(true);
  }, [mainSectionHeight]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const body = bodyRef.current;
      if (!body) return;
      const rect = body.getBoundingClientRect();
      const minH = 80;
      const maxH = Math.max(minH, rect.height - 100);
      const delta = e.clientY - resizeStartRef.current.y;
      const next = Math.min(maxH, Math.max(minH, resizeStartRef.current.height + delta));
      setMainSectionHeight(next);
    };
    const onUp = () => {
      setIsResizing(false);
      document.body.classList.remove('edt-resizing-props-sections');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.body.classList.add('edt-resizing-props-sections');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  const eventsFromProps = useMemo(() => {
    if (!item?.properties) return [];
    const raw = (item.properties as any).Events;
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({ name: String(e?.name ?? ''), value: String(e?.value ?? '') })).filter((e: { name: string }) => e.name);
  }, [item]);
  const eventNames = useMemo(() => {
    const type = item?.type || '';
    return DEFAULT_EVENTS_BY_TYPE[type] || [];
  }, [item?.type]);

  return (
    <div className="edt-properties-panel__wrap">
      <div className="edt-properties-panel__header">
        <span className="edt-properties-panel__title">{title}</span>
        <button
          type="button"
          className="edt-properties-panel__close"
          onClick={onClose}
          title="Закрыть"
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>
      <div className="edt-properties-panel__search">
        <input
          type="text"
          className="edt-search"
          placeholder="Поиск (Ctrl+Alt+I)"
          value={propertySearch}
          onChange={(e) => setPropertySearch(e.target.value)}
        />
      </div>
      <div ref={bodyRef} className="edt-properties-panel__body">
        <div
          className="edt-properties-panel__section-area"
          style={{
            flex: '0 0 auto',
            height: mainSectionHeight,
            minHeight: 80,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <details className="edt-properties-panel__section" open style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <summary className="edt-properties-panel__section-title">Основные</summary>
            <div className="edt-properties-panel__section-content edt-properties-panel__section-content--scrollable">
              {item ? (
                <ElementPropertiesEditor
                  item={item}
                  onChange={onPropertyChange}
                  searchFilter={propertySearch}
                />
              ) : (
                <div className="form-preview__empty">Выберите элемент в дереве</div>
              )}
            </div>
          </details>
        </div>
        <div
          role="separator"
          className="edt-properties-panel__resizer"
          onMouseDown={handleResizerMouseDown}
          title="Изменить размер секций"
          aria-label="Разделитель секций"
        />
        <div
          className="edt-properties-panel__section-area edt-properties-panel__section-area--events"
          style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <details className="edt-properties-panel__section edt-properties-panel__section--events" open style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <summary className="edt-properties-panel__section-title">События</summary>
            <div className="edt-properties-panel__section-content edt-properties-panel__section-content--scroll">
            {eventNames.length === 0 ? (
              <div className="form-preview__empty">Нет событий</div>
            ) : (
              <ul className="edt-properties-panel__events">
                {eventNames.map((name) => {
                  const xmlName = EVENT_RUSSIAN_TO_XML_NAME[name] || name;
                  const fromProps = eventsFromProps.find((e) => e.name === xmlName);
                  const explicitHandler = String(fromProps?.value ?? '').trim();
                  const derivedFromFormCommand =
                    item?.type === 'Button' && name === 'Нажатие'
                      ? resolveActionProcedureFromButtonCommandRefs(item.properties, commands)
                      : '';
                  const handlerIsFromCommand = !explicitHandler && !!derivedFromFormCommand;
                  const handler = explicitHandler || derivedFromFormCommand;
                  const applyEventHandler = (newValue: string) => {
                    if (handlerIsFromCommand) return;
                    const trimmed = String(newValue).trim();
                    let next: Array<{ name: string; value: string }>;
                    if (!trimmed) {
                      next = eventsFromProps.filter((e) => e.name !== xmlName);
                    } else {
                      const found = eventsFromProps.find((e) => e.name === xmlName);
                      if (found) {
                        next = eventsFromProps.map((e) =>
                          e.name === xmlName ? { ...e, value: trimmed } : e
                        );
                      } else {
                        next = [...eventsFromProps, { name: xmlName, value: trimmed }];
                      }
                    }
                    onPropertyChange('Events', next);
                  };
                  const templateIconUrl =
                    (typeof window !== 'undefined' && (window as any).__FORM_PREVIEW_TEMPLATE_ICON__) || '';
                  return (
                    <li key={name} className="edt-properties-panel__event-row">
                      <span className="edt-properties-panel__event-name" title={name}>{name}</span>
                      <span className="edt-properties-panel__event-handler">
                        <input
                          type="text"
                          className="edt-properties-panel__event-input"
                          value={handler}
                          readOnly={handlerIsFromCommand}
                          placeholder="Имя процедуры…"
                          title={
                            handlerIsFromCommand
                              ? 'Процедура задана действием команды формы (Action). Изменить можно на вкладке «Команды».'
                              : 'Имя процедуры-обработчика (сохраняется в Form.xml как Event name="Click")'
                          }
                          onChange={(e) => applyEventHandler(e.target.value)}
                        />
                        {onOpenModuleAtProcedure && templateIconUrl ? (
                          <button
                            type="button"
                            className="edt-properties-panel__event-open"
                            title={handler.trim() ? 'Открыть модуль формы и перейти к процедуре' : 'Открыть модуль формы'}
                            onClick={() => onOpenModuleAtProcedure(handler.trim())}
                            aria-label="Открыть"
                          >
                            <img src={templateIconUrl} width={16} height={16} alt="" />
                          </button>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </details>
        </div>
      </div>
    </div>
  );
};

/**
 * =========================
 * ДИЗАЙНЕР (ближе к EDT)
 * =========================
 */

function isNumericKey(k: string): boolean {
  return /^\d+$/.test(k);
}

function extractTitle(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;

  const item = val.item ?? val['v8:item'];
  if (item) {
    const items = Array.isArray(item) ? item : [item];
    for (const it of items) {
      if (!it) continue;
      const c = (it as any).content ?? (it as any)['v8:content'] ?? (it as any).text ?? (it as any)['#text'];
      if (typeof c === 'string' && c.trim()) return c;
    }
  }

  if (typeof val === 'object') {
    const c = (val as any).content ?? (val as any)['v8:content'] ?? (val as any).text ?? (val as any)['#text'];
    if (typeof c === 'string') return c;
  }

  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function getItemTitleFromProps(props: any): string {
  const t = props?.Title;
  return extractTitle(t);
}

function extractScalarText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    for (const v of val) {
      const s = extractScalarText(v);
      if (s.trim()) return s;
    }
    return '';
  }
  if (typeof val === 'object') {
    const v: any = val;
    // fast-xml-parser variants
    return extractScalarText(v.text ?? v['#text'] ?? v.content ?? v['v8:content'] ?? v.Value ?? v['v8:Value']);
  }
  return String(val);
}

function getOrientation(props: any): 'vertical' | 'horizontalAlways' | 'horizontalIfPossible' {
  // В XML встречается <Group>Vertical</Group> / <Group>AlwaysHorizontal</Group>.
  // Для некоторых групп тег <Group> отсутствует (в EDT поведение похоже на AlwaysHorizontal),
  // поэтому дефолт держим horizontalAlways, чтобы “колонки” не уезжали вниз.
  const gRaw = props?.Group ?? props?.Grouping ?? props?.['Группировка'];
  const g = extractScalarText(gRaw).toLowerCase().trim();

  if (!g) return 'horizontalAlways';

  if (g.includes('vertical') || g.includes('вертик')) return 'vertical';

  if (g.includes('horizontalifpossible') || g.includes('ifpossible') || g.includes('если возможно')) return 'horizontalIfPossible';

  // AlwaysHorizontal / HorizontalAlways / "горизонтальная всегда"
  if (g.includes('alwayshorizontal') || g.includes('horizontalalways') || g.includes('всегда')) return 'horizontalAlways';

  if (g.includes('horizontal') || g.includes('горизонт')) return 'horizontalIfPossible';

  return 'horizontalAlways';
}

function getDataPath(props: any): string {
  const dp = props?.DataPath;
  return typeof dp === 'string' ? dp : '';
}

function deriveLabelFromDataPath(dp: string): string {
  if (!dp) return '';
  const parts = dp.split('.').filter(Boolean);
  const last = parts.length ? parts[parts.length - 1] : dp;
  // EDT-like: стандартный номер строки
  if (last === 'LineNumber' || last === 'LineNo' || last === 'RowNumber') return 'N';
  return humanizeIdentifier(last);
}

function humanizeIdentifier(value: string): string {
  const s = String(value || '');
  if (!s) return '';
  // Разбиваем CamelCase (латиница/кириллица) и подчёркивания
  // Пример: КатегорияМедицинскогоПерсонала -> Категория Медицинского Персонала
  return s
    .replace(/_/g, ' ')
    .replace(/(\p{Ll}|\d)(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function omitChildItems(raw: any): Record<string, any> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'ChildItems') continue;
    out[k] = v;
  }
  return out;
}

function isPreserveOrderElementNode(node: any): boolean {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  const keys = Object.keys(node).filter(k => k !== ':@');
  if (keys.length !== 1) return false;
  const tag = keys[0];
  // whitespace/text nodes from preserveOrder
  if (tag === '#text' || tag === 'text') return false;
  return true;
}

function mergePreserveOrderBodyArray(bodyArr: any): any {
  const parts = Array.isArray(bodyArr) ? bodyArr : (bodyArr ? [bodyArr] : []);
  const out: any = {};
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue;
    for (const [k, v] of Object.entries(part)) {
      // на практике для Button/ContextMenu/AutoCommandBar здесь уникальные ключи
      out[k] = v;
    }
  }
  return out;
}

function convertPreserveOrderElementNode(node: any): FormItem | null {
  if (!isPreserveOrderElementNode(node)) return null;
  const tag = Object.keys(node).find(k => k !== ':@');
  if (!tag) return null;

  const attrs = (node as any)[':@'] as any;
  const bodyArr = (node as any)[tag];
  const mergedBody = mergePreserveOrderBodyArray(bodyArr);

  if (attrs && typeof attrs === 'object') {
    if (attrs.name !== undefined) mergedBody.name = attrs.name;
    if (attrs.id !== undefined) mergedBody.id = attrs.id;
  }

  // В mergedBody.ChildItems может быть preserveOrder-массив
  return convertRawFormItem(mergedBody, String(tag));
}

function convertRawChildItems(childItemsNode: any): FormItem[] {
  if (!childItemsNode) return [];

  // preserveOrder: ChildItems часто приходит массивом узлов вида {Button:[...],':@':{...}}
  if (Array.isArray(childItemsNode)) {
    const items: FormItem[] = [];
    for (const rawNode of childItemsNode) {
      // пропускаем whitespace узлы preserveOrder
      if (rawNode && typeof rawNode === 'object' && !Array.isArray(rawNode)) {
        const tag = Object.keys(rawNode).find(k => k !== ':@');
        if (tag === '#text' || tag === 'text') continue;
      }
      const parsed = convertPreserveOrderElementNode(rawNode);
      if (parsed) {
        items.push(parsed);
        continue;
      }
      // fallback: если массив уже список обычных raw-элементов или распарсенных FormItem (например из парсера ContextMenu/AutoCommandBar)
      if (rawNode && typeof rawNode === 'object') {
        const typeHint = (rawNode as any).type || guessEmbeddedType('Unknown', rawNode);
        items.push(convertRawFormItem(rawNode, typeHint));
      }
    }
    return items;
  }

  if (typeof childItemsNode !== 'object') return [];

  const items: FormItem[] = [];
  for (const [type, val] of Object.entries(childItemsNode)) {
    if (!val) continue;
    // preserveOrder: иногда ChildItems обёрнуты в numeric-ключи "0","1","2"
    if (isNumericKey(String(type))) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const tag = Object.keys(val).find(k => k !== ':@');
        if (tag === '#text' || tag === 'text') {
          continue;
        }
      }
      const parsed = convertPreserveOrderElementNode(val);
      if (parsed) {
        items.push(parsed);
        continue;
      }
      continue;
    }
    const list = Array.isArray(val) ? val : [val];
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue;
      items.push(convertRawFormItem(raw, String(type)));
    }
  }
  return items;
}

/**
 * Узел уже в формате FormItem после xmldom-парсера. Его нельзя снова прогонять через omitChildItems(raw):
 * иначе type/name/id попадут в properties, а CommandName окажется в properties.properties (панель «Нажатие» пустая).
 * Сырой объект с дочерними элементами из DOM помечается ключом ChildItems (PascalCase), не childItems.
 */
function isAlreadyParsedFormItem(raw: any): raw is FormItem {
  return (
    !!raw &&
    typeof raw === 'object' &&
    typeof raw.type === 'string' &&
    raw.properties != null &&
    typeof raw.properties === 'object' &&
    !Array.isArray(raw.properties) &&
    raw.ChildItems === undefined
  );
}

function convertRawFormItem(raw: any, typeHint: string): FormItem {
  if (isAlreadyParsedFormItem(raw)) {
    const next: FormItem = {
      type: raw.type,
      name: raw.name,
      id: raw.id,
      properties: { ...raw.properties },
    };
    if (Array.isArray(raw.childItems) && raw.childItems.length > 0) {
      next.childItems = raw.childItems.map((ch) => convertRawFormItem(ch, ch.type || typeHint));
    }
    return next;
  }

  const name = raw?.name ?? raw?.Name;
  const id = raw?.id ?? raw?.ID;
  const props = omitChildItems(raw);
  const children = convertRawChildItems(raw?.ChildItems ?? raw?.childItems);

  const item: FormItem = {
    type: typeHint,
    name: typeof name === 'string' ? name : undefined,
    id: typeof id === 'string' ? id : (typeof id === 'number' ? String(id) : undefined),
    properties: props,
  };
  if (children.length > 0) item.childItems = children;
  return item;
}

function extractPanelChildItems(props: any): FormItem[] {
  if (!props || typeof props !== 'object') return [];
  const extras: FormItem[] = [];
  if (props.ContextMenu) {
    extras.push(convertRawFormItem(props.ContextMenu, 'ContextMenu'));
  }
  if (props.AutoCommandBar) {
    extras.push(convertRawFormItem(props.AutoCommandBar, 'AutoCommandBar'));
  }
  return extras;
}

function attachPanelsToItems(items?: FormItem[]): FormItem[] | undefined {
  if (!Array.isArray(items)) return items;
  return items.map((item) => attachPanelsToItem(item));
}

function attachPanelsToItem(item: FormItem): FormItem {
  const cloned: FormItem = {
    ...item,
    properties: { ...(item.properties || {}) },
  };
  if (Array.isArray(item.childItems)) {
    cloned.childItems = attachPanelsToItems(item.childItems);
  }
  if (item.type === 'Table') {
    const extras = extractPanelChildItems(item.properties);
    if (extras.length > 0) {
      cloned.childItems = [...extras, ...(cloned.childItems || [])];
    }
  }
  return cloned;
}

function attachPanelsToForm(form: ParsedFormFull): ParsedFormFull {
  return {
    ...form,
    childItems: attachPanelsToItems(form.childItems) ?? [],
  };
}

function isPanelItemType(type?: string): boolean {
  return type === 'ContextMenu' || type === 'AutoCommandBar';
}

function guessEmbeddedType(parentType: string, raw: any): string {
  if (raw && typeof raw === 'object') {
    if (raw.Group || raw.Behavior || raw.Representation) {
      if (parentType === 'ColumnGroup') return 'ColumnGroup';
      return 'UsualGroup';
    }
  }
  return parentType || 'Unknown';
}

function getEmbeddedNumericChildren(item: FormItem): FormItem[] {
  const props = item.properties;
  if (!props || typeof props !== 'object') return [];

  const keys = Object.keys(props as any).filter(isNumericKey).sort((a, b) => Number(a) - Number(b));
  if (keys.length === 0) return [];

  const result: FormItem[] = [];
  for (const k of keys) {
    const raw = (props as any)[k];
    if (!raw || typeof raw !== 'object') continue;
    const typeHint = guessEmbeddedType(item.type, raw);
    result.push(convertRawFormItem(raw, typeHint));
  }

  return result;
}

function getVisualChildren(item: FormItem): FormItem[] {
  const direct = Array.isArray(item.childItems) ? item.childItems : [];
  if (direct.length > 0) return direct;

  const embedded = getEmbeddedNumericChildren(item);
  if (embedded.length > 0) return embedded;

  const rawChild = (item.properties as any)?.ChildItems;
  if (rawChild) return convertRawChildItems(rawChild);

  return [];
}

function buildVisualTree(items: FormItem[] | undefined, basePath = ''): TreeNode[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items.map((item, index) => {
    const path = basePath ? `${basePath}.${index}` : String(index);
    const childrenItems = getVisualChildren(item);
    const children = buildVisualTree(childrenItems, path);
    return { path, item, children };
  });
}

const DesignerPreview: React.FC<{
  items: FormItem[];
  selectedPath: string;
  onSelect: (path: string) => void;
}> = ({ items, selectedPath, onSelect }) => {
  const nodes = useMemo(() => buildVisualTree(items), [items]);
  const [activePages, setActivePages] = useState<Record<string, string>>({});

  const setActivePage = useCallback((pagesPath: string, pagePath: string) => {
    setActivePages((prev) => ({ ...prev, [pagesPath]: pagePath }));
  }, []);

  return (
    <div className="designer designer-edt">
      {nodes.map((n) => (
        <DesignerNode
          key={n.path}
          node={n}
          selectedPath={selectedPath}
          onSelect={onSelect}
          activePages={activePages}
          setActivePage={setActivePage}
        />
      ))}
    </div>
  );
};

const DesignerNode: React.FC<{
  node: TreeNode;
  selectedPath: string;
  onSelect: (path: string) => void;
  activePages: Record<string, string>;
  setActivePage: (pagesPath: string, pagePath: string) => void;
}> = ({ node, selectedPath, onSelect, activePages, setActivePage }) => {
  const isSelected = node.path === selectedPath;
  const type = node.item.type || 'Unknown';

  const title = getItemTitleFromProps(node.item.properties);
  const dp = getDataPath(node.item.properties);

  const children = node.children;
  const baseClass = `designer-node ${isSelected ? 'is-selected' : ''}`;

  const onClickSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path);
  };

  /** Элементы с ShowTitle === false не отображаются в Дизайнере (без карточки/заголовка).
   * Для UsualGroup/ColumnGroup сохраняем только обёртку с ориентацией (Group: Vertical, AlwaysHorizontal и т.д.),
   * чтобы дочерние элементы располагались правильно. */
  const showTitleRaw = (node.item.properties as any)?.ShowTitle;
  const showTitle =
    showTitleRaw !== false &&
    showTitleRaw !== 'false' &&
    (typeof showTitleRaw !== 'string' || showTitleRaw.toLowerCase() !== 'false');
  const isLayoutGroup = type === 'UsualGroup' || type === 'ColumnGroup';
  if (!showTitle) {
    if (isLayoutGroup) {
      const orientation = getOrientation(node.item.properties);
      return (
        <div className={`designer-group__content designer-group__content--${orientation}`}>
          {children.map((ch) => (
            <DesignerNode
              key={ch.path}
              node={ch}
              selectedPath={selectedPath}
              onSelect={onSelect}
              activePages={activePages}
              setActivePage={setActivePage}
            />
          ))}
        </div>
      );
    }
    return (
      <>
        {children.map((ch) => (
          <DesignerNode
            key={ch.path}
            node={ch}
            selectedPath={selectedPath}
            onSelect={onSelect}
            activePages={activePages}
            setActivePage={setActivePage}
          />
        ))}
      </>
    );
  }

  if (type === 'Pages') {
    const pages = children.filter((c) => c.item.type === 'Page');
    const activeFromSelection = pages.find((p) => selectedPath.startsWith(p.path))?.path;
    const active = activeFromSelection || activePages[node.path] || pages[0]?.path || '';

    return (
      <div className={`${baseClass} designer-node--pages`} onClick={onClickSelect} title={node.path}>
        <div className="designer-node__title">
          <span className="designer-node__type">Pages</span>
          <span className="designer-node__name">{title || node.item.name || ''}</span>
        </div>

        {pages.length > 0 ? (
          <div className="designer-tabs" onClick={(e) => e.stopPropagation()}>
            {pages.map((p) => {
              const pTitle = getItemTitleFromProps(p.item.properties) || p.item.name || '';
              const isActive = p.path === active;
              return (
                <button
                  key={p.path}
                  type="button"
                  className={`designer-tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    setActivePage(node.path, p.path);
                    onSelect(p.path);
                  }}
                >
                  {pTitle}
                </button>
              );
            })}
          </div>
        ) : null}

        {(() => {
          const pageNode = pages.find((p) => p.path === active);
          if (!pageNode) return null;
          return (
            <div className="designer-node__children designer-node__children--pages">
              {pageNode.children.map((ch) => (
                <DesignerNode
                  key={ch.path}
                  node={ch}
                  selectedPath={selectedPath}
                  onSelect={onSelect}
                  activePages={activePages}
                  setActivePage={setActivePage}
                />
              ))}
            </div>
          );
        })()}
      </div>
    );
  }

  if (type === 'Page') {
    return (
      <div className={`${baseClass} designer-node--page`} onClick={onClickSelect} title={node.path}>
        <div className="designer-node__title">
          <span className="designer-node__type">Page</span>
          <span className="designer-node__name">{title || node.item.name || ''}</span>
        </div>
        {children.length > 0 ? (
          <div className="designer-node__children">
            {children.map((ch) => (
              <DesignerNode
                key={ch.path}
                node={ch}
                selectedPath={selectedPath}
                onSelect={onSelect}
                activePages={activePages}
                setActivePage={setActivePage}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (type === 'UsualGroup' || type === 'ColumnGroup') {
    const orientation = getOrientation(node.item.properties);
    const showTitleVal = (node.item.properties as any)?.ShowTitle;
    const showTitle =
      showTitleVal !== false &&
      showTitleVal !== 'false' &&
      (typeof showTitleVal !== 'string' || showTitleVal.toLowerCase() !== 'false');

    return (
      <div className={`${baseClass} designer-node--group`} onClick={onClickSelect} title={node.path}>
        <div className="designer-node__title">
          <span className="designer-node__type">{type}</span>
          <span className="designer-node__name">{showTitle ? (title || node.item.name || '') : (node.item.name || '')}</span>
        </div>
        {children.length > 0 ? (
          <div className={`designer-group__content designer-group__content--${orientation}`}>
            {children.map((ch) => (
              <DesignerNode
                key={ch.path}
                node={ch}
                selectedPath={selectedPath}
                onSelect={onSelect}
                activePages={activePages}
                setActivePage={setActivePage}
              />
            ))}
          </div>
        ) : (
          <div className="designer-node__props">{dp ? <span className="designer-node__datapath">{formatValue(dp)}</span> : null}</div>
        )}
      </div>
    );
  }

  if (type === 'InputField') {
    const label = title || deriveLabelFromDataPath(dp) || node.item.name || '';
    const multiline = Boolean((node.item.properties as any)?.MultiLine);

    return (
      <div className={`${baseClass} designer-node--field`} onClick={onClickSelect} title={node.path}>
        <div className="designer-field">
          <div className="designer-field__label">{label}</div>
          <div className={`designer-field__control ${multiline ? 'is-multiline' : ''}`}>
            {dp ? <span className="designer-field__hint">{dp}</span> : <span className="designer-field__hint">&nbsp;</span>}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'CheckBoxField') {
    const label = title || deriveLabelFromDataPath(dp) || node.item.name || '';
    return (
      <div className={`${baseClass} designer-node--checkbox`} onClick={onClickSelect} title={node.path}>
        <div className="designer-checkbox">
          <input type="checkbox" className="designer-checkbox__input" disabled aria-hidden />
          <span className="designer-checkbox__label">{label || (dp ? formatValue(dp) : '\u00A0')}</span>
        </div>
      </div>
    );
  }

  if (type === 'LabelField') {
    const label = title || node.item.name || '';
    return (
      <div className={`${baseClass} designer-node--label`} onClick={onClickSelect} title={node.path}>
        <div className="designer-label">{label}</div>
      </div>
    );
  }

  if (type === 'LabelDecoration') {
    const labelText = getItemTitleFromProps(node.item.properties) || '';
    return (
      <div className={`${baseClass} designer-node--label`} onClick={onClickSelect} title={node.path}>
        <div className="designer-label">{labelText || '\u00A0'}</div>
      </div>
    );
  }

  if (type === 'PictureDecoration') {
    const resourceIconUrl =
      (typeof window !== 'undefined' && (window as any).__FORM_PREVIEW_RESOURCE_ICON__) || '';
    return (
      <div className={`${baseClass} designer-node--picture`} onClick={onClickSelect} title={node.path}>
        <img src={resourceIconUrl} width={16} height={16} alt="" className="designer-picture-decoration" />
      </div>
    );
  }

  if (type === 'CommandBar') {
    const buttons = children;
    return (
      <div className={`${baseClass} designer-node--commandbar`} onClick={onClickSelect} title={node.path}>
        <div className="designer-commandbar" onClick={(e) => e.stopPropagation()}>
          {buttons.length === 0 ? (
            <span className="designer-commandbar__empty">Командная панель</span>
          ) : (
            buttons.map((b) => {
              const caption = getCommandCaptionFromItem(b.item);
              return (
                <button
                  key={b.path}
                  type="button"
                  className="designer-button"
                  onClick={() => onSelect(b.path)}
                >
                  {caption}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (type === 'Button') {
    const bTitle =
      getItemTitleFromProps(node.item.properties) ||
      (node.item.properties as any)?.Representation ||
      (node.item.properties as any)?.CommandName ||
      node.item.name ||
      'Кнопка';
    return (
      <div className={`${baseClass} designer-node--button`} onClick={onClickSelect} title={node.path}>
        <button
          type="button"
          className="designer-button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.path);
          }}
        >
          {String(bTitle)}
        </button>
      </div>
    );
  }

  if (type === 'Table') {
    const tTitle = title || node.item.name || 'Таблица';

    const panelNodes = children.filter((c) => isPanelItemType(c.item.type));
    const contextPanel = panelNodes.find((c) => c.item.type === 'ContextMenu') || null;
    const autoPanel = panelNodes.find((c) => c.item.type === 'AutoCommandBar') || null;
    const contextCommands = contextPanel ? contextPanel.children : [];
    const autoCommands = autoPanel ? autoPanel.children : [];
    const model = buildTableHeadModel(node.item);

    const gridStyle = {
      ['--designer-table-cols' as any]: `repeat(${model.colCount}, minmax(80px, 1fr))`,
    } as React.CSSProperties;

    const headStyle: React.CSSProperties = {
      gridTemplateColumns: `repeat(${model.colCount}, minmax(80px, 1fr))`,
      gridTemplateRows: `repeat(${model.rowCount}, 28px)`,
    };

    const cellClass = (kind: TableHeadCell['kind']) => {
      if (kind === 'group') return 'designer-table__cell designer-table__cell--group';
      if (kind === 'subgroup') return 'designer-table__cell designer-table__cell--group';
      if (kind === 'leaf') return 'designer-table__cell designer-table__cell--head';
      return 'designer-table__cell designer-table__cell--spacer';
    };

    return (
      <div className={`${baseClass} designer-node--table`} onClick={onClickSelect} title={node.path}>
        <div className="designer-table__title">{tTitle}</div>

        {contextPanel || autoPanel ? (
          <div className="designer-table__bars">
            {autoPanel ? (
              <div className="designer-table__bar" title={autoPanel.item.name || 'AutoCommandBar'}>
                <div className="designer-table__barButtons">
                  {autoCommands.length === 0 ? (
                    <span className="designer-table__barEmpty">Нет команд</span>
                  ) : (
                    autoCommands.map((cmd) => {
                      const caption = getCommandCaptionFromItem(cmd.item);
                      return (
                        <button
                          key={cmd.path}
                          type="button"
                          className="designer-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(cmd.path);
                          }}
                        >
                          {caption}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
            {contextPanel ? (
              <div className="designer-table__bar" title={contextPanel.item.name || 'ContextMenu'}>
                <div className="designer-table__barButtons">
                  {contextCommands.length === 0 ? (
                    <span className="designer-table__barEmpty">Нет команд</span>
                  ) : (
                    contextCommands.map((cmd) => {
                      const caption = getCommandCaptionFromItem(cmd.item);
                      return (
                        <button
                          key={cmd.path}
                          type="button"
                          className="designer-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(cmd.path);
                          }}
                        >
                          {caption}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="designer-table" style={gridStyle}>
          <div className="designer-table__headGrid" style={headStyle}>
            {model.cells.map((c) => (
              <div
                key={c.key}
                className={cellClass(c.kind)}
                style={{
                  gridColumnStart: c.colStart,
                  gridColumnEnd: `span ${c.colSpan}`,
                  gridRowStart: c.rowStart,
                  gridRowEnd: `span ${c.rowSpan}`,
                }}
                title={c.label}
              >
                {c.label || '\u00A0'}
              </div>
            ))}
          </div>

          <div className="designer-table__row">
            {Array.from({ length: model.colCount }).map((_, i) => (
              <div key={i} className="designer-table__cell">&nbsp;</div>
            ))}
          </div>
          <div className="designer-table__row">
            {Array.from({ length: model.colCount }).map((_, i) => (
              <div key={i} className="designer-table__cell">&nbsp;</div>
            ))}
          </div>
        </div>
        {dp ? <div className="designer-node__props"><span className="designer-node__datapath">{dp}</span></div> : null}
      </div>
    );
  }

  return (
    <div className={baseClass} onClick={onClickSelect} title={node.path}>
      <div className="designer-node__title">
        <span className="designer-node__type">{type}</span>
        <span className="designer-node__name">{title || node.item.name || node.item.id || ''}</span>
      </div>

      {children.length > 0 ? (
        <div className="designer-node__children">
          {children.map((ch) => (
            <DesignerNode
              key={ch.path}
              node={ch}
              selectedPath={selectedPath}
              onSelect={onSelect}
              activePages={activePages}
              setActivePage={setActivePage}
            />
          ))}
        </div>
      ) : (
        <div className="designer-node__props">
          {dp ? <div className="designer-node__datapath">{formatValue(dp)}</div> : null}
        </div>
      )}
    </div>
  );
};

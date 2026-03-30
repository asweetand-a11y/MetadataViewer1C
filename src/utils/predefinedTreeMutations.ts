/**
 * Операции над деревом предопределённых элементов (корень + ChildItems).
 */

import { PredefinedDataItem } from '../predefinedDataInterfaces';

function getItemAtPath(roots: PredefinedDataItem[], path: number[]): PredefinedDataItem | null {
  if (path.length === 0) return null;
  let current: PredefinedDataItem | undefined = roots[path[0]];
  for (let i = 1; i < path.length; i++) {
    if (!current?.ChildItems?.Item) return null;
    current = current.ChildItems.Item[path[i]];
  }
  return current ?? null;
}

function updateChildNode(
  item: PredefinedDataItem,
  relPath: number[],
  updater: (node: PredefinedDataItem) => PredefinedDataItem
): PredefinedDataItem {
  const [first, ...rest] = relPath;
  const children = item.ChildItems?.Item ? [...item.ChildItems.Item] : [];
  if (first < 0 || first >= children.length) return item;
  if (rest.length === 0) {
    children[first] = updater(children[first]);
    return { ...item, ChildItems: { Item: children } };
  }
  children[first] = updateChildNode(children[first], rest, updater);
  return { ...item, ChildItems: { Item: children } };
}

/** Заменяет узел по пути path результатом updater(узел). */
function updateNodeAtPath(
  list: PredefinedDataItem[],
  path: number[],
  updater: (node: PredefinedDataItem) => PredefinedDataItem
): PredefinedDataItem[] {
  if (path.length === 0) return list;
  const [first, ...rest] = path;
  const next = [...list];
  if (first < 0 || first >= next.length) return list;
  if (rest.length === 0) {
    next[first] = updater(next[first]);
    return next;
  }
  next[first] = updateChildNode(next[first], rest, updater);
  return next;
}

/**
 * Вставляет новый элемент как дочерний для узла parentPath.
 * parentPath === [] — в корень PredefinedData (Parent = «Счета», как в парсере).
 */
export function insertItemUnderParent(
  roots: PredefinedDataItem[],
  parentPath: number[],
  newItem: PredefinedDataItem
): PredefinedDataItem[] {
  if (parentPath.length === 0) {
    return [...roots, { ...newItem, Parent: 'Счета' }];
  }
  const parent = getItemAtPath(roots, parentPath);
  if (!parent) return roots;
  const child: PredefinedDataItem = { ...newItem, Parent: parent.Name };
  return updateNodeAtPath(roots, parentPath, (p) => ({
    ...p,
    ChildItems: { Item: [...(p.ChildItems?.Item ?? []), child] }
  }));
}

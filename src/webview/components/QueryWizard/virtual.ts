/**
 * Разбор и сборка аргументов виртуальной таблицы для диалога конструктора.
 */

import {
  getVirtualTableParams,
  type VirtualTableFamily,
  type VirtualTableKind,
  type VirtualTableParamValues,
} from '../DcsEditor/VirtualTableParamsModal';

const FAMILIES: Record<string, VirtualTableFamily> = {
  РегистрНакопления: 'AccumulationRegister',
  РегистрСведений: 'InformationRegister',
  РегистрБухгалтерии: 'AccountingRegister',
  РегистрРасчета: 'CalculationRegister',
};

const KINDS: VirtualTableKind[] = [
  'Обороты',
  'Остатки',
  'ОстаткиИОбороты',
  'ОборотыДтКт',
  'ДвиженияССубконто',
  'СрезПоследних',
  'СрезПервых',
  'Движения',
  'ПериодДействия',
  'ДанныеГрафика',
  'ФактическийПериодДействия',
];

export interface VirtualTableRef {
  family: VirtualTableFamily;
  kind: VirtualTableKind;
  args: string;
  head: string;
}

/** Возвращает описание виртуальной таблицы, если имя источника на неё указывает. */
export function detectVirtualTable(tableName: string): VirtualTableRef | null {
  const open = tableName.indexOf('(');
  if (open < 0) return null;
  const head = tableName.slice(0, open);
  const parts = head.split('.');
  if (parts.length < 3) return null;
  const kind = parts[parts.length - 1] as VirtualTableKind;
  const family = FAMILIES[parts[0] || ''];
  if (!family || KINDS.indexOf(kind) < 0) return null;
  const close = tableName.lastIndexOf(')');
  const args = close > open ? tableName.slice(open + 1, close) : '';
  return { family, kind, args, head };
}

/** Дописывает закрывающую скобку у вставки из дерева метаданных. */
export function normalizeTableName(insertText: string): string {
  const text = insertText.trim();
  if (text.endsWith('(')) return `${text})`;
  return text;
}

function splitArgsTopLevel(src: string): string[] {
  const out: string[] = [];
  let start = 0;
  let depth = 0;
  let inString = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src.charAt(i);
    const next = src.charAt(i + 1);
    if (inString) {
      if (ch === '"' && next === '"') {
        i += 1;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      out.push(src.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(src.slice(start).trim());
  return out;
}

/** Начальные значения диалога параметров по тексту аргументов. */
export function initialVirtualValues(ref: VirtualTableRef): Partial<VirtualTableParamValues> {
  const defs = getVirtualTableParams(ref.family, ref.kind);
  const args = splitArgsTopLevel(ref.args);
  const out: Partial<VirtualTableParamValues> = {};
  defs.forEach((def, index) => {
    const raw = String(args[index] || '').trim();
    out[def.id] = raw === 'НЕОПРЕДЕЛЕНО' ? '' : raw;
  });
  return out;
}

/** Собирает строку аргументов и отбрасывает пустой хвост. */
export function formatVirtualArgs(ref: VirtualTableRef, values: VirtualTableParamValues): string {
  const defs = getVirtualTableParams(ref.family, ref.kind);
  const parts = defs.map((def) => String(values[def.id] || '').trim());
  while (parts.length && !parts[parts.length - 1]) parts.pop();
  return `${ref.head}(${parts.join(', ')})`;
}

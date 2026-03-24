/**
 * Извлечение значений свойств Form.xml для визуального дизайнера.
 * Учитывает строки 1С (true/false), вложенные обёртки xr:Common и т.п.
 */

/** Максимум «условных px» для превью (не WYSIWYG 1:1 с конфигуратором). */
export const DESIGNER_LAYOUT_MAX_PX = 1200;

/**
 * Скаляр из произвольного значения, как его кладёт formParserXmldom.
 */
export function scalarFromUnknown(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    for (const v of val) {
      const s = scalarFromUnknown(v);
      if (s.trim()) return s;
    }
    return '';
  }
  if (typeof val === 'object') {
    const v = val as Record<string, unknown>;
    const direct = v.text ?? v['#text'] ?? v.content ?? v['v8:content'] ?? v.Value ?? v['v8:Value'];
    if (direct !== undefined && direct !== null) return scalarFromUnknown(direct);
    const wrap = v['xr:Common'] ?? v['xr:Value'] ?? v.Common ?? v.Value;
    if (wrap !== undefined && wrap !== null) return scalarFromUnknown(wrap);
    return '';
  }
  return String(val);
}

export function readLayoutProp(props: Record<string, unknown> | null | undefined, key: string): string {
  if (!props || !(key in props)) return '';
  return scalarFromUnknown((props as any)[key]);
}

/**
 * Явно заданное логическое «ложь» (для Visible, Header и т.д.).
 * Отсутствие свойства — не ложь.
 */
export function isExplicitlyFalseOneC(val: unknown): boolean {
  if (val === false) return true;
  if (val === 'false' || val === 'False' || val === 'FALSE') return true;
  const s = scalarFromUnknown(val).trim().toLowerCase();
  if (s === 'false' || s === '0' || s === 'no' || s === 'нет' || s === 'ложь') return true;
  return false;
}

/**
 * Явно заданное логическое «истина».
 */
export function isExplicitlyTrueOneC(val: unknown): boolean {
  if (val === true) return true;
  if (val === 'true' || val === 'True' || val === 'TRUE') return true;
  const s = scalarFromUnknown(val).trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes' || s === 'да' || s === 'истина') return true;
  return false;
}

/** Элемент скрыт в превью: Visible или UserVisible явно false. */
export function isLayoutInvisible(props: Record<string, unknown> | null | undefined): boolean {
  if (!props) return false;
  return isExplicitlyFalseOneC((props as any).Visible) || isExplicitlyFalseOneC((props as any).UserVisible);
}

/** Поле только для чтения / пропуск ввода — визуальный стиль в дизайнере. */
export function isLayoutReadOnly(props: Record<string, unknown> | null | undefined): boolean {
  if (!props) return false;
  return isExplicitlyTrueOneC((props as any).ReadOnly) || isExplicitlyTrueOneC((props as any).SkipOnInput);
}

export function readLayoutNumber(props: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const s = readLayoutProp(props, key).trim();
  if (!s) return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Число для CSS с ограничением (ширина/высота превью).
 */
export function readLayoutPx(props: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const n = readLayoutNumber(props, key);
  if (n === undefined) return undefined;
  return Math.min(Math.max(0, n), DESIGNER_LAYOUT_MAX_PX);
}

export type DesignerTitleLocation = 'top' | 'left' | 'none' | 'other';

/**
 * TitleLocation из Form.xml: Top, Left, None, Right, Bottom…
 */
export function parseTitleLocation(props: Record<string, unknown> | null | undefined): DesignerTitleLocation {
  const raw = readLayoutProp(props, 'TitleLocation').trim();
  if (!raw) return 'top';
  const s = raw.toLowerCase();
  if (s === 'none' || s === 'нет') return 'none';
  if (s === 'left' || s === 'лева') return 'left';
  if (s === 'top' || s === 'верх' || s === 'начало') return 'top';
  return 'other';
}

/** Показывать шапку таблицы (колонки). По умолчанию true, если Header не задан явно как false. */
export function tableShowsHeader(props: Record<string, unknown> | null | undefined): boolean {
  if (!props) return true;
  if (isExplicitlyFalseOneC((props as any).Header)) return false;
  return true;
}

export function tableHorizontalLines(props: Record<string, unknown> | null | undefined): boolean {
  if (!props) return true;
  if (isExplicitlyFalseOneC((props as any).HorizontalLines)) return false;
  return true;
}

export function tableVerticalLines(props: Record<string, unknown> | null | undefined): boolean {
  if (!props) return true;
  if (isExplicitlyFalseOneC((props as any).VerticalLines)) return false;
  return true;
}

/** Есть ли блок добавления (поиск / статус / управление поиском) для отображения полосы-заглушки. */
export function hasTableAdditionPlaceholder(props: Record<string, unknown> | null | undefined): {
  search: boolean;
  status: boolean;
  control: boolean;
} {
  if (!props) {
    return { search: false, status: false, control: false };
  }
  const p = props as Record<string, unknown>;
  return {
    search: p.SearchStringAddition !== undefined && p.SearchStringAddition !== null,
    status: p.ViewStatusAddition !== undefined && p.ViewStatusAddition !== null,
    control: p.SearchControlAddition !== undefined && p.SearchControlAddition !== null,
  };
}

/**
 * Горизонтальное растягивание: true если явно true или значение вроде true.
 */
export function isHorizontalStretchTrue(props: Record<string, unknown> | null | undefined): boolean {
  if (!props) return false;
  return isExplicitlyTrueOneC((props as any).HorizontalStretch);
}

/** Стили корневой карточки таблицы в превью (условные px, не 1:1 с платформой). */
export function buildTablePreviewStyle(
  props: Record<string, unknown> | null | undefined
): { maxWidth?: string; minHeight?: string } {
  if (!props) return {};
  const w = readLayoutPx(props, 'Width');
  const maxW = readLayoutPx(props, 'MaxWidth');
  const autoMax = isExplicitlyTrueOneC((props as any).AutoMaxWidth);
  let effMax: number | undefined;
  if (maxW !== undefined) effMax = maxW;
  else if (w !== undefined) effMax = w;
  if (autoMax && effMax === undefined) effMax = DESIGNER_LAYOUT_MAX_PX;
  const h = readLayoutPx(props, 'Height');
  const out: { maxWidth?: string; minHeight?: string } = {};
  if (effMax !== undefined) out.maxWidth = `${effMax}px`;
  if (h !== undefined) out.minHeight = `${h}px`;
  return out;
}

/** Стили превью поля: ширина и растягивание по горизонтали. */
export function buildFieldPreviewStyle(
  props: Record<string, unknown> | null | undefined
): { maxWidth?: string; width?: string; flex?: string } {
  if (!props) return {};
  const w = readLayoutPx(props, 'Width');
  const maxW = readLayoutPx(props, 'MaxWidth');
  const stretch = isHorizontalStretchTrue(props);
  const out: { maxWidth?: string; width?: string; flex?: string } = {};
  if (maxW !== undefined) out.maxWidth = `${maxW}px`;
  else if (w !== undefined) out.maxWidth = `${w}px`;
  if (stretch) {
    out.flex = '1 1 200px';
    out.width = '100%';
  } else if (w !== undefined) {
    out.width = `${w}px`;
  }
  return out;
}

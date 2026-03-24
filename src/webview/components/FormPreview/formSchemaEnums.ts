/**
 * Перечисления значений свойств Form.xml (файл resources/xsd/XcfLogForm.enums.json).
 */

export type FormSchemaEnumsPayload = {
  byProperty: Record<string, string[]>;
  byParentProperty?: Record<string, Record<string, string[]>>;
};

/**
 * Варианты для выпадающего списка: сначала по типу родителя, иначе общий список по имени свойства.
 */
export function resolvePropertyEnumOptions(
  propertyKey: string,
  parentElementType: string | undefined,
  enums: FormSchemaEnumsPayload | undefined
): string[] | undefined {
  if (!enums?.byProperty || typeof enums.byProperty !== 'object') return undefined;
  const byParent = enums.byParentProperty?.[parentElementType || '']?.[propertyKey];
  const list = byParent ?? enums.byProperty[propertyKey];
  return Array.isArray(list) && list.length > 0 ? [...list] : undefined;
}

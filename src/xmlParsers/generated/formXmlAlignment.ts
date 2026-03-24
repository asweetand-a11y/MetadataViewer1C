/**
 * Автогенерация: node scripts/generateFormXmlAlignment.mjs
 * Источник: resources/xsd/XcfLogForm.json
 *
 * Локальные имена элементов логической формы 1С, у которых в XSD заданы
 * атрибуты name и/или id. Значения не должны дублироваться дочерними <name>/<id>.
 */
export const LOG_FORM_TAGS_NAME_OR_ID_AS_XML_ATTRIBUTES: ReadonlySet<string> = new Set<string>([
  'Attribute',
  'AutoCommandBar',
  'Button',
  'ButtonGroup',
  'CalendarField',
  'ChartField',
  'CheckBoxField',
  'Column',
  'ColumnGroup',
  'Command',
  'CommandBar',
  'ContextMenu',
  'Event',
  'ExtendedTooltip',
  'FormattedDocumentField',
  'GraphicalSchemaField',
  'HTMLDocumentField',
  'InputField',
  'LabelDecoration',
  'LabelField',
  'PDFDocumentField',
  'Page',
  'Pages',
  'PeriodField',
  'PictureDecoration',
  'PictureField',
  'PlannerField',
  'Popup',
  'ProgressBarField',
  'RadioButtonField',
  'SearchControlAddition',
  'SearchStringAddition',
  'SpreadSheetDocumentField',
  'Table',
  'TextDocumentField',
  'TrackBarField',
  'UsualGroup',
  'ViewStatusAddition',
]);

export function logFormTagUsesNameOrIdAsXmlAttributes(tagName: string): boolean {
  return LOG_FORM_TAGS_NAME_OR_ID_AS_XML_ATTRIBUTES.has(tagName);
}

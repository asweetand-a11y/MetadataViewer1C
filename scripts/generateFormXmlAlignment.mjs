/**
 * Строит src/xmlParsers/generated/formXmlAlignment.ts из resources/xsd/XcfLogForm.json:
 * теги, у которых в схеме name и/или id — XML-атрибуты (не дочерние элементы).
 *
 * Запуск: node scripts/generateFormXmlAlignment.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const schemaPath = path.join(root, 'resources', 'xsd', 'XcfLogForm.json');
const outPath = path.join(root, 'src', 'xmlParsers', 'generated', 'formXmlAlignment.ts');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const tags = [];
for (const [elName, def] of Object.entries(schema.elements || {})) {
  const attrs = def?.attributes;
  if (!Array.isArray(attrs)) continue;
  const names = new Set(attrs.map((a) => a?.name).filter(Boolean));
  if (names.has('name') || names.has('id')) {
    tags.push(elName);
  }
}
tags.sort();

const body = tags.map((t) => `  '${t.replace(/'/g, "\\'")}',`).join('\n');

const file = `/**
 * Автогенерация: node scripts/generateFormXmlAlignment.mjs
 * Источник: resources/xsd/XcfLogForm.json
 *
 * Локальные имена элементов логической формы 1С, у которых в XSD заданы
 * атрибуты name и/или id. Значения не должны дублироваться дочерними <name>/<id>.
 */
export const LOG_FORM_TAGS_NAME_OR_ID_AS_XML_ATTRIBUTES: ReadonlySet<string> = new Set<string>([
${body}
]);

export function logFormTagUsesNameOrIdAsXmlAttributes(tagName: string): boolean {
  return LOG_FORM_TAGS_NAME_OR_ID_AS_XML_ATTRIBUTES.has(tagName);
}
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, file, 'utf8');
console.log(`Wrote ${tags.length} tags -> ${path.relative(root, outPath)}`);

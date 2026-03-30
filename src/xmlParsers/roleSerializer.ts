/**
 * Сериализатор прав роли 1С в формат Rights.xml
 * Формат: http://v8.1c.ru/8.2/roles
 */

import { ParsedRoleRights, RoleObject, RoleRight, RoleRestrictionTemplate } from './roleParser';

/**
 * Экранирует специальные символы XML в текстовом содержимом
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Сериализует права роли в XML строку
 */
export function serializeRoleRightsXml(rights: ParsedRoleRights): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    '<Rights xmlns="http://v8.1c.ru/8.2/roles"' +
    ' xmlns:xs="http://www.w3.org/2001/XMLSchema"' +
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
    ' xsi:type="Rights" version="2.20">'
  );

  lines.push(`\t<setForNewObjects>${rights.setForNewObjects}</setForNewObjects>`);
  lines.push(`\t<setForAttributesByDefault>${rights.setForAttributesByDefault}</setForAttributesByDefault>`);
  lines.push(`\t<independentRightsOfChildObjects>${rights.independentRightsOfChildObjects}</independentRightsOfChildObjects>`);

  // Шаблоны ограничений
  for (const tmpl of rights.restrictionTemplates) {
    lines.push('\t<restrictionTemplate>');
    lines.push(`\t\t<name>${escapeXml(tmpl.name)}</name>`);
    lines.push(`\t\t<condition>${escapeXml(tmpl.condition)}</condition>`);
    lines.push('\t</restrictionTemplate>');
  }

  // Объекты с правами
  for (const obj of rights.objects) {
    lines.push('\t<object>');
    lines.push(`\t\t<name>${escapeXml(obj.name)}</name>`);

    for (const right of obj.rights) {
      lines.push('\t\t<right>');
      lines.push(`\t\t\t<name>${escapeXml(right.name)}</name>`);
      lines.push(`\t\t\t<value>${right.value}</value>`);

      if (right.restrictionByCondition) {
        lines.push('\t\t\t<restrictionByCondition>');
        lines.push(`\t\t\t\t<condition>${escapeXml(right.restrictionByCondition.condition)}</condition>`);
        if (right.restrictionByCondition.field) {
          lines.push(`\t\t\t\t<field>${escapeXml(right.restrictionByCondition.field)}</field>`);
        }
        lines.push('\t\t\t</restrictionByCondition>');
      }

      lines.push('\t\t</right>');
    }

    lines.push('\t</object>');
  }

  lines.push('</Rights>');

  return lines.join('\n');
}

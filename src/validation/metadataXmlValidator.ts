/**
 * Валидация XML метаданных 1С для проверки совместимости с XDTO при загрузке.
 * Проверяет типичные причины ошибок "нарушение XDTO".
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateXML } from '../utils/xmlUtils';
import { validateXmlStructure } from './xmlStructureValidator';

export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Проверки, специфичные для 1С XDTO:
 * - Кодировка UTF-8
 * - Отсутствие BOM
 * - Обязательные namespace (xr, v8 для InternalInfo)
 * - Формат version (decimal)
 * - Формат UUID
 */
function checkXDtoCompatibility(xmlContent: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // BOM — 1С может некорректно обработать
  if (xmlContent.charCodeAt(0) === 0xfeff) {
    warnings.push('Обнаружен BOM (Byte Order Mark) в начале файла. Рекомендуется сохранять без BOM.');
  }

  // Проверка декларации encoding
  const declMatch = xmlContent.match(/<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i);
  if (declMatch && declMatch[1].toUpperCase() !== 'UTF-8') {
    warnings.push(`Кодировка ${declMatch[1]}. Для загрузки в 1С рекомендуется UTF-8.`);
  }

  // MetaDataObject должен иметь атрибут version
  if (xmlContent.includes('<MetaDataObject') && !xmlContent.match(/<MetaDataObject[^>]*version\s*=/)) {
    errors.push('MetaDataObject: отсутствует обязательный атрибут version.');
  }

  // version должен быть decimal (например 2.20)
  const versionMatch = xmlContent.match(/<MetaDataObject[^>]*version\s*=\s*["']([^"']+)["']/);
  if (versionMatch) {
    const v = versionMatch[1];
    if (!/^\d+(\.\d+)?$/.test(v)) {
      errors.push(`MetaDataObject: атрибут version="${v}" должен быть числом (например 2.20).`);
    }
  }

  // xr:GeneratedType должен иметь атрибуты name и category
  const gtMatches = xmlContent.matchAll(/<xr:GeneratedType([^>]*)>/g);
  for (const m of gtMatches) {
    const attrs = m[1];
    if (!attrs.includes('name=')) {
      errors.push('xr:GeneratedType: отсутствует обязательный атрибут name.');
    }
    if (!attrs.includes('category=')) {
      errors.push('xr:GeneratedType: отсутствует обязательный атрибут category.');
    }
  }

  // Проверка формата UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const uuids = xmlContent.match(uuidRegex) || [];
  for (const u of uuids) {
    if (u.length !== 36) {
      errors.push(`Некорректный формат UUID: ${u}`);
    }
  }

  // Если используются xr: или v8: без объявления namespace — может быть ошибка XDTO
  if ((xmlContent.includes('<xr:') || xmlContent.includes('</xr:')) && !xmlContent.includes('xmlns:xr=')) {
    warnings.push('Используются элементы xr:*, но namespace xmlns:xr не объявлен');
  }
  if (xmlContent.includes('<v8:') && !xmlContent.includes('xmlns:v8=')) {
    warnings.push('Используются элементы v8:*, но namespace xmlns:v8 не объявлен');
  }

  // HierarchyType: допустимы только HierarchyFoldersAndItems и HierarchyOfItems (не HierarchyItems)
  if (xmlContent.includes('<HierarchyType>HierarchyItems</HierarchyType>')) {
    errors.push('HierarchyType: неверное значение "HierarchyItems". Используйте "HierarchyOfItems".');
  }

  return { errors, warnings };
}

/**
 * Полная валидация XML файла метаданных
 */
export function validateMetadataXmlFile(
  filePath: string,
  extensionPath: string
): MetadataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`Файл не найден: ${filePath}`], warnings: [] };
  }

  let xmlContent: string;
  try {
    xmlContent = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return {
      valid: false,
      errors: [`Ошибка чтения файла: ${e instanceof Error ? e.message : String(e)}`],
      warnings: [],
    };
  }

  // 1. Базовая валидация XML
  const xmlResult = validateXML(xmlContent);
  if (!xmlResult.valid) {
    errors.push(xmlResult.error || 'Ошибка валидации XML');
  }

  // 2. Проверки XDTO
  const xdto = checkXDtoCompatibility(xmlContent);
  errors.push(...xdto.errors);
  warnings.push(...xdto.warnings);

  // 3. Валидация структуры по схеме (только для MetaDataObject)
  const rootTag = xmlContent.match(/<([^\s/>!?][^\s/>]*)/)?.[1] || '';
  if (rootTag.includes('MetaDataObject') || rootTag === 'MetaDataObject') {
    const xmlObjectType = filePath.includes('/Catalogs/') ? 'Catalog' :
      filePath.includes('/Documents/') ? 'Document' :
      filePath.includes('/Reports/') ? 'Report' : undefined;
    const structureResult = validateXmlStructure(xmlContent, {
      extensionPath,
      filePath,
      xmlObjectType,
      rootTag: 'MetaDataObject',
    });
    if (!structureResult.valid && structureResult.errors) {
      errors.push(...structureResult.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Валидация содержимого XML по тем же правилам, что при сохранении из редактора метаданных / формы:
 * well-formed XML, для MetaDataObject — проверки XDTO, при включённой настройке — структура по JSON-схеме.
 */
export function validateCommittedXmlContent(
  filePath: string,
  extensionPath: string,
  xmlContent: string,
  structureValidationEnabled: boolean
): string[] {
  const errors: string[] = [];
  const xmlRes = validateXML(xmlContent);
  if (!xmlRes.valid) {
    errors.push(xmlRes.error || 'Ошибка валидации XML');
    return errors;
  }

  const rootTagMatch = xmlContent.match(/<([^\s/>!?][^\s/>]*)/);
  const rootTag = rootTagMatch?.[1] || '';
  const fp = filePath.replace(/\\/g, '/');

  const isMetaDataObject =
    rootTag === 'MetaDataObject' || rootTag.endsWith(':MetaDataObject');

  if (isMetaDataObject) {
    const xdto = checkXDtoCompatibility(xmlContent);
    errors.push(...xdto.errors);
  }

  if (!structureValidationEnabled) {
    return errors;
  }

  let xmlObjectType: string | undefined;
  if (isMetaDataObject) {
    xmlObjectType = fp.includes('/Catalogs/')
      ? 'Catalog'
      : fp.includes('/Documents/')
        ? 'Document'
        : fp.includes('/Reports/')
          ? 'Report'
          : undefined;
  }

  const structureResult = validateXmlStructure(xmlContent, {
    extensionPath,
    filePath,
    xmlObjectType,
    rootTag: isMetaDataObject
      ? 'MetaDataObject'
      : rootTag === 'Form' || rootTag.endsWith(':Form')
        ? 'Form'
        : undefined,
  });

  if (!structureResult.valid && structureResult.errors?.length) {
    errors.push(...structureResult.errors);
  }

  return errors;
}

/**
 * Валидация структуры XML по JSON-схеме (предсгенерированной из XSD).
 * Использует fast-xml-parser для парсинга, проверяет допустимые дочерние элементы.
 */

import { createXMLParser } from '../utils/xmlUtils';
import { loadJsonSchema, type JsonSchemaDefinition } from './schemaLoader';
import { getJsonSchemaNameForXml, type SchemaContext } from './schemaMapping';

export interface StructureValidationResult {
    valid: boolean;
    errors?: string[];
}

const ATTR_PREFIX = '@';
const TEXT_KEY = '#text';

/**
 * Извлекает локальное имя элемента (без namespace-префикса).
 * Схема использует локальные имена (settings, item, structure), а fast-xml-parser
 * возвращает полные имена с префиксами (dcsset:settings, dcsset:item).
 */
function toLocalName(name: string): string {
    const idx = String(name || '').lastIndexOf(':');
    return idx >= 0 ? name.slice(idx + 1) : name;
}

/**
 * Валидирует XML по структуре JSON-схемы
 * @param xmlContent - XML строка
 * @param schemaContext - контекст (filePath, xmlObjectType, rootTag)
 * @param extensionPath - путь к расширению для загрузки схемы
 * @returns результат валидации
 */
export function validateXmlStructure(
    xmlContent: string,
    schemaContext: SchemaContext & { extensionPath: string }
): StructureValidationResult {
    const schemaName = getJsonSchemaNameForXml(xmlContent, schemaContext);
    if (!schemaName) {
        return { valid: true };
    }

    const schema = loadJsonSchema(schemaContext.extensionPath, schemaName);
    if (!schema) {
        return { valid: true };
    }

    const errors: string[] = [];
    const parser = createXMLParser();
    let parsed: Record<string, unknown>;

    try {
        parsed = parser.parse(xmlContent) as Record<string, unknown>;
    } catch (e) {
        return { valid: false, errors: [`Ошибка парсинга XML: ${e instanceof Error ? e.message : String(e)}`] };
    }

    if (!parsed || typeof parsed !== 'object') {
        return { valid: false, errors: ['XML не распознан как объект'] };
    }

    const rootKeys = Object.keys(parsed).filter(k => {
        if (k.startsWith(ATTR_PREFIX) || k === TEXT_KEY) return false;
        if (k === '?xml' || k.startsWith('?')) return false;
        if (k === 'xmlns' || k.startsWith('xmlns:')) return false;
        return true;
    });
    const rootKey = rootKeys[0];
    if (!rootKey) {
        return { valid: false, errors: ['Корневой элемент не найден'] };
    }

    const rootLocal = toLocalName(rootKey);
    if (!schema.roots.includes(rootLocal) && !schema.roots.includes(rootKey)) {
        errors.push(`Корневой элемент "${rootKey}" не входит в допустимые: ${schema.roots.slice(0, 5).join(', ')}...`);
    }

    validateElement(rootKey, parsed[rootKey], schema, '', errors);

    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}

function validateElement(
    elementName: string,
    value: unknown,
    schema: JsonSchemaDefinition,
    path: string,
    errors: string[]
): void {
    const elementLocal = toLocalName(elementName);
    const def = schema.elements[elementLocal] ?? schema.elements[elementName];
    if (!def) return;

    if (def.simpleType || def.allowAny) return;

    if (value === null || value === undefined) return;
    if (typeof value !== 'object') return;

    const obj = value as Record<string, unknown>;
    const childKeys = Object.keys(obj).filter(k => {
        if (k.startsWith(ATTR_PREFIX) || k === TEXT_KEY) return false;
        if (k === 'xmlns' || k.startsWith('xmlns:')) return false;
        return true;
    });

    const childCount: Record<string, number> = {};
    for (const key of childKeys) {
        const localKey = toLocalName(key);
        childCount[localKey] = (childCount[localKey] ?? 0) + 1;
    }

    for (const childName of childKeys) {
        const count = childCount[toLocalName(childName)] ?? 0;
        const childLocal = toLocalName(childName);
        const isKnownChild = def.children.includes(childLocal);
        if (!isKnownChild) {
            // Схема может быть неполной (xs:any, разные контексты). Ошибку только если
            // элемент не описан в схеме вообще.
            if (!schema.elements[childLocal] && !schema.elements[childName]) {
                errors.push(`${path}${elementName}: недопустимый дочерний элемент "${childName}"`);
            }
        } else {
            const min = def.childMin[childLocal] ?? 0;
            const max = def.childMax[childLocal] ?? -1;
            if (min > 0 && count < min) {
                errors.push(`${path}${elementName}/${childName}: ожидается минимум ${min}, найдено ${count}`);
            }
            if (max >= 0 && count > max) {
                errors.push(`${path}${elementName}/${childName}: ожидается максимум ${max}, найдено ${count}`);
            }
        }
    }

    for (const childName of def.children) {
        const min = def.childMin[childName] ?? 0;
        const count = childKeys.reduce((sum, k) => sum + (toLocalName(k) === childName ? 1 : 0), 0);
        if (min > 0 && count < min) {
            errors.push(`${path}${elementName}: обязательный элемент "${childName}" отсутствует (minOccurs=${min})`);
        }
    }

    for (const childName of childKeys) {
        const childVal = obj[childName];
        const childLocal = toLocalName(childName);
        const childSchema = schema.elements[childLocal] ?? schema.elements[childName];
        if (!childSchema || childSchema.simpleType) continue;

        if (Array.isArray(childVal)) {
            for (let i = 0; i < childVal.length; i++) {
                validateElement(childName, childVal[i], schema, `${path}${elementName}/`, errors);
            }
        } else {
            validateElement(childName, childVal, schema, `${path}${elementName}/`, errors);
        }
    }
}

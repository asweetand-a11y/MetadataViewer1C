/**
 * Загрузка предсгенерированных JSON-схем из resources/xsd/.
 * Доступ только через extensionPath — схемы не экспортируются.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface JsonSchemaDefinition {
    roots: string[];
    elements: Record<string, {
        children: string[];
        childMin: Record<string, number>;
        childMax: Record<string, number>;
        allowAny: boolean;
        simpleType?: boolean;
    }>;
    source?: string;
}

const schemaCache = new Map<string, JsonSchemaDefinition>();

/**
 * Загружает JSON-схему по имени файла
 * @param extensionPath - путь к расширению (extensionUri.fsPath)
 * @param schemaFileName - имя файла (например, MDClasses.json)
 * @returns схема или null если не найдена
 */
export function loadJsonSchema(
    extensionPath: string,
    schemaFileName: string
): JsonSchemaDefinition | null {
    const cacheKey = `${extensionPath}:${schemaFileName}`;
    const cached = schemaCache.get(cacheKey);
    if (cached) return cached;

    const schemaPath = path.join(extensionPath, 'resources', 'xsd', schemaFileName);
    if (!fs.existsSync(schemaPath)) return null;

    try {
        const content = fs.readFileSync(schemaPath, 'utf8');
        const schema = JSON.parse(content) as JsonSchemaDefinition;
        schemaCache.set(cacheKey, schema);
        return schema;
    } catch {
        return null;
    }
}

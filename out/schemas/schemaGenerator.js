"use strict";
/**
 * Генератор JSON Schema на основе XML структуры
 * Автоматически создает схемы для неизвестных типов объектов
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSchemaCache = exports.generateSchema = void 0;
const baseSchema_1 = require("./baseSchema");
const objectSchemas_1 = require("./objectSchemas");
/**
 * Кэш сгенерированных схем
 */
const schemaCache = new Map();
/**
 * Рекурсивно генерирует JSON Schema из объекта
 */
function generateSchemaFromObject(obj, path = '') {
    if (obj === null || obj === undefined) {
        return { type: 'null' };
    }
    if (typeof obj === 'string') {
        return { type: 'string' };
    }
    if (typeof obj === 'number') {
        return { type: 'number' };
    }
    if (typeof obj === 'boolean') {
        return { type: 'boolean' };
    }
    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            return { type: 'array', items: {} };
        }
        // Берем схему первого элемента
        const itemSchema = generateSchemaFromObject(obj[0], `${path}[]`);
        return {
            type: 'array',
            items: itemSchema
        };
    }
    if (typeof obj === 'object') {
        const properties = {};
        const required = [];
        for (const [key, value] of Object.entries(obj)) {
            // Пропускаем служебные поля
            if (key.startsWith('@') || key === 'text' || key === '#text') {
                continue;
            }
            const cleanKey = key.includes(':') ? key.split(':')[1] : key;
            const valuePath = path ? `${path}.${cleanKey}` : cleanKey;
            // Специальная обработка для известных полей
            if (cleanKey === 'Name') {
                properties[cleanKey] = { type: 'string', title: 'Имя' };
                required.push(cleanKey);
                continue;
            }
            if (cleanKey === 'Comment') {
                properties[cleanKey] = { type: 'string', title: 'Комментарий' };
                continue;
            }
            if (cleanKey === 'Synonym' || cleanKey === 'ToolTip') {
                properties[cleanKey] = {
                    oneOf: [
                        { type: 'string' },
                        {
                            type: 'object',
                            properties: {
                                'v8:item': {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            'v8:lang': { type: 'string' },
                                            'v8:content': { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    title: cleanKey === 'Synonym' ? 'Синоним' : 'Подсказка'
                };
                continue;
            }
            // Рекурсивно генерируем схему для вложенных объектов
            properties[cleanKey] = generateSchemaFromObject(value, valuePath);
        }
        return {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined
        };
    }
    return { type: 'string' };
}
/**
 * Генерирует JSON Schema для объекта метаданных на основе его XML структуры
 */
function generateSchema(objectType, xmlData) {
    const cacheKey = `${objectType}:${JSON.stringify(Object.keys(xmlData.properties || {}).sort())}`;
    // Проверяем кэш
    if (schemaCache.has(cacheKey)) {
        return schemaCache.get(cacheKey);
    }
    // Готовая схема или базовые свойства.
    let schema = (0, objectSchemas_1.getSchemaForObjectType)(objectType);
    // Поля из XML, которых нет в схеме, добавляем, чтобы узкая схема их не прятала.
    if (xmlData.properties) {
        const generatedSchema = generateSchemaFromObject(xmlData.properties);
        const generatedProps = (generatedSchema.properties ?? {});
        const known = (schema.properties ?? {});
        if (schema === baseSchema_1.basePropertiesSchema) {
            schema = {
                ...baseSchema_1.basePropertiesSchema,
                properties: {
                    ...baseSchema_1.basePropertiesSchema.properties,
                    ...generatedProps
                }
            };
        }
        else {
            const extra = {};
            for (const [key, value] of Object.entries(generatedProps)) {
                if (!(key in known)) {
                    extra[key] = value;
                }
            }
            if (Object.keys(extra).length > 0) {
                schema = {
                    ...schema,
                    properties: {
                        ...known,
                        ...extra
                    }
                };
            }
        }
    }
    // Кэшируем результат
    schemaCache.set(cacheKey, schema);
    return schema;
}
exports.generateSchema = generateSchema;
/**
 * Очистить кэш схем
 */
function clearSchemaCache() {
    schemaCache.clear();
}
exports.clearSchemaCache = clearSchemaCache;
//# sourceMappingURL=schemaGenerator.js.map
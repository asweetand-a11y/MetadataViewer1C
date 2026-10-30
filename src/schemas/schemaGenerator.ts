/**
 * Генератор JSON Schema на основе XML структуры
 * Автоматически создает схемы для неизвестных типов объектов
 */

import { JSONSchema7 } from 'json-schema';
import { basePropertiesSchema } from './baseSchema';
import { getSchemaForObjectType } from './objectSchemas';

/**
 * Кэш сгенерированных схем
 */
const schemaCache = new Map<string, JSONSchema7>();

/**
 * Рекурсивно генерирует JSON Schema из объекта
 */
function generateSchemaFromObject(obj: any, path: string = ''): JSONSchema7 {
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
    const properties: Record<string, JSONSchema7> = {};
    const required: string[] = [];

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
export function generateSchema(objectType: string, xmlData: any): JSONSchema7 {
  const cacheKey = `${objectType}:${JSON.stringify(Object.keys(xmlData.properties || {}).sort())}`;
  
  // Проверяем кэш
  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!;
  }

  // Готовая схема или базовые свойства.
  let schema = getSchemaForObjectType(objectType);

  // Поля из XML, которых нет в схеме, добавляем, чтобы узкая схема их не прятала.
  if (xmlData.properties) {
    const generatedSchema = generateSchemaFromObject(xmlData.properties);
    const generatedProps = (generatedSchema.properties ?? {}) as Record<string, JSONSchema7>;
    const known = (schema.properties ?? {}) as Record<string, JSONSchema7>;
    if (schema === basePropertiesSchema) {
      schema = {
        ...basePropertiesSchema,
        properties: {
          ...basePropertiesSchema.properties,
          ...generatedProps
        }
      };
    } else {
      const extra: Record<string, JSONSchema7> = {};
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

/**
 * Очистить кэш схем
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}


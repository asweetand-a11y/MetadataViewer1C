import * as monaco from 'monaco-editor';
import { registerQueryLanguage } from '../queryLanguage/register';

let completionRegistered = false;
let hoverRegistered = false;

let suggestWidgetPatchInstalled = false;

function installSuggestWidgetPatch(): void {
  if (suggestWidgetPatchInstalled) return;
  suggestWidgetPatchInstalled = true;

  // 1) Inject global CSS with !important
  const style = document.createElement('style');
  style.textContent = `
    .suggest-widget .monaco-list-row,
    .suggest-widget .monaco-list-row *,
    .suggest-widget .monaco-icon-label,
    .suggest-widget .monaco-icon-label *,
    .suggest-widget .label-name,
    .suggest-widget .monaco-highlighted-label {
      color: rgba(255,255,255,0.92) !important;
      font-size: 13px !important;
      line-height: 18px !important;
      opacity: 1 !important;
      visibility: visible !important;
      -webkit-text-fill-color: rgba(255,255,255,0.92) !important;
      display: inline-block !important;
      min-width: 20px !important;
    }
    .suggest-widget {
      background: #252526 !important;
    }
    .suggest-widget .monaco-icon-label::before {
      margin-right: 4px !important;
    }
  `;
  document.head.appendChild(style);
  console.log('[1CQueryCompletion] CSS patch injected into <head>');

  // 2) Inline-style patch with setInterval
  let patchCount = 0;
  const apply = (root: Element) => {
    const widget = root.matches?.('.suggest-widget') ? root : root.querySelector?.('.suggest-widget');
    if (!widget) return;

    patchCount++;
    console.log(`[1CQueryCompletion] Patching suggest-widget #${patchCount}`);
    
    // Log first row structure for debugging
    const firstRow = widget.querySelector('.monaco-list-row');
    if (firstRow && patchCount === 1) {
      console.log('[1CQueryCompletion] First row HTML:', firstRow.outerHTML.substring(0, 500));
      console.log('[1CQueryCompletion] First row textContent:', firstRow.textContent);
    }

    const rows = Array.from(widget.querySelectorAll('.monaco-list-row'));
    for (const r of rows) {
      const el = r as HTMLElement;
      
      // Aggressive inline styles
      el.style.cssText += 'color:rgba(255,255,255,0.92)!important;font-size:13px!important;line-height:18px!important;opacity:1!important;visibility:visible!important;-webkit-text-fill-color:rgba(255,255,255,0.92)!important;display:flex!important;';

      // Apply to all descendants
      const kids = Array.from(el.querySelectorAll('*')) as HTMLElement[];
      for (const k of kids) {
        k.style.cssText += 'color:rgba(255,255,255,0.92)!important;opacity:1!important;visibility:visible!important;font-size:13px!important;line-height:18px!important;-webkit-text-fill-color:rgba(255,255,255,0.92)!important;display:inline-block!important;min-width:20px!important;';
      }
      
      // Specifically target label elements
      const labels = el.querySelectorAll('.label-name, .monaco-highlighted-label, .monaco-icon-label-container') as NodeListOf<HTMLElement>;
      for (const lbl of Array.from(labels)) {
        lbl.style.cssText += 'display:inline-block!important;opacity:1!important;visibility:visible!important;color:rgba(255,255,255,0.92)!important;min-width:50px!important;';
      }
    }
  };

  try {
    // Initial patch
    apply(document.documentElement);

    // MutationObserver
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of Array.from(m.addedNodes || [])) {
          if (!(n instanceof Element)) continue;
          apply(n);
        }
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });

    // Interval patch (every 100ms for first 5 seconds after completion provider is registered)
    let ticks = 0;
    const interval = setInterval(() => {
      apply(document.documentElement);
      ticks++;
      if (ticks > 50) clearInterval(interval); // stop after 5s
    }, 100);

  } catch (err) {
    console.warn('[1CQueryCompletion] Patch installation error', err);
  }
}


const KEYWORDS = [
  'ВЫБРАТЬ', 'SELECT',
  'РАЗЛИЧНЫЕ', 'DISTINCT',
  'КАК', 'AS',
  'ИЗ', 'FROM',
  'ГДЕ', 'WHERE',
  'СГРУППИРОВАТЬ', 'GROUP',
  'ПО', 'BY',
  'УПОРЯДОЧИТЬ', 'ORDER',
  'ОБЪЕДИНИТЬ', 'UNION',
  'ВСЕ', 'ALL',
  'ЛЕВОЕ', 'LEFT',
  'ПРАВОЕ', 'RIGHT',
  'ВНУТРЕННЕЕ', 'INNER',
  'ПОЛНОЕ', 'FULL',
  'СОЕДИНЕНИЕ', 'JOIN',
  'НА', 'ON',
  'И', 'AND',
  'ИЛИ', 'OR',
  'НЕ', 'NOT',
  'В', 'IN',
  'МЕЖДУ', 'BETWEEN',
  'ЕСТЬ', 'IS',
  'NULL',
  'ИСТИНА', 'TRUE',
  'ЛОЖЬ', 'FALSE',
  'ПОМЕСТИТЬ',
  'ИНДЕКСИРОВАТЬ',
];

const FUNCTIONS = [
  'СУММА', 'SUM',
  'КОЛИЧЕСТВО', 'COUNT',
  'СРЕДНЕЕ', 'AVG',
  'МАКСИМУМ', 'MAX',
  'МИНИМУМ', 'MIN',
  'НАЧАЛОПЕРИОДА',
  'КОНЕЦПЕРИОДА',
  'ЕСТЬNULL',
  'ЗНАЧЕНИЕ',
];

type QueryMetadataNodeLike = {
  kind?: string;
  label?: string;
  insertText?: string;
  children?: QueryMetadataNodeLike[];
};

const tableItems: Array<{ label: string; insertText: string }> = [];
const fieldsByTable = new Map<string, string[]>();
const virtualByTable = new Map<string, Array<{ label: string; insertText: string }>>();
const fieldsByTabularSection = new Map<string, string[]>();
const tabularSectionsByTable = new Map<string, Array<{ label: string; insertText: string }>>();

function normTableKey(s: string): string {
  return String(s || '').toLowerCase();
}

export function setQueryMetadataCompletionTree(tree: QueryMetadataNodeLike | null | undefined): void {
  tableItems.length = 0;
  fieldsByTable.clear();
  virtualByTable.clear();
  fieldsByTabularSection.clear();
  tabularSectionsByTable.clear();

  if (!tree) return;

  const walk = (n: QueryMetadataNodeLike, currentTable: string | null, currentTableKey: string | null, inTabularSectionsGroup: boolean = false) => {
    const kind = String(n.kind || '');
    const insertText = String(n.insertText || '').trim();
    const isTabularSectionsGroup = kind === 'group' && (n.label === 'Табличные части' || n.label === 'TabularSections');

    if (kind === 'object' && insertText) {
      tableItems.push({ label: n.label || insertText, insertText });
      currentTable = insertText;
      currentTableKey = normTableKey(insertText);
    }

    if (kind === 'member' && insertText) {
      // insertText может быть:
      // - Prefix.Object.Field (реквизит объекта) - 3 части, не в группе "Табличные части"
      // - Prefix.Object.VirtualTable(  (вирт. таблицы регистров) - содержит '('
      // - Prefix.Object.TabularSection (табличная часть) - 3 части, в группе "Табличные части"
      // - Prefix.Object.TabularSection.Field (реквизит табличной части) - 4 части
      const isVirtual = insertText.includes('(');
      const parts = insertText.split('.');

      if (isVirtual) {
        // Виртуальная таблица
        if (currentTable && currentTableKey) {
          const arr = virtualByTable.get(currentTableKey) || [];
          const lastDot = insertText.lastIndexOf('.');
          const label = n.label || (lastDot >= 0 ? insertText.slice(lastDot + 1) : insertText);
          if (!arr.some((x) => x.insertText === insertText)) arr.push({ label, insertText });
          virtualByTable.set(currentTableKey, arr);
        }
        return;
      }

      if (parts.length === 4) {
        // Это реквизит табличной части: Prefix.Object.TabularSection.Field
        const tabularSectionKey = normTableKey(parts.slice(0, 3).join('.'));
        const fieldName = parts[3];
        const debugMode = (globalThis as any).__MDV_QUERY_DEBUG__ === true;
        
        if (debugMode) {
          console.log('[setQueryMetadataCompletionTree] Found 4-part member (tabular section field):');
          console.dir({
            insertText,
            parts,
            tabularSectionKey,
            fieldName,
            kind: n.kind,
            label: n.label,
            inTabularSectionsGroup,
            fullNode: n // Полный объект узла
          }, { depth: null });
        }
        
        if (fieldName) {
          const arr = fieldsByTabularSection.get(tabularSectionKey) || [];
          if (!arr.includes(fieldName)) {
            arr.push(fieldName);
            fieldsByTabularSection.set(tabularSectionKey, arr);
            if (debugMode) {
              console.log('[setQueryMetadataCompletionTree] Added tabular section field (4-part):');
              console.dir({
                tabularSectionKey,
                fieldName,
                insertText,
                allKeys: Array.from(fieldsByTabularSection.keys()),
                allFields: Array.from(fieldsByTabularSection.entries())
              }, { depth: null });
            }
          } else if (debugMode) {
            console.log('[setQueryMetadataCompletionTree] Field already exists (4-part):');
            console.dir({
              tabularSectionKey,
              fieldName,
              allFields: Array.from(fieldsByTabularSection.entries())
            }, { depth: null });
          }
        }
        // Продолжаем обход детей (если есть) - реквизиты табличной части могут иметь вложенные структуры
        for (const ch of n.children || []) {
          walk(ch, currentTable, currentTableKey, inTabularSectionsGroup || isTabularSectionsGroup);
        }
        return; // Не обрабатываем дальше как обычный member
      } else if (parts.length === 3) {
        if (inTabularSectionsGroup) {
          // Это табличная часть: Prefix.Object.TabularSection
          const tabularSectionFullPath = insertText; // Сохраняем полный путь
          const tabularSectionKey = normTableKey(tabularSectionFullPath);
          
          // Сохраняем её для объекта, чтобы показывать в автодополнении
          if (currentTable && currentTableKey) {
            const tabularSectionName = parts[2];
            const arr = tabularSectionsByTable.get(currentTableKey) || [];
            const tabularSectionInsertText = insertText;
            const label = n.label || tabularSectionName;
            if (!arr.some((x) => x.insertText === tabularSectionInsertText)) {
              arr.push({ label, insertText: tabularSectionInsertText });
              tabularSectionsByTable.set(currentTableKey, arr);
            }
          }
          
          // Обрабатываем реквизиты табличной части (дети)
          // Реквизиты могут иметь insertText в формате Prefix.Object.TabularSection.Field или просто Field
          const childrenCount = (n.children || []).length;
          
          // Условное логирование только если включен debugMode
          const debugMode = (globalThis as any).__MDV_QUERY_DEBUG__ === true;
          
          if (debugMode) {
            // Проверяем наличие отладочной информации из queryStringEditor
            const debugInfo = (n as any)._debug;
            if (debugInfo) {
              console.log('[setQueryMetadataCompletionTree] Tabular section debug info from queryStringEditor:');
              console.dir(debugInfo, { depth: null });
            }
            
            console.log('[setQueryMetadataCompletionTree] Processing tabular section:');
            console.dir({
              tabularSectionKey,
              insertText,
              childrenCount,
              children: (n.children || []).map(ch => ({
                kind: ch.kind,
                label: ch.label,
                insertText: ch.insertText,
                hasMember: !!(ch as any).member,
                memberName: (ch as any).member?.name,
                fullChild: ch // Полный объект для детального анализа
              }))
            }, { depth: null });
            // Логируем каждый ребенок отдельно для полного раскрытия
            (n.children || []).forEach((ch, idx) => {
              console.log(`[setQueryMetadataCompletionTree] Child ${idx}:`);
              console.dir(ch, { depth: null });
            });
          }
          
          // Обрабатываем детей табличной части
          // Реквизиты могут быть как прямыми детьми (member), так и внутри группы (group -> member)
          const processTabularSectionChildren = (children: any[]) => {
            const debugMode = (globalThis as any).__MDV_QUERY_DEBUG__ === true;
            for (const child of children) {
              if (child.kind === 'member') {
                const childInsertText = String(child.insertText || '').trim();
                let fieldName = '';
                let actualTabularSectionKey = tabularSectionKey; // По умолчанию используем ключ табличной части
                
                if (childInsertText.includes('.')) {
                  // Если insertText содержит полный путь - извлекаем имя поля
                  const childParts = childInsertText.split('.');
                  if (childParts.length === 4) {
                    // Формат: Prefix.Object.TabularSection.Field
                    // Используем ключ из insertText реквизита (может отличаться от ключа табличной части)
                    actualTabularSectionKey = normTableKey(childParts.slice(0, 3).join('.'));
                    fieldName = childParts[3];
                  } else {
                    // Другой формат - берем последнюю часть
                    fieldName = childParts[childParts.length - 1];
                  }
                } else if (childInsertText) {
                  // Если insertText не содержит путь, но не пустой - это просто имя поля
                  fieldName = childInsertText;
                }
                
                // Fallback: если fieldName пустое, используем label
                if (!fieldName) {
                  fieldName = String(child.label || '').trim();
                }
                
                // Если все еще пустое, пытаемся извлечь из структуры child
                if (!fieldName && (child as any).member?.name) {
                  fieldName = String((child as any).member.name || '').trim();
                }
                
                if (fieldName) {
                  const arr = fieldsByTabularSection.get(actualTabularSectionKey) || [];
                  if (!arr.includes(fieldName)) {
                    arr.push(fieldName);
                    fieldsByTabularSection.set(actualTabularSectionKey, arr);
                    if (debugMode) {
                      console.log('[setQueryMetadataCompletionTree] Added tabular section field:');
                      console.dir({
                        actualTabularSectionKey,
                        fieldName,
                        childInsertText,
                        childLabel: child.label,
                        tabularSectionKey,
                        allKeys: Array.from(fieldsByTabularSection.keys()),
                        allFields: Array.from(fieldsByTabularSection.entries()),
                        fullChild: child // Полный объект ребенка
                      }, { depth: null });
                    }
                  } else if (debugMode) {
                    console.log('[setQueryMetadataCompletionTree] Field already exists:');
                    console.dir({
                      actualTabularSectionKey,
                      fieldName,
                      childInsertText
                    }, { depth: null });
                  }
                } else if (debugMode) {
                  console.warn('[setQueryMetadataCompletionTree] Empty fieldName for child:');
                  console.dir({
                    childInsertText,
                    childLabel: child.label,
                    childKind: child.kind,
                    childMember: (child as any).member,
                    tabularSectionKey,
                    fullChild: child // Полный объект ребенка
                  }, { depth: null });
                }
              } else if (child.kind === 'group') {
                // Если это группа внутри табличной части (например, "Реквизиты"),
                // обрабатываем её детей (реквизиты табличной части)
                if (debugMode) {
                  console.log('[setQueryMetadataCompletionTree] Found group inside tabular section:', {
                    groupLabel: child.label,
                    groupChildrenCount: (child.children || []).length
                  });
                }
                processTabularSectionChildren(child.children || []);
              } else {
                // Если это не member и не group, обрабатываем через walk (например, другие структуры)
                walk(child, currentTable, currentTableKey, isTabularSectionsGroup || inTabularSectionsGroup);
              }
            }
          };
          
          processTabularSectionChildren(n.children || []);
          return; // Не обрабатываем дальше как обычный member - дети уже обработаны
        } else if (currentTable && currentTableKey) {
          // Это реквизит объекта: Prefix.Object.Field
          const fieldName = parts[2];
          const arr = fieldsByTable.get(currentTableKey) || [];
          if (fieldName && !arr.includes(fieldName)) {
            arr.push(fieldName);
            fieldsByTable.set(currentTableKey, arr);
          }
        }
      }
    }

    // Обход всех детей узла (если они не были обработаны выше)
    for (const ch of n.children || []) {
      walk(ch, currentTable, currentTableKey, isTabularSectionsGroup || inTabularSectionsGroup);
    }
  };

  walk(tree, null, null);

  tableItems.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  for (const [k, v] of fieldsByTable.entries()) {
    v.sort((a, b) => a.localeCompare(b, 'ru'));
    fieldsByTable.set(k, v);
  }
  for (const [k, v] of fieldsByTabularSection.entries()) {
    v.sort((a, b) => a.localeCompare(b, 'ru'));
    fieldsByTabularSection.set(k, v);
  }
  for (const [k, v] of tabularSectionsByTable.entries()) {
    v.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
    tabularSectionsByTable.set(k, v);
  }
  
  // Отладочный вывод (можно включить при необходимости)
  if ((globalThis as any).__MDV_QUERY_DEBUG__) {
    console.log('[setQueryMetadataCompletionTree] Summary:', {
      tablesCount: tableItems.length,
      fieldsByTableSize: fieldsByTable.size,
      fieldsByTabularSectionSize: fieldsByTabularSection.size,
      tabularSectionsByTableSize: tabularSectionsByTable.size,
      fieldsByTableSample: Array.from(fieldsByTable.entries()).slice(0, 5).map(([k, v]) => ({
        key: k,
        fields: v.slice(0, 5).join(', '),
        count: v.length
      })),
      fieldsByTabularSectionSample: Array.from(fieldsByTabularSection.entries()).slice(0, 10).map(([k, v]) => ({
        key: k,
        fields: v.slice(0, 10).join(', '),
        count: v.length
      })),
      tabularSectionsByTableSample: Array.from(tabularSectionsByTable.entries()).slice(0, 5).map(([k, v]) => ({
        key: k,
        sections: v.map(x => x.label).join(', '),
        count: v.length
      })),
      // Специально для отладки табличных частей
      allTabularSectionKeys: Array.from(fieldsByTabularSection.keys()),
      allTabularSectionKeysDetailed: Array.from(fieldsByTabularSection.entries()).map(([k, v]) => ({
        key: k,
        fieldsCount: v.length,
        fields: v
      }))
    });
  }
}

export function getQueryMetadataFieldNames(tableKey: string): string[] {
  const key = String(tableKey || '').trim();
  const keyLower = key.toLowerCase();
  const arr = fieldsByTable.get(keyLower);
  const result = Array.isArray(arr) ? [...arr] : [];
  
  // Отладочный вывод (можно включить при необходимости)
  if ((globalThis as any).__MDV_QUERY_DEBUG__) {
    console.log('[getQueryMetadataFieldNames]', { 
      tableKey: key,
      keyLower,
      found: !!arr, 
      count: result.length,
      sample: result.slice(0, 5).join(', '),
      allKeys: Array.from(fieldsByTable.keys()).slice(0, 10).join(', ')
    });
  }
  
  return result;
}


type AliasMap = Map<string, string>;

type QueryContext = {
  aliasMap: AliasMap;
  subqueryFieldsByAlias: Map<string, string[]>;
  tempTables: Set<string>;
  tempFieldsByTable: Map<string, string[]>;
};

/**
 * Получить специальные поля для виртуальных таблиц регистров бухгалтерии
 */
export function getAccountingRegisterVirtualTableFields(virtualTableKind: string, baseFields: string[]): string[] {
  const fields: string[] = [];
  
  // Базовые поля, общие для всех виртуальных таблиц
  const commonFields = [
    'Счет',
    'СчетДт',
    'СчетКт',
    'Период',
    'Регистратор',
    'НомерСтроки',
    'МоментВремени',
    'УточнениеПериода',
    'Активность',
    'ВидДвижения',
  ];
  
  // Добавляем поля субконто (обычно до 3-х видов)
  for (let i = 1; i <= 3; i++) {
    fields.push(`Субконто${i}`);
    fields.push(`СубконтоДт${i}`);
    fields.push(`СубконтоКт${i}`);
    fields.push(`КорСубконто${i}`);
    fields.push(`ВидСубконто${i}`);
  }
  
  // Поля из базовой таблицы (измерения, реквизиты, ресурсы)
  fields.push(...baseFields);
  
  switch (virtualTableKind) {
    case 'Движения':
      fields.push(...commonFields);
      break;
      
    case 'Остатки':
      // Для Остатки добавляем специальные поля ресурсов
      for (const field of baseFields) {
        if (field.includes('Ресурс') || field.toLowerCase().includes('ресурс')) {
          // Предполагаем, что это ресурс - добавляем варианты с Остаток
          const resourceName = field.replace(/Ресурс/gi, '').trim();
          if (resourceName) {
            fields.push(`${resourceName}Остаток`);
            fields.push(`${resourceName}ОстатокДт`);
            fields.push(`${resourceName}ОстатокКт`);
            fields.push(`${resourceName}РазвернутыйОстатокДт`);
            fields.push(`${resourceName}РазвернутыйОстатокКт`);
          }
        }
      }
      fields.push(...commonFields);
      break;
      
    case 'Обороты':
      // Для Обороты добавляем специальные поля
      for (const field of baseFields) {
        if (field.includes('Ресурс') || field.toLowerCase().includes('ресурс')) {
          const resourceName = field.replace(/Ресурс/gi, '').trim();
          if (resourceName) {
            fields.push(`${resourceName}Оборот`);
            fields.push(`${resourceName}ОборотДт`);
            fields.push(`${resourceName}ОборотКт`);
          }
        }
      }
      fields.push(...commonFields);
      fields.push('КорСчет');
      fields.push('ПериодГод', 'ПериодКвартал', 'ПериодМесяц', 'ПериодНеделя', 'ПериодДень', 
                  'ПериодЧас', 'ПериодМинута', 'ПериодСекунда', 'ПериодДекада', 'ПериодПолугодие');
      break;
      
    case 'ОборотыДтКт':
      // Для ОборотыДтКт добавляем специальные поля для дебета и кредита
      for (const field of baseFields) {
        if (field.includes('Ресурс') || field.toLowerCase().includes('ресурс')) {
          const resourceName = field.replace(/Ресурс/gi, '').trim();
          if (resourceName) {
            fields.push(`${resourceName}Оборот`);
            fields.push(`${resourceName}ОборотДт`);
            fields.push(`${resourceName}ОборотКт`);
          }
        }
      }
      fields.push(...commonFields);
      fields.push('КорСчетДт', 'КорСчетКт');
      fields.push('ПериодГод', 'ПериодКвартал', 'ПериодМесяц', 'ПериодНеделя', 'ПериодДень', 
                  'ПериодЧас', 'ПериодМинута', 'ПериодСекунда', 'ПериодДекада', 'ПериодПолугодие');
      break;
      
    case 'ОстаткиИОбороты':
      // Для ОстаткиИОбороты добавляем все поля из Остатки и Обороты
      for (const field of baseFields) {
        if (field.includes('Ресурс') || field.toLowerCase().includes('ресурс')) {
          const resourceName = field.replace(/Ресурс/gi, '').trim();
          if (resourceName) {
            // Остатки
            fields.push(`${resourceName}НачальныйОстаток`);
            fields.push(`${resourceName}НачальныйОстатокДт`);
            fields.push(`${resourceName}НачальныйОстатокКт`);
            fields.push(`${resourceName}НачальныйРазвернутыйОстатокДт`);
            fields.push(`${resourceName}НачальныйРазвернутыйОстатокКт`);
            fields.push(`${resourceName}КонечныйОстаток`);
            fields.push(`${resourceName}КонечныйОстатокДт`);
            fields.push(`${resourceName}КонечныйОстатокКт`);
            fields.push(`${resourceName}КонечныйРазвернутыйОстатокДт`);
            fields.push(`${resourceName}КонечныйРазвернутыйОстатокКт`);
            // Обороты
            fields.push(`${resourceName}Оборот`);
            fields.push(`${resourceName}ОборотДт`);
            fields.push(`${resourceName}ОборотКт`);
          }
        }
      }
      fields.push(...commonFields);
      fields.push('КорСчет');
      fields.push('ПериодГод', 'ПериодКвартал', 'ПериодМесяц', 'ПериодНеделя', 'ПериодДень', 
                  'ПериодЧас', 'ПериодМинута', 'ПериодСекунда', 'ПериодДекада', 'ПериодПолугодие');
      break;
      
    case 'Движения':
      fields.push(...commonFields);
      fields.push('Активность', 'ВидДвижения');
      break;
      
    case 'ДвиженияССубконто':
      fields.push(...commonFields);
      // ВидСубконто и Субконто добавляются динамически
      break;
      
    default:
      // Для основной таблицы или неизвестной виртуальной таблицы
      fields.push(...commonFields);
      fields.push('Активность', 'ВидДвижения');
      break;
  }
  
  return [...new Set(fields)]; // Убираем дубликаты
}

/**
 * Получить специальные поля для виртуальных таблиц регистров расчета
 */
export function getCalculationRegisterVirtualTableFields(virtualTableKind: string, baseFields: string[]): string[] {
  const fields: string[] = [];
  
  // Базовые поля, общие для всех виртуальных таблиц
  const commonFields = [
    'Период',
    'Регистратор',
    'НомерСтроки',
    'ВидРасчета',
    'ПериодДействия',
    'ПериодДействияНачало',
    'ПериодДействияКонец',
    'БазовыйПериодНачало',
    'БазовыйПериодКонец',
    'Активность',
    'Сторно',
    'Результат',
    'Перерасчет',
    'ВидДвижения',
  ];
  
  // Поля из базовой таблицы (измерения, ресурсы, реквизиты)
  fields.push(...baseFields);
  
  switch (virtualTableKind) {
    case 'Движения':
      fields.push(...commonFields);
      fields.push('ПериодРегистрации');
      break;
      
    case 'ПериодДействия':
      // Специфичные поля для ПериодДействия
      fields.push('ПериодДействия');
      fields.push('НомерЗаписи');
      fields.push('БазовыйПериодНачало');
      fields.push('БазовыйПериодКонец');
      fields.push('ВидДвиженияБазовый');
      fields.push(...commonFields);
      // Добавляем поля результатов для развертки по периоду действия
      for (const field of baseFields) {
        if (field.includes('Ресурс') || field.toLowerCase().includes('ресурс') || field === 'Результат') {
          const resourceName = field.replace(/Ресурс/gi, '').trim();
          if (resourceName) {
            fields.push(`${resourceName}Значение`);
          }
        }
      }
      break;
      
    case 'ДанныеГрафика':
      fields.push(...commonFields);
      // Поля графика добавляются динамически из метаданных связанного регистра
      // Базовые поля графика
      fields.push('ПериодГрафика', 'РегистраторГрафика', 'НомерСтрокиГрафика');
      break;
      
    default:
      fields.push(...commonFields);
      break;
  }
  
  return [...new Set(fields)]; // Убираем дубликаты
}

/**
 * Определить виртуальную таблицу из контекста запроса
 */
function detectVirtualTableFromContext(queryText: string, cursorOffset: number, tableKey: string): string | null {
  // Ищем виртуальную таблицу перед курсором
  const beforeCursor = queryText.slice(0, cursorOffset);
  
  // Проверяем паттерны виртуальных таблиц (ищем ближайшую к курсору)
  // Важно: matchAll требует флаг 'g' в регулярном выражении
  const virtualTablePatterns = [
    { pattern: /\.Остатки\s*\(/gi, name: 'Остатки' },
    { pattern: /\.Обороты\s*\(/gi, name: 'Обороты' },
    { pattern: /\.ОстаткиИОбороты\s*\(/gi, name: 'ОстаткиИОбороты' },
    { pattern: /\.ДвиженияССубконто\s*\(/gi, name: 'ДвиженияССубконто' },
    { pattern: /\.ОборотыДтКт\s*\(/gi, name: 'ОборотыДтКт' },
    { pattern: /\.Движения\s*\(/gi, name: 'Движения' },
    { pattern: /\.ПериодДействия\s*\(/gi, name: 'ПериодДействия' },
    { pattern: /\.ФактическийПериодДействия\s*\(/gi, name: 'ФактическийПериодДействия' },
    { pattern: /\.ДанныеГрафика\s*\(/gi, name: 'ДанныеГрафика' },
    { pattern: /\.СрезПоследних\s*\(/gi, name: 'СрезПоследних' },
    { pattern: /\.СрезПервых\s*\(/gi, name: 'СрезПервых' },
  ];
  
  let closestMatch: { name: string; index: number } | null = null;
  
  for (const { pattern, name } of virtualTablePatterns) {
    const matches = Array.from(beforeCursor.matchAll(pattern));
    if (matches.length > 0) {
      // Берем последнее совпадение (ближайшее к курсору)
      const lastMatch = matches[matches.length - 1];
      const matchIndex = lastMatch.index || 0;
      
      // Проверяем, что это относится к нашей таблице
      // Ищем имя таблицы перед виртуальной таблицей
      const beforeMatch = beforeCursor.slice(Math.max(0, matchIndex - 300), matchIndex);
      const tableKeyParts = tableKey.split('.');
      const tableName = tableKeyParts[tableKeyParts.length - 1] || tableKey;
      const fullTableKey = tableKey;
      
      // Проверяем, что перед виртуальной таблицей есть полное имя таблицы или его часть
      const tableKeyRegex = new RegExp(
        `(?:^|\\s|ИЗ|FROM|JOIN|СОЕДИНЕНИЕ)\\s*(${escapeRegExp(fullTableKey)}|${escapeRegExp(tableName)})(?:\\.|\\s)`,
        'i'
      );
      
      if (tableKeyRegex.test(beforeMatch) || beforeMatch.includes(fullTableKey) || beforeMatch.includes(tableName)) {
        if (!closestMatch || matchIndex > closestMatch.index) {
          closestMatch = { name, index: matchIndex };
        }
      }
    }
  }
  
  return closestMatch ? closestMatch.name : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normAlias(s: string): string {
  return String(s || '').toLowerCase();
}

/**
 * Разрешает алиас таблицы в ключ метаданных (например, "Справочник.Имя" или "РегистрНакопления.Имя")
 * Ищет объявление алиаса в тексте запроса: "ТипМетаданных.<Имя>[.ВиртТаблица(...)] КАК <alias>"
 */
function resolveAliasTableKey(pkgText: string, alias: string): string | null {
  const a = String(alias || '').trim();
  if (!a) return null;

  // Ищем объявление алиаса для метаданных: "ТипМетаданных.<Имя>[.ТабличнаяЧасть][.ВиртТаблица(...)] КАК <alias>" внутри текущего пакета.
  // Учитываем виртуальные таблицы: Обороты, Остатки и т.д.
  // Поддерживаем все типы метаданных: Справочник, Документ, Перечисление, Регистры и т.д.
  // Также поддерживаем табличные части: Справочник.Объект.ТабличнаяЧасть
  const re = new RegExp(
    String.raw`(Справочник|Документ|Перечисление|ПланВидовХарактеристик|ПланВидовРасчета|ПланСчетов|БизнесПроцесс|Задача|ПланОбмена|Константа|ЖурналДокументов|РегистрНакопления|РегистрСведений|РегистрБухгалтерии|РегистрРасчета)\.([A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*(?:\.[A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*)?)\s*(?:\([^)]*\))?\s+КАК\s+${escapeRegExp(a)}(?![0-9A-Za-zА-Яа-я_])`,
    'gi'
  );

  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pkgText)) !== null) {
    last = m;
  }

  if (!last) return null;
  const prefix = last[1];
  const fullName = last[2];
  // Убираем виртуальную таблицу из имени, если она есть (только для регистров)
  // Но сохраняем табличную часть, если она есть (например, Справочник.ibs_ТипыПремий.ПоказателиПремии)
  const baseName = fullName.replace(/\.(Обороты|Остатки|ОстаткиИОбороты|ОборотыДтКт|ДвиженияССубконто|СрезПоследних|СрезПервых|Движения|ПериодДействия|ДанныеГрафика|ФактическийПериодДействия)$/, '');
  return `${prefix}.${baseName}`;
}

function tokenizeQuery(s: string): Array<{ type: 'ident' | 'sym'; raw: string; upper: string }> {
  const out: Array<{ type: 'ident' | 'sym'; raw: string; upper: string }> = [];
  const src = String(s || '');

  let i = 0;
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  const isIdentStart = (c: string) => /[A-Za-zА-Яа-я_]/.test(c);
  const isIdentPart = (c: string) => /[0-9A-Za-zА-Яа-я_]/.test(c);

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (inString) {
      if (ch === '"' && next === '"') {
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = false;
        i++;
        continue;
      }
      i++;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === '"') {
      inString = true;
      i++;
      continue;
    }

    if (isIdentStart(ch)) {
      const start = i;
      i++;
      while (i < src.length && isIdentPart(src[i])) i++;
      const raw = src.slice(start, i);
      out.push({ type: 'ident', raw, upper: raw.toUpperCase() });
      continue;
    }

    if (ch === '.' || ch === '(' || ch === ')' || ch === ';' || ch === ',') {
      out.push({ type: 'sym', raw: ch, upper: ch });
      i++;
      continue;
    }

    i++;
  }

  return out;
}

function readDottedIdent(tokens: Array<{ type: 'ident' | 'sym'; raw: string; upper: string }>, startIdx: number): { value: string; nextIdx: number } {
  let i = startIdx;
  if (!tokens[i] || tokens[i].type !== 'ident') return { value: '', nextIdx: startIdx };

  let acc = tokens[i].raw;
  i++;
  while (i + 1 < tokens.length && tokens[i].raw === '.' && tokens[i + 1].type === 'ident') {
    acc = `${acc}.${tokens[i + 1].raw}`;
    i += 2;
  }
  return { value: acc, nextIdx: i };
}

function splitPackagesWithOffsets(s: string): Array<{ text: string; start: number; end: number }> {
  const src = String(s || '');
  const out: Array<{ text: string; start: number; end: number }> = [];

  let start = 0;
  let i = 0;
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (inString) {
      if (ch === '"' && next === '"') {
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = false;
        i++;
        continue;
      }
      i++;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === '"') {
      inString = true;
      i++;
      continue;
    }

    if (ch === ';') {
      out.push({ text: src.slice(start, i), start, end: i });
      start = i + 1;
      i++;
      continue;
    }

    i++;
  }

  out.push({ text: src.slice(start), start, end: src.length });
  return out;
}

function extractAliasesInSelect(tokens: Array<{ type: 'ident' | 'sym'; raw: string; upper: string }>, startIdx: number, endIdx: number): string[] {
  const out: string[] = [];
  const push = (v: string) => {
    const s = String(v || '').trim();
    if (s && !out.includes(s)) out.push(s);
  };

  for (let i = startIdx; i < endIdx - 1; i++) {
    const u = tokens[i].upper;
    if (u === 'КАК' || u === 'AS') {
      const n = tokens[i + 1];
      if (n?.type === 'ident') push(n.raw);
    }
  }

  return out;
}

function chooseFinalSelectRange(tokens: Array<{ type: 'ident' | 'sym'; raw: string; upper: string }>): { start: number; end: number } | null {
  const selectIdxs: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].upper === 'ВЫБРАТЬ' || tokens[i].upper === 'SELECT') selectIdxs.push(i);
  }
  if (selectIdxs.length === 0) return null;

  const ranges = selectIdxs.map((s, idx) => ({ start: s, end: idx + 1 < selectIdxs.length ? selectIdxs[idx + 1] : tokens.length }));

  let chosen: { start: number; end: number } | null = null;
  for (const r of ranges) {
    let hasPomestit = false;
    for (let i = r.start; i < r.end; i++) {
      if (tokens[i].upper === 'ПОМЕСТИТЬ') {
        hasPomestit = true;
        break;
      }
    }
    if (!hasPomestit) chosen = r;
  }
  return chosen;
}

function buildQueryContext(source: string, cursorOffset: number): QueryContext {
  const aliasMap: AliasMap = new Map();
  const subqueryFieldsByAlias = new Map<string, string[]>();
  const tempTables = new Set<string>();
  const tempFieldsByTable = new Map<string, string[]>();

  const src = String(source || '');
  const packages = splitPackagesWithOffsets(src);

  // текущий пакет по курсору
  const pkgIdx = (() => {
    for (let i = 0; i < packages.length; i++) {
      if (cursorOffset >= packages[i].start && cursorOffset <= packages[i].end) return i;
    }
    return Math.max(0, packages.length - 1);
  })();

  // 1) Собираем временные таблицы ПОМЕСТИТЬ из всех пакетов до текущего включительно
  for (let p = 0; p <= pkgIdx; p++) {
    const toks = tokenizeQuery(packages[p].text);

    // ищем SELECT ... ПОМЕСТИТЬ <TempName>
    const selectIdxs: number[] = [];
    for (let i = 0; i < toks.length; i++) {
      if (toks[i].upper === 'ВЫБРАТЬ' || toks[i].upper === 'SELECT') selectIdxs.push(i);
    }

    for (let si = 0; si < selectIdxs.length; si++) {
      const start = selectIdxs[si];
      const end = si + 1 < selectIdxs.length ? selectIdxs[si + 1] : toks.length;

      let pomIdx = -1;
      for (let i = start; i < end; i++) {
        if (toks[i].upper === 'ПОМЕСТИТЬ') {
          pomIdx = i;
          break;
        }
      }
      if (pomIdx < 0) continue;

      // имя временной таблицы сразу после ПОМЕСТИТЬ
      const tempNameTok = toks[pomIdx + 1];
      if (!tempNameTok || tempNameTok.type !== 'ident') continue;

      const tempName = tempNameTok.raw;
      tempTables.add(tempName);

      // поля результата: из SELECT-части до ПОМЕСТИТЬ
      const fields = extractAliasesInSelect(toks, start, pomIdx);
      if (fields.length) tempFieldsByTable.set(tempName, fields);
    }
  }

  // 2) Алиасы в текущем пакете (метаданные/ВТ/подзапросы)
  const curTokens = tokenizeQuery(packages[pkgIdx]?.text || '');

  const isFromJoin = (u: string) => ['ИЗ', 'FROM', 'JOIN', 'СОЕДИНЕНИЕ'].includes(u);
  const isAs = (u: string) => ['КАК', 'AS'].includes(u);


  for (let i = 0; i < curTokens.length; i++) {
    if (!isFromJoin(curTokens[i].upper)) continue;

    const t1 = curTokens[i + 1];
    if (!t1) continue;

    // Подзапрос: ( ... ) КАК alias
    if (t1.raw === '(') {
      // баланс скобок
      let depth = 0;
      let j = i + 1;
      for (; j < curTokens.length; j++) {
        if (curTokens[j].raw === '(') depth++;
        else if (curTokens[j].raw === ')') {
          depth--;
          if (depth === 0) break;
        }
      }
      if (j >= curTokens.length) continue;

      // alias после ')'
      const after = curTokens[j + 1];
      const after2 = curTokens[j + 2];
      const after3 = curTokens[j + 3];

      let alias = '';
      if (after && isAs(after.upper) && after2?.type === 'ident') {
        alias = after2.raw;
      }

      if (alias) {
        const key = normAlias(alias);
        // поля подзапроса: берём финальный SELECT внутри скобок
        const innerTokens = curTokens.slice(i + 2, j); // без внешних '(' ')'
        const range = chooseFinalSelectRange(innerTokens);
        const fields = range ? extractAliasesInSelect(innerTokens, range.start, range.end) : [];

        aliasMap.set(key, `SUBQUERY:${alias}`);
        if (fields.length) subqueryFieldsByAlias.set(key, fields);
      }

      i = j;
      continue;
    }

    // Обычная таблица (допускаем dotted)
    const { value: table, nextIdx } = readDottedIdent(curTokens, i + 1);
    if (!table) continue;

    // Пропускаем скобки виртуальной таблицы (например, Обороты(...))
    let aliasSearchIdx = nextIdx;
    if (curTokens[aliasSearchIdx]?.raw === '(') {
      // Ищем закрывающую скобку
      let depth = 0;
      let j = aliasSearchIdx;
      for (; j < curTokens.length; j++) {
        if (curTokens[j].raw === '(') depth++;
        else if (curTokens[j].raw === ')') {
          depth--;
          if (depth === 0) {
            aliasSearchIdx = j + 1;
            break;
          }
        }
      }
      // Если не нашли закрывающую скобку, пропускаем этот случай
      if (depth !== 0) {
        i = Math.max(i, nextIdx - 1);
        continue;
      }
    }

    // алиас
    const tAs = curTokens[aliasSearchIdx];
    const tAlias = curTokens[aliasSearchIdx + 1];

    let alias = '';
    if (tAs && isAs(tAs.upper) && tAlias?.type === 'ident') {
      alias = tAlias.raw;
    }

    if (alias) {
      const key = normAlias(alias);
      // Для виртуальных таблиц используем базовую таблицу (без .Обороты и т.д.)
      // Например: РегистрНакопления.АвансовыеПлатежиИностранцевПоНДФЛ.Обороты -> РегистрНакопления.АвансовыеПлатежиИностранцевПоНДФЛ
      const baseTable = table.replace(/\.(Обороты|Остатки|ОстаткиИОбороты|ОборотыДтКт|ДвиженияССубконто|СрезПоследних|СрезПервых|Движения|ПериодДействия|ДанныеГрафика|ФактическийПериодДействия)$/, '');
      if (tempTables.has(table)) {
        aliasMap.set(key, `TEMP:${table}`);
      } else {
        aliasMap.set(key, baseTable);
      }
    }
    
    i = Math.max(i, aliasSearchIdx - 1);
  }

  // Fallback: если алиас не найден в aliasMap, пытаемся разрешить через resolveAliasTableKey
  // Это нужно для случаев, когда токенизация не смогла правильно распарсить объявление алиаса
  // (например, для справочников и документов, которые не были распознаны как таблицы)
  const pkgText = packages[pkgIdx]?.text || '';
  
  // Дополнительно: ищем все алиасы в тексте запроса, которые не были найдены через токенизацию
  // Это особенно важно для справочников и документов
  const aliasPattern = /(?:Справочник|Документ|Перечисление|ПланВидовХарактеристик|ПланВидовРасчета|ПланСчетов|БизнесПроцесс|Задача|ПланОбмена|Константа|ЖурналДокументов|РегистрНакопления|РегистрСведений|РегистрБухгалтерии|РегистрРасчета)\.([A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*(?:\.[A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*)?)\s*(?:\([^)]*\))?\s+КАК\s+([A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = aliasPattern.exec(pkgText)) !== null) {
    const prefix = match[1];
    const fullName = match[2];
    const alias = match[3];
    const key = normAlias(alias);
    
    // Если алиас еще не найден, добавляем его
    if (!aliasMap.has(key)) {
      const baseName = fullName.replace(/\.(Обороты|Остатки|ОстаткиИОбороты|ОборотыДтКт|ДвиженияССубконто|СрезПоследних|СрезПервых|Движения|ПериодДействия|ДанныеГрафика|ФактическийПериодДействия)$/, '');
      aliasMap.set(key, `${prefix}.${baseName}`);
    }
  }

  return { aliasMap, subqueryFieldsByAlias, tempTables, tempFieldsByTable };
}

function registerCompletionProvider(): void {
  if (completionRegistered) return;
  installSuggestWidgetPatch();
  completionRegistered = true;

  monaco.languages.registerCompletionItemProvider('1c-query', {
    triggerCharacters: ['.', ' ', '\n', '\t'],
    provideCompletionItems: (model, position, context) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const before = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const ctx = buildQueryContext(model.getValue(), model.getOffsetAt(position));
      const aliasMap = ctx.aliasMap;
      const subqueryFieldsByAlias = ctx.subqueryFieldsByAlias;
      const tempTables = ctx.tempTables;
      const tempFieldsByTable = ctx.tempFieldsByTable;

      const suggestions: monaco.languages.CompletionItem[] = [];

      const __dbgEnabled = (globalThis as any).__MDV_QUERY_DEBUG__ !== false; // по умолчанию ВКЛ
      const __dbg = (...args: any[]) => {
        if (!__dbgEnabled) return;
        // eslint-disable-next-line no-console
        console.log('[1CQueryCompletion]', ...args);
      };
      const __warn = (...args: any[]) => {
        if (!__dbgEnabled) return;
        // eslint-disable-next-line no-console
        console.warn('[1CQueryCompletion]', ...args);
      };

      // 1) Поля и виртуальные таблицы после "Prefix.Object." или "alias."
      const dotCtxFull = before.match(/([A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*\.[A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*)\.$/);
      const dotCtxAlias = before.match(/([A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*)\.$/);

      // Разрешаем алиас: сначала из aliasMap, затем через resolveAliasTableKey как fallback
      let resolvedTableKey = '';
      if (dotCtxFull) {
        resolvedTableKey = dotCtxFull[1];
      } else if (dotCtxAlias) {
        const aliasName = dotCtxAlias[1];
        const aliasKey = normAlias(aliasName);
        resolvedTableKey = aliasMap.get(aliasKey) || '';
        
        // Fallback: если не нашли в aliasMap, пытаемся разрешить через resolveAliasTableKey
        if (!resolvedTableKey) {
          const queryText = model.getValue();
          const resolved = resolveAliasTableKey(queryText, aliasName);
          if (resolved) {
            resolvedTableKey = resolved;
            // Кэшируем результат в aliasMap для последующих обращений
            aliasMap.set(aliasKey, resolved);
          }
        }
      }
      
      const tableKey = resolvedTableKey;

      const aliasTarget = (dotCtxAlias && !dotCtxFull) ? resolvedTableKey : '';
      const isTempAlias = aliasTarget.startsWith('TEMP:');
      const isSubqueryAlias = aliasTarget.startsWith('SUBQUERY:');
      const resolvedTempTable = isTempAlias ? aliasTarget.slice('TEMP:'.length) : '';
      const resolvedAlias = (dotCtxAlias && !dotCtxFull) ? dotCtxAlias[1] : '';
      const resolvedAliasKey = resolvedAlias ? normAlias(resolvedAlias) : '';

      if (((context as any)?.triggerCharacter === '.' || dotCtxAlias || dotCtxFull)) {
        __dbg('dotContext', {
          triggerCharacter: (context as any)?.triggerCharacter,
          dotCtxFull: dotCtxFull ? dotCtxFull[1] : null,
          dotCtxAlias: dotCtxAlias ? dotCtxAlias[1] : null,
          resolvedTableKey: tableKey,
          aliasTarget,
          aliasMapSize: aliasMap.size,
        });

        // DOM-диагностика: где вообще живёт suggest-widget (важно для CSS)
        try {
          const dumpWidget = (label: string) => {
            const w = document.querySelector('.suggest-widget') as any;
            if (!w) {
              __dbg(`suggest-widget ${label}`, { found: false });
              return;
            }

            const rows = Array.from(w.querySelectorAll?.('.monaco-list-row') || []).slice(0, 10) as any[];
            const rowDump = rows.map((r) => ({
              cls: String(r.className || ''),
              text: String(r.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
              html: String(r.outerHTML || '').slice(0, 220),
            }));

            __dbg(`suggest-widget ${label}`, {
              found: true,
              tag: w.tagName,
              className: w.className,
              innerTextLen: String(w.innerText || '').trim().length,
              rowCount: (w.querySelectorAll?.('.monaco-list-row') || []).length,
              sample: rowDump,
            });
          };

          // сразу
          dumpWidget('now');
          // после layout
          setTimeout(() => dumpWidget('t0'), 0);
          setTimeout(() => dumpWidget('t50'), 50);
        } catch {
          // ignore
        }

        if (dotCtxAlias && !dotCtxFull && !tableKey) {
          __warn('alias not resolved', {
            alias: dotCtxAlias[1],
            aliasMapSample: Array.from(aliasMap.entries()).slice(0, 25),
          });
        }

        if (tableKey) {
          __dbg('tableKey stats', {
            tableKey,
            fieldsCount: (fieldsByTable.get(normTableKey(tableKey)) || []).length,
            virtualCount: (virtualByTable.get(normTableKey(tableKey)) || []).length,
            isAliasCtx: !!(dotCtxAlias && !dotCtxFull),
          });

          const __sampleFields = (fieldsByTable.get(normTableKey(tableKey)) || []).slice(0, 15);
          const __sampleVirtual = (virtualByTable.get(normTableKey(tableKey)) || []).slice(0, 10).map((x) => String(x.label || x.insertText));
          __dbg('tableKey sample', {
            tableKey,
            fieldsSample: __sampleFields.join(', '),
            virtualSample: __sampleVirtual.join(', '),
          });
        }
      }

      // 1a) Подзапрос: alias.
      if (isSubqueryAlias && resolvedAlias) {
        const fields = subqueryFieldsByAlias.get(resolvedAliasKey) || [];
        for (const f of fields) {
          const safeLabel = String(f || '').trim();
          if (!safeLabel) continue;
          suggestions.push({
            label: { label: safeLabel } as any,
            detail: safeLabel,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: f,
            range,
          });
        }
        return { suggestions };
      }

      // 1b) Временная таблица: alias. (поле из ПОМЕСТИТЬ)
      if (isTempAlias && resolvedTempTable) {
        const fields = tempFieldsByTable.get(resolvedTempTable) || [];
        for (const f of fields) {
          const safeLabel = String(f || '').trim();
          if (!safeLabel) continue;
          suggestions.push({
            label: { label: safeLabel } as any,
            detail: safeLabel,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: f,
            range,
          });
        }
        return { suggestions };
      }

      if (tableKey) {
        // Если это alias. — вставляем только хвост (без alias.)
        const isAliasCtx = !!(dotCtxAlias && !dotCtxFull);

        // Виртуальные таблицы (если есть)
        const virtual = virtualByTable.get(normTableKey(tableKey)) || [];
        for (const v of virtual) {
          const tail = v.insertText.slice(tableKey.length + 1);
          const safeLabel = String(v.label || tail || v.insertText || '').trim();
          if (!safeLabel) continue;
          suggestions.push({
            label: { label: safeLabel } as any,
            detail: safeLabel,
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: isAliasCtx ? tail : tail,
            range,
          });
        }

        // Встроенные виртуальные таблицы (fallback)
        if (tableKey.startsWith('РегистрНакопления.')) {
          for (const m of ['Движения(', 'Остатки(', 'Обороты(', 'ОстаткиИОбороты(']) {
            suggestions.push({
              label: { label: `${m}...` } as any,
              detail: `${m}...`,
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: m,
              range,
            });
          }
        }

        if (tableKey.startsWith('РегистрБухгалтерии.')) {
          for (const m of ['Движения(', 'Остатки(', 'Обороты(', 'ОстаткиИОбороты(', 'ОборотыДтКт(', 'ДвиженияССубконто(']) {
            suggestions.push({
              label: { label: `${m}...` } as any,
              detail: `${m}...`,
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: m,
              range,
            });
          }
        }

        if (tableKey.startsWith('РегистрСведений.')) {
          for (const m of ['Движения(', 'СрезПоследних(', 'СрезПервых(']) {
            suggestions.push({
              label: { label: `${m}...` } as any,
              detail: `${m}...`,
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: m,
              range,
            });
          }
        }

        if (tableKey.startsWith('РегистрРасчета.')) {
          for (const m of ['Движения(', 'ПериодДействия(', 'ДанныеГрафика(']) {
            suggestions.push({
              label: { label: `${m}...` } as any,
              detail: `${m}...`,
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: m,
              range,
            });
          }
        }

        // Определяем, используется ли виртуальная таблица
        const model = monaco.editor.getModels()[0];
        const cursorOffset = model ? model.getOffsetAt(position) : 0;
        const queryText = model?.getValue() || '';
        
        // Для алиасов нужно найти виртуальную таблицу в исходном запросе
        let virtualTableKind: string | null = null;
        if (isAliasCtx && resolvedAlias && tableKey) {
          // Ищем объявление алиаса в запросе: "РегистрБухгалтерии.Имя.Остатки() КАК Управленческий"
          const aliasPattern = new RegExp(`(${escapeRegExp(tableKey)}[^\\s]*)\\s+КАК\\s+${escapeRegExp(resolvedAlias)}(?![0-9A-Za-zА-Яа-я_])`, 'i');
          const aliasMatch = queryText.match(aliasPattern);
          if (aliasMatch) {
            const tableDeclaration = aliasMatch[1];
            // Проверяем, есть ли виртуальная таблица в объявлении
            for (const vt of ['Остатки', 'Обороты', 'ОстаткиИОбороты', 'ДвиженияССубконто', 'ОборотыДтКт', 'Движения', 'ПериодДействия', 'ФактическийПериодДействия', 'ДанныеГрафика', 'СрезПоследних', 'СрезПервых']) {
              if (tableDeclaration.includes(`.${vt}(`)) {
                virtualTableKind = vt;
                break;
              }
            }
          }
        } else if (tableKey) {
          virtualTableKind = detectVirtualTableFromContext(queryText, cursorOffset, tableKey);
        }
        
        // Проверяем, является ли tableKey табличной частью (содержит 3 части через точку: Prefix.Object.TabularSection)
        const tableKeyParts = tableKey.split('.');
        const isTabularSection = tableKeyParts.length === 3;
        const isObject = tableKeyParts.length === 2; // Prefix.Object
        
        // Получаем базовые поля
        // ВАЖНО: ключи нормализуются одинаково:
        // - При сохранении: normTableKey(parts.slice(0, 3).join('.')) для реквизитов с 4 частями
        // - При сохранении табличной части: normTableKey(tabularSectionFullPath)
        // - При использовании: normTableKey(tableKey)
        // Все приводятся к нижнему регистру через normTableKey
        let baseFields: string[] = [];
        if (isTabularSection) {
          // Это табличная часть - получаем поля табличной части
          const normalizedKey = normTableKey(tableKey);
          baseFields = fieldsByTabularSection.get(normalizedKey) || [];
          if ((globalThis as any).__MDV_QUERY_DEBUG__ && baseFields.length === 0) {
            console.warn('[provideCompletionItems] No fields found for tabular section:', {
              tableKey,
              normalizedKey,
              availableKeys: Array.from(fieldsByTabularSection.keys())
            });
          }
        } else {
          // Это обычный объект - получаем поля объекта
          baseFields = fieldsByTable.get(normTableKey(tableKey)) || [];
        }
        
        // Если это объект (не табличная часть и не регистр), добавляем табличные части в автодополнение
        if (isObject && !tableKey.startsWith('Регистр')) {
          const tabularSections = tabularSectionsByTable.get(normTableKey(tableKey)) || [];
          for (const ts of tabularSections) {
            const safeLabel = String(ts.label || ts.insertText || '').trim();
            if (!safeLabel) continue;
            // Показываем только имя табличной части (последняя часть после точки)
            const parts = ts.insertText.split('.');
            const tabularSectionName = parts.length >= 3 ? parts[2] : safeLabel;
            suggestions.push({
              label: { label: tabularSectionName } as any,
              detail: `Табличная часть: ${safeLabel}`,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: tabularSectionName,
              range,
            });
          }
        }
        
        // Если это регистр бухгалтерии и используется виртуальная таблица, добавляем специальные поля
        let fieldsToShow = baseFields;
        if (tableKey.startsWith('РегистрБухгалтерии.') && virtualTableKind) {
          fieldsToShow = getAccountingRegisterVirtualTableFields(virtualTableKind, baseFields);
        } else if (tableKey.startsWith('РегистрБухгалтерии.') && !virtualTableKind) {
          // Для основной таблицы регистра бухгалтерии добавляем стандартные поля
          const accountingFields = ['Активность', 'ВидДвижения', 'МоментВремени', 
                         'НомерСтроки', 'Период', 'Регистратор', 'Счет', 'СчетДт', 'СчетКт', 
                         'УточнениеПериода', 'КорСчет'];
          // Добавляем поля субконто (до 3-х видов)
          for (let i = 1; i <= 3; i++) {
            accountingFields.push(`Субконто${i}`, `СубконтоДт${i}`, `СубконтоКт${i}`, 
                                  `КорСубконто${i}`, `ВидСубконто${i}`);
          }
          fieldsToShow = [...baseFields, ...accountingFields];
        } else if (tableKey.startsWith('РегистрРасчета.') && virtualTableKind) {
          fieldsToShow = getCalculationRegisterVirtualTableFields(virtualTableKind, baseFields);
        } else if (tableKey.startsWith('РегистрРасчета.') && !virtualTableKind) {
          // Для основной таблицы регистра расчета добавляем стандартные поля
          const calculationFields = ['Активность', 'ВидРасчета', 'Период', 'ПериодРегистрации',
                         'ПериодДействия', 'ПериодДействияНачало', 'ПериодДействияКонец',
                         'БазовыйПериодНачало', 'БазовыйПериодКонец', 'НомерСтроки', 'Регистратор', 
                         'Результат', 'Перерасчет', 'Сторно', 'ВидДвижения'];
          fieldsToShow = [...baseFields, ...calculationFields];
        } else if (tableKey.startsWith('РегистрНакопления.') && virtualTableKind === 'Движения') {
          // Для Движения регистра накопления добавляем стандартные поля
          fieldsToShow = [...baseFields, 'Регистратор', 'НомерСтроки', 'Период', 'ВидДвижения', 'Активность'];
        } else if (tableKey.startsWith('РегистрНакопления.') && !virtualTableKind) {
          // Для основной таблицы регистра накопления
          fieldsToShow = [...baseFields, 'Регистратор', 'НомерСтроки', 'Период', 'ВидДвижения', 'Активность'];
        } else if (tableKey.startsWith('РегистрСведений.') && virtualTableKind === 'Движения') {
          // Для Движения регистра сведений добавляем стандартные поля
          fieldsToShow = [...baseFields, 'Период', 'Регистратор', 'НомерСтроки', 'Активность'];
        } else if (tableKey.startsWith('РегистрСведений.') && !virtualTableKind) {
          // Для основной таблицы регистра сведений
          fieldsToShow = [...baseFields, 'Период', 'Регистратор', 'НомерСтроки', 'Активность'];
        }
        
        for (const f of fieldsToShow) {
          const safeLabel = String(f || '').trim();
          if (!safeLabel) continue;
          suggestions.push({
            label: { label: safeLabel } as any,
            detail: safeLabel,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: f,
            range,
          });
        }

        return { suggestions };
      }

      // 2) Таблицы после ИЗ/FROM или JOIN/СОЕДИНЕНИЕ
      const afterFrom = /(?:\s|\n|\r)(ИЗ|FROM|JOIN|СОЕДИНЕНИЕ)\s+([A-Za-zА-Яа-я_0-9\.]*)$/i.test(before);
      if (afterFrom) {
        for (const t of tableItems) {
          const safeLabel = String(t.label || t.insertText || '').trim();
          if (!safeLabel) continue;
          suggestions.push({
            label: { label: safeLabel } as any,
            detail: safeLabel,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: t.insertText,
            range,
          });
        }
        // временные таблицы из предыдущих пакетов
        for (const tt of Array.from(tempTables.values()).sort((a, b) => a.localeCompare(b, 'ru'))) {
          const safeLabel = String(tt || '').trim();
          if (!safeLabel) continue;
          suggestions.push({
            label: { label: safeLabel } as any,
            detail: safeLabel,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: tt,
            range,
          });
        }
        return { suggestions };
      }

      // 3) Ключевые слова и функции
      for (const kw of KEYWORDS) {
        suggestions.push({
          label: { label: kw } as any,
          detail: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
        });
      }
      for (const fn of FUNCTIONS) {
        suggestions.push({
          label: { label: fn } as any,
          detail: fn,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: fn,
          range,
        });
      }

      return { suggestions };
    },
  });
}


function registerHoverProvider(): void {
  if (hoverRegistered) return;
  hoverRegistered = true;

  monaco.languages.registerHoverProvider('1c-query', {
    provideHover: (model, position) => {
      const line = model.getLineContent(position.lineNumber);
      // захватываем токен с точками вокруг курсора: Prefix.Object или Prefix.Object.Field
      const idx0 = Math.max(0, position.column - 1);
      const left = line.slice(0, idx0);
      const right = line.slice(idx0);

      const leftPart = left.match(/[A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_\.]*$/)?.[0] || '';
      const rightPart = right.match(/^[0-9A-Za-zА-Яа-я_\.]*/)?.[0] || '';
      const token = (leftPart + rightPart).trim();
      if (!token) return null;

      const parts = token.split('.').filter(Boolean);
      if (parts.length < 2) return null;      const ctx = buildQueryContext(model.getValue(), model.getOffsetAt(position));
      const aliasMap = ctx.aliasMap;
      const subqueryFieldsByAlias = ctx.subqueryFieldsByAlias;
      const tempTables = ctx.tempTables;
      const tempFieldsByTable = ctx.tempFieldsByTable;

      const directTableKey = `${parts[0]}.${parts[1]}`;
      const target = aliasMap.get(normAlias(parts[0])) || '';
      const isTemp = target.startsWith('TEMP:');
      const isSub = target.startsWith('SUBQUERY:');

      const tableKey = isTemp ? '' : isSub ? '' : (target || directTableKey);
      const tempTableName = isTemp ? target.slice('TEMP:'.length) : '';
      const fields = isSub
        ? (subqueryFieldsByAlias.get(normAlias(parts[0])) || [])
        : isTemp
          ? (tempFieldsByTable.get(tempTableName) || [])
          : (fieldsByTable.get(normTableKey(tableKey)) || []);

      if (!fields) {
        return {
          contents: [{ value: `**${tableKey}**` }],
        };
      }

      const preview = fields.slice(0, 30).join(', ');
      const more = fields.length > 30 ? `\n… ещё ${fields.length - 30}` : '';

      return {
        contents: [
          { value: `**${tableKey}**` },
          { value: `Поля: ${preview}${more}` },
        ],
      };
    },
  });
}

export function register1cQueryLanguage(): void {
  registerQueryLanguage(monaco);
}

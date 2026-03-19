"use strict";
/**
 * DcsEditorApp
 *
 * EDT‑подобный webview редактор СКД (DataCompositionSchema).
 * MVP: редактирование в памяти (без сохранения в XML).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DcsEditorApp = void 0;
const react_1 = __importStar(require("react"));
const TypeWidget_1 = require("../../widgets/TypeWidget");
const QueryEditorEnhanced_1 = require("./QueryEditorEnhanced");
const MetadataTreePanel_1 = require("./MetadataTreePanel");
const monacoQueryLanguage_1 = require("../../utils/monacoQueryLanguage");
const dcsGroupingParams_1 = require("./dcsGroupingParams");
function normalizeTextForSearch(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}
function localTag(tag) {
    const t = String(tag || '');
    const idx = t.lastIndexOf(':');
    return idx >= 0 ? t.slice(idx + 1) : t;
}
function stripNamespacePrefix(typeText) {
    const s = String(typeText || '').trim();
    // Пример из DCS: d4p1:CatalogRef.Организации
    // Для TypeWidget нужны значения без namespace-префикса.
    const idx = s.indexOf(':');
    if (idx >= 0) {
        const left = s.slice(0, idx);
        const right = s.slice(idx + 1);
        // оставляем xs:/v8: как есть (это не namespace, это префикс типа)
        if (left === 'xs' || left === 'v8' || left === 'cfg')
            return s;
        return right;
    }
    return s;
}
function objectToDcsChildren(value) {
    if (!value || typeof value !== 'object')
        return [];
    const children = [];
    for (const k of Object.keys(value)) {
        const v = value[k];
        if (Array.isArray(v)) {
            for (const item of v) {
                if (item && typeof item === 'object') {
                    children.push({ path: '', tag: k, attrs: {}, children: objectToDcsChildren(item) });
                }
                else {
                    children.push({ path: '', tag: k, attrs: {}, text: String(item ?? ''), children: [] });
                }
            }
            continue;
        }
        if (v && typeof v === 'object') {
            children.push({ path: '', tag: k, attrs: {}, children: objectToDcsChildren(v) });
        }
        else {
            children.push({ path: '', tag: k, attrs: {}, text: String(v ?? ''), children: [] });
        }
    }
    return children;
}
/**
 * Утилиты для работы с деревом DCS (локальные, без зависимостей от парсера XML).
 */
function isWhitespaceNode(tag) {
    return !String(tag || '').trim();
}
function isScalarNode(node) {
    if (!node)
        return false;
    return !Array.isArray(node.children) || node.children.length === 0;
}
function findChildNodeByLocalTag(node, wantedLocalTag) {
    if (!node)
        return null;
    for (const ch of node.children || []) {
        if (localTag(ch.tag) === wantedLocalTag)
            return ch;
    }
    return null;
}
function getChildTextByLocalTag(node, wantedLocalTag) {
    const ch = findChildNodeByLocalTag(node, wantedLocalTag);
    return String(ch?.text ?? '').trim();
}
/** Извлекает текст из узла value параметра (поддержка v8:LocalStringType и простого текста) */
function extractValueFromParameterValue(valueNode) {
    if (!valueNode)
        return '';
    let val = String(valueNode.text || '').trim();
    if (val)
        return val;
    if (!valueNode.children?.length)
        return '';
    // v8:LocalStringType: value -> v8:item -> v8:content
    const itemNode = findChildNodeByLocalTag(valueNode, 'item');
    if (itemNode) {
        const contentNode = findChildNodeByLocalTag(itemNode, 'content');
        return String(contentNode?.text ?? '').trim();
    }
    // Прямой поиск content в детях (на случай другой структуры)
    const contentNode = (valueNode.children || []).find((c) => localTag(c.tag) === 'content');
    return contentNode ? String(contentNode.text ?? '').trim() : '';
}
function findAllNodes(root) {
    const out = [];
    const walk = (n) => {
        if (!n)
            return;
        out.push({ path: n.path, node: n });
        if (Array.isArray(n.children))
            for (const ch of n.children)
                walk(ch);
    };
    for (const n of root || [])
        walk(n);
    return out;
}
function findFirstPathByLocalTag(root, wantedLocalTag) {
    const walk = (list) => {
        for (const n of list || []) {
            if (!n)
                continue;
            if (localTag(n.tag) === wantedLocalTag)
                return n.path;
            const nested = walk(n.children || []);
            if (nested)
                return nested;
        }
        return '';
    };
    return walk(root || []);
}
function getNodeAtPath(root, nodePath) {
    if (!nodePath)
        return null;
    const idxs = nodePath.split('.').map((s) => Number(s));
    let list = root;
    let cur = null;
    for (const idx of idxs) {
        if (!Array.isArray(list) || !Number.isFinite(idx) || idx < 0 || idx >= list.length)
            return null;
        cur = list[idx];
        list = cur?.children;
    }
    return cur;
}
function updateNodeAtPath(root, nodePath, updater) {
    const idxs = String(nodePath || '').split('.').map((s) => Number(s)).filter((n) => Number.isFinite(n));
    if (idxs.length === 0)
        return root;
    const rec = (list, depth) => {
        const idx = idxs[depth];
        if (!Array.isArray(list) || idx < 0 || idx >= list.length)
            return list;
        const next = list.slice();
        if (depth === idxs.length - 1) {
            next[idx] = updater(next[idx]);
            return next;
        }
        const cur = next[idx];
        next[idx] = { ...cur, children: rec(cur.children || [], depth + 1) };
        return next;
    };
    return rec(root || [], 0);
}
function reindexPaths(nodes, basePath = '') {
    const walk = (list, parentPath) => {
        return (list || []).map((n, idx) => {
            const p = parentPath ? `${parentPath}.${idx}` : `${idx}`;
            return {
                ...n,
                path: p,
                children: walk(n.children || [], p),
            };
        });
    };
    return walk(nodes || [], basePath);
}
function makeTextNode(tag, text) {
    return { path: '', tag, attrs: {}, text, children: [] };
}
function makeLocalStringTitleNode(title) {
    return {
        path: '',
        tag: 'title',
        attrs: { '@_xsi:type': 'v8:LocalStringType' },
        children: [
            {
                path: '',
                tag: 'v8:item',
                attrs: {},
                children: [makeTextNode('v8:lang', 'ru'), makeTextNode('v8:content', title || '')],
            },
        ],
    };
}
function getLocalStringTitle(node) {
    const titleNode = findChildNodeByLocalTag(node, 'title');
    if (!titleNode)
        return '';
    const items = (titleNode.children || []).filter((c) => localTag(c.tag) === 'item');
    if (items.length === 0)
        return '';
    const pickContent = (it) => {
        const content = findChildNodeByLocalTag(it, 'content');
        return String(content?.text ?? '').trim();
    };
    const ruItem = items.find((it) => String(getChildTextByLocalTag(it, 'lang') || '').trim().toLowerCase() === 'ru');
    return pickContent(ruItem || items[0]);
}
function upsertLocalStringTitle(node, value) {
    const titleIdx = (node.children || []).findIndex((c) => localTag(c.tag) === 'title');
    if (titleIdx < 0) {
        return { ...node, children: [...(node.children || []), makeLocalStringTitleNode(value)] };
    }
    const titleNode = node.children[titleIdx];
    const itemIdx = (titleNode.children || []).findIndex((c) => localTag(c.tag) === 'item');
    // Убеждаемся, что атрибут xsi:type присутствует
    const nextTitle = { ...titleNode, attrs: { ...titleNode.attrs, '@_xsi:type': 'v8:LocalStringType' } };
    let itemNode;
    if (itemIdx < 0) {
        itemNode = { path: '', tag: 'v8:item', attrs: {}, children: [makeTextNode('v8:lang', 'ru'), makeTextNode('v8:content', value)] };
        nextTitle.children = [...(titleNode.children || []), itemNode];
    }
    else {
        itemNode = titleNode.children[itemIdx];
        const contentIdx = (itemNode.children || []).findIndex((c) => localTag(c.tag) === 'content');
        let nextItem = { ...itemNode };
        if (contentIdx < 0) {
            nextItem.children = [...(itemNode.children || []), makeTextNode('v8:content', value)];
        }
        else {
            const contentNode = itemNode.children[contentIdx];
            const nextChildren = itemNode.children.slice();
            nextChildren[contentIdx] = { ...contentNode, text: value };
            nextItem.children = nextChildren;
        }
        const nextTitleChildren = titleNode.children.slice();
        nextTitleChildren[itemIdx] = nextItem;
        nextTitle.children = nextTitleChildren;
    }
    const nextRootChildren = node.children.slice();
    nextRootChildren[titleIdx] = nextTitle;
    return { ...node, children: nextRootChildren };
}
function upsertChildTextByLocalTag(node, wantedLocalTag, value, overrideTag) {
    const idx = (node.children || []).findIndex((c) => localTag(c.tag) === wantedLocalTag);
    if (idx < 0) {
        const tag = overrideTag || wantedLocalTag;
        return { ...node, children: [...(node.children || []), makeTextNode(tag, value)] };
    }
    const nextChildren = node.children.slice();
    nextChildren[idx] = { ...nextChildren[idx], text: value };
    return { ...node, children: nextChildren };
}
function removeChildByLocalTag(node, wantedLocalTag) {
    const nextChildren = (node.children || []).filter((c) => localTag(c.tag) !== wantedLocalTag);
    return { ...node, children: nextChildren };
}
/** Параметры, требующие v8:LocalStringType (Заголовок и др.) */
const OUTPUT_PARAMS_LOCAL_STRING = new Set(['Заголовок']);
/** Префиксы namespace для XDTO-совместимости 1С (dcscor=core, dcsset=settings) */
const DCSCOR = 'dcscor';
const DCSSET = 'dcsset';
function makeOutputParameterValueNode(paramName, paramValue, valueTag = 'dcscor:value') {
    if (OUTPUT_PARAMS_LOCAL_STRING.has(paramName)) {
        return {
            path: '',
            tag: valueTag,
            attrs: { '@_xsi:type': 'v8:LocalStringType' },
            children: [{
                    path: '',
                    tag: 'v8:item',
                    attrs: {},
                    children: [
                        makeTextNode('v8:lang', 'ru'),
                        makeTextNode('v8:content', paramValue),
                    ],
                }],
        };
    }
    return { ...makeTextNode('value', paramValue), tag: valueTag };
}
/** Добавляет или обновляет параметр в outputParameters группировки (use = включён) */
function upsertOutputParameter(structNode, paramName, paramValue, use = true) {
    let outParamsNode = (structNode.children || []).find((c) => localTag(c.tag) === 'outputParameters');
    const firstItem = outParamsNode?.children?.[0];
    const paramTag = firstItem ? findChildNodeByLocalTag(firstItem, 'parameter')?.tag || `${DCSCOR}:parameter` : `${DCSCOR}:parameter`;
    const valueTag = firstItem ? findChildNodeByLocalTag(firstItem, 'value')?.tag || `${DCSCOR}:value` : `${DCSCOR}:value`;
    const useTag = firstItem ? findChildNodeByLocalTag(firstItem, 'use')?.tag || `${DCSCOR}:use` : `${DCSCOR}:use`;
    const itemChildren = [
        { ...makeTextNode('parameter', paramName), tag: paramTag },
        makeOutputParameterValueNode(paramName, paramValue, valueTag),
        { ...makeTextNode('use', use ? 'true' : 'false'), tag: useTag },
    ];
    if (!outParamsNode) {
        const itemTag = `${DCSCOR}:item`;
        const outParamsTag = `${DCSSET}:outputParameters`;
        const newItem = { path: '', tag: itemTag, attrs: { '@_xsi:type': 'dcsset:SettingsParameterValue' }, children: itemChildren };
        outParamsNode = { path: '', tag: outParamsTag, attrs: {}, children: [newItem] };
        return { ...structNode, children: [...(structNode.children || []), outParamsNode] };
    }
    const items = outParamsNode.children || [];
    const itemIdx = items.findIndex((it) => {
        const p = findChildNodeByLocalTag(it, 'parameter');
        return p && String(p.text || '').trim() === paramName;
    });
    const newItemNode = {
        path: '',
        tag: items[0]?.tag || `${DCSCOR}:item`,
        attrs: items[0]?.attrs || { '@_xsi:type': 'dcsset:SettingsParameterValue' },
        children: itemChildren,
    };
    let nextItems;
    if (itemIdx >= 0) {
        nextItems = items.slice();
        nextItems[itemIdx] = newItemNode;
    }
    else {
        nextItems = [...items, newItemNode];
    }
    const nextOutParams = { ...outParamsNode, children: nextItems };
    const outIdx = (structNode.children || []).findIndex((c) => localTag(c.tag) === 'outputParameters');
    const nextChildren = (structNode.children || []).slice();
    nextChildren[outIdx] = nextOutParams;
    return { ...structNode, children: nextChildren };
}
/** Устанавливает флаг use для параметра outputParameters */
function setOutputParameterUse(structNode, paramName, use) {
    const outParamsNode = (structNode.children || []).find((c) => localTag(c.tag) === 'outputParameters');
    if (!outParamsNode?.children)
        return structNode;
    const itemIdx = outParamsNode.children.findIndex((it) => {
        const p = findChildNodeByLocalTag(it, 'parameter');
        return p && String(p.text || '').trim() === paramName;
    });
    if (itemIdx < 0)
        return structNode;
    const item = outParamsNode.children[itemIdx];
    let useNode = findChildNodeByLocalTag(item, 'use');
    const nextItemChildren = (item.children || []).slice();
    if (useNode) {
        const useIdx = nextItemChildren.findIndex((c) => localTag(c.tag) === 'use');
        nextItemChildren[useIdx] = { ...nextItemChildren[useIdx], text: use ? 'true' : 'false' };
    }
    else {
        nextItemChildren.push(makeTextNode('use', use ? 'true' : 'false'));
    }
    const nextItem = { ...item, children: nextItemChildren };
    const nextItems = outParamsNode.children.slice();
    nextItems[itemIdx] = nextItem;
    const nextOutParams = { ...outParamsNode, children: nextItems };
    const outIdx = (structNode.children || []).findIndex((c) => localTag(c.tag) === 'outputParameters');
    const nextChildren = (structNode.children || []).slice();
    nextChildren[outIdx] = nextOutParams;
    return { ...structNode, children: nextChildren };
}
function getNodeLabel(node) {
    const lt = localTag(node.tag);
    if (lt === 'dataSet')
        return getChildTextByLocalTag(node, 'name') || 'dataSet';
    if (lt === 'parameter')
        return getLocalStringTitle(node) || getChildTextByLocalTag(node, 'name') || 'parameter';
    if (lt === 'field')
        return getLocalStringTitle(node) || getChildTextByLocalTag(node, 'dataPath') || getChildTextByLocalTag(node, 'field') || 'field';
    if (lt === 'calculatedField')
        return getLocalStringTitle(node) || getChildTextByLocalTag(node, 'dataPath') || 'calculatedField';
    if (lt === 'totalField')
        return getChildTextByLocalTag(node, 'dataPath') || 'totalField';
    if (lt === 'settingsVariant')
        return getChildTextByLocalTag(node, 'name') || 'settingsVariant';
    return lt || node.tag || 'node';
}
function buildTree(nodes) {
    if (!Array.isArray(nodes))
        return [];
    return nodes
        .filter((n) => n && !isWhitespaceNode(n.tag))
        .map((n) => ({
        path: n.path,
        tag: n.tag,
        label: getNodeLabel(n),
        children: buildTree(n.children),
    }));
}
function filterTree(nodes, query) {
    const q = normalizeTextForSearch(query);
    if (!q)
        return nodes;
    const walk = (n) => {
        const selfMatch = normalizeTextForSearch(n.label).includes(q) || normalizeTextForSearch(n.tag).includes(q);
        const kids = n.children.map(walk).filter(Boolean);
        if (selfMatch || kids.length)
            return { ...n, children: kids };
        return null;
    };
    return nodes.map(walk).filter(Boolean);
}
function dcsNodeToObject(node) {
    if (!node)
        return undefined;
    if (!node.children || node.children.length === 0)
        return node.text ?? '';
    const obj = {};
    for (const ch of node.children || []) {
        const key = ch.tag;
        const val = dcsNodeToObject(ch);
        if (obj[key] === undefined)
            obj[key] = val;
        else if (Array.isArray(obj[key]))
            obj[key].push(val);
        else
            obj[key] = [obj[key], val];
    }
    return obj;
}
function objectToDcsNode(tag, value) {
    if (value === null || value === undefined)
        return { path: '', tag, attrs: {}, text: '', children: [] };
    if (typeof value !== 'object' || Array.isArray(value)) {
        return { path: '', tag, attrs: {}, text: String(value), children: [] };
    }
    return { path: '', tag, attrs: {}, children: objectToDcsChildren(value) };
}
function buildTypeWidgetValueFromValueTypeNode(valueTypeNode) {
    if (!valueTypeNode)
        return null;
    return dcsNodeToObject(valueTypeNode);
}
function applyTypeWidgetValueToParameter(parameterNode, typeWidgetValue) {
    const idx = (parameterNode.children || []).findIndex((c) => localTag(c.tag) === 'valueType');
    const nextValueType = objectToDcsNode('valueType', typeWidgetValue);
    if (idx < 0) {
        return { ...parameterNode, children: [...(parameterNode.children || []), nextValueType] };
    }
    const nextChildren = parameterNode.children.slice();
    // сохраняем исходный tag (если он был с namespace-префиксом)
    nextChildren[idx] = { ...nextValueType, tag: parameterNode.children[idx].tag };
    return { ...parameterNode, children: nextChildren };
}
function getFirstTypeFromValueType(node) {
    const vt = findChildNodeByLocalTag(node, 'valueType');
    if (!vt)
        return '';
    const t = findChildNodeByLocalTag(vt, 'Type');
    const v8t = findChildNodeByLocalTag(vt, 'Type') || findChildNodeByLocalTag(vt, 'v8:Type');
    const raw = String((t?.text ?? v8t?.text ?? '')).trim();
    if (!raw) {
        // иногда тип лежит как v8:Type внутри valueType
        const anyTypeNode = (vt.children || []).find((c) => localTag(c.tag) === 'Type');
        return stripNamespacePrefix(String(anyTypeNode?.text ?? '').trim());
    }
    return stripNamespacePrefix(raw);
}
function extractFieldNamesFromQuery(query) {
    const text = String(query || '');
    if (!text.trim())
        return [];
    // 1) Разбиваем на пакеты запросов по ';' (но игнорируем ';' внутри строк/комментариев/скобок { })
    const splitPackages = (s) => {
        const out = [];
        let start = 0;
        let i = 0;
        let inString = false;
        let inLineComment = false;
        let inBlockComment = false;
        let braceDepth = 0; // Глубина вложенности скобок { }
        while (i < s.length) {
            const ch = s[i];
            const next = s[i + 1];
            if (inLineComment) {
                if (ch === '\n')
                    inLineComment = false;
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
                // 1С: экранирование двойной кавычки часто делается как "" внутри строки
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
            // normal
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
            // Обработка скобок { } - специальные символы компоновки данных 1С
            if (ch === '{') {
                braceDepth++;
                i++;
                continue;
            }
            if (ch === '}') {
                braceDepth = Math.max(0, braceDepth - 1);
                i++;
                continue;
            }
            // Игнорируем ';' внутри скобок { }
            if (ch === ';' && braceDepth === 0) {
                out.push(s.slice(start, i));
                start = i + 1;
                i++;
                continue;
            }
            i++;
        }
        out.push(s.slice(start));
        return out;
    };
    const packages = splitPackages(text).map((p) => p.trim()).filter(Boolean);
    if (packages.length === 0)
        return [];
    // По текущей логике автообновления полей работаем по последнему непустому пакету.
    const pkg = packages[packages.length - 1];
    const tokenize = (s) => {
        const toks = [];
        let i = 0;
        let inString = false;
        let inLineComment = false;
        let inBlockComment = false;
        let braceDepth = 0; // Глубина вложенности скобок { }
        let inSelectSection = false; // Находимся ли мы в секции SELECT (между ВЫБРАТЬ и ИЗ)
        const isIdentStart = (c) => /[A-Za-zА-Яа-я_]/.test(c);
        const isIdentPart = (c) => /[0-9A-Za-zА-Яа-я_]/.test(c);
        while (i < s.length) {
            const ch = s[i];
            const next = s[i + 1];
            if (inLineComment) {
                if (ch === '\n')
                    inLineComment = false;
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
            // normal
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
            // Проверяем ключевые слова для определения секции SELECT
            if (isIdentStart(ch)) {
                const start = i;
                i++;
                while (i < s.length && isIdentPart(s[i]))
                    i++;
                const raw = s.slice(start, i);
                const upper = raw.toUpperCase();
                // Начало секции SELECT
                if (upper === 'ВЫБРАТЬ' || upper === 'SELECT') {
                    inSelectSection = true;
                    toks.push({ raw, upper, idx: start });
                    continue;
                }
                // Конец секции SELECT
                if (upper === 'ИЗ' || upper === 'FROM') {
                    inSelectSection = false;
                    braceDepth = 0; // Сбрасываем счетчик скобок при выходе из секции SELECT
                    toks.push({ raw, upper, idx: start });
                    continue;
                }
                toks.push({ raw, upper, idx: start });
                continue;
            }
            // Обработка скобок { } - специальные символы компоновки данных 1С
            // Учитываем их только в секции SELECT (для группировки полей)
            if (ch === '{') {
                if (inSelectSection) {
                    braceDepth++;
                    // Если скобка содержит ВЫБРАТЬ/SELECT, это подзапрос, не пропускаем токенизацию
                    // Проверяем содержимое скобки впереди
                    let lookAhead = i + 1;
                    let foundSelect = false;
                    while (lookAhead < Math.min(s.length, i + 100)) { // Ограничиваем поиск
                        if (s[lookAhead] === '}')
                            break;
                        const wordStart = lookAhead;
                        while (lookAhead < s.length && isIdentPart(s[lookAhead]))
                            lookAhead++;
                        const word = s.slice(wordStart, lookAhead).toUpperCase();
                        if (word === 'ВЫБРАТЬ' || word === 'SELECT') {
                            foundSelect = true;
                            break;
                        }
                        if (lookAhead >= s.length || !isIdentStart(s[lookAhead]))
                            lookAhead++;
                    }
                    // Если это не подзапрос, пропускаем токенизацию внутри скобок
                    if (!foundSelect) {
                        i++;
                        continue;
                    }
                }
                i++;
                continue;
            }
            if (ch === '}') {
                if (inSelectSection && braceDepth > 0) {
                    braceDepth = Math.max(0, braceDepth - 1);
                    i++;
                    continue;
                }
                i++;
                continue;
            }
            // Пропускаем токенизацию внутри скобок { } только в секции SELECT
            if (inSelectSection && braceDepth > 0) {
                i++;
                continue;
            }
            i++;
        }
        return toks;
    };
    const toks = tokenize(pkg);
    if (toks.length === 0)
        return [];
    // 3) Проверяем наличие ОБЪЕДИНИТЬ/UNION в запросе
    let hasUnion = false;
    let firstUnionIdx = null;
    for (let i = 0; i < toks.length; i++) {
        const upper = toks[i].upper;
        // Проверяем ОБЪЕДИНИТЬ, UNION, а также ОБЪЕДИНИТЬ ВСЕ (следующий токен может быть ВСЕ/ALL)
        if (upper === 'ОБЪЕДИНИТЬ' || upper === 'UNION') {
            hasUnion = true;
            if (firstUnionIdx === null)
                firstUnionIdx = i;
            break;
        }
    }
    // 4) Ищем все SELECT/ВЫБРАТЬ
    const selectIdxs = [];
    for (let i = 0; i < toks.length; i++) {
        if (toks[i].upper === 'ВЫБРАТЬ' || toks[i].upper === 'SELECT')
            selectIdxs.push(i);
    }
    if (selectIdxs.length === 0)
        return [];
    let chosen = null;
    if (hasUnion && firstUnionIdx !== null) {
        // Если есть ОБЪЕДИНИТЬ, обрабатываем только первый SELECT блок (до первого ОБЪЕДИНИТЬ)
        const firstSelectIdx = selectIdxs[0];
        if (firstSelectIdx !== undefined) {
            // Ищем конец первого SELECT блока (до первого ОБЪЕДИНИТЬ)
            chosen = { startTokIdx: firstSelectIdx, endTokIdx: firstUnionIdx };
        }
    }
    else {
        // Если нет ОБЪЕДИНИТЬ, выбираем финальный SELECT, который НЕ содержит ПОМЕСТИТЬ
        const selectRanges = selectIdxs.map((startTokIdx, idx) => {
            const endTokIdx = idx + 1 < selectIdxs.length ? selectIdxs[idx + 1] : toks.length;
            return { startTokIdx, endTokIdx };
        });
        for (const r of selectRanges) {
            let hasPomestit = false;
            for (let i = r.startTokIdx; i < r.endTokIdx; i++) {
                if (toks[i].upper === 'ПОМЕСТИТЬ') {
                    hasPomestit = true;
                    break;
                }
            }
            if (!hasPomestit)
                chosen = r; // берём последний без ПОМЕСТИТЬ
        }
    }
    if (!chosen)
        return [];
    // 5) Найдём индекс первого ИЗ/FROM в выбранном SELECT-блоке
    let fromTokIdx = null;
    for (let i = chosen.startTokIdx; i < chosen.endTokIdx; i++) {
        if (toks[i].upper === 'ИЗ' || toks[i].upper === 'FROM') {
            fromTokIdx = i;
            break;
        }
    }
    // Если нет FROM, извлекаем из всего SELECT-блока (маловероятный случай)
    const selectEnd = fromTokIdx !== null ? fromTokIdx : chosen.endTokIdx;
    // 6) Извлекаем алиасы: КАК/AS <Identifier> только из секции SELECT ... ИЗ
    const out = [];
    const push = (v) => {
        const s = String(v || '').trim();
        if (s && !out.includes(s))
            out.push(s);
    };
    for (let i = chosen.startTokIdx; i < selectEnd - 1; i++) {
        const t = toks[i].upper;
        if (t === 'КАК' || t === 'AS') {
            const nextTok = toks[i + 1];
            if (nextTok?.raw)
                push(nextTok.raw);
        }
    }
    return out;
}
/**
 * Извлекает пары (имя поля, алиас) из запроса
 * Возвращает массив объектов { fieldName: string, alias?: string }
 *
 * @param query - текст запроса
 * @returns массив объектов с именами полей и их алиасами
 */
function extractFieldNamesWithAliases(query) {
    const text = String(query || '');
    if (!text.trim())
        return [];
    // Используем ту же логику разбивки на пакеты
    const splitPackages = (s) => {
        const out = [];
        let start = 0;
        let i = 0;
        let inString = false;
        let inLineComment = false;
        let inBlockComment = false;
        let braceDepth = 0;
        while (i < s.length) {
            const ch = s[i];
            const next = s[i + 1];
            if (inLineComment) {
                if (ch === '\n')
                    inLineComment = false;
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
            if (ch === '{') {
                braceDepth++;
                i++;
                continue;
            }
            if (ch === '}') {
                braceDepth = Math.max(0, braceDepth - 1);
                i++;
                continue;
            }
            if (ch === ';' && braceDepth === 0) {
                out.push(s.slice(start, i));
                start = i + 1;
                i++;
                continue;
            }
            i++;
        }
        out.push(s.slice(start));
        return out;
    };
    const packages = splitPackages(text).map((p) => p.trim()).filter(Boolean);
    if (packages.length === 0)
        return [];
    const pkg = packages[packages.length - 1];
    // Проверяем наличие ОБЪЕДИНИТЬ/UNION в запросе
    // Ищем ОБЪЕДИНИТЬ, UNION, ОБЪЕДИНИТЬ ВСЕ, UNION ALL
    const unionMatch = pkg.match(/\b(?:ОБЪЕДИНИТЬ(?:\s+ВСЕ)?|UNION(?:\s+ALL)?)\b/i);
    const hasUnion = unionMatch !== null;
    let selectClause;
    if (hasUnion && unionMatch) {
        // Если есть ОБЪЕДИНИТЬ, обрабатываем только первый SELECT блок (до первого ОБЪЕДИНИТЬ)
        const firstPart = pkg.slice(0, unionMatch.index);
        const firstSelectMatch = firstPart.match(/\b(?:ВЫБРАТЬ|SELECT)\s+(.+?)\s+(?:ИЗ|FROM)\b/is);
        if (!firstSelectMatch)
            return [];
        selectClause = firstSelectMatch[1];
    }
    else {
        // Если нет ОБЪЕДИНИТЬ, ищем секцию SELECT ... FROM как обычно
        const selectMatch = pkg.match(/\b(?:ВЫБРАТЬ|SELECT)\s+(.+?)\s+(?:ИЗ|FROM)\b/is);
        if (!selectMatch)
            return [];
        selectClause = selectMatch[1];
    }
    // Разбиваем на поля по запятой (учитывая скобки, строки, комментарии)
    const extractFields = (clause) => {
        const fields = [];
        let start = 0;
        let depth = 0;
        let braceDepth = 0;
        let inString = false;
        let inComment = false;
        for (let i = 0; i <= clause.length; i++) {
            const ch = clause[i] || '';
            const next = clause[i + 1] || '';
            if (inComment) {
                if (ch === '\n')
                    inComment = false;
                continue;
            }
            if (inString) {
                if (ch === '"' && next === '"') {
                    i++;
                    continue;
                }
                if (ch === '"')
                    inString = false;
                continue;
            }
            if (ch === '/' && next === '/') {
                inComment = true;
                i++;
                continue;
            }
            if (ch === '"') {
                inString = true;
                continue;
            }
            if (ch === '(')
                depth++;
            if (ch === ')')
                depth--;
            if (ch === '{')
                braceDepth++;
            if (ch === '}')
                braceDepth--;
            // Разделитель полей - запятая на верхнем уровне
            if ((ch === ',' || i === clause.length) && depth === 0 && braceDepth === 0 && !inString) {
                const fieldText = clause.slice(start, i).trim();
                if (fieldText) {
                    // Ищем КАК/AS
                    // Ищем КАК/AS - если есть, то алиас используется как имя поля
                    const kakMatch = fieldText.match(/^(.+?)\s+(?:КАК|AS)\s+(.+)$/is);
                    if (kakMatch) {
                        const alias = kakMatch[2].trim();
                        // Алиас используется как имя поля
                        fields.push({ fieldName: alias, alias });
                    }
                    else {
                        // Нет алиаса, берем последнюю часть выражения
                        const fieldName = fieldText.split(/\./).pop()?.trim() || fieldText.trim();
                        fields.push({ fieldName });
                    }
                }
                start = i + 1;
            }
        }
        return fields;
    };
    return extractFields(selectClause);
}
const TreeNodeView = ({ node, selectedPath, onSelect }) => {
    const isSelected = node.path === selectedPath;
    return (react_1.default.createElement("div", { className: "tree-node" },
        react_1.default.createElement("div", { className: `tree-node__label ${isSelected ? 'is-selected' : ''}`, onClick: () => onSelect(node.path), title: node.label }, node.label),
        node.children.length > 0 && (react_1.default.createElement("div", { className: "tree-node__children" }, node.children.map((ch) => (react_1.default.createElement(TreeNodeView, { key: ch.path, node: ch, selectedPath: selectedPath, onSelect: onSelect })))))));
};
const TreeView = ({ nodes, selectedPath, onSelect }) => {
    return (react_1.default.createElement("div", { className: "tree-view" }, nodes.map((n) => (react_1.default.createElement(TreeNodeView, { key: n.path, node: n, selectedPath: selectedPath, onSelect: onSelect })))));
};
const DcsList = ({ rows, selectedKey, onSelect }) => {
    return (react_1.default.createElement("div", { className: "dcs-list" },
        react_1.default.createElement("table", { className: "edt-grid__table dcs-list__table" },
            react_1.default.createElement("tbody", null, rows.map((r) => (react_1.default.createElement("tr", { key: r.key, className: r.key === selectedKey ? 'is-selected' : '' },
                react_1.default.createElement("td", null,
                    react_1.default.createElement("button", { type: "button", className: "dcs-list__rowBtn", onClick: () => onSelect(r.key), title: r.subtitle ? `${r.title} — ${r.subtitle}` : r.title },
                        react_1.default.createElement("div", { className: "dcs-list__title" }, r.title),
                        r.subtitle ? react_1.default.createElement("div", { className: "dcs-list__subtitle" }, r.subtitle) : null))))))),
        rows.length === 0 ? react_1.default.createElement("div", { className: "dcs-empty" }, "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445") : null));
};
const DcsDatasetDetails = ({ node, metadata, selectedFieldKey, onSelectFieldKey, onChangeDataSetQuery, onUpdateNode, onOpenQueryEditor }) => {
    if (!node || localTag(node.tag) !== 'dataSet') {
        return react_1.default.createElement("div", { className: "dcs-empty" }, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043D\u0430\u0431\u043E\u0440 \u0434\u0430\u043D\u043D\u044B\u0445");
    }
    const name = getChildTextByLocalTag(node, 'name');
    const dsType = String(node.attrs?.['@_xsi:type'] || node.attrs?.['@_type'] || '').trim();
    const queryNode = findChildNodeByLocalTag(node, 'query');
    const queryText = String(queryNode?.text ?? '');
    const fields = (node.children || []).filter((c) => localTag(c.tag) === 'field');
    const fieldRows = fields.map((f, i) => {
        const dataPath = getChildTextByLocalTag(f, 'dataPath');
        const fieldName = getChildTextByLocalTag(f, 'field');
        const title = getLocalStringTitle(f);
        const roleNode = (f.children || []).find((c) => localTag(c.tag) === 'role');
        const roleDim = roleNode ? getChildTextByLocalTag(roleNode, 'dimension') : '';
        const roleRes = roleNode ? getChildTextByLocalTag(roleNode, 'resource') : '';
        const role = [roleDim ? 'dimension' : '', roleRes ? 'resource' : ''].filter(Boolean).join(', ');
        return { i, key: f.path, fieldNode: f, fieldName, dataPath, title, role };
    });
    const selectedField = fieldRows.find((r) => r.key === selectedFieldKey) || null;
    const isSelectedFieldValid = !!selectedField;
    const selectedRoleNode = selectedField ? selectedField.fieldNode.children.find((c) => localTag(c.tag) === 'role') : null;
    const isDim = selectedRoleNode ? String(getChildTextByLocalTag(selectedRoleNode, 'dimension') || '').toLowerCase() === 'true' : false;
    const isRes = selectedRoleNode ? String(getChildTextByLocalTag(selectedRoleNode, 'resource') || '').toLowerCase() === 'true' : false;
    return (react_1.default.createElement("div", { className: "dcs-details" },
        react_1.default.createElement("div", { className: "dcs-details__head" },
            react_1.default.createElement("div", { className: "dcs-details__name" }, name ? name : 'Набор данных'),
            dsType ? react_1.default.createElement("div", { className: "dcs-details__meta" }, dsType) : null),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" },
                "\u0417\u0430\u043F\u0440\u043E\u0441",
                queryNode && (react_1.default.createElement("button", { type: "button", className: "dcs-section__action-btn", onClick: () => onOpenQueryEditor(node.path, queryText), title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0437\u0430\u043F\u0440\u043E\u0441\u0430", "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0437\u0430\u043F\u0440\u043E\u0441\u0430" }, "\u270E \u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C"))),
            react_1.default.createElement("div", { className: "dcs-section__body" }, queryNode ? (react_1.default.createElement("div", { className: "dcs-query-preview", onClick: () => onOpenQueryEditor(node.path, queryText), title: "\u041A\u043B\u0438\u043A\u043D\u0438\u0442\u0435 \u0434\u043B\u044F \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F" }, queryText ? (react_1.default.createElement("pre", { style: { margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', opacity: 0.8, cursor: 'pointer' } },
                queryText.substring(0, 300),
                queryText.length > 300 && '...')) : (react_1.default.createElement("div", { className: "dcs-empty", style: { cursor: 'pointer' } }, "\u041A\u043B\u0438\u043A\u043D\u0438\u0442\u0435 \u0434\u043B\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0437\u0430\u043F\u0440\u043E\u0441\u0430...")))) : (react_1.default.createElement("div", { className: "dcs-empty" }, "\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D (\u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F <query> \u0434\u043B\u044F DataSetQuery)")))),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u041F\u043E\u043B\u044F"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("table", { className: "edt-grid__table" },
                    react_1.default.createElement("thead", null,
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("th", { style: { width: '25%' } }, "\u041F\u043E\u043B\u0435"),
                            react_1.default.createElement("th", { style: { width: '35%' } }, "DataPath"),
                            react_1.default.createElement("th", null, "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A"),
                            react_1.default.createElement("th", { style: { width: '14%' } }, "\u0420\u043E\u043B\u044C"))),
                    react_1.default.createElement("tbody", null,
                        fieldRows.map((r) => (react_1.default.createElement("tr", { key: r.i, className: r.key === selectedFieldKey ? 'is-selected' : '', onClick: () => onSelectFieldKey(r.key) },
                            react_1.default.createElement("td", null, r.fieldName),
                            react_1.default.createElement("td", null, r.dataPath),
                            react_1.default.createElement("td", null, r.title),
                            react_1.default.createElement("td", null, r.role)))),
                        fieldRows.length === 0 ? (react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { colSpan: 4, style: { opacity: 0.7 } }, "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439"))) : null)),
                react_1.default.createElement("div", { className: "dcs-empty", style: { paddingLeft: 0 } }, "\u041A\u043B\u0438\u043A\u043D\u0438 \u043F\u043E \u0441\u0442\u0440\u043E\u043A\u0435 \u043F\u043E\u043B\u044F, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0441\u0432\u043E\u0439\u0441\u0442\u0432 \u043F\u043E\u043B\u044F \u043D\u0438\u0436\u0435."),
                react_1.default.createElement("div", { className: "dcs-fieldsEditor" },
                    react_1.default.createElement("div", { className: "dcs-section__title" }, "\u0421\u0432\u043E\u0439\u0441\u0442\u0432\u0430 \u043F\u043E\u043B\u044F"),
                    isSelectedFieldValid ? (react_1.default.createElement("div", { className: "dcs-section__body" },
                        react_1.default.createElement("table", { className: "edt-grid__table" },
                            react_1.default.createElement("tbody", null,
                                react_1.default.createElement("tr", null,
                                    react_1.default.createElement("td", { style: { width: '35%', opacity: 0.8 } }, "\u0418\u043C\u044F"),
                                    react_1.default.createElement("td", null,
                                        react_1.default.createElement("input", { className: "edt-props-editor__input", value: selectedField.fieldName, onChange: (e) => onUpdateNode(selectedField.key, (n) => upsertChildTextByLocalTag(n, 'field', e.target.value)) }))),
                                react_1.default.createElement("tr", null,
                                    react_1.default.createElement("td", { style: { opacity: 0.8 } }, "DataPath"),
                                    react_1.default.createElement("td", null,
                                        react_1.default.createElement("input", { className: "edt-props-editor__input", value: selectedField.dataPath, onChange: (e) => onUpdateNode(selectedField.key, (n) => upsertChildTextByLocalTag(n, 'dataPath', e.target.value)) }))),
                                react_1.default.createElement("tr", null,
                                    react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A"),
                                    react_1.default.createElement("td", null,
                                        react_1.default.createElement("input", { className: "edt-props-editor__input", value: selectedField.title, onChange: (e) => onUpdateNode(selectedField.key, (n) => upsertLocalStringTitle(n, e.target.value)) }))),
                                react_1.default.createElement("tr", null,
                                    react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u0420\u043E\u043B\u044C"),
                                    react_1.default.createElement("td", null,
                                        react_1.default.createElement("label", { style: { marginRight: 12 } },
                                            react_1.default.createElement("input", { type: "checkbox", checked: isDim, onChange: (e) => {
                                                    const enabled = e.target.checked;
                                                    onUpdateNode(selectedField.key, (fieldNode) => {
                                                        const roleNode = fieldNode.children.find((c) => localTag(c.tag) === 'role');
                                                        if (!roleNode) {
                                                            if (!enabled)
                                                                return fieldNode;
                                                            const newRole = {
                                                                path: '',
                                                                tag: 'role',
                                                                attrs: {},
                                                                children: [{ path: '', tag: 'dcscom:dimension', attrs: {}, text: 'true', children: [] }],
                                                            };
                                                            return { ...fieldNode, children: [...(fieldNode.children || []), newRole] };
                                                        }
                                                        const nextRole = enabled
                                                            ? upsertChildTextByLocalTag(roleNode, 'dimension', 'true', 'dcscom:dimension')
                                                            : removeChildByLocalTag(roleNode, 'dimension');
                                                        const nextChildren = fieldNode.children.slice();
                                                        const idx = nextChildren.findIndex((c) => c === roleNode);
                                                        nextChildren[idx] = nextRole;
                                                        return { ...fieldNode, children: nextChildren };
                                                    });
                                                } }),
                                            ' ',
                                            "\u0418\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0435"),
                                        react_1.default.createElement("label", null,
                                            react_1.default.createElement("input", { type: "checkbox", checked: isRes, onChange: (e) => {
                                                    const enabled = e.target.checked;
                                                    onUpdateNode(selectedField.key, (fieldNode) => {
                                                        const roleNode = fieldNode.children.find((c) => localTag(c.tag) === 'role');
                                                        if (!roleNode) {
                                                            if (!enabled)
                                                                return fieldNode;
                                                            const newRole = {
                                                                path: '',
                                                                tag: 'role',
                                                                attrs: {},
                                                                children: [{ path: '', tag: 'dcscom:resource', attrs: {}, text: 'true', children: [] }],
                                                            };
                                                            return { ...fieldNode, children: [...(fieldNode.children || []), newRole] };
                                                        }
                                                        const nextRole = enabled
                                                            ? upsertChildTextByLocalTag(roleNode, 'resource', 'true', 'dcscom:resource')
                                                            : removeChildByLocalTag(roleNode, 'resource');
                                                        const nextChildren = fieldNode.children.slice();
                                                        const idx = nextChildren.findIndex((c) => c === roleNode);
                                                        nextChildren[idx] = nextRole;
                                                        return { ...fieldNode, children: nextChildren };
                                                    });
                                                } }),
                                            ' ',
                                            "\u0420\u0435\u0441\u0443\u0440\u0441"))))))) : (react_1.default.createElement("div", { className: "dcs-empty" }, "\u041F\u043E\u043B\u0435 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E")))))));
};
const DcsParameterDetails = ({ node, onChangeNodeText, onUpdateNode, metadata }) => {
    // Показываем только параметры схемы (а не параметры макетов/шаблонов)
    if (!node || localTag(node.tag) !== 'parameter')
        return react_1.default.createElement("div", { className: "dcs-empty" }, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440");
    const name = getChildTextByLocalTag(node, 'name');
    const title = getLocalStringTitle(node);
    const typeText = getFirstTypeFromValueType(node);
    const valueNode = findChildNodeByLocalTag(node, 'value');
    const exprNode = findChildNodeByLocalTag(node, 'expression');
    const useRestrictionNode = findChildNodeByLocalTag(node, 'useRestriction');
    const denyIncompleteNode = findChildNodeByLocalTag(node, 'denyIncompleteValues');
    const useNode = findChildNodeByLocalTag(node, 'use');
    const valueListAllowedNode = findChildNodeByLocalTag(node, 'valueListAllowed');
    const isScalarValue = isScalarNode(valueNode);
    return (react_1.default.createElement("div", { className: "dcs-details" },
        react_1.default.createElement("div", { className: "dcs-details__head" },
            react_1.default.createElement("div", { className: "dcs-details__name" }, title || name || 'Параметр'),
            typeText ? react_1.default.createElement("div", { className: "dcs-details__meta" }, typeText) : null),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0435"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("table", { className: "edt-grid__table" },
                    react_1.default.createElement("tbody", null,
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { width: '35%', opacity: 0.8 } }, "\u0418\u043C\u044F"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("input", { className: "edt-props-editor__input", value: name, onChange: (e) => onChangeNodeText(findChildNodeByLocalTag(node, 'name')?.path || '', e.target.value) }))),
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("input", { className: "edt-props-editor__input", value: title, onChange: (e) => onUpdateNode(node.path, (n) => upsertLocalStringTitle(n, e.target.value)) }))),
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u0422\u0438\u043F"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement(TypeWidget_1.TypeWidget, { value: buildTypeWidgetValueFromValueTypeNode(findChildNodeByLocalTag(node, 'valueType')), onChange: (newType) => onUpdateNode(node.path, (n) => applyTypeWidgetValueToParameter(n, newType)), options: {
                                        registers: metadata.registers,
                                        referenceTypes: metadata.referenceTypes,
                                    }, id: "dcs-param-type", name: "dcs-param-type", label: "\u0422\u0438\u043F", schema: { type: 'object' }, uiSchema: {}, required: false, disabled: false, readonly: false, autofocus: false, rawErrors: [], formContext: {}, registry: {}, onBlur: () => { }, onFocus: () => { } }))),
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("label", null,
                                    react_1.default.createElement("input", { type: "checkbox", checked: String(useRestrictionNode?.text || '').trim().toLowerCase() === 'true', onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'useRestriction', e.target.checked ? 'true' : 'false')) }),
                                    ' ',
                                    "useRestriction"))),
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u0417\u0430\u043F\u0440\u0435\u0442 \u043D\u0435\u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0445"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("label", null,
                                    react_1.default.createElement("input", { type: "checkbox", checked: String(denyIncompleteNode?.text || '').trim().toLowerCase() === 'true', onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'denyIncompleteValues', e.target.checked ? 'true' : 'false')) }),
                                    ' ',
                                    "denyIncompleteValues"))),
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("input", { className: "edt-props-editor__input", value: String(useNode?.text || ''), onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'use', e.target.value)), placeholder: "Always" }))),
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u0414\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0441\u043F\u0438\u0441\u043E\u043A \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("label", null,
                                    react_1.default.createElement("input", { type: "checkbox", checked: String(valueListAllowedNode?.text || '').trim().toLowerCase() === 'true', onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'valueListAllowed', e.target.checked ? 'true' : 'false')) }),
                                    ' ',
                                    "valueListAllowed"))))))),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u0412\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("input", { className: "edt-props-editor__input", value: String(exprNode?.text || ''), onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'expression', e.target.value)), placeholder: "expression" }))),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("textarea", { className: "dcs-query__textarea", value: String(valueNode?.text || ''), onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'value', e.target.value)), spellCheck: false, placeholder: "value" }),
                !isScalarValue ? (react_1.default.createElement("div", { className: "dcs-empty" }, "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0441\u043B\u043E\u0436\u043D\u043E\u0439 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u044B \u043F\u043E\u043A\u0430 \u043D\u0435 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0435\u043C (\u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u043C \u043D\u0438\u0436\u0435 \u043A\u0430\u043A \u0441\u043F\u0440\u0430\u0432\u043A\u0443).")) : null,
                !isScalarValue && valueNode ? (react_1.default.createElement("pre", { style: { margin: '8px 0 0', fontSize: 12, whiteSpace: 'pre-wrap' } }, JSON.stringify(valueNode, null, 2))) : null))));
};
const DcsLinkDetails = ({ node, onUpdateNode }) => {
    if (!node || localTag(node.tag) !== 'dataSetLink')
        return react_1.default.createElement("div", { className: "dcs-empty" }, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0432\u044F\u0437\u044C");
    const src = getChildTextByLocalTag(node, 'sourceDataSet');
    const dst = getChildTextByLocalTag(node, 'destinationDataSet');
    const srcExpr = getChildTextByLocalTag(node, 'sourceExpression');
    const dstExpr = getChildTextByLocalTag(node, 'destinationExpression');
    const condNode = findChildNodeByLocalTag(node, 'linkConditionExpression');
    return (react_1.default.createElement("div", { className: "dcs-details" },
        react_1.default.createElement("div", { className: "dcs-details__head" },
            react_1.default.createElement("div", { className: "dcs-details__name" }, [src, dst].filter(Boolean).join(' → ') || 'Связь наборов данных')),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u041F\u043E\u043B\u044F \u0441\u0432\u044F\u0437\u0438"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("table", { className: "edt-grid__table" },
                    react_1.default.createElement("tbody", null,
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { width: '35%', opacity: 0.8 } }, "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("input", { className: "edt-props-editor__input", value: src, onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'sourceDataSet', e.target.value)) }))),
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u041F\u0440\u0438\u0435\u043C\u043D\u0438\u043A"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("input", { className: "edt-props-editor__input", value: dst, onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'destinationDataSet', e.target.value)) }))),
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u041F\u043E\u043B\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("input", { className: "edt-props-editor__input", value: srcExpr, onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'sourceExpression', e.target.value)) }))),
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u041F\u043E\u043B\u0435 \u043F\u0440\u0438\u0435\u043C\u043D\u0438\u043A\u0430"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("input", { className: "edt-props-editor__input", value: dstExpr, onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'destinationExpression', e.target.value)) }))))))),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u0423\u0441\u043B\u043E\u0432\u0438\u0435 \u0441\u0432\u044F\u0437\u0438"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("input", { className: "edt-props-editor__input", value: String(condNode?.text || ''), onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'linkConditionExpression', e.target.value)), placeholder: "linkConditionExpression" })))));
};
const DcsCalculatedFieldDetails = ({ node, onUpdateNode }) => {
    if (!node || localTag(node.tag) !== 'calculatedField')
        return react_1.default.createElement("div", { className: "dcs-empty" }, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u044B\u0447\u0438\u0441\u043B\u044F\u0435\u043C\u043E\u0435 \u043F\u043E\u043B\u0435");
    const dataPath = getChildTextByLocalTag(node, 'dataPath');
    const expr = getChildTextByLocalTag(node, 'expression');
    const title = getLocalStringTitle(node);
    return (react_1.default.createElement("div", { className: "dcs-details" },
        react_1.default.createElement("div", { className: "dcs-details__head" },
            react_1.default.createElement("div", { className: "dcs-details__name" }, title || dataPath || 'Вычисляемое поле')),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "DataPath"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("input", { className: "edt-props-editor__input", value: dataPath, onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'dataPath', e.target.value)) }))),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("input", { className: "edt-props-editor__input", value: title, onChange: (e) => onUpdateNode(node.path, (n) => upsertLocalStringTitle(n, e.target.value)) }))),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u0412\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("textarea", { className: "dcs-query__textarea", value: expr, onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'expression', e.target.value)) })))));
};
const DcsResourceDetails = ({ node, onUpdateNode }) => {
    if (!node || localTag(node.tag) !== 'totalField')
        return react_1.default.createElement("div", { className: "dcs-empty" }, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0441\u0443\u0440\u0441");
    const dataPath = getChildTextByLocalTag(node, 'dataPath');
    const expr = getChildTextByLocalTag(node, 'expression');
    return (react_1.default.createElement("div", { className: "dcs-details" },
        react_1.default.createElement("div", { className: "dcs-details__head" },
            react_1.default.createElement("div", { className: "dcs-details__name" }, dataPath || 'Ресурс')),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "DataPath"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("input", { className: "edt-props-editor__input", value: dataPath, onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'dataPath', e.target.value)) }))),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u0412\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("input", { className: "edt-props-editor__input", value: expr, onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'expression', e.target.value)) })))));
};
// Рекурсивный компонент для отображения вложенных группировок (column/row таблицы и вложенные)
const NestedGroupingView = ({ structure, level, onUpdateNode, groupingOtherSettingsExpanded = {}, setGroupingOtherSettingsExpanded = () => { } }) => {
    if (!structure)
        return null;
    const hasFields = structure.fields && structure.fields.length > 0;
    const hasOutputParams = structure.outputParams && structure.outputParams.length > 0 && structure.structNode;
    const hasNested = structure.nested && structure.nested.length > 0;
    if (!hasFields && !hasOutputParams && !hasNested)
        return null;
    const indent = level * 20;
    return (react_1.default.createElement("div", { style: { marginLeft: indent, marginTop: level > 0 ? 8 : 0, borderLeft: level > 0 ? '2px solid var(--vscode-panel-border)' : 'none', paddingLeft: level > 0 ? 8 : 0 } },
        hasFields && (react_1.default.createElement("table", { className: "edt-grid__table" },
            react_1.default.createElement("tbody", null, structure.fields.map((gf, idx) => {
                const fieldNode = findChildNodeByLocalTag(gf.node, 'field');
                const groupTypeNode = findChildNodeByLocalTag(gf.node, 'groupType');
                return (react_1.default.createElement(react_1.default.Fragment, { key: gf.path },
                    react_1.default.createElement("tr", null,
                        react_1.default.createElement("td", { style: { width: '70%' } },
                            level > 0 && react_1.default.createElement("span", { style: { opacity: 0.5, marginRight: 4 } }, "\u21B3"),
                            react_1.default.createElement("input", { className: "edt-props-editor__input", value: gf.field, onChange: (e) => {
                                    if (fieldNode) {
                                        onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                                    }
                                } })),
                        react_1.default.createElement("td", { style: { width: '30%' } },
                            react_1.default.createElement("select", { className: "edt-props-editor__input", value: gf.groupType, onChange: (e) => {
                                    if (groupTypeNode) {
                                        onUpdateNode(groupTypeNode.path, (n) => ({ ...n, text: e.target.value }));
                                    }
                                } },
                                react_1.default.createElement("option", { value: "Items" }, "\u042D\u043B\u0435\u043C\u0435\u043D\u0442\u044B"),
                                react_1.default.createElement("option", { value: "Hierarchy" }, "\u0418\u0435\u0440\u0430\u0440\u0445\u0438\u044F"),
                                react_1.default.createElement("option", { value: "OnlyHierarchy" }, "\u0422\u043E\u043B\u044C\u043A\u043E \u0438\u0435\u0440\u0430\u0440\u0445\u0438\u044F"))))));
            })))),
        hasOutputParams && (react_1.default.createElement("div", { style: { marginTop: 8, fontSize: 11 } },
            react_1.default.createElement("div", { role: "button", tabIndex: 0, onClick: () => setGroupingOtherSettingsExpanded((prev) => ({ ...prev, [structure.path]: !(prev[structure.path] ?? true) })), onKeyDown: (e) => e.key === 'Enter' && setGroupingOtherSettingsExpanded((prev) => ({ ...prev, [structure.path]: !(prev[structure.path] ?? true) })), style: { fontWeight: 'bold', marginBottom: 4, opacity: 0.8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 } },
                react_1.default.createElement("span", { style: { transform: (groupingOtherSettingsExpanded[structure.path] ?? true) ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' } }, "\u25B6"),
                "\u0414\u0440\u0443\u0433\u0438\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"),
            (groupingOtherSettingsExpanded[structure.path] ?? true) && (react_1.default.createElement("table", { className: "edt-grid__table", style: { fontSize: 11 } },
                react_1.default.createElement("thead", null,
                    react_1.default.createElement("tr", null,
                        react_1.default.createElement("th", { style: { width: 28, paddingRight: 4 }, title: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C/\u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440" }),
                        react_1.default.createElement("th", { style: { width: '42%' } }, "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440"),
                        react_1.default.createElement("th", { style: { width: '50%' } }, "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435"))),
                react_1.default.createElement("tbody", null, structure.outputParams.map((op, opIdx) => {
                    const paramDef = dcsGroupingParams_1.GROUPING_PARAM_MAP.get(op.parameter);
                    const options = paramDef?.options;
                    const paramLabel = paramDef?.label || op.parameter.replace(/([а-яa-z])([А-ЯA-Z])/g, '$1 $2');
                    const isChild = !!paramDef?.parentParameter;
                    const opUse = op.use !== undefined ? op.use : true;
                    const handleValueChange = (newVal) => {
                        if (!structure.structNode)
                            return;
                        onUpdateNode(structure.structNode.path, (n) => upsertOutputParameter(n, op.parameter, newVal, opUse));
                    };
                    const handleUseChange = (checked) => {
                        if (!structure.structNode)
                            return;
                        if (op.node) {
                            onUpdateNode(structure.structNode.path, (n) => setOutputParameterUse(n, op.parameter, checked));
                        }
                        else if (checked) {
                            onUpdateNode(structure.structNode.path, (n) => upsertOutputParameter(n, op.parameter, '', true));
                        }
                    };
                    return (react_1.default.createElement("tr", { key: opIdx },
                        react_1.default.createElement("td", { style: { paddingRight: 4, verticalAlign: 'middle' } },
                            react_1.default.createElement("input", { type: "checkbox", checked: opUse, onChange: (e) => handleUseChange(e.target.checked), title: opUse ? 'Параметр включён' : 'Параметр выключен' })),
                        react_1.default.createElement("td", { style: { opacity: opUse ? 0.9 : 0.5, paddingLeft: isChild ? 24 : undefined } }, paramLabel),
                        react_1.default.createElement("td", null, options ? (react_1.default.createElement("select", { className: "edt-props-editor__input", style: { fontSize: 11 }, value: op.value, onChange: (e) => handleValueChange(e.target.value), disabled: !opUse },
                            react_1.default.createElement("option", { value: "" }, "\u2014"),
                            options.map((opt) => (react_1.default.createElement("option", { key: opt.value, value: opt.value }, opt.label))))) : (react_1.default.createElement("input", { className: "edt-props-editor__input", style: { fontSize: 11 }, value: op.value, onChange: (e) => handleValueChange(e.target.value), placeholder: "\u2014", disabled: !opUse })))));
                })))))),
        hasNested && structure.nested.map((nested, idx) => (react_1.default.createElement(NestedGroupingView, { key: idx, structure: nested, level: level + 1, onUpdateNode: onUpdateNode, groupingOtherSettingsExpanded: groupingOtherSettingsExpanded, setGroupingOtherSettingsExpanded: setGroupingOtherSettingsExpanded })))));
};
const DcsSettingsVariantDetails = ({ node, onUpdateNode, onUpdateNodeReindex, schemaChildren }) => {
    // Поддержка настроек на уровне схемы (если нет вариантов)
    const isSchemaSettings = node?.path === '__schema__';
    const schemaRoot = (0, react_1.useMemo)(() => {
        if (!isSchemaSettings)
            return null;
        // Ищем корневой узел DataCompositionSchema
        return schemaChildren.find((ch) => localTag(ch.tag) === 'DataCompositionSchema') || schemaChildren[0] || null;
    }, [isSchemaSettings, schemaChildren]);
    if (!node || (localTag(node.tag) !== 'settingsVariant' && !isSchemaSettings)) {
        return react_1.default.createElement("div", { className: "dcs-empty" }, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A");
    }
    const name = isSchemaSettings ? 'Настройки схемы' : getChildTextByLocalTag(node, 'name');
    const presentation = isSchemaSettings ? '' : (getChildTextByLocalTag(node, 'presentation') || getChildTextByLocalTag(node, 'dcsset:presentation'));
    const settingsRoot = (0, react_1.useMemo)(() => {
        if (isSchemaSettings) {
            // Для схемы ищем defaultSettings или создаем виртуальный корень
            const defaultSettings = schemaChildren.find((ch) => localTag(ch.tag) === 'defaultSettings');
            return defaultSettings || schemaRoot;
        }
        const direct = findChildNodeByLocalTag(node, 'settings');
        if (direct)
            return direct;
        const all = findAllNodes([node]);
        return all.find((x) => localTag(x.node.tag) === 'settings')?.node || null;
    }, [node, isSchemaSettings, schemaRoot, schemaChildren]);
    const [activeSettingsTab, setActiveSettingsTab] = (0, react_1.useState)('fields');
    // Состояния для форм добавления
    const [addingField, setAddingField] = (0, react_1.useState)(false);
    const [newFieldName, setNewFieldName] = (0, react_1.useState)('');
    const [addingFilter, setAddingFilter] = (0, react_1.useState)(false);
    const [newFilterField, setNewFilterField] = (0, react_1.useState)('');
    const [addingOrder, setAddingOrder] = (0, react_1.useState)(false);
    const [newOrderField, setNewOrderField] = (0, react_1.useState)('');
    const [addingGrouping, setAddingGrouping] = (0, react_1.useState)(false);
    const [newGroupingField, setNewGroupingField] = (0, react_1.useState)('');
    const [parentGroupingPath, setParentGroupingPath] = (0, react_1.useState)(null);
    /** Состояние сворачивания секции «Другие настройки» по пути группировки: true = развёрнуто */
    const [groupingOtherSettingsExpanded, setGroupingOtherSettingsExpanded] = (0, react_1.useState)({});
    // Извлечение основных секций settings
    const selectionNode = (0, react_1.useMemo)(() => findChildNodeByLocalTag(settingsRoot, 'selection'), [settingsRoot]);
    const filterNode = (0, react_1.useMemo)(() => findChildNodeByLocalTag(settingsRoot, 'filter'), [settingsRoot]);
    const orderNode = (0, react_1.useMemo)(() => findChildNodeByLocalTag(settingsRoot, 'order'), [settingsRoot]);
    const structureNode = (0, react_1.useMemo)(() => {
        const direct = findChildNodeByLocalTag(settingsRoot, 'structure');
        if (direct)
            return direct;
        // Для схемы ищем структуру глубже - она может быть на уровне схемы, а не в settings
        if (isSchemaSettings && !direct) {
            // Ищем во всех детях схемы
            const allNodes = findAllNodes(schemaChildren);
            return allNodes.find((n) => localTag(n.node.tag) === 'structure')?.node || null;
        }
        // ВАЖНО: В некоторых отчетах нет обёртки <structure>, а элементы StructureItem* находятся прямо в settings
        // Создаём виртуальный узел структуры из прямых дочерних элементов settings с типом StructureItem*
        if (!direct && settingsRoot) {
            const structureItems = (settingsRoot.children || []).filter((ch) => {
                const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
                return t.includes('StructureItem');
            });
            if (structureItems.length > 0) {
                // Возвращаем виртуальный узел с элементами структуры
                return {
                    ...settingsRoot,
                    children: structureItems,
                    tag: 'dcsset:structure',
                };
            }
        }
        return null;
    }, [settingsRoot, isSchemaSettings, schemaChildren]);
    // Поля (selection items)
    const selectedFields = (0, react_1.useMemo)(() => {
        if (!selectionNode)
            return [];
        return (selectionNode.children || []).filter((ch) => localTag(ch.tag) === 'item').map((item) => {
            const fieldNode = findChildNodeByLocalTag(item, 'field');
            const fieldName = String(fieldNode?.text || '').trim();
            return { node: item, fieldName, path: item.path };
        });
    }, [selectionNode]);
    // Отборы (filter items)
    const filterItems = (0, react_1.useMemo)(() => {
        if (!filterNode)
            return [];
        return (filterNode.children || []).filter((ch) => localTag(ch.tag) === 'item').map((item) => {
            const useNode = findChildNodeByLocalTag(item, 'use');
            const leftNode = findChildNodeByLocalTag(item, 'left');
            const compTypeNode = findChildNodeByLocalTag(item, 'comparisonType');
            const rightNode = findChildNodeByLocalTag(item, 'right');
            return {
                node: item,
                path: item.path,
                use: String(useNode?.text || 'true').toLowerCase() === 'true',
                field: String(leftNode?.text || '').trim(),
                comparisonType: String(compTypeNode?.text || 'Equal').trim(),
                value: String(rightNode?.text || '').trim(),
            };
        });
    }, [filterNode]);
    // Сортировки (order items)
    const orderItems = (0, react_1.useMemo)(() => {
        if (!orderNode)
            return [];
        return (orderNode.children || []).filter((ch) => localTag(ch.tag) === 'item').map((item) => {
            const fieldNode = findChildNodeByLocalTag(item, 'field');
            const orderTypeNode = findChildNodeByLocalTag(item, 'orderType');
            return {
                node: item,
                path: item.path,
                field: String(fieldNode?.text || '').trim(),
                orderType: String(orderTypeNode?.text || 'Asc').trim(),
            };
        });
    }, [orderNode]);
    // Элементы структуры (группировки/таблицы/диаграммы)
    const structureItems = (0, react_1.useMemo)(() => {
        if (!structureNode)
            return [];
        return (structureNode.children || []).filter((ch) => localTag(ch.tag) === 'item').map((item) => {
            const itemType = String(item.attrs?.['@_xsi:type'] || '').trim();
            const isTable = itemType.includes('StructureItemTable');
            const isGroup = itemType.includes('StructureItemGroup');
            const isChart = itemType.includes('StructureItemChart');
            // Функция извлечения полей группировки из groupItems
            // ВАЖНО: В groupItems могут быть как GroupItemField (поля), так и StructureItemGroup/Table (вложенные группировки)
            const extractGroupFields = (groupItemsNode) => {
                if (!groupItemsNode)
                    return [];
                return (groupItemsNode.children || []).filter((ch) => {
                    if (localTag(ch.tag) !== 'item')
                        return false;
                    const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
                    // Только поля группировки (GroupItemField), не вложенные группировки
                    return t.includes('GroupItemField') || (!t && !ch.children?.some(c => localTag(c.tag) === 'groupItems'));
                }).map((gItem) => {
                    const fieldNode = findChildNodeByLocalTag(gItem, 'field');
                    const groupTypeNode = findChildNodeByLocalTag(gItem, 'groupType');
                    return {
                        node: gItem,
                        path: gItem.path,
                        field: String(fieldNode?.text || '').trim(),
                        groupType: String(groupTypeNode?.text || 'Items').trim(),
                    };
                });
            };
            // Функция извлечения параметров диаграммы
            const extractChartParams = (chartNode) => {
                const outputParamsNode = findChildNodeByLocalTag(chartNode, 'outputParameters');
                if (!outputParamsNode)
                    return { chartType: '', title: '' };
                let chartType = '';
                let chartTitle = '';
                // Ищем параметр типДиаграммы (ChartType)
                const chartTypeItems = (outputParamsNode.children || []).filter((ch) => {
                    if (localTag(ch.tag) !== 'item')
                        return false;
                    const paramNode = findChildNodeByLocalTag(ch, 'parameter');
                    const paramText = String(paramNode?.text || '').trim();
                    return paramText.includes('типДиаграммы') || paramText.includes('ChartType');
                });
                if (chartTypeItems.length > 0) {
                    const valueNode = findChildNodeByLocalTag(chartTypeItems[0], 'value');
                    // Тип диаграммы хранится в тексте узла value (например, "Pie3D", "Column")
                    chartType = String(valueNode?.text || '').trim();
                    // Если текст пустой, пытаемся извлечь из атрибута xsi:type
                    if (!chartType && valueNode?.attrs?.['@_xsi:type']) {
                        const typeAttr = String(valueNode.attrs['@_xsi:type'] || '').trim();
                        // Если это ChartType, извлекаем значение из текста (может быть вложенным)
                        if (typeAttr.includes('ChartType')) {
                            chartType = typeAttr.replace(/.*ChartType/, '').trim() || typeAttr;
                        }
                    }
                }
                // Ищем заголовок диаграммы
                const titleItems = (outputParamsNode.children || []).filter((ch) => {
                    if (localTag(ch.tag) !== 'item')
                        return false;
                    const paramNode = findChildNodeByLocalTag(ch, 'parameter');
                    const paramText = String(paramNode?.text || '').trim();
                    return paramText.includes('заголовок') || paramText.includes('Title');
                });
                if (titleItems.length > 0) {
                    const titleValueNode = findChildNodeByLocalTag(titleItems[0], 'value');
                    if (titleValueNode) {
                        const titleItemNode = findChildNodeByLocalTag(titleValueNode, 'item');
                        if (titleItemNode) {
                            const contentNode = findChildNodeByLocalTag(titleItemNode, 'content');
                            chartTitle = String(contentNode?.text || '').trim();
                        }
                    }
                }
                return { chartType, title: chartTitle };
            };
            // Функция извлечения вложенных группировок и диаграмм из groupItems
            const extractNestedGroupingsFromGroupItems = (groupItemsNode) => {
                if (!groupItemsNode)
                    return [];
                return (groupItemsNode.children || []).filter((ch) => {
                    if (localTag(ch.tag) !== 'item')
                        return false;
                    const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
                    // Вложенные группировки (StructureItemGroup или StructureItemTable) или диаграммы (StructureItemChart)
                    return t.includes('StructureItemGroup') || t.includes('StructureItemTable') || t.includes('StructureItemChart');
                });
            };
            // Функция извлечения вложенной структуры (для row/column с вложенными item)
            // ВАЖНО: Вложенные группировки могут быть как прямыми дочерними элементами, так и внутри groupItems
            const extractNestedStructure = (parentNode) => {
                if (!parentNode)
                    return null;
                const groupItemsNode = findChildNodeByLocalTag(parentNode, 'groupItems');
                const fields = extractGroupFields(groupItemsNode);
                // outputParameters для column/row (и вложенных группировок)
                const outParamsNode = findChildNodeByLocalTag(parentNode, 'outputParameters');
                const existingParamsMap = new Map();
                if (outParamsNode?.children) {
                    for (const ch of outParamsNode.children) {
                        if (localTag(ch.tag) !== 'item')
                            continue;
                        const paramNode = findChildNodeByLocalTag(ch, 'parameter');
                        const valueNode = findChildNodeByLocalTag(ch, 'value');
                        const useNode = findChildNodeByLocalTag(ch, 'use');
                        const param = String(paramNode?.text || '').trim();
                        const val = extractValueFromParameterValue(valueNode);
                        const use = useNode ? String(useNode.text || 'true').toLowerCase() === 'true' : true;
                        if (param)
                            existingParamsMap.set(param, { value: val, node: ch, use });
                    }
                }
                const outputParams = dcsGroupingParams_1.GROUPING_OUTPUT_PARAMS.map((def) => {
                    const existing = existingParamsMap.get(def.parameter);
                    return existing
                        ? { parameter: def.parameter, value: existing.value, node: existing.node, use: existing.use }
                        : { parameter: def.parameter, value: '', node: null, use: false };
                });
                // Ищем вложенные <dcsset:item> - они могут быть:
                // 1. Прямыми дочерними элементами родительской группировки (как в отчете ПродажаМебели)
                // 2. Внутри groupItems (альтернативный вариант)
                const nestedItemsFromDirectChildren = (parentNode.children || []).filter((ch) => {
                    if (localTag(ch.tag) !== 'item')
                        return false;
                    const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
                    // Ищем группировки (StructureItemGroup/Table) и диаграммы (StructureItemChart), пропускаем поля и другие типы
                    return t.includes('StructureItemGroup') || t.includes('StructureItemTable') || t.includes('StructureItemChart');
                });
                // Также ищем вложенные группировки внутри groupItems
                const nestedItemsFromGroupItems = extractNestedGroupingsFromGroupItems(groupItemsNode);
                // Объединяем оба источника вложенных группировок и диаграмм
                const allNestedItems = [...nestedItemsFromDirectChildren, ...nestedItemsFromGroupItems];
                // Обрабатываем вложенные элементы: группировки рекурсивно, диаграммы отдельно
                const nested = allNestedItems.map((nestedItem) => {
                    const nestedType = String(nestedItem.attrs?.['@_xsi:type'] || '').trim();
                    if (nestedType.includes('StructureItemChart')) {
                        // Для диаграммы возвращаем структуру с параметрами диаграммы
                        return {
                            node: nestedItem,
                            path: nestedItem.path,
                            fields: [],
                            nested: [],
                            isChart: true,
                            chartParams: extractChartParams(nestedItem),
                        };
                    }
                    else {
                        // Для группировки рекурсивно извлекаем структуру
                        return extractNestedStructure(nestedItem);
                    }
                }).filter(Boolean);
                return {
                    node: parentNode,
                    path: parentNode.path,
                    fields,
                    nested,
                    outputParams,
                    outputParamsNode: outParamsNode,
                    structNode: parentNode,
                };
            };
            // Имя и вариант использования группировки (для отображения как в 1С)
            const groupName = String(findChildNodeByLocalTag(item, 'name')?.text || '').trim();
            let groupUseVariant = '';
            const outputParamsNode = findChildNodeByLocalTag(item, 'outputParameters');
            if (outputParamsNode?.children) {
                const variantItem = outputParamsNode.children.find((ch) => {
                    if (localTag(ch.tag) !== 'item')
                        return false;
                    const paramNode = findChildNodeByLocalTag(ch, 'parameter');
                    const p = String(paramNode?.text || '').trim();
                    return p === 'ВариантИспользованияГруппировки' || p.includes('GroupUseVariant');
                });
                if (variantItem) {
                    const valNode = findChildNodeByLocalTag(variantItem, 'value');
                    groupUseVariant = String(valNode?.text || '').trim();
                }
            }
            const GROUP_USE_VARIANT_LABELS = {
                AdditionalInformation: 'Дополнительная информация',
                Items: 'Детальные записи',
                DontUse: 'Не использовать',
            };
            // Формат как в 1С: <Дополнительная информация> (Заголовок), <Детальные записи>
            const variantLabel = groupUseVariant ? (GROUP_USE_VARIANT_LABELS[groupUseVariant] || groupUseVariant) : null;
            const groupDisplayLabel = variantLabel
                ? `<${variantLabel}>` + (groupName ? ` (${groupName})` : '')
                : groupName ? groupName : `<Детальные записи>`;
            // outputParameters — «Другие настройки». Объединяем полный список параметров с существующими в XML.
            const existingParamsMap = new Map();
            if (outputParamsNode?.children) {
                for (const ch of outputParamsNode.children) {
                    if (localTag(ch.tag) !== 'item')
                        continue;
                    const paramNode = findChildNodeByLocalTag(ch, 'parameter');
                    const valueNode = findChildNodeByLocalTag(ch, 'value');
                    const useNode = findChildNodeByLocalTag(ch, 'use');
                    const param = String(paramNode?.text || '').trim();
                    const val = extractValueFromParameterValue(valueNode);
                    const use = useNode ? String(useNode.text || 'true').toLowerCase() === 'true' : true;
                    if (param)
                        existingParamsMap.set(param, { value: val, node: ch, use });
                }
            }
            const outputParams = dcsGroupingParams_1.GROUPING_OUTPUT_PARAMS.map((def) => {
                const existing = existingParamsMap.get(def.parameter);
                return existing
                    ? { parameter: def.parameter, value: existing.value, node: existing.node, use: existing.use }
                    : { parameter: def.parameter, value: '', node: null, use: false };
            });
            // Проверка SelectedItemAuto / OrderItemAuto (автоматический режим полей)
            const selectionNode = findChildNodeByLocalTag(item, 'selection');
            const orderNode = findChildNodeByLocalTag(item, 'order');
            const hasSelectedItemAuto = (selectionNode?.children || []).some((ch) => String(ch.attrs?.['@_xsi:type'] || '').includes('SelectedItemAuto'));
            const hasOrderItemAuto = (orderNode?.children || []).some((ch) => String(ch.attrs?.['@_xsi:type'] || '').includes('OrderItemAuto'));
            const isAutoMode = hasSelectedItemAuto && hasOrderItemAuto;
            // Элемент use для включения/отключения группировки
            const useNode = findChildNodeByLocalTag(item, 'use');
            // Для таблицы ищем column и row
            let columnStructure = null;
            let rowStructure = null;
            let groupFields = [];
            let chartParams = null;
            let nestedCharts = [];
            if (isChart) {
                // Извлекаем параметры диаграммы
                chartParams = extractChartParams(item);
                // Диаграммы не имеют groupItems, но могут быть вложены в группировки
                // Вложенные диаграммы извлекаются через extractNestedStructure для группировок
            }
            else if (isTable) {
                const colNode = findChildNodeByLocalTag(item, 'column');
                const rowNode = findChildNodeByLocalTag(item, 'row');
                columnStructure = extractNestedStructure(colNode);
                rowStructure = extractNestedStructure(rowNode);
            }
            else {
                const groupItemsNode = findChildNodeByLocalTag(item, 'groupItems');
                groupFields = extractGroupFields(groupItemsNode);
                // ВАЖНО: Ищем вложенные группировки внутри groupItems
                // Они могут быть как item с типом StructureItemGroup/Table внутри groupItems
                const nestedGroupingsInGroupItems = extractNestedGroupingsFromGroupItems(groupItemsNode);
                if (nestedGroupingsInGroupItems.length > 0) {
                    // Добавляем информацию о вложенных группировках
                    // Они будут обработаны рекурсивно при отображении
                }
            }
            // Обрабатываем вложенные группировки и диаграммы для обычных группировок
            // ВАЖНО: Вложенные элементы могут быть:
            // 1. Прямыми дочерними элементами (как в отчете ПродажаМебели)
            // 2. Внутри groupItems
            let nestedFromGroupItems = [];
            if (isGroup) {
                // Ищем вложенные группировки и диаграммы как прямые дочерние элементы
                const nestedFromDirectChildren = (item.children || []).filter((ch) => {
                    if (localTag(ch.tag) !== 'item')
                        return false;
                    const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
                    return t.includes('StructureItemGroup') || t.includes('StructureItemTable') || t.includes('StructureItemChart');
                });
                // Также ищем внутри groupItems
                const groupItemsNode = findChildNodeByLocalTag(item, 'groupItems');
                const nestedFromGroupItemsNodes = extractNestedGroupingsFromGroupItems(groupItemsNode);
                // Объединяем оба источника
                const allNestedGroupings = [...nestedFromDirectChildren, ...nestedFromGroupItemsNodes];
                nestedFromGroupItems = allNestedGroupings.map((nestedNode) => {
                    const nestedType = String(nestedNode.attrs?.['@_xsi:type'] || '').trim();
                    const isNestedChart = nestedType.includes('StructureItemChart');
                    if (isNestedChart) {
                        // Для диаграммы извлекаем только параметры
                        return {
                            node: nestedNode,
                            path: nestedNode.path,
                            isChart: true,
                            chartParams: extractChartParams(nestedNode),
                            fields: [],
                            nested: []
                        };
                    }
                    // Для группировки рекурсивно извлекаем структуру
                    const nestedGroupItemsNode = findChildNodeByLocalTag(nestedNode, 'groupItems');
                    const nestedFields = extractGroupFields(nestedGroupItemsNode);
                    const nestedName = String(findChildNodeByLocalTag(nestedNode, 'name')?.text || '').trim();
                    let nestedUseVariant = '';
                    const nestedOutputParams = findChildNodeByLocalTag(nestedNode, 'outputParameters');
                    const variantItem = (nestedOutputParams?.children || []).find((ch) => {
                        if (localTag(ch.tag) !== 'item')
                            return false;
                        const p = String(findChildNodeByLocalTag(ch, 'parameter')?.text || '').trim();
                        return p === 'ВариантИспользованияГруппировки' || p.includes('GroupUseVariant');
                    });
                    if (variantItem) {
                        nestedUseVariant = String(findChildNodeByLocalTag(variantItem, 'value')?.text || '').trim();
                    }
                    const nestedVariantLabel = nestedUseVariant ? (GROUP_USE_VARIANT_LABELS[nestedUseVariant] || nestedUseVariant) : null;
                    const nestedDisplayLabel = nestedVariantLabel
                        ? `<${nestedVariantLabel}>` + (nestedName ? ` (${nestedName})` : '')
                        : nestedName ? nestedName : `<Детальные записи>`;
                    const nestedOutputParamsNode = findChildNodeByLocalTag(nestedNode, 'outputParameters');
                    const nestedExistingParamsMap = new Map();
                    if (nestedOutputParamsNode?.children) {
                        for (const ch of nestedOutputParamsNode.children) {
                            if (localTag(ch.tag) !== 'item')
                                continue;
                            const p = String(findChildNodeByLocalTag(ch, 'parameter')?.text || '').trim();
                            const vn = findChildNodeByLocalTag(ch, 'value');
                            const un = findChildNodeByLocalTag(ch, 'use');
                            const v = extractValueFromParameterValue(vn);
                            const use = un ? String(un.text || 'true').toLowerCase() === 'true' : true;
                            if (p)
                                nestedExistingParamsMap.set(p, { value: v, node: ch, use });
                        }
                    }
                    const nestedOutputParamsList = dcsGroupingParams_1.GROUPING_OUTPUT_PARAMS.map((def) => {
                        const existing = nestedExistingParamsMap.get(def.parameter);
                        return existing
                            ? { parameter: def.parameter, value: existing.value, node: existing.node, use: existing.use }
                            : { parameter: def.parameter, value: '', node: null, use: false };
                    });
                    const nestedSel = findChildNodeByLocalTag(nestedNode, 'selection');
                    const nestedOrd = findChildNodeByLocalTag(nestedNode, 'order');
                    const nestedIsAuto = (nestedSel?.children || []).some((ch) => String(ch.attrs?.['@_xsi:type'] || '').includes('SelectedItemAuto'))
                        && (nestedOrd?.children || []).some((ch) => String(ch.attrs?.['@_xsi:type'] || '').includes('OrderItemAuto'));
                    // Рекурсивно ищем еще более вложенные группировки и диаграммы
                    const nestedNestedDirect = (nestedNode.children || []).filter((ch) => {
                        if (localTag(ch.tag) !== 'item')
                            return false;
                        const t = String(ch.attrs?.['@_xsi:type'] || '').trim();
                        return t.includes('StructureItemGroup') || t.includes('StructureItemTable') || t.includes('StructureItemChart');
                    });
                    const nestedNestedFromGroupItems = extractNestedGroupingsFromGroupItems(nestedGroupItemsNode);
                    const allNestedNested = [...nestedNestedDirect, ...nestedNestedFromGroupItems];
                    return {
                        node: nestedNode,
                        path: nestedNode.path,
                        isChart: false,
                        fields: nestedFields,
                        groupDisplayLabel: nestedDisplayLabel,
                        isAutoMode: nestedIsAuto,
                        outputParams: nestedOutputParamsList,
                        outputParamsNode: nestedOutputParamsNode,
                        structNode: nestedNode,
                        nested: allNestedNested.map(nn => {
                            const nnType = String(nn.attrs?.['@_xsi:type'] || '').trim();
                            if (nnType.includes('StructureItemChart')) {
                                return {
                                    node: nn,
                                    path: nn.path,
                                    isChart: true,
                                    chartParams: extractChartParams(nn),
                                    fields: [],
                                    nested: []
                                };
                            }
                            const nnGroupItems = findChildNodeByLocalTag(nn, 'groupItems');
                            return {
                                node: nn,
                                path: nn.path,
                                isChart: false,
                                fields: extractGroupFields(nnGroupItems),
                                nested: []
                            };
                        })
                    };
                });
                // Отдельно извлекаем вложенные диаграммы
                nestedCharts = nestedFromGroupItems.filter(n => n.isChart);
            }
            return {
                node: item,
                path: item.path,
                itemType,
                isTable,
                isGroup,
                isChart,
                groupFields,
                columnStructure,
                rowStructure,
                chartParams,
                nestedCharts,
                groupDisplayLabel,
                isAutoMode,
                useNode,
                outputParams,
                outputParamsNode,
                structNode: item,
                // Вложенные группировки и диаграммы из groupItems (для обычных группировок)
                nestedFromGroupItems,
            };
        });
    }, [structureNode, schemaChildren]);
    const structuralUpdate = onUpdateNodeReindex || onUpdateNode;
    // Добавить поле
    const handleAddField = (0, react_1.useCallback)(() => {
        if (!newFieldName.trim())
            return;
        const fieldName = newFieldName.trim();
        if (!selectionNode) {
            structuralUpdate(settingsRoot.path, (s) => {
                const newSelection = {
                    path: '',
                    tag: 'dcsset:selection',
                    attrs: {},
                    children: [{
                            path: '',
                            tag: 'dcsset:item',
                            attrs: { '@_xsi:type': 'dcsset:SelectedItemField' },
                            children: [{ path: '', tag: 'dcsset:field', attrs: {}, text: fieldName, children: [] }],
                        }],
                };
                return { ...s, children: [...s.children, newSelection] };
            });
        }
        else {
            structuralUpdate(selectionNode.path, (sel) => {
                const newItem = {
                    path: '',
                    tag: 'dcsset:item',
                    attrs: { '@_xsi:type': 'dcsset:SelectedItemField' },
                    children: [{ path: '', tag: 'dcsset:field', attrs: {}, text: fieldName, children: [] }],
                };
                return { ...sel, children: [...sel.children, newItem] };
            });
        }
        setNewFieldName('');
        setAddingField(false);
    }, [settingsRoot, selectionNode, structuralUpdate, newFieldName]);
    // Удалить поле
    const handleDeleteField = (0, react_1.useCallback)((fieldPath) => {
        if (!selectionNode)
            return;
        structuralUpdate(selectionNode.path, (sel) => {
            const idx = sel.children.findIndex((ch) => ch.path === fieldPath);
            if (idx < 0)
                return sel;
            const nextChildren = sel.children.filter((_, i) => i !== idx);
            return { ...sel, children: nextChildren };
        });
    }, [selectionNode, structuralUpdate]);
    // Добавить отбор
    const handleAddFilter = (0, react_1.useCallback)(() => {
        if (!newFilterField.trim())
            return;
        const fieldName = newFilterField.trim();
        if (!filterNode) {
            structuralUpdate(settingsRoot.path, (s) => {
                const newFilter = {
                    path: '',
                    tag: 'dcsset:filter',
                    attrs: {},
                    children: [{
                            path: '',
                            tag: 'dcsset:item',
                            attrs: { '@_xsi:type': 'dcsset:FilterItemComparison' },
                            children: [
                                { path: '', tag: 'dcsset:use', attrs: {}, text: 'true', children: [] },
                                { path: '', tag: 'dcsset:left', attrs: { '@_xsi:type': 'dcscor:Field' }, text: fieldName, children: [] },
                                { path: '', tag: 'dcsset:comparisonType', attrs: {}, text: 'Equal', children: [] },
                            ],
                        }],
                };
                return { ...s, children: [...s.children, newFilter] };
            });
        }
        else {
            structuralUpdate(filterNode.path, (filt) => {
                const newItem = {
                    path: '',
                    tag: 'dcsset:item',
                    attrs: { '@_xsi:type': 'dcsset:FilterItemComparison' },
                    children: [
                        { path: '', tag: 'dcsset:use', attrs: {}, text: 'true', children: [] },
                        { path: '', tag: 'dcsset:left', attrs: { '@_xsi:type': 'dcscor:Field' }, text: fieldName, children: [] },
                        { path: '', tag: 'dcsset:comparisonType', attrs: {}, text: 'Equal', children: [] },
                    ],
                };
                return { ...filt, children: [...filt.children, newItem] };
            });
        }
        setNewFilterField('');
        setAddingFilter(false);
    }, [settingsRoot, filterNode, structuralUpdate, newFilterField]);
    // Удалить отбор
    const handleDeleteFilter = (0, react_1.useCallback)((filterPath) => {
        if (!filterNode)
            return;
        structuralUpdate(filterNode.path, (filt) => {
            const idx = filt.children.findIndex((ch) => ch.path === filterPath);
            if (idx < 0)
                return filt;
            const nextChildren = filt.children.filter((_, i) => i !== idx);
            return { ...filt, children: nextChildren };
        });
    }, [filterNode, structuralUpdate]);
    // Добавить сортировку
    const handleAddOrder = (0, react_1.useCallback)(() => {
        if (!newOrderField.trim())
            return;
        const fieldName = newOrderField.trim();
        if (!orderNode) {
            structuralUpdate(settingsRoot.path, (s) => {
                const newOrder = {
                    path: '',
                    tag: 'dcsset:order',
                    attrs: {},
                    children: [{
                            path: '',
                            tag: 'dcsset:item',
                            attrs: { '@_xsi:type': 'dcsset:OrderItemField' },
                            children: [
                                { path: '', tag: 'dcsset:field', attrs: {}, text: fieldName, children: [] },
                                { path: '', tag: 'dcsset:orderType', attrs: {}, text: 'Asc', children: [] },
                            ],
                        }],
                };
                return { ...s, children: [...s.children, newOrder] };
            });
        }
        else {
            structuralUpdate(orderNode.path, (ord) => {
                const newItem = {
                    path: '',
                    tag: 'dcsset:item',
                    attrs: { '@_xsi:type': 'dcsset:OrderItemField' },
                    children: [
                        { path: '', tag: 'dcsset:field', attrs: {}, text: fieldName, children: [] },
                        { path: '', tag: 'dcsset:orderType', attrs: {}, text: 'Asc', children: [] },
                    ],
                };
                return { ...ord, children: [...ord.children, newItem] };
            });
        }
        setNewOrderField('');
        setAddingOrder(false);
    }, [settingsRoot, orderNode, structuralUpdate, newOrderField]);
    // Удалить сортировку
    const handleDeleteOrder = (0, react_1.useCallback)((orderPath) => {
        if (!orderNode)
            return;
        structuralUpdate(orderNode.path, (ord) => {
            const idx = ord.children.findIndex((ch) => ch.path === orderPath);
            if (idx < 0)
                return ord;
            const nextChildren = ord.children.filter((_, i) => i !== idx);
            return { ...ord, children: nextChildren };
        });
    }, [orderNode, structuralUpdate]);
    // Получить список всех доступных группировок для выбора родителя (включая вложенные)
    const getAllGroupingsForParent = (0, react_1.useCallback)(() => {
        const result = [];
        // Рекурсивная функция для обхода узлов структуры
        const walkNode = (node, prefix = '') => {
            const nodeType = String(node.attrs?.['@_xsi:type'] || '').trim();
            const isGroup = nodeType.includes('StructureItemGroup');
            const isTable = nodeType.includes('StructureItemTable');
            const isColumn = localTag(node.tag) === 'column';
            const isRow = localTag(node.tag) === 'row';
            const isChart = nodeType.includes('StructureItemChart');
            // Добавляем узел в список, если это группировка, таблица или диаграмма
            if (isGroup || isTable || isChart) {
                let label = '';
                if (isTable) {
                    label = prefix + '📊 Таблица';
                }
                else if (isChart) {
                    // Для диаграммы пытаемся извлечь заголовок
                    const outputParamsNode = findChildNodeByLocalTag(node, 'outputParameters');
                    let chartTitle = '';
                    if (outputParamsNode) {
                        const titleItems = (outputParamsNode.children || []).filter((ch) => {
                            if (localTag(ch.tag) !== 'item')
                                return false;
                            const paramNode = findChildNodeByLocalTag(ch, 'parameter');
                            return String(paramNode?.text || '').trim().includes('заголовок') || String(paramNode?.text || '').trim().includes('Title');
                        });
                        if (titleItems.length > 0) {
                            const titleValueNode = findChildNodeByLocalTag(titleItems[0], 'value');
                            if (titleValueNode) {
                                const titleItemNode = findChildNodeByLocalTag(titleValueNode, 'item');
                                if (titleItemNode) {
                                    const contentNode = findChildNodeByLocalTag(titleItemNode, 'content');
                                    chartTitle = String(contentNode?.text || '').trim();
                                }
                            }
                        }
                    }
                    label = prefix + (chartTitle ? `📊 Диаграмма: ${chartTitle}` : '📊 Диаграмма');
                }
                else {
                    label = prefix + '📁 Группировка';
                }
                result.push({ path: node.path, label, node });
            }
            else if (isColumn || isRow) {
                const label = prefix + (isColumn ? '📋 Колонки' : '📊 Строки');
                result.push({ path: node.path, label, node });
            }
            // Рекурсивно обходим дочерние элементы
            for (const child of node.children || []) {
                const childType = String(child.attrs?.['@_xsi:type'] || '').trim();
                const childLocalTag = localTag(child.tag);
                // Пропускаем поля группировки (GroupItemField)
                if (childType.includes('GroupItemField') || childLocalTag === 'field' || childLocalTag === 'groupType') {
                    continue;
                }
                // Если это item с типом группировки, таблицы, диаграммы или column/row, рекурсивно обходим
                if (childLocalTag === 'item' && (childType.includes('StructureItem') || childType === '')) {
                    walkNode(child, prefix + '  ');
                }
                else if (childLocalTag === 'column' || childLocalTag === 'row') {
                    walkNode(child, prefix + '  ');
                }
                else if (childLocalTag === 'groupItems') {
                    // Обходим элементы внутри groupItems
                    for (const groupItem of child.children || []) {
                        if (localTag(groupItem.tag) === 'item') {
                            walkNode(groupItem, prefix + '  ');
                        }
                    }
                }
            }
        };
        // Обходим все элементы структуры верхнего уровня
        for (const item of structureItems) {
            walkNode(item.node, '');
            // Для таблиц добавляем column и row
            if (item.isTable) {
                const colNode = findChildNodeByLocalTag(item.node, 'column');
                const rowNode = findChildNodeByLocalTag(item.node, 'row');
                if (colNode) {
                    result.push({ path: colNode.path, label: '  📋 Колонки', node: colNode });
                    walkNode(colNode, '    ');
                }
                if (rowNode) {
                    result.push({ path: rowNode.path, label: '  📊 Строки', node: rowNode });
                    walkNode(rowNode, '    ');
                }
            }
        }
        // Добавляем диаграммы в список (для возможности вложенности в группировки)
        for (const item of structureItems) {
            if (item.isChart) {
                const chartLabel = item.chartParams?.title || item.chartParams?.chartType || '📊 Диаграмма';
                result.push({ path: item.path, label: `  📊 ${chartLabel}`, node: item.node });
            }
        }
        return result;
    }, [structureItems]);
    // Добавить простую группировку (может быть вложенной)
    const handleAddGrouping = (0, react_1.useCallback)(() => {
        if (!settingsRoot || !newGroupingField.trim())
            return;
        const fieldName = newGroupingField.trim();
        // Создаем новую группировку
        const newGroupItem = {
            path: '',
            tag: 'dcsset:item',
            attrs: { '@_xsi:type': 'dcsset:StructureItemGroup' },
            children: [{
                    path: '',
                    tag: 'dcsset:groupItems',
                    attrs: {},
                    children: [{
                            path: '',
                            tag: 'dcsset:item',
                            attrs: { '@_xsi:type': 'dcsset:GroupItemField' },
                            children: [
                                { path: '', tag: 'dcsset:field', attrs: {}, text: fieldName, children: [] },
                                { path: '', tag: 'dcsset:groupType', attrs: {}, text: 'Items', children: [] },
                                { path: '', tag: 'dcsset:periodAdditionType', attrs: {}, text: 'None', children: [] },
                            ],
                        }],
                }],
        };
        // Если выбран родитель, добавляем как вложенную группировку
        if (parentGroupingPath && structureNode) {
            // Находим информацию о родительском узле из getAllGroupingsForParent
            // getAllGroupingsForParent возвращает пути относительно structureNode.children,
            // но нам нужен полный путь относительно schemaChildren
            const allGroupings = getAllGroupingsForParent();
            const parentInfo = allGroupings.find(g => g.path === parentGroupingPath);
            if (parentInfo && parentInfo.node) {
                const parentNode = parentInfo.node;
                // Строим полный путь к родительскому узлу в schemaChildren
                // Сначала находим путь к структуре
                const structurePathInSchema = findFirstPathByLocalTag(schemaChildren, 'structure');
                if (structurePathInSchema) {
                    const structureInSchema = getNodeAtPath(schemaChildren, structurePathInSchema);
                    if (structureInSchema) {
                        // Рекурсивно ищем родительский узел в структуре и строим к нему путь
                        const findNodePath = (nodes, targetNode, basePath = '') => {
                            for (let i = 0; i < nodes.length; i++) {
                                const node = nodes[i];
                                const currentPath = basePath ? `${basePath}.${i}` : `${i}`;
                                // Сравниваем по ссылке или по path, если он есть
                                if (node === targetNode || (node.path && targetNode.path && node.path === targetNode.path)) {
                                    return currentPath;
                                }
                                if (node.children && node.children.length > 0) {
                                    const found = findNodePath(node.children, targetNode, currentPath);
                                    if (found)
                                        return found;
                                }
                            }
                            return null;
                        };
                        const relativePath = findNodePath(structureInSchema.children || [], parentNode);
                        if (relativePath !== null) {
                            const fullParentPath = `${structurePathInSchema}.${relativePath}`;
                            structuralUpdate(fullParentPath, (parent) => {
                                const parentLocalTag = localTag(parent.tag);
                                const parentType = String(parent.attrs?.['@_xsi:type'] || '').trim();
                                const isParentGroup = parentType.includes('StructureItemGroup');
                                const isParentTable = parentType.includes('StructureItemTable');
                                // По XSD и тестам: вложенные группировки (StructureItemGroup/Table) и поля (GroupItemField)
                                // размещаются внутри groupItems. column и row также содержат groupItems.
                                let groupItemsNode = findChildNodeByLocalTag(parent, 'groupItems');
                                if (parentLocalTag === 'column' || parentLocalTag === 'row' || isParentGroup || isParentTable) {
                                    if (groupItemsNode) {
                                        const groupItemsIdx = parent.children.findIndex((ch) => ch.path === groupItemsNode.path);
                                        if (groupItemsIdx >= 0) {
                                            const nextChildren = parent.children.slice();
                                            nextChildren[groupItemsIdx] = {
                                                ...groupItemsNode,
                                                children: [...(groupItemsNode.children || []), newGroupItem],
                                            };
                                            return { ...parent, children: nextChildren };
                                        }
                                    }
                                    else if (isParentGroup || isParentTable) {
                                        // Создаём groupItems если отсутствует (для новой группировки)
                                        const newGroupItems = {
                                            path: '',
                                            tag: 'dcsset:groupItems',
                                            attrs: {},
                                            children: [newGroupItem],
                                        };
                                        return { ...parent, children: [...(parent.children || []), newGroupItems] };
                                    }
                                }
                                return parent;
                            });
                        }
                    }
                }
            }
        }
        else {
            // Добавляем на верхний уровень структуры
            if (!structureNode) {
                structuralUpdate(settingsRoot.path, (s) => {
                    const newStructure = {
                        path: '',
                        tag: 'dcsset:structure',
                        attrs: {},
                        children: [newGroupItem],
                    };
                    return { ...s, children: [...s.children, newStructure] };
                });
            }
            else {
                structuralUpdate(structureNode.path, (struct) => {
                    return { ...struct, children: [...struct.children, newGroupItem] };
                });
            }
        }
        setNewGroupingField('');
        setParentGroupingPath(null);
        setAddingGrouping(false);
    }, [settingsRoot, structureNode, structuralUpdate, newGroupingField, parentGroupingPath]);
    // Удалить элемент структуры (группировку/таблицу)
    const handleDeleteStructureItem = (0, react_1.useCallback)((itemPath) => {
        if (!structureNode)
            return;
        structuralUpdate(structureNode.path, (struct) => {
            const idx = struct.children.findIndex((ch) => ch.path === itemPath);
            if (idx < 0)
                return struct;
            const nextChildren = struct.children.filter((_, i) => i !== idx);
            return { ...struct, children: nextChildren };
        });
    }, [structureNode, structuralUpdate]);
    return (react_1.default.createElement("div", { className: "dcs-details" },
        react_1.default.createElement("div", { className: "dcs-details__head" },
            react_1.default.createElement("div", { className: "dcs-details__name" }, presentation || name || 'Вариант настроек')),
        react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0435"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("table", { className: "edt-grid__table" },
                    react_1.default.createElement("tbody", null,
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { width: '35%', opacity: 0.8 } }, "\u0418\u043C\u044F"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("input", { className: "edt-props-editor__input", value: name, onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'name', e.target.value)) }))),
                        react_1.default.createElement("tr", null,
                            react_1.default.createElement("td", { style: { opacity: 0.8 } }, "\u041F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u0435"),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("input", { className: "edt-props-editor__input", value: presentation, onChange: (e) => onUpdateNode(node.path, (n) => upsertChildTextByLocalTag(n, 'presentation', e.target.value, 'dcsset:presentation')) }))))))),
        !settingsRoot ? (react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("div", { className: "dcs-empty" }, "\u0423 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0443\u0437\u0435\u043B settings.")))) : (react_1.default.createElement("div", { className: "dcs-section" },
            react_1.default.createElement("div", { className: "dcs-section__title" }, "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043E\u0442\u0447\u0435\u0442\u0430"),
            react_1.default.createElement("div", { className: "dcs-section__body" },
                react_1.default.createElement("div", { className: "dcs-top-tabs", style: { marginBottom: 10 } },
                    react_1.default.createElement("button", { className: `dcs-top-tab ${activeSettingsTab === 'fields' ? 'is-active' : ''}`, onClick: () => setActiveSettingsTab('fields') },
                        "\u041F\u043E\u043B\u044F ",
                        react_1.default.createElement("span", { className: "dcs-top-tab__count" }, selectedFields.length)),
                    react_1.default.createElement("button", { className: `dcs-top-tab ${activeSettingsTab === 'filters' ? 'is-active' : ''}`, onClick: () => setActiveSettingsTab('filters') },
                        "\u041E\u0442\u0431\u043E\u0440\u044B ",
                        react_1.default.createElement("span", { className: "dcs-top-tab__count" }, filterItems.length)),
                    react_1.default.createElement("button", { className: `dcs-top-tab ${activeSettingsTab === 'order' ? 'is-active' : ''}`, onClick: () => setActiveSettingsTab('order') },
                        "\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0438 ",
                        react_1.default.createElement("span", { className: "dcs-top-tab__count" }, orderItems.length)),
                    react_1.default.createElement("button", { className: `dcs-top-tab ${activeSettingsTab === 'structure' ? 'is-active' : ''}`, onClick: () => setActiveSettingsTab('structure') },
                        "\u0413\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0438 ",
                        react_1.default.createElement("span", { className: "dcs-top-tab__count" }, structureItems.length)),
                    react_1.default.createElement("button", { className: `dcs-top-tab ${activeSettingsTab === 'other' ? 'is-active' : ''}`, onClick: () => setActiveSettingsTab('other') }, "\u041F\u0440\u043E\u0447\u0435\u0435")),
                activeSettingsTab === 'fields' && (react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { style: { display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' } }, !addingField ? (react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u043E\u043B\u0435", onClick: () => setAddingField(true) }, "+")) : (react_1.default.createElement(react_1.default.Fragment, null,
                        react_1.default.createElement("input", { className: "edt-props-editor__input", style: { width: 200 }, value: newFieldName, onChange: (e) => setNewFieldName(e.target.value), placeholder: "\u0418\u043C\u044F \u043F\u043E\u043B\u044F...", autoFocus: true, onKeyDown: (e) => {
                                if (e.key === 'Enter')
                                    handleAddField();
                                if (e.key === 'Escape') {
                                    setAddingField(false);
                                    setNewFieldName('');
                                }
                            } }),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C", onClick: handleAddField, disabled: !newFieldName.trim() }, "\u2713"),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u041E\u0442\u043C\u0435\u043D\u0430", onClick: () => { setAddingField(false); setNewFieldName(''); } }, "\u2715")))),
                    selectedFields.length === 0 ? (react_1.default.createElement("div", { className: "dcs-empty" }, "\u041D\u0435\u0442 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0445 \u043F\u043E\u043B\u0435\u0439. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \"+\" \u0434\u043B\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F.")) : (react_1.default.createElement("table", { className: "edt-grid__table" },
                        react_1.default.createElement("thead", null,
                            react_1.default.createElement("tr", null,
                                react_1.default.createElement("th", { style: { width: '80%' } }, "\u041F\u043E\u043B\u0435"),
                                react_1.default.createElement("th", { style: { width: '20%' } }))),
                        react_1.default.createElement("tbody", null, selectedFields.map((f, idx) => (react_1.default.createElement("tr", { key: f.path },
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("input", { className: "edt-props-editor__input", value: f.fieldName, onChange: (e) => {
                                        const fieldNode = findChildNodeByLocalTag(f.node, 'field');
                                        if (fieldNode) {
                                            onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                                        }
                                    } })),
                            react_1.default.createElement("td", null,
                                react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", onClick: () => handleDeleteField(f.path) }, "\u00D7")))))))))),
                activeSettingsTab === 'filters' && (react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { style: { display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' } }, !addingFilter ? (react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043E\u0442\u0431\u043E\u0440", onClick: () => setAddingFilter(true) }, "+")) : (react_1.default.createElement(react_1.default.Fragment, null,
                        react_1.default.createElement("input", { className: "edt-props-editor__input", style: { width: 200 }, value: newFilterField, onChange: (e) => setNewFilterField(e.target.value), placeholder: "\u0418\u043C\u044F \u043F\u043E\u043B\u044F \u0434\u043B\u044F \u043E\u0442\u0431\u043E\u0440\u0430...", autoFocus: true, onKeyDown: (e) => {
                                if (e.key === 'Enter')
                                    handleAddFilter();
                                if (e.key === 'Escape') {
                                    setAddingFilter(false);
                                    setNewFilterField('');
                                }
                            } }),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C", onClick: handleAddFilter, disabled: !newFilterField.trim() }, "\u2713"),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u041E\u0442\u043C\u0435\u043D\u0430", onClick: () => { setAddingFilter(false); setNewFilterField(''); } }, "\u2715")))),
                    filterItems.length === 0 ? (react_1.default.createElement("div", { className: "dcs-empty" }, "\u041D\u0435\u0442 \u043E\u0442\u0431\u043E\u0440\u043E\u0432. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \"+\" \u0434\u043B\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F.")) : (react_1.default.createElement("table", { className: "edt-grid__table" },
                        react_1.default.createElement("thead", null,
                            react_1.default.createElement("tr", null,
                                react_1.default.createElement("th", { style: { width: '5%' } }, "\u2713"),
                                react_1.default.createElement("th", { style: { width: '40%' } }, "\u041F\u043E\u043B\u0435"),
                                react_1.default.createElement("th", { style: { width: '30%' } }, "\u0423\u0441\u043B\u043E\u0432\u0438\u0435"),
                                react_1.default.createElement("th", { style: { width: '20%' } }, "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435"),
                                react_1.default.createElement("th", { style: { width: '5%' } }))),
                        react_1.default.createElement("tbody", null, filterItems.map((f) => {
                            const useNode = findChildNodeByLocalTag(f.node, 'use');
                            const leftNode = findChildNodeByLocalTag(f.node, 'left');
                            const compTypeNode = findChildNodeByLocalTag(f.node, 'comparisonType');
                            const rightNode = findChildNodeByLocalTag(f.node, 'right');
                            return (react_1.default.createElement("tr", { key: f.path },
                                react_1.default.createElement("td", null,
                                    react_1.default.createElement("input", { type: "checkbox", checked: f.use, onChange: (e) => {
                                            if (useNode) {
                                                onUpdateNode(useNode.path, (n) => ({ ...n, text: e.target.checked ? 'true' : 'false' }));
                                            }
                                        } })),
                                react_1.default.createElement("td", null,
                                    react_1.default.createElement("input", { className: "edt-props-editor__input", value: f.field, onChange: (e) => {
                                            if (leftNode) {
                                                onUpdateNode(leftNode.path, (n) => ({ ...n, text: e.target.value }));
                                            }
                                        } })),
                                react_1.default.createElement("td", null,
                                    react_1.default.createElement("select", { className: "edt-props-editor__input", value: f.comparisonType, onChange: (e) => {
                                            if (compTypeNode) {
                                                onUpdateNode(compTypeNode.path, (n) => ({ ...n, text: e.target.value }));
                                            }
                                        } },
                                        react_1.default.createElement("option", { value: "Equal" }, "\u0420\u0430\u0432\u043D\u043E"),
                                        react_1.default.createElement("option", { value: "NotEqual" }, "\u041D\u0435 \u0440\u0430\u0432\u043D\u043E"),
                                        react_1.default.createElement("option", { value: "Greater" }, "\u0411\u043E\u043B\u044C\u0448\u0435"),
                                        react_1.default.createElement("option", { value: "GreaterOrEqual" }, "\u0411\u043E\u043B\u044C\u0448\u0435 \u0438\u043B\u0438 \u0440\u0430\u0432\u043D\u043E"),
                                        react_1.default.createElement("option", { value: "Less" }, "\u041C\u0435\u043D\u044C\u0448\u0435"),
                                        react_1.default.createElement("option", { value: "LessOrEqual" }, "\u041C\u0435\u043D\u044C\u0448\u0435 \u0438\u043B\u0438 \u0440\u0430\u0432\u043D\u043E"),
                                        react_1.default.createElement("option", { value: "InList" }, "\u0412 \u0441\u043F\u0438\u0441\u043A\u0435"),
                                        react_1.default.createElement("option", { value: "InHierarchy" }, "\u0412 \u0438\u0435\u0440\u0430\u0440\u0445\u0438\u0438"),
                                        react_1.default.createElement("option", { value: "Contains" }, "\u0421\u043E\u0434\u0435\u0440\u0436\u0438\u0442"),
                                        react_1.default.createElement("option", { value: "BeginsWith" }, "\u041D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0441"))),
                                react_1.default.createElement("td", null,
                                    react_1.default.createElement("input", { className: "edt-props-editor__input", value: f.value, onChange: (e) => {
                                            if (rightNode) {
                                                onUpdateNode(rightNode.path, (n) => ({ ...n, text: e.target.value }));
                                            }
                                            else if (f.node) {
                                                structuralUpdate(f.node.path, (item) => ({
                                                    ...item,
                                                    children: [
                                                        ...item.children,
                                                        { path: '', tag: 'dcsset:right', attrs: {}, text: e.target.value, children: [] },
                                                    ],
                                                }));
                                            }
                                        } })),
                                react_1.default.createElement("td", null,
                                    react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", onClick: () => handleDeleteFilter(f.path) }, "\u00D7"))));
                        })))))),
                activeSettingsTab === 'order' && (react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { style: { display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' } }, !addingOrder ? (react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0443", onClick: () => setAddingOrder(true) }, "+")) : (react_1.default.createElement(react_1.default.Fragment, null,
                        react_1.default.createElement("input", { className: "edt-props-editor__input", style: { width: 200 }, value: newOrderField, onChange: (e) => setNewOrderField(e.target.value), placeholder: "\u0418\u043C\u044F \u043F\u043E\u043B\u044F \u0434\u043B\u044F \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0438...", autoFocus: true, onKeyDown: (e) => {
                                if (e.key === 'Enter')
                                    handleAddOrder();
                                if (e.key === 'Escape') {
                                    setAddingOrder(false);
                                    setNewOrderField('');
                                }
                            } }),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C", onClick: handleAddOrder, disabled: !newOrderField.trim() }, "\u2713"),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u041E\u0442\u043C\u0435\u043D\u0430", onClick: () => { setAddingOrder(false); setNewOrderField(''); } }, "\u2715")))),
                    orderItems.length === 0 ? (react_1.default.createElement("div", { className: "dcs-empty" }, "\u041D\u0435\u0442 \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043E\u043A. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \"+\" \u0434\u043B\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F.")) : (react_1.default.createElement("table", { className: "edt-grid__table" },
                        react_1.default.createElement("thead", null,
                            react_1.default.createElement("tr", null,
                                react_1.default.createElement("th", { style: { width: '70%' } }, "\u041F\u043E\u043B\u0435"),
                                react_1.default.createElement("th", { style: { width: '25%' } }, "\u041D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435"),
                                react_1.default.createElement("th", { style: { width: '5%' } }))),
                        react_1.default.createElement("tbody", null, orderItems.map((o) => {
                            const fieldNode = findChildNodeByLocalTag(o.node, 'field');
                            const orderTypeNode = findChildNodeByLocalTag(o.node, 'orderType');
                            return (react_1.default.createElement("tr", { key: o.path },
                                react_1.default.createElement("td", null,
                                    react_1.default.createElement("input", { className: "edt-props-editor__input", value: o.field, onChange: (e) => {
                                            if (fieldNode) {
                                                onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                                            }
                                        } })),
                                react_1.default.createElement("td", null,
                                    react_1.default.createElement("select", { className: "edt-props-editor__input", value: o.orderType, onChange: (e) => {
                                            if (orderTypeNode) {
                                                onUpdateNode(orderTypeNode.path, (n) => ({ ...n, text: e.target.value }));
                                            }
                                        } },
                                        react_1.default.createElement("option", { value: "Asc" }, "\u041F\u043E \u0432\u043E\u0437\u0440\u0430\u0441\u0442\u0430\u043D\u0438\u044E"),
                                        react_1.default.createElement("option", { value: "Desc" }, "\u041F\u043E \u0443\u0431\u044B\u0432\u0430\u043D\u0438\u044E"))),
                                react_1.default.createElement("td", null,
                                    react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", onClick: () => handleDeleteOrder(o.path) }, "\u00D7"))));
                        })))))),
                activeSettingsTab === 'structure' && (react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { style: { display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' } }, !addingGrouping ? (react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0433\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0443", onClick: () => setAddingGrouping(true) }, "+")) : (react_1.default.createElement(react_1.default.Fragment, null,
                        react_1.default.createElement("input", { className: "edt-props-editor__input", style: { width: 200 }, value: newGroupingField, onChange: (e) => setNewGroupingField(e.target.value), placeholder: "\u0418\u043C\u044F \u043F\u043E\u043B\u044F \u0434\u043B\u044F \u0433\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0438...", autoFocus: true, onKeyDown: (e) => {
                                if (e.key === 'Enter')
                                    handleAddGrouping();
                                if (e.key === 'Escape') {
                                    setAddingGrouping(false);
                                    setNewGroupingField('');
                                    setParentGroupingPath(null);
                                }
                            } }),
                        structureItems.length > 0 && (react_1.default.createElement("select", { className: "edt-props-editor__input", style: { width: 250 }, value: parentGroupingPath || '', onChange: (e) => setParentGroupingPath(e.target.value || null) },
                            react_1.default.createElement("option", { value: "" }, "-- \u041D\u0430 \u0432\u0435\u0440\u0445\u043D\u0438\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C --"),
                            getAllGroupingsForParent().map((g) => (react_1.default.createElement("option", { key: g.path, value: g.path }, g.label))))),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C", onClick: handleAddGrouping, disabled: !newGroupingField.trim() }, "\u2713"),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u041E\u0442\u043C\u0435\u043D\u0430", onClick: () => { setAddingGrouping(false); setNewGroupingField(''); setParentGroupingPath(null); } }, "\u2715")))),
                    structureItems.length === 0 ? (react_1.default.createElement("div", { className: "dcs-empty" }, "\u041D\u0435\u0442 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u044B (\u0433\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043E\u043A, \u0442\u0430\u0431\u043B\u0438\u0446, \u0434\u0438\u0430\u0433\u0440\u0430\u043C\u043C). \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \"+\" \u0434\u043B\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F.")) : (react_1.default.createElement("div", null, structureItems.map((struct, idx) => (react_1.default.createElement("div", { key: struct.path, style: { marginBottom: 16, padding: 10, border: '1px solid var(--vscode-panel-border)', borderRadius: 4 } },
                        react_1.default.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
                            react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 } },
                                (struct.isGroup || struct.isTable) && (react_1.default.createElement("input", { type: "checkbox", checked: struct.useNode ? String(struct.useNode.text || 'true').toLowerCase() === 'true' : true, onChange: (e) => {
                                        const checked = e.target.checked;
                                        if (struct.useNode) {
                                            onUpdateNode(struct.useNode.path, (n) => ({ ...n, text: checked ? 'true' : 'false' }));
                                        }
                                        else {
                                            onUpdateNode(struct.path, (n) => {
                                                const useChild = { path: '', tag: 'dcsset:use', attrs: {}, text: checked ? 'true' : 'false', children: [] };
                                                return { ...n, children: [...(n.children || []), useChild] };
                                            });
                                        }
                                    }, title: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C/\u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0433\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0443" })),
                                react_1.default.createElement("div", { style: { fontSize: 13, fontWeight: 'bold', opacity: 0.9 } },
                                    struct.isTable && '📊 Таблица',
                                    struct.isGroup && (struct.groupDisplayLabel ? `📁 ${struct.groupDisplayLabel}` : '📁 Группировка'),
                                    struct.isChart && (struct.chartParams?.title ? `📊 Диаграмма: ${struct.chartParams.title}` : '📊 Диаграмма'),
                                    !struct.isTable && !struct.isGroup && !struct.isChart && `Элемент ${idx + 1}`)),
                            react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u044B", onClick: () => handleDeleteStructureItem(struct.path) }, "\u00D7")),
                        struct.isTable ? (react_1.default.createElement("div", null,
                            struct.columnStructure && (react_1.default.createElement("div", { style: { marginBottom: 12 } },
                                react_1.default.createElement("div", { style: { fontSize: 12, fontWeight: 'bold', marginBottom: 6, opacity: 0.8 } }, "\uD83D\uDCCB \u041A\u043E\u043B\u043E\u043D\u043A\u0438"),
                                react_1.default.createElement(NestedGroupingView, { structure: struct.columnStructure, level: 0, onUpdateNode: onUpdateNode, groupingOtherSettingsExpanded: groupingOtherSettingsExpanded, setGroupingOtherSettingsExpanded: setGroupingOtherSettingsExpanded }))),
                            struct.rowStructure && (react_1.default.createElement("div", null,
                                react_1.default.createElement("div", { style: { fontSize: 12, fontWeight: 'bold', marginBottom: 6, opacity: 0.8 } }, "\uD83D\uDCCA \u0421\u0442\u0440\u043E\u043A\u0438"),
                                react_1.default.createElement(NestedGroupingView, { structure: struct.rowStructure, level: 0, onUpdateNode: onUpdateNode, groupingOtherSettingsExpanded: groupingOtherSettingsExpanded, setGroupingOtherSettingsExpanded: setGroupingOtherSettingsExpanded }))),
                            !struct.columnStructure && !struct.rowStructure && (react_1.default.createElement("div", { className: "dcs-empty", style: { fontSize: 12, padding: 6 } }, "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0432 \u0442\u0430\u0431\u043B\u0438\u0446\u0435")))) : struct.isChart ? (react_1.default.createElement("div", null,
                            react_1.default.createElement("table", { className: "edt-grid__table" },
                                react_1.default.createElement("thead", null,
                                    react_1.default.createElement("tr", null,
                                        react_1.default.createElement("th", { style: { width: '30%' } }, "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440"),
                                        react_1.default.createElement("th", { style: { width: '70%' } }, "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435"))),
                                react_1.default.createElement("tbody", null,
                                    react_1.default.createElement("tr", null,
                                        react_1.default.createElement("td", null, "\u0422\u0438\u043F \u0434\u0438\u0430\u0433\u0440\u0430\u043C\u043C\u044B"),
                                        react_1.default.createElement("td", null,
                                            react_1.default.createElement("input", { className: "edt-props-editor__input", value: struct.chartParams?.chartType || '', readOnly: true, style: { opacity: 0.7 }, placeholder: "Pie3D, Column \u0438 \u0442.\u0434." }))),
                                    struct.chartParams?.title && (react_1.default.createElement("tr", null,
                                        react_1.default.createElement("td", null, "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A"),
                                        react_1.default.createElement("td", null,
                                            react_1.default.createElement("input", { className: "edt-props-editor__input", value: struct.chartParams.title, readOnly: true, style: { opacity: 0.7 } })))))),
                            react_1.default.createElement("div", { style: { marginTop: 8, fontSize: 11, opacity: 0.6 } }, "\u0414\u043B\u044F \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u043E\u0432 \u0434\u0438\u0430\u0433\u0440\u0430\u043C\u043C\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0432\u043A\u043B\u0430\u0434\u043A\u0443 \"\u041F\u0440\u043E\u0447\u0435\u0435\""))) : (react_1.default.createElement("div", null,
                            struct.groupFields.length > 0 ? (react_1.default.createElement("table", { className: "edt-grid__table" },
                                react_1.default.createElement("thead", null,
                                    react_1.default.createElement("tr", null,
                                        react_1.default.createElement("th", { style: { width: '70%' } }, "\u041F\u043E\u043B\u0435 \u0433\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0438"),
                                        react_1.default.createElement("th", { style: { width: '30%' } }, "\u0422\u0438\u043F"))),
                                react_1.default.createElement("tbody", null, struct.groupFields.map((gf) => {
                                    const fieldNode = findChildNodeByLocalTag(gf.node, 'field');
                                    const groupTypeNode = findChildNodeByLocalTag(gf.node, 'groupType');
                                    return (react_1.default.createElement("tr", { key: gf.path },
                                        react_1.default.createElement("td", null,
                                            react_1.default.createElement("input", { className: "edt-props-editor__input", value: gf.field, onChange: (e) => {
                                                    if (fieldNode) {
                                                        onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                                                    }
                                                } })),
                                        react_1.default.createElement("td", null,
                                            react_1.default.createElement("select", { className: "edt-props-editor__input", value: gf.groupType, onChange: (e) => {
                                                    if (groupTypeNode) {
                                                        onUpdateNode(groupTypeNode.path, (n) => ({ ...n, text: e.target.value }));
                                                    }
                                                } },
                                                react_1.default.createElement("option", { value: "Items" }, "\u042D\u043B\u0435\u043C\u0435\u043D\u0442\u044B"),
                                                react_1.default.createElement("option", { value: "Hierarchy" }, "\u0418\u0435\u0440\u0430\u0440\u0445\u0438\u044F"),
                                                react_1.default.createElement("option", { value: "OnlyHierarchy" }, "\u0422\u043E\u043B\u044C\u043A\u043E \u0438\u0435\u0440\u0430\u0440\u0445\u0438\u044F")))));
                                })))) : struct.isAutoMode ? (react_1.default.createElement("div", { style: { fontSize: 12, padding: 6, opacity: 0.85 } }, "\u0410\u0432\u0442\u043E (\u0432\u0441\u0435 \u043F\u043E\u043B\u044F \u0438\u0437 \u043E\u0442\u0431\u043E\u0440\u0430)")) : (react_1.default.createElement("div", { className: "dcs-empty", style: { fontSize: 12, padding: 6 } }, "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0433\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0438")),
                            struct.outputParams && struct.outputParams.length > 0 && struct.structNode && (react_1.default.createElement("div", { style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--vscode-panel-border)' } },
                                react_1.default.createElement("div", { role: "button", tabIndex: 0, onClick: () => setGroupingOtherSettingsExpanded((prev) => ({ ...prev, [struct.path]: !(prev[struct.path] ?? true) })), onKeyDown: (e) => e.key === 'Enter' && setGroupingOtherSettingsExpanded((prev) => ({ ...prev, [struct.path]: !(prev[struct.path] ?? true) })), style: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, opacity: 0.8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 } },
                                    react_1.default.createElement("span", { style: { transform: (groupingOtherSettingsExpanded[struct.path] ?? true) ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' } }, "\u25B6"),
                                    "\u0414\u0440\u0443\u0433\u0438\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"),
                                (groupingOtherSettingsExpanded[struct.path] ?? true) && (react_1.default.createElement("table", { className: "edt-grid__table" },
                                    react_1.default.createElement("thead", null,
                                        react_1.default.createElement("tr", null,
                                            react_1.default.createElement("th", { style: { width: 28, paddingRight: 4 }, title: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C/\u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440" }),
                                            react_1.default.createElement("th", { style: { width: '38%' } }, "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440"),
                                            react_1.default.createElement("th", { style: { width: '54%' } }, "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435"))),
                                    react_1.default.createElement("tbody", null, struct.outputParams.map((op, opIdx) => {
                                        const paramDef = dcsGroupingParams_1.GROUPING_PARAM_MAP.get(op.parameter);
                                        const options = paramDef?.options;
                                        const paramLabel = paramDef?.label || op.parameter.replace(/([а-яa-z])([А-ЯA-Z])/g, '$1 $2');
                                        const isChild = !!paramDef?.parentParameter;
                                        const handleValueChange = (newVal) => {
                                            if (!struct.structNode)
                                                return;
                                            // Всегда обновляем через structNode: valueNode.path может быть '' у новых узлов
                                            onUpdateNode(struct.structNode.path, (n) => upsertOutputParameter(n, op.parameter, newVal, op.use));
                                        };
                                        const handleUseChange = (checked) => {
                                            if (!struct.structNode)
                                                return;
                                            if (op.node) {
                                                onUpdateNode(struct.structNode.path, (n) => setOutputParameterUse(n, op.parameter, checked));
                                            }
                                            else if (checked) {
                                                onUpdateNode(struct.structNode.path, (n) => upsertOutputParameter(n, op.parameter, '', true));
                                            }
                                        };
                                        return (react_1.default.createElement("tr", { key: opIdx },
                                            react_1.default.createElement("td", { style: { paddingRight: 4, verticalAlign: 'middle' } },
                                                react_1.default.createElement("input", { type: "checkbox", checked: op.use, onChange: (e) => handleUseChange(e.target.checked), title: op.use ? 'Параметр включён' : 'Параметр выключен' })),
                                            react_1.default.createElement("td", { style: { opacity: op.use ? 0.9 : 0.5, paddingLeft: isChild ? 24 : undefined } }, paramLabel),
                                            react_1.default.createElement("td", null, options ? (react_1.default.createElement("select", { className: "edt-props-editor__input", value: op.value, onChange: (e) => handleValueChange(e.target.value), disabled: !op.use },
                                                react_1.default.createElement("option", { value: "" }, "\u2014"),
                                                options.map((opt) => (react_1.default.createElement("option", { key: opt.value, value: opt.value }, opt.label))))) : (react_1.default.createElement("input", { className: "edt-props-editor__input", value: op.value, onChange: (e) => handleValueChange(e.target.value), placeholder: "\u2014", disabled: !op.use })))));
                                    })))))),
                            struct.nestedCharts && struct.nestedCharts.length > 0 && (react_1.default.createElement("div", { style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--vscode-panel-border)' } },
                                react_1.default.createElement("div", { style: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, opacity: 0.8 } }, "\u0412\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0435 \u0434\u0438\u0430\u0433\u0440\u0430\u043C\u043C\u044B:"),
                                struct.nestedCharts.map((chart, chartIdx) => (react_1.default.createElement("div", { key: chartIdx, style: { marginBottom: 8, padding: 8, border: '1px solid var(--vscode-panel-border)', borderRadius: 4, marginLeft: 16 } },
                                    react_1.default.createElement("div", { style: { fontSize: 12, fontWeight: 'bold', marginBottom: 6, opacity: 0.9 } },
                                        "\uD83D\uDCCA ",
                                        chart.chartParams?.title || chart.chartParams?.chartType || 'Диаграмма'),
                                    react_1.default.createElement("div", { style: { fontSize: 11, opacity: 0.7 } },
                                        "\u0422\u0438\u043F: ",
                                        chart.chartParams?.chartType || 'не указан')))))),
                            struct.nestedFromGroupItems && struct.nestedFromGroupItems.length > 0 && (react_1.default.createElement("div", { style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--vscode-panel-border)' } },
                                react_1.default.createElement("div", { style: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, opacity: 0.8 } }, "\u0412\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0435 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B:"),
                                struct.nestedFromGroupItems.map((nested, idx) => (react_1.default.createElement("div", { key: idx, style: { marginBottom: 12, padding: 8, border: '1px solid var(--vscode-panel-border)', borderRadius: 4, marginLeft: 16 } }, nested.isChart ? (react_1.default.createElement(react_1.default.Fragment, null,
                                    react_1.default.createElement("div", { style: { fontSize: 12, fontWeight: 'bold', marginBottom: 6, opacity: 0.9 } },
                                        "\uD83D\uDCCA ",
                                        nested.chartParams?.title || nested.chartParams?.chartType || 'Диаграмма'),
                                    react_1.default.createElement("div", { style: { fontSize: 11, opacity: 0.7 } },
                                        "\u0422\u0438\u043F: ",
                                        nested.chartParams?.chartType || 'не указан'))) : (react_1.default.createElement(react_1.default.Fragment, null,
                                    react_1.default.createElement("div", { style: { fontSize: 12, fontWeight: 'bold', marginBottom: 6, opacity: 0.9 } },
                                        "\uD83D\uDCC1 ",
                                        nested.groupDisplayLabel || 'Вложенная группировка'),
                                    nested.fields && nested.fields.length > 0 ? (react_1.default.createElement("table", { className: "edt-grid__table" },
                                        react_1.default.createElement("thead", null,
                                            react_1.default.createElement("tr", null,
                                                react_1.default.createElement("th", { style: { width: '70%' } }, "\u041F\u043E\u043B\u0435 \u0433\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0438"),
                                                react_1.default.createElement("th", { style: { width: '30%' } }, "\u0422\u0438\u043F"))),
                                        react_1.default.createElement("tbody", null, nested.fields.map((gf) => {
                                            const fieldNode = findChildNodeByLocalTag(gf.node, 'field');
                                            const groupTypeNode = findChildNodeByLocalTag(gf.node, 'groupType');
                                            return (react_1.default.createElement("tr", { key: gf.path },
                                                react_1.default.createElement("td", null,
                                                    react_1.default.createElement("input", { className: "edt-props-editor__input", value: gf.field, onChange: (e) => {
                                                            if (fieldNode) {
                                                                onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                                                            }
                                                        } })),
                                                react_1.default.createElement("td", null,
                                                    react_1.default.createElement("select", { className: "edt-props-editor__input", value: gf.groupType, onChange: (e) => {
                                                            if (groupTypeNode) {
                                                                onUpdateNode(groupTypeNode.path, (n) => ({ ...n, text: e.target.value }));
                                                            }
                                                        } },
                                                        react_1.default.createElement("option", { value: "Items" }, "\u042D\u043B\u0435\u043C\u0435\u043D\u0442\u044B"),
                                                        react_1.default.createElement("option", { value: "Hierarchy" }, "\u0418\u0435\u0440\u0430\u0440\u0445\u0438\u044F"),
                                                        react_1.default.createElement("option", { value: "OnlyHierarchy" }, "\u0422\u043E\u043B\u044C\u043A\u043E \u0438\u0435\u0440\u0430\u0440\u0445\u0438\u044F")))));
                                        })))) : nested.isAutoMode ? (react_1.default.createElement("div", { style: { fontSize: 12, padding: 6, opacity: 0.85 } }, "\u0410\u0432\u0442\u043E (\u0432\u0441\u0435 \u043F\u043E\u043B\u044F \u0438\u0437 \u043E\u0442\u0431\u043E\u0440\u0430)")) : (react_1.default.createElement("div", { className: "dcs-empty", style: { fontSize: 12, padding: 6 } }, "\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0433\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0438")),
                                    nested.outputParams && nested.outputParams.length > 0 && nested.structNode && (react_1.default.createElement("div", { style: { marginTop: 8, fontSize: 11 } },
                                        react_1.default.createElement("div", { role: "button", tabIndex: 0, onClick: () => setGroupingOtherSettingsExpanded((prev) => ({ ...prev, [nested.path]: !(prev[nested.path] ?? true) })), onKeyDown: (e) => e.key === 'Enter' && setGroupingOtherSettingsExpanded((prev) => ({ ...prev, [nested.path]: !(prev[nested.path] ?? true) })), style: { fontWeight: 'bold', marginBottom: 4, opacity: 0.8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 } },
                                            react_1.default.createElement("span", { style: { transform: (groupingOtherSettingsExpanded[nested.path] ?? true) ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' } }, "\u25B6"),
                                            "\u0414\u0440\u0443\u0433\u0438\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"),
                                        (groupingOtherSettingsExpanded[nested.path] ?? true) && (react_1.default.createElement("table", { className: "edt-grid__table", style: { fontSize: 11 } },
                                            react_1.default.createElement("thead", null,
                                                react_1.default.createElement("tr", null,
                                                    react_1.default.createElement("th", { style: { width: 28, paddingRight: 4 }, title: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C/\u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440" }),
                                                    react_1.default.createElement("th", { style: { width: '42%' } }, "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440"),
                                                    react_1.default.createElement("th", { style: { width: '50%' } }, "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435"))),
                                            react_1.default.createElement("tbody", null, nested.outputParams.map((op, opIdx) => {
                                                const paramDef = dcsGroupingParams_1.GROUPING_PARAM_MAP.get(op.parameter);
                                                const options = paramDef?.options;
                                                const paramLabel = paramDef?.label || op.parameter.replace(/([а-яa-z])([А-ЯA-Z])/g, '$1 $2');
                                                const isChild = !!paramDef?.parentParameter;
                                                const opUse = op.use !== undefined ? op.use : true;
                                                const handleValueChange = (newVal) => {
                                                    if (!nested.structNode)
                                                        return;
                                                    const opUse = op.use !== undefined ? op.use : true;
                                                    onUpdateNode(nested.structNode.path, (n) => upsertOutputParameter(n, op.parameter, newVal, opUse));
                                                };
                                                const handleUseChange = (checked) => {
                                                    if (!nested.structNode)
                                                        return;
                                                    if (op.node) {
                                                        onUpdateNode(nested.structNode.path, (n) => setOutputParameterUse(n, op.parameter, checked));
                                                    }
                                                    else if (checked) {
                                                        onUpdateNode(nested.structNode.path, (n) => upsertOutputParameter(n, op.parameter, '', true));
                                                    }
                                                };
                                                return (react_1.default.createElement("tr", { key: opIdx },
                                                    react_1.default.createElement("td", { style: { paddingRight: 4, verticalAlign: 'middle' } },
                                                        react_1.default.createElement("input", { type: "checkbox", checked: opUse, onChange: (e) => handleUseChange(e.target.checked), title: opUse ? 'Параметр включён' : 'Параметр выключен' })),
                                                    react_1.default.createElement("td", { style: { opacity: opUse ? 0.9 : 0.5, paddingLeft: isChild ? 24 : undefined } }, paramLabel),
                                                    react_1.default.createElement("td", null, options ? (react_1.default.createElement("select", { className: "edt-props-editor__input", style: { fontSize: 11 }, value: op.value, onChange: (e) => handleValueChange(e.target.value), disabled: !opUse },
                                                        react_1.default.createElement("option", { value: "" }, "\u2014"),
                                                        options.map((opt) => (react_1.default.createElement("option", { key: opt.value, value: opt.value }, opt.label))))) : (react_1.default.createElement("input", { className: "edt-props-editor__input", style: { fontSize: 11 }, value: op.value, onChange: (e) => handleValueChange(e.target.value), placeholder: "\u2014", disabled: !opUse })))));
                                            })))))),
                                    nested.nested && nested.nested.length > 0 && nested.nested.map((nn, nnIdx) => (react_1.default.createElement("div", { key: nnIdx, style: { marginTop: 8, padding: 6, border: '1px solid var(--vscode-panel-border)', borderRadius: 4, marginLeft: 16 } }, nn.isChart ? (react_1.default.createElement(react_1.default.Fragment, null,
                                        react_1.default.createElement("div", { style: { fontSize: 11, fontWeight: 'bold', marginBottom: 4, opacity: 0.8 } },
                                            "\uD83D\uDCCA ",
                                            nn.chartParams?.title || nn.chartParams?.chartType || 'Диаграмма'),
                                        react_1.default.createElement("div", { style: { fontSize: 10, opacity: 0.6 } },
                                            "\u0422\u0438\u043F: ",
                                            nn.chartParams?.chartType || 'не указан'))) : (react_1.default.createElement(react_1.default.Fragment, null,
                                        react_1.default.createElement("div", { style: { fontSize: 11, fontWeight: 'bold', marginBottom: 4, opacity: 0.8 } }, "\uD83D\uDCC1 \u0412\u043B\u043E\u0436\u0435\u043D\u043D\u0430\u044F \u0433\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0430 (\u0443\u0440\u043E\u0432\u0435\u043D\u044C 2)"),
                                        nn.fields && nn.fields.length > 0 && (react_1.default.createElement("table", { className: "edt-grid__table" },
                                            react_1.default.createElement("tbody", null, nn.fields.map((gf) => {
                                                const fieldNode = findChildNodeByLocalTag(gf.node, 'field');
                                                return (react_1.default.createElement("tr", { key: gf.path },
                                                    react_1.default.createElement("td", null,
                                                        react_1.default.createElement("input", { className: "edt-props-editor__input", value: gf.field, onChange: (e) => {
                                                                if (fieldNode) {
                                                                    onUpdateNode(fieldNode.path, (n) => ({ ...n, text: e.target.value }));
                                                                }
                                                            } }))));
                                            }))))))))))))))))))))))),
                    react_1.default.createElement("div", { style: { marginTop: 10, fontSize: 12, opacity: 0.7 } }, "\u0413\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0438 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u044E\u0442 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0443 \u043E\u0442\u0447\u0435\u0442\u0430. \u041C\u043E\u0433\u0443\u0442 \u0431\u044B\u0442\u044C \u043F\u0440\u043E\u0441\u0442\u044B\u043C\u0438 (Group), \u0442\u0430\u0431\u043B\u0438\u0447\u043D\u044B\u043C\u0438 (Table) \u0441 \u043A\u043E\u043B\u043E\u043D\u043A\u0430\u043C\u0438 \u0438 \u0441\u0442\u0440\u043E\u043A\u0430\u043C\u0438, \u0438\u043B\u0438 \u0434\u0438\u0430\u0433\u0440\u0430\u043C\u043C\u0430\u043C\u0438 (Chart)."))),
                activeSettingsTab === 'other' && (react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { style: { fontSize: 12, opacity: 0.7, marginBottom: 8 } }, "\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u043E\u0435 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0432\u0441\u0435\u0445 \u0443\u0437\u043B\u043E\u0432 settings. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0434\u043B\u044F \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F structure, conditionalAppearance \u0438 \u0434\u0440\u0443\u0433\u0438\u0445 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A."),
                    react_1.default.createElement("div", { style: { border: '1px solid var(--vscode-panel-border)', borderRadius: 3, padding: 8, maxHeight: 400, overflow: 'auto', fontSize: 11, fontFamily: 'monospace' } },
                        react_1.default.createElement("pre", { style: { margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, JSON.stringify(settingsRoot, null, 2))))))))));
};
const DcsEditorApp = ({ vscode }) => {
    const [report, setReport] = (0, react_1.useState)(null);
    const [metadata, setMetadata] = (0, react_1.useState)({ registers: [], referenceTypes: [] });
    const [metadataTree, setMetadataTree] = (0, react_1.useState)(null);
    const [treeQuery, setTreeQuery] = (0, react_1.useState)('');
    const [selectedPath, setSelectedPath] = (0, react_1.useState)('');
    const [dcsTab, setDcsTab] = (0, react_1.useState)('datasets');
    const [schemaChildren, setSchemaChildren] = (0, react_1.useState)([]);
    const [originalSchema, setOriginalSchema] = (0, react_1.useState)(null);
    const [selectedDatasetKey, setSelectedDatasetKey] = (0, react_1.useState)('');
    const [selectedParameterKey, setSelectedParameterKey] = (0, react_1.useState)('');
    const [selectedLinkKey, setSelectedLinkKey] = (0, react_1.useState)('');
    const [selectedFieldKey, setSelectedFieldKey] = (0, react_1.useState)('');
    const [selectedCalcKey, setSelectedCalcKey] = (0, react_1.useState)('');
    const [selectedResourceKey, setSelectedResourceKey] = (0, react_1.useState)('');
    const [isQueryEditorOpen, setIsQueryEditorOpen] = (0, react_1.useState)(false);
    const [queryBeingEdited, setQueryBeingEdited] = (0, react_1.useState)({ dataSetPath: '', queryText: '' });
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const msg = event.data;
            if (!msg || typeof msg !== 'object')
                return;
            if (msg.type === 'dcsEditorInit') {
                const payload = msg.payload;
                const md = msg.metadata;
                if (md) {
                    setMetadata({
                        registers: Array.isArray(md.registers) ? md.registers : [],
                        referenceTypes: Array.isArray(md.referenceTypes) ? md.referenceTypes : [],
                    });
                }
                const mt = msg.metadataTree;
                if (mt && typeof mt === 'object') {
                    setMetadataTree(mt);
                    (0, monacoQueryLanguage_1.setQueryMetadataCompletionTree)(mt);
                }
                else {
                    setMetadataTree(null);
                    (0, monacoQueryLanguage_1.setQueryMetadataCompletionTree)(null);
                }
                setReport(payload);
                const children = Array.isArray(payload?.schema?.children) ? payload.schema.children : [];
                setSchemaChildren(children);
                // ВАЖНО: _raw больше не отправляется из extension (циклические ссылки DOM)
                // Проверяем только _originalXml
                if (payload?.schema?._originalXml) {
                    setOriginalSchema({
                        _originalXml: payload.schema._originalXml,
                        _raw: null,
                        _rootAttrs: payload.schema._rootAttrs
                    });
                }
                else {
                    setOriginalSchema(null);
                }
                // По умолчанию на вкладке «Наборы данных» выбираем первый dataSet (а не первый узел корня, который часто dataSource).
                const firstDataSetPath = findFirstPathByLocalTag(children, 'dataSet');
                const fallbackPath = children.length > 0 ? '0' : '';
                setSelectedPath(firstDataSetPath || fallbackPath);
                setSelectedDatasetKey(firstDataSetPath || fallbackPath);
                setSelectedFieldKey('');
                setDcsTab('datasets');
                return;
            }
            if (msg.type === 'metadataTreeReady') {
                const mt = msg.metadataTree;
                if (mt && typeof mt === 'object') {
                    setMetadataTree(mt);
                    (0, monacoQueryLanguage_1.setQueryMetadataCompletionTree)(mt);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    // Fallback: если редактор запроса открыт, а дерево не пришло — запрашиваем
    (0, react_1.useEffect)(() => {
        if (!isQueryEditorOpen || metadataTree)
            return;
        const id = window.setTimeout(() => {
            vscode.postMessage({ type: 'requestMetadataTree' });
        }, 300);
        return () => window.clearTimeout(id);
    }, [isQueryEditorOpen, metadataTree, vscode]);
    const selectedNode = (0, react_1.useMemo)(() => getNodeAtPath(schemaChildren, selectedPath), [schemaChildren, selectedPath]);
    const datasets = (0, react_1.useMemo)(() => {
        return schemaChildren
            .filter((node) => localTag(node.tag) === 'dataSet')
            .map((node) => {
            const name = getChildTextByLocalTag(node, 'name') || getNodeLabel(node);
            const dsType = String(node.attrs?.['@_xsi:type'] || '').trim();
            return { key: node.path, nodePath: node.path, title: name, subtitle: dsType ? dsType : undefined };
        });
    }, [schemaChildren]);
    const settingsVariants = (0, react_1.useMemo)(() => {
        const variants = schemaChildren
            .filter((node) => localTag(node.tag) === 'settingsVariant')
            .map((node) => {
            const name = getChildTextByLocalTag(node, 'name') || getNodeLabel(node);
            const pres = getChildTextByLocalTag(node, 'dcsset:presentation') || getChildTextByLocalTag(node, 'presentation');
            return { key: node.path, nodePath: node.path, title: name, subtitle: pres ? pres : undefined };
        });
        // Если нет вариантов, создаем виртуальный элемент "Настройки схемы"
        if (variants.length === 0 && schemaChildren.length > 0) {
            return [{ key: '__schema__', nodePath: '__schema__', title: 'Настройки схемы (defaultSettings)', subtitle: undefined }];
        }
        return variants;
    }, [schemaChildren]);
    const parameters = (0, react_1.useMemo)(() => {
        // Важно: показываем параметры схемы (только верхний уровень DataCompositionSchema/parameter).
        return schemaChildren
            .filter((node) => localTag(node.tag) === 'parameter' && !!findChildNodeByLocalTag(node, 'name'))
            .map((node) => {
            const name = getChildTextByLocalTag(node, 'name') || getNodeLabel(node);
            const title = getLocalStringTitle(node);
            const typeText = getFirstTypeFromValueType(node);
            return {
                key: node.path,
                nodePath: node.path,
                title: title ? title : name,
                subtitle: typeText ? typeText : undefined,
            };
        });
    }, [schemaChildren]);
    const dataSetLinks = (0, react_1.useMemo)(() => {
        // Связи наборов данных в 1С СКД встречаются как <dataSetLink>
        // Пример: Reports/Договорники/.../Template.xml
        return schemaChildren
            .filter((node) => localTag(node.tag) === 'dataSetLink')
            .map((node) => {
            const src = getChildTextByLocalTag(node, 'sourceDataSet');
            const dst = getChildTextByLocalTag(node, 'destinationDataSet');
            const srcExpr = getChildTextByLocalTag(node, 'sourceExpression');
            const dstExpr = getChildTextByLocalTag(node, 'destinationExpression');
            const cond = getChildTextByLocalTag(node, 'linkConditionExpression');
            const title = [src, dst].filter(Boolean).join(' → ');
            const subtitle = cond || [srcExpr, dstExpr].filter(Boolean).join(' = ');
            return {
                key: node.path,
                nodePath: node.path,
                title: title ? title : getNodeLabel(node),
                subtitle: subtitle ? subtitle : undefined,
            };
        });
    }, [schemaChildren]);
    const calculatedFields = (0, react_1.useMemo)(() => {
        return schemaChildren
            .filter((node) => localTag(node.tag) === 'calculatedField')
            .map((node) => {
            const dp = getChildTextByLocalTag(node, 'dataPath');
            const title = getLocalStringTitle(node);
            return { key: node.path, nodePath: node.path, title: title || dp || 'calculatedField' };
        });
    }, [schemaChildren]);
    const resources = (0, react_1.useMemo)(() => {
        return schemaChildren
            .filter((node) => localTag(node.tag) === 'totalField')
            .map((node) => {
            const dp = getChildTextByLocalTag(node, 'dataPath');
            return { key: node.path, nodePath: node.path, title: dp || 'totalField' };
        });
    }, [schemaChildren]);
    const onSelectNodePath = (0, react_1.useCallback)((p) => {
        setSelectedPath(p);
    }, []);
    const onChangeNodeTextAtPath = (0, react_1.useCallback)((nodePath, value) => {
        if (!nodePath)
            return;
        setSchemaChildren((prev) => updateNodeAtPath(prev, nodePath, (n) => ({ ...n, text: value })));
    }, []);
    const onUpdateNodeAtPath = (0, react_1.useCallback)((nodePath, updater) => {
        if (!nodePath)
            return;
        setSchemaChildren((prev) => updateNodeAtPath(prev, nodePath, updater));
    }, []);
    // Для структурных правок (добавление/удаление узлов) нужно пересчитать path у дерева.
    const onUpdateNodeAtPathReindex = (0, react_1.useCallback)((nodePath, updater) => {
        if (!nodePath)
            return;
        setSchemaChildren((prev) => reindexPaths(updateNodeAtPath(prev, nodePath, updater)));
    }, []);
    const handleSave = (0, react_1.useCallback)(() => {
        if (!vscode || !originalSchema || !report)
            return;
        vscode.postMessage({
            type: 'saveDcs',
            payload: {
                schemaChildren,
                _originalXml: originalSchema._originalXml,
                // _raw НЕ отправляем - DOM хранится на стороне extension
                _rootAttrs: originalSchema._rootAttrs,
                reportPath: report.reportPath,
                templatePath: report.templatePath,
                rootTag: report.schema?.rootTag || 'DataCompositionSchema',
                templateName: report.templateName,
            },
        });
    }, [vscode, originalSchema, report, schemaChildren]);
    const handleChangeDataSetQuery = (0, react_1.useCallback)((dataSetPath, nextQuery) => {
        setSchemaChildren((prev) => {
            const next = updateNodeAtPath(prev, dataSetPath, (ds) => {
                // обновляем query
                let updated = upsertChildTextByLocalTag(ds, 'query', nextQuery);
                // ИСПРАВЛЕНО: СИНХРОНИЗИРУЕМ список полей с запросом (добавляем новые, удаляем отсутствующие)
                // extractFieldNamesFromQuery возвращает алиасы (часть после КАК), которые используются как имена полей
                const fieldNames = extractFieldNamesFromQuery(nextQuery);
                const fieldsWithAliases = extractFieldNamesWithAliases(nextQuery);
                // Создаем map: алиас (fieldName) -> алиас (для заголовка)
                // extractFieldNamesWithAliases возвращает { fieldName: алиас, alias: алиас } если есть КАК
                const aliasMap = new Map();
                for (const f of fieldsWithAliases) {
                    if (f.alias && f.fieldName) {
                        // fieldName уже является алиасом (часть после КАК), alias тоже
                        aliasMap.set(f.fieldName, f.alias);
                    }
                }
                // Если не удалось извлечь поля из запроса (пользователь редактирует),
                // НЕ трогаем существующие поля
                if (fieldNames.length === 0) {
                    return updated;
                }
                const existingFields = (updated.children || []).filter((c) => localTag(c.tag) === 'field');
                const existingByName = new Map();
                for (const f of existingFields) {
                    const n = getChildTextByLocalTag(f, 'field') || getChildTextByLocalTag(f, 'dataPath');
                    if (n)
                        existingByName.set(n, f);
                }
                // Строим НОВЫЙ список полей из извлеченных имен (которые являются алиасами)
                // Сохраняем свойства (title, role) для существующих полей
                const newFields = [];
                for (const name of fieldNames) {
                    if (existingByName.has(name)) {
                        // Поле уже было - копируем его со всеми свойствами (title, role, etc)
                        // Обновляем заголовок, если есть алиас в запросе
                        const existing = existingByName.get(name);
                        const alias = aliasMap.get(name);
                        if (alias) {
                            // Обновляем заголовок поля из алиаса
                            const updatedField = upsertLocalStringTitle(existing, alias);
                            newFields.push(updatedField);
                        }
                        else {
                            newFields.push(existing);
                        }
                    }
                    else {
                        // Новое поле - создаем
                        // name - это уже алиас (часть после КАК), если был КАК в запросе
                        const fieldChildren = [makeTextNode('dataPath', name), makeTextNode('field', name)];
                        // Проверяем, был ли это алиас (извлеченный с помощью КАК)
                        const fieldInfo = fieldsWithAliases.find(f => f.fieldName === name && f.alias);
                        if (fieldInfo && fieldInfo.alias) {
                            // Устанавливаем алиас как заголовок поля
                            fieldChildren.push(makeLocalStringTitleNode(fieldInfo.alias));
                        }
                        else {
                            // Если нет алиаса, используем имя поля как заголовок
                            fieldChildren.push(makeLocalStringTitleNode(name));
                        }
                        newFields.push({
                            path: '',
                            tag: 'field',
                            attrs: { '@_xsi:type': 'DataSetFieldField' },
                            children: fieldChildren,
                        });
                    }
                }
                // Удаляем все старые поля и заменяем на новый список
                const otherChildren = (updated.children || []).filter((c) => localTag(c.tag) !== 'field');
                // Находим позицию для вставки полей (после <name>)
                const nameIdx = otherChildren.findIndex((c) => localTag(c.tag) === 'name');
                const insertIdx = nameIdx >= 0 ? nameIdx + 1 : 0;
                // Вставляем новый список полей
                const merged = [
                    ...otherChildren.slice(0, insertIdx),
                    ...newFields,
                    ...otherChildren.slice(insertIdx)
                ];
                updated = { ...updated, children: merged };
                return updated;
            });
            return reindexPaths(next);
        });
        setSelectedFieldKey('');
    }, []);
    const handleAddLink = (0, react_1.useCallback)(() => {
        setSchemaChildren((prev) => {
            const dsNames = prev.filter((n) => localTag(n.tag) === 'dataSet').map((n) => getChildTextByLocalTag(n, 'name')).filter(Boolean);
            const src = dsNames[0] || '';
            const dst = dsNames[1] || dsNames[0] || '';
            const newNode = {
                path: '',
                tag: 'dataSetLink',
                attrs: {},
                children: [
                    makeTextNode('sourceDataSet', src),
                    makeTextNode('destinationDataSet', dst),
                    makeTextNode('sourceExpression', ''),
                    makeTextNode('destinationExpression', ''),
                    makeTextNode('linkConditionExpression', ''),
                ],
            };
            const lastLinkIdx = (() => {
                let idx = -1;
                for (let i = 0; i < prev.length; i++)
                    if (localTag(prev[i].tag) === 'dataSetLink')
                        idx = i;
                return idx;
            })();
            const insertIdx = lastLinkIdx >= 0 ? lastLinkIdx + 1 : prev.length;
            const inserted = [...prev.slice(0, insertIdx), newNode, ...prev.slice(insertIdx)];
            const re = reindexPaths(inserted);
            const newPath = String(insertIdx);
            setSelectedPath(newPath);
            setSelectedLinkKey(newPath);
            return re;
        });
    }, []);
    const handleDeleteSelectedLink = (0, react_1.useCallback)(() => {
        setSchemaChildren((prev) => {
            const idx = Number(String((selectedLinkKey || selectedPath) || '').split('.')[0]);
            if (!Number.isFinite(idx) || idx < 0 || idx >= prev.length)
                return prev;
            const node = prev[idx];
            if (!node || localTag(node.tag) !== 'dataSetLink')
                return prev;
            const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
            const re = reindexPaths(next);
            const firstLink = findFirstPathByLocalTag(re, 'dataSetLink');
            setSelectedPath(firstLink);
            setSelectedLinkKey(firstLink);
            return re;
        });
    }, [selectedLinkKey, selectedPath]);
    const handleAddCalculatedField = (0, react_1.useCallback)(() => {
        setSchemaChildren((prev) => {
            const dataPath = `НовоеПоле${prev.filter((n) => localTag(n.tag) === 'calculatedField').length + 1}`;
            const newNode = {
                path: '',
                tag: 'calculatedField',
                attrs: {},
                children: [
                    makeTextNode('dataPath', dataPath),
                    makeTextNode('expression', ''),
                    makeLocalStringTitleNode(''),
                ],
            };
            // Вычисляемое поле добавляется только на уровне схемы СКД, не в набор данных
            const lastIdx = (() => { let idx = -1; for (let i = 0; i < prev.length; i++)
                if (localTag(prev[i].tag) === 'calculatedField')
                    idx = i; return idx; })();
            const insertIdx = lastIdx >= 0 ? lastIdx + 1 : prev.length;
            const inserted = [...prev.slice(0, insertIdx), newNode, ...prev.slice(insertIdx)];
            const re = reindexPaths(inserted);
            const newPath = String(insertIdx);
            setSelectedPath(newPath);
            setSelectedCalcKey(newPath);
            return re;
        });
    }, []);
    ;
    const handleDeleteSelectedCalculatedField = (0, react_1.useCallback)(() => {
        setSchemaChildren((prev) => {
            const idx = Number(String((selectedCalcKey || selectedPath) || '').split('.')[0]);
            if (!Number.isFinite(idx) || idx < 0 || idx >= prev.length)
                return prev;
            const node = prev[idx];
            if (!node || localTag(node.tag) !== 'calculatedField')
                return prev;
            const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
            const re = reindexPaths(next);
            const first = findFirstPathByLocalTag(re, 'calculatedField');
            setSelectedPath(first);
            setSelectedCalcKey(first);
            return re;
        });
    }, [selectedCalcKey, selectedPath]);
    const handleAddResource = (0, react_1.useCallback)(() => {
        setSchemaChildren((prev) => {
            const newNode = {
                path: '',
                tag: 'totalField',
                attrs: {},
                children: [
                    makeTextNode('dataPath', `НовыйРесурс${prev.filter((n) => localTag(n.tag) === 'totalField').length + 1}`),
                    makeTextNode('expression', ''),
                ],
            };
            const lastIdx = (() => { let idx = -1; for (let i = 0; i < prev.length; i++)
                if (localTag(prev[i].tag) === 'totalField')
                    idx = i; return idx; })();
            const insertIdx = lastIdx >= 0 ? lastIdx + 1 : prev.length;
            const inserted = [...prev.slice(0, insertIdx), newNode, ...prev.slice(insertIdx)];
            const re = reindexPaths(inserted);
            const newPath = String(insertIdx);
            setSelectedPath(newPath);
            setSelectedResourceKey(newPath);
            return re;
        });
    }, []);
    const handleDeleteSelectedResource = (0, react_1.useCallback)(() => {
        setSchemaChildren((prev) => {
            const idx = Number(String((selectedResourceKey || selectedPath) || '').split('.')[0]);
            if (!Number.isFinite(idx) || idx < 0 || idx >= prev.length)
                return prev;
            const node = prev[idx];
            if (!node || localTag(node.tag) !== 'totalField')
                return prev;
            const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
            const re = reindexPaths(next);
            const first = findFirstPathByLocalTag(re, 'totalField');
            setSelectedPath(first);
            setSelectedResourceKey(first);
            return re;
        });
    }, [selectedResourceKey, selectedPath]);
    // Коллбек для обновления calculatedField (без синхронизации с dataSet)
    // Вычисляемые поля находятся только на уровне схемы СКД, не в наборах данных
    const onUpdateCalculatedField = (0, react_1.useCallback)((calcFieldPath, updater) => {
        if (!calcFieldPath)
            return;
        setSchemaChildren((prev) => {
            const calcField = getNodeAtPath(prev, calcFieldPath);
            if (!calcField || localTag(calcField.tag) !== 'calculatedField')
                return prev;
            // Обновляем только calculatedField, без синхронизации с dataSet
            return updateNodeAtPath(prev, calcFieldPath, updater);
        });
    }, []);
    const handleAddDataSet = (0, react_1.useCallback)(() => {
        setSchemaChildren((prev) => {
            const nextName = `НовыйНаборДанных${prev.filter((n) => localTag(n.tag) === 'dataSet').length + 1}`;
            const newNode = {
                path: '',
                tag: 'dataSet',
                attrs: { '@_xsi:type': 'DataSetQuery' },
                children: [
                    makeTextNode('name', nextName),
                    makeTextNode('query', ''),
                ],
            };
            const lastDataSetIdx = (() => {
                let idx = -1;
                for (let i = 0; i < prev.length; i++)
                    if (localTag(prev[i].tag) === 'dataSet')
                        idx = i;
                return idx;
            })();
            const insertIdx = lastDataSetIdx >= 0 ? lastDataSetIdx + 1 : prev.length;
            const inserted = [...prev.slice(0, insertIdx), newNode, ...prev.slice(insertIdx)];
            const re = reindexPaths(inserted);
            const newPath = String(insertIdx);
            setSelectedPath(newPath);
            setSelectedDatasetKey(newPath);
            setSelectedFieldKey('');
            return re;
        });
    }, []);
    const handleDeleteSelectedDataSet = (0, react_1.useCallback)(() => {
        setSchemaChildren((prev) => {
            const node = getNodeAtPath(prev, selectedDatasetKey || selectedPath);
            if (!node || localTag(node.tag) !== 'dataSet')
                return prev;
            const dsName = getChildTextByLocalTag(node, 'name');
            const idx = Number(String((selectedDatasetKey || selectedPath) || '').split('.')[0]);
            if (!Number.isFinite(idx) || idx < 0 || idx >= prev.length)
                return prev;
            let next = prev.slice(0, idx).concat(prev.slice(idx + 1));
            // удаляем связи, которые ссылаются на удаленный набор данных
            if (dsName) {
                next = next.filter((n) => {
                    if (localTag(n.tag) !== 'dataSetLink')
                        return true;
                    const src = getChildTextByLocalTag(n, 'sourceDataSet');
                    const dst = getChildTextByLocalTag(n, 'destinationDataSet');
                    return src !== dsName && dst !== dsName;
                });
            }
            const re = reindexPaths(next);
            const firstDs = findFirstPathByLocalTag(re, 'dataSet');
            setSelectedPath(firstDs);
            setSelectedDatasetKey(firstDs);
            setSelectedFieldKey('');
            return re;
        });
    }, [selectedDatasetKey, selectedPath]);
    const handleAddParameter = (0, react_1.useCallback)(() => {
        setSchemaChildren((prev) => {
            const existing = prev.filter((n) => localTag(n.tag) === 'parameter').length;
            const nextName = `НовыйПараметр${existing + 1}`;
            const newNode = {
                path: '',
                tag: 'parameter',
                attrs: {},
                children: [
                    makeTextNode('name', nextName),
                    makeLocalStringTitleNode(nextName),
                    { path: '', tag: 'valueType', attrs: {}, children: [makeTextNode('v8:Type', 'xs:string')] },
                    makeTextNode('useRestriction', 'false'),
                    makeTextNode('use', 'Always'),
                ],
            };
            // вставим после последнего параметра, иначе в конец
            const lastParamIdx = (() => {
                let idx = -1;
                for (let i = 0; i < prev.length; i++)
                    if (localTag(prev[i].tag) === 'parameter')
                        idx = i;
                return idx;
            })();
            const insertIdx = lastParamIdx >= 0 ? lastParamIdx + 1 : prev.length;
            const inserted = [...prev.slice(0, insertIdx), newNode, ...prev.slice(insertIdx)];
            const re = reindexPaths(inserted);
            const newPath = String(insertIdx);
            setSelectedPath(newPath);
            setSelectedParameterKey(newPath);
            return re;
        });
    }, []);
    const handleDeleteSelectedParameter = (0, react_1.useCallback)(() => {
        setSchemaChildren((prev) => {
            const idx = Number(String((selectedParameterKey || selectedPath) || '').split('.')[0]);
            if (!Number.isFinite(idx) || idx < 0 || idx >= prev.length)
                return prev;
            const node = prev[idx];
            if (!node || localTag(node.tag) !== 'parameter')
                return prev;
            const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
            const re = reindexPaths(next);
            const firstParam = findFirstPathByLocalTag(re, 'parameter');
            setSelectedPath(firstParam);
            setSelectedParameterKey(firstParam);
            return re;
        });
    }, [selectedParameterKey, selectedPath]);
    const dcsTabs = (0, react_1.useMemo)(() => {
        // Набор вкладок по конструктору СКД 1С:Предприятие (см. статью)
        // https://cors.su/eto-interesno/konstruktor-skd-v-1s/
        return [
            { id: 'datasets', label: 'Наборы данных', count: datasets.length },
            { id: 'links', label: 'Связи', count: dataSetLinks.length },
            { id: 'calcFields', label: 'Вычисляемые поля', count: calculatedFields.length },
            { id: 'resources', label: 'Ресурсы', count: resources.length },
            { id: 'parameters', label: 'Параметры', count: parameters.length },
            { id: 'layouts', label: 'Макеты' },
            { id: 'nested', label: 'Вложенные схемы' },
            { id: 'settings', label: 'Настройки', count: settingsVariants.length },
        ];
    }, [datasets.length, dataSetLinks.length, calculatedFields.length, resources.length, parameters.length, settingsVariants.length]);
    const leftTitle = (0, react_1.useMemo)(() => {
        switch (dcsTab) {
            case 'datasets': return 'Наборы данных';
            case 'links': return 'Связи наборов данных';
            case 'calcFields': return 'Вычисляемые поля';
            case 'resources': return 'Ресурсы';
            case 'parameters': return 'Параметры';
            case 'settings': return 'Варианты настроек';
            default: return 'Раздел';
        }
    }, [dcsTab]);
    const leftRows = (0, react_1.useMemo)(() => {
        switch (dcsTab) {
            case 'datasets': return datasets;
            case 'links': return dataSetLinks;
            case 'calcFields': return calculatedFields;
            case 'resources': return resources;
            case 'parameters': return parameters;
            case 'settings': return settingsVariants;
            default: return [];
        }
    }, [dcsTab, datasets, dataSetLinks, calculatedFields, resources, parameters, settingsVariants]);
    const nodeTitle = selectedNode ? getNodeLabel(selectedNode) : '—';
    if (!report) {
        return (react_1.default.createElement("div", { className: "edt-form-editor" },
            react_1.default.createElement("div", { className: "form-preview__empty" }, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u0445\u0435\u043C\u044B \u043A\u043E\u043C\u043F\u043E\u043D\u043E\u0432\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445\u2026")));
    }
    return (react_1.default.createElement("div", { className: "edt-form-editor" },
        react_1.default.createElement("div", { className: "edt-header" },
            react_1.default.createElement("div", { className: "edt-header__title" }, "\u0420\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0421\u041A\u0414 (MVP)"),
            react_1.default.createElement("div", { className: "edt-header__sub" },
                react_1.default.createElement("span", { title: report.reportPath },
                    "\u041E\u0442\u0447\u0435\u0442: ",
                    report.reportName),
                react_1.default.createElement("span", { className: "edt-header__sep" }, "\u2022"),
                react_1.default.createElement("span", { title: report.templatePath },
                    "\u0428\u0430\u0431\u043B\u043E\u043D: ",
                    report.templateName)),
            react_1.default.createElement("div", { style: { marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' } },
                react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: originalSchema ? 'Сохранить изменения в XML' : 'Исходный XML не загружен', onClick: handleSave, disabled: !originalSchema, style: { width: 'auto', padding: '0 10px' } }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"))),
        react_1.default.createElement("div", { className: "dcs-top-tabs" }, dcsTabs.map((t) => (react_1.default.createElement("button", { key: t.id, type: "button", className: `dcs-top-tab ${dcsTab === t.id ? 'is-active' : ''}`, onClick: () => {
                setDcsTab(t.id);
                // при переключении на разделы с линейным списком — выбираем первый элемент
                if (t.id === 'datasets' && datasets.length > 0) {
                    setSelectedPath(datasets[0].nodePath || datasets[0].key);
                    setSelectedDatasetKey(datasets[0].key);
                    setSelectedFieldKey('');
                }
                if (t.id === 'links' && dataSetLinks.length > 0) {
                    setSelectedPath(dataSetLinks[0].nodePath || dataSetLinks[0].key);
                    setSelectedLinkKey(dataSetLinks[0].key);
                }
                if (t.id === 'calcFields') {
                    if (calculatedFields.length > 0) {
                        setSelectedPath(calculatedFields[0].nodePath || calculatedFields[0].key);
                        setSelectedCalcKey(calculatedFields[0].key);
                    }
                    else {
                        setSelectedCalcKey('');
                        setSelectedPath('');
                    }
                }
                if (t.id === 'resources') {
                    if (resources.length > 0) {
                        setSelectedPath(resources[0].nodePath || resources[0].key);
                        setSelectedResourceKey(resources[0].key);
                    }
                    else {
                        setSelectedResourceKey('');
                        setSelectedPath('');
                    }
                }
                if (t.id === 'parameters' && parameters.length > 0) {
                    setSelectedPath(parameters[0].nodePath || parameters[0].key);
                    setSelectedParameterKey(parameters[0].key);
                }
                if (t.id === 'settings' && settingsVariants.length > 0) {
                    setSelectedPath(settingsVariants[0].nodePath || settingsVariants[0].key);
                }
            } },
            t.label,
            typeof t.count === 'number' ? react_1.default.createElement("span", { className: "dcs-top-tab__count" }, t.count) : null)))),
        react_1.default.createElement("div", { className: "edt-layout edt-top" },
            react_1.default.createElement("div", { className: "edt-pane edt-pane--left" },
                react_1.default.createElement("div", { className: "edt-tabs" },
                    react_1.default.createElement("button", { className: "edt-tab is-active", type: "button" }, leftTitle)),
                react_1.default.createElement("div", { className: "edt-toolbar" },
                    dcsTab === 'datasets' ? (react_1.default.createElement("div", { style: { display: 'flex', gap: 6 } },
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043D\u0430\u0431\u043E\u0440 \u0434\u0430\u043D\u043D\u044B\u0445", onClick: handleAddDataSet }, "+"),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u043D\u0430\u0431\u043E\u0440 \u0434\u0430\u043D\u043D\u044B\u0445", onClick: handleDeleteSelectedDataSet, disabled: !selectedDatasetKey }, "\u00D7"))) : null,
                    dcsTab === 'links' ? (react_1.default.createElement("div", { style: { display: 'flex', gap: 6 } },
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0441\u0432\u044F\u0437\u044C", onClick: handleAddLink }, "+"),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u0443\u044E \u0441\u0432\u044F\u0437\u044C", onClick: handleDeleteSelectedLink, disabled: !selectedLinkKey }, "\u00D7"))) : null,
                    dcsTab === 'calcFields' ? (react_1.default.createElement("div", { style: { display: 'flex', gap: 6 } },
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432\u044B\u0447\u0438\u0441\u043B\u044F\u0435\u043C\u043E\u0435 \u043F\u043E\u043B\u0435", onClick: handleAddCalculatedField }, "+"),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0435 \u0432\u044B\u0447\u0438\u0441\u043B\u044F\u0435\u043C\u043E\u0435 \u043F\u043E\u043B\u0435", onClick: handleDeleteSelectedCalculatedField, disabled: !selectedCalcKey }, "\u00D7"))) : null,
                    dcsTab === 'resources' ? (react_1.default.createElement("div", { style: { display: 'flex', gap: 6 } },
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u0441\u0443\u0440\u0441", onClick: handleAddResource }, "+"),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u0440\u0435\u0441\u0443\u0440\u0441", onClick: handleDeleteSelectedResource, disabled: !selectedResourceKey }, "\u00D7"))) : null,
                    dcsTab === 'parameters' ? (react_1.default.createElement("div", { style: { display: 'flex', gap: 6 } },
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440", onClick: handleAddParameter }, "+"),
                        react_1.default.createElement("button", { type: "button", className: "edt-icon-btn", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440", onClick: handleDeleteSelectedParameter, disabled: !selectedParameterKey }, "\u00D7"))) : null,
                    react_1.default.createElement("input", { className: "edt-search", value: treeQuery, onChange: (e) => setTreeQuery(e.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A\u2026" })),
                react_1.default.createElement("div", { className: "edt-pane__content" },
                    react_1.default.createElement(DcsList, { rows: leftRows.filter((r) => normalizeTextForSearch(r.title + ' ' + (r.subtitle || '')).includes(normalizeTextForSearch(treeQuery))), selectedKey: dcsTab === 'datasets'
                            ? selectedDatasetKey
                            : dcsTab === 'parameters'
                                ? selectedParameterKey
                                : dcsTab === 'links'
                                    ? selectedLinkKey
                                    : selectedPath, onSelect: (key) => {
                            const row = leftRows.find((r) => r.key === key);
                            const p = row?.nodePath || key;
                            onSelectNodePath(p);
                            if (dcsTab === 'datasets') {
                                setSelectedDatasetKey(key);
                                setSelectedFieldKey('');
                            }
                            if (dcsTab === 'links')
                                setSelectedLinkKey(key);
                            if (dcsTab === 'calcFields')
                                setSelectedCalcKey(key);
                            if (dcsTab === 'resources')
                                setSelectedResourceKey(key);
                            if (dcsTab === 'parameters')
                                setSelectedParameterKey(key);
                        } }))),
            react_1.default.createElement("div", { className: "edt-pane edt-pane--right" },
                react_1.default.createElement("div", { className: "edt-toolbar" },
                    react_1.default.createElement("div", { style: { fontSize: 12, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: nodeTitle }, nodeTitle)),
                react_1.default.createElement("div", { className: "edt-pane__content" },
                    react_1.default.createElement("div", { className: "dcs-detailsRoot" }, dcsTab === 'datasets' ? (react_1.default.createElement(DcsDatasetDetails, { node: selectedNode, metadata: metadata, selectedFieldKey: selectedFieldKey, onSelectFieldKey: setSelectedFieldKey, onChangeDataSetQuery: handleChangeDataSetQuery, onUpdateNode: onUpdateNodeAtPath, onOpenQueryEditor: (dataSetPath, queryText) => {
                            setQueryBeingEdited({ dataSetPath, queryText });
                            setIsQueryEditorOpen(true);
                        } })) : dcsTab === 'links' ? (dataSetLinks.length > 0 ? (react_1.default.createElement(DcsLinkDetails, { node: selectedNode, onChangeNodeText: onChangeNodeTextAtPath, onUpdateNode: onUpdateNodeAtPath })) : (react_1.default.createElement("div", { className: "dcs-empty" }, "\u0421\u0432\u044F\u0437\u0438 \u043D\u0430\u0431\u043E\u0440\u043E\u0432 \u0434\u0430\u043D\u043D\u044B\u0445 \u043D\u0435 \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u044B \u0432 \u0441\u0445\u0435\u043C\u0435."))) : dcsTab === 'calcFields' ? (calculatedFields.length > 0 ? (react_1.default.createElement(DcsCalculatedFieldDetails, { node: selectedNode, onUpdateNode: onUpdateCalculatedField })) : (react_1.default.createElement("div", { className: "dcs-empty" }, "\u041D\u0435\u0442 \u0432\u044B\u0447\u0438\u0441\u043B\u044F\u0435\u043C\u044B\u0445 \u043F\u043E\u043B\u0435\u0439."))) : dcsTab === 'resources' ? (resources.length > 0 ? (react_1.default.createElement(DcsResourceDetails, { node: selectedNode, onUpdateNode: onUpdateNodeAtPath })) : (react_1.default.createElement("div", { className: "dcs-empty" }, "\u041D\u0435\u0442 \u0440\u0435\u0441\u0443\u0440\u0441\u043E\u0432 (totalField)."))) : dcsTab === 'parameters' ? (react_1.default.createElement(DcsParameterDetails, { node: selectedNode, onChangeNodeText: onChangeNodeTextAtPath, onUpdateNode: onUpdateNodeAtPath, metadata: metadata })) : dcsTab === 'settings' ? (settingsVariants.length > 0 ? (react_1.default.createElement(DcsSettingsVariantDetails, { node: selectedNode, onUpdateNode: onUpdateNodeAtPath, onUpdateNodeReindex: onUpdateNodeAtPathReindex, schemaChildren: schemaChildren })) : (react_1.default.createElement("div", { className: "dcs-empty" }, "\u041D\u0435\u0442 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A."))) : (react_1.default.createElement("div", { className: "dcs-empty" },
                        "MVP: \u0440\u0430\u0437\u0434\u0435\u043B \u00AB",
                        dcsTabs.find((t) => t.id === dcsTab)?.label,
                        "\u00BB \u0431\u0443\u0434\u0435\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u043C \u0448\u0430\u0433\u043E\u043C.")))))),
        react_1.default.createElement(QueryEditorEnhanced_1.QueryEditorEnhanced, { isOpen: isQueryEditorOpen, queryText: queryBeingEdited.queryText, rightPanel: metadataTree ? (react_1.default.createElement(MetadataTreePanel_1.MetadataTreePanel, { tree: metadataTree })) : (react_1.default.createElement("div", { className: "dcs-metadata-tree-loading" }, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0434\u0435\u0440\u0435\u0432\u0430 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445\u2026")), onSave: (newQuery) => {
                handleChangeDataSetQuery(queryBeingEdited.dataSetPath, newQuery);
                setIsQueryEditorOpen(false);
            }, onCancel: () => setIsQueryEditorOpen(false) })));
};
exports.DcsEditorApp = DcsEditorApp;
//# sourceMappingURL=DcsEditorApp.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataRepository = void 0;
const UniversalMetadataParser_1 = require("./UniversalMetadataParser");
const MetadataScanner_1 = require("./MetadataScanner");
/** Размер батча для параллельного парсинга (баланс скорость/память) */
const BATCH_SIZE = 32;
class MetadataRepository {
    constructor(ttlMs = 30000) {
        this.ttlMs = ttlMs;
        this.cacheByRoot = new Map();
    }
    async load(root) {
        return this.loadInternal(root, undefined);
    }
    /**
     * Прогрессивная загрузка дерева метаданных по типам.
     * После загрузки каждого типа вызывается onTypeLoaded — UI может обновляться по мере готовности.
     * Между типами используется setImmediate для освобождения event loop.
     */
    async loadProgressive(root, onTypeLoaded) {
        return this.loadInternal(root, onTypeLoaded);
    }
    async loadInternal(root, onTypeLoaded) {
        const cached = this.cacheByRoot.get(root);
        const now = Date.now();
        if (cached && now - cached.ts < this.ttlMs) {
            // Кэш есть — при прогрессивной загрузке всё равно вызываем колбэк для каждого типа
            if (onTypeLoaded && cached.tree.children) {
                for (const typeNode of cached.tree.children) {
                    if (typeNode.kind === "type")
                        onTypeLoaded(typeNode);
                }
            }
            return { objects: cached.objects, tree: cached.tree, errors: [] };
        }
        const scan = await (0, MetadataScanner_1.scanMetadataRoot)(root);
        const errors = [...scan.errors];
        // Группируем refs по типу для прогрессивной загрузки
        const refsByType = new Map();
        for (const ref of scan.objects) {
            const t = ref.objectTypeDir;
            const arr = refsByType.get(t) || [];
            arr.push(ref);
            refsByType.set(t, arr);
        }
        const parsed = [];
        const typeNodes = [];
        const sortedTypes = [...refsByType.keys()].sort((a, b) => a.localeCompare(b, "ru"));
        for (const typeDir of sortedTypes) {
            const refs = refsByType.get(typeDir);
            // Парсим объекты этого типа батчами
            for (let i = 0; i < refs.length; i += BATCH_SIZE) {
                const batch = refs.slice(i, i + BATCH_SIZE);
                const results = await Promise.allSettled(batch.map((ref) => (0, UniversalMetadataParser_1.parseMetadataObject)(ref)));
                for (let j = 0; j < results.length; j++) {
                    const r = results[j];
                    const ref = batch[j];
                    if (r.status === "fulfilled") {
                        parsed.push(r.value);
                    }
                    else {
                        errors.push(`Parse failed: ${ref.mainXmlPath}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
                    }
                }
            }
            const typeObjs = parsed.filter((o) => (o.objectTypeDir || o.objectType) === typeDir);
            const typeNode = buildTypeNode(typeDir, typeObjs);
            typeNodes.push(typeNode);
            if (onTypeLoaded) {
                onTypeLoaded(typeNode);
                await yieldToEventLoop();
            }
        }
        const tree = {
            id: "root",
            label: "Configuration",
            kind: "root",
            children: typeNodes,
        };
        this.cacheByRoot.set(root, { objects: parsed, tree, ts: now });
        return { objects: parsed, tree, errors };
    }
}
exports.MetadataRepository = MetadataRepository;
/** Освобождает event loop между тяжёлыми операциями */
function yieldToEventLoop() {
    return new Promise((resolve) => setImmediate(resolve));
}
function buildTypeNode(type, objs) {
    const children = objs
        .slice()
        .sort((a, b) => a.displayName.localeCompare(b.displayName, "ru"))
        .map((o) => buildObjectNode(type, o));
    return {
        id: `type:${type}`,
        label: type,
        kind: "type",
        children,
    };
}
function buildObjectNode(type, o) {
    const root = {
        id: `${type}/${o.name}`,
        label: o.displayName,
        kind: "object",
        object: o
    };
    const groups = [];
    const addGroup = (title, members) => {
        if (!members || members.length === 0)
            return;
        const children = members
            .slice()
            .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ru"))
            .map((m, idx) => ({
            id: `${root.id}/${title}/${m.name || idx}`,
            label: String(m.name || m.kind || idx),
            kind: "member",
            member: m,
            children: buildMemberChildren(root.id, m, o)
        }));
        groups.push({ id: `${root.id}/${title}`, label: title, kind: "group", children });
    };
    addGroup("Attributes", o.attributes);
    addGroup("TabularSections", o.tabularSections);
    addGroup("Forms", o.forms);
    addGroup("Commands", o.commands);
    addGroup("Templates", o.templates);
    addGroup("Predefined", o.predefined);
    // На всякий: если ничего не попало в быстрые группы — покажем все members
    if (groups.length === 0 && o.members?.length) {
        addGroup("Members", o.members);
    }
    if (groups.length)
        root.children = groups;
    return root;
}
function buildMemberChildren(objectId, member, object) {
    // Для табличных частей ищем их атрибуты в object.members
    if (member.kind === "TabularSection" && object?.members && member.name) {
        const tabularSectionPath = ["ChildObjects", "TabularSection", member.name, "ChildObjects", "Attribute"];
        const attributes = object.members.filter((m) => {
            if (m.kind !== "Attribute")
                return false;
            const path = m.path || [];
            // Проверяем, что путь начинается с пути табличной части
            if (path.length < tabularSectionPath.length)
                return false;
            for (let i = 0; i < tabularSectionPath.length; i++) {
                if (path[i] !== tabularSectionPath[i])
                    return false;
            }
            return true;
        });
        if (attributes.length > 0) {
            return attributes.map((attr, idx) => ({
                id: `${objectId}/TabularSection/${member.name}/Attribute/${attr.name || idx}`,
                label: String(attr.name || attr.kind || idx),
                kind: "member",
                member: attr
            }));
        }
    }
    // Существующая логика для других случаев
    // Если в member.path уже есть иерархия — попробуем отобразить её как цепочку узлов.
    // Это полезно для колонок табличных частей и вложенных объектов.
    const p = member?.path;
    if (!p || p.length < 4)
        return undefined; // минимально: [ChildObjects, Kind, Name]
    // Свернем путь в 1-2 уровня, чтобы дерево не стало гигантским.
    // Например: ChildObjects/TabularSection/Товары/ChildObjects/Attribute/Номенклатура
    const tail = p.slice(1); // без ведущего ChildObjects
    const chunks = [];
    for (let i = 0; i < tail.length; i += 2) {
        const kind = tail[i];
        const name = tail[i + 1];
        if (!kind || !name)
            break;
        chunks.push(`${kind}: ${name}`);
        if (chunks.length >= 3)
            break;
    }
    if (chunks.length <= 1)
        return undefined;
    return chunks.slice(1).map((label, idx) => ({
        id: `${objectId}/path/${idx}/${label}`,
        label,
        kind: "member"
    }));
}
//# sourceMappingURL=MetadataRepository.js.map
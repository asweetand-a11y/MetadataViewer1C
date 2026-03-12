"use strict";
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
exports.MetadataCache = exports.TREE_CACHE_VERSION = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
// Вспомогательная функция для условного логирования в MetadataCache
function debugLog(message, outputChannel) {
    const config = vscode.workspace.getConfiguration();
    const debugMode = config.get('metadataViewer.debugMode', false);
    if (debugMode) {
        console.log(message);
        if (outputChannel) {
            outputChannel.appendLine(message);
        }
    }
}
function debugWarn(message, outputChannel) {
    const config = vscode.workspace.getConfiguration();
    const debugMode = config.get('metadataViewer.debugMode', false);
    if (debugMode) {
        console.warn(message);
        if (outputChannel) {
            outputChannel.appendLine(message);
        }
    }
}
/**
 * Версия структуры дерева метаданных
 * Изменение версии инвалидирует весь кэш
 */
exports.TREE_CACHE_VERSION = 'tree-cache-v2-fix-parentId';
/**
 * Multi-layer cache:
 *  - L1: in-memory per running session
 *  - L2: workspaceState (small metadata + pointer)
 *  - L3: on-disk JSON in globalStorageUri
 */
class MetadataCache {
    constructor(ctx, outputChannel) {
        this.l1 = new Map();
        this.ctx = ctx;
        this.storageDir = ctx.globalStorageUri.fsPath;
        this.extVersion = String(ctx.extension?.packageJSON?.version || '0');
        this.outputChannel = outputChannel;
        if (!fs.existsSync(this.storageDir))
            fs.mkdirSync(this.storageDir, { recursive: true });
    }
    async computeFingerprint(configRoot, configType) {
        // Fast & stable enough: size+mtime of key files + extension version + tree structure version.
        // Включение версии структуры дерева обеспечивает автоматическую инвалидацию кэша при изменении структуры.
        const keyFiles = configType === 'xml'
            ? ['ConfigDumpInfo.xml', 'Configuration.xml']
            : [path.join('Configuration', 'Configuration.mdo')];
        const treeStructureVersion = exports.TREE_CACHE_VERSION;
        const parts = [this.extVersion, configType, treeStructureVersion];
        for (const rel of keyFiles) {
            const p = path.join(configRoot, rel);
            try {
                const st = fs.statSync(p);
                parts.push(rel, String(st.size), String(st.mtimeMs));
            }
            catch {
                parts.push(rel, 'missing');
            }
        }
        return crypto.createHash('sha1').update(parts.join('|')).digest('hex');
    }
    key(configRoot) {
        return crypto.createHash('sha1').update(configRoot).digest('hex');
    }
    l3Path(configRoot) {
        return path.join(this.storageDir, `metadata-tree-${this.key(configRoot)}.json`);
    }
    getL1(configRoot) {
        return this.l1.get(configRoot);
    }
    setL1(configRoot, env) {
        this.l1.set(configRoot, env);
    }
    /**
     * Инвалидация кэша для одной конфигурации (L1, L2, L3).
     * Используется при локальном изменении XML-объектов, чтобы при следующем
     * раскрытии конфигурации дерево пересобралось заново.
     */
    async invalidate(configRoot) {
        const k = `metadataViewer.cache.${this.key(configRoot)}`;
        const l3file = this.l3Path(configRoot);
        // L1
        this.l1.delete(configRoot);
        // L2
        await this.ctx.workspaceState.update(k, undefined);
        // L3
        try {
            if (fs.existsSync(l3file)) {
                fs.unlinkSync(l3file);
                debugLog(`[MetadataCache.invalidate] Удален L3 кэш: ${l3file}`, this.outputChannel);
            }
        }
        catch (e) {
            const errorMsg = `[MetadataCache.invalidate] Ошибка при удалении L3 кэша: ${e}`;
            console.warn(errorMsg);
            if (this.outputChannel) {
                this.outputChannel.appendLine(errorMsg);
            }
        }
    }
    async read(configRoot) {
        const k = `metadataViewer.cache.${this.key(configRoot)}`;
        // L1
        const l1 = this.l1.get(configRoot);
        if (l1) {
            debugLog(`[MetadataCache.read] L1 кэш найден для ${configRoot}, версия: ${l1.version}`, this.outputChannel);
            return l1;
        }
        // L2 pointer
        const l2 = this.ctx.workspaceState.get(k);
        const l3file = l2?.l3 || this.l3Path(configRoot);
        // L3
        try {
            if (!fs.existsSync(l3file)) {
                debugLog(`[MetadataCache.read] L3 файл не найден: ${l3file}`, this.outputChannel);
                return undefined;
            }
            const raw = fs.readFileSync(l3file, 'utf8');
            const env = JSON.parse(raw);
            // Проверка версии кэша при чтении из L3
            if (env.version !== exports.TREE_CACHE_VERSION) {
                debugWarn(`[MetadataCache.read] Неверная версия кэша: ${env.version}, ожидается: ${exports.TREE_CACHE_VERSION}. Кэш будет проигнорирован.`, this.outputChannel);
                return undefined;
            }
            // Проверка наличия детей в дереве
            if (!env.root?.children || env.root.children.length === 0) {
                debugWarn(`[MetadataCache.read] Кэш содержит пустое дерево (0 детей). Кэш будет проигнорирован.`, this.outputChannel);
                return undefined;
            }
            debugLog(`[MetadataCache.read] L3 кэш загружен для ${configRoot}, версия: ${env.version}, детей: ${env.root.children.length}`, this.outputChannel);
            // keep in L1
            this.l1.set(configRoot, env);
            return env;
        }
        catch (e) {
            // Ошибки всегда логируем
            const errorMsg = `[MetadataCache.read] Ошибка при чтении L3 кэша: ${e}`;
            console.error(errorMsg);
            if (this.outputChannel) {
                this.outputChannel.appendLine(errorMsg);
            }
            return undefined;
        }
    }
    async write(configRoot, env) {
        const k = `metadataViewer.cache.${this.key(configRoot)}`;
        const l3file = this.l3Path(configRoot);
        // Валидация перед сохранением: не сохраняем пустые деревья
        if (!env.root?.children || env.root.children.length === 0) {
            debugWarn(`[MetadataCache.write] Пропуск сохранения в кэш: дерево пустое (0 детей) для ${configRoot}`, this.outputChannel);
            return;
        }
        // Проверка версии
        if (env.version !== exports.TREE_CACHE_VERSION) {
            debugWarn(`[MetadataCache.write] Неверная версия кэша: ${env.version}, ожидается: ${exports.TREE_CACHE_VERSION}`, this.outputChannel);
        }
        try {
            fs.writeFileSync(l3file, JSON.stringify(env), 'utf8');
            await this.ctx.workspaceState.update(k, { fingerprint: env.fingerprint, l3: l3file, builtAt: env.builtAt });
            this.l1.set(configRoot, env);
            debugLog(`[MetadataCache.write] Кэш сохранен для ${configRoot}, версия: ${env.version}, детей: ${env.root.children.length}`, this.outputChannel);
        }
        catch (e) {
            // Ошибки всегда логируем
            const errorMsg = `[MetadataCache.write] Ошибка при сохранении кэша: ${e}`;
            console.warn(errorMsg);
            if (this.outputChannel) {
                this.outputChannel.appendLine(errorMsg);
            }
        }
    }
    /**
     * Полная инвалидация всего кэша (для всех конфигураций).
     */
    async invalidateAll() {
        // Очистка L1
        this.l1.clear();
        // Очистка L2/L3 по маске файлов
        try {
            const files = fs.readdirSync(this.storageDir);
            for (const f of files) {
                if (f.startsWith('metadata-tree-') && f.endsWith('.json')) {
                    const fullPath = path.join(this.storageDir, f);
                    try {
                        fs.unlinkSync(fullPath);
                        debugLog(`[MetadataCache.invalidateAll] Удален L3 кэш: ${fullPath}`, this.outputChannel);
                    }
                    catch (e) {
                        const errorMsg = `[MetadataCache.invalidateAll] Ошибка при удалении ${fullPath}: ${e}`;
                        console.warn(errorMsg);
                        if (this.outputChannel) {
                            this.outputChannel.appendLine(errorMsg);
                        }
                    }
                }
            }
            // Сбрасываем workspaceState по префиксу ключа
            const allKeys = this.ctx.workspaceState.keys
                ? this.ctx.workspaceState.keys()
                : [];
            for (const key of allKeys) {
                if (key.startsWith('metadataViewer.cache.')) {
                    await this.ctx.workspaceState.update(key, undefined);
                }
            }
        }
        catch (e) {
            const errorMsg = `[MetadataCache.invalidateAll] Общая ошибка при очистке кэша: ${e}`;
            console.warn(errorMsg);
            if (this.outputChannel) {
                this.outputChannel.appendLine(errorMsg);
            }
        }
    }
}
exports.MetadataCache = MetadataCache;
//# sourceMappingURL=MetadataCache.js.map
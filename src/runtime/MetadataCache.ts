import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { TreeCacheEnvelope } from './types';

// Вспомогательная функция для условного логирования в MetadataCache
function debugLog(message: string, outputChannel?: vscode.OutputChannel) {
  const config = vscode.workspace.getConfiguration();
  const debugMode = config.get<boolean>('metadataViewer.debugMode', false);
  if (debugMode) {
    console.log(message);
    if (outputChannel) {
      outputChannel.appendLine(message);
    }
  }
}

function debugWarn(message: string, outputChannel?: vscode.OutputChannel) {
  const config = vscode.workspace.getConfiguration();
  const debugMode = config.get<boolean>('metadataViewer.debugMode', false);
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
export const TREE_CACHE_VERSION = 'tree-cache-v2-fix-parentId';

/**
 * Multi-layer cache:
 *  - L1: in-memory per running session
 *  - L2: workspaceState (small metadata + pointer)
 *  - L3: on-disk JSON in globalStorageUri
 */
export class MetadataCache {
  private readonly ctx: vscode.ExtensionContext;
  private readonly l1 = new Map<string, TreeCacheEnvelope>();
  private readonly storageDir: string;
  private readonly extVersion: string;
  private readonly outputChannel?: vscode.OutputChannel;

  constructor(ctx: vscode.ExtensionContext, outputChannel?: vscode.OutputChannel) {
    this.ctx = ctx;
    this.storageDir = ctx.globalStorageUri.fsPath;
    this.extVersion = String((ctx.extension?.packageJSON as any)?.version || '0');
    this.outputChannel = outputChannel;
    if (!fs.existsSync(this.storageDir)) fs.mkdirSync(this.storageDir, { recursive: true });
  }

  public async computeFingerprint(configRoot: string, configType: 'xml' | 'edt'): Promise<string> {
    // Fast & stable enough: size+mtime of key files + extension version + tree structure version.
    // Включение версии структуры дерева обеспечивает автоматическую инвалидацию кэша при изменении структуры.
    const keyFiles = configType === 'xml'
      ? ['ConfigDumpInfo.xml', 'Configuration.xml']
      : [path.join('Configuration', 'Configuration.mdo')];

    const treeStructureVersion = TREE_CACHE_VERSION;
    const parts: string[] = [this.extVersion, configType, treeStructureVersion];
    for (const rel of keyFiles) {
      const p = path.join(configRoot, rel);
      try {
        const st = fs.statSync(p);
        parts.push(rel, String(st.size), String(st.mtimeMs));
      } catch {
        parts.push(rel, 'missing');
      }
    }
    return crypto.createHash('sha1').update(parts.join('|')).digest('hex');
  }

  private key(configRoot: string): string {
    return crypto.createHash('sha1').update(configRoot).digest('hex');
  }

  private l3Path(configRoot: string): string {
    return path.join(this.storageDir, `metadata-tree-${this.key(configRoot)}.json`);
  }

  public getL1(configRoot: string): TreeCacheEnvelope | undefined {
    return this.l1.get(configRoot);
  }

  public setL1(configRoot: string, env: TreeCacheEnvelope) {
    this.l1.set(configRoot, env);
  }

  /**
   * Инвалидация кэша для одной конфигурации (L1, L2, L3).
   * Используется при локальном изменении XML-объектов, чтобы при следующем
   * раскрытии конфигурации дерево пересобралось заново.
   */
  public async invalidate(configRoot: string): Promise<void> {
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
    } catch (e) {
      const errorMsg = `[MetadataCache.invalidate] Ошибка при удалении L3 кэша: ${e}`;
      console.warn(errorMsg);
      if (this.outputChannel) {
        this.outputChannel.appendLine(errorMsg);
      }
    }
  }

  public async read(configRoot: string): Promise<TreeCacheEnvelope | undefined> {
    const k = `metadataViewer.cache.${this.key(configRoot)}`;

    // L1
    const l1 = this.l1.get(configRoot);
    if (l1) {
      debugLog(`[MetadataCache.read] L1 кэш найден для ${configRoot}, версия: ${l1.version}`, this.outputChannel);
      return l1;
    }

    // L2 pointer
    const l2 = this.ctx.workspaceState.get<{ fingerprint: string; l3: string; builtAt: number }>(k);
    const l3file = l2?.l3 || this.l3Path(configRoot);

    // L3
    try {
      if (!fs.existsSync(l3file)) {
        debugLog(`[MetadataCache.read] L3 файл не найден: ${l3file}`, this.outputChannel);
        return undefined;
      }
      const raw = fs.readFileSync(l3file, 'utf8');
      const env = JSON.parse(raw) as TreeCacheEnvelope;
      
      // Проверка версии кэша при чтении из L3
      if (env.version !== TREE_CACHE_VERSION) {
        debugWarn(`[MetadataCache.read] Неверная версия кэша: ${env.version}, ожидается: ${TREE_CACHE_VERSION}. Кэш будет проигнорирован.`, this.outputChannel);
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
    } catch (e) {
      // Ошибки всегда логируем
      const errorMsg = `[MetadataCache.read] Ошибка при чтении L3 кэша: ${e}`;
      console.error(errorMsg);
      if (this.outputChannel) {
        this.outputChannel.appendLine(errorMsg);
      }
      return undefined;
    }
  }

  public async write(configRoot: string, env: TreeCacheEnvelope): Promise<void> {
    const k = `metadataViewer.cache.${this.key(configRoot)}`;
    const l3file = this.l3Path(configRoot);
    
    // Валидация перед сохранением: не сохраняем пустые деревья
    if (!env.root?.children || env.root.children.length === 0) {
      debugWarn(`[MetadataCache.write] Пропуск сохранения в кэш: дерево пустое (0 детей) для ${configRoot}`, this.outputChannel);
      return;
    }
    
    // Проверка версии
    if (env.version !== TREE_CACHE_VERSION) {
      debugWarn(`[MetadataCache.write] Неверная версия кэша: ${env.version}, ожидается: ${TREE_CACHE_VERSION}`, this.outputChannel);
    }
    
    try {
      fs.writeFileSync(l3file, JSON.stringify(env), 'utf8');
      await this.ctx.workspaceState.update(k, { fingerprint: env.fingerprint, l3: l3file, builtAt: env.builtAt });
      this.l1.set(configRoot, env);
      debugLog(`[MetadataCache.write] Кэш сохранен для ${configRoot}, версия: ${env.version}, детей: ${env.root.children.length}`, this.outputChannel);
    } catch (e) {
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
  public async invalidateAll(): Promise<void> {
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
          } catch (e) {
            const errorMsg = `[MetadataCache.invalidateAll] Ошибка при удалении ${fullPath}: ${e}`;
            console.warn(errorMsg);
            if (this.outputChannel) {
              this.outputChannel.appendLine(errorMsg);
            }
          }
        }
      }

      // Сбрасываем workspaceState по префиксу ключа
      const allKeys = (this.ctx.workspaceState as any).keys
        ? (this.ctx.workspaceState as any).keys() as string[]
        : [];
      for (const key of allKeys) {
        if (key.startsWith('metadataViewer.cache.')) {
          await this.ctx.workspaceState.update(key, undefined);
        }
      }
    } catch (e) {
      const errorMsg = `[MetadataCache.invalidateAll] Общая ошибка при очистке кэша: ${e}`;
      console.warn(errorMsg);
      if (this.outputChannel) {
        this.outputChannel.appendLine(errorMsg);
      }
    }
  }
}


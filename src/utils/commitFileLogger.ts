/**
 * Утилита для логирования измененных файлов в commit_devtools.txt
 * 
 * Формат файла:
 * - Одно имя файла на строку (полный абсолютный путь в Windows формате)
 * - Пример: d:\1C\RZDZUP\src\cf\Catalogs\ibs_ВариантыОтчетовДляКонсолидации.xml
 * - Кодировка UTF-8
 * - Разделитель: перевод строки (Windows \r\n)
 * - Строки, начинающиеся с REM, пропускаются (комментарии)
 * - Пустые строки не поддерживаются
 * - Дубликаты автоматически фильтруются
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { outputChannel, statusBarProgress } from '../extension';

const COMMIT_FILE_PATH_SETTING = 'metadataViewer.commitFilePath';
const DEFAULT_COMMIT_FILE_PATH = '${workspaceFolder}\\build\\commit_devtools\\commit_devtools.txt';
const LEGACY_COMMIT_FILE_PATHS = new Set([
  '${workspacefolder}\\build\\commit\\commit.txt',
  '${workspacefolder}\\build\\commit.txt',
  '${workspacefolder}\\commit_devtools\\commit_devtools.txt',
]);

function isLegacyCommitFilePath(value: string): boolean {
  const normalized = value.trim().replace(/\//g, '\\').toLowerCase();
  return LEGACY_COMMIT_FILE_PATHS.has(normalized);
}

/**
 * Заменяет сохранённый старый путь build\\commit\\commit.txt на текущий путь по умолчанию.
 * Явно заданный другой путь не трогает.
 */
export async function migrateLegacyCommitFilePath(): Promise<void> {
  const config = vscode.workspace.getConfiguration();
  const inspected = config.inspect<string>(COMMIT_FILE_PATH_SETTING);
  if (!inspected) return;
  const targets: Array<[string | undefined, vscode.ConfigurationTarget]> = [
    [inspected.globalValue, vscode.ConfigurationTarget.Global],
    [inspected.workspaceValue, vscode.ConfigurationTarget.Workspace],
    [inspected.workspaceFolderValue, vscode.ConfigurationTarget.WorkspaceFolder],
  ];
  await Promise.all(targets.map(async ([value, target]) => {
    if (!value || !isLegacyCommitFilePath(value)) return;
    await config.update(COMMIT_FILE_PATH_SETTING, DEFAULT_COMMIT_FILE_PATH, target);
    outputChannel.appendLine(`[CommitFileLogger] Путь обновлён: ${value} -> ${DEFAULT_COMMIT_FILE_PATH}`);
  }));
}

export class CommitFileLogger {
  private static instance: CommitFileLogger | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static getInstance(): CommitFileLogger {
    if (!CommitFileLogger.instance) {
      CommitFileLogger.instance = new CommitFileLogger();
    }
    return CommitFileLogger.instance;
  }

  /**
   * Публично: разрешённый путь к commit_devtools.txt или null, если не настроено / нет workspace.
   */
  public getResolvedCommitFilePath(): string | null {
    return this.getCommitFilePath();
  }

  /**
   * Прочитать все пути из commit_devtools.txt (нормализованные, без дубликатов, в порядке появления).
   */
  public getLoggedPaths(): string[] {
    const commitFilePath = this.getCommitFilePath();
    if (!commitFilePath || !fs.existsSync(commitFilePath)) {
      return [];
    }
    const seen = new Set<string>();
    const ordered: string[] = [];
    try {
      const content = fs.readFileSync(commitFilePath, 'utf-8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('REM')) {
          continue;
        }
        const normalized = this.normalizePath(trimmed);
        if (!seen.has(normalized)) {
          seen.add(normalized);
          ordered.push(normalized);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[CommitFileLogger] Ошибка чтения commit_devtools.txt: ${msg}`);
    }
    return ordered;
  }

  /**
   * Каталог рабочей области, в которой лежит изменённый файл.
   * Если файл вне всех корней, берётся первая корневая папка.
   */
  private workspaceFolderFor(changedFilePath?: string): string | null {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return null;
    }
    if (changedFilePath) {
      const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(changedFilePath));
      if (folder) {
        return folder.uri.fsPath;
      }
    }
    return folders[0].uri.fsPath;
  }

  /**
   * Путь к commit_devtools.txt. Пустая настройка заменяется путём по умолчанию.
   */
  private getCommitFilePath(changedFilePath?: string): string | null {
    const config = vscode.workspace.getConfiguration();
    const configured = config.get<string>(COMMIT_FILE_PATH_SETTING, '').trim();
    const commitPath = configured || DEFAULT_COMMIT_FILE_PATH;
    const workspaceFolder = this.workspaceFolderFor(changedFilePath);
    if (!workspaceFolder) {
      return null;
    }
    return commitPath.replace(/\$\{workspaceFolder\}/g, workspaceFolder);
  }

  /**
   * Нормализовать путь к файлу (привести к абсолютному виду с обратными слешами)
   * @param filePath Путь к файлу (может быть относительным или абсолютным)
   * @returns Абсолютный путь в Windows формате (d:\path\to\file.xml)
   */
  private normalizePath(filePath: string): string {
    // Преобразуем в абсолютный путь, если это относительный
    let absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    
    // Нормализуем и заменяем прямые слеши на обратные (Windows формат)
    absolutePath = path.normalize(absolutePath).replace(/\//g, '\\');
    
    return absolutePath;
  }

  /**
   * Прочитать существующие записи из commit_devtools.txt
   */
  private readExistingEntries(commitFilePath: string): Set<string> {
    const entries = new Set<string>();

    if (!fs.existsSync(commitFilePath)) {
      return entries;
    }

    try {
      const content = fs.readFileSync(commitFilePath, 'utf-8');
      const lines = content.split(/\r?\n/);

      for (const line of lines) {
        const trimmed = line.trim();
        // Пропускаем пустые строки и комментарии
        if (trimmed && !trimmed.startsWith('REM')) {
          entries.add(this.normalizePath(trimmed));
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[CommitFileLogger] Ошибка чтения commit_devtools.txt: ${msg}`);
    }

    return entries;
  }

  /**
   * Записать файл в commit_devtools.txt
   * @param filePath Абсолютный путь к измененному файлу
   */
  public logChangedFile(filePath: string): void {
    const config = vscode.workspace.getConfiguration();
    const debugMode = config.get<boolean>('metadataViewer.debugMode', false);

    const commitFilePath = this.getCommitFilePath(filePath);
    if (!commitFilePath) {
      outputChannel.appendLine('[CommitFileLogger] Нет корневой папки рабочей области, commit_devtools.txt не записан');
      return;
    }

    try {
      const normalizedPath = this.normalizePath(filePath);

      // Читаем существующие записи
      const existingEntries = this.readExistingEntries(commitFilePath);

      // Проверяем, есть ли уже такая запись
      if (existingEntries.has(normalizedPath)) {
        if (debugMode) {
          outputChannel.appendLine(`[CommitFileLogger] Файл уже в списке: ${normalizedPath}`);
        }
        return;
      }

      // Создаем директорию, если не существует
      const commitDir = path.dirname(commitFilePath);
      if (!fs.existsSync(commitDir)) {
        fs.mkdirSync(commitDir, { recursive: true });
      }

      // Добавляем запись в файл
      fs.appendFileSync(commitFilePath, normalizedPath + '\r\n', 'utf-8');
      outputChannel.appendLine(`[CommitFileLogger] ${normalizedPath} -> ${commitFilePath}`);

      if (debugMode) {
        outputChannel.appendLine(`[CommitFileLogger] Добавлен файл: ${normalizedPath}`);
      }
      statusBarProgress.text = '$(check) Добавлено в commit_devtools.txt';
      statusBarProgress.show();
      setTimeout(() => statusBarProgress.hide(), 2500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[CommitFileLogger] Ошибка записи в commit_devtools.txt: ${msg}`);
      vscode.window.showWarningMessage(`Не удалось записать в commit_devtools.txt: ${msg}`);
    }
  }

  /**
   * Записать несколько файлов в commit_devtools.txt
   * @param filePaths Массив абсолютных путей к измененным файлам
   */
  public logChangedFiles(filePaths: string[]): void {
    const config = vscode.workspace.getConfiguration();
    const debugMode = config.get<boolean>('metadataViewer.debugMode', false);

    const commitFilePath = this.getCommitFilePath(filePaths[0]);
    if (!commitFilePath) {
      outputChannel.appendLine('[CommitFileLogger] Нет корневой папки рабочей области, commit_devtools.txt не записан');
      return;
    }

    try {
      // Читаем существующие записи
      const existingEntries = this.readExistingEntries(commitFilePath);

      // Нормализуем и фильтруем новые пути
      const newPaths: string[] = [];
      for (const filePath of filePaths) {
        const normalizedPath = this.normalizePath(filePath);
        if (!existingEntries.has(normalizedPath)) {
          newPaths.push(normalizedPath);
        }
      }

      if (newPaths.length === 0) {
        if (debugMode) {
          outputChannel.appendLine('[CommitFileLogger] Все файлы уже в списке');
        }
        return;
      }

      // Создаем директорию, если не существует
      const commitDir = path.dirname(commitFilePath);
      if (!fs.existsSync(commitDir)) {
        fs.mkdirSync(commitDir, { recursive: true });
      }

      // Добавляем записи в файл
      const content = newPaths.join('\r\n') + '\r\n';
      fs.appendFileSync(commitFilePath, content, 'utf-8');

      if (debugMode) {
        outputChannel.appendLine(`[CommitFileLogger] Добавлено файлов: ${newPaths.length}`);
        newPaths.forEach(p => outputChannel.appendLine(`  - ${p}`));
      }
      statusBarProgress.text = '$(check) Добавлено в commit_devtools.txt';
      statusBarProgress.show();
      setTimeout(() => statusBarProgress.hide(), 2500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[CommitFileLogger] Ошибка записи в commit_devtools.txt: ${msg}`);
      vscode.window.showWarningMessage(`Не удалось записать в commit_devtools.txt: ${msg}`);
    }
  }

  /**
   * Очистить содержимое файла commit_devtools.txt
   */
  public clearCommitFile(): void {
    const config = vscode.workspace.getConfiguration();
    const debugMode = config.get<boolean>('metadataViewer.debugMode', false);

    const commitFilePath = this.getCommitFilePath();
    if (!commitFilePath) {
      if (debugMode) {
        outputChannel.appendLine('[CommitFileLogger] Путь к commit_devtools.txt не настроен, очистка не требуется');
      }
      return;
    }

    try {
      if (fs.existsSync(commitFilePath)) {
        // Очищаем файл, записывая пустую строку
        fs.writeFileSync(commitFilePath, '', 'utf-8');
        if (debugMode) {
          outputChannel.appendLine(`[CommitFileLogger] Файл commit_devtools.txt очищен: ${commitFilePath}`);
        }
      } else {
        if (debugMode) {
          outputChannel.appendLine(`[CommitFileLogger] Файл commit_devtools.txt не существует, очистка не требуется: ${commitFilePath}`);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[CommitFileLogger] Ошибка очистки commit_devtools.txt: ${msg}`);
      // Не показываем ошибку пользователю при деактивации, только логируем
    }
  }
}

/**
 * Утилита для логирования измененных файлов в Commit.txt
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
   * Публично: разрешённый путь к Commit.txt или null, если не настроено / нет workspace.
   */
  public getResolvedCommitFilePath(): string | null {
    return this.getCommitFilePath();
  }

  /**
   * Прочитать все пути из Commit.txt (нормализованные, без дубликатов, в порядке появления).
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
      outputChannel.appendLine(`[CommitFileLogger] Ошибка чтения Commit.txt: ${msg}`);
    }
    return ordered;
  }

  /**
   * Получить путь к файлу Commit.txt из настроек
   */
  private getCommitFilePath(): string | null {
    const config = vscode.workspace.getConfiguration();
    const commitPath = config.get<string>('metadataViewer.commitFilePath', '');
    
    if (!commitPath) {
      return null;
    }

    // Заменяем переменную ${workspaceFolder} на реальный путь
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return null;
    }

    const resolvedPath = commitPath.replace(/\$\{workspaceFolder\}/g, workspaceFolder);
    return resolvedPath;
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
   * Прочитать существующие записи из Commit.txt
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
      outputChannel.appendLine(`[CommitFileLogger] Ошибка чтения Commit.txt: ${msg}`);
    }

    return entries;
  }

  /**
   * Записать файл в Commit.txt
   * @param filePath Абсолютный путь к измененному файлу
   */
  public logChangedFile(filePath: string): void {
    const config = vscode.workspace.getConfiguration();
    const debugMode = config.get<boolean>('metadataViewer.debugMode', false);

    const commitFilePath = this.getCommitFilePath();
    if (!commitFilePath) {
      if (debugMode) {
        outputChannel.appendLine('[CommitFileLogger] Путь к Commit.txt не настроен');
      }
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

      if (debugMode) {
        outputChannel.appendLine(`[CommitFileLogger] Добавлен файл: ${normalizedPath}`);
      }
      statusBarProgress.text = '$(check) Добавлено в Commit.txt';
      statusBarProgress.show();
      setTimeout(() => statusBarProgress.hide(), 2500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[CommitFileLogger] Ошибка записи в Commit.txt: ${msg}`);
      vscode.window.showWarningMessage(`Не удалось записать в Commit.txt: ${msg}`);
    }
  }

  /**
   * Записать несколько файлов в Commit.txt
   * @param filePaths Массив абсолютных путей к измененным файлам
   */
  public logChangedFiles(filePaths: string[]): void {
    const config = vscode.workspace.getConfiguration();
    const debugMode = config.get<boolean>('metadataViewer.debugMode', false);

    const commitFilePath = this.getCommitFilePath();
    if (!commitFilePath) {
      if (debugMode) {
        outputChannel.appendLine('[CommitFileLogger] Путь к Commit.txt не настроен');
      }
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
      statusBarProgress.text = '$(check) Добавлено в Commit.txt';
      statusBarProgress.show();
      setTimeout(() => statusBarProgress.hide(), 2500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[CommitFileLogger] Ошибка записи в Commit.txt: ${msg}`);
      vscode.window.showWarningMessage(`Не удалось записать в Commit.txt: ${msg}`);
    }
  }

  /**
   * Очистить содержимое файла Commit.txt
   */
  public clearCommitFile(): void {
    const config = vscode.workspace.getConfiguration();
    const debugMode = config.get<boolean>('metadataViewer.debugMode', false);

    const commitFilePath = this.getCommitFilePath();
    if (!commitFilePath) {
      if (debugMode) {
        outputChannel.appendLine('[CommitFileLogger] Путь к Commit.txt не настроен, очистка не требуется');
      }
      return;
    }

    try {
      if (fs.existsSync(commitFilePath)) {
        // Очищаем файл, записывая пустую строку
        fs.writeFileSync(commitFilePath, '', 'utf-8');
        if (debugMode) {
          outputChannel.appendLine(`[CommitFileLogger] Файл Commit.txt очищен: ${commitFilePath}`);
        }
      } else {
        if (debugMode) {
          outputChannel.appendLine(`[CommitFileLogger] Файл Commit.txt не существует, очистка не требуется: ${commitFilePath}`);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[CommitFileLogger] Ошибка очистки Commit.txt: ${msg}`);
      // Не показываем ошибку пользователю при деактивации, только логируем
    }
  }
}

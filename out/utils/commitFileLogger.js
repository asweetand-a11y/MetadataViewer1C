"use strict";
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
exports.CommitFileLogger = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const extension_1 = require("../extension");
class CommitFileLogger {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() { }
    static getInstance() {
        if (!CommitFileLogger.instance) {
            CommitFileLogger.instance = new CommitFileLogger();
        }
        return CommitFileLogger.instance;
    }
    /**
     * Публично: разрешённый путь к Commit.txt или null, если не настроено / нет workspace.
     */
    getResolvedCommitFilePath() {
        return this.getCommitFilePath();
    }
    /**
     * Прочитать все пути из Commit.txt (нормализованные, без дубликатов, в порядке появления).
     */
    getLoggedPaths() {
        const commitFilePath = this.getCommitFilePath();
        if (!commitFilePath || !fs.existsSync(commitFilePath)) {
            return [];
        }
        const seen = new Set();
        const ordered = [];
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
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            extension_1.outputChannel.appendLine(`[CommitFileLogger] Ошибка чтения Commit.txt: ${msg}`);
        }
        return ordered;
    }
    /**
     * Получить путь к файлу Commit.txt из настроек
     */
    getCommitFilePath() {
        const config = vscode.workspace.getConfiguration();
        const commitPath = config.get('metadataViewer.commitFilePath', '');
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
    normalizePath(filePath) {
        // Преобразуем в абсолютный путь, если это относительный
        let absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
        // Нормализуем и заменяем прямые слеши на обратные (Windows формат)
        absolutePath = path.normalize(absolutePath).replace(/\//g, '\\');
        return absolutePath;
    }
    /**
     * Прочитать существующие записи из Commit.txt
     */
    readExistingEntries(commitFilePath) {
        const entries = new Set();
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
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            extension_1.outputChannel.appendLine(`[CommitFileLogger] Ошибка чтения Commit.txt: ${msg}`);
        }
        return entries;
    }
    /**
     * Записать файл в Commit.txt
     * @param filePath Абсолютный путь к измененному файлу
     */
    logChangedFile(filePath) {
        const config = vscode.workspace.getConfiguration();
        const debugMode = config.get('metadataViewer.debugMode', false);
        const commitFilePath = this.getCommitFilePath();
        if (!commitFilePath) {
            if (debugMode) {
                extension_1.outputChannel.appendLine('[CommitFileLogger] Путь к Commit.txt не настроен');
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
                    extension_1.outputChannel.appendLine(`[CommitFileLogger] Файл уже в списке: ${normalizedPath}`);
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
                extension_1.outputChannel.appendLine(`[CommitFileLogger] Добавлен файл: ${normalizedPath}`);
            }
            extension_1.statusBarProgress.text = '$(check) Добавлено в Commit.txt';
            extension_1.statusBarProgress.show();
            setTimeout(() => extension_1.statusBarProgress.hide(), 2500);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            extension_1.outputChannel.appendLine(`[CommitFileLogger] Ошибка записи в Commit.txt: ${msg}`);
            vscode.window.showWarningMessage(`Не удалось записать в Commit.txt: ${msg}`);
        }
    }
    /**
     * Записать несколько файлов в Commit.txt
     * @param filePaths Массив абсолютных путей к измененным файлам
     */
    logChangedFiles(filePaths) {
        const config = vscode.workspace.getConfiguration();
        const debugMode = config.get('metadataViewer.debugMode', false);
        const commitFilePath = this.getCommitFilePath();
        if (!commitFilePath) {
            if (debugMode) {
                extension_1.outputChannel.appendLine('[CommitFileLogger] Путь к Commit.txt не настроен');
            }
            return;
        }
        try {
            // Читаем существующие записи
            const existingEntries = this.readExistingEntries(commitFilePath);
            // Нормализуем и фильтруем новые пути
            const newPaths = [];
            for (const filePath of filePaths) {
                const normalizedPath = this.normalizePath(filePath);
                if (!existingEntries.has(normalizedPath)) {
                    newPaths.push(normalizedPath);
                }
            }
            if (newPaths.length === 0) {
                if (debugMode) {
                    extension_1.outputChannel.appendLine('[CommitFileLogger] Все файлы уже в списке');
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
                extension_1.outputChannel.appendLine(`[CommitFileLogger] Добавлено файлов: ${newPaths.length}`);
                newPaths.forEach(p => extension_1.outputChannel.appendLine(`  - ${p}`));
            }
            extension_1.statusBarProgress.text = '$(check) Добавлено в Commit.txt';
            extension_1.statusBarProgress.show();
            setTimeout(() => extension_1.statusBarProgress.hide(), 2500);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            extension_1.outputChannel.appendLine(`[CommitFileLogger] Ошибка записи в Commit.txt: ${msg}`);
            vscode.window.showWarningMessage(`Не удалось записать в Commit.txt: ${msg}`);
        }
    }
    /**
     * Очистить содержимое файла Commit.txt
     */
    clearCommitFile() {
        const config = vscode.workspace.getConfiguration();
        const debugMode = config.get('metadataViewer.debugMode', false);
        const commitFilePath = this.getCommitFilePath();
        if (!commitFilePath) {
            if (debugMode) {
                extension_1.outputChannel.appendLine('[CommitFileLogger] Путь к Commit.txt не настроен, очистка не требуется');
            }
            return;
        }
        try {
            if (fs.existsSync(commitFilePath)) {
                // Очищаем файл, записывая пустую строку
                fs.writeFileSync(commitFilePath, '', 'utf-8');
                if (debugMode) {
                    extension_1.outputChannel.appendLine(`[CommitFileLogger] Файл Commit.txt очищен: ${commitFilePath}`);
                }
            }
            else {
                if (debugMode) {
                    extension_1.outputChannel.appendLine(`[CommitFileLogger] Файл Commit.txt не существует, очистка не требуется: ${commitFilePath}`);
                }
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            extension_1.outputChannel.appendLine(`[CommitFileLogger] Ошибка очистки Commit.txt: ${msg}`);
            // Не показываем ошибку пользователю при деактивации, только логируем
        }
    }
}
exports.CommitFileLogger = CommitFileLogger;
CommitFileLogger.instance = null;
//# sourceMappingURL=commitFileLogger.js.map
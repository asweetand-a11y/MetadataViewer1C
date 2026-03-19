'use strict';
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
exports.deactivate = exports.activate = exports.contextStatusBar = exports.statusBarProgress = exports.outputChannel = void 0;
const vscode = __importStar(require("vscode"));
const metadataView_1 = require("./metadataView");
const fs = __importStar(require("fs"));
const formPreviewer_1 = require("./formPreviewer");
const dcsEditor_1 = require("./dcsEditor");
// Added imports for autogen-bsl features
const init_1 = require("./autogen-bsl/init");
const commitFileLogger_1 = require("./utils/commitFileLogger");
const bookmarkManager_1 = require("./utils/bookmarkManager");
const metadataXmlValidator_1 = require("./validation/metadataXmlValidator");
// Output channel для логов расширения
exports.outputChannel = vscode.window.createOutputChannel('1C Metadata Viewer');
/** Общий StatusBarItem для прогресса (генерация кода, загрузка редакторов и т.п.) */
exports.statusBarProgress = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
/** Контекстный StatusBarItem: выбранный узел дерева или активная панель (СКД, макет, форма, предопределённые) */
exports.contextStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101);
async function runValidateMetadataXml(filePath, extensionPath) {
    const result = (0, metadataXmlValidator_1.validateMetadataXmlFile)(filePath, extensionPath);
    const channel = exports.outputChannel;
    channel.clear();
    channel.appendLine(`=== Валидация XML: ${filePath} ===\n`);
    if (result.errors.length > 0) {
        channel.appendLine('ОШИБКИ:');
        result.errors.forEach(e => channel.appendLine(`  ✗ ${e}`));
        channel.appendLine('');
    }
    if (result.warnings.length > 0) {
        channel.appendLine('ПРЕДУПРЕЖДЕНИЯ:');
        result.warnings.forEach(w => channel.appendLine(`  ⚠ ${w}`));
        channel.appendLine('');
    }
    channel.appendLine(result.valid ? 'Результат: OK' : `Результат: ОШИБКА (${result.errors.length} ошибок)`);
    channel.show();
    if (!result.valid) {
        vscode.window.showErrorMessage(`Валидация XML: ${result.errors[0] ?? 'обнаружены ошибки'}`);
    }
    else if (result.warnings.length > 0) {
        vscode.window.showInformationMessage(`Валидация XML: OK, ${result.warnings.length} предупреждений`);
    }
    else {
        vscode.window.showInformationMessage('Валидация XML: OK');
    }
}
function activate(context) {
    try {
        exports.outputChannel.appendLine('=== Расширение "1C Metadata Viewer" активировано ===');
        exports.outputChannel.show(true); // Показываем панель Output автоматически
        context.subscriptions.push(exports.statusBarProgress);
        context.subscriptions.push(exports.contextStatusBar);
        // Optional extra features ported from bsl-cursor (code actions, diff peek, metadata scan, AST rename)
        (0, init_1.initBslCursorFeatures)(context);
    }
    catch (error) {
        exports.outputChannel.appendLine(`Ошибка при инициализации расширения: ${error}`);
        vscode.window.showErrorMessage(`Ошибка активации расширения: ${error}`);
        throw error;
    }
    // Инициализация менеджера закладок
    const bookmarkManager = bookmarkManager_1.BookmarkManager.getInstance();
    context.subscriptions.push({ dispose: () => bookmarkManager.dispose() });
    // Кнопка/команда "Настройки" (по аналогии с PlatformTools)
    vscode.commands.registerCommand('metadataViewer.settings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${context.extension.id}`);
    });
    vscode.commands.registerCommand('metadataViewer.openAppModule', (node) => {
        let filePath = '';
        if (node.configType === 'xml') {
            filePath = node.path + '/Ext/ManagedApplicationModule.bsl';
        }
        else {
            filePath = node.path + '/Configuration/ManagedApplicationModule.bsl';
        }
        OpenFile(filePath);
    });
    vscode.commands.registerCommand('metadataViewer.openSessionModule', (node) => {
        let filePath = '';
        if (node.configType === 'xml') {
            filePath = node.path + '/Ext/SessionModule.bsl';
        }
        else {
            filePath = node.path + '/Configuration/SessionModule.bsl';
        }
        OpenFile(filePath);
    });
    vscode.commands.registerCommand('metadataViewer.openExternalConnectionModule', (node) => {
        // TODO: Имя модуля проверить. Может быть не верным.
        let filePath = '';
        if (node.configType === 'xml') {
            filePath = node.path + '/Ext/ExternalConnectionModule.bsl';
        }
        else {
            filePath = node.path + '/Configuration/ExternalConnectionModule.bsl';
        }
        OpenFile(filePath);
    });
    vscode.commands.registerCommand('metadataViewer.openObjectModule', (node) => {
        let filePath = '';
        if (node.configType === 'xml') {
            filePath = node.path + '/Ext/ObjectModule.bsl';
        }
        else {
            filePath = node.path + '/ObjectModule.bsl';
        }
        OpenFile(filePath);
    });
    vscode.commands.registerCommand('metadataViewer.openManagerModule', (node) => {
        let filePath = '';
        if (node.configType === 'xml') {
            filePath = node.path + '/Ext/ManagerModule.bsl';
        }
        else {
            filePath = node.path + '/ManagerModule.bsl';
        }
        OpenFile(filePath);
    });
    vscode.commands.registerCommand('metadataViewer.openForm', (node) => {
        let filePath = '';
        if (node.configType === 'xml') {
            filePath = node.path + '/Ext/Form/Module.bsl';
        }
        else {
            filePath = node.path + '/Module.bsl';
        }
        OpenFile(filePath);
    });
    vscode.commands.registerCommand('metadataViewer.previewForm', (node) => {
        if (node.configType === 'xml') {
            if (!node.path) {
                vscode.window.showWarningMessage('Не удалось определить путь к форме');
                return;
            }
            const filePath = node.path + '/Ext/Form.xml';
            const objectPathArray = node.path.split('/');
            // Определяем, является ли форма общей формой
            const isCommonForm = node.path.includes('/CommonForms/');
            let rootFilePath;
            let confPath;
            if (isCommonForm) {
                // Для общих форм: путь вида .../CommonForms/ОбщаяФорма
                // rootFilePath должен указывать на файл самой общей формы
                rootFilePath = node.path + '.xml';
                // confPath - путь к корню конфигурации (до CommonForms)
                const commonFormsIndex = objectPathArray.indexOf('CommonForms');
                confPath = objectPathArray.slice(0, commonFormsIndex).join('/');
            }
            else {
                // Для обычных форм: путь вида .../Documents/Документ/Forms/Форма
                // rootFilePath - файл объекта-владельца
                rootFilePath = objectPathArray.slice(0, -2).join('/') + '.xml';
                // confPath - путь к корню конфигурации
                confPath = objectPathArray.slice(0, -4).join('/');
            }
            PreviewForm(confPath ?? '', rootFilePath, filePath, context.extensionUri, node.label);
        }
        else {
            vscode.window
                .showInformationMessage('Данный функционал пока реализован только для конфигураций в формате XML.');
        }
    });
    /**
     * Открыть «Редактор СКД» для отчёта (MainDataCompositionSchema).
     * Работает для конфигураций в формате XML.
     */
    vscode.commands.registerCommand('metadataViewer.openDcsEditor', (node) => {
        if (node.configType !== 'xml') {
            vscode.window.showInformationMessage('Редактор СКД пока реализован только для конфигураций в формате XML.');
            return;
        }
        if (!node.path) {
            vscode.window.showWarningMessage('Не удалось определить путь к отчёту');
            return;
        }
        // Ожидаем путь вида .../Reports/<ReportName>
        const isReport = node.path.includes('/Reports/');
        if (!isReport) {
            vscode.window.showInformationMessage('Редактор СКД: выберите отчет в дереве метаданных.');
            return;
        }
        const reportXmlPath = node.path + '.xml';
        const objectPathArray = node.path.split('/');
        const reportsIndex = objectPathArray.indexOf('Reports');
        const sourceRoot = reportsIndex >= 0 ? objectPathArray.slice(0, reportsIndex).join('/') : '';
        if (!sourceRoot) {
            vscode.window.showWarningMessage('Редактор СКД: не удалось определить корень конфигурации');
            return;
        }
        const editor = new dcsEditor_1.DcsEditor(sourceRoot, reportXmlPath);
        editor.openEditor(context.extensionUri, node.label);
    });
    /**
     * Валидация XML файла метаданных (проверка на совместимость с XDTO при загрузке в 1С)
     */
    vscode.commands.registerCommand('metadataViewer.validateMetadataXml', async (uri) => {
        const fileUri = uri ?? vscode.window.activeTextEditor?.document?.uri;
        if (!fileUri || fileUri.scheme !== 'file') {
            const picked = await vscode.window.showOpenDialog({
                title: 'Выберите XML файл метаданных для валидации',
                filters: { 'XML': ['xml'] },
                canSelectMany: false,
            });
            if (!picked?.[0])
                return;
            await runValidateMetadataXml(picked[0].fsPath, context.extensionUri.fsPath);
            return;
        }
        await runValidateMetadataXml(fileUri.fsPath, context.extensionUri.fsPath);
    });
    vscode.commands.registerCommand('metadataViewer.openModule', (node) => {
        let filePath = '';
        if (node.configType === 'xml') {
            filePath = node.path + '/Ext/Module.bsl';
        }
        else {
            filePath = node.path + '/Module.bsl';
        }
        OpenFile(filePath);
    });
    vscode.commands.registerCommand('metadataViewer.openCommandModule', (node) => {
        let filePath = '';
        if (node.configType === 'xml') {
            filePath = node.path + '/Ext/CommandModule.bsl';
        }
        else {
            filePath = node.path + '/CommandModule.bsl';
        }
        OpenFile(filePath);
    });
    vscode.commands.registerCommand('metadataViewer.openRecordSetModule', (node) => {
        let filePath = '';
        if (node.configType === 'xml') {
            filePath = node.path + '/Ext/RecordSetModule.bsl';
        }
        else {
            // TODO: Не уверен в пути и посмотреть негде
            filePath = node.path + '/RecordSetModule.bsl';
        }
        OpenFile(filePath);
    });
    vscode.commands.registerCommand('metadataViewer.openValueManagerModule', (node) => {
        let filePath = '';
        if (node.configType === 'xml') {
            filePath = node.path + '/Ext/ValueManagerModule.bsl';
        }
        else {
            // TODO: Не уверен в пути и посмотреть негде
            filePath = node.path + '/ValueManagerModule.bsl';
        }
        OpenFile(filePath);
    });
    vscode.commands.registerCommand('metadataViewer.openXml', (node) => {
        let filePath = '';
        if (node.configType === 'xml') {
            if (node.isConfiguration) {
                filePath = node.path + '/Configuration.xml';
            }
            else {
                filePath = node.path + '.xml';
            }
        }
        else {
            // edt
            if (node.isConfiguration) {
                filePath = node.path + '/Configuration/Configuration.mdo';
            }
            else {
                if (node.path?.indexOf('/Forms/') === -1) {
                    const objectPathArray = node.path?.split('/') ?? [];
                    filePath = node.path + '/' + objectPathArray[objectPathArray.length - 1] + '.mdo';
                }
                else {
                    filePath = node.path + '/Form.form';
                }
            }
        }
        OpenFile(filePath);
    });
    // Metadata Editor (from v2)
    vscode.commands.registerCommand('metadataViewer.editMetadata', async (node) => {
        const { MetadataPanel } = await Promise.resolve().then(() => __importStar(require('./panels/MetadataPanel')));
        await MetadataPanel.createOrShowFromTreeItem(context.extensionUri, node);
    });
    // Команды для работы с закладками и форматированием BSL
    vscode.commands.registerCommand('metadataViewer.toggleBookmark', (args) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'bsl') {
            return;
        }
        // Если команда вызвана из контекстного меню gutter, args будет содержать номер строки
        // Если вызвана через горячую клавишу, используем текущую строку курсора
        let targetLine;
        if (args !== undefined) {
            if (typeof args === 'number') {
                targetLine = args;
            }
            else if (typeof args === 'object' && 'lineNumber' in args) {
                targetLine = args.lineNumber;
            }
            else {
                targetLine = editor.selection.active.line;
            }
        }
        else {
            targetLine = editor.selection.active.line;
        }
        bookmarkManager.toggleBookmark(targetLine, editor.document);
    });
    vscode.commands.registerCommand('metadataViewer.nextBookmark', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'bsl') {
            return;
        }
        const currentLine = editor.selection.active.line;
        const nextLine = bookmarkManager.getNextBookmark(editor.document, currentLine);
        if (nextLine !== null) {
            const position = new vscode.Position(nextLine, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
        else {
            vscode.window.showInformationMessage('Закладки не найдены');
        }
    });
    vscode.commands.registerCommand('metadataViewer.clearAllBookmarks', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'bsl') {
            return;
        }
        bookmarkManager.clearAllBookmarks(editor.document);
        vscode.window.showInformationMessage('Все закладки удалены');
    });
    vscode.commands.registerCommand('metadataViewer.increaseIndent', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'bsl') {
            return;
        }
        modifyIndent(editor, true);
    });
    vscode.commands.registerCommand('metadataViewer.decreaseIndent', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'bsl') {
            return;
        }
        modifyIndent(editor, false);
    });
    try {
        new metadataView_1.MetadataView(context);
        exports.outputChannel.appendLine('MetadataView успешно создан');
    }
    catch (error) {
        exports.outputChannel.appendLine(`Ошибка при создании MetadataView: ${error}`);
        vscode.window.showErrorMessage(`Ошибка создания MetadataView: ${error}`);
        throw error;
    }
    // Отслеживание сохранения BSL файлов
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => {
        // Проверяем, что это BSL файл
        if (document.languageId === 'bsl' || document.fileName.endsWith('.bsl')) {
            const config = vscode.workspace.getConfiguration();
            const debugMode = config.get('metadataViewer.debugMode', false);
            if (debugMode) {
                exports.outputChannel.appendLine(`[BSL Save] Файл сохранен: ${document.fileName}`);
            }
            // Логируем сохраненный файл в Commit.txt
            commitFileLogger_1.CommitFileLogger.getInstance().logChangedFile(document.fileName);
        }
    }));
}
exports.activate = activate;
/**
 * Функция деактивации расширения
 * Вызывается при закрытии IDE Cursor или отключении расширения
 */
function deactivate() {
    try {
        exports.outputChannel.appendLine('=== Расширение "1C Metadata Viewer" деактивировано ===');
        // Очищаем содержимое файла Commit.txt при закрытии IDE
        commitFileLogger_1.CommitFileLogger.getInstance().clearCommitFile();
        exports.outputChannel.appendLine('Commit.txt очищен');
    }
    catch (error) {
        exports.outputChannel.appendLine(`Ошибка при деактивации расширения: ${error}`);
    }
}
exports.deactivate = deactivate;
function OpenFile(filePath) {
    const openPath = vscode.Uri.file(filePath);
    if (fs.existsSync(filePath)) {
        vscode.workspace.openTextDocument(openPath).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }
    else {
        vscode.window
            .showInformationMessage(`File ${filePath} does not exist. Create?`, 'Yes', 'No')
            .then(answer => {
            if (answer === 'Yes') {
                // TODO: Кроме собственно создания файла наверное надо что-то писать в XML? Наверняка нужно...
                vscode.workspace.fs.writeFile(openPath, new Uint8Array).then(_ => {
                    vscode.window.showInformationMessage(`File ${filePath} is creted!`);
                    vscode.workspace.openTextDocument(openPath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                });
            }
        });
    }
}
function PreviewForm(confPath, rootFilePath, filePath, extensionUri, nodeDescription) {
    const previewer = new formPreviewer_1.FormPreviewer(confPath, rootFilePath, filePath);
    previewer.openPreview(extensionUri, nodeDescription);
}
/**
 * Изменение отступа для выделенных строк
 */
function modifyIndent(editor, increase) {
    const document = editor.document;
    const selection = editor.selection;
    // Определяем диапазон строк для обработки
    let startLine;
    let endLine;
    if (selection.isEmpty) {
        // Если нет выделения, обрабатываем текущую строку
        startLine = selection.active.line;
        endLine = selection.active.line;
    }
    else {
        startLine = selection.start.line;
        endLine = selection.end.line;
    }
    // Получаем строки для модификации
    const lines = [];
    for (let i = startLine; i <= endLine; i++) {
        const line = document.lineAt(i);
        lines.push({ line: i, text: line.text });
    }
    // Модифицируем отступы
    editor.edit(editBuilder => {
        for (const { line, text } of lines) {
            if (text.trim().length === 0) {
                continue; // Пропускаем пустые строки
            }
            const lineRange = document.lineAt(line).range;
            if (increase) {
                // Добавляем табуляцию в начало
                editBuilder.insert(new vscode.Position(line, 0), '\t');
            }
            else {
                // Удаляем табуляцию или пробелы из начала
                const match = text.match(/^(\s*)/);
                if (match && match[1].length > 0) {
                    const indent = match[1];
                    // Удаляем один символ табуляции или до 4 пробелов
                    let toRemove = 1;
                    if (indent.startsWith('\t')) {
                        toRemove = 1;
                    }
                    else if (indent.length >= 4) {
                        toRemove = 4;
                    }
                    else {
                        toRemove = indent.length;
                    }
                    const removeRange = new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, toRemove));
                    editBuilder.delete(removeRange);
                }
            }
        }
    });
}
//# sourceMappingURL=extension.js.map
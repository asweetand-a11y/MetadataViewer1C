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
exports.initBslCursorFeatures = void 0;
const vscode = __importStar(require("vscode"));
const GenCommentCodeActionProvider_1 = require("./ux/GenCommentCodeActionProvider");
const IntentParser_1 = require("./intent/IntentParser");
const IntentRouter_1 = require("./routing/IntentRouter");
const GeneratorFactory_1 = require("./generators/GeneratorFactory");
const extension_1 = require("../extension");
const queryStringEditor_1 = require("../queryStringEditor");
/**
 * BSL-файл: languageId от Language 1C (bsl/1c) или расширение .bsl.
 */
function isBslDocument(doc) {
    const lang = (doc.languageId || '').toLowerCase();
    return lang === 'bsl' || lang === '1c' || doc.fileName.toLowerCase().endsWith('.bsl');
}
/**
 * Восстанавливает Range после сериализации аргументов команды.
 */
function toRange(range) {
    if (range instanceof vscode.Range) {
        return range;
    }
    const start = range.start;
    const end = range.end;
    return new vscode.Range(new vscode.Position(start.line, start.character ?? 0), new vscode.Position(end.line, end.character ?? 0));
}
/**
 * Документ команды: аргумент, URI или активный редактор.
 */
function resolveDocument(docArg) {
    const editor = vscode.window.activeTextEditor;
    if (!docArg) {
        return editor?.document;
    }
    const uriLike = docArg.uri;
    const uriStr = uriLike
        ? (typeof uriLike.toString === 'function'
            ? uriLike.toString()
            : String(uriLike))
        : undefined;
    if (uriStr) {
        const found = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uriStr);
        if (found) {
            return found;
        }
    }
    return editor?.document;
}
function initBslCursorFeatures(context) {
    // Code actions for // @gen in BSL
    const detector = new GenCommentCodeActionProvider_1.GenCommentDetector();
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider([{ language: 'bsl' }, { language: '1c' }, { pattern: '**/*.bsl' }], new GenCommentCodeActionProvider_1.GenCommentCodeActionProvider(detector), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));
    // Services
    const intentParser = new IntentParser_1.IntentParser();
    const router = new IntentRouter_1.IntentRouter();
    const generatorFactory = new GeneratorFactory_1.GeneratorFactory();
    // Commands
    context.subscriptions.push(vscode.commands.registerCommand('metadataViewer.genFromComment', async (docArg, genArg) => {
        try {
            const config = vscode.workspace.getConfiguration();
            const debugMode = config.get('metadataViewer.debugMode', false);
            const editor = vscode.window.activeTextEditor;
            const doc = resolveDocument(docArg);
            if (!editor || !doc) {
                vscode.window.showWarningMessage('Нет активного редактора');
                return;
            }
            if (!isBslDocument(doc)) {
                vscode.window.showWarningMessage('Команда доступна только для BSL файлов');
                return;
            }
            let gen = genArg;
            if (gen?.range) {
                gen = { text: gen.text, range: toRange(gen.range) };
            }
            else {
                gen = detector.detect(doc, editor.selection.active) ?? undefined;
            }
            if (!gen) {
                vscode.window.showWarningMessage('Не найден комментарий // @gen. Убедитесь, что курсор находится на строке с комментарием // @gen');
                return;
            }
            if (debugMode) {
                extension_1.outputChannel.appendLine(`[genFromComment] Начало генерации, текст комментария: ${gen?.text || ''}`);
            }
            const intent = intentParser.parse(String(gen?.text || ''));
            const strategyId = router.route(intent);
            if (debugMode) {
                extension_1.outputChannel.appendLine(`[genFromComment] Intent: ${intent.kind}, strategy: ${strategyId}, confidence: ${intent.confidence}`);
            }
            const generator = generatorFactory.getGenerator(strategyId);
            if (!generator) {
                const message = `Генератор для стратегии "${strategyId}" не реализован.`;
                vscode.window.showWarningMessage(message);
                if (debugMode) {
                    extension_1.outputChannel.appendLine(`[genFromComment] ${message}`);
                }
                return;
            }
            // Определяем позицию для вставки кода (после комментария)
            const insertPosition = new vscode.Position(gen.range.end.line + 1, 0);
            const genContext = {
                document: doc,
                position: insertPosition,
                intent: intent
            };
            extension_1.statusBarProgress.show();
            extension_1.statusBarProgress.text = '$(sync~spin) Генерация кода…';
            try {
                const generatedCode = await Promise.resolve(generator.generate(genContext));
                if (debugMode) {
                    extension_1.outputChannel.appendLine(`[genFromComment] Сгенерированный код:\n${generatedCode}`);
                }
                const success = await generator.insertCode(genContext, generatedCode);
                if (success) {
                    const message = `Код сгенерирован (${intent.kind} → ${strategyId})`;
                    vscode.window.showInformationMessage(message);
                    if (debugMode) {
                        extension_1.outputChannel.appendLine(`[genFromComment] ${message}`);
                    }
                }
                else {
                    const message = 'Не удалось вставить сгенерированный код';
                    vscode.window.showErrorMessage(message);
                    if (debugMode) {
                        extension_1.outputChannel.appendLine(`[genFromComment] Ошибка: ${message}`);
                    }
                }
            }
            finally {
                extension_1.statusBarProgress.hide();
            }
        }
        catch (error) {
            const errorMessage = `Ошибка при генерации кода: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(errorMessage);
            extension_1.outputChannel.appendLine(`[genFromComment] ${errorMessage}`);
            console.error('[genFromComment]', error);
            extension_1.statusBarProgress.hide();
        }
    }));
    // Обёртка для вызова генерации из комментария из контекстного меню
    context.subscriptions.push(vscode.commands.registerCommand('metadataViewer.genFromCommentPrompt', async () => {
        await vscode.commands.executeCommand('metadataViewer.genFromComment');
    }));
    // Команда для редактирования запроса из BSL-строки
    context.subscriptions.push(vscode.commands.registerCommand('metadataViewer.editQueryFromEditor', async () => {
        const ed = vscode.window.activeTextEditor;
        if (!ed) {
            vscode.window.showWarningMessage('Нет активного редактора');
            return;
        }
        const doc = ed.document;
        if (doc.languageId !== 'bsl') {
            vscode.window.showWarningMessage('Команда доступна только для BSL файлов');
            return;
        }
        const selection = ed.selection;
        let queryText = '';
        let range;
        if (selection.isEmpty) {
            // Если нет выделения, автоматически ищем кавычки вокруг курсора (многострочный поиск)
            const cursorPos = selection.active;
            const cursorOffset = doc.offsetAt(cursorPos);
            const fullText = doc.getText();
            // Ищем открывающую кавычку перед курсором (по всему документу)
            let openQuoteOffset = -1;
            for (let i = cursorOffset - 1; i >= 0; i--) {
                if (fullText[i] === '"') {
                    // В BSL экранирование: "" означает одну кавычку внутри строки
                    // При движении назад: если перед текущей " стоит еще одна ", это часть экранированной последовательности
                    if (i > 0 && fullText[i - 1] === '"') {
                        // Это часть экранированной последовательности "", пропускаем обе кавычки
                        i--; // Пропускаем обе кавычки (уже на i-1, цикл уменьшит i еще на 1)
                        continue;
                    }
                    // Проверяем экранирование через обратный слэш
                    if (i === 0 || fullText[i - 1] !== '\\') {
                        openQuoteOffset = i;
                        break;
                    }
                }
            }
            // Ищем закрывающую кавычку после курсора (по всему документу)
            let closeQuoteOffset = -1;
            for (let i = cursorOffset; i < fullText.length; i++) {
                if (fullText[i] === '"') {
                    // В BSL экранирование: "" означает одну кавычку внутри строки
                    // При движении вперед: если после " стоит еще одна ", это часть экранированной последовательности
                    if (i + 1 < fullText.length && fullText[i + 1] === '"') {
                        // Это экранированная кавычка "", пропускаем обе кавычки
                        i++; // Пропускаем обе кавычки (уже на i+1, цикл увеличит i еще на 1)
                        continue;
                    }
                    // Проверяем экранирование через обратный слэш
                    if (i === 0 || fullText[i - 1] !== '\\') {
                        closeQuoteOffset = i;
                        break;
                    }
                }
            }
            if (openQuoteOffset === -1 || closeQuoteOffset === -1) {
                vscode.window.showWarningMessage('Курсор должен находиться внутри строки в двойных кавычках ""');
                return;
            }
            // Извлекаем текст между кавычками
            queryText = fullText.substring(openQuoteOffset + 1, closeQuoteOffset);
            // Убираем символы | в начале строк (кроме первой), включая случаи с пробелами перед |
            // Удаляем | в начале строки или после пробелов в начале строки
            queryText = queryText.replace(/^(\s*)\|/gm, '$1');
            // Создаем range для текста внутри кавычек (многострочный)
            range = new vscode.Range(doc.positionAt(openQuoteOffset + 1), doc.positionAt(closeQuoteOffset));
        }
        else {
            // Если есть выделение, работаем с ним
            const selectedText = doc.getText(selection);
            queryText = selectedText;
            range = new vscode.Range(selection.start, selection.end);
            // Проверяем, выделена ли строка полностью с кавычками или только внутри
            const trimmed = selectedText.trim();
            // Если выделено с кавычками (начинается и заканчивается на ")
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                // Убираем внешние кавычки для редактора
                queryText = trimmed.slice(1, -1);
                // Убираем символы | в начале строк (кроме первой), включая случаи с пробелами перед |
                queryText = queryText.replace(/^(\s*)\|/gm, '$1');
                // Корректируем диапазон - внутренность кавычек
                const startOffset = doc.offsetAt(selection.start);
                const endOffset = doc.offsetAt(selection.end);
                const firstQuoteOffset = startOffset + selectedText.indexOf('"');
                const lastQuoteOffset = startOffset + selectedText.lastIndexOf('"');
                range = new vscode.Range(doc.positionAt(firstQuoteOffset + 1), doc.positionAt(lastQuoteOffset));
            }
            else if (trimmed.includes('"')) {
                // Если есть кавычки внутри, но не с обеих сторон - ошибка
                vscode.window.showWarningMessage('Выделите строку полностью (с кавычками "" ) или только текст внутри кавычек');
                return;
            }
            else {
                // Если выделен текст внутри кавычек - убираем символы |, включая случаи с пробелами перед |
                queryText = queryText.replace(/^(\s*)\|/gm, '$1');
            }
        }
        // Открываем редактор
        const editor = new queryStringEditor_1.QueryStringEditor();
        await editor.openEditor(context.extensionUri, doc, range, queryText);
    }));
    // metadataViewer.scanMetadataWorkspace removed: the metadata tree is already built in 1c-metadata view.
}
exports.initBslCursorFeatures = initBslCursorFeatures;
//# sourceMappingURL=init.js.map
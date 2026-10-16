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
exports.AIGenerator = void 0;
const vscode = __importStar(require("vscode"));
const BaseGenerator_1 = require("./BaseGenerator");
const extension_1 = require("../../extension");
const MCPClient_1 = require("./MCPClient");
/**
 * AI генератор кода через встроенный MCP 1С:Напарник (ask_1c_ai).
 */
class AIGenerator extends BaseGenerator_1.BaseGenerator {
    constructor() {
        super();
        this.mcpClient = new MCPClient_1.MCPClient();
    }
    async generate(context) {
        const intent = context.intent;
        const rawText = intent.rawText || '';
        // Формируем промпт для генерации кода
        const prompt = this.buildPrompt(rawText, context);
        // Пытаемся использовать MCP серверы для генерации кода
        try {
            const code = await this.generateWithMCP(prompt, context);
            if (code) {
                return code;
            }
        }
        catch (error) {
            const errorMsg = `Ошибка при генерации через MCP: ${error instanceof Error ? error.message : String(error)}`;
            extension_1.outputChannel.appendLine(`[AIGenerator] ${errorMsg}`);
            console.error('[AIGenerator]', error);
        }
        // Fallback: возвращаем шаблон с комментарием
        return this.generateFallback(rawText);
    }
    /**
     * Генерирует код с использованием MCP сервера 1c-ai
     */
    async generateWithMCP(prompt, context) {
        const config = vscode.workspace.getConfiguration();
        const debugMode = config.get('metadataViewer.debugMode', false);
        const rawRequest = String(context.intent.rawText || '').trim();
        if (debugMode) {
            extension_1.outputChannel.appendLine(`[AIGenerator] Генерация через 1С:Напарник, запрос: ${rawRequest}`);
        }
        // Генерация кода через 1С:Напарник
        try {
            const moduleContext = this.detectModuleContext(context);
            const localSnippet = this.getLocalSnippet(context.document, context.position);
            const question = this.build1cAiQuestion({
                request: rawRequest,
                moduleContext,
                localSnippet,
                evidence: ''
            });
            const answer = await this.mcpClient.ask1cAi(question);
            let candidate = this.extractBslFromMcpAnswer(answer);
            candidate = this.normalizeGeneratedBsl(candidate, rawRequest);
            if (candidate) {
                if (debugMode) {
                    extension_1.outputChannel.appendLine(`[AIGenerator] Код сгенерирован через 1С:Напарник`);
                }
                return candidate;
            }
        }
        catch (e) {
            if (debugMode) {
                extension_1.outputChannel.appendLine(`[AIGenerator] 1С:Напарник недоступен/вернул пустой ответ: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        return null;
    }
    /**
     * Определяет контекст модуля
     */
    detectModuleContext(context) {
        const fileName = context.document.fileName.split(/[/\\]/).pop() || '';
        if (fileName.includes('Form') || fileName.includes('Форма')) {
            return 'модуль формы';
        }
        else if (fileName.includes('Object') || fileName.includes('Объект')) {
            return 'модуль объекта';
        }
        else if (fileName.includes('Manager') || fileName.includes('Менеджер')) {
            return 'модуль менеджера';
        }
        return 'общий модуль';
    }
    /**
     * Возвращает небольшой фрагмент текста вокруг точки вставки.
     * Это помогает 1С:Напарнику учитывать локальный контекст модуля.
     */
    getLocalSnippet(doc, pos) {
        const startLine = Math.max(0, pos.line - 30);
        const endLine = Math.min(doc.lineCount - 1, pos.line + 30);
        const endChar = doc.lineAt(endLine).text.length;
        const range = new vscode.Range(startLine, 0, endLine, endChar);
        const text = doc.getText(range);
        // Ограничиваем объём, чтобы не раздувать контекст
        return text.length > 4000 ? text.slice(0, 4000) : text;
    }
    /**
     * Строит вопрос для tool `ask_1c_ai`.
     * Требуем вернуть только BSL код (без markdown и объяснений).
     */
    build1cAiQuestion(args) {
        const request = args.request || '—';
        const evidence = args.evidence?.trim();
        const snippet = args.localSnippet?.trim();
        return [
            `Сгенерируй код для: ${args.moduleContext}.`,
            '',
            `Запрос пользователя: ${request}`,
            '',
            evidence ? `Контекст из MCP (можно использовать как справку):\n${evidence}` : '',
            '',
            snippet ? `Фрагмент текущего модуля вокруг места вставки (контекст):\n${snippet}` : '',
            '',
            'Требования к ответу:',
            '- Код генерируй по стандартам БСП.',
            '- Не добавляй пояснений вне кода.',
            '- Можно добавлять комментарии внутри кода (// ...).',
            '- Код должен быть валидным и готовым к вставке.'
        ]
            .filter((x) => x.length > 0)
            .join('\n');
    }
    /**
     * Извлекает BSL код из ответа MCP (на случай разных форматов).
     */
    extractBslFromMcpAnswer(answer) {
        const text = this.extractTextFromMcpAnswer(answer);
        const cleaned = this.cleanup1cAiEnvelope(text);
        return this.stripCodeFences(cleaned).trim();
    }
    /**
     * Извлекает текст из разных форматов MCP tool result.
     */
    extractTextFromMcpAnswer(answer) {
        if (typeof answer === 'string')
            return answer;
        // Формат MCP tools/call: { content: [{ type: "text", text: "..." }, ...] }
        const content = answer?.content ?? answer?.result?.content;
        if (Array.isArray(content)) {
            const firstText = content.find((x) => typeof x?.text === 'string')?.text;
            if (typeof firstText === 'string')
                return firstText;
        }
        // Другие возможные варианты
        const maybeText = answer?.answer ?? answer?.text ?? answer?.result ?? answer;
        return this.safeToString(maybeText);
    }
    /**
     * Убирает служебные префиксы/суффиксы, которые добавляет 1c-ai MCP сервер.
     */
    cleanup1cAiEnvelope(text) {
        const lines = String(text || '').split(/\r?\n/);
        const filtered = lines
            // убираем служебные строки
            .filter((l) => {
            const t = l.trim();
            if (/^Сессия:\s*/i.test(t))
                return false;
            if (/^Разговор:\s*/i.test(t))
                return false;
            return true;
        })
            .join('\n');
        // убираем префикс "Ответ от 1С.ai:" если он есть
        return filtered.replace(/^Ответ от 1С\.ai:\s*/i, '').trim();
    }
    /**
     * Нормализует BSL, чтобы корректно вставлялось в документ, чтобы корректно вставлялось в документ.
     */
    normalizeGeneratedBsl(code, _request) {
        const trimmed = String(code || '').trim();
        if (!trimmed)
            return '';
        let out = trimmed;
        // Вставка идёт с колонки 0 после комментария; добавим перевод строки для читаемости
        if (!out.startsWith('\n'))
            out = `\n${out}`;
        if (!out.endsWith('\n'))
            out = `${out}\n`;
        return out;
    }
    stripCodeFences(text) {
        const t = String(text || '');
        // Удаляем одиночный code-fence, если модель всё-таки вернула markdown
        return t
            .replace(/```(?:bsl|1c)?\s*\n([\s\S]*?)```/gim, '$1')
            .replace(/^```[\s\S]*?\n/, '')
            .replace(/```\s*$/, '');
    }
    hasCheckIssues(check) {
        if (!check)
            return false;
        const diags = check?.diagnostics;
        if (Array.isArray(diags)) {
            return diags.some((d) => {
                const sev = d?.severity ?? d?.level;
                return sev === 'error' || sev === 'ERROR' || sev === 1 || sev === 2;
            });
        }
        const errors = check?.errors;
        if (Array.isArray(errors))
            return errors.length > 0;
        if (typeof check?.hasErrors === 'boolean')
            return check.hasErrors;
        if (typeof check?.ok === 'boolean')
            return !check.ok;
        const s = this.safeToString(check).toLowerCase();
        return s.includes('error') || s.includes('ошиб');
    }
    formatDiagnostics(check) {
        if (!check)
            return '—';
        const diags = check?.diagnostics;
        if (Array.isArray(diags) && diags.length > 0) {
            return diags
                .slice(0, 15)
                .map((d, i) => {
                const msg = String(d?.message || d?.text || d?.description || '').trim();
                const line = d?.range?.start?.line ?? d?.line;
                const col = d?.range?.start?.character ?? d?.character;
                const loc = (line !== undefined && col !== undefined) ? ` (стр ${line}, кол ${col})` : '';
                return `${i + 1}) ${msg}${loc}`.trim();
            })
                .join('\n');
        }
        const errors = check?.errors;
        if (Array.isArray(errors) && errors.length > 0) {
            return errors.slice(0, 15).map((e, i) => `${i + 1}) ${this.safeToString(e)}`).join('\n');
        }
        return this.safeToString(check).slice(0, 2000);
    }
    safeToString(value) {
        if (value === null || value === undefined)
            return '';
        if (typeof value === 'string')
            return value;
        try {
            return JSON.stringify(value, null, 2);
        }
        catch {
            return String(value);
        }
    }
    /**
     * Формирует промпт для генерации кода
     */
    buildPrompt(rawText, context) {
        const doc = context.document;
        const fileName = doc.fileName.split(/[/\\]/).pop() || 'модуль';
        // Определяем контекст модуля по имени файла
        let moduleContext = 'общем модуле';
        if (fileName.includes('Form') || fileName.includes('Форма')) {
            moduleContext = 'модуле формы';
        }
        else if (fileName.includes('Object') || fileName.includes('Объект')) {
            moduleContext = 'модуле объекта';
        }
        else if (fileName.includes('Manager') || fileName.includes('Менеджер')) {
            moduleContext = 'модуле менеджера';
        }
        return `Сгенерируй код для ${moduleContext}.\n\nЗапрос: ${rawText}\n\nТребования:\n- Код должен быть валидным\n- Используй стандартные конструкции 1С\n- Добавь комментарии для понимания\n- Код должен быть готов к использованию`;
    }
    /**
     * Генерирует fallback код, если MCP недоступен
     */
    generateFallback(rawText) {
        // Анализируем запрос и генерируем базовый шаблон
        const lowerText = rawText.toLowerCase();
        return `\n\t// Не удалось сгенерировать код через 1С:Напарник (проверьте токен API)\n`;
    }
}
exports.AIGenerator = AIGenerator;
//# sourceMappingURL=AIGenerator.js.map
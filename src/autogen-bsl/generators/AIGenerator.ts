import * as vscode from 'vscode';
import { BaseGenerator, GeneratorContext } from './BaseGenerator';
import { outputChannel } from '../../extension';
import { MCPClient } from './MCPClient';

/**
 * AI генератор кода через встроенный MCP 1С:Напарник (ask_1c_ai).
 */
export class AIGenerator extends BaseGenerator {
  private mcpClient: MCPClient;

  constructor() {
    super();
    this.mcpClient = new MCPClient();
  }

  async generate(context: GeneratorContext): Promise<string> {
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
    } catch (error) {
      const errorMsg = `Ошибка при генерации через MCP: ${error instanceof Error ? error.message : String(error)}`;
      outputChannel.appendLine(`[AIGenerator] ${errorMsg}`);
      console.error('[AIGenerator]', error);
    }
    
    // Fallback: возвращаем шаблон с комментарием
    return this.generateFallback(rawText);
  }

  /**
   * Генерирует код с использованием MCP сервера 1c-ai
   */
  private async generateWithMCP(prompt: string, context: GeneratorContext): Promise<string | null> {
    const config = vscode.workspace.getConfiguration();
    const debugMode = config.get<boolean>('metadataViewer.debugMode', false);

    const rawRequest = String(context.intent.rawText || '').trim();

    if (debugMode) {
      outputChannel.appendLine(`[AIGenerator] Генерация через 1С:Напарник, запрос: ${rawRequest}`);
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
          outputChannel.appendLine(`[AIGenerator] Код сгенерирован через 1С:Напарник`);
        }

        return candidate;
      }
    } catch (e) {
      if (debugMode) {
        outputChannel.appendLine(`[AIGenerator] 1С:Напарник недоступен/вернул пустой ответ: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return null;
  }

  /**
   * Определяет контекст модуля
   */
  private detectModuleContext(context: GeneratorContext): string {
    const fileName = context.document.fileName.split(/[/\\]/).pop() || '';
    if (fileName.includes('Form') || fileName.includes('Форма')) {
      return 'модуль формы';
    } else if (fileName.includes('Object') || fileName.includes('Объект')) {
      return 'модуль объекта';
    } else if (fileName.includes('Manager') || fileName.includes('Менеджер')) {
      return 'модуль менеджера';
    }
    return 'общий модуль';
  }


  /**
   * Возвращает небольшой фрагмент текста вокруг точки вставки.
   * Это помогает 1С:Напарнику учитывать локальный контекст модуля.
   */
  private getLocalSnippet(doc: vscode.TextDocument, pos: vscode.Position): string {
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
  private build1cAiQuestion(args: {
    request: string;
    moduleContext: string;
    localSnippet: string;
    evidence: string;
  }): string {
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
  private extractBslFromMcpAnswer(answer: any): string {
    const text = this.extractTextFromMcpAnswer(answer);
    const cleaned = this.cleanup1cAiEnvelope(text);
    return this.stripCodeFences(cleaned).trim();
  }

  /**
   * Извлекает текст из разных форматов MCP tool result.
   */
  private extractTextFromMcpAnswer(answer: any): string {
    if (typeof answer === 'string') return answer;

    // Формат MCP tools/call: { content: [{ type: "text", text: "..." }, ...] }
    const content = answer?.content ?? answer?.result?.content;
    if (Array.isArray(content)) {
      const firstText = content.find((x: any) => typeof x?.text === 'string')?.text;
      if (typeof firstText === 'string') return firstText;
    }

    // Другие возможные варианты
    const maybeText = answer?.answer ?? answer?.text ?? answer?.result ?? answer;
    return this.safeToString(maybeText);
  }

  /**
   * Убирает служебные префиксы/суффиксы, которые добавляет 1c-ai MCP сервер.
   */
  private cleanup1cAiEnvelope(text: string): string {
    const lines = String(text || '').split(/\r?\n/);

    const filtered = lines
      // убираем служебные строки
      .filter((l) => {
        const t = l.trim();
        if (/^Сессия:\s*/i.test(t)) return false;
        if (/^Разговор:\s*/i.test(t)) return false;
        return true;
      })
      .join('\n');

    // убираем префикс "Ответ от 1С.ai:" если он есть
    return filtered.replace(/^Ответ от 1С\.ai:\s*/i, '').trim();
  }

  /**
   * Нормализует BSL, чтобы корректно вставлялось в документ, чтобы корректно вставлялось в документ.
   */
  private normalizeGeneratedBsl(code: string, _request: string): string {
    const trimmed = String(code || '').trim();
    if (!trimmed) return '';

    let out = trimmed;
    // Вставка идёт с колонки 0 после комментария; добавим перевод строки для читаемости
    if (!out.startsWith('\n')) out = `\n${out}`;
    if (!out.endsWith('\n')) out = `${out}\n`;
    return out;
  }

  private stripCodeFences(text: string): string {
    const t = String(text || '');
    // Удаляем одиночный code-fence, если модель всё-таки вернула markdown
    return t
      .replace(/```(?:bsl|1c)?\s*\n([\s\S]*?)```/gim, '$1')
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/```\s*$/, '');
  }

  private hasCheckIssues(check: any): boolean {
    if (!check) return false;

    const diags = check?.diagnostics;
    if (Array.isArray(diags)) {
      return diags.some((d: any) => {
        const sev = d?.severity ?? d?.level;
        return sev === 'error' || sev === 'ERROR' || sev === 1 || sev === 2;
      });
    }

    const errors = check?.errors;
    if (Array.isArray(errors)) return errors.length > 0;

    if (typeof check?.hasErrors === 'boolean') return check.hasErrors;
    if (typeof check?.ok === 'boolean') return !check.ok;

    const s = this.safeToString(check).toLowerCase();
    return s.includes('error') || s.includes('ошиб');
  }

  private formatDiagnostics(check: any): string {
    if (!check) return '—';

    const diags = check?.diagnostics;
    if (Array.isArray(diags) && diags.length > 0) {
      return diags
        .slice(0, 15)
        .map((d: any, i: number) => {
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
      return errors.slice(0, 15).map((e: any, i: number) => `${i + 1}) ${this.safeToString(e)}`).join('\n');
    }

    return this.safeToString(check).slice(0, 2000);
  }

  private safeToString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  /**
   * Формирует промпт для генерации кода
   */
  private buildPrompt(rawText: string, context: GeneratorContext): string {
    const doc = context.document;
    const fileName = doc.fileName.split(/[/\\]/).pop() || 'модуль';
    
    // Определяем контекст модуля по имени файла
    let moduleContext = 'общем модуле';
    if (fileName.includes('Form') || fileName.includes('Форма')) {
      moduleContext = 'модуле формы';
    } else if (fileName.includes('Object') || fileName.includes('Объект')) {
      moduleContext = 'модуле объекта';
    } else if (fileName.includes('Manager') || fileName.includes('Менеджер')) {
      moduleContext = 'модуле менеджера';
    }
    
    return `Сгенерируй код для ${moduleContext}.\n\nЗапрос: ${rawText}\n\nТребования:\n- Код должен быть валидным\n- Используй стандартные конструкции 1С\n- Добавь комментарии для понимания\n- Код должен быть готов к использованию`;
  }

  /**
   * Генерирует fallback код, если MCP недоступен
   */
  private generateFallback(rawText: string): string {
    // Анализируем запрос и генерируем базовый шаблон
    const lowerText = rawText.toLowerCase();
    
    return `\n\t// Не удалось сгенерировать код через 1С:Напарник (проверьте токен API)\n`;

  }
    
}


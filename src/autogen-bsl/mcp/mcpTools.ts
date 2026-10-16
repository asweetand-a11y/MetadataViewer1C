/**
 * MCP tools 1С:Напарник: ask_1c_ai, explain_1c_syntax, check_1c_code.
 * Порт D:/Docker/app/MCPServer1C/mcpserver/1c-ai/mcp/handlers.py
 */

import { ApiError } from './oneCAiModels';
import { OneCApiClient } from './oneCAiApiClient';
import { McpSessionStore } from './mcpSession';
import {
	buildResponseInstruction,
	MCP_TOOL_INPUT_MAX_LENGTH,
	MCP_TOOL_INPUT_MIN_LENGTH,
	prepareMessageForUpstream,
	sanitizeText
} from './textUtils';

export class ToolNotFoundError extends Error {
	constructor(public toolName: string) {
		super(`Tool not found: ${toolName}`);
		this.name = 'ToolNotFoundError';
	}
}

export interface ToolsCallTextContent {
	type: 'text';
	text: string;
}

export interface ToolsCallResult {
	content: ToolsCallTextContent[];
}

export interface ToolDesc {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

/**
 * Обработчики MCP-методов initialize / tools/list / tools/call.
 */
export class McpHandlers {
	constructor(public client: OneCApiClient, public store: McpSessionStore) {}

	initialize(protocolVersion: string): {
		protocolVersion: string;
		serverInfo: { name: string; version: string };
		capabilities: { tools: Record<string, unknown> };
	} {
		return {
			protocolVersion: protocolVersion || '2024-11-05',
			serverInfo: { name: '1C.ai Gateway MCP', version: '1.0.0' },
			capabilities: { tools: {} }
		};
	}

	toolsList(): { tools: ToolDesc[] } {
		const minLen = MCP_TOOL_INPUT_MIN_LENGTH;
		const maxLen = MCP_TOOL_INPUT_MAX_LENGTH;
		return {
			tools: [
				{
					name: 'ask_1c_ai',
					description:
						'Задать вопрос специализированному ИИ-ассистенту по платформе 1С:Предприятие. ' +
						'Используйте для общих вопросов и советов. Не используйте для проверки конкретного кода ' +
						'или объяснения термина — для этого есть другие инструменты.',
					inputSchema: {
						type: 'object',
						title: 'Ask 1C expert',
						description: 'Задать экспертный вопрос по платформе 1С:Предприятие. Не для проверки конкретного кода.',
						properties: {
							question: {
								type: 'string',
								title: 'Question',
								description: 'Чёткая формулировка вопроса/задачи.',
								minLength: minLen,
								maxLength: maxLen
							},
							programming_language: {
								type: 'string',
								title: 'Programming language',
								description: 'Язык программирования (опционально).',
								enum: ['', 'BSL', 'SQL', 'JSON', 'HTTP'],
								default: '',
								maxLength: maxLen
							},
							create_new_session: {
								type: 'boolean',
								title: 'Create new conversation',
								description: 'Создать новый разговор (сброс контекста).',
								default: false
							}
						},
						required: ['question']
					}
				},
				{
					name: 'explain_1c_syntax',
					description:
						'Объяснить конкретный элемент синтаксиса/объект платформы 1С (например, HTTPСоединение, ' +
						'HTTPЗапрос, ТаблицаЗначений, Запрос) с примерами. Не использовать для аудита кода.',
					inputSchema: {
						type: 'object',
						title: 'Explain 1C syntax',
						description: 'Поясняет конкретный элемент синтаксиса/объект платформы 1С с примерами.',
						properties: {
							syntax_element: {
								type: 'string',
								title: 'Syntax element',
								description: 'Название элемента (например, HTTPЗапрос, ТаблицаЗначений).',
								minLength: minLen,
								maxLength: maxLen
							},
							context: {
								type: 'string',
								title: 'Context',
								description: 'Доп. контекст: где/как используется (опционально).',
								default: '',
								minLength: 0,
								maxLength: maxLen
							}
						},
						required: ['syntax_element']
					}
				},
				{
					name: 'check_1c_code',
					description:
						'Проверить присланный BSL/1C код на ошибки/проблемы (syntax/logic/performance). ' +
						'Использовать, когда есть конкретный фрагмент кода.',
					inputSchema: {
						type: 'object',
						title: 'Check 1C code',
						description: 'Проверяет присланный BSL/1C код на ошибки/проблемы.',
						properties: {
							code: {
								type: 'string',
								title: 'Code',
								description: 'Проверяемый код (желательно компактный фрагмент).',
								minLength: minLen,
								maxLength: maxLen
							},
							check_type: {
								type: 'string',
								title: 'Check type',
								description: 'Тип проверки.',
								enum: ['syntax', 'logic', 'performance'],
								default: 'syntax'
							}
						},
						required: ['code']
					}
				}
			]
		};
	}

	/**
	 * Вызывает tool и возвращает MCP content[].
	 */
	async toolsCall(
		name: string,
		args: Record<string, unknown>,
		sessionId?: string
	): Promise<ToolsCallResult> {
		if (!this.client.hasToken()) {
			return textResult(
				'Ошибка конфигурации: укажите токен API 1С:Напарник в настройках (metadataViewer.onecAiAccessToken)'
			);
		}

		try {
			if (name === 'ask_1c_ai') {
				return await this.handleAsk1cAi(args, sessionId);
			}
			if (name === 'explain_1c_syntax') {
				return await this.handleExplainSyntax(args, sessionId);
			}
			if (name === 'check_1c_code') {
				return await this.handleCheckCode(args, sessionId);
			}
		} catch (e) {
			if (e instanceof ApiError) {
				return textResult(`Ошибка при обращении к 1С.ai: ${e.message}`);
			}
			throw e;
		}
		throw new ToolNotFoundError(name);
	}

	private async handleAsk1cAi(
		args: Record<string, unknown>,
		sessionId?: string
	): Promise<ToolsCallResult> {
		const question = String(args.question || '').trim();
		const programmingLanguage = String(args.programming_language || '').trim() || undefined;
		const createNewSession = Boolean(args.create_new_session);

		if (!question) {
			return textResult('Ошибка: Вопрос не может быть пустым');
		}

		const prepared = prepareMessageForUpstream(buildResponseInstruction(question));
		const convId = await this.resolveConversation(sessionId, createNewSession, programmingLanguage);
		const answer = await this.client.sendMessageFull(convId, prepared.text);
		const clean = sanitizeText(answer);
		return textResult(
			`Ответ от 1С.ai:\n\n${clean}\n\nСессия: ${sessionId || '-'}\nРазговор: ${convId}`
		);
	}

	private async handleExplainSyntax(
		args: Record<string, unknown>,
		sessionId?: string
	): Promise<ToolsCallResult> {
		const syntaxElement = String(args.syntax_element || '').trim();
		const context = String(args.context || '').trim();
		if (!syntaxElement) {
			return textResult('Ошибка: Элемент синтаксиса не может быть пустым');
		}
		let question = `Объясни синтаксис и использование: ${syntaxElement}`;
		if (context) {
			question += ` в контексте: ${context}`;
		}
		const prepared = prepareMessageForUpstream(question);
		const convId = await this.resolveConversation(sessionId, false);
		const answer = await this.client.sendMessageFull(convId, prepared.text);
		const clean = sanitizeText(answer);
		return textResult(
			`Объяснение синтаксиса '${syntaxElement}':\n\n${clean}\n\nСессия: ${sessionId || '-'}\nРазговор: ${convId}`
		);
	}

	private async handleCheckCode(
		args: Record<string, unknown>,
		sessionId?: string
	): Promise<ToolsCallResult> {
		const code = String(args.code || '').trim();
		const checkType = String(args.check_type || 'syntax').trim();
		if (!code) {
			return textResult('Ошибка: Код для проверки не может быть пустым');
		}
		const checkDescriptions: Record<string, string> = {
			syntax: 'синтаксические ошибки',
			logic: 'логические ошибки и потенциальные проблемы',
			performance: 'проблемы производительности и оптимизации'
		};
		const checkDesc = checkDescriptions[checkType] || 'ошибки';
		const question = `Проверь этот код 1С на ${checkDesc} и дай рекомендации:\n\n\`\`\`1c\n${code}\n\`\`\``;
		const prepared = prepareMessageForUpstream(question);
		const convId = await this.resolveConversation(sessionId, false);
		const answer = await this.client.sendMessageFull(convId, prepared.text);
		const clean = sanitizeText(answer);
		return textResult(
			`Проверка кода на ${checkDesc}:\n\n${clean}\n\nСессия: ${sessionId || '-'}\nРазговор: ${convId}`
		);
	}

	private async resolveConversation(
		sessionId: string | undefined,
		createNew: boolean,
		programmingLanguage?: string
	): Promise<string> {
		let convId: string | undefined;
		if (sessionId) {
			this.store.getOrCreate(sessionId);
			convId = this.store.getConversation(sessionId);
		}
		if (createNew || !convId) {
			convId = await this.client.createConversation(programmingLanguage);
			if (sessionId) {
				this.store.setConversation(sessionId, convId);
			}
		}
		return convId;
	}
}

function textResult(text: string): ToolsCallResult {
	return { content: [{ type: 'text', text }] };
}

/**
 * Модели запросов/ответов API 1С:Напарник (code.1c.ai).
 * Порт D:/Docker/app/MCPServer1C/mcpserver/1c-ai/onec_models.py
 */

/** Запрос на создание дискуссии. */
export interface ConversationRequest {
	is_chat: boolean;
	programming_language: string;
	skill_name: string;
	ui_language: string;
}

/** Ответ создания дискуссии. */
export interface ConversationResponse {
	uuid: string;
}

/** Состояние локальной сессии дискуссии. */
export interface ConversationSession {
	conversation_id: string;
	created_at: number;
	last_used: number;
	messages_count: number;
}

/**
 * Ошибка HTTP/API 1С:Напарник.
 */
export class ApiError extends Error {
	statusCode?: number;

	constructor(message: string, statusCode?: number) {
		super(message);
		this.name = 'ApiError';
		this.statusCode = statusCode;
	}
}

/**
 * Тело сообщения пользователя в chat_api.
 */
export function messageRequestFromInstruction(
	instruction: string,
	parentUuid?: string | null
): {
	content: { content: { instruction: string }; tools: null };
	parent_uuid: string | null;
	role: string;
} {
	return {
		content: {
			content: { instruction },
			tools: null
		},
		parent_uuid: parentUuid ?? null,
		role: 'user'
	};
}

/**
 * Создаёт запись сессии дискуссии.
 */
export function createConversationSession(conversationId: string): ConversationSession {
	const now = Date.now();
	return {
		conversation_id: conversationId,
		created_at: now,
		last_used: now,
		messages_count: 0
	};
}

/**
 * Обновляет время использования сессии.
 */
export function updateSessionUsage(session: ConversationSession): void {
	session.last_used = Date.now();
	session.messages_count += 1;
}

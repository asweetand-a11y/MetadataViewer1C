/**
 * Утилиты текста для 1С:Напарник и MCP tools.
 * Порт text_utils.py и sanitize_text из streaming.py эталона MCPServer1C.
 */

export const ONEC_AI_INPUT_MAX_LENGTH = 100000;
export const MCP_TOOL_INPUT_MIN_LENGTH = 4;
export const MCP_TOOL_INPUT_MAX_LENGTH = 100000;

/**
 * Оборачивает вопрос инструкцией «вернуть только финальный ответ» (tool ask_1c_ai).
 */
export function buildResponseInstruction(question: string): string {
	return `${question}

Верни только финальный ответ для пользователя.
Не добавляй рассуждения, планы, скрытые мысли, теги <thinking> и служебные пояснения.
Если не можешь дать ответ — верни краткое сообщение об ошибке.`;
}

/**
 * Обрезает текст до maxLength. Возвращает признак обрезки.
 */
export function truncateText(text: string, maxLength: number): { text: string; truncated: boolean } {
	if (!text || text.length <= maxLength) {
		return { text, truncated: false };
	}
	return { text: text.slice(0, maxLength), truncated: true };
}

/**
 * Готовит сообщение к отправке в code.1c.ai с лимитом длины.
 */
export function prepareMessageForUpstream(
	message: string,
	maxLength: number = ONEC_AI_INPUT_MAX_LENGTH
): { text: string; truncated: boolean } {
	const { truncated } = truncateText(message, maxLength);
	if (!truncated) {
		return { text: message, truncated: false };
	}

	const truncationNotice =
		`\n\n[TRUNCATED: Original message length was ${message.length} characters, ` +
		`truncated to ${maxLength} characters]`;
	const availableLength = maxLength - truncationNotice.length;
	if (availableLength > 0) {
		return { text: message.slice(0, availableLength) + truncationNotice, truncated: true };
	}
	return { text: message.slice(0, maxLength), truncated: true };
}

/**
 * Нормализует ответ модели: снимает thinking-теги и управляющие символы.
 */
export function sanitizeText(text: string): string {
	if (!text) {
		return text;
	}
	let result = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
	result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');
	result = result.replace(/\u0000/g, '');
	try {
		result = result.normalize('NFKC');
	} catch {
		// ignore
	}
	let cleaned = '';
	for (const ch of result) {
		const code = ch.charCodeAt(0);
		const isControl = (code < 32 && ch !== '\n' && ch !== '\r' && ch !== '\t') || (code >= 127 && code <= 159);
		if (!isControl) {
			cleaned += ch;
		}
	}
	return cleaned;
}

/**
 * Удаляет блоки <thinking> и нулевые байты.
 */
export function sanitizeModelOutput(raw: string): string {
	if (!raw) {
		return '';
	}
	return raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').replace(/\u0000/g, '');
}

/**
 * Удаляет блоки <think>.
 */
export function sanitizeModelOutputThink(raw: string): string {
	if (!raw) {
		return '';
	}
	return raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
}

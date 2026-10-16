/**
 * HTTP-клиент API 1С:Напарник (code.1c.ai): дискуссии и SSE-сообщения.
 * Порт D:/Docker/app/MCPServer1C/mcpserver/1c-ai/onec_client.py
 */

import {
	ApiError,
	ConversationRequest,
	ConversationResponse,
	ConversationSession,
	createConversationSession,
	messageRequestFromInstruction,
	updateSessionUsage
} from './oneCAiModels';
import { sanitizeModelOutput, sanitizeModelOutputThink } from './textUtils';

export const ONEC_AI_BASE_URL = 'https://code.1c.ai';
export const SESSION_TTL_MS = 3600 * 1000;
export const MAX_ACTIVE_SESSIONS = 300;
/** Таймаут TCP/TLS-соединения (как connect в httpx). */
export const CONNECT_TIMEOUT_MS = 30_000;
/** Полное ожидание JSON-ответа (создание дискуссии). Read в эталоне не ограничен 30 с. */
export const REQUEST_TIMEOUT_MS = 90_000;
/** Верхняя граница ожидания полного SSE-ответа для UI. */
export const SSE_TOTAL_TIMEOUT_MS = 120_000;
export const REASONING_ONLY_ERROR =
	'Ошибка: получены только рассуждения модели без итогового ответа';

const USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/620.1 (KHTML, like Gecko) JavaFX/22 Safari/620.1';

interface StreamUpdate {
	text: string;
	finished: boolean;
	message_id?: string | null;
	had_tool_calls: boolean;
}

/**
 * Извлекает текст из вложенных структур ответа API.
 */
function flattenText(value: unknown): string {
	if (value === null || value === undefined) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(flattenText).join('');
	}
	if (typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		for (const key of ['text', 'content', 'output_text', 'delta']) {
			if (key in obj) {
				const t = flattenText(obj[key]);
				if (t) {
					return t;
				}
			}
		}
		return Object.values(obj).map(flattenText).join('');
	}
	return String(value);
}

/**
 * Достаёт текст ответа, пропуская reasoning-события.
 */
function extractAnswerText(payload: unknown, eventType?: string | null): string {
	if (payload === null || payload === undefined) {
		return '';
	}
	if (eventType && eventType.toLowerCase().includes('reason')) {
		return '';
	}
	if (typeof payload === 'string') {
		return payload;
	}
	if (Array.isArray(payload)) {
		return payload.map((it) => extractAnswerText(it, eventType)).join('');
	}
	if (typeof payload === 'object') {
		const obj = payload as Record<string, unknown>;
		const typeVal = String(obj.type || '').toLowerCase();
		if (typeVal === 'output_text' || typeVal === 'text') {
			return flattenText(obj.text);
		}
		for (const key of ['output_text', 'text', 'content', 'delta']) {
			const t = flattenText(obj[key]);
			if (t) {
				return t;
			}
		}
		return flattenText(obj.message) + flattenText(obj.response) + flattenText(obj.output);
	}
	return '';
}

/**
 * Достаёт текст рассуждений модели.
 */
function extractReasoningText(payload: unknown, eventType?: string | null): string {
	if (payload === null || payload === undefined) {
		return '';
	}
	if (typeof payload === 'string') {
		return eventType && eventType.toLowerCase().includes('reason') ? payload : '';
	}
	if (Array.isArray(payload)) {
		return payload.map((it) => extractReasoningText(it, eventType)).join('');
	}
	if (typeof payload === 'object') {
		const obj = payload as Record<string, unknown>;
		const typeVal = String(obj.type || '').toLowerCase();
		if (typeVal === 'reasoning' || typeVal === 'reasoning_text') {
			return flattenText(obj.text);
		}
		for (const key of ['reasoning_content', 'reasoning']) {
			const t = flattenText(obj[key]);
			if (t) {
				return t;
			}
		}
		if (eventType && eventType.toLowerCase().includes('reason')) {
			return flattenText(obj.delta) || flattenText(obj.text);
		}
		return flattenText(obj.message) + flattenText(obj.response) + flattenText(obj.output);
	}
	return '';
}

/**
 * Клиент chat_api 1С:Напарник.
 */
export class OneCApiClient {
	baseUrl = ONEC_AI_BASE_URL;
	private token = '';
	private sessions = new Map<string, ConversationSession>();
	uiLanguage = 'russian';
	programmingLanguage = '';

	/**
	 * Обновляет токен (и при необходимости базовый URL) из настроек расширения.
	 */
	applyRuntimeSettings(token: string, baseUrl?: string): void {
		this.token = (token || '').trim();
		if (baseUrl && baseUrl.trim()) {
			this.baseUrl = baseUrl.trim().replace(/\/+$/, '');
		} else {
			this.baseUrl = ONEC_AI_BASE_URL;
		}
	}

	hasToken(): boolean {
		return this.token.length > 0;
	}

	/**
	 * Создаёт новую дискуссию и запоминает её uuid.
	 */
	async createConversation(programmingLanguage?: string | null): Promise<string> {
		const requestData: ConversationRequest = {
			is_chat: true,
			skill_name: 'raw',
			ui_language: this.uiLanguage,
			programming_language: programmingLanguage || this.programmingLanguage
		};
		const url = `${this.baseUrl}/chat_api/v1/conversations/`;
		const { status, json } = await this.postJson(url, requestData, { 'Session-Id': '' }, REQUEST_TIMEOUT_MS);
		if (status !== 200) {
			throw new ApiError(`Conversation create error: ${status}`, status);
		}
		const conv = json as ConversationResponse;
		if (!conv?.uuid) {
			throw new ApiError('Conversation create error: empty uuid', status);
		}
		this.sessions.set(conv.uuid, createConversationSession(conv.uuid));
		return conv.uuid;
	}

	/**
	 * Отправляет сообщение и возвращает полный текст ответа.
	 * Один retry при tool_calls без итогового ответа.
	 */
	async sendMessageFull(
		conversationId: string,
		message: string,
		parentUuid?: string | null,
		retryCount = 0
	): Promise<string> {
		let finalText = '';
		let hadToolCalls = false;
		for await (const update of this.iterMessageStream(conversationId, message, parentUuid)) {
			finalText = update.text || finalText;
			hadToolCalls = update.had_tool_calls || hadToolCalls;
		}
		const result = (finalText || '').trim();
		if (retryCount === 0 && hadToolCalls && (!result || result === REASONING_ONLY_ERROR)) {
			const newConvId = await this.createConversation();
			return this.sendMessageFull(newConvId, message, parentUuid, 1);
		}
		return result;
	}

	/**
	 * Возвращает активную дискуссию или создаёт новую.
	 */
	async getOrCreateSession(createNew = false, programmingLanguage?: string | null): Promise<string> {
		this.cleanupOldSessions();
		if (createNew || this.sessions.size === 0) {
			return this.createConversation(programmingLanguage);
		}
		if (this.sessions.size >= MAX_ACTIVE_SESSIONS) {
			let oldestId: string | undefined;
			let oldestTime = Number.POSITIVE_INFINITY;
			for (const [id, sess] of this.sessions) {
				if (sess.last_used < oldestTime) {
					oldestTime = sess.last_used;
					oldestId = id;
				}
			}
			if (oldestId) {
				this.sessions.delete(oldestId);
			}
		}
		let recentId = '';
		let recentTime = 0;
		for (const [id, sess] of this.sessions) {
			if (sess.last_used >= recentTime) {
				recentTime = sess.last_used;
				recentId = id;
			}
		}
		return recentId;
	}

	/**
	 * Читает SSE-поток сообщений дискуссии.
	 */
	private async *iterMessageStream(
		conversationId: string,
		message: string,
		parentUuid?: string | null
	): AsyncGenerator<StreamUpdate> {
		if (!this.sessions.has(conversationId)) {
			this.sessions.set(conversationId, createConversationSession(conversationId));
		}
		updateSessionUsage(this.sessions.get(conversationId)!);

		const payload = messageRequestFromInstruction(message, parentUuid);
		const url = `${this.baseUrl}/chat_api/v1/conversations/${conversationId}/messages`;

		let accumulatedAnswer = '';
		let accumulatedReasoning = '';
		let hadToolCalls = false;
		let messageId: string | null = null;
		let stopped = false;

		const processEvent = (data: Record<string, unknown>, eventType: string | null): StreamUpdate | null => {
			let deltaAnswer = '';
			let deltaReasoning = '';
			let shouldStop = false;

			const cd = data.content_delta && typeof data.content_delta === 'object'
				? (data.content_delta as Record<string, unknown>)
				: null;
			if (cd && cd.tool_calls) {
				hadToolCalls = true;
			}
			if (cd) {
				deltaAnswer = sanitizeModelOutputThink(sanitizeModelOutput(extractAnswerText(cd, eventType)));
				deltaReasoning = extractReasoningText(cd, eventType);
			}

			const cnt = data.content;
			if (cnt && typeof cnt === 'object') {
				const fa = sanitizeModelOutputThink(
					sanitizeModelOutput(extractAnswerText(cnt, eventType))
				);
				if (fa && fa.length > deltaAnswer.length) {
					deltaAnswer = fa;
				}
				const fr = extractReasoningText(cnt, eventType);
				if (fr) {
					deltaReasoning = fr;
				}
			}

			const choices = Array.isArray(data.choices) ? data.choices : [];
			for (const choice of choices) {
				if (!choice || typeof choice !== 'object') {
					continue;
				}
				const ch = choice as Record<string, unknown>;
				if (ch.finish_reason) {
					shouldStop = true;
				}
				for (const key of ['delta', 'message']) {
					const d = ch[key];
					if (d && typeof d === 'object') {
						const da = sanitizeModelOutputThink(
							sanitizeModelOutput(extractAnswerText(d, eventType))
						);
						if (da) {
							deltaAnswer += da;
						}
						const dr = extractReasoningText(d, eventType);
						if (dr) {
							deltaReasoning += dr;
						}
						const ma = extractAnswerText(d, eventType);
						if (ma && ma.length > deltaAnswer.length) {
							deltaAnswer = ma;
						}
					}
				}
			}

			if (!('content_delta' in data) && !('content' in data) && !('choices' in data)) {
				const da = sanitizeModelOutputThink(
					sanitizeModelOutput(extractAnswerText(data, eventType))
				);
				if (da) {
					deltaAnswer += da;
				}
				const dr = extractReasoningText(data, eventType);
				if (dr) {
					deltaReasoning += dr;
				}
				const resp = data.response;
				if (resp && typeof resp === 'object' && 'output' in (resp as object)) {
					const output = (resp as { output?: unknown[] }).output || [];
					for (const item of output) {
						if (item && typeof item === 'object') {
							const content = (item as { content?: unknown[] }).content || [];
							for (const c of content) {
								if (c && typeof c === 'object' && (c as { type?: string }).type === 'output_text') {
									const t = flattenText((c as { text?: unknown }).text);
									if (t) {
										deltaAnswer = sanitizeModelOutputThink(sanitizeModelOutput(t));
									}
								}
							}
						}
					}
				}
			}

			if (data.role === 'assistant' && data.finished) {
				shouldStop = true;
			}
			if (data.uuid) {
				messageId = String(data.uuid);
			}

			accumulatedAnswer += deltaAnswer;
			accumulatedReasoning += deltaReasoning;
			if (accumulatedAnswer) {
				return {
					text: accumulatedAnswer,
					finished: shouldStop,
					message_id: messageId,
					had_tool_calls: hadToolCalls
				};
			}
			if (shouldStop) {
				stopped = true;
			}
			return shouldStop
				? {
						text: accumulatedAnswer,
						finished: true,
						message_id: messageId,
						had_tool_calls: hadToolCalls
				  }
				: null;
		};

		const updates: StreamUpdate[] = [];
		await this.postSse(url, payload, (eventType, data) => {
			if (stopped) {
				return;
			}
			const update = processEvent(data, eventType);
			if (update) {
				updates.push(update);
				if (update.finished) {
					stopped = true;
				}
			}
		});

		for (const u of updates) {
			yield u;
		}

		if (!accumulatedAnswer.trim() && accumulatedReasoning) {
			yield {
				text: REASONING_ONLY_ERROR,
				finished: true,
				message_id: messageId,
				had_tool_calls: hadToolCalls
			};
		}
	}

	private cleanupOldSessions(): void {
		const now = Date.now();
		for (const [id, sess] of this.sessions) {
			if (now - sess.last_used > SESSION_TTL_MS) {
				this.sessions.delete(id);
			}
		}
	}

	private commonHeaders(extra?: Record<string, string>): Record<string, string> {
		return {
			Accept: '*/*',
			'Accept-Charset': 'utf-8',
			'Accept-Language': 'ru-ru,en-us;q=0.8,en;q=0.7',
			Authorization: this.token,
			'Content-Type': 'application/json; charset=utf-8',
			Origin: this.baseUrl,
			Referer: `${this.baseUrl}/chat/`,
			'User-Agent': USER_AGENT,
			...(extra || {})
		};
	}

	private async postJson(
		urlStr: string,
		body: unknown,
		extraHeaders: Record<string, string>,
		timeoutMs: number
	): Promise<{ status: number; json: unknown; text: string }> {
		try {
			const res = await this.fetchWithTimeout(
				urlStr,
				{
					method: 'POST',
					headers: this.commonHeaders(extraHeaders),
					body: JSON.stringify(body)
				},
				timeoutMs
			);
			const text = await res.text();
			let json: unknown;
			try {
				json = text ? JSON.parse(text) : undefined;
			} catch {
				json = undefined;
			}
			return { status: res.status, json, text };
		} catch (err) {
			throw this.wrapNetworkError(err, 'creating conversation', timeoutMs);
		}
	}

	/**
	 * POST с разбором SSE: event:/data: и пустая строка как граница события.
	 */
	private async postSse(
		urlStr: string,
		body: unknown,
		onEvent: (eventType: string | null, data: Record<string, unknown>) => void
	): Promise<void> {
		let res: Response;
		try {
			res = await this.fetchWithTimeout(
				urlStr,
				{
					method: 'POST',
					headers: this.commonHeaders({ Accept: 'text/event-stream' }),
					body: JSON.stringify(body)
				},
				SSE_TOTAL_TIMEOUT_MS
			);
		} catch (err) {
			throw this.wrapNetworkError(err, 'sending message', SSE_TOTAL_TIMEOUT_MS);
		}

		if (res.status !== 200) {
			throw new ApiError(`Message send error: ${res.status}`, res.status);
		}

		const reader = res.body?.getReader();
		if (!reader) {
			throw new ApiError('Message send error: empty stream', res.status);
		}

		const decoder = new TextDecoder('utf-8');
		let buffer = '';
		let currentDataLines: string[] = [];
		let currentEventType: string | null = null;

		const flushEvent = () => {
			if (currentDataLines.length === 0) {
				currentEventType = null;
				return;
			}
			const dataStr = currentDataLines.join('\n');
			currentDataLines = [];
			if (dataStr.trim() === '[DONE]') {
				currentEventType = null;
				return;
			}
			try {
				const data = JSON.parse(dataStr) as Record<string, unknown>;
				onEvent(currentEventType, data);
			} catch {
				// skip malformed chunk
			}
			currentEventType = null;
		};

		const handleLine = (line: string) => {
			if (!line) {
				flushEvent();
				return;
			}
			if (line.startsWith('event:')) {
				if (currentDataLines.length) {
					flushEvent();
				}
				currentEventType = line.slice(6).trim() || null;
				return;
			}
			if (line.startsWith('data:')) {
				if (currentDataLines.length && !currentEventType) {
					flushEvent();
				}
				currentDataLines.push(line.slice(5).trimStart());
			}
		};

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}
				buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
				let idx: number;
				while ((idx = buffer.indexOf('\n')) >= 0) {
					const line = buffer.slice(0, idx);
					buffer = buffer.slice(idx + 1);
					handleLine(line);
				}
			}
			buffer += decoder.decode();
			if (buffer) {
				handleLine(buffer);
			}
			flushEvent();
		} catch (err) {
			throw this.wrapNetworkError(err, 'sending message', SSE_TOTAL_TIMEOUT_MS);
		} finally {
			try {
				reader.releaseLock();
			} catch {
				// ignore
			}
		}
	}

	/**
	 * fetch с общим дедлайном. Сокет не рвём через 30 с inactivity, как в эталоне httpx read=None.
	 */
	private async fetchWithTimeout(urlStr: string, init: RequestInit, timeoutMs: number): Promise<Response> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			return await fetch(urlStr, {
				...init,
				redirect: 'follow',
				signal: controller.signal
			});
		} finally {
			clearTimeout(timer);
		}
	}

	private wrapNetworkError(err: unknown, action: string, timeoutMs: number): ApiError {
		const name = err && typeof err === 'object' && 'name' in err ? String((err as { name?: string }).name) : '';
		const message = err instanceof Error ? err.message : String(err);
		if (name === 'AbortError' || /aborted|timeout/i.test(message)) {
			return new ApiError(
				`Network timeout ${action} (${Math.round(timeoutMs / 1000)} с). Проверьте доступность ${this.baseUrl}`
			);
		}
		return new ApiError(`Network error ${action}: ${message}`);
	}
}

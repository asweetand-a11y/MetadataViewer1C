/**
 * Хранилище MCP-сессий и связь session_id → conversation_id.
 * Порт D:/Docker/app/MCPServer1C/mcpserver/1c-ai/mcp/session.py
 */

import { randomBytes } from 'crypto';

export interface McpSession {
	session_id: string;
	protocol_version: string;
	created: number;
	last_seen: number;
	conversation_id?: string;
}

/**
 * In-memory store MCP-сессий с TTL.
 */
export class McpSessionStore {
	private sessions = new Map<string, McpSession>();

	constructor(private ttlSeconds = 3600) {}

	create(protocolVersion: string): McpSession {
		const sessionId = generateSessionId();
		return this.createWithId(sessionId, protocolVersion);
	}

	/**
	 * Создаёт или возвращает сессию с фиксированным id (для @gen).
	 */
	createWithId(sessionId: string, protocolVersion = ''): McpSession {
		const now = Date.now();
		const sess: McpSession = {
			session_id: sessionId,
			protocol_version: protocolVersion,
			created: now,
			last_seen: now
		};
		this.sessions.set(sessionId, sess);
		return sess;
	}

	get(sessionId: string): McpSession | undefined {
		const sess = this.sessions.get(sessionId);
		if (!sess) {
			return undefined;
		}
		if (this.expired(sess)) {
			this.sessions.delete(sessionId);
			return undefined;
		}
		sess.last_seen = Date.now();
		return sess;
	}

	getOrCreate(sessionId: string): McpSession {
		return this.get(sessionId) ?? this.createWithId(sessionId);
	}

	getConversation(sessionId: string): string | undefined {
		return this.get(sessionId)?.conversation_id;
	}

	setConversation(sessionId: string, conversationId: string): boolean {
		const sess = this.get(sessionId);
		if (!sess) {
			return false;
		}
		sess.conversation_id = conversationId;
		return true;
	}

	private expired(sess: McpSession): boolean {
		return Date.now() - sess.last_seen > this.ttlSeconds * 1000;
	}
}

/**
 * Генерирует ASCII session id (hex UUID).
 */
export function generateSessionId(): string {
	return randomBytes(16).toString('hex');
}

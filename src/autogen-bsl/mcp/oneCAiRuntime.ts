/**
 * Singleton рантайма встроенного MCP 1С:Напарник: клиент API, сессии, handlers.
 */

import * as vscode from 'vscode';
import { OneCApiClient } from './oneCAiApiClient';
import { McpSessionStore } from './mcpSession';
import { McpHandlers } from './mcpTools';

let client: OneCApiClient | undefined;
let store: McpSessionStore | undefined;
let handlers: McpHandlers | undefined;

/**
 * Возвращает общий экземпляр MCP-обработчиков (создаёт при первом вызове).
 */
export function getMcpHandlers(): McpHandlers {
	if (!handlers) {
		client = new OneCApiClient();
		store = new McpSessionStore(3600);
		handlers = new McpHandlers(client, store);
	}
	applyTokenFromSettings();
	return handlers;
}

/**
 * Читает токен API 1С:Напарник из настроек расширения.
 */
export function applyTokenFromSettings(): void {
	if (!client) {
		return;
	}
	const token = vscode.workspace.getConfiguration('metadataViewer').get<string>('onecAiAccessToken', '') || '';
	client.applyRuntimeSettings(token);
}

/**
 * Стабильный id сессии для генерации `// @gen` (повторное использование дискуссии).
 */
export const AUTOGEN_MCP_SESSION_ID = 'autogen-bsl';

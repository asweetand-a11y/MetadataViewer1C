import * as vscode from 'vscode';
import { outputChannel } from '../../extension';
import { AUTOGEN_MCP_SESSION_ID, getMcpHandlers } from '../mcp/oneCAiRuntime';

/**
 * Клиент генерации через встроенный MCP 1С:Напарник.
 * Вызывает tool ask_1c_ai напрямую (без ~/.cursor/mcp.json).
 */
export class MCPClient {
	/**
	 * Задать вопрос 1С:Напарнику через встроенный tool ask_1c_ai.
	 */
	async ask1cAi(question: string, options?: { create_new_session?: boolean }): Promise<unknown> {
		const token = vscode.workspace
			.getConfiguration('metadataViewer')
			.get<string>('onecAiAccessToken', '');
		if (!token || !token.trim()) {
			throw new Error(
				'Укажите токен API 1С:Напарник в настройках расширения (metadataViewer.onecAiAccessToken)'
			);
		}

		this.debug('[MCPClient] tools/call ask_1c_ai (встроенный MCP)');
		const handlers = getMcpHandlers();
		return handlers.toolsCall(
			'ask_1c_ai',
			{
				question,
				programming_language: 'BSL',
				create_new_session: options?.create_new_session ?? false
			},
			AUTOGEN_MCP_SESSION_ID
		);
	}

	private debug(message: string): void {
		const debugMode = vscode.workspace.getConfiguration().get<boolean>('metadataViewer.debugMode', false);
		if (!debugMode) {
			return;
		}
		outputChannel.appendLine(message);
	}
}

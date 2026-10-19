/**
 * Встроенный Streamable HTTP MCP: POST /mcp на 127.0.0.1.
 * Порт D:/Docker/app/MCPServer1C/mcpserver/1c-ai/mcp/http_transport.py (без gateway auth).
 */

import * as http from 'http';
import * as vscode from 'vscode';
import { applyTokenFromSettings, getMcpHandlers } from './oneCAiRuntime';
import { ToolNotFoundError } from './mcpTools';

export const EMBEDDED_MCP_PROVIDER_ID = 'metadataViewer.onecAi';
export const EMBEDDED_MCP_SERVER_LABEL = '1c-ai';

let server: http.Server | undefined;
let listenPort: number | undefined;
let configSub: vscode.Disposable | undefined;

/**
 * Результат запуска встроенного MCP HTTP.
 */
export interface EmbeddedMcpHandle {
	port: number;
	url: string;
	dispose(): Promise<void>;
}

/**
 * Поднимает HTTP MCP на свободном порту localhost и регистрирует provider IDE при наличии API.
 */
export async function startEmbeddedMcpServer(
	context: vscode.ExtensionContext
): Promise<EmbeddedMcpHandle> {
	getMcpHandlers();
	applyTokenFromSettings();

	if (!configSub) {
		configSub = vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('metadataViewer.onecAiAccessToken')) {
				applyTokenFromSettings();
			}
			if (e.affectsConfiguration('metadataViewer.onecAiMcpPort')) {
				void restartOnPortChange(context);
			}
		});
		context.subscriptions.push(configSub);
	}

	const handle = await listenLoopback(getConfiguredPort());
	context.subscriptions.push({ dispose: () => { void handle.dispose(); } });
	registerMcpDefinitionProvider(context, () =>
		listenPort ? `http://127.0.0.1:${listenPort}/mcp` : undefined
	);
	logMcp(`[1c-ai MCP] Встроенный сервер: ${handle.url}`);
	return handle;
}

/**
 * Останавливает HTTP-сервер.
 */
export async function stopEmbeddedMcpServer(): Promise<void> {
	const s = server;
	server = undefined;
	listenPort = undefined;
	if (!s) {
		return;
	}
	await new Promise<void>((resolve) => {
		s.close(() => resolve());
	});
}

function getConfiguredPort(): number {
	const port = vscode.workspace.getConfiguration('metadataViewer').get<number>('onecAiMcpPort', 17880);
	if (!Number.isFinite(port) || port < 0 || port > 65535) {
		return 17880;
	}
	return Math.floor(port);
}

async function restartOnPortChange(context: vscode.ExtensionContext): Promise<void> {
	await stopEmbeddedMcpServer();
	try {
		const handle = await listenLoopback(getConfiguredPort());
		context.subscriptions.push({ dispose: () => { void handle.dispose(); } });
		logMcp(`[1c-ai MCP] Сервер перезапущен: ${handle.url}`);
	} catch (error) {
		logMcp(`[1c-ai MCP] Не удалось перезапустить сервер: ${error}`);
	}
}

function listenLoopback(port: number): Promise<EmbeddedMcpHandle> {
	return new Promise((resolve, reject) => {
		const s = http.createServer((req, res) => {
			void handleRequest(req, res);
		});
		s.on('error', (err: NodeJS.ErrnoException) => {
			if (err.code === 'EADDRINUSE') {
				reject(
					new Error(
						`Порт ${port} занят. Освободите его или смените metadataViewer.onecAiMcpPort`
					)
				);
				return;
			}
			reject(err);
		});
		s.listen(port, '127.0.0.1', () => {
			const addr = s.address();
			if (!addr || typeof addr === 'string') {
				reject(new Error('Не удалось получить порт MCP-сервера'));
				return;
			}
			server = s;
			listenPort = addr.port;
			const url = `http://127.0.0.1:${addr.port}/mcp`;
			resolve({
				port: addr.port,
				url,
				dispose: () => stopEmbeddedMcpServer()
			});
		});
	});
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
	const url = req.url || '/';
	const path = url.split('?')[0];

	if (req.method === 'OPTIONS' && path === '/mcp') {
		res.statusCode = 204;
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.setHeader(
			'Access-Control-Allow-Headers',
			'Content-Type, Accept, MCP-Session-Id, mcp-session-id, MCP-Protocol-Version'
		);
		res.setHeader('Access-Control-Expose-Headers', 'MCP-Session-Id, mcp-session-id');
		res.end();
		return;
	}

	if (req.method === 'GET' && path === '/mcp') {
		json(res, 200, {
			name: 'code.1c.ai Gateway MCP',
			version: '1.0.0',
			endpoint: '/mcp'
		});
		return;
	}

	if (req.method !== 'POST' || path !== '/mcp') {
		json(res, 404, { error: 'Not found' });
		return;
	}

	let payload: Record<string, unknown>;
	try {
		const raw = await readBody(req);
		payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
		if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
			json(res, 400, rpcError(null, -32600, 'Request body must be a single JSON-RPC object (dict).'));
			return;
		}
	} catch {
		json(res, 400, rpcError(null, -32600, 'Invalid JSON.'));
		return;
	}

	const isRequest = typeof payload.method === 'string';
	const hasId = payload.id !== undefined && payload.id !== null;
	const isNotification = isRequest && !hasId;
	const isResponseFromClient = ('result' in payload || 'error' in payload) && !isRequest;

	if (isResponseFromClient || (isNotification && payload.method !== 'initialize')) {
		res.statusCode = 202;
		res.end();
		return;
	}

	if (!isRequest) {
		json(res, 400, rpcError(null, -32600, 'Unsupported JSON-RPC message type.'));
		return;
	}

	const method = String(payload.method);
	const reqId = payload.id as string | number | null;
	const handlers = getMcpHandlers();
	applyTokenFromSettings();

	if (method === 'initialize') {
		const sess = handlers.store.create('');
		const params = (payload.params || {}) as { protocolVersion?: string };
		const result = handlers.initialize(params.protocolVersion || '');
		json(res, 200, { jsonrpc: '2.0', id: reqId, result }, { 'MCP-Session-Id': sess.session_id });
		return;
	}

	if (method === 'initialized') {
		if (reqId === null || reqId === undefined) {
			res.statusCode = 202;
			res.end();
			return;
		}
		json(res, 200, rpcError(reqId, -32600, "'initialized' must be sent as a notification"));
		return;
	}

	const sessionId = String(req.headers['mcp-session-id'] || '');
	if (!sessionId) {
		json(res, 400, rpcError(null, -32600, 'Missing Mcp-Session-Id header.'));
		return;
	}
	const sess = handlers.store.get(sessionId);
	if (!sess) {
		json(res, 404, { error: 'Unknown or expired session' });
		return;
	}

	if (method === 'tools/list') {
		json(res, 200, { jsonrpc: '2.0', id: reqId, result: handlers.toolsList() });
		return;
	}

	if (method === 'tools/call') {
		const params = (payload.params || {}) as { name?: string; arguments?: Record<string, unknown> };
		if (!params.name) {
			json(res, 200, rpcError(reqId, -32602, 'Invalid params for tools/call'));
			return;
		}
		try {
			const result = await handlers.toolsCall(params.name, params.arguments || {}, sessionId);
			json(res, 200, { jsonrpc: '2.0', id: reqId, result });
		} catch (e) {
			if (e instanceof ToolNotFoundError) {
				json(res, 200, rpcError(reqId, -32601, 'Tool not found', { name: params.name }));
				return;
			}
			const message = e instanceof Error ? e.message : String(e);
			json(res, 200, rpcError(reqId, -32603, message));
		}
		return;
	}

	json(res, 200, rpcError(reqId, -32601, `Method not found: ${method}`));
}

function rpcError(
	id: string | number | null,
	code: number,
	message: string,
	data?: unknown
): Record<string, unknown> {
	const err: Record<string, unknown> = { code, message };
	if (data !== undefined) {
		err.data = data;
	}
	return { jsonrpc: '2.0', id, error: err };
}

function json(
	res: http.ServerResponse,
	status: number,
	body: unknown,
	extraHeaders?: Record<string, string>
): void {
	const data = Buffer.from(JSON.stringify(body), 'utf8');
	res.statusCode = status;
	res.setHeader('Content-Type', 'application/json; charset=utf-8');
	res.setHeader('Content-Length', String(data.length));
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Expose-Headers', 'MCP-Session-Id, mcp-session-id');
	if (extraHeaders) {
		for (const [k, v] of Object.entries(extraHeaders)) {
			res.setHeader(k, v);
		}
	}
	res.end(data);
}

function readBody(req: http.IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (c: Buffer) => chunks.push(c));
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
		req.on('error', reject);
	});
}

/**
 * Пишет в Output расширения без циклического import на уровне модуля.
 */
function logMcp(message: string): void {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const ext = require('../../extension') as { outputChannel: { appendLine: (m: string) => void } };
		ext.outputChannel.appendLine(message);
	} catch {
		console.log(message);
	}
}

/**
 * Регистрирует MCP HTTP server definition, если API есть в этой сборке Cursor/VS Code.
 */
function registerMcpDefinitionProvider(
	context: vscode.ExtensionContext,
	getUrl: () => string | undefined
): void {
	const lm = (vscode as unknown as { lm?: { registerMcpServerDefinitionProvider?: Function } }).lm;
	if (typeof lm?.registerMcpServerDefinitionProvider !== 'function') {
		return;
	}
	const Def = (vscode as unknown as { McpHttpServerDefinition?: unknown }).McpHttpServerDefinition as
		| (new (label: string, uri: vscode.Uri, headers?: Record<string, string>, version?: string) => unknown)
		| undefined;
	if (!Def) {
		return;
	}

	try {
		const disposable = lm.registerMcpServerDefinitionProvider(EMBEDDED_MCP_PROVIDER_ID, {
			provideMcpServerDefinitions: async () => {
				const url = getUrl();
				if (!url) {
					return [];
				}
				return [new Def(EMBEDDED_MCP_SERVER_LABEL, vscode.Uri.parse(url), {}, '1.0.0')];
			},
			resolveMcpServerDefinition: async (server: unknown) => server
		});
		context.subscriptions.push(disposable);
	} catch (e) {
		logMcp(`[1c-ai MCP] Регистрация MCP provider недоступна: ${e instanceof Error ? e.message : String(e)}`);
	}
}

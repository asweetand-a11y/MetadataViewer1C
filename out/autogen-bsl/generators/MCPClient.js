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
exports.MCPClient = void 0;
const vscode = __importStar(require("vscode"));
const extension_1 = require("../../extension");
const oneCAiRuntime_1 = require("../mcp/oneCAiRuntime");
/**
 * Клиент генерации через встроенный MCP 1С:Напарник.
 * Вызывает tool ask_1c_ai напрямую (без ~/.cursor/mcp.json).
 */
class MCPClient {
    /**
     * Задать вопрос 1С:Напарнику через встроенный tool ask_1c_ai.
     */
    async ask1cAi(question, options) {
        const token = vscode.workspace
            .getConfiguration('metadataViewer')
            .get('onecAiAccessToken', '');
        if (!token || !token.trim()) {
            throw new Error('Укажите токен API 1С:Напарник в настройках расширения (metadataViewer.onecAiAccessToken)');
        }
        this.debug('[MCPClient] tools/call ask_1c_ai (встроенный MCP)');
        const handlers = (0, oneCAiRuntime_1.getMcpHandlers)();
        return handlers.toolsCall('ask_1c_ai', {
            question,
            programming_language: 'BSL',
            create_new_session: options?.create_new_session ?? false
        }, oneCAiRuntime_1.AUTOGEN_MCP_SESSION_ID);
    }
    debug(message) {
        const debugMode = vscode.workspace.getConfiguration().get('metadataViewer.debugMode', false);
        if (!debugMode) {
            return;
        }
        extension_1.outputChannel.appendLine(message);
    }
}
exports.MCPClient = MCPClient;
//# sourceMappingURL=MCPClient.js.map
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
exports.BaseGenerator = void 0;
const vscode = __importStar(require("vscode"));
class BaseGenerator {
    /**
     * Вставляет сгенерированный код в документ
     */
    async insertCode(context, code) {
        const edit = new vscode.WorkspaceEdit();
        edit.insert(context.document.uri, context.position, code);
        const applied = await vscode.workspace.applyEdit(edit);
        if (applied) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.uri.toString() === context.document.uri.toString()) {
                const lines = code.split('\n');
                const newLine = context.position.line + lines.length;
                const newChar = lines.length > 1 ? lines[lines.length - 1].length : context.position.character + lines[0].length;
                const newPosition = new vscode.Position(newLine, newChar);
                editor.selection = new vscode.Selection(newPosition, newPosition);
            }
        }
        return applied;
    }
}
exports.BaseGenerator = BaseGenerator;
//# sourceMappingURL=BaseGenerator.js.map
import * as vscode from 'vscode';
import { GenerationIntent } from '../intent/IntentParser';

export interface GeneratorContext {
  document: vscode.TextDocument;
  position: vscode.Position;
  intent: GenerationIntent;
}

export abstract class BaseGenerator {
  abstract generate(context: GeneratorContext): string | Promise<string>;

  /**
   * Вставляет сгенерированный код в документ
   */
  async insertCode(context: GeneratorContext, code: string): Promise<boolean> {
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


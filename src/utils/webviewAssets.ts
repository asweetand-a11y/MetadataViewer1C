/**
 * URI ресурсов webview: бандл, Elements, codicons.
 */
import * as vscode from 'vscode';

export function getWebviewLocalResourceRoots(extensionUri: vscode.Uri): vscode.Uri[] {
  return [
    vscode.Uri.joinPath(extensionUri, 'media'),
    vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons'),
  ];
}

export function getCodiconStylesheetUri(webview: vscode.Webview, extensionUri: vscode.Uri): vscode.Uri {
  return webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
  );
}

export function getMetadataEditorScriptUri(webview: vscode.Webview, extensionUri: vscode.Uri): vscode.Uri {
  return webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'metadataEditor.bundle.js')
  );
}

export function getConfigWebviewScriptUri(webview: vscode.Webview, extensionUri: vscode.Uri): vscode.Uri {
  return webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'configWebview.bundle.js')
  );
}

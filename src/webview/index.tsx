/**
 * Точка входа для React приложения редактора метаданных
 */

// КРИТИЧНО: Настраиваем Monaco Environment ДО импорта компонентов, использующих Monaco
// Это предотвращает создание динамических чанков и web workers
if (typeof (window as any).MonacoEnvironment === 'undefined') {
  (window as any).MonacoEnvironment = {
    getWorkerUrl: function (moduleId: string, label: string) {
      // Возвращаем пустую строку, чтобы Monaco не пытался загружать workers динамически
      // Это предотвращает ошибки ChunkLoadError
      return '';
    },
    getWorker: function (_moduleId: string, _label: string) {
      // ВАЖНО: Monaco ожидает Worker или Promise<Worker>.
      // Возврат undefined приводит к падению внутри Monaco (undefined.then).
      // Чтобы избежать динамических чанков/worker-файлов, явно отключаем workers,
      // позволяя Monaco корректно перейти на main-thread fallback.
      throw new Error('Monaco web workers are disabled in this webview bundle');
    }
  };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { MetadataEditor } from './components/MetadataEditor';
import { FormPreviewApp } from './components/FormPreview/FormPreviewApp';
import { DcsEditorApp } from './components/DcsEditor/DcsEditorApp';
import { SimpleQueryEditor } from './components/SimpleQueryEditor';
import { StandaloneQueryEditor } from './components/StandaloneQueryEditor';
import { TemplateEditorApp } from './components/TemplateEditor/TemplateEditorApp';
import { PredefinedEditorApp } from './components/PredefinedEditor/PredefinedEditorApp';
import { RoleEditorApp } from './components/RoleEditor/RoleEditorApp';
import '../webview/styles/editor.css';

// Получаем vscode API
declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

// Инициализация React приложения
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
const appMode = (window as any).__APP_MODE__;
const App =
  appMode === 'templateEditor'
    ? TemplateEditorApp
    : appMode === 'formPreview'
      ? FormPreviewApp
      : appMode === 'dcsEditor'
        ? DcsEditorApp
        : appMode === 'queryEditor'
          ? SimpleQueryEditor
          : appMode === 'standaloneQueryEditor'
            ? StandaloneQueryEditor
              : appMode === 'predefinedEditor'
              ? PredefinedEditorApp
              : appMode === 'roleEditor'
              ? RoleEditorApp
              : MetadataEditor;

root.render(
  <React.StrictMode>
    <App vscode={vscode} />
  </React.StrictMode>
);

// КРИТИЧНО: Отправляем сообщение "webviewReady" после инициализации React
// Это позволяет extension знать, что webview готов к получению данных
// Используем requestAnimationFrame для гарантии, что React полностью отрендерился
requestAnimationFrame(() => {
  // Дополнительная задержка для гарантии, что обработчики сообщений установлены
  setTimeout(() => {
    vscode.postMessage({ type: 'webviewReady' });
  }, 50);
});


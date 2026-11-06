/**
 * Упрощенный редактор запросов для BSL-строк
 * Без автообновления полей, только редактирование текста
 */

import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { register1cQueryLanguage } from '../utils/monacoQueryLanguage';
import { attachQuerySyntaxCheck } from '../querySyntax/attachQuerySyntaxCheck';
import { completionMetadata, setCompletionMetadata } from '../queryLanguage/completion/provider';
import { applySmartInsert, dragInsertText } from '../queryLanguage/editorActions';
import type { ConfigurationModel } from '../../queryModel/model';
import { QueryMetadataTree } from './QueryWizard/QueryMetadataTree';
import { QueryStructurePanel } from './QueryWizard/QueryStructurePanel';
import '../styles/editor.css';

interface SimpleQueryEditorProps {
  vscode: any;
}

export const SimpleQueryEditor: React.FC<SimpleQueryEditorProps> = ({ vscode }) => {
  const [queryText, setQueryText] = useState('');
  const [queryModel, setQueryModel] = useState<ConfigurationModel | null>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Обработка сообщений от расширения
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      if (message.type === 'queryMetadataReady' && message.queryModel) {
        setQueryModel(message.queryModel);
        setCompletionMetadata(message.queryModel);
      }

      if (message.type === 'queryEditorInit') {
        const text = message.payload?.queryText || '';
        setQueryText(text);
        if (editorRef.current) {
          editorRef.current.setValue(text);
          editorRef.current.focus();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Создание Monaco editor
  useEffect(() => {
    if (!containerRef.current) return;

    register1cQueryLanguage();

    const editor = monaco.editor.create(containerRef.current, {
      value: queryText,
      language: '1c-query',
      theme: 'vs-dark',
      linkedEditing: true,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      fontSize: 13,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      unicodeHighlight: {
        ambiguousCharacters: false,
      },
    });

    editorRef.current = editor;
    setEditor(editor);
    const syntax = attachQuerySyntaxCheck(editor);

    const disposable = editor.onDidChangeModelContent(() => {
      setQueryText(editor.getValue());
    });

    // Горячие клавиши
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleSave();
    });

    editor.addCommand(monaco.KeyCode.Escape, () => {
      handleCancel();
    });

    editor.focus();

    return () => {
      disposable.dispose();
      syntax.dispose();
      editor.dispose();
      editorRef.current = null;
      setEditor(null);
    };
  }, []);

  const handleSave = () => {
    const text = editorRef.current?.getValue() || queryText;
    vscode.postMessage({
      type: 'saveQuery',
      payload: text,
    });
  };

  const handleCancel = () => {
    // Просто закрываем webview через команду VS Code
    vscode.postMessage({
      type: 'cancel',
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      backgroundColor: '#1e1e1e',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #3c3c3c',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#252526',
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: '#cccccc' }}>
          Редактор запроса
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3c3c3c',
              color: '#cccccc',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '6px 12px',
              backgroundColor: '#0e639c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            Сохранить (Ctrl+Enter)
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: 280, flex: 'none', minWidth: 0 }}>
          <QueryMetadataTree
            model={queryModel}
            text={queryText}
            onSmartInsert={(target) => {
              const index = completionMetadata();
              const instance = editorRef.current;
              if (index && instance) applySmartInsert(instance, target, index);
            }}
          />
        </div>
        <div
          ref={containerRef}
          style={{ flex: 1, minWidth: 0 }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const instance = editorRef.current;
            const plain = event.dataTransfer.getData('text/plain');
            const position = instance?.getPosition();
            const model = instance?.getModel();
            if (!instance || !position || !plain || !model) return;
            const offset = model.getOffsetAt(position);
            const inserted = dragInsertText(event.dataTransfer, model.getValue(), offset, plain);
            instance.executeEdits('drop', [{
              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
              text: inserted,
              forceMoveMarkers: true,
            }]);
          }}
        />
        <QueryStructurePanel text={queryText} editor={editor} />
      </div>

      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #3c3c3c',
        fontSize: '12px',
        color: '#858585',
        backgroundColor: '#252526',
      }}>
        Ctrl+Enter - Сохранить | Esc - Отмена
      </div>
    </div>
  );
};

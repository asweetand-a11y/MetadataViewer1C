/**
 * Вкладка текста запроса. Подсветка языка 1С остаётся у Monaco.
 */

import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { register1cQueryLanguage } from '../../utils/monacoQueryLanguage';

export const QueryTextPage: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return undefined;
    register1cQueryLanguage();
    const editor = monaco.editor.create(hostRef.current, {
      value: valueRef.current,
      language: '1c-query',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: 'on',
      fontSize: 13,
      unicodeHighlight: { ambiguousCharacters: false },
    });
    editorRef.current = editor;
    const sub = editor.onDidChangeModelContent(() => onChangeRef.current(editor.getValue()));
    return () => {
      sub.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getValue() !== value) editor.setValue(value);
  }, [value]);

  return (
    <div
      className="qw-text"
      ref={hostRef}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const editor = editorRef.current;
        const text = e.dataTransfer.getData('text/plain');
        const pos = editor?.getPosition();
        if (!editor || !pos || !text) return;
        editor.executeEdits('drop', [{
          range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
          text,
          forceMoveMarkers: true,
        }]);
      }}
    />
  );
};

/**
 * Вкладка текста запроса: дерево конфигурации, Monaco и структура пакета.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import type { ConfigurationModel } from '../../../queryModel/model';
import { register1cQueryLanguage } from '../../utils/monacoQueryLanguage';
import { attachQuerySyntaxCheck } from '../../querySyntax/attachQuerySyntaxCheck';
import { completionMetadata } from '../../queryLanguage/completion/provider';
import { applySmartInsert, dragInsertText } from '../../queryLanguage/editorActions';
import { QueryMetadataTree } from './QueryMetadataTree';
import { QueryStructurePanel } from './QueryStructurePanel';

export const QueryTextPage: React.FC<{
  value: string;
  onChange: (value: string) => void;
  model: ConfigurationModel | null;
}> = ({ value, onChange, model }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [, setCursorTick] = useState(0);
  const [text, setText] = useState(value);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return undefined;
    register1cQueryLanguage();
    const instance = monaco.editor.create(hostRef.current, {
      value: valueRef.current,
      language: '1c-query',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: 'on',
      fontSize: 13,
      linkedEditing: true,
      unicodeHighlight: { ambiguousCharacters: false },
    });
    editorRef.current = instance;
    setEditor(instance);
    const syntax = attachQuerySyntaxCheck(instance);
    const cursor = instance.onDidChangeCursorPosition(() => setCursorTick((tick) => tick + 1));
    const sub = instance.onDidChangeModelContent(() => {
      const next = instance.getValue();
      setText(next);
      onChangeRef.current(next);
    });
    instance.addAction({
      id: 'query.format',
      label: 'Форматировать запрос',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: () => instance.getAction('editor.action.formatDocument')?.run(),
    });
    return () => {
      cursor.dispose();
      sub.dispose();
      syntax.dispose();
      instance.dispose();
      editorRef.current = null;
      setEditor(null);
    };
  }, []);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance) return;
    if (instance.getValue() !== value) {
      instance.setValue(value);
      setText(value);
    }
  }, [value]);

  return (
    <div className="qw-text">
      <div style={{ width: 280, flex: 'none', minWidth: 0, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        <QueryMetadataTree
          model={model}
          text={text}
          onSmartInsert={(target) => {
            const index = completionMetadata();
            const instance = editorRef.current;
            if (index && instance) applySmartInsert(instance, target, index);
          }}
        />
      </div>
      <div
        className="qw-text__editor"
        ref={hostRef}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const instance = editorRef.current;
          const plain = event.dataTransfer.getData('text/plain');
          const position = instance?.getPosition();
          const queryModel = instance?.getModel();
          if (!instance || !position || !plain || !queryModel) return;
          const offset = queryModel.getOffsetAt(position);
          const inserted = dragInsertText(event.dataTransfer, queryModel.getValue(), offset, plain);
          instance.executeEdits('drop', [{
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: inserted,
            forceMoveMarkers: true,
          }]);
        }}
      />
      <QueryStructurePanel text={text} editor={editor} />
    </div>
  );
};

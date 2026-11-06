/**
 * Полноценный редактор запросов для BSL-строк
 * Использует QueryEditorEnhanced в полноэкранном режиме
 */

import React, { useEffect, useState } from 'react';
import { QueryEditorEnhanced } from './DcsEditor/QueryEditorEnhanced';
import { MetadataTreePanel, type QueryMetadataNode } from './DcsEditor/MetadataTreePanel';
import { setQueryMetadataCompletionTree } from '../utils/monacoQueryLanguage';
import { setCompletionMetadata } from '../queryLanguage/completion/provider';
import type { ConfigurationModel } from '../../queryModel/model';

interface StandaloneQueryEditorProps {
  vscode: any;
}

interface QueryEditorData {
  queryText: string;
  metadata: {
    registers: string[];
    referenceTypes: string[];
  };
  metadataTree: QueryMetadataNode | null;
}

export const StandaloneQueryEditor: React.FC<StandaloneQueryEditorProps> = ({ vscode }) => {
  const [data, setData] = useState<QueryEditorData>({
    queryText: '',
    metadata: { registers: [], referenceTypes: [] },
    metadataTree: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [queryText, setQueryText] = useState('');
  const [queryModel, setQueryModel] = useState<ConfigurationModel | null>(null);

  // Обработка сообщений от расширения
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      if (message.type === 'standaloneQueryEditorInit') {
        const debugMode = message.payload?.debugMode || false;
        (globalThis as any).__MDV_QUERY_DEBUG__ = debugMode;

        setData(message.payload);
        setQueryText(message.payload.queryText || '');
        setQueryMetadataCompletionTree(message.payload.metadataTree ?? null);
        setIsLoading(false);
        // Если дерево не пришло в init — запрашиваем (fallback при потере metadataTreeReady)
        if (message.payload?.metadataTree == null) {
          setTimeout(() => vscode.postMessage({ type: 'requestMetadataTree' }), 500);
        }
      }

      if (message.type === 'metadataUpdate') {
        setData((prev) => ({ ...prev, metadata: message.metadata ?? prev.metadata }));
      }

      if (message.type === 'metadataTreeReady') {
        const tree = message.metadataTree ?? null;
        setData((prev) => ({ ...prev, metadataTree: tree }));
        setQueryMetadataCompletionTree(tree);
      }

      if (message.type === 'queryMetadataReady' && message.queryModel) {
        setQueryModel(message.queryModel);
        setCompletionMetadata(message.queryModel);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSave = (newQuery: string) => {
    vscode.postMessage({
      type: 'saveQuery',
      payload: newQuery,
    });
  };

  const handleCancel = () => {
    vscode.postMessage({
      type: 'cancel',
    });
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--vscode-foreground)',
        backgroundColor: 'var(--vscode-editor-background)',
      }}>
        Загрузка метаданных...
      </div>
    );
  }

  return (
    <QueryEditorEnhanced
      isOpen={true}
      queryText={queryText}
      fullscreen
      dataCompositionMode={false}
      metadataTree={data.metadataTree}
      queryModel={queryModel}
      rightPanel={data.metadataTree ? (
        <MetadataTreePanel tree={data.metadataTree} />
      ) : (
        <div style={{ padding: '1rem', color: 'var(--vscode-foreground)' }}>Загрузка дерева метаданных…</div>
      )}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
};


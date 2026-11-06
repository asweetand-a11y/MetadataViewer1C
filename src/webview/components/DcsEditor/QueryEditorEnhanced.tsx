/**
 * Точка входа редактора запроса.
 * Содержимое — визуальный конструктор со вкладкой текста.
 */

import React from 'react';
import type { QueryMetadataNode } from './MetadataTreePanel';
import type { ConfigurationModel } from '../../../queryModel/model';
import { QueryWizard } from '../QueryWizard/QueryWizard';

export interface QueryEditorEnhancedProps {
  isOpen: boolean;
  queryText: string;
  rightPanel?: React.ReactNode;
  onSave: (newQuery: string) => void;
  onCancel: () => void;
  /** Режим полноэкранного редактора (без overlay) */
  fullscreen?: boolean;
  /** Вкладки компоновки данных и характеристик, как в конструкторе СКД. */
  dataCompositionMode?: boolean;
  metadataTree?: QueryMetadataNode | null;
  queryModel?: ConfigurationModel | null;
}

function treeFromPanel(node: React.ReactNode): QueryMetadataNode | null {
  if (!React.isValidElement(node)) return null;
  const props = node.props as { tree?: QueryMetadataNode | null };
  return props.tree ?? null;
}

export const QueryEditorEnhanced: React.FC<QueryEditorEnhancedProps> = ({
  isOpen,
  queryText,
  rightPanel,
  onSave,
  onCancel,
  fullscreen = false,
  dataCompositionMode = false,
  metadataTree = null,
  queryModel = null,
}) => {
  if (!isOpen) return null;
  return (
    <QueryWizard
      isOpen={isOpen}
      queryText={queryText}
      onSave={onSave}
      onCancel={onCancel}
      fullscreen={fullscreen}
      dataCompositionMode={dataCompositionMode}
      metadataTree={metadataTree || treeFromPanel(rightPanel)}
      queryModel={queryModel}
    />
  );
};

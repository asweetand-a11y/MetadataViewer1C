import React, { useMemo, useState } from 'react';
import './MetadataTreePanel.css';

export type QueryMetadataNode = {
  id: string;
  label: string;
  kind: 'root' | 'type' | 'object' | 'group' | 'member';
  /** Dimension, Resource, Attribute — если узел пришёл из метаданных объекта. */
  role?: string;
  insertText?: string;
  children?: QueryMetadataNode[];
};

export interface MetadataTreePanelProps {
  tree: QueryMetadataNode;
}

function normalize(s: string): string {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function filterTree(root: QueryMetadataNode, q: string): QueryMetadataNode {
  const nq = normalize(q);
  if (!nq) return root;

  const walk = (n: QueryMetadataNode): QueryMetadataNode | null => {
    const selfMatch = normalize(n.label).includes(nq);
    const kids = (n.children || []).map(walk).filter(Boolean) as QueryMetadataNode[];
    if (selfMatch || kids.length) return { ...n, children: kids };
    return null;
  };

  return (walk(root) || { ...root, children: [] }) as QueryMetadataNode;
}

export const MetadataTreePanel: React.FC<MetadataTreePanelProps> = ({ tree }) => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [tree.id]: true,
  });

  const filtered = useMemo(() => filterTree(tree, query), [tree, query]);

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (n: QueryMetadataNode, depth: number) => {
    const hasChildren = Array.isArray(n.children) && n.children.length > 0;
    const isOpen = !!expanded[n.id];

    const canDrag = !!n.insertText;

    return (
      <div key={n.id} className="md-tree__node" style={{ paddingLeft: 8 + depth * 14 }}>
        <div className="md-tree__row">
          {hasChildren ? (
            <button
              type="button"
              className="md-tree__toggle"
              onClick={() => toggle(n.id)}
              title={isOpen ? 'Свернуть' : 'Развернуть'}
            >
              {isOpen ? '▾' : '▸'}
            </button>
          ) : (
            <span className="md-tree__spacer" />
          )}

          <div
            className={`md-tree__label ${canDrag ? 'is-draggable' : ''}`}
            draggable={canDrag}
            onDragStart={(e) => {
              if (!n.insertText) return;

              // plain text fallback
              e.dataTransfer.setData('text/plain', n.insertText);

              // structured payload for alias-aware вставки
              const insertText = String(n.insertText || '').trim();
              const isVirtual = insertText.includes('(');
              const parts = insertText.split('.');

              const payload: any = { insertText, kind: n.kind };

              if (n.kind === 'object' && parts.length >= 2) {
                payload.type = 'table';
                payload.tableKey = `${parts[0]}.${parts[1]}`;
              } else if (n.kind === 'member' && parts.length >= 3) {
                payload.type = isVirtual ? 'virtual' : 'field';
                payload.tableKey = `${parts[0]}.${parts[1]}`;
                payload.name = parts.slice(2).join('.');
              }

              e.dataTransfer.setData('application/x-1c-md', JSON.stringify(payload));
              e.dataTransfer.effectAllowed = 'copy';
            }}
            title={n.insertText ? `Перетащите, чтобы вставить: ${n.insertText}` : n.label}
          >
            {n.label}
          </div>
        </div>

        {hasChildren && isOpen ? (
          <div className="md-tree__children">
            {n.children!.map((c) => renderNode(c, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="md-tree">
      <div className="md-tree__toolbar">
        <input
          className="md-tree__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск метаданных…"
        />
      </div>
      <div className="md-tree__content">{renderNode(filtered, 0)}</div>
      <div className="md-tree__hint">Подсказка: перетащите объект/поле в редактор для вставки.</div>
    </div>
  );
};

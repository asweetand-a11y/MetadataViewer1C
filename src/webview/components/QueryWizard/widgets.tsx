/**
 * Общие элементы списков конструктора запросов.
 */

import React, { useMemo, useState } from 'react';

export const SmallButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...rest }) => (
  <button type="button" className={`qw-btn ${className || ''}`} {...rest}>
    {children}
  </button>
);

export interface PickItem {
  id: string;
  label: string;
}

/** Список с поиском. Двойной щелчок вызывает onActivate. */
export const PickList: React.FC<{
  title: string;
  items: PickItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onActivate?: (id: string) => void;
  emptyText?: string;
}> = ({ title, items, selectedId, onSelect, onActivate, emptyText }) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="qw-list">
      <div className="qw-list__title">{title}</div>
      <input
        className="qw-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск…"
      />
      <div className="qw-list__body">
        {filtered.length === 0 ? <div className="qw-empty">{emptyText || 'Пусто'}</div> : null}
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`qw-list__item ${item.id === selectedId ? 'is-selected' : ''}`}
            onClick={() => onSelect(item.id)}
            onDoubleClick={() => onActivate?.(item.id)}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export const MiniDialog: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, wide }) => (
  <div className="qw-dialog__overlay" onClick={onClose}>
    <div className={`qw-dialog ${wide ? 'is-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="qw-dialog__header">
        <span>{title}</span>
        <button type="button" className="qw-btn" onClick={onClose}>Закрыть</button>
      </div>
      <div className="qw-dialog__body">{children}</div>
    </div>
  </div>
);

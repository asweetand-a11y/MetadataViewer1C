/**
 * Хранение и состав функциональной опции.
 */

import React, { useMemo, useState } from 'react';
import type { FunctionalOptionMembers } from '../../../Metadata/types';
import { UiButton, UiCheckbox } from '../../ui';
import { Modal } from './Modal';
import {
    buildFunctionalOptionTree,
    filterFunctionalOptionTree,
    functionalOptionStorageLabel,
    functionalOptionStorageOptions,
    readFunctionalOptionContent,
    writeFunctionalOptionContent,
    type FunctionalOptionTreeNode,
} from './functionalOptionModel';

interface LocationFieldProps {
    value: unknown;
    referenceTypes: string[];
    members: FunctionalOptionMembers[];
    onChange: (value: string) => void;
}

export const FunctionalOptionLocationField: React.FC<LocationFieldProps> = ({
    value,
    referenceTypes,
    members,
    onChange,
}) => {
    const current = typeof value === 'string' ? value : '';
    const options = useMemo(() => functionalOptionStorageOptions(referenceTypes, members), [referenceTypes, members]);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [draft, setDraft] = useState(current);
    const queryText = query.trim().toLocaleLowerCase('ru');
    const visible = options.filter((option) => {
        if (!queryText) {
            return true;
        }
        return option.title.toLocaleLowerCase('ru').includes(queryText)
            || option.group.toLocaleLowerCase('ru').includes(queryText)
            || option.path.toLocaleLowerCase('ru').includes(queryText);
    });
    const groups = new Map<string, typeof visible>();
    for (const option of visible) {
        const list = groups.get(option.group) ?? [];
        list.push(option);
        groups.set(option.group, list);
    }

    return (
        <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                    readOnly
                    className="property-input"
                    value={current ? functionalOptionStorageLabel(current) : ''}
                    title={current}
                    placeholder="Хранение не выбрано"
                    style={{ flex: 1, minWidth: 0 }}
                />
                <UiButton
                    icon="ellipsis"
                    title="Выбрать хранение"
                    onClick={() => {
                        setDraft(current);
                        setOpen(true);
                    }}
                />
            </div>
            <Modal
                isOpen={open}
                title="Хранение"
                width="640px"
                onClose={() => setOpen(false)}
                footer={(
                    <>
                        <UiButton secondary onClick={() => setOpen(false)}>Отмена</UiButton>
                        <UiButton onClick={() => { onChange(draft); setOpen(false); }}>ОК</UiButton>
                    </>
                )}
            >
                <input
                    className="property-input"
                    value={query}
                    placeholder="Поиск константы или реквизита"
                    onChange={(event) => setQuery(event.target.value)}
                    style={{ marginBottom: '12px' }}
                />
                <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    {groups.size === 0 && (
                        <div style={{ color: 'var(--vscode-descriptionForeground)' }}>Ничего не найдено</div>
                    )}
                    {Array.from(groups.entries()).map(([group, items]) => (
                        <div key={group} style={{ marginBottom: '12px' }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{group}</div>
                            {items.map((option) => (
                                <label
                                    key={option.path}
                                    style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', padding: '2px 0' }}
                                >
                                    <input
                                        type="radio"
                                        name="functional-option-location"
                                        checked={draft === option.path}
                                        onChange={() => setDraft(option.path)}
                                    />
                                    <span>{option.title}</span>
                                </label>
                            ))}
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

interface ContentEditorProps {
    value: unknown;
    referenceTypes: string[];
    members: FunctionalOptionMembers[];
    onChange: (value: { 'xr:Object': string[] }) => void;
}

export const FunctionalOptionContentEditor: React.FC<ContentEditorProps> = ({
    value,
    referenceTypes,
    members,
    onChange,
}) => {
    const selected = readFunctionalOptionContent(value);
    const selectedSet = useMemo(() => new Set(selected), [selected]);
    const tree = useMemo(() => buildFunctionalOptionTree(referenceTypes, members), [referenceTypes, members]);
    const [query, setQuery] = useState('');
    const visibleTree = useMemo(() => filterFunctionalOptionTree(tree, query), [tree, query]);
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

    const togglePath = (path: string) => {
        const next = selected.includes(path)
            ? selected.filter((item) => item !== path)
            : [...selected, path];
        onChange(writeFunctionalOptionContent(next));
    };

    const renderNode = (node: FunctionalOptionTreeNode, depth: number): React.ReactNode => {
        const hasChildren = node.children.length > 0;
        const isOpen = query.trim() !== '' || !collapsed.has(node.id);
        return (
            <div key={node.id}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '2px 0', paddingLeft: depth * 16 }}>
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => {
                                setCollapsed((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(node.id)) {
                                        next.delete(node.id);
                                    } else {
                                        next.add(node.id);
                                    }
                                    return next;
                                });
                            }}
                            style={{
                                width: '18px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--vscode-foreground)',
                                cursor: 'pointer',
                            }}
                        >
                            {isOpen ? '▾' : '▸'}
                        </button>
                    ) : (
                        <span style={{ width: '18px' }} />
                    )}
                    {node.path ? (
                        <UiCheckbox
                            checked={selectedSet.has(node.path)}
                            onChange={(checked) => {
                                if (checked !== selectedSet.has(node.path!)) {
                                    togglePath(node.path!);
                                }
                            }}
                            label={node.title}
                        />
                    ) : (
                        <span style={{ fontWeight: depth === 0 ? 600 : 500 }}>{node.title}</span>
                    )}
                </div>
                {hasChildren && isOpen && node.children.map((child) => renderNode(child, depth + 1))}
            </div>
        );
    };

    const selectedNodes = selected.map((path) => ({ path, title: functionalOptionStorageLabel(path) }));

    return (
        <div className="form-editor" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
            <div>
                <input
                    className="property-input"
                    value={query}
                    placeholder="Поиск объекта"
                    onChange={(event) => setQuery(event.target.value)}
                    style={{ marginBottom: '8px' }}
                />
                <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--vscode-panel-border)', padding: '8px' }}>
                    {visibleTree.length === 0 && (
                        <div style={{ color: 'var(--vscode-descriptionForeground)' }}>Ничего не найдено</div>
                    )}
                    {visibleTree.map((node) => renderNode(node, 0))}
                </div>
            </div>
            <div>
                <div className="section-header">
                    <h3>Входящие в функциональную опцию объекты ({selectedNodes.length})</h3>
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--vscode-panel-border)', padding: '8px' }}>
                    {selectedNodes.length === 0 && (
                        <div style={{ color: 'var(--vscode-descriptionForeground)' }}>Состав пуст</div>
                    )}
                    {selectedNodes.map((item) => (
                        <div key={item.path} style={{ padding: '2px 0' }}>
                            <UiCheckbox
                                checked
                                onChange={(checked) => {
                                    if (!checked) {
                                        togglePath(item.path);
                                    }
                                }}
                                label={item.title}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

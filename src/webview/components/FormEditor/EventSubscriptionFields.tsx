/**
 * Поля «Источник» и «Событие» подписки на событие.
 */

import React, { useMemo, useState } from 'react';
import { UiButton, UiSelect } from '../../ui';
import { Modal } from './Modal';
import {
    eventLabel,
    eventsForSources,
    readSubscriptionSources,
    sourcePrefix,
    subscriptionSourceOptions,
    writeSubscriptionSources,
} from './eventSubscriptionEvents';

interface SourceFieldProps {
    value: unknown;
    referenceTypes: string[];
    onChange: (value: unknown, eventStillValid: boolean) => void;
    currentEvent: string;
}

export const EventSubscriptionSourceField: React.FC<SourceFieldProps> = ({
    value,
    referenceTypes,
    onChange,
    currentEvent,
}) => {
    const selected = useMemo(() => readSubscriptionSources(value), [value]);
    const options = useMemo(() => subscriptionSourceOptions(referenceTypes), [referenceTypes]);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const selectedPrefix = selected.length > 0 ? sourcePrefix(selected[0]) : '';
    const queryText = query.trim().toLocaleLowerCase('ru');

    const groups = useMemo(() => {
        const map = new Map<string, typeof options>();
        for (const option of options) {
            if (queryText && !option.objectName.toLocaleLowerCase('ru').includes(queryText)
                && !option.typeTitle.toLocaleLowerCase('ru').includes(queryText)) {
                continue;
            }
            const list = map.get(option.prefix) ?? [];
            list.push(option);
            map.set(option.prefix, list);
        }
        return Array.from(map.entries());
    }, [options, queryText]);

    const toggle = (typeValue: string, prefix: string) => {
        const sameGroup = selectedPrefix === '' || selectedPrefix === prefix;
        const next = !sameGroup
            ? [typeValue]
            : selected.includes(typeValue)
                ? selected.filter((item) => item !== typeValue)
                : [...selected, typeValue];
        const allowed = new Set(eventsForSources(next).map((event) => event.id));
        onChange(writeSubscriptionSources(next), next.length === 0 || allowed.has(currentEvent));
    };

    const summary = selected
        .map((type) => options.find((option) => option.value === type)?.label || type.replace(/^cfg:/, ''))
        .join(', ');

    return (
        <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input readOnly className="property-input" value={summary} title={summary} placeholder="Источник не выбран" style={{ flex: 1, minWidth: 0 }} />
                <UiButton icon="ellipsis" title="Выбрать источник" onClick={() => setOpen(true)} />
            </div>
            <Modal
                isOpen={open}
                title="Источник"
                width="760px"
                onClose={() => setOpen(false)}
                footer={<UiButton onClick={() => setOpen(false)}>ОК</UiButton>}
            >
                <input
                    className="property-input"
                    value={query}
                    placeholder="Поиск по имени или типу"
                    onChange={(event) => setQuery(event.target.value)}
                    style={{ marginBottom: '12px' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '480px', overflowY: 'auto' }}>
                    {groups.length === 0 && (
                        <div style={{ color: 'var(--vscode-descriptionForeground)' }}>Ничего не найдено</div>
                    )}
                    {groups.map(([prefix, items]) => (
                        <div key={prefix}>
                            <div style={{ fontWeight: 600, marginBottom: '6px' }}>{items[0]?.typeTitle}</div>
                            {items.map((option) => (
                                <label
                                    key={option.value}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '18px minmax(140px, 1fr) minmax(180px, 1.2fr)',
                                        gap: '10px',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        padding: '3px 0',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(option.value)}
                                        onChange={() => toggle(option.value, option.prefix)}
                                    />
                                    <span style={{ wordBreak: 'break-word' }}>{option.objectName}</span>
                                    <span style={{ color: 'var(--vscode-descriptionForeground)', wordBreak: 'break-word' }}>{option.typeTitle}</span>
                                </label>
                            ))}
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

interface EventFieldProps {
    value: unknown;
    source: unknown;
    onChange: (value: string) => void;
}

export const EventSubscriptionEventField: React.FC<EventFieldProps> = ({ value, source, onChange }) => {
    const eventId = typeof value === 'string' ? value : '';
    const sources = readSubscriptionSources(source);
    const events = eventsForSources(sources);
    const options = events.map((event) => ({ value: event.id, label: event.label }));
    if (eventId && !events.some((event) => event.id === eventId)) {
        options.unshift({ value: eventId, label: eventLabel(eventId, sources) });
    }

    return (
        <UiSelect
            value={eventId}
            placeholder="Событие"
            onChange={onChange}
            options={options}
        />
    );
};

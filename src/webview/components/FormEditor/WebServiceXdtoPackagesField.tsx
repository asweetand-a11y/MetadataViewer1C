/**
 * Выбор пакетов XDTO веб-сервиса: список с флажками, как в конфигураторе.
 */

import React, { useMemo, useState } from 'react';
import { UiButton } from '../../ui';
import { Modal } from './Modal';
import { STANDARD_XDTO_PACKAGES, readXdtoPackageUris, writeXdtoPackageUris } from './webServiceXml';

interface WebServiceXdtoPackagesFieldProps {
    value: unknown;
    onChange: (value: unknown) => void;
}

export const WebServiceXdtoPackagesField: React.FC<WebServiceXdtoPackagesFieldProps> = ({ value, onChange }) => {
    const selected = useMemo(() => readXdtoPackageUris(value), [value]);
    const [open, setOpen] = useState(false);
    const options = useMemo(() => {
        const extra = selected.filter((uri) => !STANDARD_XDTO_PACKAGES.includes(uri));
        return [...extra, ...STANDARD_XDTO_PACKAGES];
    }, [selected]);

    const toggle = (uri: string) => {
        const next = selected.includes(uri)
            ? selected.filter((item) => item !== uri)
            : [...selected, uri];
        onChange(writeXdtoPackageUris(value, next));
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                    readOnly
                    className="property-input"
                    value={selected.join(', ')}
                    title={selected.join('\n')}
                    placeholder="Пакеты не выбраны"
                    style={{ flex: 1 }}
                />
                <UiButton icon="ellipsis" title="Выбрать пакеты XDTO" onClick={() => setOpen(true)} />
            </div>
            <Modal
                isOpen={open}
                title="Выбор пакетов XDTO"
                onClose={() => setOpen(false)}
                footer={<UiButton onClick={() => setOpen(false)}>ОК</UiButton>}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
                    {options.map((uri) => (
                        <label key={uri} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={selected.includes(uri)}
                                onChange={() => toggle(uri)}
                            />
                            <span style={{ wordBreak: 'break-all' }}>{uri}</span>
                        </label>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

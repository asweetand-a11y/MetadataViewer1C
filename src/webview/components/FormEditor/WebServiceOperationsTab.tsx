/**
 * Вкладка «Операции» веб-сервиса: имя, тип возврата, процедура и режим блокировки.
 */

import React, { useMemo } from 'react';
import { UiCheckbox, UiSelect, UiTextField } from '../../ui';
import { getEnumValueLabel, getFieldValues } from '../../../Metadata/field-values';
import {
    WebServiceOperation,
    readWebServiceOperations,
    updateWebServiceOperation,
} from './webServiceXml';

interface WebServiceOperationsTabProps {
    xml: string;
    onXmlChange: (xml: string) => void;
}

export const WebServiceOperationsTab: React.FC<WebServiceOperationsTabProps> = ({ xml, onXmlChange }) => {
    const operations = useMemo(() => readWebServiceOperations(xml), [xml]);
    const lockModes = getFieldValues('DataLockControlMode') ?? ['Managed', 'Automatic', 'AutomaticAndManaged'];

    const update = (operation: WebServiceOperation, patch: Partial<WebServiceOperation>) => {
        onXmlChange(updateWebServiceOperation(xml, { ...operation, ...patch }));
    };

    if (operations.length === 0) {
        return (
            <div className="form-editor">
                <div className="editor-empty">
                    <p>У веб-сервиса нет операций</p>
                </div>
            </div>
        );
    }

    return (
        <div className="form-editor">
            <div className="section-header">
                <h3>Операции ({operations.length})</h3>
            </div>
            {operations.map((operation) => (
                <div key={operation.uuid} className="properties-group">
                    <div className="section-header">
                        <h3>{operation.name || 'Операция'}</h3>
                    </div>
                    <div className="properties-cards">
                        <Field label="Имя">
                            <UiTextField value={operation.name} onChange={(name) => update(operation, { name })} />
                        </Field>
                        <Field label="Синоним">
                            <UiTextField value={operation.synonym} onChange={(synonym) => update(operation, { synonym })} />
                        </Field>
                        <Field label="Комментарий">
                            <UiTextField value={operation.comment} onChange={(comment) => update(operation, { comment })} />
                        </Field>
                        <Field label="Тип возвращаемого значения">
                            <UiTextField value={operation.returnType} onChange={(returnType) => update(operation, { returnType })} />
                        </Field>
                        <Field label="Имя процедуры">
                            <UiTextField value={operation.procedureName} onChange={(procedureName) => update(operation, { procedureName })} />
                        </Field>
                        <Field label="Режим управления блокировкой данных">
                            <UiSelect
                                value={operation.dataLockControlMode}
                                onChange={(dataLockControlMode) => update(operation, { dataLockControlMode })}
                                options={lockModes.map((mode) => ({ value: mode, label: getEnumValueLabel(mode) }))}
                            />
                        </Field>
                        <Field label="Возможно пустое значение">
                            <UiCheckbox checked={operation.nillable} onChange={(nillable) => update(operation, { nillable })} />
                        </Field>
                        <Field label="В транзакции">
                            <UiCheckbox checked={operation.transactioned} onChange={(transactioned) => update(operation, { transactioned })} />
                        </Field>
                    </div>
                </div>
            ))}
        </div>
    );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="property-card">
        <div className="property-header">
            <h4>{label}</h4>
        </div>
        <div className="property-value">{children}</div>
    </div>
);

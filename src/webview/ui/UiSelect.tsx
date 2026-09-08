/**
 * Выпадающий список VS Code Elements (single-select).
 */
import React from 'react';
import { VscodeOption, VscodeSingleSelect } from '@vscode-elements/react-elements';

export interface UiSelectOption {
  value: string;
  label: string;
}

export interface UiSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: UiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export const UiSelect: React.FC<UiSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}) => (
  <VscodeSingleSelect
    value={value ?? ''}
    disabled={disabled}
    onChange={(e: any) => onChange?.(e.target?.value ?? '')}
  >
    {placeholder ? <VscodeOption value="">{placeholder}</VscodeOption> : null}
    {options.map((opt) => (
      <VscodeOption key={opt.value} value={opt.value}>
        {opt.label}
      </VscodeOption>
    ))}
  </VscodeSingleSelect>
);

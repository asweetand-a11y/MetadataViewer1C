/**
 * Чекбокс VS Code Elements.
 */
import React from 'react';
import { VscodeCheckbox } from '@vscode-elements/react-elements';

export interface UiCheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const UiCheckbox: React.FC<UiCheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled,
}) => (
  <VscodeCheckbox
    checked={!!checked}
    disabled={disabled}
    onChange={(e: any) => onChange?.(!!e.target?.checked)}
  >
    {label}
  </VscodeCheckbox>
);

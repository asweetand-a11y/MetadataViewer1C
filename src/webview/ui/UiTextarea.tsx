/**
 * Многострочное поле VS Code Elements.
 */
import React from 'react';
import { VscodeTextarea } from '@vscode-elements/react-elements';

export interface UiTextareaProps {
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}

export const UiTextarea: React.FC<UiTextareaProps> = ({
  value,
  onChange,
  rows,
  placeholder,
  disabled,
}) => (
  <VscodeTextarea
    value={value ?? ''}
    rows={rows}
    placeholder={placeholder}
    disabled={disabled}
    onInput={(e: any) => onChange?.(e.target?.value ?? '')}
    onChange={(e: any) => onChange?.(e.target?.value ?? '')}
  />
);

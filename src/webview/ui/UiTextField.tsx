/**
 * Текстовое поле VS Code Elements.
 */
import React from 'react';
import { VscodeTextfield } from '@vscode-elements/react-elements';

export interface UiTextFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: 'text' | 'number' | 'search' | 'password';
  className?: string;
}

export const UiTextField: React.FC<UiTextFieldProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  type = 'text',
  className,
}) => (
  <VscodeTextfield
    value={value ?? ''}
    type={type}
    placeholder={placeholder}
    disabled={disabled}
    className={className}
    onInput={(e: any) => onChange?.(e.target?.value ?? '')}
    onChange={(e: any) => onChange?.(e.target?.value ?? '')}
  />
);

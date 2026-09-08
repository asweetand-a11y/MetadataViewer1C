/**
 * Кнопка VS Code Elements.
 * Текст — vscode-button; только иконка — vscode-toolbar-button
 * (у vscode-button слот и margin-right: 3px сдвигают глиф из центра).
 */
import React from 'react';
import { VscodeButton, VscodeToolbarButton } from '@vscode-elements/react-elements';

export interface UiButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: string;
  iconAfter?: string;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  /** Только иконка, без текста — корректный padding/центровка vscode-button. */
  iconOnly?: boolean;
  /** На всю ширину контейнера. */
  block?: boolean;
  /** Иконка удаления: без красного фона, цвет на hover. */
  danger?: boolean;
}

export const UiButton: React.FC<UiButtonProps> = ({
  children,
  onClick,
  disabled,
  secondary,
  icon,
  iconAfter,
  title,
  type = 'button',
  className,
  iconOnly: iconOnlyProp,
  block,
  danger,
}) => {
  const iconOnly = iconOnlyProp ?? Boolean(icon && !children && !iconAfter);
  const hostClass = [
    className,
    iconOnly ? 'ui-btn-icon' : '',
    danger ? 'ui-btn-danger' : '',
    block ? 'ui-btn-block' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (iconOnly && icon) {
    return (
      <VscodeToolbarButton
        icon={icon}
        label={title}
        title={title}
        className={hostClass || undefined}
        onClick={disabled ? undefined : (onClick as any)}
      />
    );
  }

  return (
    <VscodeButton
      secondary={secondary}
      disabled={disabled}
      icon={icon}
      iconAfter={iconAfter}
      block={block}
      title={title}
      type={type}
      className={hostClass || undefined}
      onClick={onClick as any}
    >
      {children}
    </VscodeButton>
  );
};

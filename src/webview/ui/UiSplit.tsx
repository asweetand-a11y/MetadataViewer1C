/**
 * Разделённый вид VS Code Elements.
 */
import React from 'react';
import { VscodeSplitLayout } from '@vscode-elements/react-elements';

export interface UiSplitProps {
  start: React.ReactNode;
  end: React.ReactNode;
  initialHandlePosition?: string;
}

export const UiSplit: React.FC<UiSplitProps> = ({
  start,
  end,
  initialHandlePosition = '60%',
}) => (
  <VscodeSplitLayout split="vertical" initialHandlePosition={initialHandlePosition}>
    <div slot="start" style={{ height: '100%', overflow: 'auto' }}>{start}</div>
    <div slot="end" style={{ height: '100%', overflow: 'auto' }}>{end}</div>
  </VscodeSplitLayout>
);

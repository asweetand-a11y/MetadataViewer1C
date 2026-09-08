/**
 * Вкладки VS Code Elements.
 */
import React from 'react';
import {
  VscodeBadge,
  VscodeTabHeader,
  VscodeTabPanel,
  VscodeTabs,
} from '@vscode-elements/react-elements';

export interface UiTabItem {
  id: string;
  label: string;
  count?: number;
}

export interface UiTabsProps {
  tabs: UiTabItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}

export const UiTabs: React.FC<UiTabsProps> = ({
  tabs,
  selectedId,
  onSelect,
  children,
}) => {
  const selectedIndex = Math.max(0, tabs.findIndex((t) => t.id === selectedId));
  const childList = React.Children.toArray(children);

  return (
    <VscodeTabs
      selectedIndex={selectedIndex}
      onVscTabsSelect={(e: any) => {
        const idx = e.detail?.selectedIndex ?? 0;
        const tab = tabs[idx];
        if (tab) {
          onSelect(tab.id);
        }
      }}
    >
      {tabs.map((tab, i) => (
        <React.Fragment key={tab.id}>
          <VscodeTabHeader>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 ? (
              <VscodeBadge variant="counter" slot="content-after">
                {tab.count}
              </VscodeBadge>
            ) : null}
          </VscodeTabHeader>
          <VscodeTabPanel>
            {childList[i] ?? null}
          </VscodeTabPanel>
        </React.Fragment>
      ))}
    </VscodeTabs>
  );
};

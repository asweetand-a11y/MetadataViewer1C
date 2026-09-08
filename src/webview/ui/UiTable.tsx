/**
 * Таблица VS Code Elements.
 */
import React from 'react';
import {
  VscodeTable,
  VscodeTableBody,
  VscodeTableCell,
  VscodeTableHeader,
  VscodeTableHeaderCell,
  VscodeTableRow,
} from '@vscode-elements/react-elements';

export interface UiTableProps {
  columns: string[];
  children: React.ReactNode;
  zebra?: boolean;
}

export const UiTable: React.FC<UiTableProps> = ({ columns, children, zebra = true }) => (
  <VscodeTable zebra={zebra} borderedRows resizable>
    <VscodeTableHeader slot="header">
      {columns.map((col) => (
        <VscodeTableHeaderCell key={col}>{col}</VscodeTableHeaderCell>
      ))}
    </VscodeTableHeader>
    <VscodeTableBody slot="body">{children}</VscodeTableBody>
  </VscodeTable>
);

export const UiTableRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <VscodeTableRow>{children}</VscodeTableRow>
);

export const UiTableCell: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <VscodeTableCell>{children}</VscodeTableCell>
);

/**
 * Сетка свойств: подпись | значение.
 */
import React from 'react';

export const PropertyGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="property-grid">{children}</div>
);

export const PropertyRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="property-row">
    <div className="property-row-label">{label}</div>
    <div className="property-row-value">{children}</div>
  </div>
);

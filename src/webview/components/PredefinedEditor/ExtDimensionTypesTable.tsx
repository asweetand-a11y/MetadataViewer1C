/**
 * Компонент таблицы видов субконто для плана счетов
 */

import React, { useMemo } from 'react';
import { PredefinedDataItem } from '../../../predefinedDataInterfaces';
import { UiButton } from '../../ui';

interface ExtDimensionTypesTableProps {
  dimensionTypes: Array<{
    name: string;
    chartOfCharacteristicTypesName: string;
    predefinedItems: string[];
  }>;
  extDimensionAccountingFlags: string[]; // Список признаков учета по субконто
  item: PredefinedDataItem;
  onChange: (item: PredefinedDataItem) => void;
}

export const ExtDimensionTypesTable: React.FC<ExtDimensionTypesTableProps> = ({
  dimensionTypes,
  extDimensionAccountingFlags,
  item,
  onChange
}) => {
  const extDimTypes = item.ExtDimensionTypes || [];

  // Собираем все доступные предопределенные элементы из всех видов субконто
  const availablePredefinedItems = useMemo(() => {
    console.log('[ExtDimensionTypesTable] dimensionTypes:', dimensionTypes);
    console.log('[ExtDimensionTypesTable] dimensionTypes.length:', dimensionTypes?.length || 0);
    const allItems: string[] = [];
    
    // Добавляем элементы из метаданных
    if (dimensionTypes && Array.isArray(dimensionTypes) && dimensionTypes.length > 0) {
      dimensionTypes.forEach((dt, index) => {
        console.log(`[ExtDimensionTypesTable] dimensionTypes[${index}]:`, {
          name: dt.name,
          chartOfCharacteristicTypesName: dt.chartOfCharacteristicTypesName,
          predefinedItemsCount: dt.predefinedItems?.length || 0
        });
        if (dt.predefinedItems && Array.isArray(dt.predefinedItems)) {
          console.log(`[ExtDimensionTypesTable] predefinedItems для ${dt.name}:`, dt.predefinedItems.length, 'элементов');
          dt.predefinedItems.forEach(item => {
            if (item && !allItems.includes(item)) {
              allItems.push(item);
            }
          });
        } else {
          console.warn(`[ExtDimensionTypesTable] dimensionTypes[${index}] не имеет predefinedItems или это не массив`);
        }
      });
    } else {
      console.warn('[ExtDimensionTypesTable] dimensionTypes пустой или не является массивом');
    }
    
    // Также добавляем уже используемые виды субконто, если их нет в списке доступных
    extDimTypes.forEach(dimType => {
      if (dimType.dimensionType && !allItems.includes(dimType.dimensionType)) {
        allItems.push(dimType.dimensionType);
        console.log(`[ExtDimensionTypesTable] Добавлен используемый вид субконто: ${dimType.dimensionType}`);
      }
    });
    
    console.log('[ExtDimensionTypesTable] Всего доступных элементов:', allItems.length);
    if (allItems.length > 0) {
      console.log('[ExtDimensionTypesTable] Список элементов:', allItems);
    }
    return allItems.sort();
  }, [dimensionTypes, extDimTypes]);
  
  // Собираем все уникальные имена признаков из flags всех extDimTypes
  // Динамически добавляем все признаки учета, которые есть в данных
  const allFlagNames = new Set(extDimensionAccountingFlags);
  extDimTypes.forEach(dimType => {
    if (dimType.flags) {
      Object.keys(dimType.flags).forEach(flagName => {
        allFlagNames.add(flagName);
      });
    }
  });
  const allAccountingFlags = Array.from(allFlagNames);

  const handleAddDimensionType = () => {
    console.log('[ExtDimensionTypesTable] handleAddDimensionType - availablePredefinedItems:', availablePredefinedItems);
    if (availablePredefinedItems.length === 0) {
      console.warn('[ExtDimensionTypesTable] Нет доступных элементов для добавления');
      return;
    }
    const newExtDimTypes = [...extDimTypes, {
      dimensionType: availablePredefinedItems[0],
      turnoverOnly: false,
      flags: {} as Record<string, boolean>
    }];
    onChange({ ...item, ExtDimensionTypes: newExtDimTypes });
  };

  const handleRemoveDimensionType = (index: number) => {
    const newExtDimTypes = extDimTypes.filter((_, i) => i !== index);
    onChange({ ...item, ExtDimensionTypes: newExtDimTypes.length > 0 ? newExtDimTypes : undefined });
  };

  const handleDimensionTypeChange = (index: number, dimensionType: string) => {
    const newExtDimTypes = [...extDimTypes];
    newExtDimTypes[index] = { ...newExtDimTypes[index], dimensionType };
    onChange({ ...item, ExtDimensionTypes: newExtDimTypes });
  };

  const handleTurnoverChange = (index: number, turnoverOnly: boolean) => {
    const newExtDimTypes = [...extDimTypes];
    newExtDimTypes[index] = { ...newExtDimTypes[index], turnoverOnly };
    onChange({ ...item, ExtDimensionTypes: newExtDimTypes });
  };

  const handleFlagChange = (index: number, flagName: string, enabled: boolean) => {
    const newExtDimTypes = [...extDimTypes];
    const flags = { ...newExtDimTypes[index].flags };
    const currentFlagValue = flags[flagName];
    
    if (enabled) {
      // Сохраняем в том же формате, в котором были данные
      if (currentFlagValue && typeof currentFlagValue === 'object' && 'enabled' in currentFlagValue) {
        // Сохраняем как объект с ref если он был
        flags[flagName] = { enabled: true, ref: currentFlagValue.ref };
      } else {
        // Сохраняем как boolean для обратной совместимости
        flags[flagName] = true;
      }
    } else {
      delete flags[flagName];
    }
    newExtDimTypes[index] = { ...newExtDimTypes[index], flags };
    onChange({ ...item, ExtDimensionTypes: newExtDimTypes });
  };

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Виды субконто:</label>
        <UiButton
          icon="add"
          disabled={availablePredefinedItems.length === 0}
          onClick={handleAddDimensionType}
        >
          Добавить
        </UiButton>
      </div>
      {extDimTypes.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>
          Нет видов субконто
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--vscode-panel-border)' }}>
                <th style={{ padding: '6px', textAlign: 'left', fontWeight: 'bold' }}>Вид субконто</th>
                <th style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>Только обороты</th>
                {allAccountingFlags.map(flagName => (
                  <th key={flagName} style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                    {flagName}
                  </th>
                ))}
                <th style={{ padding: '6px', width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {extDimTypes.map((dimType, index) => {
                // Создаем список опций, включая текущее значение, даже если его нет в availablePredefinedItems
                const allDimensionTypes = new Set(availablePredefinedItems);
                if (dimType.dimensionType && !allDimensionTypes.has(dimType.dimensionType)) {
                  allDimensionTypes.add(dimType.dimensionType);
                }
                const dimensionTypeOptions = Array.from(allDimensionTypes);
                
                return (
                  <tr key={index} style={{ borderBottom: '1px solid var(--vscode-panel-border)' }}>
                    <td style={{ padding: '6px' }}>
                      <select
                        value={dimType.dimensionType}
                        onChange={(e) => handleDimensionTypeChange(index, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          border: '1px solid var(--vscode-input-border)',
                          background: 'var(--vscode-input-background)',
                          color: 'var(--vscode-input-foreground)',
                          borderRadius: '3px',
                          fontSize: '12px'
                        }}
                      >
                        {dimensionTypeOptions.map((itemName) => (
                          <option key={itemName} value={itemName}>
                            {itemName}
                          </option>
                        ))}
                      </select>
                    </td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={dimType.turnoverOnly}
                      onChange={(e) => handleTurnoverChange(index, e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  {allAccountingFlags.map(flagName => {
                    // Обрабатываем как boolean или объект с enabled
                    const flagValue = dimType.flags[flagName];
                    const isChecked = typeof flagValue === 'boolean' 
                      ? flagValue 
                      : (flagValue && typeof flagValue === 'object' && 'enabled' in flagValue ? flagValue.enabled : false);
                    return (
                      <td key={flagName} style={{ padding: '6px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleFlagChange(index, flagName, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    );
                  })}
                  <td style={{ padding: '6px', textAlign: 'center' }}>
                    <UiButton
                      icon="close"
                      danger
                      title="Удалить"
                      onClick={() => handleRemoveDimensionType(index)}
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

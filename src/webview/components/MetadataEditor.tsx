/**
 * Основной компонент редактора метаданных
 * Управляет состоянием редактора метаданных и сохранением объекта.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FormEditor } from './FormEditor';
import { ParsedMetadataObject } from '../../xmlParsers/metadataParser';
import type { InformationRegisterScheduleEntry } from '../../metadata/types';
import { UiButton, UiCheckbox, UiTabs } from '../ui';

interface MetadataEditorProps {
  vscode: any;
}

interface InitMessage {
  type: 'init';
  payload: ParsedMetadataObject[];
  metadata?: {
    registers?: string[];
    referenceTypes: string[];
    informationRegistersSchedule?: InformationRegisterScheduleEntry[];
  };
}

type TabType = 'properties' | 'attributes' | 'tabular' | 'enumValues' | 'forms' | 'commands' | 'characteristicTypes' | 'accountingFlags' | 'subsystems';

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ vscode }) => {
  const [objects, setObjects] = useState<ParsedMetadataObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<ParsedMetadataObject | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [metadata, setMetadata] = useState<{
    registers: string[];
    referenceTypes: string[];
    informationRegistersSchedule?: InformationRegisterScheduleEntry[];
  }>({
    registers: [],
    referenceTypes: [],
    informationRegistersSchedule: []
  });
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('properties');

  // Обработка сообщений от extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'init') {
        const initMsg = message as InitMessage;
        setObjects(initMsg.payload || []);
        if (initMsg.metadata) {
          setMetadata({
            referenceTypes: initMsg.metadata.referenceTypes,
            registers: initMsg.metadata.registers ?? [],
            informationRegistersSchedule: initMsg.metadata.informationRegistersSchedule ?? []
          });
        }
        
        // Выбираем первый объект по умолчанию
        if (initMsg.payload && initMsg.payload.length > 0) {
          const firstObj = initMsg.payload[0];
          setSelectedObject(firstObj);
          setFormData(firstObj.properties);
        }
      } else if (message.type === 'objectUpdated') {
        // Обновляем объект после сохранения
        const updatedObj = message.payload as ParsedMetadataObject;
        setObjects(prev => prev.map(obj => obj.sourcePath === updatedObj.sourcePath ? updatedObj : obj));
        
        setSelectedObject(prev => {
          if (prev && prev.sourcePath === updatedObj.sourcePath) {
            return updatedObj;
          }
          return prev;
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Обработка изменений в форме
  const handleFormChange = useCallback((data: any) => {
    setFormData(data);
    setIsDirty(true);
    // Обновляем selectedObject с новыми properties
    setSelectedObject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        properties: data
      };
    });
    // TODO: Синхронизировать с XML редактором
  }, []);
  
  // Обработка изменений selectedObject из FormEditor
  const handleSelectedObjectChange = useCallback((updatedObject: ParsedMetadataObject) => {
    setSelectedObject(updatedObject);
    // Обновляем formData если нужно
    if (updatedObject.properties) {
      setFormData(updatedObject.properties);
    }
    setIsDirty(true);
  }, []);
  
  const handleSubsystemToggle = useCallback((relPath: string) => {
    setSelectedObject(prev => {
      if (!prev?.subsystems?.length) {
        return prev;
      }
      return {
        ...prev,
        subsystems: prev.subsystems.map(row =>
          row.relPath === relPath ? { ...row, included: !row.included } : row
        ),
      };
    });
    setIsDirty(true);
  }, []);

  // Сохранение изменений
  const handleSave = useCallback(() => {
    if (!selectedObject) return;

    // Объединяем все изменения: используем актуальный selectedObject и обновляем properties из formData
    const updatedObject: ParsedMetadataObject = {
      ...selectedObject,
      properties: formData || selectedObject.properties
      // Остальные поля (attributes, tabularSections и т.д.) уже обновлены через onSelectedObjectChange
    };

    // Отправляем сообщение с правильной структурой
    vscode.postMessage({
      type: 'saveCurrent',
      payload: updatedObject
    });

    setIsDirty(false);
  }, [selectedObject, formData, vscode]);

  // ВАЖНО: useMemo должен быть ДО условного возврата, иначе нарушается правило хуков React
  const tabs: { id: TabType; label: string; count?: number }[] = useMemo(() => {
    if (!selectedObject) {
      return [{ id: 'properties' as TabType, label: 'Свойства' }];
    }
    
    // Проверяем, является ли объект планом видов характеристик
    const isChartOfCharacteristicTypes = 
      selectedObject.objectType === 'ChartOfCharacteristicTypes' || 
      selectedObject.objectType === 'План видов характеристик' ||
      (selectedObject.sourcePath && selectedObject.sourcePath.includes('ChartsOfCharacteristicTypes'));
    
    // Проверяем, является ли объект планом счетов
    const isChartOfAccounts = 
      selectedObject.objectType === 'ChartOfAccounts' ||
      (selectedObject.sourcePath && selectedObject.sourcePath.includes('ChartsOfAccounts'));
    
    // Получаем количество типов значения характеристик
    const characteristicTypesCount = (() => {
      if (!isChartOfCharacteristicTypes) return undefined;
      const typeProp = selectedObject.properties?.Type;
      if (!typeProp) return 0;
      const typesArray = typeProp['v8:Type'] || typeProp.Type;
      if (Array.isArray(typesArray)) return typesArray.length;
      if (typesArray) return 1;
      return 0;
    })();
    
    // Получаем количество признаков учета
    const accountingFlagsCount = (() => {
      if (!isChartOfAccounts) return undefined;
      const accountingFlags = selectedObject.accountingFlags || [];
      const extDimensionAccountingFlags = selectedObject.extDimensionAccountingFlags || [];
      return accountingFlags.length + extDimensionAccountingFlags.length;
    })();
    
    const isEnum =
      selectedObject.objectType === 'Enum' ||
      selectedObject.objectType === 'Перечисление' ||
      (selectedObject.sourcePath && selectedObject.sourcePath.includes('/Enums/'));

    const result: { id: TabType; label: string; count?: number }[] = [
      { id: 'properties', label: 'Свойства' },
      { id: 'attributes', label: 'Реквизиты', count: selectedObject.attributes?.length },
      { id: 'tabular', label: 'Табличные части', count: selectedObject.tabularSections?.length },
      ...(isEnum ? [{ id: 'enumValues' as TabType, label: 'Значения перечисления', count: selectedObject.enumValues?.length }] : []),
      { id: 'forms', label: 'Формы', count: selectedObject.forms?.length },
      { id: 'commands', label: 'Команды', count: selectedObject.commands?.length }
    ];
    
    // Добавляем вкладку "Типы значения характеристик" только для планов видов характеристик
    if (isChartOfCharacteristicTypes) {
      result.push({ id: 'characteristicTypes', label: 'Типы значения характеристик', count: characteristicTypesCount });
    }
    
    // Добавляем вкладку "Признаки учета" только для планов счетов
    if (isChartOfAccounts) {
      result.push({ id: 'accountingFlags', label: 'Признаки учета', count: accountingFlagsCount });
    }

    if (selectedObject.subsystems !== undefined) {
      const n = selectedObject.subsystems.filter(s => s.included).length;
      result.push({
        id: 'subsystems',
        label: 'Подсистемы',
        count: selectedObject.subsystems.length > 0 ? n : undefined,
      });
    }
    
    return result;
  }, [selectedObject]);

  // Условный возврат должен быть ПОСЛЕ всех хуков
  if (!selectedObject) {
    return (
      <div className="metadata-editor">
        <div className="editor-empty">
          <p>Выберите объект метаданных для редактирования</p>
        </div>
      </div>
    );
  }

  const renderTabBody = (tabId: TabType) => {
    if (tabId === 'subsystems' && selectedObject.subsystems !== undefined) {
      return (
        <div className="editor-pane editor-form subsystem-membership-pane">
          <div className="section-header">
            <h3>Подсистемы, в которых участвует объект</h3>
          </div>
          {selectedObject.subsystems.length === 0 ? (
            <p className="subsystem-membership-empty">В каталоге Subsystems нет XML-файлов подсистем.</p>
          ) : (
            <ul className="subsystem-membership-list">
              {selectedObject.subsystems.map(row => (
                <li key={row.relPath} className="subsystem-membership-item">
                  <label className="subsystem-membership-label">
                    <UiCheckbox
                      checked={row.included}
                      onChange={() => handleSubsystemToggle(row.relPath)}
                      label={row.label}
                    />
                    <span className="subsystem-membership-path">{row.relPath.replace(/^Subsystems\//, '')}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    const form = (
      <FormEditor
        objectType={selectedObject.objectType}
        formData={formData}
        onChange={handleFormChange}
        metadata={metadata}
        activeTab={tabId}
        selectedObject={selectedObject}
        onSelectedObjectChange={handleSelectedObjectChange}
      />
    );
    return <div className="editor-pane editor-form">{form}</div>;
  };

  return (
    <div className="metadata-editor">
      <div className="editor-header">
        <div className="object-title">
          <h2>{selectedObject.name}</h2>
          <span className="object-type">{selectedObject.objectType}</span>
        </div>
        <div className="header-actions">
          <UiButton icon="save" onClick={handleSave} disabled={!isDirty}>
            Сохранить
          </UiButton>
        </div>
      </div>
      <UiTabs
        tabs={tabs}
        selectedId={activeTab}
        onSelect={(id) => setActiveTab(id as TabType)}
      >
        {tabs.map((tab) => (
          <div key={tab.id} className="editor-tab-body">
            {tab.id === activeTab ? renderTabBody(tab.id) : null}
          </div>
        ))}
      </UiTabs>
    </div>
  );
};


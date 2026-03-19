/**
 * Основной компонент редактора метаданных
 * Управляет состоянием и синхронизацией между формой и XML редактором
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FormEditor } from './FormEditor';
import { XmlEditor } from './XmlEditor';
import { ParsedMetadataObject } from '../../xmlParsers/metadataParser';
import { createXMLBuilder } from '../../utils/xmlUtils';

interface MetadataEditorProps {
  vscode: any;
}

interface InitMessage {
  type: 'init';
  payload: ParsedMetadataObject[];
  metadata?: {
    registers: string[];
    referenceTypes: string[];
  };
}

type TabType = 'properties' | 'attributes' | 'tabular' | 'enumValues' | 'forms' | 'commands' | 'characteristicTypes' | 'accountingFlags' | 'xml';

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ vscode }) => {
  const [objects, setObjects] = useState<ParsedMetadataObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<ParsedMetadataObject | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [xmlContent, setXmlContent] = useState<string>('');
  const [metadata, setMetadata] = useState<{ registers: string[]; referenceTypes: string[] }>({
    registers: [],
    referenceTypes: []
  });
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [showSplitView, setShowSplitView] = useState(false);

  // Обработка сообщений от extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'init') {
        const initMsg = message as InitMessage;
        setObjects(initMsg.payload || []);
        if (initMsg.metadata) {
          setMetadata(initMsg.metadata);
        }
        
        // Выбираем первый объект по умолчанию
        if (initMsg.payload && initMsg.payload.length > 0) {
          const firstObj = initMsg.payload[0];
          setSelectedObject(firstObj);
          setFormData(firstObj.properties);
          
          // КРИТИЧНО: Используем исходный XML для отображения, чтобы сохранить структуру элементов/атрибутов
          // Если исходный XML есть, используем его, иначе генерируем заново (fallback)
          if (firstObj._originalXml) {
            setXmlContent(firstObj._originalXml);
          } else {
            // Fallback: генерируем XML заново (структура может быть изменена)
            try {
              const builder = createXMLBuilder();
              const xmlObj = {
                MetaDataObject: {
                  [firstObj.objectType]: {
                    Properties: firstObj.properties,
                    ChildObjects: {
                      Attribute: firstObj.attributes?.map(a => ({ Properties: { Name: a.name, ...a.properties } })) || [],
                      TabularSection: firstObj.tabularSections?.map(ts => ({ Properties: { Name: ts.name } })) || []
                    }
                  }
                }
              };
              const xml = builder.build(xmlObj);
              setXmlContent(xml);
            } catch (e) {
              console.error('Error generating XML:', e);
              setXmlContent('<?xml version="1.0" encoding="UTF-8"?>\n<!-- Error generating XML -->');
            }
          }
        }
      } else if (message.type === 'objectUpdated') {
        // Обновляем объект после сохранения
        const updatedObj = message.payload as ParsedMetadataObject;
        setObjects(prev => prev.map(obj => obj.sourcePath === updatedObj.sourcePath ? updatedObj : obj));
        
        // Если это текущий выбранный объект, обновляем его и XML контент
        setSelectedObject(prev => {
          if (prev && prev.sourcePath === updatedObj.sourcePath) {
            if (updatedObj._originalXml) {
              setXmlContent(updatedObj._originalXml);
            }
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
    // Обновляем XML контент при изменении объекта
    if (updatedObject._originalXml) {
      setXmlContent(updatedObject._originalXml);
    }
    setIsDirty(true);
  }, []);
  
  // Обновляем XML контент при изменении selectedObject
  useEffect(() => {
    if (selectedObject?._originalXml) {
      setXmlContent(selectedObject._originalXml);
    }
  }, [selectedObject]);

  // Обработка изменений в XML редакторе
  const handleXmlChange = useCallback((xml: string) => {
    setXmlContent(xml);
    setIsDirty(true);
    // TODO: Парсить XML и обновить форму
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
    
    result.push({ id: 'xml', label: 'XML' });
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

  return (
    <div className="metadata-editor">
      <div className="editor-header">
        <div className="object-title">
          <h2>{selectedObject.name}</h2>
          <span className="object-type">{selectedObject.objectType}</span>
        </div>
        <div className="header-actions">
          <button 
            className="btn-toggle-view"
            onClick={() => setShowSplitView(!showSplitView)}
            title={showSplitView ? "Показать только форму" : "Показать форму и XML"}
          >
            {showSplitView ? '📋' : '🔀'}
          </button>
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={!isDirty}
          >
            💾 Сохранить
          </button>
        </div>
      </div>

      <div className="editor-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`editor-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="tab-count">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      <div className={`editor-content ${showSplitView && activeTab !== 'xml' ? 'split-view' : ''}`}>
        {activeTab === 'xml' ? (
          <div className="editor-pane editor-xml-full">
            <XmlEditor
              value={xmlContent}
              onChange={handleXmlChange}
              language="xml"
            />
          </div>
        ) : (
          <>
            <div className="editor-pane editor-form">
                <FormEditor
                  objectType={selectedObject.objectType}
                  formData={formData}
                  onChange={handleFormChange}
                  metadata={metadata}
                  activeTab={activeTab}
                  selectedObject={selectedObject}
                  onSelectedObjectChange={handleSelectedObjectChange}
                />
            </div>
            {showSplitView && (
              <div className="editor-pane editor-xml">
                <XmlEditor
                  value={xmlContent}
                  onChange={handleXmlChange}
                  language="xml"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};


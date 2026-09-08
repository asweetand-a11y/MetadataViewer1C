/**
 * Редактор типов данных (как в старом редакторе)
 * Полная реализация с модальным окном, категориями, квалификаторами
 */

import React, { useState, useEffect, useMemo } from 'react';
import { WidgetProps } from '@rjsf/utils';
import { extractTypeString, normalizeTypeForSave, formatTypeForDisplay as formatTypeDisplay } from '../utils/typeUtils';
import { UiButton } from '../ui';

interface SelectedType {
  value: string;
  category: 'primitive' | 'reference' | 'special';
  label: string;
}

interface Qualifiers {
  string?: { length: number; lengthType: 'Fixed' | 'Variable' };
  number?: { digits: number; fraction: number; sign: 'Any' | 'Nonnegative' };
  date?: { dateFractions: 'Date' | 'Time' | 'DateTime' };
}

const PRIMITIVE_TYPES = [
  { value: 'String', label: 'Строка' },
  { value: 'Number', label: 'Число' },
  { value: 'Boolean', label: 'Булево' },
  { value: 'Date', label: 'Дата' },
  { value: 'UUID', label: 'Уникальный идентификатор' }
];

// Специальные типы платформы 1С (хранятся как v8:* в XML)
const SPECIAL_TYPES: Array<{ value: string; label: string }> = [
  { value: 'v8:StandardPeriod', label: 'СтандартныйПериод' },
];

const REF_TYPE_PREFIX_MAP: Record<string, string> = {
  'CatalogRef': 'СправочникСсылка',
  'DocumentRef': 'ДокументСсылка',
  'EnumRef': 'ПеречислениеСсылка',
  'ChartOfCharacteristicTypesRef': 'ПланВидовХарактеристикСсылка',
  'ChartOfAccountsRef': 'ПланСчетовСсылка',
  'ChartOfCalculationTypesRef': 'ПланВидовРасчетаСсылка',
  'BusinessProcessRef': 'БизнесПроцессСсылка',
  'TaskRef': 'ЗадачаСсылка',
  'ExchangePlanRef': 'ПланОбменаСсылка',
  'DefinedTypeRef': 'ОпределяемыйТип',
  // Определяемые типы в XML встречаются как cfg:DefinedType.<Имя> через v8:TypeSet
  'DefinedType': 'ОпределяемыйТип',

  // Полные объекты/менеджеры/выборки/списки (по дереву метаданных)
  'CatalogObject': 'СправочникОбъект',
  'CatalogManager': 'СправочникМенеджер',
  'CatalogSelection': 'СправочникВыборка',
  'CatalogList': 'СправочникСписок',

  'DocumentObject': 'ДокументОбъект',
  'DocumentManager': 'ДокументМенеджер',
  'DocumentSelection': 'ДокументВыборка',
  'DocumentList': 'ДокументСписок',

  'BusinessProcessObject': 'БизнесПроцессОбъект',
  'BusinessProcessManager': 'БизнесПроцессМенеджер',
  'BusinessProcessSelection': 'БизнесПроцессВыборка',
  'BusinessProcessList': 'БизнесПроцессСписок',

  'TaskObject': 'ЗадачаОбъект',
  'TaskManager': 'ЗадачаМенеджер',
  'TaskSelection': 'ЗадачаВыборка',
  'TaskList': 'ЗадачаСписок',

  'ExchangePlanObject': 'ПланОбменаОбъект',
  'ExchangePlanManager': 'ПланОбменаМенеджер',
  'ExchangePlanSelection': 'ПланОбменаВыборка',
  'ExchangePlanList': 'ПланОбменаСписок',

  // Регистры (часто нужны как типы реквизитов)
  'InformationRegisterRecordSet': 'РегистрСведенийНаборЗаписей',
  'InformationRegisterManager': 'РегистрСведенийМенеджер',
  'InformationRegisterSelection': 'РегистрСведенийВыборка',

  'AccumulationRegisterRecordSet': 'РегистрНакопленияНаборЗаписей',
  'AccumulationRegisterManager': 'РегистрНакопленияМенеджер',
  'AccumulationRegisterSelection': 'РегистрНакопленияВыборка',

  'AccountingRegisterRecordSet': 'РегистрБухгалтерииНаборЗаписей',
  'AccountingRegisterManager': 'РегистрБухгалтерииМенеджер',
  'AccountingRegisterSelection': 'РегистрБухгалтерииВыборка',

  'CalculationRegisterRecordSet': 'РегистрРасчетаНаборЗаписей',
  'CalculationRegisterManager': 'РегистрРасчетаМенеджер',
  'CalculationRegisterSelection': 'РегистрРасчетаВыборка',
};

export const TypeWidget: React.FC<WidgetProps> = (props) => {
  const { value, onChange, options } = props;
  // ВАЖНО: Инициализируем isOpen как false, чтобы модальное окно было закрыто по умолчанию
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<SelectedType[]>([]);
  const [qualifiers, setQualifiers] = useState<Qualifiers>({});
  const [searchQuery, setSearchQuery] = useState('');
  // Состояние раскрытия/скрытия групп типов объектов
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  // Диагностика: показывает, что реально пришло в value и почему тип не распарсился (нужно для dateTime).
  const [typeParseDebug, setTypeParseDebug] = useState<{ ok: boolean; reason?: string; typeStr?: string; raw?: any } | null>(null);
  
  const registers = (options?.registers as string[]) || [];
  const referenceTypes = (options?.referenceTypes as string[]) || [];
  
  // ВАЖНО: Гарантируем, что модальное окно закрыто при монтировании
  // Это предотвращает автоматическое открытие при загрузке данных
  useEffect(() => {
    console.log('[TypeWidget] Монтирование компонента - закрываем модальное окно, isOpen:', false);
    setIsOpen(false);
  }, []); // Пустой массив зависимостей = выполняется только при монтировании

  // Парсим текущее значение типа при открытии модального окна
  useEffect(() => {
    if (isOpen && value) {
      // Сбрасываем предыдущие выбранные типы перед парсингом
      setSelectedTypes([]);
      setQualifiers({});
      parseTypeValue(value);
    }
  }, [isOpen, value]);
  
  // Формируем список ссылочных типов
  const referenceTypesList = useMemo(() => {
    const types = new Set<string>();
    
    // Добавляем типы из referenceTypes
    referenceTypes.forEach(refType => {
      if (typeof refType === 'string') {
        const kind = refType.replace(/^cfg:/, '');
        const refPrefix = kind.split('.')[0];
        if (REF_TYPE_PREFIX_MAP[refPrefix]) {
          types.add(kind);
        }
      }
    });
    
    // Преобразуем в массив с метками
    return Array.from(types).sort().map(type => {
      const parts = type.split('.');
      const refPrefix = parts[0];
      const objName = parts[1] || '';
      const baseLabel = REF_TYPE_PREFIX_MAP[refPrefix] || refPrefix;
      const label = objName ? `${baseLabel}.${objName}` : baseLabel;
      
      return { value: type, label, prefix: refPrefix };
    });
  }, [referenceTypes]);
  
  // Группируем ссылочные типы по типам объектов (как на скриншоте: СправочникОбъект, ДокументОбъект и т.д.)
  const groupedReferenceTypes = useMemo(() => {
    // Группируем типы по префиксу (CatalogObject, DocumentObject и т.д.)
    const groups: Record<string, Array<{ value: string; label: string; prefix: string }>> = {};
    
    referenceTypesList.forEach(type => {
      // Определяем название группы на основе префикса
      let groupKey = '';
      let groupLabel = '';
      
      // Определяем базовый тип и суффикс объекта
      if (type.prefix === 'CatalogRef') {
        groupKey = 'CatalogRef';
        groupLabel = 'СправочникСсылка';
      } else if (type.prefix === 'CatalogObject') {
        groupKey = 'CatalogObject';
        groupLabel = 'СправочникОбъект';
      } else if (type.prefix === 'CatalogManager') {
        groupKey = 'CatalogManager';
        groupLabel = 'СправочникМенеджер';
      } else if (type.prefix === 'CatalogSelection') {
        groupKey = 'CatalogSelection';
        groupLabel = 'СправочникВыборка';
      } else if (type.prefix === 'CatalogList') {
        groupKey = 'CatalogList';
        groupLabel = 'СправочникСписок';
      } else if (type.prefix === 'DocumentRef') {
        groupKey = 'DocumentRef';
        groupLabel = 'ДокументСсылка';
      } else if (type.prefix === 'DocumentObject') {
        groupKey = 'DocumentObject';
        groupLabel = 'ДокументОбъект';
      } else if (type.prefix === 'DocumentManager') {
        groupKey = 'DocumentManager';
        groupLabel = 'ДокументМенеджер';
      } else if (type.prefix === 'DocumentSelection') {
        groupKey = 'DocumentSelection';
        groupLabel = 'ДокументВыборка';
      } else if (type.prefix === 'DocumentList') {
        groupKey = 'DocumentList';
        groupLabel = 'ДокументСписок';
      } else if (type.prefix === 'BusinessProcessRef') {
        groupKey = 'BusinessProcessRef';
        groupLabel = 'БизнесПроцессСсылка';
      } else if (type.prefix === 'BusinessProcessObject') {
        groupKey = 'BusinessProcessObject';
        groupLabel = 'БизнесПроцессОбъект';
      } else if (type.prefix === 'BusinessProcessManager') {
        groupKey = 'BusinessProcessManager';
        groupLabel = 'БизнесПроцессМенеджер';
      } else if (type.prefix === 'BusinessProcessSelection') {
        groupKey = 'BusinessProcessSelection';
        groupLabel = 'БизнесПроцессВыборка';
      } else if (type.prefix === 'BusinessProcessList') {
        groupKey = 'BusinessProcessList';
        groupLabel = 'БизнесПроцессСписок';
      } else if (type.prefix === 'TaskRef') {
        groupKey = 'TaskRef';
        groupLabel = 'ЗадачаСсылка';
      } else if (type.prefix === 'TaskObject') {
        groupKey = 'TaskObject';
        groupLabel = 'ЗадачаОбъект';
      } else if (type.prefix === 'TaskManager') {
        groupKey = 'TaskManager';
        groupLabel = 'ЗадачаМенеджер';
      } else if (type.prefix === 'TaskSelection') {
        groupKey = 'TaskSelection';
        groupLabel = 'ЗадачаВыборка';
      } else if (type.prefix === 'TaskList') {
        groupKey = 'TaskList';
        groupLabel = 'ЗадачаСписок';
      } else if (type.prefix === 'ExchangePlanRef') {
        groupKey = 'ExchangePlanRef';
        groupLabel = 'ПланОбменаСсылка';
      } else if (type.prefix === 'ExchangePlanObject') {
        groupKey = 'ExchangePlanObject';
        groupLabel = 'ПланОбменаОбъект';
      } else if (type.prefix === 'ExchangePlanManager') {
        groupKey = 'ExchangePlanManager';
        groupLabel = 'ПланОбменаМенеджер';
      } else if (type.prefix === 'ExchangePlanSelection') {
        groupKey = 'ExchangePlanSelection';
        groupLabel = 'ПланОбменаВыборка';
      } else if (type.prefix === 'ExchangePlanList') {
        groupKey = 'ExchangePlanList';
        groupLabel = 'ПланОбменаСписок';
      } else if (type.prefix === 'InformationRegisterRecordSet') {
        groupKey = 'InformationRegisterRecordSet';
        groupLabel = 'РегистрСведенийНаборЗаписей';
      } else if (type.prefix === 'InformationRegisterManager') {
        groupKey = 'InformationRegisterManager';
        groupLabel = 'РегистрСведенийМенеджер';
      } else if (type.prefix === 'InformationRegisterSelection') {
        groupKey = 'InformationRegisterSelection';
        groupLabel = 'РегистрСведенийВыборка';
      } else if (type.prefix === 'AccumulationRegisterRecordSet') {
        groupKey = 'AccumulationRegisterRecordSet';
        groupLabel = 'РегистрНакопленияНаборЗаписей';
      } else if (type.prefix === 'AccumulationRegisterManager') {
        groupKey = 'AccumulationRegisterManager';
        groupLabel = 'РегистрНакопленияМенеджер';
      } else if (type.prefix === 'AccumulationRegisterSelection') {
        groupKey = 'AccumulationRegisterSelection';
        groupLabel = 'РегистрНакопленияВыборка';
      } else if (type.prefix === 'AccountingRegisterRecordSet') {
        groupKey = 'AccountingRegisterRecordSet';
        groupLabel = 'РегистрБухгалтерииНаборЗаписей';
      } else if (type.prefix === 'AccountingRegisterManager') {
        groupKey = 'AccountingRegisterManager';
        groupLabel = 'РегистрБухгалтерииМенеджер';
      } else if (type.prefix === 'AccountingRegisterSelection') {
        groupKey = 'AccountingRegisterSelection';
        groupLabel = 'РегистрБухгалтерииВыборка';
      } else if (type.prefix === 'CalculationRegisterRecordSet') {
        groupKey = 'CalculationRegisterRecordSet';
        groupLabel = 'РегистрРасчетаНаборЗаписей';
      } else if (type.prefix === 'CalculationRegisterManager') {
        groupKey = 'CalculationRegisterManager';
        groupLabel = 'РегистрРасчетаМенеджер';
      } else if (type.prefix === 'CalculationRegisterSelection') {
        groupKey = 'CalculationRegisterSelection';
        groupLabel = 'РегистрРасчетаВыборка';
      } else if (type.prefix === 'EnumRef') {
        groupKey = 'EnumRef';
        groupLabel = 'ПеречислениеСсылка';
      } else if (type.prefix === 'ChartOfCharacteristicTypesRef') {
        groupKey = 'ChartOfCharacteristicTypesRef';
        groupLabel = 'ПланВидовХарактеристикСсылка';
      } else if (type.prefix === 'ChartOfCharacteristicTypesObject') {
        groupKey = 'ChartOfCharacteristicTypesObject';
        groupLabel = 'ПланВидовХарактеристикОбъект';
      } else if (type.prefix === 'ChartOfCharacteristicTypesManager') {
        groupKey = 'ChartOfCharacteristicTypesManager';
        groupLabel = 'ПланВидовХарактеристикМенеджер';
      } else if (type.prefix === 'ChartOfAccountsRef') {
        groupKey = 'ChartOfAccountsRef';
        groupLabel = 'ПланСчетовСсылка';
      } else if (type.prefix === 'ChartOfAccountsObject') {
        groupKey = 'ChartOfAccountsObject';
        groupLabel = 'ПланСчетовОбъект';
      } else if (type.prefix === 'ChartOfAccountsManager') {
        groupKey = 'ChartOfAccountsManager';
        groupLabel = 'ПланСчетовМенеджер';
      } else if (type.prefix === 'ChartOfCalculationTypesRef') {
        groupKey = 'ChartOfCalculationTypesRef';
        groupLabel = 'ПланВидовРасчетаСсылка';
      } else if (type.prefix === 'ChartOfCalculationTypesObject') {
        groupKey = 'ChartOfCalculationTypesObject';
        groupLabel = 'ПланВидовРасчетаОбъект';
      } else if (type.prefix === 'ChartOfCalculationTypesManager') {
        groupKey = 'ChartOfCalculationTypesManager';
        groupLabel = 'ПланВидовРасчетаМенеджер';
      } else if (type.prefix.startsWith('DefinedType')) {
        groupKey = 'DefinedType';
        groupLabel = 'ОпределяемыйТип';
      } else {
        // Для неизвестных типов используем префикс как ключ группы
        groupKey = type.prefix;
        groupLabel = REF_TYPE_PREFIX_MAP[type.prefix] || type.prefix;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(type);
    });
    
    // Преобразуем в массив групп с сортировкой
    const result: Array<{ key: string; label: string; types: Array<{ value: string; label: string; prefix: string }> }> = [];
    
    Object.entries(groups).forEach(([key, types]) => {
      if (types.length === 0) return;
      
      // Определяем название группы на основе первого типа
      const firstType = types[0];
      let groupLabel = '';
      
      if (firstType.prefix === 'CatalogRef') groupLabel = 'СправочникСсылка';
      else if (firstType.prefix === 'CatalogObject') groupLabel = 'СправочникОбъект';
      else if (firstType.prefix === 'CatalogManager') groupLabel = 'СправочникМенеджер';
      else if (firstType.prefix === 'CatalogSelection') groupLabel = 'СправочникВыборка';
      else if (firstType.prefix === 'CatalogList') groupLabel = 'СправочникСписок';
      else if (firstType.prefix === 'DocumentRef') groupLabel = 'ДокументСсылка';
      else if (firstType.prefix === 'DocumentObject') groupLabel = 'ДокументОбъект';
      else if (firstType.prefix === 'DocumentManager') groupLabel = 'ДокументМенеджер';
      else if (firstType.prefix === 'DocumentSelection') groupLabel = 'ДокументВыборка';
      else if (firstType.prefix === 'DocumentList') groupLabel = 'ДокументСписок';
      else if (firstType.prefix === 'BusinessProcessRef') groupLabel = 'БизнесПроцессСсылка';
      else if (firstType.prefix === 'BusinessProcessObject') groupLabel = 'БизнесПроцессОбъект';
      else if (firstType.prefix === 'BusinessProcessManager') groupLabel = 'БизнесПроцессМенеджер';
      else if (firstType.prefix === 'BusinessProcessSelection') groupLabel = 'БизнесПроцессВыборка';
      else if (firstType.prefix === 'BusinessProcessList') groupLabel = 'БизнесПроцессСписок';
      else if (firstType.prefix === 'TaskRef') groupLabel = 'ЗадачаСсылка';
      else if (firstType.prefix === 'TaskObject') groupLabel = 'ЗадачаОбъект';
      else if (firstType.prefix === 'TaskManager') groupLabel = 'ЗадачаМенеджер';
      else if (firstType.prefix === 'TaskSelection') groupLabel = 'ЗадачаВыборка';
      else if (firstType.prefix === 'TaskList') groupLabel = 'ЗадачаСписок';
      else if (firstType.prefix === 'ExchangePlanRef') groupLabel = 'ПланОбменаСсылка';
      else if (firstType.prefix === 'ExchangePlanObject') groupLabel = 'ПланОбменаОбъект';
      else if (firstType.prefix === 'ExchangePlanManager') groupLabel = 'ПланОбменаМенеджер';
      else if (firstType.prefix === 'ExchangePlanSelection') groupLabel = 'ПланОбменаВыборка';
      else if (firstType.prefix === 'ExchangePlanList') groupLabel = 'ПланОбменаСписок';
      else if (firstType.prefix === 'InformationRegisterRecordSet') groupLabel = 'РегистрСведенийНаборЗаписей';
      else if (firstType.prefix === 'InformationRegisterManager') groupLabel = 'РегистрСведенийМенеджер';
      else if (firstType.prefix === 'InformationRegisterSelection') groupLabel = 'РегистрСведенийВыборка';
      else if (firstType.prefix === 'AccumulationRegisterRecordSet') groupLabel = 'РегистрНакопленияНаборЗаписей';
      else if (firstType.prefix === 'AccumulationRegisterManager') groupLabel = 'РегистрНакопленияМенеджер';
      else if (firstType.prefix === 'AccumulationRegisterSelection') groupLabel = 'РегистрНакопленияВыборка';
      else if (firstType.prefix === 'AccountingRegisterRecordSet') groupLabel = 'РегистрБухгалтерииНаборЗаписей';
      else if (firstType.prefix === 'AccountingRegisterManager') groupLabel = 'РегистрБухгалтерииМенеджер';
      else if (firstType.prefix === 'AccountingRegisterSelection') groupLabel = 'РегистрБухгалтерииВыборка';
      else if (firstType.prefix === 'CalculationRegisterRecordSet') groupLabel = 'РегистрРасчетаНаборЗаписей';
      else if (firstType.prefix === 'CalculationRegisterManager') groupLabel = 'РегистрРасчетаМенеджер';
      else if (firstType.prefix === 'CalculationRegisterSelection') groupLabel = 'РегистрРасчетаВыборка';
      else if (firstType.prefix === 'EnumRef') groupLabel = 'ПеречислениеСсылка';
      else if (firstType.prefix === 'ChartOfCharacteristicTypesRef') groupLabel = 'ПланВидовХарактеристикСсылка';
      else if (firstType.prefix === 'ChartOfCharacteristicTypesObject') groupLabel = 'ПланВидовХарактеристикОбъект';
      else if (firstType.prefix === 'ChartOfCharacteristicTypesManager') groupLabel = 'ПланВидовХарактеристикМенеджер';
      else if (firstType.prefix === 'ChartOfAccountsRef') groupLabel = 'ПланСчетовСсылка';
      else if (firstType.prefix === 'ChartOfAccountsObject') groupLabel = 'ПланСчетовОбъект';
      else if (firstType.prefix === 'ChartOfAccountsManager') groupLabel = 'ПланСчетовМенеджер';
      else if (firstType.prefix === 'ChartOfCalculationTypesRef') groupLabel = 'ПланВидовРасчетаСсылка';
      else if (firstType.prefix === 'ChartOfCalculationTypesObject') groupLabel = 'ПланВидовРасчетаОбъект';
      else if (firstType.prefix === 'ChartOfCalculationTypesManager') groupLabel = 'ПланВидовРасчетаМенеджер';
      else if (firstType.prefix.startsWith('DefinedType')) groupLabel = 'ОпределяемыйТип';
      else groupLabel = REF_TYPE_PREFIX_MAP[firstType.prefix] || firstType.prefix;
      
      result.push({
        key,
        label: groupLabel,
        types: types.sort((a, b) => a.label.localeCompare(b.label, 'ru'))
      });
    });
    
    return result
      .sort((a, b) => {
        // Сортируем группы: сначала по базовому типу, затем по типу объекта
        const getBaseTypeOrder = (key: string) => {
          if (key.startsWith('Catalog')) return 1;
          if (key.startsWith('Document')) return 2;
          if (key.startsWith('BusinessProcess')) return 3;
          if (key.startsWith('Task')) return 4;
          if (key.startsWith('ExchangePlan')) return 5;
          if (key.startsWith('InformationRegister')) return 6;
          if (key.startsWith('AccumulationRegister')) return 7;
          if (key.startsWith('AccountingRegister')) return 8;
          if (key.startsWith('CalculationRegister')) return 9;
          if (key.startsWith('Enum')) return 10;
          if (key.startsWith('ChartOfCharacteristicTypes')) return 11;
          if (key.startsWith('ChartOfAccounts')) return 12;
          if (key.startsWith('ChartOfCalculationTypes')) return 13;
          if (key.startsWith('DefinedType')) return 14;
          return 99;
        };
        
        const baseOrderA = getBaseTypeOrder(a.key);
        const baseOrderB = getBaseTypeOrder(b.key);
        if (baseOrderA !== baseOrderB) return baseOrderA - baseOrderB;
        
        // Затем по типу объекта (Ссылка, Объект, Менеджер)
        const getObjectTypeOrder = (key: string) => {
          if (key.includes('Ref') || key.includes('Ссылка')) return 1;
          if (key.includes('Object') || key.includes('Объект')) return 2;
          if (key.includes('Manager') || key.includes('Менеджер')) return 3;
          if (key.includes('Selection') || key.includes('Выборка')) return 4;
          if (key.includes('List') || key.includes('Список')) return 5;
          if (key.includes('RecordSet') || key.includes('НаборЗаписей')) return 6;
          return 99;
        };
        
        const objectOrderA = getObjectTypeOrder(a.key);
        const objectOrderB = getObjectTypeOrder(b.key);
        if (objectOrderA !== objectOrderB) return objectOrderA - objectOrderB;
        
        return a.label.localeCompare(b.label, 'ru');
      });
  }, [referenceTypesList]);
  
  // Парсинг значения типа для предзагрузки
  function parseTypeValue(typeValue: any) {
    if (!typeValue) return;
    // Сбрасываем диагностику для нового открытия
    setTypeParseDebug(null);
    
    let typeStr: string | null = null;
    let qualifiersParsedFromType = false; // Флаг, что квалификаторы уже распарсены из Type.v8:Type
    
    // Если это объект с полем v8:Type
    if (typeof typeValue === 'object' && typeValue !== null) {
      // Определяемый тип: <Type><v8:TypeSet>cfg:DefinedType.Респондент</v8:TypeSet></Type>
      if (typeValue['v8:TypeSet']) {
        const ts = typeValue['v8:TypeSet'];
        if (typeof ts === 'object' && ts !== null && ts['#text']) {
          typeStr = String(ts['#text']);
        } else {
          typeStr = String(ts);
        }
      }

      // Определяемый тип (DefinedType): { "v8:Type": ["cfg:BusinessProcessObject.Задание", ...] }
      if (typeValue['v8:Type'] && Array.isArray(typeValue['v8:Type'])) {
        const parsedTypes: SelectedType[] = [];
        for (const typeStrItem of typeValue['v8:Type']) {
          const clean = (typeof typeStrItem === 'string' ? typeStrItem : String(typeStrItem)).replace(/^cfg:/, '');
          if (clean.includes('.')) {
            const parts = clean.split('.');
            const prefix = parts[0];
            const objName = parts[1] || '';
            const label = REF_TYPE_PREFIX_MAP[prefix] ? `${REF_TYPE_PREFIX_MAP[prefix]}.${objName}` : clean;
            parsedTypes.push({ value: clean, category: 'reference', label });
          }
        }
        setSelectedTypes(parsedTypes);
        return;
      }

      // Проверяем, является ли это составным типом (массив в Type)
      if (typeValue.Type && Array.isArray(typeValue.Type)) {
        // Составной тип - парсим каждый тип из массива
        const parsedTypes: SelectedType[] = [];
        const parsedQualifiers: Qualifiers = {};
        
        for (const typeItem of typeValue.Type) {
          if (typeof typeItem === 'object' && typeItem !== null) {
            let itemTypeStr: string | null = null;

            // В составных типах квалификаторы иногда лежат не на верхнем уровне элемента,
            // а внутри поля Type (если Type представлен объектом).
            const qualifierSource: any =
              (typeItem && typeof typeItem.Type === 'object' && typeItem.Type !== null)
                ? typeItem.Type
                : typeItem;
            
            // Извлекаем тип
            if (typeItem.Type) {
              const itemType = typeItem.Type;
              if (typeof itemType === 'object' && itemType !== null && itemType['#text']) {
                itemTypeStr = String(itemType['#text']);
              } else if (typeof itemType === 'string') {
                itemTypeStr = itemType;
              }
            } else if (typeItem.TypeSet || typeItem['v8:TypeSet']) {
              // Определяемый тип внутри составного типа
              const ts = typeItem.TypeSet || typeItem['v8:TypeSet'];
              if (typeof ts === 'object' && ts !== null && ts['#text']) {
                itemTypeStr = String(ts['#text']);
              } else {
                itemTypeStr = String(ts);
              }
            } else if (typeItem['v8:Type']) {
              const v8Type = typeItem['v8:Type'];
              if (typeof v8Type === 'object' && v8Type !== null && v8Type['#text']) {
                itemTypeStr = String(v8Type['#text']);
              } else if (typeof v8Type === 'string') {
                itemTypeStr = v8Type;
              }
            }
            
            if (!itemTypeStr) continue;
            
            const cleanTypeStr = itemTypeStr.replace(/^cfg:/, '');
            
            // Парсим квалификаторы для этого типа
            if (
              qualifierSource.StringQualifiers ||
              qualifierSource['v8:StringQualifiers'] ||
              typeItem.StringQualifiers ||
              typeItem['v8:StringQualifiers']
            ) {
              const sq =
                qualifierSource.StringQualifiers ||
                qualifierSource['v8:StringQualifiers'] ||
                typeItem.StringQualifiers ||
                typeItem['v8:StringQualifiers'];
              const lengthValue = sq.Length || sq['v8:Length'];
              const parsedLength = lengthValue !== undefined && lengthValue !== null
                ? (typeof lengthValue === 'object' && lengthValue['#text'] !== undefined
                    ? parseInt(lengthValue['#text']) || 0
                    : parseInt(String(lengthValue)) || 0)
                : 10;
              parsedQualifiers.string = {
                length: parsedLength,
                lengthType: (sq.AllowedLength || sq['v8:AllowedLength'] || (sq['v8:AllowedLength']?.['#text'] || 'Variable')) as 'Fixed' | 'Variable'
              };
            } else if (
              qualifierSource.NumberQualifiers ||
              qualifierSource['v8:NumberQualifiers'] ||
              typeItem.NumberQualifiers ||
              typeItem['v8:NumberQualifiers']
            ) {
              const nq =
                qualifierSource.NumberQualifiers ||
                qualifierSource['v8:NumberQualifiers'] ||
                typeItem.NumberQualifiers ||
                typeItem['v8:NumberQualifiers'];
              parsedQualifiers.number = {
                digits: nq.Digits || (nq['v8:Digits']?.['#text'] ? parseInt(nq['v8:Digits']['#text']) : 10),
                fraction: nq.FractionDigits || (nq['v8:FractionDigits']?.['#text'] ? parseInt(nq['v8:FractionDigits']['#text']) : 2),
                sign: (nq.AllowedSign || nq['v8:AllowedSign'] || (nq['v8:AllowedSign']?.['#text'] || 'Any')) as 'Any' | 'Nonnegative'
              };
            } else if (
              qualifierSource.DateQualifiers ||
              qualifierSource['v8:DateQualifiers'] ||
              typeItem.DateQualifiers ||
              typeItem['v8:DateQualifiers']
            ) {
              const dq =
                qualifierSource.DateQualifiers ||
                qualifierSource['v8:DateQualifiers'] ||
                typeItem.DateQualifiers ||
                typeItem['v8:DateQualifiers'];
              parsedQualifiers.date = {
                dateFractions: (dq.DateFractions || dq['v8:DateFractions'] || (dq['v8:DateFractions']?.['#text'] || 'DateTime')) as 'Date' | 'Time' | 'DateTime'
              };
            }
            
            // Определяем категорию и добавляем тип
            if (cleanTypeStr.includes('.')) {
              // Ссылочный тип
              const parts = cleanTypeStr.split('.');
              const refPrefix = parts[0];
              const objName = parts[1] || '';
              if (REF_TYPE_PREFIX_MAP[refPrefix]) {
                const baseLabel = REF_TYPE_PREFIX_MAP[refPrefix] || refPrefix;
                const label = objName ? `${baseLabel}.${objName}` : baseLabel;
                parsedTypes.push({
                  value: cleanTypeStr,
                  category: 'reference',
                  label
                });
              }
            } else if (cleanTypeStr.startsWith('xs:')) {
              // Примитивный тип
              const primitiveType = cleanTypeStr.replace('xs:', '');
              const mapping: Record<string, string> = {
                'string': 'String',
                'decimal': 'Number',
                'int': 'Number',
                'integer': 'Number',
                'boolean': 'Boolean',
                // Важно: сравнение идёт по primitiveType.toLowerCase() => "datetime"
                'datetime': 'Date',
                'dateTime': 'Date',
                'date': 'Date',
                'time': 'Date'
              };
              const mapped = mapping[primitiveType.toLowerCase()] || primitiveType;
              const found = PRIMITIVE_TYPES.find(p => p.value === mapped);
              if (found) {
                parsedTypes.push({
                  value: found.value,
                  category: 'primitive',
                  label: found.label
                });
              }
            } else {
              const special = SPECIAL_TYPES.find((t) => t.value === cleanTypeStr);
              if (special) {
                parsedTypes.push({ value: special.value, category: 'special', label: special.label });
              }
            }
          }
        }
        
        if (parsedTypes.length > 0) {
          setSelectedTypes(parsedTypes);
          setQualifiers(parsedQualifiers);
        }
        return;
      }
      
      if (typeValue['v8:Type']) {
        const v8Type = typeValue['v8:Type'];
        // Если v8:Type это объект с #text, извлекаем текст
        if (typeof v8Type === 'object' && v8Type !== null && v8Type['#text']) {
          typeStr = String(v8Type['#text']);
        } else if (typeof v8Type === 'string') {
          typeStr = v8Type;
        }
      } else if (typeValue.Type && !Array.isArray(typeValue.Type)) {
        const typeValueType = typeValue.Type;
        // Если Type это объект, проверяем разные варианты структуры
        if (typeof typeValueType === 'object' && typeValueType !== null) {
          // Вариант 1: Type содержит v8:Type (структура из XML: <Type><v8:Type>xs:dateTime</v8:Type>...</Type>)
          if (typeValueType['v8:Type']) {
            const v8Type = typeValueType['v8:Type'];
            if (typeof v8Type === 'object' && v8Type !== null && v8Type['#text']) {
              typeStr = String(v8Type['#text']);
            } else if (typeof v8Type === 'string') {
              typeStr = v8Type;
            }
            // Парсим квалификаторы, если они есть в typeValueType
            // Устанавливаем флаг, чтобы не парсить квалификаторы из typeValue позже
            if (typeValueType['v8:StringQualifiers']) {
              const sq = typeValueType['v8:StringQualifiers'];
              const lengthValue = sq['v8:Length'];
              const parsedLength = lengthValue !== undefined && lengthValue !== null
                ? (typeof lengthValue === 'object' && lengthValue['#text'] !== undefined
                    ? parseInt(lengthValue['#text']) || 0
                    : parseInt(String(lengthValue)) || 0)
                : 10;
              setQualifiers({
                string: {
                  length: parsedLength,
                  lengthType: (sq['v8:AllowedLength'] || (sq['v8:AllowedLength']?.['#text'] || 'Variable')) as 'Fixed' | 'Variable'
                }
              });
              qualifiersParsedFromType = true;
            } else if (typeValueType['v8:NumberQualifiers']) {
              const nq = typeValueType['v8:NumberQualifiers'];
              setQualifiers({
                number: {
                  digits: nq['v8:Digits'] || (nq['v8:Digits']?.['#text'] ? parseInt(nq['v8:Digits']['#text']) : 10),
                  fraction: nq['v8:FractionDigits'] || (nq['v8:FractionDigits']?.['#text'] ? parseInt(nq['v8:FractionDigits']['#text']) : 2),
                  sign: (nq['v8:AllowedSign'] || (nq['v8:AllowedSign']?.['#text'] || 'Any')) as 'Any' | 'Nonnegative'
                }
              });
              qualifiersParsedFromType = true;
            } else if (typeValueType['v8:DateQualifiers']) {
              const dq = typeValueType['v8:DateQualifiers'];
              // Извлекаем DateFractions правильно
              let dateFractions: 'Date' | 'Time' | 'DateTime' = 'DateTime';
              if (dq['v8:DateFractions']) {
                const df = dq['v8:DateFractions'];
                if (typeof df === 'object' && df !== null && df['#text']) {
                  dateFractions = String(df['#text']) as 'Date' | 'Time' | 'DateTime';
                } else if (typeof df === 'string') {
                  dateFractions = df as 'Date' | 'Time' | 'DateTime';
                }
              }
              setQualifiers({
                date: {
                  dateFractions: dateFractions
                }
              });
              qualifiersParsedFromType = true;
            }
          } else if (typeValueType['v8:TypeSet']) {
            // Определяемый тип: <Type><v8:TypeSet>cfg:DefinedType.Респондент</v8:TypeSet></Type>
            const ts = typeValueType['v8:TypeSet'];
            if (typeof ts === 'object' && ts !== null && ts['#text']) {
              typeStr = String(ts['#text']);
            } else {
              typeStr = String(ts);
            }
          } else if (typeValueType['#text']) {
            // Вариант 2: Type это объект с #text
          typeStr = String(typeValueType['#text']);
          }
        } else if (typeof typeValueType === 'string') {
          typeStr = typeValueType;
        }
      } else if (typeValue.kind) {
        // Если это объект ParsedTypeRef с полем kind (из парсера)
        // Проверяем TypeSet (определяемый тип)
        if (typeValue.kind === 'TypeSet' && typeValue.details && typeValue.details.TypeSet) {
          const typeSetValue = typeValue.details.TypeSet;
          // Убираем префикс cfg: если есть
          const cleanTypeSet = String(typeSetValue).replace(/^cfg:/, '');
          // Определяем, является ли это DefinedTypeRef
          if (cleanTypeSet.startsWith('DefinedType.')) {
            const objName = cleanTypeSet.replace('DefinedType.', '');
            setSelectedTypes([{
              value: cleanTypeSet, // Например, "DefinedType.Респондент"
              category: 'reference',
              label: `ОпределяемыйТип.${objName}`
            }]);
          } else {
            // Другой формат TypeSet
            setSelectedTypes([{
              value: cleanTypeSet,
              category: 'reference',
              label: cleanTypeSet
            }]);
          }
          return;
        }
        // Проверяем, является ли kind строкой типа (например, "xs:dateTime")
        if (typeof typeValue.kind === 'string' && typeValue.kind.startsWith('xs:')) {
          // Это примитивный тип с префиксом xs: (например, "xs:dateTime")
          typeStr = typeValue.kind;
          // Парсим квалификаторы из details, если они есть
          if (typeValue.details) {
            if (typeValue.details.DateQualifiers) {
              const dq = typeValue.details.DateQualifiers;
              let dateFractions: 'Date' | 'Time' | 'DateTime' = 'DateTime';
              if (dq.DateFractions) {
                dateFractions = String(dq.DateFractions) as 'Date' | 'Time' | 'DateTime';
              } else if (dq['v8:DateFractions']) {
                const df = dq['v8:DateFractions'];
                if (typeof df === 'object' && df !== null && df['#text']) {
                  dateFractions = String(df['#text']) as 'Date' | 'Time' | 'DateTime';
                } else if (typeof df === 'string') {
                  dateFractions = df as 'Date' | 'Time' | 'DateTime';
                }
              }
              setQualifiers({
                date: {
                  dateFractions: dateFractions
                }
              });
              qualifiersParsedFromType = true;
            } else if (typeValue.details.StringQualifiers) {
              const sq = typeValue.details.StringQualifiers;
              const lengthValue = sq.Length || sq['v8:Length'];
              const parsedLength = lengthValue !== undefined && lengthValue !== null
                ? (typeof lengthValue === 'object' && lengthValue['#text'] !== undefined
                    ? parseInt(lengthValue['#text']) || 0
                    : parseInt(String(lengthValue)) || 0)
                : 10;
              setQualifiers({
                string: {
                  length: parsedLength,
                  lengthType: (sq.AllowedLength || sq['v8:AllowedLength'] || (sq['v8:AllowedLength']?.['#text'] || 'Variable')) as 'Fixed' | 'Variable'
                }
              });
              qualifiersParsedFromType = true;
            } else if (typeValue.details.NumberQualifiers) {
              const nq = typeValue.details.NumberQualifiers;
              setQualifiers({
                number: {
                  digits: nq.Digits || (nq['v8:Digits']?.['#text'] ? parseInt(nq['v8:Digits']['#text']) : 10),
                  fraction: nq.FractionDigits || (nq['v8:FractionDigits']?.['#text'] ? parseInt(nq['v8:FractionDigits']['#text']) : 2),
                  sign: (nq.AllowedSign || nq['v8:AllowedSign'] || (nq['v8:AllowedSign']?.['#text'] || 'Any')) as 'Any' | 'Nonnegative'
                }
              });
              qualifiersParsedFromType = true;
            }
          }
          // После установки typeStr и квалификаторов, продолжаем обработку ниже
          // чтобы установить selectedTypes
        } else if (typeValue.kind === 'Composite' && typeValue.details && typeValue.details.Type && Array.isArray(typeValue.details.Type)) {
          // Составной тип из парсера - парсим массив типов
          const parsedTypes: SelectedType[] = [];
          const parsedQualifiers: Qualifiers = {};
          
          for (const typeItem of typeValue.details.Type) {
            if (typeof typeItem === 'object' && typeItem !== null) {
              let itemTypeStr: string | null = null;
              
              if (typeItem.Type) {
                itemTypeStr = typeof typeItem.Type === 'string' ? typeItem.Type : String(typeItem.Type);
              }
              
              if (!itemTypeStr) continue;
              
              const cleanTypeStr = itemTypeStr.replace(/^cfg:/, '');
      
      // Парсим квалификаторы
              if (typeItem.StringQualifiers) {
                const sq = typeItem.StringQualifiers;
                const lengthValue = sq.Length || sq['v8:Length'];
                const parsedLength = lengthValue !== undefined && lengthValue !== null
                  ? (typeof lengthValue === 'object' && lengthValue['#text'] !== undefined
                      ? parseInt(lengthValue['#text']) || 0
                      : parseInt(String(lengthValue)) || 0)
                  : 10;
                parsedQualifiers.string = {
                  length: parsedLength,
                  lengthType: (sq.AllowedLength || sq['v8:AllowedLength'] || 'Variable') as 'Fixed' | 'Variable'
                };
              } else if (typeItem.NumberQualifiers) {
                const nq = typeItem.NumberQualifiers;
                parsedQualifiers.number = {
                  digits: nq.Digits || (nq['v8:Digits']?.['#text'] ? parseInt(nq['v8:Digits']['#text']) : 10),
                  fraction: nq.FractionDigits || (nq['v8:FractionDigits']?.['#text'] ? parseInt(nq['v8:FractionDigits']['#text']) : 2),
                  sign: (nq.AllowedSign || nq['v8:AllowedSign'] || 'Any') as 'Any' | 'Nonnegative'
                };
              } else if (typeItem.DateQualifiers) {
                const dq = typeItem.DateQualifiers;
                parsedQualifiers.date = {
                  dateFractions: (dq.DateFractions || dq['v8:DateFractions'] || 'DateTime') as 'Date' | 'Time' | 'DateTime'
                };
              }
              
              // Определяем категорию и добавляем тип
              if (cleanTypeStr.includes('.')) {
                const parts = cleanTypeStr.split('.');
                const refPrefix = parts[0];
                const objName = parts[1] || '';
                if (REF_TYPE_PREFIX_MAP[refPrefix]) {
                  const baseLabel = REF_TYPE_PREFIX_MAP[refPrefix] || refPrefix;
                  const label = objName ? `${baseLabel}.${objName}` : baseLabel;
                  parsedTypes.push({
                    value: cleanTypeStr,
                    category: 'reference',
                    label
                  });
                }
              } else if (cleanTypeStr.startsWith('xs:')) {
                const primitiveType = cleanTypeStr.replace('xs:', '');
                const mapping: Record<string, string> = {
                  'string': 'String',
                  'decimal': 'Number',
                  'int': 'Number',
                  'integer': 'Number',
                  'boolean': 'Boolean',
                  // primitiveType.toLowerCase() => "datetime"
                  'datetime': 'Date',
                  'dateTime': 'Date',
                  'date': 'Date',
                  'time': 'Date'
                };
                const mapped = mapping[primitiveType.toLowerCase()] || primitiveType;
                const found = PRIMITIVE_TYPES.find(p => p.value === mapped);
                if (found) {
                  parsedTypes.push({
                    value: found.value,
                    category: 'primitive',
                    label: found.label
                  });
                }
              } else {
                const special = SPECIAL_TYPES.find((t) => t.value === cleanTypeStr);
                if (special) {
                  parsedTypes.push({ value: special.value, category: 'special', label: special.label });
                }
              }
            }
          }
          
          if (parsedTypes.length > 0) {
            setSelectedTypes(parsedTypes);
            setQualifiers(parsedQualifiers);
          }
          return;
        }
        typeStr = String(typeValue.kind);
      }
      
      // Парсим квалификаторы только если они еще не были распарсены из Type.v8:Type
      if (!qualifiersParsedFromType) {
      if (typeValue['v8:StringQualifiers']) {
        const sq = typeValue['v8:StringQualifiers'];
        const lengthValue = sq['v8:Length'];
        const parsedLength = lengthValue !== undefined && lengthValue !== null
          ? (typeof lengthValue === 'object' && lengthValue['#text'] !== undefined
              ? parseInt(lengthValue['#text']) || 0
              : parseInt(String(lengthValue)) || 0)
          : 10;
        setQualifiers({
          string: {
            length: parsedLength,
            lengthType: sq['v8:AllowedLength'] || (sq['v8:AllowedLength']?.['#text'] || 'Variable')
          }
        });
      } else if (typeValue['v8:NumberQualifiers']) {
        const nq = typeValue['v8:NumberQualifiers'];
        setQualifiers({
          number: {
            digits: nq['v8:Digits'] || (nq['v8:Digits']?.['#text'] ? parseInt(nq['v8:Digits']['#text']) : 10),
            fraction: nq['v8:FractionDigits'] || (nq['v8:FractionDigits']?.['#text'] ? parseInt(nq['v8:FractionDigits']['#text']) : 2),
            sign: nq['v8:AllowedSign'] || (nq['v8:AllowedSign']?.['#text'] || 'Any')
          }
        });
      } else if (typeValue['v8:DateQualifiers']) {
        const dq = typeValue['v8:DateQualifiers'];
          // Извлекаем DateFractions правильно
          let dateFractions: 'Date' | 'Time' | 'DateTime' = 'DateTime';
          if (dq['v8:DateFractions']) {
            const df = dq['v8:DateFractions'];
            if (typeof df === 'object' && df !== null && df['#text']) {
              dateFractions = String(df['#text']) as 'Date' | 'Time' | 'DateTime';
            } else if (typeof df === 'string') {
              dateFractions = df as 'Date' | 'Time' | 'DateTime';
            }
          }
        setQualifiers({
          date: {
              dateFractions: dateFractions
          }
        });
        }
      }
    } else if (typeof typeValue === 'string') {
      typeStr = typeValue;
    }
    
    if (!typeStr || typeof typeStr !== 'string') {
      console.warn('TypeWidget: Could not extract type string from value:', typeValue);
      setTypeParseDebug({ ok: false, reason: 'Не удалось извлечь строку типа из value', raw: typeValue });
      setSelectedTypes([]);
      setQualifiers({});
      return;
    }
    
    // ВАЖНО: fast-xml-parser у нас работает с trimValues:false, поэтому иногда тип может прийти с пробелами/переносами.
    // Без trim() проверка startsWith('xs:') не сработает, и редактор будет пустым.
    typeStr = typeStr.trim();

    // Убираем префиксы cfg: и xs: для поиска в списке
    const cleanTypeStr = typeStr.replace(/^cfg:/, '').replace(/^xs:/, '');

    // Специальные типы платформы (v8:*)
    const foundSpecial = SPECIAL_TYPES.find((t) => t.value === typeStr || t.value === cleanTypeStr);
    if (foundSpecial) {
      setSelectedTypes([{ value: foundSpecial.value, category: 'special', label: foundSpecial.label }]);
      setTypeParseDebug({ ok: true, typeStr });
      return;
    }

    // Парсим строку типа (например, "xs:string", "CatalogRef.Номенклатура", "cfg:CatalogRef.Организации")
    // Если исходный тип был с префиксом xs:, проверяем это отдельно
    const hasXsPrefix = typeStr.startsWith('xs:');
    
    if (hasXsPrefix) {
      // Примитивный тип с префиксом xs:
      const primitiveType = cleanTypeStr; // Уже без префикса xs:
      const mapping: Record<string, string> = {
        'string': 'String',
        'decimal': 'Number',
        'int': 'Number',
        'integer': 'Number',
        'boolean': 'Boolean',
        // primitiveType.toLowerCase() => "datetime"
        'datetime': 'Date',
        'dateTime': 'Date',
        'date': 'Date',
        'time': 'Date'
      };
      const mapped = mapping[primitiveType.toLowerCase()] || primitiveType;
      const found = PRIMITIVE_TYPES.find(p => p.value === mapped);
      if (found) {
        setSelectedTypes([{ value: found.value, category: 'primitive', label: found.label }]);
        setTypeParseDebug({ ok: true, typeStr });
        // Квалификаторы уже должны быть распарсены выше из typeValueType, если они есть
        // Не перезаписываем их здесь, чтобы не потерять уже распарсенные значения
        return;
      }
    } else if (cleanTypeStr.includes('.')) {
      // Ссылочный тип
      const parts = cleanTypeStr.split('.');
      const refPrefix = parts[0]; // CatalogRef, DocumentRef и т.д.
      const objName = parts[1] || '';
      
      if (REF_TYPE_PREFIX_MAP[refPrefix]) {
        // cleanTypeStr уже без cfg:, поэтому используем его напрямую
        // Ищем в списке ссылочных типов по полному имени типа
        // Ищем в списке ссылочных типов
        // В referenceTypesList значения хранятся как "CatalogRef.Организации" (без cfg:)
        // В cleanTypeStr у нас "CatalogRef.Организации" (без cfg:)
        const foundInList = referenceTypesList.find(rt => {
          // Сравниваем без префикса cfg: (все значения в списке уже без cfg:)
          const rtClean = rt.value.replace(/^cfg:/, '');
          // Сравниваем полное имя типа (например, "CatalogRef.Организации")
          // Основное сравнение: полное имя типа должно совпадать
          const match = rtClean === cleanTypeStr;
          
          return match;
        });
        
        if (foundInList) {
          setSelectedTypes([{
            value: foundInList.value, // Используем значение из списка (без cfg:)
            category: 'reference',
            label: foundInList.label
          }]);
          setTypeParseDebug({ ok: true, typeStr });
        } else {
          // Если не нашли в списке, создаем временную запись с правильным переводом
          const baseLabel = REF_TYPE_PREFIX_MAP[refPrefix] || refPrefix;
          const label = objName ? `${baseLabel}.${objName}` : baseLabel;
          setSelectedTypes([{
            value: cleanTypeStr, // Без префикса cfg: (например, "CatalogRef.Организации")
            category: 'reference',
            label // Переведенное имя (например, "СправочникСсылка.Организации")
          }]);
          setTypeParseDebug({ ok: true, typeStr });
        }
      }
    } else {
      // Если это не ссылочный тип и не xs:, возможно это примитивный тип без префикса
      // или другой формат - пробуем найти в примитивных типах
      const found = PRIMITIVE_TYPES.find(p => {
        const pValue = p.value.toLowerCase();
        const cleanLower = cleanTypeStr.toLowerCase();
        return pValue === cleanLower || 
               (pValue === 'string' && cleanLower === 'string') ||
               (pValue === 'number' && (cleanLower === 'decimal' || cleanLower === 'int' || cleanLower === 'integer')) ||
               (pValue === 'date' && (cleanLower === 'date' || cleanLower === 'datetime' || cleanLower === 'time')) ||
               (pValue === 'boolean' && cleanLower === 'boolean');
      });
      if (found) {
        setSelectedTypes([{ value: found.value, category: 'primitive', label: found.label }]);
        setTypeParseDebug({ ok: true, typeStr });
      } else {
        // Тип распознан как строка, но не сматчился ни на один вариант — показываем диагностику прямо в UI.
        setTypeParseDebug({ ok: false, reason: `Строка типа извлечена (${typeStr}), но не сопоставлена ни с одним вариантом`, typeStr, raw: typeValue });
      }
    }
  }
  
  // Обработка выбора типа
  function handleTypeToggle(type: SelectedType) {
    setSelectedTypes(prev => {
      const exists = prev.find(t => t.value === type.value);
      if (exists) {
        return prev.filter(t => t.value !== type.value);
      } else {
        return [...prev, type];
      }
    });
  }
  
  // Обновление квалификаторов при изменении выбранных типов
  useEffect(() => {
    // Инициализируем квалификаторы для всех выбранных примитивных типов
    const primitiveTypes = selectedTypes.filter(t => t.category === 'primitive');
    
    setQualifiers(prevQualifiers => {
      const newQualifiers: Qualifiers = { ...prevQualifiers };
      
      primitiveTypes.forEach(type => {
        if (type.value === 'String' && !newQualifiers.string) {
          newQualifiers.string = { length: 10, lengthType: 'Variable' };
        } else if (type.value === 'Number' && !newQualifiers.number) {
          newQualifiers.number = { digits: 10, fraction: 2, sign: 'Any' };
        } else if (type.value === 'Date' && !newQualifiers.date) {
          newQualifiers.date = { dateFractions: 'DateTime' };
        }
      });
      
      // Удаляем квалификаторы для типов, которые больше не выбраны
      if (!primitiveTypes.some(t => t.value === 'String')) {
        delete newQualifiers.string;
      }
      if (!primitiveTypes.some(t => t.value === 'Number')) {
        delete newQualifiers.number;
      }
      if (!primitiveTypes.some(t => t.value === 'Date')) {
        delete newQualifiers.date;
      }
      
      return newQualifiers;
    });
  }, [selectedTypes]);
  
  // Сохранение типа
  function handleSave() {
    if (selectedTypes.length === 0) {
      alert('Выберите хотя бы один тип.');
      return;
    }
    
    let newType: any;
    
    if (selectedTypes.length === 1) {
      const type = selectedTypes[0];
      
      if (type.category === 'primitive') {
        if (type.value === 'String') {
          newType = {
            'v8:Type': 'xs:string',
            'v8:StringQualifiers': {
              'v8:Length': qualifiers.string?.length || 10,
              'v8:AllowedLength': qualifiers.string?.lengthType || 'Variable'
            }
          };
        } else if (type.value === 'Number') {
          newType = {
            'v8:Type': 'xs:decimal',
            'v8:NumberQualifiers': {
              'v8:Digits': qualifiers.number?.digits || 10,
              'v8:FractionDigits': qualifiers.number?.fraction || 2,
              'v8:AllowedSign': qualifiers.number?.sign || 'Any'
            }
          };
        } else if (type.value === 'Date') {
          newType = {
            'v8:Type': 'xs:dateTime',
            'v8:DateQualifiers': {
              'v8:DateFractions': qualifiers.date?.dateFractions || 'DateTime'
            }
          };
        } else if (type.value === 'Boolean') {
          newType = { 'v8:Type': 'xs:boolean' };
        } else if (type.value === 'UUID') {
          newType = { 'v8:Type': 'xs:string' }; // UUID обычно как строка
        } else {
          newType = { 'v8:Type': type.value };
        }
      } else {
        // Ссылочный тип - проверяем, является ли это определяемым типом (DefinedType)
        if (type.value.startsWith('DefinedType.')) {
          // Определяемый тип - сохраняем как TypeSet
          const typeSetValue = type.value.startsWith('cfg:') ? type.value : `cfg:${type.value}`;
          newType = { 'v8:TypeSet': typeSetValue };
        } else {
          // Обычный ссылочный тип - используем утилиту для нормализации
        const typeValue = normalizeTypeForSave(type.value, referenceTypesList);
        newType = { 'v8:Type': typeValue };
        }
      }
    } else {
      // Режим определяемого типа (DefinedType): массив ссылочных типов без квалификаторов
      const definedTypeMode = (options?.definedTypeMode as boolean) === true;
      const allReferenceNoQualifiers = selectedTypes.every(t => t.category === 'reference') &&
        !qualifiers.string && !qualifiers.number && !qualifiers.date;
      if (definedTypeMode && allReferenceNoQualifiers) {
        newType = {
          'v8:Type': selectedTypes.map(t => {
            if (t.value.startsWith('DefinedType.')) {
              return t.value.startsWith('cfg:') ? t.value : `cfg:${t.value}`;
            }
            return normalizeTypeForSave(t.value, referenceTypesList);
          })
        };
      } else {
        // Составной тип - создаем массив типов с квалификаторами
        // Структура: { Type: [{ Type: 'xs:string', StringQualifiers: {...} }, ...] }
        newType = {
          Type: selectedTypes.map(t => {
          // Для примитивных типов создаем объект с типом и квалификаторами
          if (t.category === 'primitive') {
            if (t.value === 'String' && qualifiers.string) {
              return {
                Type: 'xs:string',
                StringQualifiers: {
                  Length: qualifiers.string.length,
                  AllowedLength: qualifiers.string.lengthType
                }
              };
            } else if (t.value === 'Number' && qualifiers.number) {
              return {
                Type: 'xs:decimal',
                NumberQualifiers: {
                  Digits: qualifiers.number.digits,
                  FractionDigits: qualifiers.number.fraction,
                  AllowedSign: qualifiers.number.sign
                }
              };
            } else if (t.value === 'Date' && qualifiers.date) {
              return {
                Type: 'xs:dateTime',
                DateQualifiers: {
                  DateFractions: qualifiers.date.dateFractions
                }
              };
            } else if (t.value === 'Boolean') {
              return { Type: 'xs:boolean' };
            } else if (t.value === 'UUID') {
              return { Type: 'xs:string' };
            } else {
              return { Type: t.value };
            }
          } else {
          // Для ссылочных типов используем утилиту для нормализации
            // Но для DefinedType.* нужно сохранять через TypeSet
            if (t.value.startsWith('DefinedType.')) {
              const typeSetValue = t.value.startsWith('cfg:') ? t.value : `cfg:${t.value}`;
              return { TypeSet: typeSetValue };
            }
            const typeValue = normalizeTypeForSave(t.value, referenceTypesList);
            return { Type: typeValue };
          }
        })
      };
      }
    }
    
    onChange(newType);
    setIsOpen(false);
    setSelectedTypes([]);
    setQualifiers({});
    setSearchQuery('');
  }
  
  // Отмена
  function handleCancel() {
    setIsOpen(false);
    setSelectedTypes([]);
    setQualifiers({});
    setSearchQuery('');
  }
  
  // Форматирование значения для отображения
  function formatDisplayValue(): string {
    if (!value) return 'Не указано';
    
    let typeStr: string | null = null;
    
    if (typeof value === 'object' && value !== null) {
      // Определяемый тип (TypeSet)
      if (value['v8:TypeSet']) {
        const ts = value['v8:TypeSet'];
        const raw = (typeof ts === 'object' && ts !== null && ts['#text']) ? String(ts['#text']) : String(ts);
        const clean = raw.replace(/^cfg:/, '');
        if (clean.startsWith('DefinedType.')) {
          return clean.replace('DefinedType.', 'ОпределяемыйТип.');
        }
        return clean;
      }

      // Массив v8:Type (DefinedType)
      if (value['v8:Type'] && Array.isArray(value['v8:Type'])) {
        const parts = value['v8:Type'].map((t: any) => {
          const s = typeof t === 'string' ? t : String(t);
          const clean = s.replace(/^cfg:/, '');
          if (clean.startsWith('DefinedType.')) return clean.replace('DefinedType.', 'ОпределяемыйТип.');
          if (clean.includes('.')) {
            const [prefix, objName] = clean.split('.');
            return REF_TYPE_PREFIX_MAP[prefix] ? `${REF_TYPE_PREFIX_MAP[prefix]}.${objName}` : clean;
          }
          return clean;
        });
        return parts.join(', ');
      }

      if (value['v8:Type']) {
        const v8Type = value['v8:Type'];
        // Если v8:Type это объект с #text, извлекаем текст
        if (typeof v8Type === 'object' && v8Type !== null && v8Type['#text']) {
          typeStr = String(v8Type['#text']);
        } else if (typeof v8Type === 'string') {
          typeStr = v8Type;
        }
        
        // Проверяем, является ли это составным типом (массив v8:Type)
        // Структура может быть: { Type: [{ Type: '...' }, { Type: '...' }] }
        // или из парсера: { Type: { 'v8:Type': ['...', '...'] } }
        if (value.Type && Array.isArray(value.Type)) {
          const types = value.Type.map((t: any) => {
            let tStr = '';
            if (typeof t === 'object' && t !== null) {
              if (t.Type) {
                tStr = typeof t.Type === 'string' ? t.Type : (t.Type['#text'] || String(t.Type));
              } else if (t.TypeSet || t['v8:TypeSet']) {
                const ts = t.TypeSet || t['v8:TypeSet'];
                tStr = typeof ts === 'string' ? ts : (ts?.['#text'] || String(ts));
              } else if (t['v8:Type']) {
                const tType = t['v8:Type'];
                if (typeof tType === 'object' && tType !== null && tType['#text']) {
                  tStr = String(tType['#text']);
                } else if (typeof tType === 'string') {
                  tStr = tType;
                }
              }
            } else if (typeof t === 'string') {
              tStr = t;
            }
            // Убираем префикс cfg: для отображения
            const cleanTStr = tStr.replace(/^cfg:/, '');
            if (cleanTStr.startsWith('DefinedType.')) {
              return cleanTStr.replace('DefinedType.', 'ОпределяемыйТип.');
            }
            const special = SPECIAL_TYPES.find((s) => s.value === cleanTStr);
            if (special) return special.label;

            if (cleanTStr.includes('.')) {
              const parts = cleanTStr.split('.');
              const refPrefix = parts[0];
              if (REF_TYPE_PREFIX_MAP[refPrefix]) {
                return `${REF_TYPE_PREFIX_MAP[refPrefix]}.${parts[1]}`;
              }
            }
            return cleanTStr;
          }).filter((t: string) => t).join(', ');
          return `Один из (${types})`;
        }
        
        // Проверяем старую структуру OneOf/TypeSet (для обратной совместимости)
        if (typeStr === 'OneOf' && value['v8:TypeSet']) {
          const typeSet = Array.isArray(value['v8:TypeSet']) ? value['v8:TypeSet'] : [value['v8:TypeSet']];
          const types = typeSet.map((t: any) => {
            let tStr = '';
            if (typeof t === 'object' && t !== null) {
              if (t['v8:Type']) {
                const tType = t['v8:Type'];
                if (typeof tType === 'object' && tType !== null && tType['#text']) {
                  tStr = String(tType['#text']);
                } else if (typeof tType === 'string') {
                  tStr = tType;
                }
              }
            } else if (typeof t === 'string') {
              tStr = t;
            }
            // Убираем префикс cfg: для отображения
            const cleanTStr = tStr.replace(/^cfg:/, '');
            const special = SPECIAL_TYPES.find((s) => s.value === cleanTStr);
            if (special) return special.label;

            if (cleanTStr.includes('.')) {
              const parts = cleanTStr.split('.');
              const refPrefix = parts[0];
              if (REF_TYPE_PREFIX_MAP[refPrefix]) {
                return `${REF_TYPE_PREFIX_MAP[refPrefix]}.${parts[1]}`;
              }
            }
            return cleanTStr;
          }).filter((t: string) => t).join(', ');
          return `Один из (${types})`;
        }
      } else if (value.Type) {
        const typeValueType = value.Type;
        if (typeof typeValueType === 'object' && typeValueType !== null && typeValueType['#text']) {
          typeStr = String(typeValueType['#text']);
        } else if (typeof typeValueType === 'string') {
          typeStr = typeValueType;
        }
      } else if (value.kind) {
        // Если это объект ParsedTypeRef с полем kind (из парсера)
        if (value.kind === 'Composite' && value.details && value.details.Type && Array.isArray(value.details.Type)) {
          // Составной тип из парсера - отображаем список типов
          const types = value.details.Type.map((t: any) => {
            const tType = typeof t === 'object' && t !== null ? (t.Type || t['v8:Type'] || '') : String(t);
            const cleanTStr = String(tType).replace(/^cfg:/, '');
            const special = SPECIAL_TYPES.find((s) => s.value === cleanTStr);
            if (special) return special.label;

            if (cleanTStr.includes('.')) {
              const parts = cleanTStr.split('.');
              const refPrefix = parts[0];
              if (REF_TYPE_PREFIX_MAP[refPrefix]) {
                return `${REF_TYPE_PREFIX_MAP[refPrefix]}.${parts[1]}`;
              }
            }
            return cleanTStr;
          }).filter((t: string) => t).join(', ');
          return `Один из (${types})`;
        }
        // Для обычных типов из парсера (не Composite или Composite без массива Type)
        typeStr = String(value.kind);
      }
    } else if (typeof value === 'string') {
      typeStr = value;
    }
    
    if (!typeStr || typeof typeStr !== 'string') {
      return 'Не указано';
    }
    
    // Убираем префикс cfg: для отображения
    const cleanTypeStr = typeStr.replace(/^cfg:/, '');

    const special = SPECIAL_TYPES.find((s) => s.value === cleanTypeStr);
    if (special) return special.label;
    
    if (cleanTypeStr.includes('.')) {
      const parts = cleanTypeStr.split('.');
      const refPrefix = parts[0];
      if (REF_TYPE_PREFIX_MAP[refPrefix]) {
        return `${REF_TYPE_PREFIX_MAP[refPrefix]}.${parts[1]}`;
      }
      return cleanTypeStr;
    } else if (cleanTypeStr.startsWith('xs:')) {
      const primitive = cleanTypeStr.replace('xs:', '');
      const mapping: Record<string, string> = {
        'string': 'Строка',
        'decimal': 'Число',
        'int': 'Число',
        'integer': 'Число',
        'boolean': 'Булево',
        'dateTime': 'Дата',
        'date': 'Дата',
        'time': 'Время'
      };
      return mapping[primitive.toLowerCase()] || primitive;
    }
    
    return cleanTypeStr;
  }
  
  // Фильтрация типов по поисковому запросу
  const filteredPrimitiveTypes = useMemo(() => {
    if (!searchQuery) return PRIMITIVE_TYPES;
    const query = searchQuery.toLowerCase();
    return PRIMITIVE_TYPES.filter(t => 
      t.label.toLowerCase().includes(query) || t.value.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const filteredSpecialTypes = useMemo(() => {
    if (!searchQuery) return SPECIAL_TYPES;
    const query = searchQuery.toLowerCase();
    return SPECIAL_TYPES.filter(t =>
      t.label.toLowerCase().includes(query) || t.value.toLowerCase().includes(query)
    );
  }, [searchQuery]);
  
  const filteredReferenceTypes = useMemo(() => {
    if (!searchQuery) return referenceTypesList;
    const query = searchQuery.toLowerCase();
    return referenceTypesList.filter(t => 
      t.label.toLowerCase().includes(query) || t.value.toLowerCase().includes(query)
    );
  }, [searchQuery, referenceTypesList]);
  
  // Определяем, какие квалификаторы показывать (для всех выбранных примитивных типов)
  const primitiveTypesWithQualifiers = selectedTypes
    .filter(t => t.category === 'primitive' && ['String', 'Number', 'Date'].includes(t.value))
    .map(t => t.value);
  
  // Логируем состояние при каждом рендере
  useEffect(() => {
    console.log('[TypeWidget] Рендер компонента', { isOpen, value, id: props.id });
  });

  return (
    <div className="type-widget">
      <div className="type-widget-input-wrapper">
        <input
          type="text"
          value={formatDisplayValue()}
          readOnly
          placeholder="Выберите тип..."
          className="type-input"
          onClick={() => {
            console.log('[TypeWidget] Клик по input - открываем модальное окно');
            setIsOpen(true);
          }}
        />
        <UiButton
          icon="edit"
          title="Открыть редактор типов"
          onClick={() => {
            console.log('[TypeWidget] Клик по кнопке - открываем модальное окно');
            setIsOpen(true);
          }}
        />
      </div>
      
      {(() => {
        if (isOpen) {
          console.log('[TypeWidget] Рендерим модальное окно редактора типов', { isOpen, value });
        }
        return null;
      })()}
      {isOpen && (
        <div className="type-editor-modal-overlay" onClick={handleCancel}>
          <div className="type-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="type-editor-header">
              <h3>Редактор типа</h3>
              <button className="modal-close" onClick={handleCancel}>×</button>
            </div>
            
            <div className="type-editor-body">
              <div className="type-editor-left">
                <div className="type-search">
                  <input
                    type="text"
                    placeholder="Поиск типа..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="type-search-input"
                  />
                </div>
                
                <div className="type-categories">
                  <div className="type-category">
                    <div className="type-category-header">
                      <label>
                        <input
                          type="checkbox"
                          checked={filteredPrimitiveTypes.length > 0 && 
                                   filteredPrimitiveTypes.every(t => 
                                     selectedTypes.some(st => st.value === t.value)
                                   )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTypes(prev => {
                                const newTypes = filteredPrimitiveTypes
                                  .filter(t => !prev.some(p => p.value === t.value))
                                  .map(t => ({ value: t.value, category: 'primitive' as const, label: t.label }));
                                return [...prev, ...newTypes];
                              });
                            } else {
                              setSelectedTypes(prev => 
                                prev.filter(t => !filteredPrimitiveTypes.some(pt => pt.value === t.value))
                              );
                            }
                          }}
                        />
                        Примитивные типы
                      </label>
                    </div>
                    <div className="type-list">
                      {filteredPrimitiveTypes.map(type => (
                        <label key={type.value} className="type-item">
                          <input
                            type="checkbox"
                            checked={selectedTypes.some(t => t.value === type.value)}
                            onChange={() => handleTypeToggle({ 
                              value: type.value, 
                              category: 'primitive', 
                              label: type.label 
                            })}
                          />
                          <span>{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {SPECIAL_TYPES.length > 0 && (
                    <div className="type-category">
                      <div className="type-category-header">
                        <label>
                          <input
                            type="checkbox"
                            checked={filteredSpecialTypes.length > 0 && 
                                     filteredSpecialTypes.every(t => 
                                       selectedTypes.some(st => st.value === t.value)
                                     )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTypes(prev => {
                                  const newTypes = filteredSpecialTypes
                                    .filter(t => !prev.some(p => p.value === t.value))
                                    .map(t => ({ value: t.value, category: 'special' as const, label: t.label }));
                                  return [...prev, ...newTypes];
                                });
                              } else {
                                setSelectedTypes(prev => 
                                  prev.filter(t => !filteredSpecialTypes.some(st => st.value === t.value))
                                );
                              }
                            }}
                          />
                          Специальные типы
                        </label>
                      </div>
                      <div className="type-list">
                        {filteredSpecialTypes.map(type => (
                          <label key={type.value} className="type-item">
                            <input
                              type="checkbox"
                              checked={selectedTypes.some(t => t.value === type.value)}
                              onChange={() => handleTypeToggle({
                                value: type.value,
                                category: 'special',
                                label: type.label
                              })}
                            />
                            <span>{type.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {groupedReferenceTypes.length > 0 && (
                    <div className="type-category">
                      <div className="type-category-header">
                        <label>
                          <input
                            type="checkbox"
                            checked={filteredReferenceTypes.length > 0 && 
                                     filteredReferenceTypes.every(t => 
                                       selectedTypes.some(st => {
                                         // Сравниваем значения без учета префикса cfg:
                                         const stClean = st.value.replace(/^cfg:/, '');
                                         const tClean = t.value.replace(/^cfg:/, '');
                                         return stClean === tClean || st.value === t.value;
                                       })
                                     )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTypes(prev => {
                                  const newTypes = filteredReferenceTypes
                                    .filter(t => !prev.some(p => p.value === t.value))
                                    .map(t => ({ value: t.value, category: 'reference' as const, label: t.label }));
                                  return [...prev, ...newTypes];
                                });
                              } else {
                                setSelectedTypes(prev => 
                                  prev.filter(t => !filteredReferenceTypes.some(rt => rt.value === t.value))
                                );
                              }
                            }}
                          />
                          Ссылочные типы
                        </label>
                      </div>
                      <div className="type-list">
                        {groupedReferenceTypes.map(group => {
                          // Фильтруем типы группы по поисковому запросу
                          const filteredGroupTypes = searchQuery
                            ? group.types.filter(t => 
                                t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                t.value.toLowerCase().includes(searchQuery.toLowerCase())
                              )
                            : group.types;
                          
                          // Если поисковый запрос активен и группа не содержит результатов, не показываем группу
                          if (searchQuery && filteredGroupTypes.length === 0) {
                            return null;
                          }
                          
                          const isExpanded = expandedGroups[group.key] === true; // По умолчанию свернуто
                          
                          return (
                            <div key={group.key} className="type-group">
                              <div 
                                className="type-group-header"
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  cursor: 'pointer',
                                  padding: '4px 0',
                                  userSelect: 'none'
                                }}
                                onClick={() => setExpandedGroups(prev => ({
                                  ...prev,
                                  [group.key]: !isExpanded
                                }))}
                              >
                                <span style={{ marginRight: '6px', fontSize: '12px', width: '12px', display: 'inline-block' }}>
                                  {isExpanded ? '−' : '+'}
                                </span>
                                <span style={{ fontWeight: '500' }}>{group.label}</span>
                                <span style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.7 }}>
                                  ({filteredGroupTypes.length})
                                </span>
                              </div>
                              {isExpanded && (
                                <div className="type-group-items" style={{ marginLeft: '18px', marginTop: '4px' }}>
                                  {filteredGroupTypes.map(type => (
                                    <label key={type.value} className="type-item">
                                      <input
                                        type="checkbox"
                                        checked={selectedTypes.some(t => {
                                          // Сравниваем значения без учета префикса cfg:
                                          const tClean = t.value.replace(/^cfg:/, '');
                                          const typeClean = type.value.replace(/^cfg:/, '');
                                          return tClean === typeClean || t.value === type.value;
                                        })}
                                        onChange={() => handleTypeToggle({ 
                                          value: type.value, 
                                          category: 'reference', 
                                          label: type.label 
                                        })}
                                      />
                                      <span>{type.label}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="type-editor-right">
                <h4>Квалификаторы типа</h4>
                
                {primitiveTypesWithQualifiers.length === 0 && (
                  <div className="qualifiers-panel">
                    <i>Выберите примитивный тип (Строка, Число или Дата) для настройки квалификаторов</i>
                  </div>
                )}
                
                {primitiveTypesWithQualifiers.includes('String') && qualifiers.string && (
                  <div className="qualifiers-panel">
                    <h5>Строка</h5>
                    <div className="qualifier-group">
                      <label>Длина:</label>
                      <input
                        type="number"
                        value={qualifiers.string.length}
                        onChange={(e) => {
                          const newLength = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                          setQualifiers({
                          ...qualifiers,
                            string: { ...qualifiers.string!, length: newLength }
                          });
                        }}
                        min="0"
                        max="1024"
                      />
                    </div>
                    <div className="qualifier-group">
                      <label>Тип длины:</label>
                      <select
                        value={qualifiers.string.lengthType}
                        onChange={(e) => setQualifiers({
                          ...qualifiers,
                          string: { ...qualifiers.string!, lengthType: e.target.value as 'Fixed' | 'Variable' }
                        })}
                      >
                        <option value="Fixed">Фиксированная</option>
                        <option value="Variable">Переменная</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {primitiveTypesWithQualifiers.includes('Number') && qualifiers.number && (
                  <div className="qualifiers-panel">
                    <h5>Число</h5>
                    <div className="qualifier-group">
                      <label>Разрядов:</label>
                      <input
                        type="number"
                        value={qualifiers.number.digits}
                        onChange={(e) => setQualifiers({
                          ...qualifiers,
                          number: { ...qualifiers.number!, digits: parseInt(e.target.value) || 10 }
                        })}
                        min="1"
                        max="32"
                      />
                    </div>
                    <div className="qualifier-group">
                      <label>Дробных разрядов:</label>
                      <input
                        type="number"
                        value={qualifiers.number.fraction}
                        onChange={(e) => setQualifiers({
                          ...qualifiers,
                          number: { ...qualifiers.number!, fraction: parseInt(e.target.value) || 2 }
                        })}
                        min="0"
                        max="10"
                      />
                    </div>
                    <div className="qualifier-group">
                      <label>Знак:</label>
                      <select
                        value={qualifiers.number.sign}
                        onChange={(e) => setQualifiers({
                          ...qualifiers,
                          number: { ...qualifiers.number!, sign: e.target.value as 'Any' | 'Nonnegative' }
                        })}
                      >
                        <option value="Any">Любой</option>
                        <option value="Nonnegative">Неотрицательный</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {primitiveTypesWithQualifiers.includes('Date') && qualifiers.date && (
                  <div className="qualifiers-panel">
                    <h5>Дата</h5>
                    <div className="qualifier-group">
                      <label>Части даты:</label>
                      <select
                        value={qualifiers.date.dateFractions}
                        onChange={(e) => setQualifiers({
                          ...qualifiers,
                          date: { ...qualifiers.date!, dateFractions: e.target.value as 'Date' | 'Time' | 'DateTime' }
                        })}
                      >
                        <option value="Date">Дата</option>
                        <option value="Time">Время</option>
                        <option value="DateTime">Дата и время</option>
                      </select>
                    </div>
                  </div>
                )}
                
                <div className="selected-types-panel">
                  <h4>Выбранные типы:</h4>
                  <div className="selected-types-list">
                    {selectedTypes.length === 0 ? (
                      <>
                      <i>Типы не выбраны</i>
                        {typeParseDebug && !typeParseDebug.ok && (
                          <details style={{ marginTop: '8px' }}>
                            <summary style={{ cursor: 'pointer' }}>Диагностика типа</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto' }}>
                              {JSON.stringify(typeParseDebug, null, 2)}
                            </pre>
                          </details>
                        )}
                      </>
                    ) : (
                      selectedTypes.map((type, index) => (
                        <span key={index} className="selected-type-badge">
                          {type.label}
                          <span 
                            className="remove-type" 
                            onClick={() => setSelectedTypes(prev => prev.filter((_, i) => i !== index))}
                          >
                            ×
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="type-editor-footer">
              <button className="btn-secondary" onClick={handleCancel}>Отмена</button>
              <button className="btn-primary" onClick={handleSave}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

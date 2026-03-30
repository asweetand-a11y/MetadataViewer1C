/**
 * JSON Schema для конкретных типов объектов метаданных 1С
 */

import { JSONSchema7 } from 'json-schema';
import { basePropertiesSchema, multilingualFieldSchema, standardAttributesSchema, typeSchema } from './baseSchema';

/**
 * Схема для реквизита (Attribute)
 */
export const attributeSchema: JSONSchema7 = {
  type: 'object',
  title: 'Реквизит',
  properties: {
    ...basePropertiesSchema.properties,
    Type: typeSchema,
    StandardAttributes: standardAttributesSchema,
    FillValue: {
      oneOf: [
        { type: 'null' },
        { type: 'string' },
        { type: 'number' }
      ],
      title: 'Значение заполнения'
    },
    ChoiceParameterLinks: {
      type: 'object',
      title: 'Связи параметров выбора'
    },
    ChoiceParameters: {
      type: 'object',
      title: 'Параметры выбора'
    }
  },
  required: ['Name']
};

/**
 * Схема для табличной части (TabularSection)
 */
export const tabularSectionSchema: JSONSchema7 = {
  type: 'object',
  title: 'Табличная часть',
  properties: {
    ...basePropertiesSchema.properties,
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    }
  },
  required: ['Name']
};

/**
 * Схема для формы (Form)
 */
export const formSchema: JSONSchema7 = {
  type: 'object',
  title: 'Форма',
  properties: {
    ...basePropertiesSchema.properties,
    AuxiliaryForm: {
      type: 'string',
      title: 'Вспомогательная форма'
    },
    DefaultForm: {
      type: 'string',
      title: 'Форма по умолчанию'
    }
  },
  required: ['Name']
};

/**
 * Схема для команды (Command)
 */
export const commandSchema: JSONSchema7 = {
  type: 'object',
  title: 'Команда',
  properties: {
    ...basePropertiesSchema.properties
  },
  required: ['Name']
};

/**
 * Схема для документа (Document)
 */
export const documentSchema: JSONSchema7 = {
  type: 'object',
  title: 'Документ',
  properties: {
    ...basePropertiesSchema.properties,
    Posting: {
      type: 'string',
      title: 'Проведение',
      enum: ['Allow', 'Deny'],
      default: 'Allow'
    },
    RealTimePosting: {
      type: 'string',
      title: 'Проведение в реальном времени',
      enum: ['Allow', 'Deny'],
      default: 'Deny'
    },
    SequenceFilling: {
      type: 'string',
      title: 'Заполнение последовательности',
      enum: ['AutoFillOff', 'AutoFillOn', 'AutoFillOnWrite'],
      default: 'AutoFillOff'
    },
    RegisterRecordsWritingOnPost: {
      type: 'string',
      title: 'Запись регистров при проведении',
      enum: ['WriteSelected', 'WriteModified'],
      default: 'WriteSelected'
    },
    PostInPrivilegedMode: {
      type: 'boolean',
      title: 'Проведение в привилегированном режиме',
      default: false
    },
    UnpostInPrivilegedMode: {
      type: 'boolean',
      title: 'Отмена проведения в привилегированном режиме',
      default: false
    },
    BasedOn: {
      type: 'array',
      title: 'Основание',
      items: {
        type: 'object',
        properties: {
          Item: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              type: { type: 'string', default: 'xr:MDObjectRef' }
            }
          }
        }
      }
    },
    RegisterRecords: {
      type: 'array',
      title: 'Записи регистров',
      items: {
        type: 'object',
        properties: {
          Item: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              type: { type: 'string', default: 'xr:MDObjectRef' }
            }
          }
        }
      }
    },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
    tabularSections: {
      type: 'array',
      title: 'Табличные части',
      items: tabularSectionSchema
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
    commands: {
      type: 'array',
      title: 'Команды',
      items: commandSchema
    }
  },
  required: ['Name']
};

/**
 * Схема для справочника (Catalog)
 */
export const catalogSchema: JSONSchema7 = {
  type: 'object',
  title: 'Справочник',
  properties: {
    ...basePropertiesSchema.properties,
    Hierarchical: {
      type: 'boolean',
      title: 'Иерархический',
      default: false
    },
    HierarchyType: {
      type: 'string',
      title: 'Тип иерархии',
      enum: ['HierarchyFoldersAndItems', 'HierarchyOfItems'],
      default: 'HierarchyFoldersAndItems'
    },
    FoldersOnTop: {
      type: 'boolean',
      title: 'Папки сверху',
      default: false
    },
    UseInputByString: {
      type: 'boolean',
      title: 'Использовать ввод по строке',
      default: true
    },
    InputByString: {
      type: 'object',
      title: 'Ввод по строке',
      properties: {
        Field: {
          type: 'string',
          title: 'Поле'
        }
      }
    },
    CodeLength: {
      type: 'string',
      title: 'Длина кода',
      enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '15', '20', '25', '50'],
      default: '9'
    },
    CodeAllowedLength: {
      type: 'string',
      title: 'Тип длины кода',
      enum: ['Variable', 'Fixed'],
      default: 'Variable'
    },
    CodeSeries: {
      type: 'string',
      title: 'Серия кода',
      enum: ['WholeCatalog', 'WithinOwnerSubordination', 'WithinOwnerHierarchy', 'WholeCharacteristicKind'],
      default: 'WholeCatalog'
    },
    SubordinationUse: {
      type: 'string',
      title: 'Подчинение',
      enum: ['ToItems', 'ToFolders', 'ToFoldersAndItems'],
      default: 'ToItems'
    },
    DescriptionLength: {
      type: 'string',
      title: 'Длина описания',
      enum: ['10', '25', '50', '100', '150', '200', '250', '300', '500'],
      default: '150'
    },
    CheckUnique: {
      type: 'boolean',
      title: 'Проверять уникальность',
      default: false
    },
    Autonumbering: {
      type: 'boolean',
      title: 'Автонумерация',
      default: false
    },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
    tabularSections: {
      type: 'array',
      title: 'Табличные части',
      items: tabularSectionSchema
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
    commands: {
      type: 'array',
      title: 'Команды',
      items: commandSchema
    }
  },
  required: ['Name']
};

/**
 * Схема для перечисления (Enum)
 */
export const enumSchema: JSONSchema7 = {
  type: 'object',
  title: 'Перечисление',
  properties: {
    ...basePropertiesSchema.properties,
    enumValues: {
      type: 'array',
      title: 'Значения перечисления',
      items: {
        type: 'object',
        properties: {
          ...basePropertiesSchema.properties,
          Value: {
            type: 'number',
            title: 'Значение'
          }
        },
        required: ['Name', 'Value']
      }
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
    commands: {
      type: 'array',
      title: 'Команды',
      items: commandSchema
    }
  },
  required: ['Name']
};

/**
 * Схема для формы (Form) - отдельный объект
 */
export const formObjectSchema: JSONSchema7 = {
  type: 'object',
  title: 'Форма',
  properties: {
    ...basePropertiesSchema.properties,
    AuxiliaryForm: {
      type: 'string',
      title: 'Вспомогательная форма'
    },
    DefaultForm: {
      type: 'string',
      title: 'Форма по умолчанию'
    }
  },
  required: ['Name']
};

// ============================================
// Автоматически сгенерированные схемы
// ============================================

/**
 * Схема для InformationRegister
 */
export const informationRegisterSchema: JSONSchema7 = {
  type: 'object',
  title: 'InformationRegister',
  properties: {
    ...basePropertiesSchema.properties,
    EditType: { type: 'string', title: 'EditType' },
    DefaultRecordForm: { type: 'string', title: 'DefaultRecordForm' },
    DefaultListForm: { type: 'string', title: 'DefaultListForm' },
    AuxiliaryRecordForm: { type: 'string', title: 'AuxiliaryRecordForm' },
    AuxiliaryListForm: { type: 'string', title: 'AuxiliaryListForm' },
    InformationRegisterPeriodicity: {
      type: 'string',
      title: 'InformationRegisterPeriodicity',
      enum: [
        'Nonperiodical',
        'Second',
        'Day',
        'Month',
        'Quarter',
        'Year',
        'RecorderPosition'
      ]
    },
    WriteMode: {
      type: 'string',
      title: 'WriteMode',
      enum: ["Independent","RecorderSubordinate"]
    },
    MainFilterOnPeriod: {
      type: 'string',
      title: 'MainFilterOnPeriod',
      enum: ['true', 'false'],
      default: 'false'
    },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    DataLockControlMode: { type: 'string', title: 'DataLockControlMode' },
    FullTextSearch: { type: 'string', title: 'FullTextSearch' },
    EnableTotalsSliceFirst: {
      type: 'string',
      title: 'EnableTotalsSliceFirst',
      enum: ['true', 'false'],
      default: 'false'
    },
    EnableTotalsSliceLast: {
      type: 'string',
      title: 'EnableTotalsSliceLast',
      enum: ['true', 'false'],
      default: 'false'
    },
    RecordPresentation: { type: 'string', title: 'RecordPresentation' },
    ExtendedRecordPresentation: { type: 'string', title: 'ExtendedRecordPresentation' },
    ListPresentation: { type: 'string', title: 'ListPresentation' },
    ExtendedListPresentation: { type: 'string', title: 'ExtendedListPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
    DataHistory: { type: 'string', title: 'DataHistory' },
    UpdateDataHistoryImmediatelyAfterWrite: {
      type: 'string',
      title: 'UpdateDataHistoryImmediatelyAfterWrite',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExecuteAfterWriteDataHistoryVersionProcessing: {
      type: 'string',
      title: 'ExecuteAfterWriteDataHistoryVersionProcessing',
      enum: ['true', 'false'],
      default: 'false'
    },
    StandardAttributes: {
      type: 'array',
      title: 'StandardAttributes',
      items: { type: 'string' }
    },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
  },
  required: ['Name']
};

/**
 * Схема для AccumulationRegister
 */
export const accumulationRegisterSchema: JSONSchema7 = {
  type: 'object',
  title: 'AccumulationRegister',
  properties: {
    ...basePropertiesSchema.properties,
    DefaultListForm: { type: 'string', title: 'DefaultListForm' },
    AuxiliaryListForm: { type: 'string', title: 'AuxiliaryListForm' },
    RegisterType: { type: 'string', title: 'RegisterType' },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    DataLockControlMode: { type: 'string', title: 'DataLockControlMode' },
    FullTextSearch: { type: 'string', title: 'FullTextSearch' },
    EnableTotalsSplitting: {
      type: 'string',
      title: 'EnableTotalsSplitting',
      enum: ['true', 'false'],
      default: 'false'
    },
    ListPresentation: { type: 'string', title: 'ListPresentation' },
    ExtendedListPresentation: { type: 'string', title: 'ExtendedListPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
    StandardAttributes: {
      type: 'array',
      title: 'StandardAttributes',
      items: { type: 'string' }
    },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
  },
  required: ['Name']
};

/**
 * Схема для CalculationRegister
 */
export const calculationRegisterSchema: JSONSchema7 = {
  type: 'object',
  title: 'CalculationRegister',
  properties: {
    ...basePropertiesSchema.properties,
    DefaultListForm: { type: 'string', title: 'DefaultListForm' },
    AuxiliaryListForm: { type: 'string', title: 'AuxiliaryListForm' },
    Periodicity: { type: 'string', title: 'Periodicity' },
    ActionPeriod: {
      type: 'string',
      title: 'ActionPeriod',
      enum: ['true', 'false'],
      default: 'false'
    },
    BasePeriod: {
      type: 'string',
      title: 'BasePeriod',
      enum: ['true', 'false'],
      default: 'false'
    },
    Schedule: { type: 'string', title: 'Schedule' },
    ScheduleValue: { type: 'string', title: 'ScheduleValue' },
    ScheduleDate: { type: 'string', title: 'ScheduleDate' },
    ChartOfCalculationTypes: {
      type: 'string',
      title: 'ChartOfCalculationTypes',
      enum: ["ChartOfCalculationTypes.Начисления","ChartOfCalculationTypes.Удержания"]
    },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    StandardAttributes: {
      type: 'array',
      title: 'StandardAttributes',
      items: { type: 'string' }
    },
    DataLockControlMode: { type: 'string', title: 'DataLockControlMode' },
    FullTextSearch: { type: 'string', title: 'FullTextSearch' },
    ListPresentation: { type: 'string', title: 'ListPresentation' },
    ExtendedListPresentation: { type: 'string', title: 'ExtendedListPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
  },
  required: ['Name']
};

/**
 * Схема для Report
 */
export const reportSchema: JSONSchema7 = {
  type: 'object',
  title: 'Report',
  properties: {
    ...basePropertiesSchema.properties,
    DefaultForm: { type: 'string', title: 'DefaultForm' },
    AuxiliaryForm: { type: 'string', title: 'AuxiliaryForm' },
    MainDataCompositionSchema: {
      type: 'string',
      title: 'MainDataCompositionSchema',
      enum: ["Report.ibs_АнализНачисленныхПремийСотрудникам.Template.ОсновнаяСхемаКомпоновкиДанных","Report.ibs_АнализОтработанногоВремениДляРасчетаПереработок.Template.ОсновнаяСхемаКомпоновкиДанных","Report.ibs_ВрачебныеКадрыПоПрофилю.Template.ОсновнаяСхемаКомпоновкиДанных","Report.ibs_ВременныеКадровыеПереводы.Template.ОсновнаяСхемаКомпоновкиДанных","Report.ibs_ВыборкаПоВидуСтажа.Template.ОсновнаяСхемаКомпоновкиДанных"]
    },
    DefaultSettingsForm: { type: 'string', title: 'DefaultSettingsForm' },
    AuxiliarySettingsForm: { type: 'string', title: 'AuxiliarySettingsForm' },
    DefaultVariantForm: { type: 'string', title: 'DefaultVariantForm' },
    VariantsStorage: { type: 'string', title: 'VariantsStorage' },
    SettingsStorage: { type: 'string', title: 'SettingsStorage' },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExtendedPresentation: { type: 'string', title: 'ExtendedPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
  },
  required: ['Name']
};

/**
 * Схема для DataProcessor
 */
export const dataProcessorSchema: JSONSchema7 = {
  type: 'object',
  title: 'DataProcessor',
  properties: {
    ...basePropertiesSchema.properties,
    DefaultForm: {
      type: 'string',
      title: 'DefaultForm',
      enum: ["DataProcessor.ibs_Администратор1С.Form.Управляемая","DataProcessor.ibs_АРМКонтрольИУтверждениеДокументовКонсолидации.Form.Форма","DataProcessor.ibs_ВыводИнформацииПоДокументуФРМР.Form.Форма","DataProcessor.ibs_ВыгрузитьЗагрузитьПрофильДоступа.Form.Форма","DataProcessor.ibs_ВыгрузкаЗагрузкаДанныхXMLСОтборами.Form.Форма"]
    },
    AuxiliaryForm: { type: 'string', title: 'AuxiliaryForm' },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExtendedPresentation: { type: 'string', title: 'ExtendedPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
    tabularSections: {
      type: 'array',
      title: 'Табличные части',
      items: tabularSectionSchema
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
  },
  required: ['Name']
};

/**
 * Схема для ChartOfCharacteristicTypes
 */
export const chartOfCharacteristicTypesSchema: JSONSchema7 = {
  type: 'object',
  title: 'ChartOfCharacteristicTypes',
  properties: {
    ...basePropertiesSchema.properties,
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    CharacteristicExtValues: { type: 'string', title: 'CharacteristicExtValues' },
    Type: { type: 'object', title: 'Type' },
    Hierarchical: {
      type: 'string',
      title: 'Hierarchical',
      enum: ['true', 'false'],
      default: 'false'
    },
    FoldersOnTop: {
      type: 'string',
      title: 'FoldersOnTop',
      enum: ['true', 'false'],
      default: 'false'
    },
    CodeLength: { type: 'number', title: 'CodeLength' },
    CodeAllowedLength: { type: 'string', title: 'CodeAllowedLength' },
    DescriptionLength: { type: 'number', title: 'DescriptionLength' },
    CodeSeries: { type: 'string', title: 'CodeSeries' },
    CheckUnique: {
      type: 'string',
      title: 'CheckUnique',
      enum: ['true', 'false'],
      default: 'false'
    },
    Autonumbering: {
      type: 'string',
      title: 'Autonumbering',
      enum: ['true', 'false'],
      default: 'false'
    },
    DefaultPresentation: { type: 'string', title: 'DefaultPresentation' },
    Characteristics: { type: 'string', title: 'Characteristics' },
    PredefinedDataUpdate: { type: 'string', title: 'PredefinedDataUpdate' },
    EditType: { type: 'string', title: 'EditType' },
    QuickChoice: {
      type: 'string',
      title: 'QuickChoice',
      enum: ['true', 'false'],
      default: 'false'
    },
    ChoiceMode: { type: 'string', title: 'ChoiceMode' },
    InputByString: { type: 'object', title: 'InputByString' },
    CreateOnInput: { type: 'string', title: 'CreateOnInput' },
    SearchStringModeOnInputByString: { type: 'string', title: 'SearchStringModeOnInputByString' },
    ChoiceDataGetModeOnInputByString: { type: 'string', title: 'ChoiceDataGetModeOnInputByString' },
    FullTextSearchOnInputByString: { type: 'string', title: 'FullTextSearchOnInputByString' },
    ChoiceHistoryOnInput: { type: 'string', title: 'ChoiceHistoryOnInput' },
    DefaultObjectForm: { type: 'string', title: 'DefaultObjectForm' },
    DefaultFolderForm: { type: 'string', title: 'DefaultFolderForm' },
    DefaultListForm: { type: 'string', title: 'DefaultListForm' },
    DefaultChoiceForm: { type: 'string', title: 'DefaultChoiceForm' },
    DefaultFolderChoiceForm: { type: 'string', title: 'DefaultFolderChoiceForm' },
    AuxiliaryObjectForm: { type: 'string', title: 'AuxiliaryObjectForm' },
    AuxiliaryFolderForm: { type: 'string', title: 'AuxiliaryFolderForm' },
    AuxiliaryListForm: { type: 'string', title: 'AuxiliaryListForm' },
    AuxiliaryChoiceForm: { type: 'string', title: 'AuxiliaryChoiceForm' },
    AuxiliaryFolderChoiceForm: { type: 'string', title: 'AuxiliaryFolderChoiceForm' },
    BasedOn: { type: 'string', title: 'BasedOn' },
    DataLockFields: { type: 'string', title: 'DataLockFields' },
    DataLockControlMode: { type: 'string', title: 'DataLockControlMode' },
    FullTextSearch: { type: 'string', title: 'FullTextSearch' },
    ObjectPresentation: multilingualFieldSchema,
    ExtendedObjectPresentation: { type: 'string', title: 'ExtendedObjectPresentation' },
    ListPresentation: { type: 'string', title: 'ListPresentation' },
    ExtendedListPresentation: { type: 'string', title: 'ExtendedListPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
    DataHistory: { type: 'string', title: 'DataHistory' },
    UpdateDataHistoryImmediatelyAfterWrite: {
      type: 'string',
      title: 'UpdateDataHistoryImmediatelyAfterWrite',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExecuteAfterWriteDataHistoryVersionProcessing: {
      type: 'string',
      title: 'ExecuteAfterWriteDataHistoryVersionProcessing',
      enum: ['true', 'false'],
      default: 'false'
    },
    StandardAttributes: {
      type: 'array',
      title: 'StandardAttributes',
      items: { type: 'string' }
    },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
    tabularSections: {
      type: 'array',
      title: 'Табличные части',
      items: tabularSectionSchema
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
  },
  required: ['Name']
};

/**
 * Схема для ChartOfCalculationTypes
 */
export const chartOfCalculationTypesSchema: JSONSchema7 = {
  type: 'object',
  title: 'ChartOfCalculationTypes',
  properties: {
    ...basePropertiesSchema.properties,
    CodeLength: { type: 'number', title: 'CodeLength' },
    DescriptionLength: { type: 'number', title: 'DescriptionLength' },
    CodeType: { type: 'string', title: 'CodeType' },
    CodeAllowedLength: {
      type: 'string',
      title: 'CodeAllowedLength',
      enum: ["Fixed","Variable"]
    },
    DefaultPresentation: { type: 'string', title: 'DefaultPresentation' },
    EditType: { type: 'string', title: 'EditType' },
    QuickChoice: {
      type: 'string',
      title: 'QuickChoice',
      enum: ['true', 'false'],
      default: 'false'
    },
    ChoiceMode: { type: 'string', title: 'ChoiceMode' },
    InputByString: { type: 'object', title: 'InputByString' },
    SearchStringModeOnInputByString: { type: 'string', title: 'SearchStringModeOnInputByString' },
    FullTextSearchOnInputByString: { type: 'string', title: 'FullTextSearchOnInputByString' },
    ChoiceDataGetModeOnInputByString: { type: 'string', title: 'ChoiceDataGetModeOnInputByString' },
    CreateOnInput: { type: 'string', title: 'CreateOnInput' },
    ChoiceHistoryOnInput: { type: 'string', title: 'ChoiceHistoryOnInput' },
    DefaultObjectForm: {
      type: 'string',
      title: 'DefaultObjectForm',
      enum: ["ChartOfCalculationTypes.Начисления.Form.ФормаВидаРасчета","ChartOfCalculationTypes.Удержания.Form.ФормаВидаРасчета"]
    },
    DefaultListForm: {
      type: 'string',
      title: 'DefaultListForm',
      enum: ["ChartOfCalculationTypes.Начисления.Form.ФормаСписка","ChartOfCalculationTypes.Удержания.Form.ФормаСписка"]
    },
    DefaultChoiceForm: {
      type: 'string',
      title: 'DefaultChoiceForm',
      enum: ["ChartOfCalculationTypes.Начисления.Form.ФормаСписка","ChartOfCalculationTypes.Удержания.Form.ФормаСписка"]
    },
    AuxiliaryObjectForm: { type: 'string', title: 'AuxiliaryObjectForm' },
    AuxiliaryListForm: { type: 'string', title: 'AuxiliaryListForm' },
    AuxiliaryChoiceForm: { type: 'string', title: 'AuxiliaryChoiceForm' },
    BasedOn: { type: 'string', title: 'BasedOn' },
    DependenceOnCalculationTypes: { type: 'string', title: 'DependenceOnCalculationTypes' },
    BaseCalculationTypes: { type: 'object', title: 'BaseCalculationTypes' },
    ActionPeriodUse: {
      type: 'string',
      title: 'ActionPeriodUse',
      enum: ['true', 'false'],
      default: 'false'
    },
    StandardAttributes: {
      type: 'array',
      title: 'StandardAttributes',
      items: { type: 'string' }
    },
    Characteristics: { type: 'object', title: 'Characteristics' },
    StandardTabularSections: { type: 'object', title: 'StandardTabularSections' },
    PredefinedDataUpdate: { type: 'string', title: 'PredefinedDataUpdate' },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    DataLockFields: { type: 'string', title: 'DataLockFields' },
    DataLockControlMode: { type: 'string', title: 'DataLockControlMode' },
    FullTextSearch: { type: 'string', title: 'FullTextSearch' },
    ObjectPresentation: multilingualFieldSchema,
    ExtendedObjectPresentation: { type: 'string', title: 'ExtendedObjectPresentation' },
    ListPresentation: { type: 'string', title: 'ListPresentation' },
    ExtendedListPresentation: { type: 'string', title: 'ExtendedListPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
    DataHistory: { type: 'string', title: 'DataHistory' },
    UpdateDataHistoryImmediatelyAfterWrite: {
      type: 'string',
      title: 'UpdateDataHistoryImmediatelyAfterWrite',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExecuteAfterWriteDataHistoryVersionProcessing: {
      type: 'string',
      title: 'ExecuteAfterWriteDataHistoryVersionProcessing',
      enum: ['true', 'false'],
      default: 'false'
    },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
    tabularSections: {
      type: 'array',
      title: 'Табличные части',
      items: tabularSectionSchema
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
  },
  required: ['Name']
};

/**
 * Схема для BusinessProcess
 */
export const businessProcessSchema: JSONSchema7 = {
  type: 'object',
  title: 'BusinessProcess',
  properties: {
    ...basePropertiesSchema.properties,
    EditType: { type: 'string', title: 'EditType' },
    InputByString: { type: 'object', title: 'InputByString' },
    CreateOnInput: { type: 'string', title: 'CreateOnInput' },
    SearchStringModeOnInputByString: { type: 'string', title: 'SearchStringModeOnInputByString' },
    ChoiceDataGetModeOnInputByString: { type: 'string', title: 'ChoiceDataGetModeOnInputByString' },
    FullTextSearchOnInputByString: { type: 'string', title: 'FullTextSearchOnInputByString' },
    DefaultObjectForm: {
      type: 'string',
      title: 'DefaultObjectForm',
      enum: ["BusinessProcess.Задание.Form.ФормаБизнесПроцесса","BusinessProcess.ЗаданиеАдаптацииУвольнения.Form.ФормаБизнесПроцесса","BusinessProcess.ЗаявкаСотрудникаДобровольныеСтраховыеВзносы.Form.ФормаБизнесПроцесса","BusinessProcess.ЗаявкаСотрудникаИзменитьЛичныеДанные.Form.ФормаБизнесПроцесса","BusinessProcess.ЗаявкаСотрудникаНалоговыйВычет.Form.ФормаБизнесПроцесса"]
    },
    DefaultListForm: {
      type: 'string',
      title: 'DefaultListForm',
      enum: ["BusinessProcess.Задание.Form.ФормаСписка","BusinessProcess.ЗаданиеАдаптацииУвольнения.Form.ФормаСписка","BusinessProcess.ЗаявкаСотрудникаДобровольныеСтраховыеВзносы.Form.ФормаСписка","BusinessProcess.ЗаявкаСотрудникаИзменитьЛичныеДанные.Form.ФормаСписка","BusinessProcess.ЗаявкаСотрудникаНалоговыйВычет.Form.ФормаСписка"]
    },
    DefaultChoiceForm: { type: 'string', title: 'DefaultChoiceForm' },
    AuxiliaryObjectForm: { type: 'string', title: 'AuxiliaryObjectForm' },
    AuxiliaryListForm: { type: 'string', title: 'AuxiliaryListForm' },
    AuxiliaryChoiceForm: { type: 'string', title: 'AuxiliaryChoiceForm' },
    ChoiceHistoryOnInput: { type: 'string', title: 'ChoiceHistoryOnInput' },
    NumberType: { type: 'string', title: 'NumberType' },
    NumberLength: { type: 'number', title: 'NumberLength' },
    NumberAllowedLength: { type: 'string', title: 'NumberAllowedLength' },
    CheckUnique: {
      type: 'string',
      title: 'CheckUnique',
      enum: ['true', 'false'],
      default: 'false'
    },
    StandardAttributes: {
      type: 'array',
      title: 'StandardAttributes',
      items: { type: 'string' }
    },
    Characteristics: { type: 'string', title: 'Characteristics' },
    Autonumbering: {
      type: 'string',
      title: 'Autonumbering',
      enum: ['true', 'false'],
      default: 'false'
    },
    BasedOn: { type: 'object', title: 'BasedOn' },
    NumberPeriodicity: { type: 'string', title: 'NumberPeriodicity' },
    Task: { type: 'string', title: 'Task' },
    CreateTaskInPrivilegedMode: {
      type: 'string',
      title: 'CreateTaskInPrivilegedMode',
      enum: ['true', 'false'],
      default: 'false'
    },
    DataLockFields: { type: 'object', title: 'DataLockFields' },
    DataLockControlMode: { type: 'string', title: 'DataLockControlMode' },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    FullTextSearch: { type: 'string', title: 'FullTextSearch' },
    ObjectPresentation: { type: 'string', title: 'ObjectPresentation' },
    ExtendedObjectPresentation: { type: 'string', title: 'ExtendedObjectPresentation' },
    ListPresentation: multilingualFieldSchema,
    ExtendedListPresentation: { type: 'string', title: 'ExtendedListPresentation' },
    Explanation: multilingualFieldSchema,
    DataHistory: { type: 'string', title: 'DataHistory' },
    UpdateDataHistoryImmediatelyAfterWrite: {
      type: 'string',
      title: 'UpdateDataHistoryImmediatelyAfterWrite',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExecuteAfterWriteDataHistoryVersionProcessing: {
      type: 'string',
      title: 'ExecuteAfterWriteDataHistoryVersionProcessing',
      enum: ['true', 'false'],
      default: 'false'
    },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
    tabularSections: {
      type: 'array',
      title: 'Табличные части',
      items: tabularSectionSchema
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
  },
  required: ['Name']
};

/**
 * Схема для Task
 */
export const taskSchema: JSONSchema7 = {
  type: 'object',
  title: 'Task',
  properties: {
    ...basePropertiesSchema.properties,
    NumberType: { type: 'string', title: 'NumberType' },
    NumberLength: { type: 'number', title: 'NumberLength' },
    NumberAllowedLength: {
      type: 'string',
      title: 'NumberAllowedLength',
      enum: ["Fixed","Variable"]
    },
    CheckUnique: {
      type: 'string',
      title: 'CheckUnique',
      enum: ['true', 'false'],
      default: 'false'
    },
    Autonumbering: {
      type: 'string',
      title: 'Autonumbering',
      enum: ['true', 'false'],
      default: 'false'
    },
    TaskNumberAutoPrefix: {
      type: 'string',
      title: 'TaskNumberAutoPrefix',
      enum: ["BusinessProcessNumber","DontUse"]
    },
    DescriptionLength: { type: 'number', title: 'DescriptionLength' },
    Addressing: { type: 'string', title: 'Addressing' },
    MainAddressingAttribute: {
      type: 'string',
      title: 'MainAddressingAttribute',
      enum: ["Task.ЗадачаИсполнителя.AddressingAttribute.Исполнитель","Task.ЗадачаПоОбработкеДокумента.AddressingAttribute.Исполнитель"]
    },
    CurrentPerformer: { type: 'string', title: 'CurrentPerformer' },
    BasedOn: { type: 'string', title: 'BasedOn' },
    StandardAttributes: {
      type: 'array',
      title: 'StandardAttributes',
      items: { type: 'string' }
    },
    Characteristics: { type: 'string', title: 'Characteristics' },
    DefaultPresentation: { type: 'string', title: 'DefaultPresentation' },
    EditType: { type: 'string', title: 'EditType' },
    InputByString: { type: 'object', title: 'InputByString' },
    SearchStringModeOnInputByString: { type: 'string', title: 'SearchStringModeOnInputByString' },
    FullTextSearchOnInputByString: { type: 'string', title: 'FullTextSearchOnInputByString' },
    ChoiceDataGetModeOnInputByString: { type: 'string', title: 'ChoiceDataGetModeOnInputByString' },
    CreateOnInput: { type: 'string', title: 'CreateOnInput' },
    DefaultObjectForm: { type: 'string', title: 'DefaultObjectForm' },
    DefaultListForm: { type: 'string', title: 'DefaultListForm' },
    DefaultChoiceForm: { type: 'string', title: 'DefaultChoiceForm' },
    AuxiliaryObjectForm: { type: 'string', title: 'AuxiliaryObjectForm' },
    AuxiliaryListForm: { type: 'string', title: 'AuxiliaryListForm' },
    AuxiliaryChoiceForm: { type: 'string', title: 'AuxiliaryChoiceForm' },
    ChoiceHistoryOnInput: { type: 'string', title: 'ChoiceHistoryOnInput' },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    DataLockFields: { type: 'object', title: 'DataLockFields' },
    DataLockControlMode: { type: 'string', title: 'DataLockControlMode' },
    FullTextSearch: { type: 'string', title: 'FullTextSearch' },
    ObjectPresentation: { type: 'string', title: 'ObjectPresentation' },
    ExtendedObjectPresentation: { type: 'string', title: 'ExtendedObjectPresentation' },
    ListPresentation: multilingualFieldSchema,
    ExtendedListPresentation: { type: 'string', title: 'ExtendedListPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
    DataHistory: { type: 'string', title: 'DataHistory' },
    UpdateDataHistoryImmediatelyAfterWrite: {
      type: 'string',
      title: 'UpdateDataHistoryImmediatelyAfterWrite',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExecuteAfterWriteDataHistoryVersionProcessing: {
      type: 'string',
      title: 'ExecuteAfterWriteDataHistoryVersionProcessing',
      enum: ['true', 'false'],
      default: 'false'
    },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
    tabularSections: {
      type: 'array',
      title: 'Табличные части',
      items: tabularSectionSchema
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
  },
  required: ['Name']
};

/**
 * Схема для Constant
 */
export const constantSchema: JSONSchema7 = {
  type: 'object',
  title: 'Constant',
  properties: {
    ...basePropertiesSchema.properties,
    Type: { type: 'object', title: 'Type' },
    DefaultForm: { type: 'string', title: 'DefaultForm' },
    ExtendedPresentation: { type: 'string', title: 'ExtendedPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
    PasswordMode: {
      type: 'string',
      title: 'PasswordMode',
      enum: ['true', 'false'],
      default: 'false'
    },
    Format: { type: 'string', title: 'Format' },
    EditFormat: { type: 'string', title: 'EditFormat' },
    ToolTip: { type: 'string', title: 'ToolTip' },
    MarkNegatives: {
      type: 'string',
      title: 'MarkNegatives',
      enum: ['true', 'false'],
      default: 'false'
    },
    Mask: { type: 'string', title: 'Mask' },
    MultiLine: {
      type: 'string',
      title: 'MultiLine',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExtendedEdit: {
      type: 'string',
      title: 'ExtendedEdit',
      enum: ['true', 'false'],
      default: 'false'
    },
    MinValue: { type: 'object', title: 'MinValue' },
    MaxValue: { type: 'object', title: 'MaxValue' },
    FillChecking: { type: 'string', title: 'FillChecking' },
    ChoiceFoldersAndItems: { type: 'string', title: 'ChoiceFoldersAndItems' },
    ChoiceParameterLinks: { type: 'string', title: 'ChoiceParameterLinks' },
    ChoiceParameters: { type: 'string', title: 'ChoiceParameters' },
    QuickChoice: { type: 'string', title: 'QuickChoice' },
    ChoiceForm: { type: 'string', title: 'ChoiceForm' },
    LinkByType: { type: 'string', title: 'LinkByType' },
    ChoiceHistoryOnInput: { type: 'string', title: 'ChoiceHistoryOnInput' },
    DataLockControlMode: { type: 'string', title: 'DataLockControlMode' },
    DataHistory: { type: 'string', title: 'DataHistory' },
    UpdateDataHistoryImmediatelyAfterWrite: {
      type: 'string',
      title: 'UpdateDataHistoryImmediatelyAfterWrite',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExecuteAfterWriteDataHistoryVersionProcessing: {
      type: 'string',
      title: 'ExecuteAfterWriteDataHistoryVersionProcessing',
      enum: ['true', 'false'],
      default: 'false'
    },
  },
  required: ['Name']
};

/**
 * Схема для CommonModule
 */
export const commonModuleSchema: JSONSchema7 = {
  type: 'object',
  title: 'CommonModule',
  properties: {
    ...basePropertiesSchema.properties,
    Global: {
      type: 'string',
      title: 'Global',
      enum: ['true', 'false'],
      default: 'false'
    },
    ClientManagedApplication: {
      type: 'string',
      title: 'ClientManagedApplication',
      enum: ['true', 'false'],
      default: 'false'
    },
    Server: {
      type: 'string',
      title: 'Server',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExternalConnection: {
      type: 'string',
      title: 'ExternalConnection',
      enum: ['true', 'false'],
      default: 'false'
    },
    ClientOrdinaryApplication: {
      type: 'string',
      title: 'ClientOrdinaryApplication',
      enum: ['true', 'false'],
      default: 'false'
    },
    ServerCall: {
      type: 'string',
      title: 'ServerCall',
      enum: ['true', 'false'],
      default: 'false'
    },
    Privileged: {
      type: 'string',
      title: 'Privileged',
      enum: ['true', 'false'],
      default: 'false'
    },
    ReturnValuesReuse: { type: 'string', title: 'ReturnValuesReuse' },
  },
  required: ['Name']
};

/**
 * Схема для CommonForm
 */
export const commonFormSchema: JSONSchema7 = {
  type: 'object',
  title: 'CommonForm',
  properties: {
    ...basePropertiesSchema.properties,
    FormType: { type: 'string', title: 'FormType' },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    UsePurposes: { type: 'object', title: 'UsePurposes' },
    ExtendedPresentation: { type: 'string', title: 'ExtendedPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
  },
  required: ['Name']
};

/**
 * Схема для DefinedType
 */
export const definedTypeSchema: JSONSchema7 = {
  type: 'object',
  title: 'DefinedType',
  properties: {
    ...basePropertiesSchema.properties,
    Type: { type: 'object', title: 'Type' },
  },
  required: ['Name']
};

/**
 * Схема для ExchangePlan
 */
export const exchangePlanSchema: JSONSchema7 = {
  type: 'object',
  title: 'ExchangePlan',
  properties: {
    ...basePropertiesSchema.properties,
    CodeLength: { type: 'number', title: 'CodeLength' },
    CodeAllowedLength: { type: 'string', title: 'CodeAllowedLength' },
    DescriptionLength: { type: 'number', title: 'DescriptionLength' },
    DefaultPresentation: { type: 'string', title: 'DefaultPresentation' },
    EditType: { type: 'string', title: 'EditType' },
    QuickChoice: {
      type: 'string',
      title: 'QuickChoice',
      enum: ['true', 'false'],
      default: 'false'
    },
    ChoiceMode: { type: 'string', title: 'ChoiceMode' },
    InputByString: { type: 'object', title: 'InputByString' },
    SearchStringModeOnInputByString: { type: 'string', title: 'SearchStringModeOnInputByString' },
    FullTextSearchOnInputByString: { type: 'string', title: 'FullTextSearchOnInputByString' },
    ChoiceDataGetModeOnInputByString: { type: 'string', title: 'ChoiceDataGetModeOnInputByString' },
    DefaultObjectForm: {
      type: 'string',
      title: 'DefaultObjectForm',
      enum: ["ExchangePlan.rc_ЕСНСИ.Form.ФормаУзла","ExchangePlan.АвтономнаяРабота.Form.ФормаУзла","ExchangePlan.ИнтеграцияС1СДокументооборотомПереопределяемый.Form.ФормаУзла","ExchangePlan.МиграцияПриложений.Form.ФормаУзла","ExchangePlan.ОбменВРаспределеннойИнформационнойБазе.Form.ФормаУзла"]
    },
    DefaultListForm: { type: 'string', title: 'DefaultListForm' },
    DefaultChoiceForm: { type: 'string', title: 'DefaultChoiceForm' },
    AuxiliaryObjectForm: { type: 'string', title: 'AuxiliaryObjectForm' },
    AuxiliaryListForm: { type: 'string', title: 'AuxiliaryListForm' },
    AuxiliaryChoiceForm: { type: 'string', title: 'AuxiliaryChoiceForm' },
    StandardAttributes: {
      type: 'array',
      title: 'StandardAttributes',
      items: { type: 'string' }
    },
    Characteristics: { type: 'string', title: 'Characteristics' },
    BasedOn: { type: 'string', title: 'BasedOn' },
    DistributedInfoBase: {
      type: 'string',
      title: 'DistributedInfoBase',
      enum: ['true', 'false'],
      default: 'false'
    },
    IncludeConfigurationExtensions: {
      type: 'string',
      title: 'IncludeConfigurationExtensions',
      enum: ['true', 'false'],
      default: 'false'
    },
    CreateOnInput: { type: 'string', title: 'CreateOnInput' },
    ChoiceHistoryOnInput: { type: 'string', title: 'ChoiceHistoryOnInput' },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    DataLockFields: { type: 'string', title: 'DataLockFields' },
    DataLockControlMode: { type: 'string', title: 'DataLockControlMode' },
    FullTextSearch: { type: 'string', title: 'FullTextSearch' },
    ObjectPresentation: multilingualFieldSchema,
    ExtendedObjectPresentation: multilingualFieldSchema,
    ListPresentation: multilingualFieldSchema,
    ExtendedListPresentation: { type: 'string', title: 'ExtendedListPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
    DataHistory: { type: 'string', title: 'DataHistory' },
    UpdateDataHistoryImmediatelyAfterWrite: {
      type: 'string',
      title: 'UpdateDataHistoryImmediatelyAfterWrite',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExecuteAfterWriteDataHistoryVersionProcessing: {
      type: 'string',
      title: 'ExecuteAfterWriteDataHistoryVersionProcessing',
      enum: ['true', 'false'],
      default: 'false'
    },
    attributes: {
      type: 'array',
      title: 'Реквизиты',
      items: attributeSchema
    },
    tabularSections: {
      type: 'array',
      title: 'Табличные части',
      items: tabularSectionSchema
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
  },
  required: ['Name']
};

/**
 * Схема для DocumentJournal
 */
export const documentJournalSchema: JSONSchema7 = {
  type: 'object',
  title: 'DocumentJournal',
  properties: {
    ...basePropertiesSchema.properties,
    DefaultForm: {
      type: 'string',
      title: 'DefaultForm',
      enum: ["DocumentJournal.ibs_ОформлениеПрекращениеПенсии.Form.ФормаСписка","DocumentJournal.АлиментыИДругиеПостоянныеУдержания.Form.ФормаСписка","DocumentJournal.АнкетыПерсонифицированногоУчета.Form.ФормаСписка","DocumentJournal.АттестацииСотрудников.Form.ФормаСписка","DocumentJournal.БронированиеГражданПребывающихВЗапасе.Form.ФормаСписка"]
    },
    AuxiliaryForm: { type: 'string', title: 'AuxiliaryForm' },
    RegisteredDocuments: { type: 'object', title: 'RegisteredDocuments' },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    ListPresentation: multilingualFieldSchema,
    ExtendedListPresentation: multilingualFieldSchema,
    Explanation: { type: 'string', title: 'Explanation' },
    StandardAttributes: {
      type: 'array',
      title: 'StandardAttributes',
      items: { type: 'string' }
    },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
  },
  required: ['Name']
};

/**
 * Схема для DocumentNumerator
 */
export const documentNumeratorSchema: JSONSchema7 = {
  type: 'object',
  title: 'DocumentNumerator',
  properties: {
    ...basePropertiesSchema.properties,
    NumberType: { type: 'string', title: 'NumberType' },
    NumberLength: { type: 'number', title: 'NumberLength' },
    NumberAllowedLength: { type: 'string', title: 'NumberAllowedLength' },
    NumberPeriodicity: { type: 'string', title: 'NumberPeriodicity' },
    CheckUnique: {
      type: 'string',
      title: 'CheckUnique',
      enum: ['true', 'false'],
      default: 'false'
    },
  },
  required: ['Name']
};

/**
 * Схема для WebService
 */
export const webServiceSchema: JSONSchema7 = {
  type: 'object',
  title: 'WebService',
  properties: {
    ...basePropertiesSchema.properties,
    Namespace: {
      type: 'string',
      title: 'Namespace',
      enum: ["http://v8.1c.ru","http://www.1c.ru/dmil","http://www.1c.ru/SSL/EnterpriseDataExchange_1_0_1_1","http://www.1c.ru/SSL/EnterpriseDataUpload_1_0_1_1","http://www.1c.ru/SSL/Exchange"]
    },
    XDTOPackages: { type: 'object', title: 'XDTOPackages' },
    DescriptorFileName: {
      type: 'string',
      title: 'DescriptorFileName',
      enum: ["ws_Cons.1cws","dmil.1cws","EnterpriseDataExchange_1_0_1_1.1cws","EnterpriseDataUpload_1_0_1_1.1cws","exchange.1cws"]
    },
    ReuseSessions: { type: 'string', title: 'ReuseSessions' },
    SessionMaxAge: { type: 'number', title: 'SessionMaxAge' },
  },
  required: ['Name']
};

/**
 * Схема для HTTPService
 */
export const hTTPServiceSchema: JSONSchema7 = {
  type: 'object',
  title: 'HTTPService',
  properties: {
    ...basePropertiesSchema.properties,
    RootURL: {
      type: 'string',
      title: 'RootURL',
      enum: ["ChatbotsWebhook","exchange_dsl_1_0_0_1","MIS","billing","applicants"]
    },
    ReuseSessions: { type: 'string', title: 'ReuseSessions' },
    SessionMaxAge: { type: 'number', title: 'SessionMaxAge' },
  },
  required: ['Name']
};

/**
 * Схема для Subsystem
 */
export const subsystemSchema: JSONSchema7 = {
  type: 'object',
  title: 'Subsystem',
  properties: {
    ...basePropertiesSchema.properties,
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    IncludeInCommandInterface: {
      type: 'string',
      title: 'IncludeInCommandInterface',
      enum: ['true', 'false'],
      default: 'false'
    },
    UseOneCommand: {
      type: 'string',
      title: 'UseOneCommand',
      enum: ['true', 'false'],
      default: 'false'
    },
    Explanation: multilingualFieldSchema,
    Picture: { type: 'object', title: 'Picture' },
    Content: { type: 'object', title: 'Content' },
  },
  required: ['Name']
};

/**
 * Схема для Role
 */
export const roleSchema: JSONSchema7 = {
  type: 'object',
  title: 'Role',
  properties: {
    ...basePropertiesSchema.properties,
  },
  required: ['Name']
};

/**
 * Схема для SessionParameter
 */
export const sessionParameterSchema: JSONSchema7 = {
  type: 'object',
  title: 'SessionParameter',
  properties: {
    ...basePropertiesSchema.properties,
    Type: { type: 'object', title: 'Type' },
  },
  required: ['Name']
};

/**
 * Схема для CommonAttribute
 */
export const commonAttributeSchema: JSONSchema7 = {
  type: 'object',
  title: 'CommonAttribute',
  properties: {
    ...basePropertiesSchema.properties,
    Type: { type: 'object', title: 'Type' },
    PasswordMode: {
      type: 'string',
      title: 'PasswordMode',
      enum: ['true', 'false'],
      default: 'false'
    },
    Format: { type: 'string', title: 'Format' },
    EditFormat: { type: 'string', title: 'EditFormat' },
    ToolTip: { type: 'string', title: 'ToolTip' },
    MarkNegatives: {
      type: 'string',
      title: 'MarkNegatives',
      enum: ['true', 'false'],
      default: 'false'
    },
    Mask: { type: 'string', title: 'Mask' },
    MultiLine: {
      type: 'string',
      title: 'MultiLine',
      enum: ['true', 'false'],
      default: 'false'
    },
    ExtendedEdit: {
      type: 'string',
      title: 'ExtendedEdit',
      enum: ['true', 'false'],
      default: 'false'
    },
    MinValue: { type: 'object', title: 'MinValue' },
    MaxValue: { type: 'object', title: 'MaxValue' },
    FillFromFillingValue: {
      type: 'string',
      title: 'FillFromFillingValue',
      enum: ['true', 'false'],
      default: 'false'
    },
    FillValue: { type: 'object', title: 'FillValue' },
    FillChecking: { type: 'string', title: 'FillChecking' },
    ChoiceFoldersAndItems: { type: 'string', title: 'ChoiceFoldersAndItems' },
    ChoiceParameterLinks: { type: 'string', title: 'ChoiceParameterLinks' },
    ChoiceParameters: { type: 'string', title: 'ChoiceParameters' },
    QuickChoice: { type: 'string', title: 'QuickChoice' },
    CreateOnInput: { type: 'string', title: 'CreateOnInput' },
    ChoiceForm: { type: 'string', title: 'ChoiceForm' },
    LinkByType: { type: 'string', title: 'LinkByType' },
    ChoiceHistoryOnInput: { type: 'string', title: 'ChoiceHistoryOnInput' },
    Content: { type: 'object', title: 'Content' },
    AutoUse: { type: 'string', title: 'AutoUse' },
    DataSeparation: {
      type: 'string',
      title: 'DataSeparation',
      enum: ["DontUse","Separate"]
    },
    SeparatedDataUse: {
      type: 'string',
      title: 'SeparatedDataUse',
      enum: ["Independently","IndependentlyAndSimultaneously"]
    },
    DataSeparationValue: { type: 'string', title: 'DataSeparationValue' },
    DataSeparationUse: { type: 'string', title: 'DataSeparationUse' },
    ConditionalSeparation: { type: 'string', title: 'ConditionalSeparation' },
    UsersSeparation: { type: 'string', title: 'UsersSeparation' },
    AuthenticationSeparation: { type: 'string', title: 'AuthenticationSeparation' },
    ConfigurationExtensionsSeparation: { type: 'string', title: 'ConfigurationExtensionsSeparation' },
    Indexing: {
      type: 'string',
      title: 'Indexing',
      enum: ["DontIndex","IndexWithAdditionalOrder"]
    },
    FullTextSearch: { type: 'string', title: 'FullTextSearch' },
    DataHistory: { type: 'string', title: 'DataHistory' },
  },
  required: ['Name']
};

/**
 * Схема для EventSubscription
 */
export const eventSubscriptionSchema: JSONSchema7 = {
  type: 'object',
  title: 'EventSubscription',
  properties: {
    ...basePropertiesSchema.properties,
    Source: { type: 'object', title: 'Source' },
    Event: {
      type: 'string',
      title: 'Event',
      enum: ["BeforeWrite","OnWrite","UndoPosting","Posting"]
    },
    Handler: {
      type: 'string',
      title: 'Handler',
      enum: ["CommonModule.ВерсионированиеОбъектовСобытия.ЗаписатьВерсиюДокумента","CommonModule.ibs_ИнтеграцияСМИС.ЗарегистрироватьФизлицоКОтправке","CommonModule.ibs_ИнтеграцияСМИС.ЗарегистрироватьФизлицоКОтправкиВМИСПриЗаписиРегистров","CommonModule.ibs_ИнтеграцияСМИС.ОбработкаОтменыПроведенияДокументыДляМИС","CommonModule.ibs_ИнтеграцияСМИС.ОбработкаПроведенияДокументыДляМИС"]
    },
  },
  required: ['Name']
};

/**
 * Схема для ScheduledJob
 */
export const scheduledJobSchema: JSONSchema7 = {
  type: 'object',
  title: 'ScheduledJob',
  properties: {
    ...basePropertiesSchema.properties,
    MethodName: {
      type: 'string',
      title: 'MethodName',
      enum: ["CommonModule.ibs_ИнтеграцияСМИС.СформироватьИОтправитьСообщенияВМИС","CommonModule.ОбработкаНовостейСлужебный.ВсеОбновленияНовостей","CommonModule.ОбработкаНовостейСлужебный.ВсеОбновленияНовостейДляОбластиДанных","CommonModule.ЗагрузкаКандидатовИзИнтернетаСлужебный.ОбработатьОчередьЗагрузкиКандидатов","CommonModule.РаботаСКурсамиВалютЛокализация.ПриЗагрузкеАктуальныхКурсов"]
    },
    Description: { type: 'string', title: 'Description' },
    Key: { type: 'string', title: 'Key' },
    Use: {
      type: 'string',
      title: 'Use',
      enum: ['true', 'false'],
      default: 'false'
    },
    Predefined: {
      type: 'string',
      title: 'Predefined',
      enum: ['true', 'false'],
      default: 'false'
    },
    RestartCountOnFailure: { type: 'number', title: 'RestartCountOnFailure' },
    RestartIntervalOnFailure: { type: 'number', title: 'RestartIntervalOnFailure' },
  },
  required: ['Name']
};

/**
 * Схема для CommonCommand
 */
export const commonCommandSchema: JSONSchema7 = {
  type: 'object',
  title: 'CommonCommand',
  properties: {
    ...basePropertiesSchema.properties,
    Group: {
      type: 'string',
      title: 'Group',
      enum: ["ActionsPanelTools","ActionsPanelReports","NavigationPanelOrdinary"]
    },
    Representation: { type: 'string', title: 'Representation' },
    ToolTip: { type: 'string', title: 'ToolTip' },
    Picture: { type: 'string', title: 'Picture' },
    Shortcut: { type: 'string', title: 'Shortcut' },
    IncludeHelpInContents: {
      type: 'string',
      title: 'IncludeHelpInContents',
      enum: ['true', 'false'],
      default: 'false'
    },
    CommandParameterType: { type: 'string', title: 'CommandParameterType' },
    ParameterUseMode: { type: 'string', title: 'ParameterUseMode' },
    ModifiesData: {
      type: 'string',
      title: 'ModifiesData',
      enum: ['true', 'false'],
      default: 'false'
    },
    OnMainServerUnavalableBehavior: { type: 'string', title: 'OnMainServerUnavalableBehavior' },
  },
  required: ['Name']
};

/**
 * Схема для CommandGroup
 */
export const commandGroupSchema: JSONSchema7 = {
  type: 'object',
  title: 'CommandGroup',
  properties: {
    ...basePropertiesSchema.properties,
    Representation: {
      type: 'string',
      title: 'Representation',
      enum: ["Picture","Auto","PictureAndText"]
    },
    ToolTip: multilingualFieldSchema,
    Picture: { type: 'object', title: 'Picture' },
    Category: {
      type: 'string',
      title: 'Category',
      enum: ["FormCommandBar","FormNavigationPanel","ActionsPanel","NavigationPanel"]
    },
  },
  required: ['Name']
};

/**
 * Схема для CommonTemplate
 */
export const commonTemplateSchema: JSONSchema7 = {
  type: 'object',
  title: 'CommonTemplate',
  properties: {
    ...basePropertiesSchema.properties,
    TemplateType: {
      type: 'string',
      title: 'TemplateType',
      enum: ["BinaryData","SpreadsheetDocument","TextDocument","DataCompositionSchema"]
    },
  },
  required: ['Name']
};

/**
 * Схема для CommonPicture
 */
export const commonPictureSchema: JSONSchema7 = {
  type: 'object',
  title: 'CommonPicture',
  properties: {
    ...basePropertiesSchema.properties,
    AvailabilityForChoice: {
      type: 'string',
      title: 'AvailabilityForChoice',
      enum: ['true', 'false'],
      default: 'false'
    },
    AvailabilityForAppearance: {
      type: 'string',
      title: 'AvailabilityForAppearance',
      enum: ['true', 'false'],
      default: 'false'
    },
  },
  required: ['Name']
};

/**
 * Схема для WSReference
 */
export const wSReferenceSchema: JSONSchema7 = {
  type: 'object',
  title: 'WSReference',
  properties: {
    ...basePropertiesSchema.properties,
    LocationURL: { type: 'string', title: 'LocationURL' },
  },
  required: ['Name']
};

/**
 * Схема для StyleItem
 */
export const styleItemSchema: JSONSchema7 = {
  type: 'object',
  title: 'StyleItem',
  properties: {
    ...basePropertiesSchema.properties,
    Type: {
      type: 'string',
      title: 'Type',
      enum: ["Color","Font"]
    },
    Value: { type: 'string', title: 'Value' },
  },
  required: ['Name']
};

/**
 * Схема для FilterCriterion
 */
export const filterCriterionSchema: JSONSchema7 = {
  type: 'object',
  title: 'FilterCriterion',
  properties: {
    ...basePropertiesSchema.properties,
    Type: { type: 'object', title: 'Type' },
    Content: { type: 'object', title: 'Content' },
    DefaultForm: { type: 'string', title: 'DefaultForm' },
    AuxiliaryForm: { type: 'string', title: 'AuxiliaryForm' },
    ListPresentation: { type: 'string', title: 'ListPresentation' },
    ExtendedListPresentation: { type: 'string', title: 'ExtendedListPresentation' },
    Explanation: { type: 'string', title: 'Explanation' },
  },
  required: ['Name']
};

/**
 * Схема для FunctionalOption
 */
export const functionalOptionSchema: JSONSchema7 = {
  type: 'object',
  title: 'FunctionalOption',
  properties: {
    ...basePropertiesSchema.properties,
    Location: {
      type: 'string',
      title: 'Location',
      enum: ["Constant.ibs_ИспользоватьПодсистемуПремирования","Constant.ibs_ИспользоватьЦентрализациюДолжностей","InformationRegister.НастройкиРасчетаЗарплатыРасширенный.Resource.АвтоматическиОграничиватьИспользованиеДокументов","Constant.ДатаОбновленияПовторноИспользуемыхЗначенийМРО","InformationRegister.НастройкиВерсионированияОбъектов.Resource.Вариант"]
    },
    PrivilegedGetMode: {
      type: 'string',
      title: 'PrivilegedGetMode',
      enum: ['true', 'false'],
      default: 'false'
    },
    Content: { type: 'string', title: 'Content' },
  },
  required: ['Name']
};

/**
 * Схема для FunctionalOptionsParameter
 */
export const functionalOptionsParameterSchema: JSONSchema7 = {
  type: 'object',
  title: 'FunctionalOptionsParameter',
  properties: {
    ...basePropertiesSchema.properties,
    Use: { type: 'object', title: 'Use' },
  },
  required: ['Name']
};

/**
 * Схема для SettingsStorage
 */
export const settingsStorageSchema: JSONSchema7 = {
  type: 'object',
  title: 'SettingsStorage',
  properties: {
    ...basePropertiesSchema.properties,
    DefaultSaveForm: { type: 'string', title: 'DefaultSaveForm' },
    DefaultLoadForm: { type: 'string', title: 'DefaultLoadForm' },
    AuxiliarySaveForm: { type: 'string', title: 'AuxiliarySaveForm' },
    AuxiliaryLoadForm: { type: 'string', title: 'AuxiliaryLoadForm' },
    forms: {
      type: 'array',
      title: 'Формы',
      items: formSchema
    },
  },
  required: ['Name']
};

export const objectTypeSchemas: Record<string, JSONSchema7> = {

  Document: documentSchema,

  Catalog: catalogSchema,

  Enum: enumSchema,

  Form: formObjectSchema,

  InformationRegister: informationRegisterSchema,

  AccumulationRegister: accumulationRegisterSchema,

  CalculationRegister: calculationRegisterSchema,

  Report: reportSchema,

  DataProcessor: dataProcessorSchema,

  ChartOfCharacteristicTypes: chartOfCharacteristicTypesSchema,

  ChartOfCalculationTypes: chartOfCalculationTypesSchema,

  BusinessProcess: businessProcessSchema,

  Task: taskSchema,

  Constant: constantSchema,

  CommonModule: commonModuleSchema,

  CommonForm: commonFormSchema,

  DefinedType: definedTypeSchema,

  ExchangePlan: exchangePlanSchema,

  DocumentJournal: documentJournalSchema,

  DocumentNumerator: documentNumeratorSchema,

  WebService: webServiceSchema,

  HTTPService: hTTPServiceSchema,

  Subsystem: subsystemSchema,

  Role: roleSchema,

  SessionParameter: sessionParameterSchema,

  CommonAttribute: commonAttributeSchema,

  EventSubscription: eventSubscriptionSchema,

  ScheduledJob: scheduledJobSchema,

  CommonCommand: commonCommandSchema,

  CommandGroup: commandGroupSchema,

  CommonTemplate: commonTemplateSchema,

  CommonPicture: commonPictureSchema,

  WSReference: wSReferenceSchema,

  StyleItem: styleItemSchema,

  FilterCriterion: filterCriterionSchema,

  FunctionalOption: functionalOptionSchema,

  FunctionalOptionsParameter: functionalOptionsParameterSchema,

  SettingsStorage: settingsStorageSchema,

};

/**
 * Получить схему для типа объекта
 */
export function getSchemaForObjectType(objectType: string): JSONSchema7 {
  return objectTypeSchemas[objectType] || basePropertiesSchema;
}


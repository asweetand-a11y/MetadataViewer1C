/**
 * Справочник допустимых значений для полей объектов метаданных
 */

export const FIELD_VALUES: Record<string, string[]> = {
    // Boolean fields (да/нет)
    "UseStandardCommands": ["true", "false"],
    "CheckUnique": ["true", "false"],
    "Autonumbering": ["true", "false"],
    "MultiLine": ["true", "false"],
    "FillFromFillingValue": ["true", "false"],
    "ExtendedEdit": ["true", "false"],
    "PasswordMode": ["true", "false"],
    "MarkNegatives": ["true", "false"],
    "Hierarchical": ["true", "false"],
    "HierarchyType": ["HierarchyFoldersAndItems", "HierarchyOfItems"],
    "FoldersOnTop": ["true", "false"],
    "UseInputByString": ["true", "false"],
    "RegisterRecords": ["true", "false"],
    "Posting": ["Allow", "Deny"],
    "RealTimePosting": ["Allow", "Deny"],
    "SequenceFilling": ["AutoFillOff", "AutoFillOn", "AutoFillOnWrite"],
    "RegisterRecordsWritingOnPost": ["WriteSelected", "WriteModified"],
    "PostInPrivilegedMode": ["true", "false"],
    "UnpostInPrivilegedMode": ["true", "false"],
    "IncludeHelpInContents": ["true", "false"],
    "BasedOn": ["true", "false"],
    "DataLockControlMode": ["Managed", "Automatic", "AutomaticAndManaged"],
    
    // DataSeparation, SeparatedDataUse (CommonAttribute)
    "DataSeparation": ["DontUse", "Separate"],
    "SeparatedDataUse": ["Independently", "IndependentlyAndSimultaneously"],
    
    // Indexing (CommonAttribute - IndexWithAdditionalOrder)
    "Indexing": ["DontIndex", "Index", "IndexWithAdditionalOrder"],
    "FullTextSearch": ["Use", "DontUse"],
    "ObjectPresentation": [""],
    "ExtendedObjectPresentation": [""],
    "ListPresentation": [""],
    "ExtendedListPresentation": [""],
    "Explanation": [""],
    "CreateOnInput": ["Auto", "Use", "DontUse"],
    "AuxiliaryObjectForm": [""],
    "AuxiliaryListForm": [""],
    "AuxiliaryChoiceForm": [""],
    "DefaultObjectForm": [""],
    "DefaultListForm": [""],
    "DefaultChoiceForm": [""],
    "ChoiceHistoryOnInput": ["Auto", "Use", "DontUse"],
    
    // NumberType
    "NumberType": ["String", "Number"],
    
    // NumberAllowedLength
    "NumberAllowedLength": ["Variable", "Fixed"],
    
    // NumberPeriodicity
    "NumberPeriodicity": ["Nonperiodical", "Year", "Quarter", "Month", "Day"],
    
    // FillChecking
    "FillChecking": ["DontCheck", "ShowError", "ShowWarning"],
    
    // DataHistory
    "DataHistory": ["Use", "DontUse"],
    
    // QuickChoice
    "QuickChoice": ["Auto", "Use", "DontUse"],
    
    // SearchStringModeOnInputByString (1С XDTO: Begin, AnyPart)
    "SearchStringModeOnInputByString": ["Begin", "AnyPart"],
    
    // ChoiceDataGetModeOnInputByString (1С XDTO: Background, Directly, OnDemand)
    "ChoiceDataGetModeOnInputByString": ["Background", "Directly", "OnDemand"],
    
    // FullTextSearchOnInputByString
    "FullTextSearchOnInputByString": ["Use", "DontUse"],
    
    // DefaultForm
    "DefaultForm": [""],
    
    // AuxiliaryForm
    "AuxiliaryForm": [""],
    
    // CodeLength
    "CodeLength": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "15", "20", "25", "50"],
    
    // CodeAllowedLength
    "CodeAllowedLength": ["Variable", "Fixed"],
    
    // CodeSeries
    "CodeSeries": ["WholeCatalog", "WithinOwnerSubordination", "WithinOwnerHierarchy", "WholeCharacteristicKind"],
    
    // SubordinationUse (подчинение для иерархических справочников)
    "SubordinationUse": ["ToItems", "ToFolders", "ToFoldersAndItems"],
    
    // DescriptionLength
    "DescriptionLength": ["10", "25", "50", "100", "150", "200", "250", "300", "500"],
    
    // Periodicity
    "Periodicity": ["Nonperiodical", "Second", "Day", "Month", "Quarter", "Year"],
    
    // WriteMode
    "WriteMode": ["RecorderSubordinate", "Independent"],
    
    // MainFilterOnTheFly
    "MainFilterOnTheFly": ["true", "false"],
    
    // DefaultRecordForm
    "DefaultRecordForm": [""],
    
    // StandardRecordForm
    "StandardRecordForm": [""],
    
    // StandardListForm
    "StandardListForm": [""],
    
    // RecordFormUsePurpose
    "RecordFormUsePurpose": ["PlatformApplication", "MobilePlatformApplication"],
    
    // ListFormUsePurpose
    "ListFormUsePurpose": ["PlatformApplication", "MobilePlatformApplication"],
    
    // EnableTotalsSliceLast
    "EnableTotalsSliceLast": ["true", "false"],
    
    // EnableTotalsSliceFirst
    "EnableTotalsSliceFirst": ["true", "false"],
    
    // InformationRegisterPeriodicity (как в XML 1С и objectSchemas; см. выгрузку InformationRegisters)
    "InformationRegisterPeriodicity": [
        "Nonperiodical",
        "Second",
        "Day",
        "Month",
        "Quarter",
        "Year",
        "RecorderPosition"
    ],

    // RegisterType (регистр накопления): в XML 1С — Turnovers | Balances (не Balance / не BalancesAndTurnovers)
    "RegisterType": ["Turnovers", "Balances"],
    
    // MainAttribute
    "MainAttribute": ["true", "false"],
    
    // Use (for dimensions/resources)
    "Use": ["Always", "Auto", "DontUse"],
    
    // Balance
    "Balance": ["true", "false"],
    
    // Type (for accounting register)
    "Type": ["Both", "Debit", "Credit"],
    
    // CorrespondentType
    "CorrespondentType": ["ChartOfAccounts", "ExtDimension"],
    
    // Correspondence
    "Correspondence": ["true", "false"],
    
    // ChartOfCalculationTypes
    "ChartOfCalculationTypes": [""],
    
    // ActionPeriod
    "ActionPeriod": ["true", "false"],
    
    // ActionPeriodUse
    "ActionPeriodUse": ["true", "false"],
    
    // Schedule
    "Schedule": [""],
    
    // ScheduleValue
    "ScheduleValue": [""],
    
    // ScheduleDate
    "ScheduleDate": [""],
    
    // BasePeriod
    "BasePeriod": ["true", "false"],
    
    // BaseCalculationTypes
    "BaseCalculationTypes": [""],
    
    // ActionPeriodRoundUp
    "ActionPeriodRoundUp": ["true", "false"],
    
    // Predefined
    "Predefined": ["true", "false"],
    
    // PredefinedDataUpdate
    "PredefinedDataUpdate": ["Auto", "DontAutoUpdate", "AutoUpdateUseDefaultLanguage"],
    
    // EditType
    "EditType": ["InDialog", "BothWays"],
    
    // DefaultPresentation
    "DefaultPresentation": ["AsDescription", "AsCode"],
    
    // StandardTabularSections
    "StandardTabularSections": [""],
    
    // SearchOnInput
    "SearchOnInput": ["Auto", "Use", "DontUse"],
    
    // FullTextSearchUsing
    "FullTextSearchUsing": ["Allow", "Use", "DontUse"],
    
    // Characteristics
    "Characteristics": [""],
    
    // DataLockFields
    "DataLockFields": [""],
    
    // CommandParameterType
    "CommandParameterType": [""],
    
    // ParameterUseMode
    "ParameterUseMode": ["Single", "Multiple"],
    
    // ModifiesData
    "ModifiesData": ["true", "false"],
    
    // FormUsePurpose
    "FormUsePurpose": ["PlatformApplication", "MobilePlatformApplication", "MobileClient"],
    
    // ApplicationUsePurpose
    "ApplicationUsePurpose": ["PlatformApplication", "MobilePlatformApplication", "MobileClient"],
};

/**
 * Поля, которые должны оставаться текстовыми (для ручного ввода)
 */
export const TEXT_INPUT_FIELDS = [
    "Name",
    "Synonym",
    "Comment",
    "Наименование",
    "Синоним",
    "Комментарий",
    "NumberLength",
    "CodeLength",
    "DescriptionLength",
    "ToolTip",
    "Format",
    "EditFormat",
    "Mask",
    "CodeMask",
    "MaxValue",
    "MinValue",
];

/**
 * Получить список допустимых значений для поля
 */
export function getFieldValues(fieldName: string): string[] | null {
    // Убираем префиксы xr:, v8: и т.д.
    const cleanName = fieldName.replace(/^(xr:|v8:|cfg:|app:)/, '');
    return FIELD_VALUES[cleanName] || null;
}

/**
 * Приводит RegisterType регистра накопления к значениям выгрузки 1С: Turnovers | Balances.
 * Исправляет неверные варианты вроде Balance (единственное число).
 */
export function normalizeAccumulationRegisterTypeValue(raw: unknown): string | undefined {
    if (raw === undefined || raw === null) {
        return undefined;
    }
    const s = String(raw).trim();
    if (!s) {
        return undefined;
    }
    if (s === "Turnovers" || s === "Balances") {
        return s;
    }
    const lower = s.toLowerCase();
    if (lower === "balance" || lower === "balances") {
        return "Balances";
    }
    if (lower === "turnover" || lower === "turnovers") {
        return "Turnovers";
    }
    return s;
}

/**
 * Проверить, должно ли поле быть текстовым
 */
export function isTextInputField(fieldName: string): boolean {
    const cleanName = fieldName.replace(/^(xr:|v8:|cfg:|app:)/, '');
    return TEXT_INPUT_FIELDS.includes(cleanName);
}

/**
 * Словарь переводов названий полей объектов метаданных
 */
export const FIELD_LABELS: Record<string, string> = {
    'Name': 'Имя',
    'Synonym': 'Синоним',
    'Comment': 'Комментарий',
    'UseStandardCommands': 'Использовать стандартные команды',
    'Posting': 'Проведение',
    'RealTimePosting': 'Проведение в реальном времени',
    'RegisterRecords': 'Записи регистров',
    'BasedOn': 'Основание',
    'InputByString': 'Ввод по строке',
    'CreateOnInput': 'Создание при вводе',
    'DefaultObjectForm': 'Форма объекта по умолчанию',
    'DefaultListForm': 'Форма списка по умолчанию',
    'DefaultChoiceForm': 'Форма выбора по умолчанию',
    'FullTextSearch': 'Полнотекстовый поиск',
    'DataHistory': 'История данных',
    'ObjectPresentation': 'Представление объекта',
    'ListPresentation': 'Представление списка',
    'IncludeHelpInContents': 'Включать справку в содержание',
    'PostInPrivilegedMode': 'Проведение в привилегированном режиме',
    'UnpostInPrivilegedMode': 'Отмена проведения в привилегированном режиме',
    'WriteRegisterRecordsOnPosting': 'Запись регистров при проведении',
    'HierarchyType': 'Тип иерархии',
    'SubordinationUse': 'Подчинение',
    'RegisterRecordsDeletion': 'Удаление записей регистров',
    'RegisterRecordsWritingOnPost': 'Запись регистров при проведении',
    'SequenceFilling': 'Заполнение последовательности',
    'NumberType': 'Тип номера',
    'NumberAllowedLength': 'Тип длины номера',
    'NumberPeriodicity': 'Периодичность номера',
    'SearchStringModeOnInputByString': 'Режим поиска по строке',
    'FullTextSearchOnInputByString': 'Полнотекстовый поиск при вводе по строке',
    'ChoiceDataGetModeOnInputByString': 'Режим получения данных при вводе по строке',
    'DataLockControlMode': 'Режим управления блокировкой данных',
    'FillChecking': 'Проверка заполнения',
    'ChoiceFoldersAndItems': 'Выбор папок и элементов',
    'Indexing': 'Индексирование',
    'PasswordMode': 'Режим пароля',
    'MarkNegatives': 'Отмечать отрицательные',
    'MultiLine': 'Многострочный',
    'ExtendedEdit': 'Расширенное редактирование',
    'FillFromFillingValue': 'Заполнять из значения заполнения',
    'CheckUnique': 'Проверять уникальность',
    'Autonumbering': 'Автонумерация',
    'UpdateDataHistoryImmediatelyAfterWrite': 'Обновлять историю данных сразу после записи',
    'ExecuteAfterWriteDataHistoryVersionProcessing': 'Выполнять обработку версии истории данных после записи',
    'DefaultForm': 'Форма по умолчанию',
    'AuxiliaryForm': 'Вспомогательная форма',
    'DefaultRecordForm': 'Форма записи по умолчанию',
    'AuxiliaryRecordForm': 'Вспомогательная форма записи',
    'AuxiliaryListForm': 'Вспомогательная форма списка',
    'AuxiliaryChoiceForm': 'Вспомогательная форма выбора',
    'EditType': 'Тип редактирования',
    'InformationRegisterPeriodicity': 'Периодичность регистра сведений',
    'WriteMode': 'Режим записи',
    'MainFilterOnPeriod': 'Основной фильтр по периоду',
    'EnableTotalsSliceFirst': 'Включить срез итогов сначала',
    'EnableTotalsSliceLast': 'Включить срез итогов в конце',
    'EnableTotalsSplitting': 'Включить разбиение итогов',
    'RecordPresentation': 'Представление записи',
    'ExtendedRecordPresentation': 'Расширенное представление записи',
    'ExtendedListPresentation': 'Расширенное представление списка',
    'ExtendedObjectPresentation': 'Расширенное представление объекта',
    'Explanation': 'Пояснение',
    'ExtendedPresentation': 'Расширенное представление',
    'RegisterType': 'Тип регистра',
    'ChartOfAccounts': 'План счетов',
    'Correspondence': 'Корреспонденция',
    'PeriodAdjustmentLength': 'Длина уточнения периода',
    'Master': 'Ведущий',
    'MainFilter': 'Основной фильтр',
    'Periodicity': 'Периодичность',
    'ActionPeriod': 'Период действия',
    'BasePeriod': 'Базовый период',
    'Schedule': 'График',
    'ScheduleValue': 'Значение графика',
    'ScheduleDate': 'Дата графика',
    'ChartOfCalculationTypes': 'План видов расчета',
    'Hierarchical': 'Иерархический',
    'FoldersOnTop': 'Папки сверху',
    'CodeLength': 'Длина кода',
    'CodeAllowedLength': 'Тип длины кода',
    'CodeSeries': 'Серия кода',
    'DescriptionLength': 'Длина описания',
    'DefaultPresentation': 'Представление по умолчанию',
    'QuickChoice': 'Быстрый выбор',
    'ChoiceMode': 'Режим выбора',
    'ChoiceHistoryOnInput': 'История выбора при вводе',
    'DefaultFolderForm': 'Форма папки по умолчанию',
    'DefaultFolderChoiceForm': 'Форма выбора папки по умолчанию',
    'AuxiliaryFolderForm': 'Вспомогательная форма папки',
    'AuxiliaryFolderChoiceForm': 'Вспомогательная форма выбора папки',
    'DataLockFields': 'Поля блокировки данных',
    'PredefinedDataUpdate': 'Обновление предопределенных данных',
    'Characteristics': 'Характеристики',
    'StandardAttributes': 'Стандартные реквизиты',
    // Стандартные атрибуты
    'Posted': 'Проведен',
    'PredefinedDataName': 'Имя предопределенных данных',
    'Order': 'Порядок',
    'OffBalance': 'Забалансовый',
    'Ref': 'Ссылка',
    'DeletionMark': 'Пометка удаления',
    'CodeMask': 'Маска кода',
    'ExtDimensionTypes': 'Виды субконто',
    'MaxExtDimensionCount': 'Максимальное количество субконто',
    'AutoOrderByCode': 'Автопорядок по коду',
    'OrderLength': 'Длина порядка',
    'Date': 'Дата',
    'Number': 'Номер',
    'Owner': 'Владелец',
    'Parent': 'Родитель',
    'Code': 'Код',
    'Level': 'Уровень',
    'IsFolder': 'Это папка',
    'DataVersion': 'Версия данных',
    'LockedByDBMS': 'Заблокировано СУБД',
    'ReadOnly': 'Только чтение',
    'TypeReductionMode': 'Режим приведения типа',
    'StandardTabularSections': 'Стандартные табличные части',
    'DependenceOnCalculationTypes': 'Зависимость от базы',
    'BaseCalculationTypes': 'Базовые планы видов расчета',
    'ActionPeriodUse': 'Использует период действия',
    'ActionPeriodIsBase': 'Базовый период действия',
    'Type': 'Тип',
    'CharacteristicExtValues': 'Внешние значения характеристик',
    'NumberLength': 'Длина номера',
    'TaskNumberAutoPrefix': 'Автопрефикс номера задачи',
    'Addressing': 'Адресация',
    'MainAddressingAttribute': 'Основной атрибут адресации',
    'CurrentPerformer': 'Текущий исполнитель',
    'Task': 'Задача',
    'CreateTaskInPrivilegedMode': 'Создание задачи в привилегированном режиме',
    'DistributedInfoBase': 'Распределенная информационная база',
    'IncludeConfigurationExtensions': 'Включать расширения конфигурации',
    'AutoRecord': 'Авторегистрация',
    'RegisteredDocuments': 'Зарегистрированные документы',
    'Namespace': 'Пространство имен',
    'XDTOPackages': 'Пакеты XDTO',
    'DescriptorFileName': 'Имя файла дескриптора',
    'ReuseSessions': 'Переиспользование сеансов',
    'SessionMaxAge': 'Максимальный возраст сеанса',
    'RootURL': 'Корневой URL',
    'IncludeInCommandInterface': 'Включать в интерфейс команд',
    'UseOneCommand': 'Использовать одну команду',
    'Picture': 'Картинка',
    'Content': 'Содержимое',
    'MethodName': 'Имя метода',
    'Description': 'Описание',
    'Key': 'Ключ',
    'Use': 'Использование',
    'Predefined': 'Предопределенное',
    'RestartCountOnFailure': 'Количество перезапусков при ошибке',
    'RestartIntervalOnFailure': 'Интервал перезапуска при ошибке',
    'Group': 'Группа',
    'Representation': 'Представление',
    'ToolTip': 'Подсказка',
    'Shortcut': 'Сочетание клавиш',
    'CommandParameterType': 'Тип параметра команды',
    'ParameterUseMode': 'Режим использования параметра',
    'ModifiesData': 'Изменяет данные',
    'OnMainServerUnavalableBehavior': 'Поведение при недоступности главного сервера',
    'TemplateType': 'Тип макета',
    'AvailabilityForChoice': 'Доступность для выбора',
    'AvailabilityForAppearance': 'Доступность для отображения',
    'LocationURL': 'URL расположения',
    'DefaultSaveForm': 'Форма сохранения по умолчанию',
    'DefaultLoadForm': 'Форма загрузки по умолчанию',
    'AuxiliarySaveForm': 'Вспомогательная форма сохранения',
    'AuxiliaryLoadForm': 'Вспомогательная форма загрузки',
    'FormType': 'Тип формы',
    'UsePurposes': 'Назначения использования',
    'Global': 'Глобальный',
    'ClientManagedApplication': 'Клиентское управляемое приложение',
    'Server': 'Серверный',
    'ExternalConnection': 'Внешнее соединение',
    'ClientOrdinaryApplication': 'Клиентское обычное приложение',
    'ServerCall': 'Серверный вызов',
    'Privileged': 'Привилегированный',
    'ReturnValuesReuse': 'Переиспользование возвращаемых значений',
    'Format': 'Формат',
    'EditFormat': 'Формат редактирования',
    'MinValue': 'Минимальное значение',
    'MaxValue': 'Максимальное значение',
    'ChoiceParameterLinks': 'Связи параметров выбора',
    'ChoiceParameters': 'Параметры выбора',
    'ChoiceForm': 'Форма выбора',
    'LinkByType': 'Связь по типу',
    'MainDataCompositionSchema': 'Основная схема композиции данных',
    'DefaultSettingsForm': 'Форма настроек по умолчанию',
    'AuxiliarySettingsForm': 'Вспомогательная форма настроек',
    'DefaultVariantForm': 'Форма варианта по умолчанию',
    'VariantsStorage': 'Хранилище вариантов',
    'SettingsStorage': 'Хранилище настроек',
    // Дополнительные переводы из анализа
    'AccumulationRegister': 'Регистр накопления',
    'AuthenticationSeparation': 'Разделение аутентификации',
    'AutoUse': 'Автоиспользование',
    'AuxiliaryObjectForm': 'Вспомогательная форма объекта',
    'BusinessProcess': 'Бизнес-процесс',
    'CalculationRegister': 'Регистр расчета',
    'Category': 'Категория',
    'ChartOfCharacteristicTypes': 'План видов характеристик',
    'CodeType': 'Тип кода',
    'CommandGroup': 'Группа команд',
    'CommonAttribute': 'Общий реквизит',
    'CommonCommand': 'Общая команда',
    'CommonForm': 'Общая форма',
    'CommonModule': 'Общий модуль',
    'CommonPicture': 'Общая картинка',
    'CommonTemplate': 'Общий макет',
    'ConditionalSeparation': 'Условное разделение',
    'ConfigurationExtensionsSeparation': 'Разделение расширений конфигурации',
    'Constant': 'Константа',
    'DataProcessor': 'Обработка',
    'DataSeparation': 'Разделение данных',
    'DataSeparationUse': 'Использование разделения данных',
    'DataSeparationValue': 'Значение разделения данных',
    'DefinedType': 'Определяемый тип',
    'DocumentJournal': 'Журнал документов',
    'DocumentNumerator': 'Нумератор документов',
    'Event': 'Событие',
    'EventSubscription': 'Подписка на событие',
    'ExchangePlan': 'План обмена',
    'FillValue': 'Значение заполнения',
    'FilterCriterion': 'Критерий отбора',
    'FunctionalOption': 'Функциональная опция',
    'FunctionalOptionsParameter': 'Параметр функциональных опций',
    'HTTPService': 'HTTP-сервис',
    'Handler': 'Обработчик',
    'InformationRegister': 'Регистр сведений',
    'Location': 'Расположение',
    'Mask': 'Маска',
    'PrivilegedGetMode': 'Режим получения в привилегированном режиме',
    'Report': 'Отчет',
    'Role': 'Роль',
    'ScheduledJob': 'Регламентное задание',
    'SeparatedDataUse': 'Использование разделенных данных',
    'SessionParameter': 'Параметр сеанса',
    'Source': 'Источник',
    'StyleItem': 'Элемент стиля',
    'Subsystem': 'Подсистема',
    'UsersSeparation': 'Разделение пользователей',
    'Value': 'Значение',
    'WSReference': 'WS-ссылка',
    'WebService': 'Веб-сервис'
};

/**
 * Словарь переводов значений enum для выпадающих списков
 */
export const ENUM_VALUE_LABELS: Record<string, string> = {
    // DependenceOnCalculationTypes (ПВР — зависимость от базы)
    'DontDepend': 'Не зависит',
    'OnActionPeriod': 'Зависит по периоду действия',
    'OnRegistrationPeriod': 'Зависит по периоду регистрации',

    // RegisterType (регистр накопления)
    'Turnovers': 'Обороты',
    'Balances': 'Остатки',
    'BalancesAndTurnovers': 'Остатки и обороты',

    // FillChecking
    'DontCheck': 'Не проверять',
    'ShowError': 'Показать ошибку',
    'ShowWarning': 'Показать предупреждение',
    
    // CreateOnInput
    'Auto': 'Автоматически',
    'Use': 'Использовать',
    'DontUse': 'Не использовать',
    'Create': 'Создавать',
    'DontCreate': 'Не создавать',
    
    // TypeReductionMode
    'TransformValues': 'Преобразовывать значения',
    'DontTransform': 'Не преобразовывать',
    
    // Posting
    'Allow': 'Разрешить',
    'Deny': 'Запретить',
    
    // SequenceFilling
    'AutoFillOff': 'Автозаполнение выключено',
    'AutoFillOn': 'Автозаполнение включено',
    'AutoFillOnWrite': 'Автозаполнение при записи',
    
    // RegisterRecordsWritingOnPost
    'WriteSelected': 'Записывать выбранные',
    'WriteModified': 'Записывать измененные',
    
    // DataLockControlMode
    'Managed': 'Управляемый',
    'Automatic': 'Автоматический',
    'AutomaticAndManaged': 'Автоматический и управляемый',
    
    // HierarchyType
    'HierarchyFoldersAndItems': 'Папки и элементы',
    'HierarchyOfItems': 'Элементы',
    
    // NumberType
    'String': 'Строка',
    'Number': 'Число',
    
    // NumberAllowedLength, CodeAllowedLength, v8:AllowedLength
    'Variable': 'Переменная',
    'Fixed': 'Фиксированная',
    
    // NumberPeriodicity, Periodicity, InformationRegisterPeriodicity
    'Nonperiodical': 'Непериодический',
    'Year': 'Год',
    'Quarter': 'Квартал',
    'Month': 'Месяц',
    'Day': 'День',
    'Second': 'Секунда',
    'RecorderPosition': 'Позиция регистратора',
    
    // CodeSeries
    'WholeCatalog': 'Весь справочник',
    'WithinOwnerSubordination': 'В пределах подчиненности владельца',
    'WithinOwnerHierarchy': 'В пределах иерархии владельца',
    'WholeCharacteristicKind': 'Весь вид характеристики',
    
    // SearchStringModeOnInputByString
    'Begin': 'С начала',
    'AnyPart': 'С любой части',
    'Substring': 'Подстрока',
    'Anywhere': 'Везде',
    
    // ChoiceDataGetModeOnInputByString
    'Background': 'В фоне',
    'Directly': 'Напрямую',
    'OnDemand': 'По требованию',
    
    // SubordinationUse
    'ToItems': 'Элементам',
    'ToFolders': 'Папкам',
    'ToFoldersAndItems': 'Папкам и элементам',
    
    // WriteMode
    'RecorderSubordinate': 'Подчиненный регистратору',
    'Independent': 'Независимый',
    
    // Type (for accounting register)
    'Both': 'Оба',
    'Debit': 'Дебет',
    'Credit': 'Кредит',
    
    // CorrespondentType
    'ChartOfAccounts': 'План счетов',
    'ExtDimension': 'Внешнее измерение',
    
    // PredefinedDataUpdate
    'DontAutoUpdate': 'Не обновлять автоматически',
    'AutoUpdateUseDefaultLanguage': 'Автообновление с языком по умолчанию',
    
    // EditType
    'InDialog': 'В диалоге',
    'BothWays': 'Оба способа',
    
    // DefaultPresentation
    'AsDescription': 'Как описание',
    'AsCode': 'Как код',
    
    // Use
    'Always': 'Всегда',
    
    // Indexing
    'DontIndex': 'Не индексировать',
    'Index': 'Индексировать',
    'IndexWithAdditionalOrder': 'Индексировать с дополнительным порядком',
    
    // ChoiceFoldersAndItems
    'Items': 'Элементы',
    'FoldersAndItems': 'Папки и элементы',
    
    // RecordFormUsePurpose, ListFormUsePurpose, FormUsePurpose, ApplicationUsePurpose
    'PlatformApplication': 'Приложение платформы',
    'MobilePlatformApplication': 'Мобильное приложение платформы',
    'MobileClient': 'Мобильный клиент',
    
    // ParameterUseMode
    'Single': 'Одиночный',
    'Multiple': 'Множественный',
    
    // v8:Sign, v8:AllowedSign
    'Any': 'Любой',
    'Nonnegative': 'Неотрицательный',
    
    // v8:DateFractions
    'Date': 'Дата',
    'Time': 'Время',
    'DateTime': 'Дата и время',
    
    // DataSeparation, SeparatedDataUse
    'Separate': 'Раздельно',
    'Independently': 'Независимо',
    'IndependentlyAndSimultaneously': 'Независимо и одновременно',
    
    // TaskNumberAutoPrefix (DontUse и Auto уже определены выше)
    'BusinessProcessNumber': 'Номер бизнес-процесса',
    
    // Representation (CommandGroup)
    'Picture': 'Картинка',
    'PictureAndText': 'Картинка и текст',
    
    // Category (CommandGroup)
    'FormCommandBar': 'Панель команд формы',
    'FormNavigationPanel': 'Панель навигации формы',
    'ActionsPanel': 'Панель действий',
    'NavigationPanel': 'Панель навигации',
    
    // TemplateType
    'BinaryData': 'Двоичные данные',
    'SpreadsheetDocument': 'Табличный документ',
    'TextDocument': 'Текстовый документ',
    'DataCompositionSchema': 'Схема компоновки данных'
};

/**
 * Получить переведенное название поля объекта метаданных
 * @param field - имя поля (например, 'Name', 'Synonym', 'Posting')
 * @returns переведенное название поля или исходное имя, если перевод не найден
 */
export function getFieldLabel(field: string): string {
    // Убираем префиксы xr:, v8: и т.д.
    const cleanName = field.replace(/^(xr:|v8:|cfg:|app:)/, '');
    return FIELD_LABELS[cleanName] || field;
}

/**
 * Подписи значений периодичности регистра сведений (как в конфигураторе 1С: «В пределах …»).
 * Отличаются от подписей для Periodicity регистра расчёта (там «Месяц», «День» и т.д.).
 */
const INFORMATION_REGISTER_PERIODICITY_LABELS: Record<string, string> = {
    Nonperiodical: 'Непериодический',
    Second: 'В пределах секунды',
    Day: 'В пределах дня',
    Month: 'В пределах месяца',
    Quarter: 'В пределах квартала',
    Year: 'В пределах года',
    RecorderPosition: 'Позиция регистратора'
};

/**
 * Получить переведенное значение enum для выпадающего списка
 * @param value - значение enum (например, 'DontCheck', 'ShowError')
 * @param field - имя поля метаданных; для InformationRegisterPeriodicity — отдельные подписи конфигуратора
 * @returns переведенное значение или исходное значение, если перевод не найден
 */
export function getEnumValueLabel(value: string, field?: string): string {
    if (field === 'InformationRegisterPeriodicity') {
        return INFORMATION_REGISTER_PERIODICITY_LABELS[value] || value;
    }
    return ENUM_VALUE_LABELS[value] || value;
}


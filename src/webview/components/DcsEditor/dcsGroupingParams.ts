/**
 * Параметры outputParameters для группировок СКД (Другие настройки).
 * Источник: XSD data-composition-system, документация 1С.
 */

/** Параметр с возможностью выбора из списка */
export interface GroupingParamOption {
  value: string;
  label: string;
}

/** Описание параметра группировки */
export interface GroupingParamDef {
  parameter: string;
  label: string;
  options?: GroupingParamOption[];
  type?: 'string' | 'number' | 'boolean';
  /** Родительский параметр — для отображения с отступом (подчинённые «Тип диаграммы») */
  parentParameter?: string;
}

/** Полный список параметров группировок СКД с возможными значениями */
export const GROUPING_OUTPUT_PARAMS: GroupingParamDef[] = [
  { parameter: 'МакетОформления', label: 'Макет оформления', options: [
    { value: 'БезОформления', label: 'Без оформления' },
    { value: 'Основной', label: 'Основной' },
  ]},
  { parameter: 'ВариантИспользованияГруппировки', label: 'Вариант использования группировки', options: [
    { value: 'Items', label: 'Детальные записи' },
    { value: 'AdditionalInformation', label: 'Дополнительная информация' },
    { value: 'DontUse', label: 'Не использовать' },
    { value: 'AUTO', label: 'Автоматический' },
  ]},
  { parameter: 'КоличествоЗаписей', label: 'Количество записей', type: 'number' },
  { parameter: 'ПроцентЗаписей', label: 'Процент записей', type: 'number' },
  { parameter: 'ТипМакета', label: 'Тип макета', options: [
    { value: 'Авто', label: 'Авто' },
    { value: 'Обычный', label: 'Обычный' },
    { value: 'Повторяющийся', label: 'Повторяющийся' },
  ]},
  { parameter: 'РасположениеИтогов', label: 'Расположение итогов', options: [
    { value: 'Авто', label: 'Авто' },
    { value: 'Нет', label: 'Нет' },
    { value: 'Начало', label: 'Начало' },
    { value: 'Конец', label: 'Конец' },
  ]},
  { parameter: 'РасположениеПолейГруппировок', label: 'Расположение полей группировок', options: [
    { value: 'Вместе', label: 'Вместе' },
    { value: 'Раздельно', label: 'Раздельно' },
    { value: 'Авто', label: 'Авто' },
  ]},
  { parameter: 'РасположениеГруппировок', label: 'Расположение группировок', options: [
    { value: 'Начало', label: 'Начало' },
    { value: 'Конец', label: 'Конец' },
    { value: 'Авто', label: 'Авто' },
  ]},
  { parameter: 'РасположениеРеквизитов', label: 'Расположение реквизитов', options: [
    { value: 'ВместеСВладельцем', label: 'Вместе с владельцем' },
    { value: 'Раздельно', label: 'Раздельно' },
    { value: 'Авто', label: 'Авто' },
  ]},
  { parameter: 'РасположениеРесурсов', label: 'Расположение ресурсов', options: [
    { value: 'Горизонтально', label: 'Горизонтально' },
    { value: 'Вертикально', label: 'Вертикально' },
    { value: 'Авто', label: 'Авто' },
  ]},
  { parameter: 'РасположениеОбщихИтоговПоВертикали', label: 'Расположение общих итогов по вертикали', options: [
    { value: 'Авто', label: 'Авто' },
    { value: 'Начало', label: 'Начало' },
    { value: 'Конец', label: 'Конец' },
  ]},
  { parameter: 'ТипЗаголовкаПолей', label: 'Тип заголовка полей', options: [
    { value: 'Авто', label: 'Авто' },
    { value: 'Горизонтальный', label: 'Горизонтальный' },
    { value: 'Вертикальный', label: 'Вертикальный' },
  ]},
  { parameter: 'ВыводитьЗаголовок', label: 'Выводить заголовок', options: [
    { value: 'Авто', label: 'Авто' },
    { value: 'Да', label: 'Да' },
    { value: 'Нет', label: 'Нет' },
  ]},
  { parameter: 'Заголовок', label: 'Заголовок' },
  { parameter: 'ВыводитьОтбор', label: 'Выводить отбор', options: [
    { value: 'Авто', label: 'Авто' },
    { value: 'Output', label: 'Выводить' },
    { value: 'DontOutput', label: 'Не выводить' },
    { value: 'Да', label: 'Да' },
    { value: 'Нет', label: 'Нет' },
  ]},
  { parameter: 'АвтоПозицияРесурсов', label: 'Авто позиция ресурсов', options: [
    { value: 'ПослеВсехПолей', label: 'После всех полей' },
    { value: 'ВместеСПолем', label: 'Вместе с полем' },
    { value: 'Авто', label: 'Авто' },
    { value: 'DontUse', label: 'Не использовать' },
  ]},
  { parameter: 'ТипДиаграммы', label: 'Тип диаграммы', options: [
    { value: 'Гистограмма', label: 'Гистограмма' },
    { value: 'Круговая', label: 'Круговая' },
    { value: 'Column', label: 'Столбчатая' },
    { value: 'Pie3D', label: 'Круговая 3D' },
    { value: 'Line', label: 'Линейная' },
  ]},
  { parameter: 'ПропускатьБазовоеЗначение', label: 'Пропускать базовое значение', type: 'boolean', options: [
    { value: 'true', label: 'Истина' },
    { value: 'false', label: 'Ложь' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'СоставПодписей', label: 'Состав подписей', options: [
    { value: 'СерияПлюсПроцент', label: 'Серия + процент' },
    { value: 'ТолькоСерия', label: 'Только серия' },
    { value: 'ТолькоПроцент', label: 'Только процент' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'РежимРаздвижения', label: 'Режим раздвижения', options: [
    { value: 'Нет', label: 'Нет' },
    { value: 'Да', label: 'Да' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'ОтображатьТаблицуДанных', label: 'Отображать таблицу данных', type: 'boolean', options: [
    { value: 'true', label: 'Истина' },
    { value: 'false', label: 'Ложь' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'Окантовка', label: 'Окантовка', type: 'boolean', options: [
    { value: 'true', label: 'Истина' },
    { value: 'false', label: 'Ложь' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'Градиент', label: 'Градиент', type: 'boolean', options: [
    { value: 'true', label: 'Истина' },
    { value: 'false', label: 'Ложь' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'Шрифт', label: 'Шрифт', parentParameter: 'ТипДиаграммы' },
  { parameter: 'ЦветФона', label: 'Цвет фона', parentParameter: 'ТипДиаграммы' },
  { parameter: 'СтильЛинии', label: 'Стиль линии', options: [
    { value: 'НетЛинии', label: 'Нет линии' },
    { value: 'Сплошная', label: 'Сплошная' },
    { value: 'Пунктир', label: 'Пунктир' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'РазмещениеЛегенды', label: 'Размещение легенды', options: [
    { value: 'Нет', label: 'Нет' },
    { value: 'Авто', label: 'Авто' },
    { value: 'Сверху', label: 'Сверху' },
    { value: 'Снизу', label: 'Снизу' },
    { value: 'Слева', label: 'Слева' },
    { value: 'Справа', label: 'Справа' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'РасположениеРесурсовВДиаграмме', label: 'Расположение ресурсов в диаграмме', options: [
    { value: 'Авто', label: 'Авто' },
    { value: 'Горизонтально', label: 'Горизонтально' },
    { value: 'Вертикально', label: 'Вертикально' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'СоединениеЗначенийПоСериям', label: 'Соединение значений по сериям', options: [
    { value: 'Нет', label: 'Нет' },
    { value: 'Да', label: 'Да' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'ЛинииСоединенияЗначенийПоСериям', label: 'Линии соединения значений по сериям', options: [
    { value: 'Сплошная', label: 'Сплошная' },
    { value: 'Пунктир', label: 'Пунктир' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'ЦветСоединенияЗначенийПоСериям', label: 'Цвет соединения значений по сериям', parentParameter: 'ТипДиаграммы' },
  { parameter: 'РежимСглаживания', label: 'Режим сглаживания', options: [
    { value: 'Нет', label: 'Нет' },
    { value: 'Да', label: 'Да' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'НатяжениеСглаживания', label: 'Натяжение сглаживания', type: 'number', parentParameter: 'ТипДиаграммы' },
  { parameter: 'РежимПолупрозрачности', label: 'Режим полупрозрачности', options: [
    { value: 'Авто', label: 'Авто' },
    { value: 'Нет', label: 'Нет' },
    { value: 'Да', label: 'Да' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'ПорядокОтображенияСерийВЛегенде', label: 'Порядок отображения серий в легенде', options: [
    { value: 'Авто', label: 'Авто' },
    { value: 'ПоПорядкуДобавления', label: 'По порядку добавления' },
  ], parentParameter: 'ТипДиаграммы' },
  { parameter: 'ПорядокОтображенияТочекВГоризонтальнойДиаграмме', label: 'Порядок отображения точек в горизонтальной диаграмме', options: [
    { value: 'Авто', label: 'Авто' },
    { value: 'ПоПорядкуДобавления', label: 'По порядку добавления' },
  ], parentParameter: 'ТипДиаграммы' },
];

/** Карта параметр -> определение (для быстрого поиска) */
export const GROUPING_PARAM_MAP = new Map(GROUPING_OUTPUT_PARAMS.map((p) => [p.parameter, p]));

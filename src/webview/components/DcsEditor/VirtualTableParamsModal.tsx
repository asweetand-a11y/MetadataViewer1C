import React, { useEffect, useMemo, useState } from 'react';
import './VirtualTableParamsModal.css';

export type VirtualTableKind =
  | 'Обороты'
  | 'Остатки'
  | 'ОстаткиИОбороты'
  | 'ОборотыДтКт'
  | 'ДвиженияССубконто'
  | 'СрезПоследних'
  | 'СрезПервых'
  | 'Движения'
  | 'ПериодДействия'
  | 'ДанныеГрафика'
  | 'ФактическийПериодДействия';

export type VirtualTableFamily = 'AccumulationRegister' | 'InformationRegister' | 'AccountingRegister' | 'CalculationRegister';

export type VirtualTableParamId =
  | 'НачалоПериода'
  | 'КонецПериода'
  | 'Период'
  | 'Периодичность'
  | 'Условие'
  | 'Счет'
  | 'СчетДт'
  | 'СчетКт'
  | 'СписокВидовСубконто'
  | 'СписокВидовСубконтоДт'
  | 'СписокВидовСубконтоКт'
  | 'Разрезы'
  | 'ДопПараметр1'
  | 'ДопПараметр2'
  | 'СостояниеПериода'
  | 'ПериодДействияНачало'
  | 'ПериодДействияКонец'
  | 'ТолькоДействующие'
  | 'СпособРазложения'
  | 'ВидДвижения'
  | 'СпособЗаполнения'
  | 'Отбор';

export type VirtualTableParamDef = {
  id: VirtualTableParamId;
  label: string;
  kind: 'text' | 'periodicity' | 'condition' | 'boolean' | 'periodDecomposition';
};

export type VirtualTableParamValues = Record<VirtualTableParamId, string>;

export function getVirtualTableParams(family: VirtualTableFamily, kind: VirtualTableKind): VirtualTableParamDef[] {
  // Минимальный, но практичный набор, близкий к интерфейсу 1С.
  // Порядок важен: именно в этом порядке собираем аргументы в скобках.

  // РегистрНакопления
  if (family === 'AccumulationRegister') {
    if (kind === 'Движения') {
      return [
        { id: 'НачалоПериода', label: 'НачалоПериода', kind: 'text' },
        { id: 'КонецПериода', label: 'КонецПериода', kind: 'text' },
        { id: 'СостояниеПериода', label: 'СостояниеПериода', kind: 'text' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
      ];
    }
    if (kind === 'Остатки') {
      return [
        { id: 'КонецПериода', label: 'КонецПериода', kind: 'text' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
      ];
    }
    if (kind === 'Обороты' || kind === 'ОстаткиИОбороты') {
      return [
        { id: 'НачалоПериода', label: 'НачалоПериода', kind: 'text' },
        { id: 'КонецПериода', label: 'КонецПериода', kind: 'text' },
        { id: 'Периодичность', label: 'Периодичность', kind: 'periodicity' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
      ];
    }
  }

  // РегистрСведений
  if (family === 'InformationRegister') {
    if (kind === 'Движения') {
      return [
        { id: 'НачалоПериода', label: 'НачалоПериода', kind: 'text' },
        { id: 'КонецПериода', label: 'КонецПериода', kind: 'text' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
      ];
    }
    if (kind === 'СрезПоследних' || kind === 'СрезПервых') {
      return [
        { id: 'Период', label: 'Период', kind: 'text' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
      ];
    }
  }

  // РегистрБухгалтерии (по примеру из BUH/Reports/АнализСубконто)
  if (family === 'AccountingRegister') {
    // Сигнатуры выведены по реальным примерам из BUH/Reports:
    // - АнализСостоянияНалоговогоУчетаПоНалогуНаПрибыль
    // - КарточкаСчета
    // - АнализСубконто

    if (kind === 'Движения') {
      return [
        { id: 'НачалоПериода', label: 'НачалоПериода', kind: 'text' },
        { id: 'КонецПериода', label: 'КонецПериода', kind: 'text' },
        { id: 'СостояниеПериода', label: 'СостояниеПериода', kind: 'text' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
      ];
    }

    if (kind === 'Остатки') {
      // Пример: Остатки(&Период, Счет ..., ВидСубконто..., Организация = ...)
      return [
        { id: 'Период', label: 'Период', kind: 'text' },
        { id: 'Счет', label: 'Счет', kind: 'text' },
        { id: 'СписокВидовСубконто', label: 'ВидСубконто', kind: 'text' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
      ];
    }

    if (kind === 'Обороты') {
      // Пример: Обороты(&НачалоПериода, &КонецПериода, Регистратор, Счет ..., ВидСубконто..., Условие1, Условие2, <пусто>)
      return [
        { id: 'НачалоПериода', label: 'НачалоПериода', kind: 'text' },
        { id: 'КонецПериода', label: 'КонецПериода', kind: 'text' },
        { id: 'Разрезы', label: 'Разрезы', kind: 'text' },
        { id: 'Счет', label: 'Счет', kind: 'text' },
        { id: 'СписокВидовСубконто', label: 'ВидСубконто', kind: 'text' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
        { id: 'ДопПараметр1', label: 'Доп. параметр 1', kind: 'text' },
        { id: 'ДопПараметр2', label: 'Доп. параметр 2', kind: 'text' },
      ];
    }

    if (kind === 'ОстаткиИОбороты') {
      // Пример: ОстаткиИОбороты({(&НачалоПериода)}, {(&КонецПериода)}, Месяц {(&Периодичность)}, , {(Счет) КАК Счет}, &СписокВидовСубконто, {(...)})
      return [
        { id: 'НачалоПериода', label: 'НачалоПериода', kind: 'text' },
        { id: 'КонецПериода', label: 'КонецПериода', kind: 'text' },
        { id: 'Периодичность', label: 'Периодичность', kind: 'text' },
        { id: 'ДопПараметр1', label: 'Доп. параметр 1', kind: 'text' },
        { id: 'Счет', label: 'Счет', kind: 'text' },
        { id: 'СписокВидовСубконто', label: 'СписокВидовСубконто', kind: 'text' },
        { id: 'Разрезы', label: 'Разрезы', kind: 'text' },
      ];
    }

    if (kind === 'ОборотыДтКт') {
      // Пример: ОборотыДтКт(Начало, Конец, Регистратор, СчетДт=..., ВидСубконтоДт, СчетКт..., ВидСубконтоКт, Условие)
      return [
        { id: 'НачалоПериода', label: 'НачалоПериода', kind: 'text' },
        { id: 'КонецПериода', label: 'КонецПериода', kind: 'text' },
        { id: 'Разрезы', label: 'Разрезы', kind: 'text' },
        { id: 'СчетДт', label: 'СчетДт', kind: 'text' },
        { id: 'СписокВидовСубконтоДт', label: 'ВидСубконтоДт', kind: 'text' },
        { id: 'СчетКт', label: 'СчетКт', kind: 'text' },
        { id: 'СписокВидовСубконтоКт', label: 'ВидСубконтоКт', kind: 'text' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
      ];
    }

    if (kind === 'ДвиженияССубконто') {
      // Пример (КарточкаСчета): ДвиженияССубконто({(&НачалоПериода)}, {(&КонецПериода)}, <условие>, {<разрезы>}, , )
      return [
        { id: 'НачалоПериода', label: 'НачалоПериода', kind: 'text' },
        { id: 'КонецПериода', label: 'КонецПериода', kind: 'text' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
        { id: 'Разрезы', label: 'Разрезы', kind: 'text' },
        { id: 'ДопПараметр1', label: 'Доп. параметр 1', kind: 'text' },
        { id: 'ДопПараметр2', label: 'Доп. параметр 2', kind: 'text' },
      ];
    }
  }

  // РегистрРасчета
  if (family === 'CalculationRegister') {
    if (kind === 'Движения') {
      return [
        { id: 'НачалоПериода', label: 'НачалоПериода', kind: 'text' },
        { id: 'КонецПериода', label: 'КонецПериода', kind: 'text' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
      ];
    }

    if (kind === 'ПериодДействия') {
      return [
        { id: 'ПериодДействияНачало', label: 'ПериодДействия (начало)', kind: 'text' },
        { id: 'ПериодДействияКонец', label: 'ПериодДействия (конец)', kind: 'text' },
        { id: 'Условие', label: 'Отбор', kind: 'condition' },
        { id: 'ТолькоДействующие', label: 'ТолькоДействующие', kind: 'boolean' },
        { id: 'СпособРазложения', label: 'СпособРазложения', kind: 'periodDecomposition' },
        { id: 'ВидДвижения', label: 'ВидДвижения', kind: 'text' },
      ];
    }

    if (kind === 'ДанныеГрафика') {
      return [
        { id: 'НачалоПериода', label: 'НачалоПериода', kind: 'text' },
        { id: 'КонецПериода', label: 'КонецПериода', kind: 'text' },
        { id: 'Условие', label: 'Условие', kind: 'condition' },
      ];
    }
  }

  return [{ id: 'Условие', label: 'Условие', kind: 'condition' }];
}

export interface VirtualTableParamsModalProps {
  isOpen: boolean;
  family: VirtualTableFamily;
  kind: VirtualTableKind;
  initialValues: Partial<VirtualTableParamValues>;
  onSave: (values: VirtualTableParamValues) => void;
  onCancel: () => void;
  onEditCondition: () => void;
}

const PERIODICITY_PRESETS = [
  '',
  'АВТО',
  'РЕГИСТРАЦИЯ',
  'Запись',
  'СЕКУНДА',
  'МИНУТА',
  'ЧАС',
  'ДЕНЬ',
  'НЕДЕЛЯ',
  'МЕСЯЦ',
  'КВАРТАЛ',
  'ГОД',
];

const PERIOD_DECOMPOSITION_PRESETS = [
  '',
  'День',
  'Неделя',
  'Месяц',
  'Квартал',
  'Год',
];

export const VirtualTableParamsModal: React.FC<VirtualTableParamsModalProps> = ({
  isOpen,
  family,
  kind,
  initialValues,
  onSave,
  onCancel,
  onEditCondition,
}) => {
  const defs = useMemo(() => getVirtualTableParams(family, kind), [family, kind]);

  const [values, setValues] = useState<VirtualTableParamValues>({
    НачалоПериода: '',
    КонецПериода: '',
    Период: '',
    Периодичность: '',
    Условие: '',
    Счет: '',
    СчетДт: '',
    СчетКт: '',
    СписокВидовСубконто: '',
    СписокВидовСубконтоДт: '',
    СписокВидовСубконтоКт: '',
    Разрезы: '',
    ДопПараметр1: '',
    ДопПараметр2: '',
    СостояниеПериода: '',
    ПериодДействияНачало: '',
    ПериодДействияКонец: '',
    ТолькоДействующие: '',
    СпособРазложения: '',
    ВидДвижения: '',
    СпособЗаполнения: '',
    Отбор: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setValues((prev) => ({
      ...prev,
      ...initialValues,
    }));
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  return (
    <div className="vt-modal__overlay" onClick={onCancel}>
      <div className="vt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vt-modal__header">
          <div className="vt-modal__title">Параметры виртуальной таблицы</div>
          <button className="vt-modal__close" type="button" onClick={onCancel} title="Закрыть">✕</button>
        </div>

        <div className="vt-modal__body">
          {defs.map((d) => (
            <div key={d.id} className="vt-modal__row">
              {d.kind !== 'boolean' && <div className="vt-modal__label">{d.label}</div>}
              <div className="vt-modal__field" style={d.kind === 'boolean' ? { gridColumn: '1 / -1' } : undefined}>
                {d.kind === 'periodicity' ? (
                  <select
                    className="vt-modal__input"
                    value={values[d.id]}
                    onChange={(e) => setValues((p) => ({ ...p, [d.id]: e.target.value }))}
                  >
                    {PERIODICITY_PRESETS.map((p) => (
                      <option key={p || '__empty__'} value={p}>
                        {p || '—'}
                      </option>
                    ))}
                  </select>
                ) : d.kind === 'periodDecomposition' ? (
                  <select
                    className="vt-modal__input"
                    value={values[d.id]}
                    onChange={(e) => setValues((p) => ({ ...p, [d.id]: e.target.value }))}
                  >
                    {PERIOD_DECOMPOSITION_PRESETS.map((p) => (
                      <option key={p || '__empty__'} value={p}>
                        {p || '—'}
                      </option>
                    ))}
                  </select>
                ) : d.kind === 'boolean' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={values[d.id] === 'Истина' || values[d.id] === 'true'}
                      onChange={(e) => setValues((p) => ({ ...p, [d.id]: e.target.checked ? 'Истина' : 'Ложь' }))}
                    />
                    <span>{d.label}</span>
                  </label>
                ) : d.kind === 'condition' ? (
                  <div className="vt-modal__condition">
                    <input
                      className="vt-modal__input"
                      value={values[d.id]}
                      onChange={(e) => setValues((p) => ({ ...p, [d.id]: e.target.value }))}
                      placeholder="Произвольное условие…"
                    />
                    <button type="button" className="vt-modal__btn vt-modal__btn--ellipsis" onClick={onEditCondition} title="Редактировать условие">
                      …
                    </button>
                  </div>
                ) : (
                  <input
                    className="vt-modal__input"
                    value={values[d.id]}
                    onChange={(e) => setValues((p) => ({ ...p, [d.id]: e.target.value }))}
                    placeholder=""
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="vt-modal__footer">
          <button type="button" className="vt-modal__btn" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="vt-modal__btn vt-modal__btn--primary" onClick={() => onSave(values)}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

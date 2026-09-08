"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualTableParamsModal = exports.getVirtualTableParams = void 0;
const react_1 = __importStar(require("react"));
require("./VirtualTableParamsModal.css");
function getVirtualTableParams(family, kind) {
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
exports.getVirtualTableParams = getVirtualTableParams;
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
const VirtualTableParamsModal = ({ isOpen, family, kind, initialValues, onSave, onCancel, onEditCondition, }) => {
    const defs = (0, react_1.useMemo)(() => getVirtualTableParams(family, kind), [family, kind]);
    const [values, setValues] = (0, react_1.useState)({
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
    (0, react_1.useEffect)(() => {
        if (!isOpen)
            return;
        setValues((prev) => ({
            ...prev,
            ...initialValues,
        }));
    }, [isOpen, initialValues]);
    if (!isOpen)
        return null;
    return (react_1.default.createElement("div", { className: "vt-modal__overlay", onClick: onCancel },
        react_1.default.createElement("div", { className: "vt-modal", onClick: (e) => e.stopPropagation() },
            react_1.default.createElement("div", { className: "vt-modal__header" },
                react_1.default.createElement("div", { className: "vt-modal__title" }, "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0439 \u0442\u0430\u0431\u043B\u0438\u0446\u044B"),
                react_1.default.createElement("button", { className: "vt-modal__close", type: "button", onClick: onCancel, title: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }, "\u2715")),
            react_1.default.createElement("div", { className: "vt-modal__body" }, defs.map((d) => (react_1.default.createElement("div", { key: d.id, className: "vt-modal__row" },
                d.kind !== 'boolean' && react_1.default.createElement("div", { className: "vt-modal__label" }, d.label),
                react_1.default.createElement("div", { className: "vt-modal__field", style: d.kind === 'boolean' ? { gridColumn: '1 / -1' } : undefined }, d.kind === 'periodicity' ? (react_1.default.createElement("select", { className: "vt-modal__input", value: values[d.id], onChange: (e) => setValues((p) => ({ ...p, [d.id]: e.target.value })) }, PERIODICITY_PRESETS.map((p) => (react_1.default.createElement("option", { key: p || '__empty__', value: p }, p || '—'))))) : d.kind === 'periodDecomposition' ? (react_1.default.createElement("select", { className: "vt-modal__input", value: values[d.id], onChange: (e) => setValues((p) => ({ ...p, [d.id]: e.target.value })) }, PERIOD_DECOMPOSITION_PRESETS.map((p) => (react_1.default.createElement("option", { key: p || '__empty__', value: p }, p || '—'))))) : d.kind === 'boolean' ? (react_1.default.createElement("label", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                    react_1.default.createElement("input", { type: "checkbox", checked: values[d.id] === 'Истина' || values[d.id] === 'true', onChange: (e) => setValues((p) => ({ ...p, [d.id]: e.target.checked ? 'Истина' : 'Ложь' })) }),
                    react_1.default.createElement("span", null, d.label))) : d.kind === 'condition' ? (react_1.default.createElement("div", { className: "vt-modal__condition" },
                    react_1.default.createElement("input", { className: "vt-modal__input", value: values[d.id], onChange: (e) => setValues((p) => ({ ...p, [d.id]: e.target.value })), placeholder: "\u041F\u0440\u043E\u0438\u0437\u0432\u043E\u043B\u044C\u043D\u043E\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u0435\u2026" }),
                    react_1.default.createElement("button", { type: "button", className: "vt-modal__btn vt-modal__btn--ellipsis", onClick: onEditCondition, title: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0443\u0441\u043B\u043E\u0432\u0438\u0435" }, "\u2026"))) : (react_1.default.createElement("input", { className: "vt-modal__input", value: values[d.id], onChange: (e) => setValues((p) => ({ ...p, [d.id]: e.target.value })), placeholder: "" }))))))),
            react_1.default.createElement("div", { className: "vt-modal__footer" },
                react_1.default.createElement("button", { type: "button", className: "vt-modal__btn", onClick: onCancel }, "\u041E\u0442\u043C\u0435\u043D\u0430"),
                react_1.default.createElement("button", { type: "button", className: "vt-modal__btn vt-modal__btn--primary", onClick: () => onSave(values) }, "OK")))));
};
exports.VirtualTableParamsModal = VirtualTableParamsModal;
//# sourceMappingURL=VirtualTableParamsModal.js.map
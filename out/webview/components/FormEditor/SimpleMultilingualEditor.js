"use strict";
/**
 * Простой редактор многоязычных полей
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleMultilingualEditor = exports.commentText = void 0;
const react_1 = __importDefault(require("react"));
/** Comment в метаданных — строка, не многоязычный синоним. */
function commentText(value) {
    if (value == null)
        return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    const item = value['v8:item'] ?? value.item;
    const list = Array.isArray(item) ? item : item ? [item] : [];
    const ru = list.find((entry) => String(entry?.['v8:lang'] ?? entry?.lang ?? '').toLowerCase() === 'ru') || list[0];
    if (ru && typeof ru === 'object')
        return String(ru['v8:content'] ?? ru.content ?? '');
    return '';
}
exports.commentText = commentText;
const SimpleMultilingualEditor = ({ value, onChange }) => {
    const normalizeValue = (val) => {
        if (!val)
            return [{ lang: 'ru', content: '' }];
        if (typeof val === 'string')
            return [{ lang: 'ru', content: val }];
        if (val['v8:item']) {
            const items = Array.isArray(val['v8:item']) ? val['v8:item'] : [val['v8:item']];
            return items.map((item) => ({
                lang: item['v8:lang'] || 'ru',
                content: item['v8:content'] || ''
            }));
        }
        return [{ lang: 'ru', content: '' }];
    };
    const [items, setItems] = react_1.default.useState(normalizeValue(value));
    react_1.default.useEffect(() => {
        setItems(normalizeValue(value));
    }, [value]);
    const handleItemChange = (index, field, newValue) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: newValue };
        setItems(newItems);
        const v8Item = newItems.map(item => ({
            'v8:lang': item.lang,
            'v8:content': item.content
        }));
        onChange({
            'v8:item': v8Item.length === 1 ? v8Item[0] : v8Item
        });
    };
    return (react_1.default.createElement("div", { className: "multilingual-widget" }, items.map((item, index) => (react_1.default.createElement("div", { key: index, className: "multilingual-item" },
        react_1.default.createElement("select", { value: item.lang, onChange: (e) => handleItemChange(index, 'lang', e.target.value), className: "multilingual-lang" },
            react_1.default.createElement("option", { value: "ru" }, "\u0420\u0443\u0441\u0441\u043A\u0438\u0439"),
            react_1.default.createElement("option", { value: "en" }, "English"),
            react_1.default.createElement("option", { value: "uk" }, "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430"),
            react_1.default.createElement("option", { value: "kz" }, "\u049A\u0430\u0437\u0430\u049B")),
        react_1.default.createElement("input", { type: "text", value: item.content, onChange: (e) => handleItemChange(index, 'content', e.target.value), className: "multilingual-content", placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435..." }))))));
};
exports.SimpleMultilingualEditor = SimpleMultilingualEditor;
//# sourceMappingURL=SimpleMultilingualEditor.js.map
/**
 * Простой редактор многоязычных полей
 */

import React from 'react';

interface SimpleMultilingualEditorProps {
  value: any;
  onChange: (value: any) => void;
}

/** Comment в метаданных — строка, не многоязычный синоним. */
export function commentText(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  const item = value['v8:item'] ?? value.item;
  const list = Array.isArray(item) ? item : item ? [item] : [];
  const ru = list.find((entry: any) => String(entry?.['v8:lang'] ?? entry?.lang ?? '').toLowerCase() === 'ru') || list[0];
  if (ru && typeof ru === 'object') return String(ru['v8:content'] ?? ru.content ?? '');
  return '';
}

export const SimpleMultilingualEditor: React.FC<SimpleMultilingualEditorProps> = ({ value, onChange }) => {
  const normalizeValue = (val: any): Array<{ lang: string; content: string }> => {
    if (!val) return [{ lang: 'ru', content: '' }];
    if (typeof val === 'string') return [{ lang: 'ru', content: val }];
    if (val['v8:item']) {
      const items = Array.isArray(val['v8:item']) ? val['v8:item'] : [val['v8:item']];
      return items.map((item: any) => ({
        lang: item['v8:lang'] || 'ru',
        content: item['v8:content'] || ''
      }));
    }
    return [{ lang: 'ru', content: '' }];
  };

  const [items, setItems] = React.useState(normalizeValue(value));

  React.useEffect(() => {
    setItems(normalizeValue(value));
  }, [value]);

  const handleItemChange = (index: number, field: 'lang' | 'content', newValue: string) => {
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

  return (
    <div className="multilingual-widget">
      {items.map((item, index) => (
        <div key={index} className="multilingual-item">
          <select
            value={item.lang}
            onChange={(e) => handleItemChange(index, 'lang', e.target.value)}
            className="multilingual-lang"
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="uk">Українська</option>
            <option value="kz">Қазақ</option>
          </select>
          <input
            type="text"
            value={item.content}
            onChange={(e) => handleItemChange(index, 'content', e.target.value)}
            className="multilingual-content"
            placeholder="Введите значение..."
          />
        </div>
      ))}
    </div>
  );
};


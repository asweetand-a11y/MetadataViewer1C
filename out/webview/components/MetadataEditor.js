"use strict";
/**
 * Основной компонент редактора метаданных
 * Управляет состоянием и синхронизацией между формой и XML редактором
 */
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
exports.MetadataEditor = void 0;
const react_1 = __importStar(require("react"));
const FormEditor_1 = require("./FormEditor");
const XmlEditor_1 = require("./XmlEditor");
const xmlUtils_1 = require("../../utils/xmlUtils");
const MetadataEditor = ({ vscode }) => {
    const [objects, setObjects] = (0, react_1.useState)([]);
    const [selectedObject, setSelectedObject] = (0, react_1.useState)(null);
    const [formData, setFormData] = (0, react_1.useState)(null);
    const [xmlContent, setXmlContent] = (0, react_1.useState)('');
    const [metadata, setMetadata] = (0, react_1.useState)({
        registers: [],
        referenceTypes: [],
        informationRegistersSchedule: []
    });
    const [isDirty, setIsDirty] = (0, react_1.useState)(false);
    const [activeTab, setActiveTab] = (0, react_1.useState)('properties');
    const [showSplitView, setShowSplitView] = (0, react_1.useState)(false);
    // Обработка сообщений от extension
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (message.type === 'init') {
                const initMsg = message;
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
                    // КРИТИЧНО: Используем исходный XML для отображения, чтобы сохранить структуру элементов/атрибутов
                    // Если исходный XML есть, используем его, иначе генерируем заново (fallback)
                    if (firstObj._originalXml) {
                        setXmlContent(firstObj._originalXml);
                    }
                    else {
                        // Fallback: генерируем XML заново (структура может быть изменена)
                        try {
                            const builder = (0, xmlUtils_1.createXMLBuilder)();
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
                        }
                        catch (e) {
                            console.error('Error generating XML:', e);
                            setXmlContent('<?xml version="1.0" encoding="UTF-8"?>\n<!-- Error generating XML -->');
                        }
                    }
                }
            }
            else if (message.type === 'objectUpdated') {
                // Обновляем объект после сохранения
                const updatedObj = message.payload;
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
    const handleFormChange = (0, react_1.useCallback)((data) => {
        setFormData(data);
        setIsDirty(true);
        // Обновляем selectedObject с новыми properties
        setSelectedObject(prev => {
            if (!prev)
                return prev;
            return {
                ...prev,
                properties: data
            };
        });
        // TODO: Синхронизировать с XML редактором
    }, []);
    // Обработка изменений selectedObject из FormEditor
    const handleSelectedObjectChange = (0, react_1.useCallback)((updatedObject) => {
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
    (0, react_1.useEffect)(() => {
        if (selectedObject?._originalXml) {
            setXmlContent(selectedObject._originalXml);
        }
    }, [selectedObject]);
    // Обработка изменений в XML редакторе
    const handleXmlChange = (0, react_1.useCallback)((xml) => {
        setXmlContent(xml);
        setIsDirty(true);
        // TODO: Парсить XML и обновить форму
    }, []);
    const handleSubsystemToggle = (0, react_1.useCallback)((relPath) => {
        setSelectedObject(prev => {
            if (!prev?.subsystems?.length) {
                return prev;
            }
            return {
                ...prev,
                subsystems: prev.subsystems.map(row => row.relPath === relPath ? { ...row, included: !row.included } : row),
            };
        });
        setIsDirty(true);
    }, []);
    // Сохранение изменений
    const handleSave = (0, react_1.useCallback)(() => {
        if (!selectedObject)
            return;
        // Объединяем все изменения: используем актуальный selectedObject и обновляем properties из formData
        const updatedObject = {
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
    const tabs = (0, react_1.useMemo)(() => {
        if (!selectedObject) {
            return [{ id: 'properties', label: 'Свойства' }];
        }
        // Проверяем, является ли объект планом видов характеристик
        const isChartOfCharacteristicTypes = selectedObject.objectType === 'ChartOfCharacteristicTypes' ||
            selectedObject.objectType === 'План видов характеристик' ||
            (selectedObject.sourcePath && selectedObject.sourcePath.includes('ChartsOfCharacteristicTypes'));
        // Проверяем, является ли объект планом счетов
        const isChartOfAccounts = selectedObject.objectType === 'ChartOfAccounts' ||
            (selectedObject.sourcePath && selectedObject.sourcePath.includes('ChartsOfAccounts'));
        // Получаем количество типов значения характеристик
        const characteristicTypesCount = (() => {
            if (!isChartOfCharacteristicTypes)
                return undefined;
            const typeProp = selectedObject.properties?.Type;
            if (!typeProp)
                return 0;
            const typesArray = typeProp['v8:Type'] || typeProp.Type;
            if (Array.isArray(typesArray))
                return typesArray.length;
            if (typesArray)
                return 1;
            return 0;
        })();
        // Получаем количество признаков учета
        const accountingFlagsCount = (() => {
            if (!isChartOfAccounts)
                return undefined;
            const accountingFlags = selectedObject.accountingFlags || [];
            const extDimensionAccountingFlags = selectedObject.extDimensionAccountingFlags || [];
            return accountingFlags.length + extDimensionAccountingFlags.length;
        })();
        const isEnum = selectedObject.objectType === 'Enum' ||
            selectedObject.objectType === 'Перечисление' ||
            (selectedObject.sourcePath && selectedObject.sourcePath.includes('/Enums/'));
        const result = [
            { id: 'properties', label: 'Свойства' },
            { id: 'attributes', label: 'Реквизиты', count: selectedObject.attributes?.length },
            { id: 'tabular', label: 'Табличные части', count: selectedObject.tabularSections?.length },
            ...(isEnum ? [{ id: 'enumValues', label: 'Значения перечисления', count: selectedObject.enumValues?.length }] : []),
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
        result.push({ id: 'xml', label: 'XML' });
        return result;
    }, [selectedObject]);
    // Условный возврат должен быть ПОСЛЕ всех хуков
    if (!selectedObject) {
        return (react_1.default.createElement("div", { className: "metadata-editor" },
            react_1.default.createElement("div", { className: "editor-empty" },
                react_1.default.createElement("p", null, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u044A\u0435\u043A\u0442 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F"))));
    }
    return (react_1.default.createElement("div", { className: "metadata-editor" },
        react_1.default.createElement("div", { className: "editor-header" },
            react_1.default.createElement("div", { className: "object-title" },
                react_1.default.createElement("h2", null, selectedObject.name),
                react_1.default.createElement("span", { className: "object-type" }, selectedObject.objectType)),
            react_1.default.createElement("div", { className: "header-actions" },
                react_1.default.createElement("button", { className: "btn-toggle-view", onClick: () => setShowSplitView(!showSplitView), title: showSplitView ? "Показать только форму" : "Показать форму и XML" }, showSplitView ? '📋' : '🔀'),
                react_1.default.createElement("button", { className: "btn-save", onClick: handleSave, disabled: !isDirty }, "\uD83D\uDCBE \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"))),
        react_1.default.createElement("div", { className: "editor-tabs" }, tabs.map(tab => (react_1.default.createElement("button", { key: tab.id, className: `editor-tab ${activeTab === tab.id ? 'active' : ''}`, onClick: () => setActiveTab(tab.id) },
            tab.label,
            tab.count !== undefined && tab.count > 0 && (react_1.default.createElement("span", { className: "tab-count" },
                "(",
                tab.count,
                ")")))))),
        react_1.default.createElement("div", { className: `editor-content ${showSplitView && activeTab !== 'xml' ? 'split-view' : ''}` }, activeTab === 'xml' ? (react_1.default.createElement("div", { className: "editor-pane editor-xml-full" },
            react_1.default.createElement(XmlEditor_1.XmlEditor, { value: xmlContent, onChange: handleXmlChange, language: "xml" }))) : activeTab === 'subsystems' && selectedObject.subsystems !== undefined ? (react_1.default.createElement("div", { className: "editor-pane editor-form subsystem-membership-pane" },
            react_1.default.createElement("div", { className: "section-header" },
                react_1.default.createElement("h3", null, "\u041F\u043E\u0434\u0441\u0438\u0441\u0442\u0435\u043C\u044B, \u0432 \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u0443\u0447\u0430\u0441\u0442\u0432\u0443\u0435\u0442 \u043E\u0431\u044A\u0435\u043A\u0442")),
            selectedObject.subsystems.length === 0 ? (react_1.default.createElement("p", { className: "subsystem-membership-empty" }, "\u0412 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 Subsystems \u043D\u0435\u0442 XML-\u0444\u0430\u0439\u043B\u043E\u0432 \u043F\u043E\u0434\u0441\u0438\u0441\u0442\u0435\u043C.")) : (react_1.default.createElement("ul", { className: "subsystem-membership-list" }, selectedObject.subsystems.map(row => (react_1.default.createElement("li", { key: row.relPath, className: "subsystem-membership-item" },
                react_1.default.createElement("label", { className: "subsystem-membership-label" },
                    react_1.default.createElement("input", { type: "checkbox", checked: row.included, onChange: () => handleSubsystemToggle(row.relPath) }),
                    react_1.default.createElement("span", { className: "subsystem-membership-title" }, row.label),
                    react_1.default.createElement("span", { className: "subsystem-membership-path" }, row.relPath.replace(/^Subsystems\//, '')))))))))) : (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement("div", { className: "editor-pane editor-form" },
                react_1.default.createElement(FormEditor_1.FormEditor, { objectType: selectedObject.objectType, formData: formData, onChange: handleFormChange, metadata: metadata, activeTab: activeTab, selectedObject: selectedObject, onSelectedObjectChange: handleSelectedObjectChange })),
            showSplitView && (react_1.default.createElement("div", { className: "editor-pane editor-xml" },
                react_1.default.createElement(XmlEditor_1.XmlEditor, { value: xmlContent, onChange: handleXmlChange, language: "xml" }))))))));
};
exports.MetadataEditor = MetadataEditor;
//# sourceMappingURL=MetadataEditor.js.map
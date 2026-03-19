"use strict";
/**
 * Редактор запросов из BSL-строк
 * Открывает полноценный редактор запроса с деревом метаданных
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
exports.QueryStringEditor = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const MetadataScanner_1 = require("./metadata_utils/MetadataScanner");
const MetadataRepository_1 = require("./metadata_utils/MetadataRepository");
class QueryStringEditor {
    constructor() {
        /** TTL 5 минут — дерево метаданных редко меняется при редактировании запросов */
        this.metadataRepository = new MetadataRepository_1.MetadataRepository(300000);
        this.metadataTreeCacheByRoot = new Map();
        this.metadataCacheByRoot = new Map();
        this.lastConfigRoot = null;
        this.webviewReady = false;
        this.pendingInitMessage = null;
        this.pendingMetadataTree = null;
        this.fallbackTimeout = null;
    }
    /**
     * Форматировать запрос для BSL: добавляем | в начале каждой строки (кроме первой)
     * Если символ | уже есть в начале строки (возможно с пробелами перед ним), не добавляем его снова
     */
    formatQueryForBsl(queryText) {
        if (!queryText)
            return queryText;
        const lines = queryText.split(/\r?\n/);
        if (lines.length <= 1)
            return queryText;
        // Первая строка без изменений, остальные - с | в начале (если его еще нет)
        const formattedLines = [
            lines[0],
            ...lines.slice(1).map(line => {
                // Проверяем, есть ли уже символ | в строке (может быть с пробелами перед ним)
                // Ищем первый не-пробельный символ - если это |, значит он уже есть
                const trimmed = line.trimStart();
                if (trimmed.startsWith('|')) {
                    return line; // Уже есть |, не добавляем
                }
                return `|${line}`;
            })
        ];
        return formattedLines.join('\n');
    }
    /**
     * Определить корень конфигурации из пути к BSL файлу
     */
    getConfigRoot(documentPath) {
        // Пытаемся определить корень конфигурации
        // Обычно структура: <root>/[Catalogs|Documents|etc]/ObjectName/Ext/Module.bsl
        const parts = documentPath.split(/[/\\]/);
        // Ищем типичные директории конфигурации
        const knownTypeDirs = [
            'Catalogs', 'Documents', 'DocumentJournals', 'CommonModules', 'InformationRegisters',
            'AccumulationRegisters', 'Reports', 'DataProcessors', 'Enums', 'Constants',
            'ChartsOfCharacteristicTypes', 'ChartsOfAccounts', 'ChartsOfCalculationTypes',
            'BusinessProcesses', 'Tasks', 'ExchangePlans', 'DefinedTypes', 'FilterCriteria'
        ];
        for (let i = parts.length - 1; i >= 0; i--) {
            if (knownTypeDirs.includes(parts[i])) {
                // Корень конфигурации - на один уровень выше директории типа
                return parts.slice(0, i).join(path.sep);
            }
        }
        // Если не нашли - берем workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        return workspaceFolder?.uri.fsPath || path.dirname(documentPath);
    }
    /**
     * Сканирование метаданных для автодополнения
     */
    async scanMetadataForWebview(configRoot) {
        const cached = this.metadataCacheByRoot.get(configRoot);
        if (cached)
            return cached;
        const registers = [];
        const referenceTypes = [];
        try {
            const scanResult = await (0, MetadataScanner_1.scanMetadataRoot)(configRoot);
            const typeDirToMetadataType = {
                InformationRegisters: 'InformationRegister',
                AccumulationRegisters: 'AccumulationRegister',
                AccountingRegisters: 'AccountingRegister',
                CalculationRegisters: 'CalculationRegister',
                Catalogs: 'Catalog',
                Documents: 'Document',
                Enums: 'Enum',
                Reports: 'Report',
                DataProcessors: 'DataProcessor',
                ChartsOfCharacteristicTypes: 'ChartOfCharacteristicTypes',
                ChartsOfAccounts: 'ChartOfAccounts',
                ChartsOfCalculationTypes: 'ChartOfCalculationTypes',
                BusinessProcesses: 'BusinessProcess',
                Tasks: 'Task',
                DefinedTypes: 'DefinedType',
                ExchangePlans: 'ExchangePlan',
            };
            const metadataTypeToTypePrefixes = {
                Catalog: ['CatalogRef', 'CatalogObject', 'CatalogManager', 'CatalogSelection', 'CatalogList'],
                Document: ['DocumentRef', 'DocumentObject', 'DocumentManager', 'DocumentSelection', 'DocumentList'],
                Enum: ['EnumRef'],
                Report: ['ReportRef'],
                DataProcessor: ['DataProcessorRef'],
                ChartOfCharacteristicTypes: ['ChartOfCharacteristicTypesRef'],
                ChartOfAccounts: ['ChartOfAccountsRef'],
                ChartOfCalculationTypes: ['ChartOfCalculationTypesRef'],
                InformationRegister: ['InformationRegisterRef', 'InformationRegisterRecordSet', 'InformationRegisterManager', 'InformationRegisterSelection'],
                AccumulationRegister: ['AccumulationRegisterRef', 'AccumulationRegisterRecordSet', 'AccumulationRegisterManager', 'AccumulationRegisterSelection'],
                AccountingRegister: ['AccountingRegisterRef', 'AccountingRegisterRecordSet', 'AccountingRegisterManager', 'AccountingRegisterSelection'],
                CalculationRegister: ['CalculationRegisterRef', 'CalculationRegisterRecordSet', 'CalculationRegisterManager', 'CalculationRegisterSelection'],
                BusinessProcess: ['BusinessProcessRef', 'BusinessProcessObject', 'BusinessProcessManager', 'BusinessProcessSelection', 'BusinessProcessList'],
                Task: ['TaskRef', 'TaskObject', 'TaskManager', 'TaskSelection', 'TaskList'],
                DefinedType: ['DefinedTypeRef'],
                ExchangePlan: ['ExchangePlanRef', 'ExchangePlanObject', 'ExchangePlanManager', 'ExchangePlanSelection', 'ExchangePlanList'],
            };
            for (const obj of scanResult.objects) {
                const metadataType = typeDirToMetadataType[obj.objectTypeDir];
                if (!metadataType)
                    continue;
                const fullName = `${metadataType}.${obj.displayName}`;
                if (metadataType === 'InformationRegister' ||
                    metadataType === 'AccumulationRegister' ||
                    metadataType === 'AccountingRegister' ||
                    metadataType === 'CalculationRegister') {
                    registers.push(fullName);
                }
                const prefixes = metadataTypeToTypePrefixes[metadataType];
                if (prefixes && prefixes.length) {
                    for (const pfx of prefixes) {
                        referenceTypes.push(`${pfx}.${obj.displayName}`);
                    }
                }
            }
            registers.sort();
            referenceTypes.sort();
        }
        catch {
            // ignore
        }
        const result = { registers, referenceTypes };
        this.metadataCacheByRoot.set(configRoot, result);
        return result;
    }
    /**
     * Загрузка дерева метаданных для редактора.
     * @param onProgress — при указании используется прогрессивная загрузка: колбэк вызывается после каждого типа.
     */
    async loadMetadataTreeForWebview(configRoot, onProgress) {
        const cached = this.metadataTreeCacheByRoot.get(configRoot);
        if (cached !== undefined) {
            if (onProgress && cached)
                onProgress(cached);
            return cached;
        }
        // Только типы, используемые в запросах 1С
        const typeDirToQuery = {
            FilterCriteria: { typeLabel: 'КритерииОтбора', prefix: 'КритерийОтбора' },
            ExchangePlans: { typeLabel: 'ПланыОбмена', prefix: 'ПланОбмена' },
            Constants: { typeLabel: 'Константы', prefix: 'Константа' },
            Catalogs: { typeLabel: 'Справочники', prefix: 'Справочник' },
            Documents: { typeLabel: 'Документы', prefix: 'Документ' },
            DocumentJournals: { typeLabel: 'ЖурналыДокументов', prefix: 'ЖурналДокументов' },
            Enums: { typeLabel: 'Перечисления', prefix: 'Перечисление' },
            ChartsOfCharacteristicTypes: { typeLabel: 'ПланыВидовХарактеристик', prefix: 'ПланВидовХарактеристик' },
            ChartsOfCalculationTypes: { typeLabel: 'ПланыВидовРасчета', prefix: 'ПланВидовРасчета' },
            InformationRegisters: { typeLabel: 'РегистрыСведений', prefix: 'РегистрСведений' },
            AccumulationRegisters: { typeLabel: 'РегистрыНакопления', prefix: 'РегистрНакопления' },
            CalculationRegisters: { typeLabel: 'РегистрыРасчета', prefix: 'РегистрРасчета' },
            BusinessProcesses: { typeLabel: 'БизнесПроцессы', prefix: 'БизнесПроцесс' },
            Tasks: { typeLabel: 'Задачи', prefix: 'Задача' },
            ChartsOfAccounts: { typeLabel: 'ПланыСчетов', prefix: 'ПланСчетов' },
            AccountingRegisters: { typeLabel: 'РегистрыБухгалтерии', prefix: 'РегистрБухгалтерии' },
        };
        // Разрешенные типы метаданных для навигатора
        const allowedTypes = new Set([
            'FilterCriteria',
            'ExchangePlans',
            'Constants',
            'Catalogs',
            'Documents',
            'DocumentJournals',
            'Enums',
            'ChartsOfCharacteristicTypes',
            'ChartsOfCalculationTypes',
            'InformationRegisters',
            'AccumulationRegisters',
            'CalculationRegisters',
            'BusinessProcesses',
            'Tasks',
            'ChartsOfAccounts',
            'AccountingRegisters',
        ]);
        const groupLabelMap = {
            Attributes: 'Реквизиты',
            TabularSections: 'Табличные части',
            Forms: 'Формы',
            Commands: 'Команды',
            Templates: 'Макеты',
            Predefined: 'Предопределенные',
            Members: 'Состав',
        };
        const config = vscode.workspace.getConfiguration();
        const debugMode = config.get('metadataViewer.debugMode', false);
        const toWeb = (n, ctx = {}) => {
            if (n.kind === 'type') {
                // Фильтруем только разрешенные типы метаданных
                if (!allowedTypes.has(n.label)) {
                    return null; // Пропускаем этот тип
                }
                const m = typeDirToQuery[n.label];
                const typeLabel = m?.typeLabel || n.label;
                const prefix = m?.prefix;
                const children = (n.children || [])
                    .map((c) => toWeb(c, { ...ctx, prefix: prefix || ctx.prefix }))
                    .filter((c) => c !== null);
                // Если после фильтрации не осталось детей, пропускаем тип
                if (children.length === 0) {
                    return null;
                }
                return {
                    id: n.id,
                    label: typeLabel,
                    kind: 'type',
                    children,
                };
            }
            if (n.kind === 'object') {
                const obj = n.object;
                const typeDir = obj?.objectTypeDir;
                const m = (typeDir && typeDirToQuery[typeDir]) || undefined;
                const prefix = m?.prefix || ctx.prefix || obj?.objectType || '';
                const objectName = obj?.name || '';
                const label = obj?.displayName || obj?.name || n.label;
                const baseChildren = (n.children || [])
                    .map((c) => toWeb(c, { prefix, objectName }))
                    .filter((c) => c !== null);
                const virtualGroup = (() => {
                    if (!prefix || !objectName)
                        return null;
                    const tableKey = `${prefix}.${objectName}`;
                    const makeVirtual = (idSuffix, label, insertText) => ({
                        id: `${n.id}/virtual/${idSuffix}`,
                        label,
                        kind: 'member',
                        insertText,
                    });
                    let members = [];
                    if (prefix === 'РегистрНакопления') {
                        members = [
                            makeVirtual('ostatki', 'Остатки(...)', `${tableKey}.Остатки(`),
                            makeVirtual('oboroty', 'Обороты(...)', `${tableKey}.Обороты(`),
                            makeVirtual('ostatki_i_oboroty', 'ОстаткиИОбороты(...)', `${tableKey}.ОстаткиИОбороты(`),
                        ];
                    }
                    if (prefix === 'РегистрБухгалтерии') {
                        members = [
                            makeVirtual('ostatki', 'Остатки(...)', `${tableKey}.Остатки(`),
                            makeVirtual('oboroty', 'Обороты(...)', `${tableKey}.Обороты(`),
                            makeVirtual('ostatki_i_oboroty', 'ОстаткиИОбороты(...)', `${tableKey}.ОстаткиИОбороты(`),
                            makeVirtual('oboroty_dtkt', 'ОборотыДтКт(...)', `${tableKey}.ОборотыДтКт(`),
                            makeVirtual('movements_subkonto', 'ДвиженияССубконто(...)', `${tableKey}.ДвиженияССубконто(`),
                        ];
                    }
                    if (prefix === 'РегистрСведений') {
                        members = [
                            makeVirtual('srez_poslednih', 'СрезПоследних(...)', `${tableKey}.СрезПоследних(`),
                            makeVirtual('srez_pervyh', 'СрезПервых(...)', `${tableKey}.СрезПервых(`),
                        ];
                    }
                    if (prefix === 'РегистрРасчета') {
                        members = [
                            makeVirtual('dviheniya', 'Движения(...)', `${tableKey}.Движения(`),
                            makeVirtual('period_deystviya', 'ПериодДействия(...)', `${tableKey}.ПериодДействия(`),
                            makeVirtual('dannye_grafika', 'ДанныеГрафика(...)', `${tableKey}.ДанныеГрафика(`),
                        ];
                    }
                    if (members.length === 0)
                        return null;
                    return {
                        id: `${n.id}/virtual`,
                        label: 'Виртуальные таблицы',
                        kind: 'group',
                        children: members,
                    };
                })();
                const children = virtualGroup ? [...baseChildren, virtualGroup] : baseChildren;
                return {
                    id: n.id,
                    label,
                    kind: 'object',
                    insertText: prefix && objectName ? `${prefix}.${objectName}` : undefined,
                    children,
                };
            }
            if (n.kind === 'group') {
                const label = groupLabelMap[n.label] || n.label;
                const isTabularSectionsGroup = label === 'Табличные части' || n.label === 'TabularSections';
                // Передаем флаг в контекст для детей группы "Табличные части"
                const childCtx = isTabularSectionsGroup
                    ? { ...ctx, inTabularSectionsGroup: true }
                    : { ...ctx, inTabularSectionsGroup: false };
                const children = (n.children || [])
                    .map((c) => toWeb(c, childCtx))
                    .filter((c) => c !== null);
                return {
                    id: n.id,
                    label,
                    kind: 'group',
                    children,
                };
            }
            if (n.kind === 'member') {
                const memberName = String(n.member?.name || n.label || '').trim();
                // Если мы в группе "Табличные части" и у этого member есть дети (реквизиты),
                // то это табличная часть
                const isTabularSection = ctx.inTabularSectionsGroup &&
                    ctx.prefix && ctx.objectName && !ctx.tabularSectionName &&
                    (n.children || []).length > 0;
                // Отладка: логируем табличные части только если включен debugMode
                if (debugMode && isTabularSection) {
                    console.log('[queryStringEditor.toWeb] Found tabular section:', {
                        memberName,
                        insertText: ctx.prefix && ctx.objectName ? `${ctx.prefix}.${ctx.objectName}.${memberName}` : undefined,
                        childrenCount: (n.children || []).length,
                        children: (n.children || []).map(ch => ({
                            kind: ch.kind,
                            label: ch.label,
                            id: ch.id,
                            childrenCount: (ch.children || []).length
                        })),
                        fullNode: n
                    });
                }
                let insertText;
                if (ctx.prefix && ctx.objectName && memberName) {
                    if (ctx.tabularSectionName) {
                        // Это реквизит табличной части: Prefix.Object.TabularSection.Field
                        insertText = `${ctx.prefix}.${ctx.objectName}.${ctx.tabularSectionName}.${memberName}`;
                    }
                    else {
                        // Это либо реквизит объекта, либо табличная часть: Prefix.Object.Member
                        insertText = `${ctx.prefix}.${ctx.objectName}.${memberName}`;
                    }
                }
                // Если это табличная часть, обновляем контекст для детей (реквизитов табличной части)
                const childCtx = isTabularSection
                    ? { ...ctx, tabularSectionName: memberName, inTabularSectionsGroup: false }
                    : ctx;
                // Для табличной части нужно обработать детей, включая группы (например, "Реквизиты")
                // Если дети - это группы, нужно обработать их детей тоже
                const processChildren = (children, context) => {
                    return children
                        .map((c) => {
                        // Если это группа внутри табличной части (например, "Реквизиты"),
                        // обрабатываем её детей с правильным контекстом
                        if (c.kind === 'group' && isTabularSection) {
                            const groupChildren = (c.children || [])
                                .map((gc) => toWeb(gc, context))
                                .filter((result) => result !== null);
                            if (groupChildren.length > 0) {
                                return {
                                    id: c.id,
                                    label: c.label,
                                    kind: 'group',
                                    children: groupChildren,
                                };
                            }
                            return null;
                        }
                        return toWeb(c, context);
                    })
                        .filter((result) => result !== null);
                };
                const children = processChildren((n.children || []), childCtx);
                const result = {
                    id: n.id,
                    label: memberName || n.label,
                    kind: 'member',
                    insertText,
                    children,
                };
                // Отладка для табличной части - добавляем информацию в сам узел для отправки в webview (только если включен debugMode)
                if (debugMode && isTabularSection) {
                    // Добавляем отладочную информацию в узел, чтобы она была видна в webview
                    result._debug = {
                        memberName,
                        originalChildrenCount: (n.children || []).length,
                        processedChildrenCount: children.length,
                        children: children.map(ch => ({
                            kind: ch.kind,
                            label: ch.label,
                            insertText: ch.insertText,
                            childrenCount: (ch.children || []).length
                        })),
                        originalChildren: (n.children || []).map((ch) => ({
                            kind: ch.kind,
                            label: ch.label,
                            id: ch.id,
                            childrenCount: (ch.children || []).length
                        }))
                    };
                }
                return result;
            }
            // root
            const rootChildren = (n.children || [])
                .map((c) => toWeb(c, ctx))
                .filter((c) => c !== null);
            return {
                id: n.id,
                label: n.label,
                kind: 'root',
                children: rootChildren,
            };
        };
        try {
            const rootNode = {
                id: 'root',
                label: 'Configuration',
                kind: 'root',
                children: [],
            };
            const onTypeLoaded = (typeNode) => {
                const converted = toWeb(typeNode, {});
                if (converted && converted.kind === 'type') {
                    rootNode.children.push(converted);
                    onProgress?.({ ...rootNode, children: [...rootNode.children] });
                }
            };
            const { tree } = onProgress
                ? await this.metadataRepository.loadProgressive(configRoot, onTypeLoaded)
                : await this.metadataRepository.load(configRoot);
            const mapped = toWeb(tree, {});
            if (!mapped) {
                const emptyTree = {
                    id: 'root',
                    label: 'Configuration',
                    kind: 'root',
                    children: [],
                };
                this.metadataTreeCacheByRoot.set(configRoot, emptyTree);
                return emptyTree;
            }
            this.metadataTreeCacheByRoot.set(configRoot, mapped);
            return mapped;
        }
        catch {
            this.metadataTreeCacheByRoot.set(configRoot, null);
            return null;
        }
    }
    /**
     * Открыть редактор запроса
     * @param extensionUri URI расширения
     * @param document Документ BSL
     * @param range Диапазон текста запроса (внутри кавычек)
     * @param queryText Текст запроса
     */
    async openEditor(extensionUri, document, range, queryText) {
        this.currentDocument = document;
        this.currentRange = range;
        // Определяем корень конфигурации
        const configRoot = this.getConfigRoot(document.fileName);
        this.lastConfigRoot = configRoot;
        let panel = this.webpanel;
        if (!panel) {
            // Открываем в текущей активной колонке (модальный режим)
            panel = vscode.window.createWebviewPanel(QueryStringEditor.viewType, `Редактор запроса`, {
                viewColumn: vscode.ViewColumn.Active,
                preserveFocus: false // Автоматически фокусировать панель
            }, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
            });
            this.webpanel = panel;
            panel.onDidDispose(() => {
                this.webpanel = undefined;
                this.webviewReady = false;
                this.pendingMetadataTree = null;
                // Кэш НЕ сбрасываем — сохраняется между открытиями редактора
            });
            panel.webview.html = this.getHtmlForWebview(panel.webview, extensionUri);
            // КРИТИЧНО: Ждем сообщения "webviewReady" от webview перед отправкой данных
            // Это предотвращает потерю сообщений, если React еще не инициализирован
            // Также добавляем fallback с таймаутом на случай, если сообщение не придет
            this.fallbackTimeout = setTimeout(() => {
                if (!this.webviewReady) {
                    console.warn('[QueryStringEditor] Webview ready message not received, using fallback timeout');
                    this.webviewReady = true;
                    if (this.pendingInitMessage && panel) {
                        panel.webview.postMessage(this.pendingInitMessage);
                        this.pendingInitMessage = null;
                    }
                }
            }, 2000); // Fallback через 2 секунды
            // Обработка сообщений от webview
            panel.webview.onDidReceiveMessage(async (message) => {
                if (!message || typeof message !== 'object')
                    return;
                // Обработка сообщения "webviewReady" от webview
                if (message.type === 'webviewReady') {
                    this.webviewReady = true;
                    if (this.fallbackTimeout) {
                        clearTimeout(this.fallbackTimeout);
                        this.fallbackTimeout = null;
                    }
                    if (this.pendingInitMessage && panel) {
                        panel.webview.postMessage(this.pendingInitMessage);
                        this.pendingInitMessage = null;
                    }
                    // Дерево могло загрузиться до готовности webview — отправляем если есть
                    if (this.pendingMetadataTree !== null && panel) {
                        panel.webview.postMessage({ type: "metadataTreeReady", metadataTree: this.pendingMetadataTree });
                        this.pendingMetadataTree = null;
                    }
                    return;
                }
                if (message.type === 'requestMetadataTree' && panel) {
                    // Webview запрашивает дерево (на случай потери сообщения metadataTreeReady)
                    const tree = this.pendingMetadataTree ?? (this.lastConfigRoot ? this.metadataTreeCacheByRoot.get(this.lastConfigRoot) : undefined) ?? null;
                    if (tree !== null) {
                        panel.webview.postMessage({ type: "metadataTreeReady", metadataTree: tree });
                        this.pendingMetadataTree = null;
                    }
                    return;
                }
                if (message.type === 'saveQuery') {
                    await this.handleSaveQuery(message.payload);
                }
                else if (message.type === 'cancel') {
                    // Закрываем панель при отмене
                    if (this.webpanel) {
                        this.webpanel.dispose();
                        this.webpanel = undefined;
                    }
                }
            });
        }
        else {
            // Если панель уже открыта, показываем её с фокусом
            panel.reveal(vscode.ViewColumn.Active, false);
        }
        const config = vscode.workspace.getConfiguration();
        const debugMode = config.get('metadataViewer.debugMode', false);
        // КРИТИЧНО: Отправляем init сразу с минимальными данными — редактор открывается без ожидания.
        // scanMetadataForWebview может долго выполняться или зависнуть при неверном configRoot.
        const initMessage = {
            type: "standaloneQueryEditorInit",
            payload: {
                queryText: queryText || '',
                metadata: { registers: [], referenceTypes: [] },
                metadataTree: null,
                debugMode,
            },
        };
        if (!this.webviewReady) {
            this.pendingInitMessage = initMessage;
        }
        else {
            panel.webview.postMessage(initMessage);
        }
        // Метаданные загружаем в фоне — обновляем только metadata, дерево не трогаем
        void this.scanMetadataForWebview(configRoot).then((metadata) => {
            if (!this.webpanel)
                return;
            if (this.webviewReady) {
                this.webpanel.webview.postMessage({ type: "metadataUpdate", metadata });
            }
            else {
                this.pendingInitMessage = {
                    type: "standaloneQueryEditorInit",
                    payload: { queryText: queryText || '', metadata, metadataTree: null, debugMode },
                };
            }
        }).catch(() => {
            // Игнорируем ошибки сканирования — редактор уже открыт с пустыми метаданными
        });
        const sendTree = (tree) => {
            if (!this.webpanel)
                return;
            if (this.webviewReady) {
                this.webpanel.webview.postMessage({ type: "metadataTreeReady", metadataTree: tree });
            }
            else {
                this.pendingMetadataTree = tree;
            }
        };
        void this.loadMetadataTreeForWebview(configRoot, sendTree).then((metadataTree) => {
            if (!this.webpanel)
                return;
            this.pendingMetadataTree = metadataTree;
            if (this.webviewReady) {
                this.webpanel.webview.postMessage({ type: "metadataTreeReady", metadataTree });
                this.pendingMetadataTree = null;
            }
        });
    }
    /**
     * Обработка сохранения запроса
     */
    async handleSaveQuery(newQueryText) {
        if (!this.currentDocument || !this.currentRange) {
            vscode.window.showErrorMessage('Не удалось сохранить запрос: документ не найден');
            return;
        }
        try {
            // Форматируем запрос: добавляем | в начале каждой строки (кроме первой)
            const formattedQuery = this.formatQueryForBsl(newQueryText);
            const edit = new vscode.WorkspaceEdit();
            // Заменяем текст внутри диапазона (внутри кавычек)
            edit.replace(this.currentDocument.uri, this.currentRange, formattedQuery);
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
                vscode.window.showInformationMessage('Запрос успешно сохранён');
                // Закрываем панель после сохранения
                if (this.webpanel) {
                    this.webpanel.dispose();
                    this.webpanel = undefined;
                }
            }
            else {
                vscode.window.showErrorMessage('Не удалось применить изменения');
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Ошибка сохранения запроса: ${msg}`);
        }
    }
    /**
     * Генерация HTML для webview
     */
    getHtmlForWebview(webview, extensionUri) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'metadataEditor.bundle.js'));
        const nonce = getNonce();
        return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" 
    content="default-src 'none'; 
             style-src ${webview.cspSource} 'unsafe-inline'; 
             img-src ${webview.cspSource} https: data:;
             font-src ${webview.cspSource};
             worker-src ${webview.cspSource} blob:;
             connect-src ${webview.cspSource};
             script-src 'nonce-${nonce}';">
  <title>Редактор запроса</title>
  <style nonce="${nonce}">
    /* Модальный стиль для редактора */
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    #root {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">
    window.__APP_MODE__ = 'standaloneQueryEditor';
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
exports.QueryStringEditor = QueryStringEditor;
QueryStringEditor.viewType = "metadataViewer.queryStringEditor";
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=queryStringEditor.js.map
import * as vscode from 'vscode';
import { PredefinedDataItem } from './predefinedDataInterfaces';
import { parsePredefinedXmlWithDom } from './xmlParsers/predefinedParser';
import { serializePredefinedXmlWithDom } from './xmlParsers/predefinedSerializer';
import { updateConfigDumpInfoForPredefined } from './utils/configDumpInfoUpdater';
import { normalizeXML, validateXML } from './utils/xmlUtils';
import { validateXmlStructure, summarizeStructureValidationErrors } from './validation/xmlStructureValidator';
import { METADATA_TYPES } from './Metadata/metadata-types';
import { scanMetadataRoot } from './metadata_utils/MetadataScanner';
import { loadChartOfAccountsMetadata } from './metadata_utils/ChartOfAccountsDataLoader';
import { loadChartOfCalculationTypesEditorContext } from './metadata_utils/ChartOfCalculationTypesDataLoader';
import { CommitFileLogger } from './utils/commitFileLogger';
import { insertItemUnderParent } from './utils/predefinedTreeMutations';
import { statusBarProgress, contextStatusBar } from './extension';
import * as path from 'path';
import * as fs from 'fs';

interface PredefinedPanelState {
    items: PredefinedDataItem[];
    originalXml: string;
    predefinedPath: string;
    configRoot: string;
    objectType: string;
    objectName: string;
}

export class PredefinedDataPanel {
  public static readonly viewType = 'metadataViewer.predefinedPanel';

    private static panels: Map<string, PredefinedDataPanel> = new Map();

    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private state: PredefinedPanelState;

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
        state: PredefinedPanelState
    ) {
        this.panel = panel;
        this.state = state;

        this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);

        this.setWebviewMessageListener(this.panel.webview);

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // НЕ отправляем данные сразу - ждем запроса от webview
        // Webview сам запросит данные при загрузке через requestData
        console.log(`[PredefinedDataPanel.constructor] Панель создана, элементов в state: ${this.state.items.length}`);
    }

    public static async createOrShow(
        extensionUri: vscode.Uri,
        itemPath: string,
        metadataName: string
    ): Promise<void> {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

        // itemPath - это путь к директории объекта (например: E:\DATA1C\BASE\src\cf\Catalogs\Номенклатура)
        // или относительный путь от корня конфигурации
        const objectDir = itemPath;
        
        // Определяем путь к Predefined.xml
        const predefinedPath = path.join(objectDir, 'Ext', 'Predefined.xml');
        
        // Определяем configRoot (поднимаемся на 2 уровня вверх от объекта)
        // Например: E:\DATA1C\BASE\src\cf\Catalogs\Номенклатура -> E:\DATA1C\BASE\src\cf
        // Структура: configRoot/Catalogs/Номенклатура
        let configRoot: string;
        if (path.isAbsolute(objectDir)) {
            configRoot = path.dirname(path.dirname(objectDir));
        } else {
            // Для относительных путей нужно найти корень конфигурации
            // Путь вида: Catalogs/Номенклатура -> нужно найти корень
            const parts = objectDir.split(path.sep);
            if (parts.length >= 2) {
                // Берем все части кроме последних двух (тип и имя объекта)
                configRoot = parts.slice(0, -2).join(path.sep);
            } else {
                configRoot = path.dirname(path.dirname(objectDir));
            }
        }
        
        // Определяем тип объекта и имя из metadataName (например, "Catalogs.Номенклатура" или "Catalog.Номенклатура")
        const parts = metadataName.split('.');
        if (parts.length < 2) {
            vscode.window.showErrorMessage(`Не удалось определить тип объекта из имени: "${metadataName}"`);
            return;
        }
        
        // Преобразуем название директории (множественное число) в тип объекта (единственное число)
        // Например: Catalogs -> Catalog, Documents -> Document, Enums -> Enum
        let objectTypeEn = parts[0];
        
        // Маппинг названий директорий в типы объектов (используем тот же маппинг, что и в других местах проекта)
        const directoryToTypeMap: Record<string, string> = {
            'Catalogs': 'Catalog',
            'Documents': 'Document',
            'Enums': 'Enum',
            'Reports': 'Report',
            'DataProcessors': 'DataProcessor',
            'ChartsOfCharacteristicTypes': 'ChartOfCharacteristicTypes',
            'ChartsOfAccounts': 'ChartOfAccounts',
            'ChartsOfCalculationTypes': 'ChartOfCalculationTypes',
            'InformationRegisters': 'InformationRegister',
            'AccumulationRegisters': 'AccumulationRegister',
            'AccountingRegisters': 'AccountingRegister',
            'CalculationRegisters': 'CalculationRegister',
            'BusinessProcesses': 'BusinessProcess',
            'Tasks': 'Task',
            'Constants': 'Constant',
            'CommonModules': 'CommonModule',
            'CommonForms': 'CommonForm',
            'ExternalDataSources': 'ExternalDataSource',
            'DefinedTypes': 'DefinedType',
            'ExchangePlans': 'ExchangePlan',
            'DocumentJournals': 'DocumentJournal',
            'Sequences': 'Sequence',
            'DocumentNumerators': 'DocumentNumerator',
            'WebServices': 'WebService',
            'HTTPServices': 'HTTPService',
            'Subsystems': 'Subsystem',
            'Roles': 'Role',
            'SessionParameters': 'SessionParameter',
            'CommonAttributes': 'CommonAttribute',
            'EventSubscriptions': 'EventSubscription',
            'ScheduledJobs': 'ScheduledJob',
            'CommonCommands': 'CommonCommand',
            'CommandGroups': 'CommandGroup',
            'CommonTemplates': 'CommonTemplate',
            'CommonPictures': 'CommonPicture',
            'WSReferences': 'WSReference',
            'Styles': 'Style',
            'StyleItems': 'StyleItem',
            'FilterCriteria': 'FilterCriterion',
            'FunctionalOptions': 'FunctionalOption',
            'FunctionalOptionsParameters': 'FunctionalOptionsParameter',
            'SettingsStorages': 'SettingsStorage'
        };
        
        // Если это название директории (множественное число), преобразуем в тип объекта
        if (directoryToTypeMap[objectTypeEn]) {
            objectTypeEn = directoryToTypeMap[objectTypeEn];
        }
        
        const objectName = parts.slice(1).join('.'); // Номенклатура
        
        // Проверяем, что тип найден в METADATA_TYPES
        const metadataType = METADATA_TYPES.find(m => m.type === objectTypeEn);
        if (!metadataType) {
            vscode.window.showErrorMessage(`Тип объекта "${objectTypeEn}" не найден в словаре METADATA_TYPES`);
            return;
        }

        const panelKey = predefinedPath;

        // Проверяем, есть ли уже открытая панель
        const existingPanel = this.panels.get(panelKey);
        if (existingPanel) {
            existingPanel.panel.reveal(column);
            return;
        }

        statusBarProgress.show();
        statusBarProgress.text = '$(sync~spin) Загрузка редактора…';
        try {
            // Парсим Predefined.xml
            let items: PredefinedDataItem[] = [];
            let originalXml = '<?xml version="1.0" encoding="UTF-8"?><PredefinedData xmlns="http://v8.1c.ru/8.1/data/core"><Item><Name>Новый элемент</Name><Code>001</Code><Description></Description><IsFolder>false</IsFolder></Item></PredefinedData>';

            if (fs.existsSync(predefinedPath)) {
                try {
                    console.log(`[PredefinedDataPanel.createOrShow] Файл найден: ${predefinedPath}`);
                    const parsed = await parsePredefinedXmlWithDom(predefinedPath);
                    items = parsed.items;
                    originalXml = parsed.originalXml;
                    console.log(`[PredefinedDataPanel.createOrShow] Распарсено элементов: ${items.length}`);
                    if (items.length > 0) {
                        console.log(`[PredefinedDataPanel.createOrShow] Первый элемент: Name="${items[0].Name}", Code="${items[0].Code}"`);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`[PredefinedDataPanel.createOrShow] Ошибка парсинга:`, error);
                    vscode.window.showErrorMessage(`Ошибка при чтении Predefined.xml: ${errorMessage}`);
                    statusBarProgress.hide();
                    return;
                }
            } else {
                console.log(`[PredefinedDataPanel.createOrShow] Файл НЕ найден: ${predefinedPath}`);
                console.log(`[PredefinedDataPanel.createOrShow] Открываем редактор с пустым массивом для создания новых элементов`);
            }

            const panel = vscode.window.createWebviewPanel(
                PredefinedDataPanel.viewType,
                `Предопределенные элементы (${metadataName})`,
                column || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")]
                }
            );

            const predefinedPanel = new PredefinedDataPanel(panel, extensionUri, {
                items,
                originalXml,
                predefinedPath,
                configRoot,
                objectType: objectTypeEn,
                objectName
            });

            contextStatusBar.text = `1С: Предопределённые — ${metadataName}`;
            contextStatusBar.show();

            this.panels.set(panelKey, predefinedPanel);
        } finally {
            statusBarProgress.hide();
        }
    }

    private async postInitialData() {
        console.log(`[PredefinedDataPanel.postInitialData] Отправка данных в webview: ${this.state.items.length} элементов`);
        
        // Получаем metadata из конфигурации
        const metadata = await this.scanMetadataForWebview();
        
        // Загружаем данные плана счетов, если это план счетов
        let chartOfAccountsData = undefined;
        if (this.state.objectType === 'ChartOfAccounts') {
            try {
                chartOfAccountsData = await loadChartOfAccountsMetadata(this.state.configRoot, this.state.objectName);
                console.log(`[PredefinedDataPanel.postInitialData] Загружены данные плана счетов:`, {
                    accountingFlags: chartOfAccountsData.accountingFlags.length,
                    extDimensionAccountingFlags: chartOfAccountsData.extDimensionAccountingFlags.length,
                    dimensionTypes: chartOfAccountsData.dimensionTypes.length
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[PredefinedDataPanel.postInitialData] Ошибка загрузки данных плана счетов: ${errorMessage}`);
            }
        }

        let chartOfCalculationTypesData = undefined;
        if (this.state.objectType === 'ChartOfCalculationTypes') {
            try {
                chartOfCalculationTypesData = await loadChartOfCalculationTypesEditorContext(
                    this.state.configRoot,
                    this.state.objectName
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[PredefinedDataPanel.postInitialData] Ошибка контекста ПВР: ${errorMessage}`);
            }
        }
        
        const message = {
            type: 'init',
            payload: this.state.items,
            objectType: this.state.objectType,
            metadata,
            chartOfAccountsData,
            chartOfCalculationTypesData
        };
        this.panel.webview.postMessage(message);
        console.log(`[PredefinedDataPanel.postInitialData] Сообщение отправлено, payload:`, JSON.stringify(this.state.items.slice(0, 2))); // Логируем первые 2 элемента
    }
    
    /**
     * Сканирование метаданных конфигурации для получения списков регистров и ссылочных типов
     */
    private async scanMetadataForWebview(): Promise<{ registers: string[]; referenceTypes: string[] }> {
        const registers: string[] = [];
        const referenceTypes: string[] = [];
        
        try {
            // Маппинг типов директорий на типы метаданных
            const typeDirToMetadataType: Record<string, string> = {
                'InformationRegisters': 'InformationRegister',
                'AccumulationRegisters': 'AccumulationRegister',
                'AccountingRegisters': 'AccountingRegister',
                'CalculationRegisters': 'CalculationRegister',
                'Catalogs': 'Catalog',
                'Documents': 'Document',
                'Enums': 'Enum',
                'Reports': 'Report',
                'DataProcessors': 'DataProcessor',
                'ChartsOfCharacteristicTypes': 'ChartOfCharacteristicTypes',
                'ChartsOfAccounts': 'ChartOfAccounts',
                'ChartsOfCalculationTypes': 'ChartOfCalculationTypes',
                'BusinessProcesses': 'BusinessProcess',
                'Tasks': 'Task',
                'Constants': 'Constant',
                'CommonModules': 'CommonModule',
                'CommonForms': 'CommonForm',
                'ExternalDataSources': 'ExternalDataSource',
                'DefinedTypes': 'DefinedType',
                'ExchangePlans': 'ExchangePlan',
                'DocumentJournals': 'DocumentJournal',
                'Sequences': 'Sequence',
                'DocumentNumerators': 'DocumentNumerator',
                'WebServices': 'WebService',
                'HTTPServices': 'HTTPService',
                'Subsystems': 'Subsystem',
                'Roles': 'Role',
                'SessionParameters': 'SessionParameter',
                'CommonAttributes': 'CommonAttribute',
                'EventSubscriptions': 'EventSubscription',
                'ScheduledJobs': 'ScheduledJob',
                'CommonCommands': 'CommonCommand',
                'CommandGroups': 'CommandGroup',
                'CommonTemplates': 'CommonTemplate',
                'CommonPictures': 'CommonPicture',
                'WSReferences': 'WSReference',
                'Styles': 'Style',
                'StyleItems': 'StyleItem',
                'FilterCriteria': 'FilterCriterion',
                'FunctionalOptions': 'FunctionalOption',
                'FunctionalOptionsParameters': 'FunctionalOptionsParameter',
                'SettingsStorages': 'SettingsStorage',
            };
            
            // Маппинг типов метаданных на наборы типов для редактора типов
            const metadataTypeToTypePrefixes: Record<string, string[]> = {
                'Catalog': ['CatalogRef', 'CatalogObject', 'CatalogManager', 'CatalogSelection', 'CatalogList'],
                'Document': ['DocumentRef', 'DocumentObject', 'DocumentManager', 'DocumentSelection', 'DocumentList'],
                'Enum': ['EnumRef'],
                'Report': ['ReportRef'],
                'DataProcessor': ['DataProcessorRef'],
                'ChartOfCharacteristicTypes': ['ChartOfCharacteristicTypesRef'],
                'ChartOfAccounts': ['ChartOfAccountsRef'],
                'ChartOfCalculationTypes': ['ChartOfCalculationTypesRef'],
                'InformationRegister': ['InformationRegisterRef', 'InformationRegisterRecordSet', 'InformationRegisterManager', 'InformationRegisterSelection'],
                'AccumulationRegister': ['AccumulationRegisterRef', 'AccumulationRegisterRecordSet', 'AccumulationRegisterManager', 'AccumulationRegisterSelection'],
                'AccountingRegister': ['AccountingRegisterRef', 'AccountingRegisterRecordSet', 'AccountingRegisterManager', 'AccountingRegisterSelection'],
                'CalculationRegister': ['CalculationRegisterRef', 'CalculationRegisterRecordSet', 'CalculationRegisterManager', 'CalculationRegisterSelection'],
                'BusinessProcess': ['BusinessProcessRef', 'BusinessProcessObject', 'BusinessProcessManager', 'BusinessProcessSelection', 'BusinessProcessList'],
                'Task': ['TaskRef', 'TaskObject', 'TaskManager', 'TaskSelection', 'TaskList'],
                'Constant': ['ConstantRef'],
                'CommonModule': ['CommonModuleRef'],
                'CommonForm': ['CommonFormRef'],
                'ExternalDataSource': ['ExternalDataSourceRef'],
                'DefinedType': ['DefinedTypeRef'],
                'ExchangePlan': ['ExchangePlanRef', 'ExchangePlanObject', 'ExchangePlanManager', 'ExchangePlanSelection', 'ExchangePlanList'],
                'DocumentJournal': ['DocumentJournalRef'],
                'Sequence': ['SequenceRef'],
                'DocumentNumerator': ['DocumentNumeratorRef'],
                'WebService': ['WebServiceRef'],
                'HTTPService': ['HTTPServiceRef'],
                'Subsystem': ['SubsystemRef'],
                'Role': ['RoleRef'],
                'SessionParameter': ['SessionParameterRef'],
                'CommonAttribute': ['CommonAttributeRef'],
                'EventSubscription': ['EventSubscriptionRef'],
                'ScheduledJob': ['ScheduledJobRef'],
                'CommonCommand': ['CommonCommandRef'],
                'CommandGroup': ['CommandGroupRef'],
                'CommonTemplate': ['CommonTemplateRef'],
                'CommonPicture': ['CommonPictureRef'],
                'WSReference': ['WSReferenceRef'],
                'Style': ['StyleRef'],
                'StyleItem': ['StyleItemRef'],
                'FilterCriterion': ['FilterCriterionRef'],
                'FunctionalOption': ['FunctionalOptionRef'],
                'FunctionalOptionsParameter': ['FunctionalOptionsParameterRef'],
                'SettingsStorage': ['SettingsStorageRef'],
            };
            
            // Сканируем конфигурацию
            const scanResult = await scanMetadataRoot(this.state.configRoot);
            
            // Обрабатываем все найденные объекты
            for (const obj of scanResult.objects) {
                const metadataType = typeDirToMetadataType[obj.objectTypeDir];
                if (!metadataType) continue;
                
                // Формируем полное имя объекта (например, Catalog.Номенклатура)
                const fullName = `${metadataType}.${obj.displayName}`;
                
                // Для регистров добавляем в список регистров
                if (metadataType === 'InformationRegister' || 
                    metadataType === 'AccumulationRegister' || 
                    metadataType === 'AccountingRegister' || 
                    metadataType === 'CalculationRegister') {
                    registers.push(fullName);
                }
                
                // Для всех объектов формируем набор типов для редактора типов
                const typePrefixes = metadataTypeToTypePrefixes[metadataType];
                if (typePrefixes && typePrefixes.length > 0) {
                    for (const prefix of typePrefixes) {
                        referenceTypes.push(`cfg:${prefix}.${obj.displayName}`);
                    }
                }
            }
            
            // Сортируем списки
            registers.sort();
            referenceTypes.sort();
            
        } catch (error) {
            console.error('[PredefinedDataPanel.scanMetadataForWebview] Ошибка сканирования метаданных:', error);
        }
        
        return { registers, referenceTypes };
    }

    private setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(async (message: any) => {
            try {
                console.log(`[PredefinedDataPanel.setWebviewMessageListener] Получено сообщение от webview: ${message.type}`);
                switch (message.type) {
                    case 'webviewReady':
                        // Webview готов к получению данных - отправляем их
                        console.log(`[PredefinedDataPanel.setWebviewMessageListener] Webview готов, отправляем данные`);
                        this.postInitialData();
                        break;
                    case 'requestData':
                        // Webview запрашивает данные - отправляем их
                        console.log(`[PredefinedDataPanel.setWebviewMessageListener] Запрос данных от webview`);
                        this.postInitialData();
                        break;
                    case 'save':
                        await this.handleSave(message.payload);
                        break;
                    case 'addItem':
                        this.handleAddItem(message.payload);
                        break;
                    case 'updateItem':
                        this.handleUpdateItem(message.payload);
                        break;
                    case 'deleteItem':
                        this.handleDeleteItem(message.payload);
                        break;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[PredefinedDataPanel.setWebviewMessageListener] Ошибка:`, error);
                vscode.window.showErrorMessage(`Ошибка: ${errorMessage}`);
            }
        });
    }

    private handleAddItem(
        payload: PredefinedDataItem | { item: PredefinedDataItem; parentPath?: number[] }
    ) {
        let item: PredefinedDataItem;
        let parentPath: number[] = [];
        if (payload && typeof payload === 'object' && 'item' in payload) {
            item = payload.item;
            parentPath = Array.isArray(payload.parentPath) ? payload.parentPath : [];
        } else {
            item = payload as PredefinedDataItem;
        }
        this.state.items = insertItemUnderParent(this.state.items, parentPath, item);
        this.postInitialData();
    }

    private handleUpdateItem(payload: { index: number; item: PredefinedDataItem }) {
        const { index, item } = payload;
        const updatedItems = [...this.state.items];
        updatedItems[index] = item;
        this.state.items = updatedItems;
        this.postInitialData();
    }

    private handleDeleteItem(payload: { index: number }) {
        const { index } = payload;
        this.state.items = this.state.items.filter((_, i) => i !== index);
        this.postInitialData();
    }

    private async handleSave(items: PredefinedDataItem[]) {
        try {
            // Сохраняем Predefined.xml
            // serializePredefinedXmlWithDom уже добавляет BOM если он был в originalXml
            let updatedXml = serializePredefinedXmlWithDom(this.state.originalXml, items);
            updatedXml = normalizeXML(updatedXml);

            const validation = validateXML(updatedXml);
            if (!validation.valid) {
                throw new Error(validation.error ?? 'Результат сохранения не является валидным XML');
            }

            const structureValidationEnabled = vscode.workspace.getConfiguration('metadataViewer').get<boolean>('structureValidationEnabled', true);
            if (structureValidationEnabled) {
                const structureResult = validateXmlStructure(updatedXml, {
                    extensionPath: this.extensionUri.fsPath,
                    filePath: this.state.predefinedPath,
                    rootTag: 'PredefinedData'
                });
                if (!structureResult.valid && structureResult.errors?.length) {
                    const errorMessage = summarizeStructureValidationErrors(structureResult.errors);
                    throw new Error(`Ошибка структуры XML: ${errorMessage}`);
                }
            }

            // Создаем директорию Ext если её нет
            const extDir = path.dirname(this.state.predefinedPath);
            if (!fs.existsSync(extDir)) {
                fs.mkdirSync(extDir, { recursive: true });
            }
            
            // Сохраняем файл (BOM уже включен в updatedXml если был в originalXml)
            // Если originalXml не имел BOM, но нужен BOM для 1С, добавляем его
            let xmlToWrite = updatedXml;
            if (updatedXml.charCodeAt(0) !== 0xfeff) {
                const bomBuffer = Buffer.from([0xEF, 0xBB, 0xBF]);
                const contentBuffer = Buffer.from(updatedXml, 'utf8');
                xmlToWrite = Buffer.concat([bomBuffer, contentBuffer]).toString('utf8');
            }
            fs.writeFileSync(this.state.predefinedPath, xmlToWrite, 'utf8');
            
            // Логируем измененный файл в Commit.txt
            CommitFileLogger.getInstance().logChangedFile(this.state.predefinedPath);
            
            // Обновляем ConfigDumpInfo.xml
            const configDumpInfoPath = path.join(this.state.configRoot, 'ConfigDumpInfo.xml');
            console.log(`[PredefinedDataPanel.handleSave] Обновление ConfigDumpInfo: ${configDumpInfoPath}`);
            console.log(`[PredefinedDataPanel.handleSave] objectType: ${this.state.objectType}, objectName: ${this.state.objectName}`);
            await updateConfigDumpInfoForPredefined({
                configDumpInfoPath,
                objectType: this.state.objectType,
                objectName: this.state.objectName
            });
            console.log(`[PredefinedDataPanel.handleSave] ConfigDumpInfo обновлен успешно`);
            
            // Обновляем состояние
            this.state.items = items;
            // Сохраняем updatedXml с BOM для правильного отображения в будущем
            this.state.originalXml = xmlToWrite;
            
            // Обновляем дерево метаданных
            // Путь должен быть к XML файлу самого объекта (не к Predefined.xml)
            // Например: configRoot/Catalogs/Номенклатура/Номенклатура.xml
            // Команда refreshObjectByPath инвалидирует кэш для этого объекта,
            // и при следующем раскрытии узла будут перечитаны и предопределенные элементы из Ext/Predefined.xml
            try {
                // Преобразуем тип объекта обратно в название директории (единственное -> множественное)
                const directoryMap: Record<string, string> = {
                    'Catalog': 'Catalogs',
                    'Document': 'Documents',
                    'Enum': 'Enums',
                    'Report': 'Reports',
                    'DataProcessor': 'DataProcessors',
                    'ChartOfCharacteristicTypes': 'ChartsOfCharacteristicTypes',
                    'ChartOfAccounts': 'ChartsOfAccounts',
                    'ChartOfCalculationTypes': 'ChartsOfCalculationTypes',
                    'InformationRegister': 'InformationRegisters',
                    'AccumulationRegister': 'AccumulationRegisters',
                    'AccountingRegister': 'AccountingRegisters',
                    'CalculationRegister': 'CalculationRegisters',
                    'BusinessProcess': 'BusinessProcesses',
                    'Task': 'Tasks',
                    'Constant': 'Constants',
                    'CommonModule': 'CommonModules',
                    'CommonForm': 'CommonForms',
                    'ExternalDataSource': 'ExternalDataSources',
                    'DefinedType': 'DefinedTypes',
                    'ExchangePlan': 'ExchangePlans',
                    'DocumentJournal': 'DocumentJournals',
                    'Sequence': 'Sequences',
                    'DocumentNumerator': 'DocumentNumerators',
                    'WebService': 'WebServices',
                    'HTTPService': 'HTTPServices',
                    'Subsystem': 'Subsystems',
                    'Role': 'Roles',
                    'SessionParameter': 'SessionParameters',
                    'CommonAttribute': 'CommonAttributes',
                    'EventSubscription': 'EventSubscriptions',
                    'ScheduledJob': 'ScheduledJobs',
                    'CommonCommand': 'CommonCommands',
                    'CommandGroup': 'CommandGroups',
                    'CommonTemplate': 'CommonTemplates',
                    'CommonPicture': 'CommonPictures',
                    'WSReference': 'WSReferences',
                    'Style': 'Styles',
                    'StyleItem': 'StyleItems',
                    'FilterCriterion': 'FilterCriteria',
                    'FunctionalOption': 'FunctionalOptions',
                    'FunctionalOptionsParameter': 'FunctionalOptionsParameters',
                    'SettingsStorage': 'SettingsStorages'
                };
                
                const directoryName = directoryMap[this.state.objectType] || this.state.objectType;
                // Путь к XML файлу объекта: configRoot/Catalogs/Номенклатура/Номенклатура.xml
                const objectXmlPath = path.join(this.state.configRoot, directoryName, this.state.objectName, `${this.state.objectName}.xml`);
                console.log(`[PredefinedDataPanel.handleSave] Путь к XML файлу объекта для обновления кэша: ${objectXmlPath}`);
                
                // Инвалидируем кэш для этого объекта
                // При следующем раскрытии узла будут перечитаны и предопределенные элементы из Ext/Predefined.xml
                await vscode.commands.executeCommand('metadataViewer.refreshObjectByPath', objectXmlPath);
                console.log(`[PredefinedDataPanel.handleSave] Кэш объекта инвалидирован, дерево обновится при следующем раскрытии узла`);
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.warn(`[PredefinedDataPanel.handleSave] Не удалось обновить кэш объекта: ${errorMessage}`);
                // Не показываем ошибку пользователю, так как основное сохранение уже выполнено
            }
            
            vscode.window.showInformationMessage('Предопределенные элементы успешно сохранены');
            
            // Отправляем подтверждение в webview
            this.panel.webview.postMessage({
                type: 'saved',
                payload: { success: true }
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Ошибка при сохранении: ${errorMessage}`);
            this.panel.webview.postMessage({
                type: 'saved',
                payload: { success: false, error: errorMessage }
            });
        }
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "media", "metadataEditor.bundle.js")
        );
        // ВАЖНО: CSS инлайнится в bundle через style-loader, отдельный файл не нужен

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource} 'unsafe-inline';
                 img-src ${webview.cspSource} data: https:;
                 font-src ${webview.cspSource};
                 connect-src ${webview.cspSource};
                 worker-src ${webview.cspSource} blob:;
                 script-src ${webview.cspSource} 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- CSS инлайнится в bundle через style-loader -->
  <title>Предопределенные элементы</title>
  <script nonce="${nonce}">
    // КРИТИЧНО: Перехватываем загрузку динамических чанков ДО загрузки bundle
    // Это предотвращает ошибки ChunkLoadError для Monaco Editor
    (function() {
      function interceptWebpackRequireE() {
        if (window.__webpack_require__ && window.__webpack_require__.e) {
          const originalE = window.__webpack_require__.e;
          // Переопределяем функцию загрузки чанков
          window.__webpack_require__.e = function(chunkId) {
            console.warn('[Webpack] Попытка загрузить чанк ' + chunkId + ' заблокирована. Используется синхронный режим Monaco.');
            // Возвращаем rejected promise, чтобы Monaco использовал fallback
            return Promise.reject(new Error('Chunk loading disabled for webview: ' + chunkId));
          };
          return true; // Успешно перехвачено
        }
        return false;
      }
      
      // Пытаемся перехватить сразу
      if (!interceptWebpackRequireE()) {
        // Если не получилось, используем несколько стратегий
        const strategies = [
          // Стратегия 1: DOMContentLoaded
          function() {
            document.addEventListener('DOMContentLoaded', interceptWebpackRequireE);
          },
          // Стратегия 2: load event
          function() {
            window.addEventListener('load', interceptWebpackRequireE);
          },
          // Стратегия 3: MutationObserver
          function() {
            const observer = new MutationObserver(function() {
              if (interceptWebpackRequireE()) {
                observer.disconnect();
              }
            });
            observer.observe(document, { childList: true, subtree: true });
          },
          // Стратегия 4: Периодическая проверка
          function() {
            const interval = setInterval(function() {
              if (interceptWebpackRequireE()) {
                clearInterval(interval);
              }
            }, 10);
            // Останавливаем через 5 секунд
            setTimeout(function() {
              clearInterval(interval);
            }, 5000);
          }
        ];
        
        strategies.forEach(function(strategy) {
          try {
            strategy();
          } catch (e) {
            console.error('[Webpack] Ошибка при настройке перехвата:', e);
          }
        });
      }
    })();
    
    // Устанавливаем режим приложения для выбора компонента
    window.__APP_MODE__ = 'predefinedEditor';
  </script>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    private dispose() {
        PredefinedDataPanel.panels.delete(this.state.predefinedPath);
        contextStatusBar.hide();
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
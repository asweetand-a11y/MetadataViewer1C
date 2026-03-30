import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { CommitFileLogger } from "../utils/commitFileLogger";
import { parseMetadataXml, ParsedMetadataObject, isParsedTypeRefDate } from "../xmlParsers/metadataParser";
import { parsePredefinedXml } from "../xmlParsers/predefinedParser";
import { parseFormXml, isFormFile, parseFormXmlFull, ParsedFormFull } from "../xmlParsers/formParser";
import { FIELD_VALUES, TEXT_INPUT_FIELDS, normalizeAccumulationRegisterTypeValue } from "../metadata/field-values";
import { createRefDisplayMap, createRefBSLMap } from "../metadata/metadata-types";
import { WebviewMessage, InitMessage, InformationRegisterScheduleEntry } from "../metadata/types";
import { safeReadFile, safeWriteFile, createBackup, validatePath } from "../utils/fileUtils";
import { createXMLParser, normalizeXML, validateXML } from "../utils/xmlUtils";
import { applyChangesToXmlString } from "../utils/xmlStringPatcher";
import { summarizeStructureValidationErrors, validateXmlStructure } from "../validation/xmlStructureValidator";
import { applyFormChangesToXmlStringWithDom } from "../utils/xmlDomUtils";
import { XmlDiffMerge } from "../utils/xmlDiffMerge";
import { ensureMetadataInConfigurationXml } from "../utils/configurationXmlUpdater";
import {
    loadSubsystemMembershipForObject,
    applySubsystemMembershipChanges,
    shouldOfferSubsystemMembership,
} from "../utils/subsystemMembership";
import { clearSubsystemContentCache } from "../metadataView";
import { statusBarProgress, contextStatusBar } from "../extension";
import {
    buildRegisterRefToDocumentNamesMap,
    isRegisterRecorderXmlType,
    syncRegisterRecorderDocuments,
} from "../utils/syncRegisterRecorderDocuments";


/**
 * Экранирование значения для XML-атрибута.
 */
function xmlEscapeAttrValue(value: string): string {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * В ChildObjects/Attribute/Properties комментарий в конфигурации обычно есть как пустой тег;
 * при добавлении реквизита из UI ключ часто отсутствует — подставляем пустую строку для XML/платформы.
 */
function ensureOptionalMetadataAttributeComment(properties: Record<string, any> | undefined): void {
    if (!properties || typeof properties !== "object") return;
    if (properties.Comment === undefined && properties.comment === undefined) {
        properties.Comment = "";
    }
}

function ensureOptionalMetadataCommentOnTabularSectionAttributes(ts: any): void {
    const raw = ts?.ChildObjects?.Attribute;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const a of list) {
        ensureOptionalMetadataAttributeComment(a?.Properties);
    }
}

/**
 * Находит диапазон (start..endExclusive) XML-блока <Metadata ...>...</Metadata>
 * по точному совпадению атрибута name="...".
 *
 * ВАЖНО: работает на строке, чтобы не переформатировать огромный ConfigDumpInfo.xml.
 */
function findMetadataBlockByExactName(xml: string, exactName: string): { start: number; end: number } | null {
    const needle = `name="${xmlEscapeAttrValue(exactName)}"`;
    const nameIdx = xml.indexOf(needle);
    if (nameIdx < 0) return null;

    const startIdx = xml.lastIndexOf("<Metadata", nameIdx);
    if (startIdx < 0) return null;

    // Идём вперёд от startIdx и ищем соответствующий </Metadata>, учитывая вложенность.
    const tagRe = /<Metadata\b[^>]*>|<\/Metadata>/g;
    tagRe.lastIndex = startIdx;

    let depth = 0;
    let first = true;
    while (true) {
        const m = tagRe.exec(xml);
        if (!m) break;
        const tag = m[0];

        if (tag.startsWith("</Metadata")) {
            depth -= 1;
            if (depth === 0 && !first) {
                const endIdx = tagRe.lastIndex; // конец закрывающего тега
                return { start: startIdx, end: endIdx };
            }
        } else {
            // open or self-close
            const isSelfClosing = /\/>\s*$/.test(tag);
            if (!isSelfClosing) {
                depth += 1;
                first = false;
            }
        }
    }

    return null;
}

/**
 * Добавляет недостающие <Metadata .../> записи для реквизитов/ТЧ/реквизитов ТЧ
 * внутрь ConfigDumpInfo.xml для конкретного объекта.
 *
 * Делает ТОЛЬКО добавление (без удаления), чтобы изменение было минимальным и обратимым.
 */
function patchConfigDumpInfoForChildObjects(params: {
    configDumpInfoXml: string;
    xmlObjectType: string;
    objectName: string;
    updatedObjectXml: string;
}): { updatedXml: string; changed: boolean; addedCount: number; removedCount: number } {
    const { configDumpInfoXml, xmlObjectType, objectName, updatedObjectXml } = params;

    const nl = configDumpInfoXml.includes("\r\n") ? "\r\n" : "\n";
    const objectFqn = `${xmlObjectType}.${objectName}`;

    const range = findMetadataBlockByExactName(configDumpInfoXml, objectFqn);
    if (!range) {
        return { updatedXml: configDumpInfoXml, changed: false, addedCount: 0, removedCount: 0 };
    }

    const originalBlock = configDumpInfoXml.slice(range.start, range.end);

    // Определяем отступы из исходного файла (обычно: объект = \t\t, дети = \t\t\t)
    const lastNl = configDumpInfoXml.lastIndexOf(nl, range.start);
    const indentStart = lastNl >= 0 ? configDumpInfoXml.slice(lastNl + nl.length, range.start) : "";
    const indentChild = indentStart + "\t";

    // Парсим сохранённый XML объекта (у него точно есть uuid на Attribute/TabularSection)
    const parser = createXMLParser();
    const parsed = parser.parse(updatedObjectXml);
    const meta = parsed?.MetaDataObject;
    const node = meta?.[xmlObjectType];
    const childObjects = node?.ChildObjects;

    const ensureArrayLocal = (v: any): any[] => (Array.isArray(v) ? v : v ? [v] : []);
    const getNameFromProperties = (v: any): string | null => {
        const props = v?.Properties || v;
        const name = props?.Name ?? props?.name ?? v?.Name ?? v?.name;
        return typeof name === "string" && name.length > 0 ? name : null;
    };
    const getUuidFromAttrs = (v: any): string | null => {
        const u = v?.["@_uuid"] ?? v?.uuid;
        return typeof u === "string" && u.length > 0 ? u : null;
    };

    const entries: Array<{ name: string; id: string }> = [];

    // Верхнеуровневые реквизиты
    for (const a of ensureArrayLocal(childObjects?.Attribute)) {
        const aName = getNameFromProperties(a);
        const aUuid = getUuidFromAttrs(a);
        if (aName && aUuid) {
            entries.push({ name: `${objectFqn}.Attribute.${aName}`, id: aUuid });
        }
    }

    // Для регистров: ресурсы и измерения (также внутри ChildObjects)
    for (const r of ensureArrayLocal(childObjects?.Resource)) {
        const rName = getNameFromProperties(r);
        const rUuid = getUuidFromAttrs(r);
        if (rName && rUuid) {
            entries.push({ name: `${objectFqn}.Resource.${rName}`, id: rUuid });
        }
    }

    for (const d of ensureArrayLocal(childObjects?.Dimension)) {
        const dName = getNameFromProperties(d);
        const dUuid = getUuidFromAttrs(d);
        if (dName && dUuid) {
            entries.push({ name: `${objectFqn}.Dimension.${dName}`, id: dUuid });
        }
    }

    // Табличные части + их реквизиты
    for (const ts of ensureArrayLocal(childObjects?.TabularSection)) {
        const tsName = getNameFromProperties(ts);
        const tsUuid = getUuidFromAttrs(ts);
        if (tsName && tsUuid) {
            entries.push({ name: `${objectFqn}.TabularSection.${tsName}`, id: tsUuid });
        }

        const tsChild = ts?.ChildObjects;
        for (const a of ensureArrayLocal(tsChild?.Attribute)) {
            const aName = getNameFromProperties(a);
            const aUuid = getUuidFromAttrs(a);
            if (tsName && aName && aUuid) {
                entries.push({ name: `${objectFqn}.TabularSection.${tsName}.Attribute.${aName}`, id: aUuid });
            }
        }
    }

    const keepIds = new Set(entries.map(e => e.id));
    const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    // 1) Удаление (строго по uuid) — только внутри блока объекта и только для Attribute/TabularSection
    //    Удаляем, если id — UUID и его нет в актуальном наборе keepIds.
    let removedCount = 0;
    let block = originalBlock;

    block = block.replace(/^[\t ]*<Metadata\b[^>]*\/>(?:\r?\n)?/gm, (full) => {
        const nameMatch = full.match(/\bname="([^"]+)"/);
        const idMatch = full.match(/\bid="([^"]+)"/);
        if (!nameMatch || !idMatch) return full;

        const name = nameMatch[1];
        const id = idMatch[1];

        if (!UUID_RE.test(id)) return full;
        if (!name.startsWith(objectFqn + '.')) return full;

        // Ограничиваем область удаления: только реквизиты/табличные части/реквизиты ТЧ/ресурсы/измерения
        if (!(
            name.includes('.Attribute.') ||
            name.includes('.TabularSection.') ||
            name.includes('.Resource.') ||
            name.includes('.Dimension.')
        )) return full;

        if (keepIds.has(id)) return full;

        removedCount += 1;
        return '';
    });

    // 2) Добавление только недостающих (проверяем уже по очищенному блоку)
    const toAdd: string[] = [];
    for (const e of entries) {
        const nameNeedle = `name="${xmlEscapeAttrValue(e.name)}"`;
        if (block.includes(nameNeedle)) continue;
        toAdd.push(`${indentChild}<Metadata name="${xmlEscapeAttrValue(e.name)}" id="${xmlEscapeAttrValue(e.id)}"/>`);
    }

    // Если изменений нет — возвращаем оригинал
    if (toAdd.length === 0 && removedCount === 0) {
        return { updatedXml: configDumpInfoXml, changed: false, addedCount: 0, removedCount: 0 };
    }

    // Вставляем перед закрывающим </Metadata> блока объекта
    const closeTag = "</Metadata>";
    const closeIdx = block.lastIndexOf(closeTag);
    if (closeIdx < 0) {
        // На всякий случай: если по какой-то причине закрывающий тег не найден — ничего не меняем.
        return { updatedXml: configDumpInfoXml, changed: false, addedCount: 0, removedCount: 0 };
    }

    let patchedBlock = block;
    if (toAdd.length > 0) {
        patchedBlock =
            block.slice(0, closeIdx) +
            nl +
            toAdd.join(nl) +
            nl +
            indentStart +
            closeTag;
    }

    const updatedXml = configDumpInfoXml.slice(0, range.start) + patchedBlock + configDumpInfoXml.slice(range.end);
    return { updatedXml, changed: true, addedCount: toAdd.length, removedCount };
}

// Вспомогательная функция для глубокого копирования (используется локально)
function deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    const cloned: any = {};
    for (const [key, value] of Object.entries(obj)) {
        cloned[key] = deepClone(value);
    }
    return cloned;
}
import { TreeItem, CreatePath } from "../ConfigurationFormats/utils";
import { scanMetadataRoot } from "../metadata_utils/MetadataScanner";

export class MetadataPanel {
    public static readonly viewType = "1cMetadataViewer.panel";

    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private parsedObjects: ParsedMetadataObject[] = [];
    private readonly configRoot: string;
    private webviewReady: boolean = false;
    private pendingPostMetadata: boolean = false;
    private fallbackTimeout: NodeJS.Timeout | null = null;

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
        parsedObjects: ParsedMetadataObject[],
        configRoot: string
    ) {
        this.panel = panel;
        this.parsedObjects = parsedObjects;
        this.configRoot = configRoot;

        this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);

        this.setWebviewMessageListener(this.panel.webview);

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // КРИТИЧНО: Пытаемся отправить данные сразу - postMetadata проверит готовность webview
        // Если webview не готов, данные будут сохранены в pendingPostMetadata
        this.postMetadata();

        // КРИТИЧНО: Ждем сообщения "webviewReady" от webview перед отправкой данных
        // Это предотвращает потерю сообщений, если React еще не инициализирован
        // Также добавляем fallback с таймаутом на случай, если сообщение не придет
        this.fallbackTimeout = setTimeout(async () => {
            if (!this.webviewReady) {
                console.warn('[MetadataPanel] Webview ready message not received, using fallback timeout, pendingPostMetadata:', this.pendingPostMetadata);
                this.webviewReady = true;
                if (this.pendingPostMetadata) {
                    console.log('[MetadataPanel] Fallback timeout: отправляем данные');
                    this.pendingPostMetadata = false; // Сбрасываем флаг перед вызовом
                    await this.postMetadata();
                } else {
                    console.log('[MetadataPanel] Fallback timeout: pendingPostMetadata = false, данные уже отправлены или не были запланированы');
                }
            } else {
                console.log('[MetadataPanel] Fallback timeout: webview уже готов, данные должны быть отправлены');
            }
        }, 2000); // Fallback через 2 секунды
    }

    /**
     * Создание или отображение панели для редактирования одного файла
     */
    public static async createOrShowForFile(extensionUri: vscode.Uri, filePath: string): Promise<void> {
        console.log(`[MetadataPanel.createOrShowForFile] Начало открытия файла: ${filePath}`);
        
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : vscode.ViewColumn.One;

        statusBarProgress.show();
        statusBarProgress.text = "$(sync~spin) Загрузка редактора…";
        try {
            let parsed: ParsedMetadataObject;
            let isForm = false;

            const formCheck = await isFormFile(filePath);
            console.log(`[MetadataPanel.createOrShowForFile] Это форма? ${formCheck}`);
            
            if (formCheck) {
                const formData = await parseFormXml(filePath);
                parsed = {
                    objectType: formData.objectType,
                    name: formData.name,
                    sourcePath: formData.sourcePath,
                    properties: formData.properties,
                    attributes: formData.attributes.map(attr => ({
                        name: attr.name,
                        type: typeof attr.type === 'string' ? { kind: attr.type } : attr.type,
                        properties: attr.properties
                    })),
                    tabularSections: [],
                    forms: [],
                    commands: formData.commands.map(cmd => ({
                        name: cmd.name,
                        properties: cmd.properties
                    })),
                    predefined: []
                };
                isForm = true;
                console.log(`[MetadataPanel.createOrShowForFile] Файл формы обработан`);
            } else {
                console.log(`[MetadataPanel.createOrShowForFile] Начало парсинга объекта метаданных...`);
                parsed = await parseMetadataXml(filePath);
                console.log(`[MetadataPanel.createOrShowForFile] Объект метаданных распарсен: ${parsed.objectType} - ${parsed.name}`);
                
                const dir = path.dirname(filePath);
                const objectName = path.basename(filePath, '.xml');
                const predefinedPath = path.join(dir, objectName, 'Ext', 'Predefined.xml');
                
                if (fs.existsSync(predefinedPath)) {
                    try {
                        parsed.predefined = await parsePredefinedXml(predefinedPath);
                    } catch (err) {
                        console.error('Failed to parse Predefined.xml:', err);
                    }
                }

                const configRootForSubs = path.dirname(path.dirname(filePath));
                if (
                    shouldOfferSubsystemMembership(filePath, parsed.xmlObjectType) &&
                    fs.existsSync(path.join(configRootForSubs, "Subsystems"))
                ) {
                    try {
                        const mdRef = `${parsed.xmlObjectType}.${parsed.name}`;
                        parsed.subsystems = await loadSubsystemMembershipForObject({
                            configRoot: configRootForSubs,
                            mdRef,
                        });
                    } catch (subLoadErr) {
                        console.warn("[MetadataPanel.createOrShowForFile] Подсистемы не загружены:", subLoadErr);
                        parsed.subsystems = [];
                    }
                }
            }

            const titlePrefix = isForm ? "Форма" : parsed.objectType;
            const panelTitle = `${titlePrefix}: ${parsed.name}`;
            console.log(`[MetadataPanel.createOrShowForFile] Создание панели с заголовком: ${panelTitle}`);
            
            const panel = vscode.window.createWebviewPanel(
                MetadataPanel.viewType,
                panelTitle,
                column ?? vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")]
                }
            );

            contextStatusBar.text = `1С: ${panelTitle}`;
            contextStatusBar.show();

            console.log(`[MetadataPanel.createOrShowForFile] Панель создана, создание экземпляра MetadataPanel...`);
            const configRoot = path.dirname(path.dirname(filePath));
            new MetadataPanel(panel, extensionUri, [parsed], configRoot);
            console.log(`[MetadataPanel.createOrShowForFile] Панель успешно открыта!`);

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            console.error(`[MetadataPanel] Error opening file ${filePath}:`, error);
            console.error(`[MetadataPanel] Stack trace:`, stack);
            throw new Error(`Не удалось открыть файл ${path.basename(filePath)}: ${message}`);
        } finally {
            statusBarProgress.hide();
        }
    }

    /**
     * Создание панели из TreeItem (интеграция с деревом метаданных)
     */
    public static async createOrShowFromTreeItem(extensionUri: vscode.Uri, item: TreeItem): Promise<void> {
        console.log(`[MetadataPanel.createOrShowFromTreeItem] Начало открытия объекта из дерева`);
        console.log(`[MetadataPanel.createOrShowFromTreeItem] TreeItem:`, {
            id: item.id,
            label: item.label,
            path: item.path,
            configType: item.configType,
            isConfiguration: item.isConfiguration,
            contextValue: item.contextValue
        });

        if (!item.path) {
            const errorMsg = "Путь к объекту не определен";
            console.error(`[MetadataPanel.createOrShowFromTreeItem] ${errorMsg}`);
            vscode.window.showErrorMessage(errorMsg);
            return;
        }

        let filePath: string;
        
        try {
            if (item.configType === 'xml') {
                if (item.isConfiguration) {
                    filePath = path.join(item.path, 'Configuration.xml');
                } else {
                    // Для обычных объектов путь: Catalogs/Номенклатура.xml
                    // Для общих модулей: CommonModules/ИмяМодуля.xml
                    // Для общих форм: CommonForms/ИмяФормы.xml
                    // Для определяемых типов: DefinedTypes/ИмяТипа.xml
                    filePath = item.path + '.xml';
                    
                    // Проверяем, что путь не содержит Forms/ - это форма, а не объект
                    if (item.path.includes('/Forms/')) {
                        const errorMsg = "Для редактирования формы используйте команду 'Открыть форму'";
                        console.warn(`[MetadataPanel.createOrShowFromTreeItem] ${errorMsg}`);
                        vscode.window.showWarningMessage(errorMsg);
                        return;
                    }
                }
            } else {
                // EDT формат - пока не поддерживается редактором
                const errorMsg = "Редактор метаданных поддерживает только XML формат конфигурации";
                console.warn(`[MetadataPanel.createOrShowFromTreeItem] ${errorMsg}`);
                vscode.window.showWarningMessage(errorMsg);
                return;
            }

            // Нормализация пути
            filePath = path.normalize(filePath);
            console.log(`[MetadataPanel.createOrShowFromTreeItem] Определен путь к файлу: ${filePath}`);

            // Проверка существования файла
            if (!fs.existsSync(filePath)) {
                const errorMsg = `Файл не найден: ${filePath}\nПроверьте, что конфигурация выгружена в XML формате.`;
                console.error(`[MetadataPanel.createOrShowFromTreeItem] ${errorMsg}`);
                vscode.window.showErrorMessage(errorMsg);
                return;
            }

            console.log(`[MetadataPanel.createOrShowFromTreeItem] Файл найден, открываем редактор...`);
            await MetadataPanel.createOrShowForFile(extensionUri, filePath);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            console.error(`[MetadataPanel.createOrShowFromTreeItem] Ошибка:`, error);
            console.error(`[MetadataPanel.createOrShowFromTreeItem] Stack trace:`, stack);
            vscode.window.showErrorMessage(`Ошибка открытия редактора: ${message}`);
        }
    }

    /**
     * Сканирование метаданных конфигурации для получения списков регистров и ссылочных типов
     */
    private async scanMetadataForWebview(): Promise<{
        registers: string[];
        referenceTypes: string[];
        informationRegistersSchedule: InformationRegisterScheduleEntry[];
    }> {
        const registers: string[] = [];
        const referenceTypes: string[] = [];
        const informationRegistersSchedule: InformationRegisterScheduleEntry[] = [];
        
        try {
            // Определяем корень конфигурации для сканирования.
            // Возможны два варианта структуры:
            // 1) <root>/<TypeDir>/<ObjectName>.xml
            // 2) <root>/<TypeDir>/<ObjectName>/<ObjectName>.xml
            // В конструкторе мы сохраняем this.configRoot как dirname(dirname(filePath)),
            // что корректно для (1), но для (2) даёт <root>/<TypeDir>.
            //
            // Здесь пробуем сначала this.configRoot. Если внутри нет известных директорий типов,
            // поднимаемся на уровень выше.
            const KNOWN_TYPE_DIRS = new Set([
                "Catalogs",
                "Documents",
                "Enums",
                "Reports",
                "DataProcessors",
                "ChartsOfCharacteristicTypes",
                "ChartsOfAccounts",
                "ChartsOfCalculationTypes",
                "InformationRegisters",
                "AccumulationRegisters",
                "AccountingRegisters",
                "CalculationRegisters",
                "BusinessProcesses",
                "Tasks",
                "Constants",
                "CommonModules",
                "CommonForms",
                "ExternalDataSources",
                "DefinedTypes",
                "ExchangePlans",
                "DocumentJournals",
                "Sequences",
                "DocumentNumerators",
                "WebServices",
                "HTTPServices",
                "Subsystems",
                "Roles",
                "SessionParameters",
                "CommonAttributes",
                "EventSubscriptions",
                "ScheduledJobs",
                "CommonCommands",
                "CommandGroups",
                "CommonTemplates",
                "CommonPictures",
                "WSReferences",
                "Styles",
                "StyleItems",
                "FilterCriteria",
                "FunctionalOptions",
                "FunctionalOptionsParameters",
                "SettingsStorages"
            ]);

            let effectiveRoot = this.configRoot;
            try {
                const entries = fs.readdirSync(effectiveRoot, { withFileTypes: true });
                const hasTypeDirs = entries.some(e => e.isDirectory() && KNOWN_TYPE_DIRS.has(e.name));
                if (!hasTypeDirs) {
                    const parent = path.dirname(effectiveRoot);
                    if (parent && parent !== effectiveRoot) {
                        effectiveRoot = parent;
                    }
                }
            } catch (e) {
                console.warn("[MetadataPanel.scanMetadataForWebview] Не удалось прочитать configRoot, используем его как есть:", this.configRoot, e);
            }

            // Сканируем конфигурацию
            const scanResult = await scanMetadataRoot(effectiveRoot);
            
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
            
            // Маппинг типов метаданных на наборы типов для редактора типов (Ref/Object/Manager/Selection/List и т.п.)
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
                
                // Для всех объектов формируем набор типов для редактора типов (например, CatalogRef.Номенклатура, CatalogObject.Номенклатура и т.д.)
                const typePrefixes = metadataTypeToTypePrefixes[metadataType];
                if (typePrefixes && typePrefixes.length > 0) {
                    for (const prefix of typePrefixes) {
                        referenceTypes.push(`${prefix}.${obj.displayName}`);
                    }
                }
            }
            const refTypeSet = new Set(referenceTypes);
            for (const obj of scanResult.objects) {
                if (obj.objectTypeDir !== "ChartsOfCalculationTypes") {
                    continue;
                }
                const full = "ChartOfCalculationTypes." + obj.displayName;
                if (!refTypeSet.has(full)) {
                    referenceTypes.push(full);
                    refTypeSet.add(full);
                }
            }

            // Сортируем списки
            registers.sort();
            referenceTypes.sort();

            // Независимые регистры сведений с измерениями/ресурсами — для графика регистра расчёта
            const irObjs = scanResult.objects.filter((o) => o.objectTypeDir === "InformationRegisters");
            for (const o of irObjs) {
                if (!validatePath(effectiveRoot, o.mainXmlPath)) {
                    continue;
                }
                try {
                    const parsed = await parseMetadataXml(o.mainXmlPath);
                    if (parsed.properties?.WriteMode !== "Independent") {
                        continue;
                    }
                    if (parsed.properties?.InformationRegisterPeriodicity !== "Nonperiodical") {
                        continue;
                    }
                    const regName =
                        typeof parsed.properties?.Name === "string"
                            ? parsed.properties.Name
                            : typeof parsed.name === "string"
                              ? parsed.name
                              : "";
                    if (!regName) {
                        continue;
                    }
                    const dimAttrs = (parsed.attributes || []).filter((a) => a.childObjectKind === "Dimension");
                    const dimensions = dimAttrs
                        .map((a) => String(a.name || "").trim())
                        .filter(Boolean);
                    const dateDimensions = dimAttrs
                        .filter((a) => isParsedTypeRefDate(a.type))
                        .map((a) => String(a.name || "").trim())
                        .filter(Boolean);
                    const resources = (parsed.attributes || [])
                        .filter((a) => a.childObjectKind === "Resource")
                        .map((a) => String(a.name || "").trim())
                        .filter(Boolean);
                    if (dimensions.length === 0 && resources.length === 0) {
                        continue;
                    }
                    informationRegistersSchedule.push({
                        ref: `InformationRegister.${regName}`,
                        displayName: regName,
                        dimensions,
                        dateDimensions,
                        resources,
                    });
                } catch {
                    /* пропускаем повреждённый XML */
                }
            }
            informationRegistersSchedule.sort((a, b) =>
                a.displayName.localeCompare(b.displayName, "ru")
            );
        } catch (error) {
            console.error('[MetadataPanel.scanMetadataForWebview] Ошибка сканирования метаданных:', error);
        }
        
        return { registers, referenceTypes, informationRegistersSchedule };
    }

    /**
     * Заполняет recorderDocumentNames у объектов-регистров по фактическим RegisterRecords в XML документов.
     */
    private async enrichParsedObjectsRecorderDocuments(): Promise<void> {
        try {
            const map = await buildRegisterRefToDocumentNamesMap(this.configRoot);
            for (const obj of this.parsedObjects) {
                if (!isRegisterRecorderXmlType(obj.xmlObjectType)) {
                    continue;
                }
                const regName =
                    typeof obj.properties?.Name === "string"
                        ? obj.properties.Name
                        : typeof obj.name === "string"
                          ? obj.name
                          : "";
                if (!regName || !obj.xmlObjectType) {
                    continue;
                }
                const ref = `${obj.xmlObjectType}.${regName}`;
                obj.recorderDocumentNames = [...(map.get(ref) || [])];
            }
        } catch (e) {
            console.warn("[MetadataPanel.enrichParsedObjectsRecorderDocuments]", e);
        }
    }

    /**
     * Отправка метаданных в webview
     */
    private async postMetadata() {
        console.log('[MetadataPanel.postMetadata] Вызов postMetadata, webviewReady:', this.webviewReady, 'pendingPostMetadata:', this.pendingPostMetadata);
        
        // Если webview еще не готов, помечаем как ожидающее отправку
        if (!this.webviewReady) {
            console.log('[MetadataPanel.postMetadata] Webview не готов, устанавливаем pendingPostMetadata = true');
            this.pendingPostMetadata = true;
            return;
        }

        console.log('[MetadataPanel.postMetadata] Webview готов, сканируем метаданные...');
        // Сканируем метаданные для получения списков регистров и ссылочных типов
        const metadata = await this.scanMetadataForWebview();

        await this.enrichParsedObjectsRecorderDocuments();
        
        const message: InitMessage = {
            type: "init",
            payload: this.parsedObjects,
            metadata: {
                registers: metadata.registers,
                referenceTypes: metadata.referenceTypes,
                informationRegistersSchedule: metadata.informationRegistersSchedule,
            },
        };
        
        console.log('[MetadataPanel.postMetadata] Отправка сообщения init, объектов:', this.parsedObjects.length);
        this.panel.webview.postMessage(message);
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
  <title>1C Metadata Viewer</title>
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
  </script>
</head>
<body>
  <div id="root"></div>

  <script nonce="${nonce}">
    try {
      window.FIELD_VALUES = ${JSON.stringify(FIELD_VALUES)};
      window.TEXT_INPUT_FIELDS = ${JSON.stringify(TEXT_INPUT_FIELDS)};
      window.METADATA_REF_DISPLAY_MAP = ${JSON.stringify(createRefDisplayMap())};
      window.METADATA_REF_BSL_MAP = ${JSON.stringify(createRefBSLMap())};
      console.log('[MetadataPanel] FIELD_VALUES загружен, полей:', Object.keys(window.FIELD_VALUES).length);
      console.log('[MetadataPanel] TEXT_INPUT_FIELDS загружен, полей:', window.TEXT_INPUT_FIELDS.length);
      console.log('[MetadataPanel] METADATA_REF_DISPLAY_MAP загружен, типов:', Object.keys(window.METADATA_REF_DISPLAY_MAP).length);
      console.log('[MetadataPanel] METADATA_REF_BSL_MAP загружен, типов:', Object.keys(window.METADATA_REF_BSL_MAP).length);
    } catch (err) {
      console.error('[MetadataPanel] Ошибка загрузки справочников:', err);
    }
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    private setWebviewMessageListener(webview: vscode.Webview) {
        const subscription = webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            try {
                // Обработка сообщения "webviewReady" от webview
                if ((message as any).type === 'webviewReady') {
                    console.log('[MetadataPanel.setWebviewMessageListener] Получено сообщение webviewReady, pendingPostMetadata:', this.pendingPostMetadata);
                    this.webviewReady = true;
                    if (this.fallbackTimeout) {
                        clearTimeout(this.fallbackTimeout);
                        this.fallbackTimeout = null;
                    }
                    // Если есть ожидающие данные, отправляем их
                    if (this.pendingPostMetadata) {
                        console.log('[MetadataPanel.setWebviewMessageListener] pendingPostMetadata = true, вызываем postMetadata');
                        this.pendingPostMetadata = false; // Сбрасываем флаг перед вызовом, чтобы избежать повторных вызовов
                        await this.postMetadata();
                    } else {
                        console.log('[MetadataPanel.setWebviewMessageListener] pendingPostMetadata = false, данные уже отправлены или не были запланированы');
                    }
                    return;
                }

                switch (message.type) {
                    case "saveCurrent":
                        await this.handleSave(message.payload);
                        break;
                    case "openSource":
                        await this.handleOpenSource(message.payload);
                        break;
                    case "openFormEditor":
                        await this.handleOpenFormEditor(message.payload);
                        break;
                    case "saveForm":
                        await this.handleSaveForm(message.payload);
                        break;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Ошибка обработки сообщения: ${errorMessage}`);
            }
        });

        this.disposables.push(subscription);
    }

    private async handleOpenSource(payload: { sourcePath: string; context?: any }) {
        try {
            const doc = await vscode.workspace.openTextDocument(payload.sourcePath);
            const editor = await vscode.window.showTextDocument(doc);

            const fullText = doc.getText();
            let idx = -1;

            if (payload.context?.kind === "Attribute") {
                idx = fullText.indexOf(payload.context.name);
            } else if (payload.context?.kind === "Property") {
                idx = fullText.indexOf(`<${payload.context.name}>`);
            }

            if (idx >= 0) {
                const pos = doc.positionAt(idx);
                editor.selection = new vscode.Selection(pos, pos);
                editor.revealRange(new vscode.Range(pos, pos));
            }
        } catch (e: any) {
            vscode.window.showErrorMessage("Не удалось открыть исходник: " + e.message);
        }
    }

    private async handleSave(obj: ParsedMetadataObject) {
        try {
            if (!validatePath(this.configRoot, obj.sourcePath)) {
                throw new Error("Invalid file path: possible path traversal attack");
            }

            const xml = await safeReadFile(obj.sourcePath);
            const parser = createXMLParser();
            const parsed = parser.parse(xml);

            const meta = parsed.MetaDataObject;
            
            const objectTypeMap: Record<string, string> = {
                "Справочник": "Catalog",
                "Документ": "Document",
                "Регистр сведений": "InformationRegister",
                "Регистр накопления": "AccumulationRegister",
                "Регистр бухгалтерии": "AccountingRegister",
                "Регистр расчета": "CalculationRegister",
                "Перечисление": "Enum",
                "Константа": "Constant",
                "Общий модуль": "CommonModule",
                "Отчет": "Report",
                "Обработка": "DataProcessor"
            };
            
            const xmlObjectType = objectTypeMap[obj.objectType] || obj.objectType;
            
            let finalNode = meta[xmlObjectType];
            
            if (!finalNode) {
                const keys = Object.keys(meta).filter(k => k !== "@_xmlns" && k !== "xmlns" && k !== "xmlns:xr");
                const foundKey = keys.find(k => k === obj.objectType || k === xmlObjectType);
                if (foundKey) {
                    finalNode = meta[foundKey];
                }
            }
            
            if (!finalNode) {
                const availableKeys = Object.keys(meta).filter(k => k !== "@_xmlns" && k !== "xmlns" && k !== "xmlns:xr");
                throw new Error(
                    `Тип объекта не найден в MetaDataObject. ` +
                    `Искали: "${obj.objectType}" (XML: "${xmlObjectType}"). ` +
                    `Доступные ключи: ${availableKeys.join(", ")}`
                );
            }

            // Используем текущую структуру из finalNode
            const originalProperties = finalNode.Properties || {};
            
            // Подготавливаем изменения свойств из редактора
            const changedProperties: Record<string, any> = {};
            
            for (const key of Object.keys(obj.properties)) {
                let value = obj.properties[key];
                if (key === "RegisterType" && xmlObjectType === "AccumulationRegister") {
                    const n = normalizeAccumulationRegisterTypeValue(value);
                    if (n !== undefined) {
                        value = n;
                    }
                }

                // Специальная сериализация для RegisterRecords
                if (key === "RegisterRecords") {
                    const records = Array.isArray(value) ? value : [];
                    if (records.length === 0) {
                        changedProperties[key] = undefined; // Помечаем для удаления
                    } else {
                        changedProperties[key] = {
                            "xr:Item": records.map((rec: any) => {
                                const item = rec && rec.Item ? rec.Item : rec;
                                const text = item && (item.text ?? item["#text"] ?? "") || "";
                                const type = item && (item.type || "xr:MDObjectRef");
                                return {
                                    "#text": text,
                                    "xsi:type": type
                                };
                            })
                        };
                    }
                    continue;
                }

                // Специальная сериализация для BasedOn (аналогично RegisterRecords)
                if (key === "BasedOn") {
                    const records = Array.isArray(value) ? value : [];
                    if (records.length === 0) {
                        changedProperties[key] = undefined; // Помечаем для удаления
                    } else {
                        changedProperties[key] = {
                            "xr:Item": records.map((rec: any) => {
                                const item = rec && rec.Item ? rec.Item : rec;
                                const text = item && (item.text ?? item["#text"] ?? "") || "";
                                const type = item && (item.type || "xr:MDObjectRef");
                                return {
                                    "#text": text,
                                    "xsi:type": type
                                };
                            })
                        };
                    }
                    continue;
                }

                // Специальная обработка для многоязычных полей (Synonym, ListPresentation, ToolTip и т.д.)
                // Восстанавливаем структуру v8:item без дублирования текста
                if ((key === "Synonym" || key === "ListPresentation" || key === "ToolTip" || 
                     key === "Title" || key === "Comment" || key === "ExtendedListPresentation" ||
                     key === "ObjectPresentation" || key === "ExtendedObjectPresentation" || key === "Explanation") &&
                    typeof value === 'string') {
                    if (value.trim() === "") {
                        changedProperties[key] = "";
                    } else {
                        // Используем исходную структуру из originalProperties, если она есть
                        const originalValue = originalProperties[key];
                        if (originalValue !== undefined && 
                            typeof originalValue === 'object' && 
                            originalValue !== null &&
                            !Array.isArray(originalValue) &&
                            (originalValue["v8:item"] || originalValue["item"])) {
                            // Копируем исходную структуру и обновляем только content
                            const item = originalValue["v8:item"] || originalValue["item"];
                            changedProperties[key] = deepClone(originalValue);
                            if (changedProperties[key]["v8:item"]) {
                                changedProperties[key]["v8:item"]["v8:content"] = value;
                            } else if (changedProperties[key]["item"]) {
                                changedProperties[key]["item"]["v8:content"] = value;
                            }
                        } else {
                            // Создаем новую структуру
                            changedProperties[key] = {
                                "v8:item": {
                                    "v8:lang": "ru",
                                    "v8:content": value
                                }
                            };
                        }
                    }
                    continue;
                }

                // Специальная обработка для InputByString
                if (key === "InputByString" && value && typeof value === "object" && value.Field) {
                    changedProperties[key] = {
                        "xr:Field": value.Field
                    };
                    continue;
                }

                // Для сложных объектов (Characteristics, ChoiceParameterLinks, ChoiceParameters и т.д.), 
                // которые были сериализованы как JSON или являются сложными объектами,
                // не добавляем их в changedProperties - они будут восстановлены из originalProperties
                if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
                    // Это JSON строка - пропускаем, используем исходную структуру из originalProperties
                    continue;
                }
                // Также пропускаем сложные объекты ChoiceParameterLinks и ChoiceParameters, 
                // которые должны восстанавливаться из originalProperties
                if ((key === "ChoiceParameterLinks" || key === "ChoiceParameters") && 
                    typeof value === 'object' && value !== null) {
                    // Это сложный объект - пропускаем, используем исходную структуру из originalProperties
                    continue;
                }
                
                // Для остальных свойств: сохраняем значение как есть
                changedProperties[key] = value;
            }
            
            // Используем XmlDiffMerge для слияния изменений с оригинальной структурой
            finalNode.Properties = XmlDiffMerge.merge(originalProperties, changedProperties);

            if (!finalNode.ChildObjects) finalNode.ChildObjects = {};

            const xmlAttrs = ensureArray(finalNode.ChildObjects.Attribute || []);
            const updatedAttrs: any[] = [];

            const originalChildObjects = finalNode.ChildObjects || {};
            const originalAttrs = ensureArray(originalChildObjects.Attribute || []);

            // ВАЖНО: obj.attributes может быть undefined для объектов без реквизитов
            const objAttributes = Array.isArray(obj.attributes) ? obj.attributes : [];
            for (const newAttr of objAttributes.filter((a: any) => !a?.childObjectKind || a.childObjectKind === 'Attribute')) {
                // Ищем исходный реквизит по имени
                const originalAttr = originalAttrs.find((a: any) => {
                    const props = a.Properties || a;
                    const existingName = props.Name || props.name || a.name;
                    return existingName === newAttr.name;
                });

                // Используем XmlDiffMerge для слияния изменений реквизита с оригинальной структурой
                const changedAttr = {
                    Properties: {
                        Name: newAttr.name,
                        Type: formatTypeToXmlValue(newAttr.type),
                        ...newAttr.properties
                    }
                };
                const restoredAttr = XmlDiffMerge.merge(originalAttr || {}, changedAttr);
                ensureOptionalMetadataAttributeComment(restoredAttr?.Properties);
                updatedAttrs.push(restoredAttr);
            }

            // Обновляем ChildObjects.Attribute только если поле реально передано из UI
            if (obj.attributes !== undefined) {
                finalNode.ChildObjects.Attribute = updatedAttrs;
            }

            const xmlTabs = ensureArray(finalNode.ChildObjects.TabularSection || []);
            const updatedTabs: any[] = [];

            const originalTabs = ensureArray(originalChildObjects.TabularSection || []);

            // ВАЖНО: obj.tabularSections может быть undefined для объектов без табличных частей
            const objTabularSections = Array.isArray(obj.tabularSections) ? obj.tabularSections : [];
            for (const newTS of objTabularSections) {
                // Ищем исходную табличную часть по имени
                const originalTS = originalTabs.find((t: any) => {
                    const props = t.Properties || t;
                    const existingName = props.Name || props.name || t.name;
                    return existingName === newTS.name;
                });

                // Используем XmlDiffMerge для слияния изменений табличной части с оригинальной структурой
                const changedTS = {
                    Properties: {
                        Name: newTS.name
                    },
                    ChildObjects: {
                        Attribute: (Array.isArray(newTS.attributes) ? newTS.attributes : []).map(a => ({
                            Properties: {
                                Name: a.name,
                                Type: formatTypeToXmlValue(a.type),
                                ...a.properties
                            }
                        }))
                    }
                };
                const restoredTS = XmlDiffMerge.merge(originalTS || {}, changedTS);
                ensureOptionalMetadataCommentOnTabularSectionAttributes(restoredTS);
                updatedTabs.push(restoredTS);
            }

            // Обновляем ChildObjects.TabularSection только если поле реально передано из UI
            if (obj.tabularSections !== undefined) {
                finalNode.ChildObjects.TabularSection = updatedTabs;
            }

            // КРИТИЧНО: Используем исходный XML как строку для максимального сохранения структуры
            // Проблема: fast-xml-parser с preserveOrder: false не сохраняет различие между элементами и атрибутами
            // Решение: работаем с исходным XML как со строкой и применяем изменения через строковые замены
            let updatedXml: string;
            
            if (obj._originalXml) {
                // Используем исходный XML как основу и применяем изменения точечно через строковые замены
                // Это гарантирует сохранение исходной структуры элементов/атрибутов
                try {
                    updatedXml = applyChangesToXmlString(obj._originalXml, obj, xmlObjectType);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error('[MetadataPanel.handleSave] Ошибка применения изменений к XML:', error);
                    if (obj._originalXml) {
                        console.error('[MetadataPanel.handleSave] Исходный XML длина:', obj._originalXml.length);
                    }
                    
                    // Показываем понятное сообщение об ошибке
                    vscode.window.showErrorMessage(
                        `Ошибка применения изменений к XML: ${errorMessage.substring(0, 200)}`,
                        'Показать детали'
                    ).then(selection => {
                        if (selection === 'Показать детали') {
                            const outputChannel = vscode.window.createOutputChannel('Metadata Editor');
                            outputChannel.appendLine('=== Ошибка применения изменений к XML ===');
                            outputChannel.appendLine(`Ошибка: ${errorMessage}`);
                            if (obj._originalXml) {
                                outputChannel.appendLine(`Исходный XML длина: ${obj._originalXml.length} символов`);
                                outputChannel.appendLine('\n=== Начало исходного XML (первые 2000 символов) ===');
                                outputChannel.appendLine(obj._originalXml.substring(0, 2000));
                            } else {
                                outputChannel.appendLine('Исходный XML недоступен');
                            }
                            outputChannel.show();
                        }
                    });
                    
                    throw new Error(`Ошибка применения изменений к XML: ${errorMessage}`);
                }
            } else {
                // Fallback: если _originalXml отсутствует, это ошибка
                // xmldom требует исходный XML для сохранения структуры
                throw new Error('Исходный XML недоступен. Невозможно сохранить изменения без исходного XML.');
            }
            
            // КРИТИЧНО: Проверяем, что updatedXml является строкой
            if (typeof updatedXml !== 'string' || updatedXml.trim().length === 0) {
                const errorMsg = 'Сгенерированный XML пуст или не является строкой';
                vscode.window.showErrorMessage(`Ошибка сохранения: ${errorMsg}`);
                throw new Error(errorMsg);
            }
            
            updatedXml = normalizeXML(updatedXml);
            
            // Дополнительная проверка после нормализации
            if (updatedXml.trim().length === 0) {
                const errorMsg = 'XML стал пустым после нормализации';
                vscode.window.showErrorMessage(`Ошибка сохранения: ${errorMsg}`);
                throw new Error(errorMsg);
            }
            
            // КРИТИЧНО: Валидация XML обязательна перед сохранением
            // При ошибке валидации файл НЕ сохраняется
            try {
                const validation = validateXML(updatedXml);
                if (!validation.valid) {
                    // Логируем ошибку для отладки
                    console.error('[MetadataPanel.handleSave] XML validation failed:', validation.error);
                    console.error('[MetadataPanel.handleSave] XML length:', updatedXml.length);
                    console.error('[MetadataPanel.handleSave] XML preview (first 1000 chars):', updatedXml.substring(0, 1000));
                    
                    // КРИТИЧНО: НЕ сохраняем файл при ошибке валидации
                    // Показываем понятное сообщение об ошибке
                    const errorMessage = validation.error?.includes('addChild') || validation.error?.includes('Cannot read properties')
                        ? 'Ошибка валидации XML: проблема с парсером. Проверьте структуру XML в консоли.'
                        : `Ошибка валидации XML: ${validation.error?.substring(0, 200)}`;
                    
                    vscode.window.showErrorMessage(
                        `Не удалось сохранить изменения: ${errorMessage}`,
                        'Показать детали'
                    ).then(selection => {
                        if (selection === 'Показать детали') {
                            // Открываем output channel с деталями ошибки
                            const outputChannel = vscode.window.createOutputChannel('Metadata Editor');
                            outputChannel.appendLine('=== Ошибка валидации XML ===');
                            outputChannel.appendLine(`Ошибка: ${validation.error}`);
                            outputChannel.appendLine(`Длина XML: ${updatedXml.length} символов`);
                            outputChannel.appendLine('\n=== Начало XML (первые 2000 символов) ===');
                            outputChannel.appendLine(updatedXml.substring(0, 2000));
                            outputChannel.show();
                        }
                    });
                    
                    throw new Error(`XML validation failed: ${validation.error}`);
                }
            } catch (validationError) {
                // Если сама валидация упала с ошибкой или валидация не прошла
                if (validationError instanceof Error && validationError.message.includes('XML validation failed')) {
                    // Это ошибка валидации - пробрасываем дальше
                    throw validationError;
                }
                
                // Если это другая ошибка валидации
                console.error('[MetadataPanel.handleSave] XML validation error:', validationError);
                const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
                
                vscode.window.showErrorMessage(
                    `Ошибка при валидации XML: ${errorMessage.substring(0, 200)}`,
                    'Показать детали'
                ).then(selection => {
                    if (selection === 'Показать детали') {
                        const outputChannel = vscode.window.createOutputChannel('Metadata Editor');
                        outputChannel.appendLine('=== Ошибка валидации XML ===');
                        outputChannel.appendLine(`Ошибка: ${errorMessage}`);
                        outputChannel.appendLine(`Длина XML: ${updatedXml.length} символов`);
                        outputChannel.show();
                    }
                });
                
                throw new Error(`XML validation error: ${errorMessage}`);
            }

            // Валидация структуры по JSON-схеме (если включена)
            const structureValidationEnabled = vscode.workspace.getConfiguration('metadataViewer').get<boolean>('structureValidationEnabled', true);
            if (structureValidationEnabled) {
                const structureResult = validateXmlStructure(updatedXml, {
                    extensionPath: this.extensionUri.fsPath,
                    filePath: obj.sourcePath,
                    xmlObjectType,
                    rootTag: 'MetaDataObject'
                });
                if (!structureResult.valid && structureResult.errors && structureResult.errors.length > 0) {
                    const errorMessage = structureResult.errors.slice(0, 3).join('; ');
                    vscode.window.showErrorMessage(
                        `Ошибка структуры XML. Файл: ${obj.sourcePath} — ${errorMessage}`,
                        'Показать детали'
                    ).then(selection => {
                        if (selection === 'Показать детали') {
                            const outputChannel = vscode.window.createOutputChannel('Metadata Editor');
                            outputChannel.appendLine('=== Ошибка валидации структуры XML ===');
                            outputChannel.appendLine(`Файл: ${obj.sourcePath}`);
                            structureResult.errors?.forEach(e => outputChannel.appendLine(e));
                            outputChannel.appendLine(`\nДлина XML: ${updatedXml.length} символов`);
                            outputChannel.appendLine('\n=== Начало XML (первые 2000 символов) ===');
                            outputChannel.appendLine(updatedXml.substring(0, 2000));
                            outputChannel.show();
                        }
                    });
                    throw new Error(`XML structure validation failed: ${errorMessage}`);
                }
            }
            
            // КРИТИЧНО: Сохраняем файл только если валидация прошла успешно
            try {
                await safeWriteFile(obj.sourcePath, updatedXml);
                
                // После сохранения объекта обновляем ConfigDumpInfo.xml, чтобы дамп "увидел" новые реквизиты/ТЧ.
                // Это особенно важно при добавлении новых элементов (Attribute/TabularSection/Attribute ТЧ),
                // т.к. ConfigDumpInfo содержит отдельные записи для них.
                try {
                    const configDumpInfoPath = path.join(this.configRoot, "ConfigDumpInfo.xml");
                    if (validatePath(this.configRoot, configDumpInfoPath)) {
                        const configDumpInfoXml = await safeReadFile(configDumpInfoPath);
                        const patched = patchConfigDumpInfoForChildObjects({
                            configDumpInfoXml,
                            xmlObjectType,
                            objectName: obj.name,
                            updatedObjectXml: updatedXml
                        });
                        if (patched.changed) {
                            await createBackup(configDumpInfoPath);
                            await safeWriteFile(configDumpInfoPath, patched.updatedXml);
                            console.log(`[MetadataPanel.handleSave] ConfigDumpInfo.xml обновлён: добавлено записей: ${patched.addedCount}, удалено: ${patched.removedCount}`);
                        }
                    }
                } catch (e: any) {
                    console.error("[MetadataPanel.handleSave] Не удалось обновить ConfigDumpInfo.xml:", e);
                    vscode.window.showWarningMessage(
                        `Объект сохранён, но ConfigDumpInfo.xml не обновлён: ${String(e?.message || e).substring(0, 200)}`
                    );
                }

                // Автоматически добавляем объект в Configuration.xml, если его там ещё нет
                try {
                    const configResult = await ensureMetadataInConfigurationXml({
                        configRoot: this.configRoot,
                        xmlObjectType,
                        objectName: obj.name,
                    });
                    if (configResult.changed) {
                        console.log(`[MetadataPanel.handleSave] Configuration.xml обновлён: добавлен ${xmlObjectType}.${obj.name}`);
                        CommitFileLogger.getInstance().logChangedFile(path.join(this.configRoot, "Configuration.xml"));
                    }
                } catch (e: any) {
                    console.warn("[MetadataPanel.handleSave] Не удалось обновить Configuration.xml:", e);
                }

                try {
                    const regXt = obj.xmlObjectType || xmlObjectType;
                    if (isRegisterRecorderXmlType(regXt) && Array.isArray(obj.recorderDocumentNames)) {
                        const allowIrSync =
                            regXt !== "InformationRegister" ||
                            obj.properties?.WriteMode === "RecorderSubordinate";
                        if (allowIrSync) {
                            const regName =
                                typeof obj.properties?.Name === "string"
                                    ? obj.properties.Name
                                    : typeof obj.name === "string"
                                      ? obj.name
                                      : "";
                            if (regName) {
                                const syncResult = await syncRegisterRecorderDocuments({
                                    configRoot: this.configRoot,
                                    registerXmlType: regXt,
                                    registerName: regName,
                                    selectedDocumentNames: obj.recorderDocumentNames,
                                });
                                for (const p of syncResult.updatedFiles) {
                                    CommitFileLogger.getInstance().logChangedFile(p);
                                }
                                if (syncResult.errors.length > 0) {
                                    vscode.window.showWarningMessage(
                                        `Объект сохранён; обновление RegisterRecords в документах: ${syncResult.errors
                                            .slice(0, 2)
                                            .join("; ")}`
                                    );
                                }
                            }
                        }
                    }
                } catch (syncDocErr: unknown) {
                    const m = syncDocErr instanceof Error ? syncDocErr.message : String(syncDocErr);
                    console.error("[MetadataPanel.handleSave] sync RegisterRecords в документах:", syncDocErr);
                    vscode.window.showWarningMessage(
                        `Объект сохранён; не удалось обновить документы (RegisterRecords): ${m.substring(0, 200)}`
                    );
                }

                vscode.window.showInformationMessage("Изменения объекта успешно сохранены.");
                
                // Логируем измененный файл в Commit.txt
                CommitFileLogger.getInstance().logChangedFile(obj.sourcePath);

                if (
                    obj.subsystems !== undefined &&
                    shouldOfferSubsystemMembership(obj.sourcePath, obj.xmlObjectType)
                ) {
                    const mdRefType = obj.xmlObjectType ?? xmlObjectType;
                    const mdRef = `${mdRefType}.${obj.name}`;
                    try {
                        const changedSubsystemFiles = await applySubsystemMembershipChanges({
                            configRoot: this.configRoot,
                            mdRef,
                            rows: obj.subsystems,
                            extensionPath: this.extensionUri.fsPath,
                            validateStructure: structureValidationEnabled,
                        });
                        for (const p of changedSubsystemFiles) {
                            CommitFileLogger.getInstance().logChangedFile(p);
                        }
                        if (changedSubsystemFiles.length > 0) {
                            clearSubsystemContentCache();
                        }
                    } catch (subErr: unknown) {
                        const subMsg = subErr instanceof Error ? subErr.message : String(subErr);
                        vscode.window.showWarningMessage(
                            `Объект сохранён, но обновление подсистем не выполнено: ${subMsg.substring(0, 250)}`
                        );
                    }
                }
            } catch (writeError) {
                const errorMessage = writeError instanceof Error ? writeError.message : String(writeError);
                console.error('[MetadataPanel.handleSave] Ошибка записи файла:', writeError);
                
                vscode.window.showErrorMessage(
                    `Ошибка записи файла: ${errorMessage}`,
                    'Показать детали'
                ).then(selection => {
                    if (selection === 'Показать детали') {
                        const outputChannel = vscode.window.createOutputChannel('Metadata Editor');
                        outputChannel.appendLine('=== Ошибка записи файла ===');
                        outputChannel.appendLine(`Путь: ${obj.sourcePath}`);
                        outputChannel.appendLine(`Ошибка: ${errorMessage}`);
                        outputChannel.show();
                    }
                });
                
                throw new Error(`Ошибка записи файла: ${errorMessage}`);
            }

            // Обновляем локальный кэш/дерево метаданных для конфигурации, содержащей этот объект
            try {
                await vscode.commands.executeCommand('metadataViewer.refreshObjectByPath', obj.sourcePath);
            } catch (e) {
                console.warn('[MetadataPanel.handleSave] Не удалось обновить дерево метаданных:', e);
            }
            
            // Обновляем объект в массиве, включая _originalXml для правильного отображения в редакторе
            const index = this.parsedObjects.findIndex(o => o.sourcePath === obj.sourcePath);
            if (index >= 0) {
                const updatedObj = {
                    ...obj,
                    _originalXml: updatedXml  // Обновляем исходный XML для правильного отображения в редакторе
                };
                this.parsedObjects[index] = updatedObj;
                
                // Отправляем обновленный объект в webview для обновления XML контента
                this.panel.webview.postMessage({
                    type: 'objectUpdated',
                    payload: updatedObj
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Ошибка сохранения: ${message}`);
            throw error;
        }
    }

    private async handleOpenFormEditor(payload: { objectPath: string; formName: string }) {
        try {
            const formPath = this.getFormXmlPath(payload.objectPath, payload.formName);
            
            if (!formPath || !fs.existsSync(formPath)) {
                vscode.window.showErrorMessage(`Файл формы не найден: ${formPath}`);
                return;
            }

            const formData = await parseFormXmlFull(formPath);

            this.panel.webview.postMessage({
                type: "formLoaded",
                payload: formData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Ошибка загрузки формы: ${errorMessage}`);
        }
    }

    private getFormXmlPath(objectPath: string, formName: string): string | null {
        try {
            const objectDir = path.dirname(objectPath);
            const objectName = path.basename(objectPath, '.xml');
            const objectFolder = path.join(objectDir, objectName);
            
            const formXmlPath = path.join(objectFolder, "Forms", formName, "Ext", "Form.xml");
            
            if (fs.existsSync(formXmlPath)) {
                return formXmlPath;
            }

            const formsDir = path.join(objectFolder, "Forms");
            if (fs.existsSync(formsDir)) {
                const formDirs = fs.readdirSync(formsDir, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);

                for (const dir of formDirs) {
                    const altPath = path.join(formsDir, dir, "Ext", "Form.xml");
                    if (fs.existsSync(altPath)) {
                        return altPath;
                    }
                }
            }

            return null;
        } catch (error) {
            console.error("Ошибка при определении пути к форме:", error);
            return null;
        }
    }

    private async handleSaveForm(formData: ParsedFormFull) {
        try {
            const formPath = formData.sourcePath;
            
            if (!formPath || !fs.existsSync(formPath)) {
                vscode.window.showErrorMessage(`Файл формы не найден: ${formPath}`);
                return;
            }

            await this.saveFormToXml(formData, formPath);

            vscode.window.showInformationMessage("Форма успешно сохранена.");
            
            // Логируем измененный файл в Commit.txt
            CommitFileLogger.getInstance().logChangedFile(formPath);

            // Обновляем локальный кэш/дерево метаданных для конфигурации, содержащей эту форму
            try {
                await vscode.commands.executeCommand('metadataViewer.refreshObjectByPath', formPath);
            } catch (e) {
                console.warn('[MetadataPanel.handleSaveForm] Не удалось обновить дерево метаданных для формы:', e);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Ошибка сохранения формы: ${errorMessage}`);
        }
    }

    private async saveFormToXml(formData: ParsedFormFull, formPath: string): Promise<void> {
        const xml = await safeReadFile(formPath);
        
        // Используем xmldom для точного сохранения структуры XML
        const updatedXml = applyFormChangesToXmlStringWithDom(xml, formData);
        const normalizedXml = normalizeXML(updatedXml);

        const validation = validateXML(normalizedXml);
        if (!validation.valid) {
            throw new Error(validation.error ?? "Результат сохранения не является валидным XML");
        }

        const structureValidationEnabled = vscode.workspace.getConfiguration('metadataViewer').get<boolean>('structureValidationEnabled', true);
        if (structureValidationEnabled) {
            const structureResult = validateXmlStructure(normalizedXml, {
                extensionPath: this.extensionUri.fsPath,
                filePath: formPath,
                rootTag: 'Form'
            });
            if (!structureResult.valid && structureResult.errors?.length) {
                const errorMessage = summarizeStructureValidationErrors(structureResult.errors);
                throw new Error(`Ошибка структуры XML формы. Файл: ${formPath} — ${errorMessage}`);
            }
        }

        await fs.promises.writeFile(formPath, normalizedXml, 'utf8');
    }

    public dispose() {
        contextStatusBar.hide();
        if (this.fallbackTimeout) {
            clearTimeout(this.fallbackTimeout);
            this.fallbackTimeout = null;
        }
        
        while (this.disposables.length) {
            const item = this.disposables.pop();
            if (item) {
                item.dispose();
            }
        }
        
        this.panel.dispose();
    }
}

function getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function ensureArray(val: any): any[] {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
}

/**
 * Объединяет изменения с исходной структурой XML, сохраняя формат (атрибут/элемент) для неизмененных свойств
 * 
 * @param originalStructure Исходная структура (сохраняет информацию о формате)
 * @param changes Измененные свойства из редактора
 * @returns Объединенная структура с сохранением исходного формата для неизмененных свойств
 */
function mergeWithOriginalStructure(originalStructure: any, changes: Record<string, any>): any {
    if (!originalStructure) {
        // Если исходной структуры нет, используем normalizeToElements как fallback
        return normalizeToElements(changes);
    }
    
    // Создаем копию исходной структуры
    const merged = JSON.parse(JSON.stringify(originalStructure));
    
    // Удаляем служебные поля (@-префикс) из копии, они будут добавлены билдером
    for (const key of Object.keys(merged)) {
        if (key.startsWith('@')) {
            // Сохраняем атрибуты, но они не должны влиять на логику
        }
    }
    
    // Обновляем только измененные свойства
    for (const [key, newValue] of Object.entries(changes)) {
        if (newValue === undefined) {
            // Удаляем свойство, если оно было удалено
            delete merged[key];
            continue;
        }
        
        // Определяем формат исходного свойства
        const originalValue = merged[key];
        const wasSimpleValue = originalValue !== undefined && 
            (typeof originalValue === 'string' || typeof originalValue === 'number' || typeof originalValue === 'boolean');
        const wasObject = originalValue !== undefined && typeof originalValue === 'object' && originalValue !== null;
        
        // Если исходное свойство было простым значением (возможно атрибут), 
        // и новое значение тоже простое - сохраняем как простое значение
        // Если исходное было объектом (элемент) - сохраняем как элемент
        if (wasSimpleValue && (typeof newValue === 'string' || typeof newValue === 'number' || typeof newValue === 'boolean')) {
            // Сохраняем как простое значение (будет атрибутом в XML билдере)
            merged[key] = newValue;
        } else if (wasObject && typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
            // Если исходное было объектом и новое тоже объект - сохраняем как есть
            merged[key] = newValue;
        } else {
            // Сохраняем как элемент (объект с #text или сложная структура)
            if (typeof newValue === 'string' || typeof newValue === 'number' || typeof newValue === 'boolean') {
                merged[key] = newValue === "" ? "" : { "#text": String(newValue) };
            } else if (newValue === null || newValue === undefined) {
                merged[key] = "";
            } else {
                merged[key] = newValue;
            }
        }
    }
    
    return merged;
}

/**
 * Нормализует объект так, чтобы все простые свойства сохранялись как элементы, а не атрибуты
 * Используется для Properties, StandardAttributes и других узлов
 */
function normalizeToElements(obj: any): any {
    if (obj === null || obj === undefined) {
        return "";
    }
    
    if (typeof obj !== 'object') {
        // Примитив: оборачиваем в структуру для элемента
        return obj === "" ? "" : { "#text": String(obj) };
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => normalizeToElements(item));
    }
    
    // Если объект уже имеет структуру { "#text": ... }, оставляем как есть
    if (obj["#text"] !== undefined && Object.keys(obj).length === 1) {
        return obj;
    }
    
    // Если объект имеет структуру { "#text": ..., "xsi:type": ... } или подобную, оставляем как есть
    if (obj["#text"] !== undefined) {
        // Объект с текстовым содержимым и атрибутами - нормализуем только вложенные объекты
        const normalized: any = { "#text": obj["#text"] };
        for (const [key, value] of Object.entries(obj)) {
            if (key !== "#text" && !key.startsWith('@')) {
                normalized[key] = normalizeToElements(value);
            } else if (key.startsWith('@')) {
                normalized[key] = value;
            }
        }
        return normalized;
    }
    
    // Объект: рекурсивно нормализуем все свойства
    const normalized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
        // Пропускаем служебные поля (атрибуты)
        if (key.startsWith('@')) {
            normalized[key] = value;
            continue;
        }
        
        // Специальные случаи, которые уже правильно структурированы
        if (key === "v8:item" || key === "xr:Item" || key === "xr:Field" || 
            key === "v8:Type" || key === "v8:StringQualifiers" || 
            key === "v8:NumberQualifiers" || key === "v8:DateQualifiers" ||
            key === "Type" || key === "OneOf" || key === "ArrayOf" ||
            key === "StandardAttribute" || key === "xr:StandardAttribute") {
            normalized[key] = normalizeToElements(value);
            continue;
        }
        
        // Для остальных свойств: нормализуем значение
        normalized[key] = normalizeToElements(value);
    }
    
    return normalized;
}

function formatTypeToXmlValue(type: any): any {
    if (!type) return null;

    const kind = type.kind || "";
    const details = type.details || {};
    
    const hasNamespacePrefix = /^(xs|cfg|xsi):/.test(kind);
    
    let typeObj: any = {};
    
    if (hasNamespacePrefix) {
        typeObj["v8:Type"] = kind;
    } else {
        switch (kind) {
            case "String":
                typeObj["v8:Type"] = "xs:string";
                break;
            case "Number":
                typeObj["v8:Type"] = "xs:decimal";
                break;
            case "Boolean":
                typeObj["v8:Type"] = "xs:boolean";
                break;
            case "Date":
                typeObj["v8:Type"] = "xs:dateTime";
                break;
            case "GUID":
            case "UUID":
                typeObj["v8:Type"] = "xs:string";
                break;
            case "ArrayOf":
                return {
                    ArrayOf: {
                        Type: formatTypeToXmlValue(type.details)
                    }
                };
            case "OneOf":
                return {
                    OneOf: {
                        Type: (type.details || []).map((t: any) => formatTypeToXmlValue(t))
                    }
                };
            case "TypeDescription":
                return {
                    TypeDescription: type.details || {}
                };
            case "TypeSet":
                // TypeSet - это определяемый тип, например cfg:DefinedType.КонтактВзаимодействия
                const typeSetValue = details.TypeSet || kind;
                return {
                    "v8:TypeSet": typeSetValue
                };
            default:
                if (kind.includes('.')) {
                    if (!kind.startsWith('cfg:')) {
                        typeObj["v8:Type"] = `cfg:${kind}`;
                    } else {
                        typeObj["v8:Type"] = kind;
                    }
                } else {
                    typeObj["v8:Type"] = kind;
                }
        }
    }
    
    if (details.StringQualifiers) {
        typeObj["v8:StringQualifiers"] = {
            "v8:Length": details.StringQualifiers.Length,
            "v8:AllowedLength": details.StringQualifiers.AllowedLength
        };
    }
    
    if (details.NumberQualifiers) {
        typeObj["v8:NumberQualifiers"] = {
            "v8:Digits": details.NumberQualifiers.Digits,
            "v8:FractionDigits": details.NumberQualifiers.FractionDigits,
            "v8:AllowedSign": details.NumberQualifiers.AllowedSign
        };
    }
    
    if (details.DateQualifiers) {
        typeObj["v8:DateQualifiers"] = {
            "v8:DateFractions": details.DateQualifiers.DateFractions
        };
    }
    
    return typeObj;
}


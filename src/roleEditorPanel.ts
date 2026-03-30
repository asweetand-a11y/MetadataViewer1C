/**
 * Панель редактора прав роли 1С (Rights.xml)
 * Аналог редактора ролей в конфигураторе 1С:Предприятие
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseRoleRightsXml, ParsedRoleRights } from './xmlParsers/roleParser';
import { serializeRoleRightsXml } from './xmlParsers/roleSerializer';
import { normalizeXML, validateXML } from './utils/xmlUtils';
import { validateXmlStructure, summarizeStructureValidationErrors } from './validation/xmlStructureValidator';
import { scanMetadataRoot, MetadataFileRef } from './metadata_utils/MetadataScanner';
import { CommitFileLogger } from './utils/commitFileLogger';
import { statusBarProgress, contextStatusBar } from './extension';

/** Нonce для CSP */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/** Состояние панели редактора ролей */
interface RoleEditorPanelState {
  /** Разобранные права роли */
  rights: ParsedRoleRights;
  /** Путь к файлу Rights.xml */
  rightsPath: string;
  /** Корень конфигурации */
  configRoot: string;
  /** Имя роли */
  roleName: string;
}

/** Метаданные объекта для левой панели */
export interface MetadataObjectInfo {
  /** Тип объекта (Catalog, Document, ...) */
  objectType: string;
  /** Имя объекта */
  name: string;
  /** Полное имя (Catalog.Номенклатура) */
  fullName: string;
}

/**
 * Маппинг директорий в типы объектов метаданных
 */
const DIR_TO_TYPE: Record<string, string> = {
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
  'ExchangePlans': 'ExchangePlan',
  'DocumentJournals': 'DocumentJournal',
  'Sequences': 'Sequence',
  'Subsystems': 'Subsystem',
  'CommonForms': 'CommonForm',
  'CommonCommands': 'CommonCommand',
  'FilterCriteria': 'FilterCriterion',
  'FunctionalOptions': 'FunctionalOption',
};

/**
 * Панель редактора прав роли 1С
 */
export class RoleEditorPanel {
  public static readonly viewType = 'metadataViewer.roleEditorPanel';

  private static panels: Map<string, RoleEditorPanel> = new Map();

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private state: RoleEditorPanelState;

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    state: RoleEditorPanelState
  ) {
    this.panel = panel;
    this.state = state;

    this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);
    this.setWebviewMessageListener(this.panel.webview);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /**
   * Открывает или показывает редактор прав роли
   * @param extensionUri URI расширения
   * @param rolePath Путь к директории роли (например: E:\DATA1C\src\cf\Roles\ПолныеПрава)
   * @param roleName Имя роли для отображения
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    rolePath: string,
    roleName: string
  ): Promise<void> {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    const rightsPath = path.join(rolePath, 'Ext', 'Rights.xml');

    // Определяем configRoot (поднимаемся на 2 уровня: Roles/ИмяРоли -> configRoot)
    const configRoot = path.dirname(path.dirname(rolePath));

    const panelKey = rightsPath;

    const existingPanel = RoleEditorPanel.panels.get(panelKey);
    if (existingPanel) {
      existingPanel.panel.reveal(column);
      return;
    }

    statusBarProgress.show();
    statusBarProgress.text = '$(sync~spin) Загрузка редактора прав…';

    try {
      let rights: ParsedRoleRights;

      if (fs.existsSync(rightsPath)) {
        try {
          rights = await parseRoleRightsXml(rightsPath);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Ошибка при чтении Rights.xml: ${msg}`);
          return;
        }
      } else {
        // Создаём пустые права
        rights = {
          setForNewObjects: false,
          setForAttributesByDefault: true,
          independentRightsOfChildObjects: false,
          objects: [],
          restrictionTemplates: [],
          originalXml: '',
        };
      }

      const panel = vscode.window.createWebviewPanel(
        RoleEditorPanel.viewType,
        `Права: ${roleName}`,
        column || vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
        }
      );

      const rolePanel = new RoleEditorPanel(panel, extensionUri, {
        rights,
        rightsPath,
        configRoot,
        roleName,
      });

      contextStatusBar.text = `1С: Права — ${roleName}`;
      contextStatusBar.show();

      RoleEditorPanel.panels.set(panelKey, rolePanel);
    } finally {
      statusBarProgress.hide();
    }
  }

  /**
   * Отправляет начальные данные в webview
   */
  private async postInitialData(): Promise<void> {
    const metadataObjects = await this.scanMetadataObjects();

    this.panel.webview.postMessage({
      type: 'init',
      payload: {
        rights: this.state.rights,
        roleName: this.state.roleName,
        metadataObjects,
      },
    });
  }

  /**
   * Сканирует объекты метаданных конфигурации для левой панели
   */
  private async scanMetadataObjects(): Promise<MetadataObjectInfo[]> {
    const result: MetadataObjectInfo[] = [];

    try {
      const scanResult = await scanMetadataRoot(this.state.configRoot);

      for (const obj of scanResult.objects) {
        const objectType = DIR_TO_TYPE[obj.objectTypeDir];
        if (!objectType) continue;

        result.push({
          objectType,
          name: obj.displayName,
          fullName: `${objectType}.${obj.displayName}`,
        });
      }

      // Сортируем по типу, затем по имени
      result.sort((a, b) => {
        if (a.objectType !== b.objectType) return a.objectType.localeCompare(b.objectType);
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('[RoleEditorPanel.scanMetadataObjects] Ошибка сканирования:', error);
    }

    return result;
  }

  /**
   * Обработчик сообщений от webview
   */
  private setWebviewMessageListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(async (message: any) => {
      try {
        switch (message.type) {
          case 'webviewReady':
          case 'requestData':
            await this.postInitialData();
            break;
          case 'save':
            await this.handleSave(message.payload);
            break;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[RoleEditorPanel] Ошибка обработки сообщения:', error);
        vscode.window.showErrorMessage(`Ошибка: ${msg}`);
      }
    });
  }

  /**
   * Сохраняет права роли в файл Rights.xml
   */
  private async handleSave(rights: ParsedRoleRights): Promise<void> {
    try {
      let xmlContent = serializeRoleRightsXml(rights);
      xmlContent = normalizeXML(xmlContent);

      const validation = validateXML(xmlContent);
      if (!validation.valid) {
        throw new Error(validation.error ?? 'Результат сохранения не является валидным XML');
      }

      const structureValidationEnabled = vscode.workspace
        .getConfiguration('metadataViewer')
        .get<boolean>('structureValidationEnabled', true);

      if (structureValidationEnabled) {
        const structureResult = validateXmlStructure(xmlContent, {
          extensionPath: this.extensionUri.fsPath,
          filePath: this.state.rightsPath,
          rootTag: 'Rights',
        });
        if (!structureResult.valid && structureResult.errors?.length) {
          const errorMessage = summarizeStructureValidationErrors(structureResult.errors);
          throw new Error(`Ошибка структуры XML: ${errorMessage}`);
        }
      }

      // Создаём директорию Ext если её нет
      const extDir = path.dirname(this.state.rightsPath);
      if (!fs.existsSync(extDir)) {
        fs.mkdirSync(extDir, { recursive: true });
      }

      // Добавляем BOM для 1С
      let xmlToWrite = xmlContent;
      if (xmlContent.charCodeAt(0) !== 0xfeff) {
        const bomBuffer = Buffer.from([0xef, 0xbb, 0xbf]);
        const contentBuffer = Buffer.from(xmlContent, 'utf8');
        xmlToWrite = Buffer.concat([bomBuffer, contentBuffer]).toString('utf8');
      }

      fs.writeFileSync(this.state.rightsPath, xmlToWrite, 'utf8');

      CommitFileLogger.getInstance().logChangedFile(this.state.rightsPath);

      this.state.rights = { ...rights, originalXml: xmlToWrite };

      vscode.window.showInformationMessage(`Права роли «${this.state.roleName}» успешно сохранены`);

      this.panel.webview.postMessage({
        type: 'saved',
        payload: { success: true },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Ошибка при сохранении прав роли: ${msg}`);
      this.panel.webview.postMessage({
        type: 'saved',
        payload: { success: false, error: msg },
      });
    }
  }

  /**
   * Генерирует HTML для webview
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'metadataEditor.bundle.js')
    );

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
  <title>Редактор прав роли</title>
  <script nonce="${nonce}">
    (function() {
      function interceptWebpackRequireE() {
        if (window.__webpack_require__ && window.__webpack_require__.e) {
          const originalE = window.__webpack_require__.e;
          window.__webpack_require__.e = function(chunkId) {
            return Promise.reject(new Error('Chunk loading disabled for webview: ' + chunkId));
          };
          return true;
        }
        return false;
      }
      if (!interceptWebpackRequireE()) {
        document.addEventListener('DOMContentLoaded', interceptWebpackRequireE);
        window.addEventListener('load', interceptWebpackRequireE);
        const interval = setInterval(function() {
          if (interceptWebpackRequireE()) clearInterval(interval);
        }, 10);
        setTimeout(function() { clearInterval(interval); }, 5000);
      }
    })();
    window.__APP_MODE__ = 'roleEditor';
  </script>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    RoleEditorPanel.panels.delete(this.state.rightsPath);
    contextStatusBar.hide();
    this.panel.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

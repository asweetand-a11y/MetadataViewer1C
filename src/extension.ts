'use strict';

import * as vscode from 'vscode';
import { MetadataView } from './metadataView';
import * as fs from 'fs';
import { FormPreviewer } from './formPreviewer';
import { DcsEditor } from './dcsEditor';
import { TreeItem } from './ConfigurationFormats/utils';
// Added imports for autogen-bsl features
import { initBslCursorFeatures } from './autogen-bsl/init';
import { CommitFileLogger } from './utils/commitFileLogger';
import { BookmarkManager } from './utils/bookmarkManager';
import { validateMetadataXmlFile } from './validation/metadataXmlValidator';

// Output channel для логов расширения
export const outputChannel = vscode.window.createOutputChannel('1C Metadata Viewer');

/** Общий StatusBarItem для прогресса (генерация кода, загрузка редакторов и т.п.) */
export const statusBarProgress = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);

/** Контекстный StatusBarItem: выбранный узел дерева или активная панель (СКД, макет, форма, предопределённые) */
export const contextStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101);

async function runValidateMetadataXml(filePath: string, extensionPath: string): Promise<void> {
	const result = validateMetadataXmlFile(filePath, extensionPath);
	const channel = outputChannel;
	channel.clear();
	channel.appendLine(`=== Валидация XML: ${filePath} ===\n`);
	if (result.errors.length > 0) {
		channel.appendLine('ОШИБКИ:');
		result.errors.forEach(e => channel.appendLine(`  ✗ ${e}`));
		channel.appendLine('');
	}
	if (result.warnings.length > 0) {
		channel.appendLine('ПРЕДУПРЕЖДЕНИЯ:');
		result.warnings.forEach(w => channel.appendLine(`  ⚠ ${w}`));
		channel.appendLine('');
	}
	channel.appendLine(result.valid ? 'Результат: OK' : `Результат: ОШИБКА (${result.errors.length} ошибок)`);
	channel.show();
	if (!result.valid) {
		vscode.window.showErrorMessage(`Валидация XML: ${result.errors[0] ?? 'обнаружены ошибки'}`);
	} else if (result.warnings.length > 0) {
		vscode.window.showInformationMessage(`Валидация XML: OK, ${result.warnings.length} предупреждений`);
	} else {
		vscode.window.showInformationMessage('Валидация XML: OK');
	}
}

export function activate(context: vscode.ExtensionContext) {
	try {
		outputChannel.appendLine('=== Расширение "1C Metadata Viewer" активировано ===');
		outputChannel.show(true); // Показываем панель Output автоматически

		context.subscriptions.push(statusBarProgress);
		context.subscriptions.push(contextStatusBar);

		// Optional extra features ported from bsl-cursor (code actions, diff peek, metadata scan, AST rename)
		initBslCursorFeatures(context);
	} catch (error) {
		outputChannel.appendLine(`Ошибка при инициализации расширения: ${error}`);
		vscode.window.showErrorMessage(`Ошибка активации расширения: ${error}`);
		throw error;
	}

	// Инициализация менеджера закладок
	const bookmarkManager = BookmarkManager.getInstance();
	context.subscriptions.push({ dispose: () => bookmarkManager.dispose() });

	// Кнопка/команда "Настройки" (по аналогии с PlatformTools)
	vscode.commands.registerCommand('metadataViewer.settings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${context.extension.id}`);
	});

	vscode.commands.registerCommand('metadataViewer.openAppModule', (node: TreeItem) => {
		let filePath = '';
		if (node.configType === 'xml') {
			filePath = node.path + '/Ext/ManagedApplicationModule.bsl';
		} else {
			filePath = node.path + '/Configuration/ManagedApplicationModule.bsl';
		}
		OpenFile(filePath);
	});
	vscode.commands.registerCommand('metadataViewer.openSessionModule', (node: TreeItem) => {
		let filePath = '';
		if (node.configType === 'xml') {
			filePath = node.path + '/Ext/SessionModule.bsl';
		} else {
			filePath = node.path + '/Configuration/SessionModule.bsl';
		}
		OpenFile(filePath);
	});
	vscode.commands.registerCommand('metadataViewer.openExternalConnectionModule', (node: TreeItem) => {
		// TODO: Имя модуля проверить. Может быть не верным.
		let filePath = '';
		if (node.configType === 'xml') {
			filePath = node.path + '/Ext/ExternalConnectionModule.bsl';
		} else {
			filePath = node.path + '/Configuration/ExternalConnectionModule.bsl';
		}
		OpenFile(filePath);
	});
	vscode.commands.registerCommand('metadataViewer.openObjectModule', (node: TreeItem) => {
		let filePath = '';
		if (node.configType === 'xml') {
			filePath = node.path + '/Ext/ObjectModule.bsl';
		} else {
			filePath = node.path + '/ObjectModule.bsl';
		}
		OpenFile(filePath);
	});
	vscode.commands.registerCommand('metadataViewer.openManagerModule', (node: TreeItem) => {
		let filePath = '';
		if (node.configType === 'xml') {
			filePath = node.path + '/Ext/ManagerModule.bsl';
		} else {
			filePath = node.path + '/ManagerModule.bsl';
		}
		OpenFile(filePath);
	});
	vscode.commands.registerCommand('metadataViewer.openForm', (node: TreeItem) => {
		let filePath = '';
		if (node.configType === 'xml') {
			filePath = node.path + '/Ext/Form/Module.bsl';
		} else {
			filePath = node.path + '/Module.bsl';
		}
		OpenFile(filePath);
	});
	vscode.commands.registerCommand('metadataViewer.previewForm', (node: TreeItem) => {
		if (node.configType === 'xml') {
			if (!node.path) {
				vscode.window.showWarningMessage('Не удалось определить путь к форме');
				return;
			}
			
			const filePath = node.path + '/Ext/Form.xml';
			const objectPathArray = node.path.split('/');
			
			// Определяем, является ли форма общей формой
			const isCommonForm = node.path.includes('/CommonForms/');
			
			let rootFilePath: string;
			let confPath: string;
			
			if (isCommonForm) {
				// Для общих форм: путь вида .../CommonForms/ОбщаяФорма
				// rootFilePath должен указывать на файл самой общей формы
				rootFilePath = node.path + '.xml';
				// confPath - путь к корню конфигурации (до CommonForms)
				const commonFormsIndex = objectPathArray.indexOf('CommonForms');
				confPath = objectPathArray.slice(0, commonFormsIndex).join('/');
			} else {
				// Для обычных форм: путь вида .../Documents/Документ/Forms/Форма
				// rootFilePath - файл объекта-владельца
				rootFilePath = objectPathArray.slice(0, -2).join('/') + '.xml';
				// confPath - путь к корню конфигурации
				confPath = objectPathArray.slice(0, -4).join('/');
			}
			
			PreviewForm(confPath ?? '', rootFilePath, filePath, context.extensionUri, node.label);
		} else {
			vscode.window
				.showInformationMessage('Данный функционал пока реализован только для конфигураций в формате XML.');
		}
	});

	/**
	 * Открыть «Редактор СКД» для отчёта (MainDataCompositionSchema).
	 * Работает для конфигураций в формате XML.
	 */
	vscode.commands.registerCommand('metadataViewer.openDcsEditor', (node: TreeItem) => {
		if (node.configType !== 'xml') {
			vscode.window.showInformationMessage('Редактор СКД пока реализован только для конфигураций в формате XML.');
			return;
		}
		if (!node.path) {
			vscode.window.showWarningMessage('Не удалось определить путь к отчёту');
			return;
		}

		// Ожидаем путь вида .../Reports/<ReportName>
		const isReport = node.path.includes('/Reports/');
		if (!isReport) {
			vscode.window.showInformationMessage('Редактор СКД: выберите отчет в дереве метаданных.');
			return;
		}

		const reportXmlPath = node.path + '.xml';
		const objectPathArray = node.path.split('/');
		const reportsIndex = objectPathArray.indexOf('Reports');
		const sourceRoot = reportsIndex >= 0 ? objectPathArray.slice(0, reportsIndex).join('/') : '';

		if (!sourceRoot) {
			vscode.window.showWarningMessage('Редактор СКД: не удалось определить корень конфигурации');
			return;
		}

		const editor = new DcsEditor(sourceRoot, reportXmlPath);
		editor.openEditor(context.extensionUri, node.label);
	});

	/**
	 * Валидация XML файла метаданных (проверка на совместимость с XDTO при загрузке в 1С)
	 */
	vscode.commands.registerCommand('metadataViewer.validateMetadataXml', async (uri?: vscode.Uri) => {
		const fileUri = uri ?? vscode.window.activeTextEditor?.document?.uri;
		if (!fileUri || fileUri.scheme !== 'file') {
			const picked = await vscode.window.showOpenDialog({
				title: 'Выберите XML файл метаданных для валидации',
				filters: { 'XML': ['xml'] },
				canSelectMany: false,
			});
			if (!picked?.[0]) return;
			await runValidateMetadataXml(picked[0].fsPath, context.extensionUri.fsPath);
			return;
		}
		await runValidateMetadataXml(fileUri.fsPath, context.extensionUri.fsPath);
	});

	vscode.commands.registerCommand('metadataViewer.openModule', (node: TreeItem) => {
		let filePath = '';
		if (node.configType === 'xml') {
			filePath = node.path + '/Ext/Module.bsl';
		} else {
			filePath = node.path + '/Module.bsl';
		}
		OpenFile(filePath);
	});
	vscode.commands.registerCommand('metadataViewer.openCommandModule', (node: TreeItem) => {
		let filePath = '';
		if (node.configType === 'xml') {
			filePath = node.path + '/Ext/CommandModule.bsl';
		} else {
			filePath = node.path + '/CommandModule.bsl';
		}
		OpenFile(filePath);
	});
	vscode.commands.registerCommand('metadataViewer.openRecordSetModule', (node: TreeItem) => {
		let filePath = '';
		if (node.configType === 'xml') {
			filePath = node.path + '/Ext/RecordSetModule.bsl';
		} else {
			// TODO: Не уверен в пути и посмотреть негде
			filePath = node.path + '/RecordSetModule.bsl';
		}
		OpenFile(filePath);
	});
	vscode.commands.registerCommand('metadataViewer.openValueManagerModule', (node: TreeItem) => {
		let filePath = '';
		if (node.configType === 'xml') {
			filePath = node.path + '/Ext/ValueManagerModule.bsl';
		} else {
			// TODO: Не уверен в пути и посмотреть негде
			filePath = node.path + '/ValueManagerModule.bsl';
		}
		OpenFile(filePath);
	});
	vscode.commands.registerCommand('metadataViewer.openXml', (node: TreeItem) => {
		let filePath = '';
		if (node.configType === 'xml') {
			if (node.isConfiguration) {
				filePath = node.path + '/Configuration.xml';
			} else {
				filePath = node.path + '.xml';
			}
		} else {
			// edt
			if (node.isConfiguration) {
				filePath = node.path + '/Configuration/Configuration.mdo';
			} else {
				if (node.path?.indexOf('/Forms/') === -1) {
					const objectPathArray = node.path?.split('/') ?? [];
					filePath = node.path + '/' + objectPathArray[objectPathArray.length - 1] + '.mdo';
				} else {
					filePath = node.path + '/Form.form';
				}
			}
		}
		OpenFile(filePath);
	});


	// Metadata Editor (from v2)
	vscode.commands.registerCommand('metadataViewer.editMetadata', async (node: TreeItem) => {
		const { MetadataPanel } = await import('./panels/MetadataPanel');
		await MetadataPanel.createOrShowFromTreeItem(context.extensionUri, node);
	});

	// Редактор прав роли
	vscode.commands.registerCommand('metadataViewer.openRoleEditor', async (node: TreeItem) => {
		if (!node?.path) {
			vscode.window.showWarningMessage('Не удалось определить путь к роли');
			return;
		}
		const { RoleEditorPanel } = await import('./roleEditorPanel');
		// node.path — путь к директории роли (например: .../Roles/ПолныеПрава)
		// Нормализуем слеши для Windows
		const rolePath = node.path.replace(/\//g, require('path').sep);
		// Имя роли из node.label (убираем префикс "Role.")
		const rawLabel = typeof node.label === 'string' ? node.label : (node.label?.label ?? '');
		const roleName = rawLabel.replace(/^Role\./, '');
		await RoleEditorPanel.createOrShow(context.extensionUri, rolePath, roleName);
	});

	// Команды для работы с закладками и форматированием BSL
	vscode.commands.registerCommand('metadataViewer.toggleBookmark', (args?: number | { lineNumber: number }) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.languageId !== 'bsl') {
			return;
		}

		// Если команда вызвана из контекстного меню gutter, args будет содержать номер строки
		// Если вызвана через горячую клавишу, используем текущую строку курсора
		let targetLine: number;
		if (args !== undefined) {
			if (typeof args === 'number') {
				targetLine = args;
			} else if (typeof args === 'object' && 'lineNumber' in args) {
				targetLine = args.lineNumber;
			} else {
				targetLine = editor.selection.active.line;
			}
		} else {
			targetLine = editor.selection.active.line;
		}
		
		bookmarkManager.toggleBookmark(targetLine, editor.document);
	});

	vscode.commands.registerCommand('metadataViewer.nextBookmark', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.languageId !== 'bsl') {
			return;
		}

		const currentLine = editor.selection.active.line;
		const nextLine = bookmarkManager.getNextBookmark(editor.document, currentLine);
		
		if (nextLine !== null) {
			const position = new vscode.Position(nextLine, 0);
			editor.selection = new vscode.Selection(position, position);
			editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
		} else {
			vscode.window.showInformationMessage('Закладки не найдены');
		}
	});

	vscode.commands.registerCommand('metadataViewer.clearAllBookmarks', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.languageId !== 'bsl') {
			return;
		}

		bookmarkManager.clearAllBookmarks(editor.document);
		vscode.window.showInformationMessage('Все закладки удалены');
	});

	vscode.commands.registerCommand('metadataViewer.increaseIndent', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.languageId !== 'bsl') {
			return;
		}

		modifyIndent(editor, true);
	});

	vscode.commands.registerCommand('metadataViewer.decreaseIndent', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.languageId !== 'bsl') {
			return;
		}

		modifyIndent(editor, false);
	});

	try {
		new MetadataView(context);
		outputChannel.appendLine('MetadataView успешно создан');
	} catch (error) {
		outputChannel.appendLine(`Ошибка при создании MetadataView: ${error}`);
		vscode.window.showErrorMessage(`Ошибка создания MetadataView: ${error}`);
		throw error;
	}
	
	// Отслеживание сохранения BSL файлов
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument((document) => {
			// Проверяем, что это BSL файл
			if (document.languageId === 'bsl' || document.fileName.endsWith('.bsl')) {
				const config = vscode.workspace.getConfiguration();
				const debugMode = config.get<boolean>('metadataViewer.debugMode', false);
				
				if (debugMode) {
					outputChannel.appendLine(`[BSL Save] Файл сохранен: ${document.fileName}`);
				}
				
				// Логируем сохраненный файл в Commit.txt
				CommitFileLogger.getInstance().logChangedFile(document.fileName);
			}
		})
	);
}

/**
 * Функция деактивации расширения
 * Вызывается при закрытии IDE Cursor или отключении расширения
 */
export function deactivate() {
	try {
		outputChannel.appendLine('=== Расширение "1C Metadata Viewer" деактивировано ===');
		
		// Очищаем содержимое файла Commit.txt при закрытии IDE
		CommitFileLogger.getInstance().clearCommitFile();
		
		outputChannel.appendLine('Commit.txt очищен');
	} catch (error) {
		outputChannel.appendLine(`Ошибка при деактивации расширения: ${error}`);
	}
}

function OpenFile(filePath: string) {
	const openPath = vscode.Uri.file(filePath);
	if (fs.existsSync(filePath)) {
		vscode.workspace.openTextDocument(openPath).then(doc => {
			vscode.window.showTextDocument(doc);
		});
	} else {
		vscode.window
			.showInformationMessage(`File ${filePath} does not exist. Create?`, 'Yes', 'No')
			.then(answer => {
				if (answer === 'Yes') {
					// TODO: Кроме собственно создания файла наверное надо что-то писать в XML? Наверняка нужно...
					vscode.workspace.fs.writeFile(openPath, new Uint8Array).then(_ => {
						vscode.window.showInformationMessage(`File ${filePath} is creted!`);
						vscode.workspace.openTextDocument(openPath).then(doc => {
							vscode.window.showTextDocument(doc);
						});
					});
				}
			});	
	}
}

function PreviewForm(confPath: string,
	rootFilePath: string,
	filePath: string,
	extensionUri: vscode.Uri,
	nodeDescription?: string | vscode.TreeItemLabel
) {
	const previewer = new FormPreviewer(confPath, rootFilePath, filePath);
	previewer.openPreview(extensionUri, nodeDescription);
}

/**
 * Изменение отступа для выделенных строк
 */
function modifyIndent(editor: vscode.TextEditor, increase: boolean): void {
	const document = editor.document;
	const selection = editor.selection;
	
	// Определяем диапазон строк для обработки
	let startLine: number;
	let endLine: number;
	
	if (selection.isEmpty) {
		// Если нет выделения, обрабатываем текущую строку
		startLine = selection.active.line;
		endLine = selection.active.line;
	} else {
		startLine = selection.start.line;
		endLine = selection.end.line;
	}

	// Получаем строки для модификации
	const lines: { line: number; text: string }[] = [];
	for (let i = startLine; i <= endLine; i++) {
		const line = document.lineAt(i);
		lines.push({ line: i, text: line.text });
	}

	// Модифицируем отступы
	editor.edit(editBuilder => {
		for (const { line, text } of lines) {
			if (text.trim().length === 0) {
				continue; // Пропускаем пустые строки
			}

			const lineRange = document.lineAt(line).range;
			
			if (increase) {
				// Добавляем табуляцию в начало
				editBuilder.insert(new vscode.Position(line, 0), '\t');
			} else {
				// Удаляем табуляцию или пробелы из начала
				const match = text.match(/^(\s*)/);
				if (match && match[1].length > 0) {
					const indent = match[1];
					// Удаляем один символ табуляции или до 4 пробелов
					let toRemove = 1;
					if (indent.startsWith('\t')) {
						toRemove = 1;
					} else if (indent.length >= 4) {
						toRemove = 4;
					} else {
						toRemove = indent.length;
					}
					
					const removeRange = new vscode.Range(
						new vscode.Position(line, 0),
						new vscode.Position(line, toRemove)
					);
					editBuilder.delete(removeRange);
				}
			}
		}
	});
}

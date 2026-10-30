/**
 * Каркас перехватчика метода расширения.
 * Повторяет cfe-patch-method: директива контекста, &Перед/&После/&Вместо/&ИзменениеИКонтроль,
 * имя с префиксом расширения. Для &Вместо в теле стоит ПродолжитьВызов.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { safeReadFile, safeWriteFile } from './fileUtils';
import { isExtensionConfigurationXml, readNamePrefix } from './borrowMetadataObject';
import { ensureModulePropertyState } from './extensionPropertyState';

export type InterceptorType = 'Before' | 'After' | 'Instead' | 'ModificationAndControl';

const DECORATOR: Record<InterceptorType, string> = {
    Before: 'Перед',
    After: 'После',
    Instead: 'Вместо',
    ModificationAndControl: 'ИзменениеИКонтроль',
};

interface BslMethod {
    name: string;
    isFunction: boolean;
    isAsync: boolean;
    paramsText: string;
    paramNames: string[];
    contextLines: string[];
    bodyLines: string[];
    start: number;
    end: number;
}

function splitTopLevel(text: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const char of text) {
        if (char === '(') {
            depth++;
        } else if (char === ')') {
            depth = Math.max(0, depth - 1);
        }
        if (char === ',' && depth === 0) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        parts.push(current);
    }
    return parts;
}

function parameterName(part: string): string {
    const trimmed = part.trim().replace(/^Знач\s+/i, '');
    const match = /^([\p{L}_][\p{L}\p{N}_]*)/u.exec(trimmed);
    return match ? match[1] : '';
}

/** Все процедуры и функции файла. Вложенных методов в BSL нет. */
export function parseBslMethods(text: string): BslMethod[] {
    const methods: BslMethod[] = [];
    const pattern = /^[ \t]*(Асинх[ \t]+)?(Процедура|Функция)[ \t]+([\p{L}_][\p{L}\p{N}_]*)[ \t]*\(/gimu;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
        const open = match.index + match[0].length - 1;
        let depth = 1;
        let cursor = open + 1;
        while (cursor < text.length && depth > 0) {
            const char = text[cursor];
            if (char === '(') {
                depth++;
            } else if (char === ')') {
                depth--;
            }
            cursor++;
        }
        if (depth !== 0) {
            continue;
        }
        const paramsText = text.slice(open + 1, cursor - 1).trim();
        const lineEnd = text.indexOf('\n', cursor);
        const signatureEnd = lineEnd < 0 ? text.length : lineEnd + 1;
        const isFunction = match[2].toLowerCase() === 'функция';
        const endWord = isFunction ? 'КонецФункции' : 'КонецПроцедуры';
        const endPattern = new RegExp(`^[ \\t]*${endWord}(?![\\p{L}\\p{N}_])`, 'imu');
        const tail = text.slice(signatureEnd);
        const endMatch = endPattern.exec(tail);
        if (!endMatch) {
            continue;
        }
        const end = signatureEnd + endMatch.index + endMatch[0].length;
        const before = text.slice(0, match.index);
        const lines = before.split(/\r?\n/);
        const contextLines: string[] = [];
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (!line) {
                if (contextLines.length === 0) {
                    continue;
                }
                break;
            }
            if (!line.startsWith('&')) {
                break;
            }
            if (/^&(Перед|После|Вместо|ИзменениеИКонтроль)\b/i.test(line)) {
                break;
            }
            contextLines.unshift(lines[i].trimEnd());
        }
        const body = tail.slice(0, endMatch.index).replace(/\s*$/, '');
        methods.push({
            name: match[3],
            isFunction,
            isAsync: Boolean(match[1]),
            paramsText,
            paramNames: splitTopLevel(paramsText).map(parameterName).filter(Boolean),
            contextLines,
            bodyLines: body ? body.split(/\r?\n/) : [],
            start: match.index,
            end,
        });
        pattern.lastIndex = end;
    }
    return methods;
}

function buildInterceptor(method: BslMethod, type: InterceptorType, interceptorName: string): string {
    const lines: string[] = [];
    lines.push(...method.contextLines);
    lines.push(`&${DECORATOR[type]}("${method.name}")`);
    const keyword = method.isFunction ? 'Функция' : 'Процедура';
    const endKeyword = method.isFunction ? 'КонецФункции' : 'КонецПроцедуры';
    const asyncPrefix = method.isAsync ? 'Асинх ' : '';
    lines.push(`${asyncPrefix}${keyword} ${interceptorName}(${method.paramsText})`);
    if (type === 'Before') {
        lines.push('\t// Код до вызова оригинального метода');
    } else if (type === 'After') {
        lines.push('\t// Код после вызова оригинального метода');
    } else if (type === 'Instead') {
        const args = method.paramNames.join(', ');
        if (method.isFunction) {
            lines.push(`\tРезультат = ПродолжитьВызов(${args});`);
            lines.push('\tВозврат Результат;');
        } else {
            lines.push(`\tПродолжитьВызов(${args});`);
        }
    } else {
        lines.push(...method.bodyLines);
    }
    lines.push(endKeyword);
    return lines.join('\r\n');
}

async function configurationRootOf(filePath: string): Promise<string | null> {
    let dir = path.dirname(filePath);
    for (let i = 0; i < 12; i++) {
        const candidate = path.join(dir, 'Configuration.xml');
        if (fs.existsSync(candidate)) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            break;
        }
        dir = parent;
    }
    return null;
}

async function readConfiguration(root: string): Promise<string> {
    return safeReadFile(path.join(root, 'Configuration.xml'));
}

export async function insertMethodInterceptor(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document.fileName.toLowerCase().endsWith('.bsl')) {
        vscode.window.showWarningMessage('Откройте модуль BSL');
        return;
    }
    const document = editor.document;
    const sourceText = document.getText();
    const methods = parseBslMethods(sourceText);
    const offset = document.offsetAt(editor.selection.active);
    let method = methods.find((item) => offset >= item.start && offset <= item.end);
    if (!method) {
        const picked = await vscode.window.showQuickPick(methods.map((item) => item.name), {
            title: 'Метод для перехвата',
            placeHolder: 'Курсор не внутри процедуры',
        });
        if (!picked) {
            return;
        }
        method = methods.find((item) => item.name === picked);
    }
    if (!method) {
        vscode.window.showWarningMessage('В модуле не найдена процедура или функция');
        return;
    }

    const typePick = await vscode.window.showQuickPick(
        [
            { label: 'После', description: '&После', type: 'After' as InterceptorType },
            { label: 'Перед', description: '&Перед', type: 'Before' as InterceptorType },
            { label: 'Вместо', description: '&Вместо и ПродолжитьВызов', type: 'Instead' as InterceptorType },
            { label: 'Изменение и контроль', description: 'Копия тела оригинала', type: 'ModificationAndControl' as InterceptorType },
        ],
        { title: `Перехват ${method.name}` }
    );
    if (!typePick) {
        return;
    }
    if ((typePick.type === 'Before' || typePick.type === 'After') && method.isFunction) {
        vscode.window.showErrorMessage('Перед и После применимы только к процедурам');
        return;
    }

    const sourceRoot = await configurationRootOf(document.fileName);
    if (!sourceRoot) {
        vscode.window.showWarningMessage('Рядом с модулем нет Configuration.xml');
        return;
    }
    const sourceConfiguration = await readConfiguration(sourceRoot);
    const sourceIsExtension = isExtensionConfigurationXml(sourceConfiguration);

    let extensionRoot = sourceRoot;
    let originText = sourceText;
    let originMethod = method;
    if (!sourceIsExtension) {
        const folders = vscode.workspace.workspaceFolders ?? [];
        const candidates: { label: string; root: string }[] = [];
        for (const folder of folders) {
            const root = folder.uri.fsPath;
            const configurationPath = path.join(root, 'Configuration.xml');
            if (!fs.existsSync(configurationPath) || path.resolve(root) === path.resolve(sourceRoot)) {
                continue;
            }
            const xml = await readConfiguration(root);
            if (isExtensionConfigurationXml(xml)) {
                candidates.push({ label: readNamePrefix(xml) || path.basename(root), root });
            }
        }
        if (candidates.length === 0) {
            const pickedFolder = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Каталог расширения',
                title: 'Каталог расширения, куда записать перехватчик',
            });
            if (!pickedFolder || pickedFolder.length === 0) {
                return;
            }
            extensionRoot = pickedFolder[0].fsPath;
        } else if (candidates.length === 1) {
            extensionRoot = candidates[0].root;
        } else {
            const pickedExtension = await vscode.window.showQuickPick(candidates, { title: 'Расширение' });
            if (!pickedExtension) {
                return;
            }
            extensionRoot = pickedExtension.root;
        }
    } else {
        const relative = path.relative(sourceRoot, document.fileName);
        const methodName = method.name;
        const folders = vscode.workspace.workspaceFolders ?? [];
        for (const folder of folders) {
            const root = folder.uri.fsPath;
            if (path.resolve(root) === path.resolve(sourceRoot)) {
                continue;
            }
            const candidate = path.join(root, relative);
            const configurationPath = path.join(root, 'Configuration.xml');
            if (fs.existsSync(candidate) && fs.existsSync(configurationPath)) {
                const xml = await readConfiguration(root);
                if (!isExtensionConfigurationXml(xml)) {
                    originText = await safeReadFile(candidate);
                    originMethod = parseBslMethods(originText).find((item) => item.name.toLowerCase() === methodName.toLowerCase()) ?? method;
                    break;
                }
            }
        }
    }

    const extensionConfiguration = await readConfiguration(extensionRoot);
    if (!isExtensionConfigurationXml(extensionConfiguration)) {
        vscode.window.showErrorMessage('Выбранный каталог не является расширением');
        return;
    }
    const prefix = readNamePrefix(extensionConfiguration);
    if (!prefix) {
        vscode.window.showErrorMessage('В расширении не задан NamePrefix');
        return;
    }

    const targetPath = sourceIsExtension
        ? document.fileName
        : path.join(extensionRoot, path.relative(sourceRoot, document.fileName));

    if (!fs.existsSync(targetPath)) {
        await safeWriteFile(targetPath, '\uFEFF');
    }
    let targetText = await safeReadFile(targetPath);
    const decorator = DECORATOR[typePick.type];
    if (new RegExp(`&${decorator}\\("${originMethod.name}"\\)`, 'i').test(targetText)) {
        vscode.window.showWarningMessage(`Перехватчик &${decorator}("${originMethod.name}") уже есть`);
        return;
    }
    let interceptorName = `${prefix}${originMethod.name}`;
    if (parseBslMethods(targetText).some((item) => item.name.toLowerCase() === interceptorName.toLowerCase())) {
        interceptorName = `${interceptorName}_${decorator}`;
    }
    const block = buildInterceptor(originMethod, typePick.type, interceptorName);
    const newline = targetText.includes('\r\n') || targetText.length <= 1 ? '\r\n' : '\n';
    const trimmed = targetText.replace(/\s*$/, '');
    const prefixBreak = trimmed.length > 0 ? newline + newline : '';
    targetText = trimmed + prefixBreak + block.replace(/\r\n/g, newline) + newline;
    await safeWriteFile(targetPath, targetText);
    await ensureModulePropertyState(targetPath);

    const targetDoc = await vscode.workspace.openTextDocument(targetPath);
    const shown = await vscode.window.showTextDocument(targetDoc);
    const position = targetDoc.positionAt(Math.max(0, targetDoc.getText().length - block.length));
    shown.selection = new vscode.Selection(position, position);
    shown.revealRange(new vscode.Range(position, position));
    vscode.window.showInformationMessage(`Добавлен перехватчик &${decorator}("${originMethod.name}")`);
}

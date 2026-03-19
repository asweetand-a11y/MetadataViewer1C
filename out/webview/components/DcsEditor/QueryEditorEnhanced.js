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
exports.QueryEditorEnhanced = void 0;
const react_1 = __importStar(require("react"));
const monaco = __importStar(require("monaco-editor"));
const monacoQueryLanguage_1 = require("../../utils/monacoQueryLanguage");
const VirtualTableParamsModal_1 = require("./VirtualTableParamsModal");
const ArbitraryConditionModal_1 = require("./ArbitraryConditionModal");
require("./QueryEditorEnhanced.css");
function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function resolveAliasTableKey(pkgText, alias) {
    const a = String(alias || '').trim();
    if (!a)
        return null;
    // Ищем объявление алиаса для метаданных: "ТипМетаданных.<Имя>[.ВиртТаблица(...)] КАК <alias>" внутри текущего пакета.
    // Учитываем виртуальные таблицы: Обороты, Остатки и т.д.
    // Поддерживаем все типы метаданных: Справочник, Документ, Перечисление, Регистры и т.д.
    const re = new RegExp(String.raw `(Справочник|Документ|Перечисление|ПланВидовХарактеристик|ПланВидовРасчета|ПланСчетов|БизнесПроцесс|Задача|ПланОбмена|Константа|ЖурналДокументов|РегистрНакопления|РегистрСведений|РегистрБухгалтерии|РегистрРасчета)\.([A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*(?:\.[A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*)?)\s*(?:\([^)]*\))?\s+КАК\s+${escapeRegExp(a)}(?![0-9A-Za-zА-Яа-я_])`, 'gi');
    let last = null;
    let m;
    while ((m = re.exec(pkgText)) !== null) {
        last = m;
    }
    if (!last)
        return null;
    const prefix = last[1];
    const fullName = last[2];
    // Убираем виртуальную таблицу из имени, если она есть (только для регистров)
    const baseName = fullName.replace(/\.(Обороты|Остатки|ОстаткиИОбороты|ОборотыДтКт|ДвиженияССубконто|СрезПоследних|СрезПервых|Движения|ПериодДействия|ДанныеГрафика|ФактическийПериодДействия)$/, '');
    return `${prefix}.${baseName}`;
}
function splitArgsTopLevel(src) {
    const s = String(src || '');
    const out = [];
    let start = 0;
    let i = 0;
    let depth = 0;
    let inString = false;
    let inLineComment = false;
    let inBlockComment = false;
    while (i < s.length) {
        const ch = s[i];
        const next = s[i + 1];
        if (inLineComment) {
            if (ch === '\n')
                inLineComment = false;
            i++;
            continue;
        }
        if (inBlockComment) {
            if (ch === '*' && next === '/') {
                inBlockComment = false;
                i += 2;
                continue;
            }
            i++;
            continue;
        }
        if (inString) {
            if (ch === '"' && next === '"') {
                i += 2;
                continue;
            }
            if (ch === '"') {
                inString = false;
                i++;
                continue;
            }
            i++;
            continue;
        }
        if (ch === '/' && next === '/') {
            inLineComment = true;
            i += 2;
            continue;
        }
        if (ch === '/' && next === '*') {
            inBlockComment = true;
            i += 2;
            continue;
        }
        if (ch === '"') {
            inString = true;
            i++;
            continue;
        }
        if (ch === '(') {
            depth++;
            i++;
            continue;
        }
        if (ch === ')') {
            depth = Math.max(0, depth - 1);
            i++;
            continue;
        }
        if (ch === ',' && depth === 0) {
            out.push(s.slice(start, i).trim());
            start = i + 1;
            i++;
            continue;
        }
        i++;
    }
    out.push(s.slice(start).trim());
    return out;
}
function findMatchingParen(query, openOffset) {
    const s = String(query || '');
    let depth = 0;
    let i = openOffset;
    let inString = false;
    let inLineComment = false;
    let inBlockComment = false;
    while (i < s.length) {
        const ch = s[i];
        const next = s[i + 1];
        if (inLineComment) {
            if (ch === '\n')
                inLineComment = false;
            i++;
            continue;
        }
        if (inBlockComment) {
            if (ch === '*' && next === '/') {
                inBlockComment = false;
                i += 2;
                continue;
            }
            i++;
            continue;
        }
        if (inString) {
            if (ch === '"' && next === '"') {
                i += 2;
                continue;
            }
            if (ch === '"') {
                inString = false;
                i++;
                continue;
            }
            i++;
            continue;
        }
        if (ch === '/' && next === '/') {
            inLineComment = true;
            i += 2;
            continue;
        }
        if (ch === '/' && next === '*') {
            inBlockComment = true;
            i += 2;
            continue;
        }
        if (ch === '"') {
            inString = true;
            i++;
            continue;
        }
        if (ch === '(')
            depth++;
        if (ch === ')') {
            depth--;
            if (depth === 0)
                return i;
        }
        i++;
    }
    return -1;
}
function resolveAliasFamily(pkgText, alias) {
    const a = String(alias || '').trim();
    if (!a)
        return null;
    const re = new RegExp(String.raw `(?:^|\s)(ИЗ|FROM|JOIN|СОЕДИНЕНИЕ)\s+([A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*(?:\.[A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*)?)\s+(?:(КАК|AS)\s+)?${escapeRegExp(a)}\b`, 'ig');
    const all = Array.from(String(pkgText || '').matchAll(re));
    const last = all.length ? all[all.length - 1] : null;
    const tableKey = last?.[2] ? String(last[2]) : '';
    if (tableKey.startsWith('РегистрНакопления.'))
        return 'AccumulationRegister';
    if (tableKey.startsWith('РегистрСведений.'))
        return 'InformationRegister';
    if (tableKey.startsWith('РегистрБухгалтерии.'))
        return 'AccountingRegister';
    if (tableKey.startsWith('РегистрРасчета.'))
        return 'CalculationRegister';
    return null;
}
function detectVirtualCall(queryText, cursorOffset) {
    const q = String(queryText || '');
    if (!q.trim())
        return null;
    const pkg = getCurrentPackageText(q, cursorOffset);
    const pkgStart = (() => {
        const pkgs = splitPackagesWithOffsets(q);
        for (const p of pkgs) {
            if (cursorOffset >= p.start && cursorOffset <= p.end)
                return p.start;
        }
        return 0;
    })();
    // Ищем ближайшую "(" слева от курсора в пределах текущего пакета
    const leftLimit = pkgStart;
    let open = Math.min(cursorOffset, q.length - 1);
    while (open >= leftLimit && q[open] !== '(')
        open--;
    if (open < leftLimit)
        return null;
    // Проверяем, что перед '(' есть одно из имён виртуальных таблиц
    const prefix = q.slice(leftLimit, open);
    const m = prefix.match(/([A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_\.]*)\.(Обороты|Остатки|ОстаткиИОбороты|ОборотыДтКт|ДвиженияССубконто|СрезПоследних|СрезПервых|Движения|ПериодДействия|ДанныеГрафика|ФактическийПериодДействия)\s*$/);
    if (!m)
        return null;
    const base = m[1];
    const kind = m[2];
    let family = null;
    if (base.startsWith('РегистрНакопления.'))
        family = 'AccumulationRegister';
    else if (base.startsWith('РегистрСведений.'))
        family = 'InformationRegister';
    else if (base.startsWith('РегистрБухгалтерии.'))
        family = 'AccountingRegister';
    else if (base.startsWith('РегистрРасчета.'))
        family = 'CalculationRegister';
    else {
        // alias.Объект(...) — пытаемся резолвить алиас по текущему пакету
        const aliasOnly = base.split('.')[0];
        family = resolveAliasFamily(pkg, aliasOnly);
    }
    if (!family)
        return null;
    const close = findMatchingParen(q, open);
    if (close < 0)
        return null;
    const argsText = q.slice(open + 1, close);
    const aliasOnly = base.split('.')[0];
    const tableKey = base.startsWith('РегистрНакопления.')
        || base.startsWith('РегистрСведений.')
        || base.startsWith('РегистрБухгалтерии.')
        || base.startsWith('РегистрРасчета.')
        ? base
        : (resolveAliasTableKey(pkg, aliasOnly) || base);
    return {
        family,
        kind,
        base,
        tableKey,
        openParenOffset: open,
        closeParenOffset: close,
        argsText,
    };
}
function buildArgsString(defOrder, values) {
    const raw = defOrder.map((d) => String(values[d.id] || '').trim());
    // если где-то есть значения правее, а слева пусто — ставим НЕОПРЕДЕЛЕНО (иначе ",," может быть невалидно)
    const hasLater = (idx) => raw.slice(idx + 1).some((v) => !!v);
    const normalized = raw.map((v, idx) => {
        if (v)
            return v;
        if (hasLater(idx))
            return 'НЕОПРЕДЕЛЕНО';
        return '';
    });
    // обрезаем хвостовые пустые
    let lastNonEmpty = -1;
    for (let i = normalized.length - 1; i >= 0; i--) {
        if (normalized[i]) {
            lastNonEmpty = i;
            break;
        }
    }
    if (lastNonEmpty < 0)
        return '';
    return normalized.slice(0, lastNonEmpty + 1).join(', ');
}
function splitPackagesWithOffsets(src) {
    const s = String(src || '');
    const out = [];
    let start = 0;
    let i = 0;
    let inString = false;
    let inLineComment = false;
    let inBlockComment = false;
    while (i < s.length) {
        const ch = s[i];
        const next = s[i + 1];
        if (inLineComment) {
            if (ch === '\n')
                inLineComment = false;
            i++;
            continue;
        }
        if (inBlockComment) {
            if (ch === '*' && next === '/') {
                inBlockComment = false;
                i += 2;
                continue;
            }
            i++;
            continue;
        }
        if (inString) {
            if (ch === '"' && next === '"') {
                i += 2;
                continue;
            }
            if (ch === '"') {
                inString = false;
                i++;
                continue;
            }
            i++;
            continue;
        }
        if (ch === '/' && next === '/') {
            inLineComment = true;
            i += 2;
            continue;
        }
        if (ch === '/' && next === '*') {
            inBlockComment = true;
            i += 2;
            continue;
        }
        if (ch === '"') {
            inString = true;
            i++;
            continue;
        }
        if (ch === ';') {
            out.push({ start, end: i, text: s.slice(start, i) });
            start = i + 1;
            i++;
            continue;
        }
        i++;
    }
    out.push({ start, end: s.length, text: s.slice(start) });
    return out;
}
function getCurrentPackageText(queryText, cursorOffset) {
    const pkgs = splitPackagesWithOffsets(queryText);
    if (pkgs.length === 0)
        return String(queryText || '');
    for (const p of pkgs) {
        if (cursorOffset >= p.start && cursorOffset <= p.end)
            return p.text;
    }
    // fallback: последний непустой
    for (let i = pkgs.length - 1; i >= 0; i--) {
        if (String(pkgs[i].text || '').trim())
            return pkgs[i].text;
    }
    return pkgs[pkgs.length - 1].text;
}
const QueryEditorEnhanced = ({ isOpen, queryText, rightPanel, onSave, onCancel, fullscreen = false, }) => {
    const [editedQuery, setEditedQuery] = (0, react_1.useState)(queryText);
    const [cursorOffset, setCursorOffset] = (0, react_1.useState)(0);
    const [vtInfo, setVtInfo] = (0, react_1.useState)(null);
    const [isVtParamsOpen, setIsVtParamsOpen] = (0, react_1.useState)(false);
    const [isCondOpen, setIsCondOpen] = (0, react_1.useState)(false);
    const [condDraft, setCondDraft] = (0, react_1.useState)('');
    const containerRef = (0, react_1.useRef)(null);
    const editorRef = (0, react_1.useRef)(null);
    const queryTextRef = (0, react_1.useRef)(queryText);
    queryTextRef.current = queryText;
    const [rightWidthPx, setRightWidthPx] = (0, react_1.useState)(360);
    const dragStateRef = (0, react_1.useRef)(null);
    // Синхронизировать состояние при открытии
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            setEditedQuery(queryText);
        }
    }, [isOpen, queryText]);
    // Загружаем метаданные из rightPanel, если это MetadataTreePanel
    (0, react_1.useEffect)(() => {
        if (isOpen && rightPanel && react_1.default.isValidElement(rightPanel)) {
            const props = rightPanel.props;
            if (props.tree) {
                (0, monacoQueryLanguage_1.setQueryMetadataCompletionTree)(props.tree);
            }
        }
    }, [isOpen, rightPanel]);
    // Создание Monaco editor (только когда модалка открыта).
    // КРИТИЧНО: Откладываем создание на следующий тик — иначе Monaco fallback (workers отключены)
    // блокирует main thread и сообщение metadataTreeReady не успевает обработаться.
    (0, react_1.useEffect)(() => {
        if (!isOpen)
            return;
        if (!containerRef.current)
            return;
        let cancelled = false;
        let cleanup = null;
        const run = () => {
            if (cancelled || !containerRef.current)
                return;
            (0, monacoQueryLanguage_1.register1cQueryLanguage)();
            // Используем ref: editedQuery из замыкания устаревает при задержке
            const initialValue = queryTextRef.current || editedQuery || '';
            const editor = monaco.editor.create(containerRef.current, {
                value: initialValue,
                language: '1c-query',
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 13,
                unicodeHighlight: {
                    ambiguousCharacters: false,
                },
            });
            editorRef.current = editor;
            const disposable = editor.onDidChangeModelContent(() => {
                const v = editor.getValue();
                setEditedQuery(v);
            });
            const cursorDisposable = editor.onDidChangeCursorPosition(() => {
                const model = editor.getModel();
                const pos = editor.getPosition();
                if (!model || !pos)
                    return;
                const off = model.getOffsetAt(pos);
                setCursorOffset(off);
                setVtInfo(detectVirtualCall(model.getValue(), off));
            });
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                onSave(editor.getValue());
            });
            cleanup = () => {
                disposable.dispose();
                cursorDisposable.dispose();
                editor.dispose();
                editorRef.current = null;
            };
        };
        // Откладываем, чтобы metadataTreeReady успел обработаться до блокировки main thread.
        // 150ms даёт время на обработку сообщений и requestMetadataTree (300ms) при необходимости.
        const id = window.setTimeout(run, 150);
        return () => {
            cancelled = true;
            window.clearTimeout(id);
            cleanup?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);
    const applyVirtualTableArgs = (nextValues) => {
        const ed = editorRef.current;
        const cur = vtInfo;
        if (!ed || !cur)
            return;
        const model = ed.getModel();
        if (!model)
            return;
        const defs = (0, VirtualTableParamsModal_1.getVirtualTableParams)(cur.family, cur.kind);
        const argsStr = buildArgsString(defs, nextValues);
        const startPos = model.getPositionAt(cur.openParenOffset + 1);
        const endPos = model.getPositionAt(cur.closeParenOffset);
        ed.executeEdits('vt-params', [
            {
                range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                text: argsStr,
                forceMoveMarkers: true,
            },
        ]);
        // обновляем локальное состояние
        const v = model.getValue();
        setEditedQuery(v);
        setVtInfo(detectVirtualCall(v, cursorOffset));
    };
    const vtInitialValues = (0, react_1.useMemo)(() => {
        const cur = vtInfo;
        const empty = {};
        if (!cur)
            return empty;
        const defs = (0, VirtualTableParamsModal_1.getVirtualTableParams)(cur.family, cur.kind);
        const args = splitArgsTopLevel(cur.argsText);
        const out = {};
        for (let i = 0; i < defs.length; i++) {
            const id = defs[i].id;
            const raw = String(args[i] || '').trim();
            out[id] = raw === 'НЕОПРЕДЕЛЕНО' ? '' : raw;
        }
        return out;
    }, [vtInfo]);
    // Обновляем value в редакторе при внешнем изменении editedQuery
    (0, react_1.useEffect)(() => {
        const ed = editorRef.current;
        if (!ed)
            return;
        if (ed.getValue() !== editedQuery) {
            ed.setValue(editedQuery || '');
        }
    }, [editedQuery]);
    const clampRightWidth = (0, react_1.useMemo)(() => {
        // минимальная ширина панели, чтобы дерево/список было читаемо
        const min = 240;
        const max = 700;
        return (px) => Math.max(min, Math.min(max, px));
    }, []);
    const onDividerMouseDown = (e) => {
        e.preventDefault();
        dragStateRef.current = { startX: e.clientX, startRightWidth: rightWidthPx };
        const onMove = (ev) => {
            const st = dragStateRef.current;
            if (!st)
                return;
            // тянем divider: вправо -> увеличиваем правую панель
            const dx = ev.clientX - st.startX;
            setRightWidthPx(clampRightWidth(st.startRightWidth - dx));
        };
        const onUp = () => {
            dragStateRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };
    if (!isOpen)
        return null;
    // Полноэкранный режим (для StandaloneQueryEditor)
    if (fullscreen) {
        return (react_1.default.createElement("div", { style: {
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                width: '100%',
                backgroundColor: 'var(--vscode-editor-background)',
            } },
            react_1.default.createElement("div", { style: {
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--vscode-panel-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--vscode-sideBar-background)',
                } },
                react_1.default.createElement("h3", { style: { margin: 0, fontSize: '14px', color: 'var(--vscode-foreground)' } }, "\u0420\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0437\u0430\u043F\u0440\u043E\u0441\u0430"),
                react_1.default.createElement("div", { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                    react_1.default.createElement("button", { type: "button", disabled: !vtInfo, onClick: () => setIsVtParamsOpen(true), title: vtInfo ? 'Параметры виртуальной таблицы' : 'Курсор должен быть внутри виртуальной таблицы', style: {
                            padding: '6px 12px',
                            backgroundColor: 'var(--vscode-button-secondaryBackground)',
                            color: vtInfo ? 'var(--vscode-button-secondaryForeground)' : 'var(--vscode-disabledForeground)',
                            border: 'none',
                            borderRadius: '2px',
                            cursor: vtInfo ? 'pointer' : 'not-allowed',
                            fontSize: '13px',
                            opacity: vtInfo ? 1 : 0.5,
                        } }, "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0439 \u0442\u0430\u0431\u043B\u0438\u0446\u044B"),
                    react_1.default.createElement("button", { type: "button", onClick: onCancel, style: {
                            padding: '6px 12px',
                            backgroundColor: 'var(--vscode-button-secondaryBackground)',
                            color: 'var(--vscode-button-secondaryForeground)',
                            border: 'none',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontSize: '13px',
                        } }, "\u041E\u0442\u043C\u0435\u043D\u0430"),
                    react_1.default.createElement("button", { type: "button", onClick: () => onSave(editedQuery), style: {
                            padding: '6px 12px',
                            backgroundColor: 'var(--vscode-button-background)',
                            color: 'var(--vscode-button-foreground)',
                            border: 'none',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                        } }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C (Ctrl+Enter)"))),
            react_1.default.createElement("div", { style: { display: 'flex', flex: 1, overflow: 'hidden' } },
                react_1.default.createElement("div", { className: "query-editor-enhanced__editor", ref: containerRef, style: { flex: 1, overflow: 'hidden' }, onDragOver: (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                    }, onDrop: (e) => {
                        e.preventDefault();
                        const ed = editorRef.current;
                        if (!ed)
                            return;
                        const pos = ed.getPosition();
                        if (!pos)
                            return;
                        const raw = e.dataTransfer.getData('application/x-1c-md');
                        const plain = e.dataTransfer.getData('text/plain');
                        let insert = plain;
                        try {
                            const parsed = raw ? JSON.parse(raw) : null;
                            if (parsed && typeof parsed === 'object') {
                                const full = String(parsed.insertText || plain || '').trim();
                                const tableKey = String(parsed.tableKey || '').trim();
                                const name = String(parsed.name || '').trim();
                                // Пытаемся вставить через алиас, но ищем его внутри ТЕКУЩЕГО ПАКЕТА по позиции курсора (как в EDT)
                                const model = ed.getModel();
                                const cursorOffset = model ? model.getOffsetAt(pos) : 0;
                                const currentPkg = getCurrentPackageText(ed.getValue(), cursorOffset);
                                const aliasRegex = tableKey
                                    ? new RegExp(String.raw `(?:^|\s)(ИЗ|FROM|JOIN|СОЕДИНЕНИЕ)\s+${escapeRegExp(tableKey)}\s+(?:(КАК|AS)\s+)?([A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*)`, 'ig')
                                    : null;
                                let alias = '';
                                if (aliasRegex) {
                                    const all = Array.from(currentPkg.matchAll(aliasRegex));
                                    const last = all.length ? all[all.length - 1] : null;
                                    alias = last?.[3] ? String(last[3]) : '';
                                }
                                if (alias && tableKey && name) {
                                    // field: alias.Field
                                    // virtual: alias.Обороты(
                                    insert = `${alias}.${name}`;
                                }
                                else if (alias && tableKey && full.includes('(') && full.startsWith(`${tableKey}.`)) {
                                    // virtual tail (на всякий)
                                    insert = `${alias}.${full.slice(tableKey.length + 1)}`;
                                }
                                else {
                                    insert = full || plain;
                                }
                            }
                        }
                        catch {
                            // ignore
                        }
                        if (!insert)
                            return;
                        ed.executeEdits('metadata-tree-drop', [
                            {
                                range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
                                text: insert,
                                forceMoveMarkers: true,
                            },
                        ]);
                        ed.focus();
                    } }),
                react_1.default.createElement("div", { className: "query-editor-enhanced__divider", onMouseDown: onDividerMouseDown, title: "\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0448\u0438\u0440\u0438\u043D\u044B" }),
                react_1.default.createElement("div", { className: "query-editor-enhanced__right", style: { width: rightWidthPx } }, rightPanel ? rightPanel : (react_1.default.createElement("div", { className: "query-editor-enhanced__right-empty" }, "\u0414\u0435\u0440\u0435\u0432\u043E \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445 \u0431\u0443\u0434\u0435\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u043D\u0430 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C \u0448\u0430\u0433\u0435.")))),
            react_1.default.createElement("div", { style: {
                    padding: '8px 16px',
                    borderTop: '1px solid var(--vscode-panel-border)',
                    fontSize: '12px',
                    color: 'var(--vscode-descriptionForeground)',
                    backgroundColor: 'var(--vscode-sideBar-background)',
                } }, "Ctrl+Enter - \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C | \u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0438\u0437 \u0434\u0435\u0440\u0435\u0432\u0430 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445 \u0432 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440"),
            react_1.default.createElement(VirtualTableParamsModal_1.VirtualTableParamsModal, { isOpen: isVtParamsOpen, family: vtInfo?.family || 'AccumulationRegister', kind: vtInfo?.kind || 'Обороты', initialValues: vtInitialValues, onCancel: () => setIsVtParamsOpen(false), onEditCondition: () => {
                    const cur = vtInfo;
                    if (!cur)
                        return;
                    const defs = (0, VirtualTableParamsModal_1.getVirtualTableParams)(cur.family, cur.kind);
                    const args = splitArgsTopLevel(cur.argsText);
                    const idx = defs.findIndex((d) => d.id === 'Условие');
                    const v = idx >= 0 ? String(args[idx] || '') : '';
                    setCondDraft(v);
                    setIsCondOpen(true);
                }, onSave: (vals) => {
                    applyVirtualTableArgs(vals);
                    setIsVtParamsOpen(false);
                } }),
            react_1.default.createElement(ArbitraryConditionModal_1.ArbitraryConditionModal, { isOpen: isCondOpen, initialValue: condDraft, fields: vtInfo ? (() => {
                    // Извлекаем базовую таблицу из tableKey (убираем виртуальную таблицу, если она есть)
                    let baseTable = vtInfo.tableKey;
                    // Убираем виртуальную таблицу, если она есть в конце
                    baseTable = baseTable.replace(/\.(Обороты|Остатки|ОстаткиИОбороты|ОборотыДтКт|ДвиженияССубконто|СрезПоследних|СрезПервых|Движения|ПериодДействия|ДанныеГрафика|ФактическийПериодДействия)(\s*\(|$)/, '');
                    // Если baseTable пустой или не найден, используем base (который уже без виртуальной таблицы)
                    if (!baseTable || baseTable === vtInfo.base) {
                        baseTable = vtInfo.base;
                    }
                    const baseFields = (0, monacoQueryLanguage_1.getQueryMetadataFieldNames)(baseTable);
                    // Если это виртуальная таблица, добавляем специальные поля
                    let fieldsToShow = baseFields;
                    if (vtInfo.kind) {
                        if (vtInfo.family === 'AccountingRegister') {
                            fieldsToShow = (0, monacoQueryLanguage_1.getAccountingRegisterVirtualTableFields)(vtInfo.kind, baseFields);
                        }
                        else if (vtInfo.family === 'CalculationRegister') {
                            fieldsToShow = (0, monacoQueryLanguage_1.getCalculationRegisterVirtualTableFields)(vtInfo.kind, baseFields);
                        }
                        else if (vtInfo.family === 'AccumulationRegister' && vtInfo.kind === 'Движения') {
                            fieldsToShow = [...baseFields, 'Регистратор', 'НомерСтроки', 'Период', 'ВидДвижения', 'Активность'];
                        }
                        else if (vtInfo.family === 'InformationRegister' && vtInfo.kind === 'Движения') {
                            fieldsToShow = [...baseFields, 'Период', 'Регистратор', 'НомерСтроки', 'Активность'];
                        }
                    }
                    else if (baseTable.startsWith('РегистрБухгалтерии.')) {
                        // Для основной таблицы регистра бухгалтерии добавляем стандартные поля
                        const accountingFields = ['Активность', 'ВидДвижения', 'МоментВремени',
                            'НомерСтроки', 'Период', 'Регистратор', 'Счет', 'СчетДт', 'СчетКт',
                            'УточнениеПериода', 'КорСчет'];
                        // Добавляем поля субконто (до 3-х видов)
                        for (let i = 1; i <= 3; i++) {
                            accountingFields.push(`Субконто${i}`, `СубконтоДт${i}`, `СубконтоКт${i}`, `КорСубконто${i}`, `ВидСубконто${i}`);
                        }
                        fieldsToShow = [...baseFields, ...accountingFields];
                    }
                    else if (baseTable.startsWith('РегистрРасчета.')) {
                        // Для основной таблицы регистра расчета добавляем стандартные поля
                        const calculationFields = ['Активность', 'ВидРасчета', 'Период', 'ПериодРегистрации',
                            'ПериодДействия', 'ПериодДействияНачало', 'ПериодДействияКонец',
                            'БазовыйПериодНачало', 'БазовыйПериодКонец', 'НомерСтроки', 'Регистратор',
                            'Результат', 'Перерасчет', 'Сторно', 'ВидДвижения'];
                        fieldsToShow = [...baseFields, ...calculationFields];
                    }
                    else if (baseTable.startsWith('РегистрНакопления.')) {
                        fieldsToShow = [...baseFields, 'Регистратор', 'НомерСтроки', 'Период', 'ВидДвижения', 'Активность'];
                    }
                    else if (baseTable.startsWith('РегистрСведений.')) {
                        fieldsToShow = [...baseFields, 'Период', 'Регистратор', 'НомерСтроки', 'Активность'];
                    }
                    console.log('[ArbitraryConditionModal] fields', {
                        vtInfoTableKey: vtInfo.tableKey,
                        vtInfoBase: vtInfo.base,
                        vtInfoFamily: vtInfo.family,
                        vtInfoKind: vtInfo.kind,
                        baseTable,
                        baseFieldsCount: baseFields.length,
                        fieldsCount: fieldsToShow.length,
                        fieldsSample: fieldsToShow.slice(0, 10)
                    });
                    return fieldsToShow;
                })() : [], onCancel: () => setIsCondOpen(false), onSave: (v) => {
                    setIsCondOpen(false);
                    const cur = vtInfo;
                    if (!cur)
                        return;
                    const defs = (0, VirtualTableParamsModal_1.getVirtualTableParams)(cur.family, cur.kind);
                    const args = splitArgsTopLevel(cur.argsText);
                    const next = {};
                    for (let i = 0; i < defs.length; i++) {
                        next[defs[i].id] = String(args[i] || '').trim();
                    }
                    next['Условие'] = String(v || '').trim();
                    applyVirtualTableArgs(next);
                } })));
    }
    // Модальный режим (для редактора СКД)
    return (react_1.default.createElement("div", { className: "query-editor-enhanced__overlay", onClick: onCancel },
        react_1.default.createElement("div", { className: "query-editor-enhanced__modal", onClick: (e) => e.stopPropagation() },
            react_1.default.createElement("div", { className: "query-editor-enhanced__header" },
                react_1.default.createElement("h3", null, "\u0420\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0437\u0430\u043F\u0440\u043E\u0441\u0430"),
                react_1.default.createElement("div", { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                    react_1.default.createElement("button", { type: "button", className: "query-editor-enhanced__btn query-editor-enhanced__btn--secondary", disabled: !vtInfo, onClick: () => setIsVtParamsOpen(true), title: vtInfo ? 'Параметры виртуальной таблицы' : 'Курсор должен быть внутри виртуальной таблицы' }, "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0439 \u0442\u0430\u0431\u043B\u0438\u0446\u044B"),
                    react_1.default.createElement("button", { type: "button", className: "query-editor-enhanced__close", onClick: onCancel, title: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }, "\u2715"))),
            react_1.default.createElement("div", { className: "query-editor-enhanced__body" },
                react_1.default.createElement("div", { className: "query-editor-enhanced__split" },
                    react_1.default.createElement("div", { className: "query-editor-enhanced__left" },
                        react_1.default.createElement("div", { className: "query-editor-enhanced__editor", ref: containerRef, onDragOver: (e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'copy';
                            }, onDrop: (e) => {
                                e.preventDefault();
                                const ed = editorRef.current;
                                if (!ed)
                                    return;
                                const pos = ed.getPosition();
                                if (!pos)
                                    return;
                                const raw = e.dataTransfer.getData('application/x-1c-md');
                                const plain = e.dataTransfer.getData('text/plain');
                                let insert = plain;
                                try {
                                    const parsed = raw ? JSON.parse(raw) : null;
                                    if (parsed && typeof parsed === 'object') {
                                        const full = String(parsed.insertText || plain || '').trim();
                                        const tableKey = String(parsed.tableKey || '').trim();
                                        const name = String(parsed.name || '').trim();
                                        // Пытаемся вставить через алиас, но ищем его внутри ТЕКУЩЕГО ПАКЕТА по позиции курсора (как в EDT)
                                        const model = ed.getModel();
                                        const cursorOffset = model ? model.getOffsetAt(pos) : 0;
                                        const currentPkg = getCurrentPackageText(ed.getValue(), cursorOffset);
                                        const aliasRegex = tableKey
                                            ? new RegExp(String.raw `(?:^|\s)(ИЗ|FROM|JOIN|СОЕДИНЕНИЕ)\s+${escapeRegExp(tableKey)}\s+(?:(КАК|AS)\s+)?([A-Za-zА-Яа-я_][0-9A-Za-zА-Яа-я_]*)`, 'ig')
                                            : null;
                                        let alias = '';
                                        if (aliasRegex) {
                                            const all = Array.from(currentPkg.matchAll(aliasRegex));
                                            const last = all.length ? all[all.length - 1] : null;
                                            alias = last?.[3] ? String(last[3]) : '';
                                        }
                                        if (alias && tableKey && name) {
                                            // field: alias.Field
                                            // virtual: alias.Обороты(
                                            insert = `${alias}.${name}`;
                                        }
                                        else if (alias && tableKey && full.includes('(') && full.startsWith(`${tableKey}.`)) {
                                            // virtual tail (на всякий)
                                            insert = `${alias}.${full.slice(tableKey.length + 1)}`;
                                        }
                                        else {
                                            insert = full || plain;
                                        }
                                    }
                                }
                                catch {
                                    // ignore
                                }
                                if (!insert)
                                    return;
                                ed.executeEdits('metadata-tree-drop', [
                                    {
                                        range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
                                        text: insert,
                                        forceMoveMarkers: true,
                                    },
                                ]);
                                ed.focus();
                            } })),
                    react_1.default.createElement("div", { className: "query-editor-enhanced__divider", onMouseDown: onDividerMouseDown, title: "\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0448\u0438\u0440\u0438\u043D\u044B" }),
                    react_1.default.createElement("div", { className: "query-editor-enhanced__right", style: { width: rightWidthPx } }, rightPanel ? rightPanel : (react_1.default.createElement("div", { className: "query-editor-enhanced__right-empty" }, "\u0414\u0435\u0440\u0435\u0432\u043E \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445 \u0431\u0443\u0434\u0435\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u043D\u0430 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C \u0448\u0430\u0433\u0435."))))),
            react_1.default.createElement(VirtualTableParamsModal_1.VirtualTableParamsModal, { isOpen: isVtParamsOpen, family: vtInfo?.family || 'AccumulationRegister', kind: vtInfo?.kind || 'Обороты', initialValues: vtInitialValues, onCancel: () => setIsVtParamsOpen(false), onEditCondition: () => {
                    const cur = vtInfo;
                    if (!cur)
                        return;
                    const defs = (0, VirtualTableParamsModal_1.getVirtualTableParams)(cur.family, cur.kind);
                    const args = splitArgsTopLevel(cur.argsText);
                    const idx = defs.findIndex((d) => d.id === 'Условие');
                    const v = idx >= 0 ? String(args[idx] || '') : '';
                    setCondDraft(v);
                    setIsCondOpen(true);
                }, onSave: (vals) => {
                    applyVirtualTableArgs(vals);
                    setIsVtParamsOpen(false);
                } }),
            react_1.default.createElement(ArbitraryConditionModal_1.ArbitraryConditionModal, { isOpen: isCondOpen, initialValue: condDraft, fields: vtInfo ? (() => {
                    // Извлекаем базовую таблицу из tableKey (убираем виртуальную таблицу, если она есть)
                    let baseTable = vtInfo.tableKey;
                    // Убираем виртуальную таблицу, если она есть в конце
                    baseTable = baseTable.replace(/\.(Обороты|Остатки|ОстаткиИОбороты|ОборотыДтКт|ДвиженияССубконто|СрезПоследних|СрезПервых|Движения|ПериодДействия|ДанныеГрафика|ФактическийПериодДействия)(\s*\(|$)/, '');
                    // Если baseTable пустой или не найден, используем base (который уже без виртуальной таблицы)
                    if (!baseTable || baseTable === vtInfo.base) {
                        baseTable = vtInfo.base;
                    }
                    const baseFields = (0, monacoQueryLanguage_1.getQueryMetadataFieldNames)(baseTable);
                    // Если это виртуальная таблица, добавляем специальные поля
                    let fieldsToShow = baseFields;
                    if (vtInfo.kind) {
                        if (vtInfo.family === 'AccountingRegister') {
                            fieldsToShow = (0, monacoQueryLanguage_1.getAccountingRegisterVirtualTableFields)(vtInfo.kind, baseFields);
                        }
                        else if (vtInfo.family === 'CalculationRegister') {
                            fieldsToShow = (0, monacoQueryLanguage_1.getCalculationRegisterVirtualTableFields)(vtInfo.kind, baseFields);
                        }
                        else if (vtInfo.family === 'AccumulationRegister' && vtInfo.kind === 'Движения') {
                            fieldsToShow = [...baseFields, 'Регистратор', 'НомерСтроки', 'Период', 'ВидДвижения', 'Активность'];
                        }
                        else if (vtInfo.family === 'InformationRegister' && vtInfo.kind === 'Движения') {
                            fieldsToShow = [...baseFields, 'Период', 'Регистратор', 'НомерСтроки', 'Активность'];
                        }
                    }
                    else if (baseTable.startsWith('РегистрБухгалтерии.')) {
                        // Для основной таблицы регистра бухгалтерии добавляем стандартные поля
                        const accountingFields = ['Активность', 'ВидДвижения', 'МоментВремени',
                            'НомерСтроки', 'Период', 'Регистратор', 'Счет', 'СчетДт', 'СчетКт',
                            'УточнениеПериода', 'КорСчет'];
                        // Добавляем поля субконто (до 3-х видов)
                        for (let i = 1; i <= 3; i++) {
                            accountingFields.push(`Субконто${i}`, `СубконтоДт${i}`, `СубконтоКт${i}`, `КорСубконто${i}`, `ВидСубконто${i}`);
                        }
                        fieldsToShow = [...baseFields, ...accountingFields];
                    }
                    else if (baseTable.startsWith('РегистрРасчета.')) {
                        // Для основной таблицы регистра расчета добавляем стандартные поля
                        const calculationFields = ['Активность', 'ВидРасчета', 'Период', 'ПериодРегистрации',
                            'ПериодДействия', 'ПериодДействияНачало', 'ПериодДействияКонец',
                            'БазовыйПериодНачало', 'БазовыйПериодКонец', 'НомерСтроки', 'Регистратор',
                            'Результат', 'Перерасчет', 'Сторно', 'ВидДвижения'];
                        fieldsToShow = [...baseFields, ...calculationFields];
                    }
                    else if (baseTable.startsWith('РегистрНакопления.')) {
                        fieldsToShow = [...baseFields, 'Регистратор', 'НомерСтроки', 'Период', 'ВидДвижения', 'Активность'];
                    }
                    else if (baseTable.startsWith('РегистрСведений.')) {
                        fieldsToShow = [...baseFields, 'Период', 'Регистратор', 'НомерСтроки', 'Активность'];
                    }
                    console.log('[ArbitraryConditionModal] fields', {
                        vtInfoTableKey: vtInfo.tableKey,
                        vtInfoBase: vtInfo.base,
                        vtInfoFamily: vtInfo.family,
                        vtInfoKind: vtInfo.kind,
                        baseTable,
                        baseFieldsCount: baseFields.length,
                        fieldsCount: fieldsToShow.length,
                        fieldsSample: fieldsToShow.slice(0, 10)
                    });
                    return fieldsToShow;
                })() : [], onCancel: () => setIsCondOpen(false), onSave: (v) => {
                    setIsCondOpen(false);
                    const cur = vtInfo;
                    if (!cur)
                        return;
                    const defs = (0, VirtualTableParamsModal_1.getVirtualTableParams)(cur.family, cur.kind);
                    const args = splitArgsTopLevel(cur.argsText);
                    const next = {};
                    for (let i = 0; i < defs.length; i++) {
                        next[defs[i].id] = String(args[i] || '').trim();
                    }
                    next['Условие'] = String(v || '').trim();
                    applyVirtualTableArgs(next);
                } }),
            react_1.default.createElement("div", { className: "query-editor-enhanced__footer" },
                react_1.default.createElement("div", { className: "query-editor-enhanced__hint" }, "Ctrl+Enter - \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438 \u0430\u0432\u0442\u043E\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u043E\u043B\u044F"),
                react_1.default.createElement("div", { className: "query-editor-enhanced__actions" },
                    react_1.default.createElement("button", { type: "button", className: "query-editor-enhanced__btn query-editor-enhanced__btn--secondary", onClick: onCancel }, "\u0417\u0430\u043A\u0440\u044B\u0442\u044C"),
                    react_1.default.createElement("button", { type: "button", className: "query-editor-enhanced__btn query-editor-enhanced__btn--primary", onClick: () => onSave(editedQuery) }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438 \u0430\u0432\u0442\u043E\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u043E\u043B\u044F"))))));
};
exports.QueryEditorEnhanced = QueryEditorEnhanced;
//# sourceMappingURL=QueryEditorEnhanced.js.map
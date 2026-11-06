/**
 * Правки текста запроса из дерева и панели функций.
 */

import type * as monaco from "monaco-editor";
import { QUERY_BATCH_SEPARATOR } from "../../querySchema/generateQueryText";
import { wrapSelectField } from "./field-function";
import { completionMetadata } from "./completion/provider";
import { tokenize } from "./lexer";
import { FIELD_DRAG_TYPE, smartInsert, tableAlias, type SmartTarget } from "./smart-insert";
import type { MetadataIndex } from "./completion/metadata-index";

type Editor = monaco.editor.IStandaloneCodeEditor;

function rangeOf(model: monaco.editor.ITextModel, start: number, end: number): monaco.IRange {
  const from = model.getPositionAt(start);
  const to = model.getPositionAt(end);
  return {
    startLineNumber: from.lineNumber,
    startColumn: from.column,
    endLineNumber: to.lineNumber,
    endColumn: to.column,
  };
}

function snippetController(editor: Editor) {
  return editor.getContribution("snippetController2") as {
    insert(template: string, options?: { adjustWhitespace?: boolean }): void;
  } | null;
}

/** Двойной щелчок по дереву: таблица или реквизит добавляются в запрос у курсора. */
export function applySmartInsert(editor: Editor, target: SmartTarget, index: MetadataIndex): void {
  const model = editor.getModel();
  const position = editor.getPosition();
  if (!model || !position) return;
  const result = smartInsert(model.getValue(), model.getOffsetAt(position), target, index);
  if (!result.edits.length) return;
  editor.pushUndoStop();
  editor.executeEdits(
    "tree",
    result.edits.map((edit) => ({ range: rangeOf(model, edit.start, edit.end), text: edit.text })),
  );
  editor.pushUndoStop();
  const selection = rangeOf(model, result.selection.start, result.selection.end);
  editor.setSelection(selection);
  editor.revealRangeInCenterIfOutsideViewport(selection);
  editor.focus();
}

/** Вставка шаблона функции. applyToField оборачивает поле выборки под курсором. */
export function insertQuerySnippet(editor: Editor, snippet: string, applyToField: boolean): void {
  const model = editor.getModel();
  const position = editor.getPosition();
  editor.pushUndoStop();
  if (applyToField && model && position) {
    const wrap = wrapSelectField(model.getValue(), model.getOffsetAt(position), snippet);
    if (wrap) {
      const selection = rangeOf(model, wrap.start, wrap.end);
      editor.setSelection(selection);
      snippetController(editor)?.insert(wrap.snippet, { adjustWhitespace: false });
      editor.pushUndoStop();
      editor.focus();
      return;
    }
  }
  snippetController(editor)?.insert(snippet);
  editor.pushUndoStop();
  editor.focus();
}

/**
 * Добавляет в конец пакета следующий запрос: точка с запятой на отдельной строке,
 * разделитель из «/» и «ВЫБРАТЬ» с новой строки.
 */
export function appendBatchQuery(editor: Editor): void {
  const model = editor.getModel();
  if (!model) return;
  const text = model.getValue();
  const end = text.trimEnd().length;
  const tokens = tokenize(text).filter((token) => token.kind !== "comment");
  const last = tokens[tokens.length - 1];
  const needSemicolon = Boolean(last && last.text !== ";");
  const eol = model.getEOL();
  const gap = QUERY_BATCH_SEPARATOR.replace(/\n/g, eol);
  const head = end ? (needSemicolon ? gap : gap.replace(`${eol};`, "")) : "";
  const insert = `${head}ВЫБРАТЬ${eol}`;
  editor.pushUndoStop();
  editor.executeEdits("batch", [{
    range: rangeOf(model, end, text.length),
    text: insert,
    forceMoveMarkers: true,
  }]);
  editor.pushUndoStop();
  const cursor = model.getPositionAt(end + insert.length - eol.length);
  editor.setPosition(cursor);
  editor.revealPositionInCenterIfOutsideViewport(cursor);
  editor.focus();
}

/** Выделяет диапазон текста, например параметр или запрос пакета. */
export function selectOffsetRange(editor: Editor, start: number, end: number): void {
  const model = editor.getModel();
  if (!model) return;
  const selection = rangeOf(model, start, end);
  editor.setSelection(selection);
  editor.revealRangeInCenterIfOutsideViewport(selection);
  editor.focus();
}

/**
 * Текст перетаскивания. Для реквизита, чья таблица уже есть в запросе,
 * подставляется псевдоним: `Сотр.Код`.
 */
export function dragInsertText(data: DataTransfer, queryText: string, offset: number, plain: string): string {
  const index = completionMetadata();
  const raw = data.getData(FIELD_DRAG_TYPE);
  if (!index || !raw) return plain;
  try {
    const { table, field } = JSON.parse(raw) as { table: string[]; field: string };
    const alias = tableAlias(queryText, offset, table, index);
    return alias ? `${alias}.${field}` : plain;
  } catch {
    return plain;
  }
}

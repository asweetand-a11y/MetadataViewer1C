/**
 * Подсветка синтаксических ошибок запроса в Monaco.
 * Проверка идёт в потоке webview после паузы в наборе: сборка webview — один чанк,
 * отдельный Worker в неё не попадает.
 */

import * as monaco from "monaco-editor";
import { checkSyntax } from "./syntax-check";

/** Владелец маркеров: по нему их можно снять, не задев другие диагностики модели. */
export const SYNTAX_MARKER_OWNER = "sdbl-syntax";

/** Пауза в наборе перед проверкой. */
const DELAY_MS = 600;

/**
 * Включает проверку для редактора. Возвращает подписку, которую нужно снять
 * вместе с редактором.
 */
export function attachQuerySyntaxCheck(editor: monaco.editor.IStandaloneCodeEditor): monaco.IDisposable {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let requestId = 0;

  const setMarkers = (markers: monaco.editor.IMarkerData[]) => {
    const model = editor.getModel();
    if (!model) return;
    monaco.editor.setModelMarkers(model, SYNTAX_MARKER_OWNER, markers);
  };

  const run = () => {
    const model = editor.getModel();
    if (!model) return;
    const id = ++requestId;
    const version = model.getVersionId();
    const text = model.getValue();
    let errors: ReturnType<typeof checkSyntax> = [];
    try {
      errors = checkSyntax(text);
    } catch (error) {
      // Сбой самого разборщика — не повод показывать пользователю ошибку в запросе.
      console.error("Проверка синтаксиса:", error);
    }
    const current = editor.getModel();
    if (!current || id !== requestId || current.getVersionId() !== version) return;
    setMarkers(
      errors.map((error) => {
        const start = current.getPositionAt(error.start);
        const end = current.getPositionAt(error.end);
        return {
          severity: monaco.MarkerSeverity.Error,
          message: error.message,
          source: "Синтаксис",
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column,
        };
      }),
    );
  };

  const schedule = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(run, DELAY_MS);
  };

  const contentSub = editor.onDidChangeModelContent(() => {
    const model = editor.getModel();
    const position = editor.getPosition();
    if (model && position) {
      // Строку, которую сейчас набирают, не подчёркиваем до паузы.
      const markers = monaco.editor.getModelMarkers({ owner: SYNTAX_MARKER_OWNER, resource: model.uri });
      const rest = markers.filter(
        (marker) => marker.startLineNumber > position.lineNumber || marker.endLineNumber < position.lineNumber,
      );
      if (rest.length !== markers.length) {
        setMarkers(
          rest.map((marker) => ({
            severity: marker.severity,
            message: marker.message,
            source: marker.source,
            startLineNumber: marker.startLineNumber,
            startColumn: marker.startColumn,
            endLineNumber: marker.endLineNumber,
            endColumn: marker.endColumn,
          })),
        );
      }
    }
    schedule();
  });

  schedule();

  return {
    dispose() {
      if (timer !== undefined) clearTimeout(timer);
      requestId++;
      const model = editor.getModel();
      if (model) monaco.editor.setModelMarkers(model, SYNTAX_MARKER_OWNER, []);
      contentSub.dispose();
    },
  };
}

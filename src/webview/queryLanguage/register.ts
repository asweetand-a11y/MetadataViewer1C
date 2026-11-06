/**
 * Регистрация языка запросов 1С в Monaco: подсветка, автодополнение,
 * форматирование и связанная правка псевдонима.
 */

import type * as MonacoApi from "monaco-editor";
import { registerCompletion } from "./completion/provider";
import { formatQuery } from "./formatter";
import { LANGUAGE_ID, languageConfiguration, monarchLanguage } from "./grammar";
import { linkedAliasRanges } from "./linked-aliases";
import { SYNTAX_MARKER_OWNER } from "../querySyntax/attachQuerySyntaxCheck";

type Monaco = typeof MonacoApi;

const REGISTRATION = Symbol.for("metadataViewer.query.registration");
type RegistrationStore = { [REGISTRATION]?: MonacoApi.IDisposable[] };

const ALIAS_PATTERN = /[\p{L}_][\p{L}\p{N}_]*/u;

/** Регистрирует язык `1c-query`. Повторный вызов заменяет провайдеры. */
export function registerQueryLanguage(monaco: Monaco): void {
  const store = globalThis as RegistrationStore;
  store[REGISTRATION]?.forEach((registration) => registration.dispose());

  if (!monaco.languages.getLanguages().some((lang) => lang.id === LANGUAGE_ID)) {
    monaco.languages.register({
      id: LANGUAGE_ID,
      aliases: ["Язык запросов 1С", "1C Query"],
    });
  }

  store[REGISTRATION] = [
    monaco.languages.setLanguageConfiguration(LANGUAGE_ID, languageConfiguration),
    monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, monarchLanguage),
    monaco.languages.registerDocumentFormattingEditProvider(LANGUAGE_ID, {
      provideDocumentFormattingEdits(model) {
        const [error] = monaco.editor
          .getModelMarkers({ owner: SYNTAX_MARKER_OWNER, resource: model.uri })
          .sort((a, b) => a.startLineNumber - b.startLineNumber || a.startColumn - b.startColumn);
        if (error) return [];
        const text = model.getValue();
        const formatted = formatQuery(text);
        return formatted === text ? [] : [{ range: model.getFullModelRange(), text: formatted }];
      },
    }),
    ...registerCompletion(monaco, LANGUAGE_ID),
    monaco.languages.registerLinkedEditingRangeProvider(LANGUAGE_ID, {
      provideLinkedEditingRanges(model, position) {
        const ranges = linkedAliasRanges(model.getValue(), model.getOffsetAt(position));
        if (!ranges) return null;
        return {
          ranges: ranges.map(({ start, end }) => monaco.Range.fromPositions(model.getPositionAt(start), model.getPositionAt(end))),
          wordPattern: ALIAS_PATTERN,
        };
      },
    }),
  ];
}

/**
 * Типы для webview сообщений и общих интерфейсов
 */

import { ParsedMetadataObject } from "../xmlParsers/metadataParser";
import { ParsedFormFull } from "../xmlParsers/formParser";
import type { ParsedReportDcs } from "../xmlParsers/dcsParserXmldom";
// Типы сообщений от webview к extension
export type WebviewMessage = SaveCurrentMessage | OpenSourceMessage | OpenFormEditorMessage | SaveFormMessage;

export interface SaveCurrentMessage {
    type: "saveCurrent";
    payload: ParsedMetadataObject;
}

export interface OpenSourceMessage {
    type: "openSource";
    payload: {
        sourcePath: string;
        context?: {
            kind: "Attribute" | "Property";
            name: string;
        };
    };
}

export interface OpenFormEditorMessage {
    type: "openFormEditor";
    payload: {
        objectPath: string;
        formName: string;
    };
}

export interface SaveFormMessage {
    type: "saveForm";
    payload: any; // ParsedFormFull
}

// Типы сообщений от extension к webview
export interface InitMessage {
    type: "init";
    payload: ParsedMetadataObject[];
    metadata?: {
        /** Список всех регистров для редактора RegisterRecords */
        registers: string[];
        /** Список всех объектов метаданных для редактора типов (CatalogRef.Номенклатура, DocumentRef.Продажа и т.д.) */
        referenceTypes: string[];
    };
}

/** Перечисления для выпадающих списков в редакторе свойств формы (XcfLogForm.enums.json). */
export interface FormSchemaEnumsPayload {
    byProperty: Record<string, string[]>;
    byParentProperty?: Record<string, Record<string, string[]>>;
}

/**
 * Инициализация preview формы (extension -> webview).
 * Используется для EDT-подобного предпросмотра структуры формы.
 */
export interface FormPreviewInitMessage {
    type: "formPreviewInit";
    payload: ParsedFormFull;
    metadata?: {
        registers: string[];
        referenceTypes: string[];
    };
    formSchemaEnums?: FormSchemaEnumsPayload;
}

/**
 * Инициализация «Редактор СКД» (extension -> webview).
 */
export interface DcsEditorInitMessage {
    type: "dcsEditorInit";
    payload: ParsedReportDcs;
    metadata?: {
        registers: string[];
        referenceTypes: string[];
    };
}

// Результат операции
export interface OperationResult<T = void> {
    success: boolean;
    data?: T;
    error?: string;
}


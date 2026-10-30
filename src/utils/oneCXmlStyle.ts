/**
 * Запись XML в стиле выгрузки Конфигуратора.
 * Повторяет meta-edit: save_xml / _detect_xml_style / _finalize_xml_bytes.
 * xmldom при сериализации снимает BOM и подменяет CRLF на LF — загрузчик
 * тогда видит файл не как объект этой выгрузки.
 */

import * as fs from 'fs';

export interface OneCXmlStyle {
    bom: boolean;
    crlf: boolean;
    enc: string;
    finalNl: boolean;
}

/** Новый файл: UTF-8, CRLF, BOM, без перевода строки после корневого тега. */
export const NEW_ONE_C_XML_STYLE: OneCXmlStyle = {
    bom: true,
    crlf: true,
    enc: 'UTF-8',
    finalNl: false,
};

/**
 * Стиль уже существующего файла. Нет файла — null.
 * Файл без BOM и без CRLF считаем испорченным нашей прошлой записью и
 * возвращаем канон выгрузки, чтобы следующее сохранение его восстановило.
 */
export function styleForExistingOneCXml(filePath: string): OneCXmlStyle {
    if (!fs.existsSync(filePath)) {
        return NEW_ONE_C_XML_STYLE;
    }
    const raw = fs.readFileSync(filePath);
    const bom = raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
    const body = bom ? raw.subarray(3) : raw;
    const head = body.subarray(0, 200).toString('utf8');
    const encoding = head.match(/encoding="([^"]+)"/);
    const style: OneCXmlStyle = {
        bom,
        crlf: body.includes(Buffer.from('\r\n')),
        enc: encoding ? encoding[1] : 'UTF-8',
        finalNl: body.length > 0 && body[body.length - 1] === 0x0a,
    };
    if (!style.bom && !style.crlf) {
        return NEW_ONE_C_XML_STYLE;
    }
    return style;
}

/**
 * Приводит строку XML к стилю файла. style = null — канон нового файла.
 */
export function finalizeOneCXml(xml: string, style: OneCXmlStyle | null): string {
    const effective = style ?? NEW_ONE_C_XML_STYLE;
    let text = xml.charCodeAt(0) === 0xfeff ? xml.slice(1) : xml;
    const declaration = `<?xml version="1.0" encoding="${effective.enc}"?>`;
    text = text.replace(
        /<\?xml version=['"]1\.0['"] encoding=['"][^'"]+['"]\?>/i,
        declaration
    );
    text = text
        .replace(/&#13;\n/g, '\n')
        .replace(/&#13;/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    text = text.replace(/\n+$/, '');
    if (effective.finalNl) {
        text += '\n';
    }
    if (effective.crlf) {
        text = text.replace(/\n/g, '\r\n');
    }
    if (effective.bom) {
        text = `\uFEFF${text}`;
    }
    return text;
}

export interface TemplateFile {
	document: TemplateDocument;
}

export interface TemplateDocument {
	rowsItem: TemplateRow[];
	columns: TemplateColumns[];
	format: TemplateFormat[];
	merge: TemplateMergeCells[];
	font: TemplateFont[];
	namedItem?: NamedItem[];
	languageSettings?: unknown;
	templateMode?: unknown;
	defaultFormatIndex?: number;
	height?: number;
	vgRows?: number;
	drawing?: unknown[];
	picture?: unknown[];
	printSettings?: unknown;
	printArea?: unknown;
	line?: unknown[];
	leftHeader?: unknown;
	centerHeader?: unknown;
	rightHeader?: unknown;
	leftFooter?: unknown;
	centerFooter?: unknown;
	rightFooter?: unknown;
}

export interface TemplateColumns {
	id?: string;  // Может отсутствовать для формата по умолчанию
	size: number;
	columnsItem: ColumnsItem[];
	/** Общий formatIndex группы колонок (<columns><formatIndex>), 1-based как в XML */
	formatIndex?: number;
}

interface ColumnsItem {
	index: number;
	column: ColumnsItemFormat
}

interface ColumnsItemFormat {
	formatIndex: number;
}

export interface TemplateFormat {
	width?: string | number;  // Может быть строкой (например, "100px") или числом
	height?: string | number;  // Может быть строкой (например, "20px") или числом
	horizontalAlignment?: string;
	verticalAlignment?: string;
	bySelectedColumns?: string;
	border?: number;
	leftBorder?: number;
	topBorder?: number;
	bottomBorder?: number;
	rightBorder?: number;
	/** Общий цвет рамки (элемент borderColor в format), «Авто» в 1С — как правило отсутствует или стиль */
	borderColor?: string;
	// Свойства границ: тип линии, толщина, цвет
	leftBorderLineType?: string;  // сплошная, точечная, двойная, редкий пунктир, частый пунктир, большой пунктир
	leftBorderWidth?: number;     // толщина в пикселях
	leftBorderColor?: string;     // цвет границы
	topBorderLineType?: string;
	topBorderWidth?: number;
	topBorderColor?: string;
	bottomBorderLineType?: string;
	bottomBorderWidth?: number;
	bottomBorderColor?: string;
	rightBorderLineType?: string;
	rightBorderWidth?: number;
	rightBorderColor?: string;
	textPlacement?: string;  // Wrap, Clip, None
	textOrientation?: number;  // Угол ориентации текста в градусах (0, 90, 180, 270)
	font?: number;
	fillType?: string;  // Parameter, Text
	indent?: number;
	autoIndent?: number;
	leftMargin?: number;
	rightMargin?: number;
	topMargin?: number;
	bottomMargin?: number;
	textColor?: string;  // Может быть стиль: "style:NegativeTextColor"
	backColor?: string;  // Может быть стиль: "style:ToolTipBackColor"
	format?: TemplateTextData;  // Вложенный формат для чисел/дат (структура с v8:item/v8:content)
	markNegatives?: boolean;  // Отметка отрицательных чисел
}

export interface TemplateFont {
	$_faceName: string;
	$_height: number;
	$_bold: string;
	$_italic: string;
	$_underline: string;
	$_strikeout: string;
	$_kind: string;
	$_scale: string;
}

export interface TemplateMergeCells {
	r: number;
	c: number;
	w: number;
	h?: number;  // Высота может отсутствовать (объединение только по горизонтали)
}

export interface TemplateRow {
	index: number;
	row: TemplateColumn;
}

export interface TemplateColumn {
	columnsID?: string;  // Может отсутствовать
	formatIndex?: number;  // Может отсутствовать
	empty?: boolean;  // Признак пустой строки (<empty>true</empty>)
	c?: TemplateCell[];  // Может отсутствовать для пустых строк
}

export interface TemplateCell {
	i?: number;  // Индекс определяется порядком, если отсутствует
	c: TemplateCellData;
}

export interface TemplateCellData {
	f?: number;  // Индекс формата (может отсутствовать)
	parameter?: string;     // Имя параметра (формат "параметр") - элемент <parameter>, не атрибут!
	tl?: TemplateTextData;  // Текстовое содержимое (формат "шаблон") - элемент <tl>
	detailParameter?: string;  // Параметр расшифровки (элемент <detailParameter>)
	note?: TemplateCellNote;  // Примечание к ячейке (сложная структура)
}

// Примечание к ячейке
export interface TemplateCellNote {
	drawingType?: string;  // Comment
	id?: number;
	formatIndex?: number;
	text?: TemplateTextData | string;  // Текст примечания (v8:item/v8:content или строка)
	beginRow?: number;
	beginRowOffset?: number;
	endRow?: number;
	endRowOffset?: number;
	beginColumn?: number;
	beginColumnOffset?: number;
	endColumn?: number;
	endColumnOffset?: number;
	autoSize?: boolean;
	pictureSize?: string;  // Stretch
}

export interface TemplateTextData {
	[key: string]: any;  // Может быть строкой, объектом с v8:item/v8:content, или вложенной структурой
}

// Именованные области
export interface NamedItem {
	'$xsi:type'?: 'NamedItemCells';  // xsi:type="NamedItemCells"
	'xsi:type'?: 'NamedItemCells';   // Альтернативный вариант парсинга
	name: string;                    // Имя области
	area: NamedItemArea;             // Описание области
}

export interface NamedItemArea {
	type: 'Rectangle' | 'Rows' | 'Columns' | 'Row' | 'Column' | string;  // Тип области
	beginRow: number;     // Начальная строка (-1 для типа Columns означает все строки)
	endRow: number;       // Конечная строка (-1 для типа Columns означает все строки)
	beginColumn: number;  // Начальная колонка (-1 для типа Rows означает все колонки)
	endColumn: number;    // Конечная колонка (-1 для типа Rows означает все колонки)
	columnsID?: string;  // Привязка к формату строк
}

// Вспомогательные типы для редактора
export interface CellPosition {
	row: number;
	col: number;
}

export interface CellRange {
	startRow: number;
	startCol: number;
	endRow: number;
	endCol: number;
}

export interface NamedArea {
	name: string;
	areaType: string;
	startRow: number;
	startCol: number;
	endRow: number;
	endCol: number;
	columnsID?: string;  // Привязка к формату строк
}

export interface FormatBuilder {
	type: 'number' | 'date' | 'boolean';
	options?: any;
}
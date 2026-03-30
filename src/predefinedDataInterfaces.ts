export interface PredefinedDataFile {
	PredefinedData: PredefinedData;
}

export interface PredefinedData {
	Item: PredefinedDataItem[];
}

export interface PredefinedDataItem {
	ChildItems?: PredefinedData;
	Code: string;
	Description?: string;
	IsFolder?: boolean;
	Name: string;
	Type?: string; // Тип ссылки, например: "d4p1:CatalogRef.Контрагенты"
	id?: string; // Для отслеживания элементов при редактировании
	// Поля для плана счетов
	Parent?: string; // Имя родительского элемента (только для отображения, вычисляется из иерархии)
	AccountType?: 'Active' | 'Passive' | 'ActivePassive'; // Вид счета
	OffBalance?: boolean; // Забалансовый счет
	Order?: string; // Порядок
	AccountingFlags?: Array<{ flagName: string; enabled: boolean; ref?: string }>; // Признаки учета
	ExtDimensionTypes?: Array<{ 
		dimensionType: string; // Вид субконто (имя предопределенного элемента)
		turnoverOnly: boolean; // Только обороты
		flags: Record<string, boolean | { enabled: boolean; ref?: string }>; // Признаки учета по субконто (ключ - имя признака, значение - включен/выключен или объект с enabled и ref)
		name?: string; // Полное имя вида субконто (для сохранения)
	}>; // Виды субконто
	// Поля для плана видов расчёта (PredefinedData xsi:type="CalculationTypePredefinedItems")
	Displaced?: string[]; // вытесняющие: полные пути ChartOfCalculationTypes.План.Вид
	Leading?: string[]; // ведущие виды расчёта
	Base?: string[]; // базовые виды расчёта
	ActionPeriodIsBase?: boolean; // базовый период действия
}
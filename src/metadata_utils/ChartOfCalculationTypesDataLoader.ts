/**
 * Контекст для редактора предопределённых видов расчёта: ссылки ChartOfCalculationTypes.<План>.<Имя>
 * по всем планам в каталоге cf/ChartsOfCalculationTypes.
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { parsePredefinedXmlWithDom } from '../xmlParsers/predefinedParser';

export interface ChartOfCalculationTypesPlanRefs {
    chartName: string;
    refs: string[];
}

export interface ChartOfCalculationTypesEditorContext {
    /** Имя текущего плана (каталог объекта). */
    currentPlanName: string;
    /** Группы ссылок по каждому плану, у которого есть Ext/Predefined.xml */
    groups: ChartOfCalculationTypesPlanRefs[];
}

/**
 * Сканирует ChartsOfCalculationTypes и собирает полные ссылки на предопределённые виды расчёта.
 */
export async function loadChartOfCalculationTypesEditorContext(
    configRoot: string,
    currentPlanName: string
): Promise<ChartOfCalculationTypesEditorContext> {
    const base = path.join(configRoot, 'ChartsOfCalculationTypes');
    const groups: ChartOfCalculationTypesPlanRefs[] = [];
    let entries: Awaited<ReturnType<typeof fs.readdir>>;
    try {
        entries = await fs.readdir(base, { withFileTypes: true });
    } catch {
        return { currentPlanName, groups: [] };
    }
    for (const ent of entries) {
        if (!ent.isDirectory()) {
            continue;
        }
        const chartName = ent.name;
        const predPath = path.join(base, chartName, 'Ext', 'Predefined.xml');
        try {
            await fs.access(predPath);
        } catch {
            continue;
        }
        try {
            const { items } = await parsePredefinedXmlWithDom(predPath);
            const refs: string[] = [];
            for (const it of items) {
                if (it.Name) {
                    refs.push(`ChartOfCalculationTypes.${chartName}.${it.Name}`);
                }
            }
            groups.push({ chartName, refs });
        } catch {
            // пропускаем битый файл
        }
    }
    return { currentPlanName, groups };
}

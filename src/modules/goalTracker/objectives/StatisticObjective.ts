import { Observable } from 'knockout';
import { ObjectiveOption } from './ObjectiveTypes';
import { camelCaseToString } from '../../GameConstants';

export interface StatisticObjectiveConfig {
    statistic: Observable<string>;
}

export const statisticObjectiveOption: ObjectiveOption<StatisticObjectiveConfig> = {
    options: [
        {
            key: 'statistic',
            label: 'Statistic',
            values: () => ko.pureComputed(() => {
                return App.game.statistics.observables
                    .sort((a, b) => a.localeCompare(b))
                    .map(s => ({ name: camelCaseToString(s), value: s }));
            }),
        },
    ],
    getProgress: (config: StatisticObjectiveConfig) => {
        return ko.pureComputed((): number => {
            const statistic = config.statistic?.();
            return App.game.statistics[statistic]?.() ?? 0;
        });
    },
    createConfig: (): StatisticObjectiveConfig => ({ statistic: ko.observable() }),
    getDisplayName: (config: StatisticObjectiveConfig) => {
        return ko.pureComputed(() => {
            const statistic = config.statistic();
            if (statistic === undefined) return 'Unconfigured Objective';
            return camelCaseToString(statistic);
        });
    },
};

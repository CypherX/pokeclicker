import { Observable } from 'knockout';
import { ObjectiveOption } from './ObjectiveTypes';
import { SortOptionConfigs, SortOptions } from '../../settings/SortOptions';
import { PartyAggregateType } from '../PartyAggregateType';

export interface PartyAggregateObjectiveConfig {
    metric: Observable<string>;
    aggregateType: Observable<PartyAggregateType>;
    threshold: Observable<number>;
}

export const partyAggregateObjectiveOption: ObjectiveOption<PartyAggregateObjectiveConfig> = {
    label: 'Party Aggregate',
    options: [
        {
            key: 'metric',
            label: 'Metric',
            values: () => ko.pureComputed(() => {
                return [
                    SortOptions.attackMaxLevel,
                    SortOptions.evs,
                    SortOptions.evBonus,
                ].map((option) => ({ name: SortOptionConfigs[option].text, value: SortOptions[option] }));
            }),
        },
        {
            key: 'aggregateType',
            label: 'Aggregate Type',
            values: () => ko.pureComputed(() => [
                { name: 'Lowest in Party', value: PartyAggregateType.Minimum },
                { name: 'Highest in Party', value: PartyAggregateType.Maximum },
                { name: 'Total Combined', value: PartyAggregateType.Sum },
                { name: 'Count: Pokémon Above...', value: PartyAggregateType.CountAbove },
                { name: 'Count: Pokémon Below...', value: PartyAggregateType.CountBelow },
            ]),
        },
        {
            key: 'threshold',
            label: 'Metric Threshold',
            type: 'number',
            visible: (config: PartyAggregateObjectiveConfig) => ko.pureComputed(() => {
                const type = config.aggregateType();
                return type === PartyAggregateType.CountAbove || type === PartyAggregateType.CountBelow;
            }),
        },
    ],
    getProgress: (config: PartyAggregateObjectiveConfig) => {
        return ko.pureComputed((): number => {
            const metric = config.metric?.();
            const type = config.aggregateType?.();
            const threshold = Number(config.threshold?.()) || 0;

            if (metric === undefined || type === undefined) return 0;

            const sortOption = SortOptions[metric];
            if (!sortOption) return 0;

            const values = App.game.party.caughtPokemon.map(p => SortOptionConfigs[sortOption].getValue(p));
            switch (type) {
                case PartyAggregateType.Minimum:
                    return values.length ? Math.min(...values) : 0;
                case PartyAggregateType.Maximum:
                    return values.length ? Math.max(...values) : 0;
                case PartyAggregateType.Sum:
                    return values.reduce((sum, val) => sum + val, 0);
                case PartyAggregateType.CountAbove:
                    return values.filter(v => v >= threshold).length;
                case PartyAggregateType.CountBelow:
                    return values.filter(v => v <= threshold).length;
                default:
                    return 0;
            }
        }).extend({ rateLimit: 1000 });
    },
    createConfig: (): PartyAggregateObjectiveConfig => ({
        metric: ko.observable(),
        aggregateType: ko.observable(),
        threshold: ko.observable(0),
    }),
    getDisplayName: (config: PartyAggregateObjectiveConfig) => {
        return ko.pureComputed(() => {
            const metric = config.metric();
            const type = config.aggregateType();
            const threshold = Number(config.threshold?.()) || 0;

            if (metric === undefined || type === undefined) return 'Unconfigured Objective';

            const metricLabel = SortOptionConfigs[SortOptions[metric]]?.text ?? 'Unknown Metric';

            switch (type) {
                case PartyAggregateType.Minimum:
                    return `Lowest [${metricLabel}] in Party`;
                case PartyAggregateType.Maximum:
                    return `Highest [${metricLabel}] in Party`;
                case PartyAggregateType.Sum:
                    return `Total Party [${metricLabel}]`;
                case PartyAggregateType.CountAbove:
                    return `Pokémon with ${threshold.toLocaleString('en-US')} or higher [${metricLabel}]`;
                case PartyAggregateType.CountBelow:
                    return `Pokémon with ${threshold.toLocaleString('en-US')} or lower [${metricLabel}]`;
                default:
                    return 'Unconfigured Objective';
            }
        });
    },
};

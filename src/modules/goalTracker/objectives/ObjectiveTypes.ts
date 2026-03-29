import { PureComputed } from 'knockout';

export enum ObjectiveType {
    Item,
    Pokemon,
    Currency,
    Statistic,
    Berry,
    GymClear,
    DungeonClear,
    Gem,
    PartyAggregate,
}

export interface ObjectiveOption<TConfig> {
    label?: string;
    options: {
        [K in keyof TConfig]: {
            key: K;
            label: string;
            type?: 'dropdown' | 'number';
            searchable?: boolean;
            values?: (config?: TConfig) => PureComputed<{ name: string; value: any }[]>;
            visible?: (config: TConfig) => PureComputed<boolean>;
        }
    }[keyof TConfig][];
    getProgress: (config: TConfig) => PureComputed<number>;
    getDisplayName?: (config: TConfig) => PureComputed<string>;
    createConfig: () => TConfig;
}

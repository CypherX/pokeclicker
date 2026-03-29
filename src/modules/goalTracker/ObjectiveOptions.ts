import { Observable, PureComputed } from 'knockout';
import { camelCaseToString, Currency, getDungeonIndex, getGymIndex, Region } from '../GameConstants';
import { ItemList } from '../items/ItemList';
import { ItemNameType } from '../items/ItemNameType';
import { pokemonMap } from '../pokemons/PokemonList';
import { PokemonNameType } from '../pokemons/PokemonNameType';
import { SortOptions, SortOptionConfigs } from '../settings/SortOptions';
import { itemCategoryDefinitions, itemsByCategory } from './ItemCategories';
import BerryType from '../enums/BerryType';
import GameHelper from '../GameHelper';
import SubRegions from '../subRegion/SubRegions';
import PokemonType from '../enums/PokemonType';
import { PartyAggregateType } from './PartyAggregates';

export enum ObjectiveType {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    Item,
    Pokemon,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    Currency,
    Statistic,
    Berry,
    GymClear,
    DungeonClear,
    Gem,
    PartyAggregate,
}

export interface ItemObjectiveConfig {
    category: Observable<string>;
    item: Observable<ItemNameType>;
}

export interface PokemonObjectiveConfig {
    pokemon: Observable<PokemonNameType>;
    property: Observable<string>;
}

export interface CurrencyObjectiveConfig {
    currency: Observable<Currency>;
}

export interface StatisticObjectiveConfig {
    statistic: Observable<string>;
}

export interface BerryObjectiveConfig {
    berry: Observable<BerryType>;
}

export interface GymClearObjectiveConfig {
    region: Observable<Region>;
    gymTown: Observable<string>;
}

export interface DungeonClearObjectiveConfig {
    region: Observable<Region>;
    dungeonName: Observable<string>;
}

export interface GemObjectiveConfig {
    gem: Observable<PokemonType>;
}

export interface PartyAggregateObjectiveConfig {
    metric: Observable<string>;
    aggregateType: Observable<PartyAggregateType>;
    threshold: Observable<number>;
}

export type ObjectiveConfig =
    | ItemObjectiveConfig
    | PokemonObjectiveConfig
    | CurrencyObjectiveConfig
    | StatisticObjectiveConfig
    | BerryObjectiveConfig
    | GymClearObjectiveConfig
    | DungeonClearObjectiveConfig
    | GemObjectiveConfig
    | PartyAggregateObjectiveConfig;

export type ObjectiveTypeToConfig = {
    [ObjectiveType.Item]: ItemObjectiveConfig;
    [ObjectiveType.Pokemon]: PokemonObjectiveConfig;
    [ObjectiveType.Currency]: CurrencyObjectiveConfig;
    [ObjectiveType.Statistic]: StatisticObjectiveConfig;
    [ObjectiveType.Berry]: BerryObjectiveConfig;
    [ObjectiveType.GymClear]: GymClearObjectiveConfig;
    [ObjectiveType.DungeonClear]: DungeonClearObjectiveConfig
    [ObjectiveType.Gem] : GemObjectiveConfig;
    [ObjectiveType.PartyAggregate]: PartyAggregateObjectiveConfig;
};

interface ObjectiveOption<TConfig> {
    label?: string,
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
    createConfig: () => TConfig;
}

export const objectiveOptions: {
    [K in ObjectiveType]: ObjectiveOption<ObjectiveTypeToConfig[K]>;
} = {
    [ObjectiveType.Item]: {
        options: [
            {
                key: 'category',
                label: 'Category',
                values: () => ko.pureComputed(() => {
                    return itemCategoryDefinitions
                        .filter(def => itemsByCategory()[def.key].length > 0)
                        .map(def => ({ name: def.label, value: def.key }))
                        .sort((a, b) => a.name.localeCompare(b.name));
                }),
            },
            {
                key: 'item',
                label: 'Item',
                searchable: true,
                values: (config: ItemObjectiveConfig) => ko.pureComputed(() => {
                    const category = config.category?.();
                    if (!category) {
                        return [];
                    }

                    return itemsByCategory()[category]
                        .sort((a, b) => a.displayName.localeCompare(b.displayName))
                        .map(item => ({ name: item.displayName, value: item.name }));
                }),
            },
        ],
        getProgress: (config: ItemObjectiveConfig) => {
            return ko.pureComputed((): number => {
                return ItemList[config.item?.()]?.getBagAmount() ?? 0;
            });
        },
        createConfig: (): ItemObjectiveConfig => ({ category: ko.observable(), item: ko.observable() }),
    },
    [ObjectiveType.Pokemon]: {
        options: [
            {
                key: 'pokemon',
                label: 'Pokémon',
                searchable: true,
                values: () => ko.pureComputed(() => {
                    return [...App.game.party.caughtPokemon]
                        .sort((a, b) => a.id - b.id)
                        .map(p => ({ name: `#${Math.floor(p.id).toString().padStart(3, '0')} - ${p.displayName}`, value: p.name }));
                }),
            },
            {
                key: 'property',
                label: 'Property',
                values: () => ko.pureComputed(() => {
                    const options = [SortOptions.attackMaxLevel, SortOptions.evs, SortOptions.evBonus]
                        .map((option) => ({ name: SortOptionConfigs[option].text, value: SortOptions[option] }));

                    options.push(...[
                        { name: 'Total Encountered', value: 'pokemonEncountered' },
                        { name: 'Total Defeated', value: 'pokemonDefeated' },
                        { name: 'Total Captured', value: 'pokemonCaptured' },
                        { name: 'Total Hatched', value: 'pokemonHatched' },
                        { name: 'Total Shiny Encountered', value: 'shinyPokemonEncountered' },
                        { name: 'Total Shiny Defeated', value: 'shinyPokemonDefeated' },
                        { name: 'Total Shiny Captured', value: 'shinyPokemonCaptured' },
                        { name: 'Total Shiny Hatched', value: 'shinyPokemonHatched' },
                    ]);

                    return options;
                }),
            },
        ],
        getProgress: (config: PokemonObjectiveConfig) => {
            return ko.pureComputed((): number => {
                const pokemonName = config.pokemon?.();
                const property = config.property?.();

                const statistic = App.game.statistics[property];
                if (statistic) {
                    const id = pokemonMap[pokemonName].id;
                    return App.game.statistics[property][id]?.() ?? 0;
                }

                const partyPokemon = App.game.party.getPokemonByName(pokemonName);
                const sortOption = SortOptions[property];
                if (partyPokemon && sortOption) {
                    return SortOptionConfigs[sortOption].getValue(partyPokemon);
                }

                return 0;
            });
        },
        createConfig: (): PokemonObjectiveConfig => ({ pokemon: ko.observable(), property: ko.observable() }),
    },
    [ObjectiveType.Currency]: {
        options: [
            {
                key: 'currency',
                label: 'Currency',
                values: () => ko.pureComputed(() => {
                    return GameHelper.enumNumbers(Currency)
                        .map((c) => ({ name: camelCaseToString(Currency[c]), value: c }));
                }),
            },
        ],
        getProgress: (config: CurrencyObjectiveConfig) => {
            return ko.pureComputed((): number => {
                const currency = config.currency?.();
                return App.game.wallet.currencies[currency]?.() ?? 0;
            });
        },
        createConfig: (): CurrencyObjectiveConfig => ({ currency: ko.observable() }),
    },
    [ObjectiveType.Statistic]: {
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
    },
    [ObjectiveType.Berry]: {
        options: [
            {
                key: 'berry',
                label: 'Berry',
                searchable: true,
                values: () => ko.pureComputed(() => {
                    return App.game.farming.unlockedBerries
                        .filter(unlocked => unlocked())
                        .map((_, i) => ({ name: `#${(i + 1).toString().padStart(2, '0')} - ${BerryType[i]}`, value: i }));
                }),
            },
        ],
        getProgress: (config: BerryObjectiveConfig) => {
            return ko.pureComputed((): number => {
                const berry = config.berry?.();
                return App.game.farming.berryList[berry]?.() ?? 0;
            });
        },
        createConfig: (): BerryObjectiveConfig => ({ berry: ko.observable() }),
    },
    [ObjectiveType.GymClear]: {
        label: 'Gym Clears',
        options: [
            {
                key: 'region',
                label: 'Region',
                values: () => ko.pureComputed(() => {
                    return GameHelper.enumNumbers(Region)
                        .filter((r) => (r <= player.highestRegion() && r > Region.none))
                        .map((r) => ({ name: camelCaseToString(Region[r]), value: r }));
                }),
            },
            {
                key: 'gymTown',
                label: 'Gym',
                values: (config: GymClearObjectiveConfig) => ko.pureComputed(() => {
                    const region = config.region?.();
                    if (region === undefined) {
                        return [];
                    }

                    const gymList = Object.values(GymList)
                        .filter((gym) => gym.parent?.region === region && (gym.parent?.subRegion === 0 || SubRegions.isSubRegionUnlocked(region, gym.parent.subRegion ?? 0)))
                        .map((gym) => gym.town);

                    return gymList.map((gymTown) => ({
                        name: `${GymList[gymTown].leaderName} - ${GymList[gymTown].parent.name}`,
                        value: gymTown,
                    }));
                }),
            },
        ],
        getProgress: (config: GymClearObjectiveConfig) => {
            return ko.pureComputed((): number => {
                const gymTown = config.gymTown?.();
                return App.game.statistics.gymsDefeated[getGymIndex(gymTown)]();
            });
        },
        createConfig: (): GymClearObjectiveConfig => ({ region: ko.observable(), gymTown: ko.observable() }),
    },
    [ObjectiveType.DungeonClear]: {
        label: 'Dungeon Clears',
        options: [
            {
                key: 'region',
                label: 'Region',
                values: () => ko.pureComputed(() => {
                    return GameHelper.enumNumbers(Region)
                        .filter((r) => (r <= player.highestRegion() && r > Region.none))
                        .map((r) => ({ name: camelCaseToString(Region[r]), value: r }));
                }),
            },
            {
                key: 'dungeonName',
                label: 'Dungeon',
                values: (config: DungeonClearObjectiveConfig) => ko.pureComputed(() => {
                    const region = config.region?.();
                    if (region === undefined) {
                        return [];
                    }

                    const dungeons = Object.values(dungeonList)
                        .filter((dungeon) => {
                            const town = TownList[dungeon.name];
                            if (town.region !== region) {
                                return false;
                            }
                            const subRegion = town.subRegion ?? 0;
                            return subRegion === 0 || SubRegions.isSubRegionUnlocked(region, subRegion);
                        })
                        .map((dungeon) => dungeon.name);

                    return dungeons.map((dungeonName) => ({
                        name: dungeonName,
                        value: dungeonName,
                    }));
                }),
            },
        ],
        getProgress: (config: DungeonClearObjectiveConfig) => {
            return ko.pureComputed((): number => {
                const dungeonName = config.dungeonName?.();
                return App.game.statistics.dungeonsCleared[getDungeonIndex(dungeonName)]();
            });
        },
        createConfig: (): DungeonClearObjectiveConfig => ({ region: ko.observable(), dungeonName: ko.observable() }),
    },
    [ObjectiveType.Gem]: {
        options: [
            {
                key: 'gem',
                label: 'Gem',
                values: () => ko.pureComputed(() => {
                    return GameHelper.enumNumbers(PokemonType)
                        .filter(t => t !== PokemonType.None)
                        .map(t => ({ name: PokemonType[t], value: t }));
                }),
            },
        ],
        getProgress: (config: GemObjectiveConfig) => {
            return ko.pureComputed((): number => {
                const gem = config.gem?.();
                return App.game.gems.gemWallet[gem]?.() ?? 0;
            });
        },
        createConfig: (): GemObjectiveConfig => ({ gem: ko.observable() }),
    },
    [ObjectiveType.PartyAggregate]: {
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
                        return Math.min(...values);
                    case PartyAggregateType.Maximum:
                        return Math.max(...values);
                    case PartyAggregateType.Sum:
                        return values.reduce((sum, val) => sum + val, 0);
                    case PartyAggregateType.CountAbove:
                        return values.filter(v => v >= threshold).length;
                    case PartyAggregateType.CountBelow:
                        return values.filter(v => v <= threshold).length;
                    default:
                        return 0;
                }
            });
        },
        createConfig: (): PartyAggregateObjectiveConfig => ({
            metric: ko.observable(),
            aggregateType: ko.observable(),
            threshold: ko.observable(0),
        }),
    },
};

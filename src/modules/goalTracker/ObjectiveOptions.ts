import { Observable, PureComputed } from 'knockout';
import { camelCaseToString, Currency, getGymIndex, Region, RegionGyms } from '../GameConstants';
import { ItemList } from '../items/ItemList';
import { ItemNameType } from '../items/ItemNameType';
import { pokemonMap } from '../pokemons/PokemonList';
import { PokemonNameType } from '../pokemons/PokemonNameType';
import { SortOptions, SortOptionConfigs } from '../settings/SortOptions';
import { itemCategoryDefinitions, itemsByCategory } from './ItemCategories';
import BerryType from '../enums/BerryType';
import GameHelper from '../GameHelper';
import SubRegions from '../subRegion/SubRegions';

export enum ObjectiveType {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    Item,
    Pokemon,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    Currency,
    Statistic,
    Berry,
    GymClears,
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

export type ObjectiveConfig =
    | ItemObjectiveConfig
    | PokemonObjectiveConfig
    | CurrencyObjectiveConfig
    | StatisticObjectiveConfig
    | BerryObjectiveConfig
    | GymClearObjectiveConfig;

export type ObjectiveTypeToConfig = {
    [ObjectiveType.Item]: ItemObjectiveConfig;
    [ObjectiveType.Pokemon]: PokemonObjectiveConfig;
    [ObjectiveType.Currency]: CurrencyObjectiveConfig;
    [ObjectiveType.Statistic]: StatisticObjectiveConfig;
    [ObjectiveType.Berry]: BerryObjectiveConfig;
    [ObjectiveType.GymClears]: GymClearObjectiveConfig;
};

interface ObjectiveOption<TConfig> {
    label?: string,
    options: {
        [K in keyof TConfig]: {
            key: K;
            label: string;
            values: (config?: TConfig) => PureComputed<{ name: string; value: any }[]>;
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

                const sortOption = SortOptions[property];
                if (sortOption) {
                    const partyPokemon = App.game.party.getPokemonByName(pokemonName);
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
                values: () => ko.pureComputed(() => {
                    return App.game.farming.unlockedBerries
                        .filter(unlocked => unlocked())
                        .map((_, i) => ({ name: `#${(i + 1).toString().padStart(2, '0')} - ${BerryType[i]}`, value: i }));
                }),
            },
        ],
        getProgress: (config: BerryObjectiveConfig) => {
            return ko.pureComputed((): number => {
                const berry = config.berry();
                return App.game.farming.berryList[berry]?.() ?? 0;
            });
        },
        createConfig: (): BerryObjectiveConfig => ({ berry: ko.observable() }),
    },
    [ObjectiveType.GymClears]: {
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
                        .filter((gym) => gym.parent?.region === region && (gym.parent?.subRegion === 0 || SubRegions.isSubRegionUnlocked(region, gym.parent.subRegion)))
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
};

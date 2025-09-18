import GameHelper from '../GameHelper';
import { camelCaseToString } from '../GameConstants';
import { ItemList } from '../items/ItemList';
import { ItemNameType } from '../items/ItemNameType';
import { pokemonMap } from '../pokemons/PokemonList';
import { PokemonNameType } from '../pokemons/PokemonNameType';
import { SortOptions, SortOptionConfigs } from '../settings/SortOptions';
import { Observable, PureComputed } from 'knockout';

export enum ObjectiveType {
    Item,
    Pokemon,
    Statistic,
}

interface ItemObjectiveConfig {
    item: Observable<ItemNameType>;
}

interface PokemonObjectiveConfig {
    pokemon: Observable<PokemonNameType>;
    property: Observable<string>;
}

interface StatisticObjectiveConfig {
    statistic: Observable<string>;
}

export type ObjectiveConfig = ItemObjectiveConfig | PokemonObjectiveConfig | StatisticObjectiveConfig;

/*interface ObjectiveOption<T extends keyof ObjectiveConfig = string> {
    label: string;
    values: KnockoutObservableArray<string>;
    key: T; // key of config property
}

interface ObjectiveTypeDefinition<TConfig extends ObjectiveConfig> {
    options: ObjectiveOption<keyof TConfig>[];
    getProgress: (config: TConfig) => KnockoutComputed<number>;
}*/

interface ObjectiveOption<TConfig> {
    options: {
        key: string;
        label: string;
        values: () => PureComputed<{ name: string; value: any }[] | Record<string, { name: string; value: any }[]>>;
    }[];
    getProgress: (config: TConfig) => PureComputed<number>;
    createConfig: () => TConfig;
}

export const objectiveOptions: Record<ObjectiveType, ObjectiveOption<ObjectiveConfig>> = {
    [ObjectiveType.Item]: {
        options: [
            {
                key: 'item',
                label: 'Item',
                values: () => ko.pureComputed(() => {
                    const itemTypes = {
                        'Battle Items': ['BattleItem'],
                        'Eggs': ['EggItem'],
                        'Energy Restores': ['EnergyRestore'],
                        'Evolution Items': ['EvolutionStone'],
                        'Held Items': ['HeldItem'],
                        'Mega Stones': ['MegaStoneItem'],
                        'Mulch': ['MulchItem'],
                        'Poké Balls': ['PokeballItem'],
                        'Shovels': ['ShovelItem', 'MulchShovelItem'],
                        'Treasure Items': ['TreasureItem'],
                        'Vitamins': ['Vitamin'],
                    };

                    const itemList = Object.values(ItemList)
                        .sort((a, b) => a.displayName.localeCompare(b.displayName))
                        .reduce((obj, item) => {
                            const ancestorChain = GameHelper.getAncestorChain(item);
                            const category = Object.keys(itemTypes).find((key) => itemTypes[key].some((type) => ancestorChain.has(type)));
                            if (category) {
                                obj[category].push({ name: item.displayName, value: item.name });
                            }
                            return obj;
                        }, Object.fromEntries(Object.keys(itemTypes).map(key => [key, []])));

                    return itemList;
                }),
            },
        ],
        getProgress: (config: ItemObjectiveConfig) => {
            return ko.pureComputed((): number => {
                return ItemList[config.item()]?.getBagAmount() ?? 0;
            });
        },
        createConfig: (): ItemObjectiveConfig => ({ item: ko.observable<ItemNameType>(undefined) }),
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
                    const options = [SortOptions.attackMaxLevel, SortOptions.evs]
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
                const pokemonName = config.pokemon();
                const property = config.property();

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
        createConfig: (): PokemonObjectiveConfig => ({ pokemon: ko.observable<PokemonNameType>(undefined), property: ko.observable<string>(undefined) }),
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
                const statistic = config.statistic();
                return App.game.statistics[statistic]?.() ?? 0;
            });
        },
        createConfig: (): StatisticObjectiveConfig => ({ statistic: ko.observable<string>(undefined) }),
    },
};

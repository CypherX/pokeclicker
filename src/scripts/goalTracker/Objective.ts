
class Objective {
    private _type = ko.observable<ObjectiveType>(undefined);
    //public config: ObjectiveConfig = undefined;
    public _config = ko.observable<ObjectiveConfig>(undefined);
    private _name: KnockoutObservable<string>;
    private _targetAmount = ko.observable(0).extend({ numeric: 0 });

    constructor(
        //type: ObjectiveType = undefined
        name: string
    ) {
        //this._type(type);
        //const def = objectiveOptions[type];
        //this.config = def.createConfig();

        this._name = ko.observable(name);

        this._type.subscribe((type) => {
            this.config = objectiveOptions[type]?.createConfig();
        });
    }

    public getProgress = ko.pureComputed(() => {
        return objectiveOptions[this.type]?.getProgress(this.config)?.() ?? 0;
    });

    public getOptions = ko.pureComputed(() => {
        return objectiveOptions[this.type]?.options ?? [];
    });

    public isConfigured = ko.pureComputed(() => {
        if (!this.config) {
            return false;
        }

        return Object.values(this.config).every(obs => obs() !== undefined);
    });

    get type(): ObjectiveType {
        return this._type();
    }

    set type(value: ObjectiveType) {
        this._type(value);
    }

    get config(): ObjectiveConfig {
        return this._config();
    }

    set config(value: ObjectiveConfig) {
        this._config(value);
    }

    get name(): string {
        return this._name();
    }

    set name(value: string) {
        this._name(value);
    }

    get targetAmount(): number {
        return this._targetAmount();
    }

    set targetAmount(value: number) {
        this._targetAmount(value);
    }

    fromJSON(json: Record<string, any>): void {

    }
}

enum ObjectiveType {
    Item,
    Pokemon,
    Statistic,
}

interface ItemObjectiveConfig {
    item: KnockoutObservable<ItemNameType>;
}

interface PokemonObjectiveConfig {
    pokemon: KnockoutObservable<PokemonNameType>;
    property: KnockoutObservable<string>;
}

type ObjectiveConfig = ItemObjectiveConfig | PokemonObjectiveConfig;

/*interface ObjectiveOption<T extends keyof ObjectiveConfig = string> {
    label: string;
    values: KnockoutObservableArray<string>;
    key: T; // key of config property
}

interface ObjectiveTypeDefinition<TConfig extends ObjectiveConfig> {
    options: ObjectiveOption<keyof TConfig>[];
    getProgress: (config: TConfig) => KnockoutComputed<number>;
}*/

const objectiveOptions = {
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
        createConfig: (): ItemObjectiveConfig => ({ item: ko.observable(undefined) }),
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
        createConfig: (): PokemonObjectiveConfig => ({ pokemon: ko.observable(undefined), property: ko.observable(undefined) }),
    },
};



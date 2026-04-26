/// <reference path="./Shop.ts"/>

interface VeteranUnlockConfig {
    isUnlocked: KnockoutObservable<boolean>;
    checkFunction: (playerData: Record<string, any>, saveData: Record<string, any>) => boolean;
}

class VeteranShop extends Shop {
    static unlockList: Record<GameConstants.VeteranUnlock, VeteranUnlockConfig>
        = {} as Record<GameConstants.VeteranUnlock, VeteranUnlockConfig>;

    constructor(items: Item[]) {
        super(items, 'Veteran Shop');
    }

    public static initialize(): void {
        VeteranShop.addUnlock(GameConstants.VeteranUnlock.PokerusVirus, (playerData, saveData) => {
            const caughtPokemon = saveData?.party?.caughtPokemon ?? [];
            let resistCount = 0;

            for (const pokemon of caughtPokemon) {
                if (pokemon[PartyPokemonSaveKeys.pokerus] >= GameConstants.Pokerus.Resistant) {
                    resistCount++;
                    if (resistCount >= 500) {
                        return true;
                    }
                }
            }

            return false;
        });

        VeteranShop.addUnlock(GameConstants.VeteranUnlock.EventCalendar,
            (playerData, saveData) => saveData?.keyItems?.Event_calendar === true);

        VeteranShop.addUnlock(GameConstants.VeteranUnlock.ExplorerKit,
            (playerData, saveData) => saveData?.keyItems?.Explorer_kit === true);

        VeteranShop.addUnlock(GameConstants.VeteranUnlock.HoloCaster,
            (playerData, saveData) => saveData?.keyItems?.Holo_caster === true);

        VeteranShop.addUnlock(GameConstants.VeteranUnlock.WailmerPail, (playerData, saveData) => {
            const unlockedPlots = (saveData?.farming?.plotList ?? []).filter((plot) => plot.isUnlocked === true);
            return unlockedPlots.length >= GameConstants.FARM_PLOT_WIDTH * GameConstants.FARM_PLOT_HEIGHT;
        });

        VeteranShop.addUnlock(GameConstants.VeteranUnlock.SuperRod,
            (playerData, saveData) => saveData?.keyItems?.Super_rod === true);

        VeteranShop.addUnlock(GameConstants.VeteranUnlock.GemCase, (playerData, saveData) => {
            const gemUpgrades = saveData?.gems?.gemUpgrades ?? [];
            return gemUpgrades.length >= Gems.nTypes * Gems.nEffects && gemUpgrades.every((upgrade: number, index: number) => {
                const type: PokemonType = Math.floor(index / Gems.nEffects);
                const effectiveness = index % Gems.nEffects;
                return App.game.gems.validUpgrades[type][effectiveness] === false || upgrade >= GameConstants.MAX_GEM_UPGRADES;
            });
        });

        VeteranShop.addUnlock(GameConstants.VeteranUnlock.CeruleanBerryShopPermit, (playerData, saveData) => {
            const unlockedBerries = saveData?.farming?.unlockedBerries ?? [];
            return unlockedBerries[BerryType.Petaya] === true;
        });

        VeteranShop.checkUnlocks();
    }

    static addUnlock(
        unlock: GameConstants.VeteranUnlock,
        checkFunction: (playerData: Record<string, any>, saveData: Record<string, any>) => boolean
    ) {
        VeteranShop.unlockList[unlock] = {
            isUnlocked: ko.observable(false),
            checkFunction,
        };
    }

    static checkUnlocks(): void {
        const saveKeys = Object.keys(localStorage)
            .filter((k: string) => k.startsWith('save') && k !== `save${Save.key}`)
            .map((k: string) => k.replace(/^save/, ''));

        if (saveKeys.length === 0) {
            return;
        }

        const unlocks = Object.values(VeteranShop.unlockList);
        for (const saveKey of saveKeys) {
            try {
                const saveData = JSON.parse(localStorage.getItem(`save${saveKey}`));
                const playerData = JSON.parse(localStorage.getItem(`player${saveKey}`));

                for (const unlock of unlocks) {
                    if (unlock.isUnlocked()) {
                        continue;
                    }

                    unlock.isUnlocked(unlock.checkFunction(playerData, saveData));
                }
            } catch (e) {
                console.error(`Failed to initialize Veteran unlocks for save key ${saveKey}:`, e);
            }

            if (unlocks.every((unlock) => unlock.isUnlocked())) {
                break;
            }
        }
    }

    static isUnlockAvailable(unlock: GameConstants.VeteranUnlock): boolean {
        return this.unlockList[unlock]?.isUnlocked() ?? false;
    }

    public isVisible(): boolean {
        return Object.values(VeteranShop.unlockList).some((unlock) => unlock.isUnlocked());
    }
}

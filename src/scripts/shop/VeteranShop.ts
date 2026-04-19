/// <reference path="./Shop.ts"/>

interface VeteranUnlockConfig {
    isUnlocked: KnockoutObservable<boolean>;
    checkFunction: (playerData: Record<string, any>, saveData: Record<string, any>) => boolean;
}

class VeteranShop extends Shop {
    static unlockList: Record<GameConstants.VeteranUnlock, VeteranUnlockConfig> = {
        [GameConstants.VeteranUnlock.PokerusVirus]: {
            isUnlocked: ko.observable(false),
            checkFunction: (playerData, saveData) => {
                return saveData?.keyItems?.Pokerus_virus === true;
            },
        },
        [GameConstants.VeteranUnlock.EventCalendar]: {
            isUnlocked: ko.observable(false),
            checkFunction: (playerData, saveData) => {
                return saveData?.keyItems?.Event_calendar === true;
            },
        },
    };

    constructor(
        items: Item[],
        public name: string = 'Veteran',
        requirements: (Requirement | OneFromManyRequirement)[] = [],
        hideBeforeUnlocked = false
    ) {
        super(items, name, requirements, hideBeforeUnlocked);
    }

    public static initialize(): void {
        const saveKeys = Object.keys(localStorage).filter((k: string) => k.startsWith('save')).map((k: string) => k.replace(/^save/, ''));
        if (saveKeys.length <= 1) {
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

    public static isUnlockAvailable(unlock: GameConstants.VeteranUnlock): boolean {
        return this.unlockList[unlock]?.isUnlocked() ?? false;
    }
}

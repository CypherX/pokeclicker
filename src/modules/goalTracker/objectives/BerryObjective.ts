import { Observable } from 'knockout';
import { ObjectiveOption } from './ObjectiveTypes';
import BerryType from '../../enums/BerryType';

export interface BerryObjectiveConfig {
    berry: Observable<BerryType>;
}

export const berryObjectiveOption: ObjectiveOption<BerryObjectiveConfig> = {
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
    getDisplayName: (config: BerryObjectiveConfig) => {
        return ko.pureComputed(() => {
            const berry = config.berry();
            if (berry === undefined) return 'Unconfigured Objective';
            return `${BerryType[berry]} Berries`;
        });
    },
};

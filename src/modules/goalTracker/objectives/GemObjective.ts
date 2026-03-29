import { Observable } from 'knockout';
import { ObjectiveOption } from './ObjectiveTypes';
import PokemonType from '../../enums/PokemonType';
import GameHelper from '../../GameHelper';
import { pluralizeString } from '../../GameConstants';

export interface GemObjectiveConfig {
    gem: Observable<PokemonType>;
}

export const gemObjectiveOption: ObjectiveOption<GemObjectiveConfig> = {
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
    getDisplayName: (config: GemObjectiveConfig) => {
        return ko.pureComputed(() => {
            const gem = config.gem();
            if (gem === undefined) return 'Unconfigured Objective';
            return `Total ${pluralizeString(PokemonType[gem], 2)} Gems`;
        });
    },
};

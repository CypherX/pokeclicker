import { Observable } from 'knockout';
import { ObjectiveOption } from './ObjectiveTypes';
import { camelCaseToString, Currency, pluralizeString } from '../../GameConstants';
import GameHelper from '../../GameHelper';

export interface CurrencyObjectiveConfig {
    currency: Observable<Currency>;
}

export const currencyObjectiveOption: ObjectiveOption<CurrencyObjectiveConfig> = {
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
    getDisplayName: (config: CurrencyObjectiveConfig) => {
        return ko.pureComputed(() => {
            const currency = config.currency();
            if (currency === undefined) return 'Unconfigured Objective';

            switch (currency) {
                case Currency.money:
                    return 'Pokédollars';
                default:
                    return pluralizeString(camelCaseToString(Currency[currency]), 2);
            }
        });
    },
};

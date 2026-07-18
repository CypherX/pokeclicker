import TypeHelper from '../types/TypeHelper';
import Weather from '../weather/Weather';
import WeatherType from '../weather/WeatherType';
import FluteEffectRunner from '../gems/FluteEffectRunner';
import PokemonType from '../enums/PokemonType';
import { FLUTE_TYPE_ATTACK_MULTIPLIER } from '../GameConstants';

export type AttackModifierContext = {
    targetType1: PokemonType,
    targetType2: PokemonType,
    weatherMultipliers: { type: PokemonType, multiplier: number }[] | undefined,
    fluteTypes: PokemonType[] | null,
    includeTempBonuses: boolean,
};

export default class AttackModifiers {
    public static buildContext(
        targetType1: PokemonType,
        targetType2: PokemonType,
        weather: WeatherType,
        includeTempBonuses: boolean,
    ): AttackModifierContext {
        return {
            targetType1,
            targetType2,
            weatherMultipliers: Weather.weatherConditions[weather]?.multipliers,
            fluteTypes: includeTempBonuses ? FluteEffectRunner.activeGemTypes() : null,
            includeTempBonuses,
        };
    }

    public static attackModifier(context: AttackModifierContext, type1: PokemonType, type2: PokemonType): number {
        let modifier = 1;

        if (context.targetType1 !== PokemonType.None) {
            modifier *= TypeHelper.getAttackModifier(type1, type2, context.targetType1, context.targetType2);
        }

        context.weatherMultipliers?.forEach((value) => {
            if (value.type === type1) {
                modifier *= value.multiplier;
            }
            if (value.type === type2) {
                modifier *= value.multiplier;
            }
        });

        if (context.includeTempBonuses) {
            context.fluteTypes.forEach((value) => {
                if (value === type1) {
                    modifier *= FLUTE_TYPE_ATTACK_MULTIPLIER;
                }
                if (value === type2) {
                    modifier *= FLUTE_TYPE_ATTACK_MULTIPLIER;
                }
            });

            modifier *= App.game.zMoves.getMultiplier(type1, type2);
        }

        return modifier;
    }
}

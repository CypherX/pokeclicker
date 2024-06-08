import * as GameConstants from '../GameConstants';
import { PokemonNameType } from '../pokemons/PokemonNameType';
import AchievementRequirement from './AchievementRequirement';

export default class PokemonAttackRequirement extends AchievementRequirement {
    constructor(
        private pokemon: PokemonNameType,
        requiredAttack: number,
        option: GameConstants.AchievementOption = GameConstants.AchievementOption.more,
    ) {
        super(requiredAttack, option, GameConstants.AchievementType.Attack);
    }

    public getProgress() {
        const attack = App.game.party.getPokemonByName(this.pokemon)?.attack ?? 0;
        return Math.min(attack, this.requiredValue);
    }

    public hint(): string {
        return `${this.pokemon} needs ${this.requiredValue} or more Attack`;
    }
}

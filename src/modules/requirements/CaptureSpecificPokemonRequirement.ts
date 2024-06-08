import * as GameConstants from '../GameConstants';
import { PokemonListData, pokemonMap } from '../pokemons/PokemonList';
import { PokemonNameType } from '../pokemons/PokemonNameType';
import AchievementRequirement from './AchievementRequirement';

export default class CaptureSpecificPokemonRequirement extends AchievementRequirement {
    private pokemon: PokemonListData;

    constructor(
        pokemonName: PokemonNameType,
        capturesNeeded = 1,
        private includeBreeding = false,
        option: GameConstants.AchievementOption = GameConstants.AchievementOption.more,
    ) {
        super(capturesNeeded, option, GameConstants.AchievementType.None);
        this.pokemon = pokemonMap[pokemonName];
    }

    public getProgress() {
        const numCaught = App.game.statistics.pokemonCaptured[this.pokemon.id]() - (this.includeBreeding ? 0 : App.game.statistics.pokemonHatched[this.pokemon.id]());
        return Math.min(numCaught, this.requiredValue);
    }

    public hint(): string {
        return `Catch${this.includeBreeding ? ' or breed' : ''} a total of ${this.requiredValue} ${this.pokemon.name}.`;
    }
}

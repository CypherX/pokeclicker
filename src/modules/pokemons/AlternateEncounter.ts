import MultiRequirement from '../requirements/MultiRequirement';
import OneFromManyRequirement from '../requirements/OneFromManyRequirement';
import Requirement from '../requirements/Requirement';
import { PokemonNameType } from './PokemonNameType';

export default class AlternateEncounter {
    constructor(
        public pokemonName: PokemonNameType,
        public weight: number,
        public requirement?: Requirement | MultiRequirement | OneFromManyRequirement,
    ) { }

    public isUnlocked(): boolean {
        return this.requirement?.isCompleted() ?? true;
    }
}

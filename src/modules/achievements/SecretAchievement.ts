import { ExtraAchievementCategories } from '../GameConstants';
import AchievementRequirement from '../requirements/AchievementRequirement';
import Achievement from './Achievement';

export default class SecretAchievement extends Achievement {
    constructor(
        name: string,
        description: string,
        property: AchievementRequirement,
        private _hint: string,
    ) {
        super(name, description, property, 0, AchievementHandler.getAchievementCategoryByExtraCategory(ExtraAchievementCategories.secret), null);
        this.notificationTitle = 'Secret Achievement';
    }

    get name(): string {
        return this.unlocked() ? this._name : '???';
    }

    get description(): string {
        return this.unlocked() ? this._description : `Hint: ${this._hint}`;
    }
}

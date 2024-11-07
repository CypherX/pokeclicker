import * as GameConstants from '../GameConstants';
import AchievementRequirement from './AchievementRequirement';

export default class AllSpecialEventsActiveRequirement extends AchievementRequirement {
    constructor() {
        super(1, GameConstants.AchievementOption.more);
    }

    public getProgress() {
        return Math.min(App.game.statistics.allEventsActivated(), this.requiredValue);
    }

    public hint(): string {
        return 'Have all Special Events active simultaneously.';
    }
}

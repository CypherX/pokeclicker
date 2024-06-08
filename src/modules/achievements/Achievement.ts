import {
    Computed as KnockoutComputed,
    Observable as KnockoutObservable,
} from 'knockout';
import NotificationConstants from '../notifications/NotificationConstants';
import Notifier from '../notifications/Notifier';
import AchievementRequirement from '../requirements/AchievementRequirement';
import { LogBookTypes } from '../logbook/LogBookTypes';
import { createLogContent } from '../logbook/helpers';
import AchievementCategory from './AchievementCategory';
import { ExtraAchievementCategories } from '../GameConstants';

export default class Achievement {
    public isCompleted: KnockoutComputed<boolean> = ko.pureComputed(() => this.achievable() && (this.unlocked() || this.property.isCompleted()));
    public getProgressText: KnockoutComputed<string> = ko.pureComputed(() => `${this.getProgress().toLocaleString('en-US')} / ${this.property.requiredValue.toLocaleString('en-US')}`);
    public bonus = 0;
    public unlocked : KnockoutObservable<boolean> = ko.observable(false);

    constructor(
        protected _name: string,
        protected _description: string,
        public property: AchievementRequirement,
        public bonusWeight: number,
        public category: AchievementCategory,
        public achievableFunction: () => boolean | null = null,
    ) {}

    public check() {
        if (this.isCompleted() && !this.unlocked()) {
            const isSecret = this.category.name == ExtraAchievementCategories[ExtraAchievementCategories.secret];
            Notifier.notify({
                title: `[${isSecret ? 'Secret ' : ''}Achievement] ${this.name}`,
                message: this.description,
                type: NotificationConstants.NotificationOption.warning,
                timeout: 1e4,
                sound: NotificationConstants.NotificationSound.General.achievement,
                setting: NotificationConstants.NotificationSetting.General.achievement_complete,
            });
            App.game.logbook.newLog(
                LogBookTypes.ACHIEVE,
                createLogContent.earnedAchievement({ name: this.name }),
            );
            this.unlocked(true);
            if (this === App.game.achievementTracker.trackedAchievement()) {
                App.game.achievementTracker.nextAchievement();
            }
            // TODO: refilter within achievement bonus
            // AchievementHandler.filterAchievementList(true);
        }
    }

    public getProgress() {
        return this.isCompleted() ? this.property.requiredValue : this.property.getProgress();
    }

    public getProgressPercentage() {
        return this.isCompleted() ? '100.0' : this.property.getProgressPercentage();
    }

    public getBonus(): string {
        return this.bonus.toFixed(2);
    }

    public achievable() {
        if (typeof this.achievableFunction === 'function') {
            return this.achievableFunction();
        }
        return true;
    }

    get name(): string {
        return this._name;
    }

    get description(): string {
        return this._description;
    }
}

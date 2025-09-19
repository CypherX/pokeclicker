import { Feature } from '../DataStore/common/Feature';
import NotificationOption from '../notifications/NotificationOption';
import Notifier from '../notifications/Notifier';
import Goal from './Goal';
import Objective from './Objective';

export default class GoalTracker implements Feature {
    name = 'Goal Tracker';
    saveKey = 'goalTracker';
    defaults = {};

    public goals: KnockoutObservableArray<Goal> = ko.observableArray([]);
    public selectedObjective: KnockoutObservable<Objective | undefined> = ko.observable<Objective>(undefined);

    initialize(): void {

    }

    canAccess(): boolean {
        return true;
    }

    update() {}

    createGoal() {
        this.goals.unshift(new Goal());
    }

    async deleteGoal(goal: Goal) {
        if (await Notifier.confirm({
            title: 'Delete goal',
            message: 'Are you sure you want to delete this goal and all of its objectives?',
            type: NotificationOption.danger,
            confirm: 'Delete',
        })) {
            this.goals.remove(goal);
        }
    }

    toJSON(): Record<string, any> {
        return {
            goals: this.goals().map(goal => goal.toJSON()),
        };
    }

    fromJSON(json: Record<string, any>): void {
        if (json === null) {
            return;
        }

        json.goals?.forEach((goalJson) => {
            const goal = new Goal();
            goal.fromJSON(goalJson);
            this.goals.push(goal);
        });
    }
}

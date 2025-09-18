import { Feature } from '../DataStore/common/Feature';
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

    toJSON(): Record<string, any> {
        return {
            goals: this.goals().map(goal => goal.toJSON()),
        };
    }

    fromJSON(json: Record<string, any>): void {
        if (json === null || !json.goals?.length) {
            return;
        }

        /*json.goals.forEach(({ name, objectives }) => {
            const goal = new Goal(name);

            this.goals.push(goal);
        });*/

        json.goals.forEach((goalJson) => {
            const goal = new Goal();
            goal.fromJSON(goalJson);
            this.goals.push(goal);
        });

        /*const list: PokeballFilterParams[] = json.list?.length > 0
            ? json.list
            : Settings.getSetting('catchFilters.invertPriorityOrder').value
                ? [...this.presets].reverse()
                : this.presets;

        list.forEach(({ name, options, ball, inverted, enabled }) => {
            this.list.push(new PokeballFilter(
                name,
                options,
                ball,
                enabled,
                inverted,
            ));
        });*/
    }
}

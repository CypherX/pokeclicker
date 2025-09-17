/// <reference path="../../declarations/DataStore/common/Feature.d.ts" />

class GoalTracker implements Feature {
    name = 'Goal Tracker';
    saveKey = 'goalTracker';
    defaults = {};

    public goals: KnockoutObservableArray<Goal> = ko.observableArray([]);

    public selectedObjective: KnockoutObservable<Objective> = ko.observable(undefined);

    initialize(): void {

    }

    canAccess(): boolean {
        return true;
    }

    update(delta: number): void {}

    createGoal() {
        this.goals.unshift(new Goal('New Goal'));
    }

    toJSON(): Record<string, any> {
        return {};
    }

    fromJSON(json: Record<string, any>): void {

    }
}

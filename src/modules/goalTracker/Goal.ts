import Notifier from '../notifications/Notifier';
import NotificationOption from '../notifications/NotificationOption';
import Objective from './Objective';
import GameHelper from '../GameHelper';

export default class Goal {
    private _name: KnockoutObservable<string>;
    public objectives: KnockoutObservableArray<Objective> = ko.observableArray([]);

    public uuid: string;

    constructor(
        name: string = 'New Goal',
    ) {
        this._name = ko.observable(name);

        this.uuid = GameHelper.randomUUID();
    }

    createObjective() {
        const objective = new Objective();
        this.objectives.push(objective);
        App.game.goalTracker.selectedObjective(objective);
        $('#goalTrackerObjectiveModal').modal('show');
    }

    async deleteObjective(objective: Objective) {
        if (await Notifier.confirm({
            title: 'Delete objective',
            message: `Are you sure you want to delete "${objective.name}"?`,
            type: NotificationOption.danger,
            confirm: 'Delete',
        })) {
            this.objectives.remove(objective);
        }
    }

    get name(): string {
        return this._name();
    }

    set name(value: string) {
        this._name(value);
    }

    toJSON(): Record<string, any> {
        return {
            name: this.name,
            objectives: this.objectives().filter(obj => obj.type !== undefined).map(obj => obj.toJSON()),
        };
    }

    fromJSON(json: Record<string, any>): void {
        this.name = json.name;

        const objectives = [];
        json.objectives?.forEach((objectiveJson) => {
            const objective = new Objective();
            objective.fromJSON(objectiveJson);
            objectives.push(objective);
        });

        this.objectives(objectives);
    }
}

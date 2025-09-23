import { MINUTE } from '../GameConstants';
import GameHelper from '../GameHelper';
import NotificationConstants from '../notifications/NotificationConstants';
import Notifier from '../notifications/Notifier';
import { ObjectiveConfig, objectiveOptions, ObjectiveType } from './ObjectiveOptions';

export default class Objective {
    private _type = ko.observable<ObjectiveType | undefined>(undefined);
    public _config = ko.observable<ObjectiveConfig | undefined>(undefined);
    private _name: KnockoutObservable<string>;
    private _targetAmount = ko.observable(0).extend({ numeric: 0 });

    public uuid: string;
    private _notified = false;

    getProgress = ko.pureComputed(() => {
        return objectiveOptions[this.type]?.getProgress(this._config() as any)?.() ?? 0; // "as any" fuck you typescript
    });

    getOptions = ko.pureComputed(() => {
        return objectiveOptions[this.type]?.options ?? [];
    });

    isConfigured = ko.pureComputed(() => {
        if (!this.config) {
            return false;
        }
        return Object.values(this.config).every(obs => obs() !== undefined);
    });

    private isComplete = ko.computed(() => {
        return this.isConfigured() && this.targetAmount > 0 && this.getProgress() >= this.targetAmount;
    });

    constructor(
        name: string = 'New Objective',
    ) {
        this._name = ko.observable(name);

        this.uuid = GameHelper.randomUUID();

        this.isComplete.subscribe((complete) => {
            if (complete && !this._notified) {
                this._notified = true;
                Notifier.notify({
                    title: 'Goal Tracker',
                    message: `Your "${this.name}" objective is complete!`,
                    type: NotificationConstants.NotificationOption.primary,
                    sound: NotificationConstants.NotificationSound.General.goal_objective_complete,
                    setting: NotificationConstants.NotificationSetting.General.goal_objective_complete,
                    timeout: 5 * MINUTE,
                });
            } else if (!complete && this._notified) {
                this._notified = false;
            }
        });
    }

    progressText(): string {
        return `${this.getProgress().toLocaleString('en-US')} / ${this.targetAmount.toLocaleString('en-US')}`;
    }

    progressPercent(): number {
        return Math.floor((this.getProgress() / this.targetAmount) * 100) / 100;
    }

    get type(): ObjectiveType {
        return this._type();
    }

    set type(value: ObjectiveType) {
        this._type(value);
        this.config = objectiveOptions[value]?.createConfig();
    }

    get config(): ObjectiveConfig {
        return this._config();
    }

    set config(value: ObjectiveConfig) {
        this._config(value);
    }

    get name(): string {
        return this._name();
    }

    set name(value: string) {
        this._name(value);
    }

    get targetAmount(): number {
        return this._targetAmount();
    }

    set targetAmount(value: number) {
        this._targetAmount(value);
    }

    toJSON(): Record<string, any> {
        const config = {};
        for (const key of Object.keys(this.config)) {
            config[key] = this.config[key]();
        }
        return {
            type: this.type,
            config: config,
            name: this.name,
            targetAmount: this.targetAmount,
        };
    }


    fromJSON(json: Record<string, any>): void {
        this._type(json.type);
        this._name(json.name);
        this._targetAmount(json.targetAmount ?? 0);

        const config = objectiveOptions[this.type]?.createConfig();
        for (const key of Object.keys(config)) {
            if (json.config[key] !== undefined) {
                config[key](json.config[key]);
            }
        }

        this._config(config);
    }
}

import { MINUTE } from '../GameConstants';
import GameHelper from '../GameHelper';
import NotificationConstants from '../notifications/NotificationConstants';
import Notifier from '../notifications/Notifier';
import { ObjectiveConfig, objectiveOptions } from './ObjectiveOptions';
import { ObjectiveOption, ObjectiveType } from './objectives/ObjectiveTypes';

export default class Objective {
    private _type = ko.observable<ObjectiveType | undefined>(undefined);
    public _config = ko.observable<ObjectiveConfig | undefined>(undefined);
    private _targetAmount = ko.observable(0).extend({ numeric: 0 });

    public uuid: string;
    private _isCompleteSub: KnockoutSubscription;

    private get activeOption(): ObjectiveOption<any> | undefined {
        return objectiveOptions[this.type] as ObjectiveOption<any> | undefined;
    }

    public getProgress = ko.pureComputed(() => {
        if (!this.activeOption) return 0;
        return this.activeOption.getProgress(this.config)() ?? 0;
    });

    public getOptions = ko.pureComputed(() => {
        if (!this.activeOption) return [];
        return this.activeOption.options.filter(opt => {
            return opt.visible ? opt.visible(this.config)() : true;
        }) ?? [];
    });

    public isConfigured = ko.pureComputed(() => {
        if (!this.config) {
            return false;
        }
        return Object.values(this.config).every(obs => obs() !== undefined);
    });

    private isComplete = ko.pureComputed(() => {
        return this.isConfigured() && DisplayObservables.modalState.goalTrackerObjectiveModal !== 'show'
            && this.targetAmount > 0 && this.getProgress() >= this.targetAmount;
    });

    constructor() {
        this.uuid = GameHelper.randomUUID();

        this._isCompleteSub = this.isComplete.subscribe((complete) => {
            if (complete) {
                Notifier.notify({
                    title: 'Goal Tracker',
                    message: `Your "${this.displayName}" objective is complete!`,
                    type: NotificationConstants.NotificationOption.primary,
                    sound: NotificationConstants.NotificationSound.General.goal_objective_complete,
                    setting: NotificationConstants.NotificationSetting.General.goal_objective_complete,
                    timeout: 5 * MINUTE,
                });
            }
        });
    }

    public dispose(): void {
        this._isCompleteSub?.dispose();
    }

    progressText(): string {
        return `${this.getProgress().toLocaleString('en-US')} / ${this.targetAmount.toLocaleString('en-US')}`;
    }

    progressPercent(): number {
        return Math.floor((this.getProgress() / this.targetAmount) * 100) / 100;
    }

    get displayName(): string {
        return this.activeOption?.getDisplayName?.(this.config)?.() ?? 'Unconfigured Objective';
    }

    get type(): ObjectiveType {
        return this._type();
    }

    set type(value: ObjectiveType) {
        this._type(value);
        this.config = objectiveOptions[value]?.createConfig();
    }

    get config(): ObjectiveConfig | undefined {
        return this._config();
    }

    set config(value: ObjectiveConfig | undefined) {
        this._config(value);
    }

    get targetAmount(): number {
        return this._targetAmount();
    }

    set targetAmount(value: number) {
        this._targetAmount(value);
    }

    toJSON(): Record<string, any> {
        const config = {};
        if (this.config) {
            for (const key of Object.keys(this.config)) {
                config[key] = this.config[key]();
            }
        }
        return {
            type: this.type,
            config: config,
            targetAmount: this.targetAmount,
        };
    }


    fromJSON(json: Record<string, any>): void {
        if (!json) return;

        this._type(json.type);
        this._targetAmount(json.targetAmount ?? 0);

        const config = objectiveOptions[this.type]?.createConfig();
        if (config && json.config) {
            for (const key of Object.keys(config)) {
                if (json.config[key] !== undefined) {
                    config[key](json.config[key]);
                }
            }
        }

        this._config(config);
    }
}

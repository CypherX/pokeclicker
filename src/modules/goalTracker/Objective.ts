import { MINUTE } from '../GameConstants';
import GameHelper from '../GameHelper';
import NotificationConstants from '../notifications/NotificationConstants';
import Notifier from '../notifications/Notifier';
import { ObjectiveConfig, objectiveOptions } from './ObjectiveOptions';
import { ObjectiveOption, ObjectiveType } from './objectives/ObjectiveTypes';
import { TrackingMode } from './TrackingMode';

export default class Objective {
    private _type = ko.observable<ObjectiveType | undefined>(undefined);
    private _config = ko.observable<ObjectiveConfig | undefined>(undefined);
    private _targetAmount = ko.observable(0).extend({ numeric: 0 });
    private _trackingMode = ko.observable<TrackingMode>(TrackingMode.Total);
    private _accumulatedProgress = ko.observable<number>(0).extend({ numeric: 0 });
    private _lastRawValue: number = 0;

    public uuid: string;
    private _isCompleteSub: KnockoutSubscription;
    private _rawProgressSub?: KnockoutSubscription;
    private _trackingModeSub?: KnockoutSubscription;

    private get activeOption(): ObjectiveOption<any> | undefined {
        return objectiveOptions[this.type] as ObjectiveOption<any> | undefined;
    }

    private getRawProgress = ko.pureComputed(() => {
        if (!this.activeOption) return 0;
        return this.activeOption.getProgress(this.config) ?? 0;
    });

    public getProgress = ko.pureComputed(() => {
        if (!this.isConfigured()) return 0;
        return this.trackingMode === TrackingMode.Gain ? this.accumulatedProgress : this.getRawProgress();
    });

    public getOptions = ko.pureComputed(() => {
        if (!this.activeOption) return [];
        return this.activeOption.options.filter(opt => {
            return opt.visible ? opt.visible(this.config) : true;
        });
    });

    public isConfigured = ko.pureComputed(() => {
        if (!this.config) {
            return false;
        }
        return Object.values(this.config).every(obs => obs() !== undefined);
    });

    private isComplete = ko.pureComputed(() => {
        return this.hasGoal && this.isConfigured() && DisplayObservables.modalState.goalTrackerObjectiveModal !== 'show'
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

        this._trackingModeSub = this._trackingMode.subscribe(() => this.syncRawProgressSub());
        this.syncRawProgressSub();
    }

    // Only Gain mode needs to watch raw progress, so Total and Display leave getRawProgress asleep until something actually reads it
    private syncRawProgressSub(): void {
        if (this.trackingMode !== TrackingMode.Gain) {
            this._rawProgressSub?.dispose();
            this._rawProgressSub = undefined;
            return;
        }

        if (this._rawProgressSub) {
            return;
        }

        this._rawProgressSub = this.getRawProgress.subscribe((newValue) => this.accumulateProgress(newValue));
        this.accumulateProgress(this.getRawProgress.peek());
    }

    private accumulateProgress(newValue: number): void {
        const modalOpen = DisplayObservables.modalState.goalTrackerObjectiveModal === 'show';
        if (this.isConfigured() && !modalOpen) {
            const diff = newValue - this._lastRawValue;
            if (diff > 0) {
                this.accumulatedProgress = this.accumulatedProgress + diff;
            }
        }
        this._lastRawValue = newValue;
    }

    public dispose(): void {
        this._isCompleteSub?.dispose();
        this._rawProgressSub?.dispose();
        this._trackingModeSub?.dispose();
    }

    public resetAccumulatedProgress() {
        this.accumulatedProgress = 0;
        this._lastRawValue = this.getRawProgress.peek();
    }

    public progressText(): string {
        const progress = this.getProgress().toLocaleString('en-US');
        if (!this.hasGoal) return progress;
        return `${progress} / ${this.targetAmount.toLocaleString('en-US')}`;
    }

    public progressPercent(): number {
        if (!this.hasGoal) return 0;
        if (this.targetAmount <= 0) return 0;
        return Math.floor((this.getProgress() / this.targetAmount) * 100) / 100;
    }

    get displayName(): string {
        return this.activeOption?.getDisplayName?.(this.config) ?? 'Unconfigured Objective';
    }

    get type(): ObjectiveType {
        return this._type();
    }

    set type(value: ObjectiveType) {
        this._type(value);
        this.config = objectiveOptions[value]?.createConfig();
        this.targetAmount = 0;
        this.resetAccumulatedProgress();
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

    get trackingMode(): TrackingMode {
        return this._trackingMode();
    }

    set trackingMode(value: TrackingMode) {
        if (value === this._trackingMode()) {
            return;
        }
        this._trackingMode(value);
        if (value === TrackingMode.Gain) {
            // Don't retroactively credit gains made while in another mode
            this._lastRawValue = this.getRawProgress.peek();
        }
    }

    get hasGoal(): boolean {
        return this.trackingMode !== TrackingMode.Display;
    }

    get accumulatedProgress(): number {
        return this._accumulatedProgress();
    }

    set accumulatedProgress(value: number) {
        this._accumulatedProgress(value);
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
            trackingMode: this.trackingMode,
            accumulatedProgress: this.accumulatedProgress,
            lastRawValue: this._lastRawValue,
        };
    }


    fromJSON(json: Record<string, any>): void {
        if (!json) return;

        this._targetAmount(json.targetAmount ?? 0);

        const config = objectiveOptions[json.type]?.createConfig();
        if (config && json.config) {
            for (const key of Object.keys(config)) {
                if (json.config[key] !== undefined) {
                    config[key](json.config[key]);
                }
            }
        }

        this._lastRawValue = json.lastRawValue ?? 0;
        this._trackingMode(json.trackingMode ?? TrackingMode.Total);
        this._accumulatedProgress(json.accumulatedProgress ?? 0);
        this._config(config);
        this._type(json.type);
    }
}

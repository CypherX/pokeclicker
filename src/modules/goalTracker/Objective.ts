/* eslint-disable no-console */
import { ObjectiveConfig, objectiveOptions, ObjectiveType } from './ObjectiveOptions';

export default class Objective {
    private _type = ko.observable<ObjectiveType | undefined>(undefined);
    public _config = ko.observable<ObjectiveConfig | undefined>(undefined);
    private _name: KnockoutObservable<string>;
    private _targetAmount = ko.observable(0).extend({ numeric: 0 });

    getProgress = ko.pureComputed(() => {
        return objectiveOptions[this.type]?.getProgress(this._config())?.() ?? 0;
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

    constructor(
        name: string = 'New Objective',
    ) {
        this._name = ko.observable(name);

        // fix this
        /*this._type.subscribe((type) => {
            this.config = objectiveOptions[type]?.createConfig();
        });*/
    }

    progressText(): string {
        if (!this.isConfigured()) {
            return '0 / 0';
        }
        return `${this.getProgress().toLocaleString('en-US')} / ${this.targetAmount.toLocaleString('en-US')}`;
    }

    progressPercent(): number {
        if (!this.isConfigured()) {
            return 0;
        }
        return Math.floor((this.getProgress() / this.targetAmount) * 100) / 100;
    }

    get type(): ObjectiveType {
        return this._type();
    }

    set type(value: ObjectiveType) {
        this._type(value);
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
        console.log('json');
        console.log(json);
        this._type(json.type);
        this._name(json.name);
        this._targetAmount(json.targetAmount ?? 0);

        const config = objectiveOptions[this.type]?.createConfig();
        console.log(config);

        for (const key of Object.keys(config)) {
            console.log(key);
            if (json.config[key] !== undefined) {
                console.log('in config');
                config[key](json.config[key]);
                console.log(`set value ${json.config[key]}`);
                console.log(`${config[key]()}`);
            }
        }

        this._config(config);
        console.log('this config');
        console.log(JSON.stringify(this._config));
    }
}

import Item from './Item';
import { ShopOptions } from './types';
import { Currency } from '../GameConstants';
import { SpecialEventTitleType } from '../specialEvents/SpecialEventTitleType';

export default class EventItem extends Item {
    constructor(
        name: string,
        displayName : string,
        description : string,
        private specialEventName : SpecialEventTitleType,
        basePrice?: number,
        currency?: Currency,
        options?: ShopOptions,
    ) {
        super(name, basePrice, currency, { maxAmount: 1, ...options }, displayName, description, 'event');
    }

    public isActive() : boolean {
        return App.game.specialEvents.getEvent(this.specialEventName).isActive();
    }

}

import { AchievementOption } from '../GameConstants';
import { ItemList } from '../items/ItemList';
import AchievementRequirement from './AchievementRequirement';

export default class ItemRequirement extends AchievementRequirement {
    constructor(amount: number, public itemName: string, option = AchievementOption.more) {
        super(amount, option);
    }

    public getProgress() {
        return Math.min(player.itemList[this.itemName](), this.requiredValue);
    }

    public hint(): string {
        return `You must own ${this.requiredValue}${this.option == AchievementOption.equal ? '' : ` or ${AchievementOption[this.option]}`} of ${ItemList[this.itemName].displayName}.`;
    }
}

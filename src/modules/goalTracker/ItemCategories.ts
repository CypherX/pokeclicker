import { ItemList } from '../items/ItemList';
import BattleItem from '../items/BattleItem';
import Item from '../items/Item';
import EnergyRestore from '../items/EnergyRestore';
import MulchItem from '../items/MulchItem';
import PokeballItem from '../items/PokeballItem';
import { MulchShovelItem, ShovelItem } from '../items/ShovelItem';
import EggItem from '../items/EggItem';
import TreasureItem from '../items/TreasureItem';
import Consumable from '../items/Consumable';
import UndergroundItemValueType from '../enums/UndergroundItemValueType';
import Vitamin from '../items/Vitamin';
import { TmpHeldItemType } from '../TemporaryScriptTypes';

interface ItemCategoryDefinition {
    key: string;
    label: string;
    validator: (item: Item) => boolean;
}

export const itemCategoryDefinitions: ItemCategoryDefinition[] = [
    { key: 'battleItem', label: 'Battle Item', validator: (i) => i instanceof BattleItem },
    { key: 'energyRestore', label: 'Energy Restore', validator: (i) => i instanceof EnergyRestore },
    { key: 'mulch', label: 'Mulch', validator: (i) => i instanceof MulchItem },
    { key: 'pokeBall', label: 'Poké Ball', validator: (i) => i instanceof PokeballItem },
    { key: 'shovel', label: 'Shovel', validator: (i) => i instanceof ShovelItem || i instanceof MulchShovelItem },
    { key: 'egg', label: 'Egg', validator: (i) => i instanceof EggItem },
    { key: 'vitamin', label: 'Vitamin', validator: (i) => i instanceof Vitamin },
    { key: 'consumable', label: 'Consumable', validator: (i) => i instanceof Consumable },
    { key: 'treasure', label: 'Underground Treasure', validator: (i) => i instanceof TreasureItem &&
        (i.valueType === UndergroundItemValueType.Diamond || i.valueType === UndergroundItemValueType.Special) },
    { key: 'plate', label: 'Gem Plate', validator: (i) => i instanceof TreasureItem && i.valueType === UndergroundItemValueType.Gem },
    { key: 'fossil', label: 'Fossil', validator: (i) => i instanceof TreasureItem &&
        (i.valueType === UndergroundItemValueType.Fossil || i.valueType === UndergroundItemValueType.FossilPiece) },
    { key: 'shard', label: 'Shard', validator: (i) => i instanceof TreasureItem && i.valueType === UndergroundItemValueType.Shard },
    { key: 'heldItem', label: 'Held Item', validator: (i) => i instanceof HeldItem && (i as TmpHeldItemType).isUnlocked() },
    { key: 'evolutionStone', label: 'Evolution Stone', validator: (i) => i instanceof EvolutionStone },
    //{ key: 'quest', label: 'Quest', validator: (i) => i.name === 'Wishing_Piece' },
];

export type ItemCategory = typeof itemCategoryDefinitions[number]['key'];

export const itemsByCategory = ko.pureComputed((): Record<ItemCategory, Item[]> => {
    const categorized: Record<ItemCategory, Item[]> = Object.fromEntries(
        itemCategoryDefinitions.map(def => [def.key, []]),
    ) as Record<ItemCategory, Item[]>;

    for (const item of Object.values(ItemList)) {
        if (!item.isVisible()) continue;

        const def = itemCategoryDefinitions.find(definition => definition.validator(item));
        if (def) {
            categorized[def.key].push(item);
        }
    }
    return categorized;
});

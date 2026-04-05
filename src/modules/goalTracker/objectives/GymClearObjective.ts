import { Observable } from 'knockout';
import { ObjectiveOption } from './ObjectiveTypes';
import { camelCaseToString, getGymIndex, Region } from '../../GameConstants';
import GameHelper from '../../GameHelper';
import SubRegions from '../../subRegion/SubRegions';

export interface GymClearObjectiveConfig {
    region: Observable<Region>;
    gymTown: Observable<string>;
}

export const gymClearObjectiveOption: ObjectiveOption<GymClearObjectiveConfig> = {
    label: 'Gym Clears',
    options: [
        {
            key: 'region',
            label: 'Region',
            values: () => ko.pureComputed(() => {
                return GameHelper.enumNumbers(Region)
                    .filter((r) => (r <= player.highestRegion() && r > Region.none))
                    .map((r) => ({ name: camelCaseToString(Region[r]), value: r }));
            }),
        },
        {
            key: 'gymTown',
            label: 'Gym',
            values: (config: GymClearObjectiveConfig) => ko.pureComputed(() => {
                const region = config.region?.();
                if (region === undefined) {
                    return [];
                }

                const gymList = Object.values(GymList)
                    .filter((gym) => gym.parent?.region === region && (gym.parent?.subRegion === 0 || SubRegions.isSubRegionUnlocked(region, gym.parent.subRegion ?? 0)))
                    .map((gym) => gym.town);

                return gymList.map((gymTown) => ({
                    name: `${GymList[gymTown].leaderName} - ${GymList[gymTown].parent.name}`,
                    value: gymTown,
                }));
            }),
        },
    ],
    getProgress: (config: GymClearObjectiveConfig) => {
        return ko.pureComputed((): number => {
            const gymTown = config.gymTown?.();
            if (!gymTown) return 0;
            return App.game.statistics.gymsDefeated[getGymIndex(gymTown)]();
        });
    },
    createConfig: (): GymClearObjectiveConfig => {
        const region = ko.observable();
        const gymTown = ko.observable().extend({ clearDependent: region }); // clear gym if the region changes
        return { region, gymTown };
    },

    getDisplayName: (config: GymClearObjectiveConfig) => {
        return ko.pureComputed(() => {
            const gym = GymList[config.gymTown()];
            if (!gym) return 'Unconfigured Objective';
            return `Clear Gym - ${gym.leaderName} - ${gym.parent.name}`;
        });
    },
};

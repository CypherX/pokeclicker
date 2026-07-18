import '../koExtenders';
import type {
    Observable as KnockoutObservable,
    ObservableArray as KnockoutObservableArray,
    Computed as KnockoutComputed,
    Subscription as KnockoutSubscription,
} from 'knockout';
import GameHelper from '../GameHelper';
import AttackModifiers from './AttackModifiers';
import WeatherType from '../weather/WeatherType';
import PokemonType from '../enums/PokemonType';
import { Region } from '../GameConstants';
import { calcNativeRegion } from '../pokemons/PokemonHelper';
import { pokemonMap } from '../pokemons/PokemonList';
import type { TmpPartyPokemonType } from '../TemporaryScriptTypes';

enum AttackStat {
    attack = 0,
    ignoreLevel = 1,
    base = 2,
}

const NUM_STATS = GameHelper.enumLength(AttackStat);
// Each stat occupies two adjacent slots, [non-breeding, breeding-only]
const NUM_FIELDS = NUM_STATS * 2;
const fieldIndex = (stat: AttackStat, breeding: boolean): number => stat * 2 + (breeding ? 1 : 0);
// Row 0 holds pokemon with no native region (Region.none), row r + 1 holds native region r
const NUM_ROWS = Region.final + 1;
const NUM_POKEMON_TYPES = GameHelper.enumLength(PokemonType);

class AttackBucket {
    // NUM_ROWS × NUM_FIELDS matrix of attack sums by native region, indexed [row * NUM_FIELDS + field]
    public regionSums = new Float64Array(NUM_ROWS * NUM_FIELDS);
    // Per-field sums across all native regions
    public totals = new Float64Array(NUM_FIELDS);

    constructor(
        public type1: PokemonType,
        public type2: PokemonType,
    ) {}
}

// The conditions a party-wide attack calculation runs under: the enemy typing and which bonuses apply
export type AttackConditions = {
    type1: PokemonType,
    type2: PokemonType,
    region: Region,
    regionalDebuff: number, // Multiplier for pokemon outside their native region; pass 1 when the debuff challenge is inactive or region should be ignored
    includeBreeding: boolean,
    useBaseAttack: boolean,
    weather: WeatherType,
    ignoreLevel: boolean,
    includeTempBonuses: boolean,
};

type TrackedPokemon = {
    bucket: AttackBucket,
    nativeRegionRow: number,
    attackContribution: KnockoutComputed<number[]>,
    attackSubscription: KnockoutSubscription,
    lastAttack: number[],
    clickContribution: KnockoutComputed<number>,
    clickSubscription: KnockoutSubscription,
    lastClickBonus: number,
};

// Maintains attack sums over a collection of pokemon, bucketed by the species-immutable key (type1, type2, native region).
export default class PartyAttackAggregator {
    // Bumped whenever any sum changes so computeds stay reactive
    public version: KnockoutObservable<number> = ko.observable(0);

    private buckets = new Map<number, AttackBucket>();
    private trackedPokemon = new Map<TmpPartyPokemonType, TrackedPokemon>();
    private clickBonusSum = 0;
    private lastSyncedArray: TmpPartyPokemonType[] = null;

    constructor(private memberPokemon: KnockoutObservableArray<TmpPartyPokemonType> | KnockoutComputed<TmpPartyPokemonType[]>) {
        this.syncMembership();

        (memberPokemon as KnockoutObservableArray<TmpPartyPokemonType>).subscribe((changes) => {
            changes.forEach((change) => {
                if (change.status === 'deleted' && change.moved === undefined) {
                    this.untrackPokemon(change.value);
                }
            });
            changes.forEach((change) => {
                if (change.status === 'added' && change.moved === undefined) {
                    this.trackPokemon(change.value);
                }
            });
        }, undefined, 'arrayChange');
    }

    /**
     * Ensures every current member pokemon is tracked before a query is answered.
     * The game runs knockout with deferUpdates enabled, so the arrayChange subscription
     * above fires in a later microtask; anything reading attack in the same task as a
     * party change would otherwise see incomplete or incorrect sums
     */
    private syncMembership(): void {
        const current = this.memberPokemon();
        if (current === this.lastSyncedArray && current.length === this.trackedPokemon.size) {
            return;
        }
        this.lastSyncedArray = current;
        ko.ignoreDependencies(() => {
            if (this.trackedPokemon.size) {
                const currentSet = new Set(current);
                this.trackedPokemon.forEach((tracked, pokemon) => {
                    if (!currentSet.has(pokemon)) {
                        this.untrackPokemon(pokemon);
                    }
                });
            }
            current.forEach((pokemon) => this.trackPokemon(pokemon));
        });
    }

    private static typePairKey(type1: PokemonType, type2: PokemonType): number {
        // type2 starts at -1 (None), shift it to keep keys unique
        return type1 * NUM_POKEMON_TYPES + type2 + 1;
    }

    private trackPokemon(pokemon: TmpPartyPokemonType): void {
        if (this.trackedPokemon.has(pokemon)) {
            return;
        }

        const [type1 = PokemonType.None, type2 = PokemonType.None] = pokemonMap[pokemon.name].type;
        const key = PartyAttackAggregator.typePairKey(type1, type2);
        let bucket = this.buckets.get(key);
        if (!bucket) {
            bucket = new AttackBucket(type1, type2);
            this.buckets.set(key, bucket);
        }

        const attackContribution = ko.pureComputed(() => {
            // Always read every input so dependencies stay registered regardless of breeding state
            const breeding = pokemon.breeding;
            const values = new Array(NUM_FIELDS).fill(0);
            values[fieldIndex(AttackStat.attack, breeding)] = pokemon.attack;
            values[fieldIndex(AttackStat.ignoreLevel, breeding)] = pokemon.attackIgnoreLevel;
            values[fieldIndex(AttackStat.base, breeding)] = pokemon.baseAttack;
            return values;
        }).extend({ arrayEquals: true }) as KnockoutComputed<number[]>;

        const clickContribution = ko.pureComputed(() => pokemon.clickAttackBonus());

        const tracked: TrackedPokemon = {
            bucket,
            nativeRegionRow: calcNativeRegion(pokemon.name) + 1,
            attackContribution,
            attackSubscription: attackContribution.subscribe((value) => this.updateAttackSums(tracked, value)),
            lastAttack: new Array(NUM_FIELDS).fill(0),
            clickContribution,
            clickSubscription: clickContribution.subscribe((value) => this.updateClickBonusSum(tracked, value)),
            lastClickBonus: 0,
        };

        this.trackedPokemon.set(pokemon, tracked);
        this.updateAttackSums(tracked, attackContribution.peek());
        this.updateClickBonusSum(tracked, clickContribution.peek());
    }

    private untrackPokemon(pokemon: TmpPartyPokemonType): void {
        const tracked = this.trackedPokemon.get(pokemon);
        if (!tracked) {
            return;
        }
        this.updateAttackSums(tracked, new Array(NUM_FIELDS).fill(0));
        this.updateClickBonusSum(tracked, 0);
        tracked.attackSubscription.dispose();
        tracked.attackContribution.dispose();
        tracked.clickSubscription.dispose();
        tracked.clickContribution.dispose();
        this.trackedPokemon.delete(pokemon);
    }

    private updateAttackSums(tracked: TrackedPokemon, value: number[]): void {
        const { bucket, nativeRegionRow, lastAttack } = tracked;
        let changed = false;
        for (let field = 0; field < NUM_FIELDS; field++) {
            const delta = value[field] - lastAttack[field];
            if (delta !== 0) {
                bucket.regionSums[nativeRegionRow * NUM_FIELDS + field] += delta;
                bucket.totals[field] += delta;
                changed = true;
            }
        }
        tracked.lastAttack = value;
        if (changed) {
            this.bumpVersion();
        }
    }

    private updateClickBonusSum(tracked: TrackedPokemon, value: number): void {
        const delta = value - tracked.lastClickBonus;
        if (delta !== 0) {
            this.clickBonusSum += delta;
            tracked.lastClickBonus = value;
            this.bumpVersion();
        }
    }

    private bumpVersion(): void {
        ko.ignoreDependencies(() => this.version((this.version() + 1) % Number.MAX_SAFE_INTEGER));
    }

    // Sums the attack of every member pokemon against the provided conditions
    // Returns the raw sum, the caller applies the party-wide attack bonus and rounding
    public calculateTotalAttack(conditions: AttackConditions): number {
        this.syncMembership();
        this.version();

        const stat = conditions.useBaseAttack ? AttackStat.base : (conditions.ignoreLevel ? AttackStat.ignoreLevel : AttackStat.attack);
        const field = fieldIndex(stat, false);
        const breedingField = fieldIndex(stat, true);
        const nativeOffset = (conditions.region + 1) * NUM_FIELDS;
        const context = AttackModifiers.buildContext(conditions.type1, conditions.type2, conditions.weather, conditions.includeTempBonuses);

        let total = 0;
        this.buckets.forEach((bucket) => {
            const sum = this.bucketSum(bucket, conditions, field, breedingField, nativeOffset);
            if (sum !== 0) {
                total += sum * AttackModifiers.attackModifier(context, bucket.type1, bucket.type2);
            }
        });

        return total;
    }

    private bucketSum(bucket: AttackBucket, conditions: AttackConditions, field: number, breedingField: number, nativeOffset: number): number {
        const { region, regionalDebuff, includeBreeding } = conditions;
        let sum = bucket.totals[field] + (includeBreeding ? bucket.totals[breedingField] : 0);
        if (regionalDebuff !== 1) {
            // Pokemon native to the region or without a native region are not debuffed
            let unaffected = bucket.regionSums[field]
                + (region !== Region.none ? bucket.regionSums[nativeOffset + field] : 0);
            if (includeBreeding) {
                unaffected += bucket.regionSums[breedingField]
                    + (region !== Region.none ? bucket.regionSums[nativeOffset + breedingField] : 0);
            }
            sum = unaffected + (sum - unaffected) * regionalDebuff;
        }
        return sum;
    }

    public getClickBonusSum(): number {
        this.syncMembership();
        this.version();
        return this.clickBonusSum;
    }

    // Recomputes every sum from scratch. Not needed during normal play
    // Exists as a consistency cross-check for tests and debugging.
    public rebuild(): void {
        this.syncMembership();
        this.buckets.forEach((bucket) => {
            bucket.regionSums.fill(0);
            bucket.totals.fill(0);
        });
        this.clickBonusSum = 0;
        this.trackedPokemon.forEach((tracked) => {
            tracked.lastAttack = new Array(NUM_FIELDS).fill(0);
            tracked.lastClickBonus = 0;
            this.updateAttackSums(tracked, tracked.attackContribution.peek());
            this.updateClickBonusSum(tracked, tracked.clickContribution.peek());
        });
    }
}

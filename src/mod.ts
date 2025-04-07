import { Battle, BattleStreams, Dex, extractChannelMessages, ID, ModdedDex, PokemonSet } from '@pkmn/sim';
import { SideID, StatusName } from '@pkmn/types';




/**
 * `${sideid}: ${name}`
 */
export type PkmnFullname = `${SideID}: ${string}`
export type PersistentMoveData = {
    pp: number
    maxpp?: number
}
export type PersistentPkmnData = {
    status?: StatusName
    hp?: number
    fainted?: boolean
    moveSlots?: {
        [moveid: string]: PersistentMoveData
    }
}
/* moveSlots baseMoveSlots */
export type PersistentPkmnTeamData = {
    [k: PkmnFullname]: PersistentPkmnData
}
// moveSlots : ID
export class BattleStreamsMod extends BattleStreams.BattleStream {

    private sendout?: (type: string, data: string | string[]) => void;
    constructor(options?: {
        debug?: boolean;
        noCatch?: boolean;
        keepAlive?: boolean;
        replay?: boolean | "spectator";
    }, dex?: ModdedDex,
        sendout?: (type: string, data: string | string[]) => void) {
        super(options, dex);
        this.sendout = sendout;
    }
    override _writeLine(type: string, message: string) {
        switch (type) {
            case 'start':
                const options = JSON.parse(message);
                options.send = (t: string, data: any) => {
                    if (this.sendout) this.sendout(t, data);
                    if (Array.isArray(data)) data = data.join("\n");
                    this.pushMessage(t, data);
                    if (t === 'end' && !this.keepAlive) this.pushEnd();
                };
                if (this.debug) options.debug = true;
                this.battle = new Battle(options, this.dex);
                break;

            case 'log':
                this.battle?.add(`${message}`);
                break;

            case 'mod':
                if (!this.battle) throw new Error('No battle instance');
                let json: PersistentPkmnTeamData = JSON.parse(message);

                for (let [PkmnFullname, mod] of Object.entries(json)) {
                    const pokemon = this.battle.getPokemon(PkmnFullname);
                    if (!pokemon) throw new Error('No pokemon with that fullname');

                    if (mod.hp) { /* this.add('-damage', pokemon, pokemon.getHealth, '[from] mod'); */ // <- better to use this
                        const oldhp = pokemon.hp || 0;
                        pokemon.sethp(mod.hp);
                        const hp = pokemon.hp;
                        this.battle.add(`& mod|${PkmnFullname}|hp: ${oldhp} -> ${hp}`);
                    }
                    if (mod.status) {
                        const oldstatus = pokemon.status || "healthy";
                        pokemon.setStatus(mod.status);
                        const status = pokemon.status;
                        this.battle.add(`& mod|${PkmnFullname}|status: ${oldstatus} -> ${status}`);
                    }
                    if (mod.fainted) {
                        pokemon.faint();
                        this.battle.faintMessages()
                        this.battle.add(`& mod|${PkmnFullname}|fainted`);
                    }
                    if (mod.moveSlots) {
                        for (let [moveid, movedata] of Object.entries(mod.moveSlots)) {
                            const move = pokemon.getMoveData(moveid);
                            if (!move) throw new Error(`No move with that id ${moveid} mod`);
                            move.pp = movedata.pp;
                            if (movedata.maxpp) move.maxpp = movedata.maxpp;
                        }
                    }
                }
                break;
            case 'json':
                console.log(this.battle?.toJSON());
                break;
            default:
                super._writeLine(type, message);
                break;
        }
    }
}


export interface PokemonSetExtended extends PokemonSet {

    persistentData?: PersistentPkmnData;
    experience?: number;
    /*
    name: string;
    species: T;
    item: T;
    ability: T;
    moves: T[];
    nature: T;
    gender: string;
    evs: StatsTable;
    ivs: StatsTable;
    level: number;
    shiny?: boolean;
    happiness?: number;
    pokeball?: T;
    hpType?: string;
    dynamaxLevel?: number;
    gigantamax?: boolean;
    teraType?: string; */
}
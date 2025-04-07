import { BattleStreams, PlayerOptions, RandomPlayerAI, Teams } from "@pkmn/sim";
import { BattleStreamsMod, PkmnFullname, PokemonSetExtended, PersistentPkmnTeamData } from "./mod";
import { TeamGenerators } from "@pkmn/randoms";



interface PlayerOptionsExtended extends PlayerOptions {
    team?: PokemonSetExtended[]
    bot?: boolean
}
export type ConnectionType = 'singleplayer' | 'multiplayer'

export type PlaygroundSetupOptions = {
    formatid: 'gen9ubers'
    players: PlayerOptionsExtended[]  /** |player|PLAYER|USERNAME|AVATAR|RATING  */
    connection?: ConnectionType
    /*TODO:  
        WILD & TRAINER
    */
}

export default class Playground {
    private battleStreams: BattleStreamsMod;
    private streams: ReturnType<typeof BattleStreams.getPlayerStreams>;

    constructor() {
        this.battleStreams = new BattleStreamsMod({ debug: true });
        this.streams = BattleStreams.getPlayerStreams(this.battleStreams);

    }
    setup(options: PlaygroundSetupOptions) {
        const spec = { formatid: options.formatid,/* strictChoices: false, debug: true*/ };
        Teams.setGeneratorFactory(TeamGenerators);

        void (async () => {
            for await (const chunk of this.streams.omniscient) {
                console.log(chunk);
            }
        })();

        this.streams.omniscient.write(`>start ${JSON.stringify(spec)}`)
        options.players.map((player, index) => {
            if (!player.team) player.team = Teams.generate('gen9randombattle')
            console.log(player.team || 'no team')
            this.streams.omniscient.write(`>player p${index + 1} ${JSON.stringify({ ...player, team: Teams.pack(player.team) })}`)
        })
        // set real state pokemon
        options.players.map((player, index) => {
            const modState: PersistentPkmnTeamData = {}
            const teamState = player.team?.map(pkmn => {
                const fullname: PkmnFullname = `p1: ${pkmn.name}`;
                if (pkmn.persistentData) modState[fullname] = pkmn.persistentData
            })
            this.streams.omniscient.write(`>mod ${JSON.stringify(modState)}`)
        })
    }
    getStreams(index: number) {
        if (index == 0) {
            return this.streams.omniscient
        } else if (index == 1) {
            return this.streams.p1
        } else if (index == 2) {
            return this.streams.p2
        } else if (index == 3) {
            return this.streams.p3
        }
        else {
            return this.streams.p4
        }
    }
}

var playground = new Playground();
const options: PlaygroundSetupOptions = {
    formatid: 'gen9ubers',
    players: [
        {
            name: 'nerfis',
            team: [{
                name: 'Garbodor',
                species: 'Garbodor',
                gender: '',
                shiny: false,
                level: 88,
                moves: ['toxicspikes', 'stompingtantrum', 'spikes', 'gunkshot'],
                ability: 'Aftermath',
                evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 },
                ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
                item: 'Black Sludge',
                nature: 'Timid',
                persistentData: {
                    status: 'brn'
                }
            }]
        },
        {
            name: 'bot'
        }
    ]
}

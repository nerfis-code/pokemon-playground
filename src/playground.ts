import { BattleStreams, Dex, PlayerOptions, RandomPlayerAI, SideID, Teams } from "@pkmn/sim";
import { BattleStreamsMod, PkmnFullname, PokemonSetExtended, PersistentPkmnTeamData } from "./mod";
import { TeamGenerators } from "@pkmn/randoms";



export interface PlayerOptionsExtended extends PlayerOptions {
    team?: PokemonSetExtended[]
    bot?: boolean
    /*
    name?: string;
    avatar?: string;
    rating?: number;
    team?: PokemonSet[] | string | null;
    seed?: PRNGSeed;
     */
}
type Generation = "gen9"
type Formats = 'ubers' | 'randombattle' | 'randomdoublesbattle'

export type ConnectionType = 'singleplayer' | 'multiplayer'
export type BattleType = 'wild' | 'trainer' | 'doubleTrainer' | 'Legendary'
export interface PlaygroundSetupOptions {
    players: PlayerOptionsExtended[]  /** |player|PLAYER|USERNAME|AVATAR|RATING  */
    connection: ConnectionType
    battleType: BattleType
    formatid: `${Generation}${Formats}`
}

export default class Playground {
    private battleStreams: BattleStreamsMod;
    private streams: ReturnType<typeof BattleStreams.getPlayerStreams>;

    constructor() {
        this.battleStreams = new BattleStreamsMod({ debug: true });
        this.streams = BattleStreams.getPlayerStreams(this.battleStreams);

    }
    setup(options: PlaygroundSetupOptions) {
        const spec = { formatid: options.formatid, strictChoices: false, debug: true };
        Teams.setGeneratorFactory(TeamGenerators);

        void (async () => {
            for await (const chunk of this.streams.omniscient) {
                console.log(chunk);
            }
        })();

        this.streams.omniscient.write(`>start ${JSON.stringify(spec)}`)
        options.players.map((player, index) => {
            if (!player.team) player.team = Teams.generate('gen9randombattle')
            if (player.bot) {
                const bot = new RandomPlayerAI(this.getStreams(index + 1))
                bot.start()
            }
            console.log(Teams.pack(player.team))
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
    execute(sideId: SideID, command: string) {
        this.streams.omniscient.write(`>${sideId} ${command}`)
    }
    getStreams(index: number) {
        return [
            this.streams.omniscient,
            this.streams.p1,
            this.streams.p2,
            this.streams.p3,
            this.streams.p4,
        ][index]
    }
    getStreamsBySide(sideId: SideID) {
        {
            const index = ['p1', 'p2', 'p3', 'p4'].indexOf(sideId)
            return [
                this.streams.p1,
                this.streams.p2,
                this.streams.p3,
                this.streams.p4,
            ][index]
        }
    }
}

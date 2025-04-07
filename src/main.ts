import { TeamGenerators } from "@pkmn/randoms";
import { BattleStreams, Dex, Teams } from "@pkmn/sim";
import { PkmnFullname, PersistentPkmnTeamData, BattleStreamsMod } from "./mod";
import { debug } from "console";
import { send } from "process";

Teams.setGeneratorFactory(TeamGenerators);

let t1 = Teams.generate('gen9randombattle')
let t2 = Teams.generate('gen9randombattle')

const outConsole = (type: string, data: string | string[]): void => {
    //console.log(type)
    //console.log(data)
}

const battleStreams = new BattleStreamsMod({ debug: true }, undefined, outConsole);
const streams = BattleStreams.getPlayerStreams(battleStreams);


const spec = { formatid: 'gen9ubers', strictChoices: false, debug: true, };
const p1spec = { name: 'Bot 1', team: Teams.pack(t1) };
const p2spec = { name: 'Bot 2', team: Teams.pack(t2) };


void (async () => {
    for await (const chunk of streams.p2) {
        console.log(chunk);
    }
})();

const fullname: PkmnFullname = `p1: ${t1[0].name}`;
let test: PersistentPkmnTeamData = {
    [fullname]: {
        status: 'brn',
        fainted: true,
    },
}

/*
    with teamreview format:
     p1 team 123456
    without teamreview format:
     p1 switch 1
*/

void streams.omniscient.write(`
>start ${JSON.stringify(spec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}
>mod ${JSON.stringify(test)}
>p1 team 213456
>p2 team 213456
>log Hello, world!
`);

streams.p1.write('switch 1');
streams.p2.write('move 1');


console.log(Dex.forGen(9).species.get('Venusaur'));
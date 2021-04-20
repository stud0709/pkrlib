let pkr = require('./pkrlib.js');
let pockets = Array(10);
pockets[0] = ['ac', 'as'];
//pockets[1] = ['js'];
let communityCards = [];
/*
let result = pkr.singleRun(pockets, []);

console.log(`Community cards: ${result.communityCards}`);
console.log("\nPocket cards:");
Object.entries(result.pocketCards).forEach(([k, v]) => console.log(`${k}: ${v}`));
console.log("\nResults:");
Object.entries(result.hands).forEach(([k, v]) => console.log(`${k}: ${v}`));
*/
let start = Date.now();
console.log(`Simulation for ${pockets.length} players\npocket cards: ${Object.entries(pockets).map(([k, v]) => "[" + k + ": " + v + "]").join(', ')}\ncommunity cards: ${communityCards}`);
let { strength, iterations } = pkr.simulateGames(pockets, communityCards);
strength.forEach((v, i) => console.log(`${i}: ${v}`));
console.log(`${iterations} iterations in ${Date.now() - start} ms.`);
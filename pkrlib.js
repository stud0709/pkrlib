"use strict"

/**
 * two through nine, t = ten, j = jack, q = queen, k = king, a = ace
 */
const values = [...'23456789tjqka'];
values.unshift(undefined) /* 0 is the 'lower ace' rank */;
const readableValues = [...' 23456789', '10', ...'JQKA'];

/**
 * d = diamonds (♦), c = clubs (♣), h = hearts (♥), s = spades (♠)
 */
const suits = [...'dchs'];
const suitSymbols = ['\u2666', '\u2663', '\u2665', '\u2660'];
const toRank = cardValue => values.indexOf(cardValue);

/**A card. 
 *@param vs {string}  card value and suit  
 */
const Card = (vs) => {
    vs = vs.toLowerCase();
    const value = vs[0]
    const suit = vs[1];

    if (!values.some(e => e === value)) throw new Error(`Invalid value: ${value}`);
    if (!suits.some(e => e === suit)) throw new Error(`Invalid suit: ${suit}`);
    if (vs.length !== 2) throw new Error(`Invalid card: ${vs}`);

    const vOf = toRank(value);
    const suitSymbol = suitSymbols[suits.indexOf(suit)];
    const readableValue = readableValues[values.indexOf(value)];

    return {
        get value() { return value; },
        get suit() { return suit; },
        get suitSymbol() { return suitSymbol; },
        get readableValue() { return readableValue; },
        toString() { return `${vs}`; },
        valueOf() { return vOf; },
        compareTo(c) {
            if (!c) return 1;
            let i = this.valueOf() - c.valueOf();
            if (!i) i = this.suit.localeCompare(c.suit);
            return i;
        }
    };
};

//create deck template
const cards = [];

for (const v of values) {
    if (!v) continue;
    for (const s of suits) {
        cards.push(Card(`${v}${s}`));
    }
}

/** New shuffled deck as an array of cards 
 * @param deadCards array of dead cards to be excluded from the deck
 * @returns shuffled array of cards 
*/
const shuffle = deadCards => {
    if (deadCards) deadCards = deadCards.map(c => c.toString());

    //make a copy of the deck template removing dead cards
    const deck = cards.filter(c => !(deadCards && deadCards.includes(c.toString())));
    deck.forEach(c => c.rnd = Math.random());
    deck.sort((c1, c2) => c1.rnd - c2.rnd);

    return deck;
};

/* const straightFlushPredicate = (cards) => {
    if (cards.length != 7) throw new Error("need 2x hole cards + 5x community cards");
    return straightPredicate(cards) && flushPredicate(cards);
} */

//group and sort cards
const groupCards = (...cards) => {
    cards = cards.map(c => (typeof c === 'string') ? Card(c) : c);
    cards.sort((c1, c2) => c1.compareTo(c2));

    let v = {};
    let s = {};
    let cArr = [];
    for (let c of cards) {
        if (c.value in v) {
            v[c.value]++;
        } else {
            v[c.value] = 1;
        }

        if (c.suit in s) {
            s[c.suit]++;
        } else {
            s[c.suit] = 1;
        }

        cArr.push(c);
    }

    return { values: v, suits: s, cards: cArr };
}

/** Checks for a flush.
 * @param {*} groupedCards object 
 * @returns array of flush cards or undefined. There might be more than 5 cards, keep them to check for straight flush. 
if there is no straight flush, leave 5 highest cards later on*/
const tryParseFlush = ({ suits, cards }) => {
    const s = Object.entries(suits).filter(([k, v]) => v >= 5)[0]?.[0];
    if (s) {
        //this is the flush suit
        return cards.filter(c => c.suit === s);
    }
};

/** Check for a straight
 * @param {*} groupedCards object 
 * @returns array of straight cards or undefined. 
 */
const tryParseStraight = ({ values, cards }) => {
    //need at least five different values
    if (values.length < 5) return;

    const valueKeys = Object.keys(values);

    for (const aceAsLowCard of [false, true]) {
        if (aceAsLowCard) {
            if (valueKeys.includes('a') && valueKeys.includes('2')) {
                //move ace to the front
                valueKeys.unshift(valueKeys.pop());
            } else {
                break;
            }
        }

        straight:
        for (let j = valueKeys.length - 1; j >= 4; j--) {
            let k = j;
            for (; k > 0 && k > j - 4; k--) {

                const vHigh = toRank(valueKeys[k]);
                let vLow = toRank(valueKeys[k - 1]);
                if (aceAsLowCard && valueKeys[k - 1] === 'a') {
                    /* a card with value two has index 0 */
                    vLow = 0;
                }
                if (vHigh - vLow != 1) {
                    //not a straight
                    continue straight;
                }
            }

            //it is a straight            
            const valuesOfStraight = [...valueKeys].splice(j - 4, 5);

            const result = [];
            valuesOfStraight.forEach(v => {
                let cardsOfValue = cards.filter(c => c.value === v);
                result.push(cardsOfValue[0]);
            });

            return result;

        }
    }
};

/** Check for 'x of a kind'. For 7 cards, there is only one 4oK possible
 * 
 * @param {*} groupedCards object 
 * @param x 'x of a kind' or a predicate for Object.entries() filtering
 * @returns array of cards or undefined
 */
const tryParseXoK = ({ values, cards }, x) => {
    let predicate = ([k, v]) => v === x;
    if (typeof x === 'function') predicate = x;

    const cardValues = Object.entries(values).filter(predicate).map(([k, v]) => k);

    if (cardValues.length > 0) {
        //return cards with the highest value
        let cardValue = cardValues[cardValues.length - 1];
        return cards.filter(c => c.value === cardValue);
    }
};

const HIGH_CARD = 'High Card', PAIR = 'Pair', TWO_PAIRS = 'Two Pairs', THREE_OF_KIND = 'Three of a Kind',
    STRAIGHT = 'Straight', FLUSH = 'Flush', FULL_HOUSE = 'Full House', FOUR_OF_KIND = 'Four of a Kind', STRAIGHT_FLUSH = 'Straight Flush';

const hands = [HIGH_CARD, PAIR, TWO_PAIRS, THREE_OF_KIND, STRAIGHT, FLUSH, FULL_HOUSE, FOUR_OF_KIND, STRAIGHT_FLUSH];

const parse = (...cards) => {
    if (cards.length !== 7) throw new Error(`Need 7 cards, got: ${cards.length}`);

    const groupedCards = groupCards(...cards);

    //four of a kind?
    {
        const cArr = tryParseXoK(groupedCards, 4);
        if (cArr) {
            let remainder = groupedCards.cards.filter(c => !cArr.includes(c));

            return parseResult(FOUR_OF_KIND,
                /* 1 more to complete a combination of 5 */ ...remainder.slice(-1), ...cArr);
        }
    }

    //flush?
    {
        const cArr = tryParseFlush(groupedCards);
        if (cArr) {
            //straight with flush cards possible?
            const _groupedCards = groupCards(...cArr);
            const _cArr = tryParseStraight(_groupedCards);
            if (_cArr) {
                return parseResult(STRAIGHT_FLUSH, ..._cArr);
            } else {
                return parseResult(FLUSH, ...cArr.slice(-5));
            }
        }
    }

    //three of a kind?
    {
        const threeOfKindCards = tryParseXoK(groupedCards, 3);
        let remainder = undefined;

        if (threeOfKindCards) {
            //continue with the remaining cards
            remainder = groupedCards.cards.filter(c => !threeOfKindCards.includes(c));
            let groupedRemainder = groupCards(...remainder);

            //pair in addition to 3oK?
            const pairCards = tryParseXoK(groupedRemainder, ([k, v]) => v >= 2);
            if (pairCards) return parseResult(FULL_HOUSE, ...pairCards.slice(-2), ...threeOfKindCards);
        }

        //straight (also possible along with 3oK)?
        {
            const cArr = tryParseStraight(groupedCards);
            if (cArr) return parseResult(STRAIGHT, ...cArr);
        }

        if (threeOfKindCards) return parseResult(THREE_OF_KIND,
            /* 2 more to complete a combination of 5 */ ...remainder.slice(-2), ...threeOfKindCards);
    }

    //pair?
    {
        const pairCards = tryParseXoK(groupedCards, 2);
        if (pairCards) {
            //continue with the remaining cards
            const remainder1 = groupedCards.cards.filter(c => !pairCards.includes(c));
            const groupedRemainder1 = groupCards(...remainder1);

            //one more pair?
            const lowerPairCards = tryParseXoK(groupedRemainder1, 2);
            if (lowerPairCards) {
                const remainder2 = groupedRemainder1.cards.filter(c => !lowerPairCards.includes(c));
                return parseResult(TWO_PAIRS,
                    /* 1 more to complete a combination of 5 */ ...remainder2.slice(-1), ...lowerPairCards, ...pairCards);
            } else {
                return parseResult(PAIR,
                    /* 3 more to complete a combination of 5 */ ...remainder1.slice(-3), ...pairCards);
            }
        }
    }

    return parseResult(HIGH_CARD, ...groupedCards.cards.slice(-5));
};

/** Weight of cards' position to calculate the hand's value. */
const positionWeight = [0, 15, 15 ** 2, 15 ** 3, 15 ** 4];

const parseResult = (hand, ...cards) => {
    let vOf = hands.indexOf(hand) * 1_000_000;
    for (let i = 0; i < cards.length; i++) {
        let c = cards[i];
        let v = c.valueOf();
        if (i === 0 &&
            (/* excludes full house with pair of aces */ hand === STRAIGHT || hand === STRAIGHT_FLUSH)
            && c.value === 'a') v = 0;
        vOf += (v * positionWeight[i]);
    }

    const r = hands.indexOf(this.hand);

    return {
        hand, get rank() { return r }, cards,
        valueOf() {
            return vOf;
        },
        compareTo(pr) {
            if (!pr) return 1;
            return this.valueOf() - pr.valueOf();
        },
        toString() { return `${this.hand}: ${this.cards} = ${this.valueOf()} ` }
    };
};

/**
 * 
 * @param {*} pocketCardArr array of two strings' or cards' arrays. Undefined elements or empty arrays will be filled with random cards
 * @param {*} communityCards community cards. Undefined or empty array positions will be filled with random cards
 * @return array of parseResult 
 */
const singleRun = (pocketCardArr, communityCards = []) => {
    if (!pocketCardArr) throw new Error("Pocket cards cannot be undefined");
    let deadCards = [...pocketCardArr, ...communityCards].flat().filter(v => v).map(v => typeof v === 'string' ? Card(v) : v);
    const deck = shuffle(deadCards);

    //complete pocket cards
    for (let i = 0; i < pocketCardArr.length; i++) {
        let pc = pocketCardArr[i];
        if (!pc) pc = pocketCardArr[i] = [];

        for (let j = 0; j < 2; j++) {
            switch (typeof pc[j]) {
                case 'undefined':
                    //add a random card
                    pc[j] = deck.pop();
                    break;
                case 'string':
                    //convert to card
                    pc[j] = Card(pc[j]);
                    break;
            }
        }
    }

    //complete community cards
    for (let i = 0; i < 5; i++) {
        switch (typeof communityCards[i]) {
            case 'undefined':
                //add a random card
                communityCards[i] = deck.pop();
                break;
            case 'string':
                //convert to card
                communityCards[i] = Card(communityCards[i]);
                break;
        }
    }

    const parseResultArr = [];
    for (let i = 0; i < pocketCardArr.length; i++) {
        const pr = parse(...(pocketCardArr[i]), ...communityCards);
        parseResultArr.push(pr);
    }

    return { hands: parseResultArr, communityCards, pocketCards: pocketCardArr };

};

const simulateGames = (pocketCardArr, communityCards = [], iterations = 10_000, timeLimitMs) => {
    const result = { strength: Array(pocketCardArr.length).fill(0), iterations: undefined };

    const ts = Date.now();
    let cnt = 0;

    do {
        //deep array copy of pocket cards
        const _pocketCardArr = pocketCardArr.map(p => [...p]);
        const { hands } = singleRun([..._pocketCardArr], [...communityCards]);
        //add index to parseResult
        for (let j = 0; j < hands.length; j++) {
            hands[j].position = j;
        }
        const max = Object.values(hands).map(h => h.valueOf()).reduce((v1, v2) => v1 > v2 ? v1 : v2);
        const winners = Object.values(hands).filter(h => h.valueOf() === max);
        const score = 1 / winners.length;
        winners.forEach(w => result.strength[w.position] += score);
        cnt++;
        if (timeLimitMs && cnt % 100 === 0 && (ts + timeLimitMs) < Date.now()) break;
    } while (cnt < iterations);

    result.iterations = cnt;
    result.strength = result.strength.map((v, i) => pocketCardArr[i] && pocketCardArr[i].length ? v / cnt : undefined /* dummy player */);
    return result;
}

exports.parse = parse;
exports.singleRun = singleRun;
exports.simulateGames = simulateGames;

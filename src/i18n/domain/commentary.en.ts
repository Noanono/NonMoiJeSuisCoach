import type { COMMENTARY_LINES, TRIGGER_LABEL, UNAVAILABLE } from '../../domain/match/commentary';

/**
 * Live texte en anglais (MATCH-04) : même nombre de variantes que le français, dans le même ordre,
 * pour que chaque phrase tirée pendant le match retrouve sa traduction.
 */
type SameShape<T> = { [K in keyof T]: T[K] extends readonly string[] ? readonly string[] : string };

export const COMMENTARY_LINES_EN: SameShape<typeof COMMENTARY_LINES> = {
  kickoff: [
    "Kick-off between {team} and {opponent}. The bar is open, the boots are laced, here we go.",
    "We're off between {team} and {opponent}! The ref has blown, the neighbour's dog has barked.",
    'Kick-off! {team} host {opponent} in front of three generations of supporters and a barbecue.',
  ],
  secondHalf: [
    'The second half is under way. Heavy legs, heavy sausages.',
    "Another 45 minutes. Some have finished their pint, others brought it to the bench.",
    "Second half started. Your team talk seems to have worked, or maybe it's the beer.",
  ],
  halftime: [
    'Half-time: {score}. Off to the dressing room, which is still leaking.',
    "Break at {score}. For once, the queue at the bar is longer than the one for the loos.",
    "It's half-time, {score}. Use the fifteen minutes to rethink your instructions.",
  ],
  fullTime: [
    'Final whistle: {score}. See you at the bar to replay the match.',
    "It's all over, {score}. The post-match chat will last longer than the match.",
    'Full time, and the score is {score}. Let the third half begin.',
  ],
  stoppage: [
    "{n} minute(s) of stoppage time. The ref has a watch, he just can't read it.",
    'The board shows {n} minute(s) added on. The volunteer holding it has shaky hands.',
  ],
  ambiance: [
    '{team} keep it ticking in midfield. In the stand, a grandad is explaining offside to his dog.',
    "Ball at {team}'s feet. Not much tempo out there, but the bar is packed.",
    'Throw-in foul in midfield, nothing serious. Someone yells "Come on, lads!" at a bunch of 35-year-olds.',
    'A quiet spell for {opponent}, {team} pushing. The smell of sausages drifts up to the centre circle.',
    "Long ball from {team} that ends up in the next field. The farmer gives it back, this time.",
    '{team} keep possession. The announcer takes the chance to plug next Saturday\'s bingo.',
    "A meaty tussle in midfield, the ref waves play on. The pressing from the supporters is intense.",
    "Possession spell for {team}. On the bench, someone has got the cards out for a game of rummy.",
  ],
  goal: [
    'GOAL by {player} for {team}! {score}. The bar stands an imaginary round.',
    'GOAL! {player} beats the keeper, {score}. Even the mascot spilled his beer.',
    "And it's in! {player} scores for {team}, {score}. The car horns in the car park join in.",
    'GOOOAL from {player}! {score}. The announcer nearly loses his dentures.',
  ],
  penaltyGoal: [
    'Penalty converted by {player}! {score}. The keeper watches it go by, coffee in hand.',
    "{player} doesn't flinch from the spot, {score}. The nerves of an accountant.",
  ],
  goalCancelled: [
    "{team}'s goal is ruled out! The score goes back to {score}. Nobody really knows why, and that's fine.",
    "{team}'s goal no longer counts, {score}. The scoreboard has already blown a fuse.",
  ],
  save: [
    "Save by the {opponent} keeper from {player}. Hands like washboards.",
    "{player} shoots, the {opponent} keeper gathers. He has gloves, and he knows how to use them.",
    "Crucial save from {player}'s strike. The opposing keeper had lions for breakfast, or cassoulet.",
  ],
  miss: [
    '{player} tries his luck… wide. The ball heads for the car park, mind the wing mirrors.',
    "Shot from {player}, over the bar. He was aiming for the top corner, he found the bar. The other bar.",
    "Chance for {team}, but {player} misses the target. He'll still be talking about it next Sunday.",
    "{player} is clean through and aims for the clouds. It'll rain tomorrow, or not.",
  ],
  actionCancelled: [
    "{team}'s move is stopped dead! Blame it on: {label}.",
    "{team}'s chance nipped in the bud: {label}. The ball didn't understand a thing.",
  ],
  foul: [
    "Foul by {player} ({team}). Whistle, and a calf that won't forget it.",
    'Foul by {player}. The ref whistles, the stand protests on principle.',
  ],
  yellowCard: [
    'Yellow card for {player} ({team}). He protests, but with a smile.',
    'Yellow for {player}. The ref found the card, his glasses stayed in his pocket.',
    '{player} goes in the book. One more yellow for the dressing-room collection.',
  ],
  secondYellow: [
    "Second yellow for {player}, so it's red! {team} down to ten. Off to the showers, hot water not guaranteed.",
    'Second booking for {player}: sent off! He\'ll cheer the lads on from the bar.',
  ],
  redCard: [
    'RED card for {player}! {team} down to ten. He leaves the pitch to boos and flying crisps.',
    'Straight red for {player}! He walks off shaking hands in the stand like a local councillor.',
  ],
  freeKick: [
    'Free kick {label} for {team}. The wall lines up, hands where they should be.',
    'Free kick {label} for {team}. In the wall, everyone is praying, some for real.',
  ],
  freeKickCounter: [
    "{team}'s cross is cleared, and {opponent} break: the defence had wandered up for a drink.",
    "Headed clear, and {opponent} are off on the counter. {team}'s defenders stroll back.",
  ],
  setPieceCancelled: [
    'Pushing and shoving in the wall: the ref gives a foul against {team}. The free kick evaporates.',
    'The wall steps up, steps back, shoves… the ref has had enough and gives the ball to {opponent}.',
  ],
  penaltyRetaken: [
    "Goal… disallowed! The ball wasn't on the spot, {team}'s penalty must be retaken.",
    "The ball boy swears the ball moved: {team} have to retake the penalty.",
  ],
  turnedIntoPenalty: [
    "{team}'s taker collapses before even hitting it… and the ref points to the spot! PENALTY.",
    'An Oscar-worthy dive from {team}: the free kick becomes a penalty.',
  ],
  corner: [
    'Corner for {team}. Everyone goes up, except the keeper, who is retying his laces.',
    "Corner for {team}. Pushing, shirt-pulling, it's the football we love.",
  ],
  penalty: [
    'PENALTY for {team}! The stand holds its breath and its beer.',
    'Penalty for {team}! The ref points to the spot with great conviction.',
  ],
  penaltyDuel_wrong: [
    '{player} runs up, {label}… the keeper goes the other way.',
    '{player} goes for the {label}, and the keeper dives into thin air.',
  ],
  penaltyDuel_right: [
    '{player} runs up, {label}… the keeper guessed the side!',
    '{player} goes for the {label}, but the keeper goes the right way.',
  ],
  penaltyDuel_center: [
    "{player} runs up, {label}… the keeper hasn't moved an inch.",
    '{player} goes for the {label}, facing a keeper rooted to the middle of his goal.',
  ],
  panenkaScored: [
    'PANENKA! {player} chips it over the grounded keeper. {team} puff out their chests, {opponent} hang their heads.',
    "A Panenka, mid-match: they'll still be talking about it at the bar at Christmas. {team} are fired up.",
  ],
  panenkaFailed: [
    "{player}'s Panenka ends up in the arms of the keeper, who didn't even have to move. {opponent} laugh, {team} hide.",
    'Botched Panenka: the keeper plucks the ball like an apple. {player} will hear about this for a long time.',
  ],
  penaltyMissed: [
    'Penalty missed by {player}! The {opponent} keeper guessed right, or got lucky.',
    "{player} misses his penalty. The ball is still in orbit above the stadium.",
  ],
  setPieceMissed: [
    "{team}'s set piece comes to nothing. {player} had a go, the wall held.",
    "Nothing from that {team} set piece. The ball rolled out for a throw, sheepishly.",
  ],
  injury: [
    "{player} ({team}) is clutching his thigh and can't carry on: out for {weeks} week(s). No substitution, {team} will play with ten.",
    'Injury for {player}: out for the rest of the match and {weeks} week(s) in the treatment room. The physio gets out his kit and his camphor rub.',
  ],
  injuryMinor: [
    "{player} ({team}) is clutching his thigh and is done for the day. Nothing serious: he'll be back next week. {team} will play with ten.",
    'A knock for {player}, who can\'t carry on. The physio calls it "a big boo-boo". No substitution, {team} will play with ten.',
  ],
  cleanSheet: [
    '{label} held firm: {n} Rant point(s) for {team}.',
    'Nothing conceded during {label}: {team} get back {n} Rant point(s).',
  ],
  activationHuman: [
    '{player} activates {ability}! {label}',
    'On your orders, {player} pulls out {ability}. {label}',
    '{ability} for {player}, at your request. {label}',
  ],
  activationAi: [
    "Watch out: {team}'s coach triggers {ability} with {player}! {label}",
    "The {team} bench is stirring: {player} activates {ability}. {label} Your turn to hit back.",
    '{team} reach for the weapon: {ability} by {player}. {label}',
  ],
  knockout: [
    "{player} ({team}) is out of action for {minutes} min. He'll get up, promise.",
    "{player} is flat out for {minutes} min. He's counting stars, he's up to twelve.",
  ],
  eventWindow: [
    "Pause: {label}. It's your call, now or never.",
    'The match stops for a moment: {label}. Your players are looking at you, your move.',
  ],
  shootoutStart: [
    'Penalties! Coin toss: {team} shoot first. The faint-hearted are asked to go home.',
    "Nobody can be separated: penalties. {team} go first, the bar stops serving.",
  ],
  shootoutGoal: [
    '{player} scores for {team}. Shootout: {score}.',
    "Net! {player} doesn't flinch. Shootout: {score}.",
  ],
  shootoutMiss: [
    '{player} misses! {team} wince. Shootout: {score}.',
    "Saved! {player}'s kick doesn't go in. Shootout: {score}.",
  ],
  shootout: [
    '{team} win the shoot-out {score}. The faint-hearted are asked to go home.',
    '{team} win on penalties, {score}. The keeper will be carried shoulder-high to the bar.',
  ],
};

export const UNAVAILABLE_EN: SameShape<typeof UNAVAILABLE> = {
  finished: "The match is over, save your rant for the bar.",
  shootout: 'During the shootout, only penalty abilities count.',
  noAbility: "No known ability on this one. Apart from having a drink, he can't do anything special.",
  sentOff: "He's already in the shower. He sings off-key, and he can't help you any more.",
  subbedOff: "He's been subbed off: he's watching the game eating crisps.",
  injured: "He's in the treatment room with an ice pack. Leave him alone.",
  knockedOut: "He's still on the ground counting stars. Wait for him to get up.",
  onBench: "He's warming the bench, not the match: this ability is played on the pitch.",
  wrongSide: "That's not your player. You coach enough people as it is.",
  busy: 'Another activation is waiting for its target, finish that one first.',
  gauge: 'Rant gauge running dry: you are {n} point(s) short. Shout a bit louder.',
  oncePerOccasion: "An ability has already been played on this chance: one per move, or the ref will start to suspect something.",
  oncePerMatch: "Already used this match: each ability works once. You can't order a miracle twice.",
  cooldown: '{n} more min to recharge: he is catching his breath and his dignity.',
  trigger: 'This triggers {label}: wait for the right moment.',
  noRecentGoal: 'You need an opposing goal less than {n} min old to wipe out.',
  noTarget: 'Nobody to aim at: he is just waving his arms around.',
};

export const TRIGGER_LABEL_EN: SameShape<typeof TRIGGER_LABEL> = {
  anytime: 'at any time',
  afterOwnGoal: 'after your team scores',
  ownSetPiece: 'on a set piece for you',
  opponentSetPiece: 'on an opposing set piece',
  ownPenalty: 'on a penalty for you',
  opponentPenalty: 'on an opposing penalty',
  ownDeadBall: 'on a penalty or free kick for you',
  halftime: 'at half-time',
  ownFreeKick: 'on a free kick for you',
  opponentFreeKick: 'on an opposing free kick',
};

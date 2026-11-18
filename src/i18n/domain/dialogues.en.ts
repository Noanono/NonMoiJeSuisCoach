/**
 * Dialogues du club en anglais (CLUB-06), rangés par identifiant de dialogue puis de réponse.
 * Les montants gardent le marqueur `{€N}` du français : ils sont ajustés à la division à l'affichage.
 */
export interface DialogueTranslation {
  speakerName: string;
  text: string;
  choices: Record<string, { label: string; outcome: string }>;
}

export const DIALOGUES_EN: Record<string, DialogueTranslation> = {
  'president-statue': {
    speakerName: 'The chairman',
    text: 'Three wins on the bounce and the chairman is over the moon. He wants to put up a statue of you outside the clubhouse bar: resin, "life-size, but with more hair".',
    choices: {
      accept: { label: 'Accept the statue', outcome: 'The statue mostly looks like the chairman. He loves it. The budget, less so.' },
      'team-bonus': { label: 'Suggest a bonus for the squad instead', outcome: 'The players raise a glass to you. The chairman sulks next to his empty plinth.' },
      humble: { label: 'Stay humble', outcome: 'The dressing room appreciates it. The chairman finds you "weirdly modest".' },
    },
  },
  'president-losing-streak': {
    speakerName: 'The chairman',
    text: 'Three defeats in a row: the chairman summons you to his office, which doubles as the keg store. "Coach, my wife wants to know if you\'re aware the idea is to put the ball in the OTHER net."',
    choices: {
      promise: { label: 'Promise a win on Sunday', outcome: 'He writes your promise on a keg in marker pen. Heaven help you if the keg runs dry first.' },
      'blame-referee': { label: 'Blame the referee', outcome: 'The chairman loves blaming the referee. So do the players.' },
      'blame-players': { label: 'Blame the players', outcome: 'The chairman approves. The dressing room, listening behind the door, does not.' },
    },
  },
  'president-low-confidence': {
    speakerName: 'The chairman',
    text: 'Your job is on the line: the chairman\'s faith in you is melting faster than an ice cube in a pint of shandy. He already has the number of his nephew, "who did a coaching course on YouTube".',
    choices: {
      'promise-result': { label: 'Promise results', outcome: 'He gives you one more chance. The pressure rolls straight downhill into the dressing room.' },
      'invite-training': { label: 'Invite him to training', outcome: 'He jogs three laps in loafers and leaves convinced. The players had to run with him.' },
      'remind-contract': { label: 'Remind him of your contract', outcome: 'There is no contract. It was a handshake at the bookies, and he barely remembers it.' },
    },
  },
  'president-nephew': {
    speakerName: 'The chairman',
    text: 'The chairman wants you to play his nephew Dylan, 17: "A real talent, he\'s got 4,000 followers on TikTok." His main skill is goal celebrations.',
    choices: {
      'promise-minutes': { label: 'Promise him some minutes', outcome: 'The chairman is ecstatic. The squad has seen Dylan do keepy-uppies: twice, with his hands.' },
      trial: { label: 'Offer him a trial', outcome: 'Dylan films the whole trial in portrait mode. The chairman finds it "very professional".' },
      refuse: { label: 'Flat-out refuse', outcome: 'The chairman sulks. The players buy you a pint.' },
    },
  },
  'president-wife-dinner': {
    speakerName: "The chairman's wife",
    text: 'The chairman\'s wife is hosting the volunteers\' dinner on Saturday night, the eve of a match. She insists, with a heavy wink, that you come "alone, shirt unbuttoned".',
    choices: {
      'whole-team': { label: 'Bring the whole team', outcome: 'Lovely dinner, shirt buttoned to the collar. The players got a bit too friendly with the brandy.' },
      alone: { label: 'Go alone', outcome: 'She talks her husband into a budget top-up. He wonders why you keep smiling.' },
      decline: { label: 'Politely decline', outcome: 'She also runs the bakery that sponsors the shirts. The croissants will be less fresh.' },
    },
  },
  'journalist-interview': {
    speakerName: 'Kevin, from The Clubhouse Echo',
    text: 'Kevin wants an interview for the sports page, squeezed between the obituaries and the bowls results. He asks for your tactical secret.',
    choices: {
      tactics: { label: 'Explain the 4-4-2 for twenty minutes', outcome: 'Kevin nodded off after three. The sponsors find it very serious.' },
      'trash-talk': { label: 'Wind up the next opponent', outcome: 'The dressing room pins the article on the wall. The chairman fears a rematch in the car park.' },
      pastis: { label: 'Say the secret is pastis', outcome: 'The local drinks wholesaler offers a partnership. The chairman chokes on his crisps.' },
    },
  },
  'supporters-tifo': {
    speakerName: 'The Clubhouse Ultras',
    text: 'The Clubhouse Ultras (six people and a dog) want a tifo for the next home game. They\'re asking for {€300} of paint and your blessing for the banner "We drink, we win".',
    choices: {
      fund: { label: 'Fund the tifo', outcome: 'The tifo is gorgeous, except the "w" of "win", painted upside down. The players are fired up.' },
      refuse: { label: 'Refuse', outcome: 'They paint the banner on your car instead. Free of charge, at least.' },
    },
  },
  'supporters-parking': {
    speakerName: 'A delegation of supporters',
    text: 'After the losing run, a few supporters are waiting for you in the car park, sausage in hand. Their spokesman has had a few, but he has a point.',
    choices: {
      drink: { label: 'Go for a drink with them', outcome: 'You buy the round, they leave singing your name. Off-key, but from the heart.' },
      promise: { label: 'Promise some entertainment', outcome: 'The chairman likes the speech. The players feel the pressure rising.' },
      escape: { label: "Sneak out through the referees' exit", outcome: "You bump into Sunday's referee. He doesn't like you either." },
    },
  },
  'supporters-mamie': {
    speakerName: 'Granny Ginette',
    text: 'Granny Ginette, the oldest supporter, knits the club scarves. She invites the team to tea at the care home, with her famous rum cake, "without rum, promise".',
    choices: {
      team: { label: 'Go with the team', outcome: 'The cake was mostly rum. Great atmosphere, rough morning.' },
      'captain-only': { label: 'Send just the captain', outcome: 'He comes back with three scarves and a phone number.' },
      decline: { label: 'Decline', outcome: "Granny Ginette is the chairman's mother. He took it very badly." },
    },
  },
  'captain-toilets': {
    speakerName: 'The captain',
    text: 'The dressing-room toilets have been blocked for three weeks, and morale is sinking with them. Nobody owns up, but everyone suspects the centre-back and his cheese fondue.',
    choices: {
      plumber: { label: 'Pay the plumber', outcome: 'The plumber comes out pale and demands danger money. The dressing room can finally breathe.' },
      investigate: { label: 'Investigate', outcome: 'The culprit is unmasked: the chairman, after bingo night. The dressing room is in stitches.' },
      'open-windows': { label: 'Open the windows and pray', outcome: 'The players get changed in the car park. Frosty atmosphere, literally.' },
    },
  },
  'barman-tab': {
    speakerName: 'Josiane, from the clubhouse bar',
    text: 'The coffers are nearly empty, and Josiane points out that the players\' bar tab has reached {€1200}. She takes cash, cheques and "favours".',
    choices: {
      pay: { label: 'Settle the tab', outcome: 'Josiane buys a round to celebrate. You have just started a new tab.' },
      'docked-wages': { label: 'Dock it from their wages', outcome: 'The players pay up. They hate you a little, but the books are balanced.' },
      gala: { label: 'Organise a charity match for the bar', outcome: 'Lost 4-2 to the fire brigade. But the bar did a roaring trade.' },
    },
  },
  'sponsor-kebab': {
    speakerName: 'The Stadium Kebab',
    text: 'The Stadium Kebab wants to sponsor the shirts: {€2000} a season, on condition that "Garlic sauce or nothing" is printed on the back.',
    choices: {
      sign: { label: 'Sign', outcome: 'The shirt smells faintly of onion. The chairman dreamed of a classier sponsor.' },
      'free-kebabs': { label: 'Negotiate free kebabs', outcome: 'The players love it. The centre-back put on three kilos in a week.' },
      refuse: { label: 'Refuse', outcome: 'The kebab shop sponsors the rival club. Local sponsors are getting nervous.' },
    },
  },
  'groundsman-pitch': {
    speakerName: 'The groundsman',
    text: 'The pitch looks like a potato field, and it\'s wrecking legs: {€400} short for grass seed. Otherwise, the groundsman offers to "fertilise the old-fashioned way", with his brother-in-law\'s manure.',
    choices: {
      seeds: { label: 'Pay for the seed', outcome: 'Lovely green grass. The players can finally run without twisting their ankles.' },
      manure: { label: 'Manure it is', outcome: 'The grass grows, and so does the smell. The shirt sponsor refuses to set foot in the ground.' },
    },
  },
  'mayor-subsidy': {
    speakerName: 'The mayor',
    text: 'The mayor, mid-campaign, offers a {€1500} grant if the team poses for a photo with him. He would also love you to badmouth his opponent, the pharmacist.',
    choices: {
      photo: { label: 'Do the photo', outcome: 'The photo makes the front page of the council newsletter. The chairman is jealous, but pleased.' },
      'photo-and-attack': { label: 'Do the photo and bash the pharmacist', outcome: 'Grant doubled… but the pharmacist sponsored the water bottles. Farewell, water bottles.' },
      neutral: { label: 'Stay neutral', outcome: 'The chairman is a councillor for the ruling party. He takes note.' },
    },
  },
  'physio-ice-bath': {
    speakerName: 'The volunteer physio',
    text: 'The volunteer physio (a former vet) has an express recovery method: ice bath, then pastis bath. Cost: {€200} of ice cubes.',
    choices: {
      'full-method': { label: 'Try the full method', outcome: 'Legs like new. The players smell of aniseed until Sunday.' },
      'ice-only': { label: 'Just the ice, thanks', outcome: 'Decent recovery, high-pitched screaming guaranteed.' },
    },
  },
  'president-derby': {
    speakerName: 'The chairman',
    text: 'Derby week. The chairman has dug out his scarf from 1987 and talks about nothing else. "Coach, I want to see them cry. Their chairman nicked my parking spot at Sunday mass."',
    choices: {
      promise: { label: 'Promise to crush them', outcome: 'The chairman is thrilled. He has already ordered the flares. Now you have to win.' },
      calm: { label: "Remind him it's only a game", outcome: 'He looks at you like you insulted his mother. The rest of the week will be frosty.' },
      party: { label: 'Throw a pre-derby party at the bar', outcome: 'The whole town turned up. The till is full, but the chairman found the evening "a bit too festive for such a serious match".' },
    },
  },
  'supporters-derby': {
    speakerName: 'The supporters',
    text: "The ultras (four people and a drum) turn up at training: they want to paint the rival's dressing room pink the night before the derby. They're waiting for your blessing.",
    choices: {
      bless: { label: 'Give them your blessing', outcome: 'The dressing room is pink. The rival is furious, the local press loves it, the chairman pretends to know nothing.' },
      refuse: { label: 'Politely refuse', outcome: 'They leave disappointed but promise to sing twice as loud.' },
      tifo: { label: 'Offer to fund a tifo instead', outcome: "The tifo shows your face. It's terrible, but it's enormous." },
    },
  },
  'district-tracteur': {
    speakerName: 'The groundsman',
    text: 'The farmer next door wants to drive his tractor across the pitch during training: "It\'s the shortest way to my cows." He offers {€300} for right of way.',
    choices: {
      accept: { label: 'Take the money and let him through', outcome: "The cows loved the pitch. The sponsors, less so: their boards are covered in dung." },
      sponsor: { label: 'Demand his logo on the shirts in return', outcome: '"Bidochon Farm, from field to fork" now sits proudly on your shorts. The sponsors find it authentic.' },
      refuse: { label: "Refuse: we're a serious club", outcome: "The chairman approves. The neighbour now parks his tractor in the club car park." },
    },
  },
  'district-loto': {
    speakerName: 'Josiane, the barmaid',
    text: 'Josiane wants to run the club bingo night on Saturday. First prize: a ham. She needs you to call the numbers, and {€100} for the ham.',
    choices: {
      host: { label: 'Call the bingo yourself', outcome: 'You drew number 22 fourteen times and nobody knows how. The till is overflowing, the old-timers adore you.' },
      players: { label: 'Send the players to work the bar', outcome: 'Great takings, but the chairman caught them finishing the dregs at 3 a.m. He was not amused.' },
      skip: { label: 'Decline, you have a match to prepare', outcome: 'Josiane runs the bingo without you. The ham was won by the chairman, which surprises nobody.' },
    },
  },
  'promo-minibus': {
    speakerName: 'The chairman',
    text: 'The chairman has spotted a second-hand minibus online: {€1500}, "barely 400,000 km, and the air-con works in winter". No more car-sharing to away games, he says.',
    choices: {
      buy: { label: 'Buy the minibus', outcome: 'It starts one time in two, but the players arrive together and rested. The chairman drives it himself, at 40 mph.' },
      'sponsor-paint': { label: 'Get a sponsor to pay in exchange for the bodywork', outcome: "The minibus is painted in a local garage's colours. It smells of engine oil, but it's free." },
      refuse: { label: 'Stick with car-sharing', outcome: 'The chairman puts the ad away, disappointed. Three players turn up late again on Sunday.' },
    },
  },
  'promo-radio': {
    speakerName: 'Bar Stool FM',
    text: "Bar Stool FM (12 listeners, 9 of them at the club) wants you live on air. They're offering {€400} if you also plug Lardon's butcher's at the end of the show.",
    choices: {
      ad: { label: 'Do the show and the ad', outcome: 'Your line "At Lardon\'s, the sausage is rock solid" is on a loop. The sponsors love it, the chairman winces.' },
      tactics: { label: 'Talk tactics for an hour', outcome: 'All 12 listeners tuned out by minute 4. The chairman, though, recorded the show.' },
      decline: { label: 'Politely decline', outcome: 'They invite the rival coach instead. He slagged you off for 40 minutes.' },
    },
  },
  'dh-concession': {
    speakerName: 'The car dealer',
    text: 'The car dealer from the retail park wants to rename the stadium "Cheaper Diesel Arena" for {€2500} a season. The chairman already has tears in his eyes.',
    choices: {
      accept: { label: 'Sign the naming deal', outcome: 'The sign is up. The supporters still sing the old name, on principle.' },
      negotiate: { label: 'Negotiate cars for the staff instead', outcome: 'The physio now drives a demo estate car. He never gives the pitch back on time.' },
      refuse: { label: 'Refuse: the stadium keeps its soul', outcome: 'The old-timers buy you a drink at the bar. The dealer, offended, sponsors the rival.' },
    },
  },
  'dh-tele-locale': {
    speakerName: 'Regional TV',
    text: 'Regional TV wants to film the dressing room before the next game for a "fly-on-the-wall" show. Fee: {€800}. The captain points out that the dressing room "is not presentable, and neither is he".',
    choices: {
      film: { label: 'Open the dressing-room doors', outcome: 'The documentary is a hit: it shows the chairman putting on the wrong shirt. The sponsors want more.' },
      training: { label: 'Training only, not the dressing room', outcome: 'Clean footage, smaller fee. The journalist leaves frustrated but tanned.' },
      refuse: { label: 'The dressing room is sacred', outcome: 'The players applaud you. The TV crew films the club next door instead.' },
    },
  },
  'elite-investisseur': {
    speakerName: 'The chairman',
    text: 'An investor in a suit that\'s far too shiny wants to buy in: {€4000} right now, in exchange for "a few tips" on team selection. The chairman is torn between the money and his pride.',
    choices: {
      accept: { label: 'Take the money', outcome: 'The coffers are overflowing. The investor already sends you tactical diagrams drawn on paper napkins.' },
      limits: { label: 'Accept, but no tips', outcome: 'He halves his cheque and goes to sulk in his glass box.' },
      refuse: { label: 'Refuse: the club belongs to the clubhouse bar', outcome: 'The chairman kisses you on the forehead. The investor buys the rival club straight away.' },
    },
  },
  'elite-droits-tv': {
    speakerName: 'The broadcaster',
    text: 'The national broadcaster wants to move your next game to Monday 9 p.m. for TV. Bonus: {€3000}. The supporters, meanwhile, have work on Tuesday.',
    choices: {
      accept: { label: 'Accept Monday night', outcome: 'Great ratings, half-empty stands. The ultras sent a recorded-delivery letter, in red ink.' },
      compensate: { label: 'Accept and pay for the supporters\' travel', outcome: 'The supporters arrive by coach, already merry. The chairman finds the bill steep but the atmosphere brilliant.' },
      refuse: { label: 'Refuse: football is for Sundays', outcome: 'The broadcaster files you under "difficult coaches". The chairman shakes your hand for a very long time.' },
    },
  },
};

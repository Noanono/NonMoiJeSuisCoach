import type { Dialogue } from './dialogues';

/**
 * Dialogues propres à une division (CLUB-06) : on ne parle pas des mêmes choses au district et en
 * Première Division. Les montants sont écrits à l'échelle du district, `{€N}` dans les textes, et
 * grossissent avec la division comme le reste des finances.
 * Divisions : 1 = Première Division Pastaga … 4 = District des Bourbiers.
 */
export const LEAGUE_DIALOGUES: readonly Dialogue[] = [
  // --- District des Bourbiers -------------------------------------------------
  {
    id: 'district-tracteur',
    speaker: 'groundsman',
    speakerName: 'Le jardinier',
    trigger: 'anytime',
    tiers: [4],
    text: "Le voisin agriculteur veut traverser le terrain avec son tracteur pendant les entraînements : « C'est le chemin le plus court pour mes vaches. » Il propose {€300} de droit de passage.",
    choices: [
      {
        id: 'accept',
        label: 'Encaisser et laisser passer',
        outcome: "Les vaches ont adoré la pelouse. Les sponsors beaucoup moins : leurs panneaux sont couverts de bouse.",
        consequences: [{ kind: 'budget', value: 300 }, { kind: 'sponsorMood', value: -2 }],
      },
      {
        id: 'sponsor',
        label: 'Exiger son logo sur les maillots en échange',
        outcome: "« Ferme Bidochon, du pré à l'assiette » trône désormais sur ton short. Les sponsors trouvent ça authentique.",
        consequences: [{ kind: 'budget', value: 150 }, { kind: 'sponsorMood', value: 3 }],
      },
      {
        id: 'refuse',
        label: 'Refuser : on est un club sérieux',
        outcome: 'Le président approuve. Le voisin, lui, laisse désormais son tracteur garé sur le parking du club.',
        consequences: [{ kind: 'presidentConfidence', value: 2 }],
      },
    ],
  },
  {
    id: 'district-loto',
    speaker: 'barman',
    speakerName: 'Josiane, la barmaid',
    trigger: 'anytime',
    tiers: [4, 3],
    text: "Josiane veut organiser le loto du club samedi soir. Premier lot : un jambon. Elle a besoin de toi pour tirer les numéros, et de {€100} pour le jambon.",
    choices: [
      {
        id: 'host',
        label: 'Animer le loto toi-même',
        outcome: "Tu as tiré le 22 quatorze fois, personne ne sait comment. La caisse déborde, les anciens t'adorent.",
        consequences: [{ kind: 'budget', value: 600 }, { kind: 'presidentConfidence', value: 2 }],
      },
      {
        id: 'players',
        label: 'Envoyer les joueurs servir à la buvette',
        outcome: 'Belle recette, mais le président les a vus finir les fonds de bouteille à 3 h. Il n’a pas aimé.',
        consequences: [{ kind: 'budget', value: 400 }, { kind: 'presidentConfidence', value: -2 }],
      },
      {
        id: 'skip',
        label: 'Décliner, tu as un match à préparer',
        outcome: 'Josiane fait le loto sans toi. Le jambon a été gagné par le président, ce qui ne surprend personne.',
        consequences: [{ kind: 'sponsorMood', value: -1 }],
      },
    ],
  },
  // --- Promotion de la Troisième Mi-Temps ---------------------------------------
  {
    id: 'promo-minibus',
    speaker: 'president',
    speakerName: 'Le président',
    trigger: 'anytime',
    tiers: [3],
    text: "Le président a repéré un minibus d'occasion sur le Bon Coin : {€1500}, « à peine 400 000 km, et la clim marche en hiver ». Finis les covoiturages pour les déplacements, dit-il.",
    choices: [
      {
        id: 'buy',
        label: 'Acheter le minibus',
        outcome: "Le minibus démarre une fois sur deux, mais les joueurs arrivent ensemble et reposés. Le président le conduit lui-même, à 60 km/h.",
        consequences: [{ kind: 'budget', value: -1500 }, { kind: 'fatigue', value: -10 }, { kind: 'presidentConfidence', value: 3 }],
      },
      {
        id: 'sponsor-paint',
        label: 'Le faire payer par un sponsor en échange de la carrosserie',
        outcome: 'Le minibus est peint aux couleurs d’un garage du coin. Il sent l’huile de vidange, mais il est gratuit.',
        consequences: [{ kind: 'budget', value: -300 }, { kind: 'sponsorMood', value: 4 }],
      },
      {
        id: 'refuse',
        label: 'Garder les covoiturages',
        outcome: 'Le président range l’annonce, déçu. Trois joueurs arrivent encore en retard dimanche.',
        consequences: [{ kind: 'presidentConfidence', value: -2 }],
      },
    ],
  },
  {
    id: 'promo-radio',
    speaker: 'journalist',
    speakerName: 'Radio Comptoir FM',
    trigger: 'anytime',
    tiers: [3, 2],
    text: "Radio Comptoir FM (12 auditeurs, dont 9 au club) veut te recevoir en direct. Ils proposent {€400} si tu fais aussi la pub de la boucherie Lardon en fin d'émission.",
    choices: [
      {
        id: 'ad',
        label: 'Faire l’émission et la pub',
        outcome: "Ta phrase « Chez Lardon, le saucisson c’est du béton » tourne en boucle. Les sponsors adorent, le président grince.",
        consequences: [{ kind: 'budget', value: 400 }, { kind: 'sponsorMood', value: 3 }, { kind: 'presidentConfidence', value: -1 }],
      },
      {
        id: 'tactics',
        label: 'Parler tactique pendant une heure',
        outcome: "Les 12 auditeurs ont décroché à la 4e minute. Le président, lui, a enregistré l'émission.",
        consequences: [{ kind: 'presidentConfidence', value: 3 }],
      },
      {
        id: 'decline',
        label: 'Décliner poliment',
        outcome: "Ils invitent le coach du rival à la place. Il a dit du mal de toi pendant 40 minutes.",
        consequences: [{ kind: 'sponsorMood', value: -2 }],
      },
    ],
  },
  // --- Division d'Honneur de la Buvette ----------------------------------------
  {
    id: 'dh-concession',
    speaker: 'sponsor',
    speakerName: 'Le concessionnaire',
    trigger: 'anytime',
    tiers: [2],
    text: "Le concessionnaire auto de la zone commerciale veut rebaptiser le stade « Arena Diesel Moins Cher » pour {€2500} par saison. Le président a déjà les larmes aux yeux.",
    choices: [
      {
        id: 'accept',
        label: 'Signer le naming',
        outcome: "Le panneau est installé. Les supporters chantent toujours l'ancien nom, par principe.",
        consequences: [{ kind: 'budget', value: 2500 }, { kind: 'sponsorMood', value: 4 }, { kind: 'presidentConfidence', value: -3 }],
      },
      {
        id: 'negotiate',
        label: 'Négocier des voitures pour le staff à la place',
        outcome: "Le kiné roule désormais en break de démonstration. Il ne rend plus jamais le terrain à l'heure.",
        consequences: [{ kind: 'budget', value: 1200 }, { kind: 'sponsorMood', value: 2 }],
      },
      {
        id: 'refuse',
        label: 'Refuser : le stade garde son âme',
        outcome: 'Les anciens t’offrent un verre à la buvette. Le concessionnaire, vexé, sponsorise le rival.',
        consequences: [{ kind: 'presidentConfidence', value: 4 }, { kind: 'sponsorMood', value: -3 }],
      },
    ],
  },
  {
    id: 'dh-tele-locale',
    speaker: 'journalist',
    speakerName: 'La télé régionale',
    trigger: 'anytime',
    tiers: [2, 1],
    text: "La télé régionale veut filmer le vestiaire avant le prochain match pour une émission « immersion ». Cachet : {€800}. Le capitaine rappelle que le vestiaire « n'est pas présentable, et lui non plus ».",
    choices: [
      {
        id: 'film',
        label: 'Ouvrir les portes du vestiaire',
        outcome: "Le reportage cartonne : on y voit le président se tromper de maillot. Les sponsors en redemandent.",
        consequences: [{ kind: 'budget', value: 800 }, { kind: 'sponsorMood', value: 5 }, { kind: 'presidentConfidence', value: -2 }],
      },
      {
        id: 'training',
        label: 'Seulement l’entraînement, pas le vestiaire',
        outcome: 'Images propres, cachet réduit. Le journaliste repart frustré mais bronzé.',
        consequences: [{ kind: 'budget', value: 400 }, { kind: 'sponsorMood', value: 2 }],
      },
      {
        id: 'refuse',
        label: 'Le vestiaire reste sacré',
        outcome: "Les joueurs t'applaudissent. La télé filme le club voisin à la place.",
        consequences: [{ kind: 'presidentConfidence', value: 2 }, { kind: 'fatigue', value: -3 }],
      },
    ],
  },
  // --- Première Division Pastaga -----------------------------------------------
  {
    id: 'elite-investisseur',
    speaker: 'president',
    speakerName: 'Le président',
    trigger: 'anytime',
    tiers: [1],
    text: "Un investisseur en costume trop brillant veut entrer au capital : {€4000} tout de suite, contre « quelques conseils » sur la composition d'équipe. Le président hésite entre l'argent et sa fierté.",
    choices: [
      {
        id: 'accept',
        label: 'Accepter l’argent',
        outcome: "Les caisses débordent. L'investisseur t'envoie déjà des schémas tactiques dessinés sur des serviettes en papier.",
        consequences: [{ kind: 'budget', value: 4000 }, { kind: 'presidentConfidence', value: -6 }, { kind: 'sponsorMood', value: 3 }],
      },
      {
        id: 'limits',
        label: 'Accepter, mais pas de conseils',
        outcome: 'Il réduit son chèque de moitié et part bouder dans sa loge en verre.',
        consequences: [{ kind: 'budget', value: 2000 }, { kind: 'presidentConfidence', value: -1 }],
      },
      {
        id: 'refuse',
        label: 'Refuser : le club appartient à la buvette',
        outcome: 'Le président t’embrasse sur le front. L’investisseur rachète le club rival dans la foulée.',
        consequences: [{ kind: 'presidentConfidence', value: 6 }, { kind: 'sponsorMood', value: -2 }],
      },
    ],
  },
  {
    id: 'elite-droits-tv',
    speaker: 'sponsor',
    speakerName: 'Le diffuseur',
    trigger: 'anytime',
    tiers: [1],
    text: "Le diffuseur national veut décaler ton prochain match au lundi 21 h pour la télé. Prime : {€3000}. Les supporters, eux, travaillent le mardi.",
    choices: [
      {
        id: 'accept',
        label: 'Accepter le lundi soir',
        outcome: 'Belle audience, tribunes à moitié vides. Les ultras ont envoyé une lettre recommandée, en rouge.',
        consequences: [{ kind: 'budget', value: 3000 }, { kind: 'sponsorMood', value: 4 }, { kind: 'presidentConfidence', value: -3 }],
      },
      {
        id: 'compensate',
        label: 'Accepter et offrir le déplacement aux supporters',
        outcome: 'Les supporters arrivent en car, déjà joyeux. Le président trouve la note salée mais l’ambiance géniale.',
        consequences: [{ kind: 'budget', value: 1800 }, { kind: 'sponsorMood', value: 3 }, { kind: 'presidentConfidence', value: 1 }],
      },
      {
        id: 'refuse',
        label: 'Refuser : le foot, c’est le dimanche',
        outcome: 'Le diffuseur te classe parmi les « coachs difficiles ». Le président te serre la main longtemps.',
        consequences: [{ kind: 'presidentConfidence', value: 4 }, { kind: 'sponsorMood', value: -4 }],
      },
    ],
  },
];

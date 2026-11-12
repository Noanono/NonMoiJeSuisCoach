import type { Rng } from '../core/rng';
import { moneyFactorBetween } from './finance';
import { LEAGUE_DIALOGUES } from './leagueDialogues';
import { applyConsequences, type Consequence, type ConsequenceResult, type ConsequenceTarget } from './model';

/**
 * Dialogues de la semaine (CLUB-06) : un personnage interpelle le coach, chaque réponse
 * a des conséquences chiffrées. L'info utile vient d'abord, la blague ensuite.
 */

export type DialogueSpeaker =
  | 'president'
  | 'presidentWife'
  | 'player'
  | 'captain'
  | 'journalist'
  | 'supporters'
  | 'barman'
  | 'sponsor'
  | 'groundsman'
  | 'mayor'
  | 'physio';

/** Situation qui rend un dialogue possible. `anytime` = toujours possible. */
export type DialogueTrigger =
  | 'anytime'
  | 'losingStreak'
  | 'winningStreak'
  | 'lowBudget'
  | 'lowConfidence'
  /** Le prochain match est le derby contre le rival de la saison (UNIV-09). */
  | 'derby';

export interface DialogueChoice {
  id: string;
  label: string;
  /** Ce qui se passe ensuite, affiché après le choix. */
  outcome: string;
  consequences: Consequence[];
}

export interface Dialogue {
  id: string;
  speaker: DialogueSpeaker;
  speakerName: string;
  trigger: DialogueTrigger;
  /** Divisions où le dialogue peut tomber (1 = élite) ; partout si absent. */
  tiers?: readonly number[];
  /** `{€N}` : montant à l'échelle du district, ajusté à la division du coach. */
  text: string;
  choices: DialogueChoice[];
}

/** Les montants des dialogues sont écrits pour le district : ils grossissent avec la division (CLUB-06). */
export const DIALOGUE_BASE_TIER = 4;
const MONEY_MARKER = /\{€(\d+)\}/g;

/** Montant d'un dialogue dans la division du coach, arrondi pour rester lisible. */
export function dialogueAmount(amount: number, divisionTier: number): number {
  const scaled = amount * moneyFactorBetween(DIALOGUE_BASE_TIER, divisionTier);
  const step = Math.abs(scaled) >= 10_000 ? 500 : Math.abs(scaled) >= 1_000 ? 100 : 50;
  return Math.round(scaled / step) * step;
}

/** Le dialogue tel que le coach le lit dans sa division : montants des textes et du budget ajustés. */
export function localizeDialogue(dialogue: Dialogue, divisionTier: number): Dialogue {
  return {
    ...dialogue,
    text: dialogue.text.replace(MONEY_MARKER, (_, amount: string) => `${dialogueAmount(Number(amount), divisionTier).toLocaleString('fr-FR')} €`),
    choices: dialogue.choices.map((choice) => ({
      ...choice,
      consequences: choice.consequences.map((consequence) =>
        consequence.kind === 'budget' ? { ...consequence, value: dialogueAmount(consequence.value, divisionTier) } : consequence,
      ),
    })),
  };
}

export const LOSING_STREAK_TRIGGER = 3;
export const WINNING_STREAK_TRIGGER = 3;
export const LOW_BUDGET_TRIGGER = 1_000;
export const LOW_CONFIDENCE_TRIGGER = 30;

const BASE_DIALOGUES: readonly Dialogue[] = [
  {
    id: 'president-statue',
    speaker: 'president',
    speakerName: 'Le président',
    trigger: 'winningStreak',
    text: "Trois victoires de suite, le président est aux anges. Il veut ériger ta statue devant la buvette : en résine, « grandeur nature, mais avec plus de cheveux ».",
    choices: [
      {
        id: 'accept',
        label: 'Accepter la statue',
        outcome: 'La statue ressemble surtout au président. Il est ravi, le budget beaucoup moins.',
        consequences: [{ kind: 'presidentConfidence', value: 5 }, { kind: 'budget', value: -800 }],
      },
      {
        id: 'team-bonus',
        label: "Proposer plutôt une prime pour l'équipe",
        outcome: 'Les joueurs trinquent à ta santé. Le président boude un peu son socle vide.',
        consequences: [{ kind: 'sponsorMood', value: 3 }, { kind: 'budget', value: -500 }, { kind: 'presidentConfidence', value: -2 }],
      },
      {
        id: 'humble',
        label: 'Rester humble',
        outcome: 'Le vestiaire apprécie. Le président te trouve « bizarrement modeste ».',
        consequences: [{ kind: 'sponsorMood', value: 1 }],
      },
    ],
  },
  {
    id: 'president-losing-streak',
    speaker: 'president',
    speakerName: 'Le président',
    trigger: 'losingStreak',
    text: "Trois défaites d'affilée : le président te convoque dans son bureau, qui est aussi la réserve à fûts. « Coach, ma femme demande si tu sais que le but, c'est de mettre le ballon dans l'AUTRE cage. »",
    choices: [
      {
        id: 'promise',
        label: 'Promettre une victoire dimanche',
        outcome: 'Il note ta promesse au feutre sur un fût. Gare à toi si le fût se vide avant.',
        consequences: [{ kind: 'presidentConfidence', value: 5 }],
      },
      {
        id: 'blame-referee',
        label: "Accuser l'arbitre",
        outcome: "Le président adore accuser l'arbitre. Les joueurs aussi.",
        consequences: [{ kind: 'presidentConfidence', value: 2 }, { kind: 'sponsorMood', value: 2 }],
      },
      {
        id: 'blame-players',
        label: 'Accuser les joueurs',
        outcome: 'Le président approuve. Le vestiaire, qui écoutait derrière la porte, beaucoup moins.',
        consequences: [{ kind: 'presidentConfidence', value: 1 }],
      },
    ],
  },
  {
    id: 'president-low-confidence',
    speaker: 'president',
    speakerName: 'Le président',
    trigger: 'lowConfidence',
    text: "Ta place est en danger : la confiance du président fond plus vite qu'un glaçon dans un pastis. Il a déjà le numéro de son neveu, « qui a fait un stage d'entraîneur sur YouTube ».",
    choices: [
      {
        id: 'promise-result',
        label: 'Promettre un résultat',
        outcome: 'Il te laisse une chance. La pression, elle, descend tout droit dans le vestiaire.',
        consequences: [{ kind: 'presidentConfidence', value: 4 }],
      },
      {
        id: 'invite-training',
        label: "L'inviter à l'entraînement",
        outcome: 'Il fait trois tours de terrain en mocassins et repart convaincu. Les joueurs, eux, ont dû courir avec lui.',
        consequences: [{ kind: 'presidentConfidence', value: 3 }],
      },
      {
        id: 'remind-contract',
        label: 'Lui rappeler ton contrat',
        outcome: "Il n'y a pas de contrat. C'était une poignée de main au PMU, et il s'en souvient mal.",
        consequences: [{ kind: 'presidentConfidence', value: -5 }],
      },
    ],
  },
  {
    id: 'president-nephew',
    speaker: 'president',
    speakerName: 'Le président',
    trigger: 'anytime',
    text: "Le président veut que tu fasses jouer son neveu Dylan, 17 ans : « Un talent, il a 4 000 abonnés sur TikTok. » Il est surtout fort pour les célébrations.",
    choices: [
      {
        id: 'promise-minutes',
        label: 'Promettre une entrée en jeu',
        outcome: 'Le président jubile. Le vestiaire, lui, a vu Dylan jongler : deux fois, avec les mains.',
        consequences: [{ kind: 'presidentConfidence', value: 3 }],
      },
      {
        id: 'trial',
        label: 'Lui proposer un essai',
        outcome: "Dylan filme tout l'essai en vertical. Le président trouve ça « très professionnel ».",
        consequences: [{ kind: 'presidentConfidence', value: 2 }],
      },
      {
        id: 'refuse',
        label: 'Refuser net',
        outcome: 'Le président fait la tête. Les joueurs, eux, te paient une bière.',
        consequences: [{ kind: 'presidentConfidence', value: -6 }, { kind: 'sponsorMood', value: 2 }],
      },
    ],
  },
  {
    id: 'president-wife-dinner',
    speaker: 'presidentWife',
    speakerName: 'La femme du président',
    trigger: 'anytime',
    text: "La femme du président organise le repas des bénévoles samedi soir, veille de match. Elle insiste, avec un clin d'œil appuyé, pour que tu viennes « seul, et en chemise ouverte ».",
    choices: [
      {
        id: 'whole-team',
        label: "Y aller avec toute l'équipe",
        outcome: 'Repas réussi, chemise boutonnée jusqu’au col. Les joueurs ont un peu trop goûté au digestif.',
        consequences: [{ kind: 'sponsorMood', value: 2 }, { kind: 'presidentConfidence', value: 2 }],
      },
      {
        id: 'alone',
        label: 'Y aller seul',
        outcome: 'Elle convainc son mari de débloquer une rallonge. Lui se demande pourquoi tu souris autant.',
        consequences: [{ kind: 'budget', value: 1_000 }, { kind: 'presidentConfidence', value: -8 }],
      },
      {
        id: 'decline',
        label: 'Décliner poliment',
        outcome: 'Elle tient aussi la boulangerie qui sponsorise le maillot. Les croissants seront moins frais.',
        consequences: [{ kind: 'sponsorMood', value: -2 }],
      },
    ],
  },
  {
    id: 'journalist-interview',
    speaker: 'journalist',
    speakerName: "Kevin, de L'Écho de la Buvette",
    trigger: 'anytime',
    text: 'Kevin veut une interview pour la page sport, coincée entre la nécrologie et les résultats de pétanque. Il te demande ton secret tactique.',
    choices: [
      {
        id: 'tactics',
        label: 'Expliquer le 4-4-2 pendant vingt minutes',
        outcome: "Kevin s'est endormi au bout de trois. Les sponsors trouvent ça sérieux.",
        consequences: [{ kind: 'sponsorMood', value: 2 }],
      },
      {
        id: 'trash-talk',
        label: 'Chambrer le prochain adversaire',
        outcome: 'Le vestiaire affiche l’article au mur. Le président craint un match retour sur le parking.',
        consequences: [{ kind: 'sponsorMood', value: 2 }, { kind: 'presidentConfidence', value: -2 }],
      },
      {
        id: 'pastis',
        label: 'Dire que le secret, c’est le pastis',
        outcome: 'Le distributeur de boissons du coin te propose un partenariat. Le président s’étrangle.',
        consequences: [{ kind: 'sponsorMood', value: 4 }, { kind: 'presidentConfidence', value: -3 }],
      },
    ],
  },
  {
    id: 'supporters-tifo',
    speaker: 'supporters',
    speakerName: 'Les Ultras de la Buvette',
    trigger: 'winningStreak',
    text: 'Les Ultras de la Buvette (six personnes et un chien) veulent un tifo pour le prochain match à domicile. Ils demandent {€300} de peinture et ton accord pour la banderole « On boit, on gagne ».',
    choices: [
      {
        id: 'fund',
        label: 'Financer le tifo',
        outcome: 'Le tifo est magnifique, sauf le « g » de « gagne », retourné. Les joueurs sont galvanisés.',
        consequences: [{ kind: 'budget', value: -300 }, { kind: 'sponsorMood', value: 5 }],
      },
      {
        id: 'refuse',
        label: 'Refuser',
        outcome: 'Ils peignent la banderole sur ta voiture. Gratuitement, au moins.',
        consequences: [{ kind: 'presidentConfidence', value: -1 }],
      },
    ],
  },
  {
    id: 'supporters-parking',
    speaker: 'supporters',
    speakerName: 'Une délégation de supporters',
    trigger: 'losingStreak',
    text: "Après la série de défaites, des supporters t'attendent sur le parking, saucisse à la main. Le porte-parole a bu, mais il a des arguments.",
    choices: [
      {
        id: 'drink',
        label: 'Aller boire un coup avec eux',
        outcome: "Tu paies la tournée, ils repartent en chantant ton nom. Faux, mais avec cœur.",
        consequences: [{ kind: 'budget', value: -100 }, { kind: 'sponsorMood', value: 2 }],
      },
      {
        id: 'promise',
        label: 'Promettre du spectacle',
        outcome: 'Le président apprécie le discours. Les joueurs sentent la pression monter.',
        consequences: [{ kind: 'presidentConfidence', value: 2 }],
      },
      {
        id: 'escape',
        label: 'Filer par la sortie des arbitres',
        outcome: "Tu croises l'arbitre de dimanche. Il ne t'aime pas non plus.",
        consequences: [{ kind: 'presidentConfidence', value: -4 }],
      },
    ],
  },
  {
    id: 'supporters-mamie',
    speaker: 'supporters',
    speakerName: 'Mémé Ginette',
    trigger: 'anytime',
    text: "Mémé Ginette, doyenne des supporters, tricote les écharpes du club. Elle invite l'équipe au goûter de la maison de retraite, avec son fameux cake au rhum « sans rhum, promis ».",
    choices: [
      {
        id: 'team',
        label: "Y aller avec l'équipe",
        outcome: 'Le cake contenait surtout du rhum. Excellente ambiance, réveil difficile.',
        consequences: [{ kind: 'sponsorMood', value: 5 }],
      },
      {
        id: 'captain-only',
        label: 'Envoyer seulement le capitaine',
        outcome: 'Il revient avec trois écharpes et un numéro de téléphone.',
        consequences: [{ kind: 'sponsorMood', value: 1 }],
      },
      {
        id: 'decline',
        label: 'Décliner',
        outcome: 'Mémé Ginette est la mère du président. Il l’a très mal pris.',
        consequences: [{ kind: 'presidentConfidence', value: -3 }],
      },
    ],
  },
  {
    id: 'captain-toilets',
    speaker: 'captain',
    speakerName: 'Le capitaine',
    trigger: 'anytime',
    text: "Les toilettes du vestiaire sont bouchées depuis trois semaines, ce qui plombe l'ambiance. Personne n'avoue, mais tout le monde soupçonne le stoppeur et sa fondue savoyarde.",
    choices: [
      {
        id: 'plumber',
        label: 'Payer le plombier',
        outcome: 'Le plombier ressort livide et réclame une prime de risque. Le vestiaire respire enfin.',
        consequences: [{ kind: 'budget', value: -250 }, { kind: 'sponsorMood', value: 2 }],
      },
      {
        id: 'investigate',
        label: 'Mener l’enquête',
        outcome: "Le coupable est démasqué : c'était le président, après le loto. Fous rires dans le vestiaire.",
        consequences: [{ kind: 'sponsorMood', value: 2 }, { kind: 'presidentConfidence', value: -2 }],
      },
      {
        id: 'open-windows',
        label: 'Ouvrir les fenêtres et prier',
        outcome: 'Les joueurs se changent sur le parking. Ambiance glaciale, au sens propre.',
        consequences: [{ kind: 'presidentConfidence', value: -2 }],
      },
    ],
  },
  {
    id: 'barman-tab',
    speaker: 'barman',
    speakerName: 'Josiane, de la buvette',
    trigger: 'lowBudget',
    text: "Les caisses sont presque vides, et Josiane rappelle que l'ardoise des joueurs à la buvette atteint {€1200}. Elle accepte les espèces, les chèques et « les services rendus ».",
    choices: [
      {
        id: 'pay',
        label: "Éponger l'ardoise",
        outcome: 'Josiane offre une tournée pour fêter ça. Tu viens de recréer l’ardoise.',
        consequences: [{ kind: 'budget', value: -1_200 }, { kind: 'sponsorMood', value: 3 }],
      },
      {
        id: 'docked-wages',
        label: 'Prélever sur les salaires',
        outcome: 'Les joueurs remboursent. Ils te détestent un peu, mais avec les comptes à jour.',
        consequences: [{ kind: 'presidentConfidence', value: -3 }],
      },
      {
        id: 'gala',
        label: 'Organiser un match de gala au profit de la buvette',
        outcome: 'Match contre les pompiers, perdu 4-2. Mais la buvette a fait le plein.',
        consequences: [{ kind: 'budget', value: 400 }],
      },
    ],
  },
  {
    id: 'sponsor-kebab',
    speaker: 'sponsor',
    speakerName: 'Le Kebab du Stade',
    trigger: 'anytime',
    text: 'Le Kebab du Stade propose de sponsoriser le maillot : {€2000} la saison, à condition d’imprimer « Sauce blanche ou rien » dans le dos.',
    choices: [
      {
        id: 'sign',
        label: 'Signer',
        outcome: 'Le maillot sent légèrement l’oignon. Le président rêvait d’un sponsor plus classe.',
        consequences: [{ kind: 'budget', value: 2_000 }, { kind: 'sponsorMood', value: 3 }, { kind: 'presidentConfidence', value: -2 }],
      },
      {
        id: 'free-kebabs',
        label: 'Négocier des kebabs gratuits',
        outcome: 'Les joueurs adorent. Le défenseur central a pris trois kilos en une semaine.',
        consequences: [{ kind: 'sponsorMood', value: 3 }],
      },
      {
        id: 'refuse',
        label: 'Refuser',
        outcome: 'Le kebab sponsorise le club rival. Les sponsors du coin s’inquiètent.',
        consequences: [{ kind: 'sponsorMood', value: -3 }],
      },
    ],
  },
  {
    id: 'groundsman-pitch',
    speaker: 'groundsman',
    speakerName: 'Le jardinier',
    trigger: 'anytime',
    text: "La pelouse ressemble à un champ de patates, ce qui épuise les jambes : il manque {€400} de semences. Sinon, le jardinier propose de « fertiliser à l'ancienne », avec le fumier de son beau-frère.",
    choices: [
      {
        id: 'seeds',
        label: 'Payer les semences',
        outcome: 'Belle pelouse verte. Les joueurs courent enfin sans se tordre les chevilles.',
        consequences: [{ kind: 'budget', value: -400 }, { kind: 'fatigue', value: -5 }],
      },
      {
        id: 'manure',
        label: 'Va pour le fumier',
        outcome: "L'herbe pousse, l'odeur aussi. Le sponsor du maillot refuse de venir au stade.",
        consequences: [{ kind: 'presidentConfidence', value: -2 }, { kind: 'sponsorMood', value: -2 }],
      },
    ],
  },
  {
    id: 'mayor-subsidy',
    speaker: 'mayor',
    speakerName: 'Le maire',
    trigger: 'anytime',
    text: "Le maire, en campagne, offre {€1500} de subvention si l'équipe pose en photo avec lui. Il aimerait aussi que tu dises du mal de son adversaire, le pharmacien.",
    choices: [
      {
        id: 'photo',
        label: 'Faire la photo',
        outcome: 'La photo fait la une du bulletin municipal. Le président est jaloux, mais content.',
        consequences: [{ kind: 'budget', value: 1_500 }, { kind: 'presidentConfidence', value: 2 }],
      },
      {
        id: 'photo-and-attack',
        label: 'Faire la photo et taper sur le pharmacien',
        outcome: 'Subvention doublée… mais le pharmacien sponsorisait les gourdes. Adieu les gourdes.',
        consequences: [{ kind: 'budget', value: 2_500 }, { kind: 'sponsorMood', value: -4 }],
      },
      {
        id: 'neutral',
        label: 'Rester neutre',
        outcome: 'Le président est conseiller municipal de la majorité. Il note.',
        consequences: [{ kind: 'presidentConfidence', value: -2 }],
      },
    ],
  },
  {
    id: 'physio-ice-bath',
    speaker: 'physio',
    speakerName: 'Le kiné bénévole',
    trigger: 'anytime',
    text: 'Le kiné bénévole (ancien vétérinaire) a une méthode de récupération express : bain de glace, puis bain de pastis. Coût : {€200} de glaçons.',
    choices: [
      {
        id: 'full-method',
        label: 'Tester la méthode complète',
        outcome: 'Les jambes sont neuves. Les joueurs sentent l’anis jusqu’au dimanche.',
        consequences: [{ kind: 'budget', value: -200 }, { kind: 'fatigue', value: -15 }],
      },
      {
        id: 'ice-only',
        label: 'Se contenter de la glace',
        outcome: 'Récupération correcte, cris aigus garantis.',
        consequences: [{ kind: 'budget', value: -50 }, { kind: 'fatigue', value: -5 }],
      },
    ],
  },
  {
    id: 'president-derby',
    speaker: 'president',
    speakerName: 'Le président',
    trigger: 'derby',
    text: "Semaine de derby. Le président a ressorti son écharpe de 1987 et ne parle plus que de ça. « Coach, eux, je veux les voir pleurer. Leur président m'a piqué ma place de parking à la messe. »",
    choices: [
      {
        id: 'promise',
        label: 'Promettre de les écraser',
        outcome: "Le président est ravi. Il a déjà commandé les fumigènes. Maintenant, il faut gagner.",
        consequences: [{ kind: 'presidentConfidence', value: 4 }, { kind: 'sponsorMood', value: 2 }],
      },
      {
        id: 'calm',
        label: "Rappeler que ce n'est qu'un match",
        outcome: "Il te regarde comme si tu avais insulté sa mère. Le reste de la semaine sera glacial.",
        consequences: [{ kind: 'presidentConfidence', value: -3 }],
      },
      {
        id: 'party',
        label: "Organiser une soirée d'avant-derby à la buvette",
        outcome: "Toute la ville est venue. La caisse s'est bien remplie, mais le président a trouvé la soirée « un peu trop festive pour un match aussi sérieux ».",
        consequences: [{ kind: 'budget', value: 400 }, { kind: 'sponsorMood', value: 3 }, { kind: 'presidentConfidence', value: -1 }],
      },
    ],
  },
  {
    id: 'supporters-derby',
    speaker: 'supporters',
    speakerName: 'Les supporters',
    trigger: 'derby',
    text: "Les ultras (quatre personnes et un tambour) débarquent à l'entraînement : ils veulent repeindre les vestiaires du rival en rose la veille du derby. Ils attendent ta bénédiction.",
    choices: [
      {
        id: 'bless',
        label: 'Leur donner ta bénédiction',
        outcome: "Les vestiaires sont roses. Le rival est furieux, la presse locale adore, le président fait semblant de ne rien savoir.",
        consequences: [{ kind: 'sponsorMood', value: 4 }, { kind: 'presidentConfidence', value: -2 }],
      },
      {
        id: 'refuse',
        label: 'Refuser poliment',
        outcome: "Ils repartent déçus mais promettent de chanter deux fois plus fort.",
        consequences: [{ kind: 'presidentConfidence', value: 2 }],
      },
      {
        id: 'tifo',
        label: 'Proposer de financer un tifo à la place',
        outcome: "Le tifo représente ton visage. Il est raté, mais il est énorme.",
        consequences: [{ kind: 'budget', value: -300 }, { kind: 'sponsorMood', value: 3 }],
      },
    ],
  },
];

export const DIALOGUES: readonly Dialogue[] = [...BASE_DIALOGUES, ...LEAGUE_DIALOGUES];

export interface DialogueContext {
  /** Division du coach (1 = élite) : choisit les dialogues et la taille des montants. */
  divisionTier?: number;
  losingStreak: number;
  winningStreak: number;
  budget: number;
  presidentConfidence: number;
  /** Le match de la semaine prochaine est un derby. */
  upcomingDerby?: boolean;
  /** Dialogues récents, à ne pas resservir tout de suite. */
  recentDialogueIds: readonly string[];
}

function activeTriggers(context: DialogueContext): Set<DialogueTrigger> {
  const triggers = new Set<DialogueTrigger>(['anytime']);
  if (context.losingStreak >= LOSING_STREAK_TRIGGER) triggers.add('losingStreak');
  if (context.winningStreak >= WINNING_STREAK_TRIGGER) triggers.add('winningStreak');
  if (context.budget < dialogueAmount(LOW_BUDGET_TRIGGER, context.divisionTier ?? DIALOGUE_BASE_TIER)) triggers.add('lowBudget');
  if (context.presidentConfidence <= LOW_CONFIDENCE_TRIGGER) triggers.add('lowConfidence');
  if (context.upcomingDerby) triggers.add('derby');
  return triggers;
}

/**
 * Dialogue de la semaine (CLUB-06) : on privilégie ceux qui collent à l'actualité
 * (série de défaites, budget à sec…), sinon un dialogue du quotidien jamais vu récemment.
 */
export function pickWeeklyDialogue(context: DialogueContext, rng: Rng): Dialogue {
  const triggers = activeTriggers(context);
  const recent = new Set(context.recentDialogueIds);
  const tier = context.divisionTier ?? DIALOGUE_BASE_TIER;
  const possible = DIALOGUES.filter((dialogue) => triggers.has(dialogue.trigger) && (!dialogue.tiers || dialogue.tiers.includes(tier)));
  const fresh = possible.filter((dialogue) => !recent.has(dialogue.id));
  const pool = fresh.length > 0 ? fresh : possible;
  const topical = pool.filter((dialogue) => dialogue.trigger !== 'anytime');
  return rng.pick(topical.length > 0 ? topical : pool);
}

/** Applique la réponse choisie (CLUB-06) : nouvelles jauges, effectif mis à jour et texte de la suite. */
export function applyDialogueChoice(
  target: ConsequenceTarget,
  dialogue: Dialogue,
  choiceId: string,
): ConsequenceResult & { outcome: string } {
  const choice = dialogue.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) throw new Error(`Réponse inconnue « ${choiceId} » pour le dialogue ${dialogue.id}`);
  return { ...applyConsequences(target, choice.consequences), outcome: choice.outcome };
}

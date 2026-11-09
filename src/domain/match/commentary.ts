/**
 * Live texte humoristique (MATCH-04) : ton buvette du dimanche, on tutoie le coach,
 * l'info utile d'abord, la blague ensuite. On se moque des situations, jamais des gens.
 * Plusieurs variantes par événement, tirées par le Rng du match.
 */
import type { Rng } from '../core/rng';

const LINES = {
  kickoff: [
    "Coup d'envoi entre {team} et {opponent}. La buvette est ouverte, les crampons sont lacés, c'est parti.",
    "C'est parti entre {team} et {opponent} ! L'arbitre a sifflé, le chien du voisin a aboyé.",
    "Coup d'envoi ! {team} reçoit {opponent} devant trois générations de supporters et un barbecue.",
  ],
  secondHalf: [
    'Reprise de la seconde période. Les jambes sont lourdes, les merguez aussi.',
    "C'est reparti pour 45 minutes. Certains ont fini leur demi, d'autres l'ont emporté sur le banc.",
    "Seconde mi-temps lancée. Ton discours a l'air d'avoir porté, ou alors c'est la bière.",
  ],
  halftime: [
    "Mi-temps : {score}. Direction le vestiaire, qui fuit toujours autant.",
    'Pause à {score}. La file à la buvette est plus longue que celle des toilettes, pour une fois.',
    "C'est la mi-temps, {score}. Profite du quart d'heure pour revoir tes consignes.",
  ],
  fullTime: [
    'Coup de sifflet final : {score}. Rendez-vous à la buvette pour refaire le match.',
    "C'est terminé, {score}. Les commentaires d'après-match vont durer plus longtemps que le match.",
    "Fin du match sur le score de {score}. La troisième mi-temps peut commencer.",
  ],
  stoppage: [
    "{n} minute(s) de temps additionnel. L'arbitre a une montre, mais il ne sait pas la lire.",
    'Le panneau annonce {n} minute(s) de rab. Le bénévole qui le tient a la main qui tremble.',
  ],
  ambiance: [
    "{team} fait tourner au milieu. Dans la tribune, un papy explique le hors-jeu à son chien.",
    "Ballon dans les pieds de {team}. Ça manque de rythme, la buvette, elle, ne désemplit pas.",
    'Faute de touche au milieu, rien de grave. Quelqu\'un crie « Allez les petits ! » à des types de 35 ans.',
    "Temps faible pour {opponent}, {team} pousse. L'odeur de merguez remonte jusqu'au rond central.",
    'Long ballon de {team} qui finit dans le champ voisin. Le fermier rend le ballon, cette fois.',
    "{team} conserve. Le speaker en profite pour annoncer le loto de samedi prochain.",
    "Duel musclé au milieu, l'arbitre laisse jouer. Le pressing des supporters, lui, est intense.",
    "Phase de possession pour {team}. Sur le banc, quelqu'un a sorti les cartes pour une belote.",
  ],
  goal: [
    'BUT de {player} pour {team} ! {score}. La buvette offre une tournée imaginaire.',
    'BUT ! {player} trompe le gardien, {score}. Même la mascotte a renversé sa bière.',
    "Et c'est au fond ! {player} marque pour {team}, {score}. Les klaxons du parking s'en mêlent.",
    'BUUUT de {player} ! {score}. Le speaker en perd son dentier.',
  ],
  penaltyGoal: [
    'Penalty transformé par {player} ! {score}. Le gardien est parti boire un café du mauvais côté.',
    "{player} ne tremble pas sur le penalty, {score}. Sang-froid de comptable.",
  ],
  ownGoal: [
    'But contre son camp de {player} ! {score} pour {team}. Il voulait dégager, il a dégagé… dans ses filets.',
    "CSC de {player}, {score}. Le ballon a choisi son camp, et ce n'est pas le sien.",
  ],
  goalCancelled: [
    "But de {team} annulé ! Le score revient à {score}. Personne ne sait vraiment pourquoi, et c'est très bien.",
    'Le but de {team} ne compte plus, {score}. Le panneau d\'affichage, lui, a déjà fondu un fusible.',
  ],
  save: [
    'Arrêt du gardien de {opponent} devant {player}. Des mains comme des battoirs à linge.',
    '{player} frappe, le gardien de {opponent} capte. Il a des gants, et il sait s\'en servir.',
    "Parade décisive sur la frappe de {player}. Le gardien adverse a mangé du lion, ou du cassoulet.",
  ],
  miss: [
    '{player} tente sa chance… à côté. Le ballon file vers le parking, attention aux rétros.',
    "Frappe de {player}, au-dessus. Il visait la lucarne, il a trouvé la buvette.",
    "Occasion pour {team}, mais {player} manque le cadre. Il en parlera encore dimanche prochain.",
    '{player} se présente seul et vise les nuages. Il pleuvra demain, ou pas.',
  ],
  actionCancelled: [
    "L'action de {team} est annulée net ! {label} est passé par là.",
    'Occasion de {team} tuée dans l\'œuf : {label}. Le ballon n\'a rien compris.',
  ],
  foul: [
    'Faute de {player} ({team}). Coup de sifflet, et un mollet qui s\'en souviendra.',
    "Faute de {player}. L'arbitre siffle, la tribune proteste par principe.",
  ],
  foulIgnored: [
    "Faute de {player}, mais l'arbitre regarde ailleurs. Le clin d'œil a payé.",
    "{player} accroche son adversaire, pas de coup de sifflet. L'arbitre est de bonne humeur aujourd'hui.",
  ],
  yellowCard: [
    'Carton jaune pour {player} ({team}). Il proteste, mais avec le sourire.',
    "Jaune pour {player}. L'arbitre a sorti le carton, ses lunettes sont restées dans la poche.",
    '{player} est averti. Un jaune de plus pour la collection du vestiaire.',
  ],
  secondYellow: [
    "Second jaune pour {player}, donc rouge ! {team} à dix. Il file à la douche, l'eau chaude n'est pas garantie.",
    "Deuxième avertissement pour {player} : expulsé ! Il ira encourager les copains depuis la buvette.",
  ],
  redCard: [
    "Carton ROUGE pour {player} ! {team} à dix. Il quitte le terrain sous les sifflets et les chips.",
    'Rouge direct pour {player} ! Il part en serrant des mains en tribune comme un élu local.',
  ],
  freeKick: [
    'Coup franc dangereux pour {team}. Le mur se met en place, les mains là où il faut.',
    "Coup franc bien placé pour {team}. Dans le mur, tout le monde prie, certains pour de vrai.",
  ],
  corner: [
    'Corner pour {team}. Tout le monde monte, sauf le gardien qui refait ses lacets.',
    "Corner pour {team}. Ça pousse, ça tire les maillots, c'est le foot qu'on aime.",
  ],
  penalty: [
    'PENALTY pour {team} ! La tribune retient son souffle et sa bière.',
    "Penalty pour {team} ! L'arbitre montre le point blanc avec beaucoup de conviction.",
  ],
  penaltyMissed: [
    "Penalty manqué par {player} ! Le gardien de {opponent} a deviné, ou il a eu de la chance.",
    "{player} rate son penalty. Le ballon est encore en orbite au-dessus du stade.",
  ],
  setPieceMissed: [
    "Le coup de pied arrêté de {team} ne donne rien. {player} a tenté, le mur a tenu.",
    'Rien sur ce coup de pied arrêté de {team}. Le ballon est revenu en touche, penaud.',
  ],
  injury: [
    "{player} ({team}) se tient la cuisse et ne peut pas continuer : {weeks} semaine(s) d'arrêt. Pas de remplacement, {team} jouera à dix.",
    "Blessure pour {player} : forfait jusqu'à la fin du match et {weeks} semaine(s) à l'infirmerie. Le kiné sort sa trousse et sa pommade au camphre.",
  ],
  activationHuman: [
    '{player} active {ability} ! {label}',
    "Sur ton ordre, {player} sort {ability}. {label}",
    '{ability} pour {player}, à ta demande. {label}',
  ],
  activationAi: [
    "Attention : le coach de {team} déclenche {ability} avec {player} ! {label}",
    "Le banc de {team} s'agite : {player} active {ability}. {label} À toi de riposter.",
    "{team} sort l'arme : {ability} par {player}. {label}",
  ],
  activationFailed: [
    '{ability} de {player} tombe à plat. Il a essayé, personne n\'a rien vu.',
    "{player} tente {ability}… raté. C'était pourtant bien parti dans sa tête.",
  ],
  risk: [
    'Revers pour {team} : {label}.',
    'Ça se retourne contre {team} : {label}.',
    'Le revers tombe pour {player} : {label}.',
  ],
  combo: [
    'COMBO pour {team} : {label} ! Les deux compères se tapent dans la main.',
    "Combo {label} pour {team} ! Le vestiaire en parlera pendant des années.",
  ],
  knockout: [
    '{player} ({team}) est hors jeu pour {minutes} min. Il se relèvera, promis.',
    "{player} est au tapis pour {minutes} min. Il compte les étoiles, il en est à douze.",
  ],
  freeze: [
    'Le match est figé pendant {minutes} min. Tout le monde regarde le ciel en attendant.',
    "Jeu arrêté {minutes} min. L'arbitre en profite pour refaire ses lacets.",
  ],
  eventWindow: [
    "Pause : {label}. Tu as des capacités à dégainer, c'est maintenant ou jamais.",
    "Le match s'arrête un instant : {label}. Tes joueurs te regardent, à toi de jouer.",
  ],
  shootout: [
    "Tirs au but : {team} l'emporte {score}. Les cœurs fragiles sont priés de rentrer chez eux.",
    "{team} gagne la séance de tirs au but, {score}. Le gardien sera porté jusqu'à la buvette.",
  ],
} as const satisfies Record<string, readonly string[]>;

export type CommentaryKey = keyof typeof LINES;

export type CommentaryVars = Partial<
  Record<'player' | 'team' | 'opponent' | 'score' | 'ability' | 'label' | 'minutes' | 'n' | 'weeks', string | number>
>;

const PLACEHOLDER = /\{(\w+)\}/g;

/** Tire une variante pour l'événement et remplit ses champs. */
export function comment(rng: Rng, key: CommentaryKey, vars: CommentaryVars = {}): string {
  return fill(rng.pick(LINES[key]), vars);
}

/** Raisons d'indisponibilité affichées au coach (CAP-07). */
export const UNAVAILABLE = {
  finished: 'Le match est fini, range ta gueulante pour la buvette.',
  noAbility: "Pas de capacité connue chez lui. À part boire des coups, il ne sait rien faire de spécial.",
  sentOff: "Il est déjà sous la douche. Il chante faux, mais il ne peut plus rien pour toi.",
  injured: "Il est à l'infirmerie avec une poche de glace. Laisse-le tranquille.",
  knockedOut: 'Il est encore au sol à compter les étoiles. Attends qu\'il se relève.',
  onBench: "Il chauffe le banc, pas le match : cette capacité se joue sur la pelouse.",
  wrongSide: "Ce n'est pas ton joueur. Tu coaches déjà assez de monde comme ça.",
  busy: "Une autre activation attend sa cible, termine-la d'abord.",
  gauge: 'Jauge de Gueulante à sec : il te manque {n} point(s). Hurle un peu plus fort.',
  cooldown: 'Encore {n} min de recharge : il reprend son souffle et sa dignité.',
  perMatch: "Déjà utilisée ce match. L'arbitre commence à se méfier.",
  perSeason: 'Joker de la saison déjà grillé. Reviens la saison prochaine.',
  perEvent: 'Déjà utilisée sur cet événement. Attends le prochain.',
  trigger: 'Ça se déclenche {label} : attends le bon moment.',
  minMinute: "Pas avant la {n}e minute : il n'est pas encore réveillé.",
  whenLeading: "Seulement quand tu mènes. Là, ça ferait juste de la peine.",
  noTarget: 'Personne à portée : il brasse de l\'air.',
} as const;

export const TRIGGER_LABEL = {
  anytime: 'à tout moment',
  afterOwnGoal: 'après un but de ton équipe',
  ownSetPiece: 'sur un coup de pied arrêté pour toi',
  opponentSetPiece: 'sur un coup de pied arrêté adverse',
  ownPenalty: 'sur un penalty pour toi',
  opponentPenalty: 'sur un penalty adverse',
  halftime: 'à la mi-temps',
} as const;

export function fill(template: string, vars: CommentaryVars): string {
  return template.replace(PLACEHOLDER, (_, name: string) => String(vars[name as keyof CommentaryVars] ?? ''));
}

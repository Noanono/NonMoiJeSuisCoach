# Non, moi je suis coach — Exigences

Version du 9 nov. 2026. Chaque exigence porte un identifiant pour être suivie pendant le développement.

## Présentation

*Non, moi je suis coach* est un jeu de gestion de club de foot amateur, jouable en solo dans le navigateur. Le joueur prend la tête d'un club de district et tente de le hisser jusqu'à l'élite, saison après saison.

Le jeu mêle une vraie couche de gestion (effectif, tactique, mercato, budget) et un humour franchement adulte : alcool, grivoiserie, scatologie. Ce qui se passe pendant un match reste dans le match, à part le résultat, les cartons rouges et les blessures.

- Public : adultes, joueurs occasionnels qui aiment le foot et le second degré.
- Ton : buvette du dimanche, vestiaire qui sent la bière tiède, président local mégalo.

## Exigences techniques

| ID | Exigence |
| --- | --- |
| TECH-01 | Le jeu se joue dans un navigateur web sur ordinateur, sans installation. |
| TECH-02 | Le jeu fonctionne entièrement en solo et hors ligne : ni serveur, ni compte, ni connexion requise après le chargement. |
| TECH-03 | La partie est sauvegardée localement et peut être reprise là où elle a été laissée (au minimum entre deux journées de championnat). |
| TECH-04 | Le joueur peut gérer plusieurs emplacements de sauvegarde (nouvelle partie, charger, supprimer). |

## Effectif et joueurs

| ID | Exigence |
| --- | --- |
| EFF-01 | Chaque joueur possède des attributs (vitesse, technique, physique, tir, défense, gardien…) et une note globale calculée à partir d'eux. |
| EFF-02 | Chaque joueur a un poste principal (gardien, défenseur, milieu, attaquant) ; un joueur hors de son poste est moins performant. |
| EFF-03 | Le coach choisit le onze de départ, les remplaçants et la formation (4-4-2, 4-3-3, 3-5-2, 5-3-2…) en déplaçant des cartes entre le terrain, le banc et la tribune. |
| EFF-04 | Les joueurs accumulent de la fatigue uniquement en jouant et récupèrent au repos. Plus un joueur est fatigué, moins il est bon (jusqu'à −50 %) et plus il risque de se blesser. Son énergie restante est visible en match et dans Tactique. La note affichée reste celle du joueur frais : la fatigue joue sans être chiffrée à l'écran. |
| EFF-05 | Les joueurs peuvent se blesser en match. La plupart des blessures se soignent en moins d'une semaine ; seules les grosses blessures, rares, font manquer plusieurs matchs. |
| EFF-06 | Chaque joueur a un avatar dessiné, déduit de son identité : il garde le même toute sa carrière. |
| EFF-08 | Chaque joueur possède une seule capacité personnelle, activable par le coach pendant le match. |

## Matchs

| ID | Exigence |
| --- | --- |
| MATCH-01 | Le match est simulé par le jeu à partir des notes, de la fatigue, de la tactique et des capacités activées par les deux coachs. |
| MATCH-02 | Le match se déroule en temps accéléré, avec pause et plusieurs vitesses (×1, ×2, ×4), pour laisser au coach le temps d'activer ses capacités. |
| MATCH-03 | L'activation des capacités pendant le match est la mécanique centrale du jeu. |
| MATCH-04 | Le match s'affiche en fil concis : seules les actions importantes (buts, tirs, cartons, capacités, changements), en quelques mots. Le commentaire humoristique reste en infobulle. |
| MATCH-05 | Avant le match et pendant les pauses, le coach donne des consignes tactiques (défensif, équilibré, offensif, pressing haut, jeu long…) qui modifient la simulation. |
| MATCH-06 | À la fin du match, un résumé affiche le score, les buteurs, les cartons, les blessures et l'impact de chaque capacité utilisée. |
| MATCH-07 | L'équipe adverse, pilotée par l'IA, active elle aussi ses capacités ; le coach les voit annoncées et peut riposter. |
| MATCH-08 | Le coach peut faire 5 remplacements par match, à tout moment, en glissant un remplaçant sur un joueur du terrain (ou l'inverse) ou depuis le panneau du joueur. Un joueur sorti ne revient pas. Un blessé peut être remplacé, pas un exclu. L'IA remplace ses blessés. |
| MATCH-09 | Une mini-carte animée montre les joueurs et le ballon. Le coach attaque toujours vers la droite et son équipe est à gauche du tableau de score. |
| MATCH-10 | Un bouton en coin rappelle l'impact de chaque effet, match en pause. |
| MATCH-11 | Un but arrête le match et s'annonce au centre de l'écran (buteur, minute, score). Le coach reprend quand il veut. |

## Club, mercato et président

| ID | Exigence |
| --- | --- |
| CLUB-01 | Le club dispose d'un budget, alimenté par les résultats, les sponsors et la buvette, et dépensé en salaires et transferts. |
| CLUB-02 | Le mercato permet d'acheter et de vendre des joueurs, dans la limite du budget, pendant des fenêtres définies dans la saison. |
| CLUB-03 | Les clubs adverses font aussi des offres sur les joueurs du coach, qu'il peut accepter ou refuser. |
| CLUB-04 | Le président fixe des objectifs en début de saison (maintien, montée, parcours en coupe…). |
| CLUB-05 | La confiance du président évolue selon les résultats et les dialogues ; l'humeur des sponsors aussi. À zéro de confiance, le coach est licencié et la partie se termine (ou il rebondit dans un autre club). |
| CLUB-06 | Des dialogues humoristiques interpellent régulièrement le coach (président, joueurs, journaliste local, supporters, femme du président…) avec des choix de réponse qui ont des conséquences. |
| CLUB-07 | Le centre de formation produit chaque saison quelques jeunes joueurs, avec un potentiel et parfois une capacité spéciale déjà visible. |
| CLUB-08 | La valeur d'un joueur au mercato est calculée à partir de sa note globale et de la rareté de sa capacité : à note égale, un joueur avec une capacité légendaire vaut nettement plus qu'un joueur avec une capacité commune. La rareté et la valeur sont affichées sur la fiche du joueur. |

## Univers et compétitions

| ID | Exigence |
| --- | --- |
| UNIV-01 | Tous les clubs, joueurs et compétitions sont fictifs, avec des noms parodiques (ex. AS Saint-Pastis, Olympique de Biroute-sur-Loire, FC Gueule-de-Bois). |
| UNIV-02 | Le coach commence dans un club de district : terrain boueux, buvette, vestiaires qui fuient. |
| UNIV-03 | Le jeu comporte plusieurs divisions hiérarchisées, du district jusqu'à l'élite. |
| UNIV-04 | En fin de saison, les premiers montent et les derniers descendent. |
| UNIV-05 | Chaque saison suit un calendrier de championnat complet avec classement mis à jour (points, différence de buts). |
| UNIV-06 | Une coupe à élimination directe se joue en parallèle du championnat, ouverte aux clubs de toutes les divisions. |

## Capacités spéciales : règles générales

Le gameplay repose sur les capacités : chaque joueur en a une, personnelle, que le coach déclenche pendant le match au bon moment. Une capacité doit se comprendre d'un coup d'œil et se voir sur le terrain.

| ID | Exigence |
| --- | --- |
| CAP-01 | Chaque joueur possède exactement une capacité personnelle, liée à lui pour toute sa carrière (elle le suit en cas de transfert). |
| CAP-02 | Dans un même effectif généré, deux joueurs n'ont jamais la même capacité. |
| CAP-03 | Toutes les capacités s'activent manuellement par le coach pendant le match, en touchant le joueur sur le terrain. Les capacités « Banc » s'activent depuis le banc. |
| CAP-04 | Chaque capacité définit : poste, cible (soi, coéquipier, adversaire, zone, équipe), effet chiffré, durée. Le coût et la recharge dépendent de la rareté. |
| CAP-05 | Les activations consomment la Jauge de Gueulante du coach (10 points max, 3 au coup d'envoi), qui se recharge de 1 point toutes les 10 minutes, +1 quand l'équipe encaisse un but : 4 à 6 activations par match. |
| CAP-06 | Une capacité n'a aucun effet en dehors du match : ni budget, ni confiance, ni blessure longue, ni fatigue pour la suite. |
| CAP-08 | La fiche du joueur détaille l'effet, la durée, la recharge et le coût au niveau actuel et au niveau suivant. |
| CAP-09 | Pendant le match, chaque effet actif apparaît sur les joueurs concernés (halo et picto, vert pour un bonus, rouge pour un malus) avec un compte à rebours. |
| CAP-10 | Chaque capacité progresse sur 5 niveaux au fil de la carrière, grâce à l'expérience gagnée par activation et selon son impact sur le match. |
| CAP-11 | Chaque niveau augmente l'effet de 10 %. Le niveau 5 ajoute une cible, sinon 50 % de durée, sinon réduit la recharge de 5 minutes. |
| CAP-12 | Chaque capacité a une rareté. Commune : un effet simple, sûr et sans contrepartie. Rare : plus forte, avec une petite mécanique en plus. Légendaire : peut renverser un match, sans recharge, utilisable autant de fois que la jauge le permet. Mythique : change les règles du match, une seule fois par rencontre, et l'IA y a droit aussi. Plus une capacité est forte, plus elle est rare à la génération des joueurs. |
| CAP-13 | Les capacités de Banc sont cachées jusqu'à l'arrivée du joueur au club ou à leur première activation. |
| CAP-16 | Quand une capacité cible un coéquipier ou un adversaire, le coach choisit lui-même la cible sur le terrain : les cibles valides sont mises en évidence, les autres grisées. Le choix se fait match en pause. |
| CAP-17 | Une cible est valide si elle est sur le terrain, n'est pas déjà hors jeu et appartient à la ligne visée. Pour une capacité à plusieurs cibles, le coach les choisit une à une. |
| CAP-18 | Les capacités de zone se déclenchent à l'emplacement du joueur : le coach choisit le moment, pas la cible. Seules les capacités décrites « au hasard » gardent une cible aléatoire. |
| CAP-19 | Les capacités liées à un événement (penalty, coup franc) restent manuelles : le jeu se met en pause et propose de les activer, sans obligation. |
| CAP-22 | Relancer une capacité dont l'effet est encore actif le prolonge sans le cumuler. |
| CAP-20 | Le coach peut annuler une activation tant qu'il n'a pas validé la cible : la capacité n'est alors ni consommée ni mise en recharge. |
| CAP-21 | Une activation, du coach comme de l'adversaire, s'annonce au centre de l'écran pendant 5 secondes avec l'avatar du joueur et la description de l'effet, match en pause. Flèches vers les cibles, zone colorée et textes s'affichent sur le terrain. |

## Catalogue des capacités

CAT-01 : le jeu contient les 46 capacités ci-dessous. Valeurs données au niveau 1, à équilibrer en test.

| Rareté | Part des joueurs générés | Coût | Recharge | Multiplicateur de valeur |
| --- | --- | --- | --- | --- |
| Commune | ~70 % | 2 | 15 min | ×1 |
| Rare | ~25 % | 3 | 15 min | ×1,5 |
| Légendaire | ~4,5 % | 5 | Aucune | ×3 |
| Mythique | ~0,5 % | 7 | Une fois par match | ×10 |

### Communes (25)

| Capacité | Poste | Cible | Effet |
| --- | --- | --- | --- |
| Le Bedonnant | GB | Soi | +60 % d'arrêts, 15 min |
| Le Bavard | GB | Prochain tir adverse | −60 % de chances de but |
| Le Danseur | GB | Penalty adverse | +60 % d'arrêt |
| Le Dégagement de mule | GB | Équipe | +20 % au tir, 8 min |
| Le Jardinier | DEF | Sa zone | Adversaires à −30 % de vitesse, 15 min |
| L'Agriculteur | DEF | Soi | +70 % en défense, 23 min |
| Le Rugbyman reconverti | DEF | Action adverse | Annule l'action en cours |
| Haleine de Ricard | DEF | 1 adversaire | −30 % de technique, 15 min |
| Le Mur de saucisses | DEF | Coup franc adverse | −70 % de chances de but |
| Le Videur de boîte | DEF | 1 attaquant | −60 % au tir, 15 min |
| Le Lacet fou | MIL | 1 adversaire | Au sol, 5 min |
| Le Marchand de sable | MIL | 1 adversaire | −40 % de concentration, 15 min |
| Le Chien de la casse | MIL | Soi | +40 % de physique, 15 min |
| Le Ruisselant | MIL | Soi | +40 % de technique, 15 min |
| Les Pigeons | MIL | 2 adversaires au hasard | −30 % de concentration, 8 min |
| La Mobylette | ATT | Soi | +60 % de vitesse, 8 min |
| Le Buteur de comptoir | ATT | Soi | +40 % au tir, 15 min |
| Bière tiède | ATT | Penalty ou coup franc | +40 % de réussite |
| Le Bulldozer | ATT | 2 défenseurs | Au sol, 3 min |
| La Frappe de mule | ATT | Prochaine occasion | +40 % de chances de but |
| Le Chambreur | Tous | 1 adversaire | −30 % à toutes ses stats, 8 min |
| Short trop court | Tous | 2 adversaires | −25 % de concentration, 8 min |
| Le Porteur d'eau | Banc | 1 coéquipier | Efface 50 % de sa fatigue |
| Le DJ du vestiaire | Banc | Équipe | +15 % de vitesse, 15 min |
| Le Kiné douteux | Banc | 1 coéquipier au sol | Le relève immédiatement |

### Rares (12)

| Capacité | Poste | Cible | Effet et mécanique |
| --- | --- | --- | --- |
| Le Gardien kamikaze | GB | 2 prochaines occasions adverses | Les annule et rend 1 point de jauge |
| Le Gardien fumeur | GB | Soi | +50 % d'arrêts pendant 23 min, +30 % de plus par but encaissé dans ce match |
| Le Bus de l'amicale | DEF | Équipe | +70 % en défense, 15 min. Sans but encaissé pendant l'effet : +2 points de jauge |
| Le Boucher du village | DEF | 1 adversaire | Hors jeu 23 min |
| Le Vomisseur | MIL | Sa zone | Tous les adversaires de la zone au sol, 5 min |
| Le Retraité de 42 ans | MIL | Équipe | Les 2 prochaines occasions à +40 % |
| Le Pique-assiette | MIL | Coach adverse | Vole 2 points de jauge |
| Le Sombrero bourré | ATT | Soi | Prochaine occasion franche. S'il marque, sa recharge est remise à zéro |
| Le Revenant de la Feria | ATT | Soi | Bonus au tir égal à la minute de jeu pendant 23 min (70e = +70 %) |
| Le Chef de chant | Tous | Équipe | +20 % à toutes les stats, 15 min. Chaque but marqué prolonge de 5 min |
| Le Capitaine gueulard | Tous | Équipe | Retire tous les malus en cours. +1 point de jauge si au moins 3 sont retirés |
| Le Chien du président | Banc | 1 adversaire | Hors jeu 8 min, puis le chien poursuit un autre adversaire 8 min |

### Légendaires (5)

| Capacité | Poste | Effet |
| --- | --- | --- |
| La Panenka ivre | ATT | Crée immédiatement une occasion à 75 % de but |
| L'Échange de maillots | Tous | Inverse les niveaux des deux équipes pendant 15 min |
| La Mêlée générale | Tous | 3 adversaires choisis et le porteur hors jeu, 15 min |
| La Coupure de courant | Banc | Annule le dernier but adverse s'il date de moins de 5 min |
| La Malédiction de mémé | Banc | −30 % à toute l'équipe adverse, 23 min |

### Mythiques (4)

| Capacité | Poste | Effet |
| --- | --- | --- |
| Le Transfert du parking | MIL | Le meilleur joueur de champ adverse rejoint ton équipe jusqu'à la fin du match |
| Le But en or massif | ATT | Pendant 15 min, chaque but compte double et toute l'équipe gagne +30 % à toutes les stats |
| Le Kebab du siècle | Banc | 6 adversaires au hasard hors jeu pendant 15 min |
| Le Miracle du kiné | DEF | Tes exclus et tes blessés reviennent, et toute l'équipe repart à 100 % d'énergie |

## Entraînement

| ID | Exigence |
| --- | --- |
| TRAIN-01 | Chaque semaine, chaque joueur non blessé travaille le programme que le coach lui a donné : un attribut ou sa capacité spéciale. |
| TRAIN-02 | Le programme se règle joueur par joueur et reste actif tant qu'il n'est pas changé. |
| TRAIN-03 | Aucun coût : le rythme dépend de l'âge. Passé son potentiel, un joueur progresse 4 fois moins vite, et de 5 points au maximum. |
| TRAIN-04 | Le programme donne un petit bonus au prochain match : +5 % au tir, en défense ou aux arrêts, +3 % en vitesse, technique ou physique. |
| TRAIN-05 | L'écran Effectif affiche l'évolution de la note de chaque joueur depuis le début de la saison. |

## Progression, rejouabilité et interface

Section à compléter.

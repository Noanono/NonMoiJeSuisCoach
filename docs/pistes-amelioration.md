# Pistes : à corriger, à améliorer

Passe sur le projet de novembre 2026. Chaque point a été vérifié dans le code ou mesuré en simulation.
Classement : d'abord ce qui est faux ou injuste, puis ce qui rendrait le jeu plus amusant.

## À corriger

Toutes corrigées en novembre 2026, avec le nouveau catalogue de 69 capacités.

| # | Constat | Pourquoi ça gêne | Correction proposée |
|---|---|---|---|
| C1 | Gardien du coach blessé : personne ne le remplace, l'équipe joue sans gardien. Seule l'IA remplace ses blessés. | Un match perdu sans que le coach comprenne pourquoi. | Alerte « ton gardien est à terre » avec le match en pause, et remplacement automatique si le coach laisse filer. |
| C2 | Les matchs entre clubs IA (simulation rapide) ne donnent ni carton ni blessure. | Les adversaires arrivent toujours au complet, le coach subit seul les suspensions. | Cartons et blessures tirés aussi en simulation rapide, avec les mêmes taux. |
| C3 | 14 % de chances de rouge par équipe et par match (19 % en pressing haut), contre 5 à 8 % dans la réalité. Seuls le poste et le pressing comptent. | Trop d'expulsions, et jamais « méritées ». | Baisser les taux ; faire dépendre le risque de la fatigue, de la concentration, du derby. |
| C4 | Les malus de tir se consomment dans l'ordre où ils ont été lancés : une capacité de penalty (ex-Danseur) peut s'appliquer au tir d'après. | Une capacité payée qui ne sert pas au moment voulu. | Un malus lancé sur une occasion passe devant les autres. |
| C5 | La réputation d'un club ne change jamais (aucune écriture dans le code). | Monter trois divisions ne change ni les recrues possibles, ni les attentes, ni les jeunes. | Réputation qui suit les résultats de fin de saison. |
| C6 | L'IA joue toujours en « équilibré », sans pressing ni jeu long, et ne fait que remplacer ses blessés. | Tous les adversaires se ressemblent tactiquement. | Un style par club IA, et des changements selon le score (voir A3). |
| C7 | Les clubs IA n'achètent ni ne vendent entre eux : leurs effectifs ne bougent qu'avec les jeunes et les retraites. | Le mercato est figé, les mêmes joueurs restent au même endroit pendant des saisons. | Quelques transferts IA par fenêtre. |
| C8 | Multijoueur : chaque action renvoie la partie entière (≈ 500 Ko) à tous les joueurs. | Une à deux secondes de latence par clic, pire à 6 joueurs. | N'envoyer que ce qui a changé. |
| C9 | Multijoueur : un match en direct est perdu si le serveur s'arrête. | Match à rejouer. | Sauvegarder le match en cours avec la ligue. |
| C10 | Multijoueur : les amis qui avaient rejoint avant le correctif d'identité voient « Rejoindre » au lieu de « Continuer ». | Ils reprendraient un nouveau club. | Bouton hôte « rattacher ce coach à ce navigateur ». |
| C11 | Commentaires périmés dans le code (« aucun changement en match en V1 »). | Trompe celui qui lit le code. | Nettoyage. |

## À améliorer pour le plaisir de jeu

| # | Idée | Ce que ça apporte | Taille |
|---|---|---|---|
| A1 | **Tirs au but en direct** : ordre des tireurs, puis frappe ou plongeon à chaque tir, sang-froid qui baisse en mort subite. | Les fins de coupe deviennent le moment le plus intense. Le système de penalty existe déjà. | Moyenne |
| A2 | **Causerie de mi-temps** : engueulade, discours, blague, calme. Effet selon le score. | Un vrai geste de coach ; se marie avec les nouvelles capacités « Mi-temps ». | Petite |
| A3 | **Coachs IA avec un style** : le bétonneur, le fou d'attaque, le roublard. Consignes, remplacements et capacités choisis selon ce style et le score. | Des adversaires reconnaissables, qu'on apprend à battre. | Moyenne |
| A4 | **Caractères et moral** : Râleur, Leader, Fêtard, Fragile ; moral selon le temps de jeu et les résultats. | On gère des personnages, pas seulement des notes. | Grande |
| A5 | **Rythme du match** : option « jouer les coups de pied arrêtés sans demander » quand aucune capacité n'est disponible, et regrouper les annonces. | Moins d'interruptions à ×4 ; les fenêtres restent pour les vrais choix. | Petite |
| A6 | **Son** : sifflet, but, foule, capacité. Aucun son aujourd'hui. | Énorme gain d'ambiance pour peu de travail. | Petite |
| A7 | **Premiers pas guidés** : trois bulles au premier match (gueulante, capacité, remplacement). Aucun tutoriel aujourd'hui. | Un nouveau joueur comprend en deux minutes. | Petite |
| A8 | **Événements de match** : pluie, terrain gelé, chien sur la pelouse, panne de courant. | Les matchs ne se ressemblent plus. | Moyenne |
| A9 | **Palmarès et records** : meilleurs buteurs de l'histoire du club, plus grosses victoires, vitrine à trophées. | Envie de « encore une saison ». | Petite |
| A10 | **Talents de coach** : un point par saison à placer (meilleure jauge, mercato moins cher, scouts plus rapides). | Une progression qui survit aux changements de club. | Moyenne |
| A11 | **Multijoueur : salon et spectateurs** : petit chat, regarder le match en direct des amis, classement de la ligue entre coachs. | La ligue vit entre les matchs. | Moyenne |
| A12 | **Sauvegarde exportable** : exporter et importer une partie solo en fichier. | Changer de PC sans perdre sa carrière. | Petite |
| A13 | **Combos visibles** : quand deux capacités se répondent (marquage + épuisement, bouclier + pari), l'annoncer à l'écran. | Récompense le coach qui construit son effectif. | Petite |
| A14 | **Rivalité qui s'écrit** : historique des derbys, joueur qui passe chez le rival, dialogues qui s'en souviennent. | Donne une mémoire au monde. | Moyenne |

## Ordre conseillé

1. C1, C4, C2, C3 : les injustices que le joueur ressent tout de suite.
2. A2, A5, A6, A7 : petits chantiers, gros effet sur le plaisir immédiat.
3. A1 et A3 : les deux chantiers moyens qui changent le plus les matchs.
4. C5, C7, A9, A10 : la profondeur sur plusieurs saisons.
5. C8 à C10 et A11 : le confort du multijoueur.

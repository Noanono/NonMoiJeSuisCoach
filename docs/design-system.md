# Design system « Non moi je suis coach »

Source : artefact design system du projet. Les tokens sont dans `src/styles/tokens.css`, les classes typographiques dans `src/styles/base.css`, les composants de base dans `src/ui/kit/`.

La direction artistique, c'est un fanzine de supporters collé sur la pelouse. Le fond est un terrain vert vif (bandes de tonte, brins d'herbe, lignes de craie). Par-dessus : des cartes blanches comme la craie, de l'encre noire, une couleur qui crie (le fumigène), du scotch jaune et des stickers collés de travers. L'interface reste un vrai outil de gestion, lisible et dense, mais elle a l'air d'avoir été montée à la main par quelqu'un qui y croit trop.

## Principes

1. **Imprimé, pas lissé.** Aplats, traits épais, ombres dures décalées. Pas de dégradé, pas de flou, pas de coins arrondis par défaut (`--radius-none`).
2. **L'herbe partout, une seule couleur qui crie.** Le fond est toujours le Terrain (`src/ui/kit/Terrain.svelte`). `--fumigene` porte l'action principale et les grands titres. Le contenu vit sur des cartes `--craie` / `--craie-2` en `--encre`. Si deux éléments sont en fumigène côte à côte, l'un des deux est de trop.
3. **Le bazar a des règles.** Stickers penchés (`--rotation-sticker`) et scotch (`--rotation-scotch`) sont du décor : un ou deux par écran, jamais sur un tableau de stats ou un bouton de liste.
4. **La donnée reste sacrée.** Les chiffres sont en `.stat` / `.tampon` (Space Mono, chasse fixe, `font-variant-numeric: tabular-nums`) et toujours alignés. On rigole dans les textes, jamais dans les chiffres.

## Voix et ton

Humour assumé, ton de vestiaire, tutoiement. Le jeu parle comme un adjoint un peu trop franc ou un supporter en tribune, jamais comme un logiciel.

| Situation | À faire | À éviter |
| --- | --- | --- |
| Bouton principal | **Lancer le match** | Valider |
| Défaite | *Le président a appelé. Il n'a rien dit. C'est pire.* | Vous avez perdu le match. |
| Erreur de compo | *Tu as mis 12 joueurs. Même nous on a vu.* | Composition invalide (erreur 412). |
| Mercato vide | *Personne ne veut venir. Pour l'instant.* | Aucun résultat. |
| Chargement | *L'adjoint ramasse les plots…* | Chargement en cours… |

Phrases courtes ; une blague par écran maximum ; l'info utile avant la blague (*« Défaite 0-3. Le président a appelé. »*) ; jamais de moquerie envers le joueur réel.

## Couleurs

- `terrain`, `terrain-tonte`, `brin`, `brin-ombre`, `ligne` : la pelouse, dessinée par le canvas Terrain. Directement sur l'herbe, seul le texte en `encre` est autorisé.
- `craie` / `craie-2` : cartes, panneaux, tableaux (lignes alternées en `craie-2`). Tout le texte secondaire vit ici.
- `encre` / `encre-pale` : texte, contours. `encre-pale` seulement sur craie.
- `fumigene` : action principale, banderoles, tifo. Texte dessus en `encre-fixe`, jamais en blanc. Posé sur l'herbe, il prend toujours un contour `trait-epais` en `encre-fixe`.
- `scotch` : stickers, surlignage, nouveautés. Texte dessus en `encre-fixe`.
- `victoire` / `carton` : victoire / défaite, forme, blessures, bonus / malus. Seulement sur craie. Toujours avec un mot, un signe ou une lettre (V, N, D, +, −), jamais la couleur seule.
- Thème **Plein jour** (clair) par défaut, thème **Nocturne** (`data-theme="dark"`) pour le match en direct (géré par `store.go`).

## Typographie

- **Anton** (`--font-display`, classes `.banderole-xl/-l/-m`) : titres, scores, annonces. Court, souvent en capitales. Jamais plus d'un `banderole-xl` par écran.
- **Archivo** (`--font-texte`, `.texte-s`, `.texte-fort`) : tout ce qui se lit.
- **Space Mono** (`--font-mono`, `.stat`, `.tampon`) : chiffres, labels, en-têtes de colonnes, onglets.

## Formes et matière

- Contours `--trait-epais` en encre sur cartes et boutons ; `--trait-fin` dans les tableaux.
- Ombre dure `--ombre-sticker` sur ce qui doit ressortir ; au clic, décalage de 3px et `--ombre-presse`.
- Trames rayées (écharpe) en encre sur scotch ou fumigène pour les en-têtes et états spéciaux (derby, finale).
- Pas d'emoji dans l'interface. Pictos éventuels : trait épais, coins carrés, monochromes.

## Responsive

- Mobile : marge `--space-6`, une colonne, banderoles réduites d'un cran.
- Desktop : marge `--space-10`, tableaux denses en `texte-s`, panneaux côte à côte.
- Les éléments penchés repassent droits sous 400px (déjà géré par les tokens).

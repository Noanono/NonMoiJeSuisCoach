# Conventions de code

## Architecture

- `src/domain/` : règles du jeu en TypeScript pur, sans DOM ni Svelte. Tout l'état est sérialisable en JSON (sauvegarde locale).
- `src/ui/` : composants Svelte 5 (runes). L'UI lit l'état du domaine et appelle ses fonctions, elle ne contient pas de règle de jeu.
- `src/domain/types.ts` est le contrat partagé. On ne le modifie qu'en concertation.
- L'aléatoire passe toujours par `Rng` (`src/domain/core/rng.ts`), jamais par `Math.random`, pour des tests reproductibles.
- Identifiants en anglais, commentaires et textes du jeu en français (tutoiement, ton vestiaire, voir le design system).

## Clean code

- Noms explicites, qui disent l'intention. Pas d'abréviations obscures.
- Fonctions courtes qui font une seule chose, avec peu d'arguments (un objet d'options au-delà de trois).
- Pas de nombres magiques : constantes nommées en tête de module.
- Pas d'effet de bord caché : une fonction qui modifie l'état le dit dans son nom ou sa doc.
- Pas de code mort ni de code commenté. Les commentaires expliquent le pourquoi, pas le quoi.
- Chaque règle métier référence son identifiant d'exigence (ex. `CAP-05`) dans un commentaire ou un nom de test.

## Green code

- Aucune dépendance ajoutée sans vraie nécessité. Préférer la plateforme.
- Pas de calcul répété dans les boucles chaudes (simulation minute par minute) : précalculer, éviter les allocations inutiles.
- Les matchs IA contre IA utilisent une simulation rapide, pas la simulation détaillée.
- Pas de polling ni de timers inutiles : arrêter les intervalles dès que l'écran ou le match est en pause.
- Polices auto-hébergées en sous-ensemble latin, pas de requête tierce.
- Animations courtes, et désactivées avec `prefers-reduced-motion`.

## Tests

- `bun test`, fichiers `*.test.ts` à côté du code testé.
- On teste les règles importantes (une exigence = au moins un test quand elle porte une règle chiffrée), pas chaque getter.
- Graines fixes pour l'aléatoire.

## Commits

- Conventional Commits en français : `feat(match): …`, `fix(club): …`, `test: …`, `ci: …`.
- Petits commits cohérents. `bun test` et `bun run check` passent avant chaque commit.

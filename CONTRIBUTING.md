# Guide de contribution

Merci de l'intérêt que tu portes à *Non Moi Je Suis Coach* ! Ce document explique comment proposer une modification.

## Avant de commencer

- Pour un bug ou une idée de feature, **ouvre d'abord une issue** pour en discuter. Ça évite de perdre du temps sur une PR qui ne sera pas retenue.
- Pour une correction mineure (faute de frappe, petit bug évident), tu peux directement ouvrir une PR.
- Vérifie qu'une issue ou une PR similaire n'existe pas déjà.

## Workflow

1. **Fork** le dépôt et clone ton fork.
2. **Crée une branche** à partir de `main` avec un nom explicite :
   - `feat/nom-de-la-feature`
   - `fix/nom-du-bug`
   - `docs/sujet`
3. **Fais tes modifications**, en gardant une PR concentrée sur un seul sujet.
4. **Écris tes commits** en suivant [Conventional Commits](https://www.conventionalcommits.org/fr/) :
   ```
   feat: ajoute le recrutement de joueurs en cours de saison
   fix: corrige le calcul du score de fin de match
   docs: précise les étapes d'installation
   ```
5. **Ouvre une Pull Request** vers `main` et remplis le template fourni.

## Règles de la branche `main`

La branche `main` est protégée :

- Aucun push direct n'est possible, toute modification passe par une Pull Request.
- Les PR doivent être validées par le mainteneur avant d'être fusionnées.
- Les force-push et la suppression de la branche sont interdits.
- Toutes les conversations de la PR doivent être résolues avant la fusion.

## Qualité du code

- Garde le code lisible et cohérent avec l'existant.
- Ajoute ou mets à jour les tests quand ta modification le justifie.
- Vérifie que le projet se lance et que les tests passent avant d'ouvrir la PR.

## Licence des contributions

En soumettant une contribution, tu acceptes qu'elle soit publiée sous la [licence MIT](./LICENSE) du projet.

## Code de conduite

Tout le monde participe dans le respect. Merci de lire le [code de conduite](./CODE_OF_CONDUCT.md).

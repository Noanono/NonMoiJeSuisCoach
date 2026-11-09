<script lang="ts">
  import type { Side } from '../../domain/match';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import { store } from '../store.svelte';
  import FinalReport from './FinalReport.svelte';
  import LiveMatch from './LiveMatch.svelte';

  const coachSide = $derived.by((): Side => {
    const match = store.match;
    if (!match) return 'home';
    return store.select((game) => game.humanClubId) === match.home.clubId ? 'home' : 'away';
  });
</script>

{#if store.match && store.lastSummary}
  <FinalReport summary={store.lastSummary} {coachSide} />
{:else if store.match}
  {#key store.match}
    <LiveMatch match={store.match} {coachSide} />
  {/key}
{:else}
  <main class="vide">
    <Card title="Pas de match">
      <p>Le terrain est vide. Même les pigeons sont partis.</p>
      <Button variant="primary" onclick={() => store.leaveMatch()}>Retour au bureau</Button>
    </Card>
  </main>
{/if}

<style>
  .vide {
    max-width: 520px;
    margin: var(--space-10) auto;
    padding: 0 var(--marge-page);
  }
</style>

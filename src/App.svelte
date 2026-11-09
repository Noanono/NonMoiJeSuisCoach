<script lang="ts">
  import Terrain from './ui/kit/Terrain.svelte';
  import Button from './ui/kit/Button.svelte';
  import Card from './ui/kit/Card.svelte';
  import Sticker from './ui/kit/Sticker.svelte';
  import FormBadge from './ui/kit/FormBadge.svelte';
  import Gauge from './ui/kit/Gauge.svelte';
</script>

<Terrain lignes />
<main>
  <h1 class="banderole-xl">NON, MOI JE<br />SUIS COACH</h1>
  <Card title="Composition du jour" scotch>
    <p>Les cartes en craie se posent sur l'herbe. <Sticker tilted>Nouveau</Sticker></p>
    <p><FormBadge result="V" /> <FormBadge result="N" /> <FormBadge result="D" /></p>
    <Gauge value={6} max={10} label="Jauge de Gueulante" />
    {#snippet actions()}<Button variant="primary">Lancer le match</Button>{/snippet}
  </Card>
</main>

<style>
  main {
    display: grid;
    gap: var(--space-6);
    padding: var(--marge-page);
    max-width: 720px;
  }
</style>

<script lang="ts">
    let { data } = $props();

    import TestWorkspace from "#lib/components/TestWorkspace.svelte";
    import MathsRenderer from "#lib/components/MathsRenderer.svelte";
</script>

<MathsRenderer>

<header class="title-header">
    <h2>{data.lesson.title}</h2>
</header>

<TestWorkspace lesson={data.lesson} questionIds={data.questionIds} />

</MathsRenderer>

<style>
.title-header {
    text-align: center;
    margin: 2rem 0;
}
</style>


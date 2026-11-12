<script lang="ts">
    import LessonCard from "#lib/components/LessonCard.svelte";
    let { topic, lessons } = $props();
</script>

<div class="topic-container">
    <h3 class="topic-title">{topic.title}</h3>

    {#each lessons as lesson}
        <LessonCard {lesson} classes="block" />
    {/each}

</div>

<style>
.topic-container {
    display: block;
    border-style: solid;
    border-width: 1px;
    border-color: var(--nano-border-color);
    border-radius: 1rem;
    padding: 1rem;
}

.topic-title {
    margin-left: 1.25rem;
}

</style>


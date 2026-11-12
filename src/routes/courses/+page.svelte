<script lang="ts">
    import CourseCard from "#lib/components/CourseCard.svelte";
    let { data } = $props();
</script>

<h2>Which course would you like to practise today?</h2>
<br/>

{#each data.courses as course}
<CourseCard {course} />
{/each}


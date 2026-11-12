<script lang="ts">
    import CourseCard from "#lib/components/CourseCard.svelte";
    import TopicView from "#lib/components/TopicView.svelte";
    let { data } = $props();
</script>

<CourseCard course={data.course} />
<hr/>

<h2>Explore this curriculum's lessons</h2>

{#each data.topics as topic}
<br/>
<TopicView {topic} lessons={await topic.lessons()} />
{/each}


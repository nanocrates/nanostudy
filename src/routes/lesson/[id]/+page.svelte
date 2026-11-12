<script lang="ts">
    import LessonCard from "#lib/components/LessonCard.svelte";
    import QuestionPreview from "#lib/components/QuestionPreview.svelte";
    import LearnButton from "#lib/components/LearnButton.svelte";
    import TestButton from "#lib/components/TestButton.svelte";
    import ReadContentDisplay from "#lib/components/ReadContentDisplay.svelte";
    import MathsRenderer from "#lib/components/MathsRenderer.svelte";
    import MarkdownRenderer from "#lib/components/MarkdownRenderer.svelte";
    
    let { data } = $props();
</script>

<h3 class="lesson-title">{data.lesson.title}</h3>

<MathsRenderer>

<div class="lesson-container card">

    <div class="center">
        <LearnButton lesson={data.lesson} />
        <TestButton lesson={data.lesson} />
    </div>

    {#if data.prerequisites.length}
    <hr/>
    <h3>Prerequisites</h3>
    <span class="subtext">We recommend practising these topics before attempting {data.lesson.title.toLowerCase()}:</span>
    <br/>

    {#each data.prerequisites as prerequisite}
    <LessonCard lesson={prerequisite} />
    {/each}
    {/if}

    <hr/>

    <MarkdownRenderer>
    <ReadContentDisplay readContent={data.lesson.readContent} />
    </MarkdownRenderer>
    <hr />

    <h3>Lesson content</h3>
    <p>You may want to try the Test or Learn mode <i>before</i> reading this - as the content below may contain 'spoilers' about the questions.</p>

    {#each data.questions as question}
    <QuestionPreview {question} />
    {/each}

</div>

</MathsRenderer>

<style>
.lesson-container {
    padding: 1rem;
}

.lesson-title {
    width: auto;
}
</style>


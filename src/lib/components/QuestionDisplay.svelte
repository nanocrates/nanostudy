<script lang="ts">
    let { question } = $props();

    import BasicQuestionDisplay from "$lib/components/BasicQuestionDisplay.svelte";
    import ClozeQuestionDisplay from "$lib/components/ClozeQuestionDisplay.svelte";
    import MultistepQuestionDisplay from "$lib/components/MultistepQuestionDisplay.svelte";
    import MathsQuestionDisplay from "$lib/components/MathsQuestionDisplay.svelte";
    import MultimathsQuestionDisplay from "$lib/components/MultimathsQuestionDisplay.svelte";
</script>

<div class="question-prompt">

{#if question.type === "basic"}
    <BasicQuestionDisplay {question} />
{:else if question.type === "cloze"}
    <ClozeQuestionDisplay {question} />
{:else if question.type === "multistep"}
    <MultistepQuestionDisplay {question} />
{:else if question.type === "maths"}
    <MathsQuestionDisplay {question} />
{:else if question.type === "multimaths"}
    <MultimathsQuestionDisplay {question} />
{:else}
    <div>Loading question display...</div>
{/if}

</div>

<script lang="ts">
    let { question } = $props();

    import BasicQuestionPreview from "#lib/components/BasicQuestionPreview.svelte";
    import ClozeQuestionPreview from "#lib/components/ClozeQuestionPreview.svelte";
    import MultistepQuestionPreview from "#lib/components/MultistepQuestionPreview.svelte";
    import MathsQuestionPreview from "#lib/components/MathsQuestionPreview.svelte";
    import MultimathsQuestionPreview from "#lib/components/MultimathsQuestionPreview.svelte";
</script>

<div class="card question-card">

{#if question.type === "basic"}
<BasicQuestionPreview {question} />
{:else if question.type === "cloze"}
<ClozeQuestionPreview {question} />
{:else if question.type === "multistep"}
<MultistepQuestionPreview {question} />
{:else if question.type === "maths"}
<MathsQuestionPreview {question} />
{:else if question.type === "multimaths"}
<MultimathsQuestionPreview {question} />
{:else}
<div>Loading question preview...</div>
{/if}

</div>

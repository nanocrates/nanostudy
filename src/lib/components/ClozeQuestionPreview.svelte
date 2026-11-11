<script lang="ts">
    let { question } = $props();

    let questionHtml = question.prompt;
    for (const validAnswer of question.answer.answerBoxes) {
        let answerDisplay = `<span class='answer-display'>${validAnswer[0]}</span>`;
        questionHtml = questionHtml.replace("{}", answerDisplay);
    }
</script>

<h3>{@html questionHtml}</h3>

{#if question.answer.explanation()}
<details>
    <summary>View explanation</summary>
    <p>{question.answer.explanation()}</p>
</details>
{/if}

<style>
</style>


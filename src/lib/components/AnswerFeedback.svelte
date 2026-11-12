<script lang="ts">
    import QuestionDisplay from "#lib/components/QuestionDisplay.svelte";

    const { answerAttempt } = $props();

    const correctAnswer = $derived(answerAttempt.question.answer.display());
    const isMultiStep = $derived(Boolean(answerAttempt.steps?.length));
</script>

<div class="feedback-card">
    <div class="question-header">
        <QuestionDisplay question={answerAttempt.question} />
    </div>

    {#if answerAttempt.isCorrect}
        <span class="status-title correct">Correct!</span>
        {#if correctAnswer}
            <div class="status-card correct">
                <span class="label">{isMultiStep ? 'Final Answer' : 'Answer'}</span>
                <span class="status-detail"><b>{correctAnswer}</b></span>
            </div>
        {/if}
    {:else}
        <div class="status-title incorrect">Not quite right</div>
        
        {#if answerAttempt.studentAnswer}
            <div class="status-card incorrect">
                <span class="label">Your answer</span>
                <div class="status-detail user-attempt"><b>{answerAttempt.studentAnswer}</b></div>
            </div>
        {/if}

        {#if correctAnswer}
            <div class="info-card">
                <span class="label">{isMultiStep ? 'Final Correct Answer' : 'Correct answer'}</span>
                <div class="status-detail"><b>{correctAnswer}</b></div>
            </div>
        {/if}
    {/if}

    {#if answerAttempt.question?.answer?.hint()}
        <div class="info-card">
            <span class="label">Hint</span>
            <p>{answerAttempt.question.answer.hint()}</p>
        </div>
    {/if}

    {#if answerAttempt.question?.answer?.explanation()}
        <div class="info-card">
            <span class="label">Explanation</span>
            <p>{answerAttempt.question.answer.explanation()}</p>
        </div>
    {/if}

    {#if isMultiStep}
        <div class="steps-container">
            <span class="label steps-label">Steps breakdown</span>
            {#each answerAttempt.steps as step}
                <svelte:self answerAttempt={step} />
            {/each}
        </div>
    {/if}
</div>

<style>
    .feedback-card {
        padding: 0.75rem;
        border: 1px solid var(--nano-border-color);
        border-radius: 8px;
        background-color: var(--nano-bg-surface-color);
        margin-bottom: 0.625rem;
    }

    .question-header {
        margin-bottom: 0.375rem;
    }

    .label {
        display: block;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--nano-fg-muted-color);
        margin-bottom: 0.125rem;
    }

    .correct {
        color: var(--nano-fg-positive-color);
    }

    .incorrect {
        color: var(--nano-fg-negative-color);
    }

    .status-card {
        padding: 0.375rem 0.625rem;
        border-radius: 6px;
        border: 1px solid var(--nano-border-color);
        margin-bottom: 0.375rem;
    }

    .status-card.correct {
        background-color: color-mix(in srgb, var(--nano-bg-positive-color) 8%, transparent);
        border-color: color-mix(in srgb, var(--nano-bg-positive-color) 25%, transparent);
    }

    .status-card.incorrect {
        background-color: color-mix(in srgb, var(--nano-bg-negative-color) 8%, transparent);
        border-color: color-mix(in srgb, var(--nano-bg-negative-color) 25%, transparent);
    }

    .status-title {
        font-weight: 700;
        font-size: 0.8125rem;
        margin-right: 0.5rem;
        margin-left: 0.15rem;
    }

    .status-detail {
        font-size: 0.8125rem;
        color: var(--nano-fg-primary-color);
        display: inline-block;
    }

    .user-attempt {
        display: block;
        margin-top: 0.125rem;
        color: var(--nano-fg-secondary-color);
    }

    .info-card {
        background-color: var(--nano-bg-secondary-color);
        border: 1px solid var(--nano-border-subtle-color);
        border-radius: 6px;
        padding: 0.375rem 0.625rem;
        margin-top: 0.375rem;
    }

    .info-card p {
        margin: 0;
        font-size: 0.8125rem;
        line-height: 1.35;
        color: var(--nano-fg-primary-color);
    }

    .steps-container {
        margin-top: 0.625rem;
        padding-left: 0.625rem;
        border-left: 2px solid var(--nano-border-color);
    }

    .steps-label {
        margin-bottom: 0.375rem;
    }
</style>

<script lang="ts">
    import { AnswerSubmissionResult } from "#lib/types/question";
    import { Lesson } from "#lib/types/lesson";
    import AnswerFeedback from "#lib/components/AnswerFeedback.svelte";

    interface Props {
        lesson: Lesson;
        results: AnswerSubmissionResult[];
    }
    let { lesson, results }: Props = $props();

    let correctCount = $derived(results.filter(r => r.isCorrect).length);
    let correctPercentage = $derived(Math.round((correctCount / results.length) * 100));
</script>

<div class="main-content">
    <div class="summary-card">
        <h3>Test complete!</h3>
        <p class="score">You answered <b>{correctCount}</b> out of <b>{results.length}</b> questions correctly (<b>{correctPercentage}%</b>).</p>
        <p class="subtext">Here's a breakdown of what went well and the topics to work on next:</p>
    </div>

    <div class="feedback-list">
        {#each results as result}
            <AnswerFeedback answerAttempt={result} />
        {/each}
    </div>

    <div class="actions">
        <a href="/home" class="btn">Return to home</a>
    </div>
</div>

<style>
    .summary-card {
        text-align: center;
        margin-bottom: 1.25rem;
        padding-bottom: 1rem;
    }

    .score {
        font-size: 1.0625rem;
        margin: 0.375rem 0 0.25rem;
        color: var(--nano-fg-primary-color);
    }

    .subtext {
        font-size: 0.875rem;
        color: var(--nano-fg-secondary-color);
        padding-bottom: 0rem;
    }

    .feedback-list {
        margin-bottom: 1.5rem;
    }

    .actions {
        text-align: center;
    }
</style>

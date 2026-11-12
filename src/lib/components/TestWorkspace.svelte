<script lang="ts">
    let { questionIds, lesson, hideMetadata } = $props();

    import RawInput from "#lib/components/RawInput.svelte"
    import QuestionWorkspace from "#lib/components/QuestionWorkspace.svelte";
    import AnswerFeedback from "#lib/components/AnswerFeedback.svelte";
    import TestCompletionSummary from "#lib/components/TestCompletionSummary.svelte";
    import MathsRenderer from "#lib/components/MathsRenderer.svelte";
    import { getQuestion } from "#lib/api/question.remote.ts";

    let currentQuestionNumber = $state(1);
    let currentQuestionId = $derived(questionIds[currentQuestionNumber - 1]);
    let currentQuestion = $state({});

    let questionAttempts = $state([]);
    let currentAnswerAttempt = $state(null);

    $effect(() => {
        const id = currentQuestionId;

        if (!id) return;

        getQuestion({ questionId: id }).then((res) => {
            currentQuestion = res;
        });
    });

    async function submitAnswer(value) {
        currentAnswerAttempt = value;
        questionAttempts.push(currentAnswerAttempt);
    }

    async function advanceQuestion() {
        currentAnswerAttempt = null;
        currentQuestionNumber++;
    }
</script>

{#if currentQuestionNumber <= questionIds.length}

{#if !hideMetadata}
<div class="card tight">Question {currentQuestionNumber} of {questionIds.length}</div>
<br />
{/if}

{#if currentAnswerAttempt === null}
    {#key currentQuestionId}
        <MathsRenderer>
            <QuestionWorkspace question={currentQuestion} submit={submitAnswer} />
        </MathsRenderer>
    {/key}
{:else}
    {#key currentAnswerAttempt}
        <div>
            <MathsRenderer>
                <AnswerFeedback answerAttempt={currentAnswerAttempt} />
            </MathsRenderer>
        </div>
        <div>
            <button class="btn" onclick={advanceQuestion}>Next Question</button>
        </div>
    {/key}
{/if}

{:else}
<TestCompletionSummary lesson={lesson} results={questionAttempts} />
{/if}



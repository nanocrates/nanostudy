<script lang="ts">
    let { question, submit } = $props();

    import { AnswerSubmissionResult } from "#lib/types/question";

    import QuestionWorkspace from "#lib/components/QuestionWorkspace.svelte";
    import MultistepQuestionDisplay from "#lib/components/MultistepQuestionDisplay.svelte";
    import RawInput from "#lib/components/RawInput.svelte";
    import AnswerFeedback from "#lib/components/AnswerFeedback.svelte";
    import QuestionPreview from "#lib/components/QuestionPreview.svelte";

    var currentStepIndex = $state(1);
    var currentStep = $derived(question.steps[currentStepIndex-1]);
    var answers = []
    var currentAnswerAttempt = $state(null);

    async function submitAnswer(attempt) {
        question.steps[currentStepIndex-1].answer = attempt.question.answer;
        currentAnswerAttempt = attempt;
        answers.push(attempt);
        if (currentStepIndex >= question.steps.length) {
            finishQuestion();
        }
    }

    async function advanceStep() {
        currentAnswerAttempt = null;
        currentStepIndex++;
    }

async function finishQuestion() {
    question.answer = answers[answers.length - 1].question.answer;
    let result = new AnswerSubmissionResult(
        question,
        answers.every(a => a.isCorrect),
        question.answer.studentAnswer,
        answers,
    );
    submit(result);
}
</script>

<MultistepQuestionDisplay {question} />

{#each question.steps.slice(0, currentStepIndex-1) as step, stepIndex}
<QuestionPreview question={step} />
{/each}

{#if currentAnswerAttempt === null}
<div class="card">
    <p>Step {currentStepIndex}</p>
    <QuestionWorkspace question={currentStep} submit={submitAnswer} />
</div>
{:else}
<div class="card">
    <AnswerFeedback answerAttempt={currentAnswerAttempt} />
    <div>
        {#if currentStepIndex < question.steps.length}
        <button class="btn" onclick={advanceStep}>Next Step</button>
        {/if}
    </div>
</div>
{/if}


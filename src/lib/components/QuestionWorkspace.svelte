<script lang="ts">
    import { Question, AnswerSubmissionResult } from "$lib/types/question";
    import { checkAnswer } from "$lib/api/question.remote.ts";
    import QuestionDisplay from "$lib/components/QuestionDisplay.svelte";
    import BasicQuestionWorkspace from "$lib/components/BasicQuestionWorkspace.svelte";
    import ClozeQuestionWorkspace from "$lib/components/ClozeQuestionWorkspace.svelte";
    import MultistepQuestionWorkspace from "$lib/components/MultistepQuestionWorkspace.svelte";
    import MathsQuestionWorkspace from "$lib/components/MathsQuestionWorkspace.svelte";
    import MultimathsQuestionWorkspace from "$lib/components/MultimathsQuestionWorkspace.svelte";

    interface Props {
        question: Question;
        submit: (value: string) => void;
    }

    let { question, submit }: Props = $props();

    async function submitAnswer(value) {
        let result: AnswerSubmissionResult;
        if (value instanceof AnswerSubmissionResult) {
            result = value;
        } else {
            let isCorrect = question.answer.isCorrect(value);
            result = new AnswerSubmissionResult(question, isCorrect, value);
        }
        submitCheckedAnswer(result);
    }

    async function submitCheckedAnswer(answer) {
        submit(answer);
    }
</script>

<div class="card">

{#if question.type === "basic"}
<BasicQuestionWorkspace {question} submit={submitAnswer} />
{:else if question.type === "cloze"}
<ClozeQuestionWorkspace {question} submit={submitAnswer} />
{:else if question.type === "multistep"}
<MultistepQuestionWorkspace {question} submit={submitAnswer} />
{:else if question.type === "maths"}
<MathsQuestionWorkspace {question} submit={submitAnswer} />
{:else if question.type === "multimaths"}
<MultimathsQuestionWorkspace {question} submit={submitAnswer} />
{:else}
    <div>Loading question workspace...</div>
{/if}

</div>

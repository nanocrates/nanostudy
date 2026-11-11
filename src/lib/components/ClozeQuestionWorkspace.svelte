<script lang="ts">
    let { question, submit } = $props();

    let questionHtml = question.prompt;
    for (let i = 0; i < question.answer.answerBoxes.length; i++) {
        questionHtml = questionHtml.replace("{}", `<input type=text class='answer-input' id='answer-input-${i}'/>`);
    }

    function submitInputBox() {
        let answerAttempt = "";
        for (const answerInput of document.getElementsByClassName("answer-input")) {
            answerAttempt += answerInput.value + "; ";
        }
        answerAttempt = answerAttempt.endsWith("; ") ? answerAttempt.slice(0, -2) : answerAttempt;
        submit(answerAttempt);
    }
</script>

{@html questionHtml}

<button class="btn btn-accent" onclick={submitInputBox}>Submit</button>


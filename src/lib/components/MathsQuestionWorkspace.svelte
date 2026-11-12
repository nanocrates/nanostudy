<script lang="ts">
    let { question, submit } = $props();

    import MathsQuestionDisplay from "#lib/components/BasicQuestionDisplay.svelte";
    import MathsInput from "#lib/components/MathsInput.svelte";
</script>

<MathsQuestionDisplay {question} />
<MathsInput submit={submit} />

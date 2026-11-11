<script lang="ts">
    let { question, submit } = $props();

    import BasicQuestionDisplay from "$lib/components/BasicQuestionDisplay.svelte";
    import RawInput from "$lib/components/RawInput.svelte";
</script>

<BasicQuestionDisplay {question} />
<RawInput submit={submit} />

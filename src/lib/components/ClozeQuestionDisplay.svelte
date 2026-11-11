<script lang="ts">
    let { question } = $props();
    let prompt = question.prompt.replaceAll("{}", "___");
</script>

{prompt}


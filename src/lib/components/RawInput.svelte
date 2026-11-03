<script lang="ts">
  type Props = {
    submit: (value: string) => void;
  };

  let { submit }: Props = $props();
  let inputBox: HTMLInputElement | undefined = $state();

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitInputBox();
    }
  }
</script>

<div class="input-container">
  <input
    bind:this={inputBox}
    type="text"
    class="text-input text-input-accent"
    onkeydown={(e) => e.key === "Enter" && submitInputBox()}
  />
  <button class="btn btn-accent" onclick={submitInputBox}>Submit</button>
</div>

<style>
  .input-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }

  .text-input {
    flex: 1;
    width: 100%;
  }
</style>

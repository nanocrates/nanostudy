<script lang="ts">
  import "mathlive";
  import type { MathfieldElement, MathfieldElementAttributes } from "mathlive";
  import { on } from "svelte/events";

  type Props = {
    submit: (value: string) => void;
    value?: string;
  } & Partial<MathfieldElementAttributes>;

  let { submit, value = $bindable(""), ...rest }: Props = $props();

  let mathfield: MathfieldElement | undefined = $state();

  const init = (node: MathfieldElement) => {
    mathfield = node;

    $effect(() => {
      if (value !== undefined && node.value !== value) {
        node.value = value;
      }
    });

    $effect(() => {
      return on(node, "input", () => {
        value = node.value;
      });
    });
  };

  function submitInputBox() {
    const rawValue = mathfield?.value ?? value ?? "";
    submit("$" + rawValue + "$");
  }
</script>

<div class="input-container">
  <math-field
    onkeydown={(e) => e.key === "Enter" && submitInputBox()}
    use:init {...rest}
  ></math-field>
  <button class="btn btn-accent" onclick={submitInputBox}>Submit</button>
</div>

<style>
  .input-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }

  math-field {
    flex: 1;
    min-width: 250px;
    display: inline-block;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1.5rem;
    --contains-highlight-background-color: rgba(0, 0, 0, 0.05); /* or 'transparent' to turn off */
    --selection-background-color: rgba(45, 106, 79, 0.2);
    --selection-color: inherit;
  }

  .btn {
    padding: 1.25rem;
  }
</style>

<script lang="ts">
    import './layout.css';
    import Header from "../lib/components/Header.svelte";
    import favicon from '$lib/assets/favicon.svg';

    let { children } = $props();
    import { onMount } from 'svelte';

    $effect(() => {
        const isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        //const theme = isLight ? 'light-mode' : 'dark-mode';
        //document.documentElement.classList.add(theme);
    });

    onMount(async () => {
        const { MathfieldElement } = await import('mathlive');

        MathfieldElement.macros = {
            ...MathfieldElement.macros,
            matrix: { def: '\\begin{bmatrix}#1\\end{bmatrix}' }
        };

        MathfieldElement.inlineShortcuts = {
            ...MathfieldElement.inlineShortcuts,
            matrix: '\\begin{bmatrix} \\placeholder{} & \\placeholder{} \\\\ \\placeholder{} & \\placeholder{} \\end{bmatrix}'
        };
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>Nanostudy - never lose a mark again</title>
</svelte:head>

<Header/>

<div class="content">
    {@render children()}
</div>


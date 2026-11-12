<script>
    import { marked } from 'marked';

    let { children } = $props();
    let container = $state();

    function processMarkdown(target) {
        if (!target) return;

        const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
        const nodesToProcess = [];
        let node;

        while ((node = walker.nextNode())) {
            const parent = node.parentNode;
            if (!parent || parent.closest('.markdown-rendered-block, script, style')) {
                continue;
            }

            if (node.nodeValue) {
                nodesToProcess.push(node);
            }
        }

        for (const textNode of nodesToProcess) {
            const parent = textNode.parentNode;
            if (!parent) continue;

            const span = document.createElement('span');
            span.className = 'markdown-rendered-block';
            span.style.display = 'inline';
            span.innerHTML = marked.parse(textNode.nodeValue);

            parent.insertBefore(span, textNode);
            textNode.nodeValue = '';
        }
    }

    $effect(() => {
        if (!container) return;

        processMarkdown(container);

        const observer = new MutationObserver(() => {
            observer.disconnect();
            processMarkdown(container);
            observer.observe(container, { childList: true, subtree: true });
        });

        observer.observe(container, { childList: true, subtree: true });

        return () => observer.disconnect();
    });
</script>

<div bind:this={container}>
    {@render children()}
</div>

<style>
</style>

<script>
    // TODO: This script is mostly AI-generated. It will be fully rewritten manually before production use and NEA submission.
    import katex from 'katex';
    import 'katex/dist/katex.min.css';

    let { children } = $props();
    let container = $state();

    function processMathAndTikz(target) {
        if (!target) return;

        const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
        const nodesToProcess = [];
        let node;

        while ((node = walker.nextNode())) {
            const parent = node.parentNode;
            // Ignore text inside scripts, styles, or already rendered math/TikZ blocks
            if (!parent || parent.closest('.math-rendered-block, .katex, .tikz-container, script, style')) {
                continue;
            }

            const val = node.nodeValue;
            if (val && (val.includes('$') || val.includes('\\begin{tikzpicture}'))) {
                nodesToProcess.push(node);
            }
        }

        for (const textNode of nodesToProcess) {
            const parent = textNode.parentNode;
            if (!parent) continue;

            let raw = textNode.nodeValue;
            if (!raw) continue;

            // 1. Process TikZ diagrams via Kroki API
            const tikzRegex = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g;
            raw = raw.replace(tikzRegex, (match) => {
                const encoded = encodeURIComponent(match.trim());
                const src = `https://kroki.io/tikz/svg?plain=${encoded}`;
                return `<div class="tikz-container" style="text-align:center; margin: 1rem 0;">
                    <img src="${src}" alt="TikZ Diagram" loading="lazy" style="max-width: 100%; height: auto;" />
                </div>`;
            });

            // 2. Process Display Math ($$...$$)
            raw = raw.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
                try {
                    return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
                } catch {
                    return _;
                }
            });

            // 3. Process Inline Math ($...$)
            raw = raw.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
                try {
                    return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
                } catch {
                    return _;
                }
            });

            const span = document.createElement('span');
            span.className = 'math-rendered-block';
            span.style.display = 'inline';
            span.innerHTML = raw;

            // SAFEGUARD: Insert rendered math before textNode and empty textNode's value.
            // Leaving textNode attached to parent prevents Svelte 5 DOM unmount errors.
            parent.insertBefore(span, textNode);
            textNode.nodeValue = '';
        }
    }

    $effect(() => {
        if (!container) return;

        // Initial pass on mount
        processMathAndTikz(container);

        // Re-process on dynamic DOM changes (e.g. submitting answers or advancing questions)
        const observer = new MutationObserver(() => {
            observer.disconnect();
            processMathAndTikz(container);
            observer.observe(container, { childList: true, subtree: true });
        });

        observer.observe(container, { childList: true, subtree: true });

        return () => observer.disconnect();
    });
</script>

<div bind:this={container}>
    {@render children()}
</div>

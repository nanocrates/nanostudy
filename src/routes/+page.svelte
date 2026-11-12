<script lang="ts">
import './layout.css';
import Badge from "#lib/components/Badge.svelte";
import TestWorkspace from "#lib/components/TestWorkspace.svelte";
import MathsRenderer from "#lib/components/MathsRenderer.svelte";
import { hasLaunched } from "#lib/data/countdown.ts"
</script>

<div class="page-wrapper">
    <main>
        <section class="hero-section">
            <div class="container hero-container">

                <h1 class="hero-title">
                    Built to save <span class="highlight-underline">every mark</span>
                </h1>

                <p class="hero-subheadline">
                    Stop guessing where you drop marks. Nanostudy pinpoints your exact mistake patterns and builds targeted practice to push you into the next grade boundary.
                </p>

                <div class="hero-actions">
                    {#if hasLaunched()}
                    <a href="/courses" class="btn btn-accent btn-lg">
                        <span>Start Studying Now ➜</span>
                    </a>
                    {:else}
                        <span class="btn btn-accent btn-lg">Nanostudy will launch on the 3rd of January, 2027</span>
                    {/if}
                </div>

                <div class="tryit-widget-slot">
                    <h3>Try a practice question</h3>
                    <MathsRenderer>
                    <TestWorkspace questionIds={["example-bidmas"]} hideMetadata=true />
                    </MathsRenderer>
                </div>
            </div>
        </section>

        <section class="features-section" id="features">
            <div class="container">
                <div class="features-grid">
                    <div class="card feature-card">
                        <h3>Stop repeating the same mistakes</h3>
                        <p>Nanostudy maps your mistakes to exact topics and exam techniques. Spot weak areas instantly and stop wasting revision time on what you've already mastered.</p>
                        <div class="widget-slot card-widget-slot">
                            <!-- TODO: add statistics view component -->
                        </div>
                    </div>

                    <div class="card feature-card">
                        <h3>Unlimited practice to achieve <i>true mastery</i></h3>
                        <p>Practice questions match the worked examples step-for-step. Follow the exact same logic with new numbers whenever you just need an extra attempt to get it right.</p>
                        <div class="widget-slot card-widget-slot">
                            <!-- TODO: add regenerating problem component -->
                        </div>
                    </div>

                    <div class="card feature-card">
                        <h3>A study platform built around <i>total clarity</i></h3>
                        <p>Forget final answers. Nanostudy breaks down every line of working out, explaining the step-by-step logic so you never get stuck guessing.</p>
                        <div class="widget-slot card-widget-slot">
                            <!-- TODO: add question feedback component -->
                        </div>
                    </div>

                    <div class="card feature-card">
                        <h3>And it's <i>actually</i> free</h3>
                        <p>Every core feature is free forever. Zero ads, zero paywalls, and no daily limits - just an honest revision platform built to push you into your target grade boundary.</p>
                        <div class="widget-slot card-widget-slot">
                            <!-- TODO: add regenerating problem component -->
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <p class="footer-text">
                © 2026 Nanostudy • Built for students, by a student. Curated and <a href="https://github.com/dylanopen/Nanostudy">coded in the open</a> by <a href="https://dylancode.dev" target="_blank" rel="noopener">Dylan Rogers</a>.
            </p>
        </div>
    </footer>
</div>

<style>
.hero-section {
    padding: 4.5rem 0 3rem;
}

.hero-container {
    text-align: center;
}

.hero-title {
    max-width: 800px;
    margin: 0 auto 1.25rem;
}

.hero-subheadline {
    max-width: 620px;
    font-size: 1.125rem;
    line-height: 1.6;
    margin: 0 auto 2.25rem;
}

.hero-actions {
    margin-bottom: 3.5rem;
}

.features-section {
    padding-bottom: 4.5rem;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
}

.feature-card h3 {
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
}

.feature-card p {
    font-size: 0.9375rem;
    line-height: 1.5;
    margin-bottom: 1.25rem;
}

.card-widget-slot {
    min-height: 200px;
}

.footer {
    padding: 2rem 0;
    border-top: 1px solid var(--nano-border-subtle-color);
    text-align: center;
}

.footer-text {
    font-size: 0.875rem;
    color: var(--nano-fg-muted-color);
}

.footer-text a {
    color: var(--nano-fg-primary-color);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
}

.tryit-widget-slot {
    margin: 3rem 0;
}
</style>

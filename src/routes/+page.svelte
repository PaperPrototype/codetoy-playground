<script>
    import { onMount } from 'svelte';
    import ColorPicker from '$lib/extras/ColorPicker.svelte';
    import Box from '$lib/extras/Gradient.svelte';
    import Hue from '$lib/extras/Hue.svelte';
    import BestColorPicker from '$lib/extras/BestColorPicker.svelte';

    onMount(() => {
        document.title = 'My SvelteKit Library';
    });
</script>

<ColorPicker />

<BestColorPicker />

<h1>Welcome to your library project</h1>
<p>Create your package using @sveltejs/package and preview/showcase your work with SvelteKit</p>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<a href="/components/code" class="underline">Code Editor demo</a>
<br />
<a href="/components/files" class="underline">File Viewer demo</a>
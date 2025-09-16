<script lang="ts">
    import { browser } from "$app/environment";
    import { CodeEditor, LunaConsole, FileViewer} from "$lib/index.js";
    import { onMount } from "svelte";

    let console: LunaConsole;
    let canvasContainer: HTMLElement;
    let code = `
// Example code to draw a red rectangle
self.onmessage = function({data: {type, payload}}) {
    if (type === 'start') {
        // start message includes an OffscreenCanvas
        const canvas = payload;

        // CanvasRenderingContext2D
        const context2D = canvas.getContext('2d');

        // red background
        context2D.fillStyle = 'red';
        context2D.fillRect(0, 0, canvas.width, canvas.height);
    }
}
`

    onMount(() => {
        if (!browser) return;
        runCode();
    });

    let worker: Worker | undefined;
    function runCode() {
        // clear previous worker and canvas
        worker?.terminate();
        canvasContainer.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvasContainer.appendChild(canvas);
        canvas.width = 400; // pixels
        canvas.height = 400; // pixels

        // we need this to load the code as a script
        const urlToScript = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
        
        // create a "worker" to run the code in a separate thread
        worker = new Worker(urlToScript, { type: 'module' });

        // get an OffscreenCanvas https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
        const offscreenCanvas = canvas.transferControlToOffscreen();

        worker.postMessage({ type: 'start', payload: offscreenCanvas }, [offscreenCanvas]);
    }
</script>

<button class="btn" onclick={runCode}>Run</button>

<div class="grid grid-cols-3">
    <FileViewer />
    <CodeEditor bind:value={code} class="min-h-96 w-full" />
    <div bind:this={canvasContainer}></div>
</div>

<!-- <LunaConsole bind:this={console} /> -->

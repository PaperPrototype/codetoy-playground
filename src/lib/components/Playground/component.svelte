<script lang="ts">
    import { browser } from "$app/environment";
    import { CodeEditor, LunaConsole, FileViewer} from "$lib/index.js";
    import { onMount } from "svelte";
    import type { Entry } from "../FileViewer/files.js";

    let console: LunaConsole;
    let canvasContainer: HTMLElement;
//     let code = `
//     // Example code to draw a red rectangle
// self.onmessage = function({data: {type, payload}}) {
//     if (type === 'start') {
//         // start message includes an OffscreenCanvas
//         const canvas = payload;

//         // CanvasRenderingContext2D
//         const context2D = canvas.getContext('2d');

//         // red background
//         context2D.fillStyle = 'red';
//         context2D.fillRect(0, 0, canvas.width, canvas.height);
//     }
// }
// `
    let activeEntry: Entry | undefined;

    onMount(() => {
        if (!browser) return;
        runCode();
    });

    let worker: Worker | undefined;
    async function runCode() {
        // clear previous worker and canvas
        worker?.terminate();
        canvasContainer.innerHTML = '';

        if (!activeEntry) return;

        const canvas = document.createElement('canvas');
        canvasContainer.appendChild(canvas);
        canvas.width = 400; // pixels
        canvas.height = 400; // pixels

        // create a "worker" to run the code in a separate thread
        // activeEntry is a file system entry in OPFS
        worker = new Worker("/files" + activeEntry.relativePath, { type: 'module' });

        worker.onerror = (err) => {
            window.console.log("PLAYGROUND WRKR ERR:", err)
            window.console.log("PLAYGROUND WRKR ERR: error", err.error)
        }

        worker.onmessage = (event) => {
            window.console.log("PLAYGROUND WRKR MSG:", event)
        }

        worker.onmessageerror = (err) => {
            window.console.log("PLAYGROUND WRKR MSG ERR:", err)
        }

        // get an OffscreenCanvas https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
        const offscreenCanvas = canvas.transferControlToOffscreen();

        worker.postMessage({ type: 'start', payload: offscreenCanvas }, [offscreenCanvas]);
    }

    let codeEditor: CodeEditor | undefined = $state();
</script>

<button class="btn" onclick={runCode}>Run</button>

<div class="grid grid-cols-3">
    <FileViewer
        select={async (entry) => {
            if (entry.kind === "directory") return;
            codeEditor?.select(entry);
            activeEntry = entry;
        }} 
        reload={(rootEntry) => {
            if (codeEditor) codeEditor.reload(rootEntry);
        }}/>
    <CodeEditor
        bind:this={codeEditor} class="min-h-96 w-full" 
        edited={() => {
            
        }}
        saved={(model, entry) => {
            
        }}/>
    <div bind:this={canvasContainer}></div>
</div>

<!-- <LunaConsole bind:this={console} /> -->

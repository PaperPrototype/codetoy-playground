<script lang="ts">
    import { browser } from "$app/environment";
    import { CodeEditor, LunaConsole, FileViewer} from "$lib/index.js";
    import { onMount } from "svelte";
    import type { Entry } from "../FileViewer/files.js";

    let console: LunaConsole;
    let canvasContainer: HTMLElement;
//     let code = `

// import { multiply } from "/files/lib.js"

// // Example code to draw a red rectangle
// self.onmessage = function({data: {type, payload}}) {
//     if (type === 'start') {
//         // start message includes an OffscreenCanvas
//         const canvas = payload;

//         // CanvasRenderingContext2D
//         const context2D = canvas.getContext('2d');

//         // red background
//         context2D.fillStyle = 'red';
//         context2D.fillRect(0, 0, multiply(canvas.width, 1), canvas.height);
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

        const url = "/files" + activeEntry.relativePath;

        // use this to debug responses from dev server
        // const resp = await fetch(url);
        // window.console.log("PLAYGROUND: fetch code response", resp)
        // const srcCode = await resp.text();
        // window.console.log("PLAYGROUND: srcCode", srcCode)
        // const blobUrl = URL.createObjectURL(new Blob([srcCode], {type: "text/javascript"}));
        // window.console.log("PLAYGROUND BLOB URL:", blobUrl)

        // create a "worker" to run the code in a separate thread
        // activeEntry is a file system entry in OPFS
        worker = new Worker(url, { type: 'module' });

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

<button class="btn mx-2 mt-2" onclick={runCode}>Run</button>

<div class="grid grid-cols-2">
    <FileViewer
        select={async (entry) => {
            if (entry.kind === "directory") return;
            codeEditor?.select(entry);
            activeEntry = entry;
        }} 
        onError={(error, operation) => {
            window.console.error("operation:", operation, "errorL:", error)
        }}
        onEntriesReloaded={(rootEntry) => {
            if (codeEditor && codeEditor.isMonacoLoaded()) codeEditor.loadAllModels(rootEntry);
        }}/>
    <CodeEditor
        bind:this={codeEditor} class="min-h-96 w-full" 
        edited={() => {
            
        }}
        saved={(model, entry) => {
            
        }}/>
</div>
<div>
    <div bind:this={canvasContainer}></div>
</div>

<!-- <LunaConsole bind:this={console} /> -->

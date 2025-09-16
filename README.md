# The Playground

https://github.com/user-attachments/assets/ef293227-3400-4300-9a67-61547e574f31

# How to Contribute

The best place to start is [issue #3](https://github.com/PaperPrototype/codetoy-playground/issues/3) or you can view the [available tasks here](https://github.com/users/PaperPrototype/projects/1/views/1)

# Getting Started

1. Download and open the project in vs code. 

2. To install the js packages run the following command in the terminal

```
npm install
```

3. Start the development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

Open the url that shows up (eg. `http://localhost:5173/`) and you should see a playground with code editing!

# What Will I Be Making?
The Playground component we are making looks like this:

```svelte
<script lang="ts">
    import { CodeEditor } from "$lib/index.js";

    let canvasContainer: HTMLElement;
    let code = `
// Example code to draw a red rectangle
self.onmessage = function({data: {type, payload}}) {
    if (type === 'start') {
        const canvas = payload;
        console.log('Worker started', payload);
        const context2D = canvas.getContext('2d');
        console.log('context2D', context2D);

        if (context2D) {
            context2D.fillStyle = 'red';
            context2D.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
}`

    let worker: Worker | undefined;

    function runCode() {
        // cleanup
        worker?.terminate();
        canvasContainer.innerHTML = '';

        // create a new canvas
        const canvas = document.createElement('canvas');
        canvasContainer.appendChild(canvas);
        canvas.width = 800; // pixels
        canvas.height = 400; // pixels

        // convert the code into a script
        const urlToScript = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
        
        // create a "worker" to run the script in a separate thread
        worker = new Worker(urlToScript, { type: 'module' });

        // get an OffscreenCanvas https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
        const offscreenCanvas = canvas.transferControlToOffscreen();

        // send OffscreenCanvas to worker
        worker.postMessage({ type: 'start', payload: offscreenCanvas }, [offscreenCanvas]);
    }
</script>

<button class="btn" onclick={runCode}>Run</button>

<CodeEditor bind:value={code} class="min-h-96 w-full" />

<div bind:this={canvasContainer}></div>
```

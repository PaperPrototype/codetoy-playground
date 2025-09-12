<script lang="ts">
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import type LunaConsole from "luna-console";
    import TestWorker from "./test-worker?worker";

    let console: LunaConsole;

    onMount(async () => {
        if (!browser) return;

        const LunaConsole = (await import("luna-console")).default;

        // import("luna-object-viewer/luna-object-viewer.css");
        // import("luna-data-grid/luna-data-grid.css");
        // import("luna-dom-viewer/luna-dom-viewer.css");
        import("luna-console/luna-console.css");

        const container = document.getElementById("container");
        console = new LunaConsole(container!, {
            // theme: 'dark'
        });
        console.log("luna");
        console.log({});
        console.log(container);
        console.log("END OF MAIN THREAD")

        const worker = new TestWorker();
        worker.addEventListener("message", (event) => {
            // console.log('Worker message:', event.data);

            if (event.data.type === "console") {
                const { method, args } = event.data;

                // Log console to main thread console
                if (method in console) {
                    // console[method](...args);
                    console[method](args);
                }
            }
        });
        worker.addEventListener("error", (error) => {
            console.error(error.message, 'at', error.filename, 'line', error.lineno, 'column', error.colno);
        });
    });

    function evaluate(input: any) {
        console.evaluate(input);
    }
</script>

<div class="overflow-y-scroll overflow-x-hidden">
    <div id="container"></div>
    <input
        onkeydown={(e) => {
            if (e.key === "Enter") {
                evaluate(e.currentTarget.value);
                e.currentTarget.value = "";
            }
        }}
        class="p-0 text-xs px-1 font-mono mx-2
    border-none outline-0
    focus:ring-0 focus:border-none
    bg-transparent w-full"
        type="text"
        placeholder="Type here..."
    />
</div>

<style>
    #container {
        overflow: hidden;
        overscroll-behavior: none;
    }
    #container > * {
        overflow: hidden;
        overscroll-behavior: none;
    }
    #container luna-console-logs {
        overflow: hidden;
        overscroll-behavior: none;
    }
    #container luna-console-logs-space {
        overflow: hidden;
        overscroll-behavior: none;
    }
</style>
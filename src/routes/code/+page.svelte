<script lang="ts">
    import { CodeEditor } from "$lib";
    import type { Monaco, Editor } from "$lib/components/CodeEditor/types.js";

    let value = $state();

    function mounted(monaco: Monaco, editor: Editor.IStandaloneCodeEditor) {
        console.log("Editor mounted");
    }
</script>

<div class="p-5 relative">
    <h1 class="text-2xl font-bold p-3">Code Editor</h1>
    <textarea class="w-full h-96 bg-base-300 p-2 px-3" bind:value={value}></textarea>
    <CodeEditor bind:value={value} class="w-full h-96" mounted={mounted}></CodeEditor>
</div>
<script lang="ts">
    import { onMount } from "svelte";
    import type { Entry } from "$lib/components/FileViewer/files.js";
    import outside from "$lib/utils/outsideclick";

    import FolderIcon from "./icons/FolderIcon.svelte";
    import FileIcon from "./icons/FileIcon.svelte";
    import { normalizeModuleId } from "vite/module-runner";

    let entries: { [key: string]: Entry } = $state({});

    onMount(async () => {
        const { getFilesNonRecursively, listEntriesDetailed } = await import(
            "$lib/components/FileViewer/files.js"
        );

        const rootDir = await navigator.storage.getDirectory();
        entries = await listEntriesDetailed(rootDir);
    });

    function dropHandler(event: DragEvent) {
        event.preventDefault();
        // Use DataTransferItemList interface to access the file(s)
        [...event.dataTransfer?.items || []].forEach((item, i) => {
            // If dropped items aren't files, reject them
            if (item.kind === "file") {
                const file = item.getAsFile();
                console.log(`dropped file[${i}].name = ${file?.name}`);
            }
        });
    }
</script>

<!-- 
    Sub component using svelte snippets 
    https://svelte.dev/docs/svelte/snippet
-->
{#snippet leaf(entry: Entry, depth: number = 0)}
    <div style="padding-left: {depth * 16}px;">
        <div
            bind:this={entry.element}
            role="input"
            ondragover={(e) => {e.preventDefault();}}
            ondragenter={(event) => {
                event.preventDefault();
                if (event.target === entry.element) {
                    entry.element?.classList.add("bg-red-200");
                    entry.element?.classList.remove("bg-base-200");
                }
            }}
            ondragleave={(event) => {
                if (event.target === entry.element) {
                    entry.element?.classList.remove("bg-red-200");
                    entry.element?.classList.add("bg-base-200");
                }
            }}
            draggable="true"
            ondrop={(event) => {
                dropHandler(event);
                entry.element?.classList.remove("bg-red-200");
                entry.element?.classList.add("bg-base-200");
            }}
            dropped="true"
            use:outside
            onoutclick={() => {/*onsole.log("clicked outside", entry.name); CONFIRMED it works*/}}
            class="mb-1 relative rounded bg-base-200 group w-full px-2"
        >
            <div class="pointer-events-none flex items-center justify-start gap-2">
                {#if entry.kind === "file"}
                    <FileIcon class="w-5" name={entry.name}></FileIcon>
                {:else}
                    <FolderIcon class="w-5" name={entry.name}></FolderIcon>
                {/if}
                <span class="whitespace-nowrap overflow-hidden overflow-ellipsis">{entry.name}</span>
                <!-- 
                <button class="bg-red-500 rounded-sm p-1" onclick={() => fetchFileAttempt(entry.relativePath)}>
                    fetch request
                </button> 
                {#if entry.kind === "file"}
                    <div
                        class="group-hover:block hidden pointer-events-none w-80 bg-white rounded px-2 p-1 top-full left-full absolute z-10 shadow-md"
                    >
                        <span>Size: {entry.size} bytes</span>
                        <span>Type: {entry.type}</span>
                        {#if entry.lastModified}
                            <span
                                >Last Modified: {new Date(
                                    entry.lastModified,
                                ).toLocaleString()}</span
                            >
                        {/if}
                        <span>Path: {entry.relativePath}</span>
                    </div>
                {/if}
                -->
            </div>
        </div>
        {#if entry.entries && Object.keys(entry.entries).length > 0}
            <div class="space-y-1">
                {#each Object.entries(entry.entries) as [subKey, subValue] (subKey)}
                    {@render leaf(subValue, depth + 1)}
                {/each}
            </div>
        {/if}
    </div>
{/snippet}

<div 
    class="p-2 space-y-1"
    role="input"
>
    {#each Object.entries(entries) as [key, value] (key)}
        {@render leaf(value, 0)}
    {/each}
</div>

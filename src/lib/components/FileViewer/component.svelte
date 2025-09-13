<script lang="ts">
    import { onMount } from "svelte";
    import type {Entry} from'$lib/components/FileViewer/files.js'

    import FolderIcon from "./icons/FolderIcon.svelte";
    import FileIcon from "./icons/FileIcon.svelte";

    let entries: { [key: string]: Entry } = $state({});

    onMount(async () => {
        const {getFilesNonRecursively, listEntriesDetailed} = await import('$lib/components/FileViewer/files.js');

        const rootDir = await navigator.storage.getDirectory();
        entries = await listEntriesDetailed(rootDir);

        /*
        const existing = document.getElementById("opfs-file-list");
        const l = document.createElement("ol");

        if (existing) existing.replaceWith(l);
        else document.body.appendChild(l);

        for await (const fileHandle of getFilesNonRecursively(rootDir)) {
            const i = document.createElement("li");
            i.innerText =
                fileHandle.kind + ": " + (fileHandle.relativePath ?? "(root)");
            if (fileHandle.kind === "file") {
                const content = await fileHandle.getFile();
                const contentStr =
                    content.type.length === 0 ||
                    content.type.startsWith("text/")
                        ? '"' +
                          (await content.slice(0, 100).text()).trim() +
                          '"'
                        : content.type;
                i.innerText += ": (" + content.size + " bytes) " + contentStr;
            }
            l.appendChild(i);
        }
        */
    });
</script>

<!-- 
    Sub component using svelte snippets 
    https://svelte.dev/docs/svelte/snippet
-->
{#snippet leaf(entry: Entry, depth: number = 0)}
    <div style="padding-left: {depth * 20}px;"
        role="input"
        aria-dropeffect="move"
        ondragenter={(event) => {
            event.target?.classList.add("bg-red-200");
            console.log("dragging into", entry.name);
        }}
        ondragleave={(event) => {
            event.target?.classList.remove("bg-red-200");
            console.log("dragging out", entry.name);
        }}
        ondrop={() => {}}
    >
        <div
            class="relative w-fit pointer-events-none flex items-center justify-start gap-2 group"
        >
            <span>
                {#if entry.kind === "file"}
                    <FileIcon class="w-5" name={entry.name}></FileIcon>
                {:else}
                    <FolderIcon class="w-5" name={entry.name}></FolderIcon>
                {/if}
            </span>
            <span>{entry.name}</span>
<!-- 
            <button
                class="bg-red-500 rounded-sm p-1"
                onclick={() => fetchFileAttempt(entry.relativePath)}
                >fetch rerquest</button
            > -->
            {#if entry.kind === "file"}
                <div
                    class=" group-hover:block hidden pointer-events-none w-80 bg-white rounded px-2 p-1 top-full left-full absolute z-10 shadow-md"
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
        </div>
        {#if entry.entries && Object.keys(entry.entries).length > 0}
            <div>
                {#each Object.entries(entry.entries) as [subKey, subValue] (subKey)}
                    {@render leaf(subValue, depth + 1)}
                {/each}
            </div>
        {/if}
    </div>
{/snippet}

<div class="p-2 border">
    {#each Object.entries(entries) as [key, value] (key)}
        {@render leaf(value, 0)}
    {/each}
</div>

<script lang="ts">
    import { onMount } from "svelte";
    import type { Entry } from "$lib/components/FileViewer/files.js";
    import outside from "$lib/utils/outsideclick";

    import FolderIcon from "./icons/FolderIcon.svelte";
    import FileIcon from "./icons/FileIcon.svelte";

    let rootEntry: Entry | undefined = $state();
    let focusedEntry: Entry | undefined =  $state();

    onMount(async () => {
        await reloadEntries();
    });
    
    async function createFolder(entry: Entry) {
        console.log("create folder", entry);
        if (entry.kind !== "directory") {
            alert("Can only create folders inside folders.");
            return;
        }

        const handle = entry.handle as FileSystemDirectoryHandle;
        await handle.getDirectoryHandle(prompt("Folder name") || "New Folder", { create: true });
    }

    async function createFile(entry: Entry) {
        console.log("create folder", entry);
        if (entry.kind !== "directory") {
            alert("Can only create files inside folders.");
            return;
        }

        const handle = entry.handle as FileSystemDirectoryHandle;
        await handle.getFileHandle(prompt("File name") || "New File.txt", { create: true });
    }

    async function reloadEntries() {
        const { listEntriesDetailed } = await import(
            "$lib/components/FileViewer/files.js"
        );
        const rootDir = await navigator.storage.getDirectory();
        rootEntry = {
            kind: "directory",
            handle: rootDir,
            name: "",
            relativePath: "",
            isEditing: false,
            entries: await listEntriesDetailed(rootDir),
        };
    }

    async function moveFile(sourcePath: string, destinationPath: string) {
        if (sourcePath === destinationPath) return;
        if (sourcePath.trim() === "") return;

        const {moveFile} = await import("$lib/components/FileViewer/files.js");

        if (focusedEntry && focusedEntry.kind === "file") {
            try {
                await moveFile(sourcePath, destinationPath);
                alert(`File moved from ${sourcePath} to ${destinationPath}`);
            } catch (error) {
                console.error("Error moving file:", error);
                alert("Failed to move file. See console for details.");
            }
        } else {
            alert("Please select a file to move.");
        }
    }

    function filesDropHandler(event: DragEvent) {
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
    <div style="padding-left: {depth > 0 ? 24 : 0}px;">
        <label
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
            draggable="{entry.isEditing ? 'false' : 'true'}"
            ondragstart={(event) => {
                focusedEntry = entry;
                event.dataTransfer?.setData("text/path", entry.relativePath);
                event.dataTransfer?.setData("text/path/name", entry.name);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.dropEffect = "move";
                console.log("drag started", entry.relativePath);
            }}
            ondrop={(event) => {
                console.log(entry.relativePath, "drop event", event);
                console.log("dataTransfer", event.dataTransfer?.getData("text/path"));
                const sourcePath = event.dataTransfer?.getData("text/path");
                if (sourcePath && entry.kind === "directory") {
                    const name = event.dataTransfer?.setData("text/path/name", entry.name);
                    const destinationPath = entry.relativePath + "/" + name;
                    console.log("moving file to", destinationPath);
                    moveFile(sourcePath, destinationPath);
                }
                filesDropHandler(event);
                entry.element?.classList.remove("bg-red-200");
                entry.element?.classList.add("bg-base-200");
            }}
            tabindex="-1"
            onkeydown={(event: KeyboardEvent) => {
                if (event.key === "Enter") {
                    // event.preventDefault()
                    // console.log("enter pressed");
                    entry.isEditing = true;
                }
                // console.log('keydown', event.key);
            }}
            onclick={(event: PointerEvent) => {
                // event.preventDefault();
                event.target && (event.target as HTMLElement).focus();
                focusedEntry = entry;
                console.log("clicked", entry.relativePath);
            }}
            dropped="true"
            use:outside
            onoutclick={() => {
                /*onsole.log("clicked outside", entry.name); CONFIRMED it works*/
                entry.isEditing = false;

                // keep focused entry so you can create new files/folders inside it
                // focusedEntry = undefined; 
            }}
            class="{focusedEntry === entry ? 'bg-base-300' : ''} focus:outline-none mb-1 relative rounded bg-base-200 group w-full pl-2 inline-block"
        >
            <label class="{entry.isEditing ? '' : 'pointer-events-none'} flex items-center justify-start gap-2 focus:outline-none">
                {#if entry.relativePath === ""}
                    <!-- container icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                {:else if entry.kind === "file"}
                    <FileIcon class="w-5" name={entry.name}></FileIcon>
                {:else}
                    <FolderIcon class="w-5" name={entry.name}></FolderIcon>
                {/if}
                {#if entry.relativePath === ""}
                    <span>Files</span>
                {:else if entry.isEditing}
                    <input
                        class="bg-transparent w-full focus:outline-none {entry.isEditing ? 'border-b border-blue-500 rounded-r' : ''}"
                        type="text"
                        bind:value={entry.name}
                        onblur={() => (entry.isEditing = false)}
                        onkeydown={(e) => {
                            console.log('keydown in input', e.key);
                            if (e.key === "Enter") {
                                entry.isEditing = false;
                            }
                        }}
                    />
                {:else}
                    <span class="whitespace-nowrap overflow-hidden overflow-ellipsis">{entry.name}</span>
                {/if}
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
                </label>
        </label>
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
    <div>
        <button onclick={() => {
            if (focusedEntry) createFolder(focusedEntry);
        }} class="btn btn-sm">
            <!-- folder icon -->
            <span>+</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
        </button>
        <button class="btn btn-sm" onclick={() => {
            if (focusedEntry) createFile(focusedEntry);
        }}>
            <!-- file icon -->
            <span>+</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V7.414a2 2 0 00-.586-1.414l-4.414-4.414A2 2 0 0014.586 1H7a2 2 0 00-2 2v16a2 2 0 002 2z" /></svg>
        </button>
        <button class="btn btn-sm" onclick={reloadEntries}>
            reload
        </button>
    </div>
    {#if !rootEntry}
        <div>Loading files...</div>
    {:else if Object.keys(rootEntry.entries || {}).length === 0}
        <div>No files found. Use the + buttons to create files or folders.</div>
    {:else}
        {@render leaf(rootEntry, 0)}
    {/if}
</div>

<script lang="ts">
    import { onMount } from "svelte";
    import type { Entry } from "$lib/components/FileViewer/files.js";
    import outside from "$lib/utils/outsideclick";

    import FolderIcon from "./icons/FolderIcon.svelte";
    import FileIcon from "./icons/FileIcon.svelte";

    interface Props {
        select: (path: string, entry: Entry) => void;
        reload: (rootEntry: Entry) => void;
    }
    let { select, reload }: Props = $props()

    const MAX_RECURSION = 100;

    interface ContextMenu {
        entry?: Entry;
        x: number;
        y: number;
    }

    let rootEntry: Entry | undefined = $state();
    let focusedEntry: Entry | undefined =  $state();
    let contextmenu: ContextMenu = $state({ open: false, entry: undefined, x: 0, y: 0 });

    onMount(async () => {
        await reloadEntries();
    });
    
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
            isDirectoryOpen: true,
            entries: await listEntriesDetailed(rootDir),
        };
        reload(rootEntry);
    }

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

    async function moveFile(sourcePath: string, destinationPath: string) {
        if (sourcePath === destinationPath) return;
        if (sourcePath.trim() === "") return;

        const {moveFile: move} = await import("$lib/components/FileViewer/files.js");

        if (focusedEntry && focusedEntry.kind === "file") {
            try {
                await move(sourcePath, destinationPath);
                alert(`File moved from ${sourcePath} to ${destinationPath}`);
            } catch (error) {
                console.error("Error moving file:", error);
                alert("Failed to move file. See console for details.");
            }
        } else {
            alert("Please select a file to move.");
        }
    }

    async function moveFolder(sourcePath: string, destinationPath: string) {
        const {moveFolder: move} = await import("$lib/components/FileViewer/files.js");
        move(sourcePath, destinationPath)
    }

    async function deleteFolder(path: string) {
        if (!confirm(`Are you sure you want to delete the folder at ${path} and all its contents?`)) {
            return;
        }

        const {deleteFolder: deleteFn} = await import("$lib/components/FileViewer/files.js");
        try {
            await deleteFn(path);
        } catch (error) {
            console.error("Error deleting folder:", error);
            alert("Failed to delete folder. See console for details.");
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
    {#if depth < MAX_RECURSION}
    <div style="padding-left: {depth > 0 ? 24 : 0}px;">
        <div
            bind:this={entry.element}
            role="input"
            ondragover={(e) => {event?.preventDefault()}}
            ondragenter={(event) => {
                event.preventDefault()
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
                event.dataTransfer.setData("opfs/kind", entry.kind)
                event.dataTransfer.setData("opfs/path", entry.relativePath);
                event.dataTransfer.setData("opfs/path/name", entry.name);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.dropEffect = "move";
                console.log("drag started", entry.relativePath);
            }}
            ondragend={() => {
                console.log('ended drag')
            }}
            ondrop={(event) => {
                console.log(entry.relativePath, "drop event", event);
                const kind = event.dataTransfer.getData("opfs/kind", entry.kind)
                const path = event.dataTransfer.getData("opfs/path");
                const name = event.dataTransfer?.getData("opfs/path/name", entry.name);

                // can only drop onto a folder
                if (path && entry.kind === "directory") {

                    // if dropping a folder
                    if (kind === "directory") {
                        const destinationPath = entry.relativePath + "/" + name;
                        moveFolder(path, destinationPath);
                    } 
                    // if dropping a file
                    else {
                        const destinationPath = entry.relativePath + "/" + name;
                        moveFile(path, destinationPath);
                    }
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
                    entry.isEditing = ! entry.isEditing;
                }
            }}
            onclick={(event: PointerEvent) => {
                // event.preventDefault();
                select(entry.relativePath, entry)
                event.target && (event.target as HTMLElement).focus();
                focusedEntry = entry;
                console.log("clicked", entry.relativePath);
            }}
            oncontextmenu={(event) => {
                event.preventDefault();
                focusedEntry = entry;
                contextmenu.entry = entry;
                contextmenu.x = event.clientX;
                contextmenu.y = event.clientY;
                console.log("right click", entry.relativePath);
            }}
            dropped="true"
            use:outside
            onoutclick={() => {
                /*onsole.log("clicked outside", entry.name); CONFIRMED it works*/
                entry.isEditing = false;

                // keep focused entry so you can create new files/folders inside it
                // focusedEntry = undefined;
            }}
            class="{focusedEntry === entry ? 'bg-base-300' : ''} focus:outline-none relative rounded bg-base-200 group w-full pl-2 inline-block"
        >
            <div class="{entry.isEditing ? '' : 'pointer-events-none'} relative flex items-center justify-start gap-2 focus:outline-none">
                {#if entry.relativePath === ""}
                    <!-- container icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                {:else if entry.kind === "file"}
                    <FileIcon class="w-5" name={entry.name}></FileIcon>
                {:else}
                    <FolderIcon class="w-5" name={entry.name} bind:open={entry.isDirectoryOpen}></FolderIcon>
                {/if}
                {#if entry.relativePath === ""}
                    <span>Files</span>
                {:else if !entry.isEditing}
                    <span class="whitespace-nowrap overflow-hidden overflow-ellipsis">{entry.name}</span>
                {/if}

                <input
                    bind:this={entry.inputElement}
                    class="{entry.isEditing ? 'block' : 'hidden'} bg-transparent w-full focus:outline-none {entry.isEditing ? 'border-b border-blue-500 rounded-r' : ''}"
                    type="text"
                    bind:value={entry.name}
                    onblur={() => (entry.isEditing = false)}
                />

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
            <button onclick={() => {
                // console.log('toggling open for', entry.name);
                entry.isDirectoryOpen = !entry.isDirectoryOpen;
            }} class="inline-block absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-base-300 {entry.entries && Object.keys(entry.entries).length > 0 ? '' : 'invisible'}">
                {#if entry.isDirectoryOpen}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                {/if}
            </button>
        </div>
        {#if entry.entries && Object.keys(entry.entries).length > 0}
            <div class="{entry.isDirectoryOpen ? 'block' : 'hidden'}">
                {#each Object.entries(entry.entries) as [subKey, subValue] (subKey)}
                    {@render leaf(subValue, depth + 1)}
                {/each}
            </div>
        {/if}
    </div>
    {/if}
{/snippet}

<div 
    class="p-2 space-y-1 relative"
    role="input"
>
    <!-- Context menu that opens when right clicking -->
     {#if contextmenu.entry}
        <div
            style=" left:{contextmenu.x}px; top:{contextmenu.y - 32}px"
            class="absolute z-10 bg-base-100 card rounded p-2 space-y-1 shadow-md w-48"
            use:outside
            onoutclick={() => {
                contextmenu.entry = undefined;
            }}
            >
            <button class="btn btn-sm w-full" onclick={(event) => {
                contextmenu.entry!.isEditing = true;
                console.log("input element", contextmenu.entry?.inputElement);
                contextmenu.entry.inputElement.focus();
                contextmenu.entry.inputElement.setSelectionRange(contextmenu.entry.name.length, contextmenu.entry.name.length);
                contextmenu.entry = undefined;
            }}>Rename</button>
            {#if contextmenu.entry!.kind === "directory"}
                <button class="btn btn-sm w-full" onclick={(event) => {
                    console.log('new folder clicked');
                    createFolder(contextmenu.entry as Entry);
                    contextmenu.entry = undefined;
                }}>New Folder</button>
                <button class="btn btn-sm w-full" onclick={(event) => {
                    console.log('new file clicked');
                    createFile(contextmenu.entry as Entry);
                    contextmenu.entry = undefined;
                }}>New File</button>
                <button class="btn btn-sm w-full" onclick={(event) => {
                    console.log('delete folder clicked');
                    deleteFolder(contextmenu.entry!.relativePath);
                    contextmenu.entry = undefined;
                }}>Delete Folder</button>
            {/if}
        </div>
    {/if}
    <div>
        <button onclick={() => {
            createFolder(focusedEntry || rootEntry!);
        }} class="btn btn-sm">
            <!-- folder icon -->
            <span>+</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
        </button>
        <button class="btn btn-sm" onclick={() => {
            createFile(focusedEntry || rootEntry!);
        }}>
            <!-- file icon -->
            <span>+</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V7.414a2 2 0 00-.586-1.414l-4.414-4.414A2 2 0 0014.586 1H7a2 2 0 00-2 2v16a2 2 0 002 2z" /></svg>
        </button>
        <button class="btn btn-sm" onclick={reloadEntries}>
            reload
        </button>
    </div>
    {#if rootEntry}
        {@render leaf(rootEntry, 0)}
    {/if}
    {#if rootEntry && Object.keys(rootEntry.entries || {}).length === 0}
        <div>No files found. Use the + buttons to create files or folders.</div>
    {/if}
</div>

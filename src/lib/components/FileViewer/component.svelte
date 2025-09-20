<script lang="ts">
    import { onMount } from "svelte";
    import type { Entry } from "$lib/components/FileViewer/files.js";

    import outside from "$lib/utils/outsideclick/index.js";

    import FolderIcon from "./icons/FolderIcon.svelte";
    import FileIcon from "./icons/FileIcon.svelte";

    // Enhanced Props Interface with cohesive callbacks
    interface Props {
        select: (entry: Entry) => void;
        onFileCreated?: (parentPath: string, fileName: string) => void;
        onFolderCreated?: (parentPath: string, folderName: string) => void;
        onFileRenamed?: (oldPath: string, newPath: string) => void;
        onFolderRenamed?: (oldPath: string, newPath: string) => void;
        onFileMoved?: (sourcePath: string, destinationPath: string) => void;
        onFolderMoved?: (sourcePath: string, destinationPath: string) => void;
        onFileDeleted?: (path: string) => void;
        onFolderDeleted?: (path: string) => void;
        onEntriesReloaded?: (rootEntry: Entry) => void;
        onError?: (error: Error, operation: string) => void;
    }

    let { 
        select, 
        onFileCreated,
        onFolderCreated,
        onFileRenamed,
        onFolderRenamed,
        onFileMoved,
        onFolderMoved,
        onFileDeleted,
        onFolderDeleted,
        onEntriesReloaded,
        onError
    }: Props = $props();

    // Logical Data Structures
    interface AppState {
        rootEntry: Entry | undefined;
        focusedEntry: Entry | undefined;
        contextMenu: {
            entry?: Entry;
            x: number;
            y: number;
            isOpen: boolean;
        };
        dragState: {
            isDragging: boolean;
            draggedEntry?: Entry;
        };
    }

    const MAX_RECURSION = 100;

    // Centralized state management
    let state: AppState = $state({
        rootEntry: undefined,
        focusedEntry: undefined,
        contextMenu: {
            entry: undefined,
            x: 0,
            y: 0,
            isOpen: false
        },
        dragState: {
            isDragging: false,
            draggedEntry: undefined
        }
    });

    // Lifecycle
    onMount(async () => {
        await loadAllEntries();
    });

    // Core Operations
    async function loadAllEntries() {
        try {
            const { listEntriesDetailed } = await import("$lib/components/FileViewer/files.js");
            const rootDir = await navigator.storage.getDirectory();
            
            state.rootEntry = {
                kind: "directory",
                handle: rootDir,
                name: "",
                relativePath: "",
                isEditing: false,
                isDirectoryOpen: true,
                entries: await listEntriesDetailed(rootDir),
            };
            
            onEntriesReloaded?.(state.rootEntry);
        } catch (error) {
            handleError(error as Error, "loading entries");
        }
    }

    async function createNewFolder(parentEntry: Entry) {
        if (parentEntry.kind !== "directory") {
            handleError(new Error("Can only create folders inside directories"), "creating folder");
            return;
        }

        try {
            const folderName = prompt("Folder name") || "New Folder";
            const handle = parentEntry.handle as FileSystemDirectoryHandle;
            await handle.getDirectoryHandle(folderName, { create: true });
            
            onFolderCreated?.(parentEntry.relativePath, folderName);
            await loadAllEntries(); // Refresh to show new folder
        } catch (error) {
            handleError(error as Error, "creating folder");
        }
    }

    async function createNewFile(parentEntry: Entry) {
        if (parentEntry.kind !== "directory") {
            handleError(new Error("Can only create files inside directories"), "creating file");
            return;
        }

        try {
            const fileName = prompt("File name") || "New File.txt";
            const handle = parentEntry.handle as FileSystemDirectoryHandle;
            await handle.getFileHandle(fileName, { create: true });
            
            onFileCreated?.(parentEntry.relativePath, fileName);
            await loadAllEntries(); // Refresh to show new file
        } catch (error) {
            handleError(error as Error, "creating file");
        }
    }

    async function renameEntry(entry: Entry, newName: string) {
        console.log("renameEntry: starting")

        if (!newName || newName === entry.handle.name) {
            console.log("renameEntry: starting")
            return;
        }

        const originalName = entry.handle.name;
        const basePath = entry.relativePath.slice(0, entry.relativePath.length - originalName.length);
        const newPath = basePath + newName;

        try {
            console.log("renameEntry: attempting to rename")
            if (entry.kind === "file") {
                await moveFileOperation(entry.relativePath, newPath);
                onFileRenamed?.(entry.relativePath, newPath);
            } else {
                await moveFolderOperation(entry.relativePath, newPath);
                onFolderRenamed?.(entry.relativePath, newPath);
            }
            await loadAllEntries(); // Refresh to show changes
        } catch (error) {
            handleError(error as Error, `renaming ${entry.kind}`);
        }
    }

    async function moveFileOperation(sourcePath: string, destinationPath: string) {
        if (sourcePath === destinationPath || !sourcePath.trim()) return;

        try {
            const { moveFile } = await import("$lib/components/FileViewer/files.js");
            await moveFile(sourcePath, destinationPath);
            onFileMoved?.(sourcePath, destinationPath);
            await loadAllEntries(); // Refresh to show changes
        } catch (error) {
            handleError(error as Error, "moving file");
        }
    }

    async function moveFolderOperation(sourcePath: string, destinationPath: string) {
        if (sourcePath === destinationPath || !sourcePath.trim()) return;

        try {
            const { moveFolder } = await import("$lib/components/FileViewer/files.js");
            await moveFolder(sourcePath, destinationPath);
            onFolderMoved?.(sourcePath, destinationPath);
            await loadAllEntries(); // Refresh to show changes
        } catch (error) {
            handleError(error as Error, "moving folder");
        }
    }

    async function deleteEntryOperation(entry: Entry) {
        const confirmMessage = entry.kind === "directory" 
            ? `Are you sure you want to delete the folder "${entry.name}" and all its contents?`
            : `Are you sure you want to delete the file "${entry.name}"?`;
        
        if (!confirm(confirmMessage)) return;

        try {
            if (entry.kind === "directory") {
                const { deleteFolder } = await import("$lib/components/FileViewer/files.js");
                await deleteFolder(entry.relativePath);
                onFolderDeleted?.(entry.relativePath);
            } else {
                const { deleteFile } = await import("$lib/components/FileViewer/files.js");
                await deleteFile(entry.relativePath);
                onFileDeleted?.(entry.relativePath);
            }
            await loadAllEntries(); // Refresh to show changes
        } catch (error) {
            handleError(error as Error, `deleting ${entry.kind}`);
        }
    }

    // Event Handlers
    function clickEvent(entry: Entry, event: MouseEvent) {
        select(entry);
        if (event.target) {
            (event.target as HTMLElement).focus();
        }
        state.focusedEntry = entry;
    }

    function contextMenuEvent(entry: Entry, event: MouseEvent) {
        event.preventDefault();
        state.focusedEntry = entry;
        state.contextMenu = {
            entry,
            x: event.clientX,
            y: event.clientY,
            isOpen: true
        };
    }

    function keydownEvent(entry: Entry, event: KeyboardEvent) {
        console.log("renaming attempt")
        if (event.key === "Enter" && entry.isEditing) {
            entry.isEditing = false;
            renameEntry(entry, entry.name);
            console.log("renameEntry successfully called")
        }
    }

    function dragStartEvent(entry: Entry, event: DragEvent) {
        if (!event.dataTransfer) return;
        
        state.focusedEntry = entry;
        state.dragState.isDragging = true;
        state.dragState.draggedEntry = entry;
        
        event.dataTransfer.setData("opfs/kind", entry.kind);
        event.dataTransfer.setData("opfs/path", entry.relativePath);
        event.dataTransfer.setData("opfs/name", entry.name);
        event.dataTransfer.effectAllowed = "move";
    }

    function dragEndEvent() {
        state.dragState.isDragging = false;
        state.dragState.draggedEntry = undefined;
    }

    function dragOverEvent(event: DragEvent) {
        event.preventDefault();
    }

    function dragEnterEvent(entry: Entry, event: DragEvent) {
        event.preventDefault();
        if (event.target === entry.element && entry.kind === "directory") {
            entry.element?.classList.add("bg-red-200");
            entry.element?.classList.remove("bg-base-200");
        }
    }

    function dragLeaveEvent(entry: Entry, event: DragEvent) {
        if (event.target === entry.element) {
            entry.element?.classList.remove("bg-red-200");
            entry.element?.classList.add("bg-base-200");
        }
    }

    function dropEvent(entry: Entry, event: DragEvent) {
        event.preventDefault();
        
        if (!event.dataTransfer) return;
        
        const kind = event.dataTransfer.getData("opfs/kind");
        const sourcePath = event.dataTransfer.getData("opfs/path");
        const name = event.dataTransfer.getData("opfs/name");

        // Can only drop onto directories
        if (sourcePath && entry.kind === "directory") {
            const destinationPath = entry.relativePath + "/" + name;
            
            if (kind === "directory") {
                moveFolderOperation(sourcePath, destinationPath);
            } else {
                moveFileOperation(sourcePath, destinationPath);
            }
        }

        // Handle external file drops
        handleExternalFileDrop(entry, event);
        
        // Clean up visual feedback
        entry.element?.classList.remove("bg-red-200");
        entry.element?.classList.add("bg-base-200");
    }

    async function handleExternalFileDrop(entry: Entry, event: DragEvent) {
        console.log("handleExternalFileDrop. files:", event.dataTransfer?.files)

        if (!event.dataTransfer?.files || entry.kind !== "directory") return;
        const files = event.dataTransfer.files;

        try {
            const { uploadFile } = await import("$lib/components/FileViewer/files.js");        
            
            for (let i = 0; i < files.length; i++) {
                console.log("Processing file:", files[i].name);
                const destinationPath = `${entry.relativePath}/${files[i].name}`;
                await uploadFile(files[i], destinationPath);
                onFileCreated?.(entry.relativePath, files[i].name);
            }
            
            await loadAllEntries(); // Refresh to show new files
        } catch (error) {
            handleError(error as Error, "uploading external files");
        }
    }

    function outsideClickEvent(entry: Entry) {
        if (entry.isEditing) {
            entry.isEditing = false;
            // Reset name if editing was cancelled
            entry.name = entry.handle.name;
        }
    }

    function closeContextMenu() {
        state.contextMenu.isOpen = false;
        state.contextMenu.entry = undefined;
    }

    function startRename() {
        if (state.contextMenu.entry) {
            state.contextMenu.entry.isEditing = true;
            closeContextMenu();
            
            // Focus input after next tick
            setTimeout(() => {
                state.contextMenu.entry?.inputElement?.focus();
            }, 0);
        }
    }

    // Utility Functions
    function handleError(error: Error, operation: string) {
        console.error(`Error ${operation}:`, error);
        onError?.(error, operation);
        alert(`Failed to ${operation}. See console for details.`);
    }

    function toggleDirectory(entry: Entry) {
        entry.isDirectoryOpen = !entry.isDirectoryOpen;
    }

    function getTargetEntry(): Entry {
        return state.focusedEntry || state.rootEntry!;
    }
</script>

<!-- Main Template -->
{#snippet leaf(entry: Entry, depth: number = 0)}
    {#if depth < MAX_RECURSION}
    <div style="padding-left: {depth > 0 ? 24 : 0}px;">
        <div
            bind:this={entry.element}
            role="button"
            tabindex="0"
            draggable={!entry.isEditing}
            ondragover={dragOverEvent}
            ondragenter={(event: DragEvent) => dragEnterEvent(entry, event)}
            ondragleave={(event: DragEvent) => dragLeaveEvent(entry, event)}
            ondragstart={(event: DragEvent) => dragStartEvent(entry, event)}
            ondragend={dragEndEvent}
            ondrop={(event: DragEvent) => dropEvent(entry, event)}
            onkeydown={(event: KeyboardEvent) => keydownEvent(entry, event)}
            onclick={(event: MouseEvent) => clickEvent(entry, event)}
            oncontextmenu={(event: MouseEvent) => contextMenuEvent(entry, event)}
            use:outside
            onoutclick={() => outsideClickEvent(entry)}
            class="{state.focusedEntry === entry ? 'bg-base-300' : ''} focus:outline-none relative rounded bg-base-200 group w-full pl-2 inline-block hover:bg-base-250 transition-colors"
            aria-label={`${entry.kind}: ${entry.name || 'Root'}`}
        >
            <div class="{entry.isEditing ? '' : 'pointer-events-none'} relative flex items-center justify-start gap-2 focus:outline-none">
                {#if entry.relativePath === ""}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                {:else if entry.kind === "file"}
                    <FileIcon class="w-5" name={entry.name} />
                {:else}
                    <FolderIcon class="w-5" name={entry.name} bind:open={entry.isDirectoryOpen} />
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
                    onblur={() => { entry.isEditing = false; }}
                />
            </div>
            
            {#if entry.entries && Object.keys(entry.entries).length > 0}
                <button 
                    onclick={() => toggleDirectory(entry)}
                    class="inline-block absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-base-300"
                    aria-label="{entry.isDirectoryOpen ? 'Collapse' : 'Expand'} directory"
                >
                    {#if entry.isDirectoryOpen}
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    {/if}
                </button>
            {/if}
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

<div class="p-2 space-y-1 relative" role="region" aria-label="File Explorer">
    <!-- Context Menu -->
    {#if state.contextMenu.isOpen && state.contextMenu.entry}
        <div
            style="left:{state.contextMenu.x}px; top:{state.contextMenu.y - 32}px"
            class="absolute z-10 bg-base-100 card rounded p-2 space-y-1 shadow-md w-48"
            use:outside
            onoutclick={closeContextMenu}
            role="menu"
        >
            <button class="btn btn-sm w-full" onclick={startRename} role="menuitem">
                Rename
            </button>
            {#if state.contextMenu.entry.kind === "directory"}
                <button class="btn btn-sm w-full" onclick={() => {createNewFolder(state.contextMenu.entry!); closeContextMenu();}} role="menuitem">
                    New Folder
                </button>
                <button class="btn btn-sm w-full" onclick={() => {createNewFile(state.contextMenu.entry!); closeContextMenu();}} role="menuitem">
                    New File
                </button>
                <button class="btn btn-sm w-full" onclick={() => {deleteEntryOperation(state.contextMenu.entry!); closeContextMenu();}} role="menuitem">
                    Delete Folder
                </button>
            {:else}
                <button class="btn btn-sm w-full" onclick={() => {deleteEntryOperation(state.contextMenu.entry!); closeContextMenu();}} role="menuitem">
                    Delete File
                </button>
            {/if}
        </div>
    {/if}

    <!-- Toolbar -->
    <div class="flex gap-2" role="toolbar">
        <button 
            class="btn btn-sm" 
            onclick={() => createNewFile(getTargetEntry())}
            title="Create new file"
        >
            <span>+</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V7.414a2 2 0 00-.586-1.414l-4.414-4.414A2 2 0 0014.586 1H7a2 2 0 00-2 2v16a2 2 0 002 2z" />
            </svg>
        </button>
        <button 
            class="btn btn-sm" 
            onclick={() => createNewFolder(getTargetEntry())}
            title="Create new folder"
        >
            <span>+</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
        </button>
        <button class="btn btn-sm" onclick={loadAllEntries} title="Reload files">
            Reload
        </button>
    </div>

    <!-- File Tree -->
    {#if state.rootEntry}
        {@render leaf(state.rootEntry, 0)}
    {/if}

    <!-- Empty State -->
    {#if state.rootEntry && Object.keys(state.rootEntry.entries || {}).length === 0}
        <div class="text-center text-gray-500 py-8">
            No files found. Use the + buttons to create files or folders.
        </div>
    {/if}
</div>
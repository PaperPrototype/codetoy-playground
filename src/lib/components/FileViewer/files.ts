
if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) {
    throw new Error('The File System Access API is not supported in this environment.');
}

import FileWorker from '$lib/components/FileViewer/worker?worker';
const fileWorker = new FileWorker();
const MAX_RECURSION = 100;

import { findFileHandle, findFileHandleParent } from './shared.js';

// DOCS https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system

export interface NonRecursiveEntry {
    path: string; 
    parentDir: FileSystemDirectoryHandle;
    depth: number;
}

// from https://aweirdimagination.net/2024/01/14/debugging-opfs/
export async function* getFilesNonRecursively(dir: FileSystemDirectoryHandle): AsyncGenerator<(NonRecursiveEntry & FileSystemFileHandle) | (NonRecursiveEntry & FileSystemDirectoryHandle), void, unknown> {
    const stack = [[dir, "", undefined, 0]];
    while (stack.length) {
        const [current, prefix, parentDir, depth]:any = stack.pop();
        current.path = prefix + current.name;
        current.parentDir = parentDir;
        current.depth = depth;
        yield current;

        if (current.kind === "directory") {
            for await (const handle of current.values()) {
                stack.push([handle,
                    prefix + current.name + "/",
                    current,
                    depth + 1]);
            }
        }
    }
}

export function uploadFile(file: File, filepath: string) {
    fileWorker.postMessage({ type: "upload", payload: { file, filepath } });
}

export function saveTextFile(text: string, filepath: string) {
    fileWorker.postMessage({ type: "savetext", payload: { text, filepath } });
}

export async function moveFile(sourcePath: string, destinationPath: string): Promise<void> {
   fileWorker.postMessage({ type: "moveFile", payload: {sourcePath, destinationPath}})
}

export function moveFolder(sourcePath: string, destinationPath: string) {
    fileWorker.postMessage({ type: "moveFolder", payload: { sourcePath, destinationPath } });
}

export async function deleteFile(filepath: string) {
    const parts = filepath.split('/');
    const filename = parts.pop();

    if (!filename) return undefined;

    try {
        const parentFolder = await findFileHandleParent(filepath);
        if (parentFolder) return await parentFolder.removeEntry(filename);
    } catch (error) {
        console.error(`Error clearing folder of ${filepath}:`, error);
        throw error;
    }
}

export async function deleteFolder(path: string) {
    // fileWorker.postMessage({ type: "deleteFolder", payload: { path } });
    // const { path } = payload;

    try {
        const opfsRoot = await navigator.storage.getDirectory()
        // Get source directory
        const sourcePathParts = path.split('/').slice(1); // remove empty first part
        let dir = opfsRoot;
        let parent = opfsRoot;
        for (const part of sourcePathParts) {
            parent = dir; // previous value of dir
            dir = await dir.getDirectoryHandle(part, { create: false });
        }

        await removeDirectoryFast(dir);

        // cannot delete root folder
        if (path !== '') await parent.removeEntry(dir.name);
    } catch (error) {
        console.error(`Error clearing folder of ${path}:`, error);
        throw error;
    }
}

async function removeDirectoryFast(dir: FileSystemDirectoryHandle) {
    const toDelete: any[] = [];
    let maxDepth = 0;
    for await (const fileHandle
        of getFilesNonRecursively(dir)) {
        maxDepth = Math.max(maxDepth, fileHandle.depth);
        toDelete.push(fileHandle);
    }
    async function deleteAtDepth(depth: number) {
        for (const f of toDelete) {
            if (f.depth === depth) {
                await f.parentDir.removeEntry(f.name,
                    { recursive: true });
            }
        }
    }
    const increment = 500; // Works empirically in Firefox.
    for (let depth = maxDepth; depth > 1; depth -= increment) {
        await deleteAtDepth(depth);
    }
    await deleteAtDepth(1);
}

export async function fileExists(filepath: string): Promise<boolean> {
    const fileHandle = await findFileHandle(filepath);
    return fileHandle !== undefined;
}

export async function listContents(directoryHandle: FileSystemDirectoryHandle | undefined = undefined, depth: number | undefined = undefined) {
    if (!directoryHandle && !depth) console.log("CONTENTS OF ROOT DIRECTORY:");

    depth = depth || 1;
    directoryHandle = directoryHandle || await navigator.storage.getDirectory();
    // @ts-ignore: 'values' is a valid method on FileSystemDirectoryHandle
    const entries = await directoryHandle.values();

    for await (const entry of entries) {
        // Add proper indentation based on the depth
        const indentation = '    '.repeat(depth);

        if (entry.kind === 'directory') {
            // If it's a directory, log its name 
            // and recursively list its contents
            console.log(`${indentation}${entry.name}/`);
            await listContents(entry, depth + 1);
        } else {
            // If it's a file, log its name
            console.log(`${indentation}${entry.name}`);
        }
    }
}

export type Entry = { element?: HTMLElement, isEditing: boolean, inputElement?: HTMLInputElement, isDirectoryOpen: boolean, name: string, kind: string, size?: number, type?: string, lastModified?: number, relativePath: string, entries?: { [key: string]: Entry }, handle: FileSystemFileHandle | FileSystemDirectoryHandle }

export async function listEntriesDetailed(directoryHandle: FileSystemDirectoryHandle, depth = 0, relativePath = ''): Promise<{ [key: string]: Entry }> {

    function sort(entries: { [key: string]: Entry }): { [key: string]: Entry } {
        return Object.fromEntries(
            Object.entries(entries).sort(([nameA, entryA], [nameB, entryB]) => {
                if (entryA.kind === 'directory' && entryB.kind === 'file') return -1;
                if (entryA.kind === 'file' && entryB.kind === 'directory') return 1;
                return nameA.localeCompare(nameB);
            })
        );
    }

    const fileHandles: { handle: FileSystemFileHandle, nestedPath: string }[] = [];
    const directoryHandles = [];
    const entries: any = {};

    if (depth >= MAX_RECURSION) return entries;

    // Get an iterator of the files and folders in the directory.
    // @ts-ignore: 'values' is a valid method on FileSystemDirectoryHandle
    const directoryIterator = directoryHandle.values();
    const directoryEntryPromises = [];
    for await (const handle of directoryIterator) {
        const nestedPath = `${relativePath}/${handle.name}`;
        if (handle.kind === 'file') {
            fileHandles.push({ handle, nestedPath });
            directoryEntryPromises.push(
                handle.getFile().then((file: any) => {
                    return {
                        name: handle.name,
                        kind: handle.kind,
                        size: file.size,
                        type: file.type,
                        lastModified: file.lastModified,
                        relativePath: nestedPath,
                        isContextMenuOpen: false,
                        isEditing: false,
                        handle
                    };
                }),
            );
        } else if (handle.kind === 'directory') {
            directoryHandles.push({ handle, nestedPath });
            directoryEntryPromises.push(
                (async () => {
                    return {
                        name: handle.name,
                        kind: handle.kind,
                        relativePath: nestedPath,
                        isContextMenuOpen: false,
                        entries:
                            await listEntriesDetailed(handle, depth + 1, nestedPath),
                        handle,
                        isDirectoryOpen: true,
                        isEditing: false
                    };
                })(),
            );
        }
    }
    const directoryEntries = await Promise.all(directoryEntryPromises);
    directoryEntries.forEach((directoryEntry: any) => {
        entries[directoryEntry.name] = directoryEntry;
    });

    return sort(entries);
};

/*
files.ts
- uses worker.ts for heavy file operations
- waits for feedback from the worker to check if the operation succeeded
*/

if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) {
    throw new Error('The File System Access API is not supported in this environment.');
}

import FileWorker from '$lib/components/FileViewer/worker?worker';
import { findFileHandle, findFileHandleParent, getFilesNonRecursively, removeDirectoryFast } from './shared.js';

const fileWorker = new FileWorker();
const MAX_RECURSION = 100;

// Worker message handling with promises
interface PendingOperation {
    resolve: (value?: any) => void;
    reject: (error: Error) => void;
}

const pendingOperations = new Map<string, PendingOperation>();
let operationId = 0;

// Handle worker responses
fileWorker.onmessage = (event) => {
    const { id, success, error } = event.data;
    
    if (id && pendingOperations.has(id)) {
        const { resolve, reject } = pendingOperations.get(id)!;
        pendingOperations.delete(id);
        
        if (success) {
            resolve();
        } else {
            console.error(`Worker operation failed:`, error);
            reject(new Error(error || 'Worker operation failed'));
        }
    }
};

// Helper function to send messages to worker and wait for response
function sendWorkerMessage(type: string, payload?: any): Promise<void> {
    return new Promise((resolve, reject) => {
        const id = (++operationId).toString();
        pendingOperations.set(id, { resolve, reject });
        
        fileWorker.postMessage({ id, type, payload });
        
        // Timeout after 30 seconds
        setTimeout(() => {
            if (pendingOperations.has(id)) {
                pendingOperations.delete(id);
                reject(new Error('Worker operation timeout'));
            }
        }, 30000);
    });
}

// Export types
export interface NonRecursiveEntry {
    path: string; 
    parentDir: FileSystemDirectoryHandle;
    depth: number;
}

export type Entry = { 
    element?: HTMLElement, 
    isEditing: boolean, 
    inputElement?: HTMLInputElement, 
    isDirectoryOpen: boolean, 
    name: string, 
    kind: string, 
    size?: number, 
    type?: string, 
    lastModified?: number, 
    relativePath: string, 
    entries?: { [key: string]: Entry }, 
    handle: FileSystemFileHandle | FileSystemDirectoryHandle 
};

// Public API functions
export async function uploadFile(file: File, filepath: string): Promise<void> {
    return sendWorkerMessage("upload", { file, filepath });
}

export async function saveTextFile(text: string, filepath: string): Promise<void> {
    return sendWorkerMessage("savetext", { text, filepath });
}

export async function moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    return sendWorkerMessage("moveFile", { sourcePath, destinationPath });
}

export async function moveFolder(sourcePath: string, destinationPath: string): Promise<void> {
    return sendWorkerMessage("moveFolder", { sourcePath, destinationPath });
}

export async function deleteFile(filepath: string): Promise<void> {
    return sendWorkerMessage("deleteFile", { path: filepath });
}

export async function deleteFolder(path: string): Promise<void> {
    // Handle root directory edge case in main thread for immediate feedback
    if (!path.trim()) {
        throw new Error('Cannot delete root directory');
    }
    
    return sendWorkerMessage("deleteFolder", { path });
}

// Utility functions that don't need worker
export async function fileExists(filepath: string): Promise<boolean> {
    const fileHandle = await findFileHandle(filepath);
    return fileHandle !== undefined;
}

export async function listContents(directoryHandle: FileSystemDirectoryHandle | undefined = undefined, depth: number | undefined = undefined): Promise<void> {
    if (!directoryHandle && !depth) console.log("CONTENTS OF ROOT DIRECTORY:");

    depth = depth || 1;
    directoryHandle = directoryHandle || await navigator.storage.getDirectory();
    
    // @ts-ignore: 'values' is a valid method on FileSystemDirectoryHandle
    for await (const entry of directoryHandle.values()) {
        const indentation = '    '.repeat(depth);

        if (entry.kind === 'directory') {
            console.log(`${indentation}${entry.name}/`);
            await listContents(entry, depth + 1);
        } else {
            console.log(`${indentation}${entry.name}`);
        }
    }
}

export async function listEntriesDetailed(directoryHandle: FileSystemDirectoryHandle, depth = 0, relativePath = ''): Promise<{ [key: string]: Entry }> {
    
    function sortEntries(entries: { [key: string]: Entry }): { [key: string]: Entry } {
        return Object.fromEntries(
            Object.entries(entries).sort(([nameA, entryA], [nameB, entryB]) => {
                if (entryA.kind === 'directory' && entryB.kind === 'file') return -1;
                if (entryA.kind === 'file' && entryB.kind === 'directory') return 1;
                return nameA.localeCompare(nameB);
            })
        );
    }

    const entries: { [key: string]: Entry } = {};

    if (depth >= MAX_RECURSION) return entries;

    // @ts-ignore: 'values' is a valid method on FileSystemDirectoryHandle
    const directoryEntryPromises: Promise<Entry>[] = [];
    
    //@ts-ignore
    for await (const handle of directoryHandle.values()) {
        const nestedPath = `${relativePath}/${handle.name}`;
        
        if (handle.kind === 'file') {
            directoryEntryPromises.push(
                handle.getFile().then((file: File) => ({
                    name: handle.name,
                    kind: handle.kind,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    relativePath: nestedPath,
                    isEditing: false,
                    isDirectoryOpen: false,
                    handle
                }))
            );
        } else if (handle.kind === 'directory') {
            directoryEntryPromises.push(
                (async (): Promise<Entry> => ({
                    name: handle.name,
                    kind: handle.kind,
                    relativePath: nestedPath,
                    entries: await listEntriesDetailed(handle, depth + 1, nestedPath),
                    handle,
                    isDirectoryOpen: true,
                    isEditing: false
                }))()
            );
        }
    }
    
    const directoryEntries = await Promise.all(directoryEntryPromises);
    directoryEntries.forEach((directoryEntry) => {
        entries[directoryEntry.name] = directoryEntry;
    });

    return sortEntries(entries);
}
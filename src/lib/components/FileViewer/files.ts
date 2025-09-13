
if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) {
    throw new Error('The File System Access API is not supported in this environment.');
}

import FileWorker from '$lib/components/FileViewer/worker?worker';
const fileWorker = new FileWorker();

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
        const [current, prefix, parentDir, depth] = stack.pop();
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

export function uploadFile(file: File, filepath: string): boolean {
    fileWorker.postMessage({ type: "upload", payload: { file, filepath } });
    return true;
}

export async function moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    // Find the source file handle
    const sourceFileHandle = await findFileHandle(sourcePath);
    if (!sourceFileHandle) {
        throw new Error(`Source file not found: ${sourcePath}`);
    }

    // Read the file contents
    const file = await sourceFileHandle.getFile();

    // Find/create the destination parent directory
    const destParent = await findFileHandleParent(destinationPath);
    if (!destParent) {
        throw new Error(`Destination parent directory not found: ${destinationPath}`);
    }

    // Get the destination filename
    const destParts = destinationPath.split('/');
    const destFilename = destParts.pop();
    if (!destFilename) {
        throw new Error(`Invalid destination path: ${destinationPath}`);
    }

    // Create the destination file and write contents
    uploadFile(file, destinationPath);

    // Remove the source file
    const sourceParent = await findFileHandleParent(sourcePath);
    if (sourceParent) {
        const sourceParts = sourcePath.split('/');
        const sourceFilename = sourceParts.pop();
        if (sourceFilename) {
            await sourceParent.removeEntry(sourceFilename);
        }
    }
}

export function moveFolder(sourcePath: string, destinationPath: string): boolean {
    fileWorker.postMessage({ type: "moveFolder", payload: { sourcePath, destinationPath } });
    return true;
}

export async function findFileHandleParent(filepath: string): Promise<FileSystemDirectoryHandle | undefined> {
    const opfsRoot = await navigator.storage.getDirectory();
    const parts = filepath.split('/');
    parts.pop(); // remove the filename from the path

    try {
        let currentDir: FileSystemDirectoryHandle = opfsRoot;
        for (const part of parts) {
            if (part) {
                currentDir = await currentDir.getDirectoryHandle(part, { create: false });
            }
        }
        return currentDir;
    } catch (error) {
        console.error(`Could not get file handle for: ${filepath}`, error);
        return undefined;
    }
}

export async function findFileHandle(filepath: string): Promise<FileSystemFileHandle | undefined> {
    const parts = filepath.split('/');
    const filename = parts.pop();

    if (!filename) return undefined;

    try {
        let currentDir = await findFileHandleParent(filepath);
        if (currentDir) {
            return await currentDir.getFileHandle(filename, { create: false });
        }
        return undefined;
    } catch (error) {
        console.error(`Could not get file handle for: ${filepath}`, error);
        return undefined;
    }
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

export type Entry = { element?: HTMLElement, name: string, kind: string, size?: number, type?: string, lastModified?: number, relativePath: string, entries?: { [key: string]: Entry }, handle: FileSystemFileHandle | FileSystemDirectoryHandle }

export async function listEntriesDetailed(directoryHandle: FileSystemDirectoryHandle, relativePath = ''): Promise<{ [key: string]: Entry }> {

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
                        entries:
                            await listEntriesDetailed(handle, nestedPath),
                        handle,
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

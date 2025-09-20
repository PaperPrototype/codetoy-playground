/*
shared.ts
- used by worker.ts
- used by files.ts
*/

export interface NonRecursiveEntry {
    path: string; 
    parentDir: FileSystemDirectoryHandle;
    depth: number;
}

export async function findFileHandleParent(filepath: string): Promise<FileSystemDirectoryHandle | undefined> {
    const opfsRoot = await navigator.storage.getDirectory();
    const parts = filepath.split('/').filter(part => part); // Remove empty parts
    parts.pop(); // remove the filename from the path

    try {
        let currentDir: FileSystemDirectoryHandle = opfsRoot;
        for (const part of parts) {
            currentDir = await currentDir.getDirectoryHandle(part, { create: false });
        }
        return currentDir;
    } catch (error) {
        console.error(`Could not get parent directory for: ${filepath}`, error);
        return undefined;
    }
}

export async function findFileHandle(filepath: string): Promise<FileSystemFileHandle | undefined> {
    const parts = filepath.split('/').filter(part => part);
    const filename = parts.pop();

    if (!filename) return undefined;

    try {
        const parentDir = await findFileHandleParent(filepath);
        if (parentDir) {
            return await parentDir.getFileHandle(filename, { create: false });
        }
        return undefined;
    } catch (error) {
        console.error(`Could not get file handle for: ${filepath}`, error);
        return undefined;
    }
}

export async function findDirectoryHandle(dirpath: string): Promise<FileSystemDirectoryHandle | undefined> {
    const opfsRoot = await navigator.storage.getDirectory();
    const parts = dirpath.split('/').filter(part => part);

    try {
        let currentDir: FileSystemDirectoryHandle = opfsRoot;
        for (const part of parts) {
            currentDir = await currentDir.getDirectoryHandle(part, { create: false });
        }
        return currentDir;
    } catch (error) {
        console.error(`Could not get directory handle for: ${dirpath}`, error);
        return undefined;
    }
}

// Utility function for recursive directory operations
// from https://aweirdimagination.net/2024/01/14/debugging-opfs/
export async function* getFilesNonRecursively(dir: FileSystemDirectoryHandle): AsyncGenerator<(NonRecursiveEntry & FileSystemFileHandle) | (NonRecursiveEntry & FileSystemDirectoryHandle), void, unknown> {
    const stack = [[dir, "", undefined, 0]];
    while (stack.length) {
        const [current, prefix, parentDir, depth]: any = stack.pop();
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

export async function writeText(fileHandle: FileSystemFileHandle, contents: string): Promise<void> {
    if ('createSyncAccessHandle' in fileHandle) {
        const handle = await (fileHandle as any).createSyncAccessHandle();
        const encoder = new TextEncoder();
        const encodedText = encoder.encode(contents);
        const arrayBuffer = encodedText.buffer;
        handle.truncate(0);
        handle.write(arrayBuffer, { at: 0 });
        handle.flush();
        handle.close();
    } else if ('createWritable' in fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.truncate(0);
        await writable.write(contents);
        await writable.close();
    }
}

export async function writeFile(fileHandle: FileSystemFileHandle, file: File): Promise<void> {
    if ('createSyncAccessHandle' in fileHandle) {
        const handle = await (fileHandle as any).createSyncAccessHandle();
        handle.truncate(0);
        if (file.arrayBuffer) {
            handle.write(await file.arrayBuffer(), { at: 0 });
        }
        handle.flush();
        handle.close();
    } else if ('createWritable' in fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.truncate(0);
        await writable.write(file);
        await writable.close();
    }
}

export async function recursiveCopy(sourceDir: FileSystemDirectoryHandle, destinationDir: FileSystemDirectoryHandle): Promise<void> {
    // @ts-ignore: 'values' is a valid method on FileSystemDirectoryHandle
    for await (const entry of sourceDir.values()) {
        if (entry.kind === 'file') {
            const sourceFile = await sourceDir.getFileHandle(entry.name);
            const file = await sourceFile.getFile();
            const destFile = await destinationDir.getFileHandle(entry.name, { create: true });
            await writeFile(destFile, file);
        } else if (entry.kind === 'directory') {
            const newDir = await destinationDir.getDirectoryHandle(entry.name, { create: true });
            const sourceSubDir = await sourceDir.getDirectoryHandle(entry.name);
            await recursiveCopy(sourceSubDir, newDir);
        }
    }
}

export async function uploadFile(payload: { file: File, filepath: string }): Promise<void> {
    const { file, filepath } = payload;
    const opfsRoot = await navigator.storage.getDirectory();

    const parts = filepath.split('/').filter(part => part);
    const filename = parts.pop()!;
    let currentDir = opfsRoot;

    // Create necessary subdirectories
    for (const part of parts) {
        currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }

    const fileHandle = await currentDir.getFileHandle(filename, { create: true });
    await writeFile(fileHandle, file);
}

export async function removeDirectoryFast(dir: FileSystemDirectoryHandle): Promise<void> {
    const toDelete: any[] = [];
    let maxDepth = 0;

    for await (const fileHandle of getFilesNonRecursively(dir)) {
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
self.onmessage = async (event) => {
    const { type, payload } = event.data as {
        payload?: any;
        type: string;
    }

    if (type === "upload") await upload(payload);               // {file, filepath} upload a single file
    else if (type === "moveFolder") await moveFolder(payload);  // {sourcePath, destinationPath} move a folder
    else if (type === "clear") await clear(payload);            // {path} clear the entire directory recursively
    else if (type === "remove") await remove(payload);          // {path} delete a single file
    else console.error(`Unknown message type: ${type}`);
}

async function upload(payload: { file: File, filepath: string }) {
    const { file, filepath } = payload;

    console.log('WORKER: Uploading file to', filepath);

    const opfsRoot = await navigator.storage.getDirectory();

    // Split the filepath into directory parts and filename
    const parts = filepath.split('/').slice(1); // all but the first part
    const filename = parts.pop()!;
    let currentDir = opfsRoot;

    // Create any necessary subdirectories
    for (const part of parts) {
        console.log('WORKER: subdirectories part:', part);
        currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }

    console.log('WORKER: getFileHandle filename:', filename);

    const fileHandle = await currentDir.getFileHandle(filename, { create: true });

    await writeFile(fileHandle, file);
}

async function moveFolder(payload: { sourcePath: string, destinationPath: string }) {
    const { sourcePath, destinationPath } = payload;
    const opfsRoot = await navigator.storage.getDirectory();

    try {
        // Get source directory
        const sourcePathParts = sourcePath.split('/');
        let sourceDir = opfsRoot;
        for (const part of sourcePathParts) {
            sourceDir = await sourceDir.getDirectoryHandle(part, { create: false });
        }

        // Create destination directory
        const destPathParts = destinationPath.split('/');
        let destDir = opfsRoot;
        for (const part of destPathParts) {
            destDir = await destDir.getDirectoryHandle(part, { create: true });
        }

        // Copy all files from source to destination
        recursiveCopy(sourceDir, destDir);
        // The method below would not copy all files properly
        // // @ts-ignore: 'values' is a valid method on FileSystemDirectoryHandle
        // for await (const entry of sourceDir.values()) {
        //     if (entry.kind === 'file') {
        //         const sourceFile = await sourceDir.getFileHandle(entry.name);
        //         const file = await sourceFile.getFile();
        //         const destFile = await destDir.getFileHandle(entry.name, { create: true });
        //         await writeFile(destFile, file);
        //     }
        // }

        removeDirectoryFast(sourceDir);


    } catch (error) {
        console.error(`Error moving folder from ${sourcePath} to ${destinationPath}:`, error);
        throw error;
    }
}

async function clear(payload: { path: string }) {
    const { path } = payload;

    try {
        const opfsRoot = await navigator.storage.getDirectory()
        // Get source directory
        const sourcePathParts = path.split('/');
        let dir = opfsRoot;
        for (const part of sourcePathParts) {
            dir = await dir.getDirectoryHandle(part, { create: false });
        }
        removeDirectoryFast(dir);
    } catch (error) {
        console.error(`Error clearing folder of ${path}:`, error);
        throw error;
    }
}

// unfortunately `remove` is not supported in all browsers yet, so we need to use `removeEntry` instead
// async function remove(payload: { filepath: string}) {
//     const { filepath } = payload;

//     const opfsRoot = await navigator.storage.getDirectory();
//     try {
//         const fileHandle = await opfsRoot.getFileHandle(filepath, { create: false });
//         await fileHandle.remove();
//     } catch (error) {
//         console.error(`Error removing file: ${path}`, error);
//     }
// }

async function remove(payload: { path: string }) {
    const { path } = payload;
    const opfsRoot = await navigator.storage.getDirectory();

    try {
        // Split the filepath into directory and filename
        const parts = path.split('/');
        const filename = parts.pop()!;
        let dirHandle = opfsRoot;

        // Traverse to the parent directory if needed
        for (const part of parts) {
            dirHandle = await dirHandle.getDirectoryHandle(part, { create: false });
        }

        await dirHandle.removeEntry(filename);
    } catch (error) {
        console.error(`Error removing file: ${path}`, error);
    }
}

// UTILS
async function recursiveCopy(sourceDir: FileSystemDirectoryHandle, destinationDir: FileSystemDirectoryHandle) {
    // @ts-ignore: 'values' is a valid method on FileSystemDirectoryHandle
    for await (const entry of sourceDir.values()) {
        if (entry.kind === 'file') {
            // Copy file
            const sourceFile = await sourceDir.getFileHandle(entry.name);
            const file = await sourceFile.getFile();
            const destFile = await destinationDir.getFileHandle(entry.name, { create: true });
            await writeFile(destFile, file);
        } else if (entry.kind === 'directory') {
            // Create and copy directory
            const newDir = await destinationDir.getDirectoryHandle(entry.name, { create: true });
            const sourceSubDir = await sourceDir.getDirectoryHandle(entry.name);
            await recursiveCopy(sourceSubDir, newDir);
        }
    }
}

async function writeFile(file: FileSystemFileHandle, contents: File) {
    if ('createSyncAccessHandle' in file) {
        const handle = await (file as any).createSyncAccessHandle();
        handle.truncate(0);
        if (contents.arrayBuffer) handle.write(await contents.arrayBuffer());
        handle.flush();
        handle.close();
    } else if ('createWritable' in file) {
        const writable = await file.createWritable();
        writable.truncate(0);
        await writable.write(contents);
        await writable.close();
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
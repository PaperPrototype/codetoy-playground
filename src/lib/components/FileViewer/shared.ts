
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

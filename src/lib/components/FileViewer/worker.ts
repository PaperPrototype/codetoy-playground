import {
    findFileHandle,
    findFileHandleParent,
    findDirectoryHandle,
    writeText,
    uploadFile,
    recursiveCopy,
    removeDirectoryFast
} from './shared.js';

interface WorkerMessage {
    id?: string;
    type: string;
    payload?: any;
}

interface WorkerResponse {
    id?: string;
    success: boolean;
    error?: string;
}

self.onmessage = async (event) => {
    const { id, type, payload }: WorkerMessage = event.data;

    if (!id) {
        console.error("FILE WORKER: no id given");
        return;
    }

    let result;

    switch (type) {
        case "savetext":
            result = await saveTextFile(id, type, payload);
            break;
        case "upload":
            result = await uploadFileOperation(id, type, payload);
            break;
        case "moveFolder":
            result = await moveFolderOperation(id, type, payload);
            break;
        case "moveFile":
            result = await moveFileOperation(id, type, payload);
            break;
        case "deleteFolder":
            result = await deleteFolderOperation(id, type, payload);
            break;
        case "deleteFile":
            result = await deleteFileOperation(id, type, payload);
            break;
        default:
            throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage(result);
};

function successResponse(id: string): WorkerResponse {
    // Send success response
    const response: WorkerResponse = { id, success: true };
    return response;
}

function errorResponse(id: string, type: string, error: any,): WorkerResponse {
    // console.error(`Worker error for operation ${type}:`, error);

    // Send error response
    const response: WorkerResponse = {
        id,
        success: false,
        error: error instanceof Error ? error.message : String(error)
    };
    return response;
}

// Core Operations
async function saveTextFile(id: string, type: string, payload: { text: string, filepath: string }): Promise<WorkerResponse> {
    try {
        const { text, filepath } = payload;
        const opfsRoot = await navigator.storage.getDirectory();

        const parts = filepath.split('/').slice(1)
        const filename = parts.pop()!;
        let currentDir = opfsRoot;

        // Create necessary subdirectories
        for (const part of parts) {
            currentDir = await currentDir.getDirectoryHandle(part, { create: true });
        }

        const fileHandle = await currentDir.getFileHandle(filename, { create: true });
        await writeText(fileHandle, text);
        return successResponse(id)
    } catch (error) {
        console.error("saveTextFile", error)
        return errorResponse(id, type, error);
    }
}

async function uploadFileOperation(id: string, type: string, payload: { file: File, filepath: string }): Promise<WorkerResponse> {
    try {
        await uploadFile(payload)
        return successResponse(id);
    } catch (error) {
        console.error("uploadFileOperation", error)
        return errorResponse(id, type, error)
    }
}

async function moveFileOperation(id: string, type: string, payload: { sourcePath: string, destinationPath: string }): Promise<WorkerResponse> {
    try {
        const { sourcePath, destinationPath } = payload;

        // Validate paths
        if (sourcePath === destinationPath || !sourcePath.trim()) {
            throw new Error(`Paths are the same: File not moved`);
        }

        // Find source file
        const sourceFileHandle = await findFileHandle(sourcePath);
        if (!sourceFileHandle) {
            throw new Error(`Source file not found: ${sourcePath}`);
        }

        // Read file contents
        const file = await sourceFileHandle.getFile();

        // Upload to destination
        await uploadFile({ file, filepath: destinationPath });

        // Remove source file
        const sourceParent = await findFileHandleParent(sourcePath);
        if (sourceParent) {
            const sourceParts = sourcePath.split('/')
            const sourceFilename = sourceParts.pop();
            if (sourceFilename) {
                await sourceParent.removeEntry(sourceFilename);
            }
        }

        return successResponse(id)
    } catch (error) {
        console.error("moveFileOperation", error)
        return errorResponse(id, type, error)
    }
}

async function moveFolderOperation(id: string, type: string, payload: { sourcePath: string, destinationPath: string }): Promise<WorkerResponse> {
    try {
        const { sourcePath, destinationPath } = payload;

        if (sourcePath === destinationPath || !sourcePath.trim()) {
            throw new Error(`Paths are the same: Folder not moved`);
        }

        const opfsRoot = await navigator.storage.getDirectory();

        const sourcePathParts = sourcePath.split('/').slice(1);
        let sourceDir = opfsRoot;
        let parentSourceDir = opfsRoot;
        for (const part of sourcePathParts) {
            parentSourceDir = sourceDir;
            sourceDir = await sourceDir.getDirectoryHandle(part, { create: false });
        }

        // Create destination directory
        const destPathParts = destinationPath.split('/').slice(1);
        let destDir = opfsRoot;
        for (const part of destPathParts) {
            destDir = await destDir.getDirectoryHandle(part, { create: true });
        }

        // Copy all contents recursively
        await recursiveCopy(sourceDir, destDir);

        // Delete source directory
        await removeDirectoryFast(sourceDir);

        // Remove the folder itself
        await parentSourceDir.removeEntry(sourceDir.name);

        // Finally send success response
        return successResponse(id);
    } catch (error) {
        console.error("moveFolderOperation", error)
        return errorResponse(id, type, error);
    }
}

async function deleteFileOperation(id: string, type: string, payload: { path: string }): Promise<WorkerResponse> {
    try {
        const { path } = payload;

        const parentDir = await findFileHandleParent(path);
        if (!parentDir) {
            throw new Error(`Parent directory not found for: ${path}`);
        }

        const parts = path.split('/')
        const filename = parts.pop();
        if (!filename) {
            throw new Error(`Invalid file path: ${path}`);
        }

        await parentDir.removeEntry(filename);
        return successResponse(id);
    } catch (error) {
        console.error("deleteFileOperation", error)
        return errorResponse(id, type, error);
    }
}

async function deleteFolderOperation(id: string, type: string, payload: { path: string }): Promise<WorkerResponse> {
    try {
        const { path } = payload;

        const opfsRoot = await navigator.storage.getDirectory()

        // Get source directory
        const sourcePathParts = path.split('/').slice(1); // remove empty first part
        let dir = opfsRoot;
        let parent = opfsRoot;
        for (const part of sourcePathParts) {
            parent = dir; // previous value of dir
            dir = await dir.getDirectoryHandle(part, { create: false });
            console.log("deleteFolderOperation: dir", dir)
        }

        await removeDirectoryFast(dir);
        await parent.removeEntry(dir.name);
        return successResponse(id);
    } catch (error) {
        console.error("deleteFolderOperation", error)
        return errorResponse(id, type, error);
    }
}
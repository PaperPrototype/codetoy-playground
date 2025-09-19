// Disables access to DOM typings like `HTMLElement` which are not available
// inside a service worker and instantiates the correct globals
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Ensures that the `$service-worker` import has proper type definitions
/// <reference types="@sveltejs/kit" />

// Only necessary if you have an import from `$env/static/public`
/// <reference types="../.svelte-kit/ambient.d.ts" />

import {transform} from "sucrase"

// This gives `self` the correct types
const serviceWorker = self as unknown as ServiceWorkerGlobalScope;

serviceWorker.addEventListener('install', function (event) {
    // Skip waiting and move directly to activating
    serviceWorker.skipWaiting();
    // Further installation steps, like caching core assets, would go here
});

const ROOTPATH = "/files"

serviceWorker.addEventListener("fetch", async (event) => {
    // console.log("SERVICE: event", event);

    async function respond(event: FetchEvent): Promise<Response> {
        const urlObj = new URL(event.request.url);

        if (!urlObj.pathname.startsWith(ROOTPATH)) {
            // default behaviour: pass through
            return fetch(event.request);
        }

        console.log("SERVICE: ", urlObj.pathname)

        // get the requested file
        const filepath = urlObj.pathname.slice(ROOTPATH.length);

        if (filepath.includes(".ts")) {
            const fileHandleTs = (await findFileHandle(filepath)) as FileSystemFileHandle;
            if (fileHandleTs) {
                const file = await fileHandleTs.getFile()
                const jsOutput = transform(await file.text(), {filePath: filepath, transforms: ["typescript"]}).code
                return new Response(new Blob([jsOutput], {
                    type: "text/javascript"
                }));
            }
        }

        // regular files
        const fileHandle = (await findFileHandle(filepath)) as FileSystemFileHandle;
        if (fileHandle) {
            const file = await fileHandle.getFile()
            return new Response(file);
        } 
        
        // don't need to have .js at the end
        const fileHandleJs = (await findFileHandle(filepath + ".js")) as FileSystemFileHandle;
        if (fileHandleJs) {
            const file = await fileHandleJs.getFile()
            return new Response(file);
        }

        // Use sucrase to transform typescript into javascript
        const fileHandleTs = (await findFileHandle(filepath + ".ts")) as FileSystemFileHandle;
        if (fileHandleTs) {
            const file = await fileHandleTs.getFile()
            const jsOutput = transform(await file.text(), {filePath: filepath, transforms: ["typescript"]}).code
            return new Response(new Blob([jsOutput], {
                type: "text/javascript"
            }));
        }

        console.log("SERVICE: 404 not found filepath", filepath)
        return new Response(undefined, {status: 404, statusText: "File not found"})
    }

    event.respondWith(respond(event))
})


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
        return undefined;
    }
}
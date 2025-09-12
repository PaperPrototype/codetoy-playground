<script>
 import { onMount } from "svelte";

    onMount(async () => {
        const {getFilesNonRecursively} = await import('$lib/components/FileViewer/files.js');

        const rootDir = await navigator.storage.getDirectory();

        const existing = document.getElementById("opfs-file-list");
        const l = document.createElement("ol");
        l.id = "opfs-file-list";
        if (existing) existing.replaceWith(l);
        else document.body.appendChild(l);

        for await (const fileHandle of getFilesNonRecursively(rootDir)) {
            const i = document.createElement("li");
            i.innerText =
                fileHandle.kind + ": " + (fileHandle.relativePath ?? "(root)");
            if (fileHandle.kind === "file") {
                const content = await fileHandle.getFile();
                const contentStr =
                    content.type.length === 0 ||
                    content.type.startsWith("text/")
                        ? '"' +
                          (await content.slice(0, 100).text()).trim() +
                          '"'
                        : content.type;
                i.innerText += ": (" + content.size + " bytes) " + contentStr;
            }
            l.appendChild(i);
        }
    });
</script>

<div id="opfs-file-list"></div>

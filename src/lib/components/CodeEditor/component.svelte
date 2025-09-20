<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { Monaco, Editor } from "./types.js";
    import type { Entry } from "../FileViewer/files.js";

    let monaco: typeof Monaco | undefined;
    let editor: Editor.IStandaloneCodeEditor | undefined;
    let models: { [key: string]: CodetoyModel } = {};
    let active: CodetoyModel | undefined;

    interface CodetoyModel {
        model: Editor.ITextModel;
        entry: Entry;
    }

    interface Props {
        class?: string;
        editor?: Editor.IStandaloneCodeEditor;
        monaco?: typeof Monaco;
        saved: (model: Editor.ITextModel, entry: Entry) => void;
        edited: () => void;
        mounted?: (
            monaco: typeof Monaco,
            editor: Editor.IStandaloneCodeEditor,
        ) => void | undefined;
    }

    let {
        saved,
        edited,
        class: className = "",
        mounted = undefined as
            | ((
                  monaco: typeof Monaco,
                  editor: Editor.IStandaloneCodeEditor,
              ) => void)
            | undefined,
    }: Props = $props();

    let editorContainer: HTMLElement;

    onMount(async () => {
        if (!monaco) {
            monaco = (await import("./instance.js")).default;
        }

        if (!editor) {
            editor = monaco.editor.create(editorContainer, {
                automaticLayout: true,
                theme: "vs-dark",
                minimap: {
                    enabled: false,
                },
                model: null,
                autoIndent: "full",
                formatOnPaste: true,
                formatOnType: true,
            });

            const { KeyCode, KeyMod } = await import("monaco-editor");

            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
                editor!.trigger("keyboard", "editor.action.rename", null);
            });

            editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, (e) => {
                if (active) saveChanges(active);
            });

            // Two way binding svelte? https://github.com/ala-garbaa-pro/svelte-5-monaco-editor-two-way-binding
            editor.onDidChangeModelContent((e) => {
                if (e.isFlush) {
                    // true if setValue call
                    // console.log('setValue call');
                    /* editor.setValue(value); */
                } else {
                    // else, the user made an edit normally
                    // const updatedValue = editor?.getValue() ?? " ";
                    // value = updatedValue;
                    edited();
                }
            });
        }

        if (mounted) {
            mounted(monaco, editor);
        }

        const { listEntriesDetailed } = await import("$lib/components/FileViewer/files.js");
        const rootDir = await navigator.storage.getDirectory();
        const rootEntry = {
            kind: "directory",
            handle: rootDir,
            name: "",
            relativePath: "",
            isEditing: false,
            isDirectoryOpen: true,
            entries: await listEntriesDetailed(rootDir),
        };

        await loadAllModels(rootEntry);
    });

    onDestroy(() => {
        monaco?.editor.getModels().forEach((model) => model.dispose());
        editor?.dispose();
    });

    export function isMonacoLoaded(): boolean {
        if (!monaco || !editor) return false;
        return true;
    }

    export async function loadAllModels(rootEntry: Entry) {
        if (!monaco || !editor) {
            console.error("loadAllModels: editor or monaco are undefined");
            return;
        }

        // dispose of all ITextModels
        for (const [_, value] of Object.entries(models)) value.model.dispose();
        models = {};

        // load all the models for type of "file"
        const loads: Promise<void>[] = [];
        recursiveLoad(rootEntry);
        function recursiveLoad(entry: Entry) {
            if (entry.kind === "file") loads.push(loadModel(entry));
            if (entry.entries)
                for (const [_, value] of Object.entries(entry.entries))
                    recursiveLoad(value);
        }
        await Promise.all(loads);
        console.log("CODE EDITOR: loadAllModels, all models loaded")
    }

    export async function select(entry: Entry) {
        if (!models[entry.relativePath]) {
            await loadModel(entry);
        }
        const model = models[entry.relativePath].model;
        editor!.setModel(model);
        active = { model, entry };
    }

    async function saveChanges(codetoyModel: CodetoyModel) {
        saved(codetoyModel.model, codetoyModel.entry);
        const { saveTextFile: save } = await import(
            "$lib/components/FileViewer/files.js"
        );
        save(codetoyModel.model.getValue(), codetoyModel.entry.relativePath);
    }

    async function loadModel(entry: Entry) {
        if (!editor || !monaco) {
            console.error("loadModels: editor or monaco are undefined");
            return;
        }

        const uri = new monaco.Uri().with({ path: "/files" + entry.relativePath });
        window.console.log("uri", uri)
        const file = await (entry.handle as FileSystemFileHandle).getFile();
        const content = await file.text();
        const model = monaco.editor.createModel(
            content,
            undefined,
            uri,
        );

        // make it so that import syntax supports types correctly
        if (entry.name.includes(".ts")) {
            monaco.languages.typescript.typescriptDefaults.addExtraLib(
                content,
                "/files" + entry.relativePath,
            )
        }

        models[entry.relativePath] = {
            model: model,
            entry: entry,
        };
    }
</script>

<div class={className + " relative"} bind:this={editorContainer}>
    <div class="absolute w-full h-full flex items-center justify-center">
        <p>Click a file to get started</p>
    </div>
</div>

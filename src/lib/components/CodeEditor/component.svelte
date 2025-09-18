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
        value: string;
        class?: string;
        editor?: Editor.IStandaloneCodeEditor;
        monaco?: typeof Monaco;
        mounted?: (
            monaco: typeof Monaco,
            editor: Editor.IStandaloneCodeEditor,
        ) => void | undefined;
    }

    async function saveChanges(codetoyModel: CodetoyModel) {
        const {saveTextFile: save} = await import("$lib/components/FileViewer/files.js");
        save(codetoyModel.model.getValue(), codetoyModel.entry.relativePath);
    }

    async function loadModel(entry: Entry) {
        if (!editor || !monaco) return;
        
        // models are garbage collected once there is no longer a 
        // reference to them so no need to worry about disposing of a model
        const model = monaco.editor.createModel(
            await (await (entry.handle as FileSystemFileHandle).getFile()).text(),
            undefined,
            new monaco.Uri().with({ path: entry.relativePath }),
        );

        models[entry.relativePath] = {
            model: model,
            entry: entry,
        };
    }

    export async function reload(rootEntry: Entry) {
        if (!monaco || !editor) return;
        
        // dispose of all ITextModels
        for (const [_, value] of Object.entries(models)) value.model.dispose();
        models = {};

        // load all the models for type of "file"
        const loads: Promise<void>[] = [];
        recursiveLoad(rootEntry);
        function recursiveLoad(entry: Entry) {
            if (entry.kind === "file") loads.push(loadModel(entry));
            if (entry.entries) for (const [_, value] of Object.entries(entry.entries)) recursiveLoad(value);
        }
        await Promise.all(loads);
    }

    export async function select(entry: Entry) {
        if (!models[entry.relativePath]) {
            await loadModel(entry);
        }
        const model = models[entry.relativePath].model;
        editor!.setModel(model);
        active = { model, entry };
    }

    let {
        value = $bindable(),
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
            monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
            monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: true,
                noSyntaxValidation: true,
                noSuggestionDiagnostics: true
            });

            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: true,
                noSyntaxValidation: true,
                noSuggestionDiagnostics: true
            });

            editor = monaco.editor.create(editorContainer, {
                automaticLayout: true,
                theme: "vs-dark",
                minimap: {
                    enabled: false,
                },
                // language: "typescript",
                model: null,
                autoIndent: "full",
                formatOnPaste: true,
                formatOnType: true,
            });

            const { KeyCode, KeyMod } = await import("monaco-editor");

            editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, (e) => {
                if (active) saveChanges(active);
            })

            if (value) {
                editor.setValue(value);
            }

            // Two way binding svelte https://github.com/ala-garbaa-pro/svelte-5-monaco-editor-two-way-binding
            editor.onDidChangeModelContent((e) => {
                if (e.isFlush) {
                    // true if setValue call
                    //console.log('setValue call');
                    /* editor.setValue(value); */
                } else {
                    // console.log('user input');
                    const updatedValue = editor?.getValue() ?? " ";
                    value = updatedValue;
                }
            });
        }

        if (mounted) {
            mounted(monaco, editor);
        }
    });

    $effect(() => {
        if (value) {
            if (editor) {
                // check if the editor is focused
                if (editor.hasWidgetFocus()) {
                    // let the user edit with no interference
                } else {
                    if (editor?.getValue() ?? " " !== value) {
                        editor?.setValue(value);
                    }
                }
            }
        }
        if (value === "") {
            editor?.setValue(" ");
        }
    });

    onDestroy(() => {
        monaco?.editor.getModels().forEach((model) => model.dispose());
        editor?.dispose();
    });
</script>

<div class={className} bind:this={editorContainer}></div>

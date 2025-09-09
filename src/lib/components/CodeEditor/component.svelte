<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { Monaco, Editor } from "./instance.js";
  // import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';

  // import { IConfigurationService } from "monaco-editor/esm/vs/platform/configuration/common/configuration";

  let {
    class: className = "",
    monaco = $bindable() as typeof Monaco | undefined,
    editor = $bindable() as Editor.IStandaloneCodeEditor | undefined,
    mounted = undefined as
      | ((monaco: typeof Monaco, editor: Editor.IStandaloneCodeEditor) => void)
      | undefined,
  }: {
    class?: string;
    editor?: Editor.IStandaloneCodeEditor;
    monaco?: typeof Monaco;
    mounted?: (
      monaco: typeof Monaco,
      editor: Editor.IStandaloneCodeEditor
    ) => void;
  } = $props();
  let editorContainer: HTMLElement;

  onMount(async () => {
    if (!monaco) {
      monaco = (await import("./instance.js")).default;
    }

    if (!editor) {
      // monaco.languages.register({ id: "mySpecialLanguage" });

      // monaco.languages.registerDefinitionProvider("typescript", {
      //   provideDefinition: function (model, position, cancellationToken) {
      //     console.log("model.uri", model.uri);
      //     console.log("position", position);
      //     return {
      //       uri: model.uri,
      //       range: new monaco!.Range(
      //         position.lineNumber,
      //         position.column,
      //         position.lineNumber,
      //         position.column
      //       ),
      //     };
      //   },
      // });

      // var editorService = {
      //   openEditor: function () {
      //     console.log(`open editor called!` + JSON.stringify(arguments));
      //   },
      //   resolveEditor: function () {
      //     console.log(`resolve editor called!` + JSON.stringify(arguments));
      //   },
      // };

      editor = monaco.editor.create(editorContainer, {
        automaticLayout: true,
        theme: "vs-dark",
        minimap: {
          enabled: false,
        },
        language: "typescript",
        autoIndent: "full",
        formatOnPaste: true,
        formatOnType: true,
      });

      // 3rd param in editor.create... {
      //   codeEditorService: Object.assign(Object.create(codeEditorService), {
      //     openCodeEditor: async ({ resource, options }, editor) => {
      //       // Open the file with this path
      //       // This should set the model with the path and value
      //       // this.props.onOpenPath(resource.path);
      //       if (onopenpath) onopenpath(resource);
      //       // // Move cursor to the desired position
      //       editor.setSelection(options.selection);
      //       // Scroll the editor to bring the desired line into focus
      //       editor.revealLine(options.selection.startLineNumber);
      //       return {
      //         getControl: () => editor,
      //       };
      //     },
      //   }),
      // }
    }

    if (mounted) {
      mounted(monaco, editor);
    }
  });

  onDestroy(() => {
    monaco?.editor.getModels().forEach((model) => model.dispose());
    editor?.dispose();
  });
</script>

<div class={className} bind:this={editorContainer}></div>

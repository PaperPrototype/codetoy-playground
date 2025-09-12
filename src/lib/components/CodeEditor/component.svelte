<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { Monaco, Editor } from "./instance.js";

  let monaco: typeof Monaco | undefined;
  let editor: Editor.IStandaloneCodeEditor | undefined;

  interface Props {
    value: string;
    class?: string;
    editor?: Editor.IStandaloneCodeEditor;
    monaco?: typeof Monaco;
    mounted?: (
      monaco: typeof Monaco,
      editor: Editor.IStandalone
    ) => void | undefined;
  }

  let {
    value = $bindable(),
    class: className = "",
    mounted = undefined as
      | ((monaco: typeof Monaco, editor: Editor.IStandaloneCodeEditor) => void)
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
        language: "typescript",
        autoIndent: "full",
        formatOnPaste: true,
        formatOnType: true,
      });

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
					const updatedValue = editor?.getValue() ?? ' ';
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
					if (editor?.getValue() ?? ' ' !== value) {
						editor?.setValue(value);
					}
				}
			}
		}
		if (value === '') {
			editor?.setValue(' ');
		}
	});

  onDestroy(() => {
    monaco?.editor.getModels().forEach((model) => model.dispose());
    editor?.dispose();
  });
</script>

<div class={className} bind:this={editorContainer}></div>

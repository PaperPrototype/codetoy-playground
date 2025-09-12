<script lang="ts">
    // import { getIcon } from "material-file-icons";
    import { getMaterialFolderIcon } from "file-extension-icon-js";

  interface Props {
    name: string;
    style?: string;
    class?: string;
    open?: boolean;
  }

    let { name, open = true, ...rest }: Props = $props();
</script>

<!-- 
<div class={className} style={styleName}>
  {@html getIcon(filename).svg}
</div> -->

<img
    {...rest}
    src={getMaterialFolderIcon(name, open)}
    alt={name}
/>

<script lang="ts">
    // import { getIcon } from "material-file-icons";
    import { getMaterialFolderIcon } from "file-extension-icon-js";

    export let name;
    export let open: boolean = true;

    let styleName = "";
    export { styleName as style };
    let className;
    export { className as class };
</script>

<!-- 
<div class={className} style={styleName}>
  {@html getIcon(filename).svg}
</div> -->

<img
    class={className}
    style={styleName}
    src={getMaterialFolderIcon(name, open)}
    alt={name}
/>

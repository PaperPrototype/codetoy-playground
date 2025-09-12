<script lang="ts">
  // import { getIcon } from "material-file-icons";
  import { getMaterialFileIcon } from "file-extension-icon-js";

  interface Props {
    name: string;
    style?: string;
    class?: string;
  }

  let {name, ...rest}: Props = $props();
</script>

<!-- 
<div class={className} style={styleName}>
  {@html getIcon(filename).svg}
</div> -->

<img
    {...rest}
    src={getMaterialFileIcon(name)}
    alt={name}
/>

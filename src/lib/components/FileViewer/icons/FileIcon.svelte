<script lang="ts">
  // import { getIcon } from "material-file-icons";
  import { getMaterialFileIcon } from "file-extension-icon-js";

  export let name;

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
  src={getMaterialFileIcon(name)}
  alt={name}
/>

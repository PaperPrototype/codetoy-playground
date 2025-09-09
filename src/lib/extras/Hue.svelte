<script>
    let { r = $bindable(), g = $bindable(), b = $bindable() } = $props();

    let baseColor = $derived(`rgb(${r}, ${g}, ${b})`);
    
    // Create a 2D gradient rotated 90 degrees clockwise - RGB color on the right
    let gradientStyle = $derived(`
        linear-gradient(to left, 
            ${baseColor} 0%, 
            rgba(0, 0, 0, 0) 100%
        ),
        linear-gradient(to bottom, 
            rgb(255, 255, 255) 0%, 
            rgb(0, 0, 0) 100%
        )
    `);
</script>

<!-- Controls -->
<!-- <div class="space-y-2">
    <div class="flex items-center gap-4">
        <label class="w-8">R:</label>
        <input 
            type="range" 
            min="0" 
            max="255" 
            bind:value={r}
            class="flex-1"
        />
        <span class="w-12 text-sm">{r}</span>
    </div>
    
    <div class="flex items-center gap-4">
        <label class="w-8">G:</label>
        <input 
            type="range" 
            min="0" 
            max="255" 
            bind:value={g}
            class="flex-1"
        />
        <span class="w-12 text-sm">{g}</span>
    </div>
    
    <div class="flex items-center gap-4">
        <label class="w-8">B:</label>
        <input 
            type="range" 
            min="0" 
            max="255" 
            bind:value={b}
            class="flex-1"
        />
        <span class="w-12 text-sm">{b}</span>
    </div>
</div>
-->

<!-- Color Picker Style Gradient Box -->
<div 
    class="h-32 w-full rounded shadow-lg cursor-crosshair"
    style="background: {gradientStyle};"
></div>
<script>
  let r = $state(128);
  let g = $state(64);
  let b = $state(192);
  
  // Generate gradient stops from dark to light
  let gradientStops = $derived(Array.from({ length: 11 }, (_, i) => {
    const factor = i / 10; // 0 to 1
    const lightR = Math.round(r + (255 - r) * factor);
    const lightG = Math.round(g + (255 - g) * factor);
    const lightB = Math.round(b + (255 - b) * factor);
    return `rgb(${lightR}, ${lightG}, ${lightB})`;
  }));
  
  let gradientStyle = $derived(`linear-gradient(to left, rgb(0,0,0), rgb(${r}, ${g}, ${b}), ${gradientStops.join(', ')})`);
</script>

<div class="p-8 space-y-4">
  <!-- Controls -->
  <div class="space-y-2">
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
  
  <!-- Gradient Box -->
  <div 
    class="h-32 w-32 rounded-lg shadow-lg"
    style="background: {gradientStyle}"
  ></div>
  
  <!-- Current RGB Value Display -->
  <div class="text-sm text-gray-600">
    Current RGB: ({r}, {g}, {b})
  </div>
</div>
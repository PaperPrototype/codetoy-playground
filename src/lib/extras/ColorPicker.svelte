<script lang="ts">
    import Hue from "./Hue.svelte";
    import color from "colorjs.io";

    let showExtras = $state(true);

    let pallette = $state([]);
    let rgba = $state({ r: 200, g: 22, b: 100, a: 1 });

    /* Colors conversions - not used yet
    let cmyka = $derived(() => {
        let r = rgba.r / 255;
        let g = rgba.g / 255;
        let b = rgba.b / 255;

        let k = Math.min(1 - r, 1 - g, 1 - b);
        let c = (1 - r - k) / (1 - k) || 0;
        let m = (1 - g - k) / (1 - k) || 0;
        let y = (1 - b - k) / (1 - k) || 0;

        return {
            c: Math.round(c * 255),
            m: Math.round(m * 255),
            y: Math.round(y * 255),
            k: Math.round(k * 255),
            a: rgba.a,
        };
    });
    let hex = $derived(() => {
        let r = rgba.r.toString(16).padStart(2, '0');
        let g = rgba.g.toString(16).padStart(2, '0');
        let b = rgba.b.toString(16).padStart(2, '0');
        let a = Math.round(rgba.a * 255)
            .toString(16)
            .padStart(2, '0');
        return `#${r}${g}${b}${a}`;
    });
    let hsl = $derived(() => {
        let r = rgba.r / 255;
        let g = rgba.g / 255;
        let b = rgba.b / 255;

        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        let l = (max + min) / 2;

        if (max !== min) {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100),
            a: rgba.a,
        };
    });
    */
</script>

<div class="p-20">
    <details class="dropdown">
        <summary class="btn btn-circle btn-sm bg-red-300"></summary>
        <div
            class="menu dropdown-content bg-base-100 rounded-box z-1 p-0 shadow-sm min-h-32"
        >
        <div class="py-1">
            <!-- <div role="tablist" class="tabs tabs-sm p-1 tabs-border">
                <button onclick={() => showExtras = false} role="tab" class="tab {showExtras ? '' : 'tab-active'}">Picker</button>
                <button onclick={() => showExtras = true} role="tab" class="tab {showExtras ? 'tab-active' : ''}">Colors</button>
            </div> -->
            <div class="p-1 px-2 flex gap-1">

                <Hue bind:r={rgba.r} bind:g={rgba.g} bind:b={rgba.b}></Hue>
                <div class="flex gap-1">
                    <div class="w-5 h-full rounded p-1" style="background: linear-gradient(to bottom,
                        hsl(0, 100%, 50%),
                        hsl(30, 100%, 50%),
                        hsl(60, 100%, 50%),
                        hsl(90, 100%, 50%),
                        hsl(120, 100%, 50%),
                        hsl(150, 100%, 50%),
                        hsl(180, 100%, 50%),
                        hsl(210, 100%, 50%),
                        hsl(240, 100%, 50%),
                        hsl(270, 100%, 50%),
                        hsl(300, 100%, 50%),
                        hsl(330, 100%, 50%),
                        hsl(360, 100%, 50%));">
                    </div>
                    <div
                        style="background: linear-gradient(to bottom, transparent, rgb({rgba.r},{rgba.g},{rgba.b}));" class="w-5 h-full rounded p-1"
                    ></div>
                </div>
            </div>
            <div class="p-1 px-2 flex gap-1">
                <input
                    type="number"
                    min="0"
                    max="255"
                    class="input input-xs input-bordered max-w-xs"
                    placeholder="R"
                />
                <input
                    type="number"
                    min="0"
                    max="255"
                    class="input input-xs input-bordered max-w-xs"
                    placeholder="G"
                />
                <input
                    type="number"
                    min="0"
                    max="255"
                    class="input input-xs input-bordered max-w-xs"
                    placeholder="B"
                />
                <input
                    type="number"
                    min="0"
                    max="255"
                    class="input input-xs input-bordered max-w-xs"
                    placeholder="A"
                />
                <button class="btn btn-xs btn-soft">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        class="size-4"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </button>
            </div>

            <div class="p-1 px-2 flex gap-1">
                <input type="range" min="0" max="255" value="40" class="range range-secondary" />
            </div>
            <div class="p-1 px-2 flex gap-1">
                <input
                    type="number"
                    min="0"
                    max="255"
                    class="input input-xs input-bordered max-w-xs"
                    placeholder="HEX"
                />
                <button class="btn btn-xs btn-soft">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        class="size-4"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </button>
            </div>

        {#if showExtras}
            <!-- <div class="p-1 px-2 flex gap-1">
                <div class="w-full h-5 rounded p-1" style="background: linear-gradient(to right,
                    hsl(0, 100%, 50%),
                    hsl(30, 100%, 50%),
                    hsl(60, 100%, 50%),
                    hsl(90, 100%, 50%),
                    hsl(120, 100%, 50%),
                    hsl(150, 100%, 50%),
                    hsl(180, 100%, 50%),
                    hsl(210, 100%, 50%),
                    hsl(240, 100%, 50%),
                    hsl(270, 100%, 50%),
                    hsl(300, 100%, 50%),
                    hsl(330, 100%, 50%),
                    hsl(360, 100%, 50%));">
                </div>
            </div>
            <div class="p-1 px-2 flex gap-1">
                <div
                    style="background: linear-gradient(to right, transparent, rgb({rgba.r},{rgba.g},{rgba.b}));" class="w-full h-5 rounded p-1"
                ></div>
            </div> -->
                        <div class="flex flex-wrap gap-1 p-2">
                <div
                    class="w-5 h-5 rounded-full bg-red-300 border-2 border-base-100"
                ></div>
                <div class="w-5 h-5 rounded-full bg-blue-300"></div>
                <div class="w-5 h-5 rounded-full bg-green-300"></div>
                <div class="w-5 h-5 rounded-full bg-yellow-300"></div>
                <div class="w-5 h-5 rounded-full bg-orange-300"></div>
                <div class="w-5 h-5 rounded-full bg-green-500"></div>
                <div class="w-5 h-5 rounded-full bg-orange-500"></div>
                <div class="w-5 h-5 rounded-full bg-red-500"></div>
                <div class="w-5 h-5 rounded-full bg-green-200"></div>
                <div class="w-5 h-5 rounded-full bg-red-300"></div>
                <div class="w-5 h-5 rounded-full bg-blue-300"></div>
                <div class="w-5 h-5 rounded-full bg-green-300"></div>
                <div class="w-5 h-5 rounded-full bg-yellow-300"></div>
                <div class="w-5 h-5 rounded-full bg-orange-300"></div>
                <div class="w-5 h-5 rounded-full bg-green-500"></div>
                <div class="w-5 h-5 rounded-full bg-orange-500"></div>
                <div class="w-5 h-5 rounded-full bg-red-500"></div>
                <div class="w-5 h-5 rounded-full bg-green-200"></div>
            </div>
            <!-- <div class="p-1 px-2 pb-2 flex gap-1">
                <button class="btn btn-sm btn-soft">Delete</button>
                <button class="btn btn-sm btn-neutral flex-1">New</button>
            </div> -->
        {/if}
        
        </div>

        </div>
    </details>
</div>

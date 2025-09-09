# JavaScript Playground for Games
A fully fledged JavaScript Playground for web games. Can be extended with message based router API.

```svelte
<script lang="ts">
    import { Playground } from "$lib"
    import { onMount } from "svelte"

    let playground: Playground | undefined = $state(undefined)

    onMount(() => {
        if (!playground) return;
        
        playground.Canvas.addEventListener("onkeydown", (event) => {
            playground.postMessage("input:keydown", ...event)
            /* this can be listened to in the Playground via:
            self.addEventListener("message", (event: { data }) => {
                const { type, payload } = data;
                if (type === "input:keydown") {
                    const event = payload;
                    const { keyCode } = event;
                }
            })

            // or
            import { listen } from "/some/built/in/lib/idk"

            const dispose = listen("input", {
                keydown(payload) {
                    // do something with the keyboard events
                },
            })

            // when you are done make sure to clean up
            // dispose();
            */
        })

        const dispose = playground.listen("console", {
            log(payload) { console.log(payload) },
            error(payload) { console.log(payload) },
        })

        /* The playground can postMessage listened to by us via:
        postMessage({ type: "console:log", payload: "Hello world!" }) */

        return () => {
            dispose();
        }
    });
</script>

<Playground bind:this={playground}/>
```

# Svelte library

Everything you need to build a Svelte library, powered by [`sv`](https://npmjs.com/package/sv).

Read more about creating a library [in the docs](https://svelte.dev/docs/kit/packaging).

## Developing

Once you've created a project and installed dependencies with `pnpm install`, start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

Everything inside `src/lib` is part of your library, everything inside `src/routes` can be used as a showcase or preview app.

## Building

To build your library:

```sh
npm pack
```

To create a production version of your showcase app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Publishing

Go into the `package.json` and give your package the desired name through the `"name"` option. Also consider adding a `"license"` field and point it to a `LICENSE` file which you can create from a template (one popular option is the [MIT license](https://opensource.org/license/mit/)).

To publish your library to [npm](https://www.npmjs.com):

```sh
npm publish
```

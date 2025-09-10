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
            // listen to the input events within the playground scripts
            playground.postMessage("input:keydown", ...event)
        })

        return () => {
            dispose();
        }
    });
</script>

<Playground bind:this={playground}/>
```

# How to contribute
The best way to contribute will be to implement the core features that will be needed by the library. I'll be working to combine them into the actual working playground once they are finished. Each core feature should have it's own demo page where you can fully flesh it out and make sure it works `/components/[componentName]/+page.svelte`

- [ ] Monaco Code Editor Component (basically already done, it just needs hooked up to the file viewer) demo at `/components/code`

- [ ] File Viewer (UI to interact with the OPFS file system) demo at `/components/files`
    - [ ] Uploading files
    - [ ] Moving files
    - [ ] Deleting fils
    - [ ] Creating text files (maybe even allow creating png files??)
    - [ ] Creating new folders
    - [ ] Deleting folder recursively

- [ ] Canvas + messaging API for scripts (since you have to run the code in a web worker) demo at `/components/canvas`
    - [ ] Demo should have a single js script that gets run in a web worker. postMessage to the OffscreenCanvas
    - [ ] Use already created Monaco component (or a textarea) to edit the script that gets injected.
    - [ ] Develop an api around postMessage for playground example from previous playground -> https://codetoy.io/en/docs/post-message-api
    - THIS IS THE FUNNEST PART SINCE YOU CAN MAKE GAMES

- [ ] ServiceWorker Dev Server (will allow js modules support and multi-file projects instead of just injecting a single js script)
    - [ ] Read from OPFS and respond to requests from `/files/myawesomelib.js` so the playground scripts can run

- [ ] Blockly Code Editor (how it will work, how to run the generated code from a lbockly instance, how to represent the serialized blockly graph as a file in the file system. Allow editing blockly file through blocky + raw text through monaco)

- [ ] [luna console](https://github.com/liriliri/luna/blob/master/src/console/README.md) a super cool console that looks exactly like the chrome devtools console

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

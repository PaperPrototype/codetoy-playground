<script>
    import Playground from '$lib/components/Playground/component.svelte';
    import { onMount } from 'svelte';

    onMount(async () => {
        // const resp = await fetch("https://discord.com/api/v10/guilds/1362240675214528562?with_counts=true", {
        //     method: "GET",
        //     headers: {
        //         'Authorization': 'Bot YOUR_BOT_TOKEN_HERE'
        //     }
        // });
        // console.log(await resp.json())

        const response = await fetch(
            `https://discord.com/api/v9/invites/RjGwXa3jmp?with_counts=true`
        );
        console.log('response', await response.json());
    })
</script>

<Playground />

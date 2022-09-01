<script>
    import TopListens from './TopListens.svelte';
    import { fade } from 'svelte/transition'
    import { onMount } from 'svelte';

    let displayName = null
    onMount(getDisplayName)

    async function getDisplayName() {
        const userDataResponse = await fetch('/api/user')
        if (!userDataResponse.ok) {
            const error = await userDataResponse.text()
            throw new Error(error)
        }
        displayName = (await userDataResponse.json()).display_name
    }

    async function logout(code) {
        await fetch('logout', {method: 'POST'})
        window.location.href = '/login'
    }
</script>

<button on:click={logout} class="logout">Logout</button>

<h1>
    Hello{#if displayName}, <span class="displayName" transition:fade>{displayName}</span>{/if}!
</h1>

<TopListens/>

<style>
    .displayName {
        color: cornflowerblue;
    }
    .logout {
        position: absolute;
        right: 10px;
        top: 10px;
        padding: 5px;
        border: 2;
        border-radius: 7px;
        font-size: larger;
        background-color: aqua;
        cursor: pointer;
    }
    h1 {
        text-align: center;
    }
</style>
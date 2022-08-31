<script>
    import { PUBLIC_REDIRECT_URI } from '$env/static/public';
    import { onMount } from 'svelte';
 
    let promise = new Promise((resolve, reject) => {});
    let displayName = null
    let topListens = null

    onMount(() => {
        promise = loadData()
    })

    async function loadData() {
        // get user's display name
        const userDataResponse = await fetch('/api/user')
        if (!userDataResponse.ok) {
            const error = await userDataResponse.text()
            throw new Error(error)
        }
        displayName = (await userDataResponse.json()).display_name
        return 'ok'
    }

    async function logout(code) {
        await fetch('logout', {method: 'POST'})
        window.location.href = '/login'
    }
</script>

<button on:click={logout} class="logout">Logout</button>

{#await promise}
    <p>Loading...</p>
{:catch error}
    <p>Error!</p>
    <p>{error}</p>
{/await}

{#if displayName}
    <h1>Hello, <span class="green">{displayName}</span>!</h1>
{/if}

<style>
    .green {
        color: cornflowerblue;
    }
    .logout {
        position: absolute;
        right: 10px;
        top: 10px;
        border: 2;
        border-radius: 7px;
        font-size: larger;
        background-color: aqua;
        cursor: pointer;
    }
</style>
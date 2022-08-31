<script>
    import { PUBLIC_REDIRECT_URI } from '$env/static/public';
    import { onMount } from 'svelte';
 
    let promise = new Promise((resolve, reject) => {});
    let display_name = null

    onMount(() => {
        promise = loadData()
    })

    async function loadData() {
        const queryString = window.location.search
        if (queryString.length) {
            const urlParams = new URLSearchParams(queryString);
            if (urlParams.has('code')) {
                const code = urlParams.get('code');
                window.history.pushState("", "", PUBLIC_REDIRECT_URI); // remove param from url
                // make authorization request
                const authorizationResponse = await fetch("/login/authorize", {
                    method: 'POST',
                    body: code,
                    headers: {'Content-Type': 'text/plain'}
                })
                if (!authorizationResponse.ok) {
                    const error = await authorizationResponse.text()
                    throw new Error(error)
                }
                // await getTopListens()
            } else if (urlParams.has('error')) {
                const error = urlParams.get('error')
                throw new Error(error)
            } else {
                throw new Error('Something went wrong in loadData while parsing query string')
            }
        }
        const userDataResponse = await fetch('/api/user')
        if (!userDataResponse.ok) {
            const error = await userDataResponse.text()
            throw new Error(error)
        }
        display_name = (await userDataResponse.json()).display_name
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

{#if display_name}
    <h1>Hello, <span class="green">{display_name}</span>!</h1>
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
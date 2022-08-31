<script>
    import { PUBLIC_CLIENT_ID, PUBLIC_REDIRECT_URI } from '$env/static/public';
    import { onMount } from 'svelte';

    let promise = true
    let redirected = true

    onMount(() => {
        const queryString = window.location.search
        if (queryString.length) {
            const urlParams = new URLSearchParams(queryString);
            if (urlParams.has('code')) {
                promise = loadData(urlParams.get('code'))
            } else if (urlParams.has('error')) {
                const error = urlParams.get('error')
                throw new Error(error)
            } else {
                throw new Error('Something went wrong in loadData while parsing query string')
            }
        } else {
            redirected = false
        }
    })

    async function loadData(code) {
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
        window.location.href = '/'
    }


    function requestAuthorization() {
        let url = 'https://accounts.spotify.com/authorize?'
        const urlSearchParams  = new URLSearchParams({
            client_id: PUBLIC_CLIENT_ID,
            response_type: 'code',
            redirect_uri: encodeURI(PUBLIC_REDIRECT_URI),
            // show_dialog: true,
            scope: 'user-top-read user-library-read playlist-read-private playlist-read-collaborative playlist-modify-public'
        })
        url += urlSearchParams.toString()
        window.location.href = url // Show Spotify's authorization screen
    }
    let consent = false;
</script>

{#await promise}
    <p>Redirecting...</p>
{:catch error}
    <p>Error!</p>
    <p>{error}</p>
{/await}

{#if !redirected}
    <div style='display: flex; justify-content: center; align-items: center;'>
        <img style="width: 100px; height: 100px; margin-right: 20px;" src='favicon.png' alt='music with friends icon'>
        <div style="display: flex; flex-direction: column; align-items: center;">
            <h1>Music With Friends</h1>
            <h2>By Bhavya Phogat</h2>
        </div>
    </div>
    <p>Are you someone who loves talking about music with your friends?</p>
    <p>Did you make a new friend who just asked you 'so what music do you listen to?'</p>
    <p>Did you just get put on aux in the car and you want to make sure you play something everyone likes?</p>
    <p>This website fixes all these problem! Let's compare your music with another Spotify user and see what you have in common with each other. By scanning your Spotify library, we will automatically create a playlist of all the artists and tracks that both of you listen to.</p>
    <p><b>Click below to authenticate with Spotify.</b></p>
    <p style='font-size: smaller;'>I understand that after I authenticate my Spotify account with this app, this app will scan my Spotify library (including liked songs, public & private playlists, and top artists & tracks). I understand that this data will be temporarily stored and only used to create a playlist containing the mutual music between me and another Spotiy user.</p>
    <input type='checkbox' bind:checked={consent} id='consent'>
    <label for='consent' style='width: 100%;'>I agree with the statement above.</label>
    <br>
    <br>
    <button on:click={requestAuthorization} disabled={!consent}>Sign in with Spotify</button>
{/if}

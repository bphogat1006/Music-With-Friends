<script>
    import TopListensItem from "./TopListensItem.svelte";
    import { onMount } from "svelte";
    import { tweened } from 'svelte/motion';
 
    let topArtistsData = null
    let topTracksData = null
    let timeRange = 'medium_term'
    let topItemsLimit = 10
    const topItemsLimitTweened = tweened(topItemsLimit, {duration: 400})

    onMount(getTopListens)

    async function getTopListens() {
        getTopArtists()
        getTopTracks()
    }

    async function getTopArtists() {
        topArtistsData = null
        const topArtistsResponse = await fetch('/api/top/artists?time_range='+timeRange)
        if (!topArtistsResponse.ok) {
            const error = await topArtistsResponse.text()
            throw new Error(error)
        }
        topArtistsData = (await topArtistsResponse.json()).map(artist => new Object({
            id: artist.id,
            title: artist.name,
            img: artist.img
        }))
    }

    async function getTopTracks() {
        topTracksData = null
        const topTracksResponse = await fetch('/api/top/tracks?time_range='+timeRange)
        if (!topTracksResponse.ok) {
            const error = await topTracksResponse.text()
            throw new Error(error)
        }
        topTracksData = (await topTracksResponse.json()).map(track => new Object({
            id: track.id,
            title: track.name,
            subtitle: track.artist,
            img: track.img
        }))
    }

    async function logout(code) {
        await fetch('logout', {method: 'POST'})
        window.location.href = '/login'
    }
</script>

<h2>Your Recent Favorites</h2>
{#if topArtistsData}
    <div style="display: flex; justify-content: center;">
        <p>Time Range:</p>
        <select bind:value={timeRange} on:change={getTopListens}>
            <option value="short_term">1 Month</option>
            <option value="medium_term" selected>6 Months</option>
            <option value="long_term">Long Term</option>
        </select>
    </div>
    <br>
    <div style="display: flex; justify-content: center;">
        <p>Number of items to show:</p>
        <input type="range" bind:value={topItemsLimit} min=10 max=50 on:input={e => topItemsLimitTweened.set(parseInt(e.target.value))}>
        <p>{Math.round(topItemsLimit)}</p>
    </div>

    <h3>Top Artists</h3>
    <div class="topListens">
        {#each topArtistsData.slice(0, $topItemsLimitTweened) as item}
            <TopListensItem {...item}></TopListensItem>
        {/each}
    </div>
{/if}

{#if topTracksData}
    <h3>Top Tracks</h3>
    <div class="topListens">
        {#each topTracksData.slice(0, $topItemsLimitTweened) as item}
            <TopListensItem {...item}></TopListensItem>
        {/each}
    </div>
{/if}

<style>
    h2, h3 {
        text-align: center;
    }
    p {
        margin-right: 5px;
    }
    .topListens {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
    }
</style>
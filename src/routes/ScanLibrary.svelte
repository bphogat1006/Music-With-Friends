<script>
    import { onMount } from "svelte";
    import { tweened } from "svelte/motion";
    import { cubicOut } from 'svelte/easing';
    import { fade } from 'svelte/transition';
    
    let promise = null
    let currentObject = null
    const tweenOptions = {
        easing: cubicOut,
        duration: 1000
    }
    let scanStatus = null
    const scanProgress = tweened(0, tweenOptions)
    const pollingDelay = 200
    export let inProgress
    onMount(async () => {
        if (inProgress) {
            promise = pollForProgressUpdates()
        }
    })

    async function scanLibrary() {
        pollForProgressUpdates()
        const scanResponse = await fetch('/api/scan', {
            method: 'POST'
        })
        if (!scanResponse.ok) {
            const error = await scanResponse.text()
            throw new Error(error)
        }
        return 'Done'
    }

    async function pollForProgressUpdates() {
        let started = false
        while (true) {
            const progress = await getProgress().catch((error) => {throw new Error(error)})
            if (!started) {
                if (progress) {
                    started = true
                } else {
                    continue
                }
            }
            if (started && !progress) break

            currentObject = progress.currentObject
            scanStatus = progress.for
            $scanProgress = progress.progress

            await delay(pollingDelay)
        }
    }

    async function getProgress() {
        const res = await fetch('/api/scan/progress')
        if (res.ok) {
            return await res.json()
        } else if (res.status===503) {
            return null
        }
        throw new Error(await res.text())
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
</script>

<h2>Scan Library</h2>

{#if promise===null}
    <button on:click={() => promise=scanLibrary()}>Start</button>
{:else}
    {#await promise}
        {#if scanStatus}
            <p>{scanStatus}</p>
            <p>{currentObject}</p>
            {#if scanStatus==="Liked Songs"}
                <p>{Math.round($scanProgress)}</p>
            {:else}
                <div transition:fade>
                    <progress value={$scanProgress} max=1></progress>
                </div>
            {/if}
        {/if}
    {:then value}
        <p>{value}</p>
    {:catch error}
        <p>{error}</p>
    {/await}
{/if}
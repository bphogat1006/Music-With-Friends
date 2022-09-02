<script>
    import { scale, slide } from "svelte/transition";
    import { cubicInOut } from "svelte/easing"
    
    export let id;
    export let title;
    export let subtitle = null;
    export let img = null;
    
    let type = subtitle ? 'track' : 'artist'
    
    function openLink() {scale
        const url = `https://open.spotify.com/${type}/${id}`
        window.open(url, '_blank');
    }
</script>

<div class="row" out:slide={{easing: cubicInOut}} in:scale={{duration: 600}} on:click={openLink}>
    {#if img}
        <img src={img} alt={title}>
    {/if}
    <div class="col">
        <p><b>{title}</b></p>
        {#if subtitle}
            <p>{subtitle}</p>
        {/if}
    </div>
</div>

<style>
    .row {
        display: inline-flex;
        align-items: center;
        padding: 5px 15px;
        margin: 4px 8px;
        background-color: aliceblue;
        border-radius: 25px;
        cursor: pointer;
    }
    .col {
        text-align: center;
    }
    p {
        margin: 0;
    }
    img {
        width: auto;
        height: 50px;
        margin-right: 10px;
        border-radius: 10px;
    }
</style>
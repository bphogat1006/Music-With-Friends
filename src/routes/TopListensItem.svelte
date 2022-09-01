<script>
    import { fly, slide } from "svelte/transition";

    export let title;
    export let subtitle = null;
    export let img;
</script>

<div class="row" in:fly="{{y: -100, duration: 400}}" out:slide>
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
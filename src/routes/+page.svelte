<script>
    import ScanLibrary from './ScanLibrary.svelte';
    import TopListens from './TopListens.svelte';

    export let data
    const displayName = data.displayName

    async function logout(code) {
        await fetch('logout', {method: 'POST'})
        window.location.href = '/login'
    }
</script>

<button on:click={logout} class="logout">Logout</button>

<h1>
    Hello, <span class="displayName">{displayName}</span>!
</h1>

<ScanLibrary inProgress={data.inProgress}/>

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
<script>
    export let users;
    let promise = null;
    async function select(e) {
        const user = e.target.value
        const compareResponse = await fetch('/api/compare?user='+user, {method: 'POST'})
        if (!compareResponse.ok) {
            const error = await compareResponse.text()
            throw new Error(error)
        }
    }
</script>

<h2>Select a User</h2>
<select on:change={e => {promise = select(e)}}>
    <option value="null">Select a user</option>
    {#each users as user}
    <option
        value={user.id}>
        {user.display_name}
        {#if user.display_name !== user.id}
            <span style="color: #aaa;">({user.id})</span>
        {/if}
    </option>
    {/each}
</select>

{#if promise !== null}
    {#await promise}
        <p>Working...</p>
    {:then value}
        <p>{value}</p>
    {:catch error}
        <p>{error}</p>
    {/await}
{/if}
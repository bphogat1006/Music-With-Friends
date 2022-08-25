<script>
    let name = 'Bhavya'
</script>

<input type="text" bind:value={name}>
<h1>Hello {name === '' ? '____' : name}</h1>
<p>Lorem ipsum dolor</p>
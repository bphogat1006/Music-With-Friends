import { PUBLIC_HOSTNAME } from '$env/static/public'
import { query } from '$lib/db'

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const authHeader = request.headers.get('Authorization')
    const cookieHeader = request.headers.get('cookie')
    const session_id = cookieHeader.split('session=')[1].split(';')[0]
    const user_id = (await query(`select * from sessions where session_id='${session_id}'`))[0].user_id
    
    // abort if there is an ongoing process
    const ongoingProcess = await query(`
        SELECT * FROM progress WHERE user_id='${user_id}'
    `)
    if (ongoingProcess.length) {
        return new Response('There is another ongoing process', {status: 409})
    }

    // commence library scan
    const headers = {
        'cookie': cookieHeader,
        'Authorization': authHeader
    }
    try {
        // delete user library data from db
        await query(`
            DELETE FROM tracks WHERE user_id='${user_id}';
        `)  
        await query(`
            DELETE FROM artists WHERE user_id='${user_id}';
        `)

        // insert row into 'progress' table
        await query(`INSERT INTO progress (user_id, \`for\`) VALUES ('${user_id}', 'Liked Songs')`)

        // scan library
        // saved tracks
        const scanTracksResponse = await fetch(PUBLIC_HOSTNAME + '/api/scan/tracks', {headers})
        if (!scanTracksResponse.ok) {
            const err = await scanTracksResponse.text()
            throw new Error(scanTracksResponse.status + ': ' + err)
        }
        const savedTracks = await scanTracksResponse.json()
        // playlists tracks
        const scanPlaylistsResponse = await fetch(PUBLIC_HOSTNAME + '/api/scan/playlists', {headers})
        if (!scanPlaylistsResponse.ok) {
            const err = await scanPlaylistsResponse.text()
            throw new Error(scanPlaylistsResponse.status + ': ' + err)
        }
        const playlistsTracks = await scanPlaylistsResponse.json()
        // top artists
        const topArtistsResponse = await fetch(PUBLIC_HOSTNAME + '/api/top/artists?time_range=long_term', {headers})
        if (!topArtistsResponse.ok) {
            const err = await topArtistsResponse.text()
            throw new Error(topArtistsResponse.status + ': ' + err)
        }
        const topArtistsData = await topArtistsResponse.json()
        const topArtists = topArtistsData.map(artist => artist.id)
        // top tracks
        const topTracksResponse = await fetch(PUBLIC_HOSTNAME + '/api/top/tracks?time_range=long_term', {headers})
        if (!topTracksResponse.ok) {
            const err = await topTracksResponse.text()
            throw new Error(topTracksResponse.status + ': ' + err)
        }
        const topTracksData = await topTracksResponse.json()
        const topTracks = topTracksData.map(track => track.id)
        
        // analyze data
        await query(`
            UPDATE progress p
            SET p.progress=0, currentObject=NULL, p.for='Analyzing'
            WHERE user_id='${user_id}'
        `)
        const totalProgress = savedTracks.length + playlistsTracks.length + topArtists.length + topTracks.length
        let progress = 0
        function incrementProgress() {
            progress += 1 / totalProgress
            if (Math.random() < 0.9) return
            query(`
                UPDATE progress p
                SET p.progress='${progress}'
                WHERE user_id='${user_id}'
            `)
        }
        const artistsInserted = new Map();
        // insert saved tracks
        for (const track of savedTracks) {
            if (!artistsInserted.has(track.artist.id)) {
                await query(`
                    INSERT INTO artists (id, user_id, topArtistsRanking)
                    VALUES ('${track.artist.id}', '${user_id}', ${topArtists.indexOf(track.artist.id)})
                `)
                artistsInserted.set(track.artist.id, null)
            }
            query(`
                INSERT INTO tracks (id, artist_id, user_id, liked, topTracksRanking)
                VALUES ('${track.id}', '${track.artist.id}', '${user_id}', 1, ${topTracks.indexOf(track.id)})
            `)
            incrementProgress()
        }
        // insert playlist tracks
        for (const track of playlistsTracks) {
            if (!artistsInserted.has(track.artist.id)) {
                await query(`
                    INSERT INTO artists (id, user_id, topArtistsRanking)
                    VALUES ('${track.artist.id}', '${user_id}', ${topArtists.indexOf(track.artist.id)})
                `)
                artistsInserted.set(track.artist.id, null)
            }
            query(`
                INSERT INTO tracks (id, artist_id, user_id, liked, topTracksRanking, playlistOccurrences)
                VALUES ('${track.id}', '${track.artist.id}', '${user_id}', 0, ${topTracks.indexOf(track.id)}, 1)
                ON DUPLICATE KEY UPDATE playlistOccurrences = playlistOccurrences + 1
            `)
            incrementProgress()
        }
        // insert remaining top artists/tracks
        for (const artist of topArtists) {
            if(!artistsInserted.has(artist)) {
                await query(`
                    INSERT INTO artists (id, user_id, topArtistsRanking)
                    VALUES ('${artist}', '${user_id}', ${topArtists.indexOf(artist)})
                `)
                artistsInserted.set(artist, null)
            }
            incrementProgress()
        }
        const allTracks = savedTracks.concat(playlistsTracks)
        loop: for (const topTrack of topTracksData) {
            incrementProgress()
            for (const track of allTracks) {
                if (topTrack.id === track.id) {
                    continue loop
                }
            }
            if (!artistsInserted.has(topTrack.artist.id)) {
                await query(`
                    INSERT INTO artists (id, user_id, topArtistsRanking)
                    VALUES ('${topTrack.artist.id}', '${user_id}', ${topArtists.indexOf(topTrack.artist.id)})
                `)
                artistsInserted.set(topTrack.artist.id, null)
            }
            query(`
                INSERT INTO tracks (id, artist_id, user_id, liked, topTracksRanking)
                VALUES ('${topTrack.id}', '${topTrack.artist.id}', '${user_id}', 0, ${topTracks.indexOf(topTrack.id)})
            `)
        }
    } catch (error) {
        console.log(error)
        return new Response(error, {status: 500})
    } finally {
        // delete row from progress table
        await query(`DELETE FROM progress WHERE user_id='${user_id}'`)
    }
    return new Response(null, {status: 200})
}
import { PUBLIC_SPOTIFY_API_URI } from '$env/static/public'
import { query } from '$lib/db'
import { error } from '@sveltejs/kit'

/** @type {import('./$types').RequestHandler} */
export async function GET({ request }) {
    const authHeader = request.headers.get('Authorization')
    const cookieHeader = request.headers.get('cookie')
    const session_id = cookieHeader.split('session=')[1].split(';')[0]
    const user_id = (await query(`select * from sessions where session_id='${session_id}'`))[0].user_id
    
    // get user's playlists
    await query(`
        UPDATE progress p
        SET p.for='Playlists', p.progress=0, currentObject='Getting playlists...'
        WHERE user_id='${user_id}'
    `)
    let allPlaylists = []
    let offset = 0
    let totalNumTracks = 0
    while (true) {
        const queryParams = new URLSearchParams({
            limit: 50,
            offset
        })
        const fetchUrl = PUBLIC_SPOTIFY_API_URI+'/me/playlists?' + queryParams
        const response = await fetch(fetchUrl, {
            headers: {
                'Authorization': authHeader
            }
        })
        if (!response.ok) {
            const err = await response.json()
            throw error(response.status, JSON.stringify(err))
        }
        let playlists = (await response.json()).items
        if (!playlists.length) break
        playlists = playlists.filter(playlist => playlist.owner.id === user_id)
        playlists = playlists.map(playlist => {
            totalNumTracks += parseInt(playlist.tracks.total)
            return {
                name: playlist.name,
                id: playlist.id
            }
        })
        allPlaylists = allPlaylists.concat(playlists)
        offset += 50
    }
    // get playlists' tracks
    let progress = 0
    let playlistsTracks = []
    loop: for (let playlist of allPlaylists) {
        offset = 0
        while (true) {
            const queryParams = new URLSearchParams({
                limit: 50,
                offset
            })
            const fetchUrl = `${PUBLIC_SPOTIFY_API_URI}/playlists/${playlist.id}/tracks?${queryParams}`
            const response = await fetch(fetchUrl, {
                headers: {
                    'Authorization': authHeader
                }
            })
            if (!response.ok) {
                const err = await response.json()
                throw error(response.status, JSON.stringify(err))
            }
            let tracks = (await response.json()).items
            if (!tracks.length) break
            tracks = tracks.map((track) => ({
                artist: {
                    id: track.track.artists[0].id,
                    name: track.track.artists[0].name
                },
                id: track.track.id,
                name: track.track.name,
            }))
            playlistsTracks = playlistsTracks.concat(tracks)
            offset += 50
            // update db
            progress += tracks.length / totalNumTracks
            let currentObject = playlist.name.replaceAll("'", "''").replace(/[^\x00-\x7F]/g, "")
            await query(`
                UPDATE progress p
                SET p.progress='${progress}', currentObject='${currentObject}'
                WHERE user_id='${user_id}'
            `)

            // TEMP
            // if (progress > 0.1) break loop
        }
    }
    return new Response(JSON.stringify(playlistsTracks), {status: 200})
}
import { PUBLIC_SPOTIFY_API_URI } from '$env/static/public'
import { query } from '$lib/db'
import { error } from '@sveltejs/kit'

/** @type {import('./$types').RequestHandler} */
export async function GET({ request }) {
    const authHeader = request.headers.get('Authorization')
    const cookieHeader = request.headers.get('cookie')
    const session_id = cookieHeader.split('session=')[1].split(';')[0]
    const user_id = (await query(`select * from sessions where session_id='${session_id}'`))[0].user_id
    
    // get saved tracks
    let savedTracks = []
    let progress = 0
    let offset = 0
    while (true) {
        const queryParams = new URLSearchParams({
            limit: 50,
            offset
        })
        const fetchUrl = PUBLIC_SPOTIFY_API_URI+'/me/tracks?' + queryParams
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
            name: track.track.name
        }))
        savedTracks = savedTracks.concat(tracks)
        offset += 50
        // update db
        progress += tracks.length
        const rand = parseInt(Math.random()*tracks.length)
        let currentObject = tracks[rand].artist.name + ' ...'
        currentObject = currentObject.replaceAll("'", "''").replace(/[^\x00-\x7F]/g, "")
        await query(`
            UPDATE progress p
            SET p.progress='${progress}', currentObject='${currentObject}'
            WHERE user_id='${user_id}'
        `)

        // TEMP
        // if (progress > 200) break
    }
    await query(`
        UPDATE progress p
        SET p.progress='0', currentObject=NULL, p.for='Playlists'
        WHERE user_id='${user_id}'
    `)
    return new Response(JSON.stringify(savedTracks), {status: 200})
}
import { PUBLIC_SPOTIFY_API_URI } from '$env/static/public'
import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, url }) {
    const authHeader = request.headers.get('Authorization')
    const time_range = url.searchParams.get('time_range')
    const queryParams = new URLSearchParams({
        limit: 50,
        time_range
    })
    const fetchUrl = PUBLIC_SPOTIFY_API_URI+'/me/top/tracks?' + queryParams
    const response = await fetch(fetchUrl, {
        headers: {
            'Authorization': authHeader
        }
    })
    if (!response.ok) {
        const err = await response.json()
        throw error(response.status, JSON.stringify(err))
    }
    const data = (await response.json()).items.map((track) => new Object({
        id: track.id,
        name: track.name,
        artist: {
            id: track.artists[0].id,
            name: track.artists[0].name
        },
        img: (track.album.images && track.album.images[0]) ? track.album.images[track.album.images.length-1].url : null
    }))
    return new Response(JSON.stringify(data), { status: 200 })
}
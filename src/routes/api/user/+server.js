import { PUBLIC_SPOTIFY_API_URI } from '$env/static/public'
import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, locals }) {
    const authHeader = request.headers.get('Authorization')
    const url = PUBLIC_SPOTIFY_API_URI+'/me'
    const userDataResponse = await fetch(url, {
        headers: {
            'Authorization': authHeader
        }
    })
    if (!userDataResponse.ok) {
        const err = await userDataResponse.json()
        throw error(userDataResponse.status, JSON.stringify(err))
    }
    const { display_name } = await userDataResponse.json()

    return new Response(JSON.stringify({display_name}), { status: 200 })
}
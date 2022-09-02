import { query } from '$lib/db'
import { error } from '@sveltejs/kit'

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader && cookieHeader.includes('session')) {
        const session_id = cookieHeader.split('session=')[1].split(';')[0]
        await query(`DELETE FROM sessions WHERE session_id='${session_id}'`)
    }
    return new Response(null, {
        status: 200,
        headers: {
            'Set-Cookie': `session=deleted; Path=/; Max-Age=0; Secure; HttpOnly`
        }
    })
}
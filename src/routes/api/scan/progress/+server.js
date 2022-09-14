import { query } from '$lib/db'

/** @type {import('./$types').RequestHandler} */
export async function GET({ request }) {
    const cookieHeader = request.headers.get('cookie')
    const session_id = cookieHeader.split('session=')[1].split(';')[0]
    const user_id = (await query(`select * from sessions where session_id='${session_id}'`))[0].user_id

    const rows = await query(`
        SELECT p.for, progress, currentObject FROM progress p
        WHERE user_id='${user_id}'
    `)
    if (!rows.length) {
        return new Response(null, {status: 503})
    }
    
    return new Response(JSON.stringify(rows[0]), {status: 200})
}
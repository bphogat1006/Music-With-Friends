import { query } from '$lib/db'
import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    const pathname = event.url.pathname
    if (!pathname.startsWith('/login')) {
        const cookieHeader = event.request.headers.get('cookie')
        if (cookieHeader && cookieHeader.includes('session')) {
            const session_id = cookieHeader.split('session=')[1].split(';')[0]
            const queryResult = await query(`select access_token from users where session_id='${session_id}'`)
            const auth = queryResult[0].access_token
            event.request.headers.set('Authorization', auth)
            event.locals.valid = true
        }
    }
    return await resolve(event);
}

/** @type {import('@sveltejs/kit').HandleError} */
export function handleError({ error, event }) {
    const errorString = JSON.stringify({
        error,
        event
    }).replaceAll('\'', '`')
    const queryString = `insert into log (type, error) values ('error', '${errorString}')`
    query(queryString)
}
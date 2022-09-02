import { query } from '$lib/db'
import { error } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    const pathname = event.url.pathname
    console.log(pathname + ' : ' + event.request.method)
    if (pathname.startsWith('/login') || pathname.startsWith('/logout') || pathname.startsWith('/api/refresh')) {
        console.log(pathname + ' : allowed')
    }
    else if (!event.locals.valid) {
        const cookieHeader = event.request.headers.get('cookie')
        if (cookieHeader && cookieHeader.includes('session')) {
            const session_id = cookieHeader.split('session=')[1].split(';')[0]
            const refreshResponse = await fetch(event.url.origin + '/api/refresh', {body:session_id,method:'POST'}) // refresh access token
            if (!refreshResponse.ok) {
                const err = await refreshResponse.json()
                console.log('Failed to refresh access token')
                throw error(refreshResponse.status, JSON.stringify(err))
            }
            const queryResult = await query(`select access_token from users join sessions on (users.id=sessions.user_id) where session_id='${session_id}'`)
            const access_token = queryResult[0].access_token
            const authHeader = 'Bearer ' + access_token
            event.request.headers.set('Authorization', authHeader)
            event.locals.valid = true
            console.log(pathname + ' : credentials validated')
        } else {
            console.log(pathname + ' : invalid session')
        }
    } else {
        console.log(pathname + ' : credentials already validated')
    }
    return await resolve(event);
}

/** @type {import('@sveltejs/kit').HandleError} */
export async function handleError({ error, event }) {
    if (JSON.stringify(error) === '{}') return
    const errorString = JSON.stringify({
        error,
        event
    }).replaceAll('\'', '`')
    const queryString = `INSERT INTO log (type, error) VALUES ('error', '${errorString}')`
    await query(queryString)
}
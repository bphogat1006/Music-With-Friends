import {query} from '$lib/db'
import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    const pathname = event.url.pathname
    console.log(pathname)
    if (pathname.startsWith('/login') || pathname === '/') {
        return await resolve(event);
    }
    const cookieHeader = event.request.headers.get('cookie')
    console.log(cookieHeader)
    if (cookieHeader && cookieHeader.includes('session')) {
        const session_id = cookieHeader.split('session=')[1].split(';')[0]
        const queryResult = await query(`select access_token from users where session_id='${session_id}'`)
        const auth = queryResult[0].access_token
        event.request.headers.set('Authorization', auth)
        // event.locals.authorization = auth
        return await resolve(event);
    }
    throw redirect(307, '/login')

    return await resolve(event);
}
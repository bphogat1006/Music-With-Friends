import { PUBLIC_HOSTNAME } from '$env/static/public'
import { redirect } from '@sveltejs/kit';
import { query } from '$lib/db'

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ request, locals }) {
    // redirect if session is invalid
    if (!locals.valid) {
        throw redirect(307, '/login');
    }
    // set page data
    const pageData = {}
    // get user's display name
    const userDataResponse = await fetch(PUBLIC_HOSTNAME + '/api/user', {headers: {
        cookie: request.headers.get('cookie')
    }})
    if (!userDataResponse.ok) {
        const error = await userDataResponse.text()
        throw new Error(error)
    }
    const displayName = (await userDataResponse.json()).display_name
    pageData.displayName = displayName
    // check if there is a library scan in progress
    const progressResponse = await fetch(PUBLIC_HOSTNAME + '/api/scan/progress', {headers: {
        cookie: request.headers.get('cookie')
    }})
    if (progressResponse.ok) {
        const progress = await progressResponse.json()
        if (progress.for !== 'Building Playlist') {
            pageData.scanInProgress = true
        }
    }
    const users = await query(`
        SELECT id, display_name FROM users
        WHERE display_name<>'${displayName}'
    `)
    pageData.users = users
    return pageData
}
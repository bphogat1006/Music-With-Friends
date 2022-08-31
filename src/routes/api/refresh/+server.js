import { PUBLIC_SPOTIFY_ACCOUNT_URI, PUBLIC_SPOTIFY_API_URI, PUBLIC_REDIRECT_URI, PUBLIC_CLIENT_ID } from '$env/static/public';
import { CLIENT_SECRET } from '$env/static/private';
import { query } from '$lib/db'
import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({request}) {
    // set fetch params
    const session_id = await request.text()
    const {refresh_token} = (await query(`select refresh_token from users where session_id='${session_id}'`))[0]
    const requestParameters = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token
    }).toString()
    const tokenUrl = PUBLIC_SPOTIFY_ACCOUNT_URI + '/api/token'
    const authHeader = 'Basic ' + Buffer.from(`${PUBLIC_CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
    const fetchOptions = {
        method: 'POST',
        body: requestParameters,
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }
    // fetch token data
    const response = await fetch(tokenUrl, fetchOptions)
    // handle response
    if (!response.ok) {
        const err = await response.json()
        console.log(err)
        throw error(response.status, JSON.stringify(err))
    }
    const {access_token, expires_in} = await response.json()
    
    // update access token
    await query(`update users set access_token='${access_token}' where refresh_token='${refresh_token}'`)
}
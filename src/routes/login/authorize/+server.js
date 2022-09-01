import { PUBLIC_SPOTIFY_ACCOUNT_URI, PUBLIC_SPOTIFY_API_URI, PUBLIC_REDIRECT_URI, PUBLIC_CLIENT_ID } from '$env/static/public';
import { CLIENT_SECRET } from '$env/static/private';
import { query } from '$lib/db'
import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({request}) {
    async function getTokenData() {
        // set fetch params
        const authCode = await request.text()
        const requestParameters = new URLSearchParams({
            grant_type: 'authorization_code',
            code: authCode,
            redirect_uri: PUBLIC_REDIRECT_URI,
        }).toString()
        const tokenUrl = PUBLIC_SPOTIFY_ACCOUNT_URI + '/api/token'
        const auth = 'Basic ' + Buffer.from(`${PUBLIC_CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
        const fetchOptions = {
            method: 'POST',
            body: requestParameters,
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
        // fetch token data
        const response = await fetch(tokenUrl, fetchOptions)
        // handle response
        if (!response.ok) {
            const err = await response.json()
            throw error(response.status, JSON.stringify(err))
        }
        const data = await response.json()
        return {
            'access_token': data.access_token,
            'refresh_token': data.refresh_token,
            "expires_in": data.expires_in
        }
    }

    async function getUserData(access_token) {
        const url = PUBLIC_SPOTIFY_API_URI+'/me'
        const response = await fetch(url, {
            headers: {
                'Authorization': 'Bearer '+access_token
            }
        })
        if (!response.ok) {
            const err = await response.json()
            throw error(response.status, JSON.stringify(err))
        }
        return await response.json()
    }

    // get access & refresh tokens and expiration time (in seconds)
    const {access_token, refresh_token, expires_in} = await getTokenData()
    const expiration = parseInt(Date.now()/1000) + expires_in

    // get user data
    const {display_name, id} = await getUserData(access_token)

    // generate a session ID
    const session_id = parseInt(Math.random()*1000000)

    // insert user into db
    // check if user exists first!
    const queryResult = await query(`select * from users where id='${id}';`)
    if (queryResult.length !== 1) {
        if (queryResult.length > 1) {
            await query('delete from users where id='+id)
        }
        await query(`
            insert into users
            (id, display_name, access_token, refresh_token, session_id, expiration)
            values ('${id}', '${display_name}', '${access_token}', '${refresh_token}', '${session_id}', '${expiration}')
        `)
    } else {
        await query(`
            update users
            set display_name='${display_name}', access_token='${access_token}', refresh_token='${refresh_token}', session_id='${session_id}', expiration='${expiration}'
            where id='${id}'
        `)
    }

    const maxSessionAge = 2*365*24*60*60 // 2 years
    return new Response(null, {
        status: 200,
        headers: {
            'Set-Cookie': `session=${session_id}; Path=/; Max-Age=${maxSessionAge}; Secure; HttpOnly`
        }
    })
}
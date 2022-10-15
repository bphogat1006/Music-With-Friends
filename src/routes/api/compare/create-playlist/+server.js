import { PUBLIC_SPOTIFY_API_URI } from '$env/static/public'
import { query } from '$lib/db'
import { error } from '@sveltejs/kit'
import axios from 'axios'

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const { user1, user2, user1TopMusic, user2TopMusic, mutualMusic } = await request.json()
    console.log(user1, user2, user1TopMusic, user2TopMusic, mutualMusic)
    
    for (const user of [user1, user2]) {
        try {
            // create playlist
            const {access_token} = (await query(`select access_token from users where id='${user}'`))[0]
            const authHeader = 'Bearer ' + access_token
            const headers = {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
            const fetchUrl = PUBLIC_SPOTIFY_API_URI+`/users/${user}/playlists`
            const createPlaylistResponse = await axios.post(fetchUrl, JSON.stringify({
                    name: 'Music With Friends: USER1 and USER2',
                    description: `A playlist of all the music you two have in common with each other!\nCreated on _________`,
                    public: true
                }),
                { headers }
            )
            const playlistID = createPlaylistResponse.data.id
            
            // add tracks to playlist
            let progress = 0
            const playlistUrl = PUBLIC_SPOTIFY_API_URI+`/playlists/${playlistID}/tracks`
            for (const artist of mutualMusic) {
                const uris = []
                if (artist.tracks.length === 0) {
                    const user1Tracks = user1TopMusic[artist.id].tracks
                    const user2Tracks = user2TopMusic[artist.id].tracks
                    for (let i=0; i < Math.min(user1Tracks.length, user2Tracks.length, 2); i++) {
                        uris.push('spotify:track:'+user1Tracks[i].id)
                        uris.push('spotify:track:'+user2Tracks[i].id)
                    }
                    if (uris.length === 0) {
                        const { tracks } = await (await fetch(PUBLIC_SPOTIFY_API_URI+`/artists/${artist.id}/top-tracks?market=us`, {headers})).json()
                        tracks.forEach(track => {
                            if (uris.length < 4) {
                                uris.push(track.uri)
                            }
                        });
                    }

                } else {
                    for (let i=0; i < Math.min(8, artist.tracks.length); i++) {
                        uris.push('spotify:track:'+artist.tracks[i].id)
                    }
                }
                await fetch(playlistUrl, {
                    method: 'POST',
                    body: JSON.stringify({uris}),
                    headers
                })

                progress += 1/mutualMusic.length
                console.log(progress)
            }
        } catch (error) {
            console.log(error)
            return new Response(error, {status: 500})
        }
        break
    }
    
    return new Response(null, {status: 200})
}
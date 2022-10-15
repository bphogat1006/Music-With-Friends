import { PUBLIC_HOSTNAME, PUBLIC_SPOTIFY_API_URI } from '$env/static/public'
import { query } from '$lib/db'
import { error } from '@sveltejs/kit'

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, url }) {
    const authHeader = request.headers.get('Authorization')
    const cookieHeader = request.headers.get('cookie')
    const session_id = cookieHeader.split('session=')[1].split(';')[0]
    const user_id = (await query(`select * from sessions where session_id='${session_id}'`))[0].user_id
    const friend_id = url.searchParams.get('user')
    
    // abort if there is an ongoing process
    const ongoingProcess = await query(`
        SELECT * FROM progress WHERE user_id='${user_id}' OR user_id='${friend_id}'
    `)
    if (ongoingProcess.length) {
        return new Response('There is another ongoing process', {status: 409})
    }

    try {
        // insert row into 'progress' table
        await query(`INSERT INTO progress (user_id, \`for\`) VALUES ('${user_id}', 'Building Playlist')`)
        await query(`INSERT INTO progress (user_id, \`for\`) VALUES ('${friend_id}', 'Building Playlist')`)

        // get each user's artists/tracks ranked by a point system
        async function queryTopMusic(user) { 
            return await query(`
                SELECT
                    artist_id,
                    t.id AS track_id,
                    points AS artistPoints,
                    liked + playlistOccurrences*2 + IF(t.topTracksRanking=-1, 0, 100-t.topTracksRanking) AS trackPoints
                FROM (
                    SELECT
                        id AS artist_id,
                        likedCount + playlistOccurrences*2 + topTracksPoints + topArtistsPoints AS points,
                        user_id
                    FROM (
                        SELECT
                            a.id,
                            IF(a.topArtistsRanking=-1, 0, 100-a.topArtistsRanking) AS topArtistsPoints,
                            SUM(t.liked) AS likedCount,
                            SUM(t.playlistOccurrences) AS playlistOccurrences,
                            SUM(IF(t.topTracksRanking=-1, 0, 100-t.topTracksRanking)) AS topTracksPoints,
                            a.user_id
                        FROM artists a
                        JOIN tracks t ON (a.id=t.artist_id AND a.user_id=t.user_id)
                        WHERE a.user_id='${user}'
                        GROUP BY a.id
                    ) pointsTable
                ) p
                JOIN tracks t USING (artist_id, user_id)
                ORDER BY artistPoints DESC, trackPoints DESC
            `)
        }
        // reshape data
        function reduceFunction(obj, curr) {
            if (obj.has(curr.artist_id)) {
                const newVal = obj.get(curr.artist_id)
                newVal.tracks = newVal.tracks.concat([{
                    id: curr.track_id,
                    points: curr.trackPoints
                }])
                obj.set(curr.artist_id, newVal)
            } else {
                obj.set(curr.artist_id, {
                    points: curr.artistPoints,
                    tracks: [{
                        id: curr.track_id,
                        points: curr.trackPoints
                    }]
                })
            }
            return obj
        }
        const user1TopMusic = (await queryTopMusic(user_id)).reduce(reduceFunction, new Map())
        const user2TopMusic = (await queryTopMusic(friend_id)).reduce(reduceFunction, new Map())

        // find common artists & tracks
        const mutualMusic = []
        for (const artist1_id of user1TopMusic.keys()) {
            for (const artist2_id of user2TopMusic.keys()) {
                if (artist1_id === artist2_id) {
                    const mutualArtistTracks = []
                    for (const track1 of user1TopMusic.get(artist1_id).tracks) {
                        for (const track2 of user2TopMusic.get(artist1_id).tracks) {
                            if (track1.id === track2.id) {
                                mutualArtistTracks.push({
                                    id: track1.id,
                                    user1Points: track1.points,
                                    user2Points: track2.points
                                })
                            }
                        }
                    }
                    mutualMusic.push({
                        id: artist1_id,
                        user1Points: user1TopMusic.get(artist1_id).points,
                        user2Points: user2TopMusic.get(artist1_id).points,
                        tracks: mutualArtistTracks
                    })
                }
            }
        }

        // replace points with a ranking for each artist & their tracks, for each user
        for (let i=0; i < mutualMusic.length; i++) {
            // replace artist's points
            mutualMusic[i].user1Points = mutualMusic.length - i
            // replace artist's tracks' points
            for (let j=0; j < mutualMusic[i].tracks.length; j++) {
                mutualMusic[i].tracks[j].user1Points = mutualMusic[i].tracks.length - j
            }
        }
        let currArtistRanking = mutualMusic.length
        for (const artist_id of user2TopMusic.keys()) {
            for (let i=0; i < mutualMusic.length; i++) {
                if (artist_id === mutualMusic[i].id) {
                    // replace artist's points
                    mutualMusic[i].user2Points = currArtistRanking
                    currArtistRanking--
                    // replace artist's tracks' points
                    let currTrackRanking = mutualMusic[i].tracks.length
                    for (const track of user2TopMusic.get(artist_id).tracks) {
                        for (let j=0; j < mutualMusic[i].tracks.length; j++) {
                            if (track.id === mutualMusic[i].tracks[j].id) {
                                mutualMusic[i].tracks[j].user2Points = currTrackRanking
                                currTrackRanking--
                            }
                        }
                    }
                    break
                }
            }
        }

        // sort mutual music
        function sortFunc(a, b) {
            function adjust(x) {
                return Math.pow(x, 0.2)
            }
            const aVal = adjust(a.user1Points) + adjust(a.user2Points)
            const bVal = adjust(b.user1Points) + adjust(b.user2Points)
            return bVal - aVal
        }
        mutualMusic.sort(sortFunc)
        for (let i=0; i < mutualMusic.length; i++) {
            mutualMusic[i].tracks.sort(sortFunc)
        }



        // Create playlist
        
        // first convert data into json serializable
        const user1TopMusicObject = {}
        const user2TopMusicObject = {}
        user1TopMusic.forEach((data, artist) => {
            // convert bigints to number
            data.tracks.forEach(track => {
                track.points = Number(track.points)
            })
            user1TopMusicObject[artist] = data
        })
        user2TopMusic.forEach((data, artist) => {
            // convert bigints to number
            data.tracks.forEach(track => {
                track.points = Number(track.points)
            })
            user2TopMusicObject[artist] = data
        })
        const createPlaylistBody = JSON.stringify({
            user1: user_id,
            user2: friend_id,
            user1TopMusic: user1TopMusicObject,
            user2TopMusic: user2TopMusicObject,
            mutualMusic: mutualMusic
        })
        
        // post to /api/compare/create-playlist
        const headers = {
            'Authorization': authHeader,
            'cookie': cookieHeader,
        }
        const createPlaylistResponse = await fetch(PUBLIC_HOSTNAME+'/api/compare/create-playlist', {
            method: 'POST',
            body: createPlaylistBody,
            headers
        })
        if (!createPlaylistResponse.ok) {
            const err = createPlaylistResponse.text()
            throw error(createPlaylistResponse.status, JSON.stringify(err))
        }

    } catch (error) {
        console.log(error)
        return new Response(error, {status: 500})
    } finally {
        // delete row from progress table
        await query(`DELETE FROM progress WHERE user_id='${user_id}'`)
        await query(`DELETE FROM progress WHERE user_id='${friend_id}'`)
    }
    return new Response(null, {status: 200})
}
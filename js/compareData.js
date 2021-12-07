
var friend = 'bphogat'
var mutualMusic = []
var playlistID = null
var tracksToAdd = []
var maxTracksPerArtist = 5
var maxTracks = 1000
var artistSearchLimit = 1000

async function compareData() {
  document.getElementById("compare-data").style.display = "none"
  document.getElementById("creating-playlist").style.display = "block"

  // get friend's data file
  var responseText = await fetchUserData(friend)
  responseText = responseText.replace('","timestamp"', ',"timestamp"')
  responseText = responseText.replace('"artistsRanked":"[', '"artistsRanked":[')
  friendData = JSON.parse(responseText).artistsRanked

  // find mutual artists and tracks between you and your friend
  mutualMusic = findMutualMusic(artistsRanked, friendData)

  // For mutual artists which have no mutual tracks,
  // fill in missing tracks by getting the artist's top tracks
  responseText = await getAllArtistTopTracks(getArtistTopTracks, handleArtistTopTracks)

  // then create a playlist for you two
  console.log("Mutual music:\n" + mutualMusic)
  responseText = await createPlaylist()

  // then add all your mutual tracks to the playlist
  playlistID = JSON.parse(responseText).id
  document.getElementById("playlist-link").setAttribute("href", "https://open.spotify.com/playlist/"+playlistID)
  mutualMusic.forEach((artist) => {
    artist.tracks.forEach((track) => {
      tracksToAdd.push(track.uri)
    })
  })
  tracksToAdd.splice(maxTracks)
  await chainApiRequests(addTracksToPlaylist, handleAddTracksResponse)
  
  document.getElementById("creating-playlist").style.display = "none"
  document.getElementById("playlist-created").style.display = "block"
}

function findMutualMusic(mArtists, fArtists) {
  function search(query) {
    var result = {
      status: false,
      index: null
    }
    for(var i=0; i < Math.min(fArtists.length, artistSearchLimit); i++) {
      if(fArtists[i].id == query) {
        result.status = true
        result.index = i
        return result
      }
    }
    return result
  }
  for(var i=0; i < Math.min(mArtists.length, artistSearchLimit); i++) {
    var result = search(mArtists[i].id)
    if(result.status) {
      var artist = {
        points: mArtists[i].points + fArtists[result.index].points,
        name: mArtists[i].name,
        id: mArtists[i].id,
        tracks: []
      }
      var mTracks = mArtists[i].tracks
      var fTracks = fArtists[result.index].tracks
      for(var mTrack of mTracks) {
        for(var fTrack of fTracks) {
          if(mTrack.uri == fTrack.uri || mTrack.name.includes(fTrack.name) || fTrack.name.includes(mTrack.name)) {
            artist.tracks.push({
              points: mTrack.points+fTrack.points,
              name: mTrack.name,
              uri: mTrack.uri
            })
          } else {
          }
        }
      }
      artist.tracks.splice(maxTracksPerArtist)
      sortByPoints(artist.tracks)
      mutualMusic.push(artist)
    }
  }
  sortByPoints(mutualMusic)
  return mutualMusic
}

function getAllArtistTopTracks(apiRequest, requestHandler) {
  return new Promise(function(resolve, reject) {
    function oncomplete() {
      resolve()
    }
    function onfailure() {
      reject()
    }
    (function nextApiRequest(apiRequest, requestHandler, index) {
      if(index == undefined) {
        index = 0
      }
      while(index < mutualMusic.length && mutualMusic[index].tracks.length > 0) {
        index++
      }
      if(index == mutualMusic.length) {
        oncomplete()
        return
      }
      apiRequest(index).then((responseText) => {
        requestHandler(responseText, index)
        index ++
        if(index < mutualMusic.length) {
          nextApiRequest(apiRequest, requestHandler, index)
        } else {
          oncomplete()
        }
      }, () => {
        onfailure()
      })
    })(apiRequest, requestHandler)
  })
}

function getArtistTopTracks(index) {
  var artistID = mutualMusic[index].id
  var queryParams = "?market=ES"
  return makeAPIRequest("GET", "https://api.spotify.com/v1/artists/"+artistID+"/top-tracks"+queryParams, null)
}

function handleArtistTopTracks(responseText, index) {
  var data = JSON.parse(responseText)
  mutualMusic[index].tracks = data.tracks.splice(0, maxTracksPerArtist)
}

function createPlaylist() {
  var myProfile = JSON.parse(localStorage.getItem("userProfile"))
  var myName = myProfile.display_name
  var myID = myProfile.id
  var body = {
    name: "Songs for "+myName+' and '+friend,
    description: "",
    public: true
  }
  return makeAPIRequest("POST", "https://api.spotify.com/v1/users/"+myID+"/playlists", body)
}

function addTracksToPlaylist(offset) {
  var tracks = tracksToAdd.slice(offset, offset+50)
  var body = {uris: tracks}
  return makeAPIRequest("POST", "https://api.spotify.com/v1/playlists/"+playlistID+"/tracks", body)
}

function handleAddTracksResponse(responseText, offset) {
  if(offset/50 == Math.floor((tracksToAdd.length-1)/50)) {
    return false
  }
  return true
}
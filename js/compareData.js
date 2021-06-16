
var friend = 'bhav'
var friendData = null
var mutualArtists = []
var maxTracksPerArtist = 4
var playlistID = null
var tracksToAdd = []

function compareData() {
  // get friend's data file
  fetch('data/'+friend)
  .then(response => response.json())
  .then(jsonResponse => {
    friendData = jsonResponse

    // find mutual artists and tracks between you and your friend
    mutualArtists = findMutualArtists(artistsRanked, friendData.artistsRanked)
    // For mutual artists which have no mutual tracks,
    // fill in missing tracks by getting the artist's top tracks
    return getAllArtistTopTracks(getArtistTopTracks, handleArtistTopTracks)
  })
  // then create a playlist for you two
  .then(() => {
    console.log(mutualArtists)
    return createPlaylist()
  })
  // then add all your mutual tracks to the playlist
  .then((responseText) => {
    playlistID = JSON.parse(responseText).id
    
    mutualArtists.forEach((artist) => {
      artist.tracks.forEach((track) => {
        tracksToAdd.push(track.uri)
      })
    })
    tracksToAdd.splice(100)
    return addTracksToPlaylist()
  })
}

function findMutualArtists(mArtists, fArtists) {
  var searchLimit = 200
  function search(query) {
    var result = {
      status: false,
      index: null
    }
    for(var i=0; i < Math.min(fArtists.length, searchLimit); i++) {
      if(fArtists[i].id == query) {
        result.status = true
        result.index = i
        return result
      }
    }
    return result
  }
  var mutualArtists = []
  for(var i=0; i < Math.min(mArtists.length, searchLimit); i++) {
    var result = search(mArtists[i].id)
    if(result.status) {
      var artist = {
        points: i + result.index,
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
          }
        }
      }
      if(i==0) artist.tracks = []
      artist.tracks.splice(maxTracksPerArtist)
      sortByPoints(artist.tracks)
      mutualArtists.push(artist)
    }
  }
  sortByPoints(mutualArtists)
  mutualArtists.reverse()
  return mutualArtists
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
      while(index < mutualArtists.length && mutualArtists[index].tracks.length > 0) {
        index++
      }
      if(index == mutualArtists.length) {
        oncomplete()
        return
      }
      apiRequest(index).then((responseText) => {
        requestHandler(responseText, index)
        index ++
        if(index < mutualArtists.length) {
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
  var artistID = mutualArtists[index].id
  var queryParams = "?market=ES"
  return makeAPIRequest("GET", "https://api.spotify.com/v1/artists/"+artistID+"/top-tracks"+queryParams, null)
}

function handleArtistTopTracks(responseText, index) {
  var data = JSON.parse(responseText)
  mutualArtists[index].tracks = data.tracks.splice(0, maxTracksPerArtist)
}

function createPlaylist() {
  var myProfile = JSON.parse(localStorage.getItem("userProfile"))
  var myName = myProfile.display_name
  var myID = myProfile.id
  var body = {
    name: "Songs for "+myName+' and '+friend,
    description: "",
    public: false
  }
  return makeAPIRequest("POST", "https://api.spotify.com/v1/users/"+myID+"/playlists", body)
}

function addTracksToPlaylist() {
  var body = {
    uris: tracksToAdd
  }
  return makeAPIRequest("POST", "https://api.spotify.com/v1/playlists/"+playlistID+"/tracks", body)
}
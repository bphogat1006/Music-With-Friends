
var commonArtists = []
var friend = 'kyle'
var friendData = null
var playlistID = null

function compareData() {
  fetch('data/'+friend+'.json')
  .then(response => response.json())
  .then(jsonResponse => {
    friendData = jsonResponse
    commonArtists = findCommon(artistsRanked, friendData)
    
    return getAllArtistTopTracks(getArtistTopTracks, handleArtistTopTracks)
  })
  // .then(() => {
  //   console.log(commonArtists)
  //   return createPlaylist()
  // })
  .then((responseText) => {
    // playlistID = JSON.parse(responseText).id
    playlistID = '6KYUUxFT1eo8J6GtsbZSzP'
    return addTracks()
  })
}

function findCommon(mArtists, fArtists) {
  function search(artists, query) {
    var result = {}
    result.status = false
    for(var i=0; i < artists.length; i++) {
      if(artists[i].name == query) {
        result.status = true
        result.index = i
        return result
      }
    }
    return result
  }
  var commonArtists = []
  for(var i=0; i < mArtists.length; i++) {
    var result = search(fArtists, mArtists[i].name)
    if(result.status) {
      var ranking = i + result.index
      var artist = {points: {}}
      artist.points.total = ranking
      artist.name = mArtists[i].name
      artist.id = mArtists[i].id
      commonArtists.push(artist)
    }
  }
  sortArtists(commonArtists)
  commonArtists = commonArtists.reverse()
  return commonArtists
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
      apiRequest(index).then((responseText) => {
        requestHandler(responseText, index)
        index ++
        if(index < commonArtists.length) {
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
  var artistID = commonArtists[index].id
  var queryParams = "?market=ES"
  return makeAPIRequest("GET", "https://api.spotify.com/v1/artists/"+artistID+"/top-tracks"+queryParams, null)
}

function handleArtistTopTracks(responseText, index) {
  var data = JSON.parse(responseText)
  commonArtists[index].topTracks = data.tracks
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

function addTracks() {

}
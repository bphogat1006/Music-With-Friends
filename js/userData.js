
/**
 * Calculate the top artists for a user by a point system
 */

var savedTracks = []
var playlistIDs = []
var playlistTracks = []
var topArtists = {}
var topTracks = {}

var artistsRanked = null
var pointSystem = {
  savedTrack: 1,
  playlistTrack: 2,
  topArtist: {
    shortTerm: 5,
    mediumTerm: 10,
    longTerm: 20
  },
  topTrack: {
    shortTerm: 2,
    mediumTerm: 5,
    longTerm: 10
  }
}

var refreshData = false

function getUserData() {
  artistsRanked = JSON.parse(localStorage.artistsRanked)
  // see if artistsRanked from localStorage is empty
  if(artistsRanked.length == 0 || refreshData) {
    artistsRanked = []
    // if it is, calculate artistsRanked
    document.getElementById("progress-container").style.display = "block"
    // first get all saved tracks & artists
    chainApiRequests(getSavedTracks, handleSavedTracksResponse)
    // then get all user's playlists
    .then(() => {
      return chainApiRequests(getPlaylists, handlePlaylistsResponse)
    })
    // then get all tracks from all playlists
    .then(() => {
      return getAllPlaylistTracks(getPlaylistTracks, handlePlaylistTracksResponse)
    })
    // then get top artists from each period
    .then(() => {
      fetchPeriod = "short_term"
      document.getElementById("progress-info").innerHTML = "Getting Top Artists..."
      return getTopListens("artists")
    })
    .then((responseText) => {
      handleTopArtistsResponse(responseText)
      document.getElementById("progress").style.width = "75%"
      fetchPeriod = "medium_term"
      return getTopListens("artists")
    })
    .then((responseText) => {
      handleTopArtistsResponse(responseText)
      document.getElementById("progress").style.width = "80%"
      fetchPeriod = "long_term"
      return getTopListens("artists")
    })
    // then get top tracks from each period
    .then((responseText) => {
      handleTopArtistsResponse(responseText)
      document.getElementById("progress-info").innerHTML = "Getting Top Tracks..."
      document.getElementById("progress").style.width = "85%"
      fetchPeriod = "short_term"
      return getTopListens("tracks")
    })
    .then((responseText) => {
      handleTopTracksResponse(responseText)
      document.getElementById("progress").style.width = "90%"
      fetchPeriod = "medium_term"
      return getTopListens("tracks")
    })
    .then((responseText) => {
      handleTopTracksResponse(responseText)
      document.getElementById("progress").style.width = "95%"
      fetchPeriod = "long_term"
      return getTopListens("tracks")
    })
    .then((responseText) => {
      handleTopTracksResponse(responseText)
      document.getElementById("progress-container").style.display = "none"
      rankArtistsAndTracks()

      // set artistsRanked in localStorage
      localStorage.setItem("artistsRanked", JSON.stringify(artistsRanked))

      handleUserData()
    })
  }
  else {
    handleUserData()
  }

  function handleUserData() {
    document.getElementById("compare-data").style.display = "block"
    // debugPointSystem()
    // compareData()
  }
}

function downloadData() {
  var userProfile = JSON.parse(localStorage.userProfile)
  var data = {
    id: userProfile.id,
    display_name: userProfile.display_name,
    artistsRanked: artistsRanked
  }
  console.log(data)
  uriContent = "data:application/octet-stream," + encodeURIComponent(JSON.stringify(data))
  location.href = uriContent
}

function rankArtistsAndTracks() {
  // handle saved tracks
  savedTracks.forEach((item) => {
    addData(item.track, pointSystem.savedTrack, "savedTrack")
  })

  // handle playlist items
  playlistTracks.forEach((item) => {
    addData(item.track, pointSystem.playlistTrack, "playlistTrack")
  })

  // handle top artists
  topArtists.shortTerm.forEach((artist) => {
    addData(artist, pointSystem.topArtist.shortTerm, "topArtist")
  })
  topArtists.mediumTerm.forEach((artist) => {
    addData(artist, pointSystem.topArtist.mediumTerm, "topArtist")
  })
  topArtists.longTerm.forEach((artist) => {
    addData(artist, pointSystem.topArtist.longTerm, "topArtist")
  })
  
  // handle top tracks
  topTracks.shortTerm.forEach((track) => {
    addData(track, pointSystem.topTrack.shortTerm, "topTrack")
  })
  topTracks.mediumTerm.forEach((track) => {
    addData(track, pointSystem.topTrack.mediumTerm, "topTrack")
  })
  topTracks.longTerm.forEach((track) => {
    addData(track, pointSystem.topTrack.longTerm, "topTrack")
  })

  // sort data
  sortByPoints(artistsRanked)
  artistsRanked.forEach((artist) => {
    sortByPoints(artist.tracks)
  })
}

function sortByPoints(arr) {
  var n = arr.length, curr, j, tmp
  for(var i=1; i < n; i++) {
    curr = i
    for(j=i-1; j >= 0; j--) {
      if(arr[curr].points > arr[j].points) {
        tmp = arr[curr]
        arr[curr] = arr[j]
        arr[j] = tmp
        curr = j
      } else {break}
    }
  }
}

function addData(item, points, type) {
  var itemIsTrack = (type != "topArtist") ? true : false

  // get vars
  var trackURI = null
  var artistID = null
  var artistName = null
  if(itemIsTrack) {
    trackURI = item.uri
    trackName = item.name
    artistID = item.artists[0].id
    artistName = item.artists[0].name
  } else {
    artistID = item.id
    artistName = item.name
  }

  // see if artist is in artistsRanked already
  var artistExists = false
  for(var artist of artistsRanked) {
    // if so
    if(artist.id === artistID) {
      // add points
      artist.points += points
      // add points to its specific category (for debugging)
      switch (type) {
        case "savedTrack":
          artist.category.savedTrack += points
          break;
        case "playlistTrack":
          artist.category.playlistTrack += points
          break;
        case "topArtist":
          artist.category.topArtist += points
          break;
        case "topTrack":
          artist.category.topTrack += points
          break;
      }
      // if item is a track, add to artist's tracks
      if(itemIsTrack) {
        var trackExists = false
        for(var track of artist.tracks) {
          if(track.uri == trackURI || track.name.includes(trackName) || trackName.includes(track.name)) {
            track.points ++
            trackExists = true
            break
          }
        }
        if(!trackExists) {
          artist.tracks.push({
            points: 1,
            name: trackName,
            uri: trackURI
          })
        }
      }
      // break
      artistExists = true
      break
    }
  }
  if(artistExists) return
  // if artist doesn't exist in artistsRanked, create it
  var artist = {}
  artist.id = artistID
  artist.name = artistName
  artist.points = points
  artist.category = {
    savedTrack: 0,
    playlistTrack: 0,
    topArtist: 0,
    topTrack: 0
  }
  switch (type) {
    case "savedTrack":
      artist.category.savedTrack = points
      break;
    case "playlistTrack":
      artist.category.playlistTrack = points
      break;
    case "topArtist":
      artist.category.topArtist = points
      break;
    case "topTrack":
      artist.category.topTrack = points
      break;
  }
  artist.tracks = []
  if(itemIsTrack) {
    artist.tracks.push({
      points: 1,
      name: trackName,
      uri: trackURI
    })
  }
  artistsRanked.push(artist)
}

function debugPointSystem() {
  var max = artistsRanked[0].points
  var debugContainer = document.getElementById("debug-point-system")
  debugContainer.style.display = "block"

  function createProgressBar(artist, type, bg) {
    var progress = document.createElement("div")
    var points = null
    switch (type) {
      case "savedTrack":
        points = artist.category.savedTrack
        break;
      case "playlistTrack":
        points = artist.category.playlistTrack
        break;
      case "topArtist":
        points = artist.category.topArtist
        break;
      case "topTrack":
        points = artist.category.topTrack
        break;
    }
    progress.setAttribute("class", "progress-bar "+"bg-"+bg)
    if(points != 0) progress.innerHTML = type
    else return progress
    progress.style.width = points/max*100 + "%"
    progress.innerHTML += ": " + points
    return progress
  }
  artistsRanked.forEach((artist) => {
    var progressContainer = document.createElement("div")
    progressContainer.setAttribute("class", "progress")
    progressContainer.appendChild(
      createProgressBar(artist, "topArtist", "danger")
    )
    progressContainer.appendChild(
      createProgressBar(artist, "topTrack", "info")
    )
    progressContainer.appendChild(
      createProgressBar(artist, "savedTrack", "primary")
    )
    progressContainer.appendChild(
      createProgressBar(artist, "playlistTrack", "success")
    )
    var name = document.createElement("p")
    name.setAttribute("class", "m-0 p-0")
    name.innerHTML = artist.name
    debugContainer.appendChild(name)
    debugContainer.appendChild(progressContainer)
  })
}

// Chains multiple promisified API requests into one big promise
// because limit is only 50 at a time
// Used for getting all saved tracks and playlist tracks
function chainApiRequests(apiRequest, handler, index) {
  return new Promise(function(resolve, reject) {
    function oncomplete() {
      resolve()
    }
    function onfailure() {
      reject()
    }
    (function nextApiRequest(apiRequest, handler, offset) {
      if(offset == undefined) {
        offset = 0
      }
      apiRequest(offset, index).then((responseText) => {
        if(handler(responseText)) {
          // if(savedTracks.length > 100 && playlistIDs.length==0) {oncomplete();return;} // make debugging quicker
          offset += 50
          if(index != undefined) offset += 50
          nextApiRequest(apiRequest, handler, offset)
        } else {
          oncomplete()
        }
      }, () => {
        onfailure()
      })
    })(apiRequest, handler)
  })
}

function getSavedTracks(offset) {
  var queryParams = "?market=ES"
  queryParams += "&limit=50"
  queryParams += "&offset=" + offset
  return makeAPIRequest("GET", "https://api.spotify.com/v1/me/tracks"+queryParams, null)
}

function handleSavedTracksResponse(responseText) {
  var data = JSON.parse(responseText)
  if(data.items.length == 0) {
    return false
  }
  savedTracks = savedTracks.concat(data.items)
  document.getElementById("progress-info").innerHTML = "Getting Saved Tracks... " + data.items[0].track.artists[0].name + " ..."
  document.getElementById("progress").style.width = savedTracks.length/10000*30+"%"
  if(data.items.length != 50) {
    return false
  }
  return true
}

function getPlaylists(offset) {
  var queryParams = "?limit=50"
  queryParams += "&offset=" + offset
  return makeAPIRequest("GET", "https://api.spotify.com/v1/me/playlists"+queryParams, null)
}

function handlePlaylistsResponse(responseText) {
  var data = JSON.parse(responseText)
  if(data.items.length == 0) {
    return false
  }
  for(var playlist of data.items) {
    if(playlist.collaborative) continue
    if(playlist.owner.display_name != JSON.parse(localStorage.userProfile).display_name) continue
    playlistIDs.push(playlist.id)
  }
  if(data.items.length != 50) return false
  return true
}

function getAllPlaylistTracks(apiRequest, requestHandler) {
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
      chainApiRequests(apiRequest, requestHandler, index).then((responseText) => {
        document.getElementById("progress-info").innerHTML = "Getting Tracks From Your Playlists..."
        document.getElementById("progress").style.width = 30+45*index/playlistIDs.length+"%"
        index ++
        if(index < playlistIDs.length) {
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

function getPlaylistTracks(offset, index) {
  var playlistID = playlistIDs[index]
  var queryParams = "?market=ES"
  queryParams += "&fields=items(track(name,artists,uri))"
  queryParams += "&limit=100"
  queryParams += "&offset=" + offset
  return makeAPIRequest("GET", "https://api.spotify.com/v1/playlists/"+playlistID+"/tracks"+queryParams, null)
}

function handlePlaylistTracksResponse(responseText) {
  var data = JSON.parse(responseText)
  if(data.items.length == 0) {
    return false
  }
  playlistTracks = playlistTracks.concat(data.items)
  if(data.items.length != 50) return false
  return true
}

function handleTopArtistsResponse(responseText) {
  var data = JSON.parse(responseText)
  switch (fetchPeriod) {
    case "short_term":
      topArtists.shortTerm = data.items
      break;
    case "medium_term":
      topArtists.mediumTerm = data.items
      break;
    case "long_term":
      topArtists.longTerm = data.items
      break;
  }
}

function handleTopTracksResponse(responseText) {
  var data = JSON.parse(responseText)
  switch (fetchPeriod) {
    case "short_term":
      topTracks.shortTerm = data.items
      break;
    case "medium_term":
      topTracks.mediumTerm = data.items
      break;
    case "long_term":
      topTracks.longTerm = data.items
      break;
  }
}
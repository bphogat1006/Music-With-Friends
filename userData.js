
/**
 * Calculate the top artists for a user by a point system
 */

var savedTracks = []
var playlistIDs = []
var playlistTracks = []
var topArtists = {}
var topTracks = {}

var artistsRanked = []
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
  var userData = JSON.parse(localStorage.getItem("userData"))
  // if userData from localStorage is empty, get user data
  if(Object.keys(userData).length == 0 || refreshData) {

    // first get all saved tracks & artists
    chainApiRequests(getTracks, handleTracksResponse)
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

      calculateFavoriteArtists()
      debugPointSystem()

      // set userData in localStorage
      localStorage.setItem("userData", JSON.stringify({
        artistsRanked: artistsRanked,
        // savedTracks: savedTracks,
        // playlistTracks: playlistTracks,
        // topArtists: topArtists,
        // topTracks: topTracks
      }))
    })
  }
  else {
    artistsRanked = userData.artistsRanked

    document.getElementById("progress-container").style.display = "none"
    debugPointSystem()
  }
}

function downloadData() {
  uriContent = "data:application/octet-stream," + encodeURIComponent(JSON.stringify(artistsRanked))
  location.href = uriContent
}

function calculateFavoriteArtists() {
  // handle saved tracks
  savedTracks.forEach((item) => {
    addPoints(item.track.artists[0].name, pointSystem.savedTrack, "savedTrack")
  })

  // handle playlist items
  playlistTracks.forEach((item) => {
    addPoints(item.track.artists[0].name, pointSystem.playlistTrack, "playlistTrack")
  })

  // handle top artists
  topArtists.shortTerm.forEach((artist) => {
    addPoints(artist.name, pointSystem.topArtist.shortTerm, "topArtist")
  })
  topArtists.mediumTerm.forEach((artist) => {
    addPoints(artist.name, pointSystem.topArtist.mediumTerm, "topArtist")
  })
  topArtists.longTerm.forEach((artist) => {
    addPoints(artist.name, pointSystem.topArtist.longTerm, "topArtist")
  })
  
  // handle top tracks
  topTracks.shortTerm.forEach((track) => {
    addPoints(track.artists[0].name, pointSystem.topTrack.shortTerm, "topTrack")
  })
  topTracks.mediumTerm.forEach((track) => {
    addPoints(track.artists[0].name, pointSystem.topTrack.mediumTerm, "topTrack")
  })
  topTracks.longTerm.forEach((track) => {
    addPoints(track.artists[0].name, pointSystem.topTrack.longTerm, "topTrack")
  })

  sortArtists()
}

function sortArtists() {
  var n = artistsRanked.length, curr, j, tmp
  for(var i=1; i < n; i++) {
    curr = i
    for(j=i-1; j >= 0; j--) {
      if(artistsRanked[curr].points.total > artistsRanked[j].points.total) {
        tmp = artistsRanked[curr]
        artistsRanked[curr] = artistsRanked[j]
        artistsRanked[j] = tmp
        curr = j
      } else {break}
    }
  }
}

function addPoints(name, points, type) {
  var exists = false
  for(var artist of artistsRanked) {
    if(artist.name === name) {
      artist.points.total += points
      switch (type) {
        case "savedTrack":
          artist.points.savedTrack += points
          break;
        case "playlistTrack":
          artist.points.playlistTrack += points
          break;
        case "topArtist":
          artist.points.topArtist += points
          break;
        case "topTrack":
          artist.points.topTrack += points
          break;
      }
      exists = true
      break
    }
  }
  if(exists) return
  var artist = {points: {}}
  artist.name = name
  artist.points.total = points
  artist.points.savedTrack = 0
  artist.points.playlistTrack = 0
  artist.points.topArtist = 0
  artist.points.topTrack = 0
  switch (type) {
    case "savedTrack":
      artist.points.savedTrack = points
      break;
    case "playlistTrack":
      artist.points.playlistTrack = points
      break;
    case "topArtist":
      artist.points.topArtist = points
      break;
    case "topTrack":
      artist.points.topTrack = points
      break;
  }
  artistsRanked.push(artist)
}

function debugPointSystem() {
  var max = artistsRanked[0].points.total
  var debugContainer = document.getElementById("debug-point-system")
  debugContainer.style.display = "block"

  function createProgressBar(artist, type, bg) {
    var progress = document.createElement("div")
    var points = null
    switch (type) {
      case "savedTrack":
        points = artist.points.savedTrack
        break;
      case "playlistTrack":
        points = artist.points.playlistTrack
        break;
      case "topArtist":
        points = artist.points.topArtist
        break;
      case "topTrack":
        points = artist.points.topTrack
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

function getTracks(offset) {
  var queryParams = "?market=ES"
  queryParams += "&limit=50"
  queryParams += "&offset=" + offset
  return makeAPIRequest("GET", "https://api.spotify.com/v1/me/tracks"+queryParams, null)
}

function handleTracksResponse(responseText) {
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
  queryParams += "&fields=items(track(name, artists))"
  queryParams += "&limit=50"
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
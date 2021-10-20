
/**
 * This script calculates the top artists for a user by a point system
 */

var savedTracks = []
var playlistIDs = []
var publicPlaylists = []
var playlistTracks = []
var topArtists = {}
var topTracks = {}

var username = null
var artistsRanked = null
var timestamp = null

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
var maxUsersDisplayed = 6

function getUserData() {
  // see if artistsRanked for user exists in database
  username = JSON.parse(localStorage.userProfile).display_name
  fetchUserData(username)
  .then((responseText) => {
    if(responseText === '' || refreshData) {
      artistsRanked = []
      // if it doesn't, calculate artistsRanked
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
        // then rank artists based on music data collected
        rankArtistsAndTracks()

        // shrink data to sql MEDIUMTEXT char limit and post it
        while(JSON.stringify(artistsRanked).length > 16000000) {
          artistsRanked.splice(artistsRanked.length*0.75)
        }
        return postUserData()
      })
      .then((responseText) => {
        // console.log(responseText)
        handleUserData()
      })
    }
    else {
      handleUserData()
    }
  })

  function handleUserData() {
    fetchUserData(username)
    .then((responseText) => {
      handleFetchUserData(responseText)
      return fetchAllUsers()
    })
    .then((responseText) => {
      handleFetchAllUsers(responseText)
      // debugPHP()
      // debugPointSystem()
    })
  }
}

function refreshUserData() {
  refreshData = true;
  document.getElementById("progress").style.width = "0%"
  document.getElementById("progress-container").style.display = "block"
  document.getElementById("user-data-meta").style.display = "none"
  document.getElementById("compare-data-container").style.display = "none"
  getUserData()
}

function downloadData() {
  var userProfile = JSON.parse(localStorage.userProfile)
  var data = {
    userId: userProfile.id,
    displayName: userProfile.display_name,
    artistsRanked: artistsRanked
  }
  console.log(data)
  uriContent = "data:application/octet-stream," + encodeURIComponent(JSON.stringify(data))
  location.href = uriContent
}

function makePHPrequest(method, endpoint, body) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, endpoint);
    xhr.send(JSON.stringify(body));
    xhr.onload = function() {
      document.getElementById("phpResponseText").innerHTML = this.responseText;
      if (this.status == 200) {
        resolve(this.responseText);
      }
      else {
        var error = this.status + ": " + this.responseText
        console.log(error)
        alert(error)
        reject(this.status, this.responseText)
      }
    };
    xhr.onerror = function () {
      var error = this.status + ": " + this.responseText
      console.log(error)
      alert(error)
      reject(this.status, this.responseText)
    };
  });
}

function postUserData() {
  var userProfile = JSON.parse(localStorage.userProfile)
  var body = {
    userId: userProfile.id,
    displayName: userProfile.display_name,
    artistsRanked: artistsRanked
  }
  return makePHPrequest("POST", "../php/postUserData.php", body)
}

function fetchUserData(username) {
  username = {username: username}
  return makePHPrequest("POST", "../php/fetchUserData.php", username)
}

function handleFetchUserData(responseText) {
  responseText = responseText.replace('","timestamp"', ',"timestamp"')
  responseText = responseText.replace('"artistsRanked":"[', '"artistsRanked":[')
  responseText = JSON.parse(responseText)
  artistsRanked = responseText.artistsRanked
  timestamp = responseText.timestamp
  timestamp = timestamp.slice(0, 16)
  timestamp = timestamp.replace(' ', ' at ')
  document.getElementById("data-timestamp").innerHTML = "Your Spotify data was last fetched on "+timestamp
}

function fetchAllUsers() {
  return makePHPrequest("GET", "../php/fetchAllUsers.php")
}

function handleFetchAllUsers(responseText) {
  function createPlaylist() {
    compareData(this.innerHTML)
  }
  var users = responseText.split(', ')
  users.pop()
  users.sort()
  var user = null
  var userlist = document.getElementById("users")
  userlist.innerHTML = ""
  var count = -1
  do {
    user = users.shift()
    var item = document.createElement("a")
    item.onclick = createPlaylist
    item.innerHTML = user
    if(user === username) continue
    item.setAttribute("class", "user-list-item list-group-item list-group-item-action")
    count++
    // alert(user+' '+count)
    if(count >= maxUsersDisplayed) {
      item.style.display = "none"
    }
    userlist.appendChild(item)
  } while (users.length > 0);

  var loadMore = document.createElement("a")
  loadMore.setAttribute("class", "user-list-item list-group-item list-group-item-action")
  loadMore.innerHTML = "... click to load more users"
  loadMore.onclick = loadMoreUsers
  if(count < maxUsersDisplayed) {loadMore.style.display = "none"}
  userlist.appendChild(loadMore)

  document.getElementById("users-search").addEventListener('input', searchUsers);
  document.getElementById("user-data-meta").style.display = "block"
  document.getElementById("compare-data-container").style.display = "block"
}

function searchUsers(e) {
  var query = e.target.value.toLowerCase()
  var users = Array.from(document.getElementsByClassName("user-list-item"))
  if(query === '') {
    maxUsersDisplayed = 6
    for(var i=0; i < users.length-1; i++) {
      users[i].style.display = (i < maxUsersDisplayed) ? "block" : "none"
    }
    if(users.length-1 > maxUsersDisplayed) {
      users[users.length-1].style.display = "block"
    }
    return
  }
  for(var i=0; i < users.length-1; i++) {
    var match = users[i].innerHTML.slice(0, query.length).toLowerCase()
    if(match === query) {
      users[i].style.display = "block"
    } else {
      users[i].style.display = "none"
    }
  }
  users[users.length-1].style.display = "none"
}

function loadMoreUsers() {
  maxUsersDisplayed += 6
  var users = Array.from(document.getElementsByClassName("user-list-item"))
  var i = 0
  for(i; i < maxUsersDisplayed && i < users.length-1; i++) {
    users[i].style.display = "block"
  }
  if(i === users.length-1) {
    users[i].style.display = "none"
  }
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

  // sort data by points
  sortByPoints(artistsRanked)
  artistsRanked.forEach((artist) => {
    sortByPoints(artist.tracks)
  })

  // normalize points for artists & their tracks
  maxArtistPoints = artistsRanked[0].points
  artistsRanked.forEach((artist) => {
    // normalize artist points
    artist.points /= maxArtistPoints
    // normalize tracks' points
    if(artist.tracks.length > 0)
    maxTrackPoints = artist.tracks[0].points
    artist.tracks.forEach((track) => {
      track.points /= maxTrackPoints
    })
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
          if(track.uri == trackURI || ((track.name.includes("Remastered") || trackName.includes("Remastered")) && (track.name.includes(trackName) || trackName.includes(track.name)))) {
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

// Chains multiple promisified API requests into one big promise
// because limit is only 50 at a time
// ex. Used for getting all saved tracks and playlist tracks
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
        if(handler(responseText, offset)) {
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
    // skip collab playlists
    if(playlist.collaborative) continue
    // skip playlists not made by user
    var displayName = JSON.parse(localStorage.userProfile).display_name
    if(playlist.owner.display_name != displayName) continue
    // avoid scanning playlists made by Music With Friends (messes with algorithm)
    var str = "Songs for "+displayName
    if(playlist.name.slice(0, str.length) == str) continue
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

function debugPHP() {
  document.getElementById("debug-php").style.display = 'block'
}

function debugPointSystem() {
  var max = artistsRanked[0].category.savedTrack+
      artistsRanked[0].category.playlistTrack+
      artistsRanked[0].category.topArtist+
      artistsRanked[0].category.topTrack
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
    name.innerHTML = artist.name+': '+Math.round(artist.points*max)
    debugContainer.appendChild(name)
    debugContainer.appendChild(progressContainer)
  })
}
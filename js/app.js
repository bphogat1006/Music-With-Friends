
/*
var redirect_uri = ""

var client_id = ""
var client_secret = ""
*/

var access_token = null
var refresh_token = null
var refreshingAccessToken = false
var fetchPeriod = "medium_term"

const AUTHORIZE = "https://accounts.spotify.com/authorize"
const TOKEN = "https://accounts.spotify.com/api/token"

function onPageLoad() {
  // if redirected from spotify oauth
  if(window.location.search.length > 0) {
    handleRedirect()
  }
  // otherwise load page
  else {
    access_token = localStorage.access_token
    // show form to authorize user if there's no access token
    if(access_token == null) {
      document.getElementById("request-authorization").style.display = 'block'
    }
    // otherwise use access token and API to get user data
    else {
      document.getElementById("user-data").style.display = 'block'
      
      // see if access token is expired
      // if so, refresh it
      testAccessToken()
      .catch((status) => {
        if(status==401) {return refreshAccessToken()}
      })
      // then get user profile info
      .then((responseText) => {
        // if access token was refreshed, handle it
        if(responseText != undefined && JSON.parse(responseText).access_token != undefined) {
          handleAuthorizationResponse(responseText)
        }
        return getUserProfile()
      })
      // then get top artists
      .then((responseText) => {
        handleUserProfileResponse(responseText)
        return getTopListens("artists")
      })
      // then get top tracks
      .then((responseText) => {
        handleTopListensResponse(responseText)
        return getTopListens("tracks")
      })
      // then calculate user's favorite artists
      .then((responseText) => {
        handleTopListensResponse(responseText)
        getUserData() // function from userData.js
      })
    }
  }
}

// Show spotify authorization dialog when authorization button is pressed
function requestAuthorization() {
  var url = AUTHORIZE
  url += "?client_id=" + client_id
  url += "&response_type=code"
  url += "&redirect_uri=" + encodeURI(redirect_uri)
  url += "&show_dialog=true"
  url += "&scope=user-top-read user-library-read playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private"
  window.location.href = url // Show Spotify's authorization screen
}

// Retrieve authorization code from url params after being redirected back from oauth dialog
function handleRedirect() {
  var code = null
  const queryString = window.location.search
  if(queryString.length > 0) {
    const urlParams = new URLSearchParams(queryString)
    code = urlParams.get("code")
  }

  fetchAccessToken(code) // using auth code
  window.history.pushState("", "", redirect_uri) // remove param from url
}

// use authorization code to fetch access token
function fetchAccessToken(code) {
  var body = "grant_type=authorization_code"
  body += "&code=" + code
  body += "&redirect_uri=" + encodeURI(redirect_uri)
  body += "&client_id=" + client_id
  body += "&client_secret=" + client_secret
  makeAuthorizationRequest(body)
  .then((data) => {
    handleAuthorizationResponse(data)
  })
}

// use refresh token to fetch new access token
function refreshAccessToken() {
  refreshingAccessToken = true
  refresh_token = localStorage.refresh_token
  var body = "grant_type=refresh_token"
  body += "&refresh_token=" + refresh_token
  body += "&client_id=" + client_id
  return makeAuthorizationRequest(body)
}

// request access & refresh tokens
function makeAuthorizationRequest(body) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest()
    xhr.open("POST", TOKEN)
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret))
    xhr.send(body)
    xhr.onload = function () {
      if (this.status == 200) {
        console.log(JSON.parse(this.responseText))
        resolve(this.responseText);
      } else {
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

// store access & refresh tokens
function handleAuthorizationResponse(responseText) {
  var data = JSON.parse(responseText)
  if(data.access_token != undefined) {
    access_token = data.access_token
    localStorage.setItem("access_token", access_token)
    // alert('new access token')
  }
  if(data.refresh_token != undefined) {
    refresh_token = data.refresh_token
    localStorage.setItem("refresh_token", refresh_token)
    // alert('new refresh token')
  }
  if(!refreshingAccessToken) {
    onPageLoad()
  } else {
    refreshingAccessToken = false
  }
}

// Promisified XMLHttpRequest to the Spotify API using access token
function makeAPIRequest (method, endpoint, body) {
  return new Promise(function (resolve, reject) {
    xhr = new XMLHttpRequest();
    xhr.open(method, endpoint)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token)
    xhr.send(JSON.stringify(body))
    xhr.onload = function () {
      if (this.status < 300) {
        console.log(JSON.parse(this.responseText))
        resolve(this.responseText);
      } else {
        var error = this.status + ": " + this.responseText
        console.log(error)
        if(this.status != 401) alert(error) // access token expired
        reject(this.status, this.responseText)
      }
    };
    xhr.onerror = function () {
      var error = this.status + ": " + this.responseText
      console.log(error)
      if(this.status != 401) alert(error)
      reject(this.status, this.responseText)
    };
  });
}

/** API calls the website will make to gather user data */

function testAccessToken() {
  return getUserProfile()
}

function getUserProfile() {
  return makeAPIRequest("GET", "https://api.spotify.com/v1/me", null)
}

function handleUserProfileResponse(responseText) {
  var data = JSON.parse(responseText)
  document.getElementById("display-name").innerHTML += '<small class="text-muted">' + data.display_name + '</small>'
  var userProfile = {
    display_name: data.display_name,
    profile_picture: null,
    id: data.id
  }
  if(data.images[0] == undefined) {
    document.getElementById("profile-picture").setAttribute("src", "img/defaultProfilePicture.jpg")
  }
  else {
    document.getElementById("profile-picture").setAttribute("src", data.images[0].url)
    userProfile.profile_picture = data.images[0].url
  }
  localStorage.setItem("userProfile", JSON.stringify(userProfile))
}

function getTopListens(type) {
  var queryParams = "?time_range=" + fetchPeriod
  queryParams += "&limit=50"
  queryParams += "&offset=0"
  return makeAPIRequest("GET", "https://api.spotify.com/v1/me/top/"+type+queryParams, null)
}

function handleTopListensResponse(responseText) {
  var data = JSON.parse(responseText)
  var type = (data.items[0].album) ? "tracks" : "artists"
  var topListensElement = document.getElementById("top-"+type+"-list")

  data.items.forEach(item => {
    var li = document.createElement("li")
    li.setAttribute("class", "list-group-item d-flex align-items-center ps-0 ps-md-3")

    var thumbnail = document.createElement("img")
    thumbnail.setAttribute("class", "me-3")
    thumbnail.setAttribute("width", "50em")
    thumbnail.setAttribute("height", "50em")

    if(type == "artists") {
      if(item.images[0] != undefined) {
        thumbnail.setAttribute("src", item.images[0].url)
      }
      li.appendChild(thumbnail)
      var artist = document.createElement("div")
      artist.innerHTML = item.name
      li.appendChild(artist)
    }
    else {
      if(item.album.images[0] != undefined) {
        thumbnail.setAttribute("src", item.album.images[0].url)
      }
      li.appendChild(thumbnail)
      var songInfo = document.createElement("div")
      songInfo.setAttribute("class", "")
      var name = document.createElement("div")
      var artist = document.createElement("div")
      artist.setAttribute("class", "text-muted")
      name.innerHTML = item.name
      artist.innerHTML = item.artists[0].name
      songInfo.appendChild(name)
      songInfo.appendChild(artist)
      li.appendChild(songInfo)
    }
    topListensElement.appendChild(li)
  });
  if(type == "tracks") {
    document.getElementById("loading-top-listens").style.display = "none"
  }
}
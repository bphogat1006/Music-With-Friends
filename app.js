
var redirect_uri = "http://127.0.0.1:5500/index.html"

var access_token = null
var refresh_token = null

var fetchPeriod = "short_term"

const AUTHORIZE = "https://accounts.spotify.com/authorize"
const TOKEN = "https://accounts.spotify.com/api/token"

function onPageLoad() {
  // if redirected from spotify oauth
  if(window.location.search.length > 0) {
    handleRedirect()
  }
  // otherwise load page
  else {
    access_token = localStorage.getItem("access_token")
    // show form to authorize user if there's no access token
    if(access_token == null) {
      document.getElementById("request-authorization").style.display = 'block'
    }
    // otherwise use access token and API to get user data
    else {
      document.getElementById("user-data").style.display = 'block'
      testAccessToken()
      getUserProfile()
      getTopListens()
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
  url += "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private user-top-read"
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
  callAuthorizationApi(body)
}

// use refresh token to fetch new access token
function refreshAccessToken() {
  refresh_token = localStorage.getItem("refresh_token")
  var body = "grant_type=refresh_token"
  body += "&refresh_token=" + refresh_token
  body += "&client_id=" + client_id
  callAuthorizationApi(body)
}

// request access & refresh tokens
function callAuthorizationApi(body) {
  var xhr = new XMLHttpRequest()
  xhr.open("POST", TOKEN)
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
  xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret))
  xhr.send(body)
  xhr.onload = handleAuthorizationResponse
}

// store access & refresh tokens
function handleAuthorizationResponse() {
  if(this.status == 200) {
    var data = JSON.parse(this.responseText)
    console.log(data)
    var data = JSON.parse(this.responseText)
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
    onPageLoad()
  }
  else {
    console.log(this.responseText)
    alert(this.responseText)
  }
}

// generic call to the Spotify API using access token
function callApi(method, endpoint, body, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open(method, endpoint)
  xhr.setRequestHeader('Content-Type', 'application/json')
  xhr.setRequestHeader('Authorization', 'Bearer ' + access_token)
  xhr.send(body)
  xhr.onload = callback
}

/** API calls the website will make to gather data */

function testAccessToken() {
  callApi("GET", "https://api.spotify.com/v1/me", null, handleTestAccessTokenResponse)
}

function handleTestAccessTokenResponse() {
  if(this.status == 401) {
    refreshAccessToken()
  }
}

function getUserProfile() {
  callApi("GET", "https://api.spotify.com/v1/me", null, handleUserProfileResponse)
}

function handleUserProfileResponse() {
  if(this.status == 200) {
    var data = JSON.parse(this.responseText)
    console.log(data)

    document.getElementById("display-name").innerHTML += '<small class="text-muted">' + data.display_name + '</small>'
    document.getElementById("profile-picture").setAttribute("src", data.images[0].url)
  }
  else if(this.status == 401) {
    alert("access token expired")
    refreshAccessToken()
  }
  else {
    console.log(this.responseText)
    alert(this.responseText)
  }
}

function getTopListens(type) {
  if(typeof type != "string") {type="artists"}
  document.getElementById("loading-top-listens").style.display = "block"
  var queryParams = "?time_range=" + fetchPeriod
  queryParams += "&limit=50"
  queryParams += "&offset=0"
  callApi("GET", "https://api.spotify.com/v1/me/top/"+type+queryParams, null, handleTopListensResponse)
}

function handleTopListensResponse() {
  if(this.status == 200) {
    var data = JSON.parse(this.responseText)
    console.log(data)

    var type = (data.items[0].album) ? "tracks" : "artists"
    var topListensElement = document.getElementById("top-"+type+"-list")

    data.items.forEach(item => {
      var li = document.createElement("li")
      li.setAttribute("class", "list-group-item d-flex align-items-center ps-4")

      var thumbnail = document.createElement("img")
      thumbnail.setAttribute("class", "me-3")
      thumbnail.setAttribute("width", "50em")
      thumbnail.setAttribute("height", "50em")

      if(type == "artists") {
        thumbnail.setAttribute("src", item.images[0].url)
        li.appendChild(thumbnail)
        var artist = document.createElement("div")
        artist.innerHTML = item.name
        li.appendChild(artist)
      }
      else {
        thumbnail.setAttribute("src", item.album.images[0].url)
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
    if(type == "artists") {
      getTopListens("tracks")
    } else {
      document.getElementById("loading-top-listens").style.display = "none"
    }
  }
  else if(this.status == 401) {
    alert("access token expired")
    refreshAccessToken()
  }
  else {
    console.log(this.responseText)
    alert("top listens error: " + this.responseText)
  }
}
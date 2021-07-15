<!DOCTYPE html>
<html lang="en-US">

  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Music With Friends</title>
    <link rel="shortcut icon" type="image/png" href="img/favicon.png"/>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-+0n0xVW2eSR5OomGNYDnhzAbDsOXxcvSN1TPprVMTNDbiYZCxYbOOl7+AMvyTG2x" crossorigin="anonymous">
    <link href="style.css" rel="stylesheet">
  </head>

  <body onload="onPageLoad()" class="bg-secondary">
    <div class="container bg-light p-5">
      
      <div id="request-authorization" class="row mx-lg-5">
        <div class="d-flex align-items-center mb-4">
          <img id="website-thumbnail" src="img/favicon.png">
          <h1 class="display-1 ms-4">Music With Friends</h1>
        </div>
        <h1 class="display-6 mb-4">Click below to authenticate with Spotify.</h1> 
        <input id="authenticate-button" class="btn btn-lg btn-primary" type="button" onclick="requestAuthorization()" value="Request Authorization"></input>
      </div>
      
      <div id="user-data" class="row mx-lg-5">

        <div id="user-profile" class="mb-5">
          <div class="d-flex align-items-center">
            <h1 id="display-name" class="display-1 me-4">Hello, </h1>
            <img id="profile-picture" class="img-fluid rounded-pill">
          </div>
        </div>

        <div id="debug-point-system" class="container mb-3" style="display: none;">
          <button class="btn btn-primary mb-3" onclick="downloadData()">Download Data</button>
        </div>

        <div class="container p-lg-5 py-3 bg-white section">
          <div id="progress-container" class="container mb-3" style="display: none;">
            <p id="progress-info"></p>
            <div class="progress">
              <div id="progress" style="width: 0%;" class="progress-bar progress-bar-striped progress-bar-animated"></div>
            </div>
          </div>
          
          <div id="compare-data" style="display: none;">
            <p class="display-6 mb-3">Click the button below to create a playlist of some music you and Bhavya have in common.</p>
            <button class="btn btn-primary" onclick="compareData()">Create Playlist</button>
          </div>
          <div id="creating-playlist" class="spinner-border text-primary mb-3" style="display: none;" role="status"></div>
          <div id="playlist-created" style="display: none;">
            <h2>Check Spotify, your playlist was created!</h2>
            <a id="playlist-link" class="h4">Or click here to see it</a>
          </div>
        </div>

        <div id="top-listens-information" class="container p-lg-5 py-3 bg-white section">
          <div class="d-inline-flex align-items-center">
            <p class="display-6 me-3 mb-3">Here are your top artists and tracks.</p>
            <div id="loading-top-listens" class="spinner-border text-primary" role="status"></div>
          </div>
          
          <select id="select-period" class="form-select form-select-lg mb-4" onchange="refetch(this)">
            <option value="short_term">Short-Term</option>
            <option value="medium_term" selected>Medium-Term</option>
            <option value="long_term">Long-Term</option>
          </select>
          
          <div id="top-listens" class="row">
            <div class="col">
              <h3 class="p-3 text-center">Top Artists</h1>
              <ul id="top-artists-list" class="list-group list-group-flush"></ul>
            </div>
            <div class="col">
              <h3 class="p-3 text-center">Top Tracks</h1>
              <ul id="top-tracks-list" class="list-group list-group-flush"></ul>
            </div>
          </div>
        </div>

      </div>
      
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.1/dist/js/bootstrap.bundle.min.js" integrity="sha384-gtEjrD/SeCtmISkJkNUaaKMoLD0//ElJ19smozuHV6z3Iehds+3Ulb9Bn9Plx0x4" crossorigin="anonymous"></script>
    <script id="credentials"></script>
    <script id="app"></script>
    <script id="userData"></script>
    <script id="compareData"></script>
    <script type="text/javascript">
      // force browser to avoid caching scripts
      var time = Date.now()
      document.getElementById('credentials').src = 'credentials.js' + '?t=' + time
      document.getElementById('app').src = 'js/app.js' + '?t=' + time
      document.getElementById('userData').src = 'js/userData.js' + '?t=' + time
      document.getElementById('compareData').src = 'js/compareData.js' + '?t=' + time
    </script>
    <script>
      function refetch(selectObject) {
        fetchPeriod = selectObject.value
        document.getElementById('top-artists-list').innerHTML = ''
        document.getElementById('top-tracks-list').innerHTML = ''
        getTopListens("artists")
        .then((data) => {
          handleTopListensResponse(data)
          return getTopListens("tracks")
        })
        .then((data) => {
          handleTopListensResponse(data)
        })
      }
    </script>
  </body>

</html>
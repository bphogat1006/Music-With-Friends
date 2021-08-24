<?php
function db() {
  $hs = "localhost";
  $us = "root";
  $pw = "";
  $db = "music_with_friends";
  
  $conn = mysqli_connect($hs, $us, $pw, $db);
  
  if($conn === false) {
    die("mysql is not connected");
  }
  else {
    mysqli_select_db($conn, $db);
  }
  
  // echo ($conn === false) ? "failed to connect to db" : "connected to db!";
  
  return $conn;
}
?>
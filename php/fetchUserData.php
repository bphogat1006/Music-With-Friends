<?php

  $get_body = file_get_contents('php://input');
  $username = json_decode($get_body)->username;

  require_once('./dbConnect.php');
  $conn = db();
  $query = "SELECT * FROM userdata WHERE userId='$username' OR displayName='$username' ;";
  $result = mysqli_query($conn, $query);
  
  while($row = mysqli_fetch_assoc($result)) {
    echo stripslashes(json_encode($row));
  }

?>
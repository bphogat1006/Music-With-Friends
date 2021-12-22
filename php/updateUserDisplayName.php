<?php

  $get_body = file_get_contents('php://input');
  $userId = json_decode($get_body)->userId;
  $displayName = json_decode($get_body)->displayName;

  require_once('./dbConnect.php');
  $conn = db();
  $query = "UPDATE userdata SET displayName='$displayName' WHERE userId='$userId';";
  $result = mysqli_query($conn, $query);
  
  while($row = mysqli_fetch_assoc($result)) {
    echo stripslashes(json_encode($row));
  }

?>
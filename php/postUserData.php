<?php

  $post_body = file_get_contents('php://input');
  $user_data = json_decode($post_body);

  $userId = $user_data->userId;
  $displayName = $user_data->displayName;
  $artistsRanked = addslashes(json_encode($user_data->artistsRanked));

  // echo $userId;
  // echo $displayName;
  // echo $artistsRanked;
  
  require_once('./dbConnect.php');
  $conn = db();
  // first delete any old entries from the same user
  mysqli_query($conn, "DELETE FROM userdata WHERE userId='$userId';");
  $query = "INSERT INTO userdata (userId, displayName, artistsRanked) VALUES ('$userId', '$displayName', '$artistsRanked');";
  $result = mysqli_query($conn, $query);
  var_dump($result);

?>
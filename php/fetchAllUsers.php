<?php

  require_once('./dbConnect.php');
  $conn = db();
  $query = "SELECT * FROM userdata;";
  $result = mysqli_query($conn, $query);
  $resultCheck = mysqli_num_rows($result);

  if($resultCheck > 0) {
    while($row = mysqli_fetch_assoc($result)) {
      echo $row['displayName'], ', ';
    }
  }

?>
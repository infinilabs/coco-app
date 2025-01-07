export default `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <title>Coco Auth</title>
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      font-weight: 400;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
      text-align: center;
      background-color: #f8f9fa;
    }
    .container {
      padding: 30px;
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
    }
    .logo {
      width: 130px;
      height: auto;
      margin-bottom: 20px;
    }
    p {
      font-size: 21px;
      line-height: 26px;
      color: #12161F;
      margin: 0;
    }
    .error {
      color: #dc2626;
      margin-top: 12px;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Coco<h1>
    <p id="message">You are now signed in. Please re-open the Coco desktop app to continue.</p>
    <div id="error-container"></div>
  </div>
</body>
</html>
`;

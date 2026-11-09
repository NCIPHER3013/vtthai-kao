import https from 'https';

https.get('https://hpthai.com.au', (resp) => {
  let data = '';

  resp.on('data', (chunk) => {
    data += chunk;
  });

  resp.on('end', () => {
    console.log(data.substring(0, 5000));
    // Check if it's rendered by JS or if the data is in the HTML.
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});

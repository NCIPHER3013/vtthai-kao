import fs from 'fs';
import https from 'https';

https.get('https://www.vermontthai.com.au/order', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    fs.writeFileSync('vtt_source.html', data);
    console.log("Written length:", data.length);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});

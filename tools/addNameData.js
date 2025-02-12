const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const apiUrl = 'http://localhost:5000/api/v1/name'; // Replace with your actual API URL

function postName(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const url = new URL(apiUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
      },
    };

    const req = http.request(options, (res) => {
      // eslint-disable-next-line no-unused-vars
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          console.log(`Posted: ${data.name}, Status: ${res.statusCode}`);
          resolve();
        } else {
          console.error(`Failed to post ${data.name}, Status: ${res.statusCode}`);
          reject(new Error(`Failed to post ${data.name}, Status: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Error posting ${data.name}:`, e.message);
      reject(e);
    });

    req.write(postData);
    req.end();

  });
}

async function processFile(filePath, year) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const [name, gender, count] = line.split(',');
    const genderValue = gender === 'M' ? 'males' : 'females';
    const data = { name, gender: genderValue, count: parseInt(count, 10), year };
    await postName(data);
    // await new Promise(resolve => setTimeout(() => resolve(), 1000));
  }
}

async function main() {
    const directoryPath = path.join(__dirname, 'nameData');
    const files = fs.readdirSync(directoryPath);

    for (const file of files) {
        if (path.extname(file) === '.txt') {
        const filePath = path.join(directoryPath, file);
        const year = file.slice(3,7);
        await processFile(filePath, year);
        }
    };
}

main();
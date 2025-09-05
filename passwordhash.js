const bcrypt = require('bcrypt');
const http = require('node:http');
const querystring = require('querystring');


const salt = 10;
const userPassword = 'asd';


const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/login') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const parsedData = querystring.parse(body);
      const username = parsedData.username;
      const password = parsedData.password;

      console.log('Username:', username);
      console.log('Password:', password);

      // Hash the received password
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
          res.writeHead(500);
          return res.end('Error hashing password');
        }

        console.log('Hashed password:', hash);

        // Compare with stored password (for demo, using userPassword)
        bcrypt.compare(userPassword, hash, (err, result) => {
          if (err) {
            res.writeHead(500);
            return res.end('Error comparing password');
          }

          if (result) {
            console.log('mukodik');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(`Welcome, ${username}. Hash: ${hash}`);
          } else {
            console.log('nem mukodik');
            res.writeHead(401);
            res.end('Authentication failed');
          }
        });
      });
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});


server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
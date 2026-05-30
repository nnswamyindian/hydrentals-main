const http = require('http');

const data = JSON.stringify({
  complainant_name: 'Test Reporter',
  complainant_email: 'test@hydrent.com',
  broker_name: 'Suspicious Broker XYZ',
  description: 'This person is charging broker commission fees while pretending to be the owner of the property.',
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/contact/report-broker',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();

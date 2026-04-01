// Test DELETE report endpoint
import http from 'http';

const options = {
  hostname: 'localhost',
  port: 8787,
  path: '/api/report?host=google.by&reportId=test123',
  method: 'DELETE',
  headers: {
    'x-admin-token': process.env.ADMIN_TOKEN || 'your-admin-token-here'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();

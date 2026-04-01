// Простой тест health endpoint
import http from 'http';

const options = {
  hostname: 'localhost',
  port: 8787,
  path: '/api/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Health check:', data);
    testReport();
  });
});

req.on('error', (e) => {
  console.error('Health check failed:', e.message);
});

req.end();

function testReport() {
  const postData = JSON.stringify({
    host: 'example.com',
    reportText: 'Тестовая жалоба',
    verdict: 'low',
    score: 10
  });

  const options = {
    hostname: 'localhost',
    port: 8787,
    path: '/api/report',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
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
    console.error('Report failed:', e.message);
  });

  req.write(postData);
  req.end();
}

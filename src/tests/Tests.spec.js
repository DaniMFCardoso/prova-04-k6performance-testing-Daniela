
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const getProductsDuration = new Trend('get_products', true);
export const RateContentOK = new Rate('content_OK');

export const options = {
  scenarios: {
    products_load_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 2 },
        { duration: '1m', target: 3 },
        { duration: '1m', target: 5 }
      ],
      gracefulRampDown: '0s'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.25'],
    get_products: ['p(90)<6800'],
    content_OK: ['rate>0.95']
  }
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, {
      indent: ' ',
      enableColors: true
    })
  };
}

export default function () {
  const baseUrl = 'https://jsonplaceholder.typicode.com/posts';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  const res = http.get(baseUrl, params);

  if (__VU === 1 && __ITER < 3) {
    console.log(`STATUS: ${res.status}`);
    console.log(`BODY: ${(res.body || '').substring(0, 300)}`);
  }

  getProductsDuration.add(res.timings.duration);

  let posts = null;

  try {
    posts = res.json();
  } catch (error) {
    posts = null;
  }

  const validContent =
    res.status === OK &&
    Array.isArray(posts) &&
    posts.length > 0 &&
    posts.every(post =>
      typeof post.id === 'number' &&
      typeof post.title === 'string' &&
      typeof post.body === 'string'
    );

  RateContentOK.add(validContent);

  check(res, {
    'GET Posts - Status 200': r => r.status === OK,
    'GET Posts - Retorna lista': () => Array.isArray(posts),
    'GET Posts - Lista não vazia': () =>
      Array.isArray(posts) && posts.length > 0,
    'GET Posts - Estrutura válida': () => validContent
  });

  sleep(1);
}

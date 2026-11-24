import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const getProductsDuration = new Trend('get_products', true);
export const RateContentOK = new Rate('content_OK');

export const options = {
  scenarios: {
    products_load_test: {
      executor: 'ramping-vus',
      startVUs: 7,
      stages: [{ duration: '3m30s', target: 92 }],
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
  const baseUrl = 'https://fakestoreapi.com/products';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  const res = http.get(baseUrl, params);

  getProductsDuration.add(res.timings.duration);

  let products = null;

  try {
    products = res.json();
  } catch (error) {
    products = null;
  }

  RateContentOK.add(
    res.status === OK &&
    Array.isArray(products)
  );

  check(res, {
    'GET Products - Status 200': r => r.status === OK,

    'GET Products - Retorna lista': () =>
      Array.isArray(products),

    'GET Products - Lista não vazia': () =>
      Array.isArray(products) && products.length > 0
  });
}


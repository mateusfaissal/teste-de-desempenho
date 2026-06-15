import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Load Test (Teste de Carga) - Etapa 2
 * Objetivo: Validar o comportamento da API sob carga esperada (50 usuários simultâneos).
 * Alvo: POST /checkout/simple (I/O Bound)
 * Cenário:
 *   - Ramp-up: 0 a 50 usuários em 1 minuto
 *   - Platô: Manter 50 usuários por 2 minutos
 *   - Ramp-down: 50 a 0 usuários em 30 segundos
 * SLA: p95 < 500ms e taxa de erro < 1%
 */

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp-up: 0 → 50 usuários em 1 min
    { duration: '2m', target: 50 },   // Platô: manter 50 usuários por 2 min
    { duration: '30s', target: 0 },   // Ramp-down: 50 → 0 em 30s
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // p95 da latência deve ser < 500ms
    http_req_failed: ['rate<0.01'],   // Taxa de erro abaixo de 1%
  },
};

const payload = JSON.stringify({
  product: 'Camiseta',
  quantity: 2,
  price: 49.90,
});

const params = {
  headers: { 'Content-Type': 'application/json' },
};

export default function () {
  const res = http.post('http://localhost:3000/checkout/simple', payload, params);

  check(res, {
    'status é 201': (r) => r.status === 201,
    'status é APPROVED': (r) => r.json().status === 'APPROVED',
  });

  sleep(1);
}

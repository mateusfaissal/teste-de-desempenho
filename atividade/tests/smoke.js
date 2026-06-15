import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Smoke Test - Etapa 1
 * Objetivo: Verificar se a API está de pé antes de iniciar testes pesados.
 * Config: 1 VUser por 30 segundos acessando /health.
 * Critério de Sucesso: 100% de sucesso nas requisições.
 */

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate==0'], // 100% de sucesso (0% de falha)
    http_req_duration: ['p(95)<500'], // Resposta rápida
  },
};

export default function () {
  const res = http.get('http://localhost:3000/health');

  check(res, {
    'status é 200': (r) => r.status === 200,
    'resposta contém status UP': (r) => r.json().status === 'UP',
  });

  sleep(1);
}

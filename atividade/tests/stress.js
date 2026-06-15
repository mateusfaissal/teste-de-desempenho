import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Stress Test (Teste de Estresse) - Etapa 3
 * Objetivo: Identificar o ponto de ruptura (Breaking Point) da API no endpoint CPU-heavy.
 * Alvo: POST /checkout/crypto (CPU Bound)
 * Cenário: Aumento agressivo de carga
 *   - 0 a 200 usuários em 2 minutos
 *   - 200 a 500 usuários em 2 minutos
 *   - 500 a 1000 usuários em 2 minutos
 */

export const options = {
  stages: [
    { duration: '2m', target: 200 },   // Subida: 0 → 200 usuários
    { duration: '2m', target: 500 },   // Subida: 200 → 500 usuários
    { duration: '2m', target: 1000 },  // Subida: 500 → 1000 usuários
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // Threshold alto para observar degradação
    http_req_failed: ['rate<0.50'],     // Permite até 50% de falha para não abortar cedo
  },
};

const payload = JSON.stringify({
  product: 'Notebook Gamer',
  quantity: 1,
  price: 5999.99,
});

const params = {
  headers: { 'Content-Type': 'application/json' },
};

export default function () {
  const res = http.post('http://localhost:3000/checkout/crypto', payload, params);

  check(res, {
    'status é 201': (r) => r.status === 201,
    'transação segura': (r) => {
      try {
        return r.json().status === 'SECURE_TRANSACTION';
      } catch (e) {
        return false;
      }
    },
  });

  sleep(0.5);
}

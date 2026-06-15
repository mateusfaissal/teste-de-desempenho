import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Spike Test (Teste de Pico) - Etapa 4
 * Objetivo: Simular um comportamento de "Flash Sale" (abertura de venda de ingressos).
 * Alvo: POST /checkout/simple (I/O Bound)
 * Cenário:
 *   - Carga baixa (10 usuários) por 30s
 *   - Salto imediato para 300 usuários em 10s
 *   - Manter 300 usuários por 1 minuto
 *   - Queda imediata para 10 usuários
 */

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Carga baixa normal
    { duration: '10s', target: 300 },  // Spike! Salto para 300 usuários
    { duration: '1m', target: 300 },   // Manter pico por 1 minuto
    { duration: '10s', target: 10 },   // Queda imediata para 10 usuários
    { duration: '30s', target: 10 },   // Recuperação em carga baixa
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Threshold mais tolerante para spike
    http_req_failed: ['rate<0.10'],    // Até 10% de falha aceitável em spike
  },
};

const payload = JSON.stringify({
  product: 'Ingresso Show',
  quantity: 1,
  price: 250.00,
});

const params = {
  headers: { 'Content-Type': 'application/json' },
};

export default function () {
  const res = http.post('http://localhost:3000/checkout/simple', payload, params);

  check(res, {
    'status é 201': (r) => r.status === 201,
    'pedido aprovado': (r) => {
      try {
        return r.json().status === 'APPROVED';
      } catch (e) {
        return false;
      }
    },
  });

  sleep(0.5);
}

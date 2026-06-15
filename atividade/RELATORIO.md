# Relatório Técnico - Engenharia de Desempenho

## Resumo Executivo

Este relatório apresenta os resultados dos testes de performance realizados na API de Checkout de E-commerce (SUT), utilizando a ferramenta k6.

### Capacidade Máxima da API

| Cenário | Endpoint | Capacidade Máxima Observada |
|---------|----------|----------------------------|
| **I/O Bound** (`/checkout/simple`) | POST /checkout/simple | **300+ usuários simultâneos** sem falhas. A API manteve p95 ~294ms e 0% de erros mesmo sob spike de 300 VUsers. A natureza assíncrona do `setTimeout` permite que o Node.js gerencie muitas conexões concorrentes sem degradação. |
| **CPU Bound** (`/checkout/crypto`) | POST /checkout/crypto | **~200 usuários** é o ponto de ruptura. Acima disso, a operação de bcrypt bloqueia o Event Loop, causando 98.41% de falhas e latência p95 de 56s com 1000 VUsers. |

---

## Evidências - Resultados dos Testes

### Etapa 1: Smoke Test

- **Endpoint:** GET /health
- **Config:** 1 VUser por 30 segundos
- **Resultado:** ✓ 100% de sucesso, p95 = 2.35ms

![Smoke Test](../prints/Captura%20de%20tela%202026-06-14%20205345.png)
![Smoke Test - Resultado](../prints/Captura%20de%20tela%202026-06-14%20205424.png)

---

### Etapa 2: Load Test (Teste de Carga)

- **Endpoint:** POST /checkout/simple
- **Config:** Ramp-up 0→50 VUsers (1min), Platô 50 VUsers (2min), Ramp-down (30s)
- **SLA:** p95 < 500ms e erros < 1%
- **Resultado:** ✓ p95 = 296.4ms | 0% de erros | 6.868 requisições

![Load Test](../prints/Captura%20de%20tela%202026-06-14%20210020.png)
![Load Test - Resultado](../prints/Captura%20de%20tela%202026-06-14%20210053.png)

---

### Etapa 3: Stress Test (Teste de Estresse)

- **Endpoint:** POST /checkout/crypto (CPU Bound)
- **Config:** Escalada agressiva: 0→200 (2min), 200→500 (2min), 500→1000 (2min)
- **Objetivo:** Identificar o ponto de ruptura (Breaking Point)
- **Resultado:** ✗ **98.41% de falhas** | p95 = 56.34s (respostas válidas) | 75.693 requisições | Threshold FALHOU

![Stress Test](../prints/Captura%20de%20tela%202026-06-14%20210907.png)

---

### Etapa 4: Spike Test (Teste de Pico)

- **Endpoint:** POST /checkout/simple
- **Config:** Carga baixa (10 VUsers) → Salto para 300 VUsers (10s) → Manter 1min → Queda para 10
- **Resultado:** ✓ p95 = 294ms | 0% de erros | 30.717 requisições | 218 req/s

![Spike Test](../prints/Captura%20de%20tela%202026-06-14%20212529.png)
![Spike Test - Resultado](../prints/Captura%20de%20tela%202026-06-14%20212547.png)

---

## Análise de Estresse - Ponto de Ruptura

No teste de estresse (endpoint `/checkout/crypto`), a aplicação apresentou **colapso total** com 98.41% de requisições falhando.

### Dados do teste:

| Métrica | Valor |
|---------|-------|
| Total de requisições | 75.693 |
| Taxa de falha | **98.41%** (74.497 falhas) |
| Requisições bem-sucedidas | Apenas 1.196 (1.58%) |
| Latência média (respostas válidas) | 15.31s |
| Latência p95 (respostas válidas) | **56.34s** |
| Latência máxima | 59.97s |
| Throughput | 194 req/s |

### Ponto de ruptura identificado:

A aplicação começou a falhar a partir de **~200 VUsers simultâneos**. Com o avanço para 500 e 1000 VUsers, o servidor tornou-se praticamente irresponsivo, com apenas 1.58% das requisições recebendo resposta válida.

### Por que isso acontece?

O endpoint `/checkout/crypto` utiliza `bcrypt.genSaltSync()` e `bcrypt.hashSync()`, que são operações **síncronas e CPU-intensive**. No Node.js (single-threaded), essas operações **bloqueiam o Event Loop**, impedindo que novas requisições sejam processadas enquanto o hash está sendo calculado.

### Comportamento observado:

| Faixa de VUsers | Comportamento |
|-----------------|---------------|
| 0 - 200 | Latência aceitável, sem falhas significativas |
| 200 - 500 | Latência cresce exponencialmente, timeouts começam a aparecer |
| 500 - 1000 | Servidor praticamente irresponsivo, **98.41% de falhas** |

### Contraste com o endpoint I/O Bound:

O endpoint `/checkout/simple` usa `setTimeout` (operação assíncrona), que **não bloqueia o Event Loop**. Por isso, mesmo com 300 VUsers simultâneos no spike test, a API manteve 0% de erros e latência estável (~294ms p95).

---

## Conclusão

A API demonstra comportamento clássico de uma aplicação Node.js single-threaded:
- **Excelente desempenho em operações I/O bound** (assíncronas): suporta centenas de usuários sem degradação.
- **Limitação severa em operações CPU bound** (síncronas): o Event Loop é bloqueado, causando ruptura entre 200-300 usuários simultâneos.

---

*Relatório gerado em: 14/06/2026*
*Ferramenta utilizada: k6 v2.0.0*

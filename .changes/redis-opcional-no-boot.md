---
impacto: capacidade_nova
secao: alterado
titulo: Iniciar o CRM sem Redis configurado
---

O CRM inicia sem Redis e informa a ausência no diagnóstico. Os limites de
tentativas e o debounce de indexação usam memória por processo nesse modo.
Instalações com Redis continuam compartilhando esses controles.

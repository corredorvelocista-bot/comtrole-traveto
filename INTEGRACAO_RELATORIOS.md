# Integração da tela Relatórios — Anotei

## O que mudou
- Adicionada a página `relatorios.html`, com estilos em `src/css/relatorios.css` e lógica em `src/js/relatorios.js`.
- O cartão **Relatórios** do menu principal agora abre `./relatorios.html`.
- `vite.config.mjs` inclui a nova página no build.
- As demais telas e os serviços de produção, despesas e Gestão Financeira não foram alterados.

## Como os números são obtidos
- Produção: lançamentos atuais (`temp_lancamentos`) e semanas fechadas do banco IndexedDB `TraveteDB`, tabela `semanas` (com fallback para `historico_semanas` quando o IndexedDB não está disponível).
- Despesas: registros existentes em `despesas_pessoais`, agrupados pela data.
- Resultado estimado: valor bruto produzido menos despesas registradas no mês. Pode ficar negativo; não representa necessariamente dinheiro recebido ou saldo disponível.
- A página apenas lê os dados. Não cria, edita ou exclui lançamentos nem despesas.
- Lançamentos antigos sem ano/data confiável são omitidos do período, com aviso, para não atribuí-los incorretamente a um mês.

## Executar
Na pasta do projeto:
```bash
npm install
npm run dev
```

Para gerar a versão de produção:
```bash
npm run build
```
A pasta de saída é `dist/`.

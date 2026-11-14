# Kian Contábil — Painel de vendas

Dashboard estático para a atividade de Fundamentos de IA e Análise de Dados. Foi feito com HTML, CSS e JavaScript puro; não usa backend, banco de dados ou compilação.

## Abrir e usar

1. Abra `public/index.html` no navegador. Os dados do projeto estão incorporados em `public/dados-iniciais.js`, então a demonstração inicial não depende de `fetch` nem de ler um CSV local.
2. Use período, categoria e região para filtrar. Indicadores, gráficos e tabela são atualizados juntos.
3. Use **Importar CSV** para substituir a base. O arquivo é lido localmente pelo navegador e não é enviado a um servidor.
4. Pesquise ou clique nos títulos das colunas para ordenar. **Exportar CSV** baixa os registros que correspondem aos filtros e à pesquisa.

Chart.js 4.4.7 e Papa Parse 5.4.1 são carregados por CDN. É necessário acesso à internet para exibir gráficos e importar CSV. As fontes do Google Fonts também dependem de conexão; fontes do sistema são usadas como alternativa.

## Base e adaptação

O projeto já continha `vendas_hamburgueria.csv`, com 1.367 linhas e as colunas `id_venda`, `data`, `dia_semana`, `periodo`, `produto`, `categoria`, `quantidade`, `preco_unitario`, `forma_pagamento`, `canal`, `tempo_espera_min` e `avaliacao`. A base cobre 01/07/2026 a 30/09/2026. O CSV original na raiz foi preservado; `public/dados-exemplo.csv` é uma cópia para facilitar a importação. A demonstração usa os dados existentes; não foi criada uma nova amostra fictícia de 200 linhas porque já havia uma base no projeto.

Não há coluna `regiao`. O filtro e o gráfico regional indicam essa ausência; o painel não infere região a partir de outros campos. A coluna `canal` está disponível, então há um gráfico adicional por canal. Uma base importada com `regiao` habilita automaticamente seu filtro e gráfico. `avaliacao` tem 136 valores ausentes; eles são mantidos como ausentes e exibidos como `—`, não como zero.

## Importar uma base própria

O CSV deve ter cabeçalho e as colunas essenciais `id_venda`, `data`, `quantidade` e `preco_unitario`. Maiúsculas/minúsculas, espaços e acentos nos cabeçalhos são normalizados. A data aceita `AAAA-MM-DD` ou `DD/MM/AAAA`; números decimais podem usar ponto ou vírgula. Os campos `produto`, `categoria` e `regiao` são opcionais, assim como quaisquer outras colunas, que aparecem na tabela e na exportação.

Cada linha é tratada como um item de venda. IDs repetidos não são removidos; a quantidade de vendas conta IDs únicos após os filtros. Linhas com ID, data, quantidade ou preço ausentes, datas inválidas ou números ausentes, inválidos ou negativos são descartadas e os motivos são exibidos. Quantidade e preço iguais a zero são válidos. Campos opcionais vazios continuam ausentes.

## Fórmulas

- **Faturamento da linha:** `quantidade × preco_unitario`.
- **Faturamento total:** soma do faturamento das linhas após os filtros.
- **Vendas únicas:** contagem de IDs distintos após os filtros.
- **Unidades vendidas:** soma das quantidades após os filtros.
- **Ticket médio:** faturamento total ÷ vendas únicas. Com zero vendas, mostra R$ 0,00.
- **Faturamento mensal e por categoria/região/canal:** soma do faturamento das linhas de cada grupo.

A pesquisa limita as linhas exibidas na tabela e exportadas. A ordenação e a paginação não alteram os indicadores.

## Publicar no Render pelo GitHub

1. Envie o projeto a um repositório GitHub, incluindo `public` e `AGENTS.md`.
2. No Render, crie um serviço **Static Site** conectado ao repositório.
3. Configure: **Branch:** a branch que contém o projeto; **Root Directory:** vazio; **Build Command:** `echo "Site pronto"`; **Publish Directory:** `public`.
4. Crie o serviço para publicar os arquivos estáticos.

## Arquivos

- `AGENTS.md`: orientações do projeto preservadas.
- `public/index.html`: estrutura do dashboard e bibliotecas via CDN.
- `public/styles.css`: aparência responsiva.
- `public/script.js`: validação, cálculos, filtros, gráficos, tabela e importação/exportação.
- `public/dados-iniciais.js`: dados embutidos para a exibição inicial local.
- `public/dados-exemplo.csv`: cópia do CSV já fornecido.
- `vendas_hamburgueria.csv`: arquivo de dados original preservado na raiz.

# ID Maricá - identidade cidadã

O portal reúne uma demonstração de cadastro e atualização de benefícios sociais. O painel de gestão cruza indicadores por bairro e mostra a distribuição de serviços públicos para apoiar o planejamento municipal.

[Abrir o portal](https://davidevgomes.github.io/id-marica/) · [Abrir o painel de gestão](https://davidevgomes.github.io/id-marica/?painel=gestao)

## Executar localmente

```sh
npm ci
npm run dev
npm run lint
npm run build
```

O protótipo usa perfis simulados e armazena os cadastros no navegador. Use exemplos e dados fictícios. Os pontos da rede de ensino vêm de `Escolas_munic_cad.kmz` e estão em `src/data/maricaEscolas.json`.

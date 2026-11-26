# ID Maricá - identidade cidadã

Portal de cadastro social com Área do Munícipe, oportunidades, notícias e um painel para consultar serviços municipais e transporte.

## Desenvolvimento

```sh
npm ci
npm test
npm run lint
npm run build
```

O servidor do Vite executa apenas a interface. Para executar as funções de `api/`, use `vercel dev` após vincular o projeto. Os cadastros só são persistidos no Supabase autenticado. O painel de gestão ainda usa perfis de demonstração e não tem acesso aos registros do cidadão.

## Vercel e Supabase

1. Importe este repositório no projeto Vercel e selecione o preset Vite. As rotas `api/` são funções Node.js 22.
2. Em um projeto Supabase, aplique as migrações em `supabase/migrations/`, na ordem dos arquivos. Mantenha desabilitado o cadastro público por e-mail no Supabase Auth.
3. Configure na Vercel as variáveis de `.env.example` sem o prefixo `VITE_`. Gere um segredo aleatório de pelo menos 32 caracteres para `ID_MARICA_CPF_SECRET`. Preserve esse segredo porque ele deriva o identificador interno do CPF.
4. Mantenha `ID_MARICA_ALLOW_REGISTRATION=false` enquanto as integrações estiverem em homologação. `ID_MARICA_REQUIRE_BIOMETRY` tem valor padrão `true`. Use `false` apenas em um ambiente de teste controlado sem dados reais.

A senha é gerenciada pelo Supabase Auth. A sessão usa cookie HTTPS de acesso, com expiração configurada no serviço. A conta tem um identificador interno derivado do CPF. O e-mail informado no cadastro é de contato e não funciona como recuperação automática de senha. Defina um procedimento seguro de recuperação antes de abrir o serviço à população.

Os PDFs dos contratos de aluguel ficam na tabela privada e são entregues apenas ao titular autenticado. Remova periodicamente registros vencidos de `citizen_identity_checks` e `citizen_rate_limits` na sua rotina de retenção. Os cadastros que existiam apenas no navegador pertenciam à versão demonstrativa e não são reaproveitados como registros oficiais.

## Validação facial

O cadastro usa o App Datavalid V5 do Serpro para capturar o rosto, executar a prova de vida e comparar a face com a base oficial. A função da Vercel gera o PIN, consulta o resultado e valida a assinatura, o CPF, o PIN e o contratante. A selfie não passa pelo ID Maricá. O resultado só é aprovado quando a similaridade atinge o limiar documentado de 85%.

Configure as credenciais do Serpro, o CNPJ autorizado e o adaptador da GCC contratada. `DATAVALID_GCC_URL` deve ser um serviço HTTPS operado pela integração, autenticado com `DATAVALID_GCC_AUTH`. Recebe `{ cpf, purpose }` e devolve `{ token, cnpj_anuente }` para a autorização daquela consulta. O protocolo real da GCC depende do contrato. [Guia oficial do Datavalid V5](https://apicenter.estaleiro.serpro.gov.br/documentacao/datavalid/quick_start/#62-como-consumir-o-app-datavalid)

## Fontes públicas

- **Notícias e cursos municipais** usam o RSS da Prefeitura. O portal atualiza a consulta a cada cinco minutos. Links oficiais dão acesso aos cursos federais e municipais. [RSS da Prefeitura](https://www.marica.rj.gov.br/feed/?post_type=noticia)
- **Vagas** usam o monitor público do IDR com dados da Secretaria de Trabalho e Emprego, SINE e Casa do Trabalhador. O resultado exibe o mês mais recente recebido e orienta a confirmar disponibilidade. Novo Caged é fonte de estatísticas de emprego. [Monitor de vagas](https://idr.marica.rj.gov.br/socioeconomico/)
- **Ônibus** usam o catálogo oficial da EPT para disponibilizar pesquisa e links de horários. Quando houver um feed autorizado para publicação, configure `EPT_GTFS_RT_URL` com a URL HTTPS de quadros completos GTFS Realtime de posições. O painel consulta a cada 20 segundos e exibe posições com até três minutos de idade. [Horários da EPT](https://www.eptmarica.rj.gov.br/horariosbd/listarLinhas.php?tp_linha=1)

## Instalação no celular

Abra **Menu → Instalar no celular**. A interface básica pode abrir offline após o primeiro acesso. Autenticação, dados pessoais, atualizações e mapas dependem de conexão.

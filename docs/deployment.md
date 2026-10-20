# Publicação da demonstração completa

Destino: Render Free para a aplicação Docker e Neon Free para PostgreSQL. O repositório não solicita banco pago, disco pago, domínio ou cartão.

Demonstração publicada: **https://fluxo-os.onrender.com/**. A publicação inicial foi feita com as ferramentas oficiais de linha de comando e API; o Blueprint abaixo permite reproduzir a configuração em outra instalação.

## Neon

1. Crie um projeto Free exclusivo para dados fictícios, por exemplo `fluxo-os-demo`.
2. Escolha PostgreSQL 17 e região próxima de Virginia/us-east, onde ficará o aplicativo.
3. Copie a URL de conexão direta (sem pooling) para configurar o Render. Não a publique no Git, em issues, prints ou mensagens.

O aplicativo aceita `DATABASE_URL` no formato PostgreSQL fornecido pelo Neon, com caracteres escapados na senha. A conexão usa verificação de certificado TLS. Os parâmetros de URL não podem desligar essa verificação.

## Render

1. Conecte o repositório `duduescudero/fluxo-os` pela integração GitHub.
2. Crie um Blueprint usando `render.yaml` e confira que o serviço está no plano **Free**.
3. Preencha `DATABASE_URL` no campo secreto solicitado pelo painel.
4. Inicie a publicação e acompanhe os logs. Migrações e carga fictícia são aplicadas na inicialização.
5. Verifique HTTPS, entrada nos dois perfis, consultas e bloqueio de alterações.

O endereço de uma nova instalação depende da disponibilidade do nome no Render. Valide-o antes de anunciar no README.

## Comportamento público

- A interface React e a API C# usam a mesma origem HTTPS.
- O login de demonstração acessa somente a base fictícia e não exige senha do visitante.
- Alterações de negócio são bloqueadas no servidor.
- Cookies públicos usam Secure, HttpOnly e SameSite; operações continuam protegidas contra CSRF.
- As chaves de proteção ficam no PostgreSQL quando não há diretório persistente configurado. Reiniciar o container não exige perder todas as sessões.
- Sessões criadas pela entrada de demonstração não autorizam acesso quando o modo demonstração é desativado.
- A saúde do Render usa `/health/live`; esse endpoint não consulta o Neon a cada verificação. `/health/ready` permite conferir o banco quando necessário.

O tratamento de headers de proxy é habilitado especificamente no ambiente Render. Não habilite a confiança no proxy indiscriminadamente em outras hospedagens.

## Limites do plano gratuito

O Render pode suspender o aplicativo após inatividade, causando demora na primeira abertura. O Neon possui cotas de armazenamento e computação. Não há promessa de disponibilidade contínua ou de uso gratuito ilimitado. Não são usados monitores para manter artificialmente os serviços acordados.

Essa configuração é para portfólio. Não aponte o login público de demonstração para dados reais. Uma instalação real precisa de revisão de operação, segredos, backup e permissões próprias.

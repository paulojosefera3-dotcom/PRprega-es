# PR Pregações com Gemini — Netlify

Esta pasta contém a versão do app preparada para publicação no Netlify. O HTML fica em public/ e as chamadas ao Gemini passam pelas Netlify Functions em netlify/functions/. A chave do Gemini não está no HTML nem neste repositório.

## Publicar com GitHub e Netlify

1. Crie um repositório **privado** no GitHub e envie para a raiz dele o conteúdo desta pasta: netlify.toml, package.json, public/ e netlify/. Não envie a pasta dentro de uma subpasta, a menos que configure essa subpasta como diretório-base no Netlify.
2. No Netlify, escolha **Add new project** > **Import an existing project** e conecte o repositório do GitHub. O arquivo netlify.toml já define a pasta publicada como public e as funções como netlify/functions; não precisa de comando de build.
3. No projeto Netlify, abra **Project configuration** > **Environment variables** e adicione:
   - GEMINI_API_KEY — sua chave do Gemini.
   - BIBLELEXICON_API_KEY — chave da BibleLexicon; necessária para escolher a versão ARA ou ARC.
   - APP_ACCESS_PASSWORD — crie uma senha para proteger o uso do Gemini pelo app. Na primeira utilização da IA, seu pai precisará digitá-la no app.
   - GEMINI_MODEL — opcional; o padrão é gemini-3.8-flash.
4. Garanta que as variáveis estejam disponíveis para **Functions** (ou para todos os escopos, se essa opção aparecer).
5. Salve as variáveis e faça o deploy. Se mudar uma variável depois, inicie um novo deploy para ela valer.
6. Abra a URL do site no celular. A leitura da Bíblia Livre, da ARA, da ARC e o Gemini precisam de conexão com a internet. A Bíblia Livre usa a API pública Midvash, sem chave. A ARA e a ARC usam a BibleLexicon pelo servidor; cadastre BIBLELEXICON_API_KEY como segredo no Netlify. O plano grátis da BibleLexicon informa 1.000 requisições por mês. A chave fica no servidor, nunca no HTML.

O app também tem o próprio acesso/perfil local, separado da senha APP_ACCESS_PASSWORD, que autoriza as chamadas ao Gemini.

## Segredos

Não coloque GEMINI_API_KEY nem BIBLELEXICON_API_KEY no index.html, em netlify.toml nem em um repositório GitHub. Cadastre-as somente nas variáveis de ambiente do projeto Netlify. A Bíblia Livre usa uma API sem chave e requer que a atribuição da licença apareça junto ao texto. A ARC é consultada pela função do servidor e não é embutida no repositório. Se uma chave já foi compartilhada em conversa ou commit, revogue-a e crie outra antes de publicar.

## APK

O Netlify publica o app web e fornece o backend do Gemini. Ele não gera um APK automaticamente. O APK pode ser criado depois como um invólucro Android que abre a URL publicada; o celular continuará precisando de internet para conversar com o Gemini.

## Documentação

- https://docs.netlify.com/manage/projects/connect-project-to-repo/
- https://docs.netlify.com/build/functions/environment-variables/
- https://ai.google.dev/gemini-api/docs/models

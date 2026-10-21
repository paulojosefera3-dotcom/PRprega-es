# PR Pregações para Android

Este projeto Android abre o site publicado em uma tela própria usando o WebView do sistema. Ele não abre o Chrome como navegador separado.

O app depende de internet: o site e as funções do Gemini continuam hospedados no Netlify. A senha de acesso ao Gemini e a chave da API continuam protegidas nas variáveis de ambiente do Netlify; elas não são empacotadas no APK.

## Build

O workflow `.github/workflows/build-android-apk.yml` gera um APK de depuração assinado para instalação pessoal. O arquivo aparece como artefato do GitHub Actions. O APK pode ser instalado no Android após permitir a instalação de apps baixados pelo navegador ou gerenciador de arquivos.

O endereço da Netlify usado pelo app fica em `MainActivity.java`.

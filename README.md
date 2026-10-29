# Pong Online — jogar com um amigo

Esta versão mantém o visual simples do Pong e usa um servidor Node.js + Socket.IO para conectar dois computadores pela internet.

## Testar no seu computador
1. Instale o Node.js (versão LTS) se ainda não tiver.
2. Extraia a pasta `pong-online`.
3. Abra o terminal dentro dessa pasta.
4. Execute `npm install`.
5. Execute `npm start`.
6. No seu navegador, abra `http://localhost:3000`.
7. Para testar duas pessoas no mesmo computador, abra o endereço em duas janelas/navegadores e entre com o mesmo código.

## Jogar pela internet com seu amigo
O endereço `localhost` só funciona no seu computador. Para o amigo jogar de outra casa, o servidor precisa ficar hospedado em um serviço público que aceite aplicações Node.js e WebSockets (por exemplo, Render ou Railway).

- Suba os arquivos desta pasta para um repositório GitHub.
- Crie um serviço Web Service no provedor de hospedagem usando esse repositório.
- Comando de build: `npm install`
- Comando de início: `npm start`
- Depois que o provedor gerar um endereço público `https://...`, abra esse mesmo endereço nos dois computadores.
- Um jogador deixa o código da sala como está e clica em **Entrar / Criar sala**. Envia o código ao amigo. O amigo digita exatamente o mesmo código e também clica no botão.

Não compartilhe arquivos `.env` ou senhas; este projeto não precisa de chave de API.

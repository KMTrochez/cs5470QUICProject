const quic = require('node:quic');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let session;
let connected = false;

function connectToServer(host, port, username) {
    const socket = quic.createSocket({ endpoint: {} });

    session = socket.connect({
        address: host,
        port: parseInt(port),
        alpn: 'chat-app',
        servername: 'localhost',
        key: fs.readFileSync('./cert/server-key.pem'),
        cert: fs.readFileSync('./cert/server-cert.pem')
    });

    session.on('secure', () => {
        const stream = session.openStream();
        stream.end(username); // Register username
        console.log(`[+] Connected to ${host}:${port} as ${username}`);
        connected = true;
        promptForInput();
    });

    session.on('stream', (stream) => {
        let msg = '';
        stream.on('data', chunk => msg += chunk.toString());
        stream.on('end', () => console.log(`\n${msg}\n> `));
    });

    session.on('close', () => {
        console.log('[!] Connection closed');
        process.exit(0);
    });
}

function promptForInput() {
    rl.question('> ', input => {
        const args = input.split(' ');
        const cmd = args[0];

        switch (cmd) {
            case 'send':
                if (!connected) return console.log('[-] Not connected.');
                const message = args.slice(1).join(' ');
                const stream = session.openStream();
                stream.end(message);
                break;

            case 'exit':
                session.close();
                rl.close();
                break;

            case 'help':
                console.log(`
Available Commands:
  send <message>   Send a message to all users
  exit             Disconnect and exit
  help             Show this help message
        `);
                break;

            default:
                console.log('Unknown command. Use "help"');
        }

        promptForInput();
    });
}

// Startup
if (process.argv.length !== 5) {
    console.log('Usage: node client.js <server-ip> <port> <username>');
    process.exit(1);
}

const [host, port, username] = process.argv.slice(2);
connectToServer(host, port, username);

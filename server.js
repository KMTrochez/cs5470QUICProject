const quic = require('node:quic');
const fs = require('fs');

const PORT = 12345;
const clients = new Map(); // session => name

const server = quic.createSocket({ endpoint: { port: PORT } });

server.listen({
    key: fs.readFileSync('./cert/server-key.pem'),
    cert: fs.readFileSync('./cert/server-cert.pem'),
    alpn: 'chat-app'
});

server.on('session', (session) => {
    console.log('[+] New session from', session.remoteAddress);

    session.on('stream', (stream) => {
        let data = '';
        stream.on('data', chunk => data += chunk.toString());
        stream.on('end', () => {
            const sender = clients.get(session) || session.remoteAddress;
            console.log(`[${sender}] ${data}`);

            // Broadcast to all other clients
            for (let [s, name] of clients) {
                if (s !== session && !s.destroyed) {
                    const outbound = s.openStream();
                    outbound.end(`[${sender}]: ${data}`);
                }
            }
        });
    });

    // Register name (first message only)
    session.once('stream', stream => {
        stream.once('data', chunk => {
            const name = chunk.toString().trim();
            clients.set(session, name);
            console.log(`[*] Registered user: ${name}`);
        });
    });

    session.on('close', () => {
        console.log('[!] Session closed');
        clients.delete(session);
    });
});

console.log(`🔐 QUIC Server listening on port ${PORT}...`);

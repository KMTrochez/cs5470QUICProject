function sendMessage() {
    const msg = document.getElementById('message').value;
    const box = document.getElementById('chat-box');
    box.innerHTML += `<p>You: ${msg}</p>`;

    fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
    });
}

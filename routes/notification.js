const express = require('express');
const router = express.Router();
const ws = require('ws');

module.exports = {
    onConnection: function(socket, wsServer) {
        socket.on('message', message => {
            wsServer.clients.forEach(client => {
                if (client !== ws && client.readyState === ws.OPEN) {
                    client.send(`You sent -> ${message}`);
                }
            });
        });
    }
}

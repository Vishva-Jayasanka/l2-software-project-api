const jwt = require('jsonwebtoken');
const ObjectID = require('mongodb').ObjectID;
const sql = require('mssql');

const Errors = require('../errors/errors');
const User = require('../models/user');
const {poolPromise} = require('./sql-connection');

module.exports = {
    VerifyToken: async function (request, response, next) {
        if (!request.headers.authentication) {
            return response.status(401).send(Errors.unauthorizedRequest);
        }
        const token = request.headers.authentication.split(' ')[1];
        if (token === 'null') {
            return response.status(401).send(Errors.unauthorizedRequest);
        }
        try {
            const payload = jwt.verify(token, "secret_key");
            if (!payload) {
                return response.status(401).send(Errors.unauthorizedRequest);
            } else {
                try {
                    const pool = await poolPromise;
                    const result = await pool.request()
                        .input('username', sql.Char(7), payload.subject)
                        .execute('checkValidity', (error, result) => {
                            if (error) {
                                return response.status(500).send(Errors.serverError);
                            } else {
                                if (result.returnValue === 1) {
                                    request.username = payload.subject;
                                    request.role = result.recordset[0].roleName;
                                    next();
                                } else {
                                    return response.status(401).send(Errors.unauthorizedRequest);
                                }
                            }
                        });
                } catch (error) {
                    return response.status(500).send(Errors.unauthorizedRequest);
                }
            }
        } catch (exception) {
            return response.status(401).send(Errors.serverError);
        }
    },
    verifyWebSocketConnection: async function (request, socket, head, wsServer) {
        if (!request.headers['sec-websocket-protocol']) {
            destroySocket(socket);
            return 'WebSocket connection refused!';
        }
        const token = request.headers['sec-websocket-protocol'];
        const payload = jwt.verify(token, "secret_key");
        if (!payload) {
            destroySocket(socket);
            return 'WebSocket connection refused!';
        } else {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('username', sql.Char(7), payload.subject)
                .execute('checkValidity', (error, result) => {
                    if (error) {
                        destroySocket();
                        return 'WebSocket connection refused!';
                    } else {
                        if (result.returnValue === 1 && result.recordset[0].roleName === 'teacher') {
                            console.log(result);
                            wsServer.handleUpgrade(request, socket, head, socket => {
                                wsServer.emit('connection', socket, request);
                            });
                            return 'WebSocket connection refused!';
                        } else {
                            destroySocket();
                            return 'WebSocket connection refused!';
                        }
                    }
                });
        }

    }
}

function destroySocket(socket) {
    socket.write(
        'HTTP/1.1 401 Web Socket Protocol Handshake\r\n' +
        'Upgrade: WebSocket\r\n' +
        'Connection: Upgrade\r\n' +
        '\r\n');
    socket.destroy();
}

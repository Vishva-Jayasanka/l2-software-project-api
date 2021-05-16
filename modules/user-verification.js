const jwt = require('jsonwebtoken');
const sql = require('mssql');

const Errors = require('../errors/errors');
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
                    await pool.request()
                        .input('username', sql.Char(7), payload.subject)
                        .input('token', sql.VarChar(300), token)
                        .input('time', sql.BigInt, +new Date())
                        .execute('checkValidity', (error, result) => {
                            if (error) {
                                return response.status(500).send(Errors.serverError);
                            } else {
                                if (result.returnValue === 1) {
                                    request.username = payload.subject;
                                    request.role = result.recordset[0].roleID;
                                    request.verified = result.recordset[0].verified
                                    next();
                                } else if (result.returnValue === 2) {
                                    response.status(440).send({
                                        status: false,
                                        message: 'Your session has times out'
                                    });
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
    verifyWebSocketConnection: async (request, socket, head, wsServer) => {
        if (!request.headers['sec-websocket-protocol']) {
            return 'WebSocket connection refused!';
        }
        const token = request.headers['sec-websocket-protocol'];
        const payload = jwt.verify(token, "secret_key");
        if (!payload) {
            return 'WebSocket connection refused!';
        } else {
            try {
                const pool = await poolPromise;
                await pool.request()
                    .input('username', sql.Char(7), payload.subject)
                    .input('token', sql.VarChar(300), token)
                    .input('time', sql.BigInt, +new Date())
                    .execute('checkValidity', (error, result) => {
                        if (error) {
                            return 'WebSocket connection refused!';
                        } else {
                            if (result.returnValue === 1) {
                                wsServer.handleUpgrade(request, socket, head, socket => {
                                    socket.details = result.recordset[0];
                                    wsServer.emit('connection', socket, request);
                                });
                            } else {
                                return 'WebSocket connection refused!';
                            }
                        }
                    });
            } catch (error) {
                return 'Server error!'
            }
        }

    }
}


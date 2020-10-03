const jwt = require('jsonwebtoken');
const ObjectID = require('mongodb').ObjectID;
const sql = require('mssql');

const Errors = require('../errors/errors');
const User = require('../models/user');
const {poolPromise} = require('../routes/sql-connection');

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
    }
}

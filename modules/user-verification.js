const jwt = require('jsonwebtoken');
const ObjectID = require('mongodb').ObjectID;

const Errors = require('../errors/errors');
const User = require('../models/user');

module.exports = {
    VerifyToken: function (request, response, next) {
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
                User.findById(ObjectID(payload.subject), function (error, user) {
                    if (error) {
                        return response.status(401).send(Errors.unauthorizedRequest);
                    } else {
                        if (!user) {
                            return response.status(401).send(Errors.unauthorizedRequest);
                        } else {
                            request.user = user;
                            next();
                        }
                    }
                });
            }
        } catch (exception) {
            return response.status(401).send(Errors.serverError);
        }
    }
}

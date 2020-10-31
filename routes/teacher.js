const express = require('express');
const router = express.Router();
const sql = require('mssql');

const Errors = require('../errors/errors');
const verifyToken = require('../modules/user-verification').VerifyToken;
const {poolPromise} = require('../modules/sql-connection');

function verifyTeacher(request, response, next) {
    if (request.role === 'teacher') {
        next();
    } else {
        response.status(401).send(Errors.unauthorizedRequest);
    }
}



module.exports = router;

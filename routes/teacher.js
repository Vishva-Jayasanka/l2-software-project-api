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

router.post('/get-assignments', verifyToken, verifyTeacher, async (request, response) => {

    const teacherID = request.username;

    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('teacherID', sql.Char(7), teacherID)
            .execute('getAssignments', (error, result) => {
                if (error) {
                    console.log(error);
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        modules: result.recordsets[0],
                        teachers: result.recordsets[1],
                        lectureHours: result.recordsets[2],
                    });
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

module.exports = router;
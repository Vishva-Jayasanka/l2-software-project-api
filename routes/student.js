const express = require('express');
const router = express.Router();
const sql = require('mssql');

const Errors = require('../errors/errors');
const verifyToken = require('../modules/user-verification').VerifyToken;
const {poolPromise} = require('../modules/sql-connection');

function verifyStudent(request, response, next) {
    if (request.role === 3) {
        next();
    } else {
        return response.status(401).send(Errors.unauthorizedRequest);
    }
}


// upload student payments
router.post('/upload-payment', verifyToken, verifyStudent, async (request, response) => {
    const data = request.body;
    console.log(data);
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('studentID', sql.Char(7), data.paymentForm.depositor.registrationNumber)
            .input('bank', sql.VarChar(50), data.paymentForm.deposit.bankName)
            .input('slipNo', sql.Int, data.paymentForm.deposit.slipNumber)
            .input('amount', sql.Int, data.paymentForm.deposit.totalPaid)
            .input('paymentDate', sql.Date, data.paymentForm.deposit.paymentDate)
            .input('externalNote', sql.VarChar(50), data.paymentForm.deposit.externalNote)
            .input('paymentStatus', sql.Int, 1)
            .execute('uploadPayment', function (error, result) {
                if (error) {
                    console.error(error);
                    response.send(Errors.serverError);
                } else {
                    response.send({
                        status: true,
                        message: 'Request received successfully'
                    });
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-students-payment-details', verifyToken, verifyStudent, async (request, response) => {
    console.log('request.username=', request.username);
    const studentID = request.username;

    try {

        const pool = await poolPromise;
        await pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('getStudentPayments', (error, result) => {
                if (error || result.returnValue === -1) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        results: result.recordsets,
                    })
                    console.log('result.recordsets=', result.recordsets);
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

module.exports = router;
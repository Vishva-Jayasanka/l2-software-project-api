const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const sql = require('mssql');

const Errors = require('../errors/errors');
const emailVerification = require('../modules/email-verification');
const verifyToken = require('../modules/user-verification').VerifyToken;

const {comparePassword} = require("../modules/validate-password");
const {hashPassword} = require("../modules/validate-password");
const {validatePassword} = require("../modules/validate-password");
const {poolPromise} = require('../modules/sql-connection');

async function addVerificationRequest(username, email, token, callback) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.Char(7), username)
            .input('email', sql.VarChar(50), email)
            .input('token', sql.VarChar(300), token)
            .execute('addVerificationRequest', (error, result) => {
                if (error) {
                    return callback(error, '');
                } else {
                    return callback('', result);
                }
            });
    } catch (error) {
        return callback(error, '');
    }
}

router.post('/login', async (request, response) => {

    let userData = request.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.Char(7), userData.username)
            .execute('checkUserCredentials', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 0) {
                        comparePassword(userData.password, result.recordset[0].password, (error, valid) => {
                            if (error) {
                                response.status(500).send(Errors.serverError);
                            } else {
                                if (valid) {
                                    let user = result.recordset[0];
                                    delete user.password;
                                    let time = +new Date()
                                    user.token = jwt.sign({
                                        subject: user.username,
                                        role: user.roleName,
                                        time
                                    }, 'secret_key');
                                    pool.request()
                                        .input('username', sql.Char(7), userData.username)
                                        .input('token', sql.VarChar(300), user.token)
                                        .input('lastActive', sql.BigInt, time)
                                        .execute('changeActiveStatus', (error, result) => {
                                            if (error) {
                                                response.send(Errors.serverError);
                                            } else {
                                                response.status(200).send(user);
                                            }
                                        });
                                } else {
                                    response.status(401).send({
                                        status: false,
                                        message: 'Username or password is incorrect!'
                                    });
                                }
                            }
                        });
                    } else {
                        response.status(401).send({
                            status: false,
                            message: 'Username or password is incorrect!'
                        });
                    }
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/send-verification-email', verifyToken, async (request, response) => {

    const email = request.body.email;

    if (!request.verified && email) {

        try {
            const pool = await poolPromise;
            await pool.request()
                .input('username', sql.Char(7), request.username)
                .query('SELECT firstName, lastName FROM Users WHERE username = @username', (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        const user = result.recordset[0];
                        user.token = jwt.sign({
                            username: request.username,
                            email: email,
                            timeSent: +new Date()
                        }, 'verify_email');
                        user.email = email;
                        user.username = request.username;

                        emailVerification.sendVerificationEmail(user, 'verification', async (status) => {
                            if (status) {
                                await addVerificationRequest(request.username, email, user.token, (error, result) => {
                                    if (error) {
                                        response.status(500).send(Errors.serverError);
                                    } else {
                                        response.status(200).send({
                                            status: true,
                                            message: 'Verification email sent successfully'
                                        });
                                    }
                                });
                            } else {
                                response.status(500).send(Errors.serverError);
                            }
                        });

                    }
                });
        } catch (error) {
            response.status(500).send(Errors.serverError);
        }
    } else {
        response.status(401).send(Errors.unauthorizedRequest);
    }

});

router.post('/send-recovery-email-verification', verifyToken, async (request, response) => {

    const email = request.body.email;

    try {

        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.Char(7), request.username)
            .query('SELECT firstName, lastName FROM Users WHERE username = @username', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    const user = result.recordset[0];
                    user.token = jwt.sign({
                        username: request.username,
                        email: email,
                        timeSent: Date.now()
                    }, 'verify_email');
                    user.email = email;
                    user.username = request.username;

                    emailVerification.sendVerificationEmail(user, 'change-recovery-email', async (status) => {
                        if (status) {
                            await addVerificationRequest(request.username, email, user.token, (error, result) => {
                                if (error) {
                                    response.status(500).send(Errors.serverError);
                                } else {
                                    response.status(200).send({
                                        status: true,
                                        message: 'Verification email sent successfully'
                                    });
                                }
                            });
                        } else {
                            response.status(500).send(Errors.serverError);
                        }
                    });
                }
            });


    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/send-password-reset-email', async (request, response) => {

    let username = request.body.username;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.Char(7), username)
            .query('SELECT recoveryEmail, firstName, lastName FROM Users WHERE username = @username', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.recordset[0]) {
                        const user = result.recordset[0];
                        user.token = jwt.sign({
                            username: username,
                            email: result.recordset[0].recoveryEmail,
                            timeSent: Date.now()
                        }, 'password_reset');
                        user.username = username;
                        emailVerification.sendPasswordResetEmail(user, async status => {
                            if (status) {
                                await addVerificationRequest(username, result.recordset[0].recoveryEmail, user.token, (error, result) => {
                                    if (error) {
                                        response.status(500).send(Errors.serverError);
                                    } else {
                                        response.status(200).send({
                                            status: true,
                                            message: 'Verification email sent successfully'
                                        });
                                    }
                                });
                            } else {
                                response.status(500).send({
                                    status: false,
                                    message: 'Could not send the password reset email'
                                });
                            }

                        });
                    } else {
                        response.status(404).send({
                            status: false,
                            message: 'Username you entered is not found..!'
                        });
                    }
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/reset-password', async (request, response) => {

    const data = request.body;

    if (validatePassword(data.password)) {
        if (data.hasOwnProperty('token') && data.token) {
            const payload = jwt.verify(data.token, 'password_reset');
            if (!payload) {
                response.status(false).send(Errors.unauthorizedRequest);
            } else {
                try {
                    const pool = await poolPromise;
                    await pool.request()
                        .input('username', sql.Char(7), payload.username)
                        .input('email', sql.VarChar(50), payload.email)
                        .input('token', sql.VarChar(300), data.token)
                        .execute('checkVerificationRequest', (error, result) => {
                            if (error) {
                                response.status(500).send(Errors.serverError);
                            } else {
                                if (result.returnValue === 0) {
                                    if (Date.now() - payload.timeSent > 300000) {
                                        response.status(401).send({
                                            status: false,
                                            message: 'This password change request request has timed out..!'
                                        })
                                    } else {
                                        hashPassword(data.password, async (error, hash) => {
                                            if (error) {
                                                response.status(500).send(Errors.serverError);
                                            } else {
                                                await pool.request()
                                                    .input('username', sql.Char(7), payload.username)
                                                    .input('password', sql.VarChar(300), hash)
                                                    .execute('changePassword', (error, result) => {
                                                        if (error) {
                                                            response.status(500).send(Errors.serverError);
                                                        } else {
                                                            if (result.returnValue === -1) {
                                                                response.status(401).send(Errors.unauthorizedRequest);
                                                            } else {
                                                                response.status(200).send({
                                                                    status: true,
                                                                    message: 'Password changed successfully'
                                                                });
                                                            }
                                                        }
                                                    });
                                            }
                                        });

                                    }
                                } else {
                                    response.status(401).send(Errors.unauthorizedRequest);
                                }
                            }
                        });
                } catch (error) {
                    response.status(500).send(Errors.serverError);
                }
            }
        } else {
            response.status(401).send(Errors.unauthorizedRequest);
        }
    } else {
        response.status(400).send({
            status: false,
            message: 'Invalid password format'
        });
    }

});

router.post('/change-password-verification', verifyToken, async (request, response) => {
    const data = request.body;
    if (data.token) {
        const payload = jwt.verify(data.token, 'verify_email');
        if (validatePassword(data.password)) {
            try {
                const pool = await poolPromise;
                await pool.request()
                    .input('username', sql.Char(7), payload.username)
                    .input('email', sql.VarChar(50), payload.email)
                    .input('token', sql.VarChar(300), data.token)
                    .execute('checkVerificationRequest', (error, result) => {
                        if (error) {
                            response.status(500).send(Errors.serverError);
                        } else {
                            if (result.returnValue === 0) {

                                if (payload.hasOwnProperty('username') && payload.hasOwnProperty('timeSent') && payload.username === request.username) {
                                    if (Date.now() - payload.timeSent > 300000) {
                                        response.status(401).send({
                                            status: false,
                                            message: 'This email verification request has timed out'
                                        });
                                    } else {
                                        hashPassword(data.password, async (error, hash) => {
                                            if (error) {
                                                response.status(500).send(Errors.serverError);
                                            } else {
                                                try {
                                                    const pool = await poolPromise;
                                                    await pool.request()
                                                        .input('username', sql.Char(7), payload.username)
                                                        .input('password', sql.VarChar(300), hash)
                                                        .input('recoveryEmail', sql.VarChar(50), payload.email)
                                                        .query('UPDATE Users SET password = @password, verified = 1, recoveryEmail = @recoveryEmail WHERE username = @username', (error, result) => {
                                                            if (error) {
                                                                response.status(500).send(Errors.serverError);
                                                            } else {
                                                                if (result.returnValue === -1) {
                                                                    response.status(401).send(Errors.unauthorizedRequest);
                                                                } else {
                                                                    response.status(200).send({
                                                                        status: true,
                                                                        message: 'Password changed successfully'
                                                                    });
                                                                }
                                                            }
                                                        });
                                                } catch (error) {
                                                    response.status(500).send(Errors.serverError);
                                                }
                                            }
                                        });

                                    }
                                } else {
                                    response.status(200).send(Errors.unauthorizedRequest);
                                }

                            } else {
                                response.status(401).send(Errors.unauthorizedRequest);
                            }
                        }
                    });
            } catch (error) {
                response.status(500).send(Errors.serverError);
            }
        } else {
            response.send(400).send({
                status: false,
                message: 'Invalid password format'
            });
        }
    } else {
        response.status(401).send(Errors.unauthorizedRequest);
    }
});

router.post('/change-password', verifyToken, async (request, response) => {

    const data = request.body;

    if (data.hasOwnProperty('currentPassword') && data.hasOwnProperty('newPassword') && data.hasOwnProperty('confirmPassword')) {
        if (validatePassword(data.newPassword)) {
            if (data.newPassword === data.confirmPassword) {
                try {
                    const pool = await poolPromise;
                    pool.request()
                        .input('username', sql.Char(7), request.username)
                        .execute('checkUserCredentials', (error, result) => {
                            if (error) {
                                response.status(200).send(Errors.serverError);
                            } else {
                                comparePassword(data.currentPassword, result.recordset[0].password, (error, valid) => {
                                    if (error) {
                                        response.status(500).send(Errors.serverError);
                                    } else {
                                        if (valid) {
                                            if (data.currentPassword !== data.newPassword) {
                                                hashPassword(data.newPassword, (error, hash) => {
                                                    if (error) {
                                                        response.status(500).send(Errors.serverError);
                                                    } else {
                                                        pool.request()
                                                            .input('password', sql.VarChar(300), hash)
                                                            .input('username', sql.Char(7), request.username)
                                                            .execute('changePassword', (error, result) => {
                                                                if (error) {
                                                                    response.status(500).send(error);
                                                                } else {
                                                                    response.status(200).send({
                                                                        status: true,
                                                                        message: 'password changed successfully'
                                                                    });
                                                                }
                                                            });
                                                    }
                                                });
                                            } else {
                                                response.status(400).send({
                                                    status: false,
                                                    message: 'New password cannot be the old password.'
                                                });
                                            }
                                        } else {
                                            response.status(401).send({
                                                status: false,
                                                message: 'Your current password is incorrect'
                                            });
                                        }
                                    }
                                });
                            }
                        });
                } catch (error) {
                    response.status(500).send(Errors.serverError);
                }
            } else {
                response.status(400).send({
                    status: false,
                    message: 'Passwords do not match'
                });
            }
        } else {
            response.status(400).send({
                status: false,
                message: 'Invalid password format'
            });
        }

    } else {
        response.status(400).send({
            status: false,
            message: 'Malformed request body'
        });
    }

});

router.post('/verify-recovery-email', verifyToken, async (request, response) => {

    const token = request.body.token;
    if (token) {
        const payload = jwt.verify(token, 'verify_email');
        if (payload.hasOwnProperty('username') && payload.hasOwnProperty('timeSent') && payload.username === request.username) {
            if (Date.now() - payload.timeSent > 300000) {
                response.status(401).send({
                    status: false,
                    message: 'This email verification request has timed out'
                });
            } else {
                try {
                    const pool = await poolPromise;
                    await pool.request()
                        .input('username', sql.Char(7), payload.username)
                        .input('email', sql.VarChar(50), payload.email)
                        .query('UPDATE Users SET recoveryEmail = @email, verified = 1 WHERE username = @username', (error, result) => {
                            if (error) {
                                response.status(500).send(Errors.serverError);
                            } else {
                                if (result.returnValue === -1) {
                                    response.status(401).send(Errors.unauthorizedRequest);
                                } else {
                                    response.status(200).send({
                                        status: true,
                                        message: 'Password changed successfully'
                                    });
                                }
                            }
                        });
                } catch (error) {
                    response.status(500).send(Errors.serverError);
                }
            }
        } else {
            response.status(200).send(Errors.unauthorizedRequest);
        }
    } else {
        response.status(401).send(Errors.unauthorizedRequest);
    }

});

module.exports = router;


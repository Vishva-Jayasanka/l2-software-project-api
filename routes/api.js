const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ObjectID = require('mongodb').ObjectID;
const sql = require('mssql');
const fs = require('fs');

const User = require('../models/user');
const Module = require('../models/module');
const LectureHour = require('../models/lecture-hour');
const verifyToken = require('../modules/user-verification').VerifyToken;

const Errors = require('../errors/errors');
const emailVerification = require('../modules/email-verification');
const {poolPromise} = require('../modules/sql-connection');

router.post('/send-password-reset-email', async (request, response) => {

    let username = request.body.username;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.Char(7), username)
            .query('SELECT email, firstName, lastName FROM Users WHERE username = @username', (error, result) => {
                if (error) {
                    console.error(error);
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.recordset[0]) {
                        const user = result.recordset[0];
                        user.token = jwt.sign({
                            username: username,
                            timeSent: Date.now()
                        }, 'password_reset');
                        emailVerification.sendPasswordResetEmail(user, status => {
                            if (status) {
                                response.status(200).send({
                                    status: true,
                                    message: 'Password reset mail sent.'
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
        console.log(error);
        response.status(500).send(Errors.serverError);
    }

});

router.post('/reset-password', async (request, response) => {

    const data = request.body;

    if (data.hasOwnProperty('token') && data.token) {
        const payload = jwt.verify(data.token, 'password_reset');
        if (!payload) {
            response.status(false).send(Errors.unauthorizedRequest);
        } else {
            if (Date.now() - payload.timeSent > 300000) {
                response.status(401).send({
                    status: false,
                    message: 'This password change request request has timed out..!'
                })
            } else {
                const pool = await poolPromise;
                await pool.request()
                    .input('username', sql.Char(7), payload.username)
                    .input('password', sql.VarChar(50), data.password)
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
        }
    } else {
        response.status(401).send(Errors.unauthorizedRequest);
    }

});

router.post('/change-password', verifyToken, async (request, response) => {
    const data = request.body;
    if (data.token) {
        const payload = jwt.verify(data.token, 'verify_email');
        if (payload.hasOwnProperty('username') && payload.hasOwnProperty('timeSent') && payload.username === request.username) {
            if (Date.now() - payload.timeSent > 300000) {
                console.log('a');
                response.status(401).send({
                    status: false,
                    message: 'This email verification request has timed out'
                });
            } else {
                try {
                    const pool = await poolPromise;
                    await pool.request()
                        .input('username', sql.Char(7), payload.username)
                        .input('password', sql.VarChar(50), data.password)
                        .query('UPDATE Users SET password = @password, verified = 1 WHERE username = @username', (error, result) => {
                            if (error) {
                                response.status(500).send(Errors.serverError);
                            } else {
                                if (result.returnValue === -1) {
                                    console.log('a');
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

router.post('/login', async (request, response) => {
    let userData = request.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.Char(7), userData.username)
            .input('password', sql.VarChar(20), userData.password)
            .execute('checkUserCredentials', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 1) {
                        let user = result.recordset[0];
                        user.token = jwt.sign({subject: user.username, role: user.roleName}, 'secret_key');
                        response.status(200).send(user);
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

    if (email) {

        try {
            const pool = await poolPromise;
            await pool.request()
                .input('username', sql.Char(7), request.username)
                .input('email', sql.VarChar(50), email)
                .query(
                    'UPDATE Users SET email = @email WHERE username = @username; ' +
                    'SELECT username, firstName, lastName FROM Users WHERE username = @username',
                    (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        const user = result.recordset[0];
                        user.token = jwt.sign({
                            username: user.username,
                            email: email,
                            timeSent: Date.now()
                        }, 'verify_email');
                        user.email = email;

                        emailVerification.sendVerificationEmail(user, (status) => {
                            if (status) {
                                response.status(200).send({
                                    status: true,
                                    message: 'Verification email sent'
                                })
                            } else {
                                response.status(500).send(Errors.serverError);
                            }
                        });
                    }
                });
        } catch (error) {
            response.status(500).send(Errors.serverError);
        }
    }

});

router.post('/get-modules', verifyToken, async (request, response) => {
    const username = request.username;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.Char(7), username)
            .input('role', sql.Int, request.role)
            .execute('getModules', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        modules: result.recordsets[0],
                        teachers: result.recordsets[1],
                        lectureHours: result.recordsets[2],
                        course: (request.role === 3) ? result.recordsets[3][0].courseName : ''
                    });

                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/get-attendance', verifyToken, async (request, response) => {

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('studentID', sql.Char(7), request.username)
            .execute('getAttendance', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        attendance: result.recordset
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-detailed-attendance', verifyToken, async (request, response) => {
    const info = request.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('studentID', sql.Char(7), request.username)
            .input('moduleCode', sql.Char(6), info.moduleCode)
            .input('type', sql.VarChar(15), info.type)
            .input('batch', sql.Int, info.batch)
            .execute('getDetailedAttendance', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send(result.recordset);
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/check-student-id', verifyToken, async (request, response) => {

    const studentID = request.body.studentID;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('checkStudentID', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 0) {
                        response.status(200).send({
                            status: true,
                            name: result.recordset[0].name,
                            course: result.recordset[0].course,
                            academicYear: result.recordset[0].academicYear,
                            studentID: result.recordset[0].studentID
                        });
                    } else {
                        response.status(200).send({
                            status: false,
                            message: 'Student ID not found'
                        });
                    }
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});


router.post('/get-lecture-hours', verifyToken, function (request, response) {
    LectureHour.find({}, {_id: 0, completedLectures: 0, __v: 0}, (error, lectureHours) => {
        if (error) {
            response.status(500).send(Errors.serverError);
        } else {
            Module.find({}, {_id: 0, teachers: 0, credits: 0, description: 0, __v: 0}, (error, modules) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        modules: modules,
                        lectureHours: lectureHours
                    })
                }
            });
        }
    });
});

router.post('/get-results', verifyToken, async (request, response) => {
    const studentID = request.username;

    try {
        const pool = await poolPromise;
        pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('getResults', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        results: result.recordset
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/upload-profile-picture', verifyToken, async (request, response) => {

    const image = request.body.profilePicture;

    try {
        if (!image) {
            response.status(401).send({
                status: false,
                message: 'Image not found'
            });
        } else {
            const path = './profile-pictures/' + request.username + '.png';
            const base64Data = image.replace(/^data:([A-Za-z-+/]+);base64,/, '');
            fs.writeFileSync(path, base64Data, {encoding: 'base64'});
            response.send({
                status: true,
                message: 'profile picture updated successfully'
            });
        }
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-profile-picture', verifyToken, async (request, response) => {

    try {
        const image = fs.readFileSync('./profile-pictures/' + request.username + '.png', {encoding: 'base64'});
        response.status(200).send({
            status: true,
            profilePicture: image
        });
    } catch (error) {
        if (error.errno === -4058) {
            const image = fs.readFileSync('./profile-pictures/default.png', {encoding: 'base64'});
            response.status(200).send({
                status: true,
                profilePicture: image
            });
        } else {
            response.status(500).send(Errors.serverError);
        }
    }

});

router.post('/get-timetable', verifyToken, async (request, response) => {

    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.Char(7), request.username)
            .input('role', sql.Int, request.role)
            .execute('getTimetables', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        times: result.recordset
                    });
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-user-details', verifyToken, async (request, response) => {

    const username = request.username;

    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.Char(7), username)
            .execute('getUserDetails', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        details: result.recordsets
                    });
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-notifications', verifyToken, async (request, response) => {
    const username = request.username;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.Char(7), username)
            .execute('getNotifications', (error, result) => {
                if (error || result.returnValue === -1) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        notifications: result.recordset
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-student-payment-details', verifyToken, async (request, response) => {
    console.log('request.body.studentID;=', request.body.studentID);
    const studentID = request.body.studentID;;

    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('getStudentPayments', (error, result) => {
                if (error || result.returnValue === -1) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        results: result.recordsets,
                    });
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/update-notification-status', verifyToken, async (request, response) => {
    const received = request.body.received;
    const receiverID = request.username;
    try {
        const notifications = new sql.Table('NOTIFICATIONS')
        notifications.columns.add('notificationID', sql.Int)
        for (let notificationID of received) {
            notifications.rows.add(notificationID)
        }
        const pool = await poolPromise;
        await pool.request()
            .input('receiverID', sql.Char(7), receiverID)
            .input('notifications', notifications)
            .execute('updateNotificationStatus', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        message: 'Notification status updated successfully'
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

module.exports = router;

const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;
const sql = require('mssql');
const fs = require('fs');

const User = require('../models/user');
const Module = require('../models/module');
const LectureHour = require('../models/lecture-hour');
const Result = require('../models/result');
const Attendance = require('../models/attendance');
const verifyToken = require('../modules/user-verification').VerifyToken;

const Errors = require('../errors/errors');
const emailVerification = require('../modules/email-verification');
const db = 'mongodb://localhost:27017/lmsdb';
const {poolPromise} = require('../modules/sql-connection');

mongoose.connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, error => {
    if (error) {
        console.log('Error: ' + error);
    } else {
        console.log('Successfully connected to the Mongodb Server!');
    }
});


function generateOTP(user, callback) {
    console.log(user.email);
    const OTP = emailVerification.getRandomInt();
    User.update({_id: ObjectID(user._id)}, {
        email: user.email,
        verificationCode: OTP,
        verificationCodeSentTime: new Date()
    }, (error, affected, response) => {
        return callback(!!error, OTP);
    });
    return true;
}

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

                        // Verification not configured in the database------
                        user.verified = true;
                        // -------------------------------------------------

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

router.post('/is-verified', verifyToken, (request, response) => {
    response.status(200).send({
        status: true,
        message: 'Request successful',
        verified: request.user.verified
    })
});

router.post('/verify-email', verifyToken, (request, response) => {
    if (parseInt(request.body.verificationCode) === parseInt(request.user.verificationCode)) {
        if (new Date() - request.user.verificationCodeSentTime < 300000) {
            User.update({_id: ObjectID(request.user._id)}, {
                verified: true
            }, (error, affected, res) => {
                if (!error) {
                    response.status(200).send({
                        status: true,
                        message: 'Email successfully verified'
                    });
                } else {
                    response.status(500).send(Errors.serverError);
                }
            });
        } else {
            response.status(408).send({
                status: false,
                message: 'Verification code has expired'
            })
        }
    } else {
        response.status(403).send({
            status: false,
            message: 'Verification code you entered is invalid'
        })
    }
});

router.post('/send-verification-email', verifyToken, (request, response) => {
    generateOTP(request.user, (status, OTP) => {
        request.user.email = request.body.email;
        request.user.verificationCode = OTP;
        if (!status) {
            emailVerification.sendVerificationEmail(request.user, status => {
                if (status) {
                    response.status(200).send({
                        status: true,
                        message: 'Verification email sent successfully'
                    });
                } else {
                    response.status(500).send(Errors.serverError)
                }
            })
        } else {
            response.status(500).send(Errors.serverError)
        }
    })
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
                    console.log(error);
                    response.status(500).send(Errors.serverError);
                } else {
                    console.log(result.recordsets);
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
        console.error(error);
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
        const result = pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('getResults', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        results: result.recordsets[1],
                        modules: result.recordsets[0]
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

    const studentID = request.username;

    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('getTimetable', (error, result) => {
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

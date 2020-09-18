const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;
const mongoClient = require('mongodb').MongoClient;
const sql = require('mssql');

const User = require('../models/user');
const Module = require('../models/module');
const LectureHour = require('../models/lecture-hour');
const Result = require('../models/result');
const Attendance = require('../models/attendance');
const verifyToken = require('../modules/user-verification').VerifyToken;

const Errors = require('../errors/errors');
const emailVerification = require('../modules/email-verification');
const db = 'mongodb://localhost:27017/lmsdb';

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

const config = {
    server: 'LAPTOP-T4KK4VD3',
    instance: 'MSSQLSERVER',
    user: 'jayasanka',
    password: '123456',
    database: 'tutorial_01',
    options: {
        encrypt: false,
    }
}

sql.connect(config, error => {
    if (error) {
        console.log('Error:' + error);
    } else {
        console.log('Successfully connected to the MS SQL Server!');
        const req = new sql.Request();
        req.query('SELECT * FROM client WHERE clientNo=\'C002\'', (error, data) => {
            if (error) {
                console.log('Error: ' + error);
            } else {
                console.log(data.recordset);
            }
        });
    }
});

function generateOTP(user, callback) {
    console.log(user.email)
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

router.post('/login', (request, response) => {
    let userData = request.body;
    User.findOne({username: userData.username}, (error, user) => {
        if (error) {
            response.status(500).send({
                status: false,
                message: 'Internal server error!'
            });
        } else {
            if (!user) {
                response.status(401).send({
                    status: false,
                    message: 'Username or password is incorrect!'
                });
            } else {
                if (user.password !== userData.password) {
                    response.status(401).send({
                        status: false,
                        message: 'Username or password is incorrect!'
                    });
                } else {
                    const token = jwt.sign({subject: user._id}, 'secret_key');
                    response.status(200).send({
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        role: user.role,
                        verified: user.verified,
                        currentRegistration: user.currentRegistration.semester,
                        token: token
                    });
                }
            }
        }
    })
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

router.post('/check-username', (request, response) => {
    User.findOne({username: request.body.username}, (error, user) => {
        if (error) {
            response.status(500).send(Errors.unauthorizedRequest);
        } else {
            if (!user) {
                response.status(401).send({
                    status: false,
                    message: 'User not found'
                })
            } else {
                response.status(200).send({
                    status: true,
                    message: 'User found'
                })
            }
        }
    });
});

router.post('/get-modules', verifyToken, (request, response) => {
    const user = request.user;
    const registeredModules = user.registeredModules.map(module => ObjectID(module.moduleCode));
    Module.aggregate([
        {$match: {_id: {$in: registeredModules}}},
        {$lookup: {from: 'user', localField: 'teachers', foreignField: 'username', as: 'teachers'}},
        {$lookup: {from: 'lectureHour', localField: 'lectureHours', foreignField: '_id', as: 'lectureHours'}},
        {
            $project: {
                _id: 1,
                moduleCode: 1,
                moduleName: 1,
                teachers: {username: 1, firstName: 1, lastName: 1},
                lectureHours: 1,
                credits: 1,
                level: 1,
                semester: 1,
                description: 1,
            }
        },
        {$project: {lectureHours: {__v: 0}, results: {_id: 0}}}
    ], (error, modules) => {
        if (error) {
            console.log(error);
            response.status(500).send(Errors.serverError);
        } else {
            Result.find({studentID: user.username}, (error, results) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        currentModules: user.currentRegistration.modules,
                        modules: modules,
                        results: results
                    });
                }
            });
        }
    });
});

router.post('/get-attendance', verifyToken, (request, response) => {
    const user = request.user;
    Attendance.find({studentID: user.username}, {_id: 0}, (error, attendance) => {
        if (error) {
            response.status(500).send(Errors.serverError);
        } else {
            LectureHour.find({moduleCode: {$in: user.registeredModules}}, {
                _id: 0,
                moduleCode: 1,
                type: 1,
                completedLectures: 1
            }, (error, modules) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    Module.find({}, {
                        _id: 0,
                        moduleCode: 1,
                        moduleName: 1,
                        level: 1,
                        semester: 1
                    }, (error, moduleNames) => {
                        if (error) {
                            response.status(500).send(Errors.serverError);
                        } else {
                            response.status(200).send({
                                status: true,
                                currentRegistrations: user.currentRegistration.modules,
                                registeredModules: user.registeredModules,
                                moduleNames: moduleNames,
                                completedLectures: modules,
                                attendance: attendance
                            });
                        }
                    });
                }
            });
        }
    });
});

router.post('/get-lecture-hours', verifyToken, function (request, response) {
    LectureHour.find({}, {_id: 0, completedLectures: 0, __v: 0}, (error, lectureHours) => {
        if (error) {
            response.status(500).send(Errors.serverError);
            console.log('a');
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

module.exports = router;

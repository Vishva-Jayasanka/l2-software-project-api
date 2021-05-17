const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const fs = require('fs');
const glob = require("glob");

const Errors = require('../errors/errors');
const emailVerification = require('../modules/email-verification');
const verifyToken = require('../modules/user-verification').VerifyToken;

const {calculateGPA} = require("../modules/caculate-gpa");
const {poolPromise} = require('../modules/sql-connection');


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
                    const moduleCodes = new Set();
                    for (const examResult of result.recordset) {
                        moduleCodes.add(examResult.moduleCode);
                    }

                    const examResults = [];
                    for (const moduleCode of moduleCodes) {
                        const temp = result.recordset.filter(obj => obj.moduleCode === moduleCode);
                        if (temp.length > 1) {
                            temp.sort((a, b) => a.academicYear < b.academicYear ? 1 : -1);
                            for (let i = 0; i < temp.length - 1; i++) {
                                if (temp[i].mark > 54) {
                                    temp[i].grade = 'C'
                                }
                            }
                        }
                        for (let obj of temp) {
                            delete obj.mark;
                            examResults.push(obj);
                        }
                    }

                    response.status(200).send({
                        status: true,
                        results: examResults
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
        const image = fs.readFileSync(`./profile-pictures/${request.username}.png`, {encoding: 'base64'});
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

router.get('/get-timetable/:username/:role', async (request, response) => {

    try {

        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.Char(7), request.params.username)
            .input('role', sql.Int, request.params.role)
            .execute('getTimetables', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    const data = result.recordset.map(session => {
                        return {
                            Id: session.lectureHourID,
                            Subject: session.moduleCode + ' ' + session.moduleName,
                            StartTime: new Date(session.startingTime),
                            EndTime: new Date(session.endingTime),
                            Description: session.type,
                            LectureHall: session.lectureHall,
                            day: session.day,
                            IsAllDay: false
                        };
                    });
                    response.status(200).send(data);
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-user-details', verifyToken, async (request, response) => {

    const username = request.username;

    let gpa;
    await calculateGPA(username, value => gpa = value);

    try {

        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.Char(7), username)
            .input('roleID', sql.Int, request.role)
            .execute('getUserDetails', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    const res = {
                        status: true,
                        details: result.recordsets[0][0],
                        educationQualifications: result.recordsets[1]
                    }
                    res.details.currentGPA = gpa;
                    response.status(200).send(res);
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

                    const notifications = result.recordsets[0];
                    const recipients = result.recordsets[1];

                    for (let notification of notifications) {
                        notification.recipients = recipients.filter(recipient => recipient.notificationID === notification.notificationID && recipient.recipientID !== notification.sentBy).map(recip => recip.recipientID);
                        delete notification.sentBy;
                    }

                    response.status(200).send({
                        status: true,
                        notifications
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

router.post('/get-requests', verifyToken, async (request, response) => {

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('studentID', sql.Char(7), request.username)
            .execute('getRequests', (error, result) => {
                if (error) {
                    response.status(200).send(Errors.serverError);
                } else {
                    const requests = result.recordsets[0];
                    for (const request of requests) {
                        request.requestTypes = result.recordsets[1].filter(req => req.requestID === request.requestID);
                        request.reasons = result.recordsets[2].filter(reason => reason.requestID === request.requestID);
                        request.reviewedBy = result.recordsets[3].filter(step => step.requestID === request.requestID);
                    }
                    response.status(200).send({
                        status: true,
                        message: 'Request received successfully',
                        requests
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/delete-requests', verifyToken, async (request, response) => {

    const requestIDs = request.body.requestIDs;
    if (Array.isArray(requestIDs) && requestIDs.length > 0) {

        try {

            const requests = new sql.Table('REQUEST_ID');
            requests.columns.add('requestID', sql.Int);

            for (let requestID of requestIDs) {
                if (!isNaN(requestID)) {
                    requests.rows.add(requestID);
                } else {
                    response.status(400).send({
                        status: false,
                        message: 'Malformed request data'
                    });
                    return;
                }
            }

            const pool = await poolPromise;
            await pool.request()
                .input('username', sql.Char(7), request.username)
                .input('role', sql.Int, request.role)
                .input('requestIDs', requests)
                .execute('deleteRequests', (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        if (result.returnValue !== 0) {
                            response.status(401).send(Errors.unauthorizedRequest);
                        } else {
                            for (const requestID of requestIDs) {
                                glob('./request-documents/*-' + requestID + '-*.png', {}, (error, files) => {
                                    if (files.length > 0) {
                                        for (let filename of files) {
                                            fs.unlinkSync(filename);
                                        }
                                    }
                                });
                            }
                            response.status(200).send({
                                status: true,
                                message: 'Requests deleted successfully'
                            });
                        }
                    }
                });

        } catch (error) {
            response.status(500).send(Errors.serverError);
        }

    } else {
        response.status(400).send({
            status: false,
            message: 'Malformed request data'
        });
    }

});

router.post('/get-request-details', verifyToken, async (request, response) => {
    const requestID = request.body.requestID;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('requestID', sql.Int, requestID)
            .input('username', sql.Char(7), request.username)
            .input('role', sql.Int, request.role)
            .execute('getRequestDetails', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        request: result.recordsets[0],
                        reviewedBy: result.recordsets[1],
                        reasons: result.recordsets[2],
                        reviewers: result.recordsets[3],
                        requestsMade: result.recordsets[4]
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-academic-calenders', verifyToken, async (request, response) => {

    try {
        const pool = await poolPromise;
        pool.request()
            .execute('getAcademicCalenders', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    const academicYears = result.recordsets[0];
                    const academicYearTasks = result.recordsets[1];
                    const academicCalenders = [];
                    for (let academicYear of academicYears) {
                        academicCalenders.push({
                            year: academicYear.academicYear,
                            data: academicYearTasks.filter(obj => obj.AcademicYear === academicYear.academicYear)
                        });
                    }
                    response.status(200).send({
                        status: true,
                        message: 'Request status updated successfully',
                        academicCalenders: academicCalenders
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/update-user-data', verifyToken, async (request, response) => {


    const data = request.body;
    let query;

    if (data.hasOwnProperty('email')) {
        query = `UPDATE Users SET email = '${data.email}' WHERE username = '${request.username}'`
    } else {
        if (request.role === 1) {
            if (data.hasOwnProperty('phone')) {
                query = `UPDATE Admin SET mobile = '${data.phone}' WHERE adminID = '${request.username}'`
            }
        } else if (request.role === 2) {
            if (data.hasOwnProperty('phone')) {
                query = `UPDATE Teacher SET mobile = '${data.phone}' WHERE teacherID = '${request.username}'`
            }
        } else if (request.role === 3) {
            if (data.hasOwnProperty('phone')) {
                query = `UPDATE Student SET mobile = '${data.phone}' WHERE studentID = '${request.username}'`
            } else if (data.hasOwnProperty('address')) {
                query = `UPDATE Student SET address = '${data.address}' WHERE studentID = '${request.username}'`
            }
        }
    }

    if (query) {
        try {

            const pool = await poolPromise;
            await pool.request()
                .query(query, (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        response.status(200).send({
                            status: true,
                            message: 'Email updated successfully'
                        });
                    }
                });

        } catch (error) {
            response.status(500).send(Errors.serverError);
        }
    } else {
        response.status(400).send({
            status: false,
            message: 'Malformed request'
        })
    }

});

router.post('/get-academic-years', verifyToken, async (request, response) => {

    try {
        const pool = await poolPromise;
        await pool.request()
            .query('SELECT * FROM AcademicCalender', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    const academicYears = result.recordset.map(obj => obj.academicYear);
                    response.status(200).send({
                        status: true,
                        academicYears: academicYears
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-request-types', verifyToken, async (request, response) => {

    try {
        const pool = await poolPromise;
        await pool.request()
            .query('SELECT * FROM RequestType', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        requestTypes: result.recordset
                    });
                }
            })
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

/**
 * Uploads a request details to the server
 * @request {
 *      studentID: string,
 *      submissionDate: Date,
 *      request: number[],
 *      reasons: string[],
 *      remarks: string,
 *      new: boolean,
 *      documents: string[] (base64 Images)
 * }
 * @response {
 *     requestID: number (Added request ID)
 * }
 */
router.post('/upload-request', verifyToken, async (request, response) => {

    const data = request.body;

    if (data.hasOwnProperty('new')) {
        if ((request.role === 3 && data.studentID === request.username) || request.role === 1) {

            try {

                const reasons = new sql.Table('REASON');
                reasons.columns.add('reason', sql.VarChar(150));

                for (let reason of data.reasons) {
                    reasons.rows.add(reason);
                }

                const requests = new sql.Table('REQUEST_TYPE');
                requests.columns.add('requestTypeID', sql.Int);

                for (let requestType of data.request) {
                    requests.rows.add(requestType);
                }

                const pool = await poolPromise;
                await pool.request()
                    .input('new', sql.Bit, data.new)
                    .input('requestID', sql.Int, parseInt(data.requestID, 10))
                    .input('role', sql.Int, request.role)
                    .input('studentID', sql.Char(7), data.studentID)
                    .input('date', sql.Date, data.submissionDate)
                    .input('remarks', sql.VarChar(500), data.remarks)
                    .input('requests', requests)
                    .input('reasons', reasons)
                    .execute('addRequest', (error, result) => {
                        if (error) {
                            response.status(500).send(Errors.serverError);
                        } else {
                            if (result.returnValue === -1) {
                                response.status(401).send(Errors.unauthorizedRequest);
                            } else {
                                glob('./request-documents/*-' + data.requestID + '-*.png', {}, (error, files) => {
                                    if (files.length > 0) {
                                        for (let filename of files) {
                                            fs.unlinkSync(filename);
                                        }
                                    }
                                });
                                data.documents.forEach((image, index) => {
                                    const path = './request-documents/' + data.studentID + '-' + result.returnValue + '-' + index + '.png'
                                    const base64Data = image.replace(/^data:([A-Za-z-+/]+);base64,/, '');
                                    fs.writeFileSync(path, base64Data, {encoding: 'base64'});
                                });
                                response.status(200).send({
                                    status: true,
                                    message: 'Request saves successfully',
                                    requestID: result.returnValue
                                });
                            }
                        }
                    });
            } catch (error) {
                response.status(500).send(Errors.serverError);
            }

        } else {
            response.status(401).send(Errors.unauthorizedRequest);
        }
    } else {
        response.status(400).send({
            status: false,
            message: 'Malformed request data'
        });
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
                            academicYear: result.recordset[0].academicYear
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

router.post('/get-payment-details', verifyToken, async (request, response) => {

    const slipNo = request.body.slipNo;

    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('slipNo', sql.Int, slipNo)
            .execute('viewPaymentDetails', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        results: result.recordsets
                    });
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-payment-details-payment-id', verifyToken, async (request, response) => {

    const paymentID = request.body.paymentID;

    try {

        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.Char(7), request.username)
            .input('role', sql.Int, request.role)
            .input('paymentID', sql.Int, paymentID)
            .execute('getPaymentDetails', (error, result) => {

                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 0) {
                        response.status(200).send({
                            status: true,
                            payment: result.recordset[0]
                        });
                    } else {
                        response.status(200).send({
                            status: false,
                            message: 'No payment information found'
                        });
                    }
                }

            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-payment-slip', verifyToken, async (request, response) => {

    const data = request.body;
    console.log(data);

    if (request.role === 3) {
        if (!data.studentID || !data.paymentID || request.username !== data.studentID) {
            return response.status(401).send(Errors.serverError);
        }
    }

    let slip;
    try {
        slip = fs.readFileSync('./payment-slips/' + data.studentID + '-' + data.paymentID + '.png', {encoding: 'base64'});
    } catch (Ignore) { }
    if (slip) {
        response.status(200).send({
            status: true,
            paymentSlip: slip
        });
    } else {
        response.status(200).send({
            status: false,
            message: 'Sip not found'
        })
    }


});

router.post('/get-payments', verifyToken, async (request, response) => {

    if (request.role === 3) {
        try {

            const pool = await poolPromise;
            pool.request()
                .input('studentID', sql.Char(7), request.username)
                .query('SELECT * FROM imsdb.dbo.Payment WHERE studentID = @studentID', (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        response.status(200).send({
                            status: true,
                            payments: result.recordset
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


module.exports = router;

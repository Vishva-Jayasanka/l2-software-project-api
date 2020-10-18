const express = require('express');
const router = express.Router();
const sql = require('mssql');

const Errors = require('../errors/errors');
const verifyToken = require('../modules/user-verification').VerifyToken;
const {poolPromise} = require('../modules/sql-connection');

function verifyAdmin(request, response, next) {
    if (request.role === 'admin') {
        next();
    } else {
        return response.status(401).send(Errors.unauthorizedRequest);
    }
}

router.post('/check-module', verifyToken, verifyAdmin, async (request, response) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('moduleCode', sql.Char(6), request.body.moduleCode)
            .execute('checkModule', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 1) {
                        response.status(200).send({
                            status: true,
                            message: 'Module does not exist..!'
                        });
                    } else {
                        response.status(200).send({
                            status: false,
                            message: 'Module Exists..!'
                        })
                    }
                }
            })
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/get-teachers', verifyToken, verifyAdmin, async (request, response) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT username, firstName, lastName FROM Users WHERE role=1', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        teachers: result.recordset
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/add-edit-module', verifyToken, verifyAdmin, async (request, response) => {

    const info = request.body.moduleDetails;

    const lectureHours = new sql.Table('LECTURE_HOUR');
    lectureHours.columns.add('lectureHourID', sql.Int);
    lectureHours.columns.add('type', sql.VarChar(15));
    lectureHours.columns.add('day', sql.Int);
    lectureHours.columns.add('lectureHall', sql.VarChar(20))
    lectureHours.columns.add('startingTime', sql.Char(8));
    lectureHours.columns.add('endingTime', sql.Char(8));

    for (let lectureHour of info.newLectureHours) {
        lectureHours.rows.add(0, lectureHour.type, parseInt(lectureHour.day), lectureHour.lectureHall, lectureHour.startingTime, lectureHour.endingTime);
    }
    for (let lectureHour of info.lectureHours) {
        lectureHours.rows.add(lectureHour.lectureHourID, lectureHour.type, parseInt(lectureHour.day), lectureHour.lectureHall, lectureHour.startingTime, lectureHour.endingTime);
    }

    const teachers = new sql.Table('TEACHER');
    teachers.columns.add('username', sql.Char(7))
    for (let teacher of request.body.teachers) {
        teachers.rows.add(teacher.username);
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('adminID', sql.Char(7), request.username)
            .input('moduleCode', sql.Char(6), info.moduleCode)
            .input('moduleName', sql.VarChar(50), info.moduleName)
            .input('description', sql.VarChar(50), info.description)
            .input('credits', sql.Int, info.credits)
            .input('semester', sql.Int, info.semester)
            .input('lectureHours', lectureHours)
            .input('teachers', teachers)
            .execute('addModule', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 0) {
                        response.status(200).send({
                            status: true,
                            message: 'Module saved successfully'
                        });
                    } else {
                        response.status(500).send(Errors.serverError);
                    }
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/delete-module', verifyToken, verifyAdmin, async (request, response) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('moduleCode', sql.Char(6), request.body.moduleCode)
            .execute('deleteModule', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 0) {
                        response.status(200).send({
                            status: true,
                            message: 'Module deleted successfully'
                        });
                    } else {
                        response.status(200).send({
                            status: false,
                            message: 'Could not delete the module'
                        });
                    }
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/get-module-lecture-hours', verifyToken, verifyAdmin, async (request, response) => {

    const moduleCode = request.body.moduleCode;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('moduleCode', sql.Char(6), moduleCode)
            .execute('getLectureHours', (error, result) => {
                if (error) {
                    if (error.number === 8016) {
                        response.status(200).send({
                            status: false,
                            message: 'Invalid moduleCode'
                        })
                    } else {
                        response.status(500).send(Errors.serverError);
                    }
                } else {
                    if (result.recordset.length === 0) {
                        response.status(200).send({
                            status: false,
                            message: 'Module not found'
                        });
                    } else {
                        response.status(200).send({
                            status: true,
                            moduleName: result.recordsets[0][0].moduleName,
                            lectureHours: result.recordsets[1]
                        });
                    }
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/get-sessions', verifyToken, verifyAdmin, async (request, response) => {
    const data = request.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('lectureHourID', sql.Int, data.lectureHourID)
            .input('batch', sql.Int, data.batch)
            .query('SELECT sessionID, dateHeld FROM Session WHERE lectureHourID = @lectureHOurID AND batch = @batch', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        sessions: result.recordset
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/upload-attendance', verifyToken, verifyAdmin, async (request, response) => {
    const data = request.body;

    try {

        const attendance = new sql.Table('SESSION_ATTENDANCE');
        attendance.columns.add('studentID', sql.Char(7));

        for (let record of data.attendance) {
            if (record.status === 0) {
                attendance.rows.add(record.index);
            }
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('lectureHourID', sql.Int, data.lectureHourID)
            .input('batch', sql.Int, data.batch)
            .input('date', sql.Date, data.date)
            .input('time', sql.Char(5), data.time)
            .input('attendance', attendance)
            .execute('addAttendance', (error, result) => {
                if (error) {
                    console.error(error);
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        message: 'Successfully saved'
                    });
                }
            });
    } catch (error) {
        console.error(error);
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-session-attendance', verifyToken, verifyAdmin, async (request, response) => {

    const sessionID = request.body.sessionID;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('sessionID', sql.Int, sessionID)
            .execute('getSessionAttendance', (error, result) => {
                if (error) {
                    response.status(200).send(Errors.serverError);
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

router.post('/save-attendance-changes', verifyToken, verifyAdmin, async (request, response) => {

    const data = request.body;

    try {

        const attendance = new sql.Table('SESSION_ATTENDANCE');
        attendance.columns.add('studentID', sql.Char(7));

        for (let record of data.attendance) {
            if (!record.status) {
                attendance.rows.add(record.studentID);
            }
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('sessionID', sql.Int, data.sessionID)
            .input('attendance', attendance)
            .execute('modifyAttendance', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        message: 'Attendance saved successfully'
                    });
                }
            });
    } catch(error) {
        response.status(500).send(Errors.serverError);
    }
});

module.exports = router;

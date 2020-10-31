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
                            moduleName: result.recordset[0].moduleName,
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
            .input('year', sql.Int, info.batch)
            .input('description', sql.VarChar(50), info.description)
            .input('credits', sql.Int, info.credits)
            .input('semester', sql.Int, info.semester)
            .input('disabled', sql.Bit, info.disabled)
            .input('lectureHours', lectureHours)
            .input('teachers', teachers)
            .execute('addModule', (error, result) => {
                if (error) {
                    console.log(error);
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 0) {
                        response.status(200).send({
                            status: true,
                            message: 'Module saved successfully'
                        });
                    } else {
                        console.log(error);
                        response.status(500).send(Errors.serverError);
                    }
                }
            });
    } catch (error) {
        console.log(error);
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
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        message: 'Successfully saved'
                    });
                }
            });
    } catch (error) {
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
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/get-module-exams', verifyToken, verifyAdmin, async (request, response) => {

    const data = request.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('moduleCode', sql.Char(6), data.moduleCode)
            .input('batch', sql.Int, data.batch)
            .execute('getExams', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        exams: result.recordsets[0],
                        allocationAvailable: 100 - result.recordsets[1][0].totalAllocation
                    });
                }
            });
    } catch (error) {
        response.status(200).send(Errors.serverError);
    }

});

router.post('/upload-results', verifyToken, verifyAdmin, async (request, response) => {

    const data = request.body;

    try {

        const results = new sql.Table('MARKS');
        results.columns.add('studentID', sql.Char(7));
        results.columns.add('mark', sql.Int);

        for (let record of data.results) {
            if (!record.status) {
                results.rows.add(record.index, record.mark);
            }
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('moduleCode', sql.Char(6), data.moduleCode)
            .input('batch', sql.Int, data.batch)
            .input('examID', sql.Int, data.examID)
            .input('type', sql.VarChar(15), data.type)
            .input('dateHeld', sql.Date, data.dateHeld)
            .input('allocation', sql.Int, data.allocation)
            .input('hideMarks', sql.Bit, data.hideMarks)
            .input('results', results)
            .execute('uploadMarks', (error, result) => {
                if (error) {
                    if (error.number === 2627) {
                        response.status(400).send({
                            status: false,
                            message: 'File contains duplicate student id numbers that are already has marks for this exam'
                        });
                    } else if (error.number === 547) {
                        response.status(400).send({
                            status: false,
                            message: 'File contains student id numbers that are not registered in the system'
                        });
                    } else {
                        response.status(500).send(Errors.serverError);
                    }
                } else {
                    if (result.recordset && result.recordset[0].hasOwnProperty('totalAllocation')) {
                        response.status(400).send({
                            status: false,
                            message: `Total allocation exceeds 100. Available allocation is ${Math.abs(result.recordset[0].totalAllocation - 100 - data.allocation)}`,
                        });
                    } else if (result.recordset && result.recordset[0].hasOwnProperty('invalidStudentID')) {
                        response.status(400).send({
                            status: false,
                            message: result.recordset[0].invalidStudentID
                        });
                    } else {
                        response.status(200).send({
                            status: true,
                            message: 'Results successfully uploaded'
                        });
                    }
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-module-results', async (request, response) => {
    const examID = request.body.examID;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('examID', sql.Int, examID)
            .execute('getResultOfExam', (error, result) => {
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
        response.status(200).send(Errors.serverError);
    }

});

router.post('/edit-results', verifyToken, verifyAdmin, async (request, response) => {
    const data = request.body.results;

    try {
        const results = new sql.Table('MARKS');
        results.columns.add('studentID', sql.Char(7));
        results.columns.add('mark', sql.Int);

        for (let record of data.results) {
            results.rows.add(record.studentID, record.mark);
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('examID', sql.Int, data.examID)
            .input('type', sql.VarChar(25), data.type)
            .input('dateHeld', sql.Date, data.dateHeld)
            .input('allocation', sql.Int, data.allocation)
            .input('hideMarks', sql.Bit, data.hideMarks)
            .input('results', results)
            .execute('editResults', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        message: 'Results updated successfully'
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/delete-exam', verifyToken, verifyAdmin, async (request, response) => {
    const examID = request.body.examID;

    try {
        const pool = await poolPromise;
        const result = pool.request()
            .input('examID', sql.Int, examID)
            .execute('deleteExam', (error, result) => {
                if (error) {
                    response.status(200).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        message: 'Exam deleted successfully'
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/register-student', verifyToken, verifyAdmin, async (request, response) => {

    const data = request.body.studentDetails;

    try {

        const year = (new Date().getFullYear()).toString().substring(2, 4);

        const pool = await poolPromise;
        const result0 = await pool.request()
            .query("SELECT MAX(username) AS maxUsername FROM Users WHERE username LIKE '" + year + "%'", (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {

                    const maxUsername = result.recordset[0].maxUsername === null ? (year + '4000A').toString() : result.recordset[0].maxUsername ;
                    const studentID = (parseInt(maxUsername.substring(0, 6)) + 1).toString() + String.fromCharCode(((maxUsername.charCodeAt(6) - 60) % 26) + 65)
                    const name = data.name.nameWithInitials.split(' ');

                    const qualifications = new sql.Table('EDUCATION_QUALIFICATION');
                    qualifications.columns.add('degree', sql.VarChar(50));
                    qualifications.columns.add('institute', sql.VarChar(50));
                    qualifications.columns.add('dateCompleted', sql.Date);
                    qualifications.columns.add('class', sql.VarChar(20))

                    for (let record of data.educationQualifications) {
                        qualifications.rows.add(record.degree, record.institute, record.graduationDate, record.grade);
                    }

                    const result1 = pool.request()
                        .input('studentID', sql.Char(7), studentID)
                        .input('courseID', sql.Int, data.courseName)
                        .input('fullName', sql.VarChar(100), data.name.fullName)
                        .input('nameWithInitials', sql.VarChar(50), data.name.nameWithInitials)
                        .input('firstName', sql.VarChar(20), name[0])
                        .input('lastName', sql.VarChar(20), name[1])
                        .input('address', sql.VarChar(255), data.address.permanentAddress)
                        .input('district', sql.Char(5), data.address.district)
                        .input('province', sql.Char(4), data.address.province)
                        .input('dateOfBirth', sql.Date, data.dateOfBirth)
                        .input('race', sql.VarChar(15), data.race)
                        .input('religion', sql.VarChar(15), data.religion)
                        .input('gender', sql.Char(1), data.gender)
                        .input('nic', sql.VarChar(12), data.nic)
                        .input('email', sql.VarChar(50), data.contactDetails.email)
                        .input('mobile', sql.VarChar(12), data.contactDetails.mobile)
                        .input('home', sql.VarChar(12), data.contactDetails.home)
                        .input('designation', sql.VarChar(50), data.employment.designation)
                        .input('employer', sql.VarChar(50), data.employment.employer)
                        .input('company', sql.VarChar(50), data.employment.company)
                        .input('registrationFees', sql.Money, data.registration.registrationFees)
                        .input('dateOfPayment', sql.Date, data.registration.dateOfPayment)
                        .input('feesPaid', sql.Bit, data.registration.registrationFeesPaid)
                        .input('educationQualifications', qualifications)
                        .execute('registerStudent', (error, result) => {
                            if (error) {
                                response.status(500).send(Errors.serverError);
                            } else {
                                response.status(200).send({
                                    status: true,
                                    message: 'Student registered successfully'
                                });
                            }
                        });
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/check-student-id', verifyToken, verifyAdmin, async (request, response) => {

    const studentID = request.body.studentID;

    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('checkStudentID', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.recordset[0].name) {
                        response.status(200).send({
                            status: true,
                            name: result.recordset[0].name
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

module.exports = router;

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const fs = require('fs');
const glob = require('glob');

const Errors = require('../errors/errors');
const {hashPassword} = require("../modules/validate-password");
const {calculateGPA} = require("../modules/caculate-gpa");
const verifyToken = require('../modules/user-verification').VerifyToken;
const {poolPromise} = require('../modules/sql-connection');

function verifyAdmin(request, response, next) {
    if (request.role === 1) {
        next();
    } else {
        return response.status(401).send(Errors.unauthorizedRequest);
    }
}

function verifyAdminOrTeacher(request, response, next) {
    if (request.role === 1 || request.role === 2) {
        next();
    } else {
        return response.status(401).send(Errors.unauthorizedRequest);
    }
}

router.post('/check-module', verifyToken, verifyAdmin, async (request, response) => {

    let moduleCode = request.body.moduleCode;

    if (moduleCode && /[A-Za-z]{2}[0-9]{4}/.test(moduleCode)) {
        try {
            moduleCode = moduleCode.toUpperCase();
            const pool = await poolPromise;
            await pool.request()
                .input('moduleCode', sql.Char(6), moduleCode)
                .execute('checkModule', (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        if (result.returnValue === 1) {
                            response.status(200).send({
                                status: true,
                                message: 'Module does not exist'
                            });
                        } else {
                            response.status(200).send({
                                status: false,
                                moduleName: result.recordset[0].moduleName,
                                message: 'Module Exists'
                            })
                        }
                    }
                })
        } catch (error) {
            response.status(500).send(Errors.serverError);
        }
    } else {
        response.status(401).send({
            status: false,
            message: 'Invalid module code'
        });
    }
});

router.post('/get-module-details', verifyToken, verifyAdmin, async (request, response) => {
    const moduleCode = request.body.moduleCode;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('moduleCode', sql.Char(6), moduleCode)
            .execute('getModuleDetails', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 0) {
                        response.status(200).send({
                            status: true,
                            moduleDetails: result.recordsets[0][0],
                            teachers: result.recordsets[1],
                            lectureHours: result.recordsets[2]
                        });
                    } else {
                        response.status(401).send({
                            status: false,
                            message: 'Module not found'
                        });
                    }
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-teachers', verifyToken, verifyAdmin, async (request, response) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .query('SELECT username, firstName, lastName FROM Users WHERE role=2', (error, result) => {
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
        lectureHours.rows.add(lectureHour.lectureHourID, lectureHour.type, parseInt(lectureHour.day, 10), lectureHour.lectureHall, lectureHour.startingTime, lectureHour.endingTime);
    }

    const teachers = new sql.Table('TEACHER');
    teachers.columns.add('username', sql.Char(7))
    for (let teacher of request.body.teachers) {
        teachers.rows.add(teacher.username);
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('moduleCode', sql.Char(6), info.moduleCode)
            .input('moduleName', sql.VarChar(50), info.moduleName)
            .input('description', sql.VarChar(50), info.description)
            .input('credits', sql.Real, info.credits)
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

    const moduleCode = request.body.moduleCode;
    if (moduleCode) {
        try {
            const pool = await poolPromise;
            await pool.request()
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
    } else {
        response.status(401).send({
            status: false,
            message: 'Malformed request body'
        });
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
            .query('SELECT sessionID, date FROM Session WHERE lectureHourID = @lectureHOurID AND batch = @batch', (error, result) => {
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
        attendance.columns.add('status', sql.Bit);

        for (let record of data.attendance) {
            attendance.rows.add(record.index, record.status);
        }

        const pool = await poolPromise;
        await pool.request()
            .input('lectureHourID', sql.Int, data.lectureHourID)
            .input('batch', sql.Int, data.batch)
            .input('date', sql.Date, data.date)
            .input('time', sql.Char(5), data.time)
            .input('attendance', attendance)
            .execute('uploadAttendance', (error, result) => {
                if (error) {
                    console.log(error);
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 0) {
                        response.status(200).send({
                            status: true,
                            message: 'Successfully saved'
                        });
                    } else {
                        response.status(401).send({
                            status: false,
                            message: 'Found students who are not registered to this module'
                        });
                    }
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

router.post('/save-attendance-changes', verifyToken, verifyAdmin, async (request, response) => {

    const data = request.body;

    try {

        const attendance = new sql.Table('SESSION_ATTENDANCE');
        attendance.columns.add('studentID', sql.Char(7));
        attendance.columns.add('status', sql.Bit)

        for (let record of data.attendance) {
            attendance.rows.add(record.studentID, record.status);
        }

        const pool = await poolPromise;
        await pool.request()
            .input('sessionID', sql.Int, data.sessionID)
            .input('attendance', attendance)
            .execute('modifyAttendance', (error, result) => {
                if (error) {
                    console.log(error);
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

        const marks = new sql.Table('MARK');
        marks.columns.add('studentID', sql.Char(7));
        marks.columns.add('mark', sql.Int);

        for (let record of data.results) {
            if (!record.status) {
                marks.rows.add(record.index, record.mark);
            }
        }

        const pool = await poolPromise;
        await pool.request()
            .input('moduleCode', sql.Char(6), data.moduleCode)
            .input('date', sql.Date, data.dateHeld)
            .input('academicYear', sql.Int, data.academicYear)
            .input('marks', marks)
            .execute('uploadMarks', (error, result) => {
                if (error) {
                    console.log(error);
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
                    if (result.recordset && result.recordset[0].hasOwnProperty('invalidStudentID')) {
                        response.status(400).send({
                            status: false,
                            message: result.recordset[0].invalidStudentID
                        });
                    } else if (result.recordset && result.recordset[0].hasOwnProperty('duplicateEntry')) {
                        response.status(400).send({
                            status: false,
                            message: result.recordset[0].duplicateEntry
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

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('moduleCode', sql.Char(7), request.body.moduleCode)
            .input('academicYear', sql.Int, request.body.academicYear)
            .execute('getResultsOfExam', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.recordsets.length === 2) {
                        response.status(200).send({
                            status: true,
                            dateHeld: result.recordsets[0][0].dateHeld,
                            examID: result.recordsets[0][0].examID,
                            results: result.recordsets[1]
                        });
                    } else {
                        response.status(200).send({
                            status: false,
                            message: 'No exams found for this academic year'
                        });
                    }
                }
            });
    } catch (error) {
        response.status(200).send(Errors.serverError);
    }

});

router.post('/get-module-attendance', verifyToken, verifyAdmin, async (request, response) => {

    const moduleCode = request.body.moduleCode;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('moduleCode', sql.Char(6), moduleCode)
            .execute('getModuleAttendance', (error, result) => {
                if (error) {
                    response.status(200).send(Errors.serverError);
                } else {
                    const attendance = result.recordset.map(obj => {
                        return {
                            type: obj.type,
                            dateHeld: obj.date,
                            sessionID: obj.sessionID,
                            academicYear: obj.batch,
                            attendance: Math.round((obj.total - obj.count) * 100 / obj.total)
                        }
                    });
                    response.status(200).send({
                        status: true,
                        attendance
                    });
                }
            })
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-detailed-student-attendance', verifyToken, verifyAdminOrTeacher, async (request, response) => {

    const data = request.body;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('studentID', sql.Char(7), data.studentID)
            .input('moduleCode', sql.Char(6), data.moduleCode)
            .input('type', sql.VarChar(15), data.type)
            .input('batch', sql.Int, data.academicYear)
            .execute('getDetailedAttendance', (error, result) => {
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

router.post('/get-detailed-module-attendance', verifyToken, verifyAdmin, async (request, response) => {
    const data = request.body;

    try {

        const pool = await poolPromise;
        pool.request()
            .input('moduleCode', sql.Char(6), data.moduleCode)
            .input('batch', sql.Int, data.academicYear)
            .input('sessionID', sql.Int, data.sessionID)
            .execute('getDetailedModuleAttendance', (error, result) => {
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

router.post('/get-module-results-view', verifyToken, verifyAdminOrTeacher, async (request, response) => {

    const moduleCode = request.body.moduleCode;

    try {

        const pool = await poolPromise;
        await pool.request()
            .input('moduleCode', sql.Char(6), moduleCode)
            .query('SELECT E.academicYear, E.dateHeld, M.studentID, M.mark, M.grade FROM Exam E, Mark M WHERE E.moduleCode = @moduleCode AND M.examID = E.examID',
                (error, result) => {
                    if (error) {
                        response.send(Errors.serverError);
                    } else {
                        response.status(200).send({
                            status: true,
                            results: result.recordset.map(obj => {
                                return {
                                    studentIndex: obj.studentID,
                                    academicYear: obj.academicYear,
                                    dateHeld: new Date(obj.dateHeld),
                                    mark: obj.mark,
                                    grade: obj.grade,
                                    semester: obj.semester
                                };
                            })
                        });
                    }
                });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-student-results', verifyToken, verifyAdminOrTeacher, async (request, response) => {

    const studentID = request.body.studentID;

    try {

        const pool = await poolPromise;
        await pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('getStudentResults', (error, result) => {
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

router.post('/get-student-attendance', verifyToken, verifyAdminOrTeacher, async (request, response) => {

    const studentID = request.body.studentID;

    try {

        const pool = await poolPromise;
        await pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('getAttendance', (error, result) => {
                if (error) {
                    response.status(200).send(Errors.serverError);
                } else {
                    const attendance = result.recordset.map(obj => {
                        return {
                            moduleCode: obj.moduleCode,
                            moduleName: obj.moduleName,
                            type: obj.type,
                            academicYear: obj.batch,
                            attendance: Math.round((obj.total - obj.count) * 100 / obj.total)
                        }
                    });
                    response.status(200).send({
                        status: true,
                        attendance
                    });
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
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
        await pool.request()
            .input('examID', sql.Int, data.examID)
            .input('dateHeld', sql.Date, data.dateHeld)
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
        pool.request()
            .input('moduleCode', sql.Char(6), request.body.moduleCode)
            .input('academicYear', sql.Int, request.body.academicYear)
            .execute('deleteExam', (error, result) => {
                if (error) {
                    response.status(200).send(Errors.serverError);
                } else {
                    if (result.returnValue !== -1) {
                        response.status(200).send({
                            status: true,
                            message: 'Exam deleted successfully'
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

router.post('/register-student', verifyToken, verifyAdmin, async (request, response) => {

    const data = request.body.studentDetails;

    try {

        const year = (data.academicYear.toString().substring(2, 4));

        const pool = await poolPromise;
        const result0 = await pool.request()
            .query("SELECT MAX(username) AS maxUsername FROM Users WHERE username LIKE '" + year + "%'", (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {

                    const maxUsername = result.recordset[0].maxUsername === null ? (year + '4000A').toString() : result.recordset[0].maxUsername;
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

                    hashPassword(data.nic, (error, hash) => {
                        if (error) {
                            response.status(500).send(Errors.serverError);
                        } else {
                            pool.request()
                                .input('studentID', sql.Char(7), studentID)
                                .input('password', sql.VarChar(300), hash)
                                .input('courseID', sql.Int, data.courseName)
                                .input('academicYear', sql.Int, data.academicYear)
                                .input('fullName', sql.VarChar(100), data.name.fullName)
                                .input('title', sql.VarChar(100), data.name.title)
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
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

// view payments
router.post('/get-Payments', verifyToken, verifyAdmin, async (request, response) => {
    const studentID = request.body.studentID;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('studentID', sql.Int, studentID)
            .execute('viewPayments', (error, result) => {
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

// get students registered in particular semester
router.post('/get-students-of-batch', verifyToken, verifyAdmin, async (request, response) => {
    const batch = request.body.batch;

    response.status(200).send({
        status: true,
        message: 'Request received successfully...!'
    });
});

// Enroll students to a semester
router.post('/enroll-student', verifyToken, verifyAdmin, async (request, response) => {

    const enrollmentForm = request.body;

    try {
        const modules = new sql.Table('REGISTRATION_MODULE');
        modules.columns.add('moduleCode', sql.Char(6))

        for (let module of enrollmentForm.modules) {
            modules.rows.add(module.moduleCode);
        }

        const pool = await poolPromise;

        if (enrollmentForm.new) {

            await pool.request()
                .input('studentID', sql.Char(7), enrollmentForm.studentID)
                .input('semester', sql.Int, enrollmentForm.semester)
                .input('academicYear', sql.Int, enrollmentForm.academicYear)
                .input('modules', modules)
                .execute('enrollStudent', (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        response.status(200).send({
                            status: true,
                            message: 'Student enrolled successfully.'
                        });
                    }
                })
        } else {

            await pool.request()
                .input('enrollmentID', sql.Int, enrollmentForm.enrollmentID)
                .input('modules', modules)
                .execute('updateEnrollment', (error, result) => {

                    if (error) {
                        console.log(error);
                        response.status(500).send(Errors.serverError);
                    } else {
                        console.log(result.returnValue);
                        if (result.returnValue === 0) {
                            response.status(200).send({
                                status: true,
                                message: 'Enrollment Updated successfully'
                            });
                        } else {
                            response.status(400).send({
                                status: false,
                                message: 'Malformed request syntax'
                            });
                        }
                    }

                });

        }
    } catch (exception) {
        response.status(500).send(Errors.serverError);
    }
});

// Check if module have results uploaded previously
router.post('/check-if-results-uploaded', verifyToken, verifyAdmin, async (request, response) => {

    try {

        const pool = await poolPromise
        await pool.request()
            .input('moduleCode', sql.Char(6), request.body.moduleCode)
            .input('academicYear', sql.Int, request.body.academicYear)
            .execute('checkIfResultsUploaded', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 1) {
                        response.status(200).send({
                            status: true,
                            message: 'No results found'
                        });
                    } else {
                        response.status(200).send({
                            status: false,
                            message: 'Previously uploaded results are found'
                        });
                    }
                }
            });

    } catch (Exception) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-requests-brief', verifyToken, verifyAdmin, async (request, response) => {

    const studentID = request.body.studentID;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('studentID', sql.VarChar(7), studentID)
            .execute('getRequestsBrief', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        requests: result.recordsets[0],
                        requestTypes: result.recordsets[1]
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-all-requests', verifyToken, verifyAdmin, async (request, response) => {

    try {

        const pool = await poolPromise;
        await pool.request()
            .execute('getAllRequests', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    const requests = result.recordsets[0];
                    const requestsMade = result.recordsets[1]
                    const requestProgress = result.recordsets[2];
                    for (const request of requests) {
                        if (request.finalDecision === 0 || request.finalDecision === 1) {
                            request.status = 2;
                        } else {
                            if (requestProgress.find(obj => obj.requestID === request.requestID)) {
                                request.status = 1;
                            } else {
                                request.status = 0;
                            }
                        }
                        const requestTypes = requestsMade.filter(obj => obj.requestID === request.requestID);
                        request.requests = '';
                        for (const obj of requestTypes) {
                            request.requests += obj.request + ', '
                        }
                        request.requests = request.requests.substring(0, request.requests.length - 2);
                    }
                    response.send({
                        status: true,
                        requests
                    });
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-request-documents', (request, response) => {

    const data = request.body;

    try {
        glob('./request-documents/*' + '-' + data.requestID + '-*.png', {}, (error, files) => {
            if (error) {
                response.status(200).send(Errors.serverError);
            } else {
                if (files.length > 0) {
                    const documents = [];
                    for (let filename of files) {
                        documents.push(fs.readFileSync(filename, {encoding: 'base64'}));
                    }
                    response.status(200).send({
                        status: true,
                        documents
                    });
                } else {
                    response.status(200).send({
                        status: false,
                        message: 'No documents found'
                    });
                }
            }
        });
    } catch (error) {
        response.status(200).send(Errors.serverError);
    }

});

router.post('/update-request-status', verifyToken, verifyAdmin, async (request, response) => {

    const data = request.body;

    try {

        const requests = new sql.Table('REQUEST_TYPE');
        requests.columns.add('requestTypeID', sql.Int);
        for (const request of data.newData.requests) {
            requests.rows.add(request);
        }

        const reasons = new sql.Table('REASONS');
        reasons.columns.add('reason', sql.VarChar(150));
        for (const reason of data.newData.reasons) {
            reasons.rows.add(reason);
        }

        const progress = new sql.Table('PROGRESS');
        progress.columns.add('status', sql.Int);
        progress.columns.add('reviewedBy', sql.Int);
        progress.columns.add('reason', sql.VarChar(200));
        for (const step of data.newData.progress) {
            progress.rows.add(step.status, step.by, step.reason);
        }

        const pool = await poolPromise;
        await pool.request()
            .input('requestID', sql.Int, data.requestID)
            .input('submissionDate', sql.Date, data.newData.submissionDate)
            .input('remarks', sql.VarChar(500), data.newData.remarks)
            .input('finalDecision', sql.Int, data.newData.finalDecision)
            .input('requests', requests)
            .input('reasons', reasons)
            .input('progress', progress)
            .execute('updateRequestStatus', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        message: 'Request status updated successfully'
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/update-academic-calender', verifyToken, verifyAdmin, async (request, response) => {

    const data = request.body;

    try {

        const academicYears = new sql.Table('ACADEMIC_YEARS');
        academicYears.columns.add('academicYear', sql.Int);

        const tasks = new sql.Table('ACADEMIC_YEAR_TASKS');
        tasks.columns.add('AcademicYear', sql.Int);
        tasks.columns.add('TaskName', sql.VarChar(30));
        tasks.columns.add('StartDate', sql.VarChar(50));
        tasks.columns.add('EndDate', sql.VarChar(50));

        for (let year of data) {
            academicYears.rows.add(year.year);
            for (let task of year.data) {
                tasks.rows.add(year.year, task.TaskName, task.StartDate, task.EndDate);
            }
        }

        const pool = await poolPromise;
        await pool.request()
            .input('academicYears', academicYears)
            .input('tasks', tasks)
            .execute('updateAcademicCalender', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        message: 'Academic Calender updated successfully'
                    });
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/check-keyword', verifyToken, verifyAdminOrTeacher, async (request, response) => {

    const keyword = request.body.keyword;

    try {

        const pool = await poolPromise;
        if (/^[A-Za-z]{2}[0-9]{4}$/.test(keyword)) {
            await pool.request()
                .input('moduleCode', sql.Char(6), keyword)
                .execute('checkModule', (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        if (result.returnValue === 0) {
                            response.status(200).send({
                                status: true,
                                moduleName: result.recordset[0].moduleName
                            });
                        } else {
                            response.status(200).send({
                                status: false,
                                message: 'No module found with this module code'
                            });
                        }
                    }
                });
        } else if (/^[0-9]{6}[A-Za-z]$/.test(keyword)) {
            await pool.request()
                .input('studentID', sql.Char(7), keyword)
                .execute('checkStudentID', (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        if (result.returnValue === 0) {
                            response.status(200).send({
                                status: true,
                                studentName: result.recordset[0].name,
                                course: result.recordset[0].course,
                                academicYear: result.recordset[0].academicYear
                            });
                        } else {
                            response.status(200).send({
                                status: false,
                                message: 'No student found with this student ID'
                            });
                        }
                    }
                });
        } else {
            response.status(400).send({
                status: false,
                message: 'Malformed request syntax'
            });
        }

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/check-student-id', verifyToken, verifyAdmin, async (request, response) => {

    const studentID = request.body.studentID.toUpperCase();

    if (studentID && /^[0-9]{6}[A-Z]$/.test(studentID)) {

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
                                message: 'Student not found'
                            });
                        }
                    }

                });

        } catch (error) {
            response.status(500).send(Errors.serverError);
        }

    } else {
        response.status(401).send({
            status: false,
            message: 'Invalid student ID'
        })
    }

});

router.post('/delete-message', verifyToken, verifyAdmin, async (request, response) => {

    const messageID = request.body.messageID;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('notificationID', sql.Int, messageID)
            .input('username', sql.Char(7), request.username)
            .execute('deleteNotification', (error, result) => {
                if (error) {
                    response.status(200).send(Errors.serverError);
                } else {
                    if (result.returnValue !== 0) {
                        response.status(401).send(Errors.unauthorizedRequest);
                    } else {
                        response.status(200).send({
                            status: true,
                            message: 'Notification deleted successfully'
                        });
                    }
                }
            });
    } catch (error) {
        response.status(200).send(Errors.serverError);
    }

});

router.post('/upload-payment', verifyToken, async (request, response) => {

    const data = request.body;

    if (request.role === 3) {
        if (data.depositor.registrationNumber !== request.username) {
            return response.status(401).send(Errors.unauthorizedRequest);
        }
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('paymentID', sql.Int, data.new ? 0 : data.paymentID)
            .input('slipNo', sql.Int, data.deposit.slipNumber)
            .input('amount', sql.Int, data.deposit.totalPaid)
            .input('paymentDate', sql.Date, data.deposit.paymentDate)
            .input('bank', sql.VarChar(50), data.deposit.bankName)
            .input('studentID', sql.Char(7), data.depositor.registrationNumber)
            .input('externalNote', sql.VarChar(50), data.deposit.externalNote)
            .input('paymentStatus', sql.Int, request.role ===  1 ? 2 : 1)
            .input('new', sql.Bit, data.new)
            .input('role', sql.Int, request.role)
            .execute('uploadPayment', function (error, result) {
                if (error) {
                    console.log(error);
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue > 0) {
                        if (data.slip) {
                            const base64Data = data.slip.replace(/^data:([A-Za-z-+/]+);base64,/, '')
                            fs.writeFileSync(`./payment-slips/${data.depositor.registrationNumber}-${result.returnValue}.png`, base64Data, {encoding: 'base64'})
                            response.send({
                                status: true,
                                paymentID: result.returnValue,
                                message: 'Request received successfully'
                            });
                        } else {
                            response.status(401).send({
                                status: false,
                                message: 'Malformed request syntax'
                            })
                        }
                    } else {
                        response.status(401).send(Errors.unauthorizedRequest)
                    }
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-student-payment-details', verifyToken, verifyAdmin, async (request, response) => {

    const studentID = request.body.studentID;

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
                    });
                }
            });

    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-payment-details', verifyToken, verifyAdmin, async (request, response) => {

    const slipNo = request.body.slipNo;

    try {

        const pool = await poolPromise;
        await pool.request()
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

router.post('/get-payment-list', verifyToken, verifyAdmin, async (request, response) => {

    const type = request.body.type;

    try {
        const pool = await poolPromise;
        if (type === 'confirmed') {
            await pool.request()
                .input('courseID', sql.Int, request.body.courseID)
                .input('academicYear', sql.Int, request.body.academicYear)
                .execute('getConfirmedPaymentsList', (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        response.status(200).send({
                            status: true,
                            results: result.recordsets
                        });
                    }
                });
        } else if (type === 'pending') {
            await pool.request()
                .execute('getPendingPaymentsList', (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        response.status(200).send({
                            status: true,
                            results: result.recordsets
                        });
                    }
                })
        }

    } catch (error) {
        response.status(200).send(Errors.serverError);
    }
});

router.post('/edit-payment', verifyToken, verifyAdmin, async (request, response) => {

    const data = request.body;
    console.log(data);

    try {

        const pool = await poolPromise;
        await pool.request()
            .input('slipNo', sql.Int, data.slipNumber)
            .input('amount', sql.Int, data.amountPaid)
            .input('paymentDate', sql.Date, data.paymentDate)
            .input('bank', sql.Char(20), data.bankName)
            .execute('editPayment', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        message: 'Payment updated successfully'
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/delete-payment', verifyToken, verifyAdmin, async (request, response) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('slipNo', sql.Int, request.body.slipNo)
            .execute('deletePayment', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 0) {
                        response.status(200).send({
                            status: true,
                            message: 'Payment deleted successfully'
                        });
                    } else {
                        response.status(200).send({
                            status: false,
                            message: 'Could not delete the Payment'
                        });
                    }
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }
});

router.post('/get-registered-users', verifyToken, verifyAdmin, async (request, response) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('courseID', sql.Int, request.body.courseID)
            .input('academicYear', sql.Int, request.body.academicYear)
            .execute('getRegisteredUsersList', (error, result) => {
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
        response.status(200).send(Errors.serverError);
    }
});


router.post('/get-print-list', verifyToken, verifyAdmin, async (request, response) => {
    const type = request.body.type;
    try {
        const pool = await poolPromise;
        if (type === 'confirmed') {
            await pool.request()
                .input('courseID', sql.Int, request.body.courseID)
                .input('academicYear', sql.Int, request.body.academicYear)
                .execute('printPayments', (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        response.status(200).send({
                            status: true,
                            results: result.recordsets
                        });
                    }
                })
        }

    } catch (error) {
        console.error(result);
        response.status(200).send(Errors.serverError);
    }
});


router.post('/get-student-payment-tot', verifyToken, verifyAdmin, async (request, response) => {
    console.log('request.body.studentID;=', request.body.studentID);
    const studentID = request.body.studentID;

    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('tot', (error, result) => {
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


router.post('/get-student-details', verifyToken, verifyAdmin, async (request, response) => {

    const studentID = request.body.studentID;

    try {
        const pool = await poolPromise;
        pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('getStudentDetails', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    if (result.returnValue === 0) {
                        let profilePicture = '';
                        try {
                            profilePicture = fs.readFileSync(`./profile-pictures/${studentID}.png`, {encoding: 'base64'});
                        } catch (Ignore) {
                        }
                        const data = result.recordsets[0][0];
                        data.currentGPA = calculateGPA(studentID, gpa => {
                            data.currentGPA = gpa
                            response.status(200).send({
                                status: true,
                                details: data,
                                educationQualifications: result.recordsets[1],
                                profilePicture
                            });
                        });
                    } else {
                        response.status(400).send({
                            status: false,
                            message: 'Student not found'
                        });
                    }
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/get-enrollments', verifyToken, verifyAdmin, async (request, response) => {

    const offset = request.body.offset;
    const count = request.body.count;

    try {

        const pool = await poolPromise;
        await pool.request()
            .input('offset', sql.Int, offset)
            .input('count', sql.Int, count)
            .execute('getEnrollments', (error, result) => {
                if (error) {
                    console.log(error);
                    response.status(500).send(Errors.serverError);
                } else {

                    const numRows = result.recordsets[0][0].count;
                    const enrollments = result.recordsets[1];
                    const modules = result.recordsets[2];

                    for (let enrollment of enrollments) {
                        enrollment.modules = modules.filter(module => module.enrollmentID === enrollment.enrollmentID).map(item => item.moduleCode);
                    }

                    response.status(200).send({
                        status: true,
                        numRows,
                        enrollments
                    });
                }
            });
    } catch (error) {
        response.status(500).send(Errors.serverError);
    }

});

router.post('/delete-enrollments', verifyToken, verifyAdmin, async (request, response) => {

    const data = request.body.enrollmentIDs;
    console.log(request.body);

    if (Array.isArray(data) && data.length > 0) {

        try {

            const enrollmentsIDs = new sql.Table('ENROLLMENT_ID');
            enrollmentsIDs.columns.add('enrollmentID', sql.Int);

            for (let enrollmentID of data) {
                enrollmentsIDs.rows.add(enrollmentID);
            }

            const pool = await poolPromise;
            await pool.request()
                .input('enrollmentIDs', enrollmentsIDs)
                .execute('deleteEnrollments', (error, result) => {
                    if (error) {
                        response.status(500).send(Errors.serverError);
                    } else {
                        if (result.returnValue === 0) {
                            response.status(200).send({
                                status: true,
                                message: 'Enrollments deleted successfully'
                            });
                        } else {
                            response.status(500).send({
                                status: false,
                                message: 'Unable to delete enrollments'
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
            message: 'Malformed request syntax'
        });
    }

});

module.exports = router;

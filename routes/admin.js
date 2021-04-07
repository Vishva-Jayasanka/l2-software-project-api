const express = require('express');
const router = express.Router();
const sql = require('mssql');

const Errors = require('../errors/errors');
const verifyToken = require('../modules/user-verification').VerifyToken;
const {poolPromise} = require('../modules/sql-connection');

function verifyAdmin(request, response, next) {
    if (request.role === 1) {
        next();
    } else {
        return response.status(401).send(Errors.unauthorizedRequest);
    }
}

router.post('/check-module', verifyToken, verifyAdmin, async (request, response) => {
    try {
        const pool = await poolPromise;
        await pool.request()
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
    console.log(data);

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
            .execute('uploadAttendance', (error, result) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                    console.error(error);
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
                    console.log(error);
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
                    console.error(error);
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
        console.error(error);
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
                    response.status(200).send({
                        status: true,
                        examID: result.recordset[0].examID,
                        dateHeld: result.recordset[0].dateHeld,
                        results: result.recordsets[1]
                    });
                }
            });
    } catch (error) {
        console.error(result);
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
        await pool.request()
            .input('examID', sql.Int, data.examID)
            .input('dateHeld', sql.Date, data.dateHeld)
            .input('results', results)
            .execute('editResults', (error, result) => {
                if (error) {
                    console.error(error);
                    response.status(500).send(Errors.serverError);
                } else {
                    response.status(200).send({
                        status: true,
                        message: 'Results updated successfully'
                    });
                }
            });
    } catch (error) {
        console.error(error);
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

                    const result1 = pool.request()
                        .input('studentID', sql.Char(7), studentID)
                        .input('courseID', sql.Int, data.courseName)
                        .input('academicYear', sql.Int, data.academicYear)
                        .input('title', sql.VarChar(100), data.name.title)
                        .input('fullName', sql.VarChar(100), data.name.fullName)
                        .input('nameWithInitials', sql.VarChar(50), data.name.nameWithInitials)
//                        .input('firstName', sql.VarChar(20), name[0])
//                        .input('lastName', sql.VarChar(20), name[1])
                        .input('firstName', sql.VarChar(20), data.name.fullName)
                        .input('lastName', sql.VarChar(20), data.name.nameWithInitials)
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
                                console.log(error);
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
        console.log(error);
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
        console.error(result);
        response.status(200).send(Errors.serverError);
    }
});


// upload payments  --TODO--
router.post('/upload-payment', verifyToken, verifyAdmin, async (request, response) => {
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

// view confirmed and pending payment list
router.post('/get-payment-list', verifyToken, verifyAdmin, async (request, response) => {
    const type = request.body.type;
    try{
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
        } else if(type === 'pending') {
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
        console.error(result);
        response.status(200).send(Errors.serverError);
    }
});

router.post('/get-student-payment-details', verifyToken, verifyAdmin, async (request, response) => {
    console.log('request.body.studentID;=', request.body.studentID);
    const studentID = request.body.studentID;;

    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('studentID', sql.Char(7), studentID)
            .execute('getStudentPayments', (error, result) => {
                if (error) {
                    console.log(error);
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

router.post('/get-payment-details', verifyToken, verifyAdmin, async (request, response) => {

    const slipNo = request.slipNo;

    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('slipNo', sql.Char(7), slipNo)
            .execute('viewPaymentDetails', (error, result) => {
                if (error) {
                    console.log(error);
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

// get students registered in particular semester
router.post('/get-students-of-batch', verifyToken, verifyAdmin, async (request, response) => {
    const batch = request.body.batch;

    response.status(200).send({
        status: true,
        message: 'Request received successfully...!'
    });
});

// Upload request form set by students
router.post('/upload-request', verifyToken, verifyAdmin, async (request, response) => {

    const req = request.body;

    try {
        const pool = await poolPromise;
    } catch (exception) {
        response.status(200).send(Errors.serverError);
    }

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
        await pool.request()
            .input('studentID', sql.Char(7), enrollmentForm.studentID)
            .input('semester', sql.Int, enrollmentForm.semester)
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

module.exports = router;

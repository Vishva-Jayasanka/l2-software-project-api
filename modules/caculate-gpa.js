const sql = require('mssql');

const {poolPromise} = require("./sql-connection");
module.exports = {

    calculateGPA: async function(studentID, next) {

        try {
            const pool = await poolPromise;
            await pool.request()
                .input('studentID', sql.Char(7), studentID)
                .execute('getResults', (error, result) => {
                    if (error) {
                        next('');
                    } else {

                        let totalPoints = 0, totalCredits = 0;
                        const moduleCodes = new Set();

                        for (let examResult of result.recordset) {
                            moduleCodes.add(examResult.moduleCode);
                        }

                        for (const moduleCode of moduleCodes) {
                            const temp = result.recordset.filter(obj => obj.moduleCode === moduleCode);
                            if (temp.length > 1) {
                                temp.sort((a, b) => a.academicYear < b.academicYear ? 1 : -1);
                                if (temp[0].mark > 54) {
                                    temp[0].grade = 'C';
                                }
                            }
                            let gpa = 0;
                            switch (temp[0].grade) {
                                case 'A+':
                                    gpa = 4.2;
                                    break;
                                case 'A':
                                    gpa = 4.0;
                                    break;
                                case 'A-':
                                    gpa = 3.7;
                                    break;
                                case 'B+':
                                    gpa = 3.3;
                                    break;
                                case 'B':
                                    gpa = 3.0;
                                    break;
                                case 'B-':
                                    gpa = 2.7;
                                    break;
                                case 'C+':
                                    gpa = 2.3;
                                    break;
                                case 'C':
                                    gpa = 2.0;
                                    break;
                                case 'C-':
                                    gpa = 1.7;
                                    break;
                                case 'D+':
                                    gpa = 1.3;
                                    break;
                                case 'D':
                                    gpa = 1.0;
                                    break;
                                case 'D-':
                                    gpa = 0.7;
                                    break;
                                default:
                                    gpa = 0.0;
                            }
                            totalPoints += temp[0].credits * gpa;
                            totalCredits += temp[0].credits;

                        }

                        try {
                            next(Math.round(totalPoints * 100 / totalCredits) / 100);
                        } catch (Ignore) {
                            next('');
                        }

                    }
                });
        } catch (error) {
            next('');
        }

    }

}

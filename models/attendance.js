const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const attendanceSchema = new Schema({
    studentID: String,
    moduleCode: String,
    type: String,
    date: Date
});

module.exports = mongoose.model('attendance', attendanceSchema, 'attendance');

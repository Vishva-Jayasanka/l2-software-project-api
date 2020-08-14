const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const resultSchema = new Schema({
    moduleCode: String,
    studentID: String,
    type: String,
    mark: Number,
    date: Date
});

module.exports = mongoose.model('result', resultSchema, 'result');

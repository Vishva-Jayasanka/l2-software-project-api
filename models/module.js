const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const moduleSchema = new Schema({
    moduleName: String,
    description: String,
    colorCode: String,
    credits: Number,
    semester: Number,
    teachers: Array,
    lectureHours: Array,
});

module.exports = mongoose.model('module', moduleSchema, 'module');

const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const moduleSchema = new Schema({
    moduleCode: String,
    moduleName: String,
    teachers: [],
    credits: Number,
    semester: Number,
    description: String,
    colorCode: String,
});

module.exports = mongoose.model('module', moduleSchema, 'module');

const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const lectureHourSchema = new Schema({
    moduleCode: String,
    type: String,
    startingTime: Number,
    endingTime: Number,
    day: String,
    lectureHall: String,
    completedLectures: []
});

module.exports = mongoose.model('lectureHour', lectureHourSchema, 'lectureHour');

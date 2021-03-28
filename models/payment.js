const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const paymentSchema = new Schema({
    slipNo: String,
    description: String,
    amount: Number,
    paymentDate: Date,
    bank: String,
    confirmStatus: Number,
    studentID: String
});

module.exports = mongoose.model('payment', paymentSchema, 'payment');

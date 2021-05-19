const nodemailer = require('nodemailer');
const {passwordResetEmailTemplate} = require('../models/password-reset-email');
const {recoveryEmailTemplate} = require('../models/recovery-email-template');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'vishvajayasanka@gmail.com',
        pass: 'ipklfmkkowxbbzws'
    }
});

module.exports = {

    sendPasswordResetEmail: function (user, callback) {

        const template = passwordResetEmailTemplate(user.firstName, user.lastName, user.username, user.token);

        const mailOptions = {
            from: 'vishvajayasanka@gmail.com',
            to: user.recoveryEmail,
            subject: 'IMS Password Reset',
            html: template
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return callback(false);
            } else {
                return callback(true);
            }
        });

    },

    sendVerificationEmail: function(user, link, callback) {

        const template = recoveryEmailTemplate(user.firstName, user.lastName, user.username, user.email, link, user.token);

        const mailOptions = {
            from: 'vishvajayasanka@gmail.com',
            to: user.email,
            subject: 'IMS Email Verification',
            html: template
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return callback(false);
            } else {
                return callback(true);
            }
        });
    },

}


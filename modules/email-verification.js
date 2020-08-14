const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'vishvajayasanka@gmail.com',
        pass: 'Porsche911gt3rs'
    }
});

module.exports = {

    getRandomInt: function () {
        return (Math.floor(Math.random() * 899999 + 100000)).toString();
    },

    sendVerificationEmail: function (user, callback) {
        const mailOptions = {
            from: 'vishvajayasanka@gmail.com',
            to: user.email,
            subject: 'LMS Recovery Email Verification',
            html: `<h1>Hello, ${user.firstName + ' ' + user.lastName}.</h1>
               <h2>Your account was created successfully. Please use this code to verify your recovery email address.</h2>
               <h2><bold>${user.verificationCode}</bold></h2>`
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return callback(false);
            } else {
                console.log('Email sent: ' + info.response)
                return callback(true);
            }
        })
    }

}


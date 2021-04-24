const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'vishvajayasanka@gmail.com',
        pass: 'PaganiZonda760ls'
    }
});

module.exports = {

    getRandomInt: function () {
        return (Math.floor(Math.random() * 899999 + 100000)).toString();
    },

    sendPasswordResetEmail: function (user, callback) {
        const mailOptions = {
            from: 'vishvajayasanka@gmail.com',
            to: user.recoveryEmail,
            subject: 'IMS Password Reset',
            html:
                `
                <div style="text-align: center">
                    <h1>Hello, ${user.firstName + ' ' + user.lastName}.</h1>
                    <h2>Please use the below link to reset your password</h2>
                    <a href="http://localhost:4200/auth/reset-password;token=${user.token}" target="_blank" style="padding: 8px 12px; border: 1px solid #ED2939;border-radius: 2px;font-family: Helvetica, Arial, sans-serif;font-size: 14px;text-decoration: none; font-weight:bold; display: inline-block;">
                        Reset Password             
                    </a>
                    <p>If you did not try to reset your password, please ignore this.</p>
                </div>
                `

        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return callback(false);
            } else {
                console.log('Email sent: ' + info.response)
                return callback(true);
            }
        });
    },

    sendVerificationEmail: function(user, link, callback) {
        const mailOptions = {
            from: 'vishvajayasanka@gmail.com',
            to: user.email,
            subject: 'IMS Email Verification',
            html:
                `
                <div style="text-align: center">
                    <h1>Hello, ${user.firstName + ' ' + user.lastName}.</h1>
                    <h2>Click below link to verify it's you.</h2>
                    <a href="http://localhost:4200/auth/${link};token=${user.token};email=${user.email}" target="_blank" style="padding: 8px 12px; border: 1px solid #ED2939;border-radius: 2px;font-family: Helvetica, Arial, sans-serif;font-size: 14px;text-decoration: none; font-weight:bold; display: inline-block;">
                        Verify it's you             
                    </a>
                    <p>If you did not try to add your email address to lms, please ignore this.</p>
                </div>
                `

        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return callback(false);
            } else {
                console.log('Email sent: ' + info.response)
                return callback(true);
            }
        });
    },

}


module.exports = {

    passwordResetEmailTemplate: function(firstName, lastName, username, token) {

        return `
        <table
            style="padding: 0; width: 500px; margin: 0 auto; border-collapse: collapse; font-family: 'Segoe UI', serif">
            <tbody>
            <tr style="background-color: #f6f8fa; border-bottom: 1px solid #dcdcff">
                <td style="text-align: left; padding: 10px;">
                    <img src="https://upload.wikimedia.org/wikipedia/en/6/60/University_of_Moratuwa_logo.png" alt="UoM"
                         style="height: 45px; width: 40px"/>
                </td>
                <td style="text-align: right; padding: 10px">
                    <table style="width: 100%">
                        <tr>
                            <td style="text-align: right">
                                <p style="font-size: 18px">${firstName + ' ' + lastName}</p>
                            </td>
                            <td style="width: 50px; text-align: center">
                                <img
                                    src="http://13.233.98.120:3000/profile-pictures/${username}.png"
                                    alt="${firstName}"
                                    style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid #c8c8c8"/>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr style="background-color: #fafafa">
                <td colSpan="3">
                    <table style="width: 100%">
                        <tbody>
                        <tr>
                            <td style="padding: 10px 10px 0 10px">
                                <h3 style="margin-bottom: 0">Hi ${firstName + ' ' + lastName},</h3>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px">
                                <p style="margin-top: 0">
                                    We noticed you were trying to reset your password, If its you please follow the ling
                                    bellow to reset your password.
                                </p>
                                <div style="width: 100%; text-align: center; margin: 10px 0 10px 0">
                                    <a href="http://ec2-13-233-98-120.ap-south-1.compute.amazonaws.com:4200/#/auth/reset-password;token=${token}">
                                        <button style="height: 40px; width: 130px; font-weight: 550; border: 3px solid lightgray; border-radius: 20px">
                                            <span style="font-weight: 550">Reset Password</span>
                                        </button>
                                    </a>
                                </div>
                                <p style="margin-top: 0">
                                    If you did not try to change your password, please secure your account.
                                </p>
                            </td>
                        </tr>

                        <tr style="font-size: 13px">
                            <td style="padding: 10px">
                                <p>Details of the event</p>
                                <ul style="list-style-type: none; padding: 0 10px 0 10px">
                                    <li>
                                        <span style="font-weight: 600">Date</span>: April 28, 2021, 12:42 PM (GMT)
                                    </li>
                                    <li>
                                        <span style="font-weight: 600">Operating System</span>: Windows
                                    </li>
                                    <li>
                                        <span style="font-weight: 600">Browser</span> : Chrome
                                    </li>
                                    <li>
                                        <span style="font-weight: 600">Approximate Location</span>: Colombo, Sri Lanka
                                    </li>
                                </ul>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
            </tr>

            <tr style="background-color: #edf0f3">
                <td colSpan="3" style="text-align: center; padding: 10px; font-size: 14px">
                    <p style="margin-bottom: 5px">This email was intended fo ${firstName + ' ' + lastName} (Student at University of
                        Moratuwa)</p>
                    <img src="https://upload.wikimedia.org/wikipedia/en/6/60/University_of_Moratuwa_logo.png" alt="UoM"
                         style="width: 32px; height: 35px"/>
                    <p style="margin-top: 5px">Copyright © 2020 University of Moratuwa. All rights Reserved.</p>
                </td>
            </tr>
            </tbody>
        </table>
        `
    }
}

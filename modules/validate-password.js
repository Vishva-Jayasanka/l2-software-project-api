const bcrypt = require('bcrypt');

module.exports = {

    validatePassword: function(password) {
        return /^(?=.*?[A-Z])(?=(.*[a-z])+)(?=(.*[\d])+)(?=(.*[\W])+)(?!.*\s).{8,}$/.test(password.trim());
    },

    hashPassword: function(password, callback) {
        bcrypt.genSalt(10, (error, salt) => {
            if (error) {
                callback(error, '');
            } else {
                bcrypt.hash(password.trim(), salt, (error, hash) => {
                    if (error) {
                        callback(error, '');
                    } else {
                        callback('', hash);
                    }
                });
            }
        })
    },

    comparePassword: function(password, hash, callback) {
        bcrypt.compare(password.trim(), hash, (error, value) => {
            if (error) {
                callback(error, '');
            } else {
                callback('', value);
            }
        })
    }

}

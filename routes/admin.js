const express = require('express');
const router = express.Router();

const Errors = require('../errors/errors');
const User = require('../models/user');
const Module = require('../models/module');
const verifyToken = require('../modules/user-verification').VerifyToken;


function verifyAdmin(request, response, next) {
    if (request.user.role === 'admin') {
        next();
    } else {
        return response.status(401).send(Errors.unauthorizedRequest);
    }
}

router.post('/get-teachers', verifyToken, verifyAdmin, (request, response) => {
    User.find({role: 'teacher'}, {_id: 0, username: 1, firstName: 1, lastName: 1}, (error, teachers) => {
        if (error) {
            response.status(500).send(Errors.serverError);
        } else {
            response.status(200).send({
                status: true,
                teachers: teachers
            })
        }
    });
});

router.post('/edit-module', verifyToken, verifyAdmin, (request, response) => {
    console.log(request.body);
    const info = request.body.data;
    Module.updateOne({moduleCode: request.body.moduleCode}, {
        moduleCode: info.moduleCode,
        moduleName: info.moduleName,
        teachers: info.teachers.map(obj => obj.username),
        credits: info.credits,
        semester: info.semester,
        description: info.description
    }, (error, module) => {
        if (error) {
            response.status(500).send(Errors.serverError);
        } else {
            console.log(module);
            response.status(200).send({
                status: true,
                message: 'Request received successfully'
            });
        }
    });

});

module.exports = router;

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;

const Errors = require('../errors/errors');
const User = require('../models/user');
const Module = require('../models/module');
const LectureHour = require('../models/lecture-hour');
const verifyToken = require('../modules/user-verification').VerifyToken;


function verifyAdmin(request, response, next) {
    if (request.user.role === 'admin') {
        next();
    } else {
        return response.status(401).send(Errors.unauthorizedRequest);
    }
}

function convertTime(time) {
    return parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
}

function updateLectureHoursOfUser(moduleID, lectureHourIDs, response) {
    User.updateMany({
        'currentRegistration.modules': mongoose.Types.ObjectId(moduleID),
        'registeredModules.moduleCode': mongoose.Types.ObjectId(moduleID)
    }, {'registeredModules.$.lectureHours': lectureHourIDs}, (error, data) => {
        if (error) {
            response.status(500).send(Errors.serverError);
        } else {
            console.log(data);
            response.status(200).send({
                status: true,
                message: 'Module updated successfully'
            })
        }
    });
}

router.post('/get-teachers', verifyToken, verifyAdmin, (request, response) => {
    User.find({role: 'teacher'}, {_id: 0, username: 1, firstName: 1, lastName: 1}, (error, teachers) => {
        if (error) {
            response.status(500).send(Errors.serverError);
        } else {
            response.status(200).send({
                status: true,
                teachers: teachers
            });
        }
    });
});

router.post('/edit-module', verifyToken, verifyAdmin, (request, response) => {
    const info = request.body.moduleDetails;
    Module.findOneAndUpdate({moduleCode: request.body.oldCode}, [{
        $set: {
            moduleCode: info.moduleCode,
            moduleName: info.moduleName,
            credits: parseInt(info.credits),
            semester: parseInt(info.semester),
            description: info.description,
            teachers: request.body.teachers.map(teacher => teacher.username),
        }
    }], (error, updatedModule) => {
        if (error) {
            response.status(500).send(Errors.serverError);
        } else {
            info.lectureHours.forEach(lectureHour => {
                lectureHour.startingTime = convertTime(lectureHour.startingTime);
                lectureHour.endingTime = convertTime(lectureHour.endingTime);
            });
            const IDs = info.lectureHours.map(obj => ObjectID(obj.id));
            LectureHour.bulkWrite(info.lectureHours.map(entry => ({
                updateOne: {
                    filter: {_id: ObjectID(entry.id)},
                    update: {$set: entry}
                }
            })), (error, status) => {
                if (error) {
                    response.status(500).send(Errors.serverError);
                } else {
                    Module.updateOne({moduleCode: info.moduleCode}, {$pull: {lectureHours: {$nin: IDs}}}, {multi: true}, (error, res) => {
                        if (error) {
                            response.status(500).send(Errors.serverError);
                        } else {
                            if (info.newLectureHours && info.newLectureHours.length !== 0) {
                                info.newLectureHours.forEach(lectureHour => {
                                    lectureHour.startingTime = convertTime(lectureHour.startingTime);
                                    lectureHour.endingTime = convertTime(lectureHour.endingTime);
                                });
                                LectureHour.insertMany(info.newLectureHours, (error, savedData) => {
                                    if (error) {
                                        response.status(500).send(Errors.serverError);
                                    } else {
                                        const newLectureHourIDs = savedData.map(obj => mongoose.Types.ObjectId(obj._id));
                                        console.log(newLectureHourIDs[0]);
                                        Module.updateOne({moduleCode: info.moduleCode}, {$push: {lectureHours: {$each: newLectureHourIDs}}}, (error, res) => {
                                            if (error) {
                                                response.status(500).send(Errors.serverError);
                                            } else {
                                                updateLectureHoursOfUser(updatedModule._id, IDs.concat(newLectureHourIDs), response);
                                            }
                                        });
                                    }
                                });
                            } else {
                                updateLectureHoursOfUser(updatedModule._id, IDs, response);
                            }
                        }
                    });
                }
            });

        }
    });

});

router.post('/delete-module', verifyToken, verifyAdmin, function(request, response) {
    const moduleCode = request.body.moduleCode;
    response.status(200).send({
        status: true,
        message: 'Request received successfully'
    });
    // Module.delete({moduleCode: moduleCode}, (request, response) => {
    //
    // });
});

module.exports = router;

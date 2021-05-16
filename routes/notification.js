const sql = require('mssql');
const ws = require('ws');
const {poolPromise} = require("../modules/sql-connection");

module.exports = {
    onConnection: function (socket, wsServer) {
        socket.on('message', async message => {
            let msg = JSON.parse(message);
            if (socket.details.roleID === 1 || socket.details.roleID === 2) {
                try {
                    if (msg.messageType === 'notification') {
                        msg = msg.messageBody;
                        msg.recipients.push(socket.details.username);
                        const recipients = new sql.Table('RECIPIENTS');
                        recipients.columns.add('recipient', sql.VarChar(7))

                        for (let recipient of msg.recipients) {
                            recipients.rows.add(recipient);
                        }

                        const pool = await poolPromise;
                        console.log('Notification sent: ' + new Date(msg.timeSent).toISOString());
                        pool.request()
                            .input('sentBy', sql.Char(7), msg.username)
                            .input('subject', sql.VarChar(100), msg.subject)
                            .input('message', sql.VarChar(500), msg.message)
                            .input('timeSent', sql.DateTime, new Date(msg.timeSent).toISOString({timeZone: "Asia/Colombo"}))
                            .input('recipients', recipients)
                            .execute('addNotification', (error, result) => {

                                if (error || result.returnValue === -1) {
                                    socket.send(JSON.stringify({
                                        messageType: 'acknowledgement',
                                        status: 'failed',
                                        message: 'Error sending the message',
                                        timeStamp: msg.timeStamp
                                    }));
                                } else {
                                    const messageToSend = JSON.stringify({
                                        messageType: 'notification',
                                        messageBody: {
                                            notificationID: result.returnValue,
                                            recipients: [],
                                            username: socket.details.name,
                                            subject: msg.subject,
                                            message: msg.message,
                                            timeSent: msg.timeSent,
                                        }
                                    });

                                    wsServer.clients.forEach(client => {
                                        if (client.readyState === ws.OPEN) {
                                            if (msg.recipients.find(recipient => recipient === client.details.username && recipient !== socket.details.username) ||
                                                msg.recipients.find(recipient => recipient.toString() === '20' + client.details.username.substring(0, 2))) {
                                                client.send(messageToSend);
                                            }
                                        }
                                    });

                                    socket.send(JSON.stringify({
                                        messageType: 'acknowledgement',
                                        notificationID: result.returnValue,
                                        status: 'sent',
                                        messageBody: 'Message sent successfully',
                                        timeStamp: msg.timeStamp
                                    }));

                                    updateMessageStatus(result.returnValue, socket.details.username);

                                }
                            });
                    }
                } catch (error) {
                    socket.send(JSON.stringify({
                        messageType: 'acknowledgement',
                        status: 'failed',
                        message: 'Error sending the message',
                        timeStamp: msg.messageBody.timeStamp
                    }));
                }
            } else {
                if (msg.messageType === 'acknowledgement') {
                    try {
                        await updateMessageStatus(msg.messageBody, socket.details.username);
                    } catch (ignore) {
                    }
                }
            }
        });
    }
}

async function updateMessageStatus(notificationID, recipientID) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('notificationID', sql.Int, notificationID)
            .input('recipientID', sql.Char(7), recipientID)
            .query('UPDATE Received SET received = 1 WHERE notificationID = @notificationID AND recipientID = @recipientID');
    } catch (ignore) {
    }
}

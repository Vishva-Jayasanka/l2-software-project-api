const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');

const fileUpload = require('express-fileupload');
const _ = require('lodash');

const PORT = process.env.PORT || 3000;
const api = require('./routes/api');
const admin = require('./routes/admin');
const app = express();

app.use(fileUpload({
    createParantPath: true
}));
app.use(express.static('profile-pictures'));

app.use(cors());

app.use(function (request, response, next) {
   response.setHeader('Access-Control-Allow-Origin', '*');
   response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
   response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
   next();
});

app.use(bodyParser.json({limit: '2mb'}))

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(morgan('dev'));

app.use('/api', api);
app.use('/admin', admin);

app.get('/', function (request, response) {
   response.writeHead(200, {'Content-Type': 'text/html'});
   response.write('Hello from the server!');
   response.end();
});

app.listen(PORT, function () {
    console.log('Server is running on localhost:', PORT)
});


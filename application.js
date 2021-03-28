const express = require('express');
const bodyParser = require('body-parser');

const userRoutes = require('./routes/user.js');

const app = express();
app.use(bodyParser.json());

app.use('/user', userRoutes);

app.listen(8080);

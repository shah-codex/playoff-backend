const express = require('express');
const bodyParser = require('body-parser');

const userRoutes = require('./routes/user.js');
const teamRoutes = require('./routes/team.js');
const tournamentRoutes = require('./routes/tournament.js');

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.use('/user', userRoutes);

app.use('/team', teamRoutes);

app.use('/tournament', tournamentRoutes);

app.listen(8080);

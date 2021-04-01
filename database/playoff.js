const mysql = require('mysql2');
const fs = require('fs');

const passwordManager = require(__dirname + '/../passwords/password.js');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'playoff',
    password: passwordManager.getDatabasePassword
});

module.exports = pool.promise();

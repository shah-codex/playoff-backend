const db = require('../database/playoff.js');
const crypto = require('crypto');

exports.createUserProfile = (req, res, next) => {
    // Fields retrieved from the request body sent by the user.
    const name = req.body.name;             // name of the user.
    const password = req.body.password;     // password is the hashed string sent from the client/user.
    const location = req.body.location;     // location is the actual location of user that he entered.

    // Hashing the password to store it in the database.
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Inserting the user registration details in the database.
    db.query("INSERT INTO User (name, password, location) values (?, ?, ?)", [name, hashedPassword, location])
    .then(result => {
        // Returning the response with the success message with status code 201.
        return res.status(201).json({
            message: 'successfully registered',
            user: { name: name, location: location }
        });
    })
    .catch(err => {
        // Returning the error response of 501 in case of the failure.
        console.log(err);
        res.status(500).json({
            message: 'username already exists'
        });
    });
}

exports.validateUserProfile = (req, res, next) => {
    // Fields retrieved from the request body from the user.
    const name = req.body.name;              // name of the user.
    const password = req.body.password;      // password of the user.

    // Hashing the password sent by the user to check with the actual
    // password stored in the database.
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Validating the user with its respected username and password.
    db.execute("SELECT name, password, location FROM User WHERE name = ? AND password = ?", [name, hashedPassword])
    .then(([rows, constraints]) => {
        // Checking if the data provided by the user in the request body
        // matches the data stored in the actual database and is not empty.
        if(rows[0].password === hashedPassword) {
            const name = rows[0].name;              // Accessing the name from the database for corresponding user
            const location = rows[0].location;      // Accessing the location of the user from the database

            // Returning the success response if the username and password matches.
            return res.status(200).json({
                message: 'login successful',
                user: { name: name, location: location }
            });
        }
    })
    .catch(err => {
        // Returning the error response code of 404 in case of some failure.
        console.log(err);
        return res.status(404).json({
            message: 'incorrect username or password'
        });
    });
}

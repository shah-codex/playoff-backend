const db = require('../database/playoff.js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const passwordManager = require(__dirname + '/../passwords/password.js');
const utils = require(__dirname + '/../utils.js');

exports.authenticateUser = (req, res, next) => {

    const email = req.body.email;           // Email address of the user that want to register

    // Creating a service to send email through gmail server.
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'playoff1322@gmail.com',
            pass: passwordManager.getMailPassword
        }
    });

    // Generate an OTP
    const oneTimePassword = utils.generateOTP();

    // Initializing the header and body for email to send.
    const mailOptions = {
        from: 'playoff1322@gmail.com',
        to: email,
        subject: 'One time password',
        text: '',
        html: '<b>' + oneTimePassword + '</b> is your OTP and is valid for <b>5 minutes</b><br/><br/><p>We have sent you a code to verify your account.</br> It is to ensure that only you have access to your account.</br> After verifying you can access your playoff account.</p>'
    };

    // Sending the mail to the user.
    transporter.sendMail(mailOptions).then(result => {
        if(insertAuthenticationDetails(email, oneTimePassword)) {
            res.status(200).json({
                message: 'success'
            });
        } else {
            throw TypeError('Failed to store in the database');
        }
    })
    .catch(err => {
        console.log(err);
        res.status(400).json({
            message: 'failure'
        });
    });
}

const insertAuthenticationDetails = function(email, oneTimePassword) {
    let timestamp = utils.generateUnixTimestamp();          // Generating the UNIX timestamp for the users temperory OTP.

    // Inserting the record in the database with the generated OTP for the user or Updating the record in case if already exist.
    db.query("INSERT INTO AuthenticateUser (AuthenticateUser.email, AuthenticateUser.otp, AuthenticateUser.otp_expiration) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp = ?, otp_expiration = ?", [email, oneTimePassword, timestamp, oneTimePassword, timestamp], (err, result, fields) => {
        if(err) {
            console.log(err);
            return false;
        }
    });
    return true;
}

exports.createUserProfile = (req, res, next) => {
    // Fields retrieved from the request body sent by the user.
    const username = req.body.name;                          // username of the user.
    const password = req.body.password;                      // password is the hashed string sent from the client/user.
    const email = req.body.email;                      // location is the actual location of user that he entered.
    const oneTimePassword = req.body.oneTimePassword;        // OTP is the value used passed by user to verify his/her account.

    // Hashing the password to store it in the database.
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Getting the user from database to compare it with the OTP obtain from the user and checking whether or not if it's expired.
    db.query("SELECT AuthenticateUser.email FROM AuthenticateUser WHERE AuthenticateUser.email = ? AND AuthenticateUser.otp = ? AND otp_expiration >= UNIX_TIMESTAMP()", [email, oneTimePassword])
    .then(([result, constraint]) => {
        if(result[0].email) {
            // Inserting the user registration details in the database.
            db.query("INSERT INTO User (User.email, User.password, User.name) values (?, ?, ?)", [email, hashedPassword, username])
            .then(result => {
                // Returning the response with the success message with status code 201.
                return res.status(201).json({
                    name: username,
                    email: email
                });
            })
            .catch(err => {
                // Returning the error response of 501 in case of the failure.
                console.log(err);
                res.status(500).json({
                    message: 'user already exists'
                });
            });
        }
    })
    .catch(err => {
        console.log(err);
        // Returning the error response of 501 in case of the failure.
        res.status(500).json({
            message: 'OTP expired. Please try again.'
        });
    });
}

exports.deleteUser = (req, res, next) => {
    const email = req.body.email;
    const password = crypto.createHash('sha256').update(req.body.password).digest('hex');

    db.query("DELETE FROM User WHERE email = ? AND password = ?", [email, password])
    .then(result => {
        if(result[0].affectedRows > 0) {
            res.status(201).json({
                message: 'successfully deleted the account'
            });
        } else {
            throw Error('User does not exists');
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            message: 'failed to delete user account'
        });
    })
}

exports.validateUserProfile = (req, res, next) => {
    // Fields retrieved from the request body from the user.
    const email = req.body.email;              // name of the user.
    const password = req.body.password;        // password of the user.

    // Hashing the password sent by the user to check with the actual
    // password stored in the database.
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Validating the user with its respected username and password.
    db.execute("SELECT User.email, User.name FROM User WHERE User.email = ? AND User.password = ?", [email, hashedPassword])
    .then(([rows, constraints]) => {
        // Checking if the data provided by the user in the request body
        // matches the data stored in the actual database and is not empty.
        if(rows[0]) {
            const name = rows[0].name;              // Accessing the name from the database for corresponding user
            const email = rows[0].email;            // Accessing the location of the user from the database

            // Returning the success response if the username and password matches.
            return res.status(200).json({
                name: name,
                email: email
            });
        } else {
            // Throwing a error if row doesn't have any data.
            throw Error("incorrect username or password");
        }
    })
    .catch(err => {
        // Returning the error response code of 404 in case of some failure.
        // This code will execute even if the password is not found in the database.
        console.log(err);
        return res.status(404).json({
            message: 'incorrect username or password'
        });
    });
}

exports.forgotPassword = (req, res, next) => {
    // Fields retrieved from the request body from the user.
    const email = req.body.email;                           // Email address of the user.
    const password = req.body.password;                     // Password to be stored.
    const oneTimePassword = req.body.oneTimePassword;       // OTP to check with while updating in database.

    // Hashed password to be stored in the database.
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Executing the query to update the password for the provided username.
    db.execute("UPDATE User, AuthenticateUser SET User.password = ? WHERE User.email = ? AND User.email = AuthenticateUser.email AND AuthenticateUser.otp = ? AND AuthenticateUser.otp_expiration >= UNIX_TIMESTAMP()", [hashedPassword, email, oneTimePassword])
    .then(result => {
        // Throwing error if password was not updated.
        if(result[0].affectedRows === 0) {
            throw new Error('Failed to update the password');
        }

        // Sending the email as response to the client if password
        // was successfully changed.
        res.status(200).json({
            email: email
        });
    })
    .catch(err => {
        // Printing the error to the console and sending the failure response
        // to the client.
        console.log(err);
        res.status(500).json({
            message: 'Failed to update the password'
        })
    });
}

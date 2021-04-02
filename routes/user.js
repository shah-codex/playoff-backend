const express = require('express');

const userController = require(__dirname + '/../controllers/user.js');

const router = express.Router();

router.post('/register', userController.createUserProfile);

router.post('/login', userController.validateUserProfile);

router.post('/authenticate', userController.authenticateUser);

router.delete('/remove', userController.deleteUser);
module.exports = router;

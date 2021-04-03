const express = require('express');

const teamController = require(__dirname + '/../controllers/team.js');

const router = express.Router();

router.post('/create', teamController.createTeam);

router.post('/join', teamController.joinTeam);

router.delete('/unjoin', teamController.unjoinTeam);

module.exports = router;

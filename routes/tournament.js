const express = require('express');

const router = express.Router();

const tournamentController = require(__dirname + '/../controllers/tournament.js');

router.put('/create', tournamentController.createTournament);

router.post('/join', tournamentController.joinTournament);

router.post('/unjoin', tournamentController.unjoinTournament);

router.delete('/delete', tournamentController.deleteTournament);

router.post('/update', tournamentController.updateTournament);

router.get('/:location', tournamentController.getTournaments);

router.get('/id/:tournament', tournamentController.getTournament);

module.exports = router;

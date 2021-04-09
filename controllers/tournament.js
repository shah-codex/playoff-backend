const crypto = require('crypto');

const db = require(__dirname + '/../database/playoff');

// Create a tournament and store it in the database.
exports.createTournament = (req, res, next) => {
    // Extracting all the data sent from the user in the body of the request.
    const title = req.body.title;                       // Title of the tournament.
    const game = req.body.game;                         // Name of the sport that the tournament belongs to.
    const minimumPlayers = req.body.minPlayers;         // Minimum players required in a team to participate in this tournament.
    const maximumPlayers = req.body.maxPlayers;         // Maximum number of players in a team that can participate in this tournament.
    const minimumTeams = req.body.minTeams;             // Minimum number of teams that will participate in this tournament.
    const maximumTeams = req.body.maxTeams;             // Maximum number of teams that can participate in this tournament.
    const location = req.body.location;                 // Location of the tournament i.e. City.
    const startDate = req.body.startDate;               // The date at which the tournament will start.
    const endDate = req.body.endDate;                   // The date at which the tournament will end.
    const description = req.body.description;           // Description related to the tournament eg. rules, venue, etc.
    const user = req.body.user;                         // The username/email of the user that created this tournament.

    // Unique ID of the tournament generated through hash function SHA-256.
    const id = crypto.createHash('sha256').update((+new Date()).toString() + title).digest('hex');

    // Inserting the tournament into the database.
    db.query("INSERT INTO Tournament (Tournament._id, Tournament.title, Tournament.game, Tournament.min_players, Tournament.max_players, Tournament.min_teams, Tournament.max_teams, Tournament.location, Tournament.start_date, Tournament.end_date, Tournament.description, Tournament.creator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, title, game, minimumPlayers, maximumPlayers, minimumTeams, maximumTeams, location, startDate, endDate, description, user])
    .then(result => {
        console.log(result);
        // Checking if any rows were inserted in the database.
        if(result[0].affectedRows === 0) {
            // Throwing an Error message if no rows were affected by firing this query.
            throw new Error('failed to create tournament');
        }

        // Sending success respone if the provided tournament was successfully inserted
        // into the database.
        res.status(201).json({
            message: 'successfully created a tournament',
            tournament: {
                _id: id,
                title: title,
                game: game,
                minimumPlayers: minimumPlayers,
                maximumPlayers: maximumPlayers,
                mimimumTeams: minimumTeams,
                maximumTeams: maximumTeams,
                location: location,
                startDate: startDate,
                endDate: endDate,
                description: description,
                user: user
            }
        });
    })
    .catch(err => {
        // Sending a failure message response with status code of 500 in case
        // if failed to insert tournament into the database.
        console.log(err);
        res.status(500).json({
            message: 'failed to create tournament'
        });
    });
}

exports.joinTournament = (req, res, next) => {
    // Extracting the data provided from the request body by the client.
    const tournamentId = req.body.tournament;       // The ID of the tournament to which a user wants to participate.
    const teamName = req.body.team;                 // The name of the team that the user(captain) belongs to.

    // Updating the database to provide participated tournament for a team.
    db.query("UPDATE Team SET Team.tournament = ? WHERE Team.name = ? AND Team.tournament IS NULL AND Team.playing BETWEEN (SELECT Tournament.min_players FROM Tournament WHERE Tournament._id = ?) AND (SELECT Tournament.max_players FROM Tournament WHERE Tournament._id = ?) AND (SELECT IF(teams_participated < max_teams, TRUE, FALSE) FROM Tournament)", [tournamentId, teamName, tournamentId, tournamentId])
    .then(result => {
        // Checking the number of rows updated/affected.
        if(result[0].affectedRows === 0) {
            // Throwing an error in case if no records were updated.
            throw new Error('Invalid teamName');
        }

        // Returning true to the next promise if records updated were more than 0.
        return true;
    })
    .then(result => {
        if(result) {
            // Updating the database to increment the participating teams by 1.
            db.query("UPDATE Tournament SET Tournament.teams_participated = Tournament.teams_participated + 1")
            .then(result => {
                // Sending success response if the tournament was joined by a team.
                res.status(201).json({
                    message: 'successfully joined the tournament',
                    tournament: {
                        tournamentId: tournamentId,
                        team: teamName
                    }
                });
            })
            .catch(err => {
                // Error response with status 500 if the team was not successfully joined.
                console.log(err);
                res.status(500).json({
                    message: 'failed to update the tournament record'
                })
            });
        }
    })
    .catch(err => {
        // Sending error response if the team has insufficient or more players than
        // required by the tournament.
        console.log(err);
        res.status(500).json({
            message: 'Insufficient or more playing players in the team'
        });
    });
}

exports.unjoinTournament = (req, res, next) => {
    const tournamentId = req.body.tournament;
    const teamName = req.body.team;

    db.query("UPDATE Teams SET Teams.tournament = NULL WHERE Team.name = ? AND Team.tournament = ?", [teamName, tournamentId])
    .then(result => {
        if(result[0].affectedRows === 0) {
            throw new Error('Invalid team name');
        }
    })
    .then(() => {
        db.query("UPDATE Tournament SET Tournament.teams_participated = Tournament.teams_participated - 1 WHERE Tournament._id = ?", [tournamentId])
        .then(result => {
            if(result[0].affectedRows === 0) {
                throw new Error('Failed to unjoin the tournament');
            }

            res.status(200).json({
                message: 'Successfully unjoined the tournament'
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                message: 'failed to unjoin the tournament'
            });
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            message: 'Invalid team name'
        });
    });
}

// Deleting user from a tournament.
exports.deleteTournament = (req, res, next) => {
    // Extracting the data from the users request body.
    const user = req.body.user;                     // The user who created the tournament i.e. creator.
    const tournamentId = req.body.tournament;       // The tournament ID to delete.

    // Deleting the tournament based on the tournament ID and user.
    db.query("DELETE FROM Tournament WHERE Tournament._id = ? AND Tournament.creator = ?", [tournamentId, user])
    .then(result => {
        // Checking if any records were deleted or not.
        if(result[0].affectedRows === 0) {
            // Throwing error in case if no rows/records were deleted.
            throw new Error('Failed to delete tournament');
        }

        // Returning true to next promise if the record were successfully deleted.
        return true;
    })
    .then(result => {
        if(result) {
            // Updating the playing players to false after deleting the tournament.
            db.query("UPDATE Player SET Player.is_playing = FALSE WHERE Player.team IN (SELECT Team.name FROM Team WHERE Team.tournament = ?)", [tournamentId])
            .then(result => {
                // Returning true to next promise on successful update of players state.
                return true;
            })
            .then(result => {
                if(result) {
                    // Updating the team's tournament to null after deleting the tournament.
                    db.query("UPDATE Team SET Team.tournament = NULL WHERE Team.tournament = ?", [tournamentId])
                    .then(result => {
                        // Sending successful response if the tournament was successfully deleted.
                        res.status(200).json();
                    })
                    .catch(err => {
                        // Error if there was some problem to update the team's participating tournament.
                        console.log(err);
                    });
                }
            })
            .catch(err => {
                // Sending the failed message if the tournament was not deleted.
                console.log(err);
                res.status(500).json({
                    message: 'failed to delete the tournament'
                });
            });
        }
    })
    .catch(err => {
        // Sending the failed message if the tournament was not successfully deleted.
        console.log(err);
        res.status(500).json({
            message: 'failed to delete the tournament'
        });
    });
}

exports.updateTournament = (req, res, next) => {
    // Extacting the parameters from the body of the clients request.
    const tournamentId = req.body.tournament;           // Tournament ID to be updated
    const user = req.body.creator;                      // Creator of the tournament i.e. email of the user.

    const title = req.body.title;                       // Title to update to.
    const game = req.body.game;                         // Game to update to.
    const minimumPlayers = req.body.minPlayers;         // New minimum players to be displayed.
    const maximumPlayers = req.body.maxPlayers;         // New maximum players to be displayed.
    const minimumTeams = req.body.minTeams;             // New minimum teams to participate.
    const maximumTeams = req.body.maxTeams;             // New Maximum teams to participate.
    const location = req.body.location;                 // Location of the tournament.
    const startDate = req.body.startDate;               // New starting date of the tournament.
    const endDate = req.body.endDate;                   // New ending date of the tournament.
    const description = req.body.description;           // new Description of the tournament.

    // Updating the tournament base on the specified tournament ID and creator.
    db.query("UPDATE Tournament SET Tournament.title = ?, Tournament.game = ?, Tournament.min_players = ?, Tournament.max_players = ?, Tournament.min_teams = ?, Tournament.max_teams = ?, Tournament.start_date = ?, Tournament.end_date = ?, Tournament.description = ? WHERE Tournament._id = ? AND Tournament.creator = ?", [title, game, minimumPlayers, maximumPlayers, minimumTeams, maximumTeams, startDate, endDate, description, tournamentId, user])
    .then(result => {
        // Checking if any records were updated.
        if(result[0].affectedRows === 0) {
            // Throwing error if no record were updated.
            throw new Error('Failed to update tournament please try again later');
        }

        // Sending response back to the user containing the array of results from database.
        res.status(200).json({
            message: 'Successfully updated the tournament'
        });
    })
    .catch(err => {
        // Sending failed response with status code 500 in case of failure.
        console.log(err);
        res.status(500).json({
            message: 'Failed to update tournament. please try again later'
        });
    });
}

exports.getTournaments = (req, res, next) => {
    // Extracting the location from the request body send by the client.
    const location = req.params.location;

    // Generating the current date in unix timestamp.
    const currentDate = Math.trunc(+new Date() / 1000);

    // Obtaining the tournaments for the given location and greater than the current timestamp.
    db.execute("SELECT Tournament._id 'tournament_id', Tournament.title, Tournament.game, Tournament.min_players, Tournament.max_players, Tournament.start_date FROM Tournament WHERE Tournament.start_date > ? AND location = ?", [currentDate, location])
    .then(([result, fields]) => {
        // Checking if the length of the result or rows.
        if(result.length === 0) {
            // Throwing error if there were no tournaments.
            throw new Error('No tournament to display for the current location');
        }

        // Sending the response back to client in case of success with status code 200.
        res.status(200).json(result);
    })
    .catch(err => {
        // Sending error response if there were no tournaments.
        console.log(err);
        res.status(500).json({
            message: 'No tournament to display for the current location'
        });
    });
}

exports.getTournament = (req, res, next) => {
    // Extracting the provided data from the request body.
    const tournamentId = req.params.tournament;         // Tournament ID of the tournament to retrive data of.
    const location = req.params.location;               // Location of the tournament to be held at.

    // Obtaining the tournament based on the tournament ID and location of the tournament.
    db.execute("SELECT Tournament._id 'tournament_id', Tournament.title, Tournament.game, Tournament.min_players, Tournament.max_players, Tournament.max_Teams, Tournament.min_Teams, Tournament.start_date, Tournament.end_date, Tournament.description, User.name FROM Tournament INNER JOIN User ON User.email = Tournament.creator WHERE Tournament._id = ? AND Tournament.location = ?", [tournamentId, location])
    .then(([result, fields]) => {
        // Checking the return rows/result.
        if(result.length === 0) {
            // Throwing error if the return tournament row was not present or has already started.
            throw new Error('No tournaments to display');
        }

        // Returning the response back to the user containing the tournament data in case
        // if the tournament was successfully received.
        res.status(200).json(result);
    })
    .catch(err => {
        // Sending error message in response with status code 500 in case of no tournament
        // was found in the given location or entirely.
        console.log(err);
        res.status(500).json({
            message: 'No tournament found with provided name'
        })
    });
}

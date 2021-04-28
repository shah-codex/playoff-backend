const db = require(__dirname + '/../database/playoff.js');

// Creation of a team.
exports.createTeam = (req, res, next) => {
    // Extracting the values to the corresponding keys from the request
    // sent by the user to create the team. also in short called team data.
    const teamName = req.body.name;             // Name of the team by which to register.
    const teamCaptain = req.body.captain;       // The captain/creator of the team.
    let tournamentId = req.body.tournament;     // The tournament ID of the tournament to which the team will participate.

    // Checking if the player already has joined another team.
    db.execute("SELECT Player.name FROM Player WHERE Player.name = ?", [teamCaptain])
    .then(result => {
        // If the result of the query returns the result of a player then
        // he can't join another team because he is already in a team.
        if(result[0].length > 0) {
            // Throwing an error in case of player already exists
            // to terminate the execution.
            throw new Error('user already in a team');
        }
    })
    .then(result => {
        // Creating a team by storing the information into the database in
        // case if player does not exists in any team.
        db.query("INSERT INTO Team (Team.name, Team.captain, Team.tournament) VALUES (?, ?, ?)", [teamName, teamCaptain, tournamentId])
        .then(result => {
            return result;
        })
        .then(result => {
            // Inserting the user details who has created a new team into the database.
            db.query("INSERT INTO Player ( Player.name, Player.team ) VALUES (?, ?)", [teamCaptain, teamName])
            .then(result => {

                // If there were no rows updated that means there has not been
                // any record inserted into the database so throwing an error.
                if(result[0].affectedRows === 0) {
                    throw new Error('failed to join team');
                }

                // If the error is not thrown then this code will execute.
                // Returning the response to the user about the created Team.
                res.status(201).json({
                    message: 'Team created successfully',
                    team: {
                        name: teamName,
                        captain: teamCaptain,
                        tournament: tournamentId,
                        playerJoined: 1,
                        playing: 0
                    }
                });
            })
            .catch(err => {
                // If failed to join the own created team sending failure
                // response to the user.
                console.log(err);
                res.status(500).json({
                    message: 'failed to join team'
                });
            });
        })
        .catch(err => {
            // If the team name already exists, sending 'team already exists'
            // response to the user.
            console.log(err);
            res.status(500).json({
                message: 'team name already exists'
            });
        });
    })
    .catch(err => {
        // Returning the response of to the user that he is already
        // in a team.
        console.log(err);
        res.status(500).json({
            message: 'user already in a team'
        })
    });
}

// Joining a team that already exists.
exports.joinTeam = (req, res, next) => {
    // Extracting the values to the corresponding keys from the request body
    // sent by the user to join the team.
    const teamName = req.body.team;         // Name of the team to join.
    const playerName = req.body.name;       // Name/Email of the player to join the team.

    // Inserting the player details who wan't to join the team into the database.
    // Throws an error in case if the player already exists in any team.
    db.query("INSERT INTO Player ( Player.name, Player.team ) VALUES (?, ?)", [playerName, teamName])
    .then(result => {
        // If the insert statement is successful then the response is sent back
        // to the user.
        if(result[0].affectedRows > 0) {
            res.status(201).json({
                name: playerName,
                team: teamName
            });

            // Incrementing the total players in the corresponding team by one.
            db.query("UPDATE Team SET Team.joined_players = Team.joined_players + 1 WHERE Team.name = ?", [teamName])
            .then(result => {
                // Successfully joined the team.
                console.log('success');
            })
            .catch(err => {
                // Error updating the team participatent details.
                // Situation unlikely to occur so, not handling the response status here.
                console.log(err);
            })
        }
    })
    .catch(err => {
        // Sending response 'player is already in a team' in case of if the
        // player has already joined the other team.
        console.log(err);
        res.status(500).json({
            message: 'player is already in a team'
        })
    });
}

// Unjoining the team if the user is in one.
exports.unjoinTeam = (req, res, next) => {
    // Extracting the data from the join request.
    const teamName = req.body.team;         // The name of the team to join.
    const playerName = req.body.user;       // The name/email of the player to join the team.

    // Executing the query to retrieve the captain of the specified team.
    db.execute("SELECT Team.captain FROM Team WHERE Team.name = ?", [teamName])
    .then(([result, fields]) => {
        // Checking if the player that is requesting to unjoin the team is a captain or not.
        if(result[0].captain === playerName) {
            // Obtaining the next player joined after the captain in the team.
            db.execute("SELECT Player.name FROM Player WHERE Player.team = ? ORDER BY Player.joined_date ASC", [teamName])
            .then(([result, fields]) => {
                // If the requesting player is a captain then, setting the captain
                // to the next player joined the team after captain.
                db.query("UPDATE Team SET Team.captain = ? WHERE Team.name = ?", [result[1].name, teamName])
                .then(result => {
                    // Checking if the captain is updated or not.
                    if(result[0].affectedRows > 0) {
                        return true;        // Returning true if the player updated successfully.
                    }

                    // Throwing the error if the captain is not updated as he/she
                    // is the last player left in the team.
                    throw new Error('failed to update captain');
                })
                .catch(err => {
                    console.log(err);
                });
            })
            .catch(err => {
                // Deleting the whole team because all the players form the team
                // has left the team and the name can be reused by others to create
                // a new team.
                console.log(err);
                db.query("DELETE FROM Team WHERE name = ?", [teamName])
                .then(result => {
                    // Deleted team successfully.
                    console.log(result);
                })
                .catch(err => {
                    // Error deleting the team.
                    console.log(err);
                });
            });
        }
        // Returning true to pass it to the next promise (optional).
        return true;
    })
    .then(result => {
        // Retrieving the player information of whether or not the player is
        // in the playing team or not.
        db.execute("SELECT Player.is_playing FROM Player WHERE Player.name = ?", [playerName])
        .then(([result, fields]) => {
            // Returning the value of the observing player to the next promise.
            return result[0].is_playing;
        })
        .then(isPlaying => {
            // Deleting the user from the database for it's respected team.
            db.query("DELETE FROM Player WHERE Player.name = ? AND Player.team = ?", [playerName, teamName])
            .then(result => {
                // Checking if the player is deleted successfully or not.
                if(result[0].affectedRows === 0) {
                    // Throwing error if the player does not exists.
                    throw new Error('invalid username');
                }

                // Updating the team players count and playing count in case of the
                // player has successfully unjoined the team.
                db.query("UPDATE Team SET Team.joined_players = Team.joined_players - 1, Team.playing = IF(?, Team.playing - 1, Team.playing) WHERE Team.name = ?", [isPlaying, teamName])
                .then(result => {
                    // Sending the json response to the user if the player has successfully
                    // unjoined the team.
                    res.status(201).json({
                        message: 'Deleted user successfully',
                        player: {
                            team: teamName,
                            user: playerName
                        }
                    });

                    // Returning isPlaying to the next promise.
                    return isPlaying;
                })
                .then((isPlaying) => {
                    if(isPlaying) {
                        // Updating the tournament state if the unjoined player is
                        // in the playing team and also that team has joined a tournament.
                        db.query("UPDATE Team INNER JOIN Tournament ON Team.tournament = Tournament._id SET Team.tournament = NULL, Tournament.teams_participated = Tournament.teams_participated - 1 WHERE NOT Team.tournament IS NULL AND Team.name = ? AND NOT Team.playing BETWEEN Tournament.min_players AND Tournament.max_players", [teamName])
                        .then(result => {
                            // Success, do nothing.
                        })
                        .catch(err => {
                            // Print the error.
                            console.log(err);
                        });
                    }
                })
                .catch(err => {
                    // In case of some failure to update the player count for the team,
                    // sending the failed message to the user.
                    console.log(err);
                    res.status(500).json({
                        message: 'failed to update user count for a team'
                    });
                });
            })
            .catch(err => {
                // In case if the player name was not valid for the corresponding team,
                // sending 'invalid team name' response to the user.
                console.log(err);
                res.status(500).json({
                    message: 'invalid team name'
                });
            });
        })
        .catch(err => {
            // In case if the player name was not valid,
            // sending 'invalid player name' response to the user.
            console.log(err);
            res.status(500).json({
                message: 'invalid player name'
            });
        });
    })
    .catch(err => {
        // In case of invalid team name, sending 'invalid team name'
        // response to the user.
        console.log(err);
        res.status(500).json({
            message: 'invalid team name'
        });
    });
}

// Retrieving team players data for the requested team.
exports.teamPlayers = (req, res, next) => {
    const teamName = req.params.team;       // Name of the team extracted from the query parameter.

    // Query to get the player names corresponding to the given team.
    db.execute("SELECT User.name, User.email FROM User INNER JOIN Player ON User.email = Player.name WHERE Player.team = ?", [teamName])
    .then(([result, fields]) => {
        // If there are no players in the team or some non-existing team name
        // is entered then throwing an error.
        if(result.length === 0) {
            throw new Error('Empty result set');
        }

        // Continuing with the retrieved players and sending the response back
        // to the client/user.
        res.status(200).json(result);
    })
    .catch(err => {
        // In case of some error sending failure response with status code 500.
        console.log(err);
        res.status(500).json({
            message: 'failed'
        });
    })
}

exports.getTeams = (req, res, next) => {
    db.execute("SELECT Team.name, Team.tournament, Team.joined_players, Team.playing FROM Team")
    .then(([result, fields]) => {
        if(result.length === 0) {
            throw new Error('No Teams to show');
        }

        res.status(200).json(result);
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            message: 'failed'
        });
    });
}

exports.getPlayer = (req, res, next) => {
	const playerName = req.params.playerName;

	db.execute("SELECT Player.name, Player.team FROM Player WHERE Player.name = ?", [playerName])
	.then(([result, constraints]) => {
		if(result.length === 0) {
			throw new Error('Player not joined the team');
		}

		res.status(200).json(result[0]);
	})
	.catch(err => {
		console.log(err);
		res.status(500).json({
			message: 'failed to get player'
		});
	});
}

exports.getTeam = (req, res, next) => {
    const teamName = req.params.teamName;

    db.execute("SELECT Team.name, Team.captain, Team.tournament, Team.joined_players, Team.playing FROM Team WHERE Team.name = ?", [teamName])
    .then(([result, constraints]) => {
        if(result.length === 0) {
            throw new Error('Team name does not exists');
        }

        res.status(200).json(result[0]);
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            message: 'failed to retrieve team'
        });
    });
}

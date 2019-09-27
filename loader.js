function getUpdatedEloRatings(winnerRating, loserRating)
{
    var k = 32;
    var winnerProb = 1 / ( 1 + Math.pow(10, (loserRating - winnerRating) / 400));
    var loserProb = 1 / ( 1 + Math.pow(10, (winnerRating - loserRating) / 400));

    var winnerUpdatedRating = winnerRating + k*(1-winnerProb);
    var loserUpdatedRating = loserRating + k*(0-loserProb);

    return [winnerUpdatedRating, loserUpdatedRating];
}

function get_players(jsonContent)
{
    var entries = jsonContent['feed']['entry'];
    var players = {}

    for (var i=4; i < entries.length; i=i+4)
    {
        try {
            var id = entries[i]['content']['$t'];
            var name = entries[i+1]['content']['$t'];
            var rating = entries[i+2]['content']['$t'];

            players[id] = {"name": name, "ratings": [parseInt(rating)], "game_count": 0, "points_won": 0, 'active': true}
        } catch (err) {
            console.log("ignore row: ", i,  err)
        }
    }

    return players;
}

function build_empty_stats(players)
{
    var stats = {};

    // find the pairs
    var players_list = Object.keys(players);

    for (var i=0; i < players_list.length; i++)
    {
        for (var j=i+1; j < players_list.length; j++)
        {
            var player1 = players_list[i];
            var player2 = players_list[j];

            var key = [player1, player2].sort().join();

            stats[key] = {
                "name1": players[player1]['name'],
                "name2": players[player2]['name'],
                "count": 0,
                "balance": 0,
                "wins": 0,
                "draws": 0,
                "losses": 0 
            }
        }
    }

    return stats;
}

function get_game_data(jsonContent, players, stats)
{
    var entries = jsonContent['feed']['entry'];
    var games = [];

    for (var i=3; i < entries.length; i=i+3)
    {
        try {
            //console.log(entries[i+2]);
            var date = entries[i]['content']['$t'];
            var winner = entries[i+1]['content']['$t'];
            var loser = entries[i+2]['content']['$t'];

            if (!(winner in players) || !(loser in players))
            {
                console.log(winner, " or ", loser, " not in players..?");
                continue;
            }

            games.push({
                "date": date,
                "name1": players[winner]['name'],
                "name2": players[loser]['name'],
                "length": 0,
                "result": 1.0
            });

            var winnerRating = players[winner]['ratings'][0];
            var losingRating = players[loser]['ratings'][0];

            players[winner]['game_count'] += 1;
            players[loser]['game_count'] += 1;

            players[winner]['points_won'] += 1;
            var update = getUpdatedEloRatings(winnerRating, losingRating);

            players[winner]['ratings'].unshift(update[0]);
            players[loser]['ratings'].unshift(update[1]);
            
            var statskey = [winner, loser].sort().join();

            var winnerLoserStats = stats[statskey];

            winnerLoserStats['count'] += 1

            if (players[winner]['name'] == winnerLoserStats['name1'])
            {
                winnerLoserStats['wins'] += 1;
            } else {
                winnerLoserStats['losses'] += 1;
            }

            winnerLoserStats['balance'] = winnerLoserStats['wins'] - winnerLoserStats['losses'];

            stats[statskey] = winnerLoserStats;
        } catch(err) {
            console.log('skipping row due to ', err)
        }
    }

    return [players, games, stats];
}

function load_games()
{
	const GAMES_URL = "https://spreadsheets.google.com/feeds/cells/1GqkA-JE7a7TXrD2_OazaqU1t0FjMdXc2wO3CP1MiTCU/1/public/full?alt=json";
	const PLAYER_URL =  "https://spreadsheets.google.com/feeds/cells/1GqkA-JE7a7TXrD2_OazaqU1t0FjMdXc2wO3CP1MiTCU/2/public/full?alt=json";
	
	var playersRequest = fetch(PLAYER_URL).then(function(response) {
		return response.json();
	});

	var gamesRequest = fetch(GAMES_URL).then(function(response) {
		return response.json();
	});

	Promise.all([playersRequest,gamesRequest]).then(function(values){
		var playersSheet = values[0];
        var gamesSheet = values[1];
        
        var players = get_players(playersSheet);
        var stats = build_empty_stats(players);
        var game_data = get_game_data(gamesSheet, players, stats);

        players = game_data[0];
        var games = game_data[1];
        stats = game_data[2];

        window.players= Object.keys(players).map(function(key){
            return players[key];
        });
        
        window.games = games;
        window.stats = Object.keys(stats).map(function(key){
            return stats[key];
        });

        document.getElementById("loader").style.display = "none";
        console.log(players, games, stats);

        build();         
	}).catch(function(err){
		console.log(err);
	});
}

GameTokens = new Meteor.Collection("GameTokens");
Games = new Meteor.Collection("Games");

Games.helpers({
	playerIsPicked(playerNumber) {
		return _.isString(this.getPlayer(playerNumber).userId);
	},

	getPlayer(playerNumber) {
		return this.players[playerNumber-1];
	},

	getCurrentPlayer() {
		return this.getPlayer(this.currentPlayer);
	},
	isUsersTurn(userId) {
		return userId === this.getCurrentPlayer().userId;
	}
});


if(Meteor.isServer) {
	Meteor.publishComposite("game", function(game_id){
		return {
			find() {
				return Games.find({_id:game_id});
			},
			children: [{
				find(game) {
					return GameTokens.find({game_id});
				}
			}]
		}
	});
}


GameTokens = new Meteor.Collection("GameTokens");
Games = new Meteor.Collection("Games");


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


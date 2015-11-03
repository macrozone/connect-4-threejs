if(Meteor.isClient) {
	Template.game_aPlayer.helpers({
		active(number) {
			return this.player.number === this.game.currentPlayer
		},
		name(){
			if(this.player.userId === Meteor.userId())
			{
				return "That's you!";
			}
			else 
			{
				if(this.player.number === 1){
					return "A mysterious stranger";
				}
				else
				{
					return "An unknown opponent";
				}
			}
		}
	});

	Template.game_aPlayer.events({
		'click .btn-pick': function (event, template) {
			let {game, player} = template.data;
			Meteor.call("pickPlayer", {gameId: game._id, playerNumber: player.number});
		}
	});
}
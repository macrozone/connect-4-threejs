if(Meteor.isClient) {
	Template.game_aPlayer.helpers({
		active(number) {
			return this.player.number === this.game.currentPlayer
		},
		itsMe(){
			return this.player.userId === Meteor.userId();
		},
		name(){
			if(_.isString(this.player.userId))
			{
				let name = Meteor.users.findOne(this.player.userId).name;
				if(_.isString(name) && name.length > 0){
					return name;
				}
			}
			// fallback
			if(this.player.number === 1){
				return "A mysterious stranger";
			}
			else
			{
				return "An unknown opponent";

			}
		}
	});

	Template.game_aPlayer.events({
		'click .btn-pick': function (event, template) {
			let {game, player} = template.data;
			Meteor.call("pickPlayer", {gameId: game._id, playerNumber: player.number});
		},
		'keyup .playerNameInput, change .playerNameInput': function(event, template){
			let value =  $(event.currentTarget).val();

			if(value.length > 0)
				Meteor.call("setUserName", value);
		}
	});
}

Meteor.methods({
	setUserName(name){
		Meteor.users.update({_id: this.userId}, {$set: {name}});

	}});
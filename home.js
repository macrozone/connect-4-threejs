Router.route("/", {name: "home"});

if(Meteor.isClient) {
	Template.home.events({
		'click .btn-create-new-game': function () {
			Meteor.call("createNewGame", (error, _id) => Router.go("game", {_id}));

		}
	});	
	Template.home.onCreated(function(){
		this.subscribe("games");
	});
	Template.home.helpers({
		gamesOpen() {
			return Games.find({finished: {$ne: true}, closed: {$ne: true}});
		},
		gamesRunning() {
			return Games.find({finished: {$ne: true}, closed: true});
		}
		,
		gamesFinished() {
			return Games.find({finished: true});
		}
	});
}

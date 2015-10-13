Router.route("/", {name: "home"});

if(Meteor.isClient) {
	Template.home.events({
	'click .btn-create-new-game': function () {
		Meteor.call("createNewGame", (error, _id) => Router.go("game", {_id}));

	}
});	
}

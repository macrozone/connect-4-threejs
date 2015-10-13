
var WIDTH = 8;
var HEIGHT = 8;

Router.route("/game/:_id", {
	name: "game",
	data() {
		return {
			game: Games.findOne(this.params._id)
		};
	},
	layoutTemplate: "layout",
	subscriptions(){
		return Meteor.subscribe("game", this.params._id);
	}
});




if(Meteor.isClient) {

	Template.game.helpers({
		active(number) {
			return number === this.currentPlayer
		}
	});

	Template.game_canvas.events({
		'click .btn-doTurn': function (event, template) {
			Meteor.call("doTurn", {x: 0, game_id: template.data._id}, (error, tokenId) => {
				let token = template.three.tokensOnScene.get(tokenId);
				let {x,y,z} = token.position;
				template.three.controls.center.set(x,y,z);
				template.three.controls.update()
			});
		}
	});

	
	Template.game_canvas.onRendered(function(){
		let tokensOnScene = new Map();
		let hoverTokens = [];

		let renderer = new THREE.WebGLRenderer({antialias:true});
		let scene = new THREE.Scene();

		let camera = new THREE.PerspectiveCamera(75, this.$(".container").width()/this.$(".container").height(), 0.1, 1000);
		window.camera = camera;
		window.camera.position.set(300,0,300);
		let controls = new THREE.OrbitControls(camera, renderer.domElement);

		this.three = {tokensOnScene, camera, renderer, scene, controls};

		renderer.setClearColor( 0xffffff, 1 );
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(this.$(".container").width(), this.$(".container").height());
		this.$(".container").append(renderer.domElement);

		scene.add(new THREE.AmbientLight(0x505050));
		let light = new THREE.SpotLight(0xffffff, 1.5);
		light.position.set(0,500,2000);
		light.castShadow = true;
		scene.add(light);

		// add fake hover tokens
		for(let x = 0; x<WIDTH; x++) {
			let token = Helpers.createHoverToken();
			hoverTokens[x] = token;
			token.position.set(...Helpers.getScaledPosition({x,y:0}));
			
			scene.add(token);
		}

		let updateHoverTokens = () =>{
			for(let x = 0; x<WIDTH; x++) {
				let y = Helpers.getNextFreeYPosition({game_id:this.data._id, x});
				let [newX, newY, newZ] = Helpers.getScaledPosition({x, y});
				hoverTokens[x].position.setY(newY);

			}
		}


	 	// main render loop
	 	render = (time) => {
	 		if(!this.view.isDestroyed) {
	 			requestAnimationFrame(render);
	 			renderer.render(scene, camera);
	 			//TWEEN.update(time);
	 		}
	 	}
	 	render();


	 	let observeHandle = GameTokens.find({game_id: this.data._id}).observeChanges({
	 		added(id, fields) {
	 			let token = Helpers.createToken({playerNumber: fields.player});
	 			token.position.set(... Helpers.getScaledPosition(fields));
	 			tokensOnScene.set(id, token);
	 			scene.add(token);
	 			updateHoverTokens();

	 		},
	 		
	 		changed(id, fields) {
	 			// usually not happens in connect4, but still...
	 			let token = tokensOnScene.get(id);
	 			token.position.set(...Helpers.getScaledPosition(fields));
	 			updateHoverTokens();
	 		},
	 		removed(id) {
	 			let thing = tokensOnScene.get(id);
	 			scene.remove(thing);
	 			tokensOnScene.delete(id);

	 		}
	 	});

	 	this.view.onViewDestroyed(()=> {
	 		observeHandle.stop();
	 		tokensOnScene.clear();
	 	});


	 });
}


let SCALE = 50;
Helpers = {
	createToken({playerNumber}) {
		let geometry = new THREE.CylinderGeometry(22, 22, 10, 32 );
		let color = playerNumber === 1 ? "red" : "blue";
		let material = new THREE.MeshBasicMaterial({color});
		let token = new THREE.Mesh(geometry, material);
		token.rotateX(Math.PI/2);
		return token;
	},
	createHoverToken() {
		let geometry = new THREE.CylinderGeometry(22, 22, 10, 32 );
		let color = "yellow";
		let material = new THREE.MeshBasicMaterial({color});
		let token = new THREE.Mesh(geometry, material);
		token.rotateX(Math.PI/2);
		return token;
	},
	getScaledPosition({x,y}) {
		return [x * SCALE,y * SCALE, 0];
	},
	getLastTokenOnx({game_id, x}) {
		return GameTokens.findOne({game_id, x}, {sort: {y:-1}});
	},
	getNextFreeYPosition({game_id, x}) {
		let lastTokenOnX = GameTokens.findOne({game_id, x}, {sort: {y:-1}});
		let y = 0;
		if(lastTokenOnX) {
			y = lastTokenOnX.y+1;
		}
		return y;

	}
}


Meteor.methods({
	createNewGame() {
		let _id = Games.insert({
			currentPlayer: 1
		});
		return _id;
	},

	doTurn({game_id, x}) {

		let {currentPlayer} = Games.findOne(game_id);
		let y = Helpers.getNextFreeYPosition({game_id, x});
		let newTokenId = GameTokens.insert({game_id, x, y, player:currentPlayer});
		Games.update(game_id, {$set:{currentPlayer: (currentPlayer%2)+1}});
		return newTokenId;
	}
});




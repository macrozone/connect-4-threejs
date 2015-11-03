
var WIDTH = 8;
var HEIGHT = 8;

let SCALE = 50;

Router.route("/game/:_id", {
	name: "game",
	data() {
		return {
			game: Games.findOne(this.params._id)
		};
	},
	subscriptions(){
		return Meteor.subscribe("game", this.params._id);
	}
});




if(Meteor.isClient) {
	Session.set("deviceorientation", {alpha: 0, beta: 0, gamma: 0});
	$(window).on("deviceorientation", ({originalEvent}) => 
		Session.set("deviceorientation", {alpha: originalEvent.alpha, beta: originalEvent.beta, gamma: originalEvent.gamma}));
		

	



	var update3dMouse = function({clientX, clientY, template}) {
		// update 3d mouse position
		let {mouse, raycaster} = template.three;
		let $container =  template.$(".container");
		let offset = $container.offset();
		mouse.x = ((clientX - offset.left) / $container.width()) * 2 - 1;
		mouse.y = -((clientY -offset.top)/ $container.height()) * 2 + 1;
	}
	
	Template.game_canvas.events({

		'mousemove': function({clientX, clientY}, template) {
			update3dMouse({clientX, clientY, template});
		},
		'mouseup': function({clientX, clientY}, template) {
			update3dMouse({clientX, clientY, template});
			let {raycaster, hoverTokens, tokensOnScene, camera} = template.three;
			let intersections = raycaster.intersectObjects(hoverTokens);
			if(intersections.length > 0 && ! template.data.finished)
			{
				let {object} = intersections[0];
				if(template.data.isUsersTurn(Meteor.userId())) {
					Meteor.call("doTurn", {game_id: template.data._id, x: object.tokenX}, (error, newtokenId) => {
						let game = Games.findOne(template.data._id);
						if(game.finished) {
							if(game.getCurrentPlayer().userId === Meteor.userId())
							{
								alert("You won!!!!");
							}
							else
							{

								alert("Loser !!!!");
							}
						}
						
					});
				}else {
					alert("its not your turn");
				}

			}


		}
	
	});

	
	Template.game_canvas.onRendered(function(){
		let tokensOnScene = new Map();
		let hoverTokens = [];
		let $container = this.$(".container");
		let renderer = new THREE.WebGLRenderer({antialias:true});
		let scene = new THREE.Scene();
		let raycaster = new THREE.Raycaster();
		let camera = new THREE.PerspectiveCamera(75, $container.width()/$container.height(), 0.1, 10000);
		let controls = new THREE.OrbitControls(camera, renderer.domElement);

		camera.position.set(200,200,500);
		controls.target.set(200,200,0);
		controls.update();
		

		
		let mouse = new THREE.Vector2();
		this.three = {mouse, hoverTokens, tokensOnScene, camera, renderer, scene, controls, raycaster};
		window._three = this.three;
	
		renderer.setClearColor( 0xffffff, 1 );
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize($container.width(), $container.height());
		$container.append(renderer.domElement);

		scene.add(new THREE.AmbientLight(0x505050));
		let light = new THREE.SpotLight(0xffffff, 1.5);
		light.position.set(100,500,200);
		light.castShadow = true;
		scene.add(light);


		// add game-grid
		function createGrid(){
			function createHorizontalWall(){
				let geometry = new THREE.BoxGeometry( WIDTH * SCALE, 3, 10 );
				let material = new THREE.MeshLambertMaterial( {color: 0x333333} );
				return new THREE.Mesh( geometry, material );
			}
			function createVerticalWall(){
				let geometry = new THREE.BoxGeometry( 3, WIDTH * SCALE, 10 );
				let material = new THREE.MeshLambertMaterial( {color: 0x333333} );
				return new THREE.Mesh( geometry, material );
			}
			for(let column = 0; column <= WIDTH; column++) {
				let wall = createHorizontalWall();
				wall.position.set(SCALE*WIDTH/2,SCALE*column,0);
				scene.add(wall);
			}
			for(let row = 0; row <= HEIGHT; row++) {
				let wall = createVerticalWall();
				wall.position.set(SCALE*row,SCALE*HEIGHT/2,0);
				scene.add(wall);
			}
		
		}
		createGrid();
	

		// add fake hover tokens
		for(let x = 0; x<WIDTH; x++) {
			let token = Helpers.createHoverToken();
			hoverTokens[x] = token;
			token.position.set(...Helpers.getScaledPosition({x,y:0}));
			token.tokenX = x;
			scene.add(token);
		}

		let updateHoverTokens = () =>{
			for(let x = 0; x<WIDTH; x++) {
				let y = Helpers.getNextFreeYPosition({game_id:this.data._id, x});
				let [newX, newY, newZ] = Helpers.getScaledPosition({x, y});
				hoverTokens[x].position.setY(newY);

			}
		}

		onWindowResize = () => {
			let width = $container.width();
			let height = $container.height();
			camera.aspect = width / height;
    		camera.updateProjectionMatrix();
    		renderer.setSize(width,height);
		}
		$(window).on("resize", onWindowResize);
		this.view.onViewDestroyed(() => {$(window).off("resize", onWindowResize)});

		this.autorun(() =>{
			let {alpha, beta, gamma} = Session.get("deviceorientation");
			//console.log(controls);
			//camera.rotation.x = beta * Math.PI / 180;
			//camera.rotation.y = gamma * Math.PI / 180;
			//camera.rotation.z = alpha * Math.PI / 180;
			//camera.lookAt(controls.target);
			//controls.update()

		});
	 	// main render loop
	 	render = (time) => {
	 		if(!this.view.isDestroyed) {
	 			requestAnimationFrame(render);
	 			renderer.render(scene, camera);
	 			raycaster.setFromCamera(mouse, camera);
	 			for([id, token] of tokensOnScene) {
	 				
	 				if(token.isSolution) {
	 					token.material.opacity = 0.3;
	 				}
	 				else {
	 					token.material.opacity = 1;
	 				}
	 			}
	 			for(token of hoverTokens) {
	 				if(raycaster.intersectObject(token).length > 0)
	 					token.material.opacity = 0.5;
	 				else
	 					token.material.opacity = 0.2;
	 			}
	 			TWEEN.update(time);
	 		}
	 	}
	 	render();


	 	let observeHandle = GameTokens.find({game_id: this.data._id}).observeChanges({
	 		added(id, fields) {
	 			let token = Helpers.createToken({playerNumber: fields.player});
	 			
	 			let [x,y,z] = Helpers.getScaledPosition(fields);
	 			token.position.set(x,y+300,z);
	 			let tween = new TWEEN.Tween(token.position);
	 			tween.to({x,y,z}, 600);
	 			tween.easing(TWEEN.Easing.Cubic.In);
	 			tween.start()
	 			
	 			tokensOnScene.set(id, token);
	 			scene.add(token);
	 			updateHoverTokens();
	 			let tweenControls = new TWEEN.Tween(controls.target);
	 			tweenControls.easing(TWEEN.Easing.Quadratic.InOut);
	 			tweenControls.to({x,y,z}, 600);
	 			tweenControls.onUpdate(()=>{controls.update();});
	 			tweenControls.start();
	 			token.isSolution = fields.isSolution;
	 			
					

	 		},
	 		
	 		changed(id, fields) {
	 			// usually not happens in connect4, but still...
	 			let token = tokensOnScene.get(id);
	 			token.position.set(...Helpers.getScaledPosition(fields));
	 			updateHoverTokens();
	 			token.isSolution = fields.isSolution;
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



Helpers = {
	createToken({playerNumber}) {
		let geometry = new THREE.CylinderGeometry(22, 22, 10, 32 );
		let color = playerNumber === 1 ? "red" : "blue";
		let material = new THREE.MeshLambertMaterial({color, opacity: 1, transparent: true});
		let token = new THREE.Mesh(geometry, material);
		token.rotateX(Math.PI/2);
		return token;
	},
	createHoverToken() {
		let geometry = new THREE.CylinderGeometry(22, 22, 10, 32 );
		let color = "green";
		let material = new THREE.MeshLambertMaterial({color, opacity: 0, transparent: true});
		let token = new THREE.Mesh(geometry, material);
		token.rotateX(Math.PI/2);
		return token;
	},
	getScaledPosition({x,y}) {
		return [x * SCALE + SCALE/2,y * SCALE + SCALE/2, 0];
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


isGameOver = function({game_id, lastTokenId}) {
	let lastToken = GameTokens.findOne(lastTokenId);
	// horizontal
	function findSolution({x_before, x_after, y_before, y_after}){
		let solution = [lastToken];


		let beforeToken = true;
		let afterToken = true;

		for(let i=1;i<4;i++) {
			if(beforeToken)
				beforeToken = GameTokens.findOne({game_id, x: x_before(i), y: y_before(i), player: lastToken.player});
			if(beforeToken) { solution.push(beforeToken)};
			if(afterToken)
				afterToken = GameTokens.findOne({game_id, x: x_after(i), y: y_after(i), player: lastToken.player});
			if(afterToken) { solution.push(afterToken)};
		}
		return solution;
	};

	
	handleSolution(findSolution({
		x_before: (i) => lastToken.x-i,
		x_after: (i) => lastToken.x+i,
		y_before: (i) => lastToken.y,
		y_after: (i) => lastToken.y
	}));
	handleSolution(findSolution({
		x_before: (i) => lastToken.x,
		x_after: (i) => lastToken.x,
		y_before: (i) => lastToken.y-i,
		y_after: (i) => lastToken.y+i
	}));
	handleSolution(findSolution({
		x_before: (i) => lastToken.x-i,
		x_after: (i) => lastToken.x+i,
		y_before: (i) => lastToken.y-i,
		y_after: (i) => lastToken.y+i
	}));
	handleSolution(findSolution({
		x_before: (i) => lastToken.x-i,
		x_after: (i) => lastToken.x+i,
		y_before: (i) => lastToken.y+i,
		y_after: (i) => lastToken.y-i
	}));

	function handleSolution(tokens) {
		if(tokens.length >= 4){
			for(token of tokens) {
				GameTokens.update(token._id, {$set: {isSolution: true}});
			}
			Games.update(game_id, {$set:{finished: true, winner: lastToken.player}});
			return true;
		}
		else {
			return false;
		}
	}


}

Meteor.methods({
	createNewGame() {
		let _id = Games.insert({
			currentPlayer: 1,
			players: [
				{number: 1, userId: null},
				{number: 2, userId: null}
			]
		});
		return _id;
	},

	doTurn({game_id, x}) {

		let game = Games.findOne(game_id);
		if(game.finished) {
			throw new Meteor.Error("Game is closed");
		}
		if(!game.isUsersTurn(this.userId))
		{
			throw new Meteor.Error("its not your turn!");
		}
		let y = Helpers.getNextFreeYPosition({game_id, x});
		let newTokenId = GameTokens.insert({game_id, x, y, player:game.currentPlayer});

		if(isGameOver({game_id,lastTokenId: newTokenId})){
			console.log("won");
		}

		Games.update(game_id, {$set:{currentPlayer: (game.currentPlayer%2)+1}});
		return newTokenId;
	},

	pickPlayer({gameId, playerNumber}) {
		let game = Games.findOne(gameId);
		if(game.playerIsPicked(playerNumber))
		{
			throw new Meteor.Error("player is already picked");
		}
		let players = game.players;
		players[playerNumber-1].userId = this.userId;

		let closed = _.every(players, (player) => _.isString(player.userId));
		Games.update(game._id, {$set:{players, closed}});


	}
});




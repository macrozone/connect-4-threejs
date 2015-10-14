
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

	var update3dMouse = function({clientX, clientY, template}) {
		// update 3d mouse position
		let {mouse, raycaster} = template.three;
		let $container =  template.$(".container");
		let offset = $container.offset();
		mouse.x = ((clientX - offset.left) / $container.width()) * 2 - 1;
		mouse.y = -((clientY -offset.top)/ $container.height()) * 2 + 1;
	}
	
	Template.game_canvas.events({
		'click .btn-doTurn': function (event, template) {
			Meteor.call("doTurn", {x: 0, game_id: template.data._id}, (error, tokenId) => {
				let token = template.three.tokensOnScene.get(tokenId);
				let {x,y,z} = token.position;
				template.three.controls.center.set(x,y,z);
				template.three.controls.update()
			});
		},
		'mousemove': function({clientX, clientY}, template) {
			update3dMouse({clientX, clientY, template});
		},
		'mouseup': function({clientX, clientY}, template) {
			update3dMouse({clientX, clientY, template});
			let {raycaster, hoverTokens, tokensOnScene, camera} = template.three;
			let intersections = raycaster.intersectObjects(hoverTokens);
			if(intersections.length > 0)
			{
				let {object} = intersections[0];
				Meteor.call("doTurn", {game_id: template.data._id, x: object.tokenX}, (error, newtokenId) => {
					
				});

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

	 	// main render loop
	 	render = (time) => {
	 		if(!this.view.isDestroyed) {
	 			requestAnimationFrame(render);
	 			renderer.render(scene, camera);
	 			raycaster.setFromCamera(mouse, camera);
	 			// update mouse over
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
	 			tweenControls.start()
					

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



Helpers = {
	createToken({playerNumber}) {
		let geometry = new THREE.CylinderGeometry(22, 22, 10, 32 );
		let color = playerNumber === 1 ? "red" : "blue";
		let material = new THREE.MeshLambertMaterial({color});
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




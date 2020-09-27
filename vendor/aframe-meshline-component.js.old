/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof AFRAME === 'undefined') {
	    throw new Error('Component attempted to register before AFRAME was available.');
	}

	__webpack_require__(1);

	AFRAME.registerComponent('meshline', {
	  schema: {
	    color: { default: '#000' },
	    lineWidth: { default: 10 },
	    lineWidthStyler: { default: '1' },
	    path: {
	      default: [
	        { x: -0.5, y: 0, z: 0 },
	        { x: 0.5, y: 0, z: 0 }
	      ],
	      // Deserialize path in the form of comma-separated vec3s: `0 0 0, 1 1 1, 2 0 3`.
	      parse: function (value) {
	        return value.split(',').map(AFRAME.utils.coordinates.parse);
	      },
	      // Serialize array of vec3s in case someone does setAttribute('line', 'path', [...]).
	      stringify: function (data) {
	        return data.map(AFRAME.utils.coordinates.stringify).join(',');
	      }
	    }
	  },
	  
	  init: function () {
	    this.resolution = new THREE.Vector2 ( window.innerWidth, window.innerHeight ) ;
	    
	    var sceneEl = this.el.sceneEl;
	    sceneEl.addEventListener( 'render-target-loaded', this.do_update.bind(this) );
	    sceneEl.addEventListener( 'render-target-loaded', this.addlisteners.bind(this) );
	  
	    
	  /*
	    if (sceneEl.hasLoaded) {
	  
	      console.log('has loaded');
	      this.do_update(); //never happens ?
	  
	    } else {
	  
	      sceneEl.addEventListener('render-target-loaded', this.do_update.bind(this));
	  
	      }
	  */
	  },
	  
	  addlisteners: function () {
	  
	    //var canvas = this.el.sceneEl.canvas;
	  
	    // canvas does not fire resize events, need window
	    window.addEventListener( 'resize', this.do_update.bind (this) );
	    
	    //console.log( canvas );
	    //this.do_update() ;
	  
	  },
	  
	  do_update: function () {
	  
	    var canvas = this.el.sceneEl.canvas;
	    this.resolution.set( canvas.width,  canvas.height );
	    //console.log( this.resolution );
	    this.update();

	  },
	  
	  update: function () {
	    //cannot use canvas here because it is not created yet at init time
	    //console.log("canvas res:");
	    //console.log(this.resolution);
	    var material = new THREE.MeshLineMaterial({
	      color: new THREE.Color(this.data.color),
	      resolution: this.resolution,
	      sizeAttenuation: false,
	      lineWidth: this.data.lineWidth,
	      //near: 0.1,
	      //far: 1000
	    });
	  
	    var geometry = new THREE.Geometry();
	    
	    this.data.path.forEach(function (vec3) {
	      geometry.vertices.push(
	        new THREE.Vector3(vec3.x, vec3.y, vec3.z)
	      );
	    });
	    
	    var widthFn = new Function ('p', 'return ' + this.data.lineWidthStyler);
	    //? try {var w = widthFn(0);} catch(e) {warn(e);}
	    var line = new THREE.MeshLine();
	    line.setGeometry( geometry, widthFn );
	    this.el.setObject3D('mesh', new THREE.Mesh(line.geometry, material));
	  },
	  
	  remove: function () {
	    this.el.removeObject3D('mesh');
	  }
	});


/***/ },
/* 1 */
/***/ function(module, exports) {

	THREE.MeshLine = function() {

		this.positions = [];

		this.previous = [];
		this.next = [];
		this.side = [];
		this.width = [];
		this.indices_array = [];
		this.uvs = [];

		this.geometry = new THREE.BufferGeometry();
		
		this.widthCallback = null;

	}

	THREE.MeshLine.prototype.setGeometry = function( g, c ) {

		this.widthCallback = c;

		this.positions = [];

		if( g instanceof THREE.Geometry ) {
			for( var j = 0; j < g.vertices.length; j++ ) {
				var v = g.vertices[ j ];
				this.positions.push( v.x, v.y, v.z );
				this.positions.push( v.x, v.y, v.z );
			}
		}

		if( g instanceof THREE.BufferGeometry ) {
			// read attribute positions ?
		}

		if( g instanceof Float32Array || g instanceof Array ) {
			for( var j = 0; j < g.length; j += 3 ) {
				this.positions.push( g[ j ], g[ j + 1 ], g[ j + 2 ] );
				this.positions.push( g[ j ], g[ j + 1 ], g[ j + 2 ] );
			}
		}

		this.process();

	}

	THREE.MeshLine.prototype.compareV3 = function( a, b ) {

		var aa = a * 6;
		var ab = b * 6;
		return ( this.positions[ aa ] === this.positions[ ab ] ) && ( this.positions[ aa + 1 ] === this.positions[ ab + 1 ] ) && ( this.positions[ aa + 2 ] === this.positions[ ab + 2 ] );

	}

	THREE.MeshLine.prototype.copyV3 = function( a ) {

		var aa = a * 6;
		return [ this.positions[ aa ], this.positions[ aa + 1 ], this.positions[ aa + 2 ] ];

	}

	THREE.MeshLine.prototype.process = function() {

		var l = this.positions.length / 6;

		this.previous = [];
		this.next = [];
		this.side = [];
		this.width = [];
		this.indices_array = [];
		this.uvs = [];

		for( var j = 0; j < l; j++ ) {
			this.side.push( 1 );
			this.side.push( -1 );
		}

		var w;
		for( var j = 0; j < l; j++ ) {
			if( this.widthCallback ) w = this.widthCallback( j / ( l -1 ) );
			else w = 1;
			this.width.push( w );
			this.width.push( w );
		}

		for( var j = 0; j < l; j++ ) {
			this.uvs.push( j / ( l - 1 ), 0 );
			this.uvs.push( j / ( l - 1 ), 1 );
		}

		var v;

		if( this.compareV3( 0, l - 1 ) ){
			v = this.copyV3( l - 2 );
		} else {
			v = this.copyV3( 0 );
		}
		this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
		this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
		for( var j = 0; j < l - 1; j++ ) {
			v = this.copyV3( j );
			this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
			this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
		}

		for( var j = 1; j < l; j++ ) {	
			v = this.copyV3( j );
			this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
			this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
		}

		if( this.compareV3( l - 1, 0 ) ){
			v = this.copyV3( 1 );
		} else {
			v = this.copyV3( l - 1 );
		}
		this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
		this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );

		for( var j = 0; j < l - 1; j++ ) {
			var n = j * 2;
			this.indices_array.push( n, n + 1, n + 2 );
			this.indices_array.push( n + 2, n + 1, n + 3 );
		}

		if (!this.attributes) {
			this.attributes = {
				position: new THREE.BufferAttribute( new Float32Array( this.positions ), 3 ),
				previous: new THREE.BufferAttribute( new Float32Array( this.previous ), 3 ),
				next: new THREE.BufferAttribute( new Float32Array( this.next ), 3 ),
				side: new THREE.BufferAttribute( new Float32Array( this.side ), 1 ),
				width: new THREE.BufferAttribute( new Float32Array( this.width ), 1 ),
				uv: new THREE.BufferAttribute( new Float32Array( this.uvs ), 2 ),
				index: new THREE.BufferAttribute( new Uint16Array( this.indices_array ), 1 )
			}
		} else {
			this.attributes.position.copyArray(new Float32Array(this.positions));
			this.attributes.position.needsUpdate = true;
			this.attributes.previous.copyArray(new Float32Array(this.previous));
			this.attributes.previous.needsUpdate = true;
			this.attributes.next.copyArray(new Float32Array(this.next));
			this.attributes.next.needsUpdate = true;
			this.attributes.side.copyArray(new Float32Array(this.side));
			this.attributes.side.needsUpdate = true;
			this.attributes.width.copyArray(new Float32Array(this.width));
			this.attributes.width.needsUpdate = true;
			this.attributes.uv.copyArray(new Float32Array(this.uvs));
			this.attributes.uv.needsUpdate = true;
			this.attributes.index.copyArray(new Uint16Array(this.index));
			this.attributes.index.needsUpdate = true;
		}

		this.geometry.addAttribute( 'position', this.attributes.position );
		this.geometry.addAttribute( 'previous', this.attributes.previous );
		this.geometry.addAttribute( 'next', this.attributes.next );
		this.geometry.addAttribute( 'side', this.attributes.side );
		this.geometry.addAttribute( 'width', this.attributes.width );
		this.geometry.addAttribute( 'uv', this.attributes.uv );

		this.geometry.setIndex( this.attributes.index );

	}

	THREE.MeshLineMaterial = function ( parameters ) {

		var vertexShaderSource = [
	'precision highp float;',
	'',
	'attribute vec3 position;',
	'attribute vec3 previous;',
	'attribute vec3 next;',
	'attribute float side;',
	'attribute float width;',
	'attribute vec2 uv;',
	'',
	'uniform mat4 projectionMatrix;',
	'uniform mat4 modelViewMatrix;',
	'uniform vec2 resolution;',
	'uniform float lineWidth;',
	'uniform vec3 color;',
	'uniform float opacity;',
	'uniform float near;',
	'uniform float far;',
	'uniform float sizeAttenuation;',
	'',
	'varying vec2 vUV;',
	'varying vec4 vColor;',
	'varying vec3 vPosition;',
	'',
	'vec2 fix( vec4 i, float aspect ) {',
	'',
	'    vec2 res = i.xy / i.w;',
	'    res.x *= aspect;',
	'    return res;',
	'',
	'}',
	'',
	'void main() {',
	'',
	'    float aspect = resolution.x / resolution.y;',
	'	 float pixelWidthRatio = 1. / (resolution.x * projectionMatrix[0][0]);',
	'',
	'    vColor = vec4( color, opacity );',
	'    vUV = uv;',
	'',
	'    mat4 m = projectionMatrix * modelViewMatrix;',
	'    vec4 finalPosition = m * vec4( position, 1.0 );',
	'    vec4 prevPos = m * vec4( previous, 1.0 );',
	'    vec4 nextPos = m * vec4( next, 1.0 );',
	'',
	'    vec2 currentP = fix( finalPosition, aspect );',
	'    vec2 prevP = fix( prevPos, aspect );',
	'    vec2 nextP = fix( nextPos, aspect );',
	'',
	'	 float pixelWidth = finalPosition.w * pixelWidthRatio;',
	'    float w = 1.8 * pixelWidth * lineWidth * width;',
	'',
	'    if( sizeAttenuation == 1. ) {',
	'        w = 1.8 * lineWidth * width;',
	'    }',
	'',
	'    vec2 dir;',
	'    if( nextP == currentP ) dir = normalize( currentP - prevP );',
	'    else if( prevP == currentP ) dir = normalize( nextP - currentP );',
	'    else {',
	'        vec2 dir1 = normalize( currentP - prevP );',
	'        vec2 dir2 = normalize( nextP - currentP );',
	'        dir = normalize( dir1 + dir2 );',
	'',
	'        vec2 perp = vec2( -dir1.y, dir1.x );',
	'        vec2 miter = vec2( -dir.y, dir.x );',
	'        //w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );',
	'',
	'    }',
	'',
	'    //vec2 normal = ( cross( vec3( dir, 0. ), vec3( 0., 0., 1. ) ) ).xy;',
	'    vec2 normal = vec2( -dir.y, dir.x );',
	'    normal.x /= aspect;',
	'    normal *= .5 * w;',
	'',
	'    vec4 offset = vec4( normal * side, 0.0, 1.0 );',
	'    finalPosition.xy += offset.xy;',
	'',
	'	 vPosition = ( modelViewMatrix * vec4( position, 1. ) ).xyz;',
	'    gl_Position = finalPosition;',
	'',
	'}' ];

		var fragmentShaderSource = [
			'#extension GL_OES_standard_derivatives : enable',
	'precision mediump float;',
	'',
	'uniform sampler2D map;',
	'uniform float useMap;',
	'uniform float useDash;',
	'uniform vec2 dashArray;',
	'',
	'varying vec2 vUV;',
	'varying vec4 vColor;',
	'varying vec3 vPosition;',
	'',
	'void main() {',
	'',
	'    vec4 c = vColor;',
	'    if( useMap == 1. ) c *= texture2D( map, vUV );',
	'	 if( useDash == 1. ){',
	'	 	 ',
	'	 }',
	'    gl_FragColor = c;',
	'',   
	'}' ];

		function check( v, d ) {
			if( v === undefined ) return d;
			return v;
		}

		THREE.Material.call( this );

		parameters = parameters || {};

		this.lineWidth = check( parameters.lineWidth, 1 );
		this.map = check( parameters.map, null );
		this.useMap = check( parameters.useMap, 0 );
		this.color = check( parameters.color, new THREE.Color( 0xffffff ) );
		this.opacity = check( parameters.opacity, 1 );
		this.resolution = check( parameters.resolution, new THREE.Vector2( 1, 1 ) );
		this.sizeAttenuation = check( parameters.sizeAttenuation, 1 );
		this.near = check( parameters.near, 1 );
		this.far = check( parameters.far, 1 );
		this.dashArray = check( parameters.dashArray, [] );
		this.useDash = ( this.dashArray !== [] ) ? 1 : 0;

		var material = new THREE.RawShaderMaterial( { 
			uniforms:{
				lineWidth: { type: 'f', value: this.lineWidth },
				map: { type: 't', value: this.map },
				useMap: { type: 'f', value: this.useMap },
				color: { type: 'c', value: this.color },
				opacity: { type: 'f', value: this.opacity },
				resolution: { type: 'v2', value: this.resolution },
				sizeAttenuation: { type: 'f', value: this.sizeAttenuation },
				near: { type: 'f', value: this.near },
				far: { type: 'f', value: this.far },
				dashArray: { type: 'v2', value: new THREE.Vector2( this.dashArray[ 0 ], this.dashArray[ 1 ] ) },
				useDash: { type: 'f', value: this.useDash }
			},
			vertexShader: vertexShaderSource.join( '\r\n' ),
			fragmentShader: fragmentShaderSource.join( '\r\n' )
		});

		delete parameters.lineWidth;
		delete parameters.map;
		delete parameters.useMap;
		delete parameters.color;
		delete parameters.opacity;
		delete parameters.resolution;
		delete parameters.sizeAttenuation;
		delete parameters.near;
		delete parameters.far;
		delete parameters.dashArray;

		material.type = 'MeshLineMaterial';

		material.setValues( parameters );

		return material;

	};

	THREE.MeshLineMaterial.prototype = Object.create( THREE.Material.prototype );
	THREE.MeshLineMaterial.prototype.constructor = THREE.MeshLineMaterial;

	THREE.MeshLineMaterial.prototype.copy = function ( source ) {

		THREE.Material.prototype.copy.call( this, source );

		this.lineWidth = source.lineWidth;
		this.map = source.map;
		this.useMap = source.useMap;
		this.color.copy( source.color );
		this.opacity = source.opacity;
		this.resolution.copy( source.resolution );
		this.sizeAttenuation = source.sizeAttenuation;
		this.near = source.near;
		this.far = source.far;

		return this;

	};


/***/ }
/******/ ]);
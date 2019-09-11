const timeID = new Date().getTime() % 10000;
const client = new Paho.MQTT.Client("oz.andrew.cmu.edu", Number(9001), "myClientId" + timeID);
var sceneObjects = new Object(); // This will be an associative array of strings and objects

// rate limit camera position updates
updateMillis = 100;

var queryString = window.location.search;
queryString = queryString.substring(1);
const sceneTopic = queryString;

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
	vars[key] = value;
    });
    return vars;
}
function getUrlParam(parameter, defaultvalue){
    var urlparameter = defaultvalue;
    if(window.location.href.indexOf(parameter) > -1){
	urlparameter = getUrlVars()[parameter];
    }
    if (urlparameter === "") return defaultvalue;
    return urlparameter;
}

var renderParam=getUrlParam('scene','render');
var userParam=getUrlParam('name','X');
var themeParam=getUrlParam('theme','starry');
var weatherParam=getUrlParam('weather','none');

console.log(renderParam, userParam, themeParam);

outputTopic = "/topic/"+renderParam+"/";
renderTopic = outputTopic+"#";

console.log(renderTopic);
console.log(outputTopic);

var camName = "";
var oldMsg = "";
var cameraRig;
var my_camera;
var weather;
var date = new Date();
var lastUpdate = date.getTime();
var stamp = lastUpdate;

// Depending on topic depth, four message categories
var topicChildObject = renderTopic.split("/").length + 3;     // e.g: /topic/render/cube_1/sphere_2
var topicMultiProperty = renderTopic.split("/").length + 2;   // e.g: /topic/render/cube_1/material/color
var topicSingleComponent = renderTopic.split("/").length + 1; // e.g: /topic/render/cube_1/position
var topicAtomicUpdate = renderTopic.split("/").length;        // e.g: /topic/render/cube_1
var Scene;

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

console.log("time: " , timeID);
camName = "camera_" + timeID + "_" + userParam;

// Last Will and Testament message sent to subscribers if this client loses connection
var lwt = new Paho.MQTT.Message("");
lwt.destinationName = outputTopic+camName;
lwt.qos = 0;
lwt.retained = true;

client.connect({
    onSuccess: onConnect,
    willMessage: lwt
});

// Callback for client.connect()
function onConnect() {
    //console.log("onConnect");
    
    // Let's get the camera and publish it's presence over MQTT
    // slight hack: we rely on it's name being already defined in the HTML as "my-camera"
    // add event listener for camera moved ("poseChanged") event
    vive_lefthand = document.getElementById('vive-leftHand');
    vive_righthand = document.getElementById('vive-rightHand');
    
    my_camera = document.getElementById('my-camera');     // this is an <a-camera>
    cameraRig = document.getElementById('CameraRig'); // this is an <a-entity>
    conixBox = document.getElementById('Box-obj');
    environs = document.getElementById('env');
    weather = document.getElementById('weather');

    environs.setAttribute('environment', 'preset', themeParam);

    if (weatherParam !== "none") {
	weather.setAttribute('particle-system', 'preset', weatherParam);
	weather.setAttribute('particle-system', 'enabled', 'true');
    } else
	weather.setAttribute('particle-system', 'enabled', 'false');


    // make 'env' and 'box-obj' (from index.html) scene objects so they can be modified
    // Add them to our dictionary of scene objects
    sceneObjects['env'] = environs;
    sceneObjects['Box-obj'] = conixBox;

    console.log('my-camera: ',timeID);
    console.log('cameraRig: ', cameraRig);

    //lwt.destinationName = outputTopic+camName;

    // Publish initial camera presence
    var color = '#'+Math.floor(Math.random()*16777215).toString(16);
    var mymsg = camName+",0,1.6,0,0,0,0,0,0,0,0,"+color+",on";
    publish(outputTopic+camName, mymsg);
    console.log("my-camera element", my_camera);

    my_camera.addEventListener('poseChanged', e => {
	//console.log(e.detail);	
	var msg = camName+","+
	    e.detail.x.toFixed(3)+","+
	    e.detail.y.toFixed(3)+","+
	    e.detail.z.toFixed(3)+","+
	    e.detail._x.toFixed(3)+","+
	    e.detail._y.toFixed(3)+","+
	    e.detail._z.toFixed(3)+","+
	    e.detail._w.toFixed(3)+
	    ",0,0,0,"+color+",on";

	// suppress duplicates
	if (msg !== oldMsg) {
	    // rate limit
	    date = new Date();
	    stamp = date.getTime();
	    if ((stamp - lastUpdate) >= updateMillis) {

		publish(outputTopic+camName, msg);
		oldMsg = msg;
		lastUpdate = stamp;
		//console.log("cam moved: ",outputTopic+camName, msg);
	    }
	}
    });
    
    
    // VERY IMPORTANT: remove retained camera topic so future visitors don't see it
    window.onbeforeunload = function(){
	publish(outputTopic+camName, camName+",0,0,0,0,0,0,0,0,0,0,#000000,off");
	publish_retained(outputTopic+camName, "");
    }

    Scene = document.querySelector('a-scene');

    // ok NOW start listening for MQTT messages
    client.subscribe(renderTopic);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
	console.log(responseObject.errorMessage);
    } // reconnect
    client.connect({ onSuccess: onConnect });
}

const publish_retained = (dest, msg) => {
    //console.log('desint :', dest, 'msggg', msg)
    let message = new Paho.MQTT.Message(msg);
    message.destinationName = dest;
    message.retained = true;
    client.send(message);
}

const publish = (dest, msg) => {
    //console.log('desint :', dest, 'msggg', msg)
    let message = new Paho.MQTT.Message(msg);
    message.destinationName = dest;
    client.send(message);
}

function onMessageArrived(message) {

    // parse topic
    var dest = message.destinationName;
    // strip nasty trailing slash
    if(dest.charAt( dest.length-1 ) == "/") {
	dest = dest.slice(0, -1)
    }
    const topic = dest.split("/");
    
    //console.log(message.payloadString);
    //console.log (topic.length, "<- topic.length");
    
    switch (topic.length) {

    case topicMultiProperty:
	// Multi-property component update, e.g: topic/render/cube_1/material/color "#FFFFFF"
	var propertyName  = topic[topic.length - 1]; // e.g. 'color'
	var componentName = topic[topic.length - 2]; // the parameter to modify e.g 'material'
	var sceneObject   = topic[topic.length - 3]; // the object with the parameter
	//console.log("propertyName", propertyName);
	//console.log("componentName", componentName);
	//console.log("sceneObject", sceneObject);

	var entityEl = sceneObjects[sceneObject];
	
	//console.log("payloadstring", message.payloadString);
	//console.log("parsed:", AFRAME.utils.styleParser.parse(message.payloadString));
	
	//entityEl.setAttribute(componentName, propertyName, AFRAME.utils.styleParser.parse(message.payloadString));
	if (entityEl)
	    AFRAME.utils.entity.setComponentProperty(entityEl, componentName+'.'+propertyName, message.payloadString);
	else
	    console.log("Warning: " + sceneObject + " not in sceneObjects");
	break;

    case topicSingleComponent:
	// single component update, e.g: /topic/render/cube_1/position "x:1; y:2; z:3;"
	//                               /topic/render/line_1/line__2 "start: 3 3 3; end: 4 4 4; color: #00ff00"
	//                               /topic/render/camera_1234/rig "1,2,3,0,0,0,0"
	
	var componentName = topic[topic.length - 1]; // the parameter to modify
	var sceneObject   = topic[topic.length - 2]; // the object with the parameter
	//console.log("componentName", componentName);
	//console.log("sceneObject", sceneObject);

	// Camera Rig updates
	if (sceneObject === camName) { // our Rig
	    var coords = message.payloadString.split(",");

	    var x    = coords[0]; var y    = coords[1]; var z    = coords[2];
	    var xrot = coords[3]; var yrot = coords[4]; var zrot = coords[5]; var wrot = coords[6];

	    var quat = new THREE.Quaternion(xrot,yrot,zrot,wrot);
	    var euler = new THREE.Euler();
	    var foo = euler.setFromQuaternion(quat.normalize(),"YXZ");
	    var vec = foo.toVector3();

	    cameraRig.object3D.position.set(x,y,z);
	    cameraRig.object3D.rotation.set(vec.x,vec.y,vec.z);
//	    cameraRig.rotation.order = "YXZ"; // John this doesn't work here :(

	    break;
	} else { // others' Rigs(?)
	    
	    if (componentName === "rig") { // warp others' camera Rigs
		var rigEl = sceneObjects[sceneObject];
		
		var coords = message.payloadString.split(",");

		var x    = coords[0]; var y    = coords[1]; var z    = coords[2];
		var xrot = coords[3]; var yrot = coords[4]; var zrot = coords[5]; var wrot = coords[6];

		var quat = new THREE.Quaternion(xrot,yrot,zrot,wrot);
		var euler = new THREE.Euler();
		var foo = euler.setFromQuaternion(quat.normalize(),"YXZ");
		var vec = foo.toVector3();
		
		rigEl.object3D.position.set(x,y,z);
		rigEl.object3D.rotation.set(vec.x,vec.y,vec.z);

		break;
	    }
	}

	var entityEl = sceneObjects[sceneObject];
	
	//console.log("payloadstring", message.payloadString);

	if (entityEl) {
	    if (message.payloadString.includes(";")) { // javascript style "x:1; y:2; z:3;"
		//console.log("parsed:", AFRAME.utils.styleParser.parse(message.payloadString));
		entityEl.setAttribute(componentName, AFRAME.utils.styleParser.parse(message.payloadString));
	    }
	    else { // raw, don't parse the format. e.g. "url(http://oz.org/Modelfile.glb)"
		//console.log("unparsed", message.payloadString);
		if (componentName === "mousedown") {
		    var splits = message.payloadString.split(',');
		    var myPoint = new THREE.Vector3(parseFloat(splits[0]),
						    parseFloat(splits[1]),
						    parseFloat(splits[2]));
		    var clicker = splits[3];

		    // emit a synthetic click event with ugly data syntax
		    entityEl.emit('mousedown', { "clicker": clicker, intersection:
					     {
						 point: myPoint }
					   }, true);
		}
		if (componentName === "mouseup") {
		    var splits = message.payloadString.split(',');
		    var myPoint = new THREE.Vector3(parseFloat(splits[0]),
						    parseFloat(splits[1]),
						    parseFloat(splits[2]));
		    var clicker = splits[3];

		    // emit a synthetic click event with ugly data syntax
		    entityEl.emit('mouseup', { "clicker": clicker, intersection:
					     {
						 point: myPoint }
					   }, true);
		}
		else {
		    entityEl.setAttribute(componentName, message.payloadString);
		}
	    }
	}
	else
	    console.log("Warning: " + sceneObject + " not in sceneObjects");
	break;

    case topicAtomicUpdate:

	// These are 'long' messages lie "obj_id,0,0,0,0,0,0,0,0,0,0,#000000,off"
	// for which the values are x,y,z xrot,yrot,zrot,wrot (quaternions) xscale,yscale,zscale, payload (color), on/off

	if (message.payloadString.length === 0) {
	    // An empty message after an object_id means remove it
	    var name = topic[topic.length - 1]; // the object with the parameter
	    //console.log(message.payloadString, topic, name);

	    if (sceneObjects[name]) {
		Scene.removeChild(sceneObjects[name]);
		delete sceneObjects[name];
		return;
	    } else console.log("Warning: " + name + " not in sceneObjects");
	    return;
	}

	// parse string
	var res = message.payloadString.split(",");
	var name = res[0];

	// if this is our own camera, don't attempt to draw it
	if (name === camName) return;

	if (res.length === 1) {
	    // a 1 parameter message is parent child relationship e.g. /topic/render/parent_id -m "child_id"
	    
	    var parentEl = sceneObjects[topic[topic.length - 1]]; // scene object_id
	    var childEl  = sceneObjects[message.payloadString];

	    // error checks
	    if (!parentEl) {
		console.log("Warning: " + parentEl + " not in sceneObjects");
		return;
	    }
	    if (!childEl) {
		console.log("Warning: " + childEl + " not in sceneObjects");
		return;
	    }

	    console.log("parent", parentEl);
	    console.log("child", childEl);

	    childEl.flushToDOM();
	    var copy = childEl.cloneNode(true);
	    parentEl.appendChild(copy);
	    sceneObjects[name] = copy;
	    childEl.parentNode.removeChild(childEl);
	    
	    console.log("parent", parentEl);
	    console.log("child", childEl);
	    return;
	} 
	
	type = name.substring(0, name.indexOf('_'));
	if (type === "cube") {type = "box"}; // different name in Unity
	if (type === "quad") {type = "plane"}; // also different
	
	var x    = res[1]; var y    = res[2]; var z    = res[3];
	var xrot = res[4]; var yrot = res[5]; var zrot = res[6]; var wrot = res[7];

	var quat = new THREE.Quaternion(xrot,yrot,zrot,wrot);
	var euler = new THREE.Euler();
	var foo = euler.setFromQuaternion(quat.normalize(),"YXZ");
	var vec = foo.toVector3();
	//var eulerx = THREE.Math.radToDeg(vec.x);
	//var eulery = THREE.Math.radToDeg(vec.y);
	//var eulerz = THREE.Math.radToDeg(vec.z);
	
	var xscale = res[8]; var yscale = res[9]; var zscale = res[10];
	if (type === "cylinder") { yscale = yscale * 4; };
	var color = res[11];
	var onoff = res[12];

	// Delete or add a new Scene object

	if (onoff === "off") {
	    if (sceneObjects[name]) {
		Scene.removeChild(sceneObjects[name]);
		delete sceneObjects[name];
	    } else console.log("Warning: " + name + " not in sceneObjects");
	} else {
	    var entityEl;
	    if (name in sceneObjects) {
		entityEl = sceneObjects[name];
		//console.log("existing object: ", name);
		//console.log(entityEl);
	    } else { // CREATE NEW SCENE OBJECT		

		if (type === "camera") {
		    entityEl = document.createElement('a-entity');
		    entityEl.setAttribute('id', name+"_rigChild");
		    entityEl.setAttribute('rotation.order' , "YXZ");
		    entityEl.object3D.position.set(0,0,0);
		    entityEl.object3D.rotation.set(0,0,0);
		    
		    var rigEl;
		    rigEl = document.createElement('a-entity');
		    rigEl.setAttribute('id', name);
		    rigEl.setAttribute('rotation.order' , "YXZ");
		    rigEl.object3D.position.set(0,0,0);
		    rigEl.object3D.rotation.set(0,0,0);
		    
		    // this is the head 3d model
		    childEl = document.createElement('a-entity');
		    childEl.setAttribute('rotation', 0+' '+180+' '+0);
		    childEl.object3D.scale.set(4,4,4);
		    childEl.setAttribute("gltf-model", "url(models/Head.gltf)");  // actually a face mesh

		    // place a colored text above the head
		    var headtext = document.createElement('a-text');
		    var personName = name.split('_')[2];
		    
		    headtext.setAttribute('value', personName);
		    headtext.setAttribute('position', 0 + ' ' + 0.6 + ' ' + 0.25);
		    headtext.setAttribute('side', "double");
		    headtext.setAttribute('align', "center");
		    headtext.setAttribute('anchor', "center");
		    headtext.setAttribute('scale', 0.8 + ' ' + 0.8 + ' ' + 0.8);
		    headtext.setAttribute('color', color); // color
		    entityEl.appendChild(headtext);
		    entityEl.appendChild(childEl);

		    rigEl.appendChild(entityEl);
		    
		    Scene.appendChild(rigEl);
		    sceneObjects[name] = rigEl;

		    entityEl = rigEl;

		    console.log("their camera:", rigEl);
		} else {
		    entityEl = document.createElement('a-entity');
		    entityEl.setAttribute('id', name);
		    entityEl.setAttribute('rotation.order' , "YXZ");

		    Scene.appendChild(entityEl);
		    
		    // Add it to our dictionary of scene objects
		    sceneObjects[name] = entityEl;
		    //console.log("entityEL:",entityEl);
		    //console.log("added ", entityEl, "to sceneObjects["+name+"]");
		}
	    }

	    switch(type) {
	    case "light":
		entityEl.setAttribute('light', 'type', 'ambient');
		// does this work for light a-entities ?
		entityEl.setAttribute('light', 'color', color);
		break;
	    case "camera":
		console.log("Camera update", entityEl);
		console.log(entityEl.getAttribute('position'));
		break;
	    case "image": // use the color slot for URL (like gltf-models do)
		entityEl.setAttribute('geometry', 'primitive', 'plane');
		entityEl.setAttribute('material', 'src', color);
		entityEl.setAttribute('material', 'shader', 'flat');
		entityEl.object3D.scale.set(xscale,yscale,zscale);
		break;
	    case "line":
		entityEl.setAttribute('line', 'start', x + ' ' + y + ' ' + z);
		entityEl.setAttribute('line', 'end', xrot + ' ' + yrot + ' ' + zrot);
		entityEl.setAttribute('line', 'color', color);
		break;
	    case "particle":
		// two part operation: part 1, create an entity at a position /topic/render/particle_1 -m "particle_1,1,1,1,0,0,0,1,1,1,1,#abcdef,on"
		// then set it's particle-system attribute later e.g. /topic/render/particle_1/particle-system -m "preset: snow"
		entityEl.object3D.position.set(x, y, z);
		break;		
	    case "gltf-model":
		// overload: store URL in #color field
		//entityEl.object3D.scale.set(xscale, yscale, zscale);
		entityEl.setAttribute('scale', xscale+' '+ yscale+' '+ zscale);
		entityEl.setAttribute("gltf-model", color);		
		break;
	    case "text":
		// use color field for text string
		if (entityEl.hasChildNodes()) // assume only one we added
		    entityEl.removeChild(entityEl.childNodes[0]);
		textEl = document.createElement('a-text');
		textEl.setAttribute('value', color);
		textEl.setAttribute('side', "double");
		textEl.setAttribute('align', "center");
		textEl.setAttribute('anchor', "center");
		entityEl.appendChild(textEl);
		break;
	    default:
		entityEl.setAttribute('geometry', 'primitive', type);
		entityEl.object3D.scale.set(xscale,yscale,zscale);
		entityEl.setAttribute('material', 'color', color);
		break;
	    }

	    //entityEl.object3D.quaternion.set(xrot,yrot,zrot,wrot);

	    if (type !== 'line') {
		// Common for all but lines: set position & rotation
		entityEl.object3D.position.set(x,y,z);
		entityEl.object3D.rotation.set(vec.x,vec.y,vec.z);
	    }

	    //    console.log("geometry: ", entityEl.getAttribute('geometry'));
	    //console.log("position:" ,entityEl.getAttribute('position'));
	    //console.log("rotation: ",entityEl.getAttribute('rotation'));
	    //console.log("scale: ",entityEl.getAttribute('scale'));
	}
	break;
    default:
	console.log("EMPTY MESSAGE?", dest, message.payloadstring);
	break;
    }
}


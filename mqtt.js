const timeID = new Date().getTime() % 10000;
var sceneObjects = new Object(); // This will be an associative array of strings and objects

// rate limit camera position updates
const updateMillis = 100;

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
var themeParam=getUrlParam('theme','japan');
var weatherParam=getUrlParam('weather','none');
var mqttParamZ=getUrlParam('mqttServer','oz.andrew.cmu.edu');
var mqttParam='wss://'+mqttParamZ+'/mqtt';
// var mqttParam='ws://'+mqttParamZ+':9001/mqtt';
var fixedCamera=getUrlParam('fixedCamera','');

console.log(renderParam, userParam, themeParam);

outputTopic = "/topic/"+renderParam+"/";
vioTopic = "/topic/vio/";
renderTopic = outputTopic+"#";

console.log(renderTopic);
console.log(outputTopic);

var camName = "";

var fallBox;
var fallBox2;
var cameraRig;
var my_camera;
var vive_leftHand;
var vive_rightHand;
var weather;
var date = new Date();

// Rate limiting variables
var oldMsg = "";
var oldMsgLeft = "";
var oldMsgRight = "";
var lastUpdate = date.getTime();
var lastUpdateLeft = lastUpdate;
var lastUpdateRight = lastUpdate;
var stamp = lastUpdate;
var stampLeft = lastUpdate;
var stampRight = lastUpdate;

// Depending on topic depth, four message categories
var topicChildObject = renderTopic.split("/").length + 3;     // e.g: /topic/render/cube_1/sphere_2
var topicMultiProperty = renderTopic.split("/").length + 2;   // e.g: /topic/render/cube_1/material/color
var topicSingleComponent = renderTopic.split("/").length + 1; // e.g: /topic/render/cube_1/position
var topicAtomicUpdate = renderTopic.split("/").length;        // e.g: /topic/render/cube_1


//const client = new Paho.MQTT.Client(mqttParam, 9001, "/mqtt", "myClientId" + timeID);
const client = new Paho.MQTT.Client(mqttParam, "myClientId" + timeID);

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

idTag = timeID + "_" + userParam; // e.g. 1234_eric

if (fixedCamera !== '') {
    camName = "camera_" + fixedCamera + "_" + fixedCamera;
}
else {
    camName = "camera_" + idTag;      // e.g. camera_1234_eric
}
console.log("camName: " , camName);

viveLName = "viveLeft_" + idTag;  // e.g. viveLeft_9240_X
viveRName = "viveRight_" + idTag; // e.g. viveRight_9240_X

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

    vive_leftHand = document.getElementById('vive-leftHand');
    vive_rightHand = document.getElementById('vive-rightHand');
    
    my_camera = document.getElementById('my-camera');     // this is an <a-camera>
    cameraRig = document.getElementById('CameraRig'); // this is an <a-entity>
    conixBox = document.getElementById('Box-obj');
    environs = document.getElementById('env');
    weather = document.getElementById('weather');
    Scene = document.querySelector('a-scene');
    fallBox = document.getElementById('fallBox');
    fallBox2 = document.getElementById('fallBox2');

    if (environs)
	environs.setAttribute('environment', 'preset', themeParam);

    if (weatherParam !== "none") {
	weather.setAttribute('particle-system', 'preset', weatherParam);
	weather.setAttribute('particle-system', 'enabled', 'true');

    } else if (weather)
	weather.setAttribute('particle-system', 'enabled', 'false');

    // make 'env' and 'box-obj' (from index.html) scene objects so they can be modified
    // Add them to our dictionary of scene objects
    sceneObjects['Scene'] = Scene;
    sceneObjects['env'] = environs;
    sceneObjects['Box-obj'] = conixBox;
    sceneObjects['Scene'] = Scene;
    sceneObjects['fallBox'] = fallBox;
    sceneObjects['fallBox2'] = fallBox2;

    console.log('my-camera: ',camName);
    console.log('cameraRig: ', cameraRig);
    console.log('fallBox: ', sceneObjects[fallBox]);

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

	// rig updates for VIO

	// suppress duplicates
	//if (msg !== oldMsg) {
	if (true) {
	    // rate limit
	    //date = new Date();
	    stamp = date.getTime();
	    //if ((stamp - lastUpdate) >= updateMillis) {

		publish(outputTopic+camName, msg + "," + stamp / 1000); // extra timestamp info at end for debugging
		oldMsg = msg;
		lastUpdate = stamp;
		//console.log("cam moved: ",outputTopic+camName, msg);

		if (fixedCamera !== '') {
		    
		    pos= my_camera.object3D.position
		    rot = my_camera.object3D.quaternion
		    var viomsg = camName+","+
			pos.x.toFixed(3)+","+
			pos.y.toFixed(3)+","+
			pos.z.toFixed(3)+","+
			rot.x.toFixed(3)+","+
			rot.y.toFixed(3)+","+
			rot.z.toFixed(3)+","+
			rot.w.toFixed(3)+
			",0,0,0,"+color+",on";

		    publish(vioTopic+camName, viomsg);
		}
	    //}
	}
    });

    if (vive_leftHand)
    vive_leftHand.addEventListener('viveChanged', e => {
	//console.log(e.detail);
	var objName="viveLeft_"+idTag;
	var msg = objName+","+
	    e.detail.x.toFixed(3)+","+
	    e.detail.y.toFixed(3)+","+
	    e.detail.z.toFixed(3)+","+
	    e.detail._x.toFixed(3)+","+
	    e.detail._y.toFixed(3)+","+
	    e.detail._z.toFixed(3)+","+
	    e.detail._w.toFixed(3)+
	    ",0,0,0,"+color+",on";

	// suppress duplicates
	if (msg !== oldMsgLeft) {
	    // rate limiting is now handled in vive-pose-listener
	    //date = new Date();
	    //stampLeft = date.getTime();
	    //if ((stampLeft - lastUpdateLeft) >= updateMillis) {

		publish(outputTopic+objName, msg);
		oldMsgLeft = msg;
		//lastUpdateLeft = stampLeft;
		//console.log("viveLeft moved: ",outputTopic+objName, msg);
	    //}
	}
    });

    // realtime position tracking of right hand controller
    if (vive_rightHand)
    vive_rightHand.addEventListener('viveChanged', e => {
	//console.log(e.detail);
	var objName="viveRight_"+idTag;
	var msg = objName+","+
	    e.detail.x.toFixed(3)+","+
	    e.detail.y.toFixed(3)+","+
	    e.detail.z.toFixed(3)+","+
	    e.detail._x.toFixed(3)+","+
	    e.detail._y.toFixed(3)+","+
	    e.detail._z.toFixed(3)+","+
	    e.detail._w.toFixed(3)+
	    ",0,0,0,"+color+",on";

	// suppress duplicates
	if (msg !== oldMsgRight) {
	    // rate limit
	    //date = new Date();
	    //stampRight = date.getTime();
	    //if ((stampRight - lastUpdateRight) >= updateMillis) {

		publish(outputTopic+objName, msg);
		oldMsgRight = msg;
		//lastUpdateRight = stampRight;
		//console.log("viveRight moved: ",outputTopic+objName, msg);
	    //}
	}
    });
        
    // VERY IMPORTANT: remove retained camera topic so future visitors don't see it
    window.onbeforeunload = function(){
	publish(outputTopic+camName, camName+",0,0,0,0,0,0,0,0,0,0,#000000,off");
	publish_retained(outputTopic+camName, ""); // no longer needed, don't retain head pose
	publish(outputTopic+camName, viveLName+",0,0,0,0,0,0,0,0,0,0,#000000,off");
	publish(outputTopic+camName, viveRName+",0,0,0,0,0,0,0,0,0,0,#000000,off");
    }

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
    // message.qos = 2;
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
	    console.log("moving our camera rig, sceneObject: " + sceneObject);
	    
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
	} else { // others' Rigs
	    /*
	    if (componentName === "rig") { // warp others' camera Rigs
		console.log("moving other-persons' camera sceneObject: " + sceneObject);

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
*/
	}

	var entityEl = sceneObjects[sceneObject];
	
	//console.log("payloadstring", message.payloadString);

	if (entityEl) {
	    if (message.payloadString.includes(";")) { // javascript style "x:1; y:2; z:3;"
		console.log("parsed:", AFRAME.utils.styleParser.parse(message.payloadString));
		entityEl.setAttribute(componentName, AFRAME.utils.styleParser.parse(message.payloadString));
	    }
	    else { // raw, don't parse the format. e.g. "url(http://oz.org/Modelfile.glb)"
		//console.log("unparsed", message.payloadString);
		switch (componentName) {
		case "mousedown":
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
		    break;
		case "mouseup":
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
		    break;
		case "child": // parent/child relationship e.g. /topic/render/parent_id/child -m "child_id"

		    var res = message.payloadString.split(",");
		    var childName = res[0];
		    var parentEl = sceneObjects[sceneObject]; // scene object_id
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
		    copy.setAttribute("name", "copy");
		    copy.flusToDOM();
		    parentEl.appendChild(copy);
		    sceneObjects[childName] = copy;
		    // remove from scene
		    childEl.parentNode.removeChild(childEl);
		    
		    console.log("parent", parentEl);
		    console.log("child", childEl);
		    break;
		case "parent": // parent/child relationship e.g. /topic/render/child_id/parent -m "parent_id"

		    var res = message.payloadString.split(",");
		    var parentName = res[0];
		    var childEl = sceneObjects[sceneObject]; // scene object_id
		    var parentEl  = sceneObjects[message.payloadString];

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
		    copy.setAttribute("name", "copy");
		    copy.flushToDOM();
		    parentEl.appendChild(copy);
		    sceneObjects[childName] = copy;
		    childEl.parentNode.removeChild(childEl);
		    
		    console.log("parent", parentEl);
		    console.log("child", childEl);
		    break;
		case "dynamic-body":
		    console.log("dynamic-body");
		    entityEl.setAttribute(componentName, message.payloadString);
		    break;
		default:
		    entityEl.setAttribute(componentName, message.payloadString);
		    break;
		}
	    }
	}
	else
	    console.log("Warning: " + sceneObject + " not in sceneObjects");
	break;

    case topicAtomicUpdate:

	// These are 'long' messages like -t /topic/render/obj_id -m "obj_id,0,0,0,0,0,0,0,0,0,0,#000000,off"
	// for which the values are x,y,z xrot,yrot,zrot,wrot (quaternions) xscale,yscale,zscale, payload (color), on/off
	//console.log("payloadstring", message.payloadString);
	
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

	// if this is our own camera or controller, don't attempt to draw it
	if (name === camName)
	    return;
	if (name === viveLName)
	    return;
	if (name === viveRName)
	    return;
	
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
		// don't delete, keep around for re-use e.g. skeleton bones
		//Scene.removeChild(sceneObjects[name]);
		//delete sceneObjects[name];
		sceneObjects[name].setAttribute('visible', false);
	    } else console.log("Warning: " + name + " not in sceneObjects");
	} else {
	    var entityEl;
	    if (name in sceneObjects) {
		entityEl = sceneObjects[name];
		entityEl.setAttribute('visible', true); // might have been set invisible with 'off' earlier
		//console.log("existing object: ", name);
		//console.log(entityEl);
	    } else { // CREATE NEW SCENE OBJECT		
		if (type === "viveLeft" || type === "viveRight") {
		    // create vive controller for 'other persons controller'
		    entityEl = document.createElement('a-entity');
		    entityEl.setAttribute('id', name);
		    entityEl.setAttribute('rotation.order' , "YXZ");
		    entityEl.setAttribute('obj-model', "obj: #viveControl-obj; mtl: #viveControl-mtl");
		    entityEl.object3D.position.set(0,0,0);
		    entityEl.object3D.rotation.set(0,0,0);

		    // Add it to our dictionary of scene objects
		    Scene.appendChild(entityEl);
		    sceneObjects[name] = entityEl;
		}
		else if (type === "camera") {
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
		    headtext.setAttribute('width', 5);
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
		//console.log("Camera update", entityEl);
		//console.log(entityEl.getAttribute('position'));
		break;
	    case "viveLeft":
		break;
	    case "viveRight":
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
	    case "thickline":
		entityEl.setAttribute('meshline', "lineWidth: "+xscale);
		entityEl.setAttribute('meshline', 'path: '+x+' '+y+' '+z+","+xrot+" "+yrot+" "+zrot);
		entityEl.setAttribute('meshline', 'color', color);
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

	    if (type !== 'line' && type !== 'thickline') {
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


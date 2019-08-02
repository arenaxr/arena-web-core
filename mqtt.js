const client = new Paho.MQTT.Client("oz.andrew.cmu.edu", Number(9001), "myClientId" + new Date().getTime());
var sceneObjects = new Object(); // This will be an associative array of strings and objects

const renderTopic = "/topic/render/#";
const outputTopic = "/topic/render/";
var camName = "";
var oldMsg = "";
var cameraRig;

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

client.connect({ onSuccess: onConnect });

// This is apparently called "at startup" when the page(?) is loaded(?)
function onConnect() {
    //console.log("onConnect");
    
    // Let's get the camera and publish it's presence over MQTT
    // slight hack: we rely on it's name being already defined in the HTML as "my-camera"
    // add event listener for camera moved ("poseChanged") event
    var myCam = document.getElementById('my-camera');
    cameraRig = document.getElementById('CameraRig');
    console.log('my-camera: ',myCam.object3D.uuid);
    console.log('cameraRig: ', cameraRig);
    camName = "camera_" + myCam.object3D.uuid;

    // Publish initial camera presence
    var color = '#'+Math.floor(Math.random()*16777215).toString(16);
    var mymsg = camName+",0,2.6,-4,0,0,0,0,0,0,0,"+color+",on";
    publish_retained(outputTopic+camName, mymsg);
    //console.log("my-camera element", myCam);

    myCam.addEventListener('poseChanged', e => {
	//console.log(e.detail);	
	var msg = camName+","+
	    e.detail.x.toFixed(3)+","+
	    e.detail.y.toFixed(3)+","+
	    -e.detail.z.toFixed(3)+","+
	    e.detail._x.toFixed(3)+","+
	    e.detail._y.toFixed(3)+","+
	    e.detail._z.toFixed(3)+","+
	    e.detail._w.toFixed(3)+
	    ",0,0,0,"+color+",on";

	// suppress duplicates
	if (msg !== oldMsg) {
	    publish_retained(outputTopic+camName, msg);
	    oldMsg = msg;
	    //console.log("cam moved: ",outputTopic+camName, msg);
	}
    });

    // VERY IMPORTANT: remove retained camera topic so future visitors don't see it
    window.onbeforeunload = function(){
	publish(outputTopic+camName, camName+",0,0,0,0,0,0,0,0,0,0,#000000,off");
	publish_retained(outputTopic+camName, "");
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
    var topic = dest.split("/");
    
    // Depending on topic depth, three cases
    var topicMultiProperty = renderTopic.split("/").length + 2;
    var topicSingleComponent = renderTopic.split("/").length + 1;
    var topicAtomicUpdate = renderTopic.split("/").length;
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
	    console.log("Error: " + sceneObject + " not in sceneObjects");
	break;
    case topicSingleComponent:
	// single component update, e.g: topic/render/cube_1/position "x:1; y:2; z:3;"
	var componentName = topic[topic.length - 1]; // the parameter to modify
	var sceneObject   = topic[topic.length - 2]; // the object with the parameter
	//console.log("componentName", componentName);
	//console.log("sceneObject", sceneObject);

	if (sceneObject === camName) {
	    var coords = message.payloadString.split(",");

	    var x    = coords[0]; var y    = coords[1]; var z    = coords[2];
	    var xrot = coords[3]; var yrot = coords[4]; var zrot = coords[5]; var wrot = coords[6];

	    var quat = new THREE.Quaternion(xrot,yrot,zrot,wrot);
	    var euler = new THREE.Euler();
	    var foo = euler.setFromQuaternion(quat.normalize(),"YXZ");
	    var vec = foo.toVector3();
	    var eulerx = -THREE.Math.radToDeg(vec.x);
	    var eulery = -THREE.Math.radToDeg(vec.y);
	    var eulerz = THREE.Math.radToDeg(vec.z);

	    cameraRig.setAttribute('position', x + ' ' + y + ' ' + (0 - z));
	    cameraRig.setAttribute('rotation', eulerx + ' ' + eulery + ' ' + eulerz);

	    console.log("cameraRig update: ", cameraRig);
	    
	    break;
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

		entityEl.setAttribute(componentName, message.payloadString);
	    }
	}
	else
	    console.log("Error: " + sceneObject + " not in sceneObjects");
	break;
    case topicAtomicUpdate:
	// parse string
	var res = message.payloadString.split(",");
	var name = res[0];

	// if this is our own camera, don't attempt to draw it
	if (name === camName) return;
	
	type = name.substring(0, name.indexOf('_'));
	if (type === "cube") {type = "box"}; // different name in Unity
	if (type === "quad") {type = "plane"}; // also different
	
	var x    = res[1]; var y    = res[2]; var z    = res[3];
	var xrot = res[4]; var yrot = res[5]; var zrot = res[6]; var wrot = res[7];

	var quat = new THREE.Quaternion(xrot,yrot,zrot,wrot);
	var euler = new THREE.Euler();
	var foo = euler.setFromQuaternion(quat.normalize(),"YXZ");
	var vec = foo.toVector3();
	var eulerx = -THREE.Math.radToDeg(vec.x);
	var eulery = -THREE.Math.radToDeg(vec.y);
	var eulerz = THREE.Math.radToDeg(vec.z);
	
	var xscale = res[8]; var yscale = res[9]; var zscale = res[10];
	if (type === "cylinder") { yscale = yscale * 4; };
	var color = res[11];
	var onoff = res[12];

	var sceneEl = document.querySelector('a-scene');

	// Delete or add a new Scene object

	if (onoff === "off") {
	    if (sceneObjects[name]) {
		sceneEl.removeChild(sceneObjects[name]);
		delete sceneObjects[name];
	    } else console.log("Error: " + name + " not in sceneObjects");
	} else {
	    var entityEl;
	    if (name in sceneObjects) {
		entityEl = sceneObjects[name];
		//console.log("existing object: ", name);
		//console.log(entityEl);
	    } else { // CREATE NEW SCENE OBJECT
		entityEl = document.createElement('a-entity');
		entityEl.setAttribute('id', name);

		if (type === "camera") {
		    // Create a thin black box for now = "camera"
		    /*
		    entityEl.setAttribute('geometry', 'primitive', 'box');
		    entityEl.setAttribute('scale', 0.1 + ' ' + 0.3 + ' ' + 1);
		    entityEl.setAttribute('material', 'color', "#000000");
		    */
		    entityEl.setAttribute('scale', 4 + ' ' + 4 + ' ' + 4);
		    entityEl.setAttribute("gltf-model", "url(models/Head.gltf)");  // actually a face mesh

		    // place a colored box above the head
		    var headtext = document.createElement('a-text');
		    var uuid = name.split("-");
		    var camid = uuid[uuid.length-1];
		    
		    headtext.setAttribute('value', camid);
		    headtext.setAttribute('position', 0 + ' ' + 0.15 + ' ' + -0.1);
		    headtext.setAttribute('scale', 0.2 + ' ' + 0.2 + ' ' + 0.2);

		    var headBox = document.createElement('a-entity');
		    headBox.setAttribute('geometry', 'primitive', 'box');
		    headBox.setAttribute('position', 0 + ' ' + 0.15 + ' ' + -0.1);
		    headBox.setAttribute('scale', 0.02 + ' ' + 0.02 + ' ' + 0.02);
		    headBox.setAttribute('material', 'color', color);

		    entityEl.appendChild(headBox);
//		    entityEl.appendChild(headtext);

		    // how set texture???
		    //entityEl.setAttribute("src", "url(CONIX.jpg)");
		    //var color = '#'+Math.floor(Math.random()*16777215).toString(16);
		    //entityEl.setAttribute('shader', 'standard');
		    //entityEl.setAttribute('material', 'color', color);
		    
		    console.log("their camera:", entityEl);
		}

		sceneEl.appendChild(entityEl);
		
		// Add it to our dictionary of scene objects
		sceneObjects[name] = entityEl;
		//console.log("entityEL:",entityEl);
		//console.log("added ", entityEl, "to sceneObjects["+name+"]");
	    }

	    switch(type) {
	    case "light":
		entityEl.setAttribute('light', 'type', 'ambient');
		// does this work for light a-entities ?
		entityEl.setAttribute('material', 'color', color);
		break;
	    case "camera":
		// HACK: our "head" (camera) model faces the wrong direction
		eulery = 180 - eulery;
		break;
	    case "gltf-model":
		// freak case: use color field for URL
		//entityEl.setAttribute('geometry', 'primitive', type); // this breaks things
		entityEl.setAttribute('scale', xscale + ' ' + yscale + ' ' + zscale);
		entityEl.setAttribute("gltf-model", color);		
		break;
	    default:
		entityEl.setAttribute('geometry', 'primitive', type);
		//entityEl.object3D.scale.set(xscale,yscale,zscale);
		entityEl.setAttribute('scale', xscale + ' ' + yscale + ' ' + zscale);
		entityEl.setAttribute('material', 'color', color);
		break;
	    }

	    // Common for all: set position & rotation
	    //    entityEl.object3D.position.set(x,y,z);
	    entityEl.setAttribute('position', x + ' ' + y + ' ' + (0 - z));
	    //entityEl.object3D.quaternion.set(xrot,yrot,zrot,wrot);

	    entityEl.setAttribute('rotation', eulerx + ' ' + eulery + ' ' + eulerz);


	    //    console.log("geometry: ", entityEl.getAttribute('geometry'));
	    //console.log("position:" ,entityEl.getAttribute('position'));
	    //console.log("rotation: ",entityEl.getAttribute('rotation'));
	    //console.log("scale: ",entityEl.getAttribute('scale'));
	}
	break;
    }
}


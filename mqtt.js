const client = new Paho.MQTT.Client("oz.andrew.cmu.edu", Number(9001), "myClientId" + new Date().getTime());
var sceneObjects = new Object(); // This will be an associative array of strings and objects

const renderTopic = "/topic/render/#";
const outputTopic = "/topic/render/";
var camName = "";
var oldMsg = "";

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

client.connect({ onSuccess: onConnect });

// This is apparently called "at startup" when the page(?) is loaded(?)
function onConnect() {
    console.log("onConnect");
    
    // Let's get the camera and publish it's presence over MQTT
    // slight hack: we rely on it's name being already defined in the HTML as "my-camera"
    // add event listener for camera moved ("poseChanged") event
    var myCam = document.getElementById('my-camera');
    console.log('my-camera: ',myCam.object3D.uuid);
    camName = "camera_" + myCam.object3D.uuid;

    // Publish initial camera presence

    var mymsg = camName+",0,0,0,0,0,0,0,0,0,0,#000000,on";
    publish_retained(outputTopic+camName, mymsg);
    console.log("my-camera element", myCam);

    myCam.addEventListener('poseChanged', e => {
	//console.log(e.detail);
	var msg = camName+","+
	    e.detail.x.toFixed(3)+","+
	    e.detail.y.toFixed(3)+","+
	    e.detail.z.toFixed(3)+","+
	    e.detail._x.toFixed(3)+","+
	    e.detail._y.toFixed(3)+","+
	    e.detail._z.toFixed(3)+","+
	    e.detail._w.toFixed(3)+
	    ",0,0,0,#000000,on";

	// squash duplicates
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
	console.log("onConnectionLost:" + responseObject.errorMessage);
    } else
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
    var topic = message.destinationName.split("/");
    console.log("topic", topic);
    console.log("length", topic.length);
    
    if (topic.length === renderTopic.split("/").length + 2) {
	// Multi-property component update, e.g: /topic/render/objectId/material/color
	var propertyName = topic[topic.length - 1];  // e.g. 'color'
	var componentName = topic[topic.length - 2]; // the parameter to modify e.g 'material'
	var sceneObject = topic[topic.length - 3];   // the object with the parameter
	console.log("propertyName", propertyName);
	console.log("componentName", componentName);
	console.log("sceneObject", sceneObject);

	var entityEl = sceneObjects[sceneObject];
	
	console.log("payloadstring", message.payloadString);
	console.log("parsed:", AFRAME.utils.styleParser.parse(message.payloadString));
	
	//entityEl.setAttribute(componentName, propertyName, AFRAME.utils.styleParser.parse(message.payloadString));
	AFRAME.utils.entity.setComponentProperty(entityEl, componentName+'.'+propertyName, message.payloadString);
    } else if (topic.length === renderTopic.split("/").length + 1) {
	// single component update, e.g: /topic/render/objectId/componentName/componentJson
	var componentName = topic[topic.length - 1]; // the parameter to modify
	var sceneObject = topic[topic.length - 2];   // the object with the parameter
	console.log("componentName", componentName);
	console.log("sceneObject", sceneObject);

	var entityEl = sceneObjects[sceneObject];
	
	console.log("payloadstring", message.payloadString);
	console.log("parsed:", AFRAME.utils.styleParser.parse(message.payloadString));
	
	entityEl.setAttribute(componentName, AFRAME.utils.styleParser.parse(message.payloadString));
    } else { // full object update, e.g: /topic/render/object_id,x,y,z,x,y,z,w,sx,sy,sz,#colorhex,on/off
	
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
	    sceneEl.removeChild(sceneObjects[name]);
	    delete sceneObjects[name];
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
		    entityEl.setAttribute('geometry', 'primitive', 'box');
		    entityEl.setAttribute('scale', 0.1 + ' ' + 0.1 + ' ' + 1);
		    entityEl.setAttribute('material', 'color', "#000000");
		    console.log("their camera:", entityEl);
		}

		sceneEl.appendChild(entityEl);
		
		// Add it to our dictionary of scene objects
		sceneObjects[name] = entityEl;
		console.log("entityEL:",entityEl);
		console.log("added ", entityEl, "to sceneObjects["+name+"]");
	    }

	    switch(type) {
	    case "light":
		entityEl.setAttribute('light', 'type', 'ambient');
		// does this work for light a-entities ?
		entityEl.setAttribute('material', 'color', color);
		break;
	    case "camera":
		// no changes but position & rotation later
		break;
	    default:
		entityEl.setAttribute('geometry', 'primitive', type);

		//    var posString = "\""+x+", y: "+y+", z:"+z+"\"";
		//    var rotString = "{x: "+xrot+", y: "+yrot+", z:"+zrot+"}";
		//    var scaleString = "{x: "+xrot+", y: "+yrot+", z:"+zrot+"}";

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
    }
}

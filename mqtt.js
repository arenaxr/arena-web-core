const client = new Paho.MQTT.Client("oz.andrew.cmu.edu", Number(9001), "myClientId" + new Date().getTime());
var objectDict = new Object(); // This will be an associative array of strings and objects

const renderTopic = "/topic/render/#";
const outputTopic = "/topic/webclient";

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

client.connect({ onSuccess: onConnect });

let count = 0;
function onConnect() {
    console.log("onConnect");
    client.subscribe(renderTopic);
    // example MQTT publish command
    // Don't ask me where count came from, or what type it is,
    // you're supposed to not worry about this and just let Javascript take you away...
    //setInterval(() => { publish(outputTopic, `The count is now ${count++}`) }, 1000)

}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
	console.log("onConnectionLost:" + responseObject.errorMessage);
    }
    client.connect({ onSuccess: onConnect });
}

const publish = (dest, msg) => {
    console.log('desint :', dest, 'msggg', msg)
    let message = new Paho.MQTT.Message(msg);
    message.destinationName = dest;
    client.send(message);
}

function onMessageArrived(message) {
    //let el = document.createElement('div')
    //el.innerHTML = message.payloadString
    console.log(message.payloadString);

    // parse string
    var res = message.payloadString.split(",");
    var name = res[0];
    type = name.substring(0, name.indexOf('_'));
    if (type === "cube") {type = "box"}; // called differently in Unity
    if (type === "quad") {type = "plane"}; // called differently also
    var x = res[1];
    var y = res[2];
    var z = res[3];
    var xrot = res[4];
    var yrot = res[5];
    var zrot = res[6];
    var wrot = res[7];

    var quat = new THREE.Quaternion(xrot,yrot,zrot,wrot);
    var euler = new THREE.Euler();
    var foo = euler.setFromQuaternion(quat.normalize(),"YXZ");
    var vec = foo.toVector3();
    var eulerx = -THREE.Math.radToDeg(vec.x);
    var eulery = -THREE.Math.radToDeg(vec.y);
    var eulerz = THREE.Math.radToDeg(vec.z);
    
    var xscale = res[8];
    var yscale = res[9]; if (type === "cylinder") { yscale = yscale * 4; };
    var zscale = res[10];
    var color = res[11];
    var onoff = res[12];

    // look up the sphere-object & set it's position (move it)
    //var sph = document.getElementById('sphere-object');
    //sph.setAttribute('position', message.payloadString);
    
    // Documentation says this is preferred way (faster), but does nothing
    //sph.object3D.position.set(1,2,3);
    //sph.object3D.rotation.y = THREE.Math.degToRad(45);
    //sph.object3D.visible = true;

    // try to rez a new object
    var sceneEl = document.querySelector('a-scene');

    if (onoff === "on") {
	var entityEl;
	if (name in objectDict) {
	    entityEl = objectDict[name];
	    console.log("existing object");
	    console.log(entityEl);
	} else {
	    entityEl = document.createElement('a-entity');
	    objectDict[name] = entityEl;
	}

	entityEl.setAttribute('id', name);
	if (type === "light") {
	    entityEl.setAttribute('light', 'type', 'ambient');
	} else {
	    entityEl.setAttribute('geometry', 'primitive', type);
	}
	//    var posString = "\""+x+", y: "+y+", z:"+z+"\"";
	//    var rotString = "{x: "+xrot+", y: "+yrot+", z:"+zrot+"}";
	//    var scaleString = "{x: "+xrot+", y: "+yrot+", z:"+zrot+"}";

	//    entityEl.object3D.position.set(x,y,z);
	entityEl.setAttribute('position', x + ' ' + y + ' ' + (0 - z));
	//entityEl.object3D.quaternion.set(xrot,yrot,zrot,wrot);
	//entityEl.setAttribute('rotation', xrot + ' ' + yrot + ' ' + zrot);
	entityEl.setAttribute('rotation', eulerx + ' ' + eulery + ' ' + eulerz);
	//entityEl.object3D.scale.set(xscale,yscale,zscale);
	entityEl.setAttribute('scale', xscale + ' ' + yscale + ' ' + zscale);

	entityEl.setAttribute('material', 'color', color);

	sceneEl.appendChild(entityEl);

	//    console.log("geometry: ", entityEl.getAttribute('geometry'));
	console.log("position:" ,entityEl.getAttribute('position'));
	console.log("rotation: ",entityEl.getAttribute('rotation'));
	console.log("scale: ",entityEl.getAttribute('scale'));
    } else {
	sceneEl.removeChild(objectDict[name]);

	delete objectDict[name];
    }
//    console.log("material: ",entityEl.getAttribute('material'));
    
    // need to wait for the DOM to load it
    // ???
    //console.log("loaded: " + entityEl.hasLoaded);
}

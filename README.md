# ARENA
Render 3d content in AFrame from MQTT messages

## References
This code originated as a clone of the demo for a tool that exports a Unity scene as an A-Frame page https://github.com/if1live/unity-scene-web-exporter .
It was then modified to do real-time updating of scene objects based on another demo ("networked AFrame" https://github.com/networked-aframe/networked-aframe) and using MQTT in a browser https://github.com/reese-long/mqtt-browser-demo 

It now bears very little resemblance to the original, much commented out of `index.html`, and much added. The live ARENA site can be viewed at http://xr.andrew.cmu.edu on most devices. 

A sign-on screen at http://xr.andrew.cmu.edu/go lets you set your name, choose an environment theme, and set the 'scene' (associated with a 'topic') which can be thought of as a set of 3d objects. The default is 'render'. The settings are passed into the ARENA page as URL arguments such a `http://xr.andrew.cmu.edu?name=charles&theme=default&scene=render`

## INSTALLATION
Step one is to clone this repo into the default web content folder on a linux machine runing Apache, e.g. in `/var/www/html`.
Step two, you'll also probably want to be running the Mosquitto MQTT server. In addition, it should be a version that supports websockets. To get one with this feature, and without a known crash bug, we recommend using version 1.6.3 and building with websockets enabled, e.g. in `config.mk` set `WITH_WEBSOCKETS:=yes`.

### Local Instance Installation with docker
1. Clone this repo
2. Run docker compose inside the repo: ```docker-compose up```
3. This will start an MQTT server (ports 1883 and 9001) and a webserver (port 8080) on your local machine. The webserver is configured to serve the files in the current folder (the repo folder)
4. Open your browser at ```http://localhost:8080/go/``` and make sure to change the **MQTT Server** to the name/IP of the machine running docker (```localhost``` will work for the browser on the machine running docker)

## Files
 * `mqtt.js` - Javascript to subscribe to MQTT topic(s) via wildcard, parse primitive-object messages, and add/remove AFrame Elements to the scene accordingly.
 The message format (as part of a higher level, more general "ARENA" system design plan for AR) is documented at work-in-progress  
https://conix.io/conix_mw/index.php?title=Spatial_Web/ARENA_Architecture#Pub.2FSub_Structure
 * `index.html` - mostly commented out AFrame HTML wrapper
 * `paho-mqtt.js` - a copy of (but not the location referenced in this code) the Eclipse Paho MQTT library, for convenient inspection
 * `cmds.sh` - linux commands to draw a small grid of test cylinders (to debug rotation)
 * `models/` - AFrame format model and material definitions for a space shuttle from the original demo scene
 * `CONIX.png` - a bitmap so we can draw the Conix logo on things (support for bitmaps on primitives is a TODO) that should really be in:
 * `images/` - a better place to store bitmaps :)
 * `shapes.py` - the most sandbox-like thing here: sample code to send random primitive shape draw commands as MQTT messages
 
 ### models/
 Here are some ready to use models on the server, accessible with the models/modelname.glb parameter:
```
2CylinderEngine.glb      BoxAnimated.glb               Corset.glb             MetalRoughSpheres.glb        RiggedSimple.glb           VertexColorTest.glb
AlphaBlendModeTest.glb   BoxInterleaved.glb            Court.glb              Monster.glb                  Shuttle.glb                WaterBottle.glb
AnimatedMorphCube.glb    BoxTextured.glb               DamagedHelmet.glb      MorphPrimitivesTest.glb      SmilingFace.glb            anthony.glb
AnimatedMorphSphere.glb  BoxTexturedNonPowerOfTwo.glb  Drone.glb              MultiUVTest.glb              Snoop.glb                  drone.glb
AntiqueCamera.glb        BoxVertexColors.glb           Duck.glb               NormalTangentMirrorTest.glb  SpecGlossVsMetalRough.glb  er1k.glb
Avocado.glb              BrainStem.glb                 GearboxAssy.glb        NormalTangentTest.glb        TextureCoordinateTest.glb  falcon.glb
BarramundiFish.glb       Buggy.glb                     Head2.glb              OrientationTest.glb          TextureSettingsTest.glb    hololens.glb
BoomBox.glb              CesiumMan.glb                 InterpolationTest.glb  ReciprocatingSaw.glb         UnlitTest.glb              nuno.glb
Box.glb                  CesiumMilkTruck.glb           Lantern.glb            RiggedFigure.glb             VC.glb                     toni.glb
```
 
 ## General Purpose AFrame using Subtopics
 Most of these take 10 comma separated digits which are x,y,z(location in meters),x,y,z,w(rotation in quaternions),x,y,z(scale factor where 1=100%)
#### Draw a Cube
 Instantiate, persist a cube and set all it's basic parameters
```
mosquitto_pub -r -h oz.andrew.cmu.edu -t /topic/render/cube_1 -m "cube_1,0,0,0,0,0,0,0,1,1,1,#FFEEAA,on"
```
#### Color
change only the color of the already-drawn cube
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/cube_1/material/color -m '#00AA00'
```
#### Transparency
Say the cube has already been drawn. In a second command, something like this sets 50% transparency:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/cube_1/material -m "transparent: true; opacity: 0.5"
```
#### Move
move the position of the already drawn cube
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/cube_1/position -m "x:1; y:2; z:3;"
```
#### Rotate
rotate the already drawn cube
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/cube_1/rotation -m "x:1; y:2; z:3;"
```
#### Animate
animate rotation of the already drawn cube
```
mosquitto_pub -r -t /topic/render/cube_1/animation -h oz.andrew.cmu.edu -m "property: rotation; to: 0 360 0; loop: true; dur: 10000"
```
#### Remove
remove the cube (-n means send a null message)
```
mosquitto_pub -r -h oz.andrew.cmu.edu -t /topic/render/cube_1 -n
```
#### Images
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/image_2 -m "image_2,0,2,-4,0,0,0,0,2,2,2,images/2.png,on"
```
Tiling images is a bit tricky; a still-not-fixed A-Frame bug rejects modifications to materials that have the same bitmap ("src") parameter as some kind of performance boost. But a message like this (after one like the previous) can set the tiling (repeat 4 times along X and Y axes), if you maybe play with the bitmap:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/drone/image_2/material -m "src:images/2.png; repeat: 4 4" -r
```
URLs work in the URL parameter slot. Instead of `images/2.png` it would be e.g. `url(http://xr.andrew.cmu.edu/images/foo.jpg)`  
To update the image of a named image already in the scene, use this syntax:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/drone/image_2/material -m "src: http://xr.andrew.cmu.edu/abstract/downtown.png"
```
#### Other Primitives: TorusKnot
Instantiate a wacky torusKnot, then turn it blue. (look for other primitive types in A-Frame docs; here's a brief list: box circle cone cylinder dodecahedron icosahedron tetrahedron octahedron plane ring sphere torus torusKnot triangle)
```
mosquitto_pub -r -h oz -t /topic/render/torusKnot_1 -m "torusKnot_1,0,0,0,0,0,0,0,1,1,1,#FFEEAA,on"
mosquitto_pub -h oz -t /topic/render/torusKnot_1/material/color -m '#0000FF'
```
#### Models
Instantiate a glTF v2.0 binary model (file extension .glb) from a URL. 
```
mosquitto_pub -r -h oz -t /topic/render/gltf-model_1 -m "gltf-model_1,0,0,0,0,0,0,0,1,1,1,url(models/Duck.glb),on"
```
#### Relocalize Camera
Warp the camera with ID camera_5432 to a new coordinate (system). Values are x,y,z, (meters) x,y,z,w (quaternions)
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/camera_5432/rig -m "3,3,0,0,0,0,0"
```
#### Text
Add some text that says "Hello World"
```
mosquitto_pub -t /topic/render/text_3 -r -h oz.andrew.cmu.edu -m "text_3,1,1,1,0,0,0,1,1,1,1,Hello World,on"
```
Change arbitrary text properties ( https://aframe.io/docs/0.9.0/components/text.html#properties ) for example, material.color:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/text_1/material -m "color: blue"
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/text_1/material -m "color: #FF0000"
```
#### Lights
Persist a red light to the scene
```
mosquitto_pub -t /topic/render/light_3 -r -h oz.andrew.cmu.edu -m "light_3,1,1,1,0.25,0.25,0,1,1,1,1,#FF0000,on"
```
Default is ambient light. To change type, or other light ( https://aframe.io/docs/0.9.0/components/light.html ) parameters, example: change to directional. Options: ambient, directional, hemisphere, point, spot
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/nick/light_1234/light -m "type: directional" -r
```
#### Sound
Play toy piano sound from a URL when you click a cube: first draw the cube
```
mosquitto_pub -t /topic/piano/box_3 -m "box_3,2,0,-4,0,0,0,0,1,1,1,#33AAEE,on" -r
```
then add sound with click event listener:
```
mosquitto_pub -t /topic/piano/box_3/sound -m "src:url(http://xr.andrew.cmu.edu/audio/toypiano/A1.wav); on: mousedown" -r
```
This lets only you hear the piano. To share the piano click events with others viewing the scene, add an event-listener Component:
```
mosquitto_pub -t /topic/piano/box_3/click_listener -n -r
```
#### Lines
Draw a purple line from (2,2,2) to (3,3,3); uses the first 6 parameters
```
mosquitto_pub -t /topic/render/line_1 -r -h oz.andrew.cmu.edu -m "line_1,2,2,2,3,3,3,0,0,0,0,#CE00FF,on"
```
Extend the line with a new segment, colored green
```
mosquitto_pub -t /topic/render/line_1/line__2 -r -h oz.andrew.cmu.edu -m "start: 3 3 3; end: 4 4 4; color: #00FF00"
```
#### Thicklines
"thickline" (to improve openpose skeleton rendering visibility) - works like a line, but the first scale value specifies thickness, e.g. draw a pink line 11 pixels thick from 0,0,0 to 1,1,1:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/thickline_8 -m "thickline_8,0,0,0,1,1,1,0,11,0,0,#FF88EE,on"
```
You might be wondering, why can't normal line just use the scale value to specify thickness? But this one goes to eleven! (really though, normal lines perform faster)
#### Events
Add the "click-listener" event to a scene object; click-listener is a Component defined in `events.js`. This works for adding other, arbitrary Components. A non-empty message gets sent to the Component's `init:` function
```
mosquitto_pub -t /topic/render/cube_1/click-listener -n
```
#### Background themes
Adds one of many predefined backgrounds ( one of: [ none, default, contact, egypt, checkerboard, forest, goaland, yavapai, goldmine, threetowers, poison, arches, tron, japan, dream, volcano, starry, osiris]) to the scene
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/env/environment -m "preset: XXX"
```
#### Particles
This requires importing yet another javascript code blob, see https://www.npmjs.com/package/aframe-particle-system-component  
Done in two parts; first render the holder object for particles, then populate it
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/particle_1 -m "particle_1,0,0,0,0,0,0,1,1,1,1,#FFEEAA,on"
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/particle_1/particle-system -m "preset: snow"
```

#### Physics
You can enable physics (gravity) for a scene object by adding the dynamic-body Component e.g for box_3:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/earth/box_3/dynamic-body -n
```

#### Parent/Child Linking (experimental)
There's support to attach already-existing parent and child scene objects. For example if parent object is box_1 and child object is sphere_2, the command would look like:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/box_1/child -m "sphere_2"
```
But somehow attaching child objects seems to cause them to forget certain parameters, like scale. Also strangely, or maybe not, modifying parent parameters affects the child as well. Scaling the parent by 2 scales the child as well.

This is general; any AFrame supported parameters should be able to be used in the topic hierarchy. Most are single valued (position) some are double (material.color)  
The naming convention for a scene object identifier such as `line_1` is that the part before the underscore is the name of the A-Frame entity, and the part after the underscore is a unique identifier to differentiate from other entities (of the same type) in the scene.
It's up to us whether to make lower level topics for sub-parameters `/material/color` or `material.color`
Lastly, I'm not sure how this should work for retained PubSub messages: it would be possible that when subscribing to all topics of a scene, you will get multiple messages for an object: 1. Instantiation 2. Parameter A 3. Parameter B. and so forth, but not necessarily in the right order. Maybe we use smaller property-update message format for only 'realtime' or 'live' viewers, rather than persist each and every update. This helps address a possible problem with single-property-update topic 'spam': don't retain -> no spam.

#### Scene (global) settings
Some settings are available by setting attributes of the Scene element (see https://aframe.io/docs/0.9.0/core/scene.html) for example,
turn on statistics:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/Scene/stats -m "true"
```
customise the fog:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/Scene/fog -m "type: linear; color: #AAA"
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/Scene/fog -m "type: linear; color: #FFF"
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/Scene/fog -m "type: linear; color: #000"
```
remove the "enter VR" icon:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/Scene/vr-mode-ui -m "enabled: false"
```
#### Vive (laser) controls
I noticed the controllers don't show up in the scene unless they both - and EVERYTHING else for SteamVR - are all working (headset, lighthouses). And sometimes you have to restart SteamVR for hand controllers to show up in the scene; even though SteamVR shows them as being working/on/available/etc., it's possible to open VR mode in an Arena scene and be missing the hand controls.
 
#### EVENTS
 * click events are generated as part of the laser-controls A-Frame entity; you get the events if you click the lasers on scene entities that have click-listener Component in their HTML declaration (see index.html), or have later had click-listener enabled via an MQTT message (see above). Mouse events occur if you click in a browser, or tap on a touchscreen as well.
  - mouseenter
  - mouseleave
  - mousedown 
  - mouseup
 * triggerdown / triggerup for left and right hand controllers  
The MQTT topic name for these events will be the standard prefix (e.g. /topic/render/) concatenated with a string made up of camera name + an identifier +  eventID resulting in e.g.
```
/topic/render/vive-leftHand_1234_eric/triggerdown
``` 
or 
```
/topic/render/vive-rightHand_1234_eric/triggerup
```
 * Full list of Vive controller event names:
   - triggerdown
   - triggerup
   - gripdown
   - gripup
   - menudown
   - menuup
   - systemdown
   - systemup
   - trackpaddown
   - trackpadup
   
The MQTT MESSAGE will be coordinates concatenated with that same identifier, e.g: `1.234,5.678,9.012,vive-leftHand_1234_eric` - the idea being that the identifier matches the camera ID of the person in the scene who did the clicking, or in this case pulled the Vive trigger buttons. The listener can be added directly in the hard coded index.html main Arena page, e.g:
```
<a-entity vive-listener position="2 0.5 -4" id="ViveListenBox" name="Box2" obj-model="obj: #Cube-obj; mtl: #Cube-mtl"></a-entity>
```
or on demand from an MQTT message like click listeners, e.g:
```
mosquitto_pub -t /topic/render/cube_1/vive-listener -n
```
 * 6dof pose events are realtime events for movement of the Vive controls themselves in 3d space. These are kind of verbose in terms of MQTT messages, limited to 10 frames per second, much like the headset pose messages work. This supports the notion of tracking controller movement in real time, including direction (pose). These are enabled, much like the pose-listener Component (both defined in events.js) by adding the vive-pose-listener Component to a scene object directly, in the hard-coded index.html part of every Arena page e.g. `<a-entity vive-pose-listener vive-listener id="vive-leftHand" laser-controls="hand:left"></a-entity>` 

There is nothing coded yet in ARENA to fire events based on Vive control trigger presses in *other peoples viewers* ... the events go to MQTT, and that's all. This is opposed to the way click events work, where all click events are first broadcast over MQTT, then those messages are received and interpreted by viewers, and turned into local, synthetic click events. The exception is that the laser-controls interface sends click events when the triggers are pressed, and click events ARE published to all scene subscribers. Handling of hand control pose information is for now limited to programs subscribing to MQTT.

## Discussion
### Camera
(from A-Frame documentation)

The camera component defines from which perspective the user views the scene. The camera is commonly paired with controls components that allow input devices to move and rotate the camera.

A camera should usually be positioned at the average height of human eye level (1.6 meters). When used with controls that receive rotation or position (e.g. from a VR device) this position will be overridden.
```
<a-entity camera look-controls position="0 1.6 0"></a-entity>
```
  - The above example puts the camera at a position in the scene, but sure enough, when we use a tablet+WebXRViewer or a VR or AR headset, these values are overwritten. IN FACT it turns out that from a desktop browser, at the start of our A-Frame session, regardless of the values set in the HTML above, the start position is set to (0, 1.6, 0). It was misleading that the HTML definition just happened to match. Our code sets it to (0,0,0) in the declaration. It gets more interesting: on a tablet or phone, the start position again gets overridden - by (0,0,0) this time!

When moving or rotating the camera relative to the scene, use a camera rig. By doing so, the camera’s height offset can be updated by roomscale devices, while still allowing the tracked area to be moved independently around the scene.

<a-entity id="rig" position="25 10 0">
  <a-entity id="camera" camera look-controls></a-entity>
</a-entity>

Some hard-coded things:
 * MQTT broker running on `oz.andrew.cmu.edu` - runs with WebSockets enabled, because Paho MQTT needs to use WebSockets
 * MQTT topic structure is in flux. Used to be everything went to `/topic/render`, but this is definitely going to change. Each Object in the scene gets it's own topic, which is the 'name' of the object, e.g: `/topic/render/sphere_3` according to 
 * Naming convention: PrimitiveName_ID where Id is some unique identifier (integers for now), and PrimitiveName is something like 'sphere' 'cube' 'cylinder' etc.
 * MQTT draw messages set the 'Retain' flag such that new people visiting the page (example running at http://xr.andrew.cmu.edu/aframe) will see them. This is how to 'persist' things in the Scene. Otherwise set Retain to False or 'off' and the primitive gets drawn & seen only by those currently viewing the scene; a page re-load and they will disappear
 * Because of this, if you render a ton of retained things, there's a risk of spamming the scene. You might need to clean up by doing something like
  1. Get all the retained objects by subscribing to /topic/render/#
  2. Iterate through the ones you want to remove
  3. For each, issue a publish command to the object+topic, with retain set, and an empty message. This clears the topic. e.g:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/sphere_3 -n -r
```

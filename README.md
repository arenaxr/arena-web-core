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
remove the cube
```
mosquitto_pub -r -h oz.andrew.cmu.edu -t /topic/render/cube_1 -m ""
```
#### Images
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/image_2 -m "image_2,0,2,-4,0,0,0,0,2,2,2,images/2.png,on"
```
Tiling images is a bit tricky; a still-not-fixed A-Frame bug rejects modifications to materials that have the same bitmap ("src") parameter as some kind of performance boost. But a message like this (after one like the previous) can set the tiling (repeat 4 times along X and Y axes), if you maybe play with the bitmap:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/drone/image_2/material -m "src:images/2.png; repeat: 4 4" -r
```
Need to try URLs instead of `images/2.png` to see if we can point to a bitmap at an arbitrary URL.
#### Other Primitives: TorusKnot
Instantiate a wacky torusKnot, then turn it blue. (look for other primitive types in A-Frame docs)
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
mosquitto_pub -t /topic/piano/box_3/click_listener -m "" -r
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
#### Events
Add the "click-listener" event to a scene object; click-listener is a Component defined in `events.js`. This works for adding other, arbitrary Components. A non-empty message gets sent to the Component's `init:` function
```
mosquitto_pub -t /topic/render/cube_1/click-listener -m ""
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

This is general; any AFrame supported parameters should be able to be used in the topic hierarchy. Most are single valued (position) some are double (material.color)  
The naming convention for a scene object identifier such as `line_1` is that the part before the underscore is the name of the A-Frame entity, and the part after the underscore is a unique identifier to differentiate from other entities (of the same type) in the scene.
It's up to us whether to make lower level topics for sub-parameters `/material/color` or `material.color`
Lastly, I'm not sure how this should work for retained PubSub messages: it would be possible that when subscribing to all topics of a scene, you will get multiple messages for an object: 1. Instantiation 2. Parameter A 3. Parameter B. and so forth, but not necessarily in the right order. Maybe we use smaller property-update message format for only 'realtime' or 'live' viewers, rather than persist each and every update. This helps address a possible problem with single-property-update topic 'spam': don't retain -> no spam.

#### Vive (laser) controls
I noticed the controllers don't show up in the scene unless they both - and EVERYTHING else for SteamVR - are all working (headset, lighthouses).
 * click events are generated as part of the laser-controls A-Frame entity; you get the events if you click the lasers on scene entities that have click-listener Component in their HTML declaration (see index.html), or have later had click-listener enabled via an MQTT message (see above).
NEW EVENTS
 * triggerdown / triggerup for left and right hand controllers  
The MQTT topic name for these events will be the standard prefix (e.g. /topic/render/) concatenated with a string made up of camera name + an identifier +  eventID resulting in e.g. `/topic/render/vive-leftHand_1234_eric/triggerdown` or `/topic/render/vive-rightHand_1234_eric/triggerup`
while the MQTT MESSAGE will be coordinates concatenated by that same identifier, e.g: `1.234,5.678,9.012,vive-leftHand_1234_eric` - the idea being that the identifier matches the camera ID of the person in the scene who did the clicking, or in this case pulled the Vive trigger buttons
Lastly are realtime events for movement of the Vive controls themselves in 3d space. These are kind of verbose in terms of MQTT messages at 10 frames per second, much like the headset positions work. This supports the notion of tracking controller movement in real time, including direction (pose).

There is nothing coded yet in ARENA to fire events based on Vive control trigger presses in *otehr peoples viewers* ... the events go to MQTT, and that's all. This is opposed to the way click events work, where all click events broadcast over MQTT get interpreted by viewers and turned into local, synthetic click events. (This kind of functionality remains to be added)

## Commentary
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
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/sphere_3 -m "" -r
```

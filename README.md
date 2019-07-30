# AframeSandbox
proof of concept code for visualization of primitives from MQTT messages

## References
This code originated as a clone of the demo for a tool that exports a Unity scene as an A-Frame page https://github.com/if1live/unity-scene-web-exporter .
It was then modified to do real-time updating of scene objects based on another demo ("networked AFrame" https://github.com/networked-aframe/networked-aframe) and using MQTT in a browser https://github.com/reese-long/mqtt-browser-demo 

It now bears very little resemblance to the original, much commented out of `index.html`, and much added:

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
 
 ## Update 7/29/19: general purpose AFrame using Subtopics
 
 Instantiate a cube and set all it's basic parameters
```
mosquitto_pub -h oz -t /topic/render/cube_1 -m "cube_1,0,0,0,0,0,0,0,1,1,1,#FFEEAA,on"
```
change only the color of the already-drawn cube
```
mosquitto_pub -h oz -t /topic/render/cube_1/material/color -m '#00AA00'
```
move the position of the already drawn cube
```
mosquitto_pub -h oz -t /topic/render/cube_1/position -m "x:1; y:2; z:3;"
```
rotate the already drawn cube
```
mosquitto_pub -h oz -t /topic/render/cube_1/rotation -m "x:1; y:2; z:3;"
```
a wacky torusKnot, then turn it blue
```
mosquitto_pub -h oz -t /topic/render/torusKnot_1 -m "torusKnot_1,0,0,0,0,0,0,0,1,1,1,#FFEEAA,on"
mosquitto_pub -h oz -t /topic/render/torusKnot_1/material/color -m '#0000FF'
```
This is general; any AFrame supported parameters should be able to be used in the topic hierarchy. Most are single valued (position) some are double (material.color)
It's up to us whether to make lower level topics for sub-parameters `/material/color` or `material.color`
Lastly, I'm not sure how this should work for retained PubSub messages: it would be possible that when subscribing to all topics of a scene, you will get multiple messages for an object: 1. Instantiation 2. Parameter A 3. Parameter B. and so forth.

## Commentary
Some hard-coded things:
 * MQTT broker running on `oz.andrew.cmu.edu` - runs with WebSockets enabled, because Paho MQTT needs to use WebSockets
 * MQTT topic structure is in flux. Used to be everything went to `/topic/render`, moving to `/topic/scene/#`. Each Object in the scene gets it's own topic, which is the 'name' of the object, e.g: `/topic/render/sphere_3` according to 
 * Naming convention: PrimitiveName_ID where Id is some unique identifier (integers for now), and PrimitiveName is something like 'sphere' 'cube' 'cylinder' etc.
 * MQTT draw messages set the 'Retain' flag such that new people visiting the page (example running at http://staines.andrew.cmu.edu/aframe) will see them. This is how to 'persist' things in the Scene. Otherwise set Retain to False or 'off' and the primitive gets drawn & seen only by those currently viewing the scene; a page re-load and they will disappear
 * Because of this, if you render a ton of retained things, there's a risk of spamming the scene. You might need to clean up by doing something like
  1. Get all the retained objects by subscribing to /topic/render/#
  2. Iterate through the ones you want to remove
  3. For each, issue a publish command to the object+topic, with retain set, and an empty message. This clears the topic. e.g:
```
mosquitto_pub -h oz.andrew.cmu.edu -t /topic/render/sphere_3 -m "" -r
```

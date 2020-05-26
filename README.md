# ARENA
Render 3d content in AFrame from MQTT messages

## References
This code originated as a clone of the demo for a tool that exports a Unity scene as an A-Frame page https://github.com/if1live/unity-scene-web-exporter .
It was then modified to do real-time updating of scene objects based on another demo ("networked AFrame" https://github.com/networked-aframe/networked-aframe) and using MQTT in a browser https://github.com/reese-long/mqtt-browser-demo 

It now bears very little resemblance to the original, much commented out of `index.html`, and much added. The live ARENA site can be viewed at http://xr.andrew.cmu.edu on most devices. 

A sign-on screen at http://xr.andrew.cmu.edu/go lets you set your name, choose an environment theme, and set the 'scene' (associated with a 'topic') which can be thought of as a set of 3d objects. The default is 'render'. The settings are passed into the ARENA page as URL arguments such as `http://xr.andrew.cmu.edu?name=charles&theme=default&scene=render`. The `name` argument will appear above your head in the 3d world. If you don't specify a name, `X` will appear instead. 

### User IDs 
ARENA visitors are uniquely identified by their camera name, which is also their user name. As all 3D objects in the ARENA are identified by names, camera IDs have 3 underscore separated components, e.g: `camera_1234_er1k`. The last part is what appears above your head (representation in the 3D view), the middle part is a unique ID. If you want to override the random unique ID, you can specify on the URL parameter e.g. `&fixedCamera=er1k` which will ignore the `&name=` and so `er1k` will appear above your head and the camera ID will be `camera_er1k_er1k`. 

## INSTALLATION
Step one is to clone this repo into the default web content folder on a linux machine runing Apache, e.g. in `/var/www/html`.
**AFrame is added as a submodule, use the following command to clone:**

`git clone --recurse-submodules git@github.com:conix-center/ARENA-core.git`

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
 
 ### 3D models/
 Here are some ready-to-use models on the xr.andrew.cmu.edu server, accessible with the models/modelname.glb path:
```
2CylinderEngine.glb            Cameras.gltf              MultiUVTest.glb               TriangleWithoutIndices.gltf  hat2.glb
2CylinderEngine.gltf           CesiumMan.glb             MultiUVTest.gltf              TwoSidedPlane.gltf           helios
AlphaBlendModeTest.glb         CesiumMan.gltf            NormalTangentMirrorTest.glb   UnlitTest.glb                hololens.glb
AlphaBlendModeTest.gltf        CesiumMilkTruck.glb       NormalTangentMirrorTest.gltf  UnlitTest.gltf               izzy
AnimatedCube.gltf              CesiumMilkTruck.gltf      NormalTangentTest.glb         VC.glb                       marcus2.glb
AnimatedMorphCube.glb          Corset.glb                NormalTangentTest.gltf        VC.gltf                      marcus3.glb
AnimatedMorphCube.gltf         Corset.gltf               OrientationTest.glb           VertexColorTest.glb          monkey
AnimatedMorphSphere.glb        Court.glb                 OrientationTest.gltf          VertexColorTest.gltf         nara
AnimatedMorphSphere.gltf       Cube.gltf                 Plane.mtl                     WaterBottle.glb              nuno.glb
AnimatedTriangle.gltf          Cube.mtl                  Plane.obj                     WaterBottle.gltf             palm
AntiqueCamera.glb              Cube.obj                  ReciprocatingSaw.glb          anthony.glb                  peacock
AntiqueCamera.gltf             DamagedHelmet.glb         ReciprocatingSaw.gltf         avocadoman                   rearbody.mtl
Avocado.glb                    DamagedHelmet.gltf        RiggedFigure.glb              baby_yoda                    rearbody.obj
Avocado.gltf                   Drone.glb                 RiggedFigure.gltf             body.mtl                     rhetoritician
BarramundiFish.glb             Duck.glb                  RiggedSimple.glb              body.obj                     scene.bin
BarramundiFish.gltf            Duck.gltf                 RiggedSimple.gltf             cat                          skull
BoomBox.glb                    Earth.glb                 Scene.bin                     chicken                      sphere_clicktest.gltf
BoomBox.gltf                   EnvironmentTest.gltf      SciFiHelmet.gltf              chickenmove                  tail.mtl
BoomBoxWithAxes.gltf           Flags.glb                 Shuttle.glb                   cow                          tail.obj
Box.glb                        FlightHelmet.gltf         SimpleMeshes.gltf             cow2                         throne
Box.gltf                       GearboxAssy.glb           SimpleMorph.gltf              crown                        tiles.mtl
BoxAnimated.glb                GearboxAssy.gltf          SimpleSparseAccessor.gltf     cybertruck                   tiles.obj
BoxAnimated.gltf               Head.gltf                 SmilingFace.glb               drone-small.glb              toni.glb
BoxInterleaved.glb             Head2.glb                 Snoop.glb                     drone.gltf                   tri_prism.glb
BoxInterleaved.gltf            InterpolationTest.glb     SpecGlossVsMetalRough.glb     enginside.mtl                valve_index_left.gltf
BoxTextured.glb                InterpolationTest.gltf    SpecGlossVsMetalRough.gltf    enginside.obj                valve_index_right.gltf
BoxTextured.gltf               Lantern.glb               Sponza.gltf                   engmount.mtl                 vr_controller_vive.mtl
BoxTexturedNonPowerOfTwo.glb   Lantern.gltf              Stringlights.glb              engmount.obj                 vr_controller_vive.obj
BoxTexturedNonPowerOfTwo.gltf  MetalRoughSpheres.glb     Suzanne.gltf                  engout.mtl                   windows.mtl
BoxVertexColors.glb            MetalRoughSpheres.gltf    TextureCoordinateTest.glb     engout.obj                   windows.obj
BoxVertexColors.gltf           Monster.glb               TextureCoordinateTest.gltf    engrim.mtl                   wings.mtl
BrainStem.glb                  Monster.gltf              TextureSettingsTest.glb       engrim.obj                   wings.obj
BrainStem.gltf                 Moon.glb                  TextureSettingsTest.gltf      er1k.glb
Buggy.glb                      MorphPrimitivesTest.glb   TextureTransformTest.gltf     frog
Buggy.gltf                     MorphPrimitivesTest.gltf  Triangle.gltf                 goose
```
##### Getting models from Sketchfab
Sketchfab GLTF models don't always come in convenient single .glb files. Sometimes they consist of a main .gltf file that refers to several textures and other files in a textures/ folder and .glb file. And to make matters worse, the default name is scene.gltf. But if you put everything from the download into a folder of it's own, you can keep it separate from other scene.gltf files, and they will find the right files through relative paths. For example
```
ls /var/www/html/models/nara
scene.bin  scene.gltf  textures
``` 
##### Animated GLTF models
(See below for syntax for playing animations) Models with .gltf extension are text files that can be edited. If you search for 'animation' then search for 'name' you can see the names of animations available to use as arguments.
 ## General Purpose AFrame using Subtopics
 Most of these take JSON data where x,y,z(location in meters),x,y,z,w(rotation in quaternions),x,y,z(scale factor where 1=100%).
If you leave out any of these, defaults will be used: location(0,0,0), rotation(0,0,0,1), scale(1,1,1), color(white). Another general setting is whether or not to persist an object to the ARENA scene database, determined by `"persist": true`
#### Draw a Cube
 Instantiate, persist a cube and set all it's basic parameters
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/cube_1 -m '{"object_id" : "cube_1", "action": "create", "type": "object", "data": {"object_type": "cube", "position": {"x": 1, "y": 1, "z": -1}, "rotation": {"x": 0, "y": 0, "z": 0, "w": 1}, "scale": {"x": 1, "y": 1, "z": 1}, "color": "#FF0000"}}'
```
#### Color
change only the color of the already-drawn cube
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/cube_1 -m '{"object_id" : "cube_1", "action": "update", "type": "object", "data": {"material": {"color": "#00FF00"}}}'
```
#### Transparency
Say the cube has already been drawn. In a second command, something like this sets 50% transparency:
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/cube_1 -m '{"object_id" : "cube_1", "action": "update", "type": "object", "data": {"material": {"transparent": true, "opacity": 0.5}}}'
```
#### Move
move the position of the already drawn cube
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/cube_1 -m '{"object_id" : "cube_1", "action": "update", "type": "object", "data": {"position": {"x": 2, "y": 2, "z": -1}}}'
```
#### Rotate
rotate the already drawn cube; these are in quaternions, not A-Frame degrees
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/cube_1 -m '{"object_id" : "cube_1", "action": "update", "type": "object", "data": {"rotation": {"x": 60, "y": 2, "z": 3}}}'
```
the quaternion (native) representation of rotation is a bit more tricky. The 4 parameters are X,Y,Z,W. Here are some simple examples:
  - `1,0,0,0`: rotate 180 degrees around X axis
  - `0,0.7,0,0.7`: rotate 90 degrees around Y axis
  - `0,0,-0.7,0.7`: rotate -90 degrees around Z axis
#### Animate (rotation, position)
animate rotation of the already drawn cube
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/cube_1 -m '{"object_id" : "cube_1", "action": "update", "type": "object", "data": { "animation": { "property": "rotation", "to": "0 360 0", "loop": true, "dur": 10000}} }'
```
other animations are available that resemble the `"data": {"animation": { "property": ... }}` blob above: see A-Frame documentation for more examples: https://aframe.io/docs/1.0.0/components/animation.html 
#### Remove
remove the cube
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/cube_1 -m '{"object_id" : "cube_1", "action": "delete"}'
```
#### Images
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/drone/image_floor -m '{"object_id": "image_floor", "action": "create", "data": {"object_type": "image", "position": {"x":0, "y": 0, "z": 0.4}, "rotation": {"x": -0.7, "y": 0, "z": 0, "w": 0.7}, "url": "images/floor.png", "scale": {"x":12, "y":12, "z": 2}, "material": {"repeat": {"x":4, "y":4}}}}'
```
URLs work in the URL parameter slot. Instead of `images/2.png` it would be e.g. `url(http://xr.andrew.cmu.edu/images/foo.jpg)`  
To update the image of a named image already in the scene, use this syntax:
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/image_2 -m '{"object_id" : "image_2", "action": "update", "type": "object", "data": {"material": {"src": "https://xr.andrew.cmu.edu/abstract/downtown.png"}}}'
```
#### Images on Objects (e.g.cube)
Use the `multisrc` A-Frame Component to specify different bitmaps for sides of a cube or other primitive shape, e.g:
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/ -m '{"object_id":"die1","action":"create","type":"object","persist":true,"data":{"object_type":"cube","position":{"x":0,"y":0.5,"z":-2},"rotation":{"x":0,"y":0,"z":0,"w":1},"scale":{"x":1,"y":1,"z":1},"color":"#ffffff","dynamic-body":{"type":"dynamic"},"multisrc":{"srcspath":"images/dice/", "srcs":"side1.png,side2.png,side3.png,side4.png,side5.png,side6.png"}}}'
```
#### Other Primitives: TorusKnot
Instantiate a wacky torusKnot, then turn it blue. (look for other primitive types in A-Frame docs; here's a brief list: box circle cone cylinder dodecahedron icosahedron tetrahedron octahedron plane ring sphere torus torusKnot triangle)
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/torusKnot_1 -m '{"object_id" : "torusKnot_1", "action": "create", "data": {"object_type": "torusKnot", "color": "red", "position": {"x": 0, "y": 1, "z": -4}, "rotation": {"x": 0, "y": 0, "z": 0, "w": 1}, "scale": {"x": 1, "y": 1, "z": 1}}}'
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/torusKnot_1 -m '{"object_id" : "torusKnot_1", "action": "update", "type": "object", "data": {"material": {"color": "blue"}}}'
```
#### Models
Instantiate a glTF v2.0 binary model (file extension .glb) from a URL. 
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/gltf-model_1 -m '{"object_id" : "gltf-model_1", "action": "create", "data": {"object_type": "gltf-model", "url": "https://xr.andrew.cmu.edu/models/Duck.glb", "position": {"x": 0, "y": 1, "z": -4}, "rotation": {"x": 0, "y": 0, "z": 0, "w": 1}, "scale": {"x": 1, "y": 1, "z": 1}}}'
```
### Animating GLTF Models
To animate a GLTF model (see above for how to find animation names), set the animation-mixer parameter, e.g:
```
mosquitto_pub -t realm/s/northstar/gltf-model_3-animation -h oz.andrew.cmu.edu -m '{"object_id": "gltf-model_3", "action": "update", "type": "object", "data": {"animation-mixer": {"clip": "*"}}}
```
The asterisk means play all animations, and works better in some situations, where other times the name of a specific animation in the GLTF file works (or maybe several in sequence).
#### Relocalize Camera (Rig)
Move the camera rig (parent object of the camera) with ID camera_1234_er1k to a new coordinate (system). Values are x,y,z, (meters) x,y,z,w (quaternions)
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/ -m '{"object_id" : "camera_1234_er1k", "action": "update", "type": "rig", "data": {"position": {"x": 1, "y":1, "z":1}, "rotation": {"x": 0.1, "y":0, "z":0, "w":1} }}'
```
This assumes we know our camera ID was assigned as `1234`. One way to find out your camera ID is, automatically assigned ones get printed on web browsers' Developer Tools Console in a message like `my-camera name camera_1329_X`. That might not be easily knowable without snooping MQTT messages, so the `&fixedCamera=er1k` URL parameter lets us choose manually the unique ID. If used in the URL, the `&name=` parameter is ignored, and the derived camera/user ID is based on fixedCamera, so would be in this case `camera_er1k_er1k` 
#### Text
Add some red text that says "Hello World"
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/text_3 -m '{"object_id" : "text_3", "action": "create", "data": {"color": "red", "text": "Hello world!", "object_type": "text", "position": {"x": 0, "y": 3, "z": -4}, "rotation": {"x": 0, "y": 0, "z": 0, "w": 1}, "scale": {"x": 1, "y": 1, "z": 1}}}'
```
Change text color properties ( https://aframe.io/docs/0.9.0/components/text.html#properties )
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/text_3 -m '{"object_id" : "text_3", "action": "update", "type": "object", "data": {"text": {"color": "green"}}}'
```
#### Lights
Persist a red light to the scene
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/light_3 -m '{"object_id" : "light_3", "action": "create", "data": {"object_type": "light", "position": {"x": 1, "y": 1, "z": 1}, "rotation": {"x": 0.25, "y": 0.25, "z": 0, "w": 1}, "color": "#FF0000"}}'
```
Default is ambient light. To change type, or other light ( https://aframe.io/docs/0.9.0/components/light.html ) parameters, example: change to directional. Options: ambient, directional, hemisphere, point, spot
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/light_3 -m '{"object_id" : "light_3", "action": "update", "type": "object", "data": {"light": {"type": "directional"}}}'
```
#### Sound
Play toy piano sound from a URL when you click a cube. Sets click-listener Component, waveform URL, and sound attribute:
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/piano/box_asharp -m '{"object_id" : "box_asharp", "action": "create", "data": {"object_type": "cube", "position": {"x": 2.5, "y": 0.25, "z": -5}, "scale": {"x": 0.8, "y":1, "z":1}, "color": "#000000", "sound": {"src": "url(https://xr.andrew.cmu.edu/audio/toypiano/Asharp1.wav)", "on": "mousedown"}, "click-listener": ""}}'
```
#### 360 Video
Draw a sphere, set the texture src to be an equirectangular video, on the 'back' (inside):
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/waterfall/sphere_vid -m '{"object_id" : "sphere_vid", "action": "create", "type": "object", "data": {"object_type": "sphere", "scale": {"x": 200, "y": 200, "z": 200}, "rotation": {"x": 0, "y": 0.7, "z":0, "w": 0.7}, "color": "#808080", "material": {"src": "images/360falls.mp4", "side": "back"}}}'
```
#### Lines
Draw a purple line from (2,2,2) to (3,3,3)
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/line_1 -m '{"object_id" : "line_1", "action": "create", "data": {"object_type": "line", "start": {"x": 2, "y": 2, "z": 2}, "end": {"x": 3, "y": 3, "z": 3}, "color": "#CE00FF"}}'
```
Extend the line with a new segment, colored green
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/line_1 -m '{"object_id" : "line_1", "action": "update", "type": "object", "data": {"line__2": {"start": {"x": 3, "y": 3, "z": 3}, "end": {"x": 4, "y": 4, "z": 4}, "color": "#00FF00"}}}'
```
#### Thicklines
"thickline" (to improve openpose skeleton rendering visibility) - works like a line, but the lineWidth value specifies thickness, and multiple points can be specified at once, e.g. draw a pink line 11 pixels thick from 0,0,0 to 1,0,0 to 1,1,0 to 1,1,1. The shorthand syntax for coordinates is a bonus feature of lower level code; extending it for the rest of ARENA commands remains as an enhancement.
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/thickline_8 -m '{"object_id" : "thickline_8", "action": "create", "type": "object", "data": {"object_type": "thickline", "lineWidth": 11, "color": "#FF88EE", "path": "0 0 0, 1 0 0, 1 1 0, 1 1 1"}}'
```
You might be wondering, why can't normal lines just use the scale value to specify thickness? But this one goes to eleven! (really though, normal lines perform faster) To update a "thickline" takes a special syntax because thicklines are really "meshline"s:
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/thickline_8 -m '{"object_id": "thickline_8", "action": "update", "type": "object", "data": {"meshline": {"lineWidth": 11, "color": "#FFFFFF", "path": "0 0 0, 0 0 1"}}}'
```
#### Events
Add the "click-listener" event to a scene object; click-listener is a Component defined in `events.js`. This works for adding other, arbitrary Components. A non-empty message gets sent to the Component's `init:` function
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/cube_1 -m '{"object_id" : "cube_1", "action": "update", "type": "object", "data": {"click-listener": "enable"}}'
```
#### Temporary Objects: ttl
It's desirable to have objects that don't last forever and pile up. For that there is the 'ttl' parameter that gives objects a lifetime, in seconds. Example usage for a sphere that disappears after 5 seconds (must also use persist=true):
```
 mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/pool/Ball2 -m '{"object_id": "Ball2", "action": "create", "ttl": 5, "persist": true, "data": {"position": {"x": -1, "y": 1, "z": -1}, "color": "blue", "object_type": "sphere"}}'
 ```
#### Transparent Occlusion
To draw a shape that is transparent, but occludes other virtual objects behind it (to simulate virtual objects hidden by real world surfaces like a wall or table), include in the data section this JSON:
```
{"material":{"colorWrite": false}, "render-order": "0"}
```
colorWrite is an attribute of the THREE.js Shader Material that, by exposing it, we make accessible like others belonging to the Material A-Frame Component, and is an alternative way of controlling visibility. render-order is a custom Component that controls which objects are drawn first (not necessarily the same as which are "in front of" others). All other ARENA objects are drawn with render-order of 1. Note: this does not occlude the far background A-Frame layer (like environment component stars) but in AR that layer is not drawn anyway.
#### Background themes
Adds one of many predefined backgrounds ( one of: [ none, default, contact, egypt, checkerboard, forest, goaland, yavapai, goldmine, threetowers, poison, arches, tron, japan, dream, volcano, starry, osiris]) to the scene
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/env -m '{"object_id" : "env", "action": "update", "type": "object", "data": {"environment": {"preset": "arches"}}}'
```

#### Physics
You can enable physics (gravity) for a scene object by adding the dynamic-body Component e.g for box_3:
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/box_3 -m '{"object_id" : "box_3", "action": "update", "type": "object", "data": {"dynamic-body": {"type": "dynamic"}}}' 
```
One physics feature is applying an impulse to an object to set it in motion. This happens in conjunction with an event. As an example, here are messages setting objects fallBox and fallBox2 to respond to mouseup and mousedown messages with an impulse with a certain force and position:
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/fallBox2 {"object_id": "fallBox2", "action": "create", "data": {"object_type": "cube", "dynamic-body": {"type": "dynamic"}, "impulse": {"on": "mousedown", "force": "1 50 1", "position": "1 1 1"}, "click-listener": "", "position": {"x":0.1, "y": 4.5, "z": -4}, "scale": {"x":0.5, "y":0.5, "z": 0.5}}}
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render/fallBox {"object_id": "fallBox", "action": "create", "data": {"object_type": "cube", "dynamic-body": {"type": "dynamic"}, "impulse": {"on": "mouseup", "force": "1 50 1", "position": "1 1 1"}, "click-listener": "", "position": {"x":0, "y": 4, "z": -4}, "scale": {"x":0.5, "y":0.5, "z": 0.5}}}
```
#### Parent/Child Linking
There's support to attach a child to an already-existing parent scene objects. When creating a child object, set the `"parent": "parent_object_id"` value in the JSON data. For example if parent object is gltf-model_Earth and child object is gltf-model_Moon, the commands would look like:
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/earth -m '{"object_id": "gltf-model_Earth", "action": "create", "persist": true, "data": {"object_type": "gltf-model", "position": {"x":0, "y": 0.1, "z": 0}, "url": "models/Earth.glb", "scale": {"x": 5, "y": 5, "z": 5}}}'
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/earth -m '{"object_id": "gltf-model_Moon", "action": "create", "persist": true, "data": {"parent": "gltf-model_Earth", "object_type": "gltf-model", "position": {"x":0, "y": 0.05, "z": 0.6}, "scale": {"x":0.05, "y": 0.05, "z": 0.05}, "url": "models/Moon.glb" }}'
```
Child objects inherit attributes of their parent, for example scale. Scale the parent, the child scales with it. If the parent is already scaled, the child scale will be reflected right away. Child position values are relative to the parent and also scaled.

### Special Components: load-scene and goto-url
In HTML form (which can also be specified inside the `data{}` portion of an MQTT message as attribute-value pairs) we have a couple special things
#### load-scene
Loads the contents of another ARENA scene at a coordinate within the current scene (requires `click-listener`)
as MQTT
```
attribute "load-scene" value "on: mousedown; url://oz.andrew.cmu.edu/drone; position: 0 0 0"
```
as html
```
<a-entity load-scene="on: mousedown; url://oz.andrew.cmu.edu/drone; position: 0 0 0" ...other stuff...></a-entity>
```
#### goto-url
Navigates to entirely new page into browser when clicked, or other event (requires `click-listener`)
as MQTT
```
attribute "goto-url" value "on: mousedown; url://oz.andrew.cmu.edu/drone;"
```
as html
```
<a-entity goto-url="on: mousedown; url://oz.andrew.cmu.edu/drone;</a-entity>
```
#### Particles
Particles are based on https://github.com/harlyq/aframe-spe-particles-component, javascript loaded from https://unpkg.com/aframe-spe-particles-component@^1.0.4/dist/aframe-spe-particles-component.min.js 
For now not directly supported, but rather by passing JSON inside the `data{}` element. The syntax for parameter names has been updated so instead of a name like this that is `space-separated` it becomes `spaceSeparated` (camel case). Three examples here have been created starting with the examples in view-source:https://harlyq.github.io/aframe-spe-particles-component/ then reformulating to ARENA JSON syntax:
```
{"object_id":"smoke","action":"create","persist":true,"data":{"object_type":"cube","position":{"x":0,"y":1,"z":-3.9},"rotation":{"x":0,"y":0,"z":0,"w":1},"scale":{"x":0.01,"y":0.01,"z":0.01},"color":"#ffffff","spe-particles":{"texture":"textures/fog.png","velocity":"1 30 0","velocitySpread":"2 1 0.2","particleCount":50,"maxAge":4,"size":"3,8","opacity":"0,1,0","color":"#aaa,#222"}}}

{"object_id":"flames","action":"create","persist":true,"data":{"object_type":"cube","position":{"x":0,"y":1,"z":-3.8},"rotation":{"x":0,"y":0,"z":0,"w":1},"scale":{"x":0.01,"y":0.01,"z":0.01},"color":"#ffffff","spe-particles":{"texture":"textures/explosion_sheet.png","textureFrames":"5 5","velocity":"4 100 0","acceleration":"0 10 0","accelerationSpread":"0 10 0","velocitySpread":"4 0 4","particleCount":15,"maxAge":1,"size":"4,8","sizeSpread":2,"opacity":"1,0","wiggle":"0 1 0","blending":"additive"}}}

{"object_id":"sparks","action":"create","persist":true,"data":{"object_type":"cube","position":{"x":0,"y":1,"z":-4},"rotation":{"x":0,"y":0,"z":0,"w":1},"scale":{"x":0.01,"y":0.01,"z":0.01},"color":"#ffffff","spe-particles":{"texture":"textures/square.png","color":"yellow,red","particleCount":3,"maxAge":0.5,"maxAgeSpread":1,"velocity":"40 200 40","velocitySpread":"10 3 10","wiggle":"50 0 50","wiggleSpread":"15 0 15","emitterScale":8,"sizeSpread":10,"randomizeVelocity":true}}}
```
Particles are very complicated and take a lot of parameters. It would not make sense to translate all of them into explicit ARENA types, thus this flexible 'raw JSON' format is used.
#### 3d Head Model
By default the ARENA shows your location as a 3d model of a head, with your nose at your location coordinates. If you want to change this, it is available in the scene addressable by an object_id based on your (camera) name, e.g `head-model_camera_1234_er1k` or if you set your name manually in the URL parameter `&fixedCamera=name` as `head-model_camera_name_name`. You can also change the text above your head, which defaults to the last part of your automatically assigned or fixedCamera name (after the underscore). So by default it would appear as `er1k` in the examples above, but can be modified by MQTT message addressed to object_id `head-text_camera_er1k_er1k`.
#### Vive (laser) controls
We've noticed the controllers don't show up in the scene unless they both - and EVERYTHING else for SteamVR - are all working (headset, lighthouses). And sometimes you have to restart SteamVR for hand controllers to show up in the scene; even though SteamVR shows them as being working/on/available/etc., it's possible to open VR mode in an Arena scene and be missing the hand controls.

By default we use A-Frame 'laser-controls' which default to showing Valve Index controller 3D models (gray, circular), even if we are using (equivalent) Vive controllers (black, paddle shaped, not included in the list of controllers known to A-Frame)
#### EVENTS
 * click events are generated as part of the laser-controls A-Frame entity; you get the events if you click the lasers on scene entities that have click-listener Component in their HTML declaration (see index.html), or have later had click-listener enabled via an MQTT message (see above). Mouse events occur if you click in a browser, or tap on a touchscreen as well.
  - mouseenter
  - mouseleave
  - mousedown 
  - mouseup
 * triggerdown / triggerup for left and right hand controllers  
The MQTT topic name for viewing these events can be the standard prefix (e.g. realm/s/render/) concatenated with a string made up of object ID that generated the event. An example event MQTT:
```
realm/s/render/fallBox2 {"object_id":"fallBox2","action":"clientEvent","type":"mousedown","data":{"position":{"x":-0.993,"y":0.342,"z":-1.797},"source":"camera_8715_er"}}
``` 
Note the message itself will contain the originator of the event as a camera/"user" ID and other data like where the object was clicked (in world coordinates[?])

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
   
Event listeners can be added directly in the hard coded index.html main Arena page, e.g:
```
<a-entity vive-listener position="2 0.5 -4" id="ViveListenBox" name="Box2" obj-model="obj: #Cube-obj; mtl: #Cube-mtl"></a-entity>
```
or on demand from an MQTT message that enables click-listener when an object is created, or updated (see above)

* 6dof pose events are realtime events for movement of the Vive controls themselves in 3d space. These are kind of verbose in terms of MQTT messages, limited to 10 frames per second, much like the headset pose messages work. This supports the notion of tracking controller movement in real time, including direction (pose). These are enabled, much like the pose-listener Component (both defined in events.js) by adding the vive-pose-listener Component to a scene object directly, in the hard-coded index.html part of every Arena page e.g. `<a-entity vive-pose-listener vive-listener id="vive-leftHand" laser-controls="hand:left"></a-entity>` 

There is nothing coded yet in ARENA to fire events based on Vive control trigger presses in *other peoples viewers* ... the events go to MQTT, and that's all. This is opposed to the way click events work, where all click events are first broadcast over MQTT, then those messages are received and interpreted by viewers, and turned into local, synthetic click events. The exception is that the laser-controls interface sends click events when the triggers are pressed, and click events ARE published to all scene subscribers. Handling of hand control pose information is for now limited to programs subscribing to MQTT.

#### Scene (global) settings
Some settings are available by setting attributes of the Scene element (see https://aframe.io/docs/0.9.0/core/scene.html) for example,
turn on statistics:
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render -m '{"object_id" : "scene",  "action": "update", "type": "object", "data": {"stats": true}}'
```
customise the fog (notice 3 character hexadecimal color representation):
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render -m '{"object_id" : "scene",  "action": "update", "type": "object", "data": {"fog": {"type": "linear", "color": "#F00"}}}'
```
remove the "enter VR" icon:
```
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/render -m '{"object_id" : "scene",  "action": "update", "type": "object", "data": {"vr-mode-ui": {"enabled": false}}}'
```
other 'global' ARENA objects, by object_id:
 * **groundPlane** an invisible 40x40m plane with physics set to 'static' that prevents objects from falling through the floor, and receives collision events
 * **cameraRig** access to the translational part of camera rig object (to set data attributes beyond what rig update messages do)
 * **cameraSpinner** access the part of the rig that does only rotation
 * **weather** (if enabled) simple weather using particles for snow, rain, dust
 * **sceneRoot** the root entity, parent of all objects
 * **env** environments (see "A-Frame environments"): ground, trees, pillars, background, sky etc.
 * **conix_box** a hard-coded box used for debugging
 * **conix_text** a fixed text object used for debugging
 * **myCamera** to attach HUD objects visible to everyone's camera

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
```
<a-entity id="rig" position="25 10 0">
  <a-entity id="camera" camera look-controls></a-entity>
</a-entity>
```

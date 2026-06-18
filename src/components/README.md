# A-Frame components (modules) added to support ARENA core functionality

## Modules

<dl>
<dt><a href="#module_arena-camera">arena-camera</a></dt>
<dd><p>Tracking camera movement in real time. Emits camera pose change and VIO change events.</p>
</dd>
<dt><a href="#module_arena-hand">arena-hand</a></dt>
<dd><p>Tracking Hand controller movement in real time.</p>
</dd>
<dt><a href="#module_arena-user">arena-user</a></dt>
<dd><p>Another user&#39;s camera in the ARENA. Handles Jitsi and display name updates.</p>
</dd>
<dt><a href="#module_gesture-detector">gesture-detector</a></dt>
<dd><p>Detect multi-finger touch gestures. Publish events accordingly.
Based off 8th Wall&#39;s <a href="https://github.com/8thwall/web/tree/master/examples/aframe">gesture-detector</a></p>
</dd>
<dt><a href="#module_network-latency">network-latency</a></dt>
<dd><p>Publish with qos of 2 for network graph to update latency</p>
</dd>
<dt><a href="#module_press-and-move">press-and-move</a></dt>
<dd><p>Press and move camera; User camera movement with the mouse.
Based off <a href="https://github.com/aframevr/aframe/blob/master/src/components/wasd-controls.js">wasd controls</a></p>
</dd>
<dt><a href="#module_vr-thumbstick-fly">vr-thumbstick-fly</a></dt>
<dd><p>Thumbstick flight controls for VR right controller.</p>
</dd>
<dt><a href="#module_load-scene">load-scene</a></dt>
<dd><p>Load scene from persistence.</p>
</dd>
<dt><a href="#module_armarker">armarker</a></dt>
<dd><p>ARMarker Component. Supports ARMarkers in a scene</p>
</dd>
<dt><a href="#module_attribution">attribution</a></dt>
<dd><p>Attribution Component. Saves attribution data in any entity. The following properties can be saved.</p>
<!-- markdown-link-check-disable-next-line -->
<p>If <code>extractAssetExtras=true</code> (default), the <a href="https://help.sketchfab.com/hc/en-us/articles/202512396-Model-Properties">attribution system</a> attempts to extract data automatically from the model (requires models with authorship metadata; e.g. models downloaded from sketchfab have these data)</p>
</dd>
<dt><a href="#module_click-listener">click-listener</a></dt>
<dd><p>Keep track of mouse events and publish corresponding events</p>
</dd>
<dt><a href="#module_collision-listener">collision-listener</a></dt>
<dd><p>Listen for collisions, callback on event.
Requires <a href="https://github.com/c-frame/physx">A-Frame PhysX</a></p>
</dd>
<dt><a href="#module_goto-url">goto-url</a></dt>
<dd><p>Load new URL when object is clicked</p>
</dd>
<dt><a href="#module_jitsi-video">jitsi-video</a></dt>
<dd><p>Apply a jitsi video to a geometry
Jitsi video source can be defined using a jitsiId or (ARENA/Jitsi) display name</p>
</dd>
<dt><a href="#module_landmark">landmark</a></dt>
<dd><p>Component-System of teleport destination Landmarks</p>
</dd>
<dt><a href="#module_material-extras">material-extras</a></dt>
<dd><p>Allows to set extra material properties, namely texture colorspace, whether to render the material&#39;s color and render order.
The properties set here access directly <a href="https://threejs.org/docs/#api/en/materials/Material">Three.js material</a>.
Implements a timeout scheme in lack of better management of the timing/events causing properties to not be available.</p>
</dd>
<dt><a href="#module_pcd-model">pcd-model</a></dt>
<dd><p>Load Point Cloud Data (PCD) models using three.js example loader
Point Cloud Data is a file format for Point Cloud Library.
<a href="https://en.wikipedia.org/wiki/Point_Cloud_Library">https://en.wikipedia.org/wiki/Point_Cloud_Library</a></p>
</dd>
<dt><a href="#module_screenshareable">screenshareable</a></dt>
<dd><p>Screenshare-able Component. Allows an object to be screenshared upon</p>
</dd>
<dt><a href="#module_textinput">textinput</a></dt>
<dd><p>Opens an HTML prompt when clicked. Sends text input as an event on MQTT</p>
</dd>
<dt><a href="#module_threejs-scene">threejs-scene</a></dt>
<dd><p>Load a <a href="https://threejs.org/docs/#api/en/scenes/Scene">THREE.js scene</a>. THREE.js scene format is an almost direct serialization of the THREE.js objects, and can be THREE.js version-specific; you can see THREE.js version in the JS console once you open ARENA
For a move portable format, using glTF is preferred.</p>
</dd>
<dt><a href="#module_ttl">ttl</a></dt>
<dd><p>Time To Live (TTL) component.</p>
<p>When applied to an entity, the entity will remove itself from DOM after the specified number of seconds.
Update <em>is</em> allowed, which will reset the timer to start from that moment. Note that this is a top-level property
in MQTT messages, with the seconds value simply as a scalar rather than a nested object property.</p>
</dd>
<dt><a href="#module_pcd-model">pcd-model</a></dt>
<dd><p>Load URDF models using urdf-loader example.</p>
</dd>
<dt><a href="#module_video-control">video-control</a></dt>
<dd><p>Adds a video to an entity and controls its playback.</p>
</dd>
</dl>

## Classes

<dl>
<dt><a href="#STLLoader">STLLoader</a></dt>
<dd><p>Description: A THREE loader for STL ASCII files, as created by Solidworks and other CAD programs.</p>
<p>Supports both binary and ASCII encoded files, with automatic detection of type.</p>
<p>The loader returns a non-indexed buffer geometry.</p>
<p>Limitations:
 Binary decoding supports &quot;Magics&quot; color format (<a href="http://en.wikipedia.org/wiki/STL_(file_format)#Color_in_binary_STL">http://en.wikipedia.org/wiki/STL_(file_format)#Color_in_binary_STL</a>).
 There is perhaps some question as to how valid it is to always assume little-endian-ness.
 ASCII decoding assumes file is UTF-8.</p>
<p>Usage:
 const loader = new STLLoader();
 loader.load( &#39;./models/stl/slotted_disk.stl&#39;, function ( geometry ) {
   scene.add( new THREE.Mesh( geometry ) );
 });</p>
<p>For binary STLs geometry might contain colors for vertices. To use it:
 // use the same code to load STL as above
 if (geometry.hasColors) {
   material = new THREE.MeshPhongMaterial({ opacity: geometry.alpha, vertexColors: true });
 } else { .... }
 const mesh = new THREE.Mesh( geometry, material );</p>
<p>For ASCII STLs containing multiple solids, each solid is assigned to a different group.
Groups can be used to assign a different color by defining an array of materials with the same length of
geometry.groups and passing it to the Mesh constructor:</p>
<p>const mesh = new THREE.Mesh( geometry, material );</p>
<p>For example:</p>
<p> const materials = [];
 const nGeometryGroups = geometry.groups.length;</p>
<p> const colorMap = ...; // Some logic to index colors.</p>
<p> for (let i = 0; i &lt; nGeometryGroups; i++) {</p>
<pre><code>    const material = new THREE.MeshPhongMaterial({
        color: colorMap[i],
        wireframe: false
    });
</code></pre>
<p> }</p>
<p> materials.push(material);
 const mesh = new THREE.Mesh(geometry, materials);</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#emitPush">emitPush(targetId, targetBodyData, impulse, point, _sourcePose)</a></dt>
<dd><p>emitPush</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#distribution">distribution</a> : <code>Number</code></dt>
<dd></dd>
<dt><a href="#Group">Group</a> : <code>Object</code></dt>
<dd><p>An SPE.Group instance.</p>
</dd>
<dt><a href="#GroupOptions">GroupOptions</a> : <code>Object</code></dt>
<dd><p>A map of options to configure an SPE.Group instance.</p>
</dd>
<dt><a href="#Emitter">Emitter</a> : <code>Object</code></dt>
<dd><p>An SPE.Emitter instance.</p>
</dd>
<dt><a href="#EmitterOptions">EmitterOptions</a> : <code>Object</code></dt>
<dd><p>A map of options to configure an SPE.Emitter instance.</p>
</dd>
</dl>

<a name="module_arena-camera"></a>

## arena-camera
Tracking camera movement in real time. Emits camera pose change and VIO change events.

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| enabled | <code>boolean</code> | Indicates whether camera tracking is enabled. |
| displayName | <code>string</code> | User display name (used to publish camera data). |
| color | <code>string</code> | Head text color. |
| rotation | <code>Array.&lt;number&gt;</code> | Last camera rotation value. |
| position | <code>Array.&lt;number&gt;</code> | Last camera position value. |
| showStats | <code>boolean</code> | Display camera position on the screen. |

<a name="module_arena-hand"></a>

## arena-hand
Tracking Hand controller movement in real time.

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| enabled | <code>boolean</code> | Controller enabled. |
| hand | <code>string</code> | Controller hand. |

<a name="module_arena-user"></a>

## arena-user
Another user's camera in the ARENA. Handles Jitsi and display name updates.

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [color] | <code>color</code> | <code>white</code> | The color for the user's name text. |
| [headModelPath] | <code>string</code> | <code>&quot;/static/models/avatars/robobit.glb&quot;</code> | Path to user head model |
| [presence] | <code>string</code> |  | type of presence for user |
| [jitsiId] | <code>string</code> |  | User jitsi id. |
| [displayName] | <code>string</code> |  | User display name. |
| [hasAudio] | <code>boolean</code> | <code>false</code> | Whether the user has audio on. |
| [hasVideo] | <code>boolean</code> | <code>false</code> | Whether the user has video on. |
| [hasAvatar] | <code>boolean</code> | <code>false</code> | Whether the user has face tracking on. |

<a name="module_gesture-detector"></a>

## gesture-detector
Detect multi-finger touch gestures. Publish events accordingly.
Based off 8th Wall's [gesture-detector](https://github.com/8thwall/web/tree/master/examples/aframe)

<a name="module_network-latency"></a>

## network-latency
Publish with qos of 2 for network graph to update latency

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| UPDATE_INTERVAL_MS | <code>number</code> | <code>10000</code> | Interval to send the periodic pings (ms) |

<a name="module_press-and-move"></a>

## press-and-move
Press and move camera; User camera movement with the mouse.
Based off [wasd controls](https://github.com/aframevr/aframe/blob/master/src/components/wasd-controls.js)

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [acceleration] | <code>number</code> | <code>30</code> | Movement acceleration. |
| [enabled] | <code>boolean</code> | <code>true</code> | Is the camera movement component enabled. |
| [fly] | <code>boolean</code> | <code>true</code> | Is the camera at a fixed height (`fly=false`) or not (`fly=true`) |

<a name="module_vr-thumbstick-fly"></a>

## vr-thumbstick-fly
Thumbstick flight controls for VR right controller.

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [speed] | <code>number</code> | <code>1.0</code> | Movement speed in m/s. |
| [enabled] | <code>boolean</code> | <code>true</code> | Is the camera movement component enabled. |
| [cameraRig] | <code>string</code> | <code>&quot;#cameraRig&quot;</code> | Selector for the camera rig entity. |
| [camera] | <code>string</code> | <code>&quot;#my-camera&quot;</code> | Selector for the camera entity. |

<a name="module_load-scene"></a>

## load-scene
Load scene from persistence.

**Todo**

- [ ] this component is currently not used and probably needs to be updated

<a name="module_armarker"></a>

## armarker
ARMarker Component. Supports ARMarkers in a scene

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [markertype] | <code>string</code> | <code>&quot;apriltag_36h11&quot;</code> | The marker type. One of 'apriltag_36h11', 'lightanchor', 'uwb', 'vive', 'optitrack' |
| [dynamic] | <code>boolean</code> | <code>false</code> | Whether tag is a static and used to for camera relocalization, or dynamic and used for object tracking |
| [publish] | <code>boolean</code> | <code>false</code> | Force publish of tag detections to realm/g/, even without networked solver mode |
| [buildable] | <code>boolean</code> | <code>false</code> | Whether tag has "dynamic" toggled on click. Used to position a tag, then lock into position |
| [markerid] | <code>string</code> |  | Marker id. Typically an integer (e.g. for AprilTag 36h11 family, an integer in the range [0, 586]) |
| [size] | <code>number</code> | <code>150</code> | Size of the marker (assumed to be a square), if applicable (mm). |
| [url] | <code>string</code> |  | A URL associated with the marker. |
| [lat] | <code>number</code> | <code>0</code> | Marker latitude. |
| [long] | <code>number</code> | <code>0</code> | Marker longitude. |
| [ele] | <code>number</code> | <code>0</code> | Marker elevation. |

<a name="module_attribution"></a>

## attribution
Attribution Component. Saves attribution data in any entity. The following properties can be saved.
<!-- markdown-link-check-disable-next-line -->
If `extractAssetExtras=true` (default), the [attribution system](https://help.sketchfab.com/hc/en-us/articles/202512396-Model-Properties) attempts to extract data automatically from the model (requires models with authorship metadata; e.g. models downloaded from sketchfab have these data)

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [author] | <code>string</code> | <code>&quot;Unknown&quot;</code> | Author name; e.g. "Vaptor-Studio" |
| [authorURL] | <code>string</code> |  | Author homepage/profile; e.g. https://sketchfab.com/VapTor |
| [license] | <code>string</code> | <code>&quot;Unknown&quot;</code> | License summary/short name; e.g. "CC-BY-4.0". |
| [licenseURL] | <code>string</code> |  | License URL; e.g. http://creativecommons.org/licenses/by/4.0/ |
| [source] | <code>string</code> | <code>&quot;Unknown&quot;</code> | Model source e.g. "Sketchfab". |
| [sourceURL] | <code>string</code> |  | Model source URL; e.g. https://sketchfab.com/models/2135501583704537907645bf723685e7 |
| [title] | <code>string</code> | <code>&quot;No Title&quot;</code> | Model title; e.g. "Spinosaurus". |
| id | <code>string</code> |  | The entity id in the scene; automatically filled in on component init |
| [extractAssetExtras] | <code>boolean</code> | <code>true</code> | Extract attribution info from asset extras; will override attribution info given (default: true) |

<a name="module_click-listener"></a>

## click-listener
Keep track of mouse events and publish corresponding events

<a name="module_collision-listener"></a>

## collision-listener
Listen for collisions, callback on event.
Requires [A-Frame PhysX](https://github.com/c-frame/physx)

**Requires**: <code>module:&#x27;aframe-physx&#x27;</code>  
<a name="module_goto-url"></a>

## goto-url
Load new URL when object is clicked

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| on | <code>string</code> |  | A case-sensitive string representing the [event type](https://developer.mozilla.org/en-US/docs/Web/Events) to listen for, e.g. 'mousedown', 'mouseup' |
| url | <code>string</code> |  | The destination url e.g. https://example.com |
| [dest] | <code>string</code> | <code>&quot;sametab&quot;</code> | Where to open the URL; one of 'popup', 'newtab', 'sametab' |

<a name="module_jitsi-video"></a>

## jitsi-video
Apply a jitsi video to a geometry
Jitsi video source can be defined using a jitsiId or (ARENA/Jitsi) display name

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [jitsiId] | <code>string</code> | JitsiId of the video source; If defined will override displayName |
| [displayName] | <code>string</code> | ARENA or Jitsi display name of the video source; Will be ignored if jitsiId is given. Editing this property requires reload |

<a name="module_landmark"></a>

## landmark
Component-System of teleport destination Landmarks

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [randomRadiusMin] | <code>number</code> | <code>0</code> | Min for a random range to teleport to. Max must > 0 |
| [randomRadiusMax] | <code>number</code> | <code>0</code> | Max for a random range to teleport to. |
| [offsetPosition] | <code>THREE.Vector3</code> | <code>{0,1.6,0}</code> | vector3 {x,y,z} to use as static teleport offset |
| [constrainToNavMesh] | <code>string</code> | <code>&quot;&#x27;false&#x27;&quot;</code> | Teleports here should snap to navmesh. ['false', 'any', 'coplanar'] |
| [startingPosition] | <code>boolean</code> | <code>false</code> | True: use as a random scene load-in position |
| [lookAtLandmark] | <code>boolean</code> | <code>true</code> | True: After teleporting, user should rotate @ landmark |
| label | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | Display label for Landmarks UI menu |

<a name="module_material-extras"></a>

## material-extras
Allows to set extra material properties, namely texture colorspace, whether to render the material's color and render order.
The properties set here access directly [Three.js material](https://threejs.org/docs/#api/en/materials/Material).
Implements a timeout scheme in lack of better management of the timing/events causing properties to not be available.

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [overrideSrc] | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | Overrides the material in all meshes of an object (e.g. a basic shape or a GLTF). |
| [colorSpace] | <code>string</code> | <code>&quot;SRGBColorSpace&quot;</code> | The material colorspace; See [Three.js material](https://threejs.org/docs/#api/en/materials/Material). |
| [colorWrite] | <code>boolean</code> | <code>true</code> | Whether to render the material's color. See [Three.js material](https://threejs.org/docs/#api/en/materials/Material). |
| [renderOrder] | <code>number</code> | <code>1</code> | This value allows the default rendering order of scene graph objects to be overridden. See [Three.js Object3D.renderOrder](https://threejs.org/docs/#api/en/core/Object3D.renderOrder). |
| [transparentOccluder] | <code>boolean</code> | <code>false</code> | If `true`, will set `colorWrite=false` and `renderOrder=0` to make the material a transparent occluder. |
| [gltfOpacity] | <code>number</code> | <code>1</code> | Traverses object materials, setting opacity of each one. |

<a name="module_pcd-model"></a>

## pcd-model
Load Point Cloud Data (PCD) models using three.js example loader
Point Cloud Data is a file format for Point Cloud Library.
https://en.wikipedia.org/wiki/Point_Cloud_Library

<a name="module_screenshareable"></a>

## screenshareable
Screenshare-able Component. Allows an object to be screenshared upon

<a name="module_textinput"></a>

## textinput
Opens an HTML prompt when clicked. Sends text input as an event on MQTT

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [on] | <code>string</code> | <code>&quot;mousedown&quot;</code> | A case-sensitive string representing the [event type](https://developer.mozilla.org/en-US/docs/Web/Events) to listen for, e.g. 'mousedown', 'mouseup' |
| [title] | <code>string</code> | <code>&quot;Text Input&quot;</code> | The prompt title |
| [label] | <code>string</code> | <code>&quot;Input text below (max is 140 characters)&quot;</code> | Text prompt label |
| [placeholder] | <code>string</code> | <code>&quot;Type here&quot;</code> | Text input place holder |

<a name="module_threejs-scene"></a>

## threejs-scene
Load a [THREE.js scene](https://threejs.org/docs/#api/en/scenes/Scene). THREE.js scene format is an almost direct serialization of the THREE.js objects, and can be THREE.js version-specific; you can see THREE.js version in the JS console once you open ARENA
For a move portable format, using glTF is preferred.

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | the three.js scene to load |

<a name="module_ttl"></a>

## ttl
Time To Live (TTL) component.

When applied to an entity, the entity will remove itself from DOM after the specified number of seconds.
Update *is* allowed, which will reset the timer to start from that moment. Note that this is a top-level property
in MQTT messages, with the seconds value simply as a scalar rather than a nested object property.

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| expireAt | <code>int</code> | Epoch until entity is removed |

<a name="module_pcd-model"></a>

## pcd-model
Load URDF models using urdf-loader example.

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | the model URL |
| joints | <code>string</code> | dictionary with joints values (degrees), in the form "JointName1: ValueInDegrees1, JointName2: ValueInDegrees2, ..." (see example) |

**Example** *(Set joint values (in degrees) in the form &quot;JointName1: ValueInDegrees1, JointName2: ValueInDegrees2, ...&quot;. Example: )*  
```js
  "HP1:30, KP1:120, AP1:-60, HP2:30, KP2:120, AP2:-60, HP3:30, KP3:120, AP3:-60, HP4:30, KP4:120, AP4:-60, HP5:30, KP5:120, AP5:-60, HP6:30, KP6:120, AP6:-60"
```
<a name="module_video-control"></a>

## video-control
Adds a video to an entity and controls its playback.

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| video_object | <code>string</code> |  | the object id of the element where to display the video |
| video_path | <code>string</code> |  | path/url to the video |
| [frame_object] | <code>string</code> |  | path/url to the keyframe to display |
| [anyone_clicks] | <code>boolean</code> | <code>true</code> | anyone clicks |
| [video_loop] | <code>boolean</code> | <code>true</code> | video loop |
| [autoplay] | <code>boolean</code> | <code>false</code> | video autoplays on load |
| [volume] | <code>number</code> | <code>1</code> | video sound volume |

<a name="STLLoader"></a>

## STLLoader
Description: A THREE loader for STL ASCII files, as created by Solidworks and other CAD programs.

Supports both binary and ASCII encoded files, with automatic detection of type.

The loader returns a non-indexed buffer geometry.

Limitations:
 Binary decoding supports "Magics" color format (http://en.wikipedia.org/wiki/STL_(file_format)#Color_in_binary_STL).
 There is perhaps some question as to how valid it is to always assume little-endian-ness.
 ASCII decoding assumes file is UTF-8.

Usage:
 const loader = new STLLoader();
 loader.load( './models/stl/slotted_disk.stl', function ( geometry ) {
   scene.add( new THREE.Mesh( geometry ) );
 });

For binary STLs geometry might contain colors for vertices. To use it:
 // use the same code to load STL as above
 if (geometry.hasColors) {
   material = new THREE.MeshPhongMaterial({ opacity: geometry.alpha, vertexColors: true });
 } else { .... }
 const mesh = new THREE.Mesh( geometry, material );

For ASCII STLs containing multiple solids, each solid is assigned to a different group.
Groups can be used to assign a different color by defining an array of materials with the same length of
geometry.groups and passing it to the Mesh constructor:

const mesh = new THREE.Mesh( geometry, material );

For example:

 const materials = [];
 const nGeometryGroups = geometry.groups.length;

 const colorMap = ...; // Some logic to index colors.

 for (let i = 0; i < nGeometryGroups; i++) {

		const material = new THREE.MeshPhongMaterial({
			color: colorMap[i],
			wireframe: false
		});

 }

 materials.push(material);
 const mesh = new THREE.Mesh(geometry, materials);

**Kind**: global class  
<a name="emitPush"></a>

## emitPush(targetId, targetBodyData, impulse, point, _sourcePose)
emitPush

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| targetId | <code>string</code> | The id of the target object to push. |
| targetBodyData | <code>Object</code> | The pose and velocities of the target object prior to push. |
| impulse | <code>Object</code> | The impulse vector {x, y, z}. |
| point | <code>Object</code> | The world point at which to apply the impulse {x, y, z}. |
| _sourcePose | <code>Object</code> | The pose of the source (pusher), including position and rotation. |

<a name="distribution"></a>

## distribution : <code>Number</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| SPE.distributions.BOX | <code>Number</code> | Values will be distributed within a box. |
| SPE.distributions.SPHERE | <code>Number</code> | Values will be distributed within a sphere. |
| SPE.distributions.DISC | <code>Number</code> | Values will be distributed within a 2D disc. |

<a name="Group"></a>

## Group : <code>Object</code>
An SPE.Group instance.

**Kind**: global typedef  
**See**: SPE.Group  
<a name="GroupOptions"></a>

## GroupOptions : <code>Object</code>
A map of options to configure an SPE.Group instance.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| texture | <code>Object</code> |  | An object describing the texture used by the group. |
| texture.value | <code>Object</code> |  | An instance of THREE.Texture. |
| [texture.frames] | <code>Object</code> |  | A THREE.Vector2 instance describing the number                                    of frames on the x- and y-axis of the given texture.                                    If not provided, the texture will NOT be treated as                                    a sprite-sheet and as such will NOT be animated. |
| [texture.frameCount] | <code>Number</code> | <code>texture.frames.x * texture.frames.y</code> | The total number of frames in the sprite-sheet.                                                                   Allows for sprite-sheets that don't fill the entire                                                                   texture. |
| texture.loop | <code>Number</code> |  | The number of loops through the sprite-sheet that should                                 be performed over the course of a single particle's lifetime. |
| fixedTimeStep | <code>Number</code> |  | If no `dt` (or `deltaTime`) value is passed to this group's                                  `tick()` function, this number will be used to move the particle                                  simulation forward. Value in SECONDS. |
| hasPerspective | <code>Boolean</code> |  | Whether the distance a particle is from the camera should affect                                    the particle's size. |
| colorize | <code>Boolean</code> |  | Whether the particles in this group should be rendered with color, or                              whether the only color of particles will come from the provided texture. |
| blending | <code>Number</code> |  | One of Three.js's blending modes to apply to this group's `ShaderMaterial`. |
| transparent | <code>Boolean</code> |  | Whether these particle's should be rendered with transparency. |
| alphaTest | <code>Number</code> |  | Sets the alpha value to be used when running an alpha test on the `texture.value` property. Value between 0 and 1. |
| depthWrite | <code>Boolean</code> |  | Whether rendering the group has any effect on the depth buffer. |
| depthTest | <code>Boolean</code> |  | Whether to have depth test enabled when rendering this group. |
| fog | <code>Boolean</code> |  | Whether this group's particles should be affected by their scene's fog. |
| scale | <code>Number</code> |  | The scale factor to apply to this group's particle sizes. Useful for                          setting particle sizes to be relative to renderer size. |

<a name="Emitter"></a>

## Emitter : <code>Object</code>
An SPE.Emitter instance.

**Kind**: global typedef  
**See**: SPE.Emitter  
<a name="EmitterOptions"></a>

## EmitterOptions : <code>Object</code>
A map of options to configure an SPE.Emitter instance.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [type] | [<code>distribution</code>](#distribution) | <code>BOX</code> | The default distribution this emitter should use to control                         its particle's spawn position and force behaviour.                         Must be an SPE.distributions.* value. |
| [particleCount] | <code>Number</code> | <code>100</code> | The total number of particles this emitter will hold. NOTE: this is not the number                                  of particles emitted in a second, or anything like that. The number of particles                                  emitted per-second is calculated by particleCount / maxAge (approximately!) |
| [duration] | <code>Number</code> \| <code>null</code> | <code></code> | The duration in seconds that this emitter should live for. If not specified, the emitter                                         will emit particles indefinitely.                                         NOTE: When an emitter is older than a specified duration, the emitter is NOT removed from                                         it's group, but rather is just marked as dead, allowing it to be reanimated at a later time                                         using `SPE.Emitter.prototype.enable()`. |
| [isStatic] | <code>Boolean</code> | <code>false</code> | Whether this emitter should be not be simulated (true). |
| [activeMultiplier] | <code>Boolean</code> | <code>1</code> | A value between 0 and 1 describing what percentage of this emitter's particlesPerSecond should be                                          emitted, where 0 is 0%, and 1 is 100%.                                          For example, having an emitter with 100 particles, a maxAge of 2, yields a particlesPerSecond                                          value of 50. Setting `activeMultiplier` to 0.5, then, will only emit 25 particles per second (0.5 = 50%).                                          Values greater than 1 will emulate a burst of particles, causing the emitter to run out of particles                                          before it's next activation cycle. |
| [direction] | <code>Boolean</code> | <code>1</code> | The direction of the emitter. If value is `1`, emitter will start at beginning of particle's lifecycle.                                   If value is `-1`, emitter will start at end of particle's lifecycle and work it's way backwards. |
| [maxAge] | <code>Object</code> | <code>{}</code> | An object describing the particle's maximum age in seconds. |
| [maxAge.value] | <code>Number</code> | <code>2</code> | A number between 0 and 1 describing the amount of maxAge to apply to all particles. |
| [maxAge.spread] | <code>Number</code> | <code>0</code> | A number describing the maxAge variance on a per-particle basis. |
| [position] | <code>Object</code> | <code>{}</code> | An object describing this emitter's position. |
| [position.value] | <code>Object</code> | <code>new THREE.Vector3()</code> | A THREE.Vector3 instance describing this emitter's base position. |
| [position.spread] | <code>Object</code> | <code>new THREE.Vector3()</code> | A THREE.Vector3 instance describing this emitter's position variance on a per-particle basis.                                                          Note that when using a SPHERE or DISC distribution, only the x-component                                                          of this vector is used. |
| [position.spreadClamp] | <code>Object</code> | <code>new THREE.Vector3()</code> | A THREE.Vector3 instance describing the numeric multiples the particle's should                                                               be spread out over.                                                               Note that when using a SPHERE or DISC distribution, only the x-component                                                               of this vector is used. |
| [position.radius] | <code>Number</code> | <code>10</code> | This emitter's base radius. |
| [position.radiusScale] | <code>Object</code> | <code>new THREE.Vector3()</code> | A THREE.Vector3 instance describing the radius's scale in all three axes. Allows a SPHERE or DISC to be squashed or stretched. |
| [position.distribution] | [<code>distribution</code>](#distribution) | <code>value of the &#x60;type&#x60; option.</code> | A specific distribution to use when radiusing particles. Overrides the `type` option. |
| [position.randomise] | <code>Boolean</code> | <code>false</code> | When a particle is re-spawned, whether it's position should be re-randomised or not. Can incur a performance hit. |
| [velocity] | <code>Object</code> | <code>{}</code> | An object describing this particle velocity. |
| [velocity.value] | <code>Object</code> | <code>new THREE.Vector3()</code> | A THREE.Vector3 instance describing this emitter's base velocity. |
| [velocity.spread] | <code>Object</code> | <code>new THREE.Vector3()</code> | A THREE.Vector3 instance describing this emitter's velocity variance on a per-particle basis.                                                          Note that when using a SPHERE or DISC distribution, only the x-component                                                          of this vector is used. |
| [velocity.distribution] | [<code>distribution</code>](#distribution) | <code>value of the &#x60;type&#x60; option.</code> | A specific distribution to use when calculating a particle's velocity. Overrides the `type` option. |
| [velocity.randomise] | <code>Boolean</code> | <code>false</code> | When a particle is re-spawned, whether it's velocity should be re-randomised or not. Can incur a performance hit. |
| [acceleration] | <code>Object</code> | <code>{}</code> | An object describing this particle's acceleration. |
| [acceleration.value] | <code>Object</code> | <code>new THREE.Vector3()</code> | A THREE.Vector3 instance describing this emitter's base acceleration. |
| [acceleration.spread] | <code>Object</code> | <code>new THREE.Vector3()</code> | A THREE.Vector3 instance describing this emitter's acceleration variance on a per-particle basis.                           Note that when using a SPHERE or DISC distribution, only the x-component                           of this vector is used. |
| [acceleration.distribution] | [<code>distribution</code>](#distribution) | <code>value of the &#x60;type&#x60; option.</code> | A specific distribution to use when calculating a particle's acceleration. Overrides the `type` option. |
| [acceleration.randomise] | <code>Boolean</code> | <code>false</code> | When a particle is re-spawned, whether it's acceleration should be re-randomised or not. Can incur a performance hit. |
| [drag] | <code>Object</code> | <code>{}</code> | An object describing this particle drag. Drag is applied to both velocity and acceleration values. |
| [drag.value] | <code>Number</code> | <code>0</code> | A number between 0 and 1 describing the amount of drag to apply to all particles. |
| [drag.spread] | <code>Number</code> | <code>0</code> | A number describing the drag variance on a per-particle basis. |
| [drag.randomise] | <code>Boolean</code> | <code>false</code> | When a particle is re-spawned, whether it's drag should be re-randomised or not. Can incur a performance hit. |
| [wiggle] | <code>Object</code> | <code>{}</code> | This is quite a fun one! The values of this object will determine whether a particle will wiggle, or jiggle, or wave,                                or shimmy, or waggle, or... Well you get the idea. The wiggle is calculated over-time, meaning that a particle will                                start off with no wiggle, and end up wiggling about with the distance of the `value` specified by the time it dies.                                It's quite handy to simulate fire embers, or similar effects where the particle's position should slightly change over                                time, and such change isn't easily controlled by rotation, velocity, or acceleration. The wiggle is a combination of sin and cos calculations, so is circular in nature. |
| [wiggle.value] | <code>Number</code> | <code>0</code> | A number describing the amount of wiggle to apply to all particles. It's measured in distance. |
| [wiggle.spread] | <code>Number</code> | <code>0</code> | A number describing the wiggle variance on a per-particle basis. |
| [rotation] | <code>Object</code> | <code>{}</code> | An object describing this emitter's rotation. It can either be static, or set to rotate from 0radians to the value of `rotation.value`                                  over a particle's lifetime. Rotation values affect both a particle's position and the forces applied to it. |
| [rotation.axis] | <code>Object</code> | <code>new THREE.Vector3(0, 1, 0)</code> | A THREE.Vector3 instance describing this emitter's axis of rotation. |
| [rotation.axisSpread] | <code>Object</code> | <code>new THREE.Vector3()</code> | A THREE.Vector3 instance describing the amount of variance to apply to the axis of rotation on                                                              a per-particle basis. |
| [rotation.angle] | <code>Number</code> | <code>0</code> | The angle of rotation, given in radians. If `rotation.static` is true, the emitter will start off rotated at this angle, and stay as such.                                       Otherwise, the particles will rotate from 0radians to this value over their lifetimes. |
| [rotation.angleSpread] | <code>Number</code> | <code>0</code> | The amount of variance in each particle's rotation angle. |
| [rotation.static] | <code>Boolean</code> | <code>false</code> | Whether the rotation should be static or not. |
| [rotation.center] | <code>Object</code> | <code>The value of &#x60;position.value&#x60;</code> | A THREE.Vector3 instance describing the center point of rotation. |
| [rotation.randomise] | <code>Boolean</code> | <code>false</code> | When a particle is re-spawned, whether it's rotation should be re-randomised or not. Can incur a performance hit. |
| [color] | <code>Object</code> | <code>{}</code> | An object describing a particle's color. This property is a "value-over-lifetime" property, meaning an array of values and spreads can be                               given to describe specific value changes over a particle's lifetime.                               Depending on the value of SPE.valueOverLifetimeLength, if arrays of THREE.Color instances are given, then the array will be interpolated to                               have a length matching the value of SPE.valueOverLifetimeLength. |
| [color.value] | <code>Object</code> | <code>new THREE.Color()</code> | Either a single THREE.Color instance, or an array of THREE.Color instances to describe the color of a particle over it's lifetime. |
| [color.spread] | <code>Object</code> | <code>new THREE.Vector3()</code> | Either a single THREE.Vector3 instance, or an array of THREE.Vector3 instances to describe the color variance of a particle over it's lifetime. |
| [color.randomise] | <code>Boolean</code> | <code>false</code> | When a particle is re-spawned, whether it's color should be re-randomised or not. Can incur a performance hit. |
| [opacity] | <code>Object</code> | <code>{}</code> | An object describing a particle's opacity. This property is a "value-over-lifetime" property, meaning an array of values and spreads can be                               given to describe specific value changes over a particle's lifetime.                               Depending on the value of SPE.valueOverLifetimeLength, if arrays of numbers are given, then the array will be interpolated to                               have a length matching the value of SPE.valueOverLifetimeLength. |
| [opacity.value] | <code>Number</code> | <code>1</code> | Either a single number, or an array of numbers to describe the opacity of a particle over it's lifetime. |
| [opacity.spread] | <code>Number</code> | <code>0</code> | Either a single number, or an array of numbers to describe the opacity variance of a particle over it's lifetime. |
| [opacity.randomise] | <code>Boolean</code> | <code>false</code> | When a particle is re-spawned, whether it's opacity should be re-randomised or not. Can incur a performance hit. |
| [size] | <code>Object</code> | <code>{}</code> | An object describing a particle's size. This property is a "value-over-lifetime" property, meaning an array of values and spreads can be                               given to describe specific value changes over a particle's lifetime.                               Depending on the value of SPE.valueOverLifetimeLength, if arrays of numbers are given, then the array will be interpolated to                               have a length matching the value of SPE.valueOverLifetimeLength. |
| [size.value] | <code>Number</code> | <code>1</code> | Either a single number, or an array of numbers to describe the size of a particle over it's lifetime. |
| [size.spread] | <code>Number</code> | <code>0</code> | Either a single number, or an array of numbers to describe the size variance of a particle over it's lifetime. |
| [size.randomise] | <code>Boolean</code> | <code>false</code> | When a particle is re-spawned, whether it's size should be re-randomised or not. Can incur a performance hit. |
| [angle] | <code>Object</code> | <code>{}</code> | An object describing a particle's angle. The angle is a 2d-rotation, measured in radians, applied to the particle's texture.                               NOTE: if a particle's texture is a sprite-sheet, this value IS IGNORED.                               This property is a "value-over-lifetime" property, meaning an array of values and spreads can be                               given to describe specific value changes over a particle's lifetime.                               Depending on the value of SPE.valueOverLifetimeLength, if arrays of numbers are given, then the array will be interpolated to                               have a length matching the value of SPE.valueOverLifetimeLength. |
| [angle.value] | <code>Number</code> | <code>0</code> | Either a single number, or an array of numbers to describe the angle of a particle over it's lifetime. |
| [angle.spread] | <code>Number</code> | <code>0</code> | Either a single number, or an array of numbers to describe the angle variance of a particle over it's lifetime. |
| [angle.randomise] | <code>Boolean</code> | <code>false</code> | When a particle is re-spawned, whether it's angle should be re-randomised or not. Can incur a performance hit. |


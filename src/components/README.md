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
Requires <a href="https://github.com/n5ro/aframe-physics-system">Physics for A-Frame VR</a></p>
</dd>
<dt><a href="#module_gesture-detector">gesture-detector</a></dt>
<dd><p>Detect multi-finger touch gestures. Publish events accordingly.
Based off 8th Wall&#39;s <a href="https://github.com/8thwall/web/tree/master/examples/aframe">gesture-detector</a></p>
</dd>
<dt><a href="#module_goto-url">goto-url</a></dt>
<dd><p>Load new URL when object is clicked</p>
</dd>
<dt><a href="#module_impulse">impulse</a></dt>
<dd><p>One physics feature is applying an impulse to an object to set it in motion.
This happens in conjunction with an event.
Requires <a href="https://github.com/n5ro/aframe-physics-system">Physics for A-Frame VR</a></p>
</dd>
<dt><a href="#module_jitsi-video">jitsi-video</a></dt>
<dd><p>Apply a jitsi video to a geometry
Jitsi video source can be defined using a jitsiId or (ARENA/Jitsi) display name</p>
</dd>
<dt><a href="#module_landmark">landmark</a></dt>
<dd><p>Component-System of teleport destination Landmarks</p>
</dd>
<dt><a href="#module_load-scene">load-scene</a></dt>
<dd><p>Load scene from persistence.</p>
</dd>
<dt><a href="#module_material-extras">material-extras</a></dt>
<dd><p>Allows to set extra material properties, namely texture encoding, whether to render the material&#39;s color and render order.
The properties set here access directly <a href="https://threejs.org/docs/#api/en/materials/Material">Three.js material</a>.
Implements a timeout scheme in lack of better understanding of the timing/events causing properties to not be available.</p>
</dd>
<dt><a href="#module_network-latency">network-latency</a></dt>
<dd><p>Publish with qos of 2 for network graph to update latency</p>
</dd>
<dt><a href="#module_pcd-model">pcd-model</a></dt>
<dd><p>Load Point Cloud Data (PCD) models using three.js example loader
Point Cloud Data is a file format for Point Cloud Library.
<a href="https://en.wikipedia.org/wiki/Point_Cloud_Library">https://en.wikipedia.org/wiki/Point_Cloud_Library</a></p>
</dd>
<dt><a href="#module_press-and-move">press-and-move</a></dt>
<dd><p>Press and move camera; User camera movement with the mouse.
Based off <a href="https://github.com/aframevr/aframe/blob/master/src/components/wasd-controls.js">wasd controls</a></p>
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
Update <em>is</em> allowed, which will reset the timer to start from that moment.</p>
</dd>
<dt><a href="#module_video-control">video-control</a></dt>
<dd><p>Adds a video to an entity and controls its playback.</p>
</dd>
</dl>

<a name="module_arena-camera"></a>

## arena-camera
Tracking camera movement in real time. Emits camera pose change and VIO change events.

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| enabled | <code>boolean</code> | Indicates whether camera tracking is enabled. |
| vioEnabled | <code>boolean</code> | Indicates whether to publish VIO on every tick (if true). |
| displayName | <code>string</code> | User display name (used to publish camera data). |
| color | <code>string</code> | Head text color. |
| rotation | <code>Array.&lt;number&gt;</code> | Last camera rotation value. |
| position | <code>Array.&lt;number&gt;</code> | Last camera position value. |
| vioRotation | <code>Array.&lt;number&gt;</code> | Last VIO rotation value. |
| vioPosition | <code>Array.&lt;number&gt;</code> | Last VIO position value. |
| showStats | <code>boolean</code> | Display camera position on the screen. |
| videoCulling | <code>boolean</code> | Turn on frustum video culling. |

<a name="module_arena-hand"></a>

## arena-hand
Tracking Hand controller movement in real time.

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| enabled | <code>boolean</code> | Controller enabled. |
| hand | <code>string</code> | Controller hand. |
| color | <code>string</code> | Controller color. |

<a name="module_arena-user"></a>

## arena-user
Another user's camera in the ARENA. Handles Jitsi and display name updates.

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [color] | <code>color</code> | <code>white</code> | The color for the user's name text. |
| [headModelPath] | <code>string</code> | <code>&quot;/store/models/robobit.glb&quot;</code> | Path to user head model |
| [presence] | <code>string</code> |  | type of presence for user |
| [jitsiId] | <code>string</code> |  | User jitsi id. |
| [displayName] | <code>string</code> |  | User display name. |
| [hasAudio] | <code>boolean</code> | <code>false</code> | Whether the user has audio on. |
| [hasVideo] | <code>boolean</code> | <code>false</code> | Whether the user has video on. |

<a name="module_armarker"></a>

## armarker
ARMarker Component. Supports ARMarkers in a scene

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [markertype] | <code>string</code> | <code>&quot;apriltag_36h11&quot;</code> | The marker type. One of 'apriltag_36h11', 'lightanchor', 'uwb' |
| [dynamic] | <code>boolean</code> | <code>false</code> | Whether tag is a static and used to for camera relocalization, or dynamically changes position |
| [publish] | <code>boolean</code> | <code>false</code> | Publish tag detections. |
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

<a name="exp_module_click-listener--init"></a>

### init() ⏏
Setup event listeners for mouse events; listeners publish events to MQTT

**Kind**: Exported function
**Todo**

- [ ] Consolidate event listeners (they are very similar)

<a name="module_collision-listener"></a>

## collision-listener
Listen for collisions, callback on event.
Requires [Physics for A-Frame VR](https://github.com/n5ro/aframe-physics-system)

**Requires**: <code>module:aframe-physics-system</code>
<a name="module_gesture-detector"></a>

## gesture-detector
Detect multi-finger touch gestures. Publish events accordingly.
Based off 8th Wall's [gesture-detector](https://github.com/8thwall/web/tree/master/examples/aframe)

<a name="module_goto-url"></a>

## goto-url
Load new URL when object is clicked

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| on | <code>string</code> |  | A case-sensitive string representing the [event type](https://developer.mozilla.org/en-US/docs/Web/Events) to listen for, e.g. 'mousedown', 'mouseup' |
| url | <code>string</code> |  | The destination url e.g. https://some-site.com |
| [dest] | <code>string</code> | <code>&quot;sametab&quot;</code> | Where to open the URL; one of 'popup', 'newtab', 'sametab' |

<a name="module_impulse"></a>

## impulse
One physics feature is applying an impulse to an object to set it in motion.
This happens in conjunction with an event.
Requires [Physics for A-Frame VR](https://github.com/n5ro/aframe-physics-system)

**Requires**: <code>module:aframe-physics-system</code>
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

<a name="module_load-scene"></a>

## load-scene
Load scene from persistence.

**Todo**

- [ ] this component is currently not used and probably needs to be updated

<a name="module_material-extras"></a>

## material-extras
Allows to set extra material properties, namely texture encoding, whether to render the material's color and render order.
The properties set here access directly [Three.js material](https://threejs.org/docs/#api/en/materials/Material).
Implements a timeout scheme in lack of better understanding of the timing/events causing properties to not be available.

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [overrideSrc] | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | Overrides the material in all meshes of an object (e.g. a basic shape or a GLTF). |
| [encoding] | <code>string</code> | <code>&quot;sRGBEncoding&quot;</code> | The material encoding; One of 'LinearEncoding', 'sRGBEncoding', 'GammaEncoding', 'RGBEEncoding', 'LogLuvEncoding', 'RGBM7Encoding', 'RGBM16Encoding', 'RGBDEncoding', 'BasicDepthPacking', 'RGBADepthPacking'. See [Three.js material](https://threejs.org/docs/#api/en/materials/Material). |
| [colorWrite] | <code>boolean</code> | <code>true</code> | Whether to render the material's color. See [Three.js material](https://threejs.org/docs/#api/en/materials/Material). |
| [renderOrder] | <code>number</code> | <code>1</code> | This value allows the default rendering order of scene graph objects to be overridden. See [Three.js Object3D.renderOrder](https://threejs.org/docs/#api/en/core/Object3D.renderOrder). |
| [transparentOccluder] | <code>boolean</code> | <code>false</code> | If `true`, will set `colorWrite=false` and `renderOrder=0` to make the material a transparent occluder. |
| [defaultRenderOrder] | <code>number</code> | <code>1</code> | Used as the renderOrder when transparentOccluder is reset to `false`. |

<a name="module_network-latency"></a>

## network-latency
Publish with qos of 2 for network graph to update latency

**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| UPDATE_INTERVAL_MS | <code>number</code> | <code>10000</code> | Interval to send the periodic pings (ms) |

<a name="module_pcd-model"></a>

## pcd-model
Load Point Cloud Data (PCD) models using three.js example loader
Point Cloud Data is a file format for Point Cloud Library.
https://en.wikipedia.org/wiki/Point_Cloud_Library

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
| [placeholder] | <code>string</code> | <code>&quot;Type here&quot;</code> | Text input place hoText |

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
Update *is* allowed, which will reset the timer to start from that moment.

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| seconds | <code>number</code> | Seconds until entity is removed |
| expireAt | <code>object</code> | Expiration time [Date object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) |

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

# A-Frame systems (modules) added to support ARENA core functionality

## Modules

<dl>
<dt><a href="#module_armarker-reloc">armarker-reloc</a></dt>
<dd></dd>
<dt><a href="#module_armarker-system">armarker-system</a></dt>
<dd><p>ARMarker System. Supports ARMarkers in a scene.</p>
</dd>
<dt><a href="#module_ccarheadset">ccarheadset</a></dt>
<dd></dd>
<dt><a href="#module_ccwebar">ccwebar</a></dt>
<dd></dd>
<dt><a href="#module_ccwebarviewer">ccwebarviewer</a></dt>
<dd></dd>
<dt><a href="#module_ccwebxr">ccwebxr</a></dt>
<dd></dd>
<dt><a href="#module_build3d-mqtt-object">build3d-mqtt-object</a></dt>
<dd><p>Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.</p>
</dd>
<dt><a href="#module_build3d-mqtt-scene">build3d-mqtt-scene</a></dt>
<dd><p>Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.</p>
</dd>
<dt><a href="#module_client-event">client-event</a></dt>
<dd></dd>
<dt><a href="#module_create-update">create-update</a></dt>
<dd></dd>
<dt><a href="#module_delete">delete</a></dt>
<dd></dd>
<dt><a href="#module_parser">parser</a></dt>
<dd></dd>
<dt><a href="#module_runtime-mngr">runtime-mngr</a></dt>
<dd></dd>
<dt><a href="#module_runtime-msgs">runtime-msgs</a></dt>
<dd></dd>
<dt><a href="#module_attribution-system">attribution-system</a></dt>
<dd><p>Attribution Component/System. Add attribution message to any entity.
Tries to extract author, license, source and title (assuming format used in sketchfab downloaded models)</p>
<p>Looks for authorship metadata in both asset.extras (sketchfab models) and scene.extra (manually added attributes in blender).
If both asset.extras and scene.extra exist, gives preference to asset.extras.</p>
</dd>
<dt><a href="#module_screenshareable">screenshareable</a></dt>
<dd><p>Screenshare-able System. Allows an object to be screenshared upon</p>
</dd>
<dt><a href="#module_model-progress">model-progress</a></dt>
<dd><p>Model loading progress system. Manage model load messages.</p>
</dd>
<dt><a href="#module_webar">webar</a></dt>
<dd></dd>
</dl>

## Classes

<dl>
<dt><a href="#Apriltag">Apriltag</a></dt>
<dd><p>This is a wrapper class that calls apriltag_wasm to load the WASM module and wraps the c implementation calls.
The apriltag dectector uses the tag36h11 family.
For tag pose estimation, call set_tag_size allows to indicate the size of known tags.
If size is not defined using set_tag_size(), it will default to 150mm tags.</p>
</dd>
<dt><a href="#MQTTWorker">MQTTWorker</a></dt>
<dd><p>Main ARENA MQTT webworker client</p>
</dd>
<dt><a href="#SimplexNoise">SimplexNoise</a></dt>
<dd><p>You can pass in a random number generator object if you like.
It is assumed to have a random() method.</p>
</dd>
<dt><a href="#SAOPass">SAOPass</a></dt>
<dd><p>SAO implementation inspired from bhouston previous SAO work</p>
</dd>
<dt><a href="#UnrealBloomPass">UnrealBloomPass</a></dt>
<dd><p>UnrealBloomPass is inspired by the bloom pass of Unreal Engine. It creates a
mip map chain of bloom textures and blurs them with different radii. Because
of the weighted combination of mips, and because larger blurs are done on
higher mips, this effect provides good quality and performance.</p>
<p>Reference:</p>
<ul>
<li><a href="https://docs.unrealengine.com/latest/INT/Engine/Rendering/PostProcessEffects/Bloom/">https://docs.unrealengine.com/latest/INT/Engine/Rendering/PostProcessEffects/Bloom/</a></li>
</ul>
</dd>
</dl>

## Members

<dl>
<dt><a href="#newUserTimers">newUserTimers</a></dt>
<dd><p>list of timers to send new user notifications; when a user enters jitsi, there is some delay until other
participants receive data about its properties (e.g. arenaDisplayName and arenaUserName).
we wait newUserTimeoutMs to hear about these in case it is an arena user and notify anyway after this timeout</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#Base64Binary">Base64Binary</a></dt>
<dd><p>Uses the new array typed in javascript to binary base64 encode/decode
at the moment just decodes a binary base64 encoded
into either an ArrayBuffer (decodeArrayBuffer)
or into an Uint8Array (decode)</p>
<p>References:
<a href="https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer">https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer</a>
<a href="https://developer.mozilla.org/en/JavaScript_typed_arrays/Uint8Array">https://developer.mozilla.org/en/JavaScript_typed_arrays/Uint8Array</a></p>
</dd>
<dt><a href="#CopyShader">CopyShader</a></dt>
<dd><p>Full-screen textured quad shader</p>
</dd>
<dt><a href="#DigitalGlitch">DigitalGlitch</a></dt>
<dd><p>RGB Shift Shader
Shifts red and blue channels from center in opposite directions
Ported from <a href="http://kriss.cx/tom/2009/05/rgb-shift/">http://kriss.cx/tom/2009/05/rgb-shift/</a>
by Tom Butterworth / <a href="http://kriss.cx/tom/">http://kriss.cx/tom/</a></p>
<p>amount: shift distance (1 is width of input)
angle: shift angle in radians</p>
</dd>
<dt><a href="#FXAAShader">FXAAShader</a></dt>
<dd><p>NVIDIA FXAA by Timothy Lottes
<a href="https://developer.download.nvidia.com/assets/gamedev/files/sdk/11/FXAA_WhitePaper.pdf">https://developer.download.nvidia.com/assets/gamedev/files/sdk/11/FXAA_WhitePaper.pdf</a></p>
<ul>
<li>WebGL port by @supereggbert
<a href="http://www.glge.org/demos/fxaa/">http://www.glge.org/demos/fxaa/</a>
Further improved by Daniel Sturk</li>
</ul>
</dd>
<dt><a href="#LuminosityHighPassShader">LuminosityHighPassShader</a></dt>
<dd><p>Luminosity
<a href="http://en.wikipedia.org/wiki/Luminosity">http://en.wikipedia.org/wiki/Luminosity</a></p>
</dd>
<dt><a href="#SMAAEdgesShader">SMAAEdgesShader</a></dt>
<dd><p>WebGL port of Subpixel Morphological Antialiasing (SMAA) v2.8
Preset: SMAA 1x Medium (with color edge detection)
<a href="https://github.com/iryoku/smaa/releases/tag/v2.8">https://github.com/iryoku/smaa/releases/tag/v2.8</a></p>
</dd>
<dt><a href="#SSAOShader">SSAOShader</a></dt>
<dd><p>References:
<a href="http://john-chapman-graphics.blogspot.com/2013/01/ssao-tutorial.html">http://john-chapman-graphics.blogspot.com/2013/01/ssao-tutorial.html</a>
<a href="https://learnopengl.com/Advanced-Lighting/SSAO">https://learnopengl.com/Advanced-Lighting/SSAO</a>
<a href="https://github.com/McNopper/OpenGL/blob/master/Example28/shader/ssao.frag.glsl">https://github.com/McNopper/OpenGL/blob/master/Example28/shader/ssao.frag.glsl</a></p>
</dd>
<dt><a href="#UnpackDepthRGBAShader">UnpackDepthRGBAShader</a></dt>
<dd><p>Unpack RGBA depth shader</p>
<ul>
<li>show RGBA encoded depth as monochrome color</li>
</ul>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#processGsFrame">processGsFrame(frame)</a></dt>
<dd><p>Process grayscale camera frame</p>
</dd>
<dt><a href="#fetchSceneOptions">fetchSceneOptions()</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Fetches scene options from persistence server, deferring loading until user params are loaded.</p>
</dd>
<dt><a href="#fetchSceneObjects">fetchSceneObjects([urlToLoad], [parentName], [prefixName])</a></dt>
<dd><p>Fetches scene objects from persistence server, deferring loading until userparams and scene are loaded.</p>
</dd>
<dt><a href="#initRuntimeMngr">initRuntimeMngr()</a></dt>
<dd><p>Init runtime manager; must be called after mqtt is loaded</p>
</dd>
<dt><a href="#loadScene">loadScene()</a></dt>
<dd><p>Load Scene; checks URI parameters</p>
</dd>
<dt><a href="#setIdTag">setIdTag(idTag)</a></dt>
<dd><p>Sets this.idTag using name given as argument, url parameter value, or default
Important: Also sets amName, faceName, handLName, handRName which depend on idTag</p>
</dd>
<dt><a href="#getDisplayName">getDisplayName()</a> ⇒ <code>string</code></dt>
<dd><p>Gets display name either from local storage or from userName</p>
</dd>
<dt><a href="#isJitsiPermitted">isJitsiPermitted()</a> ⇒ <code>boolean</code></dt>
<dd><p>Checks loaded MQTT/Jitsi token for Jitsi video conference permission.</p>
</dd>
<dt><a href="#isUsersPermitted">isUsersPermitted()</a> ⇒ <code>boolean</code></dt>
<dd><p>Checks loaded MQTT/Jitsi token for user interaction permission.</p>
</dd>
<dt><a href="#isUserSceneWriter">isUserSceneWriter()</a></dt>
<dd><p>Checks token for full scene object write permissions.
     // * @return {boolean} True if the user has permission to write in this scene.</p>
</dd>
<dt><a href="#isUserChatWriter">isUserChatWriter()</a></dt>
<dd><p>Checks token for scene chat write permissions.
     // * @return {boolean} True if the user has permission to chat in this scene.</p>
</dd>
<dt><a href="#isBuild3dEnabled">isBuild3dEnabled()</a></dt>
<dd><p>Checks the state of build3d request and for scene write permissions.</p>
</dd>
<dt><a href="#showEchoDisplayName">showEchoDisplayName([speaker])</a></dt>
<dd><p>Renders/updates the display name in the top left corner of a scene.</p>
</dd>
<dt><a href="#loadUser">loadUser()</a></dt>
<dd><p>loads this user&#39;s presence and camera</p>
</dd>
<dt><a href="#loadArenaInspector">loadArenaInspector()</a></dt>
<dd><p>Loads the a-frame inspector, with MutationObserver connected to MQTT.
Expects all known objects to be loaded first.
Expects that permissions have been checked so users won&#39;t be confused if publish fails.</p>
</dd>
<dt><a href="#removeBuild3d">removeBuild3d()</a></dt>
<dd><p>remove the build3d a-frame inspector</p>
</dd>
<dt><a href="#loadSceneObjects">loadSceneObjects([sceneObjs], [parentName], [prefixName])</a></dt>
<dd><p>loads scene objects from specified persistence URL if specified,
or this.persistenceUrl if not</p>
</dd>
<dt><a href="#loadSceneOptions">loadSceneOptions(sceneData)</a></dt>
<dd><p>Loads and applies scene-options (if it exists), otherwise set to default environment</p>
</dd>
<dt><a href="#addDefaultLights">addDefaultLights([ifNoNonEnv])</a></dt>
<dd><p>Add default lights to the scene</p>
</dd>
<dt><a href="#setupSceneHeadModels">setupSceneHeadModels()</a></dt>
<dd><p>Update the list of scene-specific heads the user can select from</p>
</dd>
<dt><a href="#addEventListener">addEventListener(key, callback, [opts])</a></dt>
<dd><p>Register event listener AND dispatch it immediately if key is already set</p>
</dd>
<dt><a href="#addMultiEventListener">addMultiEventListener(keys, callback, [opts])</a></dt>
<dd><p>Register callback that depends on multiple event dependencies, firing
if all events are already set -- which may be immediate.</p>
</dd>
<dt><a href="#emit">emit(name, [detail], [bubbles])</a></dt>
<dd><p>Wrapper for AFRAME emit that also sets key in events</p>
</dd>
<dt><a href="#validateDeviceIds">validateDeviceIds()</a> ⇒ <code>Promise.&lt;boolean&gt;</code></dt>
<dd><p>Validate saved device IDs against currently available devices.
Clears preferences if any saved device is no longer available.</p>
</dd>
<dt><a href="#connect">connect()</a></dt>
<dd><p>Connect to the Jitsi server.</p>
</dd>
<dt><a href="#connectArena">connectArena(participantId, trackType)</a></dt>
<dd><p>Called when user joins</p>
</dd>
<dt><a href="#onLocalTracks">onLocalTracks(tracks)</a></dt>
<dd><p>Handles local tracks.</p>
</dd>
<dt><a href="#updateScreenShareObject">updateScreenShareObject(screenShareId, videoId, participantId)</a> ⇒ <code>object</code></dt>
<dd><p>Update screen share object</p>
</dd>
<dt><a href="#onRemoteTrack">onRemoteTrack(track)</a></dt>
<dd><p>Handles remote tracks</p>
</dd>
<dt><a href="#onConferenceJoined">onConferenceJoined()</a></dt>
<dd><p>This function is executed when the this.conference is joined</p>
</dd>
<dt><a href="#onUserJoined">onUserJoined(id)</a></dt>
<dd><p>Called when user joins</p>
</dd>
<dt><a href="#onUserLeft">onUserLeft(id, user)</a></dt>
<dd><p>Called when user leaves</p>
</dd>
<dt><a href="#onDominantSpeakerChanged">onDominantSpeakerChanged(id)</a></dt>
<dd><p>Called when dominant speaker changes.</p>
</dd>
<dt><a href="#onConnectionSuccess">onConnectionSuccess()</a></dt>
<dd><p>This function is called when connection is established successfully</p>
</dd>
<dt><a href="#onConferenceError">onConferenceError(err)</a></dt>
<dd><p>Called for conference errors/failures</p>
</dd>
<dt><a href="#onConnectionFailed">onConnectionFailed()</a></dt>
<dd><p>This function is called when the this.connection fails.</p>
</dd>
<dt><a href="#onDeviceListChanged">onDeviceListChanged(devices)</a></dt>
<dd><p>This function is called when device list changes</p>
</dd>
<dt><a href="#disconnect">disconnect()</a></dt>
<dd><p>This function is called when we disconnect.</p>
</dd>
<dt><a href="#unload">unload()</a></dt>
<dd><p>called on unload; release tracks, leave this.conference</p>
</dd>
<dt><a href="#avConnect">avConnect()</a> ⇒ <code>promise</code></dt>
<dd><p>Connect audio and video and start sending local tracks</p>
</dd>
<dt><a href="#setupCornerVideo">setupCornerVideo()</a></dt>
<dd><p>show user video in the corner</p>
</dd>
<dt><a href="#showVideo">showVideo()</a></dt>
<dd><p>Show the client user&#39;s video</p>
</dd>
<dt><a href="#hideVideo">hideVideo()</a></dt>
<dd><p>Hide the client user&#39;s video</p>
</dd>
<dt><a href="#getJitsiId">getJitsiId()</a> ⇒ <code>string</code></dt>
<dd><p>Getter for the client users Jitsi Id</p>
</dd>
<dt><a href="#activeSpeakerChanged">activeSpeakerChanged()</a> ⇒ <code>boolean</code></dt>
<dd><p>Has the active speaker changed</p>
</dd>
<dt><a href="#unmuteAudio">unmuteAudio()</a> ⇒ <code>*</code></dt>
<dd><p>Begin the audio feed</p>
</dd>
<dt><a href="#muteAudio">muteAudio()</a> ⇒ <code>*</code></dt>
<dd><p>End the audio feed</p>
</dd>
<dt><a href="#startVideo">startVideo()</a> ⇒ <code>*</code></dt>
<dd><p>Begin the video feed</p>
</dd>
<dt><a href="#stopVideo">stopVideo()</a> ⇒ <code>*</code></dt>
<dd><p>End the video feed</p>
</dd>
<dt><a href="#getAudioTrack">getAudioTrack(jitsiId)</a> ⇒ <code>*</code></dt>
<dd><p>Getter for the audio feed by jisti id</p>
</dd>
<dt><a href="#getVideoTrack">getVideoTrack(jitsiId)</a> ⇒ <code>*</code></dt>
<dd><p>Getter for the video feed by jisti id</p>
</dd>
<dt><a href="#setResolutionRemotes">setResolutionRemotes(panoIds, constraints)</a></dt>
<dd><p>Set received resolution of remote video. Used to prioritize high, medium, low, drop
resolution. Can be expanded. Individual resolution per ID overwrites previous calls to
setReceiverConstraints. Setting the order of these id arrays is important. Examples at:
<a href="https://github.com/jitsi/jitsi-videobridge/blob/master/doc/allocation.md">https://github.com/jitsi/jitsi-videobridge/blob/master/doc/allocation.md</a></p>
</dd>
<dt><a href="#kickout">kickout(participantJitsiId, msg)</a></dt>
<dd><p>Remove a user from the conference</p>
</dd>
<dt><a href="#leave">leave()</a></dt>
<dd><p>Disconnect from the conference</p>
</dd>
<dt><a href="#getUserId">getUserId(participantJitsiId)</a> ⇒ <code>String</code></dt>
<dd></dd>
<dt><a href="#getProperty">getProperty(participantJitsiId, property)</a> ⇒ <code>Object</code></dt>
<dd></dd>
<dt><a href="#getConnectionColor">getConnectionColor(quality)</a> ⇒ <code>string</code></dt>
<dd><p>Get color based on 0-100% connection quality.</p>
</dd>
<dt><a href="#getConnectionText">getConnectionText(name, stats, status)</a> ⇒ <code>string</code></dt>
<dd><p>Get readable video stats.</p>
</dd>
<dt><a href="#connect">connect(mqttClientOptions, [onSuccessCallBack], [lwMsg], [lwTopic])</a></dt>
<dd></dd>
<dt><a href="#mqttHealthCheck">mqttHealthCheck(msg)</a></dt>
<dd><p>Internal callback to pass MQTT connection health to ARENAHealth.</p>
</dd>
<dt><a href="#publish">publish(topic, payload, qos, retained)</a></dt>
<dd><p>Publishes message to mqtt</p>
</dd>
<dt><a href="#processMessage">processMessage(jsonMessage)</a></dt>
<dd><p>Send a message to internal receive handler</p>
</dd>
<dt><a href="#isConnected">isConnected()</a> ⇒ <code>boolean</code></dt>
<dd><p>Returns mqttClient connection state</p>
</dd>
<dt><a href="#onSceneMessageArrived">onSceneMessageArrived(message)</a></dt>
<dd><p>MessageArrived handler for scene messages; handles object create/delete/event... messages
This message is expected to be JSON</p>
</dd>
<dt><a href="#handleSceneObjectMessage">handleSceneObjectMessage(message, topicToUid, topicSplit)</a></dt>
<dd><p>Handle scene object messages</p>
</dd>
<dt><a href="#handleSceneUserMessage">handleSceneUserMessage(message, topicToUid, topicSplit)</a></dt>
<dd><p>Handle scene user messages, consisting of camera, hand object updates and actions</p>
</dd>
<dt><a href="#onMessageArrived">onMessageArrived()</a></dt>
<dd><p>Callback; Called when a message arrives</p>
</dd>
<dt><a href="#writeOverlayText">writeOverlayText(text)</a></dt>
<dd><p>Writes text over the video canvas for face tracking status indications</p>
</dd>
<dt><a href="#drawBbox">drawBbox(bbox)</a></dt>
<dd><p>Draws a bounding box on the overlay canvas</p>
</dd>
<dt><a href="#drawPolyline">drawPolyline(landmarks, start, end, closed)</a></dt>
<dd><p>Draws a polyline on the overlay canvas. Helper function for drawing face landmarks</p>
</dd>
<dt><a href="#drawFeatures">drawFeatures(features)</a></dt>
<dd><p>Draws face features as connected polylines</p>
</dd>
<dt><a href="#hasFace">hasFace(landmarks)</a> ⇒ <code>boolean</code></dt>
<dd><p>Checks if landmarks are valid</p>
</dd>
<dt><a href="#createFaceJSON">createFaceJSON(hasFace, landmarks, bbox, pose)</a> ⇒ <code>object</code></dt>
<dd><p>Creates JSON representation of face tracker output to be sent through mqtt</p>
</dd>
<dt><a href="#stopFaceTracking">stopFaceTracking()</a></dt>
<dd><p>Stop running face tracker and stop videos and overlay</p>
</dd>
<dt><a href="#restart">restart()</a></dt>
<dd><p>Start running face tracker again</p>
</dd>
<dt><a href="#removePass">removePass(passName)</a></dt>
<dd><p>Remove a pass from the composer.</p>
</dd>
<dt><a href="#insertPass">insertPass(pass, index)</a></dt>
<dd><p>Insert an already-instantiated pass into the composer. If the pass is already present in the
effect system&#39;s internal mapping, no action is taken.</p>
</dd>
<dt><a href="#closestKeyInDict">closestKeyInDict(k, d, thres)</a> ⇒ <code>*</code></dt>
<dd><p>Find the closest key in a dictionary to a given key</p>
</dd>
<dt><a href="#jitsiStatsLocalCallback">jitsiStatsLocalCallback(e)</a></dt>
<dd><p>Called when Jitsi local stats are updated, used to save local status for stats-monitor.</p>
</dd>
<dt><a href="#copyArray">copyArray()</a></dt>
<dd><p>Copy contents of one array to another without allocating new array.</p>
</dd>
<dt><a href="#addListeners">addListeners()</a></dt>
<dd><p>Initialize listeners</p>
</dd>
<dt><a href="#getDevices">getDevices()</a> ⇒ <code>Promise.&lt;Array.&lt;MediaDeviceInfo&gt;&gt;</code></dt>
<dd><p>Alias</p>
</dd>
<dt><a href="#gotDevices">gotDevices(deviceInfos)</a></dt>
<dd><p>Populates select dropdowns with detected devices</p>
</dd>
<dt><a href="#gotStream">gotStream(stream)</a></dt>
<dd><p>Attempts to updates a/v dropdowns with devices from a stream.
Also initializes sound processing to display microphone volume meter</p>
</dd>
<dt><a href="#handleMediaError">handleMediaError(error, silent)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Error handler, typically when gUM fails from nonexistent audio and/or
video input device</p>
</dd>
<dt><a href="#micDrawLoop">micDrawLoop()</a></dt>
<dd><p>Animation loop to draw detected microphone audio level</p>
</dd>
<dt><a href="#upsertLiveUser">upsertLiveUser(id, user, merge, skipUserlist)</a> ⇒ <code>boolean</code></dt>
<dd><p>Upserts a user in the liveUsers dictionary. Updates timestamp tag either way</p>
</dd>
<dt><a href="#onJitsiConnect">onJitsiConnect(e)</a></dt>
<dd><p>Called when we connect to a jitsi conference (including reconnects)</p>
</dd>
<dt><a href="#onUserJitsiJoin">onUserJitsiJoin(e)</a></dt>
<dd><p>Called when user joins</p>
</dd>
<dt><a href="#onScreenshare">onScreenshare(e)</a></dt>
<dd><p>Called when a user screenshares</p>
</dd>
<dt><a href="#onUserJitsiLeft">onUserJitsiLeft(e)</a></dt>
<dd><p>Called when user leaves</p>
</dd>
<dt><a href="#onDominantSpeakerChanged">onDominantSpeakerChanged(e)</a></dt>
<dd><p>Called when dominant speaker changes.</p>
</dd>
<dt><a href="#onTalkWhileMuted">onTalkWhileMuted()</a></dt>
<dd><p>Called when user is talking on mute.</p>
</dd>
<dt><a href="#onNoisyMic">onNoisyMic()</a></dt>
<dd><p>Called when user&#39;s microphone is very noisy.</p>
</dd>
<dt><a href="#onJitsiStatsLocal">onJitsiStatsLocal(e)</a></dt>
<dd><p>Called when Jitsi local stats are updated.</p>
</dd>
<dt><a href="#onJitsiStatsRemote">onJitsiStatsRemote(e)</a></dt>
<dd><p>Called when Jitsi remote stats are updated.</p>
</dd>
<dt><a href="#onJitsiStatus">onJitsiStatus(e)</a></dt>
<dd><p>Called when Jitsi remote and local status object is updated.</p>
</dd>
<dt><a href="#getUserList">getUserList()</a> ⇒ <code>Array.&lt;Object&gt;</code></dt>
<dd><p>Getter to return the active user list state.</p>
</dd>
<dt><a href="#isUserAuthenticated">isUserAuthenticated(idTag)</a> ⇒ <code>boolean</code></dt>
<dd><p>Utility to know if the user has been authenticated.</p>
</dd>
<dt><a href="#sendMsg">sendMsg(msgTxt)</a></dt>
<dd><p>Method to publish outgoing chat messages, gathers destination from UI.</p>
</dd>
<dt><a href="#onPresenceMessageArrived">onPresenceMessageArrived(msg, topicToUid)</a></dt>
<dd><p>Handles incoming presence topic messages</p>
</dd>
<dt><a href="#onChatMessageArrived">onChatMessageArrived(msg, topicToUid)</a></dt>
<dd><p>Handler for incoming subscription chat messages.</p>
</dd>
<dt><a href="#txtAddMsg">txtAddMsg(msg, status, who)</a></dt>
<dd><p>Adds a text message to the text message panel.</p>
</dd>
<dt><a href="#populateUserList">populateUserList(newUser)</a></dt>
<dd><p>Draw the contents of the Chat user list panel given its current state.
Adds a newUser if requested.</p>
</dd>
<dt><a href="#addJitsiStats">addJitsiStats(uli, stats, status, name)</a></dt>
<dd><p>Apply a jitsi signal icon after the user name in list item &#39;uli&#39;.</p>
</dd>
<dt><a href="#addLandmark">addLandmark(lm)</a></dt>
<dd><p>Add a landmark to the landmarks list.</p>
</dd>
<dt><a href="#removeLandmark">removeLandmark(lm)</a></dt>
<dd><p>Remove a landmark from the landmarks list.</p>
</dd>
<dt><a href="#addToSelOptions">addToSelOptions()</a></dt>
<dd><p>Adds UI elements to select dropdown message destination.</p>
</dd>
<dt><a href="#presenceMsg">presenceMsg(msg, to)</a></dt>
<dd><p>Send a presence message to respective topic, either publicly or privately to a single user</p>
</dd>
<dt><a href="#ctrlMsg">ctrlMsg(to, text)</a></dt>
<dd><p>Send a chat system control message for other users. Uses chat system topic structure
to send a private message.</p>
</dd>
<dt><a href="#userCleanup">userCleanup()</a></dt>
<dd><p>Removes orphaned Jitsi users from visible user list.
Is called periodically = keepalive_interval_ms * 3.</p>
</dd>
<dt><a href="#displayAlert">displayAlert(msg, timeMs, type, closeOthers)</a></dt>
<dd><p>Uses Notiflix library to popup a toast message.</p>
</dd>
<dt><a href="#moveToFrontOfCamera">moveToFrontOfCamera(userId)</a></dt>
<dd><p>Teleport method to move this user&#39;s camera to the front of another user&#39;s camera.</p>
</dd>
<dt><a href="#drawErrorBlock">drawErrorBlock(errors)</a></dt>
<dd><p>Render the display of errors in #error-block for troubleshooting.</p>
</dd>
<dt><a href="#addError">addError(errorCode)</a></dt>
<dd><p>Add an error to health monitor and show the icon.</p>
</dd>
<dt><a href="#removeError">removeError(errorCode)</a></dt>
<dd><p>Remove an error to health monitor and hide the icon when errors = 0.</p>
</dd>
<dt><a href="#getErrorDetails">getErrorDetails(errorCode)</a> ⇒ <code>object</code></dt>
<dd><p>Lookup details of error code if any from config.</p>
</dd>
<dt><a href="#createIconButton">createIconButton(initialImage, tooltip, onClick)</a> ⇒ <code>Object</code></dt>
<dd><p>Creates a button that will be displayed as an icon on the left of the screen</p>
</dd>
<dt><a href="#fullScreenExitHandler">fullScreenExitHandler()</a></dt>
<dd><p>Handle exit from full screen scenarios</p>
</dd>
</dl>

<a name="module_armarker-reloc"></a>

## armarker-reloc

* [armarker-reloc](#module_armarker-reloc)
    * [module.exports](#exp_module_armarker-reloc--module.exports) ⏏
        * [new module.exports(arMakerSys, detectionsEventTarget, [networkedLocationSolver], [debug])](#new_module_armarker-reloc--module.exports_new)
        * [.vioFilter(vioPrev, vioCur)](#module_armarker-reloc--module.exports+vioFilter) ⇒ <code>boolean</code>
        * [.markerDetection(e)](#module_armarker-reloc--module.exports+markerDetection)
        * [.getRigPoseFromAprilTag(dtag, refTag)](#module_armarker-reloc--module.exports+getRigPoseFromAprilTag) ⇒ <code>THREE.Matrix4</code>
        * [.getTagPoseFromRig(dtag)](#module_armarker-reloc--module.exports+getTagPoseFromRig) ⇒ <code>THREE.Matrix4</code>

<a name="exp_module_armarker-reloc--module.exports"></a>

### module.exports ⏏
**Kind**: Exported class  
<a name="new_module_armarker-reloc--module.exports_new"></a>

#### new module.exports(arMakerSys, detectionsEventTarget, [networkedLocationSolver], [debug])
Singleton constructor; init internal options and other data; setup detection event handler


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| arMakerSys | <code>object</code> |  | ARMarker system; to lookup markers |
| detectionsEventTarget | <code>object</code> |  | Detections event target |
| [networkedLocationSolver] | <code>boolean</code> | <code>false</code> | If true, send detection messages to pubsub |
| [debug] | <code>boolean</code> | <code>false</code> | If true, output debug messages |

<a name="module_armarker-reloc--module.exports+vioFilter"></a>

#### module.exports.vioFilter(vioPrev, vioCur) ⇒ <code>boolean</code>
Used to filter out detections while shaking/moving too much

**Kind**: instance method of [<code>module.exports</code>](#exp_module_armarker-reloc--module.exports)  
**Returns**: <code>boolean</code> - - boolean indicating if we should ignore a detecion or not  

| Param | Type | Description |
| --- | --- | --- |
| vioPrev | <code>number</code> | previous VIO Matrix |
| vioCur | <code>number</code> | current VIO Matrix |

<a name="module_armarker-reloc--module.exports+markerDetection"></a>

#### module.exports.markerDetection(e)
Marker detection handler as setup in class constructor

**Kind**: instance method of [<code>module.exports</code>](#exp_module_armarker-reloc--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>object</code> | event data in the format below |

**Example**  
```js
<caption>event.detail contains a detections array and a
         timestamp (of when frame was captured) as follows:</caption>
  detections: [
    {
      id: 0,
      size: 0.1,
      corners: [
        { x: 777.52, y: 735.39 },
        { x: 766.05, y: 546.94 },
        { x: 578.36, y: 587.88 },
        { x: 598, y: 793.42 }
      ],
      center: { x: 684.52, y: 666.51 },
      pose: {
        R: [
          [0.91576, -0.385813, 0.111941],
          [-0.335306, -0.887549, -0.315954],
          [-0.221252, -0.251803, 0.942148]
        ],
        t: [0.873393, 0.188183, 0.080928],
        e: 0.00000058,
        asol: {
          R: [
            [0.892863, -0.092986, -0.440623],
            [0.077304, 0.995574, -0.053454],
            [0.443644, 0.013666, 0.896099]
          ],
          t: [0.040853, -0.032423, 1.790318],
          e: 0.00000078
        }
      }

  }],
  ts: Mon Aug 23 2021 15:49:00 GMT-0400 (Eastern Daylight Time)
```
<a name="module_armarker-reloc--module.exports+getRigPoseFromAprilTag"></a>

#### module.exports.getRigPoseFromAprilTag(dtag, refTag) ⇒ <code>THREE.Matrix4</code>
Calculates the correct rigPose from detected aprilTag

**Kind**: instance method of [<code>module.exports</code>](#exp_module_armarker-reloc--module.exports)  
**Returns**: <code>THREE.Matrix4</code> - this.rigMatrix  

| Param | Type | Description |
| --- | --- | --- |
| dtag | <code>Object</code> | Detected tag pose from camera |
| dtag.R | <code>Array.&lt;Array.&lt;number&gt;&gt;</code> | 2D rotation array |
| dtag.t | <code>Array.&lt;number&gt;</code> | 1D translation array |
| refTag | <code>THREE.Matrix4</code> | Tag pose from scene origin |

<a name="module_armarker-reloc--module.exports+getTagPoseFromRig"></a>

#### module.exports.getTagPoseFromRig(dtag) ⇒ <code>THREE.Matrix4</code>
Calculates the pose of a detected AprilTag from scene origin

**Kind**: instance method of [<code>module.exports</code>](#exp_module_armarker-reloc--module.exports)  
**Returns**: <code>THREE.Matrix4</code> - this.rigMatrix  

| Param | Type | Description |
| --- | --- | --- |
| dtag | <code>Object</code> | Detected tag pose from camera |
| dtag.R | <code>Array.&lt;Array.&lt;number&gt;&gt;</code> | 2D rotation array |
| dtag.t | <code>Array.&lt;number&gt;</code> | 1D translation array |

<a name="module_armarker-system"></a>

## armarker-system
ARMarker System. Supports ARMarkers in a scene.


* [armarker-system](#module_armarker-system)
    * [cvWorkerMessage(msg)](#exp_module_armarker-system--cvWorkerMessage) ⏏
    * [registerComponent(marker)](#exp_module_armarker-system--registerComponent) ⏏
    * [unregisterComponent(marker)](#exp_module_armarker-system--unregisterComponent) ⏏
    * [getAll(mtype)](#exp_module_armarker-system--getAll) ⇒ <code>object</code> ⏏
    * [getMarker(markerid)](#exp_module_armarker-system--getMarker) ⇒ <code>object</code> ⏏

<a name="exp_module_armarker-system--cvWorkerMessage"></a>

### cvWorkerMessage(msg) ⏏
Handle messages from cvWorker (detector)

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>object</code> | The worker message received. |

<a name="exp_module_armarker-system--registerComponent"></a>

### registerComponent(marker) ⏏
Register an ARMarker component with the system

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| marker | <code>object</code> | The marker component object to register. |

<a name="exp_module_armarker-system--unregisterComponent"></a>

### unregisterComponent(marker) ⏏
Unregister an ARMarker component

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| marker | <code>object</code> | The marker component object to unregister. |

<a name="exp_module_armarker-system--getAll"></a>

### getAll(mtype) ⇒ <code>object</code> ⏏
Get all markers registered with the system

**Kind**: Exported function  
**Returns**: <code>object</code> - - a dictionary of markers  

| Param | Type | Description |
| --- | --- | --- |
| mtype | <code>object</code> | The marker type 'apriltag_36h11', 'lightanchor', 'uwb', 'vive', 'optitrack' to filter for;                         No argument or undefined will return all |

**Example** *(Query the system a list of all markers in a scene)*  
```js
    let markers = document.querySelector("a-scene").systems["armarker"].getAll();
    Object.keys(markers).forEach(function(key) {
      console.log(`tag id: ${markers[key].data.markerid}`, markers[key].el.object3D.matrixWorld); //matrixWorld: https://threejs.org/docs/#api/en/math/Matrix4
    });
```
**Example** *(getAll() also accepts a marker type argument to filter by a given type)*  
```js
    let markers = document.querySelector("a-scene").systems["armarker"].getAll('apriltag_36h11');
```
<a name="exp_module_armarker-system--getMarker"></a>

### getMarker(markerid) ⇒ <code>object</code> ⏏
Get a marker given its markerid; first lookup local scene objects, then ATLAS
Marker with ID 0 is assumed to be at (x, y, z) 0, 0, 0

**Kind**: Exported function  
**Returns**: <code>object</code> - - the marker with the markerid given or undefined  

| Param | Type | Description |
| --- | --- | --- |
| markerid | <code>string</code> | The marker id to return (converts to string, if a string is not given) |

<a name="module_ccarheadset"></a>

## ccarheadset

* [ccarheadset](#module_ccarheadset)
    * [module.exports](#exp_module_ccarheadset--module.exports) ⏏
        * [new module.exports(arHeadset, [arMarkerSystem])](#new_module_ccarheadset--module.exports_new)
        * [.terminate()](#module_ccarheadset--module.exports+terminate)
        * [.setCVWorker(worker, [frameRequested])](#module_ccarheadset--module.exports+setCVWorker)
        * [.requestCameraFrame([grayscalePixels], [worker])](#module_ccarheadset--module.exports+requestCameraFrame)

<a name="exp_module_ccarheadset--module.exports"></a>

### module.exports ⏏
Grab front facing camera frames using getUserMedia()

**Kind**: Exported class  
<a name="new_module_ccarheadset--module.exports_new"></a>

#### new module.exports(arHeadset, [arMarkerSystem])
Setup camera frame capture


| Param | Type | Description |
| --- | --- | --- |
| arHeadset | <code>object</code> | heaset name to lookup in headsetPM list |
| [arMarkerSystem] | <code>object</code> | the AFRAME ARMarker system |

<a name="module_ccarheadset--module.exports+terminate"></a>

#### module.exports.terminate()
Tear down camera capture and webworker

**Kind**: instance method of [<code>module.exports</code>](#exp_module_ccarheadset--module.exports)  
<a name="module_ccarheadset--module.exports+setCVWorker"></a>

#### module.exports.setCVWorker(worker, [frameRequested])
Indicate CV worker to send frames to (ar marker system expects this call to be implemented)

**Kind**: instance method of [<code>module.exports</code>](#exp_module_ccarheadset--module.exports)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| worker | <code>object</code> |  | the worker instance to whom we post frame messages |
| [frameRequested] | <code>boolean</code> | <code>true</code> | set request frame flag |

<a name="module_ccarheadset--module.exports+requestCameraFrame"></a>

#### module.exports.requestCameraFrame([grayscalePixels], [worker])
Request next camera frame; we let the CV worker indicate when its ready (ar marker system expects this
call to be implemented)

**Kind**: instance method of [<code>module.exports</code>](#exp_module_ccarheadset--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| [grayscalePixels] | <code>object</code> | the pixel buffer intance we posted (to return ownership to us) |
| [worker] | <code>boolean</code> | the worker instance to send frames to |

<a name="module_ccwebar"></a>

## ccwebar

* [ccwebar](#module_ccwebar)
    * [module.exports](#exp_module_ccwebar--module.exports) ⏏
        * [new module.exports([cameraFacingMode])](#new_module_ccwebar--module.exports_new)
        * [.initCamera()](#module_ccwebar--module.exports+initCamera)
        * [.setCVWorker(worker, [frameRequested])](#module_ccwebar--module.exports+setCVWorker)
        * [.requestCameraFrame([grayscalePixels], [worker])](#module_ccwebar--module.exports+requestCameraFrame)

<a name="exp_module_ccwebar--module.exports"></a>

### module.exports ⏏
Grab front facing camera frames using getUserMedia()

**Kind**: Exported class  
<a name="new_module_ccwebar--module.exports_new"></a>

#### new module.exports([cameraFacingMode])
Setup camera frame capture


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [cameraFacingMode] | <code>object</code> | <code>&#x27;environment&#x27;</code> | as defined by MediaTrackConstraints.facingMode |

<a name="module_ccwebar--module.exports+initCamera"></a>

#### module.exports.initCamera()
Start camera capture

**Kind**: instance method of [<code>module.exports</code>](#exp_module_ccwebar--module.exports)  
<a name="module_ccwebar--module.exports+setCVWorker"></a>

#### module.exports.setCVWorker(worker, [frameRequested])
Indicate CV worker to send frames to (ar marker system expects this call to be implemented)

**Kind**: instance method of [<code>module.exports</code>](#exp_module_ccwebar--module.exports)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| worker | <code>object</code> |  | the worker instance to whom we post frame messages |
| [frameRequested] | <code>boolean</code> | <code>true</code> | set request frame flag |

<a name="module_ccwebar--module.exports+requestCameraFrame"></a>

#### module.exports.requestCameraFrame([grayscalePixels], [worker])
Request next camera frame; we let the CV worker indicate when its ready (ar marker system expects this
call to be implemented)

**Kind**: instance method of [<code>module.exports</code>](#exp_module_ccwebar--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| [grayscalePixels] | <code>object</code> | the pixel buffer intance we posted (to return ownership to us) |
| [worker] | <code>boolean</code> | the worker instance to send frames to |

<a name="module_ccwebarviewer"></a>

## ccwebarviewer
<a name="exp_module_ccwebarviewer--module.exports"></a>

### module.exports ⏏
**Kind**: Exported class  
<a name="module_ccwebxr"></a>

## ccwebxr

* [ccwebxr](#module_ccwebxr)
    * [module.exports](#exp_module_ccwebxr--module.exports) ⏏
        * [new module.exports(xrSession, gl, debug)](#new_module_ccwebxr--module.exports_new)
        * [.setCVWorker(worker, [frameRequested])](#module_ccwebxr--module.exports+setCVWorker)
        * [.requestCameraFrame([grayscalePixels], [worker])](#module_ccwebxr--module.exports+requestCameraFrame)
        * [.getOffscreenCanvas()](#module_ccwebxr--module.exports+getOffscreenCanvas)

<a name="exp_module_ccwebxr--module.exports"></a>

### module.exports ⏏
Grab camera frames using WebXR Raw Camera Access API

**Kind**: Exported class  
<a name="new_module_ccwebxr--module.exports_new"></a>

#### new module.exports(xrSession, gl, debug)
Setup camera frame capture


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| xrSession | <code>object</code> |  | WebXR Device API's XRSession |
| gl | <code>object</code> |  | the open gl context |
| debug | <code>boolean</code> | <code>false</code> | debug messages on/off |

<a name="module_ccwebxr--module.exports+setCVWorker"></a>

#### module.exports.setCVWorker(worker, [frameRequested])
Indicate CV worker to send frames to (ar marker system expects this call to be implemented)

**Kind**: instance method of [<code>module.exports</code>](#exp_module_ccwebxr--module.exports)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| worker | <code>object</code> |  | the worker instance to whom we post frame messages |
| [frameRequested] | <code>boolean</code> | <code>true</code> | set request frame flag |

<a name="module_ccwebxr--module.exports+requestCameraFrame"></a>

#### module.exports.requestCameraFrame([grayscalePixels], [worker])
Request next camera frame; we let the CV worker indicate when its ready
(ar marker system expects this call to be implemented)

**Kind**: instance method of [<code>module.exports</code>](#exp_module_ccwebxr--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| [grayscalePixels] | <code>object</code> | the pixel buffer intance we posted (to return ownership to us) |
| [worker] | <code>boolean</code> | replace the worker instance to send frames to |

<a name="module_ccwebxr--module.exports+getOffscreenCanvas"></a>

#### module.exports.getOffscreenCanvas()
Gets or creates a new offscreenCanvas

**Kind**: instance method of [<code>module.exports</code>](#exp_module_ccwebxr--module.exports)  
<a name="module_build3d-mqtt-object"></a>

## build3d-mqtt-object
Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.

<a name="module_build3d-mqtt-scene"></a>

## build3d-mqtt-scene
Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.

<a name="module_client-event"></a>

## client-event

* [client-event](#module_client-event)
    * [module.exports](#exp_module_client-event--module.exports) ⏏
        * [.handle(message)](#module_client-event--module.exports.handle)

<a name="exp_module_client-event--module.exports"></a>

### module.exports ⏏
Client Event handler

**Kind**: Exported class  
<a name="module_client-event--module.exports.handle"></a>

#### module.exports.handle(message)
Client Event handler

**Kind**: static method of [<code>module.exports</code>](#exp_module_client-event--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | message to be parsed |

<a name="module_create-update"></a>

## create-update

* [create-update](#module_create-update)
    * [module.exports](#exp_module_create-update--module.exports) ⏏
        * [.handle(action, message)](#module_create-update--module.exports.handle)
        * [.setObjectAttributes(entityEl, message)](#module_create-update--module.exports.setObjectAttributes)
        * [.setGeometryAttributes(entityEl, data, gName)](#module_create-update--module.exports.setGeometryAttributes)
        * [.setComponentAttributes(entityEl, data, cName)](#module_create-update--module.exports.setComponentAttributes)
        * [.setEntityAttributes(entityEl, data)](#module_create-update--module.exports.setEntityAttributes)
        * [.handleCameraOverride(action, message)](#module_create-update--module.exports.handleCameraOverride)

<a name="exp_module_create-update--module.exports"></a>

### module.exports ⏏
Create/Update object handler

**Kind**: Exported class  
<a name="module_create-update--module.exports.handle"></a>

#### module.exports.handle(action, message)
Create/Update handler

**Kind**: static method of [<code>module.exports</code>](#exp_module_create-update--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| action | <code>int</code> | action to carry out; one of: ACTIONS.CREATE, ACTIONS.UPDATE |
| message | <code>object</code> | message to be parsed |

<a name="module_create-update--module.exports.setObjectAttributes"></a>

#### module.exports.setObjectAttributes(entityEl, message)
Handles object attributes

**Kind**: static method of [<code>module.exports</code>](#exp_module_create-update--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| entityEl | <code>object</code> | the new aframe object |
| message | <code>object</code> | message to be parsed |

<a name="module_create-update--module.exports.setGeometryAttributes"></a>

#### module.exports.setGeometryAttributes(entityEl, data, gName)
Handles geometry primitive attributes

**Kind**: static method of [<code>module.exports</code>](#exp_module_create-update--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| entityEl | <code>object</code> | the new aframe object |
| data | <code>object</code> | data part of the message with the attributes |
| gName | <code>string</code> | geometry name |

<a name="module_create-update--module.exports.setComponentAttributes"></a>

#### module.exports.setComponentAttributes(entityEl, data, cName)
Handles component attributes
Check if we have a registered component that takes the attributes given in data

**Kind**: static method of [<code>module.exports</code>](#exp_module_create-update--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| entityEl | <code>object</code> | the new aframe object |
| data | <code>object</code> | data part of the message with the attributes |
| cName | <code>string</code> | component name |

<a name="module_create-update--module.exports.setEntityAttributes"></a>

#### module.exports.setEntityAttributes(entityEl, data)
Handles entity attributes (components)

**Kind**: static method of [<code>module.exports</code>](#exp_module_create-update--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| entityEl | <code>object</code> | the new aframe object |
| data | <code>object</code> | data part of the message with the attributes |

<a name="module_create-update--module.exports.handleCameraOverride"></a>

#### module.exports.handleCameraOverride(action, message)
Camera override handler

**Kind**: static method of [<code>module.exports</code>](#exp_module_create-update--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| action | <code>int</code> | message action |
| message | <code>object</code> | message to be parsed |

<a name="module_delete"></a>

## delete

* [delete](#module_delete)
    * [module.exports](#exp_module_delete--module.exports) ⏏
        * [.handle(message)](#module_delete--module.exports.handle)
        * [.blipRemove(el)](#module_delete--module.exports.blipRemove)

<a name="exp_module_delete--module.exports"></a>

### module.exports ⏏
Delete object handler

**Kind**: Exported class  
<a name="module_delete--module.exports.handle"></a>

#### module.exports.handle(message)
Delete handler

**Kind**: static method of [<code>module.exports</code>](#exp_module_delete--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | message to be parsed |

<a name="module_delete--module.exports.blipRemove"></a>

#### module.exports.blipRemove(el)
Remove element with blip effect if it has the component and is set as enabled

**Kind**: static method of [<code>module.exports</code>](#exp_module_delete--module.exports)  

| Param | Description |
| --- | --- |
| el | element to remove |

<a name="module_parser"></a>

## parser

* [parser](#module_parser)
    * [module.exports](#exp_module_parser--module.exports) ⏏
        * [.parse(source, message)](#module_parser--module.exports.parse) ⇒ <code>object</code>

<a name="exp_module_parser--module.exports"></a>

### module.exports ⏏
Message parser and verifier

**Kind**: Exported class  
<a name="module_parser--module.exports.parse"></a>

#### module.exports.parse(source, message) ⇒ <code>object</code>
Parses a message and ensures it has an object_id and data

**Kind**: static method of [<code>module.exports</code>](#exp_module_parser--module.exports)  
**Returns**: <code>object</code> - parsed message, undefined if failure  

| Param | Type | Description |
| --- | --- | --- |
| source | <code>string</code> | caller source for logging |
| message | <code>object</code> | message to parse |

<a name="module_runtime-mngr"></a>

## runtime-mngr

* [runtime-mngr](#module_runtime-mngr)
    * [module.exports](#exp_module_runtime-mngr--module.exports) ⏏
        * [new module.exports(mc, debug)](#new_module_runtime-mngr--module.exports_new)
        * [.register()](#module_runtime-mngr--module.exports+register)
        * [.onRuntimeRegistered()](#module_runtime-mngr--module.exports+onRuntimeRegistered)
        * [.createModuleFromPersist(persistObj, replaceVars)](#module_runtime-mngr--module.exports+createModuleFromPersist)
        * [.cleanup(all)](#module_runtime-mngr--module.exports+cleanup)
        * [.restart(all)](#module_runtime-mngr--module.exports+restart)
        * [.reload()](#module_runtime-mngr--module.exports+reload)

<a name="exp_module_runtime-mngr--module.exports"></a>

### module.exports ⏏
Send requests to orchestrator: register as a runtime, create modules from persist objects.
TODO: start modules on the browser
(code from https://github.com/SilverLineFramework/runtime-browser/)

**Kind**: Exported class  
<a name="new_module_runtime-mngr--module.exports_new"></a>

#### new module.exports(mc, debug)
Start runtime manager


| Param | Type | Description |
| --- | --- | --- |
| mc | <code>object</code> | mqtt client object |
| debug | <code>boolean</code> | debug messages on/off |

<a name="module_runtime-mngr--module.exports+register"></a>

#### module.exports.register()
Register runtime with orchestrator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-mngr--module.exports)  
<a name="module_runtime-mngr--module.exports+onRuntimeRegistered"></a>

#### module.exports.onRuntimeRegistered()
Called once the runtime is initialized; create modules requested meantime

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-mngr--module.exports)  
<a name="module_runtime-mngr--module.exports+createModuleFromPersist"></a>

#### module.exports.createModuleFromPersist(persistObj, replaceVars)
Send create module message from persist object

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-mngr--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| persistObj | <code>object</code> | module persist data (See example) |
| replaceVars | <code>object</code> | dictionary of extra variables to replace (e.g. {scene: "ascene"}) |

**Example**  
```js
Persisted module example
  {
    "object_id": "38bffa0e-b3ab-4f5b-854f-b9dc6b52ec0c",
    "action": "create",
    "persist": true,
    "type": "program",
    "attributes": {
      "name": "arena/py/moving-box",
      "instantiate": "client",
      "filename": "box.py",
      "filetype": "PY",
      "env": [
        "SCENE=${scene}",
        "MQTTH=${mqtth}",
        "REALM=realm",
        "NAMESPACE=${namespace}"
       ],
      "channels": []
    }
  }
```
<a name="module_runtime-mngr--module.exports+cleanup"></a>

#### module.exports.cleanup(all)
Send delete module messages for 'per client' modules; if all==true, sends delete to all modules requested for current scene
called on 'before unload' event

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-mngr--module.exports)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| all | <code>boolean</code> | <code>false</code> | sends delete to all modules requested for current scene; default is to onlt delete client instance programs |

<a name="module_runtime-mngr--module.exports+restart"></a>

#### module.exports.restart(all)
Requests modules previously loaded in current scene; by default only client instance ones

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-mngr--module.exports)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| all | <code>boolean</code> | <code>false</code> | reload all modules requested for current scene; default is to only request client instance programs |

<a name="module_runtime-mngr--module.exports+reload"></a>

#### module.exports.reload()
Cleanup all modules in the scene and request them again

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-mngr--module.exports)  
<a name="module_runtime-msgs"></a>

## runtime-msgs

* [runtime-msgs](#module_runtime-msgs)
    * [module.exports](#exp_module_runtime-msgs--module.exports) ⏏
        * [new module.exports(rt, debug)](#new_module_runtime-msgs--module.exports_new)
        * [.req(msgAction)](#module_runtime-msgs--module.exports+req)
        * [.createDeleteRuntime([msgAction])](#module_runtime-msgs--module.exports+createDeleteRuntime)
        * [.registerRuntime()](#module_runtime-msgs--module.exports+registerRuntime)
        * [.deleteRuntime()](#module_runtime-msgs--module.exports+deleteRuntime)
        * [.createDeleteModule(modAttrs, [msgAction])](#module_runtime-msgs--module.exports+createDeleteModule)
        * [.deleteModule(delModuleAttrs)](#module_runtime-msgs--module.exports+deleteModule)
        * [.createModuleFromPersistObj(persistObj, extraVars)](#module_runtime-msgs--module.exports+createModuleFromPersistObj)

<a name="exp_module_runtime-msgs--module.exports"></a>

### module.exports ⏏
Create runtime message requests for orchestrator

**Kind**: Exported class  
<a name="new_module_runtime-msgs--module.exports_new"></a>

#### new module.exports(rt, debug)
Create the factory


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| rt | <code>object</code> |  | runtime instance |
| debug | <code>boolean</code> | <code>false</code> | debug messages on/off |

<a name="module_runtime-msgs--module.exports+req"></a>

#### module.exports.req(msgAction)
Base message definition

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-msgs--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| msgAction | <code>string</code> | message action ("create"/"delete") |

<a name="module_runtime-msgs--module.exports+createDeleteRuntime"></a>

#### module.exports.createDeleteRuntime([msgAction])
Register/delete (according to msgAction; create=register) runtime message
For internal (class) use

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-msgs--module.exports)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [msgAction] | <code>string</code> | <code>&quot;\&quot;create\&quot;&quot;</code> | message action ("create"/"delete") |

<a name="module_runtime-msgs--module.exports+registerRuntime"></a>

#### module.exports.registerRuntime()
Register runtime message

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-msgs--module.exports)  
<a name="module_runtime-msgs--module.exports+deleteRuntime"></a>

#### module.exports.deleteRuntime()
Delete runtime message

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-msgs--module.exports)  
<a name="module_runtime-msgs--module.exports+createDeleteModule"></a>

#### module.exports.createDeleteModule(modAttrs, [msgAction])
Create/delete module message (according to msgAction)
For internal (class) use

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-msgs--module.exports)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| modAttrs | <code>object</code> |  | module attributes to include (uuid, name, ...) |
| [msgAction] | <code>string</code> | <code>&quot;\&quot;create\&quot;&quot;</code> | message action ("create"/"delete") |

<a name="module_runtime-msgs--module.exports+deleteModule"></a>

#### module.exports.deleteModule(delModuleAttrs)
Delete module message

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-msgs--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| delModuleAttrs | <code>object</code> | module attributes to include (uuid, name, ...) |

<a name="module_runtime-msgs--module.exports+createModuleFromPersistObj"></a>

#### module.exports.createModuleFromPersistObj(persistObj, extraVars)
Create module message from persist object

**Kind**: instance method of [<code>module.exports</code>](#exp_module_runtime-msgs--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| persistObj | <code>object</code> | module persist data (See example) |
| extraVars | <code>object</code> | dictionary of extra variables to replace (e.g. {scene: "ascene"}) |

<a name="module_attribution-system"></a>

## attribution-system
Attribution Component/System. Add attribution message to any entity.
Tries to extract author, license, source and title (assuming format used in sketchfab downloaded models)

Looks for authorship metadata in both asset.extras (sketchfab models) and scene.extra (manually added attributes in blender).
If both asset.extras and scene.extra exist, gives preference to asset.extras.

**Example** *(Sketchfab downloaded model attributes - asset.extra)*  
```js
   author: "AuthorName (url-link-to-author)"
   license: "CC-BY-4.0 (url-link-to-license)"
   source: "url-link-to-model-website"
   title: "Model Title"
```

* [attribution-system](#module_attribution-system)
    * [registerComponent(el)](#exp_module_attribution-system--registerComponent) ⏏
    * [unregisterComponent(el)](#exp_module_attribution-system--unregisterComponent) ⏏
    * [getAttributionTable()](#exp_module_attribution-system--getAttributionTable) ⇒ <code>string</code> ⏏
    * [extractAttributionFromGltfAsset(el, gltfComponent)](#exp_module_attribution-system--extractAttributionFromGltfAsset) ⏏
    * [parseExtrasAttributes(extras)](#exp_module_attribution-system--parseExtrasAttributes) ⇒ <code>object</code> ⏏
    * [parseAttribute(extras, attribution, attribute)](#exp_module_attribution-system--parseAttribute) ⇒ <code>boolean</code> ⏏

<a name="exp_module_attribution-system--registerComponent"></a>

### registerComponent(el) ⏏
Register an attribution component with the system

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| el | <code>object</code> | The attribution a-frame element to register. |

<a name="exp_module_attribution-system--unregisterComponent"></a>

### unregisterComponent(el) ⏏
Unregister an attribution component

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| el | <code>object</code> | The attribution a-frame element. |

<a name="exp_module_attribution-system--getAttributionTable"></a>

### getAttributionTable() ⇒ <code>string</code> ⏏
Collect all attribution components and return an HTML table with credits

**Kind**: Exported function  
**Returns**: <code>string</code> - - an HTML table with the scene credits  
**Example** *(Query the system for an HTML table of credits:)*  
```js
   document.querySelector("a-scene").systems["attribution"].getAttributionTable();
```
<a name="exp_module_attribution-system--extractAttributionFromGltfAsset"></a>

### extractAttributionFromGltfAsset(el, gltfComponent) ⏏
Extract author, license, source and title assuming sketchfab format:
  author: "AuthorName (url-link-to-author)"
  license: "CC-BY-4.0 (url-link-to-license)"
  source: "url-link-to-model-website"
  title: "Model Title"

It will try to get exttributes from gltf's asset.extras (sketchfab) and scene.userData (blender)
If both are found, data will be merged with preference to properties in asset.extras

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| el | <code>object</code> | the aframe element to set the attribution |
| gltfComponent | <code>object</code> | the GLTF model to extract properties from |

<a name="exp_module_attribution-system--parseExtrasAttributes"></a>

### parseExtrasAttributes(extras) ⇒ <code>object</code> ⏏
Parse author, license, source and title attributes.

**Kind**: Exported function  
**Returns**: <code>object</code> - - a dictionary with the author, license, source and title parsed  

| Param | Type | Description |
| --- | --- | --- |
| extras | <code>object</code> | the source for the attribute data (asset.extras or scene.userData) |

<a name="exp_module_attribution-system--parseAttribute"></a>

### parseAttribute(extras, attribution, attribute) ⇒ <code>boolean</code> ⏏
Parse attribute given as parameter. Tries to find the attribute and add it to 'attribution' dictionary

**Kind**: Exported function  
**Returns**: <code>boolean</code> - - true/false if it could find the attribute  

| Param | Type | Description |
| --- | --- | --- |
| extras | <code>object</code> | the source for the attribute data |
| attribution | <code>object</code> | the destination attribute dictionary |
| attribute | <code>string</code> | which attribute to parse |

<a name="module_screenshareable"></a>

## screenshareable
Screenshare-able System. Allows an object to be screenshared upon

<a name="module_model-progress"></a>

## model-progress
Model loading progress system. Manage model load messages.


* [model-progress](#module_model-progress)
    * [init()](#exp_module_model-progress--init) ⏏
    * [registerModel(el, src)](#exp_module_model-progress--registerModel) ⏏
    * [unregisterModelBySrc(src)](#exp_module_model-progress--unregisterModelBySrc) ⏏
    * [updateProgress(failed, evt)](#exp_module_model-progress--updateProgress) ⏏

<a name="exp_module_model-progress--init"></a>

### init() ⏏
Init system

**Kind**: Exported function  
<a name="exp_module_model-progress--registerModel"></a>

### registerModel(el, src) ⏏
Register model to deal with load events

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| el | <code>object</code> | The a-frame element to register. |
| src | <code>object</code> | the model source |

<a name="exp_module_model-progress--unregisterModelBySrc"></a>

### unregisterModelBySrc(src) ⏏
Unregister a model

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| src | <code>object</code> | the model source |

<a name="exp_module_model-progress--updateProgress"></a>

### updateProgress(failed, evt) ⏏
Updates Model Progress

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| failed | <code>boolean</code> | whether or not download was successful |
| evt | <code>object</code> | model event |

<a name="module_webar"></a>

## webar

* [webar](#module_webar)
    * [module.exports](#exp_module_webar--module.exports) ⏏
        * [.enterARNonWebXR()](#module_webar--module.exports.enterARNonWebXR)
        * [.handleARButtonForNonWebXRMobile()](#module_webar--module.exports.handleARButtonForNonWebXRMobile)

<a name="exp_module_webar--module.exports"></a>

### module.exports ⏏
Helper functions for WebAR session

**Kind**: Exported class  
<a name="module_webar--module.exports.enterARNonWebXR"></a>

#### module.exports.enterARNonWebXR()
Starts a WebAR session

**Kind**: static method of [<code>module.exports</code>](#exp_module_webar--module.exports)  
<a name="module_webar--module.exports.handleARButtonForNonWebXRMobile"></a>

#### module.exports.handleARButtonForNonWebXRMobile()
Adds the AR button for non-WebXR devices

**Kind**: static method of [<code>module.exports</code>](#exp_module_webar--module.exports)  
<a name="Apriltag"></a>

## Apriltag
This is a wrapper class that calls apriltag_wasm to load the WASM module and wraps the c implementation calls.
The apriltag dectector uses the tag36h11 family.
For tag pose estimation, call set_tag_size allows to indicate the size of known tags.
If size is not defined using set_tag_size(), it will default to 150mm tags.

**Kind**: global class  

* [Apriltag](#Apriltag)
    * [new Apriltag(onDetectorReadyCallback)](#new_Apriltag_new)
    * [.onWasmInit(Module)](#Apriltag+onWasmInit)
    * [.detect(grayscaleImg, imgWidth, imgHeight)](#Apriltag+detect) ⇒ <code>Array</code>
    * [.set_camera_info(fx, fy, cx, cy)](#Apriltag+set_camera_info)
    * [.set_tag_size(tagid, size)](#Apriltag+set_tag_size)
    * [.set_max_detections(maxDetections)](#Apriltag+set_max_detections)
    * [.set_return_pose(returnPose)](#Apriltag+set_return_pose)
    * [.set_return_solutions(returnSolutions)](#Apriltag+set_return_solutions)

<a name="new_Apriltag_new"></a>

### new Apriltag(onDetectorReadyCallback)
Contructor


| Param | Type | Description |
| --- | --- | --- |
| onDetectorReadyCallback | <code>function</code> | Callback when the detector is ready |

<a name="Apriltag+onWasmInit"></a>

### apriltag.onWasmInit(Module)
Init wrapper calls

**Kind**: instance method of [<code>Apriltag</code>](#Apriltag)  

| Param | Type | Description |
| --- | --- | --- |
| Module | <code>\*</code> | WASM module instance |

<a name="Apriltag+detect"></a>

### apriltag.detect(grayscaleImg, imgWidth, imgHeight) ⇒ <code>Array</code>
**public** detect method

**Kind**: instance method of [<code>Apriltag</code>](#Apriltag)  
**Returns**: <code>Array</code> - detection object  

| Param | Type | Description |
| --- | --- | --- |
| grayscaleImg | <code>Array</code> | grayscale image buffer |
| imgWidth | <code>Number</code> | image with |
| imgHeight | <code>Number</code> | image height |

<a name="Apriltag+set_camera_info"></a>

### apriltag.set\_camera\_info(fx, fy, cx, cy)
**public** set camera parameters

**Kind**: instance method of [<code>Apriltag</code>](#Apriltag)  

| Param | Type | Description |
| --- | --- | --- |
| fx | <code>Number</code> | camera focal length |
| fy | <code>Number</code> | camera focal length |
| cx | <code>Number</code> | camera principal point |
| cy | <code>Number</code> | camera principal point |

<a name="Apriltag+set_tag_size"></a>

### apriltag.set\_tag\_size(tagid, size)
**public** set size of known tag (size in meters)

**Kind**: instance method of [<code>Apriltag</code>](#Apriltag)  

| Param | Type | Description |
| --- | --- | --- |
| tagid | <code>Number</code> | the tag id |
| size | <code>Number</code> | the size of the tag in meters |

<a name="Apriltag+set_max_detections"></a>

### apriltag.set\_max\_detections(maxDetections)
**public** set maximum detections to return (0=return all)

**Kind**: instance method of [<code>Apriltag</code>](#Apriltag)  

| Param | Type |
| --- | --- |
| maxDetections | <code>Number</code> | 

<a name="Apriltag+set_return_pose"></a>

### apriltag.set\_return\_pose(returnPose)
**public** set return pose estimate (0=do not return; 1=return)

**Kind**: instance method of [<code>Apriltag</code>](#Apriltag)  

| Param | Type |
| --- | --- |
| returnPose | <code>Number</code> | 

<a name="Apriltag+set_return_solutions"></a>

### apriltag.set\_return\_solutions(returnSolutions)
**public** set return pose estimate alternative solution details (0=do not return; 1=return)

**Kind**: instance method of [<code>Apriltag</code>](#Apriltag)  

| Param | Type |
| --- | --- |
| returnSolutions | <code>Number</code> | 

<a name="MQTTWorker"></a>

## MQTTWorker
Main ARENA MQTT webworker client

**Kind**: global class  

* [MQTTWorker](#MQTTWorker)
    * [new MQTTWorker(ARENAConfig, healthCheck, onSubscribed)](#new_MQTTWorker_new)
    * [.connect(mqttClientOptions, onSuccessCallBack, [lwMsg], [lwTopic])](#MQTTWorker+connect)
    * [.subscribe(topic, opts)](#MQTTWorker+subscribe)
    * [.addConnectionLostHandler(handler)](#MQTTWorker+addConnectionLostHandler)
    * [.onMessageArrivedDispatcher(message)](#MQTTWorker+onMessageArrivedDispatcher)
    * [.registerMessageHandler(topicCategory, mainHandler)](#MQTTWorker+registerMessageHandler)
    * [.registerMessageQueue(topicCategory, isJson, validateUuid)](#MQTTWorker+registerMessageQueue)
    * [.publish(topic, payload, qos, retained)](#MQTTWorker+publish)
    * [.onConnected(reconnect, uri)](#MQTTWorker+onConnected)
    * [.onConnectionLost(responseObject)](#MQTTWorker+onConnectionLost)

<a name="new_MQTTWorker_new"></a>

### new MQTTWorker(ARENAConfig, healthCheck, onSubscribed)

| Param | Type |
| --- | --- |
| ARENAConfig | <code>object</code> | 
| healthCheck | <code>function</code> | 
| onSubscribed | <code>function</code> | 

<a name="MQTTWorker+connect"></a>

### mqttWorker.connect(mqttClientOptions, onSuccessCallBack, [lwMsg], [lwTopic])
Connect mqtt client; If given, setup a last will message given as argument

**Kind**: instance method of [<code>MQTTWorker</code>](#MQTTWorker)  

| Param | Type | Description |
| --- | --- | --- |
| mqttClientOptions | <code>object</code> | paho mqtt options |
| onSuccessCallBack | <code>function</code> | callback function on successful connection |
| [lwMsg] | <code>string</code> | last will message |
| [lwTopic] | <code>string</code> | last will destination topic message |

<a name="MQTTWorker+subscribe"></a>

### mqttWorker.subscribe(topic, opts)
Subscribe to a topic and add it to list of subscriptions

**Kind**: instance method of [<code>MQTTWorker</code>](#MQTTWorker)  

| Param | Type |
| --- | --- |
| topic | <code>string</code> | 
| opts | <code>object</code> | 

<a name="MQTTWorker+addConnectionLostHandler"></a>

### mqttWorker.addConnectionLostHandler(handler)
Add a handler for when the connection is lost

**Kind**: instance method of [<code>MQTTWorker</code>](#MQTTWorker)  

| Param | Type |
| --- | --- |
| handler | <code>function</code> | 

<a name="MQTTWorker+onMessageArrivedDispatcher"></a>

### mqttWorker.onMessageArrivedDispatcher(message)
onMessageArrived callback. Dispatches message to registered handlers based on topic category.
The category is the string between the first and second slash in the topic.
If no handler exists for a given topic category, the message is ignored.

**Kind**: instance method of [<code>MQTTWorker</code>](#MQTTWorker)  

| Param | Type |
| --- | --- |
| message | <code>Paho.Message</code> | 

<a name="MQTTWorker+registerMessageHandler"></a>

### mqttWorker.registerMessageHandler(topicCategory, mainHandler)
Register a message handler for a given topic category beneath realm (second level). This is required even
if a message is batch queued, as this we need this to flush the queue whenever the max interval is reached.

**Kind**: instance method of [<code>MQTTWorker</code>](#MQTTWorker)  

| Param | Type | Description |
| --- | --- | --- |
| topicCategory | <code>string</code> | the topic category to register a handler for |
| mainHandler | <code>function</code> | main thread handler, pass in whatever expected format |

<a name="MQTTWorker+registerMessageQueue"></a>

### mqttWorker.registerMessageQueue(topicCategory, isJson, validateUuid)
Register a message handler for a given topic category beneath realm (second level).

**Kind**: instance method of [<code>MQTTWorker</code>](#MQTTWorker)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| topicCategory | <code>string</code> |  | the topic category to register a handler for |
| isJson | <code>boolean</code> | <code>true</code> | whether the payload is expected to be well-formed json |
| validateUuid | <code>string</code> \| <code>null</code> | <code>&quot;object_id&quot;</code> | object key to validate match to the topic uuid, nullish if no validation |

<a name="MQTTWorker+publish"></a>

### mqttWorker.publish(topic, payload, qos, retained)
Publish to given dest topic

**Kind**: instance method of [<code>MQTTWorker</code>](#MQTTWorker)  

| Param | Type | Default |
| --- | --- | --- |
| topic | <code>string</code> |  | 
| payload | <code>string</code> \| <code>object</code> |  | 
| qos | <code>number</code> | <code>0</code> | 
| retained | <code>boolean</code> | <code>false</code> | 

<a name="MQTTWorker+onConnected"></a>

### mqttWorker.onConnected(reconnect, uri)
MQTT onConnected callback

**Kind**: instance method of [<code>MQTTWorker</code>](#MQTTWorker)  

| Param | Type | Description |
| --- | --- | --- |
| reconnect | <code>Boolean</code> | is a reconnect |
| uri | <code>Object</code> | uri used |

<a name="MQTTWorker+onConnectionLost"></a>

### mqttWorker.onConnectionLost(responseObject)
MQTT onConnectionLost callback

**Kind**: instance method of [<code>MQTTWorker</code>](#MQTTWorker)  

| Param | Type | Description |
| --- | --- | --- |
| responseObject | <code>Object</code> | paho response object |

<a name="SimplexNoise"></a>

## SimplexNoise
You can pass in a random number generator object if you like.
It is assumed to have a random() method.

**Kind**: global class  
<a name="SAOPass"></a>

## SAOPass
SAO implementation inspired from bhouston previous SAO work

**Kind**: global class  
<a name="UnrealBloomPass"></a>

## UnrealBloomPass
UnrealBloomPass is inspired by the bloom pass of Unreal Engine. It creates a
mip map chain of bloom textures and blurs them with different radii. Because
of the weighted combination of mips, and because larger blurs are done on
higher mips, this effect provides good quality and performance.

Reference:
- https://docs.unrealengine.com/latest/INT/Engine/Rendering/PostProcessEffects/Bloom/

**Kind**: global class  
<a name="newUserTimers"></a>

## newUserTimers
list of timers to send new user notifications; when a user enters jitsi, there is some delay until other
participants receive data about its properties (e.g. arenaDisplayName and arenaUserName).
we wait newUserTimeoutMs to hear about these in case it is an arena user and notify anyway after this timeout

**Kind**: global variable  
<a name="Base64Binary"></a>

## Base64Binary
Uses the new array typed in javascript to binary base64 encode/decode
at the moment just decodes a binary base64 encoded
into either an ArrayBuffer (decodeArrayBuffer)
or into an Uint8Array (decode)

References:
https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer
https://developer.mozilla.org/en/JavaScript_typed_arrays/Uint8Array

**Kind**: global constant  
<a name="CopyShader"></a>

## CopyShader
Full-screen textured quad shader

**Kind**: global constant  
<a name="DigitalGlitch"></a>

## DigitalGlitch
RGB Shift Shader
Shifts red and blue channels from center in opposite directions
Ported from http://kriss.cx/tom/2009/05/rgb-shift/
by Tom Butterworth / http://kriss.cx/tom/

amount: shift distance (1 is width of input)
angle: shift angle in radians

**Kind**: global constant  
<a name="FXAAShader"></a>

## FXAAShader
NVIDIA FXAA by Timothy Lottes
https://developer.download.nvidia.com/assets/gamedev/files/sdk/11/FXAA_WhitePaper.pdf
- WebGL port by @supereggbert
http://www.glge.org/demos/fxaa/
Further improved by Daniel Sturk

**Kind**: global constant  
<a name="LuminosityHighPassShader"></a>

## LuminosityHighPassShader
Luminosity
http://en.wikipedia.org/wiki/Luminosity

**Kind**: global constant  
<a name="SMAAEdgesShader"></a>

## SMAAEdgesShader
WebGL port of Subpixel Morphological Antialiasing (SMAA) v2.8
Preset: SMAA 1x Medium (with color edge detection)
https://github.com/iryoku/smaa/releases/tag/v2.8

**Kind**: global constant  
<a name="SSAOShader"></a>

## SSAOShader
References:
http://john-chapman-graphics.blogspot.com/2013/01/ssao-tutorial.html
https://learnopengl.com/Advanced-Lighting/SSAO
https://github.com/McNopper/OpenGL/blob/master/Example28/shader/ssao.frag.glsl

**Kind**: global constant  
<a name="UnpackDepthRGBAShader"></a>

## UnpackDepthRGBAShader
Unpack RGBA depth shader
- show RGBA encoded depth as monochrome color

**Kind**: global constant  
<a name="processGsFrame"></a>

## processGsFrame(frame)
Process grayscale camera frame

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| frame | <code>object</code> | The received camera frame |
| frame.type | <code>\*</code> | message type |
| frame.ts | <code>DOMHighResTimeStamp</code> | timestamp |
| frame.width | <code>Number</code> | image width |
| frame.height | <code>Number</code> | image height |
| frame.grayscalePixels | <code>Uint8ClampedArray</code> | grayscale image pixels (Uint8ClampedArray[width x height]) |
| frame.camera | <code>object</code> | camera properties: camera's focal length (fx, fy) and principal point (cx, cy) |

<a name="fetchSceneOptions"></a>

## fetchSceneOptions() ⇒ <code>Promise.&lt;void&gt;</code>
Fetches scene options from persistence server, deferring loading until user params are loaded.

**Kind**: global function  
<a name="fetchSceneObjects"></a>

## fetchSceneObjects([urlToLoad], [parentName], [prefixName])
Fetches scene objects from persistence server, deferring loading until userparams and scene are loaded.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| [urlToLoad] | <code>string</code> | which url to load arena from |
| [parentName] | <code>string</code> | parentObject to attach sceneObjects to |
| [prefixName] | <code>string</code> | prefix to add to container |

<a name="initRuntimeMngr"></a>

## initRuntimeMngr()
Init runtime manager; must be called after mqtt is loaded

**Kind**: global function  
<a name="loadScene"></a>

## loadScene()
Load Scene; checks URI parameters

**Kind**: global function  
<a name="setIdTag"></a>

## setIdTag(idTag)
Sets this.idTag using name given as argument, url parameter value, or default
Important: Also sets amName, faceName, handLName, handRName which depend on idTag

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| idTag | <code>string</code> | user name to set; will use url parameter value or default is no name is given |

<a name="getDisplayName"></a>

## getDisplayName() ⇒ <code>string</code>
Gets display name either from local storage or from userName

**Kind**: global function  
**Returns**: <code>string</code> - display name  
<a name="isJitsiPermitted"></a>

## isJitsiPermitted() ⇒ <code>boolean</code>
Checks loaded MQTT/Jitsi token for Jitsi video conference permission.

**Kind**: global function  
**Returns**: <code>boolean</code> - True if the user has permission to stream audio/video in this scene.  
<a name="isUsersPermitted"></a>

## isUsersPermitted() ⇒ <code>boolean</code>
Checks loaded MQTT/Jitsi token for user interaction permission.

**Kind**: global function  
**Returns**: <code>boolean</code> - True if the user has permission to send/receive presence in this scene.  
<a name="isUserSceneWriter"></a>

## isUserSceneWriter()
Checks token for full scene object write permissions.
     // * @return {boolean} True if the user has permission to write in this scene.

**Kind**: global function  
<a name="isUserChatWriter"></a>

## isUserChatWriter()
Checks token for scene chat write permissions.
     // * @return {boolean} True if the user has permission to chat in this scene.

**Kind**: global function  
<a name="isBuild3dEnabled"></a>

## isBuild3dEnabled()
Checks the state of build3d request and for scene write permissions.

**Kind**: global function  
<a name="showEchoDisplayName"></a>

## showEchoDisplayName([speaker])
Renders/updates the display name in the top left corner of a scene.

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [speaker] | <code>boolean</code> | <code>false</code> | If the user is the dominant speaker |

<a name="loadUser"></a>

## loadUser()
loads this user's presence and camera

**Kind**: global function  
<a name="loadArenaInspector"></a>

## loadArenaInspector()
Loads the a-frame inspector, with MutationObserver connected to MQTT.
Expects all known objects to be loaded first.
Expects that permissions have been checked so users won't be confused if publish fails.

**Kind**: global function  
<a name="removeBuild3d"></a>

## removeBuild3d()
remove the build3d a-frame inspector

**Kind**: global function  
<a name="loadSceneObjects"></a>

## loadSceneObjects([sceneObjs], [parentName], [prefixName])
loads scene objects from specified persistence URL if specified,
or this.persistenceUrl if not

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| [sceneObjs] | <code>Array.&lt;Object&gt;</code> | Objects to load |
| [parentName] | <code>string</code> | parentObject to attach sceneObjects to |
| [prefixName] | <code>string</code> | prefix to add to container |

<a name="loadSceneObjects..createObj"></a>

### loadSceneObjects~createObj(obj, [descendants])
Recursively creates objects with parents, keep list of descendants to prevent circular references

**Kind**: inner method of [<code>loadSceneObjects</code>](#loadSceneObjects)  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>Object</code> | msg from persistence |
| [descendants] | <code>Array</code> | running list of descendants |

<a name="loadSceneOptions"></a>

## loadSceneOptions(sceneData)
Loads and applies scene-options (if it exists), otherwise set to default environment

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| sceneData | <code>Object</code> | scene data from persistence, already JSON parsed |

<a name="addDefaultLights"></a>

## addDefaultLights([ifNoNonEnv])
Add default lights to the scene

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [ifNoNonEnv] | <code>boolean</code> | <code>false</code> | add lights only if no non-environment lights are present |

<a name="setupSceneHeadModels"></a>

## setupSceneHeadModels()
Update the list of scene-specific heads the user can select from

**Kind**: global function  
<a name="addEventListener"></a>

## addEventListener(key, callback, [opts])
Register event listener AND dispatch it immediately if key is already set

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| key | <code>string</code> |  | event key |
| callback | <code>function</code> |  | callback function to register or dispatch |
| [opts] | <code>object</code> | <code>{ once: true }</code> | options to pass to addEventListener |

<a name="addMultiEventListener"></a>

## addMultiEventListener(keys, callback, [opts])
Register callback that depends on multiple event dependencies, firing
if all events are already set -- which may be immediate.

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| keys | <code>array</code> |  | List of event keys to listen for |
| callback | <code>function</code> |  | callback function to register or dispatch |
| [opts] | <code>object</code> | <code>{ once: true }</code> | options to pass to addEventListener |

<a name="emit"></a>

## emit(name, [detail], [bubbles])
Wrapper for AFRAME emit that also sets key in events

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of event. |
| [detail] | <code>object</code> | <code>{}</code> | Custom data to pass as `detail` to the event. |
| [bubbles] | <code>boolean</code> | <code>true</code> | Whether the event should bubble. |

<a name="validateDeviceIds"></a>

## validateDeviceIds() ⇒ <code>Promise.&lt;boolean&gt;</code>
Validate saved device IDs against currently available devices.
Clears preferences if any saved device is no longer available.

**Kind**: global function  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - true if all saved devices are still valid  
<a name="connect"></a>

## connect()
Connect to the Jitsi server.

**Kind**: global function  
<a name="connectArena"></a>

## connectArena(participantId, trackType)
Called when user joins

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| participantId | <code>string</code> | Participant id |
| trackType | <code>string</code> | track type ('audio'/'video') |

<a name="onLocalTracks"></a>

## onLocalTracks(tracks)
Handles local tracks.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| tracks | <code>Array</code> | Array with JitsiTrack objects |

<a name="updateScreenShareObject"></a>

## updateScreenShareObject(screenShareId, videoId, participantId) ⇒ <code>object</code>
Update screen share object

**Kind**: global function  
**Returns**: <code>object</code> - screenShare scene object  

| Param | Type | Description |
| --- | --- | --- |
| screenShareId | <code>string</code> | JitsiTrack object |
| videoId | <code>string</code> | Jitsi video Id |
| participantId | <code>string</code> | Jitsi participant Id |

<a name="onRemoteTrack"></a>

## onRemoteTrack(track)
Handles remote tracks

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| track | <code>object</code> | JitsiTrack object |

<a name="onConferenceJoined"></a>

## onConferenceJoined()
This function is executed when the this.conference is joined

**Kind**: global function  
<a name="onUserJoined"></a>

## onUserJoined(id)
Called when user joins

**Kind**: global function  

| Param | Type |
| --- | --- |
| id | <code>string</code> | 

<a name="onUserLeft"></a>

## onUserLeft(id, user)
Called when user leaves

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | user Id |
| user | <code>object</code> | user object (JitsiParticipant) |

<a name="onDominantSpeakerChanged"></a>

## onDominantSpeakerChanged(id)
Called when dominant speaker changes.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | user Id |

<a name="onConnectionSuccess"></a>

## onConnectionSuccess()
This function is called when connection is established successfully

**Kind**: global function  
<a name="onConferenceError"></a>

## onConferenceError(err)
Called for conference errors/failures

**Kind**: global function  

| Param | Type |
| --- | --- |
| err | <code>\*</code> | 

<a name="onConnectionFailed"></a>

## onConnectionFailed()
This function is called when the this.connection fails.

**Kind**: global function  
<a name="onDeviceListChanged"></a>

## onDeviceListChanged(devices)
This function is called when device list changes

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| devices | <code>object</code> | List of devices |

<a name="disconnect"></a>

## disconnect()
This function is called when we disconnect.

**Kind**: global function  
<a name="unload"></a>

## unload()
called on unload; release tracks, leave this.conference

**Kind**: global function  
<a name="avConnect"></a>

## avConnect() ⇒ <code>promise</code>
Connect audio and video and start sending local tracks

**Kind**: global function  
<a name="setupCornerVideo"></a>

## setupCornerVideo()
show user video in the corner

**Kind**: global function  
<a name="setupCornerVideo..setCornerVideoHeight"></a>

### setupCornerVideo~setCornerVideoHeight()
set video element size

**Kind**: inner method of [<code>setupCornerVideo</code>](#setupCornerVideo)  
<a name="showVideo"></a>

## showVideo()
Show the client user's video

**Kind**: global function  
<a name="hideVideo"></a>

## hideVideo()
Hide the client user's video

**Kind**: global function  
<a name="getJitsiId"></a>

## getJitsiId() ⇒ <code>string</code>
Getter for the client users Jitsi Id

**Kind**: global function  
**Returns**: <code>string</code> - The Jitsi Id  
<a name="activeSpeakerChanged"></a>

## activeSpeakerChanged() ⇒ <code>boolean</code>
Has the active speaker changed

**Kind**: global function  
**Returns**: <code>boolean</code> - if the active speaker has changed  
<a name="unmuteAudio"></a>

## unmuteAudio() ⇒ <code>\*</code>
Begin the audio feed

**Kind**: global function  
**Returns**: <code>\*</code> - Promise for the track unmute  
<a name="muteAudio"></a>

## muteAudio() ⇒ <code>\*</code>
End the audio feed

**Kind**: global function  
**Returns**: <code>\*</code> - Promise for the track mute  
<a name="startVideo"></a>

## startVideo() ⇒ <code>\*</code>
Begin the video feed

**Kind**: global function  
**Returns**: <code>\*</code> - Promise for the track unmute  
<a name="stopVideo"></a>

## stopVideo() ⇒ <code>\*</code>
End the video feed

**Kind**: global function  
**Returns**: <code>\*</code> - Promise for the track mute  
<a name="getAudioTrack"></a>

## getAudioTrack(jitsiId) ⇒ <code>\*</code>
Getter for the audio feed by jisti id

**Kind**: global function  
**Returns**: <code>\*</code> - remote track object  

| Param | Type | Description |
| --- | --- | --- |
| jitsiId | <code>\*</code> | The jitsi user id |

<a name="getVideoTrack"></a>

## getVideoTrack(jitsiId) ⇒ <code>\*</code>
Getter for the video feed by jisti id

**Kind**: global function  
**Returns**: <code>\*</code> - remote track object  

| Param | Type | Description |
| --- | --- | --- |
| jitsiId | <code>\*</code> | The jitsi user id |

<a name="setResolutionRemotes"></a>

## setResolutionRemotes(panoIds, constraints)
Set received resolution of remote video. Used to prioritize high, medium, low, drop
resolution. Can be expanded. Individual resolution per ID overwrites previous calls to
setReceiverConstraints. Setting the order of these id arrays is important. Examples at:
https://github.com/jitsi/jitsi-videobridge/blob/master/doc/allocation.md

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| panoIds | <code>\*</code> | Array of jitsi ids panoramic, first is 'on-stage', others get lower res. |
| constraints | <code>\*</code> | ID and resolution value object to update. |

<a name="kickout"></a>

## kickout(participantJitsiId, msg)
Remove a user from the conference

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| participantJitsiId | <code>\*</code> | The user to kick out |
| msg | <code>\*</code> | The message for the user |

<a name="leave"></a>

## leave()
Disconnect from the conference

**Kind**: global function  
<a name="getUserId"></a>

## getUserId(participantJitsiId) ⇒ <code>String</code>
**Kind**: global function  

| Param | Type |
| --- | --- |
| participantJitsiId | <code>\*</code> | 

<a name="getProperty"></a>

## getProperty(participantJitsiId, property) ⇒ <code>Object</code>
**Kind**: global function  

| Param | Type |
| --- | --- |
| participantJitsiId | <code>\*</code> | 
| property | <code>\*</code> | 

<a name="getConnectionColor"></a>

## getConnectionColor(quality) ⇒ <code>string</code>
Get color based on 0-100% connection quality.

**Kind**: global function  
**Returns**: <code>string</code> - Color string  

| Param | Type | Description |
| --- | --- | --- |
| quality | <code>int</code> | Connection Quality |

<a name="getConnectionText"></a>

## getConnectionText(name, stats, status) ⇒ <code>string</code>
Get readable video stats.

**Kind**: global function  
**Returns**: <code>string</code> - Readable stats  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The display name of the user |
| stats | <code>Object</code> | The jisti video stats object if any |
| status | <code>Object</code> | The jisti video status object if any |

<a name="connect"></a>

## connect(mqttClientOptions, [onSuccessCallBack], [lwMsg], [lwTopic])
**Kind**: global function  

| Param | Type |
| --- | --- |
| mqttClientOptions | <code>object</code> | 
| [onSuccessCallBack] | <code>function</code> | 
| [lwMsg] | <code>string</code> | 
| [lwTopic] | <code>string</code> | 

<a name="mqttHealthCheck"></a>

## mqttHealthCheck(msg)
Internal callback to pass MQTT connection health to ARENAHealth.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>object</code> | Message object like: {addError: 'mqttScene.connection'} |

<a name="publish"></a>

## publish(topic, payload, qos, retained)
Publishes message to mqtt

**Kind**: global function  

| Param | Type |
| --- | --- |
| topic | <code>string</code> | 
| payload | <code>string</code> \| <code>object</code> | 
| qos | <code>number</code> | 
| retained | <code>boolean</code> | 

<a name="processMessage"></a>

## processMessage(jsonMessage)
Send a message to internal receive handler

**Kind**: global function  

| Param | Type |
| --- | --- |
| jsonMessage | <code>object</code> | 

<a name="isConnected"></a>

## isConnected() ⇒ <code>boolean</code>
Returns mqttClient connection state

**Kind**: global function  
<a name="onSceneMessageArrived"></a>

## onSceneMessageArrived(message)
MessageArrived handler for scene messages; handles object create/delete/event... messages
This message is expected to be JSON

**Kind**: global function  

| Param | Type |
| --- | --- |
| message | <code>object</code> | 

<a name="handleSceneObjectMessage"></a>

## handleSceneObjectMessage(message, topicToUid, topicSplit)
Handle scene object messages

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | the message object |
| topicToUid | <code>object</code> | the topic uuid the message was addressed to |
| topicSplit | <code>Array.&lt;string&gt;</code> | the full topic split string array |

<a name="handleSceneUserMessage"></a>

## handleSceneUserMessage(message, topicToUid, topicSplit)
Handle scene user messages, consisting of camera, hand object updates and actions

**Kind**: global function  

| Param |
| --- |
| message | 
| topicToUid | 
| topicSplit | 

<a name="onMessageArrived"></a>

## onMessageArrived()
Callback; Called when a message arrives

**Kind**: global function  
<a name="writeOverlayText"></a>

## writeOverlayText(text)
Writes text over the video canvas for face tracking status indications

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>string</code> | Text to be written |

<a name="drawBbox"></a>

## drawBbox(bbox)
Draws a bounding box on the overlay canvas

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| bbox | <code>Array</code> | array formatted like so: [x1,y1,x2,y2] |

<a name="drawPolyline"></a>

## drawPolyline(landmarks, start, end, closed)
Draws a polyline on the overlay canvas. Helper function for drawing face landmarks

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| landmarks | <code>Array</code> | array formatted like so: [x1,y1,x2,y2,x3,x3,...] |
| start | <code>number</code> | start index to draw lines |
| end | <code>number</code> | end index to draw lines |
| closed | <code>boolean</code> | whether or not to connect the start and end points of polyline |

<a name="drawFeatures"></a>

## drawFeatures(features)
Draws face features as connected polylines

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| features | <code>object</code> | object returned by face tracker worker |

<a name="hasFace"></a>

## hasFace(landmarks) ⇒ <code>boolean</code>
Checks if landmarks are valid

**Kind**: global function  
**Returns**: <code>boolean</code> - whether or not the landmarks has a valid face or not  

| Param | Type | Description |
| --- | --- | --- |
| landmarks | <code>Array</code> | array formatted like so: [x1,y1,x2,y2,x3,x3,...] |

<a name="createFaceJSON"></a>

## createFaceJSON(hasFace, landmarks, bbox, pose) ⇒ <code>object</code>
Creates JSON representation of face tracker output to be sent through mqtt

**Kind**: global function  
**Returns**: <code>object</code> - resulting JSON of normalized values to be sent through mqtt  

| Param | Type | Description |
| --- | --- | --- |
| hasFace | <code>boolean</code> | whether or not features are valid |
| landmarks | <code>object</code> | landmarks |
| bbox | <code>object</code> | bbox |
| pose | <code>object</code> | rotation and translation estimation of face |

<a name="stopFaceTracking"></a>

## stopFaceTracking()
Stop running face tracker and stop videos and overlay

**Kind**: global function  
<a name="restart"></a>

## restart()
Start running face tracker again

**Kind**: global function  
<a name="removePass"></a>

## removePass(passName)
Remove a pass from the composer.

**Kind**: global function  

| Param | Description |
| --- | --- |
| passName | name of pass to remove |

<a name="insertPass"></a>

## insertPass(pass, index)
Insert an already-instantiated pass into the composer. If the pass is already present in the
effect system's internal mapping, no action is taken.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| pass | <code>Pass</code> | to insert |
| index | <code>Number</code> | array index to insert at |

<a name="closestKeyInDict"></a>

## closestKeyInDict(k, d, thres) ⇒ <code>\*</code>
Find the closest key in a dictionary to a given key

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| k | <code>Number</code> | index |
| d | <code>Object</code> | dictionary {key: value |
| thres | <code>Number</code> | threshold |

<a name="jitsiStatsLocalCallback"></a>

## jitsiStatsLocalCallback(e)
Called when Jitsi local stats are updated, used to save local status for stats-monitor.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>Object</code> | event object; e.detail contains the callback arguments |

<a name="copyArray"></a>

## copyArray()
Copy contents of one array to another without allocating new array.

**Kind**: global function  
<a name="addListeners"></a>

## addListeners()
Initialize listeners

**Kind**: global function  
<a name="getDevices"></a>

## getDevices() ⇒ <code>Promise.&lt;Array.&lt;MediaDeviceInfo&gt;&gt;</code>
Alias

**Kind**: global function  
<a name="gotDevices"></a>

## gotDevices(deviceInfos)
Populates select dropdowns with detected devices

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| deviceInfos | <code>Array.&lt;MediaDeviceInfo&gt;</code> | List of enumerated devices |

<a name="gotStream"></a>

## gotStream(stream)
Attempts to updates a/v dropdowns with devices from a stream.
Also initializes sound processing to display microphone volume meter

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>MediaStream</code> | Stream created by gUM |

<a name="handleMediaError"></a>

## handleMediaError(error, silent) ⇒ <code>Promise.&lt;void&gt;</code>
Error handler, typically when gUM fails from nonexistent audio and/or
video input device

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> |  |
| silent | <code>Boolean</code> | Do not pop up error dialog |

<a name="micDrawLoop"></a>

## micDrawLoop()
Animation loop to draw detected microphone audio level

**Kind**: global function  
<a name="upsertLiveUser"></a>

## upsertLiveUser(id, user, merge, skipUserlist) ⇒ <code>boolean</code>
Upserts a user in the liveUsers dictionary. Updates timestamp tag either way

**Kind**: global function  
**Returns**: <code>boolean</code> - - True if user is a new addition  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | User ID, typically idTag |
| user | <code>object</code> | User object |
| merge | <code>boolean</code> | If true, merge user object with existing user |
| skipUserlist | <code>boolean</code> | If true, do not update user list |

<a name="onJitsiConnect"></a>

## onJitsiConnect(e)
Called when we connect to a jitsi conference (including reconnects)

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>Object</code> | event object; e.detail contains the callback arguments |

<a name="onUserJitsiJoin"></a>

## onUserJitsiJoin(e)
Called when user joins

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>Object</code> | event object; e.detail contains the callback arguments |

<a name="onScreenshare"></a>

## onScreenshare(e)
Called when a user screenshares

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>Object</code> | event object; e.detail contains the callback arguments |

<a name="onUserJitsiLeft"></a>

## onUserJitsiLeft(e)
Called when user leaves

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>Object</code> | event object; e.detail contains the callback arguments |

<a name="onDominantSpeakerChanged"></a>

## onDominantSpeakerChanged(e)
Called when dominant speaker changes.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>Object</code> | event object; e.detail contains the callback arguments |

<a name="onTalkWhileMuted"></a>

## onTalkWhileMuted()
Called when user is talking on mute.

**Kind**: global function  
<a name="onNoisyMic"></a>

## onNoisyMic()
Called when user's microphone is very noisy.

**Kind**: global function  
<a name="onJitsiStatsLocal"></a>

## onJitsiStatsLocal(e)
Called when Jitsi local stats are updated.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>Object</code> | event object; e.detail contains the callback arguments |

<a name="onJitsiStatsRemote"></a>

## onJitsiStatsRemote(e)
Called when Jitsi remote stats are updated.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>Object</code> | event object; e.detail contains the callback arguments |

<a name="onJitsiStatus"></a>

## onJitsiStatus(e)
Called when Jitsi remote and local status object is updated.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>Object</code> | event object; e.detail contains the callback arguments |

<a name="getUserList"></a>

## getUserList() ⇒ <code>Array.&lt;Object&gt;</code>
Getter to return the active user list state.

**Kind**: global function  
**Returns**: <code>Array.&lt;Object&gt;</code> - The list of active users.  
<a name="isUserAuthenticated"></a>

## isUserAuthenticated(idTag) ⇒ <code>boolean</code>
Utility to know if the user has been authenticated.

**Kind**: global function  
**Returns**: <code>boolean</code> - True if non-anonymous.  

| Param | Type | Description |
| --- | --- | --- |
| idTag | <code>string</code> | The user idTag. |

<a name="sendMsg"></a>

## sendMsg(msgTxt)
Method to publish outgoing chat messages, gathers destination from UI.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msgTxt | <code>\*</code> | The message text. |

<a name="onPresenceMessageArrived"></a>

## onPresenceMessageArrived(msg, topicToUid)
Handles incoming presence topic messages

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>object</code> | The message object |
| topicToUid | <code>string</code> | The target uuid from the topic, if set |

<a name="onChatMessageArrived"></a>

## onChatMessageArrived(msg, topicToUid)
Handler for incoming subscription chat messages.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Object</code> | The message object. |
| topicToUid | <code>string</code> | The target uuid from the topic |

<a name="txtAddMsg"></a>

## txtAddMsg(msg, status, who)
Adds a text message to the text message panel.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>string</code> | The message text. |
| status | <code>string</code> | The 'from' display username. |
| who | <code>string</code> | Sender scope: self, other. |

<a name="populateUserList"></a>

## populateUserList(newUser)
Draw the contents of the Chat user list panel given its current state.
Adds a newUser if requested.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| newUser | <code>Object</code> | The new user object to add. |

<a name="addJitsiStats"></a>

## addJitsiStats(uli, stats, status, name)
Apply a jitsi signal icon after the user name in list item 'uli'.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| uli | <code>Element</code> | List item with only name, not buttons yet. |
| stats | <code>Object</code> | The jisti video stats object if any |
| status | <code>Object</code> | The jitsi status object if any |
| name | <code>string</code> | The display name of the user |

<a name="addLandmark"></a>

## addLandmark(lm)
Add a landmark to the landmarks list.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| lm | <code>Object</code> | The landmark object. |

<a name="removeLandmark"></a>

## removeLandmark(lm)
Remove a landmark from the landmarks list.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| lm | <code>Object</code> | The landmark object. |

<a name="addToSelOptions"></a>

## addToSelOptions()
Adds UI elements to select dropdown message destination.

**Kind**: global function  
<a name="presenceMsg"></a>

## presenceMsg(msg, to)
Send a presence message to respective topic, either publicly or privately to a single user

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>object</code> | presence message to merge with default fields |
| to | <code>string</code> | user id to send the message to privately, otherwise public |

<a name="ctrlMsg"></a>

## ctrlMsg(to, text)
Send a chat system control message for other users. Uses chat system topic structure
to send a private message.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| to | <code>string</code> | Destination: all, scene, or the user id |
| text | <code>string</code> | Body of the message/command. |

<a name="userCleanup"></a>

## userCleanup()
Removes orphaned Jitsi users from visible user list.
Is called periodically = keepalive_interval_ms * 3.

**Kind**: global function  
<a name="displayAlert"></a>

## displayAlert(msg, timeMs, type, closeOthers)
Uses Notiflix library to popup a toast message.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>string</code> | Text of the message. |
| timeMs | <code>number</code> | Duration of message in milliseconds. |
| type | <code>string</code> | Style of message: success, error, warning, info, question |
| closeOthers | <code>boolean</code> | Close other messages before displaying this one. |

<a name="moveToFrontOfCamera"></a>

## moveToFrontOfCamera(userId)
Teleport method to move this user's camera to the front of another user's camera.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>string</code> | Camera object id of the target user |

<a name="drawErrorBlock"></a>

## drawErrorBlock(errors)
Render the display of errors in #error-block for troubleshooting.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| errors | <code>Array.&lt;Object&gt;</code> | Array of error Objects under errorCode key. |

<a name="addError"></a>

## addError(errorCode)
Add an error to health monitor and show the icon.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| errorCode | <code>string</code> | The error string matching errorCode in config |

<a name="removeError"></a>

## removeError(errorCode)
Remove an error to health monitor and hide the icon when errors = 0.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| errorCode | <code>string</code> | The error string matching errorCode in config |

<a name="getErrorDetails"></a>

## getErrorDetails(errorCode) ⇒ <code>object</code>
Lookup details of error code if any from config.

**Kind**: global function  
**Returns**: <code>object</code> - Details object for found/default error  

| Param | Type | Description |
| --- | --- | --- |
| errorCode | <code>string</code> | The error string matching errorCode in config |

<a name="createIconButton"></a>

## createIconButton(initialImage, tooltip, onClick) ⇒ <code>Object</code>
Creates a button that will be displayed as an icon on the left of the screen

**Kind**: global function  
**Returns**: <code>Object</code> - div that is the parent of the button  

| Param | Type | Description |
| --- | --- | --- |
| initialImage | <code>string</code> | name of initial image to be displayed |
| tooltip | <code>string</code> | tip to be displayed on hover |
| onClick | <code>function</code> | function that will be run on click |

<a name="fullScreenExitHandler"></a>

## fullScreenExitHandler()
Handle exit from full screen scenarios

**Kind**: global function  

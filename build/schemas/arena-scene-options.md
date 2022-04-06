---
title: Scene Options
nav_order: 16
layout: default
parent: ARENA Options
---

# Scene Config

## Properties

- **`object_id`** *(string)*: A uuid or otherwise unique identifier for this object. Default: `scene-options`.
- **`persist`** *(boolean)*: Persist this object in the database. Default: `true`.
- **`type`** *(string)*: Must be one of: `['scene-options']`.
- **`action`** *(string)*: One of 3 basic Create/Update/Delete actions. Must be one of: `['create', 'delete', 'update']`. Default: `create`.
- **`data`**
  - **`env-presets`**: A-Frame Environment presets. Refer to *#/definitions/environment-presets*.
  - **`renderer-settings`**: These settings are fed into three.js WebGLRenderer properties. Refer to *#/definitions/renderer-settings*.
  - **`scene-options`**: ARENA Scene Options. Refer to *#/definitions/scene-options*.
## Definitions

- **`environment-presets`** *(object)*
  - **`active`** *(boolean)*: Show/hides the environment presets component. Use this instead of using the visible attribute. Default: `True`.
  - **`dressing`** *(string)*: Dressing is the term we use here for the set of additional objects that are put on the ground for decoration. Must be one of: `['apparatus', 'arches', 'cubes', 'cylinders', 'hexagons', 'mushrooms', 'none', 'pyramids', 'stones', 'torii', 'towers', 'trees']`. Default: `none`.
  - **`dressingAmount`** *(number)*: Number of objects used for dressing. Default: `10`.
  - **`dressingColor`** *(string)*: Base color of dressing objects. Default: `#795449`.
  - **`dressingOnPlayArea`** *(number)*: Amount of dressing on play area. Default: `0`.
  - **`dressingScale`** *(number)*: Height (in meters) of dressing objects. Default: `5`.
  - **`dressingUniformScale`** *(boolean)*: If false, a different value is used for each coordinate x, y, z in the random variance of size. Default: `True`.
  - **`dressingVariance`**: Maximum x,y,z meters to randomize the size and rotation of each dressing object. Use 0 0 0 for no variation in size nor rotation. Refer to *#/definitions/Vector3*. Default: `{'x': 1, 'y': 1, 'z': 1}`.
  - **`flatShading`** *(boolean)*: Whether to show everything smoothed (false) or polygonal (true). Default: `False`.
  - **`fog`** *(number)*: Amount of fog (0 = none, 1 = full fog). The color is estimated automatically. Default: `0`.
  - **`grid`** *(string)*: 1x1 and 2x2 are rectangular grids of 1 and 2 meters side, respectively. Must be one of: `['1x1', '2x2', 'crosses', 'dots', 'none', 'xlines', 'ylines']`. Default: `none`.
  - **`gridColor`** *(string)*: Color of the grid. Default: `#ccc`.
  - **`ground`** *(string)*: Orography style. Must be one of: `['canyon', 'flat', 'hills', 'noise', 'none', 'spikes']`. Default: `hills`.
  - **`groundColor`** *(string)*: Main color of the ground. Default: `#553e35`.
  - **`groundColor2`** *(string)*: Secondary color of the ground. Used for textures, ignored if groundTexture is none. Default: `#694439`.
  - **`groundScale`**: Ground dimensions (in meters). Refer to *#/definitions/Vector3*. Default: `{'x': 1, 'y': 1, 'z': 1}`.
  - **`groundTexture`** *(string)*: Texture applied to the ground. Must be one of: `['checkerboard', 'none', 'squares', 'walkernoise']`. Default: `none`.
  - **`groundYScale`** *(number)*: Maximum height (in meters) of ground's features (hills, mountains, peaks..). Default: `3`.
  - **`hideInAR`** *(boolean)*: If true, hide the environment when entering AR. Default: `True`.
  - **`horizonColor`** *(string)*: Default: `#ffa500`.
  - **`lighting`** *(string)*: A hemisphere light and a key light (directional or point) are added to the scene automatically when using the component. Use none if you don't want this automatic lighting set being added. The color and intensity are estimated automatically. Must be one of: `['distant', 'none', 'point']`. Default: `distant`.
  - **`lightPosition`**: Position of the main light. If skyType is atmospheric, only the orientation matters (is a directional light) and it can turn the scene into night when lowered towards the horizon. Refer to *#/definitions/Vector3*. Default: `{'x': 0, 'y': 1, 'z': -0.2}`.
  - **`playArea`** *(number)*: Radius of the area in the center reserved for the player and the gameplay. The ground is flat in there and no objects are placed inside. Default: `1`.
  - **`preset`** *(string)*: An A-frame preset environment. Must be one of: `['arches', 'checkerboard', 'contact', 'default', 'dream', 'egypt', 'forest', 'goaland', 'goldmine', 'japan', 'none', 'osiris', 'poison', 'starry', 'threetowers', 'tron', 'volcano', 'yavapai']`. Default: `default`.
  - **`seed`** *(number)*: Seed for randomization. If you don't like the layout of the elements, try another value for the seed. Default: `1`.
  - **`shadow`** *(boolean)*: Shadows on/off. Sky light casts shadows on the ground of all those objects with shadow component applied. Default: `False`.
  - **`shadowSize`** *(number)*: Size of the shadow, if applied. Default: `10`.
  - **`skyColor`** *(string)*: Default: `#ffa500`.
  - **`skyType`** *(string)*: A sky type. Must be one of: `['atmosphere', 'color', 'gradient', 'none']`. Default: `color`.
- **`renderer-settings`** *(object)*
  - **`gammaFactor`** *(number)*: Gamma factor (three.js default is 2.0; we use 2.2 as default). Default: `2.2`.
  - **`localClippingEnabled`** *(boolean)*: Defines whether the renderer respects object-level clipping planes. Default: `False`.
  - **`outputEncoding`** *(string)*: Defines the output encoding of the renderer (three.js default is LinearEncoding; we use sRGBEncoding as default). Must be one of: `['BasicDepthPacking', 'GammaEncoding', 'LinearEncoding', 'LogLuvEncoding', 'RGBADepthPacking', 'RGBDEncoding', 'RGBEEncoding', 'RGBM16Encoding', 'RGBM7Encoding', 'sRGBEncoding']`. Default: `sRGBEncoding`.
  - **`physicallyCorrectLights`** *(boolean)*: Whether to use physically correct lighting mode. Default: `False`.
  - **`sortObjects`** *(boolean)*: Defines whether the renderer should sort objects. Default: `True`.
- **`scene-options`** *(object)*
  - **`clickableOnlyEvents`** *(boolean)*: true = publish only mouse events for objects with click-listeners; false = all objects publish mouse events. Default: `True`.
  - **`distanceModel`** *(string)*: Algorithm to use to reduce the volume of the audio source as it moves away from the listener. Must be one of: `['exponential', 'inverse', 'linear']`. Default: `inverse`.
  - **`sceneHeadModels`** *(array)*: Define the default head model(s) for the scene in a list. Users may still choose from the ARENA default list of head models as well. Default: ``.
    - **Items** *(object)*
      - **`name`** *(string)*: A head model name for the selection GUI.
      - **`url`** *(string)*: The head model GLTF URL. You must scale and rotate your source GLTFs appropriately.
  - **`jitsiHost`** *(string)*: Jitsi host used for this scene. Default: `jitsi0.andrew.cmu.edu:8443`.
  - **`maxAVDist`** *(number)*: Maximum distance between cameras/users until audio and video are cut off. For saving bandwidth on scenes with large amounts of user activity at once. Default: `20`.
  - **`navMesh`** *(string)*: Navigation Mesh URL. Default: ``.
  - **`networkedLocationSolver`** *(boolean)*: ARMarker location solver parameter. By default (networkedLocationSolver=false) clients solve camera location locally when a static marker is detected. When true, publishes marker detections (to realm/g/a/camera-name) and defers all tag solving of client camera to a solver sitting on pubsub. Default: `False`.
  - **`privateScene`** *(boolean)*: false = scene will be visible; true = scene will not show in listings. Default: `False`.
  - **`refDistance`** *(number)*: Distance at which the volume reduction starts taking effect. Default: `1`.
  - **`rolloffFactor`** *(number)*: How quickly the volume is reduced as the source moves away from the listener. Default: `1`.
  - **`screenshare`** *(string)*: Name of the 3D object used when sharing desktop. Default: `screenshare`.
  - **`disableVideoCulling`** *(boolean)*: If true will disable video frustum culling (video frustum culling stops video from users outside of view). Default: `False`.
  - **`volume`** *(number)*: Volume for users in a scene. Default: `1`.
- **`Vector3`** *(object)*
  - **`x`** *(number)*
  - **`y`** *(number)*
  - **`z`** *(number)*

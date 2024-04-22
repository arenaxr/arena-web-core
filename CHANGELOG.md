# Changelog

## [1.26.5](https://github.com/arenaxr/arena-web-core/compare/v1.26.4...v1.26.5) (2024-04-22)


### Bug Fixes

* controllers dont have scale property, so dont set it ([0261a48](https://github.com/arenaxr/arena-web-core/commit/0261a487651b3994791ea0635782c12bd33403f4))
* still allow scale for create/updates for hands ([070d97d](https://github.com/arenaxr/arena-web-core/commit/070d97d318d0b3b9d87376f39a648735f695dc73))
* transceiver codec selection bug fix ([4087cad](https://github.com/arenaxr/arena-web-core/commit/4087cad08f27dfd955639a5e09e6b780f8188adb))
* typos for presenceSelect, breaks portal mode ([b78a0fb](https://github.com/arenaxr/arena-web-core/commit/b78a0fb73fd07348c4fbbc6f222cc617865515ec))

## [1.26.4](https://github.com/arenaxr/arena-web-core/compare/v1.26.3...v1.26.4) (2024-04-17)


### Features
* Add `demoMode` URL param for minimizing UI elements (minimize chat/AV icons, hide GLTF progress popup)
* Add `reprojectMovement` URL param for translational time warping for renderfusion client


### Bug Fixes

* actually rename var ([1a80fd5](https://github.com/arenaxr/arena-web-core/commit/1a80fd551c771e5d3bcddc1f94a0f6d70cd4f09f))
* add latest tag ([879f8d8](https://github.com/arenaxr/arena-web-core/commit/879f8d88bce421ebc3174e687a907f72820ccc6d))
* add latest tag ([27c0af0](https://github.com/arenaxr/arena-web-core/commit/27c0af01aede0312b88487438412ad755ece091b))
* deal with undefined tag ([d7cd295](https://github.com/arenaxr/arena-web-core/commit/d7cd2951ce685f2d1eb13b6fc83fab3b0227d66c))
* deal with undefined tag ([ab1d881](https://github.com/arenaxr/arena-web-core/commit/ab1d8813fad0aca84230f6de73fd9998491e22a9))
* **material-extras:** update schemas for colorSpace ([5061e7e](https://github.com/arenaxr/arena-web-core/commit/5061e7e708ec53c1cb99b926f84d5ab1db39f993))
* **schema:** add registered shader options to material ([4ebbad1](https://github.com/arenaxr/arena-web-core/commit/4ebbad18a26d4c13fd6edd3bbb9c65d895426c56))
* **schema:** added missing material properties per shader ([c4184a1](https://github.com/arenaxr/arena-web-core/commit/c4184a1fb8e299c24305ef4282ca89439358e2ef))
* **screenshare:** allow user-defined screen objects alongside default ([dbcf91b](https://github.com/arenaxr/arena-web-core/commit/dbcf91bf19815f5799461b379c332c7df8f104f4))
* **screenshare:** don't duplicate default screensahre ([4ee153a](https://github.com/arenaxr/arena-web-core/commit/4ee153a5fd6b8e9efe65ac6b0a819402066350ed))
* **screenshare:** fix screenshare to named screenshares ([3da8636](https://github.com/arenaxr/arena-web-core/commit/3da86361d56f576ef43888241ec68d458105d2f9))

## [1.26.3](https://github.com/arenaxr/arena-web-core/compare/v1.26.2...v1.26.3) (2024-02-28)


### Bug Fixes

* bad raytrace xrselect after reloc in xr ([730657e](https://github.com/arenaxr/arena-web-core/commit/730657ef66c5e65068dfa9786b4af839ad30d844))
* **jitsi:** allow all users access to kick out moderation ([6eba98d](https://github.com/arenaxr/arena-web-core/commit/6eba98d8e1c8999ee09c5e55e1a7e3bdec9b4f57))
* **jitsi:** allow anonymous users ability to moderate loud users with mute ([a0428af](https://github.com/arenaxr/arena-web-core/commit/a0428afb1507cc7fd4f843eed0e62cea5dbd0519))
* **jitsi:** allow moderators, not owners, access to mute all ([3cc4da5](https://github.com/arenaxr/arena-web-core/commit/3cc4da510340ddf59c43c9447f422a19683685b7))
* **jitsi:** fixed sending kick command to xmpp ([8d37c2e](https://github.com/arenaxr/arena-web-core/commit/8d37c2e9f69d052a426ab4bbe1d025b09436c2c0))
* **jitsi:** log all error data on connection fail ([b775abb](https://github.com/arenaxr/arena-web-core/commit/b775abbe6847aa6f8eca38c68d049a2d5b60445f))
* **program:** remove warning for program message updates ([2494ac4](https://github.com/arenaxr/arena-web-core/commit/2494ac4d3c2fb808e91cd5bb140caa277ae7f241))
* typo for button panel options enum ([20b4fd2](https://github.com/arenaxr/arena-web-core/commit/20b4fd2fe76f760c69a5ff64c5eb5e41af84592d))
* update cursor/raycasters for both ar and vr ([b761673](https://github.com/arenaxr/arena-web-core/commit/b7616730ea9b9d70b968c8e03c52181a47e2670a))
* update videosphere default radius to match a-frame ([b63c5aa](https://github.com/arenaxr/arena-web-core/commit/b63c5aa2d3a06ae5c27dc8356e3e58c006864c53))

## [1.26.2](https://github.com/arenaxr/arena-web-core/compare/v1.26.1...v1.26.2) (2024-02-16)


### Bug Fixes

* **screenshare:** fixed screenshare failure validating token ([60d712e](https://github.com/arenaxr/arena-web-core/commit/60d712e8fc39ac2fc359ae7549b0c982faa7cb73))

## [1.26.1](https://github.com/arenaxr/arena-web-core/compare/v1.26.0...v1.26.1) (2024-02-13)


### Bug Fixes

* camera overrides and lookats w/ look-controls ([6deef09](https://github.com/arenaxr/arena-web-core/commit/6deef091ec22477e74b21ccf0368210a11716607))
* (hotfix) use safe getter for scene stats component ([6342083](https://github.com/arenaxr/arena-web-core/commit/63420836323ba811fb54e3dd22f2f134d5d3407f))

## [1.26.0](https://github.com/arenaxr/arena-web-core/compare/v1.25.0...v1.26.0) (2024-02-08)


### Features

* Update to prerelease AFRAME#71f1a2b for hand tracking and iOS > 12 fixes
* add runtime info to program schema ([d003a55](https://github.com/arenaxr/arena-web-core/commit/d003a550201ee776225d879dec70153b7f415a47))
* adding more program info properties ([0c3030b](https://github.com/arenaxr/arena-web-core/commit/0c3030b0591f127f6cd86b57b23f15393e0ed21b))
* attempt offscreencanvas for ccar/ccwebar cv ([b1c4d04](https://github.com/arenaxr/arena-web-core/commit/b1c4d0495a403c082a241a7bb94f0b245163c82d)), closes [#611](https://github.com/arenaxr/arena-web-core/issues/611)


### Bug Fixes

* **build:** refactor schema and target grid layout to save whitespace on build page ([#606](https://github.com/arenaxr/arena-web-core/issues/606)) ([84ef265](https://github.com/arenaxr/arena-web-core/commit/84ef26508c999d6f251eef609ece2b27c4b45b5a))
* check for xrSession to setOriginAnchor ([d4641e7](https://github.com/arenaxr/arena-web-core/commit/d4641e7aaf3225f903f178c5f71d433abf76668f))
* only stopVideo on jitsi start if withVideo ([b9376d8](https://github.com/arenaxr/arena-web-core/commit/b9376d8c85c6ca3d1d453cd9f5cddff610c3581a))
* **particle-system:** remove particle-system, favoring spe-particles in schema ([b8899e3](https://github.com/arenaxr/arena-web-core/commit/b8899e364a5896c25b556c9eeea51616809e2040))
* references to vio pose vars ([2f57b54](https://github.com/arenaxr/arena-web-core/commit/2f57b54bae68ef4a45c78654d309f377a747362e))
* release test gUM vid stream ([f4f5bb3](https://github.com/arenaxr/arena-web-core/commit/f4f5bb38a1caf31cde73c86ee7d59739ba809b34))

## [1.25.0](https://github.com/arenaxr/arena-web-core/compare/v1.24.1...v1.25.0) (2023-12-14)


### Features

* add (renamed) XR env-publisher ([8e703ee](https://github.com/arenaxr/arena-web-core/commit/8e703ee2a1b0ec6723016a9f97fdc3039dec2fdd))
* add raw flag for mqtt publish ([82fe4f1](https://github.com/arenaxr/arena-web-core/commit/82fe4f1fdee93dfd0f0f529084fbb5221e97a31a))
* add xr system `debug-ui` ([2ced380](https://github.com/arenaxr/arena-web-core/commit/2ced3801ce5d753895cae82244e7cc8afc6539d2))


### Bug Fixes

* **build3d:** improve logging window, small bug fixes, failed attempts at auto-play ([#600](https://github.com/arenaxr/arena-web-core/issues/600)) ([342a833](https://github.com/arenaxr/arena-web-core/commit/342a833338dd33b8d931caecf40ef26424d790c2))
* **build:** add missing gltf-morph to schema ([52b9220](https://github.com/arenaxr/arena-web-core/commit/52b92201475fa522ffce1fafca7acd9387c3ee24))
* **build:** add range validation for opacity ([c31b744](https://github.com/arenaxr/arena-web-core/commit/c31b744da5a77bb95e675036f93c8386f651995f))
* **build:** add roation/scale range validation ([e4ab61c](https://github.com/arenaxr/arena-web-core/commit/e4ab61c70ad5197178533fe0ee47dfd62d6a89ef))
* **build:** add schema for detailed physics dynamic/static bodies ([00c2849](https://github.com/arenaxr/arena-web-core/commit/00c284936ed95d7a9b1e241ee724cab7c732e7c9))
* dont send vrmode=true to remote server when in fullscreen mode ([fb20678](https://github.com/arenaxr/arena-web-core/commit/fb206784dfe3187254039b2a0270f1b845fd4194))
* handle persistent anchor setting failure ([7f3cad4](https://github.com/arenaxr/arena-web-core/commit/7f3cad4c210e35dca0543daf681f7f5432b00d0c))
* **physics:** wait to load aframe-physics before making groundPlane static ([7c67816](https://github.com/arenaxr/arena-web-core/commit/7c678161c7fa614e366a3c92ec2b05f85ee55027))
* precompute proj and pose matrix inverse for atw to improve performance ([ecf17a9](https://github.com/arenaxr/arena-web-core/commit/ecf17a997b2be4328e075df690ae88b589df90bc))
* xr-env-publisher init listener ([d900add](https://github.com/arenaxr/arena-web-core/commit/d900add10278755ad260b21185a0d9f70cbb7fd4))

## [1.24.1](https://github.com/arenaxr/arena-web-core/compare/v1.24.0...v1.24.1) (2023-11-17)


### Bug Fixes

* update AFRAME w/ pre-rls that fixes ar-hit-test anchor tracking ([9915844](https://github.com/arenaxr/arena-web-core/commit/991584445085e40decad197d4c2d57cfaf61e387))
* another typo in material-extras, video cubes transparency restored ([8068a9a](https://github.com/arenaxr/arena-web-core/commit/8068a9ac3bfd3bcc6a41505225384721c316ee36))

## [1.24.0](https://github.com/arenaxr/arena-web-core/compare/v1.23.4...v1.24.0) (2023-11-16)


### Features

* Update AFRAME v1.5.0
* add gaussian splatting component ([0368dfd](https://github.com/arenaxr/arena-web-core/commit/0368dfd0dbc932bc35875375ab84f7e3318a83a5))
* Add material-extras gltfOpacity option ([a8eeddf](https://github.com/arenaxr/arena-web-core/commit/a8eeddf3acf60e5e3f7711fbb22fa1be1a1bf084))


### Bug Fixes

* (build3d): change component name *build-watch* =&gt; *build3d-mqtt* ([ed5e9c3](https://github.com/arenaxr/arena-web-core/commit/ed5e9c32b7fd3e9afd1415339925151b668d7bae))
* align schema key for gaussian_splatting ([0a8615a](https://github.com/arenaxr/arena-web-core/commit/0a8615a4879ff770b89921ec96d638f6a7216b96))
* better atw and atw bug fix for vr devices ([9dbd42a](https://github.com/arenaxr/arena-web-core/commit/9dbd42a9c8bac649dcb9424e6a35c7cac45a26cc))
* **build3d:** check permissions on build3d request, show error otherwise ([d749053](https://github.com/arenaxr/arena-web-core/commit/d7490537d1e3e3396a8045e60934c51a2abf5cf8))
* **build:** add gaussian_splatting upload to filestore ([9e9269d](https://github.com/arenaxr/arena-web-core/commit/9e9269de2c4cb71c3db5ae1b7a5cf59b65b29af0))
* **build:** streamlined FileStore upload flow ([#597](https://github.com/arenaxr/arena-web-core/issues/597)) ([4470c68](https://github.com/arenaxr/arena-web-core/commit/4470c68e2873a1c19124b40f6b5a97233a1db68c))
* splatting object type ([e85d619](https://github.com/arenaxr/arena-web-core/commit/e85d6196f497761b6a98b97bddc7c35cecc068f1))
* typo ([4e1a1f3](https://github.com/arenaxr/arena-web-core/commit/4e1a1f3dd33b28c1737275d5dcef3413fa56907a))

## [1.23.3](https://github.com/arenaxr/arena-web-core/compare/v1.23.2...v1.23.3) (2023-11-02)

### Refactor

* **BREAKING CHANGE**: All `arena-user` attributes (descriptors of users in the scene) now are published under the
                       `arena-user` key within the `data` block, rather than the top-level or directly under `data`
                       of the of the MQTT message.
* **BREAKING CHANGE**: Only `position` and `rotation` attributes are processed
                       within `data` besides `arena-user` for `object_type:"camera"`. L/R hand objects also are
                       filtered to only process `position`, `rotation`, `scale` attributes alongside `url`.

### Bug Fixes

* **arena-user:** publish/read all camera data in data block ([73e382e](https://github.com/arenaxr/arena-web-core/commit/73e382ebf1656cdbbd67bda815005c401d22759c))
* arenaui colors to SRGB ([68d818c](https://github.com/arenaxr/arena-web-core/commit/68d818c228c84b9c6b4edd0a7c0866bf34b1f08b))
* **build:** eliminate redundant (and conflicting) defaults in wire schema  ([#592](https://github.com/arenaxr/arena-web-core/issues/592)) ([fff3450](https://github.com/arenaxr/arena-web-core/commit/fff3450aeffebe705758cbadbc5c9267e9d32865))
* localStorage saved head model set on subsequent loads ([fd6372f](https://github.com/arenaxr/arena-web-core/commit/fd6372fa1898f8829dfd41fd962c290764bdbe0e))
* remove hand tracking from webr features ([50a01c9](https://github.com/arenaxr/arena-web-core/commit/50a01c976f7996c4beae6306f7183be114d8ba01))
* return bool true from arena-camera/hands create-update ([9d6d749](https://github.com/arenaxr/arena-web-core/commit/9d6d749ccaedd05a0017a463c8d7ea18d4dd95e3))
* update lingering arena-camera.position from 41caa23 ([8e94b14](https://github.com/arenaxr/arena-web-core/commit/8e94b1479abfc270a05f9c417f88d4c11f7eda6c))

## [1.23.2](https://github.com/arenaxr/arena-web-core/compare/v1.23.1...v1.23.2) (2023-10-16)


### Bug Fixes

* **build:** fix euler degree rotation editor updates ([a279ab3](https://github.com/arenaxr/arena-web-core/commit/a279ab3cb61a811547d50408f76c2f72c5173f3c))
* dark card img bg color ([3c63169](https://github.com/arenaxr/arena-web-core/commit/3c6316938304e72e660c3a8fec7902be41a45793))
* **jitsi:** allow degradation of multi-videospheres by user position ([#588](https://github.com/arenaxr/arena-web-core/issues/588)) ([19233ed](https://github.com/arenaxr/arena-web-core/commit/19233ed834bc803a146d9819a1b936fcd800d8c7))
* **jitsi:** allow videosphere resolution based on sphere not avatar ([76402cb](https://github.com/arenaxr/arena-web-core/commit/76402cbf7cd484f862a92019630918b5f597aa19))
* **schema:** small fixes to default arenaui object types ([5e8b033](https://github.com/arenaxr/arena-web-core/commit/5e8b033ead0f1b18f84a58fc1e958f7a273c5e99))

## [1.23.1](https://github.com/arenaxr/arena-web-core/compare/v1.23.0...v1.23.1) (2023-10-02)


### Bug Fixes

* **auth:** fixed anonymous build page scenes redirect after login ([0f92857](https://github.com/arenaxr/arena-web-core/commit/0f92857f4e34a6e9ae51948d2911d56c98b9adf3))
* **console:** also bind console.assert to not throw exceptions in spe-particles ([b4c7c5b](https://github.com/arenaxr/arena-web-core/commit/b4c7c5b802eac5fc14633873dd52a9321ed9ac6f))
* **schema:** update integer types to match components ([091c918](https://github.com/arenaxr/arena-web-core/commit/091c9183a0a02197c10d1538681fc919ae559777))

## [1.23.0](https://github.com/arenaxr/arena-web-core/compare/v1.22.0...v1.23.0) (2023-09-10)


### Features

* add blip in/out vfx ([397ac8c](https://github.com/arenaxr/arena-web-core/commit/397ac8c4d7996ce601920dc791f4141dac488403))


### Bug Fixes

* add backup timeout for el del on blipout ([6456414](https://github.com/arenaxr/arena-web-core/commit/6456414d5217672101743961f974f3332df535fe))
* **build:** add image geometry properties to schema ([81474ba](https://github.com/arenaxr/arena-web-core/commit/81474ba8c62d996306784366dede169c93d94ad7))
* **build:** fixed errors in particle-system schema ([6351d87](https://github.com/arenaxr/arena-web-core/commit/6351d87765568581ffc404807de487f1caaa0643))
* **build:** place image properties at proper level ([8d29291](https://github.com/arenaxr/arena-web-core/commit/8d29291cc99d3e632b2e395f4d4c217fb9896020))
* **build:** preserve mesh aspect ratio in image file upload ([e57e53c](https://github.com/arenaxr/arena-web-core/commit/e57e53ce8e949b786d869ae0398d88fbd782c7e6))
* defer until object fully loaded ([b189691](https://github.com/arenaxr/arena-web-core/commit/b189691d8f645673c09f8946896c362df945e180))
* **image:** allow users to set image plane geometry attributes ([dadb766](https://github.com/arenaxr/arena-web-core/commit/dadb766b1e2459c6f1aec3ad8a357b2082d2c23a))
* remove init camera pos/rot set in arena-users ([985f998](https://github.com/arenaxr/arena-web-core/commit/985f998edabe707a341f9a229ebc80989e2646d9))
* **scenes:** allow anon users access to public scenes list ([322b673](https://github.com/arenaxr/arena-web-core/commit/322b6737cbc88e2d665f3a38b236d68938ceb370))
* set ANIME tick to aframe tick to enable in XR ([e1a0556](https://github.com/arenaxr/arena-web-core/commit/e1a055668a3426ff947b28db3f7de3184dee10d4))

## [1.22.0](https://github.com/arenaxr/arena-web-core/compare/v1.21.2...v1.22.0) (2023-09-04)


### Features

* Add build page model/image filestore upload buttons ([#577](https://github.com/arenaxr/arena-web-core/issues/577)) ([abb0f11](https://github.com/arenaxr/arena-web-core/commit/abb0f1122b53fb7af663abcc38da2568501f483f))
* add url param to disable atw for remote rendering ([0a852aa](https://github.com/arenaxr/arena-web-core/commit/0a852aabc35f5dc77957b749233f76621cee7e98))
* **build:** add model upload hide-in-ar for digital twin option ([3377cf1](https://github.com/arenaxr/arena-web-core/commit/3377cf1c62b6b57e6788066b3b92064d7d122008))


### Bug Fixes

* **build:** fixed auth await for updated fs token ([f4c69d9](https://github.com/arenaxr/arena-web-core/commit/f4c69d925cf29ef1dde8c87d202e5f1b4ea7179c))
* **build:** make consistant uplaod file path ([1d0411e](https://github.com/arenaxr/arena-web-core/commit/1d0411e579871c2451926239c20eb010a7c1bf78))
* **fs:** fixed filestore path link to use de-scoped resource path ([b5afcce](https://github.com/arenaxr/arena-web-core/commit/b5afccee1cbfa8e0ecd6aeb667e62797621a82b2))
* working window listener for XRBrowser touch ([fef91cf](https://github.com/arenaxr/arena-web-core/commit/fef91cfe1c8ac61a56bf350e832f36a6dc7b8b12))

## [1.21.2](https://github.com/arenaxr/arena-web-core/compare/v1.21.1...v1.21.2) (2023-08-28)


### Bug Fixes

* race condition b/w programs vs runtime-mngr ([ff76797](https://github.com/arenaxr/arena-web-core/commit/ff76797244e00e328d7e35fd1c76e79df7101de1))

## [1.21.1](https://github.com/arenaxr/arena-web-core/compare/v1.21.0...v1.21.1) (2023-08-25)


### Bug Fixes

* bind publish to ARENA.Mqtt ([5f73683](https://github.com/arenaxr/arena-web-core/commit/5f73683eb47b064f87e15347c3ca9b95cb8019eb))
* don't init arena-console w/o a pub func ([6866f8a](https://github.com/arenaxr/arena-web-core/commit/6866f8a07402acddb7aa77c6f1f94a94347dc1d9))
* Move arena-console init to MQTT_LOADED ([259c7fc](https://github.com/arenaxr/arena-web-core/commit/259c7fc048dad8a74b669dbc223bd6c9086411fb))

## [1.21.0](https://github.com/arenaxr/arena-web-core/compare/v1.20.8...v1.21.0) (2023-08-10)


### Features

* add initial test arenaui components/systems ([6848fb7](https://github.com/arenaxr/arena-web-core/commit/6848fb74fb0ddb23ba4257ea0deb93a103465d70))


### Bug Fixes

* card image background corner ([2f4a73f](https://github.com/arenaxr/arena-web-core/commit/2f4a73f9df3d33fe9283b2d9aa71c7ad935c053e))
* deprecated ThreeMesh fontColor to color ([0f88f4a](https://github.com/arenaxr/arena-web-core/commit/0f88f4a6b42e2e49ff749c97fa5a8fe87af70066))
* Use touchstart/end for webxr-viewer AR click ([66750ab](https://github.com/arenaxr/arena-web-core/commit/66750ab1cd2adfee699d67ce3e8cdc6bcd3c44e6))

## [1.20.8](https://github.com/arenaxr/arena-web-core/compare/v1.20.7...v1.20.8) (2023-08-09)


### Bug Fixes

* reference to signoutpath ([d76324a](https://github.com/arenaxr/arena-web-core/commit/d76324a65ce5cf8ea238ffd7624ba3f6d340c7ad))

## [1.20.7](https://github.com/arenaxr/arena-web-core/compare/v1.20.6...v1.20.7) (2023-08-09)


### Bug Fixes

* catch and log errors from parsing linked dependent messages ([be2cee1](https://github.com/arenaxr/arena-web-core/commit/be2cee133f4d08dd76e36572d6a48d5d8e062eb8))
* move fs logout to site logout ([95724a9](https://github.com/arenaxr/arena-web-core/commit/95724a9d86ead35e2741c14f6e3502d24e5323c1))
* show passthrough for atw gaps in hybrid rendering for ar devices ([4a69cd9](https://github.com/arenaxr/arena-web-core/commit/4a69cd9432269050ddc81a11e4de86d886a205e0))
* WebXR Browser broken CV pipeline ([976c43f](https://github.com/arenaxr/arena-web-core/commit/976c43f253cdf1aad58a2c10498f1fa9c2849b04))

## [1.20.6](https://github.com/arenaxr/arena-web-core/compare/v1.20.5...v1.20.6) (2023-07-26)


### Bug Fixes

* remote video playback in safari ([6d1a88c](https://github.com/arenaxr/arena-web-core/commit/6d1a88c5cbdb4b38fb93775e7404410c7ab00025))

## [1.20.5](https://github.com/arenaxr/arena-web-core/compare/v1.20.4...v1.20.5) (2023-07-10)


### Bug Fixes

* variable replacement on module create ([aa152c7](https://github.com/arenaxr/arena-web-core/commit/aa152c770e586e0cafaedc14cd6f46c5a5095668))

## [1.20.4](https://github.com/arenaxr/arena-web-core/compare/v1.20.3...v1.20.4) (2023-07-10)


### Bug Fixes

* add runtime manager again after refactor ([74643fb](https://github.com/arenaxr/arena-web-core/commit/74643fb0bec9360a55c354c1ef4dfe39beb8b1b4))
* **auth:** only show profile when authenticated ([0588c59](https://github.com/arenaxr/arena-web-core/commit/0588c5913fcdaba4b55f306f83227eafe784638b))
* **auth:** only show profile when authenticated ([2ed296b](https://github.com/arenaxr/arena-web-core/commit/2ed296b85d9d62153a426a462f06d7a769219003))
* don't req `scene` auth token when unneeded ([6b7d172](https://github.com/arenaxr/arena-web-core/commit/6b7d1726f99fe82f9835f636f8b3f2f8f3ad8479))

## [1.20.3](https://github.com/arenaxr/arena-web-core/compare/v1.20.2...v1.20.3) (2023-07-06)


### Bug Fixes

* bind av-setup detectDevices to system ([c7038f4](https://github.com/arenaxr/arena-web-core/commit/c7038f42c911f3dcd2bd6697ba12bad98ea43b7a))
* do not init local av with armode/vrmode ([f9e8d7e](https://github.com/arenaxr/arena-web-core/commit/f9e8d7e20b47ae7ba6ac48ec23a0e4f2ce6eb8ed))
* remove async load of mdb css due to safari ([81c2904](https://github.com/arenaxr/arena-web-core/commit/81c29049e59b4e55ee0b320302c8588d9f81ff3c))
* WebXRViewer doesn't init ARMarkerSys ([1306e7b](https://github.com/arenaxr/arena-web-core/commit/1306e7b960b1eb85af56bc3419ddfc6d293a140a))

## [1.20.2](https://github.com/arenaxr/arena-web-core/compare/v1.20.1...v1.20.2) (2023-06-29)


### Bug Fixes

* Add missing debug to arena-console ([4534c78](https://github.com/arenaxr/arena-web-core/commit/4534c783befdd8e8fc060ff9bbcd22c5dfdb4d6f))

## [1.20.1](https://github.com/arenaxr/arena-web-core/compare/v1.20.0...v1.20.1) (2023-06-29)


### Bug Fixes

* update Dockerfile set arena_version.js ([3fe6999](https://github.com/arenaxr/arena-web-core/commit/3fe69991c6c3228e54e7c701bfd1f8e1fa08aff8))

## [1.20.0](https://github.com/arenaxr/arena-web-core/compare/v1.19.1...v1.20.0) (2023-06-29)


### Features

* add inscene-opts for postprocess fx ([4cb4ad4](https://github.com/arenaxr/arena-web-core/commit/4cb4ad45864f70a483c37cb8b76aa1a298fd672e))
* consolidate, add show/hide-on-enter-vr/ar ([51ba95a](https://github.com/arenaxr/arena-web-core/commit/51ba95a9a0d54026caa635de12283376b0f72243))


### Bug Fixes

* "arena-side-menu-ui" is a system ([b763831](https://github.com/arenaxr/arena-web-core/commit/b7638315670c6cbf8bcb65f73f0152ff3745f5a1))
* add init'd flag for init-&gt;ready listener pattern ([e9da1a1](https://github.com/arenaxr/arena-web-core/commit/e9da1a1efdb93afee2b8e2f11612154a2ff676dd))
* bad refactor around webxr session for webar ([f4cfaf7](https://github.com/arenaxr/arena-web-core/commit/f4cfaf7607ad15a8ea24b90e16d33b30d71feeb9))
* bad refactor populating build namespaces ([3884657](https://github.com/arenaxr/arena-web-core/commit/3884657339c62adc18283ce0e6ab99292ab41d24))
* bad scoping in anon func for filter ([1d8ee6e](https://github.com/arenaxr/arena-web-core/commit/1d8ee6e01b26a5d83343005f567b9d1ffbc81738))
* better solid angle calc for hybrid rendering ([b64c8e3](https://github.com/arenaxr/arena-web-core/commit/b64c8e31eefb57ad7082539b3fe0ffb37ce67f71))
* **build3d:** special case videosphere type ([#539](https://github.com/arenaxr/arena-web-core/issues/539)) ([a41c153](https://github.com/arenaxr/arena-web-core/commit/a41c1533d89e6d4a8f6b1312effa7b85256224bd))
* change check of pref settings to audioin ([c77a71f](https://github.com/arenaxr/arena-web-core/commit/c77a71ff70ddc8cc5ffd4a11fd670b13fafe8d46))
* chat liveUsers should be obj ([45f4b21](https://github.com/arenaxr/arena-web-core/commit/45f4b21c19432f85576f8c096b6cb505f7d0935e))
* colorspace fix for hybrid rendering ([0a9b944](https://github.com/arenaxr/arena-web-core/commit/0a9b944ed1aae4da3e9017e8ed02948b8595fd8e))
* convert glitch and pixel to SRGB as needed ([6f6d6f4](https://github.com/arenaxr/arena-web-core/commit/6f6d6f463e6961402d39335f239ede7676053909))
* createAnchor frame must be from RAF callback ([41a9d2d](https://github.com/arenaxr/arena-web-core/commit/41a9d2df389d72c77411a4c738700d744f9b4d55))
* del refs to videocube on remove ([3357f8c](https://github.com/arenaxr/arena-web-core/commit/3357f8ce0d1fc17a306c3afd414aed01630ad1e4))
* don't await non async mqttc proxied methods ([3500b9d](https://github.com/arenaxr/arena-web-core/commit/3500b9d3defd63c7aa76f99821ff6f12fbb74971))
* **env:** use lighter preset env 'default' over 'starry' for updated colorspace ([de92053](https://github.com/arenaxr/arena-web-core/commit/de920530f55868969f9c1e792eb549858bd5cc2d))
* face tracking and expose controller events ([e03c50f](https://github.com/arenaxr/arena-web-core/commit/e03c50fd3b866ed1f4b0a1643d698853d6bd83cf))
* force matrixworld update on startpos teleportTo ([5b8a467](https://github.com/arenaxr/arena-web-core/commit/5b8a467e7a03b16c0b3a025c2e336ea77c347eb5))
* **geometry:** remove redundant prism geometry, rather use cylinder ([14bb4ff](https://github.com/arenaxr/arena-web-core/commit/14bb4ff998eade09d84d36d864c4854c78e7fd5f))
* handle broken model load srcs ([610a6c6](https://github.com/arenaxr/arena-web-core/commit/610a6c67adfc5bb95d2ae3b697a8f53dd869b3d4))
* icon load condition ([7e96c1c](https://github.com/arenaxr/arena-web-core/commit/7e96c1c72ffbea2ff92f34109acd26d941b3913f))
* import extension ([b0e5cd5](https://github.com/arenaxr/arena-web-core/commit/b0e5cd5fc6b42e2d433e878408c50776cbeda4d0))
* import extension again ([233e259](https://github.com/arenaxr/arena-web-core/commit/233e25967ffeea8fde369f9e46a8942fdf1294e1))
* **jitsi:** restored dominant speaker signalling ([f28d54f](https://github.com/arenaxr/arena-web-core/commit/f28d54f9bd301bd0362ddc6b7800483a17154e91))
* jittery aabb-collider in dual-view XR ([2d73d44](https://github.com/arenaxr/arena-web-core/commit/2d73d4461cdeb56d459c72006e9739dbc01495b7))
* landmarks ref of chat-ui as system ([2f98bba](https://github.com/arenaxr/arena-web-core/commit/2f98bbae0e7b023da2d63801571d8925ae758340))
* loadscene moved to multilistener ([49cfc1b](https://github.com/arenaxr/arena-web-core/commit/49cfc1bcf0d4204a8e4c5f0732a58e30eb025939))
* manually init mdb form for setupav ([3949aa6](https://github.com/arenaxr/arena-web-core/commit/3949aa6e77703f05d65c16b90bbaeb307acdd1ee))
* move jitsi.health alias in ready ([fb23e0e](https://github.com/arenaxr/arena-web-core/commit/fb23e0e50a8b87fe08c2260d2e066d28d5aecc7a))
* move startpos loaded emit into landmark sys ([0ba381a](https://github.com/arenaxr/arena-web-core/commit/0ba381ac1c9a22f89f2c89dd25bacc6551bd4343))
* null-coalesce userName from defaults ([051313c](https://github.com/arenaxr/arena-web-core/commit/051313cd89d98c8137d1c3584b0df11c832e36bb))
* paho not async, defer MQTT emit to onSuccess ([efa8d16](https://github.com/arenaxr/arena-web-core/commit/efa8d16f9111d963351de848e16be9062fb58ba0))
* properly send controller events ([f6d3794](https://github.com/arenaxr/arena-web-core/commit/f6d3794a716fcb3c896d141310c2a77440e551a4))
* reassign const ([56e6a46](https://github.com/arenaxr/arena-web-core/commit/56e6a461529652a3cd017755815ba8536b5c0b67))
* ref arena-side-menu-ui as system not component ([8ea78ad](https://github.com/arenaxr/arena-web-core/commit/8ea78ad77c749d8cc7f4e1ca9cb4fd5aec21c224))
* refactored references to ARENA.Jitsi (jitsi) ([41ee1fc](https://github.com/arenaxr/arena-web-core/commit/41ee1fc5317201ad183b0b837698035a38b99301))
* reject anon user from build page ([0e55a25](https://github.com/arenaxr/arena-web-core/commit/0e55a252a0993d125d1348ec152db67fc906177a))
* rename jitsi.ready flag to initialized ([5bbb5f2](https://github.com/arenaxr/arena-web-core/commit/5bbb5f2cf30f06720b2057f7b2407786a578405b))
* renamed variable consistency ([d8434f0](https://github.com/arenaxr/arena-web-core/commit/d8434f0e09b58787db6a23d2e95c95913e81d74f))
* required schema for colorspace in build ([cd1ec91](https://github.com/arenaxr/arena-web-core/commit/cd1ec912b732cbc2689f172e0a780536eea2f56b))
* restore a-assets needed for a/v appending ([c981b2d](https://github.com/arenaxr/arena-web-core/commit/c981b2d96e33f538c3b070f20b02139be989508e))
* restore ARENA.defaults until refactored out ([6153baf](https://github.com/arenaxr/arena-web-core/commit/6153bafaef62bc421c5a567f67610355676483c7))
* restore default scene options ([25bd2af](https://github.com/arenaxr/arena-web-core/commit/25bd2afa5adee96707a4b6baeaae9faacea5b2db))
* revert b24f13bb, use _this for jquery compat ([03e666f](https://github.com/arenaxr/arena-web-core/commit/03e666f64a06f1e8729eb95e55671f3f34ffe07f))
* rough formatting on calc function ([00085a4](https://github.com/arenaxr/arena-web-core/commit/00085a427c49fa8ee469a983eb1c39a5426d08a1))
* Set armarkersys listener xr sessionstart ([ef19748](https://github.com/arenaxr/arena-web-core/commit/ef1974806f972213fad65a1c57fac3a0c8589fec))
* set displayname as active on start to push label up ([fce3bae](https://github.com/arenaxr/arena-web-core/commit/fce3bae288a009f8b4c9f4c21ba23217a2e569f3))
* set mouseover/leave for chat as arrow func ([b24f13b](https://github.com/arenaxr/arena-web-core/commit/b24f13bb6526e694bca7366b69cc60d912ad20d9))
* spotar refactor ([99f3d57](https://github.com/arenaxr/arena-web-core/commit/99f3d576dbd428177b72ea512062ab34fa85181b))
* spread copy gltf-model attrs to restore later ([15ac173](https://github.com/arenaxr/arena-web-core/commit/15ac1734fdab379f66312eb277ca18d30e13108d))
* startcoords setting ([5bd4af0](https://github.com/arenaxr/arena-web-core/commit/5bd4af032cee6e5eb5f9175c59a1eb39083cec1e))
* tick arena-users after jitsi conference init ([b696354](https://github.com/arenaxr/arena-web-core/commit/b6963549da33fbccca55accbed4ddf295698b10c))
* toggling on/off flying and depth for hybrid rendering fixed ([0bf7472](https://github.com/arenaxr/arena-web-core/commit/0bf7472f53f001ea9593991f9b3fdce5992b439b))
* typo ([7d2dcc9](https://github.com/arenaxr/arena-web-core/commit/7d2dcc9609e229a6381a02f585ad41e4b138cc88))
* typo ([4c6d415](https://github.com/arenaxr/arena-web-core/commit/4c6d415ed2f34bd50577b025dd3a3516b9f9904b))
* typo double import?? ([45059a0](https://github.com/arenaxr/arena-web-core/commit/45059a06d43b83f2536a9df17b9c3a19c891ca50))
* typos for events ([907f1ba](https://github.com/arenaxr/arena-web-core/commit/907f1bae3e022c96b274a8b3154bb59ff62a669d))
* Various refs (defaults, arenatopic stuff) ([08dea36](https://github.com/arenaxr/arena-web-core/commit/08dea36492669d8652ccbc8c7f898f50d5e5a221))
* wait for scene options to load before objs ([db28074](https://github.com/arenaxr/arena-web-core/commit/db28074b4b398ba61df649348a391af3497e5089))

## [1.19.0](https://github.com/arenaxr/arena-web-core/compare/v1.18.0...v1.19.0) (2023-05-16)


### Features

* **build3d:** add 'build3d' param to publish mqtt over a-frame inspector ([#529](https://github.com/arenaxr/arena-web-core/issues/529)) ([636dbb8](https://github.com/arenaxr/arena-web-core/commit/636dbb89263b57a92f62d99b5e6ee88ef58ada48))
* **build3d:** added logging window; entity add, delete, all attributes, grab updates ([#531](https://github.com/arenaxr/arena-web-core/issues/531)) ([334e678](https://github.com/arenaxr/arena-web-core/commit/334e678b7f9fb912e86d674b894838292e03763e))


### Bug Fixes

* **build/3d:** use canonical tab names to avoid cluttering the tab tray ([a7ab807](https://github.com/arenaxr/arena-web-core/commit/a7ab807b06c5eace3b072a64120e3b20e72f20da))
* **build3d:** publish rotation in build3d as quaternions over the wire ([be27904](https://github.com/arenaxr/arena-web-core/commit/be27904bbcf87cd8e96dcfbd45a22a4a69af7981))
* **chat:** ensure JWT permissions before chat launch ([d779781](https://github.com/arenaxr/arena-web-core/commit/d779781e757a0f7bdda9f5345b2648cc595b455f))
* click-listener target for ar ([17670fd](https://github.com/arenaxr/arena-web-core/commit/17670fd8ce5f9fdf9bf12cc8c0ec444dff537769))
* **hand:** fix magicleap controller scale ([09f10dd](https://github.com/arenaxr/arena-web-core/commit/09f10dd06c8850edf445b7b32657afee0d5d88a6))
* **icons:** updated avatar icons location ([4b915fe](https://github.com/arenaxr/arena-web-core/commit/4b915fe4cee9370df13c467b00182a3a409467f0))
* **material-extras:** add documentation of depthTest ([ae242a6](https://github.com/arenaxr/arena-web-core/commit/ae242a6163fdccb82c2aa61eb95e384f3b5b69cc))
* **material-extras:** remove depthTest, needs testing; apply render order to all objects ([ed83c9c](https://github.com/arenaxr/arena-web-core/commit/ed83c9c05d95e143d6b1582f22261282f905e4be))
* **programs:** change navbar to send programs to new endpoint ([d544bdf](https://github.com/arenaxr/arena-web-core/commit/d544bdf02acee8f235a5aadf296be4a1bd6ab0a2))
* **settings:** only show 3dbuild in settings if scene writer ([6f5b89a](https://github.com/arenaxr/arena-web-core/commit/6f5b89a4a4da4a13b60def018240beec06262b15))
* **silverline:** place /programs dashboard in old /arts container for now ([09ceb1b](https://github.com/arenaxr/arena-web-core/commit/09ceb1bad84e4683f15d30f9410e71a9335de606))
* typo missing closing bracket ([c882a6e](https://github.com/arenaxr/arena-web-core/commit/c882a6e6172681fd725d1d14fc82d39fe4fab58e))
* **vscode:** gitignore vscode settings ([74dccab](https://github.com/arenaxr/arena-web-core/commit/74dccabc45adb310abe823676a0ba88370c238cd))

## [1.18.0](https://github.com/arenaxr/arena-web-core/compare/v1.17.0...v1.18.0) (2023-04-17)


### Features

* **ocean:** add ocean primitive to schema ([#525](https://github.com/arenaxr/arena-web-core/issues/525)) ([ec41bbc](https://github.com/arenaxr/arena-web-core/commit/ec41bbcf6577eb523dae29f5ee5c9522efa52c1c))
* **particle-system:** add environment features for dust, snow, rain ([#523](https://github.com/arenaxr/arena-web-core/issues/523)) ([e2105ae](https://github.com/arenaxr/arena-web-core/commit/e2105ae96c328e3daa3500be375a9adcd316d641))
* **scenes:** add quick enter-in-ar button ([8ba2777](https://github.com/arenaxr/arena-web-core/commit/8ba27776aa47fa28814456fa7c026275ef0c1a77))
* **spe-particles:** added spe-particles system (with arenaxr fork fixing THREE 0.147) ([#524](https://github.com/arenaxr/arena-web-core/issues/524)) ([d22bacc](https://github.com/arenaxr/arena-web-core/commit/d22baccdb46c3a09b3d323c60b670b2e972ee5fe))


### Bug Fixes

* **attribution:** fixed crash from GLTFs missing model data ([34daed0](https://github.com/arenaxr/arena-web-core/commit/34daed0d99f57e02b40204c7d701670f0a60bf51))
* **auth:** add security link in settingd dialog ([51619af](https://github.com/arenaxr/arena-web-core/commit/51619af870c2eeae18c83590ad270a1637b073c6))
* **avatar:** allow mic/network icons alpha channel to render against transparent ([31be8ce](https://github.com/arenaxr/arena-web-core/commit/31be8ceac458166e51de9ba8c6f7ff053ed81f4b))
* **build:** add build desc for a-text, minor fixes ([8f39aea](https://github.com/arenaxr/arena-web-core/commit/8f39aeaab04a3559954236bd6a55de7d16d35c84))
* **build:** add schema modelUpdate, other minor fixes ([3ac11b1](https://github.com/arenaxr/arena-web-core/commit/3ac11b1339b699fa7146ed0bf45dfcca983a0f13))
* **build:** added missing types and a-text descriptions ([ff83816](https://github.com/arenaxr/arena-web-core/commit/ff838162242f0a4cd60f2a1115c36a1a478807c3))
* clean up event listener for got-url ([8833e9f](https://github.com/arenaxr/arena-web-core/commit/8833e9fa8784f8aeb6d3ebe7b45a26e113db0676))
* cleanup listener for video-control ([3850021](https://github.com/arenaxr/arena-web-core/commit/3850021981b74d2b9d18d22b5c3cfa69d9d74fab))
* ensure old gotourl eventlistener is removed ([89820fe](https://github.com/arenaxr/arena-web-core/commit/89820fee1ab23b6b6d912d7f91cd0afd79b9c7c5))
* handle load modelUpdates from persist/create ([6ecbf03](https://github.com/arenaxr/arena-web-core/commit/6ecbf03f13c80bb4cca3b2421973bf850122d999))
* incorrect gotourl data attr from 8833e9f ([e7ddea1](https://github.com/arenaxr/arena-web-core/commit/e7ddea1c5b8d1265612ba85ff0bfc23c984a4192))
* **jitsi:** show moderator status in user list ([34df699](https://github.com/arenaxr/arena-web-core/commit/34df6996b92493cc9ee22d4f464d3be6b1670472))
* **material-extras:** no texture loads on empty source; transverse all objects checking if they are a mesh ([6846082](https://github.com/arenaxr/arena-web-core/commit/68460824c66ccbd360c56e5188ebccb2c0fd3973))
* **material-extras:** set mesh.material.depthTest=false when transparentOccluder=true ([a26697b](https://github.com/arenaxr/arena-web-core/commit/a26697b68fc8dd24f1f27859588cbbe4a14c4293))
* more typos ([4864ceb](https://github.com/arenaxr/arena-web-core/commit/4864ceb4f5dda93d6643ec308678135140b23743))
* **runtime-mngr:** fixed missing runtime LWT on cleanup ([18e9eb5](https://github.com/arenaxr/arena-web-core/commit/18e9eb5995660570a9ac068fcfa3a637707ba57b))
* **schema:** add example to modelUpdate ([3223ef2](https://github.com/arenaxr/arena-web-core/commit/3223ef23beb70fd1d5ae794fbaf20a461fbf8817))
* **schema:** future-proof schema support with 'deprecated' attribute ([fd306f6](https://github.com/arenaxr/arena-web-core/commit/fd306f6de6cc038476f74232831167655c52810e))
* **settings:** add hover titles for links in settings ([7a08249](https://github.com/arenaxr/arena-web-core/commit/7a0824906fa981c34d433a1a8ca4312f27db64cc))
* **spe-particles:** fixed wiggle schema formatting ([53aeae6](https://github.com/arenaxr/arena-web-core/commit/53aeae6448a4eaf5b1a25839c86e1cab5cda7f73))

## [1.17.0](https://github.com/arenaxr/arena-web-core/compare/v1.16.0...v1.17.0) (2023-03-03)


### Features

* Add model-update attr handle for gltf-model ([7a3c37b](https://github.com/arenaxr/arena-web-core/commit/7a3c37ba34d8946e9d33c54bd26acf44c9c9e5d2))
* **build:** Add a GUI-only Rotation Euler degree editor ([36508d4](https://github.com/arenaxr/arena-web-core/commit/36508d41fc0355a8bf0a6f02f33d2cd55c6d3e7d))
* **build:** migrate wire rotation format to quaternion-only ([7ea52d3](https://github.com/arenaxr/arena-web-core/commit/7ea52d39930e9f743f96d728ddb83fa41abf8f7f))


### Bug Fixes

* add source (head/hands name) to collision msg ([929aef6](https://github.com/arenaxr/arena-web-core/commit/929aef6c5a99b073ebf711c577bbecf0d1874fd4))
* blink-controls teleportOrigin camera selector ([3ddf296](https://github.com/arenaxr/arena-web-core/commit/3ddf29608b643464fc2b77e29be7fe7b21db3984))
* **build:** 'animation-mixer: {}' will not persist ([ebf95d6](https://github.com/arenaxr/arena-web-core/commit/ebf95d6929466c4ccdfdf16d4ed89edf6b3e1a7d))
* **build:** account for animation-mixer infinity repitions ([2baacec](https://github.com/arenaxr/arena-web-core/commit/2baacec00786dc484dfcb3aac8b360405d195ae5))
* **build:** add several missing defaults ([060099a](https://github.com/arenaxr/arena-web-core/commit/060099a2bbf0eb20657819007c63f1f038afd171))
* **build:** fix missing/incorrect animation-mixer schema ([98a1b5f](https://github.com/arenaxr/arena-web-core/commit/98a1b5fcc417415153821c07e0fae81e13312971))
* **build:** updated default definitions ([8a91d53](https://github.com/arenaxr/arena-web-core/commit/8a91d53aa3eb8cdef6db88d8e4fc60ca89d3902e))
* **build:** use string for animation mixer repetitions ([47c9d1d](https://github.com/arenaxr/arena-web-core/commit/47c9d1dec1149a2fb233f7a0499bd2a2b5ce79b3))
* **capsule:** corrected capsule mesh with standard three mesh ([9830b47](https://github.com/arenaxr/arena-web-core/commit/9830b47a4cba91eeb8c993a78c37fdf8b555a67f))
* collision obj_id ([0e37344](https://github.com/arenaxr/arena-web-core/commit/0e373443f97acbc6da1fa77f2e0bdda312c158e9))
* default collision listener object name ([73e414f](https://github.com/arenaxr/arena-web-core/commit/73e414f82ea38808e0fe3faf992f4340c05a2f38))
* **hand:** controller sizing for magicleap1 ([e56259c](https://github.com/arenaxr/arena-web-core/commit/e56259c69c0bf19d33f2ef5bb6167c6ed457750d))
* **hand:** remove orphaned hands when remote avatar leaves ([aec970e](https://github.com/arenaxr/arena-web-core/commit/aec970e9931fe375852a50735eca90a5707c5866))
* **settings:** allow settings dialog to be transparent a little ([88d050a](https://github.com/arenaxr/arena-web-core/commit/88d050aa847c9c9a32a5678d49d3c3bf551439aa))
* **thickline:** add default enum lineWidthStyler ([b2c46e5](https://github.com/arenaxr/arena-web-core/commit/b2c46e52c4397ca0e7badced94e7641ceff3c63f))
* **thickline:** styler center-smooth should return a value ([f8268b7](https://github.com/arenaxr/arena-web-core/commit/f8268b7a8402cb4be0c8398487ba9035b088affa))
* utils import ([ae8274e](https://github.com/arenaxr/arena-web-core/commit/ae8274e7a799fb05a167fdb9d8c206594d184551))

## [1.16.0](https://github.com/arenaxr/arena-web-core/compare/v1.15.0...v1.16.0) (2023-01-31)


### Features

* add camFollow target ([d30e02e](https://github.com/arenaxr/arena-web-core/commit/d30e02e8faa8df17567090707db14afec875f3ad))
* add parent to program schema; temporarily make 'pytest' the default ([8f03835](https://github.com/arenaxr/arena-web-core/commit/8f0383563b8b497c4601edfd15b2afff69a3f5a9))


### Bug Fixes

* add `playsinline` on all media tags for iOS ([96f90f6](https://github.com/arenaxr/arena-web-core/commit/96f90f6308ab9b3457af837867df946e0889e35e))
* alter rig in xrSession for camera-override ([4f03855](https://github.com/arenaxr/arena-web-core/commit/4f038550675f52a3def69d2fdd5aa7b8307a605d))
* copy pos and rot instead of matrix ([b74578f](https://github.com/arenaxr/arena-web-core/commit/b74578f1e167c431f86654b6fe98a7c88660d4ca))
* don't req cam-access or CV when camFollow ([0b11522](https://github.com/arenaxr/arena-web-core/commit/0b11522caa27b977b217d30b040c5a792d371b2e))
* handle uninited scene in camfollow override ([4012097](https://github.com/arenaxr/arena-web-core/commit/4012097b7441988f64c4de5812c2d2e5657d9610))
* program schema ([62f4873](https://github.com/arenaxr/arena-web-core/commit/62f4873ea403fbf7077117f0240cd1ecaebac51b))
* rig matrix calc for cam override ([c4d81b0](https://github.com/arenaxr/arena-web-core/commit/c4d81b0cd79aeeb6b65cd517267f354993d219b6))

## [1.15.0](https://github.com/arenaxr/arena-web-core/compare/v1.14.1...v1.15.0) (2023-01-18)


### Features

* **debug:** added hudstats boolean url param to display ([294c0ce](https://github.com/arenaxr/arena-web-core/commit/294c0ce6e3fe963ce89bb7dbd1429ea7dd4a966c))
* use arenaxr forked aframe-inspector ([a3fb870](https://github.com/arenaxr/arena-web-core/commit/a3fb8702c9b384a44a87bcb39fe2b74d17e438ca))


### Bug Fixes

* **avatar:** move hand delete to disconnection event ([d09db8f](https://github.com/arenaxr/arena-web-core/commit/d09db8fcf9fd060bbefa05f08050cf1c802115f3))
* **avatar:** send hand delete message when arena-hand component is removed ([#512](https://github.com/arenaxr/arena-web-core/issues/512)) ([fa4b273](https://github.com/arenaxr/arena-web-core/commit/fa4b273020dcf0462ff62b64e9c0183cbe23b223))
* **build:** add missing attribution component to schema ([986d900](https://github.com/arenaxr/arena-web-core/commit/986d9001321d076a062ea479d32f03bc045bc791))
* **build:** add ttl component to message schema ([733225f](https://github.com/arenaxr/arena-web-core/commit/733225f8cfad61e4d3a6b6a72f94cc7d80105585))
* draco decoder path ([5751b3c](https://github.com/arenaxr/arena-web-core/commit/5751b3c599fbd821f662c5868b842f6218a8b497))
* **jitsi:** accommodate new jitsi source name signaling ([59030a5](https://github.com/arenaxr/arena-web-core/commit/59030a580b7e57b572c93ed4621ee54156d1327e))
* **jitsi:** added backward-compatibile for old jitsi onStageEndpoints ([ca8e1c9](https://github.com/arenaxr/arena-web-core/commit/ca8e1c91d627d928291fca8504fc61226807d3ed))
* typo console error ([d2633a9](https://github.com/arenaxr/arena-web-core/commit/d2633a902cbf6b83d2a15daeddf54e97ab8b457c))

## [1.14.1](https://github.com/arenaxr/arena-web-core/compare/v1.14.0...v1.14.1) (2022-10-11)


### Bug Fixes

* catch early err postMessage to cvworker ([31cea9d](https://github.com/arenaxr/arena-web-core/commit/31cea9dd56e39156265e0b9caeb75044ca030f54))
* GUM settings missing video ([2e1ee53](https://github.com/arenaxr/arena-web-core/commit/2e1ee537a745575b42ec1b030656a852b944f1c7))
* Move hands to children of spinner ([45c2cb0](https://github.com/arenaxr/arena-web-core/commit/45c2cb01dc8c9496fd132d0425cb45b531747f34))
* Use (probably) correct FOV for HL2 ([c865fd6](https://github.com/arenaxr/arena-web-core/commit/c865fd6fc2ea71cdebb4e942f298cd2e10e18afc))
* use worldpos for gltf-lod and arena-hand ([4503c5e](https://github.com/arenaxr/arena-web-core/commit/4503c5ee5b4dbcc3c52a8e652cd02733588858c8))


### Reverts

* 3a7f313e - loosen motion thresholds ([f73aa08](https://github.com/arenaxr/arena-web-core/commit/f73aa08269d7d13684af820d2ce5ccf9c510aba4))

## [1.14.0](https://github.com/arenaxr/arena-web-core/compare/v1.13.3...v1.14.0) (2022-10-07)


### Features

* **add:** add roundedbox preimitive to schema ([6d0c2de](https://github.com/arenaxr/arena-web-core/commit/6d0c2de95934620accdc8234195d5e7fc35f8b0d))


### Bug Fixes

* **build:** add text-input property to objects in build page ([88e6718](https://github.com/arenaxr/arena-web-core/commit/88e67181e5c233b6a56dbcc6bb9f2702df87dbf2))
* **build:** add ui panel primitive to build schema ([7535f5a](https://github.com/arenaxr/arena-web-core/commit/7535f5a224e69e499165d3c4ab7af7e26326d556))
* check for cvpipeline before worker msg ([50e3d64](https://github.com/arenaxr/arena-web-core/commit/50e3d641b4b73db62d0a5568fe940d28cd23602f))
* Prevent double-loading CV worker ([2567ed6](https://github.com/arenaxr/arena-web-core/commit/2567ed6d2bdd032803a4745741f083fd24ef03a0))
* sync initial armarker wireframe w/ dynamic ([3cb1e2c](https://github.com/arenaxr/arena-web-core/commit/3cb1e2c6ed175f9002da23fdd27bd61ad75045b0))
* typo in GUM options ([7a87efd](https://github.com/arenaxr/arena-web-core/commit/7a87efd246937402500df302e2dc14f05955ae18))

## [1.13.3](https://github.com/arenaxr/arena-web-core/compare/v1.13.2...v1.13.3) (2022-10-04)


### Bug Fixes

* **avatar:** fix dropbox ([44aa24e](https://github.com/arenaxr/arena-web-core/commit/44aa24e5fe9751d360453872bbd48bf698fbad71))
* **gltf-model-lod:** fixed dropbox links on detailedUrl ([3603c1a](https://github.com/arenaxr/arena-web-core/commit/3603c1a496c6d12c3c50c22d337a2e2abb085aeb))
* **video-control:** convert dropbox links properly ([305f383](https://github.com/arenaxr/arena-web-core/commit/305f3836ef90b41314e944e4947157ebc783623a))

## [1.13.2](https://github.com/arenaxr/arena-web-core/compare/v1.13.1...v1.13.2) (2022-10-01)


### Bug Fixes

* create delete module error ([9e7a893](https://github.com/arenaxr/arena-web-core/commit/9e7a893a475b0e024c8b7fa4f1d5c5feba06b3ba))

## [1.13.1](https://github.com/arenaxr/arena-web-core/compare/v1.13.0...v1.13.1) (2022-10-01)


### Bug Fixes

* send runtime type ([678fd1c](https://github.com/arenaxr/arena-web-core/commit/678fd1c4dd46275a35c02bbb174057bda7cd0a2c))

## [1.13.0](https://github.com/arenaxr/arena-web-core/compare/v1.12.0...v1.13.0) (2022-09-30)


### Features

* **env-presets:** add ability to change env-presets in real-time ([10dbd27](https://github.com/arenaxr/arena-web-core/commit/10dbd27c4f6b2551cc1cd40d2499f32c2268147c))


### Bug Fixes

* **avatar:** add missing leading 0 to avatar text color ([2eec88e](https://github.com/arenaxr/arena-web-core/commit/2eec88e84d1da11b36ed29a8c0a0d7105b08146a))
* **build:** fix isosahedron mispelling ([683499f](https://github.com/arenaxr/arena-web-core/commit/683499ff801bc987ec7d4ca9a3d7cc2d9aa7f578))
* **build:** fix isosahedron mispelling ([e438125](https://github.com/arenaxr/arena-web-core/commit/e4381252e4c94f4b893f12689a2176ee1705d2fc))
* **build:** increse color property hieght to be visible ([a3882c0](https://github.com/arenaxr/arena-web-core/commit/a3882c059010a5dcb348a7f73f513290f493243d))
* **build:** match more primitives to a-frame defaults ([d8e0bc9](https://github.com/arenaxr/arena-web-core/commit/d8e0bc9155b66a9ccded673a8d14326b1a99e1dd))
* move aframe-extras to systems ([ee51bdc](https://github.com/arenaxr/arena-web-core/commit/ee51bdcf3b5707d4a9fa6200534d312fa1d2c959))
* pass module parent along in module create ([6ba1117](https://github.com/arenaxr/arena-web-core/commit/6ba1117cfc346790c0134a1341b0a79c0f40d039))
* **stats:** add euler angles to camera stats ([8eeb62c](https://github.com/arenaxr/arena-web-core/commit/8eeb62c35ff394f993b486065e306ba44b38e78c))
* **stats:** update initial position of stats when opened ([6dbebe2](https://github.com/arenaxr/arena-web-core/commit/6dbebe2b94a733308ab03e0d9a230c9790f0e577))
* use THREE.MathUtils over deprec THREE.Math ([14365c9](https://github.com/arenaxr/arena-web-core/commit/14365c9766037611721673cbcdc97ba3ea1a14b1))

## [1.12.0](https://github.com/arenaxr/arena-web-core/compare/v1.11.2...v1.12.0) (2022-08-21)


### Features

* Add draco decoder ([dc99525](https://github.com/arenaxr/arena-web-core/commit/dc99525c42c75d1e802d762749e4d018ecc9128d)), closes [#479](https://github.com/arenaxr/arena-web-core/issues/479)


### Bug Fixes

* **jitsi:** fixed [#492](https://github.com/arenaxr/arena-web-core/issues/492), arcore permissions ([dc12cf0](https://github.com/arenaxr/arena-web-core/commit/dc12cf0534749e7a7cee50b74a63e9cd601ee163))
* stop meterDraw, meterProcess on avsetup hide ([d220910](https://github.com/arenaxr/arena-web-core/commit/d220910c6f11c145a1858616848b9280e75e01c6))

## [1.11.2](https://github.com/arenaxr/arena-web-core/compare/v1.11.0...v1.11.2) (2022-08-15)

### Bug Fixes
* fixing release pipeline (several test commits)

## [1.11.0](https://github.com/arenaxr/arena-web-core/compare/v1.10.0...v1.11.0) (2022-08-15)


### Features

* **build:** Added capsule geometry ([259afda](https://github.com/arenaxr/arena-web-core/commit/259afdaa090240a1410b0d56738f5b237bd6fd93))


### Bug Fixes

* actually fix camera parent case ([222cb23](https://github.com/arenaxr/arena-web-core/commit/222cb234d749c761134976c431e5ecf15a8e97bc))
* **build:** Restore missing isosahedron ([b7b1ede](https://github.com/arenaxr/arena-web-core/commit/b7b1edef0497f6b0d29769b19968782a1f35070b))
* **build:** update primitives meshes to three.js default dimensions ([8e8775f](https://github.com/arenaxr/arena-web-core/commit/8e8775ff7a7bc7f49e7d65b88b57fc9b6a875570))
* don't attach camera objects to my-camera ([860eac7](https://github.com/arenaxr/arena-web-core/commit/860eac7adfa61e4003fecf2a5f7fe3758b32ebe3))
* **jitsi-video:** force jitsi setup to end of persist load ([048189a](https://github.com/arenaxr/arena-web-core/commit/048189ac236ff49a3e86010bd856fe2671ac4684))
* **videosphere:** update tracks with 2:1 aspect; remove Panoramic presense selection ([d28c912](https://github.com/arenaxr/arena-web-core/commit/d28c912e4bfad20216c803dc3e3058d58e7132cf))

## [1.10.0](https://github.com/arenaxr/arena-web-core/compare/v1.9.0...v1.10.0) (2022-08-06)


### Features

* **build:** Add prism geometry ([79e708a](https://github.com/arenaxr/arena-web-core/commit/79e708aa5abbce5cab0ff9ba32b7e58fd5bff80e))
* **jitsi-video:** support rendering local video; detect panoramic resolution ([e853b15](https://github.com/arenaxr/arena-web-core/commit/e853b1586ad3b7d2a0ce17df4baf08bdcec253bc))
* **videosphere:** Add videosphere 360 native object support ([04217ac](https://github.com/arenaxr/arena-web-core/commit/04217ac3def10bcd1b8cfaca4b3d49f12b65dfdc))
* **webar:** Add WebAR/SpotAR support for non-WebXR mobile devices ([2cb9f37](https://github.com/arenaxr/arena-web-core/commit/2cb9f3734b92bb8b13b3a5aa871f1d4aea83953e))

### Bug Fixes

* **arena-user:** fixed load crash detecting arena-camera on slow networks ([cec3585](https://github.com/arenaxr/arena-web-core/commit/cec35856210777a38e6d3653ed9316ebdee509d2))
* **build:** Update schema, esp. removing unsupported items from: text, thickline ([#482](https://github.com/arenaxr/arena-web-core/issues/482)) ([c41e68d](https://github.com/arenaxr/arena-web-core/commit/c41e68d2465cd4feb1113b7b703a02653c64d495))
* disable check for vr headset in custom AR ([124ddae](https://github.com/arenaxr/arena-web-core/commit/124ddae748681237faaa634ad8e16e958fb2cd23))
* **jitsi:** fixed jitsi-video displayname autolink to jitsi id ([950db70](https://github.com/arenaxr/arena-web-core/commit/950db706efb0b69373e6a5d9f3e72aa03b3698d6))
* only loadUser on initial loadSceneObjects ([6ff7068](https://github.com/arenaxr/arena-web-core/commit/6ff706849a6a16b0a20899abc6862910ad3283fa))
* use video html tags in readme [no ci] ([6892299](https://github.com/arenaxr/arena-web-core/commit/6892299e56f7e3a07bc2cf9637d4bf3873c7eae6))
* use world position for camera clientEvents ([1c92110](https://github.com/arenaxr/arena-web-core/commit/1c92110ccd5883b207a20980b46c52db6043cdca)), closes [#484](https://github.com/arenaxr/arena-web-core/issues/484)
* video embeds [no ci] ([538d6a0](https://github.com/arenaxr/arena-web-core/commit/538d6a06b10e581896d39f1bca265954d3e79166))

## [1.9.0](https://github.com/arenaxr/arena-web-core/compare/v1.8.1...v1.9.0) (2022-07-14)


### Features

* add scene landing logic; separate scene name loads; auth uses sweet alert ([#462](https://github.com/arenaxr/arena-web-core/issues/462)) ([dd5c4fe](https://github.com/arenaxr/arena-web-core/commit/dd5c4fef3bb6024ccf4f7c4e5b4bf14a89bc3030))
* **auth:** Add support "no users", removes chat, jitsi, camera publish ([#465](https://github.com/arenaxr/arena-web-core/issues/465)) ([03e6a0d](https://github.com/arenaxr/arena-web-core/commit/03e6a0d97d3ff329468387e7a4e8a2020e157688))
* **build:** add ar-hit-test attributes to schema ([e9acc3c](https://github.com/arenaxr/arena-web-core/commit/e9acc3ca8588194eac61ed1136b75c8b959f8001))
* material-extras traverses objects, so can be applied to GLTFs ([f5aed24](https://github.com/arenaxr/arena-web-core/commit/f5aed2404be462be302a0e5a88edef150ae45cb2))
* **scenes:** Allow panel to add optional URI params ([#466](https://github.com/arenaxr/arena-web-core/issues/466)) ([f033956](https://github.com/arenaxr/arena-web-core/commit/f0339565389cff9ccc80e04abfae76b1631756ae))


### Bug Fixes

* actually add vendor component files ([91c15f2](https://github.com/arenaxr/arena-web-core/commit/91c15f23511a2a23e615641d687fe31d32956447))
* missing public clone ([b8eee4a](https://github.com/arenaxr/arena-web-core/commit/b8eee4a1c26a6fe6251a7cc95a2588bf37b20d06))
* **scenes:** make Scene URL Options link-style button ([995ff2d](https://github.com/arenaxr/arena-web-core/commit/995ff2d5003cbddf3b19ea6b6e003d03276684b0))
* **scenes:** proper select order ([2e4f4b0](https://github.com/arenaxr/arena-web-core/commit/2e4f4b08e3fa56865e280d88fdd963c0dcc1907c))

### [1.8.1](https://github.com/arenaxr/arena-web-core/compare/v1.8.0...v1.8.1) (2022-05-25)


### Bug Fixes

* **jitsi:** fix video culling, mirrored panoramic video ([9ca7c7d](https://github.com/arenaxr/arena-web-core/commit/9ca7c7d1150b17ab23a199ec3d02ce2e7fe579b0))

## [1.8.0](https://github.com/arenaxr/arena-web-core/compare/v1.7.2...v1.8.0) (2022-05-14)


### Features

* Add addt'l hide-on-enter-ar gltf behavior ([49eeb16](https://github.com/arenaxr/arena-web-core/commit/49eeb16f2fbc2c4c9de55e7eed1428820dcee1b4)), closes [#450](https://github.com/arenaxr/arena-web-core/issues/450)
* add goto-landmark component ([834a78a](https://github.com/arenaxr/arena-web-core/commit/834a78ad2519b0f1c3aba10b82726afb63baf0d0))
* add hide-on-enter-vr component ([d09d65c](https://github.com/arenaxr/arena-web-core/commit/d09d65c23c2eae219ca5026266151d4c51934aa5))
* **jitsi:** Adds videoDefaultResolutionConstraint option, Adds FPS drop after 180p ([#458](https://github.com/arenaxr/arena-web-core/issues/458)) ([3632d86](https://github.com/arenaxr/arena-web-core/commit/3632d869318cfd39a100154487972738af0e81a3))


### Bug Fixes

* add gltf-model as dep of gltf-model-lod ([bdd28b9](https://github.com/arenaxr/arena-web-core/commit/bdd28b958a26126e090ee40ec3352356f7796719))
* add missing super-three dependency ([cd70072](https://github.com/arenaxr/arena-web-core/commit/cd70072712cba018c597d45cbc33342da6fa7d2d))
* dev folders relative links ([49d6583](https://github.com/arenaxr/arena-web-core/commit/49d65833e5000d71e69a7e671108f1ed1d373786))
* dev folders relative links ([dbd5833](https://github.com/arenaxr/arena-web-core/commit/dbd583369a2b87c229c766b20e78643927ac06e7))
* don't double-fire our own mouseup/down evts ([14a6d73](https://github.com/arenaxr/arena-web-core/commit/14a6d7372a74050cf4b2d635fd9d271e096b64e1))
* **jitsi:** improved visibility of video stats ([c686536](https://github.com/arenaxr/arena-web-core/commit/c686536d241f30cd980d9362d1c05e05354ab749))
* only goto-landmark on non-synth click ([95fea9b](https://github.com/arenaxr/arena-web-core/commit/95fea9b20e115e4a906322627f83f997a0f3e594))
* properly register hide-on-enter-vr component ([48b1379](https://github.com/arenaxr/arena-web-core/commit/48b13791d1e9680be5ca7c365836cbe4d3111d53))
* **vr-mode:** fix hide-on-enter-vr exception ([8bbb0b6](https://github.com/arenaxr/arena-web-core/commit/8bbb0b63241bd1330e7f1b683a6882d77bda73cf))


### Reverts

* cd700727 (super-three inc via override) ([669173d](https://github.com/arenaxr/arena-web-core/commit/669173dfb5820fa784f1fb3137d78d2fcdfbe525))

### [1.7.2](https://github.com/arenaxr/arena-web-core/compare/v1.7.1...v1.7.2) (2022-04-29)


### Bug Fixes

* **jitsi:** correct bad user resolution default ([6e237dd](https://github.com/arenaxr/arena-web-core/commit/6e237dd860c46eddda57d506f4aefc25fac60c21))

### [1.7.1](https://github.com/arenaxr/arena-web-core/compare/v1.7.0...v1.7.1) (2022-04-29)


### Bug Fixes

* **jitsi:** restore screenshare, do not use default res 0p ([b85d6f4](https://github.com/arenaxr/arena-web-core/commit/b85d6f4c3b5d7bf5be06fedfe437871bdffc3dd9))
* **jitsi:** separate frustum/distance scene flags ([1f58d4d](https://github.com/arenaxr/arena-web-core/commit/1f58d4d634e1cf38802240d9397cba906c0d56bd))

## [1.7.0](https://github.com/arenaxr/arena-web-core/compare/v1.6.0...v1.7.0) (2022-04-28)


### Features

* **jitsi:** add distance and frustum based resolution constraints ([#446](https://github.com/arenaxr/arena-web-core/issues/446)) ([e3b55a8](https://github.com/arenaxr/arena-web-core/commit/e3b55a8162ff1dc1e9972b1dbb201bfad46dfe29))
* **settings:** add versions link to settings dialog ([814399b](https://github.com/arenaxr/arena-web-core/commit/814399b6ccbbc9e69dffa09cbc3e36ee2c573572))


### Bug Fixes

* Align xrRefSpace for camcapture w/ AFRAME ([393efe2](https://github.com/arenaxr/arena-web-core/commit/393efe2735bba8f663ba6dbd2b900ab79236b5a3))
* **jitsi:** reduce glare on videosphere and screenshare ([b8d8423](https://github.com/arenaxr/arena-web-core/commit/b8d8423c2a6ef67e4babc60737ae0b669d8fa287))
* Remove CHANGELOG link to lib-jitsi-meet ([870bd27](https://github.com/arenaxr/arena-web-core/commit/870bd2783c5b75e41a9deee6da141abe0f9f3e33))
* Remove v1.5.x from CHANGELOG ([4cf37ad](https://github.com/arenaxr/arena-web-core/commit/4cf37ada282cefceb228837949ba2b09b3eec3a5))
* restore working rig transform msg handling ([0041a15](https://github.com/arenaxr/arena-web-core/commit/0041a15675488553819a48801f27415428395899))
* **runtime-mngr:** runtime userid ([aa94175](https://github.com/arenaxr/arena-web-core/commit/aa94175b02be9266d135956ffdbb2cf7bf4aa9d0))
* **runtime:** runtime mqtt client id name undefined ([ed5faff](https://github.com/arenaxr/arena-web-core/commit/ed5faffd9fa6bf6e0feee8fa7df2919755c4c289))
* typo on rig props ([2f681d9](https://github.com/arenaxr/arena-web-core/commit/2f681d9f4b97e6d19115c4a69edb7fae7af4104c))
* Update deprecated setRotationFromQuaternion ([2b0d0c8](https://github.com/arenaxr/arena-web-core/commit/2b0d0c87aebc0ec60450929de82d24c818bb4026))

## [1.6.0](https://github.com/arenaxr/arena-web-core/compare/v1.4.0...v1.6.0) (2022-04-23)


### Features

* Add anonymous login url parameter ([52f7dc0](https://github.com/arenaxr/arena-web-core/commit/52f7dc065c1c7dc8c5cc24c194cd78da1a0ccb3b))
* Add disableVideoCulling flag to scene optionns ([1b95e74](https://github.com/arenaxr/arena-web-core/commit/1b95e7404a9ccf91b2bd90210acea26fe8700f66))
* Add pose stats display to arena-camera ([a5411d8](https://github.com/arenaxr/arena-web-core/commit/a5411d8aae8f61d9efea22b4de0f2c74e823a892)), closes [#213](https://github.com/arenaxr/arena-web-core/issues/213)
* add show-on-enter-ar ([8b38ef0](https://github.com/arenaxr/arena-web-core/commit/8b38ef0ffce571f7386d9015737c3f0dfc5d8940))
* add video culling on/off flag; Default to off ([0086749](https://github.com/arenaxr/arena-web-core/commit/00867497d97eb1af747a1ea651ead031ebb19b6a))
* **avatar:** Added ability to set multiple custom head models per scene ([#432](https://github.com/arenaxr/arena-web-core/issues/432)) ([7dbc378](https://github.com/arenaxr/arena-web-core/commit/7dbc378e05e1e0bfab22475651ee0b232fb6bfa0))
* **avatar:** Added custom scene head model ([#425](https://github.com/arenaxr/arena-web-core/issues/425)) ([2ac029e](https://github.com/arenaxr/arena-web-core/commit/2ac029ed3d5a984f745c39df0ed8ee4d5cf39318))
* **chat:** chat buttons toggle open/close ([8371bf0](https://github.com/arenaxr/arena-web-core/commit/8371bf0018999dad14e95bbf26de64126eab7e87))
* **chore:** Update build schema with links and object types ([#435](https://github.com/arenaxr/arena-web-core/issues/435)) ([72d07fd](https://github.com/arenaxr/arena-web-core/commit/72d07fdd7846c2c6699a3e57c1a733b054cef195))
* Enable layer suspension, so that frustum culled video, and distanced audio will actually drop bandwidth ([a83706d](https://github.com/arenaxr/arena-web-core/commit/a83706d7e0f69b90fd57d8aef0cf84eaea5ffefd))
* **filestore:** add filestore copy path link to nav-bar ([ea4a83e](https://github.com/arenaxr/arena-web-core/commit/ea4a83e1f18d447a2ae114922fe49d7bdfade239))
* **jitsi:** Add 360 panoramic streaming video sphere ([#427](https://github.com/arenaxr/arena-web-core/issues/427)) ([dff4823](https://github.com/arenaxr/arena-web-core/commit/dff48237f5ef42355abb475355ee331b4d7ed239))
* **jitsi:** Add full resolution stats to user-list per participant ([#426](https://github.com/arenaxr/arena-web-core/issues/426)) ([0ea0f1a](https://github.com/arenaxr/arena-web-core/commit/0ea0f1a3ca2608743de7acfa0970ad36f3fedd58))
* **jitsi:** add poor connection avatar icon only for poor connections ([ee9733e](https://github.com/arenaxr/arena-web-core/commit/ee9733e79f3cf34613d71c06a5d939b74cfd96d0))
* **jitsi:** add preliminary connection stats to user list ([#388](https://github.com/arenaxr/arena-web-core/issues/388)) ([77e5cd2](https://github.com/arenaxr/arena-web-core/commit/77e5cd21f5c9619e095a4993fb1031ed7975061f))
* **jitsi:** add quality stats for screenshare and external ([4536a97](https://github.com/arenaxr/arena-web-core/commit/4536a976fa340857dc6eb282977e7ba2496154db))
* **jitsi:** Added MQTT Jitsi stats debug logging with urlParam ([e507439](https://github.com/arenaxr/arena-web-core/commit/e5074399d5411f3ea8daa35dbf7ab18d0d24a1fb))
* **jitsi:** upgrade lib-jitsi-meet v1420.0.0+53132888 ([22786f3](https://github.com/arenaxr/arena-web-core/commit/22786f377b0d3c2f7ba52442200d34b119be84ce))
* move runtime manager codde from seperate repo ([72b5574](https://github.com/arenaxr/arena-web-core/commit/72b5574456cf321892b71602c7c00e4420b84211))
* Provide THREE.frustum from arena-camera ([d57b259](https://github.com/arenaxr/arena-web-core/commit/d57b259a5a285f8a6ae1ce8fd1fda3d4c7998f66))
* send local conference stats to remotes ([177ab2f](https://github.com/arenaxr/arena-web-core/commit/177ab2fb654d01cd4150b4eb8b11d1fdbb9a2402))
* set ar-hit-test opts through sceneOptions ([f092f8b](https://github.com/arenaxr/arena-web-core/commit/f092f8b1a14a3f80e524e1a57cf1ec9669ead915))
* **settings:** Added links for Editor and Docs ([3588926](https://github.com/arenaxr/arena-web-core/commit/35889260a2b00059f8da0c561165758a400cf532))
* **sound:** Add clientEvents: soundplay, soundpause, soundstop ([#433](https://github.com/arenaxr/arena-web-core/issues/433)) ([d313202](https://github.com/arenaxr/arena-web-core/commit/d31320230365b34fd5c82410b4c3daf046a23e98))
* **stats:** Add confstats logging of render FPS, RAF, memory ([#431](https://github.com/arenaxr/arena-web-core/issues/431)) ([4533bac](https://github.com/arenaxr/arena-web-core/commit/4533bac4e0e0358b2b8975f5a1b3c8a6d59ebd7a))
* WebXR lighting estimation for AR ([1af7ea1](https://github.com/arenaxr/arena-web-core/commit/1af7ea1d5680f6b84fe36acc23360a2eec6891cc))


### Bug Fixes

* add thickline to components; fix instantiation issue ([048d133](https://github.com/arenaxr/arena-web-core/commit/048d1331d330ec353bb19b235c98b7c8f0613d74))
* add uuid js depeendency ([0fe6df8](https://github.com/arenaxr/arena-web-core/commit/0fe6df86d1fc2cc4f46eea7ec9b5b3299a460b21))
* apriltag wasm import ([56a5b36](https://github.com/arenaxr/arena-web-core/commit/56a5b367b0dc7414aa58d0c482401cb7f7f402e1))
* Arena camerra video culling on/off check ([18b4cf1](https://github.com/arenaxr/arena-web-core/commit/18b4cf15e11ae5aacfcd97f5ca39f1e38742bf2a))
* **auth:** fix inherited perms text color, permissions for future build3d ([2abd1e0](https://github.com/arenaxr/arena-web-core/commit/2abd1e0173032f4d745dfb568027b68a7c290305))
* **avatar:** keep critical models in arena-core ([cb9dd47](https://github.com/arenaxr/arena-web-core/commit/cb9dd47fd30a356db2993e37fc4c73ad3ba6f678))
* **avatar:** load correct scene head mid-scene ([2f1aeaf](https://github.com/arenaxr/arena-web-core/commit/2f1aeaf4245ebe6cb82a68ddefc543a9537d5d95))
* Avoid null Jitsi issues ([ab15835](https://github.com/arenaxr/arena-web-core/commit/ab158352eadc36bc81fbeb8322a885ec00b98fed))
* better track previously muted/unmuted AV ([52365dc](https://github.com/arenaxr/arena-web-core/commit/52365dcc0621552085b1c213eac414663d693057))
* **build:** add missing titles for sceneHeadModels ([1a76e61](https://github.com/arenaxr/arena-web-core/commit/1a76e61db01279ed79a638e4a46fd96f82a409ad))
* **build:** add tooltip for edit json button ([5a412b5](https://github.com/arenaxr/arena-web-core/commit/5a412b59fe537ae7438dfbf2f87ffbae1ca1f553))
* **build:** decode scene name slash in url ([359f516](https://github.com/arenaxr/arena-web-core/commit/359f51696f504034843d206bfb5b4f8dabb3c525))
* **build:** Make schema description URLs linkable ([#438](https://github.com/arenaxr/arena-web-core/issues/438)) ([de9ae0b](https://github.com/arenaxr/arena-web-core/commit/de9ae0b6bb60b232be79ed07e8a6c4ef795ea82b))
* case-insensitive match srcLoader img ext's ([e86f16c](https://github.com/arenaxr/arena-web-core/commit/e86f16c5c2a67b13f3481710c43677ccb66d1281))
* **chat:** 'to' refresh, only update 'to' select for new users ([b403490](https://github.com/arenaxr/arena-web-core/commit/b403490d4715246d0c9718e078ae861336b5bcae))
* **chat:** fix initial chat buttons display state ([fd434d3](https://github.com/arenaxr/arena-web-core/commit/fd434d3fb853017f296369e0ec7b45af1f5b1e3b))
* **chat:** restore kickout icon ([cd45792](https://github.com/arenaxr/arena-web-core/commit/cd4579233d9adc7f2a09783f9bc3797e8c741713))
* client module delete message ([c1ab92f](https://github.com/arenaxr/arena-web-core/commit/c1ab92fabf6bff893354ebe07ad00ad79d77b98f))
* disable video frustrum caused pose updates to be skipped ([d26b7e6](https://github.com/arenaxr/arena-web-core/commit/d26b7e66b5ec45fc238182d8c816a9505512c6de))
* do not remove audio if Jitsi video fails ([dfa7ef9](https://github.com/arenaxr/arena-web-core/commit/dfa7ef9552ea2a5d331e9e8f226f5d285a5120b2))
* dtitle typo ([84e96e3](https://github.com/arenaxr/arena-web-core/commit/84e96e30ab9b572da83fa272aae5f68067ec61aa))
* enable frstrum culling by default ([fcc9084](https://github.com/arenaxr/arena-web-core/commit/fcc9084267eafc8d490cebfd6d0071a0f94ad8c3))
* ensure anonymous users have a display name ([0a03d09](https://github.com/arenaxr/arena-web-core/commit/0a03d094e06333f9749d4f85735c57d4490c45e7))
* get nmodules from children list ([fcc61f6](https://github.com/arenaxr/arena-web-core/commit/fcc61f67b66aaaeda301901749b4840aeb8dad67))
* health icon size ([b6eccc6](https://github.com/arenaxr/arena-web-core/commit/b6eccc61b7e50ffb7d48a783a022cda5250ca758))
* **icons:** Use .png over .svg for icons for firefox ([e7aa585](https://github.com/arenaxr/arena-web-core/commit/e7aa585526fcfed20b9ffd236a78251d6efe854d))
* **jitsi:** show remote stats for other users ([#412](https://github.com/arenaxr/arena-web-core/issues/412)) ([a93e518](https://github.com/arenaxr/arena-web-core/commit/a93e518d49eeffc9dab8b4bb3756e96eee8ddbd8))
* last will message ([6e47695](https://github.com/arenaxr/arena-web-core/commit/6e476955cca06f36e8455ae54cecc0d062a3d961))
* make graph.js type=module ([7c6397c](https://github.com/arenaxr/arena-web-core/commit/7c6397c3106838497aa705a8973ead0e21e696fa))
* minor ([659a24c](https://github.com/arenaxr/arena-web-core/commit/659a24c1e3216aec25f1cef9757417bf0f83aafb))
* minor edits ([9740f05](https://github.com/arenaxr/arena-web-core/commit/9740f05edeec239af48e83fa8666fd5813e34e0e))
* minor edits ([6d9b1a3](https://github.com/arenaxr/arena-web-core/commit/6d9b1a358d4ddb30cf0901170aff4fec389a5181))
* minor fixes ([27d24aa](https://github.com/arenaxr/arena-web-core/commit/27d24aa96fbee10408ce9029ccdfa1fbc37e960e))
* missing title on gltf-lod build schema ([160949e](https://github.com/arenaxr/arena-web-core/commit/160949e9f3930858ac734701fb594e2e9d5d2973))
* **nav-bar:** fixed current page highlight, rework perms ([373c51a](https://github.com/arenaxr/arena-web-core/commit/373c51a97e03b602f12db310053716150b4790e3))
* node version ([43bde22](https://github.com/arenaxr/arena-web-core/commit/43bde227224763fd59bf60f5e1bcd5b8f51ef4fc))
* pass UTC time in chat msgs ([651d859](https://github.com/arenaxr/arena-web-core/commit/651d859fc807277848208e6735da486823bb7eab)), closes [#363](https://github.com/arenaxr/arena-web-core/issues/363)
* **physics:** enabling physics selector ([2831fc5](https://github.com/arenaxr/arena-web-core/commit/2831fc5abe4b99df6a631265057838287e778904))
* Properly check for Jitsi before restart func ([594e30a](https://github.com/arenaxr/arena-web-core/commit/594e30adb863a86d0eb43f377e95fb709a7e09e2))
* re-order headmodel dynamic-body after model ([38f873d](https://github.com/arenaxr/arena-web-core/commit/38f873dfc3bd68abe7b4bbc8a0a292925288b45c))
* remove old runtime mngr code ([5e54b67](https://github.com/arenaxr/arena-web-core/commit/5e54b674e019f7586bb8a5e851a2acf85bd70f7f))
* runtime name uses idTag ([e062014](https://github.com/arenaxr/arena-web-core/commit/e062014eb1428fb34264dda865018acbcf1bdbe0))
* runtime name uses idTag ([fb527a3](https://github.com/arenaxr/arena-web-core/commit/fb527a3d08ddcf7187e5e8b97316079126bd936c))
* scene features typo ([af6dc2e](https://github.com/arenaxr/arena-web-core/commit/af6dc2e062e9a105935b98c7d4167532f4be0ba0))
* skip AFRAME srcLoader HEAD reqs for img exts ([6d99519](https://github.com/arenaxr/arena-web-core/commit/6d99519a24ca1e6072b0016016d79f3f4deb163e))
* **store:** fixed missing content at bottom of store frame ([04a21c0](https://github.com/arenaxr/arena-web-core/commit/04a21c0ab6826c9bffac7d21428579b92dac5cef))
* **store:** fixed missing content at bottom of store frame ([0a1dc98](https://github.com/arenaxr/arena-web-core/commit/0a1dc98a18f2e287e9fe5db0dfc7a6246f70094e))
* **store:** fixed missing content at bottom of store frame ([be2fa39](https://github.com/arenaxr/arena-web-core/commit/be2fa39908dc1dead35f6177a44b67ef28b032f1))
* typo in cornerVideo selector ([294f5f9](https://github.com/arenaxr/arena-web-core/commit/294f5f9293284fb260d7d3f343b340b436726586))
* Update apriltag publish topic w/ namespace ([f557c57](https://github.com/arenaxr/arena-web-core/commit/f557c576da9d50cecbd215e4487d7d90597b6678))
* update arts viz connection string ([3b9f43a](https://github.com/arenaxr/arena-web-core/commit/3b9f43a19683abd5a4167e94cab035d9c4756d45))
* update to new runtime manageer code ([dadf773](https://github.com/arenaxr/arena-web-core/commit/dadf773376f7b97defafd6a64f4b02e3eb446366))
* update webrtc test link ([fa55807](https://github.com/arenaxr/arena-web-core/commit/fa5580731c4815a28b845aabfc8f5c705c22b94e))
* validate topic position for clientevent source ([dcea0bc](https://github.com/arenaxr/arena-web-core/commit/dcea0bc0c97c2d84bcd906764987a2d9ac592219))
* Version and hash on docker build ([31dbf7c](https://github.com/arenaxr/arena-web-core/commit/31dbf7c23db21deceaa680f40b6254e7c0587414))
* video frustum culling handling ([4eca471](https://github.com/arenaxr/arena-web-core/commit/4eca4715a95faceade7ede3ec4741b76fe5eda9f))


### Reverts

* background light-estimate pending AFRAME fix ([dcbec36](https://github.com/arenaxr/arena-web-core/commit/dcbec36cb5c302260995fa9fcc077c370abb58e4))

## [1.4.0](https://github.com/arenaxr/arena-web-core/compare/v1.3.2...v1.4.0) (2022-04-07)


### Features

* Add disableVideoCulling flag to scene optionns ([1b95e74](https://github.com/arenaxr/arena-web-core/commit/1b95e7404a9ccf91b2bd90210acea26fe8700f66))
* **avatar:** Added ability to set multiple custom head models per scene ([#432](https://github.com/arenaxr/arena-web-core/issues/432)) ([7dbc378](https://github.com/arenaxr/arena-web-core/commit/7dbc378e05e1e0bfab22475651ee0b232fb6bfa0))
* **avatar:** Added custom scene head model ([#425](https://github.com/arenaxr/arena-web-core/issues/425)) ([2ac029e](https://github.com/arenaxr/arena-web-core/commit/2ac029ed3d5a984f745c39df0ed8ee4d5cf39318))
* **jitsi:** Add 360 panoramic streaming video sphere ([#427](https://github.com/arenaxr/arena-web-core/issues/427)) ([dff4823](https://github.com/arenaxr/arena-web-core/commit/dff48237f5ef42355abb475355ee331b4d7ed239))
* **jitsi:** Add full resolution stats to user-list per participant ([#426](https://github.com/arenaxr/arena-web-core/issues/426)) ([0ea0f1a](https://github.com/arenaxr/arena-web-core/commit/0ea0f1a3ca2608743de7acfa0970ad36f3fedd58))
* **jitsi:** add quality stats for screenshare and external ([4536a97](https://github.com/arenaxr/arena-web-core/commit/4536a976fa340857dc6eb282977e7ba2496154db))
* **jitsi:** Added MQTT Jitsi stats debug logging with urlParam ([e507439](https://github.com/arenaxr/arena-web-core/commit/e5074399d5411f3ea8daa35dbf7ab18d0d24a1fb))
* **settings:** Added links for Editor and Docs ([3588926](https://github.com/arenaxr/arena-web-core/commit/35889260a2b00059f8da0c561165758a400cf532))
* **sound:** Add clientEvents: soundplay, soundpause, soundstop ([#433](https://github.com/arenaxr/arena-web-core/issues/433)) ([d313202](https://github.com/arenaxr/arena-web-core/commit/d31320230365b34fd5c82410b4c3daf046a23e98))
* **stats:** Add confstats logging of render FPS, RAF, memory ([#431](https://github.com/arenaxr/arena-web-core/issues/431)) ([4533bac](https://github.com/arenaxr/arena-web-core/commit/4533bac4e0e0358b2b8975f5a1b3c8a6d59ebd7a))


### Bug Fixes

* **avatar:** load correct scene head mid-scene ([2f1aeaf](https://github.com/arenaxr/arena-web-core/commit/2f1aeaf4245ebe6cb82a68ddefc543a9537d5d95))
* **chat:** 'to' refresh, only update 'to' select for new users ([b403490](https://github.com/arenaxr/arena-web-core/commit/b403490d4715246d0c9718e078ae861336b5bcae))
* dtitle typo ([84e96e3](https://github.com/arenaxr/arena-web-core/commit/84e96e30ab9b572da83fa272aae5f68067ec61aa))
* enable frstrum culling by default ([fcc9084](https://github.com/arenaxr/arena-web-core/commit/fcc9084267eafc8d490cebfd6d0071a0f94ad8c3))
* minor ([659a24c](https://github.com/arenaxr/arena-web-core/commit/659a24c1e3216aec25f1cef9757417bf0f83aafb))
* update arts viz connection string ([3b9f43a](https://github.com/arenaxr/arena-web-core/commit/3b9f43a19683abd5a4167e94cab035d9c4756d45))
* update webrtc test link ([fa55807](https://github.com/arenaxr/arena-web-core/commit/fa5580731c4815a28b845aabfc8f5c705c22b94e))
* video frustum culling handling ([4eca471](https://github.com/arenaxr/arena-web-core/commit/4eca4715a95faceade7ede3ec4741b76fe5eda9f))

### [1.3.2](https://github.com/arenaxr/arena-web-core/compare/v1.3.1...v1.3.2) (2022-03-23)


### Bug Fixes

* Arena camerra video culling on/off check ([18b4cf1](https://github.com/arenaxr/arena-web-core/commit/18b4cf15e11ae5aacfcd97f5ca39f1e38742bf2a))

### [1.3.1](https://github.com/arenaxr/arena-web-core/compare/v1.3.0...v1.3.1) (2022-03-22)


### Bug Fixes

* disable video frustrum caused pose updates to be skipped ([d26b7e6](https://github.com/arenaxr/arena-web-core/commit/d26b7e66b5ec45fc238182d8c816a9505512c6de))

## [1.3.0](https://github.com/arenaxr/arena-web-core/compare/v1.2.0...v1.3.0) (2022-03-20)


### Features

* Add anonymous login url parameter ([52f7dc0](https://github.com/arenaxr/arena-web-core/commit/52f7dc065c1c7dc8c5cc24c194cd78da1a0ccb3b))
* add video culling on/off flag; Default to off ([0086749](https://github.com/arenaxr/arena-web-core/commit/00867497d97eb1af747a1ea651ead031ebb19b6a))
* Enable layer suspension, so that frustum culled video, and distanced audio will actually drop bandwidth ([a83706d](https://github.com/arenaxr/arena-web-core/commit/a83706d7e0f69b90fd57d8aef0cf84eaea5ffefd))
* send local conference stats to remotes ([177ab2f](https://github.com/arenaxr/arena-web-core/commit/177ab2fb654d01cd4150b4eb8b11d1fdbb9a2402))


### Bug Fixes

* ensure anonymous users have a display name ([0a03d09](https://github.com/arenaxr/arena-web-core/commit/0a03d094e06333f9749d4f85735c57d4490c45e7))
* **jitsi:** show remote stats for other users ([#412](https://github.com/arenaxr/arena-web-core/issues/412)) ([a93e518](https://github.com/arenaxr/arena-web-core/commit/a93e518d49eeffc9dab8b4bb3756e96eee8ddbd8))

## [1.2.0](https://github.com/arenaxr/arena-web-core/compare/v1.1.4...v1.2.0) (2022-03-07)


### Features

* Add pose stats display to arena-camera ([a5411d8](https://github.com/arenaxr/arena-web-core/commit/a5411d8aae8f61d9efea22b4de0f2c74e823a892)), closes [#213](https://github.com/arenaxr/arena-web-core/issues/213)


### Bug Fixes

* add thickline to components; fix instantiation issue ([048d133](https://github.com/arenaxr/arena-web-core/commit/048d1331d330ec353bb19b235c98b7c8f0613d74))

### [1.1.4](https://github.com/arenaxr/arena-web-core/compare/v1.1.2...v1.1.4) (2022-02-21)


### Bug Fixes

* apriltag wasm import part 2: namespaced scenes ([c6e0492](https://github.com/arenaxr/arena-web-core/commit/c6e049205a3db44dd1a409ffd92b3accfc3476e1))


# Changelog

### [1.1.2](https://github.com/arenaxr/arena-web-core/compare/v1.1.1...v1.1.2) (2022-02-21)


### Bug Fixes

* apriltag wasm import ([56a5b36](https://github.com/arenaxr/arena-web-core/commit/56a5b367b0dc7414aa58d0c482401cb7f7f402e1))
* case-insensitive match srcLoader img ext's ([e86f16c](https://github.com/arenaxr/arena-web-core/commit/e86f16c5c2a67b13f3481710c43677ccb66d1281))

## [1.1.0](https://github.com/arenaxr/arena-web-core/compare/v1.0.3...v1.1.0) (2022-02-16)


### Features

* Update AFRAME to 1.3.0 ([a6f80b3](https://github.com/arenaxr/arena-web-core/commit/a6f80b32e23ceafe7808afd49cec02c7eddbf86d))
* Add `show-on-enter-ar` component ([8b38ef0](https://github.com/arenaxr/arena-web-core/commit/8b38ef0ffce571f7386d9015737c3f0dfc5d8940))
* Provide `THREE.frustum` from `arena-camera` component ([d57b259](https://github.com/arenaxr/arena-web-core/commit/d57b259a5a285f8a6ae1ce8fd1fda3d4c7998f66))


### Bug Fixes / Workarounds

* Skip AFRAME srcLoader HEAD reqs for img exts ([6d99519](https://github.com/arenaxr/arena-web-core/commit/6d99519a24ca1e6072b0016016d79f3f4deb163e))

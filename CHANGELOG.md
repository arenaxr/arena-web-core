# Changelog

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

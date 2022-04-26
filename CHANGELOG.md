# Changelog

## [1.6.0](https://github.com/conix-center/ARENA-core/compare/v1.4.0...v1.6.0) (2022-04-23)


### Features

* Add anonymous login url parameter ([52f7dc0](https://github.com/conix-center/ARENA-core/commit/52f7dc065c1c7dc8c5cc24c194cd78da1a0ccb3b))
* Add disableVideoCulling flag to scene optionns ([1b95e74](https://github.com/conix-center/ARENA-core/commit/1b95e7404a9ccf91b2bd90210acea26fe8700f66))
* Add pose stats display to arena-camera ([a5411d8](https://github.com/conix-center/ARENA-core/commit/a5411d8aae8f61d9efea22b4de0f2c74e823a892)), closes [#213](https://github.com/conix-center/ARENA-core/issues/213)
* add show-on-enter-ar ([8b38ef0](https://github.com/conix-center/ARENA-core/commit/8b38ef0ffce571f7386d9015737c3f0dfc5d8940))
* add video culling on/off flag; Default to off ([0086749](https://github.com/conix-center/ARENA-core/commit/00867497d97eb1af747a1ea651ead031ebb19b6a))
* **avatar:** Added ability to set multiple custom head models per scene ([#432](https://github.com/conix-center/ARENA-core/issues/432)) ([7dbc378](https://github.com/conix-center/ARENA-core/commit/7dbc378e05e1e0bfab22475651ee0b232fb6bfa0))
* **avatar:** Added custom scene head model ([#425](https://github.com/conix-center/ARENA-core/issues/425)) ([2ac029e](https://github.com/conix-center/ARENA-core/commit/2ac029ed3d5a984f745c39df0ed8ee4d5cf39318))
* **chat:** chat buttons toggle open/close ([8371bf0](https://github.com/conix-center/ARENA-core/commit/8371bf0018999dad14e95bbf26de64126eab7e87))
* **chore:** Update build schema with links and object types ([#435](https://github.com/conix-center/ARENA-core/issues/435)) ([72d07fd](https://github.com/conix-center/ARENA-core/commit/72d07fdd7846c2c6699a3e57c1a733b054cef195))
* Enable layer suspension, so that frustum culled video, and distanced audio will actually drop bandwidth ([a83706d](https://github.com/conix-center/ARENA-core/commit/a83706d7e0f69b90fd57d8aef0cf84eaea5ffefd))
* **filestore:** add filestore copy path link to nav-bar ([ea4a83e](https://github.com/conix-center/ARENA-core/commit/ea4a83e1f18d447a2ae114922fe49d7bdfade239))
* **jitsi:** Add 360 panoramic streaming video sphere ([#427](https://github.com/conix-center/ARENA-core/issues/427)) ([dff4823](https://github.com/conix-center/ARENA-core/commit/dff48237f5ef42355abb475355ee331b4d7ed239))
* **jitsi:** Add full resolution stats to user-list per participant ([#426](https://github.com/conix-center/ARENA-core/issues/426)) ([0ea0f1a](https://github.com/conix-center/ARENA-core/commit/0ea0f1a3ca2608743de7acfa0970ad36f3fedd58))
* **jitsi:** add poor connection avatar icon only for poor connections ([ee9733e](https://github.com/conix-center/ARENA-core/commit/ee9733e79f3cf34613d71c06a5d939b74cfd96d0))
* **jitsi:** add preliminary connection stats to user list ([#388](https://github.com/conix-center/ARENA-core/issues/388)) ([77e5cd2](https://github.com/conix-center/ARENA-core/commit/77e5cd21f5c9619e095a4993fb1031ed7975061f))
* **jitsi:** add quality stats for screenshare and external ([4536a97](https://github.com/conix-center/ARENA-core/commit/4536a976fa340857dc6eb282977e7ba2496154db))
* **jitsi:** Added MQTT Jitsi stats debug logging with urlParam ([e507439](https://github.com/conix-center/ARENA-core/commit/e5074399d5411f3ea8daa35dbf7ab18d0d24a1fb))
* **jitsi:** upgrade lib-jitsi-meet v1420.0.0+53132888 ([22786f3](https://github.com/conix-center/ARENA-core/commit/22786f377b0d3c2f7ba52442200d34b119be84ce))
* move runtime manager codde from seperate repo ([72b5574](https://github.com/conix-center/ARENA-core/commit/72b5574456cf321892b71602c7c00e4420b84211))
* Provide THREE.frustum from arena-camera ([d57b259](https://github.com/conix-center/ARENA-core/commit/d57b259a5a285f8a6ae1ce8fd1fda3d4c7998f66))
* send local conference stats to remotes ([177ab2f](https://github.com/conix-center/ARENA-core/commit/177ab2fb654d01cd4150b4eb8b11d1fdbb9a2402))
* set ar-hit-test opts through sceneOptions ([f092f8b](https://github.com/conix-center/ARENA-core/commit/f092f8b1a14a3f80e524e1a57cf1ec9669ead915))
* **settings:** Added links for Editor and Docs ([3588926](https://github.com/conix-center/ARENA-core/commit/35889260a2b00059f8da0c561165758a400cf532))
* **sound:** Add clientEvents: soundplay, soundpause, soundstop ([#433](https://github.com/conix-center/ARENA-core/issues/433)) ([d313202](https://github.com/conix-center/ARENA-core/commit/d31320230365b34fd5c82410b4c3daf046a23e98))
* **stats:** Add confstats logging of render FPS, RAF, memory ([#431](https://github.com/conix-center/ARENA-core/issues/431)) ([4533bac](https://github.com/conix-center/ARENA-core/commit/4533bac4e0e0358b2b8975f5a1b3c8a6d59ebd7a))
* WebXR lighting estimation for AR ([1af7ea1](https://github.com/conix-center/ARENA-core/commit/1af7ea1d5680f6b84fe36acc23360a2eec6891cc))


### Bug Fixes

* add thickline to components; fix instantiation issue ([048d133](https://github.com/conix-center/ARENA-core/commit/048d1331d330ec353bb19b235c98b7c8f0613d74))
* add uuid js depeendency ([0fe6df8](https://github.com/conix-center/ARENA-core/commit/0fe6df86d1fc2cc4f46eea7ec9b5b3299a460b21))
* apriltag wasm import ([56a5b36](https://github.com/conix-center/ARENA-core/commit/56a5b367b0dc7414aa58d0c482401cb7f7f402e1))
* Arena camerra video culling on/off check ([18b4cf1](https://github.com/conix-center/ARENA-core/commit/18b4cf15e11ae5aacfcd97f5ca39f1e38742bf2a))
* **auth:** fix inherited perms text color, permissions for future build3d ([2abd1e0](https://github.com/conix-center/ARENA-core/commit/2abd1e0173032f4d745dfb568027b68a7c290305))
* **avatar:** keep critical models in arena-core ([cb9dd47](https://github.com/conix-center/ARENA-core/commit/cb9dd47fd30a356db2993e37fc4c73ad3ba6f678))
* **avatar:** load correct scene head mid-scene ([2f1aeaf](https://github.com/conix-center/ARENA-core/commit/2f1aeaf4245ebe6cb82a68ddefc543a9537d5d95))
* Avoid null Jitsi issues ([ab15835](https://github.com/conix-center/ARENA-core/commit/ab158352eadc36bc81fbeb8322a885ec00b98fed))
* better track previously muted/unmuted AV ([52365dc](https://github.com/conix-center/ARENA-core/commit/52365dcc0621552085b1c213eac414663d693057))
* **build:** add missing titles for sceneHeadModels ([1a76e61](https://github.com/conix-center/ARENA-core/commit/1a76e61db01279ed79a638e4a46fd96f82a409ad))
* **build:** add tooltip for edit json button ([5a412b5](https://github.com/conix-center/ARENA-core/commit/5a412b59fe537ae7438dfbf2f87ffbae1ca1f553))
* **build:** decode scene name slash in url ([359f516](https://github.com/conix-center/ARENA-core/commit/359f51696f504034843d206bfb5b4f8dabb3c525))
* **build:** Make schema description URLs linkable ([#438](https://github.com/conix-center/ARENA-core/issues/438)) ([de9ae0b](https://github.com/conix-center/ARENA-core/commit/de9ae0b6bb60b232be79ed07e8a6c4ef795ea82b))
* case-insensitive match srcLoader img ext's ([e86f16c](https://github.com/conix-center/ARENA-core/commit/e86f16c5c2a67b13f3481710c43677ccb66d1281))
* **chat:** 'to' refresh, only update 'to' select for new users ([b403490](https://github.com/conix-center/ARENA-core/commit/b403490d4715246d0c9718e078ae861336b5bcae))
* **chat:** fix initial chat buttons display state ([fd434d3](https://github.com/conix-center/ARENA-core/commit/fd434d3fb853017f296369e0ec7b45af1f5b1e3b))
* **chat:** restore kickout icon ([cd45792](https://github.com/conix-center/ARENA-core/commit/cd4579233d9adc7f2a09783f9bc3797e8c741713))
* client module delete message ([c1ab92f](https://github.com/conix-center/ARENA-core/commit/c1ab92fabf6bff893354ebe07ad00ad79d77b98f))
* disable video frustrum caused pose updates to be skipped ([d26b7e6](https://github.com/conix-center/ARENA-core/commit/d26b7e66b5ec45fc238182d8c816a9505512c6de))
* do not remove audio if Jitsi video fails ([dfa7ef9](https://github.com/conix-center/ARENA-core/commit/dfa7ef9552ea2a5d331e9e8f226f5d285a5120b2))
* dtitle typo ([84e96e3](https://github.com/conix-center/ARENA-core/commit/84e96e30ab9b572da83fa272aae5f68067ec61aa))
* enable frstrum culling by default ([fcc9084](https://github.com/conix-center/ARENA-core/commit/fcc9084267eafc8d490cebfd6d0071a0f94ad8c3))
* ensure anonymous users have a display name ([0a03d09](https://github.com/conix-center/ARENA-core/commit/0a03d094e06333f9749d4f85735c57d4490c45e7))
* get nmodules from children list ([fcc61f6](https://github.com/conix-center/ARENA-core/commit/fcc61f67b66aaaeda301901749b4840aeb8dad67))
* health icon size ([b6eccc6](https://github.com/conix-center/ARENA-core/commit/b6eccc61b7e50ffb7d48a783a022cda5250ca758))
* **icons:** Use .png over .svg for icons for firefox ([e7aa585](https://github.com/conix-center/ARENA-core/commit/e7aa585526fcfed20b9ffd236a78251d6efe854d))
* **jitsi:** show remote stats for other users ([#412](https://github.com/conix-center/ARENA-core/issues/412)) ([a93e518](https://github.com/conix-center/ARENA-core/commit/a93e518d49eeffc9dab8b4bb3756e96eee8ddbd8))
* last will message ([6e47695](https://github.com/conix-center/ARENA-core/commit/6e476955cca06f36e8455ae54cecc0d062a3d961))
* make graph.js type=module ([7c6397c](https://github.com/conix-center/ARENA-core/commit/7c6397c3106838497aa705a8973ead0e21e696fa))
* minor ([659a24c](https://github.com/conix-center/ARENA-core/commit/659a24c1e3216aec25f1cef9757417bf0f83aafb))
* minor edits ([9740f05](https://github.com/conix-center/ARENA-core/commit/9740f05edeec239af48e83fa8666fd5813e34e0e))
* minor edits ([6d9b1a3](https://github.com/conix-center/ARENA-core/commit/6d9b1a358d4ddb30cf0901170aff4fec389a5181))
* minor fixes ([27d24aa](https://github.com/conix-center/ARENA-core/commit/27d24aa96fbee10408ce9029ccdfa1fbc37e960e))
* missing title on gltf-lod build schema ([160949e](https://github.com/conix-center/ARENA-core/commit/160949e9f3930858ac734701fb594e2e9d5d2973))
* **nav-bar:** fixed current page highlight, rework perms ([373c51a](https://github.com/conix-center/ARENA-core/commit/373c51a97e03b602f12db310053716150b4790e3))
* node version ([43bde22](https://github.com/conix-center/ARENA-core/commit/43bde227224763fd59bf60f5e1bcd5b8f51ef4fc))
* pass UTC time in chat msgs ([651d859](https://github.com/conix-center/ARENA-core/commit/651d859fc807277848208e6735da486823bb7eab)), closes [#363](https://github.com/conix-center/ARENA-core/issues/363)
* **physics:** enabling physics selector ([2831fc5](https://github.com/conix-center/ARENA-core/commit/2831fc5abe4b99df6a631265057838287e778904))
* Properly check for Jitsi before restart func ([594e30a](https://github.com/conix-center/ARENA-core/commit/594e30adb863a86d0eb43f377e95fb709a7e09e2))
* re-order headmodel dynamic-body after model ([38f873d](https://github.com/conix-center/ARENA-core/commit/38f873dfc3bd68abe7b4bbc8a0a292925288b45c))
* remove old runtime mngr code ([5e54b67](https://github.com/conix-center/ARENA-core/commit/5e54b674e019f7586bb8a5e851a2acf85bd70f7f))
* runtime name uses idTag ([e062014](https://github.com/conix-center/ARENA-core/commit/e062014eb1428fb34264dda865018acbcf1bdbe0))
* runtime name uses idTag ([fb527a3](https://github.com/conix-center/ARENA-core/commit/fb527a3d08ddcf7187e5e8b97316079126bd936c))
* scene features typo ([af6dc2e](https://github.com/conix-center/ARENA-core/commit/af6dc2e062e9a105935b98c7d4167532f4be0ba0))
* skip AFRAME srcLoader HEAD reqs for img exts ([6d99519](https://github.com/conix-center/ARENA-core/commit/6d99519a24ca1e6072b0016016d79f3f4deb163e))
* **store:** fixed missing content at bottom of store frame ([04a21c0](https://github.com/conix-center/ARENA-core/commit/04a21c0ab6826c9bffac7d21428579b92dac5cef))
* **store:** fixed missing content at bottom of store frame ([0a1dc98](https://github.com/conix-center/ARENA-core/commit/0a1dc98a18f2e287e9fe5db0dfc7a6246f70094e))
* **store:** fixed missing content at bottom of store frame ([be2fa39](https://github.com/conix-center/ARENA-core/commit/be2fa39908dc1dead35f6177a44b67ef28b032f1))
* typo in cornerVideo selector ([294f5f9](https://github.com/conix-center/ARENA-core/commit/294f5f9293284fb260d7d3f343b340b436726586))
* Update apriltag publish topic w/ namespace ([f557c57](https://github.com/conix-center/ARENA-core/commit/f557c576da9d50cecbd215e4487d7d90597b6678))
* update arts viz connection string ([3b9f43a](https://github.com/conix-center/ARENA-core/commit/3b9f43a19683abd5a4167e94cab035d9c4756d45))
* update to new runtime manageer code ([dadf773](https://github.com/conix-center/ARENA-core/commit/dadf773376f7b97defafd6a64f4b02e3eb446366))
* update webrtc test link ([fa55807](https://github.com/conix-center/ARENA-core/commit/fa5580731c4815a28b845aabfc8f5c705c22b94e))
* validate topic position for clientevent source ([dcea0bc](https://github.com/conix-center/ARENA-core/commit/dcea0bc0c97c2d84bcd906764987a2d9ac592219))
* Version and hash on docker build ([31dbf7c](https://github.com/conix-center/ARENA-core/commit/31dbf7c23db21deceaa680f40b6254e7c0587414))
* video frustum culling handling ([4eca471](https://github.com/conix-center/ARENA-core/commit/4eca4715a95faceade7ede3ec4741b76fe5eda9f))


### Reverts

* background light-estimate pending AFRAME fix ([dcbec36](https://github.com/conix-center/ARENA-core/commit/dcbec36cb5c302260995fa9fcc077c370abb58e4))

## [1.4.0](https://github.com/conix-center/ARENA-core/compare/v1.3.2...v1.4.0) (2022-04-07)


### Features

* Add disableVideoCulling flag to scene optionns ([1b95e74](https://github.com/conix-center/ARENA-core/commit/1b95e7404a9ccf91b2bd90210acea26fe8700f66))
* **avatar:** Added ability to set multiple custom head models per scene ([#432](https://github.com/conix-center/ARENA-core/issues/432)) ([7dbc378](https://github.com/conix-center/ARENA-core/commit/7dbc378e05e1e0bfab22475651ee0b232fb6bfa0))
* **avatar:** Added custom scene head model ([#425](https://github.com/conix-center/ARENA-core/issues/425)) ([2ac029e](https://github.com/conix-center/ARENA-core/commit/2ac029ed3d5a984f745c39df0ed8ee4d5cf39318))
* **jitsi:** Add 360 panoramic streaming video sphere ([#427](https://github.com/conix-center/ARENA-core/issues/427)) ([dff4823](https://github.com/conix-center/ARENA-core/commit/dff48237f5ef42355abb475355ee331b4d7ed239))
* **jitsi:** Add full resolution stats to user-list per participant ([#426](https://github.com/conix-center/ARENA-core/issues/426)) ([0ea0f1a](https://github.com/conix-center/ARENA-core/commit/0ea0f1a3ca2608743de7acfa0970ad36f3fedd58))
* **jitsi:** add quality stats for screenshare and external ([4536a97](https://github.com/conix-center/ARENA-core/commit/4536a976fa340857dc6eb282977e7ba2496154db))
* **jitsi:** Added MQTT Jitsi stats debug logging with urlParam ([e507439](https://github.com/conix-center/ARENA-core/commit/e5074399d5411f3ea8daa35dbf7ab18d0d24a1fb))
* **settings:** Added links for Editor and Docs ([3588926](https://github.com/conix-center/ARENA-core/commit/35889260a2b00059f8da0c561165758a400cf532))
* **sound:** Add clientEvents: soundplay, soundpause, soundstop ([#433](https://github.com/conix-center/ARENA-core/issues/433)) ([d313202](https://github.com/conix-center/ARENA-core/commit/d31320230365b34fd5c82410b4c3daf046a23e98))
* **stats:** Add confstats logging of render FPS, RAF, memory ([#431](https://github.com/conix-center/ARENA-core/issues/431)) ([4533bac](https://github.com/conix-center/ARENA-core/commit/4533bac4e0e0358b2b8975f5a1b3c8a6d59ebd7a))


### Bug Fixes

* **avatar:** load correct scene head mid-scene ([2f1aeaf](https://github.com/conix-center/ARENA-core/commit/2f1aeaf4245ebe6cb82a68ddefc543a9537d5d95))
* **chat:** 'to' refresh, only update 'to' select for new users ([b403490](https://github.com/conix-center/ARENA-core/commit/b403490d4715246d0c9718e078ae861336b5bcae))
* dtitle typo ([84e96e3](https://github.com/conix-center/ARENA-core/commit/84e96e30ab9b572da83fa272aae5f68067ec61aa))
* enable frstrum culling by default ([fcc9084](https://github.com/conix-center/ARENA-core/commit/fcc9084267eafc8d490cebfd6d0071a0f94ad8c3))
* minor ([659a24c](https://github.com/conix-center/ARENA-core/commit/659a24c1e3216aec25f1cef9757417bf0f83aafb))
* update arts viz connection string ([3b9f43a](https://github.com/conix-center/ARENA-core/commit/3b9f43a19683abd5a4167e94cab035d9c4756d45))
* update webrtc test link ([fa55807](https://github.com/conix-center/ARENA-core/commit/fa5580731c4815a28b845aabfc8f5c705c22b94e))
* video frustum culling handling ([4eca471](https://github.com/conix-center/ARENA-core/commit/4eca4715a95faceade7ede3ec4741b76fe5eda9f))

### [1.3.2](https://github.com/conix-center/ARENA-core/compare/v1.3.1...v1.3.2) (2022-03-23)


### Bug Fixes

* Arena camerra video culling on/off check ([18b4cf1](https://github.com/conix-center/ARENA-core/commit/18b4cf15e11ae5aacfcd97f5ca39f1e38742bf2a))

### [1.3.1](https://github.com/conix-center/ARENA-core/compare/v1.3.0...v1.3.1) (2022-03-22)


### Bug Fixes

* disable video frustrum caused pose updates to be skipped ([d26b7e6](https://github.com/conix-center/ARENA-core/commit/d26b7e66b5ec45fc238182d8c816a9505512c6de))

## [1.3.0](https://github.com/conix-center/ARENA-core/compare/v1.2.0...v1.3.0) (2022-03-20)


### Features

* Add anonymous login url parameter ([52f7dc0](https://github.com/conix-center/ARENA-core/commit/52f7dc065c1c7dc8c5cc24c194cd78da1a0ccb3b))
* add video culling on/off flag; Default to off ([0086749](https://github.com/conix-center/ARENA-core/commit/00867497d97eb1af747a1ea651ead031ebb19b6a))
* Enable layer suspension, so that frustum culled video, and distanced audio will actually drop bandwidth ([a83706d](https://github.com/conix-center/ARENA-core/commit/a83706d7e0f69b90fd57d8aef0cf84eaea5ffefd))
* send local conference stats to remotes ([177ab2f](https://github.com/conix-center/ARENA-core/commit/177ab2fb654d01cd4150b4eb8b11d1fdbb9a2402))


### Bug Fixes

* ensure anonymous users have a display name ([0a03d09](https://github.com/conix-center/ARENA-core/commit/0a03d094e06333f9749d4f85735c57d4490c45e7))
* **jitsi:** show remote stats for other users ([#412](https://github.com/conix-center/ARENA-core/issues/412)) ([a93e518](https://github.com/conix-center/ARENA-core/commit/a93e518d49eeffc9dab8b4bb3756e96eee8ddbd8))

## [1.2.0](https://github.com/conix-center/ARENA-core/compare/v1.1.4...v1.2.0) (2022-03-07)


### Features

* Add pose stats display to arena-camera ([a5411d8](https://github.com/conix-center/ARENA-core/commit/a5411d8aae8f61d9efea22b4de0f2c74e823a892)), closes [#213](https://github.com/conix-center/ARENA-core/issues/213)


### Bug Fixes

* add thickline to components; fix instantiation issue ([048d133](https://github.com/conix-center/ARENA-core/commit/048d1331d330ec353bb19b235c98b7c8f0613d74))

### [1.1.4](https://github.com/conix-center/ARENA-core/compare/v1.1.2...v1.1.4) (2022-02-21)


### Bug Fixes

* apriltag wasm import part 2: namespaced scenes ([c6e0492](https://github.com/conix-center/ARENA-core/commit/c6e049205a3db44dd1a409ffd92b3accfc3476e1))


# Changelog

### [1.1.2](https://github.com/conix-center/ARENA-core/compare/v1.1.1...v1.1.2) (2022-02-21)


### Bug Fixes

* apriltag wasm import ([56a5b36](https://github.com/conix-center/ARENA-core/commit/56a5b367b0dc7414aa58d0c482401cb7f7f402e1))
* case-insensitive match srcLoader img ext's ([e86f16c](https://github.com/conix-center/ARENA-core/commit/e86f16c5c2a67b13f3481710c43677ccb66d1281))

## [1.1.0](https://github.com/conix-center/ARENA-core/compare/v1.0.3...v1.1.0) (2022-02-16)


### Features

* Update AFRAME to 1.3.0 ([a6f80b3](https://github.com/conix-center/ARENA-core/commit/a6f80b32e23ceafe7808afd49cec02c7eddbf86d))
* Add `show-on-enter-ar` component ([8b38ef0](https://github.com/conix-center/ARENA-core/commit/8b38ef0ffce571f7386d9015737c3f0dfc5d8940))
* Provide `THREE.frustum` from `arena-camera` component ([d57b259](https://github.com/conix-center/ARENA-core/commit/d57b259a5a285f8a6ae1ce8fd1fda3d4c7998f66))


### Bug Fixes / Workarounds

* Skip AFRAME srcLoader HEAD reqs for img exts ([6d99519](https://github.com/conix-center/ARENA-core/commit/6d99519a24ca1e6072b0016016d79f3f4deb163e))

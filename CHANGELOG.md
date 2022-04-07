# Changelog

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

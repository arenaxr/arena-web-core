
<p align="center"> <img alt="" src="images/xr-logo.png" width="150px"> </p>
<h2 align="center">ARENA browser client (ARENA-core)</h2>
<p align="center"><b>An environment to view and interact in multiuser virtual and augmented reality</b></p>


| <img alt="" src="images/a1.gif">         | <img alt="" src="images/a2.gif">         |
|------------------------------------------|------------------------------------------|
| <img alt="" src="images/a3.gif">         | <img alt="" src="images/a4.gif">         |

The [ARENA](conix.io/arena) is a platform for supporting real-time mixed reality (XR) interaction between multiple users and the physical world. 

This repository contains the ARENA browser client code, which allows to view and interact in multiuser virtual and augmented reality. It was built using frameworks for 3D scenes and XR environments (notably, [A-Frame](https://aframe.io/) and  [three.js](https://threejs.org/), and can be used with any platform supporting a WebXR-capable browser (e.g. most desktop/laptops, iPads, iPhones, Android ARCore-enabled devices, Oculus Quest, Vive, Microsoft Hololens and many other).

The ARENA browser client uses a [publish/subscribe system](https://mqtt.org/) to allow users and programs to colaborate and takes advantage of [Jitsi](https://jitsi.org/) to support video conferencing in a 3D environment. We also leverage WASM‘s availability in all major browsers and other platforms outside the browser to execute distributed XR applications (the browser runtime source is [here](https://github.com/conix-center/arena-runtime-browser)).

## Documentation
The main ARENA documentation is here: [https://arena.conix.io/](https://arena.conix.io/).

- [Quick Start for users](https://arena.conix.io/content/tutorials/).
- [Quick Start for developers](https://arena.conix.io/content/tutorials/dev-guide.html).

## Installation

Most users will want to use an already deployed ARENA. If you want to setup you own indepent ARENA stack, you can use our [docker compose setup](https://github.com/conix-center/arena-services-docker).

## License

See the [LICENSE](LICENSE) file.

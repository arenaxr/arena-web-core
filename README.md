# ARENA
The ARENA is a platform for supporting real-time mixed reality (XR) interaction between multiple users and the physical world. It is a network-transparent runtime system that uses web-based technologies to host independent applications that can be accessed simultaneously by multiple users.

This repository contains the code for the ARENA browser client, an environment to view and interact in virtual and augmented reality. This environment was built using Web standards (notably, [WebXR](https://www.w3.org/TR/webxr/) and [WebGL](https://www.khronos.org/webgl/)) and frameworks for building 3D scenes and XR environments ([three.js](https://threejs.org/) and [A-Frame](https://aframe.io/)).

We also take advantage of WASM‘s availability in all major browsers and other platforms outside the browser to execute distributed XR applications (the browser runtime source is [here](https://github.com/conix-center/arena-runtime-browser)).

# Examples

  ![smiley](mages/a1.gif){:height="190px" width="49%"}.
  ![smiley](mages/a2.gif){:height="190px" width="49%"}.
  ![smiley](mages/a3.gif){:height="190px" width="49%"}.
  ![smiley](mages/a4.gif){:height="190px" width="49%"}.
  
## Documentation
The main ARENA documentation here: [https://arena.conix.io/](https://arena.conix.io/).

## Installation

Most users will want to use an already deployed ARENA. If you want to setup you own indepent ARENA stack, you can use our [docker compose setup](https://github.com/conix-center/arena-services-docker).

## License

See the [LICENSE](LICENSE) file.
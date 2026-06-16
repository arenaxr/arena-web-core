# Agent Guide

Orientation for agents (and humans) working in this repo. Detailed docs live in the files below — this file is just the index.

## Start here
- [README.md](README.md) — what ARENA Web Core is: a browser client (A-Frame / three.js) for multiuser virtual and augmented reality interaction.
- [REQUIREMENTS.md](REQUIREMENTS.md) — machine- and human-readable reference for features, architecture, and source layout.

## Conventions & development rules
- [CONTRIBUTING.md](CONTRIBUTING.md) — mandatory rules for all contributors, **including agents**: MQTT topic construction, A-Frame component conventions, and development rules.

## Release history
- [CHANGELOG.md](CHANGELOG.md) — generated release history (release-please; Conventional Commits).

## Architecture & internals
- [src/systems/README.md](src/systems/README.md) — API reference for all A-Frame systems (modules) supporting ARENA core functionality.
- [src/systems/build3d/BUILD3D_ARCHITECTURE.md](src/systems/build3d/BUILD3D_ARCHITECTURE.md) — Build3D architecture: real-time translation layer between the A-Frame Inspector and the ARENA MQTT backend.
- [src/systems/face-tracking/README.md](src/systems/face-tracking/README.md) — face detection and tracking system (landmark annotations, JSON format).

## Components
- [src/components/README.md](src/components/README.md) — API reference for all A-Frame components (modules) supporting ARENA core functionality.
- [src/components/thickline/README.md](src/components/thickline/README.md) — thick line component based on THREE.MeshLine.

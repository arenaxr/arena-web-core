## aframe-meshline-component

A component for thick lines in [A-Frame](https://aframe.io).

The component is based on the A-frame component tutorial and [THREE.MeshLine](https://github.com/spite/THREE.MeshLine).

Here is the adapted [smiley face example](https://rawgit.com/andreasplesch/aframe-meshline-component/master/examples/basic/index.html).


### Properties

| Property | Description | Default Value |
| -------- | ----------- | ------------- |
|    path      |    line coordinates         |    -0.5 0 0, 0.5 0 0           |
| lineWidth | width of line in px | 10 |
| lineWidthStyler | width(p) function | 1 |
| color | line color | #000 |

### Usage

#### Properties

The path, lineWidth and color properties do what you would expect. The lineWidthStyler property needs an explanation, however.

##### lineWidthStyler

The lineWidthStyler property allows for defining the line width as a function of relative position p along the path of the line. By default it is set to a constant 1. The final, rendered width is scaled by lineWidth. You can use p in your function definition. It varies from 0 at the first vertex of the path to 1 at the last vertex of the path. Here are some examples:

| lineWidthStyler value | effect |
| --------------------- | ------ |
| p | taper from nothing to lineWidth at the end |
| 1 - p | taper from lineWidth to nothing at the end |
| 1 - Math.abs(2 * p - 1) | taper to lineWidth at the center from both sides |
| Math.sin( p * 3.1415 ) | smoothly bulge to lineWidth at the center from both sides |
| 0.5 + 0.5 * Math.sin( (p - 0.5) * 2 * 3.1415 * 10 ) | full wave every 10 vertices with lineWidth amplitude |

Use only one expression, and only 'p' as a variable.

Technically, the provided function string is the return argument of a constructed function. It is therefore possible to intentionally do something like 'THREE = null' which will break the scene. As a scene designer, it is thus necessary to be careful about exposing this property to page visitors.
 
#### Browser Installation

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://aframe.io/releases/1.0.4/aframe.min.js"></script>
  <script src="https://raw.githack.com/andreasplesch/aframe-meshline-component/master/dist/aframe-meshline-component.min.js"></script>
</head>

<body>
  <a-scene>
    <a-entity meshline="lineWidth: 20; path: -2 -1 0, 0 -2 0, 2 -1; color: #E20049"></a-entity>
  </a-scene>
</body>
```

#### NPM Installation

Install via NPM:

```bash
npm install aframe-meshline-component
```

Then register and use.

```js
require('aframe');
require('aframe-meshline-component');
```

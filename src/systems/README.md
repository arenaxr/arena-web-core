# A-Frame systems (modules) added to support ARENA core functionality

## Modules

<dl>
<dt><a href="#module_attribution-system">attribution-system</a></dt>
<dd><p>Attribution Component/System. Add attribution message to any entity.
Tries to extract author, license, source and title (assuming format used in sketchfab downloaded models)</p>
<p>Looks for authorship metadata in both asset.extras (sketchfab models) and scene.extra (manually added attributes in blender).
If both asset.extras and scene.extra exist, gives preference to asset.extras.</p>
</dd>
<dt><a href="#module_screenshareable">screenshareable</a></dt>
<dd><p>Screenshare-able System. Allows an object to be screenshared upon</p>
</dd>
</dl>

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
    * [extractAttributionFromGtlfAsset(el, gltfComponent)](#exp_module_attribution-system--extractAttributionFromGtlfAsset) ⏏
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
<a name="exp_module_attribution-system--extractAttributionFromGtlfAsset"></a>

### extractAttributionFromGtlfAsset(el, gltfComponent) ⏏
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


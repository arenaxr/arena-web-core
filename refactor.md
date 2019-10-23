#### Scratch document for talking about ARENA refactor

### onMessageArrived(message) algorithm

  1. Message arrives, this function gets called with 2 parts: message.destinationName (topic) and message.payloadString.  
  -> We plan to no longer use the topic but rather read directly from the message the 'type' of message it is, & what to do.
  2. Prototype ARENA parses destinationName (topic) to decide among 3 types of message:
      - MultiProperty : set a nested attribute like 'material.color'  
        parse 4 variables: sceneObject/entity element, property, sub-property, value (payload)
  call `AFRAME.utils.entity.setComponentProperty(element, property.subproperty, attribute)`
      - SingleComponent: set a single attribute
  parse 3 variables: sceneObject/entity element, component-name, value (payload)  
  HACK: camera updates fall in this category -> refactor can parse & handle more explicitly  
  HACK: if attribute is CSS syntax, e.g. `"x:1; y:2; z:3;"`, simply call A-Frame's `AFRAME.utils.styleParser.parse(value)`
  otherwise, handle lots of special case messages
        - mousedown - emit synthetic mouse event
        - mouseup - same
        - child / parent relationship setting - somewhat quirkily need to clone new child & reparent it.  
          This should be handled elsewhere & more explicitly
        - dynamic-body physics setting (bug: when we enable this, object flies off to infinity)
        - default case
        simply call `entity.setAttribute(component-name, value)`
      - AtomicUpdate: simplest 'primitive' case: all parameters are provided  
        parse location x,y,z, rotation x,y,z,w, scale x,y,z, value (payload), on/off
        parse 'type' of object based on object name being comprised of e.g. class_id e.g `cube_3` or `gltf-model_er1k`
        - delete object entirely (zero length payload)
        - ignore messages about our own camera, controllers
        - map geometric primitive names from Unity: "cube"->"box", "quad"->"plane"
        - camera message: create rig (deprecated), 3d head model, text above head based on camera id = person id
      Switch based on class:
        - lights: parse color from payload
        - camera: do nothing
        - controllers: do nothing
        - image: parse image URL from payload
        - line: parse start/end endpoints, set color from payload
        - thickline: parse thickness, color, endpoints
        - particle: just create empty A-Frame entity, separate message uses payload to set single-attribute: we can do this all together now
        - gltf-model: parse model URL from payload, set scale
        - text: create child "a-text" node, parse & set text from payload
        - default: geometry primitive, parse color and set material.color attribute, scale, primitive type

#### Scratch document for talking about ARENA refactor

### onMessageArrived(message) algorithm

  1. Message arrives, this function gets called with 2 parts: message.destinationName (topic) and message.payloadString.  
  -> We plan to no longer use the topic but rather read directly from the message the 'type' of message it is, & what to do.
  2. Prototype ARENA parses destinationName (topic) to decide among 3 types of message:
      - MultiProperty : set a nested attribute like 'material.color'  
        parse 4 variables: sceneObject/entity element, property, sub-property, value (payload)
  call `AFRAME.utils.entity.setComponentProperty(element, property.subproperty, attribute)`
      - SingleComponent: set a single attribute
  prase 3 variables: sceneObject/entity element, component-name, value (payload)  
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
      - AtomicUpdate: simplest 'primitive' case: all parameters are provided: 
          location x,y,z, rotation x,y,z,w, scale x,y,z, value (payload), on/off
        - special case: delete object entirely (zero length payload)
        - special case: ignore messages about our own camera, controllers
        - map geometric primitive names from Unity: "cube"->"box", "quad"->"plane"
     

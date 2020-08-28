//aframe multisrc component

AFRAME.registerComponent('multisrc', {
  
  dependencies: ['material'],
      
  schema: {
      srcs: {
          default: [],
          parse: function (value) {
              if ( value.length == 0 ){
                return ''
              }
              else{
                return value.split(',');
              }
          }
      },
      srcspath: {type: 'string', default: ''},
  },//end schema

  init: function () {
      
      //get the number of 'sides' (groups) of the shape this is attached to
      this.sides = this.el.getObject3D('mesh').geometry.groups.length

      //make new materials and add them to array
      this.makeMaterials();
      
      //style the new materials by inheriting from default material component
      this.styleMaterials();

      //update the mesh with new materials array
      this.el.getObject3D('mesh').material = this.materials
    
      //set up listeners for changes in default material
      this.materialListener();
      
  },//end init
  
  makeMaterials: function() {
      
      //make an empty array to load some new materials into
      this.materials = []
  
      //get the number of sides of the geometry make a separate material for each
      for(i=0;i<this.sides;i++){

        //add plain new material to array, give it a unique name
        this.materials.push( new THREE.MeshStandardMaterial({ name: 'material-' + i + ''}) )

      }//end for images loop
  
  },//end makeMaterials
  
  update: function (){
    
      this.parseSrcs();

      this.addTextures();
      
  },//end update
  
  parseSrcs: function(){
  
      //tidy up input from srcs
      // - video or image?, inline URL or id to asset?, all 'srcs' or 'src1' 'src2'? etc
      //make an array of objects with clean data
      
      //make an empty array to store objects
      this.textures = []
            
      //populate with objects for each
      for (i=0;i<this.sides;i++){   
        //choose attribute to use, 'srcs' or 'src1','src2' etc. can't use both 
        var which;
        if ( this.data.srcs == '' ){
          which = this.data['src'+i]
        }
        else{
          which = this.data.srcs[i]
        }
        //add empty objects
        this.textures.push({})
        //add a src+index identifier for each
        this.textures[i].srcIndex = "src"+i
        //add a url for each
        this.textures[i].url = srcCheck(this.data, which, i).url
        //add a type for each
        this.textures[i].type = srcCheck(this.data, which, i).type
        //add an inline ref for each, need this for videos
        this.textures[i].srcInline = srcCheck(this.data, which, i).inline
        //if there's an id ref to assets tag, store, again for videos
        this.textures[i].assetId = srcCheck(this.data, which, i).assetId
      }

      function srcCheck(data, which, i){  
        
        //inline or reference, image or video, 'srcs' attribute or 'src1' 'src2' etc.

        var src = which
        
        //if one doesn't exist, don't break, just have empty values
        if (typeof src === 'undefined' || src == ''){
          url = ''
          type = ''
          inline = ''
          assetId = ''
        }
        
        else{
          
          var asset;
          var url;
          var type;
          var inline;
          var assetId;

          //if its not a preloaded asset, its an inline url so get that
          if ( document.getElementById( src.replace('#','') ) === null ){ 
            asset = src
            inline = true
          }
          //otherwise its a preloaded asset so get the src from tag
          else{
            assetId = src
            asset = document.getElementById( src.replace('#','') ).src
            inline = false
          }
          //combine asset string with srcpath to make url
          url = data.srcspath+asset

          //check type, image or video
          //check if its an image or video
          if ( url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') ){ 
            type = 'image'
          }
          else{
            type = 'video'
          }
        }//end else of is src defined

        return {
          url: url,
          type: type,
          inline: inline,
          assetId: assetId,
        }//end return
        
      }//end srcCheck
    
  },//end parseSrcs
  
  addTextures: function(){
      
      //loop through all textures and apply as defined
      for(i=0;i<this.textures.length;i++){
        
          //each texture
          var texture = this.textures[i]
          
          //get each material to update map
          var material = this.materials[i]

          //if the texture has no image/video assigned, undo any changes that have been made
          if ( texture.url == '' ){
            
            material.map = null
            material.needsUpdate = true;
            
          }

          //else update the material map with image/video
          else{

            //if its an image
            if ( texture.type == 'image' ){

              //make a 3js loader for image textures
              var loader = new THREE.TextureLoader();

              //give each material the image asset
              material.map = loader.load(texture.url)
              material.needsUpdate = true;

            }//end if its an image

            //else its a video, need to do a bit more
            else{
              
              var video;
              //if its an inline src
              if ( texture.srcInline ){ 
                video = document.createElement('video')
                video.src = texture.url
                video.crossOrigin = 'anonymous';
                video.loop = true;
                video.preload = 'auto';
                video.load();
                video.play(); 
              }
              //otherwise its an asset 
              else{
                video = document.getElementById( texture.assetId.replace('#','') )
                video.src = texture.url
                video.load();
              }//end else its an asset
              
              //in any case..
              var videoTexture = new THREE.VideoTexture(video);
              videoTexture.needsUpdate;
              videoTexture.minFilter = THREE.LinearFilter;
              videoTexture.magFilter = THREE.LinearFilter;
              videoTexture.format = THREE.RGBFormat;
              material.map = videoTexture
              material.needsUpdate = true;

            }//end it its a video
            
          }//end else texture has video/image assigned
        
      }//end for textures
    
  },//end addTextures
  
  materialListener: function() {
      
      //to listen for changes in components attached to parent entity
      //Note: default components, position, scale, rotation, visible, do not fire componentchanged unless they are specified as attributes on the entity
      //not an issue here as we are only looking for changes to material which always seems to fire, maybe because we have a dependency?
      
      var self = this //can't get this inside eventListener
      
      //if componentchange is for material, run styleMaterials
      this.compChange = function (evt) {
        
          //if the material is being changed by an animation, reduce throttle to keep up with changes and styleMaterials
          if ( evt.detail.name == 'material' && this.isAnimating ){
            self.reduceMaterialChangedThrottle(0);
            self.styleMaterials();
          }
          //else if the material is being changed without animation
          else if( evt.detail.name == 'material' ){
            self.styleMaterials();
          }
          else{
            //may not always fire, see above
          }
         
      }//end compChange
      
      //check for component changes and then run the above compchange function
      this.el.addEventListener('componentchanged', this.compChange);
    
      //handling changes to animation, need to dethrotle componentchange event to keep up, but put back when animation is over
    
      //store a default state
      this.isAnimating = false
      //keep a count of how many are going on at once, to handle events on multiple animations
      this.animationCount = 0
    
      //add another listener here for animationbegin
      this.materialChangedByAnimation = function (evt) {
        
        //if an animation has begun set isAnimating to true so that dethrottle can then be activated in componentchanged, also add an animation to animationCount
        if ( evt.type == 'animationbegin' || evt.type == 'animationstart' ){
          this.isAnimating = true
          self.animationCount++
        }
        //else if its ended (animationcomplete) set it to false and put throttle back to its original state for performance
        else if ( evt.type == 'animationcomplete' || evt.type == 'animationend' ){
          this.isAnimating = false
          self.animationCount--
          //once there are no animations running, throtle again
          if ( self.animationCount == 0  ){
            self.reduceMaterialChangedThrottle(200);
          }
          //for animation component only
          //workaround animationcomplete bug suggested here
          //https://github.com/ngokevin/kframe/issues/137#issuecomment-398907856
          //reset the animation - seems to work!
          if ( evt.type == 'animationcomplete' ){
            self.el.components[evt.detail.name].animation.reset();
          }
          
        }
        
      }
      
      //make an array of animation events 
      //a mix of animation component events and <a-animation> events to handle both
      var animationEventsArray = ['animationbegin', 'animationstart', 'animationcomplete', 'animationend']
      
      //attach them all to listen for each
      animationEventsArray.forEach(function(event) {
        self.el.addEventListener(event, self.materialChangedByAnimation)
      });
    
  },//end materialListener
  
  styleMaterials: function(){
    
      //to inherit changes from material component
    
      //get attached material component styles to copy
      var styles = this.el.components.material.material  
      
      //get number of sides and loop through them
      for(i=0;i<this.sides;i++){
    
        //get each material
        var material = this.materials[i]
        
          //get the difference between default material and our material
          var a = material
          var b = styles
          var diff = AFRAME.utils.diff (a, b)

            //use the different styles to style the materials unless it is the uuid, map or name 
            for (var key in diff) {
                if (material.hasOwnProperty(key)) {

                    //if its the uuid, map or name don't copy
                    if ( key == 'uuid' || key == 'map' || key == 'name' ){
                    }
                    //else copy it over
                    else{
                      material[key] = styles[key]
                    }

                }//end if has own property
            }//end for keys in data
        
      }//end for images loop
  
  },//end styleMaterials
  
  granularChange: function (materialIndex) {
      
      //get and return a specific material/side for styling individually - advanced
      var material = this.el.getObject3D('mesh').material[materialIndex]
      return material
    
  },//end granularChange
  
  reduceMaterialChangedThrottle: function(throttle){
  
      //change throttle on material componentchanged so as to update quickly enough for animations, from 200 to 0
      var material = this.el.components.material
      
      material.throttledEmitComponentChanged = AFRAME.utils.throttle(function emitChange () { 
        material.el.emit('componentchanged', material.evtDetail, false); 
      }, throttle);

  },//end reduceMaterialChangedThrottle:
  
  updateSchema: function () {
        
        //update schema with an attribute for each individual side of attached geometry
    
        //have to get the sides afresh as this is run before init
        var sides = this.el.getObject3D('mesh').geometry.groups.length  
        var newSchema = {}
        for (i = 0; i < sides; i++){
            newSchema["src"+i] = {type: 'string', default: ''};
        }
        this.extendSchema(newSchema);
  },//end updateSchema
  
  remove: function(){
    
    //removes this multimaterial from mesh, adds the default material back on, removes event listeners and puts material componentchanged throttle back to normal if necessary
    
    //get the default material
    var defaultMaterial = this.el.components.material.material 
    
    //update the mesh with default material
    this.el.getObject3D('mesh').material = defaultMaterial
    
    //remove componentchanged eventlistener
    this.el.removeEventListener('componentchanged', this.compChange);
    
    //removes all animation event listeners at once
    var animationEventsArray = ['animationbegin', 'animationstart', 'animationcomplete', 'animationend']
    animationEventsArray.forEach(function(event) {
      this.el.addEventListener(event, this.materialChangedByAnimation)
    });
    
    //put component changed throttle back to normal (in case it was removed while animating)
    this.reduceMaterialChangedThrottle(200);
    
  },//end remove

});//end multisrc
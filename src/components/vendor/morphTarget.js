AFRAME.registerComponent(
    'gltf-morph',
    {
	multiple:true,
	schema:{morphtarget:{type:'string',default:''},
		value:{type:'number',default:0},},
	init:function(){
	    this.el.addEventListener('object3dset',()=>{this.morpher()});},update:function(){
		this.morpher()},morpher:function(){
		    var mesh=this.el.object3D
		    mesh.traverse((o)=>{
			if(o.morphTargetInfluences&&o.userData.targetNames){
			    var pos=o.userData.targetNames.indexOf(this.data.morphtarget);
			    o.morphTargetInfluences[pos]=this.data.value}});
		},
    }
)

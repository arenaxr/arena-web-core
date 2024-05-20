export interface URDFCollider extends THREE.Object3D {

    isURDFCollider: true;
    urdfNode: Element | null;

}

export interface URDFVisual extends THREE.Object3D {

    isURDFVisual: true;
    urdfNode: Element | null;

}

export interface URDFLink extends THREE.Object3D {

    isURDFLink: true;
    urdfNode: Element | null;

}

export interface URDFJoint extends THREE.Object3D {

    isURDFJoint: true;

    urdfNode: Element | null;
    axis: THREE.Vector3;
    jointType: 'fixed' | 'continuous' | 'revolute' | 'planar' | 'prismatic' | 'floating';
    angle: Number;
    jointValue: Number[];
    limit: { lower: Number, upper: Number }; // TODO: add more
    ignoreLimits: Boolean;
    mimicJoints: URDFMimicJoint[];

    setJointValue(...values: (number | null)[]): boolean;

}

export interface URDFMimicJoint extends URDFJoint {

    mimicJoint : String;
    offset: Number;
    multiplier: Number;

}

export interface URDFRobot extends URDFLink {

    isURDFRobot: true;

    urdfRobotNode: Element | null;
    robotName: string;

    links: { [ key: string ]: URDFLink };
    joints: { [ key: string ]: URDFJoint };
    colliders: { [ key: string ]: URDFCollider };
    visual: { [ key: string ]: URDFVisual };
    frames: { [ key: string ]: THREE.Object3D };

    setJointValue(jointName: String, value0: Number, value1?: Number, value2?: Number): boolean;
    setJointValues(values: { [ key: string ]: Number | Number[] }): boolean;
    getFrame(name: String): THREE.Object3D;

}

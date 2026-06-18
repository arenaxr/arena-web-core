import { URDFRobot } from './URDFClasses';

interface MeshLoadDoneFunc {
    (mesh: THREE.Object3D, err?: Error): void;
}

interface MeshLoadFunc{
    (url: string, manager: THREE.LoadingManager, onLoad: MeshLoadDoneFunc): void;
}

export default class URDFLoader {

    manager: THREE.LoadingManager;
    defaultMeshLoader: MeshLoadFunc;

    // options
    fetchOptions: Object;
    workingPath: string;
    parseVisual: boolean;
    parseCollision: boolean;
    packages: string | { [key: string]: string } | ((targetPkg: string) => string);
    loadMeshCb: MeshLoadFunc;

    constructor(manager?: THREE.LoadingManager);
    load(
        url: string,
        onLoad: (robot: URDFRobot) => void,
        onProgress?: (progress?: any) => void,
        onError?: (err?: any) => void
    ): void;
    parse(content: string | Element | Document): URDFRobot;

}

export * from './URDFClasses';

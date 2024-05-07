interface XacroLoaderOptions {

    rospackCommands?: { [key: string]: (...args:string[]) => string },
    arguments?: { [key: string]: string | number | boolean },
    localProperties?: boolean,
    inOrder?: boolean,
    fetchOptions?: object,
    workingPath?: string,
    requirePrefix?: boolean,

}

export class XacroLoader {

    load(url: string, onLoad: (xml: XMLDocument) => void, onError: (err: Error) => void): void;
    parse(content: string, onLoad: (xml: XMLDocument) => void, onError: (err: Error) => void): void;

}

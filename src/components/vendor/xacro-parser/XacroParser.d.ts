export class XacroParser {

    rospackCommands?: { [key: string]: (...args:string[]) => string } | ((command: string, ...args: string[]) => string);
    arguments?: { [key: string]: string | number | boolean };
    localProperties?: boolean;
    inOrder?: boolean;
    workingPath?: string;
    requirePrefix?: boolean;

    parse(content: string): Promise<XMLDocument>;
    getFileContents(path: string): Promise<string>;

}

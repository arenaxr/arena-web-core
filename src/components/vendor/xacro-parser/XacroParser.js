import {
    getUrlBase,
    removeEndCommentsFromArray,
    getElementsWithName,
    deepClone,
    isOperator,
    isString,
    isNumber,
    normalizeExpression,
    tokenize,
    mergePropertySets,
    createNewPropertyScope,
    PARENT_SCOPE,
} from './utils.js';
import { ExpressionParser } from './ExpressionParser.js';

export class XacroParser {

    constructor() {
        this.inOrder = true;
        this.requirePrefix = true;
        this.localProperties = true;
        this.rospackCommands = {};
        this.arguments = {};
        this.expressionParser = new ExpressionParser();
        this.workingPath = '';
    }

    async getFileContents(path) {
        throw new Error('XacroParser: getFileContents() not implemented.');
    }

    async parse(data) {

        /* Evaluation */
        // Evaluate expressions and rospack commands in attribute text
        // TODO: expressions can basically be any python expression
        function evaluateAttribute(str, properties, finalValue = false) {

            // recursively unpack parameters
            function unpackParams(str, properties) {

                // if we're unpacking something that's already a number or object then just return
                if (typeof str !== 'string') {
                    return str;
                }

                // process all of the ${} and $() expressions
                const tokens = str.split(/(\$?\$\([^)]+\))|(\$?\${[^}]+})/g).filter(t => !!t);
                const res = tokens.map(match => {
                    // skip tokens that shouldn't be evaluated
                    if (!/^\$[{(].+/.test(match)) {
                        return match;
                    }

                    // if we encounter an escaped $$ then return early
                    if (/^\$\$/.test(match)) {
                        return match;
                    }

                    const isRospackCommand = /^\$\(/.test(match);
                    let contents = match.substring(2, match.length - 1);
                    contents = unpackParams(contents, properties);

                    // replace the dictionary accessor with a function call in place
                    const isDictionaryAccessor = /\[.+\]$/.test(contents);
                    if (isDictionaryAccessor) {
                        contents = contents.replace(/([^[\s]+)(\[[^[]+\])+/g, (match, ...args) => {
                            const splits = match.split(/[[\]]+/g);
                            splits.pop();
                            return `__read_property__( ${ splits.join(',') } )`;
                        });
                    }

                    if (isRospackCommand) {
                        const command = unpackParams(contents, properties);
                        const tokens = command.split(/\s+/g);
                        const stem = tokens.shift();

                        try {
                            return handleRospackCommand(stem, ...tokens);
                        } catch (e) {
                            throw new Error(`XacroParser: Cannot run rospack command "${ contents }".\n` + e.message);
                        }
                    } else {
                        if (stack.includes(contents)) {
                            throw new Error(
                                `XacroParser: Cannot evaluate infinitely recursive expression: ${
                                    stack.join(' > ')
                                } > ${
                                    contents
                                }`,
                            );
                        }

                        stack.push(contents);

                        const operators = /([()/*+!\-%|&=])+/g;
                        const expr = tokenize(contents)
                            .map(t => {
                                operators.lastIndex = 0;
                                if (isOperator(t)) return t;
                                if (isNumber(t)) return t;
                                if (isString(t)) return t;

                                if (t in properties) {
                                    const arg = unpackParams(properties[t], properties);
                                    if (!isNumber(arg) && typeof arg !== 'object') {
                                        return `"${ arg.toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"') }"`;
                                    } else {
                                        return arg;
                                    }
                                } else {
                                    return t;
                                }
                            }).map(t => {
                                // add some spaces around non numbers and operators to avoid
                                // inadvertently creating a variable token.
                                operators.lastIndex = 0;
                                if (/^[^0-9.]/.test(t) && !operators.test(t)) {
                                    return ` ${ t } `;
                                } else {
                                    return t;
                                }
                            }).join('');

                        stack.pop();

                        if (isString(expr)) {
                            return expr.substring(1, expr.length - 1);
                        } else if (isNumber(expr)) {
                            return expr;
                        } else {
                            const cleanExpr = normalizeExpression(expr);
                            return expressionParser.evaluate(cleanExpr, properties);
                        }
                    }
                });

                const trimmedRes = res.filter(t => {
                    if (typeof t === 'string') {
                        t = t.trim();
                    }

                    return t !== '' && t !== null && t !== undefined;
                });

                if (trimmedRes.length === 1) {
                    return trimmedRes[0];
                } else {
                    return res.join('');
                }
            }

            const stack = [];
            const allProps = mergePropertySets(globalProperties, properties);
            try {
                // fix the escaped dollar signs only at the end to prevent double evaluation and only
                // if the value is not an intermediate value like a computed property.
                let result = unpackParams(str, allProps);
                if (finalValue && typeof result === 'string') {
                    result = result.replace(/\${2}([({])/g, (val, brace) => `$${ brace }`);
                }
                return result;
            } catch (e) {
                throw new Error(`XacroParser: Failed to process expression "${ str }". \n` + e.message);
            }

        }

        // Evaluate the given node as a macro
        async function evaluateMacro(node, properties, macros, resultsList) {

            // Find the macro
            const macroName = node.tagName.replace(/^xacro:/, '');
            const macro = macros[macroName];

            if (!macro) {
                throw new Error(`XacroParser: Cannot find macro "${ macroName }"`);
            }

            // Copy the properties and macros so we can modify them with
            // macro input fields and local macro definitions.
            const ogProperties = properties;
            const ogMacros = macros;
            properties = createNewPropertyScope(properties);
            macros = mergePropertySets(macros);

            // Modify the properties with macro param inputs
            let children = [];
            for (const c of node.children) {
                await processNode(c, ogProperties, ogMacros, children);
            }
            children = children.filter(c => c.nodeType === c.ELEMENT_NODE);

            let blockCount = 0;
            for (const p in macro.params) {
                const param = macro.params[p];
                if (node.hasAttribute(p)) {
                    properties[p] = evaluateAttribute(node.getAttribute(p), ogProperties);
                } else if (param.type === 'BLOCK') {
                    properties[p] = [children[blockCount]];
                    blockCount++;
                } else if (param.type === 'MULTI_BLOCK') {
                    properties[p] = [...children.filter(c => c.tagName === p)[0].childNodes];
                } else {
                    properties[p] = evaluateAttribute(macro.params[p].def, ogProperties);
                }
            }

            // Expand the macro
            const macroChildren = [...macro.node.childNodes];
            for (const c of macroChildren) {
                const nodes = [];
                await processNode(c, properties, macros, nodes);
                resultsList.push(...nodes);
            }
        }

        /* Parsing */
        // Conver the params into an object representation
        function parseMacroParam(param) {
            const obj = {};

            // Save the type of parameter
            // - two asterisks means an element expands input multiple
            // - one asterisk means copy the first elemnt
            // - no asterisks means value param
            if (/^\*\*/.test(param)) {
                obj.type = 'MULTI_BLOCK';
            } else if (/^\*/.test(param)) {
                obj.type = 'BLOCK';
            } else {
                obj.type = 'PARAM';
            }

            // strip the asterisks
            param = param.replace(/^\*{1,2}/g, '');

            // Check if a default value is provided (= or := syntax)
            if (/:?=/.test(param)) {
                const [name, def] = param.split(/:?=/);

                // TODO: Support caret and default syntax
                if (/^\^/.test(def) || /\|/.test(def)) {
                    throw new Error(`XacroParser: ROS Jade pass-through notation not supported in macro defaults: ${ def }`);
                }

                obj.name = name;

                if (def.startsWith('\'') && def.endsWith('\'')) {
                    // strip quotes from the default value if it happens to be a string like so:
                    // a:='0.0 1.0 2.0'
                    obj.def = def.substring(1, def.length - 1);
                } else {
                    obj.def = def;
                }
            } else {
                obj.name = param;
                obj.def = null;
            }

            return obj;
        }

        // Parse a xacro:macro tag
        function parseMacro(node) {
            // get attributes
            const name = node.getAttribute('name').replace(/^xacro:/, '');
            const params = node.getAttribute('params');

            // parse params
            const inputMap = {};
            if (params) {
                // find param definitions including string values like a:='0.0 1.0 2.0'
                const inputs = params
                    .trim()
                    .match(/[^\s']+('[^']*')?/g)
                    .map(s => parseMacroParam(s));
                inputs.forEach(inp => {
                    inputMap[inp.name] = inp;
                });
            }

            return {
                name,
                node: deepClone(node, false),
                params: inputMap,
            };
        }

        // Recursively process and expand a node
        async function processNode(node, properties, macros, resultsList = []) {
            if (node.nodeType === node.TEXT_NODE) {
                const res = node.cloneNode();
                res.textContent = evaluateAttribute(res.textContent, properties, true);
                resultsList.push(res);
                return;
            } else if (node.nodeType !== node.ELEMENT_NODE) {
                resultsList.push(node.cloneNode());
                return;
            }

            let tagName = node.tagName.toLowerCase();
            if (!requirePrefix) {
                switch (tagName) {

                    case 'arg':
                    case 'property':
                    case 'macro':
                    case 'insert_block':
                    case 'if':
                    case 'unless':
                    case 'include':
                    case 'element':
                    case 'attribute':
                        tagName = `xacro:${ tagName }`;
                        break;
                    default:
                        if (tagName in macros) {
                            tagName = `xacro:${ tagName }`;
                        }
                        break;

                }
            }

            switch (tagName) {

                case 'xacro:property': {
                    removeEndCommentsFromArray(resultsList);

                    const name = node.getAttribute('name');

                    let value;
                    if (node.hasAttribute('value')) {
                        value = node.getAttribute('value');
                    } else if (node.hasAttribute('default')) {
                        value = node.getAttribute('default');
                    } else {
                        const childNodes = [...node.childNodes];
                        value = [];
                        for (const c of childNodes) {
                            value.push(deepClone(c, false));
                        }
                    }

                    let scope = 'global';
                    if (localProperties) {
                        scope = node.getAttribute('scope') || 'local';
                    }

                    // Emulated behavior here
                    // https://github.com/ros/xacro/blob/melodic-devel/src/xacro/__init__.py#L565
                    if (scope !== 'local') {
                        value = evaluateAttribute(value, properties);
                    }

                    if (scope === 'global') {
                        globalProperties[name] = value;
                    } else if (scope === 'parent') {
                        properties[PARENT_SCOPE][name] = value;
                    } else {
                        properties[name] = value;
                    }

                    break;
                }
                case 'xacro:macro': {
                    removeEndCommentsFromArray(resultsList);

                    const macro = parseMacro(node);
                    macros[macro.name] = macro;
                    break;
                }
                case 'xacro:insert_block': {
                    removeEndCommentsFromArray(resultsList);

                    const name = node.getAttribute('name');
                    const nodes = properties[name];

                    for (const c of nodes) {
                        await processNode(c, properties, macros, resultsList);
                    }
                    return;
                }
                case 'xacro:if':
                case 'xacro:unless': {
                    removeEndCommentsFromArray(resultsList);

                    const value = evaluateAttribute(node.getAttribute('value'), properties, true);
                    let bool = null;
                    if (!isNaN(parseFloat(value))) {
                        bool = !!parseFloat(value);
                    } else if (value === 'true' || value === 'false') {
                        bool = value === 'true';
                    } else {
                        bool = value;
                    }

                    if (tagName === 'xacro:unless') {
                        bool = !bool;
                    }

                    if (bool) {
                        const childNodes = [...node.childNodes];
                        for (const c of childNodes) {
                            await processNode(c, properties, macros, resultsList);
                        }
                    }
                    return;
                }
                case 'xacro:include': {
                    removeEndCommentsFromArray(resultsList);

                    if (node.hasAttribute('ns')) {
                        throw new Error('XacroParser: xacro:include name spaces not supported.');
                    }
                    const filename = evaluateAttribute(node.getAttribute('filename'), properties, true);
                    const isAbsolute = /^[/\\]/.test(filename) || /^[a-zA-Z]+:[/\\]/.test(filename);
                    const filePath = isAbsolute ? filename : currWorkingPath + filename;

                    const prevWorkingPath = currWorkingPath;
                    currWorkingPath = getUrlBase(filePath);

                    const includeContent = await loadInclude(filePath);
                    const childNodes = [...includeContent.children[0].childNodes];
                    for (const c of childNodes) {
                        await processNode(c, properties, macros, resultsList);
                    }

                    currWorkingPath = prevWorkingPath;
                    return;
                }
                case 'xacro:arg': {
                    const name = node.getAttribute('name');
                    argumentDefaults[name] = evaluateAttribute(node.getAttribute('default'), properties, true);
                    return;
                }
                case 'xacro:attribute':
                case 'xacro:element':
                    throw new Error(`XacroParser: ${ tagName } tags not supported.`);
                default: {
                    // TODO: check if there's a 'call' attribute here which indicates that
                    // a macro should be invoked?
                    if (/^xacro:/.test(tagName) || tagName in macros) {
                        removeEndCommentsFromArray(resultsList);

                        return evaluateMacro(node, properties, macros, resultsList);
                    } else {

                        const res = node.cloneNode();
                        for (let i = 0, l = res.attributes.length; i < l; i++) {
                            const attr = res.attributes[i];
                            const value = evaluateAttribute(attr.value, properties, true);
                            res.setAttribute(attr.name, value);
                        }

                        const childNodes = [...node.childNodes];
                        const resultChildren = [];
                        for (let i = 0, l = childNodes.length; i < l; i++) {
                            await processNode(childNodes[i], properties, macros, resultChildren);
                        }
                        resultChildren.forEach(c => res.appendChild(c));
                        resultsList.push(res);
                    }
                }

            }
        }

        // Process all property and macro tags into the objects
        async function gatherPropertiesAndMacros(el, properties, macros) {
            const propertyEl = getElementsWithName(el, 'xacro:property');
            if (!requirePrefix) {
                propertyEl.push(...getElementsWithName(el, 'property'));
            }
            for (const el of propertyEl) {
                await processNode(el, properties, macros);
            }

            const macroEl = getElementsWithName(el, 'xacro:macro');
            if (!requirePrefix) {
                macroEl.push(...getElementsWithName(el, 'macro'));
            }
            for (const el of macroEl) {
                await processNode(el, properties, macros);
            }
        }

        // Process a document node with a new property and macro scope
        async function processXacro(xacro, properties, macros) {
            const res = xacro.cloneNode();
            for (let i = 0, l = xacro.children.length; i < l; i++) {
                const child = [];
                await processNode(xacro.children[i], properties, macros, child);

                const root = child[0];
                root.removeAttribute('xmlns:xacro');
                res.appendChild(root);
            }
            return res;
        }

        async function loadInclude(path) {

            try {
                const text = await scope.getFileContents(path);
                return new DOMParser().parseFromString(text, 'text/xml');
            } catch (e) {
                throw new Error(`XacroParser: Could not load included file: ${ path }`);
            }

        }

        async function loadIncludes(xacro, workingPath, results = []) {

            const includeEl = getElementsWithName(xacro, 'xacro:include');
            if (!requirePrefix) {
                includeEl.push(...getElementsWithName(xacro, 'include'));
            }

            const promises = includeEl.map(el => {
                // TODO: Handle namespaces on the include.
                if (el.hasAttribute('ns')) {
                    throw new Error('XacroParser: xacro:include name spaces not supported.');
                }

                const filename = el.getAttribute('filename');
                const namespace = el.getAttribute('ns') || null;
                const isAbsolute = /^[/\\]/.test(filename) || /^[a-zA-Z]+:[/\\]/.test(filename);
                const filePath = isAbsolute ? filename : workingPath + filename;
                const pr = loadInclude(filePath)
                    .then(content => {
                        results.push({ filename, namespace, content });

                        const relPath = getUrlBase(filePath);
                        return loadIncludes(content, relPath, results);
                    });
                return pr;
            });

            await Promise.all(promises);
            return results;
        }

        const scope = this;
        const inOrder = this.inOrder;

        // add a file separator to the end of the working path if it's specified
        // and doesn't have one.
        const workingPath = this.workingPath + (this.workingPath && !/[\\/]$/.test(this.workingPath) ? '/' : '');
        const requirePrefix = this.requirePrefix;
        const rospackCommands = this.rospackCommands;
        const globalMacros = {};
        const includeMap = {};
        const argumentDefaults = {};
        const globalProperties = { True: 1, False: 0 };
        globalProperties[PARENT_SCOPE] = globalProperties;

        const handleRospackCommand = (stem, ...args) => {

            let result;
            if (rospackCommands instanceof Function) {
                result = rospackCommands(stem, ...args);
            }

            if (result == null && rospackCommands != null && typeof rospackCommands[stem] === 'function') {
                result = rospackCommands[stem](...args);
            }

            if (result == null && stem === 'arg') {

                const arg = args[0];
                if (arg === undefined) {
                    throw new Error(`XacroParser: $(arg) must specify a variable name`);
                }
                result = this.arguments[arg];
                if (result == null) {
                    result = argumentDefaults[arg];
                }
                if (result == null) {
                    throw new Error(`XacroParser: Undefined substitution argument ${ arg }`);
                }

            }

            return result;

        };

        const expressionParser = this.expressionParser;
        let localProperties = this.localProperties;
        let currWorkingPath = workingPath;
        let content = new DOMParser().parseFromString(data, 'text/xml');

        if (localProperties && !inOrder) {
            console.warn('XacroParser: Implicitly setting "localProperties" option to false because "inOrder" is false.');
            localProperties = false;
        }

        let inOrderPromise = null;
        if (!inOrder) {
            inOrderPromise = (async function() {
                await gatherPropertiesAndMacros(content, globalProperties, globalMacros);
                content = deepClone(content, true);

                return loadIncludes(content, workingPath)
                    .then(arr => {
                        arr.forEach(inc => {
                            // TODO: handle namespaces here when rolling up properties and macros
                            gatherPropertiesAndMacros(inc.content, globalProperties, globalMacros);
                            inc.content = deepClone(inc.content, true);
                            includeMap[inc.filename] = inc.content;
                        });
                    });
            })();
        } else {
            inOrderPromise = Promise.resolve();
        }

        await inOrderPromise;
        return processXacro(content, globalProperties, globalMacros);
    }

}

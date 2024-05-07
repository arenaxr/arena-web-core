import { isNumber } from './utils.js';
import { Parser } from 'expr-eval';

export class ExpressionParser extends Parser {

    constructor(...args) {
        super(...args);

        const parser = this;
        parser.unaryOps = {
            '-': parser.unaryOps['-'],
            '+': parser.unaryOps['+'],
            '!': parser.unaryOps['not'],
            'not': parser.unaryOps['not'],
        };

        parser.functions = {
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            asin: Math.asin,
            acos: Math.acos,
            atan: Math.atan,
            log: Math.log,
            atan2: Math.atan2,
            pow: Math.pow,
            radians: (degrees) => { return degrees * (Math.PI / 180); },
            degrees: (radians) => { return radians * (180 / Math.PI); },
            __read_property__: (obj, ...args) => {
                let curr = obj;
                for (let i = 0, l = args.length; i < l; i++) {
                    curr = curr[args[i]];
                }

                return curr;
            },
        };

        parser.binaryOps = {
            ...parser.binaryOps,
            '+': (a, b) => {
                if (isNumber(a)) {
                    a = Number(a);
                }

                if (isNumber(b)) {
                    b = Number(b);
                }

                return a + b;
            },
            'in': (a, b) => {
                if (Array.isArray(b)) {
                    return b.includes(a);
                } else if (typeof b === 'string') {
                    return b.includes(a);
                } else {
                    return a in b;
                }
            },
            '||': (a, b) => Boolean(a || b),

            // binary AND is not supported by expr-eval. See expr-eval issue #253.
            // '&&': (a, b) => Boolean(a || b),
        };

        parser.consts = {
            ...parser.consts,
            pi: Math.PI,
            e: Math.E,
        };
    }

}

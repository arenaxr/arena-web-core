import { getUrlBase } from './utils.js';
import { XacroParser } from './XacroParser.js';

export class XacroLoader extends XacroParser {

    constructor() {

        super();
        this.fetchOptions = {};

    }

    load(url, onComplete, onError) {

        const workingPath = getUrlBase(url);
        if (this.workingPath === '') {

            this.workingPath = workingPath;

        }

        this
            .getFileContents(url)
            .then(text => {

                this.parse(text, onComplete, onError);

            })
            .catch(e => {

                if (onError) {

                    onError(e);

                }

            });

    }

    parse(data, onComplete, onError) {

        super
            .parse(data)
            .then(onComplete)
            .catch(e => {

                if (onError) {

                    onError(e);

                }

            });

    }

    getFileContents(path) {

        return fetch(path, this.fetchOptions)
            .then(res => {

                if (res.ok) {

                    return res.text();

                } else {

                    throw new Error(`XacroLoader: Failed to load url '${ path }' with error code ${ res.status } : ${ res.statusText }.`);

                }

            });

    }

}

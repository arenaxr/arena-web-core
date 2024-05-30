// Modified from npm package: https://github.com/RangerMauve/mqtt-pattern

"use strict";
var SEPARATOR = "/";
var SINGLE = "+";
var ALL = "#";

// module.exports = {
//     matches: matches,
//     extract: extract,
//     exec: exec,
//     fill: fill,
//     clean: clean
// };
export {
    matches,
    extract,
    exec,
    fill,
    clean
};

function exec(pattern, topic) {
    return matches(pattern, topic) ? extract(pattern, topic) : null;
}

function matches(pattern, topic) {
    var patternSegments = pattern.split(SEPARATOR);
    var topicSegments = topic.split(SEPARATOR);

    var patternLength = patternSegments.length;
    var topicLength = topicSegments.length;
    var lastIndex = patternLength - 1;

    for(var i = 0; i < patternLength; i++){
        var currentPattern = patternSegments[i];
        var patternChar = currentPattern[0];
        var currentTopic = topicSegments[i];

        if(!currentTopic && !currentPattern)
            continue;

        if(!currentTopic && currentPattern !== ALL) return false;

        // Only allow # at end
        if(patternChar === ALL)
            return i === lastIndex;
        if(patternChar !== SINGLE && currentPattern !== currentTopic)
            return false;
    }

    return patternLength === topicLength;
}

function fill(pattern, params){
    var patternSegments = pattern.split(SEPARATOR);
    var patternLength = patternSegments.length;

    var result = [];

    for (var i = 0; i < patternLength; i++) {
        var currentPattern = patternSegments[i];
        var patternChar = currentPattern[0];
        var patternParam = currentPattern.slice(1);
        var paramValue = params[patternParam];

        if(patternChar === ALL){
            // Check that it isn't undefined
            if(paramValue !== void 0)
                result.push([].concat(paramValue).join(SEPARATOR)); // Ensure it's an array

            // Since # wildcards are always at the end, break out of the loop
            break;
        } else if (patternChar === SINGLE)
            // Coerce param into a string, missing params will be undefined
            result.push("" + paramValue);
        else result.push(currentPattern);
    }

    return result.join(SEPARATOR);
}


function extract(pattern, topic) {
    var params = {};
    var patternSegments = pattern.split(SEPARATOR);
    var topicSegments = topic.split(SEPARATOR);

    var patternLength = patternSegments.length;

    for(var i = 0; i < patternLength; i++){
        var currentPattern = patternSegments[i];
        var patternChar = currentPattern[0];

        if(currentPattern.length === 1)
            continue;

        if(patternChar === ALL){
            params[currentPattern.slice(1)] = topicSegments.slice(i);
            break;
        } else if(patternChar === SINGLE){
            params[currentPattern.slice(1)] = topicSegments[i];
        }
    }

    return params;
}


function clean(pattern) {
    var patternSegments = pattern.split(SEPARATOR);
    var patternLength = patternSegments.length;

    var cleanedSegments = [];

    for(var i = 0; i < patternLength; i++){
        var currentPattern = patternSegments[i];
        var patternChar = currentPattern[0];

        if(patternChar === ALL){
            cleanedSegments.push(ALL);
        } else if(patternChar === SINGLE){
            cleanedSegments.push(SINGLE);
        } else {
            cleanedSegments.push(currentPattern);
        }
    }

    return cleanedSegments.join('/');
}

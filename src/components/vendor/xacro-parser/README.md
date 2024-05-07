# xacro-parser


[![npm version](https://img.shields.io/npm/v/xacro-parser.svg?style=flat-square)](https://www.npmjs.com/package/xacro-parser)
[![build](https://img.shields.io/github/actions/workflow/status/gkjohnson/xacro-parser/node.js.yml?style=flat-square&label=build&branch=master)](https://github.com/gkjohnson/xacro-parser/actions)
[![github](https://flat.badgen.net/badge/icon/github?icon=github&label)](https://github.com/gkjohnson/xacro-parser/)
[![twitter](https://flat.badgen.net/badge/twitter/@garrettkjohnson/?icon&label)](https://twitter.com/garrettkjohnson)
[![sponsors](https://img.shields.io/github/sponsors/gkjohnson?style=flat-square&color=1da1f2)](https://github.com/sponsors/gkjohnson/)

Javascript parser and loader for processing the [ROS Xacro file format](http://wiki.ros.org/xacro).

**NOTE**
_This package uses [expr-eval](https://github.com/silentmatt/expr-eval) for expression parsing._

# Use

## Loading Files From Disk in Node

```js
import fs from 'fs';
import { XacroParser } from 'xacro-parser';
import { JSDOM } from 'jsdom';

// XacroParser depends on the browser xml parser.
global.DOMParser = new JSDOM().window.DOMParser;

const parser = new XacroParser();
parser.workingPath = './path/to/directory/';
parser.getFileContents = path => {

  return fs.readFile( path, { encoding: 'utf8' } );

};

const xacroContents = fs.readFileSync( './path/to/directory/file.xacro', { encoding: 'utf8' } );
parser.parse( xacroContents ).then( result => {

  // xacro XML

} );
```

## Loading Files from Server

```js

import { XacroParser } from 'xacro-parser';

fetch( './path/to/directory/file.xacro' )
  .then( res => res.text() )
  .then( xacroContents => {

    const parser = new XacroParser();
    parser.workingPath = './path/to/directory/';
    parser.getFileContents = path => {

      return fetch( path ).then( res => res.text() );

    };
    parser.parse( xacroContents ).then( result => {

      // xacro XML

    } );

} );

```

## Using the Loader

```js
import { XacroLoader } from 'xacro-parser';

// The working path is extracted automatically.
// Only works in the browser.
const loader = new XacroLoader();
loader.load(
    '../path/to/file.xacro',
    result => {

        // xacro XML

    },
    err => {

        // parse error

    } );
```

# Different Versions of ROS

Xacro files from different versions of ROS require different options to be to be set. The differences are documented in the [spec](http://wiki.ros.org/xacro).

## <= ROS Indigo

Options required for xacros created with a ROS version <= release 8.

```js
parser.inOrder = false;
parser.requirePrefix = false;
parser.localProperties = false;
```

## >= ROS Jade

Options required for xacros created with a ROS version >= release 9.

```js
parser.inOrder = true;
parser.requirePrefix = true;
parser.localProperties = true;
```

# API

## XacroParser

### .localProperties

```js
localProperties = true : boolean
```

Since `ROS Jade` xacro [scopes property definitions to the containing macro](http://wiki.ros.org/xacro#Local_properties). Setting `localProperties` to false disables this behavior.

### .requirePrefix

```js
requirePrefix = true : boolean
```

Since `ROS Jade` xacro [requires all tags be prefixed with "xacro:"](http://wiki.ros.org/xacro#Deprecated_Syntax). Setting `requirePrefix` to false disables this requirement.

### .inOrder

```js
inOrder = true : boolean
```

Since `ROS Jade` xacro allows for [in order](http://wiki.ros.org/xacro#Processing_Order) processing, which allows variables to be used to define include paths and order-dependent property definitions. The equivalent of the `--inorder` xacro command line flag.

### .workingPath

```js
workingPath = '' : string
```

The working directory to search for dependent files in when parsing `include` tags. The path is required to end with '/'.

### .arguments

```js
arguments = {} : Object
```

A map of argument names to values that will be substituted for `$(arg name)` tags. These take precedence over any `<xacro:arg>` defaults.

```js
loader.arguments =
  {
    transmission_hw_interface: "hardware_interface/PositionJointInterface",
    arm_x_separation: -0.4,
    laser_visual: true,
  };
```

### .rospackCommands

```js
rospackCommands = {} : ( ( command : String, ...args : Array<String> ) => String ) | Object
```

A map of rospack command stem to handling function that take all arguments as function parameters. An example implementation of the `rospack find` command:

```js
loader.rospackCommands =
  {

    find: function( pkg ) {

      switch( pkg ) {

        case 'valkyrie_description':
          return '/absolute/path/to/valkyrie_description/';
        case 'r2_description':
          return '/absolute/path/to/r2_description/'

      }

    }

  };
```

Alternatively a function can be provided to evaluate the command:

```js
load.rospackCommands = ( command, ...args ) => {

    if ( command === 'find' ) {

        const [ pkg ] = args;
        switch( pkg ) {
            case 'valkyrie_description':
                return '/absolute/path/to/valkyrie_description/';
            case 'r2_description':
                return '/absolute/path/to/r2_description/'
        }

    }

};
```

### .parse

```js
parse( contents : string ) : Promise<XMLDocument>
```

Parses the passed xacro contents using the options specified on the object and returns an xml document of the processed xacro file.

### .getFileContents

```js
getFileContents( path : string ) : Promise<string>
```

And overrideable function that takes a file path and returns the contents of that file as a string. Used for loading a documents referenced in `include` tags.

## XacroLoader

_extends [XacroParser](#XacroParser)_

Extends XacroParse and implements `getFileContents` to load from a server using fetch.

### .fetchOptions

```js
fetchOptions = {} : Object
```

### .load

```js
load(
    url : string,
    onComplete : ( result : XMLDocument ) => void,
    onError? : ( error : Error ) => void
) : void
```

### .parse

```js
parse(
    url : string,
    onComplete : ( result : XMLDocument ) => void,
    onError? : ( error : Error ) => void
) : void
```

### .parse

# Limitations and Missing Features

## Unimplemented Features

- Macro argument pass-through using `param:=^|default` is not supported [#5](https://github.com/gkjohnson/xacro-parser/issues/5).
- Calling macros with a dynamic name using the `<xacro:call macro="${var}"/>` syntax is not supported [#9](https://github.com/gkjohnson/xacro-parser/issues/9).
- Include tag namespaces are not supported [#12](https://github.com/gkjohnson/xacro-parser/issues/12).

## Limitations

- The official xacro parser supports using basically any Python syntax in the `${}` syntax which can't be easily supported in Javascript. Instead basic argument substitution and expression evaluation is supported using the `expr-eval` package which may not support all expression types. Please submit an issue if evaluation fails to work on a file.

# Undocumented Xacro Behavior

While the documentation for the xacro format is relatively complete there are some features that cannot necessarily be well understood without looking at code or tests.

## Default Parameter Value Assignment

The xacro documentation on [default parameters](http://wiki.ros.org/xacro#Default_parameters) only mentions the `param:=default` syntax. However, examples in the wild such as [turtlebot_description](https://github.com/turtlebot/turtlebot/blob/melodic/turtlebot_description/urdf/stacks/hexagons.urdf.xacro#L13) appear to use `param=default`. This parser supports both syntaxes.

## Macro Property Scope

The `xacro:property` tags can have a `scope` attribute on them that can take "global" and "parent" values, which adds the property to the global or parent scope respetively. Neither of these is the default, though. If the scope is not specified then the variable is only relevant to the macro scope.

## Include Block Macro Parameters Look at Incremental Children

The docs for the `<xacro:macro params="*a *b" ... >` syntax makes it look like it's important that the name of the `*` parameters be the same as the tag they are including or that they always reference the first element but this is not the case. Instead the first `*` parameter refers the first one and the second one refers to the second element and so on.

## Macro Call Contents are Evaluated _Before_ Running a Macro

Consider the following:

```xml
<xacro:macro name="test" params="*a *b">
  <xacro:insert_block name="a"/>
  <xacro:insert_block name="b"/>
</xacro:macro>
<test>
  <xacro:if value="true">
    <child1/>
  </xacro:if>
  <xacro:if value="true">
    <child2/>
  </xacro:if>
  <child3/>
</test>
```

The macro "test" includes the first and second elements of the caller when generating the contents. The contents of the caller element are to be evaluated first _before_ evaluating the macro, though, which means the if statements will be removed and test will be left with `child1` and `child3` before the elements are included in the test macro body.

## Properties are Evaluated Immediately if "Local"

When tracking properties the unevaluated expression itself is added to the property scope and evaluated when used in an attribute. _However_ when a property is scoped locally (as in does not have a global or parent scope property) then it is evaluated immediately, as seen [here](https://github.com/ros/xacro/blob/melodic-devel/src/xacro/__init__.py#L565).

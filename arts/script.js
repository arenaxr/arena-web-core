/* eslint-disable require-jsdoc */
const reloadIntervalMilli = 30000;

let cfg;

// default values for topics
const topic = [];
topic['reg'] = 'realm/proc/reg';
topic['ctl'] = 'realm/proc/control';
topic['dbg'] = 'realm/proc/debug';
topic['stdout'] = topic['dbg'] + '/stdout';
topic['stdin'] = topic['dbg'] + '/stdin';

let pendingUuid = '';

const stdout = [];
const rtdbg = [];
const deletedModules = [];
const errorRts = [];

let statusBox;
let stdoutBox;
let rtDebugBox;
let moduleLabel;
let runtimeSelect;
let sendrtSelect;
let delrtSelect;
let moduleSelect;

let selectedMod;
let selectedRt;
let treeData;
let mqttc;
let mqttUsername;
let mqttToken;

programData = {
    prog1: {
        name: 'arena/py/pytestenv',
        filename: 'pytest.py',
        fileid: 'na',
        filetype: 'PY',
        args: ['arg1', 'arg3'],
        env: ['SCENE=testscene', 'NAMESPACE=testscene'],
        channels: {},
    },
    prog2: {
        name: 'arena/py/moving-box',
        filename: 'box.py',
        fileid: 'na',
        filetype: 'PY',
        args: [],
        env: ['SCENE=test', 'NAMESPACE=wiselab', `MQTTH=${location.hostname}`],
        channels: {},
    },
};

window.addEventListener('onauth', async function(e) {
    statusBox = document.getElementById('status_box');
    stdoutBox = document.getElementById('stdout_box');
    rtDebugBox = document.getElementById('dbg_rt_box');
    moduleLabel = document.getElementById('module_label');
    runtimeSelect = document.getElementById('runtime_select');
    sendrtSelect = document.getElementById('sendto_runtime_select');
    delrtSelect = document.getElementById('del_runtime_select');
    moduleSelect = document.getElementById('module_select');

    // add data to example select
    const fileSelect = document.getElementById('file_select');
    for (const [key, pData] of Object.entries(programData)) {
        const option = document.createElement('option');
        option.text = `${pData.name} (${pData.filetype})`;
        option.value= JSON.stringify(pData); // must be stored as a string
        fileSelect.add(option);
    }

    // add event handlers
    document.querySelectorAll('.tablinks').forEach( (item) => {
        item.addEventListener('click', function(event) {
            openTab(event, item.id.substring(1));
        });
    });
    document.querySelectorAll('.btn-section').forEach( (item) => {
        item.addEventListener('click', function(event) {
            toggleSection(item.id.substring(1));
        });
    });

    fileSelect.addEventListener('change', (e) => {
        const v = JSON.parse(e.target.value);
        document.getElementById('mname').value = v.name;
        document.getElementById('filename').value = v.filename;
        document.getElementById('fileid').value = v.fileid;
        document.getElementById('filetype').value = v.filetype;
        document.getElementById('args').value = JSON.stringify(v.args);
        document.getElementById('env').value = JSON.stringify(v.env);
        document.getElementById('channels').value = JSON.stringify(v.channels);
    });
    fileSelect.dispatchEvent(new Event('change')); // trigger change event

    document.getElementById('create_module_btn').addEventListener('click', () => {
        createModule();
    });
    document.getElementById('delete_module_btn').addEventListener('click', () => {
        deleteModule();
    });
    document.getElementById('delete_rt_btn').addEventListener('click', () => {
        deleteRuntime();
    });
    document.getElementById('reconnect_btn').addEventListener('click', () => {
        reConnect();
    });
    document.getElementById('load_tree_data').addEventListener('click', () => {
        loadTreeData();
    });
    document.getElementById('demo_migrate_mod_btn').addEventListener('click', () => {
        demoMigrateModule();
    });
    document.getElementById('stdin_snd_btn').addEventListener('click', () => {
        if (selectedMod) {
            const stdinInput = document.getElementById('stdin_input').value;
            const stdinTopic = `${topic['stdin']}/${selectedMod.uuid}`;
            console.info('Publishing (' + stdinTopic + '):' + stdinInput);
            mqttc.send(stdinTopic, stdinInput);
        } else alert('Select a module to send input to.');
    });

    // add page header
    $('#header').load('../header-old.html');

    // activate modules tab
    openTab({currentTarget: document.getElementById('_modules')}, 'modules');

    // hide sections
    document.getElementById('migrate_mod').style.display = 'none';
    document.getElementById('create_mod').style.display = 'none';

    cfg = await sendRequest('GET', '/arts-api/v1/config/');
    console.info(cfg);

    cfg.subscribe_topics.forEach((t) => {
        topic[t.name] = t.topic;
    });

    document.getElementById('mqtt_conn_str').value = cfg.wc_conn_str;

    if (e.detail) {
        if (e.detail.mqtt_username) {
            mqttUsername = e.detail.mqtt_username;
        }
        if (e.detail.mqtt_token) {
            mqttToken = e.detail.mqtt_token;
        }
    }

    loadTreeData();

    startConnect();
});

document.getElementsByTagName('body')[0].onresize = function() {
    loadTreeData(true); // responsive graph
};

function stdoutMsg(mId, msg) {
    if (stdout[mId] == undefined) stdout[mId] = {ts: Date.now(), ml: []};
    stdout[mId].ml.push(msg);
    if (selectedMod == undefined) return;
    if (selectedMod.uuid == mId) {
        stdoutBox.value += msg + '\n';
        stdoutBox.scrollTop = stdoutBox.scrollHeight;
    }
}

function rtDbgMsg(rtId, msg) {
    if (rtdbg[rtId] == undefined) rtdbg[rtId] = {ts: Date.now(), ml: []};
    rtdbg[rtId].ml.push(msg);
    if (selectedRt == undefined) return;
    if (selectedRt.uuid == rtId) {
        rtDebugBox.value += msg + '\n';
        rtDebugBox.scrollTop = rtDebugBox.scrollHeight;
    }
}

function displayTree(treeData) {
    // Set the dimensions and margins of the diagram
    panel = document.getElementById('panel');
    const margin = {
        top: 20,
        right: 90,
        bottom: 30,
        left: 90,
    };
    const width = panel.offsetWidth - margin.left - margin.right;
    const height = panel.offsetHeight - margin.top - margin.bottom;

    // append the svg object to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin

    d3.select('svg').remove();

    // if (svg == undefined) {
    svg = d3.select('#panel').append('svg')
        .attr('width', width + margin.right + margin.left)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' +
            margin.left + ',' + margin.top + ')');
    // }

    let i = 0;
    const duration = 750;

    // declares a tree layout and assigns the size
    const treemap = d3.tree().size([height, width]);

    // Assigns parent, children, height, depth
    const root = d3.hierarchy(treeData, function(d) {
        return d.children;
    });
    root.x0 = height / 2;
    root.y0 = 0;

    // Collapse after the second level
    // oot.children.forEach(collapse);

    if (runtimeSelect.options) {
        while (runtimeSelect.options.length > 0) runtimeSelect.remove(0);
    }

    if (sendrtSelect.options) {
        while (sendrtSelect.options.length > 0) sendrtSelect.remove(0);
    }

    if (delrtSelect.options) {
        while (delrtSelect.options.length > 0) delrtSelect.remove(0);
    }

    if (moduleSelect.options) {
        while (moduleSelect.options.length > 0) moduleSelect.remove(0);
    }

    runtimeSelect.options[0] = new Option('Schedule', '');
    sendrtSelect.options[0] = new Option('No migration', '');
    delrtSelect.options[0] = new Option('Select Runtime', '');
    moduleSelect.options[0] = new Option('Select Module', '');

    // Define the div for the tooltip
    d3.select('.tooltip').remove();
    const div = d3.select('#panel').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    update(root);

    // Collapse the node and all it's children
    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            // eslint-disable-next-line no-unused-vars
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    function update(source) {
        // Assigns the x and y position for the nodes
        const treeData = treemap(root);

        // Compute the new tree layout.
        const nodes = treeData.descendants();
        const links = treeData.descendants().slice(1);

        // Normalize for fixed-depth.
        nodes.forEach(function(d) {
            d.y = d.depth * 180;
        });

        // ****************** Nodes section ***************************

        // Update the nodes...
        const node = svg.selectAll('g.node')
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr('transform', function(d) {
                if (d.data.type === 'runtime') {
                    // runtime
                    // runtimes[d.data.uuid] = { uuid: d.data.uuid, name: d.data.name }
                    runtimeSelect.options[runtimeSelect.options.length] =
                        new Option(d.data.name + '(' + d.data.uuid + ')', d.data.uuid);
                    sendrtSelect.options[sendrtSelect.options.length] =
                        new Option(d.data.name + '(' + d.data.uuid + ')', d.data.uuid);
                    delrtSelect.options[delrtSelect.options.length] =
                        new Option(d.data.name + '(' + d.data.uuid + ')', d.data.uuid);
                } else if (d.data.type === 'module') {
                    // module
                    moduleSelect.add(
                        new Option(d.data.name + '(' + d.data.uuid + ')', JSON.stringify(d.data)));
                }

                return 'translate(' + source.y0 + ',' + source.x0 + ')';
            })
            .on('click', click);

        // Add Circle for the nodes
        nodeEnter.append('circle')
            .attr('class', 'node')
            .attr('r', 1e-6)
            .style('fill', 'steelblue'); // these are updated below

        // Add labels for the nodes
        nodeEnter.append('text')
            .attr('dy', '.35em')
            .attr('x', function(d) {
                return d.children || d._children ? -13 : 13;
            })
            .attr('text-anchor', function(d) {
                return d.children || d._children ? 'end' : 'start';
            })
            .on('mouseover', function(d) {
                dispText = d.data.name;
                if (d.data.type === 'runtime') {
                    dispText = 'Runtime: ' + dispText + '<br/>' + 'uuid:' +
                        d.data.uuid + '<br/>' + 'nmodules:' + d.data.nmodules + '<br/>';
                } else if (d.data.type === 'module') {
                    dispText = 'Runtime: ' + dispText + '<br/>' + 'uuid:' +
                        d.data.uuid + '<br/>' + 'filename:' + d.data.filename + '<br/>';
                }
                div.transition()
                    .duration(200)
                    .style('opacity', .9);
                div.html(dispText)
                    .style('left', (d3.event.pageX) + 'px')
                    .style('top', (d3.event.pageY - 40) + 'px');
            })
            .on('mouseout', function(d) {
                div.transition()
                    .duration(500)
                    .style('opacity', 0);
            })
            .text(function(d) {
                if (d.data.type) return ((d.data.deleted) ? 'Deleted: ': '') + d.data.name + ' (' + d.data.type + ')';
                return d.data.name;
            });

        // UPDATE
        const nodeUpdate = nodeEnter.merge(node);

        // Transition to the proper position for the node
        nodeUpdate.transition()
            .duration(duration)
            .attr('transform', function(d) {
                return 'translate(' + d.y + ',' + d.x + ')';
            });

        // Update the node attributes and style
        nodeUpdate.select('circle.node')
            .attr('r', function(d) {
                if (d.data.type === 'runtime') return 10;
                if (d.data.type === 'module') return 5;
                return 15;
            })
            .style('fill', function(d) {
                if (d.data.type === 'runtime') {
                    const eRt = errorRts.filter((rt) => rt.uuid === d.data.uuid);
                    if (eRt.length > 0) return '#c94324';
                    return '#fff';
                }
                if (d.data.type === 'module') {
                    if (d.data.deleted) return 'gray';
                    return 'lightsteelblue';
                }
                return 'steelblue';
            })
            .style('stroke', function(d) {
                if (d.data.type === 'runtime') return 'blue';
                if (d.data.type === 'module') {
                    if (d.data.deleted) return 'darkgray';
                    return 'blue';
                }
                return 'steelblue';
            })
            .attr('cursor', 'pointer');

        // Remove any exiting nodes
        const nodeExit = node.exit().transition()
            .duration(duration)
            .attr('transform', function(d) {
                return 'translate(' + source.y + ',' + source.x + ')';
            })
            .remove();

        // On exit reduce the node circles size to 0
        nodeExit.select('circle')
            .attr('r', 1e-6);

        // On exit reduce the opacity of text labels
        nodeExit.select('text')
            .style('fill-opacity', 1e-6);

        // ****************** links section ***************************

        // Update the links...
        const link = svg.selectAll('path.link')
            .data(links, function(d) {
                return d.id;
            });

        // Enter any new links at the parent's previous position.
        const linkEnter = link.enter().insert('path', 'g')
            .attr('class', 'link')
            .attr('d', function(d) {
                const o = {
                    x: source.x0,
                    y: source.y0,
                };
                return diagonal(o, o);
            });

        // UPDATE
        const linkUpdate = linkEnter.merge(link);

        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(duration)
            .attr('d', function(d) {
                return diagonal(d, d.parent);
            });

        // Remove any exiting links
        link.exit().transition()
            .duration(duration)
            .attr('d', function(d) {
                const o = {
                    x: source.x,
                    y: source.y,
                };
                return diagonal(o, o);
            })
            .remove();

        // Store the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }
    // Creates a curved (diagonal) path from parent to the child nodes
    function diagonal(s, d) {
        path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;

        return path;
    }

    // Toggle children on click.
    function click(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }

        if (d.data.type === 'runtime') { // runtime clicked
            runtimeSelected(d.data);
        } else if (d.data.type === 'module') { // module clicked
            moduleSelected(d.data);
        }
    }
}

async function sendRequest(mthd = 'POST', rsrc = '', data = {}) {
    // Default options are marked with *
    url = document.location.protocol + '//' + window.location.host + rsrc;
    const response = await fetch(url, {
        method: mthd, // *GET, POST, PUT, DELETE, etc.
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'omit', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json',
        },
        referrer: 'no-referrer', // no-referrer, *client
    });
    if (mthd = 'POST') {
        response.body = JSON.stringify(data); // body data type must match 'Content-Type' header
    }
    return await response.json(); // parses JSON response into native JavaScript objects
}

async function loadTreeData(redraw = false, addElement = undefined) {
    cData = await sendRequest('GET', '/arts-api/v1/runtimes/');
    realmName = topic['reg'].split('/')[0];

    // add deleted modules
    cData.forEach((rt) => {
        if (deletedModules[rt.uuid]) {
            deletedModules[rt.uuid].forEach((mod) => {
                mod.deleted=true;
                rt.children.push(mod);
            });
        }
    });

    if (addElement) {
        true;
    }

    td = {
        'name': realmName,
        't': 't1',
        'children': cData,
    };

    if (redraw || _.isEqual(treeData, td) == false) {
        treeData = td;
        displayTree(treeData);
    }
}

// Called after DOMContentLoaded
function startConnect() {
    // Generate a random client ID
    clientID = 'clientID-' + parseInt(Math.random() * 100);

    connStr = document.getElementById('mqtt_conn_str').value;

    // Print output for the user in the messages div
    console.info('Connecting to: ' + connStr );
    console.info('Using the following mqttc value: ' + clientID);

    // Initialize new Paho client connection
    mqttc = new Paho.Client(connStr, clientID);

    // Set callback handlers
    mqttc.onConnectionLost = onConnectionLost;
    mqttc.onMessageArrived = onMessageArrived;

    // Connect the client, if successful, call onConnect function
    mqttc.connect({
        onSuccess: onConnect,
        useSSL: ('https:' == document.location.protocol) ? true : false,
        userName: mqttUsername,
        password: mqttToken,
    });
}

// Called on connect button click
function reConnect() {
    try {
        mqttc.disconnect();
    } catch (err) {
        console.error('Not connected..');
    }
    startConnect();
}

// Called when the client connects
function onConnect() {
    // Print output for the user in the messages div
    console.info('Subscribing to: ' + topic['ctl']);

    // Subscribe to reg, ctl and dbg topics
    mqttc.subscribe(topic['ctl']);
    mqttc.subscribe(topic['reg']);
    mqttc.subscribe(`${topic['dbg']}/#`);

    // Subscribe to the stdout topic
    mqttc.subscribe(topic['stdout'] + '/#');
}

// Called when the client loses its connection
function onConnectionLost(responseObject) {
    console.error('Disconnected.');
    if (responseObject.errorCode !== 0) {
        console.error('ERROR: ' + responseObject.errorMessage);
        alert(responseObject.errorMessage);
    }
    setTimeout(reConnect, 5000);
}

// Called when a message arrives
function onMessageArrived(message) {
    // console.info('Received: ', message.payloadString, '[', message.destinationName, ']');

    if (message.destinationName.startsWith(topic['stdout'])) {
        try {
            const mId = message.destinationName.replace(`${topic['stdout']}/`, '');
            stdoutMsg(mId, message.payloadString);
        } catch (err) {
            console.error('Error parsing message:' + message.payloadString + ' ' + err);
        }
        return;
    }

    if (message.destinationName == topic['ctl']) {
        let msgReq;
        try {
            msgReq = JSON.parse(message.payloadString);
        } catch (err) {
            console.error('Error parsing message:' + message.payloadString + ' ' + err);
            return;
        }
        if (msgReq.type == 'arts_resp') {
            if (msgReq.data.result == 'ok') {
                modInstance = msgReq.data.details;
                console.info('Ok: ' + JSON.stringify(modInstance, null, 2));
                moduleSelected(modInstance);
            } else {
                console.error(statusBox.value += 'Error: ' + msgReq.data.details);
            }
        }
        if (msgReq.type == 'arts_req') {
            if (msgReq.action == 'delete') {
                console.log('HERE', msgReq);
                try {
                    // save deleted module
                    if (deletedModules[msgReq.data.parent.uuid] == undefined) {
                        deletedModules[msgReq.data.parent.uuid] = [];
                    }
                    deletedModules[msgReq.data.parent.uuid].push(msgReq.data);
                } catch (err) {
                    console.error('Error parsing delete message:' + message.payloadString + ' ' + err);
                }
            }
            loadTreeData();
        }
    }

    if (message.destinationName == topic['reg']) {
        loadTreeData();
    }

    if (message.destinationName.startsWith(topic['dbg'])) {
        const rtUuid = message.destinationName.replace(`${topic['dbg']}/`, '');
        rtDbgMsg(rtUuid, message.payloadString);
        if (message.payloadString.startsWith('ERROR:')) {
            errorRts.push({uuid: rtUuid});
            loadTreeData();
        }
    }
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16),
    );
}

function createModule() {
    mname = document.getElementById('mname').value;
    fn = document.getElementById('filename').value;
    fid = document.getElementById('fileid').value;
    ft = document.getElementById('filetype').value;

    try {
        args = JSON.parse(document.getElementById('args').value);
        env = JSON.parse(document.getElementById('env').value);
        channels = JSON.parse(document.getElementById('channels').value);
    } catch (err) {
        console.error(err);
    }
    parentid = runtimeSelect.value;

    pendingUuid = uuidv4();

    req = {
        object_id: pendingUuid,
        action: 'create',
        type: 'arts_req',
        data: {
            type: 'module',
            name: mname,
            filename: fn,
            fileid: fid,
            filetype: ft,
            args: args,
            env: env,
            channels: channels,
        },
    };

    if (parentid.length > 0) {
        req.data.parent = {
            uuid: parentid,
        };
    }

    reqJson = JSON.stringify(req);
    console.info('Publishing (' + topic['ctl'] + '):' + JSON.stringify(req, null, 2));
    mqttc.send(topic['ctl'], reqJson);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds
}

function deleteModule(rtuuid) {
    try {
        mData = JSON.parse(moduleSelect.value);
    } catch (err) {
        console.warn('Need to select an existing module.');
    }
    sendtoid = sendrtSelect.value;

    pendingUuid = uuidv4();

    req = {
        object_id: pendingUuid,
        action: 'delete',
        type: 'arts_req',
        data: mData,
    };

    if (sendtoid.length > 0) {
        console.warn('adding send to runtime');
        req.data.send_to_runtime = sendtoid;
    }

    reqJson = JSON.stringify(req);
    console.info('Publishing (' + topic['ctl'] + '):' + JSON.stringify(req, null, 2));
    mqttc.send(topic['ctl'], reqJson);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds
}

function deleteRuntime() {
    rtid = delrtSelect.value;

    if (rtid.length < 1) {
        console.warn('Need to select an existing runtime.');
        return;
    }

    pendingUuid = uuidv4();

    req = {
        object_id: pendingUuid,
        action: 'delete',
        type: 'arts_req',
        data: {
            type: 'runtime',
            uuid: rtid,
        },
    };

    reqJson = JSON.stringify(req);
    console.info('Publishing (' + topic['reg'] + '):' + JSON.stringify(req, null, 2));
    mqttc.send(topic['reg'], reqJson);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function demoMigrateModule() {
    if (runtimeSelect.options.length < 3) {
        console.warn('Must have more than one runtime.');
        return;
    }
    // assumes index 0 is used for "Select" label
    rt1i = getRandomInt(1, runtimeSelect.options.length - 1);
    rt2i = getRandomInt(1, runtimeSelect.options.length - 1);
    while (rt1i == rt2i) rt2i = getRandomInt(1, runtimeSelect.options.length - 1);

    rt1uuid = runtimeSelect.options[rt1i].value;
    rt2uuid = runtimeSelect.options[rt2i].value;

    pendingUuid = uuidv4();

    muuid = uuidv4();

    req = {
        object_id: pendingUuid,
        action: 'create',
        type: 'arts_req',
        data: {
            type: 'module',
            name: 'counter-cwlib',
            uuid: muuid,
            filename: 'cwlib_example.wasm',
            fileid: 'na',
            filetype: 'WA',
            args: '',
            env: '',
            channels: '',
            parent: {
                uuid: rt1uuid,
            },
        },
    };

    reqJson = JSON.stringify(req);
    console.info('Publishing (' + topic['reg'] + '):' + JSON.stringify(req, null, 2));
    mqttc.send(topic['ctl'], reqJson);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds

    // wait 5 seconds...
    await new Promise((r) => setTimeout(r, 5000));

    pendingUuid = uuidv4();

    req = {
        object_id: pendingUuid,
        action: 'delete',
        type: 'arts_req',
        data: {
            type: 'module',
            uuid: muuid,
            send_to_runtime: rt2uuid,
        },
    };

    reqJson = JSON.stringify(req);
    console.info('Publishing (' + topic['ctl'] + '):' + JSON.stringify(req, null, 2));
    mqttc.send(topic['ctl'], reqJson);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds

    // wait 5 seconds...
    await new Promise((r) => setTimeout(r, 5000));

    pendingUuid = uuidv4();

    req = {
        object_id: pendingUuid,
        action: 'delete',
        type: 'arts_req',
        data: {
            type: 'module',
            uuid: muuid,
        },
    };

    reqJson = JSON.stringify(req);
    console.info('Publishing (' + topic['ctl'] + '):' + JSON.stringify(req, null, 2));
    mqttc.send(topic['ctl'], reqJson);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds
}

// UI-inline JS migrated from index.html

function onFileSelectChange(sid) {
    const v = document.getElementById(sid).value;
    document.getElementById('mname').value = v.name;
    document.getElementById('filename').value = v.filename;
    document.getElementById('fileid').value = v.fileid;
    document.getElementById('filetype').value = v.filetype;
    document.getElementById('args').value = v.args;
    document.getElementById('env').value = v.env;
    document.getElementById('channels').value = v.channels;
}

function openTab(evt, tabName) {
    let i;
    const tabcontent = document.getElementsByClassName('tabcontent');
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = 'none';
    }
    const tablinks = document.getElementsByClassName('tablinks');
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(' active', '');
    }
    document.getElementById(tabName).style.display = 'block';
    evt.currentTarget.className += ' active';
}

function toggleSection(section) {
    const visible = (document.getElementById(section).style.display == 'block');
    if (visible) {
        document.getElementById(section).style.display = 'none';
        document.getElementById(`${section}_icon`).className = 'fas fa-angle-down fa-lg';
        return;
    }
    document.getElementById(section).style.display = 'block';
    document.getElementById(`${section}_icon`).className = 'fas fa-angle-up fa-lg';
}

function moduleSelected(modData) {
    openTab({currentTarget: document.getElementById('_modules')}, 'modules');
    selectedRt=undefined;
    if (selectedMod == undefined || selectedMod.uuid != modData.uuid) {
        moduleSelect.value = JSON.stringify(modData);
        selectedMod = modData;

        // populate module stdout box
        stdoutBox.value = '';
        if (stdout[selectedMod.uuid]) {
            stdout[selectedMod.uuid].ml.forEach((l) => {
                stdoutBox.value += l + '\n';
            });
            stdoutBox.scrollTop = stdoutBox.scrollHeight;
        }
        moduleLabel.innerText = 'Stdout for module \'' + selectedMod.name + '\' (' + selectedMod.uuid + ')' + ' :';
    }
}

function runtimeSelected(rtData) {
    openTab({currentTarget: document.getElementById('_runtimes')}, 'runtimes');
    selectedMod=undefined;
    if (selectedRt == undefined || selectedRt.uuid != rtData.uuid) {
        selectedRt = rtData;
        runtimeSelect.value = selectedRt.uuid;
        delrtSelect.value = selectedRt.uuid;
        sendrtSelect.value = selectedRt.uuid;

        // populate runtime dbg box
        rtDebugBox.value = '';
        if (rtdbg[selectedRt.uuid]) {
            rtdbg[selectedRt.uuid].ml.forEach((l) => {
                rtDebugBox.value += l + '\n';
            });
            rtDebugBox.scrollTop = rtDebugBox.scrollHeight;
        }
    }
}

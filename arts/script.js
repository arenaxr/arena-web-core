var reload_interval_milli = 3000

var cfg;

// default values for topics
var topic = [];
topic['reg'] = 'realm/proc/reg';
topic['ctl'] = 'realm/proc/control';
topic['dbg'] = 'realm/proc/debug';
topic['stdout'] = topic['dbg'] + '/stdout';

var pending_uuid = "";

var stdout_txt = [];

var status_box;
var stdout_box;
var module_label;
var runtime_select;
var sendrt_select;
var delrt_select;
var module_select;

var selected_mod;
var treeData;
var mqttc;
var mqtt_username;
var mqtt_token;

window.addEventListener('onauth', async function(e) {

    onFileSelectChange('file_select');

    status_box = document.getElementById('status-box');
    stdout_box = document.getElementById('stdout-box');
    module_label = document.getElementById('module_label');
    runtime_select = document.getElementById('runtime_select');
    sendrt_select = document.getElementById('sendto_runtime_select');
    delrt_select = document.getElementById('del_runtime_select');
    module_select = document.getElementById('module_select');

    // add page header
    $("#header").load("../header.html");

    document.getElementById("mod_tablink").click();

    cfg = await sendRequest('GET', '/arts-api/v1/config/');
    console.log(cfg); // {"mqtt_server":{"host":"oz.andrew.cmu.edu","port":1883,"ws_port":9001},"subscribe_topics":[{"topic":"realm/proc/reg","on_message":"on_reg_message"},{"topic":"realm/proc/control","on_message":"on_ctl_message"},{"topic":"realm/proc/debug","on_message":"on_dbg_message"}]}

    cfg.subscribe_topics.forEach(t => {
        topic[t.name] = t.topic;
    });

    document.getElementById('mqtt_server').value = cfg.mqtt_server.host;
    document.getElementById('mqtt_port').value = ('https:' == document.location.protocol) ? cfg.mqtt_server.wss_port : cfg.mqtt_server.ws_port;

    if (e.detail) {
        if (e.detail.mqtt_username)
            mqtt_username = e.detail.mqtt_username;
        if (e.detail.mqtt_token)
            mqtt_token = e.detail.mqtt_token;
    }
    loadTreeData();

    setInterval(loadTreeData, reload_interval_milli); // reload data periodically

    startConnect();
});

document.getElementsByTagName("body")[0].onresize = function() {
    loadTreeData(true); // responsive graph
};

function statusMsg(msg) {
    status_box.value += msg + '\n';
    status_box.scrollTop = status_box.scrollHeight;
}

function stdoutMsg(msg) {
    stdout_box.value += msg + '\n';
    stdout_box.scrollTop = stdout_box.scrollHeight;
}

function displayTree(treeData) {
    // Set the dimensions and margins of the diagram
    panel = document.getElementById('panel')
    var margin = {
            top: 20,
            right: 90,
            bottom: 30,
            left: 90
        },
        width = panel.offsetWidth - margin.left - margin.right,
        height = panel.offsetHeight - margin.top - margin.bottom;

    // append the svg object to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin

    d3.select("svg").remove();

    //if (svg == undefined) {
    svg = d3.select("#panel").append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" +
            margin.left + "," + margin.top + ")");
    //}

    var i = 0,
        duration = 750,
        root;

    // declares a tree layout and assigns the size
    var treemap = d3.tree().size([height, width]);

    // Assigns parent, children, height, depth
    root = d3.hierarchy(treeData, function(d) {
        return d.children;
    });
    root.x0 = height / 2;
    root.y0 = 0;

    // Collapse after the second level
    //oot.children.forEach(collapse);

    if (runtime_select.options) {
        while (runtime_select.options.length > 0) runtime_select.remove(0);
    }

    if (sendrt_select.options) {
        while (sendrt_select.options.length > 0) sendrt_select.remove(0);
    }

    if (delrt_select.options) {
        while (delrt_select.options.length > 0) delrt_select.remove(0);
    }

    if (module_select.options) {
        while (module_select.options.length > 0) module_select.remove(0);
    }

    runtime_select.options[0] = new Option('Schedule', '');
    sendrt_select.options[0] = new Option('No migration', '');
    delrt_select.options[0] = new Option('Select Runtime', '');
    module_select.options[0] = new Option('Select Module', '');

    // Define the div for the tooltip
    d3.select(".tooltip").remove();
    var div = d3.select("#panel").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    update(root);

    // Collapse the node and all it's children
    function collapse(d) {
        if (d.children) {
            d._children = d.children
            d._children.forEach(collapse)
            d.children = null
        }
    }

    function update(source) {

        // Assigns the x and y position for the nodes
        var treeData = treemap(root);

        // Compute the new tree layout.
        var nodes = treeData.descendants(),
            links = treeData.descendants().slice(1);

        // Normalize for fixed-depth.
        nodes.forEach(function(d) {
            d.y = d.depth * 180
        });

        // ****************** Nodes section ***************************

        // Update the nodes...
        var node = svg.selectAll('g.node')
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new modes at the parent's previous position.
        var nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr("transform", function(d) {

                if (d.data.type === "runtime") {
                    // runtime
                    //runtimes[d.data.uuid] = { uuid: d.data.uuid, name: d.data.name }
                    runtime_select.options[runtime_select.options.length] = new Option(d.data.name + '(' + d.data.uuid + ')', d.data.uuid);
                    sendrt_select.options[sendrt_select.options.length] = new Option(d.data.name + '(' + d.data.uuid + ')', d.data.uuid);
                    delrt_select.options[delrt_select.options.length] = new Option(d.data.name + '(' + d.data.uuid + ')', d.data.uuid);
                } else if (d.data.type === "module") {
                    // module
                    module_select.options[module_select.options.length] = new Option(d.data.name + '(' + d.data.uuid + ')', d.data.uuid);
                }

                return "translate(" + source.y0 + "," + source.x0 + ")";

            })
            .on('click', click);

        // Add Circle for the nodes
        nodeEnter.append('circle')
            .attr('class', 'node')
            .attr('r', 1e-6)
            .style("fill", function(d) {
                if (d.data.type === "runtime") return "#fff";
                if (d.data.type === "module") return "lightsteelblue";
                return "steelblue"
            });

        // Add labels for the nodes
        nodeEnter.append('text')
            .attr("dy", ".35em")
            .attr("x", function(d) {
                return d.children || d._children ? -13 : 13;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .on("mouseover", function(d) {
                disp_text = d.data.name;
                if (d.data.type === "runtime") {
                    disp_text = "Runtime: " + disp_text + "<br/>" + "uuid:" + d.data.uuid + "<br/>" + "nmodules:" + d.data.nmodules + "<br/>";
                } else if (d.data.type === "module") {
                    disp_text = "Runtime: " + disp_text + "<br/>" + "uuid:" + d.data.uuid + "<br/>" + "filename:" + d.data.filename + "<br/>";
                }
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html(disp_text)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 40) + "px");
            })
            .on("mouseout", function(d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .text(function(d) {
                if (d.data.type) return d.data.name + " (" + d.data.type + ")";
                return d.data.name;
            });

        // UPDATE
        var nodeUpdate = nodeEnter.merge(node);

        // Transition to the proper position for the node
        nodeUpdate.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Update the node attributes and style
        nodeUpdate.select('circle.node')
            .attr('r', function(d) {
                if (d.data.type === "runtime") return 10;
                if (d.data.type === "module") return 5;
                return 15
            })
            .style("fill", function(d) {
                if (d.data.type === "runtime") return "#fff";
                if (d.data.type === "module") return "lightsteelblue";
                return "steelblue"
            })
            .attr('cursor', 'pointer');

        // Remove any exiting nodes
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
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
        var link = svg.selectAll('path.link')
            .data(links, function(d) {
                return d.id;
            });

        // Enter any new links at the parent's previous position.
        var linkEnter = link.enter().insert('path', "g")
            .attr("class", "link")
            .attr('d', function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                }
                return diagonal(o, o)
            });

        // UPDATE
        var linkUpdate = linkEnter.merge(link);

        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(duration)
            .attr('d', function(d) {
                return diagonal(d, d.parent)
            });

        // Remove any exiting links
        var linkExit = link.exit().transition()
            .duration(duration)
            .attr('d', function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                }
                return diagonal(o, o)
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
              ${d.y} ${d.x}`

        return path
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

        if (d.data.type === "runtime") { // runtime clicked
            runtime_select.value = d.data.uuid;
            delrt_select.value = d.data.uuid;
            sendrt_select.value = d.data.uuid;
        } else if (d.data.type === "module") { // module clicked
            if (selected_mod != undefined) {
                console.log("Unsubscribing from:" + topic['stdout'] + "/" + selected_mod.uuid)
                mqttc.unsubscribe(topic['stdout'] + "/" + selected_mod.uuid);
            }
            module_select.value = d.data.uuid;
            selected_mod = d.data;
            console.log("Subscribing:" + topic['stdout'] + "/" + selected_mod.uuid)
            mqttc.subscribe(topic['stdout'] + "/" + selected_mod.uuid);
            stdout_box.value = "";
            module_label.innerHTML = "Stdout for module '" + selected_mod.name + "' (" + selected_mod.uuid + ")" + " :";
            statusMsg("Stdout for module '" + selected_mod.name + "' (" + selected_mod.uuid + ")");

            //console.log(d.data)
        }
    }
}

async function sendRequest(mthd = 'POST', rsrc = '', data = {}) {
    // Default options are marked with *
    url = document.location.protocol + '//' + window.location.host + rsrc;
    //console.log(url)
    const response = await fetch(url, {
        method: mthd, // *GET, POST, PUT, DELETE, etc.
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'omit', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json'
        },
        referrer: 'no-referrer', // no-referrer, *client
    });
    if (mthd = 'POST') {
        response.body = JSON.stringify(data); // body data type must match 'Content-Type' header
    }
    return await response.json(); // parses JSON response into native JavaScript objects
}

async function loadTreeData(redraw = false) {
    c_data = await sendRequest('GET', '/arts-api/v1/runtimes/');
    realm_name = topic['reg'].split('/')[0];
    td = {
        "name": realm_name,
        "t": "t1",
        "children": c_data
    }
    if (redraw || _.isEqual(treeData, td) == false) {
        treeData = td;
        displayTree(treeData);
    }
}

// Called after DOMContentLoaded
function startConnect() {
    // Generate a random client ID
    clientID = 'clientID-' + parseInt(Math.random() * 100);

    host = document.getElementById('mqtt_server').value;
    port = document.getElementById('mqtt_port').value;

    // Print output for the user in the messages div
    statusMsg('Connecting to: ' + host + ' on port: ' + port);
    statusMsg('Using the following mqttc value: ' + clientID);

    // Initialize new Paho client connection
    mqttc = new Paho.Client(host, Number(port), clientID);

    // Set callback handlers
    mqttc.onConnectionLost = onConnectionLost;
    mqttc.onMessageArrived = onMessageArrived;

    // Connect the client, if successful, call onConnect function
    mqttc.connect({
        onSuccess: onConnect,
        useSSL: ('https:' == document.location.protocol) ? true : false,
        userName: mqtt_username,
        password: mqtt_token,
    });
}

// Called on connect button click
function reConnect() {
    try {
        mqttc.disconnect();
    } catch (err) {
        console.log("Not connected..");
    }
    startConnect();
}

// Called when the client connects
function onConnect() {
    // Print output for the user in the messages div
    statusMsg('Subscribing to: ' + topic['ctl']);

    // Subscribe to the requested topic
    mqttc.subscribe(topic['ctl']);
}

// Called when the client loses its connection
function onConnectionLost(responseObject) {
    statusMsg('Disconnected.');
    if (responseObject.errorCode !== 0) {
        statusMsg('ERROR: ' + responseObject.errorMessage);
        alert(responseObject.errorMessage);
    }
    setTimeout(reConnect, 5000);
}

// Called when a message arrives
function onMessageArrived(message) {
    console.log('Received: ', message.payloadString, "[", message.destinationName, "]");

    if (message.destinationName.startsWith(topic['stdout'])) {
        stdoutMsg(message.payloadString);
        return;
    }

    if (message.destinationName == topic['ctl']) {
        //console.log(message.payloadString);
        try {
            var msg_req = JSON.parse(message.payloadString);
        } catch (err) {
            statusMsg("Error parsing message:" + message.payloadString + " " + err);
            return;
        }
        if (pending_uuid == msg_req.object_id && msg_req.type == 'arts_resp') {
            console.log(msg_req.data)
            if (msg_req.data.result == 'ok') {
                mod_instance = msg_req.data.details;
                // Print output for the user in the messages div
                statusMsg('Ok: ' + JSON.stringify(mod_instance, null, 2));
            } else {
                // Print output for the user in the messages div
                statusMsg(status_box.value += 'Error: ' + msg_req.data.details);
            }
        }
    }
}

// Called when the disconnect button is pressed
function startDisconnect() {
    mqttc.disconnect();
    statusMsg('Disconnected.');
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function createModule() {
    mname = document.getElementById('mname').value;
    fn = document.getElementById('filename').value;
    fid = document.getElementById('fileid').value;
    ft = document.getElementById('filetype').value;

    args = document.getElementById('args').value;
    env = document.getElementById('env').value;
    channels = document.getElementById('channels').value;
    parentid = runtime_select.value;

    pending_uuid = uuidv4();

    req = {
        object_id: pending_uuid,
        action: "create",
        type: "arts_req",
        data: {
            type: "module",
            name: mname,
            filename: fn,
            fileid: fid,
            filetype: ft,
            args: args,
            env: env,
            channels: channels
        }
    }

    if (parentid.length > 0) {
        console.log('adding parent');
        req.data.parent = {
            uuid: parentid
        }
    }

    req_json = JSON.stringify(req);
    statusMsg("Publishing (" + topic['ctl'] + "):" + JSON.stringify(req, null, 2));
    message = new Paho.Message(req_json);
    message.destinationName = req_json;
    mqttc.send(topic['ctl'], req_json);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds
}

function deleteModule(rtuuid) {
    mid = module_select.value;
    sendtoid = sendrt_select.value;

    if (mid == undefined) {
        statusMsg("Need to select an existing module.");
        return;
    }

    pending_uuid = uuidv4();

    req = {
        object_id: pending_uuid,
        action: "delete",
        type: "arts_req",
        data: {
            type: "module",
            uuid: mid
        }
    }

    if (sendtoid.length > 0) {
        console.log('adding send to runtime');
        req.data.send_to_runtime = sendtoid;
    }

    //rt_topic['ctl'] = topic['ctl'] + "/" + module.parent.uuid;

    req_json = JSON.stringify(req);
    statusMsg("Publishing (" + topic['ctl'] + "):" + JSON.stringify(req, null, 2));
    message = new Paho.Message(req_json);
    message.destinationName = req_json;
    mqttc.send(topic['ctl'], req_json);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds
}

function deleteRuntime() {
    rtid = delrt_select.value;

    if (rtid.length < 1) {
        statusMsg("Need to select an existing runtime.");
        return;
    }

    pending_uuid = uuidv4();

    req = {
        object_id: pending_uuid,
        action: "delete",
        type: "arts_req",
        data: {
            type: "runtime",
            uuid: rtid
        }
    }

    req_json = JSON.stringify(req);
    statusMsg("Publishing (" + topic['reg'] + "):" + JSON.stringify(req, null, 2));
    message = new Paho.Message(req_json);
    message.destinationName = req_json;
    mqttc.send(topic['reg'], req_json);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function DemoMigrateModule() {
    if (runtime_select.options.length < 3) {
        statusMsg("Must have more than one runtime.");
        return;
    }
    // assumes index 0 is used for "Select" label
    rt1i = getRandomInt(1, runtime_select.options.length - 1);
    rt2i = getRandomInt(1, runtime_select.options.length - 1);
    while (rt1i == rt2i) rt2i = getRandomInt(1, runtime_select.options.length - 1);

    rt1uuid = runtime_select.options[rt1i].value;
    rt2uuid = runtime_select.options[rt2i].value;

    pending_uuid = uuidv4();

    muuid = uuidv4();

    req = {
        object_id: pending_uuid,
        action: "create",
        type: "arts_req",
        data: {
            type: "module",
            name: "counter-cwlib",
            uuid: muuid,
            filename: "cwlib_example.wasm",
            fileid: "na",
            filetype: "WA",
            args: "",
            env: "",
            channels: "",
            parent: {
                uuid: rt1uuid
            }
        }
    }

    req_json = JSON.stringify(req);
    statusMsg("Publishing (" + topic['reg'] + "):" + JSON.stringify(req, null, 2));
    message = new Paho.Message(req_json);
    message.destinationName = req_json;
    mqttc.send(topic['ctl'], req_json);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds

    // wait 5 seconds...
    await new Promise(r => setTimeout(r, 5000));

    pending_uuid = uuidv4();

    req = {
        object_id: pending_uuid,
        action: "delete",
        type: "arts_req",
        data: {
            type: "module",
            uuid: muuid,
            send_to_runtime: rt2uuid
        }
    }

    req_json = JSON.stringify(req);
    statusMsg("Publishing (" + topic['ctl'] + "):" + JSON.stringify(req, null, 2));
    message = new Paho.Message(req_json);
    message.destinationName = req_json;
    mqttc.send(topic['ctl'], req_json);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds

    // wait 5 seconds...
    await new Promise(r => setTimeout(r, 5000));

    pending_uuid = uuidv4();

    req = {
        object_id: pending_uuid,
        action: "delete",
        type: "arts_req",
        data: {
            type: "module",
            uuid: muuid,
        }
    }

    req_json = JSON.stringify(req);
    statusMsg("Publishing (" + topic['ctl'] + "):" + JSON.stringify(req, null, 2));
    message = new Paho.Message(req_json);
    message.destinationName = req_json;
    mqttc.send(topic['ctl'], req_json);

    setTimeout(loadTreeData, 500); // reload data in 0.5 seconds

}

// UI-inline JS migrated from index.html

function onFileSelectChange(sid) {
    var v = JSON.parse(document.getElementById(sid).value);
    document.getElementById("mname").value = v.name;
    document.getElementById("filename").value = v.filename;
    document.getElementById("fileid").value = v.fileid;
    document.getElementById("filetype").value = v.filetype;
    document.getElementById("args").value = v.args;
    document.getElementById("env").value = v.env;
    document.getElementById("channels").value = v.channels;
}

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

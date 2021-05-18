
onmessage = (e) => {
    const msg = e.data;
    switch (msg.type) {
        case 'cy-json': {
            createCyJSON(msg.json);
            return;
        }
    }
}

function createCyJSON(json) {
    let res = [];
    let cnt = 0;
    for (let i = 0; i < json["ips"].length; i++) {
        let ip = json["ips"][i];
        let ipId = ip["id"] ? ip["id"] : ip["address"];

        let ipJSON = {};
        ipJSON["data"] = {};
        ipJSON["data"]["id"] = ipId;
        ipJSON["data"]["class"] = "ip";
        ipJSON["group"] = "nodes";
        res.push(ipJSON);

        for (let j = 0; j < ip["clients"].length; j++) {
            let client = ip["clients"][j];
            let clientJSON = {};
            clientJSON["data"] = {};
            clientJSON["data"]["id"] = client["name"];
            clientJSON["data"]["latency"] = client["latency"];
            clientJSON["data"]["class"] = "client";
            clientJSON["data"]["parent"] = ipId;
            clientJSON["group"] = "nodes";
            res.push(clientJSON);

            for (let k = 0; k < client["published"].length; k++) {
                let pubEdge = client["published"][k];
                let pubEdgeJSON = {};
                pubEdgeJSON["data"] = {};
                pubEdgeJSON["data"]["id"] = "edge_"+(cnt++);
                pubEdgeJSON["data"]["bps"] = pubEdge["bps"];
                pubEdgeJSON["data"]["source"] = client["name"];
                pubEdgeJSON["data"]["target"] = pubEdge["topic"];
                pubEdgeJSON["group"] = "edges";
                res.push(pubEdgeJSON);
            }
        }
    }

    for (i = 0; i < json["topics"].length; i++) {
        let topic = json["topics"][i];
        let topicJSON = {};
        topicJSON["data"] = {};
        topicJSON["data"]["id"] = topic["name"];
        topicJSON["data"]["class"] = "topic";
        topicJSON["group"] = "nodes";
        res.push(topicJSON);

        for (j = 0; j < topic["subscriptions"].length; j++) {
            let subEdge = topic["subscriptions"][j];
            let subEdgeJSON = {};
            subEdgeJSON["data"] = {};
            subEdgeJSON["data"]["id"] = "edge_"+(cnt++);
            subEdgeJSON["data"]["bps"] = subEdge["bps"];
            subEdgeJSON["data"]["source"] = topic["name"];
            subEdgeJSON["data"]["target"] = subEdge["client"];
            subEdgeJSON["group"] = "edges";
            res.push(subEdgeJSON);
        }
    }

    postMessage({type: "result", json: res});
}

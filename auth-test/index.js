const config = require('./config.json');
const express = require('express')
const https = require('https')
const fs = require('fs')
const { JWT, JWK } = require('jose')
const bodyParser = require('body-parser');
const app = express()
const port = 8888

const key = fs.readFileSync(config.keypath);
const cert = fs.readFileSync(config.certpath);
const jwk = JWK.asKey({ kty: 'oct', k: config.secret });

const server = https.createServer({ key: key, cert: cert }, app);

function generateToken(user = null, exp = '1 hour', sub = null, pub = null) {
    claims = { "sub": user };
    if (sub && sub.length > 0) {
        claims.subs = sub;
    }
    if (pub && pub.length > 0) {
        claims.publ = pub;
    }
    iat = new Date(new Date - 20000); // allow for clock skew between issuer and broker
    return JWT.sign(claims, jwk, { "alg": "HS256", "expiresIn": exp, "now": iat });
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// TODO: later use POST for the id_token and req.body.foo
app.get('/', (req, res) => {
    var realm = config.realm
    var scene = req.query.scene
    var authname = req.query.username
    var scene_obj = realm + "/s/" + scene + "/#";
    var scene_admin = realm + "/admin/s/" + scene + "/#";
    switch (authname) {
        // service-level scenarios
        case 'persistdb':
            // persistance service subs all scene, pubs status
            jwt = generateToken(authname, '1 year',
                [realm + "/s/#", realm + "/admin/s/#"], ["service_status"]);
            break;
        case 'sensorthing':
            // realm/g/<session>/uwb or realm/g/<session>/vio (global data)
            jwt = generateToken(authname, '1 year',
                [realm + "/g/#"], [realm + "/g/#"]);
            break;
        case 'sensorcamera':
            // realm/g/a/<cameras> (g=global, a=anchors)
            jwt = generateToken(authname, '1 year',
                [realm + "/g/a/#"], [realm + "/g/a/#"]);
            break;

        // user-level scenarios
        case 'graphview':
            // graph viewer
            jwt = generateToken(authname, '1 day',
                ["$GRAPH"], null);
            break;
        case 'admin':
            // admin is normal scene pub/sub, plus admin tasks
            jwt = generateToken(authname, '1 day',
                [scene_admin, scene_obj], [scene_admin, scene_obj]);
            break;
        case 'editor':
            // editor is normal scene pub/sub
            jwt = generateToken(authname, '1 day',
                [scene_obj], [scene_obj]);
            break;
        case 'viewer':
            var user_objs = [];
            if (req.query.camid != undefined) {
                user_objs.push(realm + "/s/" + scene + "/" + req.query.camid);
                user_objs.push(realm + "/s/" + scene + "/arena-face-tracker");
            }
            if (req.query.ctrlid1 != undefined) {
                user_objs.push(realm + "/s/" + scene + "/" + req.query.ctrlid1);
            }
            if (req.query.ctrlid2 != undefined) {
                user_objs.push(realm + "/s/" + scene + "/" + req.query.ctrlid2);
            }
            // viewer is sub scene, pub cam/controllers
            jwt = generateToken(authname, '1 day',
                [scene_obj], user_objs);
            break;
        default:
            jwt = null;
            break;
    }
    res.json({ username: authname, token: jwt });
});

server.listen(port, () => {
    console.log(`Auth test app listening at port ${port}.`)
    console.log(`Try hitting https://xr.andrew.cmu.edu:${port}/?username=editor&scene=auth-test`)
});

const config = require('./config.json');
const express = require('express')
const https = require('https')
const fs = require('fs')
const { JWT, JWK } = require('jose')
const bodyParser = require('body-parser');
const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = '58999217485-jjkjk88jcl2gfdr45p31p9imbl1uv1iq.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);
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

async function verify(username, token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    const userid = payload['sub'];
    // If request specified a G Suite domain:
    // const domain = payload['hd'];
    console.log("Verfied Google", "username", username, "userid", userid)
}

// main auth endpoint
app.post('/', (req, res) => {
    console.log("Request:", req.body.username)
    // TODO: setup logfile for these accesses

    // first, verify the id-token
    switch (req.body.id_auth) {
        case "google":
            verify(req.body.username, req.body.id_token).catch((error) => {
                console.error(error);
                res.json({});
                return;
            });
            break;
        default:
            console.error("Invalid authorization provider name:", req.body.id_auth);
            res.json({});
            return;
            break;
    }

    // TODO: second, pull/create user record and accociate id from token with it

    // third, generate mqtt-token with ACL-level permissions
    var realm = config.realm
    var scene = req.body.scene
    var authname = req.body.username
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
            if (req.body.camid != undefined) {
                user_objs.push(realm + "/s/" + scene + "/" + req.body.camid);
                user_objs.push(realm + "/s/" + scene + "/arena-face-tracker");
            }
            if (req.body.ctrlid1 != undefined) {
                user_objs.push(realm + "/s/" + scene + "/" + req.body.ctrlid1);
            }
            if (req.body.ctrlid2 != undefined) {
                user_objs.push(realm + "/s/" + scene + "/" + req.body.ctrlid2);
            }
            // viewer is sub scene, pub cam/controllers
            jwt = generateToken(authname, '1 day',
                [scene_obj], user_objs);
            break;
        default:
            // TODO: hook into authorization ACL, for now allow all pub/sub for 1 day
            //jwt = null;
            jwt = generateToken(authname, '1 day',
                ["#"], ["#"]);
            break;
    }
    res.json({ username: authname, token: jwt });
});

server.listen(port, () => {
    console.log(`MQTT-Auth app listening at port ${port}.`)
});

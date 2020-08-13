const config = require('./config.json');
const express = require('express')
const https = require('https')
const fs = require('fs')
const { JWT, JWK } = require('jose')
const app = express()
const port = 8888

const key = fs.readFileSync(config.keypath);
const cert = fs.readFileSync(config.certpath);
const jwk = JWK.asKey({ kty: 'oct', k: config.secret });

const server = https.createServer({ key: key, cert: cert }, app);

function generateToken(user = null, exp = '1 hour', sub = null, pub = null) {
    claims = { "sub": user };
    if (sub) {
        claims.subs = sub;
    }
    if (pub) {
        claims.publ = pub;
    }
    return JWT.sign(claims, jwk, { "alg": "HS256", "expiresIn": exp });
}

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', (req, res) => {
    scene = req.query.scene
    sobj = "realm/s/" + scene + "/#";
    sadm = "realm/admin/s/" + scene + "/#";
    switch (req.query.username) {
        case 'persistdb':
            // persistance service subs all, pubs none
            jwt = generateToken(req.query.username, '1 year',
                ["#"], null);
            break;
        case 'admin':
            // admin is normal scene pub/sub, plus admin tasks
            jwt = generateToken(req.query.username, '1 day',
                [sadm, sobj], [sadm, sobj]);
            break;
        case 'editor':
            // editor is normal scene pub/sub
            jwt = generateToken(req.query.username, '1 day',
                [sobj], [sobj]);
            break;
        case 'viewer':
            // viewer is just sub
            jwt = generateToken(req.query.username, '1 day',
                [sobj], null);
            break;
        default:
            jwt = null;
            break;
    }
    res.json({ username: req.query.username, token: jwt });
});

server.listen(port, () => {
    console.log(`Auth test app listening at https://xr.andrew.cmu.edu:${port}`)
});

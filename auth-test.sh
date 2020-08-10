#!/bin/bash
# example:
#  ./auth-test.sh conix

USER=$1

function get_token
{
  \curl -s -x GET -d 'username=$USER' 'https://xr.andrew.cmu.edu:8888' 2>&1 | \
    python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 
}
TOKEN=$(get_token)

# publish cube using token
echo "calling mosquitto_pub, user: $USER, token: $TOKEN"
mosquitto_pub -h oz.andrew.cmu.edu -t realm/s/auth-test/cube_1 -m '{"object_id" : "cube_1", "action": "create", "type": "object", "data": {"object_type": "cube", "position": {"x": 1, "y": 1, "z": -1}, "rotation": {"x": 0, "y": 0, "z": 0, "w": 1}, "scale": {"x": 1, "y": 1, "z": 1}, "color": "#FF0000"}}' -p 1884 -u $USER -P $TOKEN

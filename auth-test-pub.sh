#!/bin/bash
# example:
#  ./auth-test-pub.sh scene username

SCENE=$1
USER=$2
URL="https://xr.andrew.cmu.edu:8888/?scene=$SCENE&username=$USER"

function get_token
{
	curl -s $URL | jq -r '.token' 2>&1
}
TOKEN=$(get_token)

# publish cube using token
echo "connect mosquitto_pub, user: $USER, token: $TOKEN"
mosquitto_pub -h oz.andrew.cmu.edu -t "realm/s/$SCENE/cube_1" -m '{"object_id" : "cube_1", "action": "create", "type": "object", "data": {"object_type": "cube", "position": {"x": 1, "y": 1, "z": -1}, "rotation": {"x": 0, "y": 0, "z": 0, "w": 1}, "scale": {"x": 1, "y": 1, "z": 1}, "color": "#FF0000"}}' -d -p 1884 -u $USER -P $TOKEN

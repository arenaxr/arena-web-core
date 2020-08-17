#!/bin/bash
# example:
#  ./auth-test-sub.sh scene username

SCENE=$1
USER=$2
URL="https://xr.andrew.cmu.edu:8888/?scene=$SCENE&username=$USER"

function get_token
{
	curl -s $URL | jq -r '.token' 2>&1
}
#TOKEN="$(get_token)"
TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlZGl0b3IiLCJzdWJzIjpbInJlYWxtL3MvYXV0aC10ZXN0LyMiXSwicHVibCI6WyJyZWFsbS9zL2F1dGgtdGVzdC8jIl0sImlhdCI6MTU5Njg3NDA4OCwiZXhwIjoxNjI4NDEwMDg4fQ.yPe9TFzsgAIJ3sSPu5LHfSDOR19JoSsbBL1G05Ph7Ms"

# subscribe for all messages
echo "connect mosquitto_sub, scene: $SCENE, user: $USER, token: $TOKEN"
mosquitto_sub -h oz.andrew.cmu.edu -t "realm/s/$SCENE/#" -d -p 1884 -u $USER -P $TOKEN

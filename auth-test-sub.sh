#!/bin/bash
# example:
#  ./auth-test.sh conix

USER=$1
URL="https://xr.andrew.cmu.edu:8888/?username=$USER"

function get_token
{
	curl -s $URL | jq -r '.token' 2>&1
}
TOKEN=$(get_token)

# subscribe for one message
echo "connect mosquitto_sub, user: $USER, token: $TOKEN"
mosquitto_sub -h oz.andrew.cmu.edu -t 'realm/s/auth-test/#' -p 1884 -u $USER -P $TOKEN -d &

#/bin/bash -x
for f in `mosquitto_sub -v -h oz -C 7 -t /topic/render/# | awk '{ print $1 }'`; do
#    echo $f
    if grep -q "camera" <<<"$f"; then
	echo "Removing " $f
	mosquitto_pub -h oz.andrew.cmu.edu -t $f -r -m ""
	#	mosquitto_pub -h oz.andrew.cmu.edu -t $var -r -m ""
    fi
    if grep -q "rig" <<<"$f"; then
	echo "Removing " $f
	mosquitto_pub -h oz.andrew.cmu.edu -t $f -r -m ""
	#	mosquitto_pub -h oz.andrew.cmu.edu -t $var -r -m ""
    fi
done

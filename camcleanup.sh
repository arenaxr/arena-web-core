while true; do
    var=`mosquitto_sub -v -h oz -t /topic/render/# -C 1 | awk '{ print $1 }'`
    if grep -q "camera" <<<"$var"; then
	echo "Removing " $var
	mosquitto_pub -h oz.andrew.cmu.edu -t $var -r -m ""
    fi
done

# shapes.py
#
# MQTT message format: x,y,z,rotX,rotY,rotZ,rotW,scaleX,scaleY,scaleZ,#colorhex,on/off

import socket,threading,SocketServer,time,random,os,sys,json
import paho.mqtt.publish as publish

HOST="oz.andrew.cmu.edu"
TOPIC="realm/s/refactor"

def randmove():
    rando=random.random() * 10 - 5
    return rando

def rando(val):
    rando=random.random() * val
    return str("{0:0.3f}".format(rando))

def randrot():
    return str("{0:0.3f}".format(random.random() * 2 - 1))

def randcolor():
    return "%06x" % random.randint(0, 0xFFFFFF)

def randobj():
    rando=random.random()
    if rando < 0.2:
        return "cylinder"
    if rando < 0.4:
        return "sphere"
    if rando < 0.6:
        return "cube"
    if rando < 0.8:
        return "quad"
    return "cube"

messages = []
counter=0
while (True):
    obj_type = randobj()
    obj_id = str(counter)
    name = obj_type+'_'+obj_id
    counter+=1

    MESSAGE='{"object_id" : "'+name+'", "action": "create", "data": {"object_type": "'+obj_type+'", "position": {"x": '+"{0:0.3f}".format(randmove()) +', "y": '+"{0:0.3f}".format(randmove()+5) +', "z": '+"{0:0.3f}".format(randmove()-5) +'}, "rotation": {"x": '+randrot() +', "y": '+ randrot()+', "z": '+randrot() +', "w": '+randrot() +'}, "scale": {"x": '+rando(2) +', "y": '+rando(2) +', "z": '+rando(2) +'}, "color": "#'+randcolor()+'"}}'
    messages.append(MESSAGE)
    print(MESSAGE)

    #os.system("mosquitto_pub -h " + HOST + " -t " + TOPIC + "/" + name + " -m " + MESSAGE + " -r");
    publish.single(TOPIC+'/'+name, MESSAGE, hostname=HOST, retain=False)

# REMOVE
    if (len(messages) >= 25):
        theMess = messages.pop(0)
        theId = json.loads(theMess)["object_id"]
        newMess = '{"object_id" : "'+theId+'", "action": "delete"}'
        publish.single(TOPIC+'/'+theId, newMess, hostname=HOST, retain=False)
    time.sleep(0.5)

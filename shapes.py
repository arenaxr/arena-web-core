# shapes.py
#
# MQTT message format: x,y,z,rotX,rotY,rotZ,rotW,scaleX,scaleY,scaleZ,#colorhex,on/off

import socket,threading,SocketServer,time,random,os,sys
import paho.mqtt.publish as publish

HOST="oz.andrew.cmu.edu"
TOPIC="/topic/render"

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
    name = randobj()+'_'+str(counter)
    counter+=1
    MESSAGE=name+","+"{0:0.3f}".format(randmove())+','+"{0:0.3f}".format(randmove())+','+"{0:0.3f}".format(randmove())+","+randrot()+","+randrot()+","+randrot()+","+randrot()+","+rando(2)+","+rando(2)+","+rando(2)+",#"+randcolor()
    messages.append(MESSAGE)
    print(MESSAGE)

    #os.system("mosquitto_pub -h " + HOST + " -t " + TOPIC + "/" + name + " -m " + MESSAGE + " -r");
    publish.single(TOPIC+'/'+name, MESSAGE+",on", hostname=HOST, retain=False)
    if (len(messages) >= 25):
        publish.single(TOPIC, messages.pop(0)+",off",hostname=HOST, retain=False)
    time.sleep(0.1)

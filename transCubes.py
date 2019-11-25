# shapes.py
#
# MQTT message format: x,y,z,rotX,rotY,rotZ,rotW,scaleX,scaleY,scaleZ,#colorhex,on/off

import socket,threading,SocketServer,time,random,os,sys,json
import paho.mqtt.publish as publish

HOST="oz.andrew.cmu.edu"
TOPIC="realm/s/transCubes"

def randmove():
    rando=random.random() * 10 - 5
    return rando

def rando(val):
    rando=random.random() * val
    return str("{0:0.3f}".format(rando))

def randrot():
    return str("{0:0.3f}".format(random.random() * 2 - 1))

def unhex(a):
    return int(a, 16)

def randgold():
    return "FF"+ format(random.randint(128, 208), 'x')+ "00"

def randblue():
    return "0000" + format(random.randint(128, 255), 'x')

def randred():
    return format(random.randint(128, 255), 'x') + "0000"

def randcolor():
    rando=random.random()
    if rando < 0.2:
        return randgold()
    if rando < 0.4:
        return randblue()
    if rando < 0.6:
        return randgold()
    if rando < 0.8:
        return randblue()
    return randred()

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

def do(name, randx, randy, randz, scalex, scaley, scalez, color):
    #MESSAGE= name+","+"{0:0.3f}".format(randx)+','+"{0:0.3f}".format(randy)+','+"{0:0.3f}".format(randz)+",0,0,0,0,"+scalex+","+scaley+","+scalez+",#"+color
    MESSAGE = {
        "object_id": name,
        "action": "create",
        "data": {
            "object_type": "cube",
            "position": {
                "x": "{0:0.3f}".format(randx),
                "y": "{0:0.3f}".format(randy),
                "z": "{0:0.3f}".format(randz)
            },
            "scale": {
                "x": scalex,
                "y": scaley,
                "z": scalez
            },
            "color": "#" + color
        }
    }

    MESSAGE2 = {
        "object_id": name,
        "action": "update",
        "type": "object",
#        "attribute": "material",
        "data": {
            "material": {"transparent": True, "opacity": 0.5}
        }
    }

    print(MESSAGE)
    print(MESSAGE2)

    messages.append(MESSAGE)
    publish.single(TOPIC+'/'+name, json.dumps(MESSAGE), hostname=HOST, retain=False)
    publish.single(TOPIC+'/'+name, json.dumps(MESSAGE2), hostname=HOST, retain=False)

messages = []
counter=0
while (True):
    # draw 4 symmetrical pieces
    name = "cube_"+str(counter)
    counter+=1
    randx = randmove()
    randy = randmove()
    randz = randmove()
    scalex = rando(8)
    scaley = rando(1)
    scalez = rando(4)
    color = randcolor()
    do(name, randx, randy, randz, scalex, scaley, scalez, color)
    do(name+'a', -randx, randy, randz, scalex, scaley, scalez, color)

    randx = randmove()
    randy = randmove()
    randz = randmove()
    scalex = rando(1)
    scaley = rando(8)
    scalez = rando(4)
    color = randcolor()
    do(name+'b', randx, -randy, randz, scalex, scaley, scalez, color)
    do(name+'c', -randx, -randy, randz, scalex, scaley, scalez, color)

    # delete 4 symmetrical pieces from history
    if (len(messages) >= 100):
        pop=messages.pop(0)
        name=pop["object_id"]
        MESSAGE = {
            "object_id": name,
            "action": "delete"
            }
        publish.single(TOPIC+'/'+name, json.dumps(MESSAGE),hostname=HOST, retain=False);

        pop=messages.pop(0)
        name=pop["object_id"]
        MESSAGE = {
            "object_id": name,
            "action": "delete"
            }
        publish.single(TOPIC+'/'+name, json.dumps(MESSAGE),hostname=HOST, retain=False);

        pop=messages.pop(0)
        name=pop["object_id"]
        MESSAGE = {
            "object_id": name,
            "action": "delete"
            }
        publish.single(TOPIC+'/'+name, json.dumps(MESSAGE),hostname=HOST, retain=False);
        pop=messages.pop(0)
        name=pop["object_id"]
        MESSAGE = {
            "object_id": name,
            "action": "delete"
            }
        publish.single(TOPIC+'/'+name, json.dumps(MESSAGE),hostname=HOST, retain=False);

    time.sleep(0.1)

import os, re, time, hmac, threading
from collections import deque
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, redirect
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

app=Flask(__name__)
BASE_DIR=os.path.dirname(os.path.abspath(__file__))
VEHICLE_DIR=os.path.join(BASE_DIR,'vehicle')
CLIENT_ID=os.getenv('NOVA_GOOGLE_CLIENT_ID','1077780634697-chorl2489hp955pq3ubf48l3o0hiostr.apps.googleusercontent.com')
OWNER_SUB=os.getenv('NOVA_OWNER_SUB','').strip()
OWNER_EMAIL=os.getenv('NOVA_OWNER_EMAIL','').strip().lower()
RELAY_TOKEN=os.getenv('NOVA_RELAY_TOKEN','')
ORIGIN=os.getenv('NOVA_ALLOWED_ORIGIN','https://dangerussxxx.github.io').rstrip('/')
CORS(app,resources={r'/auth/*':{'origins':[ORIGIN]},r'/command':{'origins':[ORIGIN]},r'/response':{'origins':[ORIGIN]},r'/status':{'origins':[ORIGIN]}},allow_headers=['Authorization','Content-Type'])
command_queue=deque(maxlen=200);response_queue=deque(maxlen=500);queue_lock=threading.Lock()

def bearer():
    value=request.headers.get('Authorization','')
    return value[7:] if value.startswith('Bearer ') else ''

def google_owner():
    token=bearer()
    if not token or not (OWNER_SUB or OWNER_EMAIL): return False
    try:
        claims=id_token.verify_oauth2_token(token,google_requests.Request(),CLIENT_ID)
        if claims.get('iss') not in ('accounts.google.com','https://accounts.google.com'):return False
        if OWNER_SUB: return hmac.compare_digest(str(claims.get('sub','')),OWNER_SUB)
        return bool(claims.get('email_verified')) and hmac.compare_digest(str(claims.get('email','')).lower(),OWNER_EMAIL)
    except (ValueError,Exception):return False

def relay_auth():
    return bool(RELAY_TOKEN) and hmac.compare_digest(bearer(),RELAY_TOKEN)

def require(check):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args,**kwargs):
            if not check():return jsonify({'ok':False,'error':'Unauthorized'}),401
            return fn(*args,**kwargs)
        return wrapper
    return deco

def body(limit):
    if request.content_length is not None and request.content_length>limit:return None
    data=request.get_data(cache=False)
    if len(data)>limit:return None
    try:return data.decode('utf-8').strip()
    except UnicodeError:return None

# Explicit hardware protocol allowlist. Unknown commands are rejected rather than forwarded.
PATTERNS=[
 r'(?:led|arduino led) (?:on|off)',r'(?:arduino|trainer|both|all) all (?:on|off)',
 r'(?:all|both) (?:on|off)',r'trainer led [0-7] (?:on|off)',
 r'trainer led all (?:on|off)',r'trainer all (?:on|off)',
 r'(?:trainer|both)? ?blink [0-9]{1,4}',r'(?:trainer|both)? ?flash [0-9]{1,4} [0-9]{1,5}',
 r'speed [0-9]{1,5}',r'pulse [0-9]{1,5}',
 r'(?:trainer|both|morse|trainer morse|both morse)? ?sos',
 r'trainer pattern [a-z0-9_-]{1,32}',
 r'(?:trainer )?(?:stop|status|test)',r'(?:stop|status|test|help|toggle)',
 r'trainer led [0-7] toggle',r'arduino (?:on|off)',
]
REGEX=[re.compile(r'^(?:'+p+r')$',re.I) for p in PATTERNS]
def approved(cmd):
    if not cmd or len(cmd)>100 or any(ord(c)<32 or ord(c)>126 for c in cmd):return False
    if not any(p.fullmatch(cmd) for p in REGEX):return False
    # Hard bounds on timing/repeat counts.
    parts=cmd.lower().split()
    if 'blink' in parts:
        n=int(parts[-1]);return 1<=n<=100
    if 'flash' in parts:
        n,ms=map(int,parts[-2:]);return 1<=n<=100 and 20<=ms<=5000
    if parts[0]=='speed':return 20<=int(parts[-1])<=5000
    if parts[0]=='pulse':return 20<=int(parts[-1])<=5000
    return True

@app.get('/auth/me')
@require(google_owner)
def auth_me():return jsonify({'ok':True,'owner':True})

@app.post('/command')
@require(google_owner)
def post_command():
    cmd=body(256)
    if not approved(cmd):return jsonify({'ok':False,'error':'Unsupported command'}),400
    with queue_lock:
        if len(command_queue)>=command_queue.maxlen:return jsonify({'ok':False,'error':'Queue full'}),429
        command_queue.append({'command':cmd,'timestamp':time.time()})
    return jsonify({'ok':True,'queued':True})

@app.get('/command')
@require(relay_auth)
def get_command():
    with queue_lock:return command_queue.popleft()['command'] if command_queue else ''

@app.post('/response')
@require(relay_auth)
def post_response():
    msg=body(4096)
    if not msg:return jsonify({'ok':False,'error':'Invalid response'}),400
    with queue_lock:
        if len(response_queue)>=response_queue.maxlen:return jsonify({'ok':False,'error':'Queue full'}),429
        response_queue.append({'response':msg,'timestamp':time.time()})
    return jsonify({'ok':True})

@app.get('/response')
@require(google_owner)
def get_response():
    with queue_lock:return response_queue.popleft()['response'] if response_queue else ''

@app.get('/status')
@require(google_owner)
def status():
    with queue_lock:return jsonify({'commands_pending':len(command_queue),'responses_pending':len(response_queue),'vehicle_interface':True})

@app.get('/health')
def health():return jsonify({'ok':True,'service':'NOVA'})

@app.get('/vehicle')
def vehicle_redirect():return redirect('/vehicle/nova-vehicle.html')
@app.get('/vehicle/')
def vehicle_home():return send_from_directory(VEHICLE_DIR,'nova-vehicle.html')
@app.get('/vehicle/<path:filename>')
def vehicle_files(filename):return send_from_directory(VEHICLE_DIR,filename)

if __name__=='__main__':app.run(host='0.0.0.0',port=int(os.getenv('PORT','10000')))

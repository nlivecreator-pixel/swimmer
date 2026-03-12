"""Swimer Backend v4 — comprehensive realtime, server images, roles, invites"""
import hashlib, json, os, shutil, uuid, secrets
from collections import defaultdict
from datetime import datetime
from typing import Optional, Dict, List, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Swimer", version="4.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ─── In-memory state ──────────────────────────────────────────────
USERS: Dict[str, dict] = {}

def make_channel(cid, sid, name, ch_type, topic=""):
    return {"id": cid, "server_id": sid, "name": name, "type": ch_type, "topic": topic}

def make_server(sid, name, icon, owner_id, channels=None):
    if channels is None:
        channels = [
            make_channel(f"{sid}_c1", sid, "general",  "text",  "Главный канал"),
            make_channel(f"{sid}_c2", sid, "random",   "text",  "Всё подряд"),
            make_channel(f"{sid}_v1", sid, "Voice 1",  "voice", ""),
        ]
    return {
        "id": sid, "name": name, "icon": icon, "image_url": None,
        "owner_id": owner_id, "description": "",
        "channels": channels, "members": [],
        "roles": [
            {"id": f"{sid}_r1", "name": "Участник",  "color": "#aaaacc", "permissions": ["read","send"]},
            {"id": f"{sid}_r2", "name": "Модератор", "color": "#5ae8b8", "permissions": ["read","send","delete","kick"]},
            {"id": f"{sid}_r3", "name": "Админ",     "color": "#e85a9a", "permissions": ["read","send","delete","kick","manage"]},
        ],
        "member_roles": {},
        "stickers": [
            {"id":"srv_sk1","emoji":"🌊","name":"wave"},{"id":"srv_sk2","emoji":"🔥","name":"fire"},
            {"id":"srv_sk3","emoji":"💎","name":"gem"},{"id":"srv_sk4","emoji":"🚀","name":"rocket"},
        ],
        "invites": {},
    }

SERVERS: Dict[str, dict] = {
    "s1": make_server("s1","Swimer HQ","🌊","system"),
    "s2": make_server("s2","Gaming","🎮","system"),
}
ALL_CHANNELS: Dict[str, dict] = {ch["id"]: ch for s in SERVERS.values() for ch in s["channels"]}
MESSAGES:    Dict[str, List[dict]] = defaultdict(list)
DM_MESSAGES: Dict[str, List[dict]] = defaultdict(list)
POLLS:       Dict[str, dict] = {}
WS_CONNECTIONS: Dict[str, WebSocket] = {}
VOICE_ROOMS: Dict[str, Set[str]] = defaultdict(set)

AVATAR_COLORS = ["#5a5ad8","#e85a9a","#5ae8b8","#e8a85a","#a85ae8","#5ae8e8","#e8e85a","#e85a5a","#5ae85a","#5ab8e8"]
GLOBAL_STICKERS = [
    {"id":"sk1","emoji":"🔥","name":"fire"},{"id":"sk2","emoji":"💜","name":"heart"},
    {"id":"sk3","emoji":"🚀","name":"rocket"},{"id":"sk4","emoji":"😂","name":"lmao"},
    {"id":"sk5","emoji":"👀","name":"eyes"},{"id":"sk6","emoji":"💀","name":"skull"},
    {"id":"sk7","emoji":"✨","name":"sparkle"},{"id":"sk8","emoji":"🎉","name":"party"},
    {"id":"sk9","emoji":"🤝","name":"shake"},{"id":"sk10","emoji":"🌊","name":"wave"},
    {"id":"sk11","emoji":"⚡","name":"zap"},{"id":"sk12","emoji":"🎮","name":"game"},
    {"id":"sk13","emoji":"🦋","name":"butterfly"},{"id":"sk14","emoji":"🍕","name":"pizza"},
    {"id":"sk15","emoji":"💯","name":"100"},{"id":"sk16","emoji":"🤯","name":"mindblown"},
]

def dm_key(a, b): return "__".join(sorted([a, b]))
def now_ts(): return datetime.now().strftime("%H:%M")
def full_ts(): return datetime.now().isoformat()
def safe_user(u): return {k:v for k,v in u.items() if k != "password_hash"}

def rebuild_channels_map():
    ALL_CHANNELS.clear()
    for s in SERVERS.values():
        for ch in s["channels"]:
            ALL_CHANNELS[ch["id"]] = ch

async def broadcast_all(payload, exclude=None):
    raw = json.dumps(payload)
    for uid, ws in list(WS_CONNECTIONS.items()):
        if uid == exclude: continue
        try: await ws.send_text(raw)
        except: pass

async def broadcast_server_members(srv, payload):
    """Send to all online members of a server"""
    raw = json.dumps(payload)
    for uid in srv.get("members", []):
        ws = WS_CONNECTIONS.get(uid)
        if ws:
            try: await ws.send_text(raw)
            except: pass

async def send_to(uid, payload):
    ws = WS_CONNECTIONS.get(uid)
    if ws:
        try: await ws.send_text(json.dumps(payload))
        except: pass

# ─── Auth ─────────────────────────────────────────────────────────
class RegBody(BaseModel):
    username: str; password: str

class LoginBody(BaseModel):
    username: str; password: str; public_key: Optional[str] = None

@app.post("/api/register")
async def register(b: RegBody):
    if len(b.username) < 2: raise HTTPException(400, "Too short")
    for u in USERS.values():
        if u["name"].lower() == b.username.lower(): raise HTTPException(400, "Taken")
    uid = str(uuid.uuid4())[:8]
    USERS[uid] = {
        "id": uid, "name": b.username, "letter": b.username[0].upper(),
        "color": AVATAR_COLORS[len(USERS) % len(AVATAR_COLORS)],
        "bio": "", "avatar_url": None, "online": False,
        "password_hash": hashlib.sha256(b.password.encode()).hexdigest(),
        "public_key": None,
    }
    for s in SERVERS.values():
        if uid not in s["members"]: s["members"].append(uid)
    return safe_user(USERS[uid])

@app.post("/api/login")
async def login(b: LoginBody):
    ph = hashlib.sha256(b.password.encode()).hexdigest()
    for uid, u in USERS.items():
        if u["name"].lower() == b.username.lower() and u["password_hash"] == ph:
            if b.public_key: USERS[uid]["public_key"] = b.public_key
            for s in SERVERS.values():
                if uid not in s["members"]: s["members"].append(uid)
            return safe_user(u)
    raise HTTPException(401, "Invalid credentials")

@app.get("/api/users")
async def list_users(): return [safe_user(u) for u in USERS.values()]

@app.get("/api/users/{uid}")
async def get_user(uid: str):
    u = USERS.get(uid)
    if not u: raise HTTPException(404)
    return safe_user(u)

@app.put("/api/users/{uid}")
async def update_user(uid: str, body: dict):
    if uid not in USERS: raise HTTPException(404)
    allowed = {"bio","color","avatar_url","name","public_key"}
    for k,v in body.items():
        if k in allowed:
            USERS[uid][k] = v
            if k == "name" and v: USERS[uid]["letter"] = v[0].upper()
    u = safe_user(USERS[uid])
    # Broadcast profile update to ALL connected users
    await broadcast_all({"type": "user_update", "user": u})
    return u

@app.post("/api/users/{uid}/avatar")
async def upload_avatar(uid: str, file: UploadFile = File(...)):
    if uid not in USERS: raise HTTPException(404)
    ext = os.path.splitext(file.filename or "")[1].lower()
    fname = f"avatar_{uid}{ext}"
    fpath = os.path.join(UPLOAD_DIR, fname)
    with open(fpath, "wb") as f: shutil.copyfileobj(file.file, f)
    url = f"/uploads/{fname}"
    USERS[uid]["avatar_url"] = url
    u = safe_user(USERS[uid])
    await broadcast_all({"type": "user_update", "user": u})
    return u

@app.get("/api/users/{uid}/public_key")
async def get_pubkey(uid: str):
    u = USERS.get(uid)
    if not u: raise HTTPException(404)
    return {"public_key": u.get("public_key")}

@app.get("/api/search/users")
async def search_users(q: str):
    q2 = q.lstrip("@").lower()
    return [safe_user(u) for u in USERS.values() if q2 in u["name"].lower()]

# ─── Servers ──────────────────────────────────────────────────────
@app.get("/api/servers")
async def get_servers(): return list(SERVERS.values())

@app.get("/api/servers/{sid}")
async def get_server(sid: str):
    s = SERVERS.get(sid)
    if not s: raise HTTPException(404)
    return s

class CreateServerBody(BaseModel):
    name: str; icon: Optional[str] = "🌐"; owner_id: str

@app.post("/api/servers")
async def create_server(b: CreateServerBody):
    sid = str(uuid.uuid4())[:8]
    srv = make_server(sid, b.name, b.icon or "🌐", b.owner_id)
    srv["members"].append(b.owner_id)
    SERVERS[sid] = srv
    rebuild_channels_map()
    # Broadcast to the owner immediately
    await send_to(b.owner_id, {"type": "server_created", "server": srv})
    return srv

class UpdateServerBody(BaseModel):
    name: Optional[str] = None; icon: Optional[str] = None; description: Optional[str] = None

@app.put("/api/servers/{sid}")
async def update_server(sid: str, b: UpdateServerBody):
    s = SERVERS.get(sid)
    if not s: raise HTTPException(404)
    if b.name is not None: s["name"] = b.name
    if b.icon is not None: s["icon"] = b.icon
    if b.description is not None: s["description"] = b.description
    await broadcast_server_members(s, {"type": "server_update", "server": s})
    return s

@app.post("/api/servers/{sid}/image")
async def upload_server_image(sid: str, file: UploadFile = File(...)):
    s = SERVERS.get(sid)
    if not s: raise HTTPException(404)
    ext = os.path.splitext(file.filename or "")[1].lower()
    fname = f"srv_{sid}{ext}"
    fpath = os.path.join(UPLOAD_DIR, fname)
    with open(fpath, "wb") as f: shutil.copyfileobj(file.file, f)
    s["image_url"] = f"/uploads/{fname}"
    await broadcast_server_members(s, {"type": "server_update", "server": s})
    return s

@app.post("/api/servers/{sid}/channels")
async def add_channel(sid: str, body: dict):
    s = SERVERS.get(sid)
    if not s: raise HTTPException(404)
    cid = str(uuid.uuid4())[:8]
    ch  = make_channel(cid, sid, body.get("name","channel"), body.get("type","text"), body.get("topic",""))
    s["channels"].append(ch)
    ALL_CHANNELS[cid] = ch
    await broadcast_server_members(s, {"type": "server_update", "server": s})
    return ch

@app.delete("/api/servers/{sid}/channels/{cid}")
async def delete_channel(sid: str, cid: str):
    s = SERVERS.get(sid)
    if not s: raise HTTPException(404)
    s["channels"] = [c for c in s["channels"] if c["id"] != cid]
    ALL_CHANNELS.pop(cid, None)
    await broadcast_server_members(s, {"type": "server_update", "server": s})
    return {"ok": True}

@app.post("/api/servers/{sid}/roles")
async def add_role(sid: str, body: dict):
    s = SERVERS.get(sid)
    if not s: raise HTTPException(404)
    rid  = str(uuid.uuid4())[:8]
    role = {"id": rid, "name": body.get("name","Role"), "color": body.get("color","#aaaacc"), "permissions": body.get("permissions",["read","send"])}
    s["roles"].append(role)
    await broadcast_server_members(s, {"type": "server_update", "server": s})
    return role

@app.put("/api/servers/{sid}/members/{uid}/role")
async def set_member_role(sid: str, uid: str, body: dict):
    s = SERVERS.get(sid)
    if not s: raise HTTPException(404)
    s["member_roles"][uid] = body.get("role_id")
    # Notify the affected member about their role change
    await send_to(uid, {"type": "role_update", "server_id": sid, "role_id": body.get("role_id")})
    await broadcast_server_members(s, {"type": "server_update", "server": s})
    return {"ok": True}

@app.post("/api/servers/{sid}/stickers")
async def add_sticker(sid: str, body: dict):
    s = SERVERS.get(sid)
    if not s: raise HTTPException(404)
    sk = {"id": str(uuid.uuid4())[:6], "emoji": body.get("emoji","?"), "name": body.get("name","sticker")}
    s["stickers"].append(sk)
    await broadcast_server_members(s, {"type": "server_update", "server": s})
    return sk

@app.delete("/api/servers/{sid}/stickers/{skid}")
async def del_sticker(sid: str, skid: str):
    s = SERVERS.get(sid)
    if not s: raise HTTPException(404)
    s["stickers"] = [sk for sk in s["stickers"] if sk["id"] != skid]
    await broadcast_server_members(s, {"type": "server_update", "server": s})
    return {"ok": True}

# ─── Invites ──────────────────────────────────────────────────────
@app.post("/api/servers/{sid}/invites")
async def create_invite(sid: str, body: dict):
    s = SERVERS.get(sid)
    if not s: raise HTTPException(404)
    code = secrets.token_urlsafe(8)
    s["invites"][code] = {"created_by": body.get("uid"), "created_at": full_ts(), "uses": 0}
    return {"code": code, "url": f"http://localhost:3000/invite/{code}"}

@app.get("/api/invites/{code}")
async def get_invite(code: str):
    for sid, s in SERVERS.items():
        if code in s["invites"]:
            return {"server": s, "invite": s["invites"][code]}
    raise HTTPException(404, "Not found")

@app.post("/api/invites/{code}/join")
async def join_invite(code: str, body: dict):
    uid = body.get("uid")
    for sid, s in SERVERS.items():
        if code in s["invites"]:
            joined = uid and uid not in s["members"]
            if joined: s["members"].append(uid)
            s["invites"][code]["uses"] = s["invites"][code].get("uses",0) + 1
            if joined:
                u = USERS.get(uid)
                if u:
                    await broadcast_server_members(s, {
                        "type": "member_joined",
                        "server_id": sid,
                        "user": safe_user(u),
                        "server": s,
                    })
            return {"server": s}
    raise HTTPException(404, "Not found")

# ─── Messages ──────────────────────────────────────────────────────
@app.get("/api/channels/{cid}/messages")
async def channel_msgs(cid: str, limit: int = 100): return MESSAGES[cid][-limit:]

@app.get("/api/dm/{uid1}/{uid2}")
async def dm_history(uid1: str, uid2: str, limit: int = 100):
    return DM_MESSAGES[dm_key(uid1, uid2)][-limit:]

# ─── Files ─────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    ext   = os.path.splitext(file.filename or "")[1].lower()
    fname = f"{uuid.uuid4()}{ext}"
    fpath = os.path.join(UPLOAD_DIR, fname)
    with open(fpath, "wb") as f: shutil.copyfileobj(file.file, f)
    is_img = ext in {".jpg",".jpeg",".png",".gif",".webp",".svg",".avif"}
    return {"url":f"/uploads/{fname}","name":file.filename,"size":os.path.getsize(fpath),"mime":file.content_type,"type":"image" if is_img else "file"}

# ─── Polls ─────────────────────────────────────────────────────────
@app.post("/api/polls")
async def create_poll(body: dict):
    pid = str(uuid.uuid4())[:8]
    POLLS[pid] = {"id":pid,"question":body["question"],"options":[{"text":o,"votes":[]} for o in body["options"]],"created_at":full_ts()}
    return POLLS[pid]

@app.post("/api/polls/{pid}/vote")
async def vote(pid: str, body: dict):
    poll = POLLS.get(pid)
    if not poll: raise HTTPException(404)
    uid, idx = body.get("uid"), body.get("option_idx")
    for opt in poll["options"]:
        if uid in opt["votes"]: opt["votes"].remove(uid)
    if idx is not None and 0 <= idx < len(poll["options"]): poll["options"][idx]["votes"].append(uid)
    await broadcast_all({"type":"poll_update","poll":poll})
    return poll

@app.get("/api/stickers")
async def get_stickers(): return GLOBAL_STICKERS

# ─── WebSocket ─────────────────────────────────────────────────────
@app.websocket("/ws/{uid}")
async def ws_hub(ws: WebSocket, uid: str):
    if uid not in USERS: await ws.close(1008); return
    await ws.accept()
    WS_CONNECTIONS[uid] = ws
    USERS[uid]["online"] = True

    # Broadcast online status + send current users list to newly connected client
    await broadcast_all({"type":"user_online","uid":uid,"user":safe_user(USERS[uid])})
    # Send all current users to the newly connected client
    await send_to(uid, {"type":"users_snapshot","users":[safe_user(u) for u in USERS.values()]})
    # Send all servers to the newly connected client
    await send_to(uid, {"type":"servers_snapshot","servers":list(SERVERS.values())})

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            t   = msg.get("type")

            if t == "channel_msg":
                cid = msg["channel_id"]; mid = str(uuid.uuid4())[:8]
                entry = {
                    "id":mid,"uid":uid,"channel_id":cid,
                    "text":msg.get("text",""),"encrypted":msg.get("encrypted",False),
                    "ts":now_ts(),"full_ts":full_ts(),"reactions":{},"type":"text",
                    "reply_to":msg.get("reply_to"),
                }
                if msg.get("file"):    entry.update({"file":msg["file"],"type":msg["file"]["type"]})
                if msg.get("sticker"): entry.update({"sticker":msg["sticker"],"type":"sticker"})
                if msg.get("poll_id"): entry.update({"poll_id":msg["poll_id"],"poll":POLLS.get(msg["poll_id"]),"type":"poll"})
                MESSAGES[cid].append(entry)
                # Broadcast to all members of the server that has this channel
                for srv in SERVERS.values():
                    if any(c["id"] == cid for c in srv["channels"]):
                        await broadcast_server_members(srv, {"type":"channel_msg","message":entry})
                        break
                else:
                    await broadcast_all({"type":"channel_msg","message":entry})

            elif t == "dm":
                to = msg["to"]; mid = str(uuid.uuid4())[:8]
                entry = {
                    "id":mid,"from_uid":uid,"to_uid":to,
                    "text":msg.get("text",""),"encrypted":msg.get("encrypted",False),
                    "ts":now_ts(),"full_ts":full_ts(),"reactions":{},"type":"text",
                }
                if msg.get("file"):    entry.update({"file":msg["file"],"type":msg["file"]["type"]})
                if msg.get("sticker"): entry.update({"sticker":msg["sticker"],"type":"sticker"})
                key = dm_key(uid, to)
                DM_MESSAGES[key].append(entry)
                p = {"type":"dm","message":entry}
                await send_to(uid, p)
                if uid != to: await send_to(to, p)

            elif t == "react":
                mid = msg["message_id"]; emoji = msg["emoji"]
                cid = msg.get("channel_id"); partner = msg.get("dm_partner")
                if cid:
                    store = MESSAGES[cid]
                else:
                    k = dm_key(uid, partner or "")
                    store = DM_MESSAGES.get(k, [])
                reactions = {}
                for m in store:
                    if m["id"] == mid:
                        if emoji not in m["reactions"]: m["reactions"][emoji] = []
                        if uid in m["reactions"][emoji]: m["reactions"][emoji].remove(uid)
                        else: m["reactions"][emoji].append(uid)
                        reactions = m["reactions"]; break
                payload = {"type":"react","message_id":mid,"channel_id":cid,"dm_key":dm_key(uid, partner or "") if partner else None,"reactions":reactions}
                if cid:
                    for srv in SERVERS.values():
                        if any(c["id"]==cid for c in srv["channels"]):
                            await broadcast_server_members(srv, payload); break
                    else: await broadcast_all(payload)
                else:
                    await send_to(uid, payload)
                    if partner: await send_to(partner, payload)

            elif t == "typing":
                cid = msg.get("channel_id"); dm_to = msg.get("dm_to")
                payload = {"type":"typing","uid":uid,"channel_id":cid,"dm_to":dm_to}
                if dm_to:
                    await send_to(dm_to, payload)
                elif cid:
                    for srv in SERVERS.values():
                        if any(c["id"]==cid for c in srv["channels"]):
                            await broadcast_server_members(srv, {**payload, "exclude": uid}); break

            elif t == "delete_msg":
                mid = msg["message_id"]; cid = msg.get("channel_id")
                for i, m in enumerate(MESSAGES.get(cid,[])):
                    if m["id"] == mid and m["uid"] == uid: MESSAGES[cid].pop(i); break
                await broadcast_all({"type":"delete_msg","message_id":mid,"channel_id":cid})

            elif t == "voice_join":
                cid = msg["channel_id"]; VOICE_ROOMS[cid].add(uid)
                await broadcast_all({"type":"voice_state","channel_id":cid,"members":list(VOICE_ROOMS[cid])})
            elif t == "voice_leave":
                cid = msg.get("channel_id"); VOICE_ROOMS.get(cid,set()).discard(uid)
                if cid: await broadcast_all({"type":"voice_state","channel_id":cid,"members":list(VOICE_ROOMS[cid])})

            elif t == "rtc_offer":  await send_to(msg["to"],{"type":"rtc_offer","from":uid,"sdp":msg["sdp"],"channel_id":msg.get("channel_id")})
            elif t == "rtc_answer": await send_to(msg["to"],{"type":"rtc_answer","from":uid,"sdp":msg["sdp"]})
            elif t == "rtc_ice":    await send_to(msg["to"],{"type":"rtc_ice","from":uid,"candidate":msg["candidate"]})

    except WebSocketDisconnect:
        pass
    finally:
        WS_CONNECTIONS.pop(uid, None)
        USERS[uid]["online"] = False
        for cid, members in VOICE_ROOMS.items():
            if uid in members:
                members.discard(uid)
                await broadcast_all({"type":"voice_state","channel_id":cid,"members":list(members)})
        await broadcast_all({"type":"user_offline","uid":uid,"user":safe_user(USERS[uid])})

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

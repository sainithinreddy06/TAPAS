import requests

s = requests.Session()
login_res = s.post("http://localhost:8000/api/auth/login", json={"email": "officer@tapas.gov.in", "password": "tapas2026"})
print("Login status:", login_res.status_code, login_res.json().get("role"))

# 1. Add recipient
rec_res = s.post("http://localhost:8000/api/officer/recipients", json={
    "name": "Demo Ward Member Kukatpally",
    "role": "Ward Member",
    "phone": "+919849012345",
    "channels": ["whatsapp", "sms"],
    "language": "English",
    "consent": True,
    "zone": "Kukatpally"
})
print("Add recipient status:", rec_res.status_code, rec_res.json())
rec_id = rec_res.json().get("id")

# 2. List recipients (masked)
list_res = s.get("http://localhost:8000/api/officer/recipients")
print("List recipients status:", list_res.status_code, len(list_res.json()), "First phone masked:", list_res.json()[0]["phone"])

# 3. Notify member
notify_res = s.post("http://localhost:8000/api/officer/notify-member", json={"recipient_id": rec_id, "ward_id": "HYD-001"})
print("Notify member status:", notify_res.status_code, notify_res.json().get("status"), "channels:", notify_res.json().get("dispatched_channels"))

# 4. Call member
call_res = s.post("http://localhost:8000/api/officer/call-member", json={"recipient_id": rec_id, "ward_id": "HYD-001"})
print("Call member status:", call_res.status_code, call_res.json().get("status"), "call_sid:", call_res.json().get("call_sid"))

# 5. Broadcast to all
bcast_res = s.post("http://localhost:8000/api/officer/broadcast", json={
    "template": "Heat wave emergency alert. Take necessary precautions.",
    "zone": "Kukatpally",
    "ward_id": "HYD-001"
})
print("Broadcast status:", bcast_res.status_code, "sent:", bcast_res.json().get("sent_count"), "ref:", bcast_res.json().get("reference_code"))

import sys
import os
import re
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

import asyncio
from app.database import SessionFactory
from app.models.broadcast import BroadcastRecipient
from app.models.base import new_id, utcnow
from sqlalchemy import select, delete


async def register_phone_in_db(phone: str, name: str = "Field Officer"):
    phone = phone.strip().replace(" ", "").replace("-", "")
    if not phone.startswith("+"):
        if len(phone) == 10:
            phone = "+91" + phone
        else:
            phone = "+" + phone

    async with SessionFactory() as session:
        # Remove any existing recipient with this phone
        await session.execute(delete(BroadcastRecipient).where(BroadcastRecipient.phone == phone))
        
        recipient = BroadcastRecipient(
            id=new_id(),
            ward_id="ward-42-kukatpally",
            zone="Kukatpally",
            name=name,
            role="Mandal Officer",
            phone=phone,
            channels=["whatsapp", "sms"],
            language="en",
            consent_at=utcnow(),
            added_by="usr-officer-01",
            is_demo=False,
        )
        session.add(recipient)
        await session.commit()
        print(f"[OK] Successfully registered {phone} ({name}) as active emergency recipient in TAPAS DB.")


def update_env(sid: str, token: str, twilio_from: str):
    env_path = backend_dir / ".env"
    if not env_path.exists():
        print(f"[ERROR] {env_path} not found.")
        return False

    content = env_path.read_text(encoding="utf-8")
    content = re.sub(r"^NOTIFICATION_MODE=.*", "NOTIFICATION_MODE=live", content, flags=re.MULTILINE)
    content = re.sub(r"^TWILIO_ACCOUNT_SID=.*", f"TWILIO_ACCOUNT_SID={sid.strip()}", content, flags=re.MULTILINE)
    content = re.sub(r"^TWILIO_AUTH_TOKEN=.*", f"TWILIO_AUTH_TOKEN={token.strip()}", content, flags=re.MULTILINE)
    content = re.sub(r"^TWILIO_VOICE_FROM=.*", f"TWILIO_VOICE_FROM={twilio_from.strip()}", content, flags=re.MULTILINE)
    content = re.sub(r"^TWILIO_SMS_FROM=.*", f"TWILIO_SMS_FROM={twilio_from.strip()}", content, flags=re.MULTILINE)

    env_path.write_text(content, encoding="utf-8")
    print(f"[OK] Updated {env_path} with NOTIFICATION_MODE=live and Twilio credentials.")
    return True


if __name__ == "__main__":
    if len(sys.argv) >= 5:
        phone = sys.argv[1]
        sid = sys.argv[2]
        token = sys.argv[3]
        twilio_from = sys.argv[4]
        update_env(sid, token, twilio_from)
        asyncio.run(register_phone_in_db(phone))
    elif len(sys.argv) == 2:
        phone = sys.argv[1]
        asyncio.run(register_phone_in_db(phone))
    else:
        print("Usage:")
        print("  python setup_live_telephony.py <YOUR_PHONE> <TWILIO_SID> <TWILIO_TOKEN> <TWILIO_FROM_NUMBER>")
        print("Or to register phone number:")
        print("  python setup_live_telephony.py <YOUR_PHONE>")

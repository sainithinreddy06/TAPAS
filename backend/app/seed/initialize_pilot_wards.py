```python
import asyncio

from sqlalchemy import select

from app.database import SessionFactory, engine
from app.models import Ward
from app.seed.wards import PILOT_WARDS


async def initialize_pilot_wards():
    inserted = 0
    skipped = 0

    async with SessionFactory() as db:
        try:
            for data in PILOT_WARDS:
                existing_id = await db.scalar(
                    select(Ward.id).where(Ward.id == data["id"])
                )

                if existing_id:
                    skipped += 1
                    continue

                db.add(
                    Ward(
                        **data,
                        city="Hyderabad",
                        state="Telangana",
                        district="district-hyderabad",
                        geom=None,
                        derivation_note=(
                            "Pilot locality centre. "
                            "Identifier and assignment group are "
                            "demonstration identifiers, not certified "
                            "GHMC boundaries or district assignments."
                        ),
                    )
                )
                inserted += 1

            await db.commit()

        except Exception:
            await db.rollback()
            raise

    print(
        {
            "inserted": inserted,
            "skipped_existing": skipped,
            "total_pilot_wards": inserted + skipped,
        }
    )


async def main():
    try:
        await initialize_pilot_wards()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
```

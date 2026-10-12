import asyncio

from sqlalchemy import text
from app.database import engine


async def main():
    try:
        async with engine.connect() as connection:
            result = await connection.execute(
                text("SELECT current_database(), current_user")
            )
            database, user = result.one()

            print("Database connection: SUCCESS")
            print(f"Database: {database}")
            print(f"User: {user}")

    except Exception as exc:
        print("Database connection: FAILED")
        print(f"{type(exc).__name__}: {exc}")

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
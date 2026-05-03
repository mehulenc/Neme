import os
from typing import Optional

import httpx

from .database import SessionLocal
from .models import SystemSetting

SPLITWISE_CONSUMER_KEY = os.environ.get("SPLITWISE_CONSUMER_KEY")
SPLITWISE_CONSUMER_SECRET = os.environ.get("SPLITWISE_CONSUMER_SECRET")
REDIRECT_URI = os.environ.get(
    "REDIRECT_URI", "http://localhost:8000/auth/splitwise/callback"
)


def get_authorize_url() -> str:
    return (
        f"https://secure.splitwise.com/oauth/authorize?"
        f"response_type=code&"
        f"client_id={SPLITWISE_CONSUMER_KEY}&"
        f"redirect_uri={REDIRECT_URI}"
    )


async def exchange_code_for_token(code: str) -> dict:
    url = "https://secure.splitwise.com/oauth/token"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": SPLITWISE_CONSUMER_KEY,
        "client_secret": SPLITWISE_CONSUMER_SECRET,
        "redirect_uri": REDIRECT_URI,
    }
    print(f"Exchanging code for token. Redirect URI: {REDIRECT_URI}")
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data)
        if response.status_code != 200:
            print(f"Error from Splitwise: {response.status_code} - {response.text}")
        response.raise_for_status()
        return response.json()


def save_token(token: str):
    db = SessionLocal()
    try:
        print("Saving token to database...")
        setting = (
            db.query(SystemSetting)
            .filter(SystemSetting.key == "splitwise_access_token")
            .first()
        )
        if not setting:
            setting = SystemSetting(key="splitwise_access_token", value=token)
            db.add(setting)
        else:
            setting.value = token
        db.commit()
        print("Token saved successfully.")
    finally:
        db.close()


def get_token() -> Optional[str]:
    db = SessionLocal()
    try:
        setting = (
            db.query(SystemSetting)
            .filter(SystemSetting.key == "splitwise_access_token")
            .first()
        )
        return setting.value if setting else None
    finally:
        db.close()


class SplitwiseClient:
    BASE_URL = "https://secure.splitwise.com/api/v3.0"

    def __init__(self):
        self.token = get_token()
        if not self.token:
            raise ValueError("Splitwise access token not found. Please authenticate.")

        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL, headers={"Authorization": f"Bearer {self.token}"}
        )

    async def get_expenses(self, **kwargs) -> list:
        params = {"limit": 100}
        params.update(kwargs)

        response = await self.client.get("/get_expenses", params=params)
        response.raise_for_status()
        data = response.json()
        return data.get("expenses", [])

    async def get_current_user(self) -> dict:
        response = await self.client.get("/get_current_user")
        response.raise_for_status()
        return response.json().get("user", {})

    async def get_friends(self) -> list:
        response = await self.client.get("/get_friends")
        response.raise_for_status()
        return response.json().get("friends", [])

    async def get_groups(self) -> list:
        response = await self.client.get("/get_groups")
        response.raise_for_status()
        return response.json().get("groups", [])

    async def create_expense(self, data: dict) -> list:
        response = await self.client.post("/create_expense", json=data)
        if response.status_code != 200:
            print(f"Error creating expense: {response.text}")
        response.raise_for_status()
        return response.json().get("expenses", [])

    async def update_expense(self, expense_id: str, data: dict) -> list:
        # Splitwise expects a POST to /update_expense/:id
        response = await self.client.post(f"/update_expense/{expense_id}", json=data)
        if response.status_code != 200:
            print(f"Error updating expense: {response.text}")
        response.raise_for_status()
        return response.json().get("expenses", [])

    async def close(self):
        await self.client.aclose()

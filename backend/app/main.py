from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

load_dotenv()

from . import database, models, splitwise
from .api_reconciliation import router as reconciliation_router

app = FastAPI(title="Splitwise Reconciliation Engine API")

app.include_router(reconciliation_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/auth/splitwise/login")
def splitwise_login():
    return RedirectResponse(url=splitwise.get_authorize_url())


@app.get("/auth/splitwise/callback")
async def splitwise_callback(code: str):
    try:
        token_data = await splitwise.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")
        splitwise.save_token(access_token)

        # Persist the current user's Splitwise ID for heuristic matching
        client = splitwise.SplitwiseClient()
        try:
            user_info = await client.get_current_user()
            user_id = str(user_info.get("id", ""))
            if user_id:
                db = database.SessionLocal()
                try:
                    setting = (
                        db.query(models.SystemSetting)
                        .filter(models.SystemSetting.key == "splitwise_user_id")
                        .first()
                    )
                    if not setting:
                        setting = models.SystemSetting(
                            key="splitwise_user_id", value=user_id
                        )
                        db.add(setting)
                    else:
                        setting.value = user_id
                    db.commit()
                finally:
                    db.close()
        finally:
            await client.close()

        return {
            "message": "Splitwise authentication successful. You can close this tab."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth/splitwise/status")
def splitwise_status():
    token = splitwise.get_token()
    return {"is_authenticated": token is not None}


from .sync import sync_splitwise_expenses


@app.post("/api/sync/splitwise")
async def trigger_splitwise_sync(
    since_date: Optional[str] = None, db: Session = Depends(database.get_db)
):
    try:
        count = await sync_splitwise_expenses(db, since_date=since_date)
        return {"status": "success", "synced_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from .splitwise import SplitwiseClient


@app.get("/api/splitwise/current_user")
async def get_sw_current_user():
    client = SplitwiseClient()
    try:
        return await client.get_current_user()
    finally:
        await client.close()


@app.get("/api/splitwise/friends")
async def get_sw_friends():
    client = SplitwiseClient()
    try:
        return await client.get_friends()
    finally:
        await client.close()


@app.get("/api/splitwise/groups")
async def get_sw_groups():
    client = SplitwiseClient()
    try:
        return await client.get_groups()
    finally:
        await client.close()


@app.get("/api/splitwise/expenses")
def get_splitwise_expenses(
    limit: int = 50, offset: int = 0, db: Session = Depends(database.get_db)
):
    expenses = (
        db.query(models.SplitwiseExpense)
        .order_by(
            models.SplitwiseExpense.expense_date.desc(),
            models.SplitwiseExpense.updated_at.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {"expenses": expenses}


from fastapi import File, Form, UploadFile

from .import_engine import process_import
from .parsers.axis import AxisParser
from .parsers.hsbc import HSBCParser
from .parsers.icici import ICICIParser


@app.post("/api/import")
async def import_transactions(
    account_id: str = Form(...),
    source_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
):
    content = await file.read()

    if source_type == "hsbc":
        parser = HSBCParser()
    elif source_type == "axis":
        parser = AxisParser()
    elif source_type == "icici":
        parser = ICICIParser()
    elif source_type == "kotak_mt940":
        from .parsers.mt940 import MT940Parser

        parser = MT940Parser()
    else:
        raise HTTPException(
            status_code=400, detail=f"Unsupported source type: {source_type}"
        )

    if source_type == "kotak_mt940":
        parsed_transactions, mt940_meta = parser.parse_with_metadata(content)

        # Persist closing balance to system settings
        closing = mt940_meta.get("closing_balance")
        if closing:
            for key, val in {
                "kotak_closing_balance_minor": str(closing["amount_minor_units"]),
                "kotak_closing_balance_currency": closing["currency_code"],
                "kotak_closing_balance_date": closing["balance_date"],
            }.items():
                setting = (
                    db.query(models.SystemSetting)
                    .filter(models.SystemSetting.key == key)
                    .first()
                )
                if setting:
                    setting.value = val
                else:
                    db.add(models.SystemSetting(key=key, value=val))
            db.flush()
    else:
        parsed_transactions = parser.parse(content)
        closing = None

    # Ensure account exists
    account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not account:
        institution_map = {
            "hsbc": "HSBC",
            "axis": "Axis Bank",
            "icici": "ICICI Bank",
            "kotak_mt940": "Kotak Bank",
        }
        institution = institution_map.get(source_type, source_type.upper())
        account = models.Account(
            id=account_id,
            name=f"{institution} ({account_id})",
            institution=institution,
            currency_code="USD",
        )
        db.add(account)
        db.flush()

    inserted, collisions = process_import(
        db, account_id, source_type, file.filename, "1.0", parsed_transactions
    )

    response: dict = {
        "status": "success",
        "inserted": inserted,
        "collisions": collisions,
    }
    if closing:
        response["closing_balance"] = closing
    return response


@app.get("/api/accounts/kotak/balance")
def get_kotak_balance(db: Session = Depends(database.get_db)):
    """Return the last known Kotak closing balance extracted from an MT940 import."""
    keys = [
        "kotak_closing_balance_minor",
        "kotak_closing_balance_currency",
        "kotak_closing_balance_date",
    ]
    settings = {
        s.key: s.value
        for s in db.query(models.SystemSetting)
        .filter(models.SystemSetting.key.in_(keys))
        .all()
    }
    if "kotak_closing_balance_minor" not in settings:
        return {"balance": None}
    return {
        "balance": {
            "amount_minor_units": int(settings["kotak_closing_balance_minor"]),
            "currency_code": settings.get("kotak_closing_balance_currency", "INR"),
            "balance_date": settings.get("kotak_closing_balance_date"),
        }
    }


@app.get("/api/transactions")
def get_transactions(
    limit: int = 50, offset: int = 0, db: Session = Depends(database.get_db)
):
    transactions = (
        db.query(models.Transaction)
        .options(joinedload(models.Transaction.account))
        .order_by(models.Transaction.transaction_date.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    transaction_list = []
    for t in transactions:
        t_dict = {c.name: getattr(t, c.name) for c in t.__table__.columns}
        t_dict["institution"] = t.account.institution if t.account else "Unknown"
        transaction_list.append(t_dict)

    return {"transactions": transaction_list}

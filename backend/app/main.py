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
async def trigger_splitwise_sync(db: Session = Depends(database.get_db)):
    try:
        count = await sync_splitwise_expenses(db)
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
from .parsers.hsbc import HSBCParser


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
    else:
        raise HTTPException(
            status_code=400, detail=f"Unsupported source type: {source_type}"
        )

    parsed_transactions = parser.parse(content)
    inserted, collisions = process_import(
        db, account_id, source_type, file.filename, "1.0", parsed_transactions
    )

    return {"status": "success", "inserted": inserted, "collisions": collisions}


@app.get("/api/transactions")
def get_transactions(
    limit: int = 50, offset: int = 0, db: Session = Depends(database.get_db)
):
    transactions = (
        db.query(models.Transaction)
        .order_by(models.Transaction.transaction_date.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {"transactions": transactions}

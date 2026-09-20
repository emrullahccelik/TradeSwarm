from fastapi import FastAPI
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="TradeSwarm API")

@app.get("/")
def read_root():
    return {"message": "TradeSwarm Backend is running!"}

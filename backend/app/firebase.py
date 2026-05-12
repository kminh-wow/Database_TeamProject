import os
import firebase_admin
from firebase_admin import credentials, auth, firestore
from dotenv import load_dotenv

load_dotenv()

_firebase_app = None


def get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-adminsdk.json")
        cred = credentials.Certificate(cred_path)
        _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def verify_id_token(id_token: str) -> dict:
    get_firebase_app()
    return auth.verify_id_token(id_token)


def get_firestore():
    get_firebase_app()
    return firestore.client()

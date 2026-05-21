import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.firebase import verify_id_token

bearer_scheme = HTTPBearer()

_ADMIN_EMAILS = (
    {e.strip() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}
    or {"akask9635@gmail.com", "rkddlstjs707@gmail.com", "kminh9635@daum.net", "rkddlstjs707@soongsil.ac.kr"}
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    try:
        decoded = verify_id_token(credentials.credentials)
        if not decoded.get("email_verified", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이메일 인증이 필요합니다.",
            )
        return decoded
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다.",
        )


def get_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    user = get_current_user(credentials)
    if user.get("email") not in _ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다.",
        )
    return user

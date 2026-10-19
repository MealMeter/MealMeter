"""역할: MealMeter API 서버의 시작점. 라우터 3개를 붙이고, 모든 오류를 { "message": ... } 모양으로 바꾼다.
실행: uvicorn app.main:app --reload --port 8080"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .database import init_db
from .routers import menus, ranking, reviews


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="MealMeter API", lifespan=lifespan)
app.include_router(menus.router)
app.include_router(reviews.router)
app.include_router(ranking.router)


# 오류는 모두 { "message": "한 줄 메시지" } 모양으로 보낸다 (명세서 5장).
@app.exception_handler(StarletteHTTPException)
async def http_error(_request: Request, error: StarletteHTTPException):
    message = error.detail if isinstance(error.detail, str) else "요청을 처리하지 못했어요."
    if error.status_code == 404 and message == "Not Found":
        message = "없는 주소예요."
    return JSONResponse({"message": message}, status_code=error.status_code)


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, _error: RequestValidationError):
    return JSONResponse({"message": "보낸 값의 형식이 올바르지 않아요."}, status_code=422)

from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: str | None = None

class UserOut(BaseModel):
    id: str
    name: str
    email: str | None = None

    class Config:
        orm_mode = True
        from_attributes = True

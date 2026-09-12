# TaskFlow Backend - Testing Guide

## ✓ Backend Status: READY FOR TESTING

The FastAPI backend is running at: **http://127.0.0.1:8000**

### Access Interactive Docs

- **Swagger UI**: http://127.0.0.1:8000/docs
- **Alternative (ReDoc)**: http://127.0.0.1:8000/redoc

### Testing the Three Auth Endpoints

#### 1. POST /auth/signup - Register a New User

**In Swagger UI:**
1. Find "POST /auth/signup" endpoint
2. Click "Try it out"
3. Enter JSON body:
```json
{
  "full_name": "Your Name",
  "email": "yourname@example.com",
  "password": "SecurePassword123"
}
```
4. Click "Execute"
5. **Expected Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": 1,
  "full_name": "Your Name",
  "email": "yourname@example.com"
}
```

**Copy the token value for next test**

---

#### 2. POST /auth/signin - Sign In

**In Swagger UI:**
1. Find "POST /auth/signin" endpoint
2. Click "Try it out"
3. Enter JSON body:
```json
{
  "email": "yourname@example.com",
  "password": "SecurePassword123"
}
```
4. Click "Execute"
5. **Expected Response (200):** Same as signup - returns JWT token

---

#### 3. GET /users/me - Get User Profile

**In Swagger UI:**
1. Find "GET /users/me" endpoint
2. Click "Try it out"
3. **Authorization Required:**
   - Find the "Authorize" button at the top of Swagger UI
   - Click it
   - Paste the JWT token from signup/signin (just the token, no "Bearer" prefix)
   - Click "Authorize"
4. Click "Execute"
5. **Expected Response (200):**
```json
{
  "user_id": 1,
  "full_name": "Your Name",
  "email": "yourname@example.com",
  "onboarding": null
}
```

---

### Error Cases to Test (Optional)

**Invalid Email Format (signup):**
```json
{
  "full_name": "Test",
  "email": "invalid-email",
  "password": "password123"
}
```
Expected: 400 Bad Request - "Enter a valid email address"

**Password Too Short (signup):**
```json
{
  "full_name": "Test",
  "email": "test@example.com",
  "password": "short"
}
```
Expected: 400 Bad Request - "Password must be at least 8 characters long"

**Duplicate Email (signup):**
```json
{
  "full_name": "Test",
  "email": "yourname@example.com",
  "password": "password123"
}
```
Expected: 409 Conflict - "Email already registered"

**Invalid Credentials (signin):**
```json
{
  "email": "yourname@example.com",
  "password": "WrongPassword"
}
```
Expected: 401 Unauthorized - "Invalid email or password"

**Missing Token (GET /users/me):**
1. Try the endpoint without authorization
Expected: 401 Unauthorized - "Authentication required"

---

### Database Verification

Check database health:
- **Endpoint**: http://127.0.0.1:8000/db/health
- Shows: user count, task count, habit count, database path

---

## ✓ Backend Authentication Ready

Once you verify all three endpoints work in Swagger UI, the backend is ready for:
- Wiring up React AuthPage component
- Testing user registration flow
- Testing user login flow

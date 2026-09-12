"""Test script for authentication endpoints."""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_signup():
    """Test the signup endpoint."""
    print("\n=== Testing POST /auth/signup ===")
    payload = {
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "password123"
    }
    response = requests.post(f"{BASE_URL}/auth/signup", json=payload)
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    return data.get("token") if response.status_code == 200 else None


def test_signin(email="test@example.com", password="password123"):
    """Test the signin endpoint."""
    print("\n=== Testing POST /auth/signin ===")
    payload = {
        "email": email,
        "password": password
    }
    response = requests.post(f"{BASE_URL}/auth/signin", json=payload)
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    return data.get("token") if response.status_code == 200 else None


def test_get_me(token):
    """Test the GET /users/me endpoint."""
    print("\n=== Testing GET /users/me ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users/me", headers=headers)
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    return response.status_code == 200


def main():
    print("Starting authentication endpoint tests...")
    
    # Test signup
    token1 = test_signup()
    if not token1:
        print("❌ Signup failed")
        return
    
    print("✓ Signup succeeded, got JWT token")
    print(f"Token: {token1[:20]}...")
    
    # Test signin
    token2 = test_signin()
    if not token2:
        print("❌ Signin failed")
        return
    
    print("✓ Signin succeeded, got JWT token")
    print(f"Token: {token2[:20]}...")
    
    # Test GET /users/me
    if test_get_me(token1):
        print("✓ GET /users/me succeeded with signup token")
    else:
        print("❌ GET /users/me failed with signup token")
    
    if test_get_me(token2):
        print("✓ GET /users/me succeeded with signin token")
    else:
        print("❌ GET /users/me failed with signin token")
    
    print("\n✓ All tests completed!")


if __name__ == "__main__":
    main()

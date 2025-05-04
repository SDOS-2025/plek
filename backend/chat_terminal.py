import requests

BASE_URL = "http://localhost:8000/api/chatbot/chat/"
LOGIN_URL = "http://localhost:8000/api/auth/login/"

def get_auth_token(email, password):
    try:
        response = requests.post(
            LOGIN_URL,
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            return response.json().get("key")
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error: {e}")
        return None

def chat_with_bot():
    email = input("Enter your email: ")
    password = input("Enter your password: ")
    
    auth_token = get_auth_token(email, password)
    if not auth_token:
        print("Failed to retrieve auth token. Exiting.")
        return

    print(f"Chatbot CLI (type 'exit' to quit)")
    while True:
        user_message = input("You: ")
        if user_message.lower() == "exit":
            break

        response = requests.post(
            BASE_URL,
            headers={"Authorization": f"Token {auth_token}"},
            json={"message": user_message},
        )
        
        if response.status_code == 200:
            bot_response = response.json().get("bot_response")
            print(f"Bot: {bot_response}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
            
if __name__ == "__main__":
    chat_with_bot()
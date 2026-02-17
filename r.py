import pandas as pd
from supabase import create_client
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Load credentials from .env file (secure!)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Verify credentials are loaded
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials! Make sure .env file exists.")

# Create client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Connected to Supabase!")

# Query all recommendations
response = supabase.table('recommendations').select('*').execute()

# Convert to DataFrame
recommendations_df = pd.DataFrame(response.data)

# See what we got!
print(f"Loaded {len(recommendations_df)} recommendations")
print(recommendations_df.head())  # First 5 rows

# Query all users
response = supabase.table('users').select('*').execute()

# Convert to DataFrame
users_df = pd.DataFrame(response.data)

print(f"Loaded {len(users_df)} users")
print(users_df.head())

# Query all friendships
response = supabase.table('friends').select('*').execute()

# Convert to DataFrame
friends_df = pd.DataFrame(response.data)

print(f"Loaded {len(friends_df)} friendships")
print(friends_df.head())

import pandas as pd
from supabase import create_client
from dotenv import load_dotenv
import os

# Load your .env file
load_dotenv()

# Connect to Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

print("Connected!")

# Load all 3 tables
recommendations_df = pd.DataFrame(
    supabase.table('recommendations').select('*').execute().data
)

users_df = pd.DataFrame(
    supabase.table('users').select('*').execute().data
)

friends_df = pd.DataFrame(
    supabase.table('friends').select('*').execute().data
)

# See what we got
print(f"Recommendations: {len(recommendations_df)} rows")
print(f"Users: {len(users_df)} rows")
print(f"Friends: {len(friends_df)} rows")

print("\n--- Recommendations Columns ---")
print(recommendations_df.columns.tolist())

print("\n--- First 3 Recommendations ---")
print(recommendations_df.head(3))
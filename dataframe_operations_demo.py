import pandas as pd
from supabase import create_client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Connect to Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

print("=" * 80)
print("PANDAS DATAFRAME OPERATIONS WITH SUPABASE DATA")
print("=" * 80)

# Load recommendations data
response = supabase.table('recommendations').select('*').execute()

# Convert to DataFrame
df = pd.DataFrame(response.data)

print(f"\n✅ Loaded {len(df)} recommendations from Supabase\n")

# ============================================================================
# 1. VIEW DATA
# ============================================================================
print("1. VIEW FIRST 5 ROWS")
print("-" * 80)
print(df.head())

# ============================================================================
# 2. DATAFRAME INFO
# ============================================================================
print("\n\n2. DATAFRAME INFO")
print("-" * 80)
print(f"Shape (rows, columns): {df.shape}")
print(f"Column names: {df.columns.tolist()}")
print(f"\nData types:")
print(df.dtypes)

# ============================================================================
# 3. BASIC STATISTICS (if numeric columns exist)
# ============================================================================
print("\n\n3. BASIC STATISTICS")
print("-" * 80)
numeric_cols = df.select_dtypes(include=['number']).columns
if len(numeric_cols) > 0:
    print(df.describe())
else:
    print("No numeric columns found")

# ============================================================================
# 4. FILTERING ROWS
# ============================================================================
print("\n\n4. FILTERING EXAMPLES")
print("-" * 80)

# Example: Filter by a specific column (adjust based on your actual columns)
if 'status' in df.columns:
    print(f"Recommendations with status 'sent':")
    filtered = df[df['status'] == 'sent']
    print(filtered.head())
elif 'created_at' in df.columns:
    print(f"First 3 recommendations by creation date:")
    print(df.head(3))
else:
    print("Available columns:", df.columns.tolist())

# ============================================================================
# 5. GROUPING DATA
# ============================================================================
print("\n\n5. GROUPING EXAMPLES")
print("-" * 80)

# Group by a column if it exists
if 'sender_id' in df.columns:
    print("Count of recommendations by sender:")
    grouped = df.groupby('sender_id').size()
    print(grouped)
elif 'receiver_id' in df.columns:
    print("Count of recommendations by receiver:")
    grouped = df.groupby('receiver_id').size()
    print(grouped)
else:
    print("No suitable column for grouping found")
    print("Available columns:", df.columns.tolist())

# ============================================================================
# 6. SELECTING SPECIFIC COLUMNS
# ============================================================================
print("\n\n6. SELECTING SPECIFIC COLUMNS")
print("-" * 80)
if len(df.columns) >= 2:
    # Select first 2 columns
    subset = df.iloc[:, :2]
    print(f"First 2 columns only:")
    print(subset.head())

# ============================================================================
# 7. SORTING
# ============================================================================
print("\n\n7. SORTING")
print("-" * 80)
if 'created_at' in df.columns:
    sorted_df = df.sort_values('created_at', ascending=False)
    print("Sorted by created_at (newest first):")
    print(sorted_df.head())
else:
    # Sort by first column
    first_col = df.columns[0]
    sorted_df = df.sort_values(first_col)
    print(f"Sorted by {first_col}:")
    print(sorted_df.head())

# ============================================================================
# SUMMARY
# ============================================================================
print("\n\n" + "=" * 80)
print("COMMON DATAFRAME OPERATIONS SUMMARY")
print("=" * 80)
print("""
df.head()                    # First 5 rows
df.tail()                    # Last 5 rows
df.shape                     # (rows, columns)
df.columns                   # Column names
df.dtypes                    # Data types
df.describe()                # Statistics for numeric columns
df['column_name']            # Select one column
df[['col1', 'col2']]         # Select multiple columns
df[df['col'] > value]        # Filter rows
df.sort_values('col')        # Sort by column
df.groupby('col').size()     # Count by group
df.groupby('col').mean()     # Average by group
""")

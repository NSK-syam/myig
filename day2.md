# Day 2: Pandas - Data Analysis with Python

## Overview

Pandas is Python's most powerful library for data manipulation and analysis. Think of it as a programmable Excel with superpowers.

**Key Concepts:**
- **DataFrame**: A table with rows and columns (like a spreadsheet)
- **Series**: A single column of data
- **Index**: Row labels

---

## 1. Creating DataFrames

### From Dictionary (Most Common)

```python
import pandas as pd

movies = {
    'title': ['Matrix', 'Inception', 'Interstellar'],
    'rating': [8.7, 8.8, 8.6],
    'year': [1999, 2010, 2014]
}
df = pd.DataFrame(movies)
```

### From List of Lists

```python
data = [
    ['Matrix', 8.7, 1999],
    ['Inception', 8.8, 2010]
]
df = pd.DataFrame(data, columns=['title', 'rating', 'year'])
```

### From List of Dictionaries (API/JSON Style)

```python
data = [
    {'title': 'Matrix', 'rating': 8.7, 'year': 1999},
    {'title': 'Inception', 'rating': 8.8, 'year': 2010}
]
df = pd.DataFrame(data)
```

**Key Point:** When columns are in the data (first row), you must extract them manually:
```python
data_with_header = [
    ['title', 'rating', 'year'],  # Header row
    ['Matrix', 8.7, 1999]
]
df = pd.DataFrame(data_with_header[1:], columns=data_with_header[0])
```

---

## 2. Viewing Data

```python
df.head()           # First 5 rows
df.head(10)         # First 10 rows
df.tail()           # Last 5 rows
df.sample(3)        # Random 3 rows
df.info()           # Column info and types
df.describe()       # Statistics summary
```

---

## 3. DataFrame Properties

```python
df.shape            # (rows, columns) e.g., (100, 5)
df.columns          # Column names
df.dtypes           # Data types
len(df)             # Number of rows
df.size             # Total cells
```

---

## 4. Selecting Data

### Single Column
```python
df['rating']        # Returns Series
df.rating           # Alternative syntax
```

### Multiple Columns
```python
df[['title', 'rating']]  # Returns DataFrame
```

### By Position
```python
df.iloc[0]          # First row
df.iloc[0:5]        # First 5 rows
df.iloc[:, 0:2]     # All rows, first 2 columns
```

---

## 5. Filtering Rows

### Single Condition
```python
df[df['rating'] > 8.0]              # High ratings
df[df['title'] == 'Matrix']         # Exact match
```

### Multiple Conditions
```python
# AND
df[(df['rating'] > 8.0) & (df['year'] >= 2000)]

# OR
df[(df['rating'] > 9.0) | (df['year'] < 1990)]

# NOT
df[~(df['rating'] < 5.0)]

# In list
df[df['genre'].isin(['Action', 'Sci-Fi'])]
```

---

## 6. Sorting

```python
# Ascending
df.sort_values('rating')

# Descending
df.sort_values('rating', ascending=False)

# Multiple columns
df.sort_values(['year', 'rating'], ascending=[True, False])
```

---

## 7. Grouping & Aggregation

```python
# Count by group
df.groupby('genre').size()

# Average by group
df.groupby('genre')['rating'].mean()

# Multiple aggregations
df.groupby('genre').agg({
    'rating': ['mean', 'max', 'min'],
    'title': 'count'
})

# Multiple columns
df.groupby(['genre', 'year']).size()
```

**Important:** `groupby()` alone doesn't show results - you need an aggregation:
```python
# ❌ Wrong
df.groupby('genre')

# ✅ Correct
df.groupby('genre').size()
df.groupby('genre')['rating'].mean()
```

---

## 8. Statistics

```python
# Single column
df['rating'].mean()     # Average
df['rating'].median()   # Median
df['rating'].max()      # Maximum
df['rating'].min()      # Minimum
df['rating'].std()      # Standard deviation
df['rating'].sum()      # Sum

# All numeric columns
df.mean()
df.describe()
```

---

## 9. Adding/Modifying Columns

```python
# New column from calculation
df['rating_squared'] = df['rating'] ** 2

# Conditional column
df['high_rated'] = df['rating'] > 8.0

# From multiple columns
df['age'] = 2024 - df['year']
```

---

## 10. Handling Missing Data

```python
# Check for missing values
df.isnull().sum()

# Drop rows with missing values
df.dropna()

# Fill missing values
df.fillna(0)
df.fillna({'age': df['age'].mean(), 'city': 'Unknown'})
```

---

## 11. Applying Functions

```python
# Apply to column
df['title_length'] = df['title'].apply(len)

# Custom function
def categorize(rating):
    if rating >= 9.0:
        return 'Masterpiece'
    elif rating >= 8.5:
        return 'Excellent'
    else:
        return 'Good'

df['category'] = df['rating'].apply(categorize)
```

---

## 12. Merging DataFrames

```python
ratings = pd.DataFrame({
    'movie_id': [1, 2, 3],
    'title': ['Matrix', 'Inception', 'Interstellar'],
    'rating': [8.7, 8.8, 8.6]
})

box_office = pd.DataFrame({
    'movie_id': [1, 2, 3],
    'revenue': [467, 829, 677]
})

# Merge on common column
merged = pd.merge(ratings, box_office, on='movie_id')
```

---

## 13. Useful Operations

```python
# Unique values
df['genre'].unique()

# Value counts
df['genre'].value_counts()

# Find duplicates
df[df.duplicated(['year'], keep=False)]

# Reset index
df.reset_index(drop=True)
```

---

## 14. Real BingeItBro Data Analysis

This is a real-world example using your actual BingeItBro Supabase database!

### Step 1: Connect & Load All Tables

```python
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

# Load all 3 tables into DataFrames
recommendations_df = pd.DataFrame(
    supabase.table("recommendations").select("*").execute().data
)
users_df = pd.DataFrame(
    supabase.table("users").select("*").execute().data
)
friends_df = pd.DataFrame(
    supabase.table("friends").select("*").execute().data
)

print(f"Recommendations: {len(recommendations_df)} rows")
print(f"Users: {len(users_df)} rows")
print(f"Friends: {len(friends_df)} rows")
```

### Step 2: Explore the Data

```python
# See what columns exist
print(recommendations_df.columns.tolist())
# e.g. ['id', 'sender_id', 'receiver_id', 'movie_id', 'status', 'note', 'created_at']

# First 3 rows
print(recommendations_df.head(3))

# Data types
print(recommendations_df.dtypes)

# Missing values
print(recommendations_df.isnull().sum())
```

### Step 3: Analyze Recommendations

```python
# How many recommendations per sender?
print(recommendations_df.groupby('sender_id').size().sort_values(ascending=False))

# Status distribution (sent / accepted / pending)
print(recommendations_df['status'].value_counts())

# Only sent recommendations
sent = recommendations_df[recommendations_df['status'] == 'sent']
print(f"Sent: {len(sent)}")

# Most recommended movies
print(recommendations_df['movie_id'].value_counts().head(10))
```

### Step 4: Cross-Table Analysis (Merge)

```python
# Join recommendations with users to get names
recs_with_names = pd.merge(
    recommendations_df,
    users_df[['id', 'username']].rename(columns={'id': 'sender_id', 'username': 'sender_name'}),
    on='sender_id',
    how='left'
)

print(recs_with_names[['sender_name', 'movie_id', 'status']].head())

# Who sends the most recommendations?
top_senders = recs_with_names.groupby('sender_name').size().sort_values(ascending=False)
print(top_senders.head(5))
```

### Step 5: Friends Network Analysis

```python
# How many friends does each user have?
friend_counts = friends_df.groupby('user_id').size().sort_values(ascending=False)
print(friend_counts.head(10))

# Average friends per user
print(f"Average friends per user: {friend_counts.mean():.1f}")

# Users with most friends
most_connected = friend_counts.head(5)
print("Most connected users:")
print(most_connected)
```

### Step 6: Time-Based Analysis

```python
# Convert created_at to datetime
recommendations_df['created_at'] = pd.to_datetime(recommendations_df['created_at'])

# Recommendations per day
recommendations_df['date'] = recommendations_df['created_at'].dt.date
daily = recommendations_df.groupby('date').size()
print("Daily recommendation counts:")
print(daily)

# Most active day
most_active = daily.idxmax()
print(f"Most active day: {most_active} ({daily.max()} recommendations)")
```

---

## Quick Reference

| Operation | Code |
|-----------|------|
| **View** | `df.head()`, `df.tail()`, `df.sample()` |
| **Info** | `df.shape`, `df.columns`, `df.dtypes` |
| **Select** | `df['col']`, `df[['col1', 'col2']]` |
| **Filter** | `df[df['col'] > value]` |
| **Sort** | `df.sort_values('col')` |
| **Group** | `df.groupby('col').size()` |
| **Stats** | `df['col'].mean()`, `df.describe()` |
| **Missing** | `df.isnull()`, `df.dropna()`, `df.fillna()` |
| **Merge** | `pd.merge(df1, df2, on='col')` |

---

## Practice Files

Run these to see examples in action:
```bash
python3 day2_01_pandas_intro.py
python3 day2_02_pandas_operations.py
```

---

## Key Takeaways

1. **DataFrame = Programmable Spreadsheet** with powerful operations
2. **Supabase returns list of dicts** → `pd.DataFrame(response.data)` just works
3. **Filtering** uses boolean conditions with `&` (AND) and `|` (OR)
4. **Groupby** always needs an aggregation (`.size()`, `.mean()`, etc.)
5. **Merge** lets you join tables like SQL JOIN
6. **Real data is messy** → always check `.isnull().sum()` and `.dtypes` first

---

**Next Steps:** Run the analysis on your real BingeItBro data and see what patterns you find!

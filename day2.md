# Day 2: Pandas & Real Data Analysis

## What You Will Learn Today

By the end of Day 2, you will be able to:

- Understand what Pandas is and why it exists
- Create and inspect DataFrames
- Filter, sort, and transform data
- Handle missing values
- Group and aggregate data
- Merge multiple tables together
- Load your actual BingeItBro data from Supabase
- Analyze your real recommendations

---

## Prerequisites

Make sure you are clear on Day 1:
- NumPy arrays
- Cosine similarity
- TF-IDF (convert text to numbers, boost rare words)

---

## Setup

```bash
pip install pandas supabase python-dotenv
```

---

## Part 1: What is Pandas?

### Simple Definition

Pandas is a Python library for working with tables of data. Think of it as Excel or Google Sheets, but in Python code.

Name origin: **Pan**el **Da**ta **S**tructures

### Why Does It Exist?

NumPy from Day 1 is great for pure numbers:

```python
import numpy as np

ratings = np.array([8.5, 7.2, 9.1])
```

But real data is messy. Your BingeItBro database has:
- Movie titles (text)
- Ratings (numbers)
- Genres (lists)
- Dates (timestamps)
- Personal notes (text)
- Missing values (NULL)

NumPy cannot handle this mix well because it only works with one data type at a time. Pandas was built specifically for this problem.

### Relationship to NumPy

Pandas is built on top of NumPy. When you use Pandas, NumPy is working behind the scenes.

```
Your code
    |
    v
Pandas (easy data handling with mixed types)
    |
    v
NumPy (fast math underneath)
    |
    v
C/C++ (raw speed)
```

---

## Part 2: Series and DataFrame

Pandas has two main objects:

**Series** = A single column (1 dimension)

**DataFrame** = A full table (2 dimensions)

A DataFrame is made up of multiple Series joined together. Each column in a DataFrame is a Series.

### Series

```python
import pandas as pd

ratings = pd.Series([8.5, 8.8, 7.8, 9.0])
print(ratings)
```

Output:
```
0    8.5
1    8.8
2    7.8
3    9.0
dtype: float64
```

The left column (0, 1, 2, 3) is the **index** (row labels). The right column is the values.

### Series with Custom Index

```python
ratings = pd.Series(
    [8.5, 8.8, 7.8, 9.0],
    index=["Matrix", "Inception", "Notebook", "Dark Knight"]
)
print(ratings)
```

Output:
```
Matrix         8.5
Inception      8.8
Notebook       7.8
Dark Knight    9.0
dtype: float64
```

Now each value has a meaningful label. Access by label:
```python
print(ratings["Matrix"])   # 8.5
```

### DataFrame

```python
movies = pd.DataFrame({
    "title": ["Matrix", "Inception", "Notebook", "Dark Knight"],
    "rating": [8.5, 8.8, 7.8, 9.0],
    "year": [1999, 2010, 2004, 2008],
    "genre": ["Sci-Fi", "Sci-Fi", "Romance", "Action"]
})

print(movies)
```

Output:
```
         title  rating  year    genre
0       Matrix     8.5  1999   Sci-Fi
1    Inception     8.8  2010   Sci-Fi
2     Notebook     7.8  2004  Romance
3  Dark Knight     9.0  2008   Action
```

**Reading the output:**
- First row (title, rating, year, genre) = column names (headers)
- Left column (0, 1, 2, 3) = index (row numbers)
- Each row = all information about one movie
- Each column = one feature for all movies

**Columns go top to bottom (vertical)**
**Rows go left to right (horizontal)**

---

## Part 3: Three Ways to Create a DataFrame

### Method 1: From Dictionary (Column-First)

```python
movies = pd.DataFrame({
    "title": ["Matrix", "Inception", "Notebook"],    # column 1
    "rating": [8.5, 8.8, 7.8],                       # column 2
    "year": [1999, 2010, 2004]                        # column 3
})
```

Think: "column by column"

Each key in the dictionary is a column name. Each value is that column's data.

**When to use:** When you have data organized by feature. Good for test data and examples.

### Method 2: From Lists (Row-First)

```python
data = [
    ["Matrix", 8.5, 1999],      # row 0
    ["Inception", 8.8, 2010],   # row 1
    ["Notebook", 7.8, 2004]     # row 2
]

movies = pd.DataFrame(data, columns=["title", "rating", "year"])
```

Think: "row by row"

Each inner list is one complete record. Column names are specified separately.

**When to use:** When data comes as complete records (like reading CSV line by line).

### Method 3: From Database

```python
from supabase import create_client

supabase = create_client(url, key)
response = supabase.table("recommendations").select("*").execute()

movies = pd.DataFrame(response.data)
```

Think: "load from external source"

The database response is a list of dictionaries. Pandas converts it automatically.

**When to use:** Loading from Supabase, APIs, CSV files, Excel. This is what we use for BingeItBro.

### All Three Create the Same Result

```python
# All three methods produce identical DataFrames:

# Method 1
df1 = pd.DataFrame({"name": ["Alice", "Bob"], "age": [25, 30]})

# Method 2
df2 = pd.DataFrame([["Alice", 25], ["Bob", 30]], columns=["name", "age"])

# Method 3 (simulating database response)
df3 = pd.DataFrame([{"name": "Alice", "age": 25}, {"name": "Bob", "age": 30}])

# All produce:
#     name  age
# 0  Alice   25
# 1    Bob   30
```

---

## Part 4: Inspecting Your Data

The first thing you do every time you load data is inspect it. Never jump straight into analysis.

```python
movies = pd.DataFrame({
    "title": ["Matrix", "Inception", "Notebook", "Dark Knight", "Superbad"],
    "rating": [8.5, 8.8, 7.8, 9.0, 7.6],
    "year": [1999, 2010, 2004, 2008, 2007],
    "genre": ["Sci-Fi", "Sci-Fi", "Romance", "Action", "Comedy"],
    "duration": [136, 148, 123, 152, 113]
})
```

### head() - First N Rows

```python
print(movies.head())     # First 5 rows (default)
print(movies.head(3))    # First 3 rows
```

You never print the whole dataset because it could have millions of rows. You peek at the first few to understand the structure.

### shape - Dimensions

```python
print(movies.shape)          # (5, 5)
print(movies.shape[0])       # 5 (rows)
print(movies.shape[1])       # 5 (columns)
```

Same as NumPy. Returns a tuple (rows, columns).

### columns - Column Names

```python
print(movies.columns.tolist())
# ['title', 'rating', 'year', 'genre', 'duration']
```

Always check column names before accessing them. Typos cause KeyError.

### dtypes - Data Types

```python
print(movies.dtypes)
```

Output:
```
title       object
rating     float64
year         int64
genre       object
duration     int64
dtype: object
```

**Data types in Pandas:**
- `object` = text/strings
- `int64` = integers
- `float64` = decimals
- `bool` = True/False
- `datetime64` = dates

**Why this matters:** If a rating column shows as `object` instead of `float64`, it means ratings are stored as text. You cannot calculate the average of text. You need to convert it first.

### info() - Complete Overview

```python
movies.info()
```

Output:
```
RangeIndex: 5 entries, 0 to 4
Data columns (total 5 columns):
 #   Column    Non-Null Count  Dtype
---  ------    --------------  -----
 0   title     5 non-null      object
 1   rating    5 non-null      float64
 2   year      5 non-null      int64
 3   genre     5 non-null      object
 4   duration  5 non-null      int64
```

Most useful for spotting missing values. If "Non-Null Count" is less than total rows, you have missing data.

### describe() - Statistical Summary

```python
print(movies.describe())
```

Output:
```
          rating         year     duration
count   5.000000     5.000000     5.000000
mean    8.340000  2005.600000   134.400000
std     0.544059     4.159327    15.521...
min     7.600000  1999.000000   113.000000
25%     7.800000  2004.000000   123.000000
50%     8.500000  2007.000000   136.000000
75%     8.800000  2008.000000   148.000000
max     9.000000  2010.000000   152.000000
```

Only shows numerical columns. Gives you a quick statistical overview.

**What is a percentile:**
- 25% = 25% of values are below this number
- 50% = same as median (half above, half below)
- 75% = 75% of values are below this number

---

## Part 5: Accessing Data

### Access a Single Column

```python
titles = movies["title"]
print(type(titles))   # <class 'pandas.core.series.Series'>
```

Single bracket returns a **Series** (one column).

### Access Multiple Columns

```python
subset = movies[["title", "rating"]]
print(type(subset))   # <class 'pandas.core.frame.DataFrame'>
```

Double bracket returns a **DataFrame** (multiple columns).

This is a common beginner mistake:
- `movies["title"]` = Series (one column)
- `movies[["title"]]` = DataFrame (one column but still a table)
- `movies[["title", "rating"]]` = DataFrame (two columns)

### Access by Position (iloc)

```python
print(movies.iloc[0])        # First row
print(movies.iloc[0:2])      # First 2 rows
print(movies.iloc[1, 1])     # Row 1, Column 1 = 8.8
print(movies.iloc[-1])       # Last row
```

`iloc` = integer location. Always uses numbers. Same as NumPy indexing.

### Access by Label (loc)

```python
print(movies.loc[0, "title"])         # "Matrix"
print(movies.loc[0:2, "rating"])      # Ratings for rows 0, 1, 2
```

`loc` = label location. Uses index labels and column names.

---

## Part 6: Filtering Data

This is the most used operation in data analysis.

### Single Condition

```python
# Movies rated above 8.5
high_rated = movies[movies["rating"] > 8.5]

# Sci-Fi movies only
scifi = movies[movies["genre"] == "Sci-Fi"]

# Movies from 2000 onwards
modern = movies[movies["year"] >= 2000]
```

How it works step by step:

```python
movies["rating"] > 8.5
# Returns:
# 0    False  (8.5 is not > 8.5)
# 1     True  (8.8 is > 8.5)
# 2    False  (7.8 is not > 8.5)
# 3     True  (9.0 is > 8.5)
# 4    False  (7.6 is not > 8.5)

movies[boolean_series]
# Returns only rows where True
# Result: Inception and Dark Knight
```

This is the same boolean indexing from NumPy Day 1.

### Multiple Conditions

```python
# AND condition - both must be true
filtered = movies[(movies["genre"] == "Sci-Fi") & (movies["rating"] > 8.6)]

# OR condition - either must be true
filtered = movies[(movies["genre"] == "Romance") | (movies["year"] < 2000)]
```

**Important:** Each condition must be in its own parentheses.

```python
# WRONG - will give an error
movies[movies["rating"] > 8 and movies["genre"] == "Sci-Fi"]

# RIGHT
movies[(movies["rating"] > 8) & (movies["genre"] == "Sci-Fi")]
```

---

## Part 7: Sorting Data

```python
# Sort by rating, lowest to highest (default)
movies.sort_values("rating")

# Sort by rating, highest to lowest
movies.sort_values("rating", ascending=False)

# Sort by multiple columns
movies.sort_values(["genre", "rating"], ascending=[True, False])
# Groups by genre A-Z, within same genre shows highest rating first
```

After sorting, reset the index back to 0, 1, 2, 3...:

```python
sorted_df = movies.sort_values("rating", ascending=False).reset_index(drop=True)
```

Without `reset_index`, the original row numbers (3, 0, 5, 1...) stay, which is confusing.

---

## Part 8: Adding and Modifying Columns

### Add a New Column

```python
# Calculate duration in hours
movies["duration_hours"] = movies["duration"] / 60

# NumPy broadcasting is happening here
# All values divided by 60 at once, no loop needed
```

### Conditional Column

```python
import numpy as np

movies["rating_category"] = np.where(
    movies["rating"] >= 8.8, "Excellent",
    np.where(
        movies["rating"] >= 8.0, "Good",
        "Average"
    )
)
```

This is like if/elif/else but applied to every row at once.

### String Operations on Text Columns

```python
# All string operations use .str accessor
movies["title"].str.upper()          # UPPERCASE
movies["title"].str.lower()          # lowercase
movies["title"].str.strip()          # remove whitespace
movies["title"].str.len()            # character count
movies["title"].str.contains("The")  # True/False if contains word
movies["title"].str.replace("The", "A")  # replace text
```

Real BingeItBro use:

```python
# Clean personal notes
df["personal_note"] = df["personal_note"].str.strip()

# Find notes mentioning "amazing"
df[df["personal_note"].str.contains("amazing", case=False)]
```

### Remove a Column

```python
movies = movies.drop(columns=["duration_hours", "rating_category"])
```

---

## Part 9: Handling Missing Values

Real data always has missing values. In Pandas they appear as `NaN` (Not a Number).

```python
data = pd.DataFrame({
    "title": ["Matrix", "Inception", "Notebook", "Avengers"],
    "rating": [8.5, 8.8, None, 7.5],
    "personal_note": ["Amazing", None, "Loved it", None]
})
```

### Check for Missing Values

```python
print(data.isnull())         # True where value is missing
print(data.isnull().sum())   # Count missing per column
```

Output of `isnull().sum()`:
```
title            0
rating           1
personal_note    2
```

### Option 1: Drop Rows with Missing Values

```python
# Drop rows where ANY column has missing value
data.dropna()

# Drop rows only if specific column is missing
data.dropna(subset=["rating"])
```

Use `dropna()` when the missing value makes the entire record useless. A movie with no rating might still be worth keeping.

### Option 2: Fill Missing Values

```python
# Fill missing ratings with the average rating
data["rating"] = data["rating"].fillna(data["rating"].mean())

# Fill missing notes with default text
data["personal_note"] = data["personal_note"].fillna("No note provided")
```

Real BingeItBro use:

```python
recommendations_df["personal_note"] = recommendations_df["personal_note"].fillna("")
recommendations_df["watch_with"] = recommendations_df["watch_with"].fillna("not specified")
```

---

## Part 10: Groupby - Group and Analyze

GroupBy groups rows that share a value, then calculates something for each group. This is the same as an Excel pivot table.

### Basic GroupBy

```python
# Average rating by genre
movies.groupby("genre")["rating"].mean()
```

Step by step:
1. `groupby("genre")` - groups rows by genre value
2. `["rating"]` - for each group, look at the rating column
3. `.mean()` - calculate mean for each group

Output:
```
genre
Action     9.0
Comedy     7.6
Romance    7.8
Sci-Fi     8.6
Name: rating, dtype: float64
```

### Multiple Aggregations

```python
movies.groupby("genre")["rating"].agg(["mean", "min", "max", "count"])
```

Output:
```
        mean   min   max  count
genre
Action   9.0   9.0   9.0      1
Comedy   7.6   7.6   7.6      1
Romance  7.8   7.8   7.8      1
Sci-Fi   8.6   8.5   8.8      3
```

Real BingeItBro use:

```python
# Most recommended genres
recommendations_df.groupby("genre")["title"].count().sort_values(ascending=False)

# Average rating per user
recommendations_df.groupby("user_id")["rating"].mean()

# Most active user
recommendations_df.groupby("user_id")["title"].count().sort_values(ascending=False)
```

---

## Part 11: Merging Tables (Joins)

Merging combines two DataFrames based on a shared column. This is the same as SQL JOIN.

Your BingeItBro data lives in 3 separate tables:
- `recommendations` (has user_id but not username)
- `users` (has user_id and username)
- `friends` (has user_id and friend_id)

To get recommendations with usernames, you need to merge.

### Sample Tables

```python
recommendations = pd.DataFrame({
    "rec_id": [1, 2, 3, 4],
    "user_id": ["u1", "u2", "u1", "u3"],
    "title": ["Matrix", "Inception", "Notebook", "Avengers"],
    "rating": [8.5, 8.8, 7.8, 7.5]
})

users = pd.DataFrame({
    "user_id": ["u1", "u2", "u3", "u4"],
    "username": ["syam", "rahul", "priya", "amit"]
})
```

### Inner Merge (Most Common)

```python
merged = pd.merge(
    recommendations,   # left table
    users,             # right table
    on="user_id",      # column to join on (must exist in both tables)
    how="inner"        # type of join
)
print(merged)
```

Output:
```
   rec_id user_id      title  rating username
0       1      u1     Matrix     8.5     syam
1       2      u2  Inception     8.8    rahul
2       3      u1   Notebook     7.8     syam
3       4      u3   Avengers     7.5    priya
```

Inner merge only shows rows where user_id exists in **both** tables. User u4 (amit) has no recommendations so he does not appear.

### Left Merge

```python
left_merged = pd.merge(users, recommendations, on="user_id", how="left")
```

All rows from the left table (users) appear. u4 (amit) appears with NaN for recommendation columns because he has no recommendations.

Use left merge when: "Show all users, and if they have recommendations show those too."

### Types of Merge

| Type | What it keeps |
|------|--------------|
| `inner` | Only rows that exist in BOTH tables |
| `left` | All rows from left table, matching from right |
| `right` | All rows from right table, matching from left |
| `outer` | All rows from both tables |

---

## Part 12: Value Counts and Unique

```python
# Count how many times each genre appears
movies["genre"].value_counts()
# Sci-Fi     3
# Action     1
# Comedy     1
# Romance    1

# All unique genres (no duplicates)
movies["genre"].unique()
# ['Sci-Fi' 'Romance' 'Action' 'Comedy']

# Number of unique genres
movies["genre"].nunique()
# 4
```

---

## Part 13: Applying Custom Functions

When built-in operations are not enough, you can apply a custom function to every row.

### Apply to a Column

```python
def rating_to_stars(rating):
    if rating >= 9.0:
        return "5 stars"
    elif rating >= 8.5:
        return "4 stars"
    elif rating >= 8.0:
        return "3 stars"
    else:
        return "2 stars"

movies["stars"] = movies["rating"].apply(rating_to_stars)
```

### Apply to Each Row (Multiple Columns)

```python
def create_movie_text(row):
    return f"{row['title']} {row['genre']} {row['year']}"

movies["description"] = movies.apply(create_movie_text, axis=1)
```

`axis=1` means apply to each row. `row` gives you access to all columns for that row.

Real BingeItBro use - creating text for LLM embeddings:

```python
def create_movie_text(row):
    title = row["title"]
    genres = row["genres"]
    note = row["personal_note"] if row["personal_note"] else ""
    return f"{title} {genres} {note}"

recommendations_df["full_text"] = recommendations_df.apply(create_movie_text, axis=1)
# This "full_text" column is what you will feed into the LLM on Day 3!
```

---

## Part 14: Loading Your BingeItBro Data

Now apply everything to your actual database.

### Setup

Create a `.env` file (copy credentials from your BingeItBro `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

### Load All Tables

```python
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase = create_client(url, key)

print("Connected to Supabase")

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

### Inspect Your Data

```python
# First always inspect
print(recommendations_df.shape)
print(recommendations_df.columns.tolist())
print(recommendations_df.dtypes)
recommendations_df.info()
print(recommendations_df.head())
```

### Analyze Your Data

```python
# Basic stats
print(f"Total recommendations: {len(recommendations_df)}")
print(f"Average rating: {recommendations_df['rating'].mean():.2f}")
print(f"Highest rated: {recommendations_df.loc[recommendations_df['rating'].idxmax(), 'title']}")

# Missing values
print("\nMissing values:")
print(recommendations_df.isnull().sum())

# Most active users
print("\nMost active users:")
print(recommendations_df.groupby("user_id")["title"].count().sort_values(ascending=False).head(5))

# Rating distribution
print("\nRating distribution:")
print(recommendations_df["rating"].describe())
```

### Clean and Prepare

```python
# Fill missing personal notes
recommendations_df["personal_note"] = recommendations_df["personal_note"].fillna("")

# Merge with users to get usernames
full_df = pd.merge(recommendations_df, users_df[["id", "username"]], 
                   left_on="user_id", right_on="id", how="left")

# Create text column for LLM (Day 3)
def create_movie_text(row):
    return f"{row['title']} {row['personal_note']}"

full_df["full_text"] = full_df.apply(create_movie_text, axis=1)

print("\nReady for LLM processing:")
print(full_df["full_text"].head())
```

---

## Part 15: Saving Your Processed Data

After all the cleaning and processing, save it so you do not have to redo it.

```python
# Save to CSV
full_df.to_csv("bingeitbro_processed.csv", index=False)

# Load it back later
df = pd.read_csv("bingeitbro_processed.csv")
```

---

## Summary

| Operation | Code | What it does |
|-----------|------|-------------|
| Create DataFrame | `pd.DataFrame({...})` | Make a table |
| First N rows | `df.head(5)` | Preview data |
| Shape | `df.shape` | Count rows and columns |
| Column names | `df.columns.tolist()` | List all columns |
| Data types | `df.dtypes` | Check types |
| Filter | `df[df["col"] > value]` | Select matching rows |
| Sort | `df.sort_values("col")` | Order rows |
| Add column | `df["new"] = values` | Add new feature |
| Missing values | `df.isnull().sum()` | Count NaN |
| Fill missing | `df["col"].fillna(value)` | Replace NaN |
| Group and count | `df.groupby("col").count()` | Aggregate |
| Merge tables | `pd.merge(df1, df2, on="col")` | Join tables |
| Unique values | `df["col"].value_counts()` | Count each value |
| Apply function | `df["col"].apply(func)` | Custom transform |

---

## What is Next

Day 3-4: LLM Fundamentals
- What are LLMs (Large Language Models)?
- OpenAI API integration
- Using the `full_text` column we created today as input
- Auto-generating recommendation messages for BingeItBro

The `full_text` column you created in Part 14 is exactly what gets fed into the LLM on Day 3.

---

## Run This First

Before moving to Day 3, run the code in Part 14 with your actual Supabase credentials.

Paste the output here so we can see your actual data structure and continue from there.

"""
Day 2 - Lesson 1: Introduction to Pandas
=========================================

Pandas is Python's most powerful library for data analysis and manipulation.
Think of it as Excel, but programmable and much more powerful.

Key Concepts:
- DataFrame: A table with rows and columns (like a spreadsheet)
- Series: A single column of data
- Index: Row labels (like row numbers in Excel)
"""

import pandas as pd
import numpy as np

print("=" * 80)
print("DAY 2 - LESSON 1: PANDAS INTRODUCTION")
print("=" * 80)

# ============================================================================
# 1. CREATING DATAFRAMES
# ============================================================================
print("\n1. CREATING DATAFRAMES FROM DIFFERENT SOURCES")
print("-" * 80)

# Method 1: From a dictionary (most common)
print("\n📊 Method 1: From Dictionary")
movies_dict = {
    'title': ['Matrix', 'Inception', 'Interstellar'],
    'rating': [8.7, 8.8, 8.6],
    'year': [1999, 2010, 2014]
}
df_from_dict = pd.DataFrame(movies_dict)
print(df_from_dict)

# Method 2: From a list of lists
print("\n📊 Method 2: From List of Lists")
data = [
    ['Matrix', 8.7, 1999],
    ['Inception', 8.8, 2010],
    ['Interstellar', 8.6, 2014]
]
df_from_list = pd.DataFrame(data, columns=['title', 'rating', 'year'])
print(df_from_list)

# Method 3: From a list of dictionaries (like API responses)
print("\n📊 Method 3: From List of Dictionaries (API-style)")
api_data = [
    {'title': 'Matrix', 'rating': 8.7, 'year': 1999},
    {'title': 'Inception', 'rating': 8.8, 'year': 2010},
    {'title': 'Interstellar', 'rating': 8.6, 'year': 2014}
]
df_from_api = pd.DataFrame(api_data)
print(df_from_api)

# ============================================================================
# 2. DATAFRAME PROPERTIES
# ============================================================================
print("\n\n2. UNDERSTANDING DATAFRAME PROPERTIES")
print("-" * 80)

df = df_from_dict  # Use the first DataFrame

print(f"Shape (rows, columns): {df.shape}")
print(f"Number of rows: {len(df)}")
print(f"Column names: {df.columns.tolist()}")
print(f"\nData types:")
print(df.dtypes)

# ============================================================================
# 3. VIEWING DATA
# ============================================================================
print("\n\n3. VIEWING DATA")
print("-" * 80)

# Create a larger dataset for better examples
movies = pd.DataFrame({
    'title': ['Matrix', 'Inception', 'Interstellar', 'Dark Knight', 'Pulp Fiction', 
              'Forrest Gump', 'Fight Club', 'Goodfellas'],
    'rating': [8.7, 8.8, 8.6, 9.0, 8.9, 8.8, 8.8, 8.7],
    'year': [1999, 2010, 2014, 2008, 1994, 1994, 1999, 1990],
    'genre': ['Sci-Fi', 'Sci-Fi', 'Sci-Fi', 'Action', 'Crime', 
              'Drama', 'Drama', 'Crime']
})

print("\n📋 First 3 rows:")
print(movies.head(3))

print("\n📋 Last 3 rows:")
print(movies.tail(3))

print("\n📋 Random 3 rows:")
print(movies.sample(3))

# ============================================================================
# 4. SELECTING DATA
# ============================================================================
print("\n\n4. SELECTING DATA")
print("-" * 80)

# Select a single column (returns a Series)
print("\n🎯 Single column (ratings):")
print(movies['rating'])

# Select multiple columns (returns a DataFrame)
print("\n🎯 Multiple columns:")
print(movies[['title', 'rating']])

# Select rows by position
print("\n🎯 First 3 rows:")
print(movies.iloc[0:3])

# ============================================================================
# 5. BASIC STATISTICS
# ============================================================================
print("\n\n5. BASIC STATISTICS")
print("-" * 80)

print(f"Average rating: {movies['rating'].mean():.2f}")
print(f"Highest rating: {movies['rating'].max()}")
print(f"Lowest rating: {movies['rating'].min()}")
print(f"Total movies: {len(movies)}")

print("\n📊 Summary statistics:")
print(movies.describe())

# ============================================================================
# 6. ADDING NEW COLUMNS
# ============================================================================
print("\n\n6. ADDING NEW COLUMNS")
print("-" * 80)

# Add a new column based on existing data
movies['age'] = 2024 - movies['year']
movies['high_rated'] = movies['rating'] >= 8.8

print(movies[['title', 'year', 'age', 'rating', 'high_rated']])

# ============================================================================
# SUMMARY
# ============================================================================
print("\n\n" + "=" * 80)
print("KEY TAKEAWAYS")
print("=" * 80)
print("""
1. DataFrame = Table with rows and columns
2. Create from: dict, list of lists, list of dicts
3. View data: .head(), .tail(), .sample()
4. Select columns: df['column'] or df[['col1', 'col2']]
5. Statistics: .mean(), .max(), .min(), .describe()
6. Add columns: df['new_col'] = calculation
""")

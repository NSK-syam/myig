"""
Day 2 - Lesson 2: Pandas Operations
====================================

Learn how to filter, sort, group, and analyze data with pandas.
These are the core operations you'll use every day in data analysis.

Key Concepts:
- Filtering: Select rows based on conditions
- Sorting: Order data by column values
- Grouping: Aggregate data by categories
- Merging: Combine multiple DataFrames
"""

import pandas as pd
import numpy as np

print("=" * 80)
print("DAY 2 - LESSON 2: PANDAS OPERATIONS")
print("=" * 80)

# Sample dataset
movies = pd.DataFrame({
    'title': ['Matrix', 'Inception', 'Interstellar', 'Dark Knight', 'Pulp Fiction', 
              'Forrest Gump', 'Fight Club', 'Goodfellas', 'Shawshank', 'Godfather'],
    'rating': [8.7, 8.8, 8.6, 9.0, 8.9, 8.8, 8.8, 8.7, 9.3, 9.2],
    'year': [1999, 2010, 2014, 2008, 1994, 1994, 1999, 1990, 1994, 1972],
    'genre': ['Sci-Fi', 'Sci-Fi', 'Sci-Fi', 'Action', 'Crime', 
              'Drama', 'Drama', 'Crime', 'Drama', 'Crime'],
    'director': ['Wachowski', 'Nolan', 'Nolan', 'Nolan', 'Tarantino',
                 'Zemeckis', 'Fincher', 'Scorsese', 'Darabont', 'Coppola']
})

print("\n📊 Sample Dataset:")
print(movies)

# ============================================================================
# 1. FILTERING ROWS
# ============================================================================
print("\n\n1. FILTERING ROWS")
print("-" * 80)

# Single condition
print("\n🔍 Movies with rating > 9.0:")
high_rated = movies[movies['rating'] > 9.0]
print(high_rated[['title', 'rating']])

# Multiple conditions (AND)
print("\n🔍 Sci-Fi movies with rating > 8.7:")
scifi_high = movies[(movies['genre'] == 'Sci-Fi') & (movies['rating'] > 8.7)]
print(scifi_high[['title', 'genre', 'rating']])

# Multiple conditions (OR)
print("\n🔍 Movies from 1990s OR rating > 9.0:")
nineties_or_high = movies[(movies['year'] >= 1990) & (movies['year'] < 2000) | (movies['rating'] > 9.0)]
print(nineties_or_high[['title', 'year', 'rating']])

# Using .isin() for multiple values
print("\n🔍 Nolan or Tarantino movies:")
directors_filter = movies[movies['director'].isin(['Nolan', 'Tarantino'])]
print(directors_filter[['title', 'director']])

# ============================================================================
# 2. SORTING
# ============================================================================
print("\n\n2. SORTING DATA")
print("-" * 80)

# Sort by single column (ascending)
print("\n📈 Sorted by year (oldest first):")
by_year = movies.sort_values('year')
print(by_year[['title', 'year']])

# Sort by single column (descending)
print("\n📉 Sorted by rating (highest first):")
by_rating = movies.sort_values('rating', ascending=False)
print(by_rating[['title', 'rating']])

# Sort by multiple columns
print("\n📊 Sorted by genre, then rating:")
by_genre_rating = movies.sort_values(['genre', 'rating'], ascending=[True, False])
print(by_genre_rating[['title', 'genre', 'rating']])

# ============================================================================
# 3. GROUPING & AGGREGATION
# ============================================================================
print("\n\n3. GROUPING & AGGREGATION")
print("-" * 80)

# Count by group
print("\n📊 Number of movies per genre:")
genre_counts = movies.groupby('genre').size()
print(genre_counts)

# Average by group
print("\n📊 Average rating per genre:")
genre_avg = movies.groupby('genre')['rating'].mean()
print(genre_avg)

# Multiple aggregations
print("\n📊 Genre statistics:")
genre_stats = movies.groupby('genre')['rating'].agg(['count', 'mean', 'max', 'min'])
print(genre_stats)

# Group by multiple columns
print("\n📊 Movies per director per decade:")
movies['decade'] = (movies['year'] // 10) * 10
director_decade = movies.groupby(['director', 'decade']).size()
print(director_decade)

# ============================================================================
# 4. APPLYING FUNCTIONS
# ============================================================================
print("\n\n4. APPLYING FUNCTIONS")
print("-" * 80)

# Apply function to column
print("\n🔧 Title lengths:")
movies['title_length'] = movies['title'].apply(len)
print(movies[['title', 'title_length']])

# Apply custom function
def rating_category(rating):
    if rating >= 9.0:
        return 'Masterpiece'
    elif rating >= 8.5:
        return 'Excellent'
    else:
        return 'Good'

movies['category'] = movies['rating'].apply(rating_category)
print("\n🏆 Rating categories:")
print(movies[['title', 'rating', 'category']])

# ============================================================================
# 5. HANDLING MISSING DATA
# ============================================================================
print("\n\n5. HANDLING MISSING DATA")
print("-" * 80)

# Create sample data with missing values
data_with_missing = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie', 'David'],
    'age': [25, np.nan, 30, 35],
    'city': ['NYC', 'LA', np.nan, 'Chicago']
})

print("\n❓ Data with missing values:")
print(data_with_missing)

print("\n🔍 Check for missing values:")
print(data_with_missing.isnull().sum())

print("\n🧹 Drop rows with any missing values:")
print(data_with_missing.dropna())

print("\n🔧 Fill missing values:")
filled = data_with_missing.fillna({'age': data_with_missing['age'].mean(), 'city': 'Unknown'})
print(filled)

# ============================================================================
# 6. MERGING DATAFRAMES
# ============================================================================
print("\n\n6. MERGING DATAFRAMES")
print("-" * 80)

# Create two related DataFrames
ratings = pd.DataFrame({
    'movie_id': [1, 2, 3],
    'title': ['Matrix', 'Inception', 'Interstellar'],
    'rating': [8.7, 8.8, 8.6]
})

box_office = pd.DataFrame({
    'movie_id': [1, 2, 3],
    'revenue': [467, 829, 677]  # in millions
})

print("\n📊 Ratings DataFrame:")
print(ratings)

print("\n💰 Box Office DataFrame:")
print(box_office)

# Merge on common column
merged = pd.merge(ratings, box_office, on='movie_id')
print("\n🔗 Merged DataFrame:")
print(merged)

# ============================================================================
# 7. USEFUL OPERATIONS
# ============================================================================
print("\n\n7. USEFUL OPERATIONS")
print("-" * 80)

# Get unique values
print("\n🎭 Unique genres:")
print(movies['genre'].unique())

# Value counts
print("\n📊 Genre distribution:")
print(movies['genre'].value_counts())

# Find duplicates
print("\n🔍 Duplicate years:")
print(movies[movies.duplicated(['year'], keep=False)].sort_values('year'))

# Reset index
print("\n🔄 Reset index after filtering:")
filtered = movies[movies['rating'] > 9.0].reset_index(drop=True)
print(filtered)

# ============================================================================
# SUMMARY
# ============================================================================
print("\n\n" + "=" * 80)
print("KEY OPERATIONS SUMMARY")
print("=" * 80)
print("""
1. FILTERING:
   - Single: df[df['col'] > value]
   - Multiple (AND): df[(df['col1'] > x) & (df['col2'] == y)]
   - Multiple (OR): df[(df['col1'] > x) | (df['col2'] == y)]
   - In list: df[df['col'].isin([val1, val2])]

2. SORTING:
   - Ascending: df.sort_values('col')
   - Descending: df.sort_values('col', ascending=False)
   - Multiple: df.sort_values(['col1', 'col2'])

3. GROUPING:
   - Count: df.groupby('col').size()
   - Average: df.groupby('col')['value'].mean()
   - Multiple stats: df.groupby('col').agg(['count', 'mean', 'max'])

4. MISSING DATA:
   - Check: df.isnull().sum()
   - Drop: df.dropna()
   - Fill: df.fillna(value)

5. MERGING:
   - pd.merge(df1, df2, on='common_column')
""")

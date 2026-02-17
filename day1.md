# Day 1: Machine Learning Fundamentals & NumPy

## Overview

Welcome to Day 1! This guide covers the fundamental concepts you need before building any ML system. You'll learn why everything must be numbers, what vectors are, how to measure similarity, and master NumPy - the foundation of all Python ML libraries.

---

## 1. What Is Machine Learning?

### Traditional Programming vs Machine Learning

**Traditional Programming:**
```python
if user_watched_marvel_movies:
    recommend("Superhero movies")
elif user_watched_horror:
    recommend("Horror movies")
```

**Problem:** You'd need millions of rules!

**Machine Learning:**
```
Input: User watched [Matrix, Inception, Interstellar]
Output: User likes sci-fi mind-bending movies

The computer LEARNS the pattern from examples!
```

### Why ML Is Revolutionary

1. **Scalability** - Works with millions of users/movies automatically
2. **Pattern Discovery** - Finds patterns you'd never think of manually
3. **Adaptation** - Improves as more data comes in
4. **Complexity** - Handles complex relationships

**Key Concept:** Machine Learning = Pattern Discovery from Data

---

## 2. Why Everything Must Be Numbers

### The Fundamental Problem

Computers can ONLY do math. They don't understand "thriller", "mind-bending", or "heartwarming". They ONLY understand: `0, 1, 2, 3, 4, 5...`

### Example: Representing a Movie

**Human Description:**
> "The Matrix is an action-packed sci-fi thriller with mind-bending philosophy"

**Computer Representation:**
```python
matrix_movie = [
    8.5,  # Action intensity (0-10)
    0.2,  # Comedy level (0-10)
    8.9,  # Sci-fi score (0-10)
    9.2,  # Philosophical depth (0-10)
    136,  # Duration in minutes
    1999, # Release year
    8.7   # IMDB rating
]
```

**The Magic:** Once everything is numbers, we can use MATHEMATICS to find patterns!

---

## 3. Vectors - Lists of Numbers

### Simple Definition

A **vector** is a list of numbers that represents something.

### Analogy: GPS Coordinates

Your location = `[latitude, longitude]`

Example: `[37.7749, -122.4194]` = San Francisco

### Movie As a Vector

```
matrix_vector = [8.5, 0.2, 8.9, 9.2, 136]
                  ↑    ↑    ↑    ↑    ↑
               action comedy sci-fi phil. duration
```

### Why Vectors?

1. **Standardized Format** - Every movie becomes the same structure
2. **Mathematical Operations** - Add, subtract, multiply, measure distance
3. **Machine Learning** - ML algorithms work on vectors

---

## 4. Embeddings - Smart Vectors

### The Problem With Simple Vectors

```
"action" → 1
"comedy" → 2
"drama"  → 3
```

**Issue:** This implies comedy (2) is between action (1) and drama (3). Not true!

### Embeddings Solution

Use MANY numbers (typically 300–1500+):

```
"action" → [0.2, 0.8, 0.1, 0.4, 0.9, ... 300 more numbers]
"comedy" → [0.1, 0.2, 0.9, 0.7, 0.1, ... 300 more numbers]
"drama"  → [0.7, 0.3, 0.2, 0.8, 0.5, ... 300 more numbers]
```

### The Magic of Embeddings

With embeddings, **similar things have similar numbers!**

Famous example: `king - man + woman ≈ queen`

**Summary:**
- **Vector:** List of numbers representing something
- **Embedding:** Special vector where similar things have similar numbers

---

## 5. Measuring Similarity

### The Core Problem

- **Human question:** "Is The Matrix similar to Inception?"
- **Computer translation:** "Are these two vectors similar?"

### Cosine Similarity (The ML Standard!)

Instead of measuring distance, measure the **ANGLE** between vectors.

- Same direction (0°) → Very similar → Score = **1.0**
- Perpendicular (90°) → Unrelated → Score = **0.0**
- Opposite direction (180°) → Very different → Score = **-1.0**

### Formula

```
similarity(A, B) = (A · B) / (|A| × |B|)
```

Where:
- A · B = Dot product
- |A| = Magnitude of A
- |B| = Magnitude of B

### Step-by-Step Example

```
Vector A = [1, 2, 3]
Vector B = [4, 5, 6]

Step 1: Dot product (A · B) = (1×4) + (2×5) + (3×6) = 32
Step 2: Magnitude of A = √(1² + 2² + 3²) = √14 ≈ 3.742
Step 3: Magnitude of B = √(4² + 5² + 6²) = √77 ≈ 8.775
Step 4: Similarity = 32 / (3.742 × 8.775) ≈ 0.974 → Very similar!
```

### Interpretation

| Score | Meaning |
|-------|---------|
| 1.0 | Identical (perfect match) |
| 0.8–1.0 | Very similar |
| 0.5–0.8 | Somewhat similar |
| 0.2–0.5 | Slightly similar |
| 0–0.2 | Not similar |

---

## 6. Why NumPy?

### Python Lists vs NumPy Arrays

**Python Lists (slow):**
```python
numbers = [1, 2, 3, 4, 5]
doubled = [x * 2 for x in numbers]  # Loop through each element
```

**NumPy Arrays (fast):**
```python
import numpy as np
numbers = np.array([1, 2, 3, 4, 5])
doubled = numbers * 2  # One operation, no loop!
```

### Advantages of NumPy

1. **Speed** - 100–1000x faster! Written in C, operations are vectorized
2. **Convenience** - `array1 + array2` instead of list comprehensions
3. **Memory Efficient** - 7x less memory than Python lists
4. **Built-in Operations** - Dot products, matrix multiplication, statistics

### Foundation of ML

NumPy is the foundation of ALL Python ML libraries:
- **Pandas** (data analysis) → built on NumPy
- **Scikit-learn** (ML) → built on NumPy
- **TensorFlow/PyTorch** (deep learning) → built on NumPy concepts

---

## 7. Creating NumPy Arrays

### 1D Arrays (Vectors)

```python
import numpy as np

# From Python list
ratings = np.array([8.5, 7.2, 9.1, 6.8, 8.0])

# From range
sequence = np.arange(0, 10, 2)  # [0, 2, 4, 6, 8]

# Evenly spaced
linspace_arr = np.linspace(0, 1, 5)  # 5 numbers from 0 to 1

# Special arrays
zeros = np.zeros(5)
ones = np.ones(5)
random_arr = np.random.rand(5)
```

### 2D Arrays (Matrices)

```python
movies_2d = np.array([
    [8.5, 2.0, 148],  # The Matrix
    [7.0, 3.5, 136],  # Inception
    [2.0, 9.0, 115],  # Superbad
    [9.0, 1.5, 152]   # The Dark Knight
])

print(f"Shape: {movies_2d.shape}")  # (4, 3) = 4 rows, 3 columns
```

**In ML:** rows = samples, columns = features (UNIVERSAL)

---

## 8. Array Properties

```python
movies = np.array([[8.5, 2.0, 148], [7.0, 3.5, 136]])

movies.shape    # (2, 3) - dimensions
movies.size     # 6 - total elements
movies.dtype    # float64 - data type
movies.ndim     # 2 - number of dimensions
```

---

## 9. Indexing & Slicing

### 1D Arrays

```python
ratings = np.array([8.5, 7.2, 9.1, 6.8, 8.0])

ratings[0]      # First: 8.5
ratings[-1]     # Last: 8.0
ratings[0:3]    # First 3: [8.5, 7.2, 9.1]
ratings[::2]    # Every 2nd: [8.5, 9.1, 8.0]
ratings[::-1]   # Reverse
```

### 2D Arrays

```python
movies[0, 0]         # Single element
movies[0]            # Entire row
movies[:, 0]         # Entire column
movies[0:2, 0:2]     # Sub-region
```

### Boolean Indexing (VERY POWERFUL!)

```python
high_rated = movies[movies[:, 0] > 8]  # Filter by condition
```

**How it works:**
1. `movies[:, 0]` → [8.5, 7.0, 2.0, 9.0] (all action scores)
2. `movies[:, 0] > 8` → [True, False, False, True]
3. `movies[[True, False, False, True]]` → Select rows where True

---

## 10. Element-Wise Operations

```python
ratings = np.array([8.5, 7.2, 9.1, 6.8, 8.0])

ratings + 0.5       # Add to all
ratings * 2         # Multiply all
ratings ** 2        # Square all
np.sqrt(ratings)    # Square root all
```

**Key Concept:** Operations apply to EACH element individually. This is the foundation of neural networks!

---

## 11. Broadcasting

NumPy's automatic shape matching for operations.

```python
# Scalar broadcasting
arr = np.array([1, 2, 3, 4, 5])
arr + 10  # [11, 12, 13, 14, 15]

# Row broadcasting
matrix = np.array([[1,2,3], [4,5,6], [7,8,9]])
row_vector = np.array([10, 20, 30])
matrix + row_vector  # Adds row to each row of matrix
```

**Broadcasting Rules:**
- Trailing dimensions must match or be 1
- Smaller array is "stretched" to match larger array
- Dimensions compared right-to-left

---

## 12. Reshaping Arrays

```python
arr = np.arange(12)  # [0, 1, 2, ..., 11]

arr.reshape(3, 4)    # 3 rows, 4 columns
arr.reshape(3, -1)   # -1 = auto-calculate
arr.flatten()        # Convert to 1D (copy)
arr.ravel()          # Convert to 1D (view, faster)
matrix.T             # Transpose (swap rows/columns)
```

**Critical Rule:** Total elements must stay the same!

---

## 13. Statistical Operations

```python
ratings = np.array([8.5, 7.2, 9.1, 6.8, 8.0])

np.mean(ratings)     # Average
np.median(ratings)   # Median
np.std(ratings)      # Standard deviation
np.min(ratings)      # Minimum
np.max(ratings)      # Maximum
np.sum(ratings)      # Sum
```

### Axis Parameter (for 2D)

```python
movies = np.array([[8.5, 2.0, 148], [7.0, 3.5, 136]])

np.mean(movies, axis=0)  # Average per column (feature)
np.mean(movies, axis=1)  # Average per row (movie)
```

- **axis=0** - Operate across rows (columnwise)
- **axis=1** - Operate across columns (rowwise)

---

## 14. Essential ML Functions

```python
# Sorting
sorted_ratings = np.sort(ratings)
indices = np.argsort(ratings)  # Indices that would sort

# Unique values
unique = np.unique(genres)
unique, counts = np.unique(genres, return_counts=True)

# Conditional operations
high_idx = np.where(ratings > 8.0)
adjusted = np.where(ratings > 8.0, ratings, 8.0)  # Min 8.0

# Clip (force into range)
clipped = np.clip(scores, 0, 10)  # Force into [0, 10]
```

---

## 15. Implementing Cosine Similarity

### Dot Product

```python
def dot_product(a, b):
    return np.dot(a, b)

vec_a = np.array([1, 2, 3])
vec_b = np.array([4, 5, 6])
dot = np.dot(vec_a, vec_b)  # (1×4) + (2×5) + (3×6) = 32
```

### Magnitude

```python
def magnitude(vec):
    return np.linalg.norm(vec)

vec = np.array([3, 4])
mag = np.linalg.norm(vec)  # √(9 + 16) = 5
```

### Cosine Similarity

```python
def cosine_similarity(a, b):
    dot_product = np.dot(a, b)
    mag_a = np.linalg.norm(a)
    mag_b = np.linalg.norm(b)
    
    if mag_a == 0 or mag_b == 0:
        return 0.0
    
    return dot_product / (mag_a * mag_b)

matrix = np.array([8.5, 0.2, 8.9])
inception = np.array([8.0, 0.5, 9.0])
notebook = np.array([0.5, 8.0, 0.1])

sim_mi = cosine_similarity(matrix, inception)   # ~0.998 Very similar!
sim_mn = cosine_similarity(matrix, notebook)    # ~0.365 Not similar
```

---

## 16. Building a Recommendation System

### Complete Workflow

1. **REPRESENT** - Convert movies to vectors
2. **MEASURE** - Calculate similarities
3. **RANK** - Sort by similarity score
4. **RECOMMEND** - Return top N

### Example Implementation

```python
def find_similar_movies(query_idx, movie_features, movie_names, top_k=3):
    """Find movies most similar to the query movie"""
    
    query_vector = movie_features[query_idx]
    similarities = []
    
    for i, features in enumerate(movie_features):
        if i == query_idx:
            continue  # Skip the query movie itself
        
        # Calculate cosine similarity
        dot_prod = np.dot(query_vector, features)
        mag_query = np.linalg.norm(query_vector)
        mag_other = np.linalg.norm(features)
        
        if mag_query > 0 and mag_other > 0:
            similarity = dot_prod / (mag_query * mag_other)
        else:
            similarity = 0.0
        
        similarities.append((movie_names[i], similarity))
    
    # Sort by similarity (highest first)
    similarities.sort(key=lambda x: x[1], reverse=True)
    
    return similarities[:top_k]
```

### Vectorized Version (100x Faster!)

```python
def cosine_similarity_vectorized(query_vector, all_vectors):
    """Calculate similarity between query and ALL vectors at once"""
    
    # Dot products (query with each vector)
    dot_products = np.dot(all_vectors, query_vector)
    
    # Magnitudes
    query_magnitude = np.linalg.norm(query_vector)
    all_magnitudes = np.linalg.norm(all_vectors, axis=1)
    
    # Avoid division by zero
    all_magnitudes[all_magnitudes == 0] = 1.0
    
    if query_magnitude == 0:
        return np.zeros(len(all_vectors))
    
    similarities = dot_products / (query_magnitude * all_magnitudes)
    
    return similarities
```

---

## Quick Reference

### Array Creation
```python
np.array([1,2,3])           # From list
np.arange(0, 10, 2)         # Range with step
np.linspace(0, 1, 5)        # Evenly spaced
np.zeros(5)                 # All zeros
np.ones(5)                  # All ones
np.random.rand(5)           # Random [0,1)
```

### Array Properties
```python
arr.shape                   # Dimensions
arr.size                    # Total elements
arr.dtype                   # Data type
arr.ndim                    # Number of dimensions
```

### Indexing
```python
arr[0]                      # First element
arr[-1]                     # Last element
arr[0:3]                    # Slice
arr[arr > 5]                # Boolean indexing
```

### Operations
```python
arr + 5                     # Element-wise add
arr * 2                     # Element-wise multiply
arr ** 2                    # Element-wise power
np.sqrt(arr)                # Element-wise sqrt
```

### Statistics
```python
np.mean(arr)                # Average
np.median(arr)              # Median
np.std(arr)                 # Standard deviation
np.min(arr), np.max(arr)    # Min/Max
```

### Reshaping
```python
arr.reshape(3, 4)           # Reshape
arr.flatten()               # To 1D (copy)
arr.ravel()                 # To 1D (view)
arr.T                       # Transpose
```

### Similarity
```python
np.dot(a, b)                # Dot product
np.linalg.norm(a)           # Magnitude
cosine_sim = dot / (mag_a * mag_b)  # Cosine similarity
```

---

## Key Takeaways

1. **Machine Learning** - Computers learn patterns from data, not explicit rules
2. **Numbers** - Everything must be converted to numbers for computers
3. **Vectors** - Standard format for representing data in ML
4. **Embeddings** - Smart vectors where similar things have similar numbers
5. **Cosine Similarity** - Measures angle between vectors (0-1 scale)
6. **NumPy** - Fast numerical operations, foundation of all Python ML
7. **Vectorization** - Process all items at once, 100-1000x faster
8. **Recommendation Systems** - Represent → Measure → Rank → Recommend

---

**Next Steps:** Practice with real data! Move on to Day 2 to learn pandas for data manipulation and analysis.

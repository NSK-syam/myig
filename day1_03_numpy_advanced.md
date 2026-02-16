# NumPy Advanced Operations

## What Is This File?

This file covers the most important NumPy operations for machine learning:

- **Element-wise operations** - The foundation of neural networks!
- **Broadcasting** - NumPy's superpower
- **Reshaping arrays** - Critical for ML models
- **Statistical functions** - Data analysis essentials
- **Utility functions** - Sorting, filtering, and conditional operations

These operations are the building blocks of ALL machine learning!

---

## Chapter 1: Element-Wise Operations

### Understanding Element-Wise Operations

An operation applied to EACH element individually:

```
[1, 2, 3] * 2 = [2, 4, 6]
```

This is THE core concept in machine learning:
- **Neural networks** multiply weights element-by-element
- **Normalization** scales each value
- **Activation functions** apply to each neuron
- **Feature engineering** transforms each feature

**Speed**: NumPy vectorization is 100-1000x faster than Python loops!

### Arithmetic Operations

```python
ratings = np.array([8.5, 7.2, 9.1, 6.8, 8.0])
print(f"Add 0.5 bonus: {ratings + 0.5}")      # Add bias
print(f"Subtract 1: {ratings - 1}")             # Center data
print(f"Double: {ratings * 2}")                 # Scale values
print(f"Normalize: {ratings / 10}")             # 0-1 scale
print(f"Square: {ratings ** 2}")                # Non-linear transform
print(f"Square root: {np.sqrt(ratings)}")
print(f"Absolute: {np.abs(np.array([-2,-1,0,1,2]))}")
```

Each operation adjusts all values in the array at once, with no explicit loops needed.

### Operations Between Arrays

```python
user_ratings = np.array([8.5, 7.2, 9.1])
friend_ratings = np.array([7.0, 8.0, 8.5])
print(f"Difference: {user_ratings - friend_ratings}")
print(f"Average: {(user_ratings + friend_ratings) / 2}")

# Weighted combination (this is how neural networks work!)
weighted = (0.7 * scores1) + (0.3 * scores2)
```

**Real ML Use Case**: In recommendation systems, element-wise operations let you compare ratings across multiple users/items, find differences, and combine predictions with specific weights. This weighted combination approach is literally how neural networks compute hidden layers!

---

## Chapter 2: Broadcasting

### What Is Broadcasting?

NumPy's automatic shape matching for operations. Without broadcasting, you'd manually resize arrays. With it, NumPy does it automatically and efficiently.

### Broadcasting Examples

```python
# Scalar broadcasting
arr = np.array([1, 2, 3, 4, 5])
print(f"Array + 10: {arr + 10}")  # 10 → [10, 10, 10, 10, 10]

# Row broadcasting
matrix = np.array([[1,2,3], [4,5,6], [7,8,9]])
row_vector = np.array([10, 20, 30])
print(f"Matrix + row:\n{matrix + row_vector}")

# Column broadcasting
col_vector = np.array([[10], [20], [30]])
print(f"Matrix + col:\n{matrix + col_vector}")
```

### Broadcasting Rules

NumPy follows three key rules when matching shapes:

1. **Trailing dimensions must match or be 1** - Dimensions are compared right-to-left
2. **Smaller array is "stretched"** - Repeated to match larger array dimensions
3. **Dimensions compared right-to-left** - Start from the rightmost dimension

**Compatible shapes**:
- `(3,4)` and `(4,)` ✓
- `(3,4)` and `(3,1)` ✓
- `(3,4)` and `(1,4)` ✓

**Incompatible shapes**:
- `(3,4)` and `(3,)` ✗
- `(3,4)` and `(5,4)` ✗

### Common ML Broadcasting Patterns

1. **Normalization**: `(features - mean) / std` with shape `(1000, 5) - (5,) / (5,)`
2. **Adding bias**: `output = weights * input + bias` with shape `(1000, 10) + (10,)`
3. **Masking**: `filtered = data * mask` with shape `(1000, 5) * (1000, 1)`

You'll use broadcasting constantly in ML!

---

## Chapter 3: Reshaping Arrays

### Why Reshape?

Machine learning models expect specific input shapes:
- Model expects `(100, 5)` but you have `(500,)` → Need to reshape!
- Image model expects `(height, width, channels)` but you have `(pixels,)` → Reshape it!
- Time series model expects `(samples, timesteps, features)` → Reshape required!

**Critical Rule**: Total elements must stay the same! You can reshape `(2, 3)` with 6 elements into `(6,)`, `(3, 2)`, `(1, 6)`, etc., but NOT into `(5,)` or `(2, 2)`.

### Basic Reshaping

```python
arr = np.arange(12)  # [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
reshaped = arr.reshape(3, 4)      # 3 rows, 4 columns
auto = arr.reshape(3, -1)          # -1 = auto-calculate remaining dimensions
flattened = matrix.flatten()       # Convert to 1D (creates copy)
raveled = matrix.ravel()           # Convert to 1D (returns view)
transposed = movies.T              # Swap rows and columns
```

When reshaping, NumPy reorganizes elements row-by-row, filling the new shape from left to right:

```
Original: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

Reshape (3, 4):
[[0,  1,  2,  3],
 [4,  5,  6,  7],
 [8,  9, 10, 11]]
```

### The -1 Trick

Use `-1` to let NumPy calculate one dimension automatically:

```python
arr.reshape(3, -1)   # "3 rows, however many columns fit"
arr.reshape(-1, 4)   # "However many rows, 4 columns"
arr.reshape(-1)      # "Flatten to 1D"
```

NumPy calculates the missing dimension by dividing total elements by the known dimensions. This is especially useful when array sizes vary.

### Flatten vs Ravel

Both convert arrays to 1D, but with important differences:

```python
matrix = np.array([[1, 2, 3], [4, 5, 6]])
flattened = matrix.flatten()  # Creates a copy
raveled = matrix.ravel()      # Returns a view
```

- **`flatten()`** - Creates a copy; modifying it doesn't affect the original
- **`ravel()`** - Returns a view (reference); faster and more memory-efficient

Use `ravel()` by default for better performance, and `flatten()` only when you need an independent copy.

### Transpose

Transpose swaps rows and columns:

```python
movies = np.array([
    [8.5, 2.0, 148],  # Movie 1: [action, comedy, duration]
    [7.0, 3.5, 136]   # Movie 2
])

print(f"Shape: {movies.shape}")  # (2, 3)
transposed = movies.T
print(f"Shape: {transposed.shape}")  # (3, 2)
```

**Why transpose?**
- **Matrix math** - Some operations require specific orientations
- **Feature vs sample orientation** - Tools expect different layouts
- **Dot products** - Matrix multiplication requires compatible shapes

---

## Chapter 4: Statistical Operations

### Basic Statistics

```python
movie_ratings = np.array([8.5, 7.2, 9.1, 6.8, 8.0, 7.5, 8.8, 6.5, 9.0, 7.8])
print(f"Mean: {np.mean(movie_ratings):.2f}")
print(f"Median: {np.median(movie_ratings):.2f}")
print(f"Std: {np.std(movie_ratings):.2f}")
print(f"Min/Max: {np.min(movie_ratings)}, {np.max(movie_ratings)}")
```

**Mean vs Median**:
- **Mean** - Sum / count; affected by outliers
- **Median** - Middle value when sorted; robust to outliers

Use mean for normally distributed data without outliers; use median for skewed data or when outliers are present.

**Standard Deviation (Std)** - Measures how spread out data is. Low std means values cluster near the mean; high std means values are scattered.

**Why statistics matter for ML**:
- **Normalization** - Scale features using mean and std
- **Feature selection** - Low-std features (constant values) aren't useful
- **Outlier detection** - Values > mean + 2×std are potential outliers

### Axis Parameter (Critical for 2D!)

```python
movie_features = np.array([[8.5, 2.0, 148], [7.0, 3.5, 136], [9.0, 1.5, 152]])

feature_avgs = np.mean(movie_features, axis=0)  # Average per feature
movie_avgs = np.mean(movie_features, axis=1)    # Average per movie
```

- **`axis=0`** - Operate across rows (columnwise); eliminates first dimension
- **`axis=1`** - Operate across columns (rowwise); eliminates second dimension

**Memory trick**: `axis=0` eliminates the first dimension, `axis=1` eliminates the second dimension.

For a `(3, 4)` array:
- `axis=0` produces shape `(4,)` - one value per column
- `axis=1` produces shape `(3,)` - one value per row

---

## Chapter 5: Essential ML Functions

### Sorting & Argsort

```python
ratings = np.array([8.5, 7.2, 9.1, 6.8, 8.0])
sorted_ratings = np.sort(ratings)
indices = np.argsort(ratings)  # Indices that would sort
top_3_idx = np.argsort(ratings)[-3:][::-1]  # Top 3
```

`np.argsort()` is powerful because it returns the indices that would sort the array, not the sorted values themselves. This lets you sort multiple parallel arrays using the same indices:

```python
movie_names = ['Matrix', 'Inception', 'Shawshank', 'Avengers', 'Interstellar']
ratings = [8.5, 7.2, 9.1, 6.8, 8.0]
sorted_idx = np.argsort(ratings)[::-1]  # Descending order
top_movies = [movie_names[i] for i in sorted_idx]
```

### Unique & Value Counts

```python
genres = np.array(['Action', 'Comedy', 'Action', 'Drama', 'Comedy', 'Action'])
unique_genres = np.unique(genres)
unique, counts = np.unique(genres, return_counts=True)
```

Use this to analyze distributions: Which genres are most common? How many unique users? What's the distribution of ratings?

### Where (Conditional Operations)

```python
high_rated_idx = np.where(ratings > 8.0)
adjusted = np.where(ratings > 8.0, ratings, 8.0)  # Min 8.0
```

`np.where()` has two uses:
1. **Finding indices** where condition is true
2. **Conditional replacement** - Return one value if true, another if false

### Clip

```python
clipped = np.clip(scores, 0, 10)  # Force into range [0, 10]
```

`np.clip()` forces all values into a specified range:
- Values < min → Set to min
- Values > max → Set to max
- Values in range → Unchanged

**Use cases**: Enforce valid ranges (ratings 0-10), prevent overflow, handle outliers.

---

## Summary

1. **Element-wise Operations** — `+`, `-`, `*`, `/`, `**` applied to each element. Foundation of neural networks.
2. **Broadcasting** — Automatic shape matching. NumPy's superpower.
3. **Reshaping** — `reshape()`, `flatten()`, `ravel()`, `.T`. Critical for ML model inputs.
4. **Statistics** — `mean`, `median`, `std`, `var`, `sum`, `min`, `max`. Axis parameter for 2D operations.
5. **Utilities** — `sort`, `argsort`, `unique`, `where`, `clip` for ordering, filtering, and conditional operations.

---

## Next Steps

The next file covers **cosine similarity** - you'll implement it from scratch using these NumPy operations!

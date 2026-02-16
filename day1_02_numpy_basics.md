# Day 1 - Part 2: NumPy Fundamentals - Hands-On Practice

## What Is This File?

This file teaches you NumPy through practical examples. Every concept is explained with what it is, why it exists, how it works, when to use it, and real examples from the BingeItBro project.

## How To Use This File

1. Read the explanation for each section
2. Run the code (python day1_02_numpy_basics.py)
3. Modify the examples to experiment
4. Do the mini-exercises at the end of each section

---

## Chapter 1: Creating NumPy Arrays

### What Is an Array?

Think of an array as a container for numbers:

- A row of numbers (1D): [1, 2, 3, 4, 5]
- A table (2D): Like an Excel spreadsheet
- A cube (3D): Like multiple spreadsheets stacked

In ML, we always work with collections of numbers (movie ratings, movie features, user preferences). Arrays give us a standard format.

### How NumPy Arrays Differ From Python Lists

- **Python List:** Can mix types [1, "hello", 3.14, True]. Flexible but slow.
- **NumPy Array:** Single type only [1, 2, 3, 4, 5]. Faster (100x), many built-in operations.

### 1D Arrays (Vectors)

A single row of numbers. Real-world: a list of movie ratings, a row in a spreadsheet.

```python
import numpy as np

# Create from Python list
ratings = np.array([8.5, 7.2, 9.1, 6.8, 8.0])
print(f"Movie ratings: {ratings}")
print(f"Type: {type(ratings)}")
print(f"Data type of elements: {ratings.dtype}")

# Create from range
sequence = np.arange(0, 10, 2)  # Start, stop, step
print(f"Sequence (0 to 10, step 2): {sequence}")

# Create evenly spaced numbers
linspace_arr = np.linspace(0, 1, 5)  # 5 numbers from 0 to 1
print(f"5 numbers from 0 to 1: {linspace_arr}")

# Special arrays
zeros = np.zeros(5)
ones = np.ones(5)
sevens = np.full(5, 7)
random_uniform = np.random.rand(5)
random_integers = np.random.randint(1, 11, size=5)
```

#### Understanding arange vs linspace

- **arange:** You specify the step → unknown how many elements
- **linspace:** You specify count → unknown what the step is

#### Common Array Creation Functions

- **zeros/ones/full/random:** Used for initializing arrays, setting default weights, and testing
- **arange:** Good when you know the step size
- **linspace:** Good when you know the exact count

#### Mini Exercise 1

Create an array [10, 20, 30, 40, 50] using `np.arange(10, 60, 10)`

### 2D Arrays (Matrices)

A table of numbers (rows × columns). Like an Excel spreadsheet. Most common in ML (rows=samples, columns=features).

```python
movies_2d = np.array([
    [8.5, 2.0, 148],  # The Matrix
    [7.0, 3.5, 136],  # Inception
    [2.0, 9.0, 115],  # Superbad
    [9.0, 1.5, 152]   # The Dark Knight
])
print(f"Shape: {movies_2d.shape}")  # (4, 3) = 4 rows, 3 columns

# Special 2D arrays
zeros_2d = np.zeros((3, 4))
ones_2d = np.ones((2, 5))
identity = np.eye(4)  # Identity matrix
```

#### Understanding Shape

Shape: (4, 3) means 4 movies and 3 features per movie. **In ML, rows = samples, columns = features. This is UNIVERSAL.**

Note the double parentheses for shape: `np.zeros((3, 4))` not `np.zeros(3, 4)`.

### 3D Arrays

Multiple tables stacked. Used for images (height, width, channels), time series, multiple users' data.

```python
arr_3d = np.array([
    [[1, 2], [3, 4]],
    [[5, 6], [7, 8]]
])
print(f"Shape: {arr_3d.shape}")  # (2, 2, 2)
```

---

## Chapter 2: Understanding Array Properties

Every NumPy array has four key properties: shape, size, dtype, and ndim.

### Shape

The dimensions of the array (rows, columns).

```python
movies = np.array([[8.5, 2.0, 148], [7.0, 3.5, 136], [2.0, 9.0, 115]])
print(f"Shape: {movies.shape}")  # (3, 3)
print(f"Rows: {movies.shape[0]}, Columns: {movies.shape[1]}")
```

### Size

Total number of elements = shape[0] × shape[1] (product of all dimensions).

### Dtype (Data Type)

The data type of array elements. Common types: int32, int64, float32, float64, bool. Note that float32 saves 50% memory compared to float64.

```python
int_array = np.array([1, 2, 3], dtype=np.int32)
float_array = np.array([1.0, 2.0, 3.0], dtype=np.float32)
converted = int_array.astype(np.float64)
```

### Ndim

Number of dimensions. 1D=1, 2D=2, 3D=3.

---

## Chapter 3: Accessing Array Elements

### 1D Array Indexing

```python
ratings = np.array([8.5, 7.2, 9.1, 6.8, 8.0])
print(f"First: {ratings[0]}")
print(f"Last: {ratings[-1]}")
print(f"First 3: {ratings[0:3]}")
print(f"Every 2nd: {ratings[::2]}")
print(f"Reverse: {ratings[::-1]}")
```

#### Slicing Syntax Explained

Array slicing uses the syntax: `array[start:stop:step]`

- **start:** Beginning index (inclusive)
- **stop:** Ending index (EXCLUSIVE - not included)
- **step:** Increment between elements

### 2D Array Indexing

```python
movies = np.array([
    [8.5, 2.0, 148],
    [7.0, 3.5, 136],
    [2.0, 9.0, 115]
])
print(f"Single element: {movies[0, 0]}")
print(f"Entire row: {movies[0]}")
print(f"Entire column: {movies[:, 0]}")
print(f"Sub-region: {movies[0:2, 0:2]}")
```

### Boolean Indexing (VERY POWERFUL!)

The most important indexing feature in NumPy for ML! Boolean indexing lets you filter arrays based on conditions.

```python
action_movies = movies[movies[:, 0] > 5]  # Action score > 5
```

#### How Boolean Indexing Works

Breaking down the example step by step:

1. `movies[:, 0]` → [8.5, 7.0, 2.0] (all action scores)
2. `movies[:, 0] > 5` → [True, True, False]
3. `movies[[True, True, False]]` → Select rows where True

#### Real BingeItBro Examples

Boolean indexing is essential for filtering real data:

- `high_rated = recommendations[recommendations[:, rating_col] > 8]`
- `recent_movies = recommendations[recommendations[:, year_col] > 2020]`

---

## Indexing Cheat Sheet

### 1D Arrays

- `array[0]` → First element
- `array[-1]` → Last element
- `array[2:5]` → Elements 2, 3, 4
- `array[::2]` → Every 2nd element
- `array[::-1]` → Reverse

### 2D Arrays

- `array[0, 0]` → Single element
- `array[0]` → Entire row
- `array[:, 0]` → Entire column
- `array[0:2, 0:2]` → Slice rows AND columns
- `array[[0, 2]]` → Specific rows
- `array[array[:, 0] > 5]` → Boolean filtering

### Most Important Takeaway

**Boolean indexing!** You'll use this constantly in ML. Master this concept and you'll have a superpower for data manipulation.

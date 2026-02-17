import numpy as np

def cosine_similarity(a, b):
    dot_product = np.dot(a, b)
    magnitude_a = np.linalg.norm(a)
    magnitude_b = np.linalg.norm(b)
    return dot_product / (magnitude_a * magnitude_b)

# Test 1: Identical vectors (should be 1.0)
print("Test 1: Identical vectors")
a = np.array([1, 2, 3])
b = np.array([1, 2, 3])
result = cosine_similarity(a, b)
print(f"  a = {a}")
print(f"  b = {b}")
print(f"  Similarity = {result:.4f} (Expected: 1.0 - Perfect match!)")
print()

# Test 2: Opposite vectors (should be -1.0)
print("Test 2: Opposite vectors")
a = np.array([1, 2, 3])
b = np.array([-1, -2, -3])
result = cosine_similarity(a, b)
print(f"  a = {a}")
print(f"  b = {b}")
print(f"  Similarity = {result:.4f} (Expected: -1.0 - Completely opposite!)")
print()

# Test 3: Perpendicular vectors (should be 0.0)
print("Test 3: Perpendicular vectors")
a = np.array([1, 0])
b = np.array([0, 1])
result = cosine_similarity(a, b)
print(f"  a = {a}")
print(f"  b = {b}")
print(f"  Similarity = {result:.4f} (Expected: 0.0 - No relationship!)")
print()

# Test 4: Similar but different magnitude
print("Test 4: Same direction, different magnitude")
a = np.array([1, 2, 3])
b = np.array([10, 20, 30])  # 10x larger
result = cosine_similarity(a, b)
print(f"  a = {a}")
print(f"  b = {b}")
print(f"  Similarity = {result:.4f} (Expected: 1.0 - Same direction!)")
print()

# Test 5: Somewhat similar vectors
print("Test 5: Somewhat similar vectors")
a = np.array([1, 2, 3])
b = np.array([2, 3, 4])
result = cosine_similarity(a, b)
print(f"  a = {a}")
print(f"  b = {b}")
print(f"  Similarity = {result:.4f} (Expected: ~0.99 - Very similar!)")
print()

# Test 6: Real TF-IDF example from your documents
print("Test 6: Real TF-IDF vectors (simplified)")
doc1 = np.array([0.405, 0.405, 0.405, 0.405])  # "I love machine learning"
doc2 = np.array([0.405, 0.405, 1.098, 1.098])  # "Machine learning is fun"
result = cosine_similarity(doc1, doc2)
print(f"  Doc 1 = {doc1}")
print(f"  Doc 2 = {doc2}")
print(f"  Similarity = {result:.4f} (Documents share 'machine learning')")
print()

# Test 7: Completely different documents
print("Test 7: No overlap")
doc1 = np.array([1, 1, 0, 0, 0])  # Has words 0,1
doc2 = np.array([0, 0, 0, 1, 1])  # Has words 3,4
result = cosine_similarity(doc1, doc2)
print(f"  Doc 1 = {doc1}")
print(f"  Doc 2 = {doc2}")
print(f"  Similarity = {result:.4f} (Expected: 0.0 - No common words!)")

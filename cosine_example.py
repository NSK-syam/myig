import numpy as np

# Example: Calculate cosine similarity between two TF-IDF vectors
# Let's use simplified vectors from your documents

# Doc 0: "I love machine learning" 
# Doc 2: "Machine learning is fun"
# (simplified TF-IDF vectors - just the important values)

a = np.array([0.405, 0.405, 0.405, 0.405])  # Doc 0 vector (simplified)
b = np.array([0.405, 0.405, 1.098, 1.098])  # Doc 2 vector (simplified)

print("Vector a (Doc 0):", a)
print("Vector b (Doc 2):", b)
print()

# Step-by-step calculation
def cosine_similarity(a, b):
    dot_product = np.dot(a, b)
    magnitude_a = np.linalg.norm(a)
    magnitude_b = np.linalg.norm(b)
    
    print("Step 1: Calculate dot product")
    print(f"  np.dot(a, b) = {a} · {b}")
    print(f"  = ({a[0]}×{b[0]}) + ({a[1]}×{b[1]}) + ({a[2]}×{b[2]}) + ({a[3]}×{b[3]})")
    print(f"  = {a[0]*b[0]:.6f} + {a[1]*b[1]:.6f} + {a[2]*b[2]:.6f} + {a[3]*b[3]:.6f}")
    print(f"  = {dot_product:.6f}")
    print()
    
    print("Step 2: Calculate magnitude of vector a")
    print(f"  np.linalg.norm(a) = √(a₁² + a₂² + a₃² + a₄²)")
    print(f"  = √({a[0]}² + {a[1]}² + {a[2]}² + {a[3]}²)")
    print(f"  = √({a[0]**2:.6f} + {a[1]**2:.6f} + {a[2]**2:.6f} + {a[3]**2:.6f})")
    print(f"  = √{sum(a**2):.6f}")
    print(f"  = {magnitude_a:.6f}")
    print()
    
    print("Step 3: Calculate magnitude of vector b")
    print(f"  np.linalg.norm(b) = √(b₁² + b₂² + b₃² + b₄²)")
    print(f"  = √({b[0]}² + {b[1]}² + {b[2]}² + {b[3]}²)")
    print(f"  = √({b[0]**2:.6f} + {b[1]**2:.6f} + {b[2]**2:.6f} + {b[3]**2:.6f})")
    print(f"  = √{sum(b**2):.6f}")
    print(f"  = {magnitude_b:.6f}")
    print()
    
    print("Step 4: Calculate cosine similarity")
    print(f"  similarity = dot_product / (magnitude_a × magnitude_b)")
    print(f"  = {dot_product:.6f} / ({magnitude_a:.6f} × {magnitude_b:.6f})")
    print(f"  = {dot_product:.6f} / {magnitude_a * magnitude_b:.6f}")
    
    similarity = dot_product / (magnitude_a * magnitude_b)
    print(f"  = {similarity:.6f}")
    print()
    
    return similarity

result = cosine_similarity(a, b)
print(f"Final Result: {result:.6f}")
print()
print("Interpretation:")
if result > 0.8:
    print("  → Very similar documents!")
elif result > 0.5:
    print("  → Somewhat similar documents")
elif result > 0.2:
    print("  → Slightly similar documents")
else:
    print("  → Not similar documents")

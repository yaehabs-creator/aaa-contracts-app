
from raganything import RAGAnything
import inspect

def list_methods(cls):
    methods = [m[0] for m in inspect.getmembers(cls, predicate=inspect.isfunction)]
    print(f"Methods in {cls.__name__}:")
    for m in sorted(methods):
        print(f"  {m}")

print("Inspecting RAGAnything class...")
list_methods(RAGAnything)

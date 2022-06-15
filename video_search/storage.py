from collections import OrderedDict
from typing import Optional

from typing import TypeVar, Generic


T = TypeVar("T")


class LRUCache(Generic[T]):
    """Simple in-memory LRU cache."""

    def __init__(self, capacity: int = 100):
        self.capacity = capacity
        self.cache: OrderedDict[str, T] = OrderedDict()

    def save(self, key: str, value: T) -> None:
        self.cache[key] = value
        self.cache.move_to_end(key)
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

    def get(self, key: str) -> Optional[T]:
        if key not in self.cache:
            return None
        else:
            self.cache.move_to_end(key)
            return self.cache[key]

    def __contains__(self, key: str) -> bool:
        return key in self.cache

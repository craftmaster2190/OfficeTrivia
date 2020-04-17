export function difference<T>(setA: Set<T>, setB: Set<T>) {
  const differenceSet = new Set<T>(setA);
  setB.forEach((elem) => differenceSet.delete(elem));
  return differenceSet;
}

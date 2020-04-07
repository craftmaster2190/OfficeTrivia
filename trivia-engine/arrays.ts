export function randomElement<T>(array: Array<T>): T {
  return array[Math.floor(array.length * Math.random())];
}

export function shuffle<T>(array: Array<T>): Array<T> {
  var currentIndex = array.length;
  var temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

export function concat<T>(arrayA: Array<T>, arrayB: Array<T>): Array<T> {
  return arrayA.concat(arrayB);
}

export function flatten<T>(arrayOfArrays: Array<Array<T>>): Array<T> {
  return arrayOfArrays.reduce(concat);
}

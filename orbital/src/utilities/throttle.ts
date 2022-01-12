const throttle = <A extends unknown[]>(
  func: (...args: A) => void,
  delayMs: number,
) : (...args: A) => void => {
  let shouldWait = false;
  return (...args: A) => {
    if (!shouldWait) {
      func(...args);
      shouldWait = true;

      setTimeout(() => {
        shouldWait = false;
      }, delayMs);
    }
  };
};

export default throttle;

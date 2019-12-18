/**
 * 类似python的用法
 * methodName: errorCaptured
 * const [err, res] = await errorCaptured(promise);
 */
const errorCaptured = async (asyncFunc) => {
  try {
    const result = await asyncFunc;
    return [null, result];
  } catch (error) {
    return [error, null];
  }
}

module.exports = errorCaptured;

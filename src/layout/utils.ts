
export const EPSILON_PX = 1e-1;

export const sizeIsClose = (left: number, right: number) => (Math.abs(left - right) <= EPSILON_PX);
export const sizeGreaterThanEqual = (left: number, right: number) => (left + EPSILON_PX >= right)
export const sizeLessThanEqual = (left: number, right: number) => (left <= right + EPSILON_PX)
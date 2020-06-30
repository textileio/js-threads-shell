/**
 * Small set of default colors.
 */
enum Color {
  red = "31",
  green = "32",
  yellow = "33",
  blue = "34",
  magenta = "35",
}

/**
 * Return a string, wrapped in the specified color.
 * @param color The color to use.
 * @param s The input string to colorize.
 */
const colorize = (color: Color | string, s: string): string =>
  `\x1b[${color}m${s}\x1b[0m`;

export { colorize, Color };

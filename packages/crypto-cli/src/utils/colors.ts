import colors from 'colors'

const printError = (err: string): void => {
  const msg = colors.red(err)

  console.error(msg)
}

const printSuccess = (success: string): void => {
  const msg = colors.green(success)

  console.log(msg)
}

export default {
  printError,
  printSuccess,
}

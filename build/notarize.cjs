const { notarize } = require('@electron/notarize')

exports.default = async function notarizing(context) {
  if (context.electronPlatformName !== 'darwin') return
  if (!process.env.APPLE_ID) return

  const appName = context.packager.appInfo.productFilename
  const appPath = `${context.appOutDir}/${appName}.app`

  console.log(`Notarizing ${appPath}...`)

  await notarize({
    appBundleId: 'com.craftserver.app',
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  })

  console.log('Notarization complete.')
}

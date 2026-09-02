export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const isExtensionlessLocalImport = specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/i.test(specifier);
    if (error?.code === "ERR_MODULE_NOT_FOUND" && isExtensionlessLocalImport) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw error;
  }
}

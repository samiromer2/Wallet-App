const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure resolver to handle @noble packages better
config.resolver = {
  ...config.resolver,
  // Enable package exports resolution
  unstable_enablePackageExports: true,
  // Add source extensions for better module resolution
  sourceExts: [...(config.resolver.sourceExts || []), 'mjs', 'cjs'],
};

// Fix @noble/hashes/crypto.js imports - resolve directly to file to avoid exports warning
const originalResolveRequest = config.resolver.resolveRequest;
const path = require('path');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Map @noble/hashes/crypto.js directly to the file (bypasses exports check)
  if (moduleName === '@noble/hashes/crypto.js') {
    try {
      // Resolve directly to the file path
      const cryptoPath = path.resolve(
        context.projectRoot,
        'node_modules/@noble/hashes/crypto.js'
      );
      return {
        filePath: cryptoPath,
        type: 'sourceFile',
      };
    } catch (e) {
      // Fall through to default resolver if resolution fails
    }
  }
  
  // Use default resolver for all other modules
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  
  // Fallback to Metro's default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;


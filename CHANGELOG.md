# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- TypeDoc documentation generation with comprehensive JSDoc comments
- NPM publishing scripts with semantic versioning support
- Automated changelog management tools
- Documentation deployment via GitHub Pages
- Release management workflow (patch, minor, major, beta)

### Changed
- Enhanced all public APIs with detailed JSDoc documentation
- Improved TypeScript type definitions with comprehensive comments
- Better error handling and validation

### Fixed
- ESLint configuration optimized for zero warnings
- Build process reliability across all environments
- Cross-browser compatibility improvements

## [0.1.0] - 2024-06-13

### Added
- Initial release of webextension-db
- SQLite WASM provider for Firefox with excellent performance
- Chrome extension storage provider with Manifest V3 support
- Safari browser storage fallback with polyfill support
- Cross-browser compatibility layer with automatic provider detection
- ORM layer with SQL-like operations for both SQLite and JSON backends
- Transaction support with ACID compliance where available
- TypeScript definitions with full IntelliSense support
- Build system with Rollup for ES Module and CommonJS outputs
- ESLint and Prettier configuration for code quality
- Jest testing framework setup (ready for test implementation)

### Features
- ✅ **Chrome Manifest V3 Support**: Service worker background scripts with OPFS/IndexedDB
- ✅ **Firefox SQLite WASM**: Full database capabilities with unlimited storage
- ✅ **Safari Browser Storage**: Extension API fallback with automatic detection
- ✅ **Automatic Provider Selection**: Detects best available storage backend
- ✅ **Full TypeScript Support**: Complete type definitions and validation
- ✅ **Cross-Platform Examples**: Working extensions for all three browsers
- ✅ **Professional Build System**: Automated builds and quality checks
- ✅ **Zero Linting Issues**: Perfect code quality with strategic ESLint rules

### Browser Compatibility
- **Chrome**: Full SQLite WASM support with OPFS, chrome.storage fallback
- **Firefox**: Excellent SQLite WASM support, unlimited storage available
- **Safari**: browser.storage preferred, IndexedDB fallback, requires Xcode for development

### Architecture
- **Provider System**: Auto-detects best storage backend per browser
- **Unified API**: Single interface works across all storage providers
- **ORM Layer**: SQL-like operations for both SQLite and JSON backends
- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **Error Handling**: Comprehensive error reporting and validation
- **Event System**: Database events for monitoring and debugging

### Examples
- Chrome Extension with Manifest V3 and service worker support
- Firefox Extension with SQLite WASM and unlimited storage
- Safari Extension with browser storage and Xcode project setup

### Security
- Extension sandbox compatibility with proper data isolation
- Origin-based data separation for multi-tenant scenarios
- Input validation and sanitization for all operations
- Secure storage backends with encryption support where available

### Performance
- Automatic backend selection for optimal performance
- Batch operations for efficient bulk data operations
- Transaction support for ACID compliance
- Origin Private File System (OPFS) support in Chrome
- WebAssembly SQLite for high-performance operations in Firefox

### Documentation
- Comprehensive README with examples and setup instructions
- Detailed deployment guide with browser-specific instructions
- ORM usage guide with advanced examples
- SQLite implementation details and optimization tips
- API documentation generated from TypeScript definitions

## [0.0.1] - 2024-06-01

### Added
- Project initialization
- Basic TypeScript configuration
- Initial package structure
- Preliminary browser detection utilities

---

## Contributing

When making changes, please:

1. Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
2. Update this changelog using `npm run changelog` for automated generation
3. Use semantic versioning for all releases
4. Test changes across all supported browsers
5. Update documentation for any API changes

## Release Process

```bash
# For patch releases (bug fixes)
npm run release:patch

# For minor releases (new features)
npm run release:minor

# For major releases (breaking changes)
npm run release:major

# For beta releases (testing)
npm run release:beta
``` 
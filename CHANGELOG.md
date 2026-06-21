# Changelog

All notable changes to this project are recorded here.

## [Unreleased]

### Changed

- Replaced the unverified SQLite and ORM layers with a focused JSON database API.
- Switched project tooling from npm, ESLint, Prettier, and Jest to pnpm, Biome, and Vitest.
- Changed the CommonJS package entry to `dist/index.cjs`.
- Removed generated documentation, packaged tarballs, placeholder WASM files, and broken browser-extension examples from source control.
- Verified dependency and tool configuration against current upstream migration commands.

### Added

- IndexedDB, extension storage, and memory backends behind one database interface.
- Runtime validation for JSON-compatible values.
- Query filters with nested paths, comparison operators, regex matching, sorting, and pagination.
- Unit and integration tests for value validation, memory storage, IndexedDB persistence, and extension storage behavior.
- A source policy check for unsafe TypeScript escape hatches.
- A manual debug build workflow that verifies the package, creates a tarball, and uploads it as a workflow artifact.

## [0.1.1] - 2026-06-21

### Changed

- Updated package version metadata.

## [0.1.0] - 2024-06-13

### Added

- Initial package skeleton.

# Changelog
This file contains the changes made to the package.

The sections are in descending order of the change date.

## [0.1.17] - 2023-07-17
### Changed
- `dependencies` are moved to `peerDependencies`.

## [0.1.16] - 2022-08-21
### Added
- Basic pluralization for reverse table names if one of the links in navigation
is an array. This will be default and used if not set by the developer.

### Changed
- The structure of the folders.
- `mappers` for custom names for cross table references are not used anymore and
planned to be removed in the following versions.

## [0.1.15] - 2022-08-20
### Fixed
- `Array.map` error during `*:1` relation mapping.

## [0.1.14] - 2022-08-16
### Fixed
- Prisma Selections for deeply nested objects were not working correctly.

## Added
- Better way to handle renaming.

## [0.1.9] - 2022-04-27
### Changed
- `IOnResolvingParams.context` property.
- `IOnResolvingParams.root` property.
- `IOnResolvedParams.fromDatabase` property.
- Now if a data is returned from `IUseDynamicResolversParams.onResolving` then
the returned data will be available in `IUseDynamicResolversParams.onResolved`
function. Previously, the `onResolved` function was not called if returned
from `onResolving`.

## [0.1.7] - 2022-04-27
### Changed
- Type improvements for `selectionMap` option.

## [0.1.6] - 2022-04-27
### Added
- Changelog file.
- `keepNavigationMap` option to `@UseDynamicResolver()` decorator parameter
object.

### Changed
- `getNavigationMap` function name to `getNavigationMaps`.

## [0.1.5] - 2022-04-26
### Added
The initial version of the package.

[Unreleased]: https://github.com/incetarik/nestjs-prisma-dynamic-resolvers/compare/v1.0.0...HEAD
[0.1.16]: https://github.com/incetarik/nestjs-prisma-dynamic-resolvers/compare/0.1.15...0.1.16
[0.1.15]: https://github.com/incetarik/nestjs-prisma-dynamic-resolvers/compare/0.1.14...0.1.15
[0.1.14]: https://github.com/incetarik/nestjs-prisma-dynamic-resolvers/compare/0.1.13...0.1.14
[0.1.13]: https://github.com/incetarik/nestjs-prisma-dynamic-resolvers/compare/0.1.9...0.1.13
[0.1.9]: https://github.com/incetarik/nestjs-prisma-dynamic-resolvers/compare/0.1.7...0.1.9
[0.1.7]: https://github.com/incetarik/nestjs-prisma-dynamic-resolvers/compare/0.1.6...0.1.7
[0.1.6]: https://github.com/incetarik/nestjs-prisma-dynamic-resolvers/compare/0.1.5...0.1.6
[0.1.5]: https://github.com/incetarik/nestjs-prisma-dynamic-resolvers/releases/tag/0.1.5

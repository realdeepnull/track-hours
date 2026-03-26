# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- next-release -->

## [0.2.3](https://github.com/ynnckrkn/track-hours/compare/track-hours-v0.2.2...track-hours-v0.2.3) (2026-03-25)


### Bug Fixes

* upload only Setup installer for Windows release assets ([b43c840](https://github.com/ynnckrkn/track-hours/commit/b43c840bad415071ed0790a459e57bf432e9290b))

## [0.2.2](https://github.com/ynnckrkn/track-hours/compare/track-hours-v0.2.1...track-hours-v0.2.2) (2026-03-25)


### Bug Fixes

* pass tag_name input to release upload steps ([87c2ba5](https://github.com/ynnckrkn/track-hours/commit/87c2ba572c3a7e87c399934d2e48eadf214b696a))

## [0.2.1](https://github.com/ynnckrkn/track-hours/compare/track-hours-v0.2.0...track-hours-v0.2.1) (2026-03-25)


### Bug Fixes

* suppress html2canvas CommonJS optimization bailout warning ([d6d9854](https://github.com/ynnckrkn/track-hours/commit/d6d9854303701e6b4997cd0cd3a745804c362908))

## [0.2.0](https://github.com/ynnckrkn/track-hours/compare/track-hours-v0.1.0...track-hours-v0.2.0) (2026-03-25)


### Features

* add first track hours layout and logic to track hours ([65497f7](https://github.com/ynnckrkn/track-hours/commit/65497f730d1e38c7e46007fd0013ef1a14084a8b))
* add multi language en and de ([6176894](https://github.com/ynnckrkn/track-hours/commit/61768941cb983093950abecb2dbaa8e0595e510d))
* display logo ([8ed23f0](https://github.com/ynnckrkn/track-hours/commit/8ed23f08b1b29ac8cc5f5e433f42d6bc140b9b20))
* mulit language for pdf and csv ([e3e1f4d](https://github.com/ynnckrkn/track-hours/commit/e3e1f4d85f0e96f823c4fcf5a3a50c3a3c14892c))
* validate time range ([c516abd](https://github.com/ynnckrkn/track-hours/commit/c516abdbfdedd87157991e9dac5aca18fc968c79))


### Bug Fixes

* edit and delete icons are invisible in time entries ([71f11a2](https://github.com/ynnckrkn/track-hours/commit/71f11a20edc6b3da3e5f4871e40ca84bf952defb))
* filter are not reactiv ([04b2425](https://github.com/ynnckrkn/track-hours/commit/04b2425661332bdfd2601fe974e3069f685e5f28))
* i18n translate in production ([d6ef31c](https://github.com/ynnckrkn/track-hours/commit/d6ef31cd8b4bbbc0ac3193694140394cf314a83a))
* the Quick Start feature is visible even when it is turned off ([3feb571](https://github.com/ynnckrkn/track-hours/commit/3feb5717a4ad078fdb43b80ddec28c574e3c9383))

## [0.1.0] - 2026-03-25

### Added

- Display app logo ([8ed23f0](../../commit/8ed23f0))
- Multi-language support (EN/DE) for PDF and CSV exports ([e3e1f4d](../../commit/e3e1f4d))
- Time range validation ([c516abd](../../commit/c516abd))
- Multi-language support (EN/DE) ([65468941](../../commit/6176894))
- Initial track-hours layout and core time-tracking logic ([65497f7](../../commit/65497f7))

### Fixed

- i18n translations not applied in production build ([d6ef31c](../../commit/d6ef31c))
- Filters not reactive ([04b2425](../../commit/04b2425))
- Edit and delete icons invisible in time entries list ([71f11a2](../../commit/71f11a2))
- Quick Start feature visible even when disabled ([3feb571](../../commit/3feb571))

### Changed

- Replaced hard delete with soft delete for projects and tasks ([af73df3](../../commit/af73df3))
- Removed redundant `standalone: true` from components ([0a2441f](../../commit/0a2441f))
- Updated README ([2cca7a8](../../commit/2cca7a8))

### Chores

- Added ESLint configuration ([53e44df](../../commit/53e44df))
- Updated `uuid` package ([2995d65](../../commit/2995d65))

## [0.0.1] - 2026-03-22

### Added

- Initial commit ([6e94aef](../../commit/6e94aef))

[0.1.0]: ../../compare/6e94aef...HEAD
[0.0.1]: ../../releases/tag/6e94aef

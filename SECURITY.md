# Security Policy

## Supported Versions

Security fixes target the latest published major version.

## Reporting a Vulnerability

Please report suspected vulnerabilities through GitHub private vulnerability reporting when
available, or email the maintainer listed on the npm package.

Do not open public issues for vulnerabilities that expose private project data, command
execution risk, dependency confusion, or token leakage.

## Scope

`tailwind-pattern-audit` is a local static analysis CLI. It reads project files and writes reports
only when requested by the user. Report a security issue if the tool can unexpectedly execute
project code, leak secrets, write outside requested output paths, or publish incorrect package
artifacts.
